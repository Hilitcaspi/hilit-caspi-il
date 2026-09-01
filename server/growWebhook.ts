/**
 * Grow Payment Webhook Handler
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives POST from Grow after every successful payment.
 * Identifies the product from paymentDesc / paymentSum / paymentLinkProcessToken,
 * then triggers the same logic that was previously done manually via the
 * thank-you page email-input form.
 *
 * Webhook format (PaymentLinks – New system):
 * {
 *   "err": "",
 *   "status": "1",
 *   "data": {
 *     "fullName": "...",
 *     "payerEmail": "...",
 *     "payerPhone": "...",
 *     "sum": "149",
 *     "description": "...",
 *     "transactionId": "...",
 *     "paymentLinkProcessToken": "...",
 *     ...
 *   }
 * }
 *
 * Legacy format also supported (top-level fields):
 * { "fullName": "...", "payerEmail": "...", "paymentSum": 149, "paymentDesc": "...", ... }
 *
 * Configure in Grow dashboard:
 *   Webhook URL: https://hilitcaspi.com/api/grow/webhook
 *   Webhook Key (optional secret): set as GROW_WEBHOOK_KEY env var
 */

import crypto from "crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { productAccessTokens, leads, singles, crmLeads, liveEventRegistrations, webhookIdempotency, completedPayments, plusPilotMembers, plusPaymentEvents } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { notifyOwner } from "./_core/notification";
import { startJourney } from "./automation";
import { ga4Purchase, clientIdFromEmail } from "./_core/ga4";
import { capiPurchase } from "./_core/metaCapi";
import { buildNewYearBundleAccessEmail } from "./newYearBundleEmail";

const SITE_BASE = "https://hilitcaspi.com";

// ─── Product detection ────────────────────────────────────────────────────────
// Map Grow payment link tokens/descriptions to internal product keys
// paymentLinkProcessToken prefix maps to payment link ID in the URL
const GROW_LINK_TO_PRODUCT: Record<string, string> = {
  // Extract from pay.grow.link URLs:
  // Database/Matchmaking: 60e9eca1047ef4a2d619c1ed0bca68a2-MzI2MDI4OQ
  "60e9eca1047ef4a2d619c1ed0bca68a2": "database",
  // Guide: 0810b574ab63e234ec29be0689a54aa7-MzI2MDM0OA
  "0810b574ab63e234ec29be0689a54aa7": "guide",
  // Course: 0428cfc2217c8ce98a6897cc1629416f-MzI2MjUxMQ
  "0428cfc2217c8ce98a6897cc1629416f": "course",
  // Coaching: 7e95519ddda0960adcffa9674ae563a5-MzI2MjUxOQ
  "7e95519ddda0960adcffa9674ae563a5": "coaching",
  // Single session: 2aed60f53da69fa3144a3cc35554f915-MzI3MDgyOQ
  "2aed60f53da69fa3144a3cc35554f915": "session",
  // Coaching המסע (12 sessions): OTkwNzQ~aa488db43ae3e0e652165d4a938bb90e-MzU2MTgzNQ
  "aa488db43ae3e0e652165d4a938bb90e": "coaching_mas",
};

// Fallback: detect by payment amount
export function detectProductByAmount(sum: number): string | null {
  if (sum >= 19 && sum <= 21) return "match_boost";
  if (sum === 399 || sum === 449) return "bundle_new_year";
  if (sum === 349) return "bundle_tubav"; // Tu B'Av bundle: database + guide
  if (sum >= 3800 && sum <= 4500) return "coaching_mas"; // המסע full price (4200) or with coupon
  if (sum >= 400 && sum <= 460) return "coaching_mas"; // המסע installment (4200/10 = 420)
  if (sum >= 2200 && sum <= 3200) return "coaching"; // הבנה full price (2960) or with coupon (2664)
  if (sum >= 340 && sum <= 400) return "coaching";   // הבנה installment (2960/8 = 370)
  if (sum >= 480 && sum <= 520) return "session";
  if (sum >= 240 && sum <= 260) return "course";
  if (sum >= 140 && sum <= 160) return "guide";
  if (sum >= 280 && sum <= 320) return "database"; // ₪299
  if (sum >= 85 && sum <= 115) return "live_event";  // ₪99 live Q&A
  return null;
}

// Fallback: detect by description
export function detectProductByDesc(desc: string): string | null {
  const d = (desc || "").toLowerCase();
  if (d.includes("match boost") || d.includes("match_boost") || d.includes("בוסט התאמה") || d.includes("boost - הצעת התאמה")) return "match_boost";
  if (d.includes("database plus") || d.includes("מאגר פלוס") || d.includes("database+")) return "plus";
  if (d.includes("חבילת שנה חדשה") || d.includes("bundle_new_year") || (d.includes("מאגר") && d.includes("מדריך") && d.includes("קורס"))) return "bundle_new_year";
  // IMPORTANT: bundle_tubav MUST be checked before guide/database because its description contains both "מדריך" and "מאגר"
  if (d.includes("חבילת טו באב") || d.includes("bundle_tubav") || (d.includes("מאגר") && d.includes("מדריך"))) return "bundle_tubav";
  if (d.includes("המסע") && (d.includes("ליווי") || d.includes("12"))) return "coaching_mas";
  if (d.includes("הבנה") && (d.includes("ליווי") || d.includes("8"))) return "coaching";
  if (d.includes("ליווי") || d.includes("coaching") || d.includes("8 פגישות") || d.includes("פגישות אישיות")) return "coaching";
  if (d.includes("פגישה בודדת") || d.includes("session") || d.includes("פגישה אחת")) return "session";
  if (d.includes("קורס") || d.includes("course") || d.includes("המסע")) return "course";
  if (d.includes("מדריך") || d.includes("guide") || d.includes("לבחור נכון")) return "guide";
  if (d.includes("מאגר") || d.includes("database") || d.includes("רווקים")) return "database";
  if (d.includes("לייב") || d.includes("live") || d.includes("שאלות ותשובות") || d.includes("16.6") || d.includes("זום")) return "live_event";
  return null;
}

// ─── Product handlers ─────────────────────────────────────────────────────────

async function handleGuide(email: string, name: string, opts?: { skipJourney?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Idempotency: skip if token already exists for this email+product
  const existing = await db.select().from(productAccessTokens)
    .where(and(eq(productAccessTokens.email, email), eq(productAccessTokens.product, "guide_149")))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[GrowWebhook] Guide token already exists for ${email}, skipping`);
    return;
  }

  await db.insert(leads).values({ name, email, phone: "", source: "paid_guide" }).catch(() => {});
  const now = Date.now();
  const guideToken = crypto.randomBytes(32).toString("hex");
  await db.insert(productAccessTokens).values({
    token: guideToken, email, name, product: "guide_149",
    expiresAt: now + 365 * 24 * 60 * 60 * 1000, accessCount: 0, createdAt: now,
  });
  const PAID_GUIDE_URL = `${SITE_BASE}/guide/view?token=${guideToken}`;
  const firstName = name.trim().split(" ")[0];
  await notifyOwner({ title: "רכישת מדריך חדשה! 💛", content: `${name} (${email}) רכש את המדריך ב-149 ₪` });
  sendEmail({
    to: { email, name },
    subject: "המדריך שלך מחכה 💛",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">המדריך ״לבחור נכון״ מחכה לך — הקישור האישי שלך בפנים &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים למדריך! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הקישור האישי שלכם מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">שמחתי מאוד שרכשתם את המדריך "לבחור נכון".</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">המדריך הזה הוא חלק מתהליך. הוא לא נועד לקריאה חטופה אחת אלא לעבודה אמיתית לאורך כמה ימים. קחו את הזמן עם כל תרגיל, חשבו, ערערו על הנחות שנדמות מובנות מאליהן.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">התשובות שלכם נשמרות ואפשר לצאת ולחזור אליו בכל עת דרך הקישור הזה. אם תגיעו לליווי, נוכל לעבוד עם התוצרים שיצאו ממנו יחד.</p><div style="text-align:center;margin:32px 0;"><a href="${PAID_GUIDE_URL}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">פתיחת המדריך</a></div><p style="font-size:13px;color:#888;margin:0 0 24px;text-align:center;">הקישור הוא אישי. שמרו אותו לגישה מכל מכשיר.</p><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלתם מייל זה כי רכשתם את המדריך של הילית כספי.<br><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][Guide] Email failed:", err));
  // Update CRM lead status to client_guide
  const existingCrmGuide = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.email, email)).limit(1);
  if (existingCrmGuide.length > 0) {
    await db.update(crmLeads).set({ status: "client_guide", product: "guide", updatedAt: now }).where(eq(crmLeads.id, existingCrmGuide[0].id));
  } else {
    await db.insert(crmLeads).values({ name, email, status: "client_guide", product: "guide", source: "guide_form", createdAt: now, updatedAt: now }).catch(() => {});
  }
  // Start nurture journey (skip when called from bundle flow to avoid duplicate emails)
  if (!opts?.skipJourney) {
    startJourney({ email, firstName, lastName: name.split(" ").slice(1).join(" ") || "", phone: "", gender: "female", journeyKey: "women_guide" }).catch(() => {});
  }
}

async function handleCourse(
  email: string,
  name: string,
  opts: { skipJourney?: boolean; emailMode?: "standalone" | "new_year_bundle" } = {},
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const existing = await db.select().from(productAccessTokens)
    .where(and(eq(productAccessTokens.email, email), eq(productAccessTokens.product, "course_249")))
    .orderBy(desc(productAccessTokens.createdAt))
    .limit(1);
  const isNewYearBundle = opts.emailMode === "new_year_bundle";
  if (existing.length > 0 && !isNewYearBundle) {
    console.log(`[GrowWebhook] Course token already exists for ${email}, skipping`);
    return;
  }

  const now = Date.now();
  const existingGuide = await db.select().from(productAccessTokens)
    .where(and(eq(productAccessTokens.email, email), eq(productAccessTokens.product, "guide_149")))
    .orderBy(desc(productAccessTokens.createdAt))
    .limit(1);
  const courseToken = existing[0]?.token || crypto.randomBytes(32).toString("hex");
  const guideToken = existingGuide[0]?.token || crypto.randomBytes(32).toString("hex");
  if (existing.length === 0) {
    await db.insert(leads).values({ name, email, phone: "", source: "paid_course" }).catch(() => {});
    await db.insert(productAccessTokens).values({
      token: courseToken, email, name, product: "course_249",
      expiresAt: now + 365 * 24 * 60 * 60 * 1000, accessCount: 0, createdAt: now,
    });
  }
  if (existingGuide.length === 0) {
    await db.insert(productAccessTokens).values({
      token: guideToken, email, name, product: "guide_149",
      expiresAt: now + 365 * 24 * 60 * 60 * 1000, accessCount: 0, createdAt: now,
    });
  }
  const COURSE_URL = `${SITE_BASE}/course/view?token=${courseToken}`;
  const GUIDE_URL = `${SITE_BASE}/guide/view?token=${guideToken}`;
  const firstName = name.trim().split(" ")[0];
  await notifyOwner({ title: "רכישת קורס חדשה! 🎓", content: `${name} (${email}) רכש את הקורס ב-249 ₪` });
  if (isNewYearBundle) {
    const bundleEmail = buildNewYearBundleAccessEmail({
      firstName,
      email,
      courseUrl: COURSE_URL,
      guideUrl: GUIDE_URL,
    });
    await sendEmail({
      to: { email, name },
      ...bundleEmail,
    });
  } else {
    sendEmail({
    to: { email, name },
    subject: "הקורס שלך מחכה! 🎓",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">תודה על הרכישה! 🎓</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הקורס שלך מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחתי מאוד שהצטרפתם לקורס "המסע"! 5 מודולים מעשיים שיוביל אתכם מהמקום שבו אתם תקועים אל האהבה שאתם מחפשים.</p><div style="text-align:center;margin:32px 0;"><a href="${COURSE_URL}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">כניסה לקורס</a></div><div style="background:#ffe27c;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:15px;color:#191265;font-weight:bold;margin:0 0 8px;">🎁 הבונוס שלך - המדריך הדיגיטלי</p><p style="font-size:14px;color:#191265;margin:0 0 16px;">כמי שרכש את הקורס, מגיע לך גם המדריך "לבחור נכון" - ללא תשלום נוסף.</p><div style="text-align:center;"><a href="${GUIDE_URL}" style="display:inline-block;background:#191265;color:#ffe27c;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">פתיחת המדריך</a></div></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת את הקורס של הילית כספי.<br><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
    }).catch(err => console.error("[GrowWebhook][Course] Email failed:", err));
  }
    // Update CRM lead status to client_course
  const existingCrmCourse = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.email, email)).limit(1);
  if (existingCrmCourse.length > 0) {
    await db.update(crmLeads).set({ status: "client_course", product: "course", updatedAt: now }).where(eq(crmLeads.id, existingCrmCourse[0].id));
  } else {
    await db.insert(crmLeads).values({ name, email, status: "client_course", product: "course", source: "direct", createdAt: now, updatedAt: now }).catch(() => {});
  }
  if (!opts.skipJourney) {
    startJourney({ email, firstName, lastName: name.split(" ").slice(1).join(" ") || "", phone: "", gender: "female", journeyKey: "women_course" }).catch(() => {});
  }
}
async function handleCoaching(email: string, name: string) {
  const db = await getDb();
  // Idempotency: skip if already processed (handles installment webhooks)
  if (db) {
    const existing = await db.select().from(leads)
      .where(and(eq(leads.email, email), eq(leads.source, "paid_coaching")))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[GrowWebhook] Coaching already processed for ${email}, skipping (installment payment)`);
      return;
    }
  }
  const firstName = name.trim().split(" ")[0];
  await notifyOwner({ title: "רכישת ליווי אישי חדשה! 🌟", content: `${name} (${email}) רכש חבילת ליווי` });
  sendEmail({
    to: { email, name },
    subject: "ברוכים הבאים לתהליך! 🌟",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים לתהליך! 🌟</h1></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחתי מאוד שהחלטתם להצטרף לתהליך הליווי האישי! זה צעד אמיץ ומשמעותי.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">אני אצור קשר ביום העסקים הקרוב כדי לקבוע את הפגישה הראשונה שלנו ולהתחיל את המסע יחד.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">בינתיים, אם יש שאלות, אני כאן:<br><a href="https://wa.me/972552442334" style="color:#191265;font-weight:bold;">וואטסאפ</a></p><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;"><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][Coaching] Email failed:", err));
  startJourney({ email, firstName, lastName: name.split(" ").slice(1).join(" ") || "", phone: "", gender: "female", journeyKey: "women_transformation" }).catch(() => {});
}

async function handleCoachingMas(email: string, name: string) {
  const db = await getDb();
  // Idempotency: skip if already processed (handles installment webhooks)
  if (db) {
    const existing = await db.select().from(leads)
      .where(and(eq(leads.email, email), eq(leads.source, "paid_coaching_mas")))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[GrowWebhook] CoachingMas already processed for ${email}, skipping (installment payment)`);
      return;
    }
  }
  const firstName = name.trim().split(" ")[0];
  await notifyOwner({ title: "רכישת ליווי אישי חדשה! 🌟 תהליך המסע", content: `${name} (${email}) רכש תהליך המסע (12 פגישות) ב-4,200 ₪` });
  if (db) {
    await db.insert(leads).values({ name, email, phone: "", source: "paid_coaching_mas" }).catch(() => {});
    const now = Date.now();
    const existingCrm = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.email, email)).limit(1);
    if (existingCrm.length > 0) {
      await db.update(crmLeads).set({ status: "client_coaching", product: "coaching_mas", updatedAt: now }).where(eq(crmLeads.id, existingCrm[0].id));
    } else {
      await db.insert(crmLeads).values({ name, email, status: "client_coaching", product: "coaching_mas", source: "direct", createdAt: now, updatedAt: now }).catch(() => {});
    }
  }
  sendEmail({
    to: { email, name },
    subject: "ברוכים הבאים לתהליך המסע! 🌟",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים לתהליך המסע! 🌟</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">12 פגישות שישנו את הכל</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחתי מאוד שהחלטתם להצטרף לתהליך המסע המלא! 5 חודשים שליווי אישי עמוק שיובילו אתכם מהבנה עצמית עד שינוי אמיתי באיך מתנהלים בזוגיות.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">אני אצור קשר ביום העסקים הקרוב כדי לקבוע את הפגישה הראשונה שלנו ולהתחיל את המסע יחד.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">בינתיים, אם יש שאלות, אני כאן:<br><a href="https://wa.me/972552442334" style="color:#191265;font-weight:bold;">וואטסאפ</a></p><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;"><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][CoachingMas] Email failed:", err));
  startJourney({ email, firstName, lastName: name.split(" ").slice(1).join(" ") || "", phone: "", gender: "female", journeyKey: "women_transformation" }).catch(() => {});
}

async function handleSession(email: string, name: string) {
  const db = await getDb();
  // Idempotency: skip if already processed
  if (db) {
    const existing = await db.select().from(leads)
      .where(and(eq(leads.email, email), eq(leads.source, "paid_session")))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[GrowWebhook] Session already processed for ${email}, skipping`);
      return;
    }
    await db.insert(leads).values({ name, email, phone: "", source: "paid_session" }).catch(() => {});
  }
  const firstName = name.trim().split(" ")[0];
  sendEmail({
    to: { email, name },
    subject: "הפגישה שלנו מחכה! 💬",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">הרכישה הושלמה! 💬</h1></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">תודה שרכשתם פגישה אישית! אני אצור קשר ביום העסקים הקרוב לתיאום מועד הפגישה.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">בינתיים, אם יש שאלות, אני כאן:<br><a href="https://wa.me/972552442334" style="color:#191265;font-weight:bold;">וואטסאפ</a></p><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;"><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][Session] Email failed:", err));
}

async function handleDatabase(email: string, name: string, phone: string, transactionId: string = "") {
  const db = await getDb();
  if (!db) return;
  const firstName = name.trim().split(" ")[0];
  const lastName = name.trim().split(" ").slice(1).join(" ") || "";
  const now = Date.now();

  // Idempotency: check if singles record already exists for this phone/email
  // FIX: search by BOTH email AND phone (OR) to catch all cases.
  // Previously only searched by phone (if available), causing duplicates when
  // the user already registered via the form with a different phone number.
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone ? phone.trim().replace(/[\s\-]/g, "") : "";
  let singleRecord = await db.select({ id: singles.id, questionnaireToken: singles.questionnaireToken })
    .from(singles)
    .where(
      or(
        sql`LOWER(${singles.email}) = ${normalizedEmail}`,
        normalizedPhone.length >= 9 ? eq(singles.phone, normalizedPhone) : sql`0=1`
      )
    )
    .limit(1)
    .then(r => r[0] ?? null);

  if (singleRecord) {
    // Existing record found (created by registerBasicProfile with isPaid=false), mark as paid + active now
    await db.update(singles)
      .set({ isPaid: true, isActive: true, paymentRef: transactionId || null, subscriptionStartedAt: now, updatedAt: now })
      .where(eq(singles.id, singleRecord.id));
    console.log(`[GrowWebhook] Marked existing single id=${singleRecord.id} as isPaid=true + isActive=true (tx=${transactionId}) for ${email}`);
  } else {
    // Create singles record with personal questionnaire token
    const token = crypto.randomBytes(32).toString("hex");
    const inserted = await db.insert(singles).values({
      firstName,
      lastName,
      gender: "male" as const, // will be corrected when they fill the questionnaire
      age: 0,
      city: "",
      phone: phone || null,
      email,
      questionnaireToken: token,
      isPaid: true,
      paymentRef: transactionId || null,
      subscriptionStartedAt: now,
      isActive: true, // show in database immediately after payment (profile may be incomplete)
      createdAt: now,
      updatedAt: now,
    });
    const singleId = (inserted as any)[0].insertId as number;
    singleRecord = { id: singleId, questionnaireToken: token };

    // Update or create CRM lead
    const existingCrm = await db.select({ id: crmLeads.id })
      .from(crmLeads)
      .where(eq(crmLeads.email, email))
      .limit(1)
      .then(r => r[0] ?? null);
    if (existingCrm) {
      await db.update(crmLeads)
        .set({ singleId, product: "database", status: "client_database", updatedAt: now })
        .where(eq(crmLeads.id, existingCrm.id));
    } else {
      await db.insert(crmLeads).values({
        name, email, phone: phone || "", source: "direct",
        product: "database", status: "client_database",
        singleId, createdAt: now, updatedAt: now,
      }).catch(() => {});
    }
  }

  await db.insert(leads).values({ name, email, phone, source: "paid_database" }).catch(() => {});

  const joinUrl = `${SITE_BASE}/join/questionnaire?token=${singleRecord.questionnaireToken}`;

  await notifyOwner({ title: "תשלום מאגר חדש! 💛", content: `${name} (${email}) שילם דמי רישום למאגר ב-299 ₪. Transaction: ${transactionId || 'N/A'}` });

  // Send personal join link email
  sendEmail({
    to: { email, name },
    subject: `${firstName}, הקישור האישי שלך למאגר 💛`,
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">הצטרפת למאגר הרווקים שלי — מלאי את השאלון המדעי ואמצא לך התאמה &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים למאגר! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הקישור האישי שלך מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחה שהחלטת להצטרף למאגר הרווקים שלי. הקישור הבא הוא אישי ומאפשר שימוש חד-פעמי בלבד.</p><div style="text-align:center;margin:32px 0;"><a href="${joinUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">מילוי השאלון המדעי</a></div><div style="background:#f0eadc;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:14px;color:#191265;font-weight:bold;margin:0 0 8px;">לפני שמתחילים:</p><ul style="font-size:14px;color:#555;margin:0;padding-right:20px;line-height:2;"><li>מומלץ למלא אותו במקום שקט ולהקדיש את הזמן</li><li>הכינו תמונה עדכונית ואמיתית</li><li>הקישור תקף ל-30 יום ולשימוש חד-פעמי בלבד</li></ul></div><p style="font-size:13px;color:#888;margin:24px 0 0;">לא ניתן להעביר את הקישור לאחרים. אם יש בעיה, כתבו לי בוואטסאפ.</p><div style="text-align:center;margin:24px 0;"><a href="https://wa.me/972552442334" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">וואטסאפ עם הילית</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת כניסה למאגר הרווקים של הילית כספי.<br><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][Database] Email failed:", err));
}

// ─── Live Event handler ─────────────────────────────────────────────────────────
async function handleLiveEvent(email: string, name: string, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Idempotency: skip if already registered
  const existing = await db.select().from(liveEventRegistrations)
    .where(eq(liveEventRegistrations.email, email))
    .limit(1);

  const firstName = name.trim().split(" ")[0];
  const now = Date.now();

  if (existing.length > 0) {
    console.log(`[GrowWebhook] Live event already registered for ${email}, skipping`);
    return;
  }

  // Register in DB
  await db.insert(liveEventRegistrations).values({
    eventSlug: "live-qa-june-2026",
    name,
    email,
    phone: phone || "",
    guideSent: true,
    confirmationSent: true,
    createdAt: now,
  });

  // Generate guide token and send email
  const guideToken = crypto.randomBytes(32).toString("hex");
  await db.insert(productAccessTokens).values({
    token: guideToken, email, name, product: "guide_live_bonus",
    expiresAt: now + 365 * 24 * 60 * 60 * 1000, accessCount: 0, createdAt: now,
  }).catch(() => {});

  const GUIDE_URL = `${SITE_BASE}/guide/view?token=${guideToken}`;
  const ZOOM_LINK = "https://us06web.zoom.us/j/86584508771?pwd=XYV0VbPuuGMmaxdMHoOpCa8mmFxx2n.1";

  await notifyOwner({
    title: "נרשם/ה ללייב! 🎉",
    content: `${name} (${email}) רכש/ה כרטיס ללייב 16.6`,
  });

  sendEmail({
    to: { email, name },
    subject: "ברוכים הבאים ללייב! 💥",
    htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים ללייב! 💥</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">שאלות ותשובות עם הילית כספי | יום שלישי 16.6 ב-20:30</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">שמחתי שהצטרפתם ללייב שלי! ניפגש ביום שלישי <strong>16.6 בשעה 20:30</strong> בזום.</p><div style="background:#f8f6ff;border-radius:12px;padding:20px 24px;margin:20px 0;text-align:center;"><p style="font-size:14px;color:#191265;font-weight:bold;margin:0 0 12px;">קישור הזום שלך:</p><a href="${ZOOM_LINK}" style="display:inline-block;background:#191265;color:white;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">כניסה ללייב בזום</a><p style="font-size:12px;color:#888;margin:10px 0 0;">Meeting ID: 865 8450 8771 | Passcode: 696071</p></div><div style="background:#191265;border-radius:12px;padding:20px 24px;margin:20px 0;"><p style="color:#ffe27c;font-weight:bold;font-size:15px;margin:0 0 8px;">🎁 בונוס מיוחד ל-50 הנרשמים הראשונים</p><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6;margin:0 0 16px;">אתם אחד מ-50 הנרשמים הראשונים וזכאים לקבל בחינם את המדריך שלי “לבחור נכון” — שווי ₪249.</p><div style="text-align:center;"><a href="${GUIDE_URL}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">פתיחת המדריך</a></div></div><p style="font-size:14px;color:#555;line-height:1.7;margin:16px 0;">ממליצה להכין שאלות מראש — לא כל אחד יספיק לשאול בלייב. אפשר גם לשלוח שאלות מראש בווטסאפ:</p><div style="text-align:center;"><a href="https://wa.me/972552442334" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">שלחי/שלח שאלה לפני הלייב</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלתם מייל זה כי נרשמתם ללייב של הילית כספי.<br><a href="${SITE_BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  }).catch(err => console.error("[GrowWebhook][LiveEvent] Email failed:", err));
}

// ─── Tu B'Av Bundle handler ─────────────────────────────────────────────────────
async function handleBundleTuBav(email: string, name: string, phone: string, transactionId: string = "") {
  // Bundle = Database + Guide. Run both handlers.
  // 1. Handle database onboarding (creates singles record, sends questionnaire email)
  await handleDatabase(email, name, phone, transactionId);
  // 2. Handle guide delivery (creates access token, sends guide email)
  // Skip the women_guide journey to avoid sending a duplicate "ברוכה הבאה לצד השני" email
  await handleGuide(email, name, { skipJourney: true });
  // 3. Notify owner about bundle purchase
  await notifyOwner({ title: "רכישת חבילת טו באב! 💜", content: `${name} (${email}) רכש/ה את חבילת טו באב (מאגר + מדריך) ב-349 ₪. Transaction: ${transactionId || 'N/A'}` });
  console.log(`[GrowWebhook] Bundle Tu B'Av completed for ${email} (database + guide)`);
}

// ─── New Year Bundle handler ──────────────────────────────────────────────────
async function handleBundleNewYear(email: string, name: string, phone: string, transactionId: string = "", amount: number = 399) {
  // The course handler grants both course and guide access. This creates two
  // customer emails in total: database onboarding and one digital-access email.
  await handleDatabase(email, name, phone, transactionId);
  await handleCourse(email, name, { skipJourney: true, emailMode: "new_year_bundle" });
  await notifyOwner({
    title: "רכישת חבילת שנה חדשה",
    content: `${name} (${email}) רכש/ה את חבילת השנה החדשה (מאגר + מדריך + קורס) ב־${amount} ₪. Transaction: ${transactionId || "N/A"}`,
  });
  console.log(`[GrowWebhook] New Year bundle completed for ${email} (database + guide + course)`);
}

async function handlePlus(email: string, name: string, transactionId: string, sum: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [single] = await db.select().from(singles).where(eq(singles.email, email)).limit(1);
  if (!single || !single.isActive || !single.isPaid) {
    throw new Error(`Plus payment received for non-active database member: ${email}`);
  }

  const { addOneBillingMonth } = await import("./plusSubscription");
  const now = Date.now();
  const cycleEnd = addOneBillingMonth(now);
  const providerSubscriptionId = String(
    data.subscriptionId || data.recurringPaymentId || data.paymentLinkProcessToken || "",
  ).slice(0, 200) || null;
  const [existing] = await db.select().from(plusPilotMembers)
    .where(eq(plusPilotMembers.singleId, single.id)).limit(1);

  const memberValues = {
    status: "active" as const,
    billingStatus: "active" as const,
    pilotPriceAgorot: Math.round(sum * 100) || 9900,
    monthlyMatchTarget: 2,
    billingCycleStartedAt: now,
    billingCycleEndsAt: cycleEnd,
    nextBillingAt: cycleEnd,
    providerSubscriptionId,
    lastPaymentTransactionId: transactionId || null,
    lastPaymentAt: now,
    premiumSupportEnabled: true,
    activatedAt: existing?.activatedAt || now,
    endedAt: null,
    cancelledAt: null,
    lastEngagedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await db.update(plusPilotMembers).set(memberValues).where(eq(plusPilotMembers.id, existing.id));
  } else {
    await db.insert(plusPilotMembers).values({
      singleId: single.id,
      source: "grow_recurring",
      waitlistedAt: now,
      createdAt: now,
      ...memberValues,
    });
  }

  const [member] = await db.select().from(plusPilotMembers)
    .where(eq(plusPilotMembers.singleId, single.id)).limit(1);
  if (member) {
    await db.insert(plusPaymentEvents).values({
      plusMemberId: member.id,
      singleId: single.id,
      eventType: existing?.billingStatus === "active" ? "payment_succeeded" : "subscription_started",
      amountAgorot: Math.round(sum * 100) || 9900,
      providerTransactionId: transactionId || null,
      providerSubscriptionId,
      billingPeriodStartedAt: now,
      billingPeriodEndsAt: cycleEnd,
      createdAt: now,
    });
  }

  const personalUrl = `${SITE_BASE}/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(single.questionnaireToken || "")}`;
  await sendEmail({
    to: { email, name },
    subject: "Database Plus שלך פעיל",
    htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#292552"><h2 style="color:#191265">ברוכים הבאים ל־Database Plus</h2><p style="line-height:1.8">המנוי שלך פעיל. במחזור הנוכחי נשלח לפחות שתי הצעות התאמה חדשות שנבדקו. באזור האישי ניתן לראות את מונה 0/2–2/2 ולפנות לערוץ השירות בעדיפות.</p><p style="line-height:1.8;font-size:13px;color:#666">ההבטחה היא להצעות שנבדקו ונשלחו; אישור הדדי, דייט או זוגיות אינם מובטחים.</p><p style="text-align:center;margin:28px 0"><a href="${personalUrl}" style="display:inline-block;background:#191265;color:#ffe27c;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">כניסה לאזור האישי</a></p></div>`,
  });
  await notifyOwner({ title: "מנוי Database Plus חדש", content: `${name} (${email}) הפעיל/ה Plus ב־${sum} ש״ח לחודש.` });
}

async function handleMatchBoost(email: string, transactionId: string, sum: number, checkoutReference?: string) {
  const { fulfillPaidBoostPayment } = await import("./matchBoostRouter");
  const result = await fulfillPaidBoostPayment({
    email,
    transactionId,
    amountAgorot: Math.round(sum * 100),
    checkoutReference,
  });
  await notifyOwner({
    title: result.delivered ? "Boost נרכש ונשלח" : "Boost נרכש ונשמר כקרדיט",
    content: result.delivered
      ? `עסקת Boost בסך ${sum} ש״ח אושרה וההצעה האלגוריתמית נשלחה.`
      : `עסקת Boost בסך ${sum} ש״ח אושרה, אך המועמד/ת לא היו זמינים בבדיקה הסופית. נשמר קרדיט אוטומטי.`,
  });
}

// ─── UTM extraction helper ────────────────────────────────────────────────────
// Grow passes back any extra query params from the payment URL in the webhook body.
// We look for utm_source / utm_medium / utm_campaign / utm_content in multiple places:
// 1. data.utm_source (Grow may forward query params as top-level fields)
// 2. data.extraParams / data.customFields (some Grow versions nest them)
// 3. data.paymentLinkUrl (the original URL we sent the user to — parse its query string)
function extractUtmFromWebhook(data: any): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string } {
  // Helper to pull a value from multiple possible locations
  const get = (key: string): string | undefined => {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // utm_source → utmSource
    return (
      data[key] ||
      data[camel] ||
      data.extraParams?.[key] ||
      data.customFields?.[key] ||
      undefined
    ) || undefined;
  };
  // Also try to parse from the original payment link URL if Grow echoes it back
  let fromUrl: Record<string, string> = {};
  try {
    const urlStr = data.paymentLinkUrl || data.returnUrl || "";
    if (urlStr) {
      const u = new URL(urlStr);
      fromUrl = Object.fromEntries(u.searchParams.entries());
    }
  } catch {}
  return {
    utmSource:   get("utm_source")   || fromUrl["utm_source"]   || undefined,
    utmMedium:   get("utm_medium")   || fromUrl["utm_medium"]   || undefined,
    utmCampaign: get("utm_campaign") || fromUrl["utm_campaign"] || undefined,
    utmContent:  get("utm_content")  || fromUrl["utm_content"]  || undefined,
  };
}

// ─── Main webhook handler (exported, registered in index.ts) ──────────────────
export async function handleGrowWebhook(body: any, context: { boostCheckoutReference?: string } = {}): Promise<void> {
  // Support both PaymentLinks (new) and legacy formats
  const data = body?.data ?? body;
  const email: string = (data.payerEmail || data.email || "").trim().toLowerCase();
  const name: string = (data.fullName || data.payer_name || "").trim();
  const phone: string = (data.payerPhone || data.phone || "").trim();
  const sumRaw = data.sum ?? data.paymentSum ?? 0;
  const sum = typeof sumRaw === "string" ? parseFloat(sumRaw) : Number(sumRaw);
  const desc: string = data.description || data.paymentDesc || "";
  const transactionId: string = data.transactionId || data.transactionCode || "";
  const processToken: string = data.paymentLinkProcessToken || "";
  // Extract UTM attribution data from the webhook payload
  let utm = extractUtmFromWebhook(data);
  if (utm.utmSource) console.log(`[GrowWebhook] UTM detected from webhook: source=${utm.utmSource} medium=${utm.utmMedium} campaign=${utm.utmCampaign}`);
  // If webhook has no UTM, fall back to UTM saved in crm_leads during createProcess
  // (Grow does not forward UTM params in the webhook, but we save them when the user initiates payment)
  // Always fetch from DB to get ga4ClientId; also fill UTM if not in webhook
  let storedGa4ClientId: string | undefined;
  let storedGa4SessionId: string | undefined;
  if (email) {
    try {
      const db = await getDb();
      if (db) {
        const [crmRow] = await db.select({
          utmSource: crmLeads.utmSource,
          utmMedium: crmLeads.utmMedium,
          utmCampaign: crmLeads.utmCampaign,
          utmContent: crmLeads.utmContent,
          ga4ClientId: crmLeads.ga4ClientId,
          ga4SessionId: crmLeads.ga4SessionId,
        }).from(crmLeads).where(eq(crmLeads.email, email)).limit(1);
        if (crmRow?.utmSource && !utm.utmSource) {
          utm = {
            utmSource: crmRow.utmSource ?? undefined,
            utmMedium: crmRow.utmMedium ?? undefined,
            utmCampaign: crmRow.utmCampaign ?? undefined,
            utmContent: crmRow.utmContent ?? undefined,
          };
          console.log(`[GrowWebhook] UTM from DB fallback: source=${utm.utmSource} medium=${utm.utmMedium} campaign=${utm.utmCampaign}`);
        }
        if (crmRow?.ga4ClientId) {
          storedGa4ClientId = crmRow.ga4ClientId;
          console.log(`[GrowWebhook] ga4ClientId from DB: ${storedGa4ClientId}`);
        }
        if (crmRow?.ga4SessionId) {
          storedGa4SessionId = crmRow.ga4SessionId;
          console.log(`[GrowWebhook] ga4SessionId from DB: ${storedGa4SessionId}`);
        }
      }
    } catch (e) {
      console.warn("[GrowWebhook] UTM/GA4 DB fallback failed:", e);
    }
  }

   if (!email || !name) {
    console.warn("[GrowWebhook] Missing email or name, skipping:", { email, name, desc });
    return;
  }

  // Detect product
  let product: string | null = null;

  // 1. Try to match by payment link token prefix (most reliable)
  if (processToken) {
    for (const [prefix, prod] of Object.entries(GROW_LINK_TO_PRODUCT)) {
      if (processToken.startsWith(prefix) || processToken.includes(prefix)) {
        product = prod;
        break;
      }
    }
  }
  // 2. Try by description (takes priority over processToken for bundle detection)
  const descProduct = detectProductByDesc(desc);
  if (descProduct) {
    // Description is more specific than processToken for bundles (bundle_tubav uses same pageCode as database)
    if (descProduct === "bundle_tubav" || descProduct === "bundle_new_year" || descProduct === "match_boost" || !product) {
      product = descProduct;
    }
  }
  // 3. A 99₪ charge is ambiguous with the historical live event. If this email
  // has a pending Plus checkout, prefer Plus; otherwise use the amount fallback.
  if (!product && sum >= 85 && sum <= 115 && email) {
    try {
      const db = await getDb();
      if (db) {
        const [pendingPlus] = await db.select({ id: plusPilotMembers.id })
          .from(plusPilotMembers)
          .innerJoin(singles, eq(plusPilotMembers.singleId, singles.id))
          .where(and(eq(singles.email, email), eq(plusPilotMembers.billingStatus, "pending")))
          .limit(1);
        if (pendingPlus) product = "plus";
      }
    } catch (error) {
      console.warn("[GrowWebhook] Plus pending lookup failed", error);
    }
  }
  // 4. If still no product, detect by amount.
  if (!product) product = detectProductByAmount(sum);
  // 5. Final override: if processToken matched "database" or "guide" but sum is 349 (bundle price), it's actually bundle_tubav
  // The bundle uses the DATABASE pageCode, but Grow may return a processToken that matches guide hash.
  if ((product === "database" || product === "guide") && sum === 349) {
    console.log(`[GrowWebhook] Overriding product from ${product} to bundle_tubav based on sum=349`);
    product = "bundle_tubav";
  }
  if (product !== "bundle_new_year" && (sum === 399 || sum === 449)) {
    console.log(`[GrowWebhook] Overriding product from ${product || "unknown"} to bundle_new_year based on sum=${sum}`);
    product = "bundle_new_year";
  }
  if (product !== "match_boost" && sum >= 19 && sum <= 21) {
    console.log(`[GrowWebhook] Overriding product from ${product || "unknown"} to match_boost based on sum=${sum}`);
    product = "match_boost";
  }

  console.log(`[GrowWebhook] Payment: ${name} (${email}) | product: ${product} | sum: ${sum} | tx: ${transactionId}`);

  if (!product) {
    console.warn("[GrowWebhook] Could not identify product for payment:", { email, name, sum, desc });
    await notifyOwner({
      title: "⚠️ תשלום לא מזוהה ב-Grow",
      content: `${name} (${email}) שילם ${sum} ₪ אבל לא הצלחנו לזהות את המוצר.\nתיאור: ${desc}\nTransaction: ${transactionId}`,
    });
    return;
  }

  // ── Idempotency guard: skip duplicate webhook deliveries ─────────────────
  // Grow sends the webhook TWICE per purchase:
  //   1. Server notification  → transactionId = numeric (e.g. "80007602")
  //   2. Payment confirmation → transactionId = base64 token (e.g. "J1XeG3v9...")
  // Both have DIFFERENT transactionIds, so a unique-on-transactionId guard is not enough.
  // Strategy: block on BOTH conditions:
  //   a) Same transactionId (catches exact duplicates / retries)
  //   b) Same email+product within a 10-minute window (catches the two-webhook pattern)
  {
    const db = await getDb();
    if (db) {
      try {
        // (a) Try atomic INSERT on transactionId
        if (transactionId) {
          try {
            await db.insert(webhookIdempotency).values({
              transactionId,
              product: product ?? null,
              email: email || null,
              createdAt: Date.now(),
            });
            // INSERT succeeded → first time we see this transactionId
          } catch (dupErr: any) {
            console.log(`[GrowWebhook] Duplicate transactionId=${transactionId}, skipping`);
            return;
          }
        }

        // (b) Check email+product within last 10 minutes (catches the two-webhook pattern)
        if (email && product) {
          const windowMs = 10 * 60 * 1000; // 10 minutes
          const since = Date.now() - windowMs;
          const { gt, and: drizzleAnd, eq: drizzleEq } = await import("drizzle-orm");
          const recent = await db
            .select({ id: webhookIdempotency.id })
            .from(webhookIdempotency)
            .where(
              drizzleAnd(
                drizzleEq(webhookIdempotency.email, email),
                drizzleEq(webhookIdempotency.product, product),
                gt(webhookIdempotency.createdAt, since)
              )
            )
            .limit(2); // limit 2 so we can detect if there's a prior entry
          // If we find MORE than 1 entry (the one we just inserted + an older one), skip
          if (recent.length > 1) {
            console.log(`[GrowWebhook] Duplicate email+product within 10min for ${email}/${product}, skipping`);
            return;
          }
        }
      } catch (idempErr) {
        console.error("[GrowWebhook] Idempotency check failed:", idempErr);
        // Continue processing even if idempotency check fails
      }
    }
  }

  // Approve the transaction on Grow's server (required by Grow)
  // Must send ALL fields from the server notification (webhook body).
  if (transactionId) {
    import("./growPayment").then(({ approveTransaction }) => {
      approveTransaction(transactionId, data, product ?? undefined).catch(err =>
        console.error("[GrowWebhook] approveTransaction failed:", err)
      );
    }).catch(() => {});
  }

  try {
    switch (product) {
      case "guide":    await handleGuide(email, name); break;
      case "course":   await handleCourse(email, name); break;
      case "coaching":     await handleCoaching(email, name); break;
      case "coaching_mas": await handleCoachingMas(email, name); break;
      case "session":  await handleSession(email, name); break;
      case "database": await handleDatabase(email, name, phone, transactionId); break;
      case "bundle_tubav": await handleBundleTuBav(email, name, phone, transactionId); break;
      case "bundle_new_year": await handleBundleNewYear(email, name, phone, transactionId, sum); break;
      case "live_event": await handleLiveEvent(email, name, phone); break;
      case "match_boost": await handleMatchBoost(email, transactionId, sum, context.boostCheckoutReference); break;
      case "plus": await handlePlus(email, name, transactionId, sum, data); break;
    }

    // Persist the actual amount paid as the P&L revenue source of truth.
    // The idempotency guard above prevents Grow's dual delivery from duplicating revenue.
    if (sum > 0) {
      try {
        const db = await getDb();
        if (db) {
          const normalizedTransaction = transactionId || `grow-${email}-${product}-${Date.now()}`;
          const dedupeKey = `${email}|${product}|${normalizedTransaction}`;
          await db.insert(completedPayments).values({
            transactionId: normalizedTransaction,
            dedupeKey,
            email,
            product,
            amountAgorot: Math.round(sum * 100),
            amountSource: "grow",
            paidAt: Date.now(),
            createdAt: Date.now(),
          }).onDuplicateKeyUpdate({ set: {
            amountAgorot: Math.round(sum * 100),
            amountSource: "grow",
          }});
        }
      } catch (amountErr) {
        console.error(`[GrowWebhook] Failed to persist completed payment amount for ${email}:`, amountErr);
      }
    }

    // Save UTM attribution to crmLeads if we have any UTM data
    if (utm.utmSource || utm.utmMedium || utm.utmCampaign) {
      try {
        const db = await getDb();
        if (db) {
          const existingCrm = await db.select({ id: crmLeads.id })
            .from(crmLeads)
            .where(eq(crmLeads.email, email))
            .limit(1)
            .then(r => r[0] ?? null);
          if (existingCrm) {
            await db.update(crmLeads)
              .set({ utmSource: utm.utmSource, utmMedium: utm.utmMedium, utmCampaign: utm.utmCampaign, utmContent: utm.utmContent, updatedAt: Date.now() })
              .where(eq(crmLeads.id, existingCrm.id));
            console.log(`[GrowWebhook] UTM saved to crmLeads for ${email}: source=${utm.utmSource}`);
          }
        }
      } catch (utmErr) {
        console.error(`[GrowWebhook] Failed to save UTM for ${email}:`, utmErr);
      }
    }

    // Fire GA4 purchase event server-side via Measurement Protocol
    const GA4_KEYS = ["guide", "course", "coaching", "session", "database", "bundle_new_year", "match_boost"] as const;
    type GA4Key = typeof GA4_KEYS[number];
    if (GA4_KEYS.includes(product as GA4Key)) {
      // Prefer the real browser client_id (from _ga cookie) for accurate DebugView stitching
      const ga4ClientId = storedGa4ClientId || clientIdFromEmail(email);
      ga4Purchase(ga4ClientId, product as GA4Key, transactionId || undefined, utm, storedGa4SessionId).catch(() => {});
    }

    // Fire Meta Conversions API Purchase event (server-side, deduplicates with browser pixel)
    capiPurchase({
      email,
      name,
      phone,
      product,
      sum,
      transactionId: transactionId || undefined,
      utmSource: utm.utmSource,
    }).catch(err => console.error("[MetaCAPI] capiPurchase failed:", err));

    console.log(`[GrowWebhook] ✓ Processed ${product} for ${email}`);
  } catch (err) {
    console.error(`[GrowWebhook] ✗ Failed to process ${product} for ${email}:`, err);
    await notifyOwner({
      title: `⚠️ שגיאה בעיבוד תשלום Grow (${product})`,
      content: `${name} (${email}) שילם ${sum} ₪ אבל אירעה שגיאה בעיבוד.\nTransaction: ${transactionId}\nError: ${err}`,
    });
  }
}
