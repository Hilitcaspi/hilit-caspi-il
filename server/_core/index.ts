import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerGrowProxy } from "./growProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { processPendingEmails, processMeetingReminders, processMatchFollowUps, retryUnsentMatchEmails, processMatchedPairFollowUps } from "../automation";
import { notifyOwner } from "./notification";
import { notifyOwnerWhatsApp, sendLeadWelcomeWhatsApp } from "../joni";
import { runWeeklyMatching, expireStaleMatches } from "../matchingScheduler";
import { getDb } from "../db";
import { matches, analyticsEvents } from "../../drizzle/schema";
import { or, eq, sql, and } from "drizzle-orm";
import { sdk } from "./sdk";
import { handleGrowWebhook } from "../growWebhook";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { storagePut } from "../storage";
import { sendErrorAlert, installProcessErrorAlerts } from "./errorAlert";

// Install process-level error alerts (uncaughtException / unhandledRejection).
installProcessErrorAlerts();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (Cloudflare/load balancer) so express-rate-limit reads correct client IP
  app.set("trust proxy", 1);
  // Body parser — 10MB to support base64 photo uploads in questionnaire
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Rate limiting — protect against abuse and DoS
  // General API: 200 requests per minute per IP
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.path.startsWith("/api/email/"), // skip tracking pixels
  });
  app.use("/api/", apiLimiter);

  // Stricter limit for form submissions: 20 per minute per IP
  const formLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many submissions, please try again later." },
  });
  app.use("/api/trpc/leads.", formLimiter);
  app.use("/api/trpc/matchmaking.", formLimiter);

  // Local Grow payment proxy — forwards browser SDK requests to Meshulam server-side
  // (replaces the external Cloudflare Worker grow-proxy.hilitcaspi.workers.dev).
  // MUST be registered BEFORE express.json/global limiters so raw bodies pass through untouched.
  registerGrowProxy(app);

  // OAuth callback under /api/oauth/callback
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ─── WhatsApp Group Redirect with Source Tracking ─────────────────────────
  // IMPORTANT: Must be registered early, before serveStatic catch-all
  // 5 unique redirect links, one per channel:
  //   /api/wa/site        → from website pages
  //   /api/wa/email       → from email sequences
  //   /api/wa/thankyou    → from thank-you / post-purchase pages
  //   /api/wa/bio         → from Instagram bio link
  //   /api/wa/instagram   → from Instagram stories/posts
  {
    const WA_GROUP_URL = "https://chat.whatsapp.com/BnMGRXh6ibqFpV8xFFxkS9?mode=gi_t";
    const WA_SOURCES = ["site", "email", "thankyou", "bio", "instagram"] as const;
    for (const src of WA_SOURCES) {
      app.get(`/api/wa/${src}`, async (req, res) => {
        res.redirect(302, WA_GROUP_URL);
        try {
          const db = await getDb();
          if (!db) return;
          await db.execute(
            sql`INSERT INTO wa_clicks (source, ip, userAgent, createdAt) VALUES (${src}, ${req.ip ?? null}, ${(req.headers["user-agent"] ?? "").slice(0, 500)}, ${Date.now()})`
          );
        } catch (err) { console.error("[WaRedirect]", err); }
      });
    }
  }

  // Temporary diagnostic: check server outbound IP
  app.get("/api/diag/ip", async (_req, res) => {
    try {
      const r = await fetch("https://ipinfo.io/json", { headers: { "User-Agent": "curl/7.88" } });
      const data = await r.json() as any;
      res.json({ ip: data.ip, country: data.country, org: data.org });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // Photo upload endpoint for profile updates
  {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
    app.post("/api/upload-photo", upload.single("file"), async (req, res) => {
      try {
        if (!req.file) { res.status(400).json({ error: "No file" }); return; }
        const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";
        const key = `profile-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
        res.json({ url });
      } catch (err: any) {
        console.error("[UploadPhoto]", err);
        void sendErrorAlert({ source: "express:upload-photo", error: err, context: { route: req.path } });
        res.status(500).json({ error: "Upload failed" });
      }
    });
  }

  // Email open tracking pixel: GET /api/match-open?token=XXX&side=a|b
  // Returns a 1x1 transparent GIF and records when the email was opened
  app.get("/api/match-open", async (req, res) => {
    const token = req.query.token as string;
    const side = req.query.side as string; // "a" or "b"
    // Return pixel immediately, then update DB
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.end(pixel);
    // Async DB update (don't block response)
    if (token && (side === "a" || side === "b")) {
      try {
        const db = await getDb();
        if (!db) return;
        const [match] = await db.select().from(matches).where(
          side === "a"
            ? eq(matches.approvalTokenA, token)
            : eq(matches.approvalTokenB, token)
        ).limit(1);
        if (match) {
          const now = Date.now();
          if (side === "a" && !match.emailAOpenedAt) {
            await db.update(matches).set({ emailAOpenedAt: now, updatedAt: now }).where(eq(matches.id, match.id));
          } else if (side === "b" && !match.emailBOpenedAt) {
            await db.update(matches).set({ emailBOpenedAt: now, updatedAt: now }).where(eq(matches.id, match.id));
          }
        }
      } catch (err) {
        console.error("[TrackOpen] Error:", err);
      }
    }
  });

  // Email open tracking pixel
  app.get("/api/email/open/:id", async (req, res) => {
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.end(pixel);
    const emailId = parseInt(req.params.id, 10);
    if (!isNaN(emailId)) {
      try {
        const db = await getDb();
        if (!db) return;
        const now = Date.now();
        await db.execute(sql`UPDATE email_log SET openCount = openCount + 1, openedAt = COALESCE(openedAt, ${now}) WHERE id = ${emailId}`);
      } catch (err) { console.error("[EmailOpen]", err); }
    }
  });

  // Email click tracking redirect
  app.get("/api/email/click/:id", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) { res.status(400).send("Missing url"); return; }
    res.redirect(302, targetUrl);
    const emailId = parseInt(req.params.id, 10);
    if (!isNaN(emailId)) {
      try {
        const db = await getDb();
        if (!db) return;
        const now = Date.now();
        await db.execute(sql`UPDATE email_log SET clickCount = clickCount + 1, clickedAt = COALESCE(clickedAt, ${now}) WHERE id = ${emailId}`);
      } catch (err) { console.error("[EmailClick]", err); }
    }
  });

  // ─── Grow Payment Webhook ──────────────────────────────────────────────────────────
  // Receives payment notifications from Grow after successful purchases.
  // Configure in Grow dashboard: Webhook URL → https://hilitcaspi.com/api/grow/webhook
  // Accept both JSON and form-encoded (Grow sends form-encoded from their servers)
  app.post("/api/grow/webhook", express.json(), express.urlencoded({ extended: true }), async (req, res) => {
    res.status(200).json({ ok: true }); // Respond immediately so Grow doesn't retry
    try {
      // Accept ALL webhooks — no key validation at all
      console.log("[GrowWebhook] Received (Content-Type:", req.headers['content-type'], "):", JSON.stringify(req.body).slice(0, 500));
      await handleGrowWebhook(req.body);
    } catch (err) {
      console.error("[GrowWebhook] Unhandled error:", err);
    }
  });

  // ─── Brevo Webhook ──────────────────────────────────────────────────────────
  // Receives email events (opened, clicks, bounces, unsubscribes) from Brevo
  // Configure in Brevo: Settings → Webhooks → https://hilitcaspi.com/api/brevo/webhook
  app.post("/api/brevo/webhook", express.json(), async (req, res) => {
    res.status(200).json({ ok: true }); // Respond immediately so Brevo doesn't retry
    try {
      const db = await getDb();
      if (!db) return;
      const events = Array.isArray(req.body) ? req.body : [req.body];
      for (const event of events) {
        const eventType = event.event;
        const email = event.email;
        const ts = event.ts ? event.ts * 1000 : Date.now();
        if (!email || !eventType) continue;
        console.log(`[BrevoWebhook] ${eventType}: ${email}`);
        if (eventType === "opened") {
          await db.execute(
            sql`UPDATE email_log SET openCount = openCount + 1, openedAt = COALESCE(openedAt, ${ts})
                WHERE recipientEmail = ${email} AND status = 'sent'
                ORDER BY sentAt DESC LIMIT 1`
          );
        } else if (eventType === "click" || eventType === "clicks") {
          await db.execute(
            sql`UPDATE email_log SET clickCount = clickCount + 1, clickedAt = COALESCE(clickedAt, ${ts})
                WHERE recipientEmail = ${email} AND status = 'sent'
                ORDER BY sentAt DESC LIMIT 1`
          );
        } else if (eventType === "hard_bounce" || eventType === "soft_bounce" || eventType === "invalid_email") {
          await db.execute(
            sql`UPDATE email_log SET status = 'failed', errorMessage = ${eventType}
                WHERE recipientEmail = ${email} AND status = 'sent'
                ORDER BY sentAt DESC LIMIT 1`
          );
        } else if (eventType === "unsubscribed") {
          await db.execute(
            sql`UPDATE crm_leads SET notes = CONCAT(COALESCE(notes,''), '\n[הסיר עצמו מרשימת תפוצה]')
                WHERE email = ${email} LIMIT 1`
          );
        }
      }
    } catch (err) { console.error("[BrevoWebhook]", err); }
  });

  // Page/event tracking
  app.post("/api/track", express.json(), async (req, res) => {
    res.status(204).end();
    try {
      const db = await getDb();
      if (!db) return;
      const { eventType, email, leadId, page, emailJourney, emailIndex, utmSource, utmMedium, utmCampaign, utmContent } = req.body || {};
      if (!eventType) return;
      await db.insert(analyticsEvents).values({
        eventType: eventType as any,
        email: email || null,
        leadId: leadId || null,
        page: page || null,
        emailJourney: emailJourney || null,
        emailIndex: emailIndex || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        userAgent: (req.headers["user-agent"] || "").slice(0, 500),
        createdAt: Date.now(),
      });
    } catch (err) { console.error("[Track]", err); }
  });

  // Free guide PDF proxy - serves with proper Hebrew filename
  app.get("/api/guide/download", async (req, res) => {
    const FREE_GUIDE_PDF = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit_guide_v3_13e3caa9.pdf";
    try {
      const response = await fetch(FREE_GUIDE_PDF);
      if (!response.ok) {
        res.status(502).send("Could not fetch guide");
        return;
      }
      const buffer = await response.arrayBuffer();
      const filename = encodeURIComponent("המדריך-החינמי-של-הילית-כספי.pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="guide.pdf"; filename*=UTF-8''${filename}`);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("[GuideDownload] Error:", err);
      void sendErrorAlert({ source: "express:guide-download", error: err, context: { route: req.path } });
      res.status(500).send("Error fetching guide");
    }
  });

  // ─── Meta Lead Ads Webhook ────────────────────────────────────────────────
  // GET: Facebook verification challenge
  app.get("/api/meta/leads", (req, res) => {
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "hilit_meta_verify_2025";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[Meta Webhook] Verified successfully");
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  });

  // POST: Receive lead data from Meta Lead Ads
  app.post("/api/meta/leads", async (req, res) => {
    // Respond immediately to Meta (must respond within 5 seconds)
    res.status(200).send("EVENT_RECEIVED");

    try {
      const body = req.body;
      console.log("[Meta Webhook] POST received. Content-Type:", req.headers['content-type']);
      console.log("[Meta Webhook] Body:", JSON.stringify(body));
      if (!body?.entry) {
        console.log("[Meta Webhook] No entry in body, skipping");
        return;
      }

      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change.field !== "leadgen") continue;
          const leadgenId = change.value?.leadgen_id;
          const formId = change.value?.form_id;
          const adId = change.value?.ad_id;
          const campaignId = change.value?.campaign_id;

          if (!leadgenId) continue;

          // Fetch lead details from Meta Graph API
          const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
          if (!accessToken) {
            console.error("[Meta Webhook] META_PAGE_ACCESS_TOKEN not set");
            continue;
          }

          const leadRes = await fetch(
            `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${accessToken}`
          );
          if (!leadRes.ok) {
            console.error("[Meta Webhook] Failed to fetch lead:", await leadRes.text());
            continue;
          }
          const leadData = await leadRes.json() as any;
          const fields: Record<string, string> = {};
          for (const f of (leadData.field_data || [])) {
            fields[f.name] = f.values?.[0] ?? "";
          }

          const name = fields["full_name"] || fields["name"] || fields["שם מלא"] || "";
          const email = fields["email"] || fields["מייל"] || "";
          const phone = fields["phone_number"] || fields["phone"] || fields["טלפון"] || "";
          const genderRaw = (fields["gender"] || fields["מגדר"] || "").toLowerCase();
          const gender: "female" | "male" | undefined =
            genderRaw.includes("female") || genderRaw.includes("אשה") || genderRaw.includes("נקבה") ? "female" :
            genderRaw.includes("male") || genderRaw.includes("גבר") || genderRaw.includes("זכר") ? "male" :
            undefined;

          if (!email || !name) {
            console.warn("[Meta Webhook] Lead missing email or name, skipping", fields);
            continue;
          }

          // Determine journey type from form ID or campaign context
          // Form IDs should be set as env vars: META_FORM_ID_GUIDE, META_FORM_ID_DNA, META_FORM_ID_CALL
          const formIdGuide = process.env.META_FORM_ID_GUIDE || "";
          const formIdDna = process.env.META_FORM_ID_DNA || "";
          const formIdCall = process.env.META_FORM_ID_CALL || "";

          let source: "meta_lead_guide" | "meta_lead_dna" | "meta_lead_call" = "meta_lead_dna";
          let journeyKey: "free_guide_nurture" | "meta_lead_dna" | "sales_call_lead" = "meta_lead_dna";

          if (formId && formIdGuide && formId === formIdGuide) {
            source = "meta_lead_guide";
            journeyKey = "free_guide_nurture";
          } else if (formId && formIdCall && formId === formIdCall) {
            source = "meta_lead_call";
            journeyKey = "sales_call_lead";
          } else {
            source = "meta_lead_dna";
            journeyKey = "meta_lead_dna";
          }

          // Insert into CRM
          const db = await getDb();
          if (!db) continue;
          const { crmLeads: crmLeadsTable } = await import("../../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const nowTs = Date.now();

          const [existing] = await db
            .select({ id: crmLeadsTable.id })
            .from(crmLeadsTable)
            .where(eqOp(crmLeadsTable.email, email))
            .limit(1);

          let leadId: number;
          if (existing) {
            leadId = existing.id;
            console.log(`[Meta Webhook] Lead already exists: ${email}, updating`); 
          } else {
            const nameParts = name.trim().split(" ");
            const inserted = await db.insert(crmLeadsTable).values({
              name,
              email,
              phone: phone || undefined,
              gender: gender ?? undefined,
              source,
              status: "new_lead",
              createdAt: nowTs,
              updatedAt: nowTs,
            });
            leadId = (inserted as any)[0].insertId as number;
            console.log(`[Meta Webhook] New lead created: ${name} (${email}), journey: ${journeyKey}`);

            // Notify owner (Manus notification + WhatsApp)
            await notifyOwner({
              title: `ליד מטא חדש! 📣 (${source})`,
              content: `${name} (${email}${phone ? `, ${phone}` : ""}) הגיע מקמפיין Meta. מסע: ${journeyKey}`,
            });
            notifyOwnerWhatsApp({ name, email, phone: phone || undefined, source }).catch(console.error);
            // Send welcome WhatsApp to lead if phone available
            if (phone) {
              sendLeadWelcomeWhatsApp({ name, phone, source }).catch(console.error);
            }
          }

          // Start email journey
          const nameParts = name.trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          const { startJourney: startJ } = await import("../automation");
          await startJ({
            email,
            firstName,
            lastName,
            phone: phone || undefined,
            gender: gender ?? "female",
            journeyKey,
            leadId,
          });
        }
      }
    } catch (err) {
      console.error("[Meta Webhook] Processing error:", err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULED TASK: Daily cross-matching endpoint
  // Called by Manus scheduled task every day to run the matching algorithm
  // Auth: uses session cookie injected by the scheduled task platform
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/scheduled/daily-matching", express.json(), async (req, res) => {
    try {
      // Accept cron calls (x-manus-cron-task-uid header) or admin session
      let isAuthorized = false;
      const cronHeader = req.headers['x-manus-cron-task-uid'];
      if (cronHeader) {
        isAuthorized = true; // Platform gateway restricts /api/scheduled/* to cron callers only
      } else {
        try {
          const user = await sdk.authenticateRequest(req as any);
          if (user && (user.role === 'admin' || (user as any).isCron)) isAuthorized = true;
        } catch { /* invalid session */ }
      }
      if (!isAuthorized) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'DB unavailable' }); return; }

      const { singles: singlesTable, matchmakingAnswers: answersTable, matches: matchesTable } = await import('../../drizzle/schema');
      const { computeFullScore, findMatchesWithText, MATCH_THRESHOLD } = await import('../compatibility');
      const { buildMatchExplanation } = await import('../routers');

      const allSingles = await db.select().from(singlesTable).where(eq(singlesTable.isActive, true));
      const allAnswerRows = await db.select().from(answersTable);
      const answersMap = new Map(allAnswerRows.map((r: any) => [r.singleId, JSON.parse(r.answersJson)]));
      const pool = allSingles.map((s: any) => ({
        ...s,
        seekingGender: s.seekingGender ?? (s.gender === 'female' ? 'male' : 'female'),
        answers: answersMap.get(s.id) ?? [],
      }));

      const seen = new Set<string>();
      let inserted = 0;
      let totalFound = 0;

      for (const person of pool) {
        const results = await findMatchesWithText(
          person.id, person.answers, person.dnaType,
          person.gender, person.seekingGender,
          person.about, person.partnerDescription,
          pool, MATCH_THRESHOLD
        );
        for (const { memberId, score } of results) {
          const key = [Math.min(person.id, memberId), Math.max(person.id, memberId)].join('-');
          if (seen.has(key)) continue;
          seen.add(key);
          totalFound++;
          const [existing] = await db.select().from(matchesTable).where(
            or(
              and(eq(matchesTable.singleAId, person.id), eq(matchesTable.singleBId, memberId) as any),
              and(eq(matchesTable.singleAId, memberId), eq(matchesTable.singleBId, person.id) as any)
            )
          ).limit(1);
          if (existing) continue;
          const candidateInPool = pool.find((s: any) => s.id === memberId);
          let scoreBreakdown: string | undefined;
          let autoExplanation: string | undefined;
          if (candidateInPool) {
            const bd = computeFullScore(person, candidateInPool, person.answers, candidateInPool.answers ?? []);
            scoreBreakdown = JSON.stringify({ ...bd, algorithm: 'v8.0' });
            try { autoExplanation = await buildMatchExplanation(person as any, candidateInPool as any, bd as any); } catch { /* skip */ }
          }
          const now = Date.now();
          await db.insert(matchesTable).values({
            singleId: person.id, matchedSingleId: memberId,
            singleAId: person.id, singleBId: memberId, score,
            scoreBreakdown, autoExplanation,
            proposedAt: now, status: 'pending', updatedAt: now,
          } as any);
          inserted++;
        }
      }
      console.log(`[Daily Matching] Found ${totalFound}, inserted ${inserted} new matches`);
      res.json({ success: true, totalFound, newlyInserted: inserted, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('[Daily Matching] Error:', err);
      void sendErrorAlert({ source: "express:daily-matching", error: err, context: { route: req.path } });
      res.status(500).json({ error: String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULED TASK: Daily age update based on birthDate
  // Runs every morning to update age for anyone who had a birthday
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/scheduled/update-ages", express.json(), async (req, res) => {
    try {
      // Accept cron calls or admin session
      let isAuthorized = false;
      const cronHeader = req.headers['x-manus-cron-task-uid'];
      if (cronHeader) {
        isAuthorized = true;
      } else {
        try {
          const user = await sdk.authenticateRequest(req as any);
          if (user && (user.role === 'admin' || (user as any).isCron)) isAuthorized = true;
        } catch { /* invalid session */ }
      }
      if (!isAuthorized) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'DB unavailable' }); return; }

      const { singles: singlesTable } = await import('../../drizzle/schema');
      const { isNotNull, ne, sql: drizzleSql } = await import('drizzle-orm');

      // Fetch all singles that have a birthDate stored
      const singlesWithBirthDate = await db
        .select({ id: singlesTable.id, birthDate: singlesTable.birthDate, age: singlesTable.age })
        .from(singlesTable)
        .where(isNotNull(singlesTable.birthDate));

      const today = new Date();
      let updated = 0;

      for (const single of singlesWithBirthDate) {
        if (!single.birthDate) continue;
        const birth = new Date(single.birthDate);
        if (isNaN(birth.getTime())) continue;

        // Calculate correct age
        let correctAge = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          correctAge--;
        }

        // Only update if age has changed
        if (correctAge !== single.age && correctAge > 0 && correctAge < 120) {
          await db.update(singlesTable)
            .set({ age: correctAge })
            .where(eq(singlesTable.id, single.id));
          updated++;
        }
      }

      console.log(`[UpdateAges] Updated ${updated} singles out of ${singlesWithBirthDate.length} with birthDate`);
      res.json({ ok: true, updated, total: singlesWithBirthDate.length });
    } catch (err) {
      console.error('[UpdateAges] Error:', err);
      void sendErrorAlert({ source: "express:update-ages", error: err, context: { route: req.path } });
      res.status(500).json({ error: String(err) });
    }
  });

  // tRPC API - with ECONNRESET recovery middleware
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: async ({ error, path, type }) => {
        const errMsg = String(error?.cause ?? error);
        if (errMsg.includes('ECONNRESET') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
          const { resetDb } = await import('../db');
          resetDb();
        }
        // Email an alert on real server errors. Skip expected client-side errors
        // (bad input, unauthorized, forbidden, not-found) to avoid inbox noise.
        const code = error?.code;
        const clientErrorCodes = ['BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'TIMEOUT', 'CONFLICT', 'PARSE_ERROR', 'METHOD_NOT_SUPPORTED', 'TOO_MANY_REQUESTS'];
        if (!code || !clientErrorCodes.includes(code)) {
          void sendErrorAlert({
            source: 'tRPC',
            error,
            context: { path: path ?? '(unknown)', type: type ?? '(unknown)', code: code ?? '(none)' },
          });
        }
      },
    })
  );
  // ─── Domain-based routing: matchbyhilit.com → English site ─────────────────
  // When a request arrives from matchbyhilit.com (or www.matchbyhilit.com),
  // redirect the root path to /en so visitors land on the English homepage.
  // All /en/* paths are served normally (no redirect needed).
  app.use((req, res, next) => {
    const host = (req.headers.host || "").toLowerCase().replace(/^www\./, "");
    if (host === "matchbyhilit.com") {
      const path = req.path;
      // If already under /en, serve normally
      if (path.startsWith("/en") || path.startsWith("/api") || path.startsWith("/assets")) {
        return next();
      }
      // Redirect root and any other path to /en equivalent
      if (path === "/" || path === "") {
        return res.redirect(301, "/en");
      }
      // For any other path on matchbyhilit.com, redirect to /en + path
      return res.redirect(301, "/en" + path);
    }
    next();
  });

  // ─── Express error-handling middleware ────────────────────────────────────
  // Catches errors thrown from REST routes (non-tRPC). Placed before static
  // serving. Emails an alert then returns a 500. Must keep the 4-arg signature
  // so Express treats it as an error handler.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Express error]', req.method, req.path, err);
    void sendErrorAlert({
      source: 'express',
      error: err,
      context: { method: req.method, route: req.path },
    });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ─── Scheduler master switch ──────────────────────────────────────────────
  // This project shares the LIVE database with the original project. To avoid
  // duplicate emails / WhatsApp / matches being sent by two running instances,
  // all background schedulers are DISABLED here unless SCHEDULERS_ENABLED="true".
  const SCHEDULERS_ENABLED = process.env.SCHEDULERS_ENABLED === "true";
  if (!SCHEDULERS_ENABLED) {
    console.log("[Scheduler] All background schedulers are DISABLED (SCHEDULERS_ENABLED != 'true'). This instance will not send automated emails/WhatsApp or run matching.");
  }

  // Email automation scheduler - runs every 5 minutes
  const EMAIL_SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes
  if (SCHEDULERS_ENABLED) setInterval(async () => {
    try {
      const count = await processPendingEmails();
      if (count > 0) {
        console.log(`[Scheduler] Sent ${count} scheduled emails`);
      }
      const reminders = await processMeetingReminders();
      if (reminders > 0) {
        console.log(`[Scheduler] Sent ${reminders} meeting reminders`);
      }
      // Send follow-up emails to singles who haven't responded to match proposals after 7 days
      const followUps = await processMatchFollowUps();
      if (followUps > 0) {
        console.log(`[MatchFollowUp] Sent ${followUps} follow-up emails`);
      }
      // Retry match proposal emails that may not have been delivered (server restart race condition)
      const retried = await retryUnsentMatchEmails();
      if (retried > 0) {
        console.log(`[MatchRetry] Retried ${retried} unsent match proposals`);
      }
      // Post-match lifecycle follow-ups (week + month after both approved)
      const matchedFollowUps = await processMatchedPairFollowUps();
      if (matchedFollowUps > 0) {
        console.log(`[MatchedFollowUp] Sent ${matchedFollowUps} post-match lifecycle emails`);
      }
      // Expire matches that haven't been responded to within 48 hours
      const expired = await expireStaleMatches();
      if (expired > 0) {
        console.log(`[ExpiryScheduler] Expired ${expired} stale matches`);
      }
    } catch (err) {
      console.error("[Scheduler] Processing error:", err);
      // If it's a connection reset, clear the DB singleton so it reconnects on next run
      const errMsg = String(err);
      if (errMsg.includes('ECONNRESET') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
        const { resetDb } = await import('../db');
        resetDb();
      }
    }
  }, EMAIL_SCHEDULER_INTERVAL);
  if (SCHEDULERS_ENABLED) console.log("[Scheduler] Email + meeting reminder scheduler started (every 5 min)");

  // Tri-daily matchmaking scheduler - runs every 3 days at 09:00 Israel time
  // Check every hour if it's time to run
  const MATCH_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
  const MATCH_RUN_INTERVAL_DAYS = 3;
  let lastMatchRunDate = "";
  if (SCHEDULERS_ENABLED) setInterval(async () => {
    try {
      const now = new Date();
      // Israel timezone (UTC+3)
      const israelTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const hour = israelTime.getUTCHours();
      const dateStr = israelTime.toISOString().split("T")[0];

      // Run at 09:00 Israel time, once per trigger day, every 3 days
      if (hour === 9 && lastMatchRunDate !== dateStr) {
        // Check if 3 days have passed since last run
        const shouldRun = !lastMatchRunDate ||
          (israelTime.getTime() - new Date(lastMatchRunDate + "T09:00:00+03:00").getTime()) >= MATCH_RUN_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

        if (shouldRun) {
          lastMatchRunDate = dateStr;
          console.log("[MatchScheduler] Running tri-daily matching (full algorithm)...");
          const result = await runWeeklyMatching();
          console.log(`[MatchScheduler] Done: ${result.newMatches} new matches found, notified owner: ${result.notified}`);
        }
      }
    } catch (err) {
      console.error("[MatchScheduler] Error:", err);
    }
  }, MATCH_CHECK_INTERVAL);
  if (SCHEDULERS_ENABLED) console.log("[MatchScheduler] Tri-daily matching scheduler started (runs every 3 days at 09:00 IL, full algorithm)");

  // ─── Meta Lead Ads Polling (every 1 minute) ───────────────────────────────
  // Pulls new leads directly from Meta Graph API - does NOT rely on webhook
  // Tracks the last seen lead timestamp to avoid duplicates
  let metaLastCheckedAt = Date.now() - 2 * 60 * 1000; // start 2 min ago to catch recent leads
  const META_POLL_INTERVAL = 60 * 1000; // 1 minute

  async function pollMetaLeads() {
    try {
      const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
      if (!accessToken) return;

      const formIds = [
        { id: process.env.META_FORM_ID_GUIDE || "", source: "meta_lead_guide" as const, journey: "free_guide_nurture" as const },
        { id: process.env.META_FORM_ID_GUIDE_MF || "", source: "meta_lead_guide" as const, journey: "free_guide_nurture" as const },
        { id: process.env.META_FORM_ID_DNA || "", source: "meta_lead_dna" as const, journey: "meta_lead_dna" as const },
        { id: process.env.META_FORM_ID_CALL || "", source: "meta_lead_call" as const, journey: "sales_call_lead" as const },
      ].filter(f => f.id);

      const db = await getDb();
      if (!db) return;

      const { crmLeads: crmLeadsTable } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const { startJourney: startJ } = await import("../automation");

      let totalNew = 0;
      for (const form of formIds) {
        // Fetch leads created after last check
        const sinceTs = Math.floor(metaLastCheckedAt / 1000);
        const url = `https://graph.facebook.com/v20.0/${form.id}/leads?access_token=${accessToken}&limit=50&fields=id,created_time,field_data&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${sinceTs}}]`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json() as any;
        const leads = data?.data || [];

        for (const lead of leads) {
          const fields: Record<string, string> = {};
          for (const f of (lead.field_data || [])) {
            fields[f.name] = f.values?.[0] ?? "";
          }
          const name = fields["full_name"] || fields["name"] || fields["שם מלא"] || "";
          const email = fields["email"] || fields["מייל"] || "";
          const phone = fields["phone_number"] || fields["phone"] || fields["טלפון"] || "";
          if (!email || !name) continue;

          // Check if already exists
          const [existing] = await db.select({ id: crmLeadsTable.id }).from(crmLeadsTable).where(eqOp(crmLeadsTable.email, email)).limit(1);
          if (existing) continue;

          const nowTs = Date.now();
          const inserted = await db.insert(crmLeadsTable).values({
            name, email, phone: phone || undefined,
            source: form.source, status: "new_lead",
            createdAt: nowTs, updatedAt: nowTs,
          });
          const leadId = (inserted as any)[0].insertId as number;
          console.log(`[MetaPoller] New lead: ${name} (${email}), form: ${form.id}`);

          await notifyOwner({
            title: `ליד מטא חדש! 📣 (${form.source})`,
            content: `${name} (${email}${phone ? `, ${phone}` : ""}) , מסע: ${form.journey}`,
          });
          notifyOwnerWhatsApp({ name, email, phone: phone || undefined, source: form.source }).catch(console.error);
          if (phone) {
            sendLeadWelcomeWhatsApp({ name, phone, source: form.source }).catch(console.error);
          }
          const nameParts = name.trim().split(" ");
          await startJ({
            email, firstName: nameParts[0], lastName: nameParts.slice(1).join(" "),
            phone: phone || undefined, gender: "female",
            journeyKey: form.journey, leadId,
          });
          totalNew++;
        }
      }

      if (totalNew > 0) console.log(`[MetaPoller] Imported ${totalNew} new leads from Meta API`);
      metaLastCheckedAt = Date.now();
    } catch (err) {
      console.error("[MetaPoller] Error:", err);
    }
  }

  // Run immediately on startup to catch any missed leads
  if (SCHEDULERS_ENABLED) {
    pollMetaLeads();
    setInterval(pollMetaLeads, META_POLL_INTERVAL);
    console.log("[MetaPoller] Meta Lead Ads polling started (every 1 minute)");
  }
}

startServer().catch(console.error);
