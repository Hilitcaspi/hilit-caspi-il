// © 2024–2025 Hilit Caspi. All rights reserved. Proprietary and confidential.
// שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים ומהווים סוד מסחרי של הילית כספי.

/**
 * Tri-Daily Matchmaking Scheduler
 * Runs every 3 days at 09:00 Israel time.
 * Uses the FULL algorithm: computeFullScore (6 components) + open-text LLM scoring
 * + scoreBreakdown + autoExplanation, identical to the manual CRM "Run Algorithm" button.
 *
 * Finds all compatible singles (90%+ score, or 80%+ if no 90% found),
 * inserts pending matches into the DB, and notifies Hilit via email.
 */

import { getDb } from "./db";
import { singles, matches, matchmakingAnswers } from "../drizzle/schema";
import { eq, and, isNotNull, lt } from "drizzle-orm";
import { sendWhatsApp } from "./joni";
import {
  computeFullScore,
  scoreOpenText,
  MATCH_THRESHOLD,
} from "./compatibility";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./brevo";
import type { MatchAnswer } from "../shared/matchmakingTypes";

const ADMIN_EMAIL = "hilitcaspi@gmail.com";
const HIGH_THRESHOLD = 90;
const LOW_THRESHOLD = MATCH_THRESHOLD; // 80

// ─── SCORE BREAKDOWN TYPE ────────────────────────────────────────────────────
interface ScoreBreakdown {
  questionnaire: number;
  dna: number;
  demographic: number;
  practical: number;
  lifeStage: number;
  visual: number;
  openText: number;
  total: number;
}

// ─── BUILD EXPLANATION (same as routers.ts) ──────────────────────────────────
async function buildMatchExplanation(
  a: typeof singles.$inferSelect,
  b: typeof singles.$inferSelect,
  breakdown: ScoreBreakdown,
  answersA: MatchAnswer[] = [],
  answersB: MatchAnswer[] = []
): Promise<string> {
  const DNA_LABELS: Record<string, string> = {
    leader: "מנהיג/ה", romantic: "רומנטיקן/קית", free_spirit: "רוח חופשית", anchor: "עוגן/גנת",
  };
  const REL_LABELS: Record<string, string> = {
    secular: "חילוני/ת", traditional: "מסורתי/ת", religious: "דתי/ת", orthodox: "חרדי/ת",
  };
  const WANTS_KIDS_LABELS: Record<string, string> = {
    yes: "רוצה/ה ילדים", no: "לא רוצה/ה ילדים", open: "פתוח/ה לאפשרות",
  };

  // Build questionnaire matching insights
  const Q_OPTIONS: Record<string, string[]> = {
    q_commitment: ["תחושת ביטחון ויציבות", "תשוקה ורגש עמוק", "שותפות ועשייה משותפת", "חופש וצמיחה אישית", "חברות ואינטימיות רגשית"],
    q_conflict_style: ["מדבר/ת על זה מיד", "צריכ/ה זמן לעצמי/ה ואז מדבר/ת", "פותר/ת בשקט בלי עימות", "מחכה שהצד השני יפתח"],
    q_love_language: ["מילים ומחמאות", "מגע פיזי וחיבוקים", "זמן איכות ביחד", "מתנות ומחוות קטנות", "עזרה מעשית ומעשים"],
    q_attachment: ["זקוק/ה לאישורים", "נוח/ה עם קרבה ובטוח/ה בקשר", "מעדיפ/ה מרחב", "לפעמים קרבה ולפעמים מרחק"],
    q_friday_night: ["ערב שקט בבית", "ארוחת ערב עם חברים", "יציאה לבר/מסעדה", "תלוי במצב הרוח"],
    q_energy: ["זמן לבד ושקט", "עם אנשים וחברים", "שילוב של שניהם"],
    q_ambition: ["קריירה מרכזית ושאפתן/ית", "עבודה חשובה אבל לא על חשבון הזוגיות", "שיווי משקל", "הזוגיות והמשפחה הן העדיפות"],
  };

  const matchingInsights: string[] = [];
  for (const qId of Object.keys(Q_OPTIONS)) {
    const ansA = answersA.find((a: MatchAnswer) => a.qId === qId);
    const ansB = answersB.find((b: MatchAnswer) => b.qId === qId);
    if (!ansA || !ansB) continue;
    const optLabels = Q_OPTIONS[qId];
    if (!optLabels) continue;
    if (typeof ansA.myAnswer === 'number' && typeof ansB.myAnswer === 'number') {
      if (ansA.myAnswer === ansB.myAnswer && optLabels[ansA.myAnswer]) {
        const importance = Math.max((ansA as any).importance ?? 0, (ansB as any).importance ?? 0);
        if (importance >= 1) {
          matchingInsights.push(`שניהם: ${optLabels[ansA.myAnswer]} (${qId.replace('q_', '')})`);
        }
      }
    }
    if (Array.isArray(ansA.myAnswer) && Array.isArray(ansB.myAnswer)) {
      const overlap = (ansA.myAnswer as number[]).filter((v: number) => (ansB.myAnswer as number[]).includes(v));
      if (overlap.length >= 2) {
        const sharedLabels = overlap.slice(0, 2).map((i: number) => optLabels[i]).filter(Boolean);
        if (sharedLabels.length > 0) {
          matchingInsights.push(`ערכים משותפים: ${sharedLabels.join(" ו")} (${qId.replace('q_', '')})`);
        }
      }
    }
  }

  const facts = [
    `${a.firstName} (${a.gender === "female" ? "אשה" : "גבר"}, גיל ${a.age}, ${a.city ?? 'לא ידוע'})`,
    `${b.firstName} (${b.gender === "female" ? "אשה" : "גבר"}, גיל ${b.age}, ${b.city ?? 'לא ידוע'})`,
    a.dnaType ? `טיפוס DNA של ${a.firstName}: ${DNA_LABELS[a.dnaType] ?? a.dnaType}` : null,
    b.dnaType ? `טיפוס DNA של ${b.firstName}: ${DNA_LABELS[b.dnaType] ?? b.dnaType}` : null,
    a.religiosity ? `רמת דתיות ${a.firstName}: ${REL_LABELS[a.religiosity] ?? a.religiosity}` : null,
    b.religiosity ? `רמת דתיות ${b.firstName}: ${REL_LABELS[b.religiosity] ?? b.religiosity}` : null,
    a.wantsKids ? `${a.firstName} לגבי ילדים: ${WANTS_KIDS_LABELS[a.wantsKids] ?? a.wantsKids}` : null,
    b.wantsKids ? `${b.firstName} לגבי ילדים: ${WANTS_KIDS_LABELS[b.wantsKids] ?? b.wantsKids}` : null,
    a.about ? `${a.firstName} על עצמ/ה: "${a.about.slice(0, 150)}"` : null,
    b.about ? `${b.firstName} על עצמ/ה: "${b.about.slice(0, 150)}"` : null,
    a.partnerDescription ? `${a.firstName} מחפש/ת: "${a.partnerDescription.slice(0, 120)}"` : null,
    b.partnerDescription ? `${b.firstName} מחפש/ת: "${b.partnerDescription.slice(0, 120)}"` : null,
    matchingInsights.length > 0 ? `\nנקודות תאימות ספציפיות מהשאלון המדעי:\n${matchingInsights.slice(0, 5).join('\n')}` : null,
    `ציון שאלון מדעי: ${breakdown.questionnaire} | DNA: ${breakdown.dna}`,
  ].filter(Boolean).join("\n");

  try {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `את הילית כספי, שדכנית ויועצת זוגיות מנוסה. אתה כותבת הסבר התאמה אישי ייחודי לכל זיווג.

כללים קריטיים:
- כתובי בעברית טבעית וחמה, לא רשמית
- חובה להזכיר שמות ספציפיים (${a.firstName} ו${b.firstName})
- חובה להתייחס לנתונים הספציפיים שניתנו: DNA, ערכים משותפים מהשאלון, מה כל אחד מחפש
- ציינו את הסיבות המפתיעות והייחודיות לזיווג הזה בדיוק, לא נוסחאות כלליות
- אסור לכתוב משפטים כמו "ראיתי פוטנציאל" או "האלגוריתם מצא" או "ציון התאמה"
- אסור להשתמש במקף ארוך (,) או מינוס
- אורך: 3 משפטים בלבד, כל משפט חייב להכיל עובדה ספציפית על הזיווג הזה
- התחילי במשפט מרגש שמדבר ישירות על הדינמיקה הייחודית בין שניהם`,
        },
        {
          role: "user",
          content: `נתוני הזיווג:\n${facts}\n\nכתבי הסבר אישי ייחודי למה הילית חיברה בין ${a.firstName} ל${b.firstName} בדיוק.`,
        },
      ],
    });
    const text = response?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim().length > 10) return text.trim();
  } catch {
    // fall through to simple fallback
  }
  return `${a.firstName} ו-${b.firstName} חולקים ערכים ואורח חיים דומים שיוצרים בסיס חזק לזוגיות.`;
}

// ─── MAIN MATCHING FUNCTION ──────────────────────────────────────────────────
export async function runWeeklyMatching(): Promise<{ newMatches: number; notified: boolean }> {
  const db = await getDb();
  if (!db) return { newMatches: 0, notified: false };

  // Get all active singles with completed profiles
  const activeSingles = await db
    .select()
    .from(singles)
    .where(
      and(
        eq(singles.isActive, true),
        isNotNull(singles.email),
        isNotNull(singles.gender)
      )
    );

  if (activeSingles.length < 2) return { newMatches: 0, notified: false };

  // Get all matchmaking answers
  const allAnswers = await db.select().from(matchmakingAnswers);
  const answersMap = new Map(allAnswers.map(a => [a.singleId, a]));

  // Get existing matches to avoid duplicates
  const existingMatches = await db.select().from(matches);
  const existingPairs = new Set(
    existingMatches.map(m => `${Math.min(m.singleAId, m.singleBId)}-${Math.max(m.singleAId, m.singleBId)}`)
  );

  // Build set of singles who are currently UNAVAILABLE (in proposed or matched without return)
  const unavailableIds = new Set<number>();
  for (const m of existingMatches) {
    if (m.status === 'proposed') {
      unavailableIds.add(m.singleAId);
      unavailableIds.add(m.singleBId);
    } else if (m.status === 'matched' && !m.returnedToPoolAt) {
      unavailableIds.add(m.singleAId);
      unavailableIds.add(m.singleBId);
    }
  }

  type NewMatchRow = {
    singleAId: number;
    singleBId: number;
    score: number;
    scoreBreakdown?: string;
    autoExplanation?: string;
  };

  const newMatchRows: NewMatchRow[] = [];

  // Compare all pairs using the FULL algorithm
  for (let i = 0; i < activeSingles.length; i++) {
    for (let j = i + 1; j < activeSingles.length; j++) {
      const a = activeSingles[i];
      const b = activeSingles[j];

      // Skip if already matched/pending
      const pairKey = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (existingPairs.has(pairKey)) continue;

      // Skip if either person is currently unavailable (in proposed or matched)
      if (unavailableIds.has(a.id) || unavailableIds.has(b.id)) continue;

      // Parse questionnaire answers
      const answersA = answersMap.get(a.id);
      const answersB = answersMap.get(b.id);
      const answersAList: MatchAnswer[] = answersA ? JSON.parse(answersA.answersJson ?? "[]") : [];
      const answersBList: MatchAnswer[] = answersB ? JSON.parse(answersB.answersJson ?? "[]") : [];

      // ── FULL SCORE (6 components) ──────────────────────────────────────────
      const structuredScore = computeFullScore(a, b, answersAList, answersBList);
      if (structuredScore.total === 0) continue; // failed hard filters

      // ── OPEN TEXT SCORING ─────────────────────────────────────────────────
      const openTextScore = await scoreOpenText(
        a.partnerDescription,
        b.about,
        b.partnerDescription,
        a.about
      );

      // ── FINAL SCORE (85% structured + 15% open text) ─────────────────────
      const finalScore = Math.round(structuredScore.total * 0.85 + openTextScore * 0.15);

      if (finalScore >= LOW_THRESHOLD) {
        // ── SCORE BREAKDOWN (v5.0, use computeFullScore directly) ─────────
        const breakdown: ScoreBreakdown = {
          questionnaire: structuredScore.questionnaire,
          dna: structuredScore.dna,
          demographic: structuredScore.lifeStage,
          practical: structuredScore.practical,
          lifeStage: structuredScore.lifeStage,
          visual: 50,
          openText: openTextScore,
          total: finalScore,
        };

        // ── AUTO EXPLANATION ──────────────────────────────────────────────────────────────────────
        const explanation = await buildMatchExplanation(a, b, breakdown, answersAList, answersBList);

        newMatchRows.push({
          singleAId: a.id,
          singleBId: b.id,
          score: finalScore,
          scoreBreakdown: JSON.stringify(breakdown),
          autoExplanation: explanation,
        });
      }
    }
  }

  if (newMatchRows.length === 0) {
    await notifyOwner({
      title: "🔍 ריצת התאמות (כל 3 ימים)",
      content: "לא נמצאו התאמות חדשות (מתחת ל-80%). המאגר זקוק לחברים נוספים.",
    });
    return { newMatches: 0, notified: true };
  }

  // Filter: prefer 90%+ matches; fall back to 80%+ if none
  const highMatches = newMatchRows.filter(m => m.score >= HIGH_THRESHOLD);
  const matchesToInsert = highMatches.length > 0 ? highMatches : newMatchRows;

  // Sort by score descending
  matchesToInsert.sort((a, b) => b.score - a.score);

  // Insert into DB as "pending" (waiting for Hilit's approval)
  const now = Date.now();
  for (const m of matchesToInsert) {
    await db.insert(matches).values({
      singleAId: m.singleAId,
      singleBId: m.singleBId,
      score: m.score,
      scoreBreakdown: m.scoreBreakdown,
      autoExplanation: m.autoExplanation,
      status: "pending",
      proposedAt: now,
      updatedAt: now,
    });
    existingPairs.add(`${Math.min(m.singleAId, m.singleBId)}-${Math.max(m.singleAId, m.singleBId)}`);
  }

  // Build summary for Hilit
  const singleMap = new Map(activeSingles.map(s => [s.id, s]));
  const summaryLines = matchesToInsert.slice(0, 10).map(m => {
    const a = singleMap.get(m.singleAId);
    const b = singleMap.get(m.singleBId);
    return `${a?.firstName ?? "?"} (${a?.age ?? "?"}, ${a?.city ?? "?"}) ↔ ${b?.firstName ?? "?"} (${b?.age ?? "?"}, ${b?.city ?? "?"}): ${m.score}% התאמה`;
  });

  const content = [
    `נמצאו ${matchesToInsert.length} התאמות חדשות${highMatches.length > 0 ? " (90%+)" : " (80%+, אין 90%+)"}:`,
    "",
    ...summaryLines,
    matchesToInsert.length > 10 ? `...ועוד ${matchesToInsert.length - 10} נוספות` : "",
    "",
    "כנסי ל-CRM → מאגר רווקים → התאמות ממתינות כדי לאשר ולשלוח.",
  ].filter(l => l !== "").join("\n");

  // Notify owner
  await notifyOwner({
    title: `💛 ${matchesToInsert.length} התאמות חדשות ממתינות לאישורך`,
    content,
  });

  // Also send email to admin
  try {
    await sendEmail({
      to: { email: ADMIN_EMAIL, name: "הילית כספי" },
      subject: `💛 ${matchesToInsert.length} התאמות חדשות ממתינות לאישורך`,
      htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;color:#191265;padding:24px">
        <h2 style="color:#191265">💛 התאמות חדשות ממתינות לאישורך</h2>
        <p>נמצאו <strong>${matchesToInsert.length}</strong> התאמות חדשות${highMatches.length > 0 ? " (90%+)" : " (80%+)"}:</p>
        <ul>${summaryLines.map(l => `<li>${l}</li>`).join("")}</ul>
        <p><a href="https://hilitcaspi.com/crm/matchmaking" style="background:#ffe27c;color:#191265;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:bold">כנסי לניהול התאמות →</a></p>
        <p style="color:#727272;font-size:12px">הילית כספי | מאגר הרווקים הדיגיטלי</p>
      </div>`,
    });
  } catch (e) {
    console.error("[MatchScheduler] Failed to send admin email:", e);
  }

  return { newMatches: matchesToInsert.length, notified: true };
}

/**
 * 48-hour auto-expiry for unanswered match proposals.
 * Runs every 5 minutes. If a match was sent (status=proposed) and
 * neither single has responded within 48 hours, mark it as expired
 * and send a consolation email to whoever DID respond (if any).
 */
import { buildConsolationEmail } from "./emailTemplates";

const MATCH_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function expireStaleMatches(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = Date.now() - MATCH_EXPIRY_MS;

  // Find proposed matches where proposedAt is older than 48h and not yet resolved
  const staleMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "proposed"),
        lt(matches.proposedAt, cutoff)
      )
    );

  let expired = 0;
  for (const match of staleMatches) {
    // Mark as expired
    await db.update(matches)
      .set({ status: "expired", updatedAt: Date.now() })
      .where(eq(matches.id, match.id));
    expired++;

    // Fetch both singles for notifications
    const [singleA, singleB] = await Promise.all([
      db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1).then(r => r[0]),
      db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1).then(r => r[0]),
    ]);

    // Send WhatsApp notification to parties who didn't respond
    const expiredWaMsg = (firstName: string) =>
      `היי ${firstName}! \u{1F49B}\nההתאמה שנשלחה אלייך פגה תוקף כי לא הגבת בתוך 48 שעות.\nלהבא, כשתקבלי התאמה חדשה, חשוב להגיב בתוך 48 שעות כדי לשמור אותה פעילה.\nאם יש שאלות, אני כאן \u{1F917}\nהילית \u{1F49B}`;

    if (!match.approvedByA && singleA?.phone) {
      sendWhatsApp(singleA.phone, expiredWaMsg(singleA.firstName)).catch(() => {});
    }
    if (!match.approvedByB && singleB?.phone) {
      sendWhatsApp(singleB.phone, expiredWaMsg(singleB.firstName)).catch(() => {});
    }

    // If one party said yes but the other didn't respond, send consolation to the one who said yes
    const aRespondedYes = match.approvedByA && !match.approvedByB;
    const bRespondedYes = match.approvedByB && !match.approvedByA;

    if (aRespondedYes || bRespondedYes) {
      const consolationSingleId = aRespondedYes ? match.singleAId : match.singleBId;
      const otherSingleId = aRespondedYes ? match.singleBId : match.singleAId;
      const [consolationSingle, otherSingle] = await Promise.all([
        db.select().from(singles).where(eq(singles.id, consolationSingleId)).limit(1).then(r => r[0]),
        db.select().from(singles).where(eq(singles.id, otherSingleId)).limit(1).then(r => r[0]),
      ]);
      if (consolationSingle?.email) {
        const email = buildConsolationEmail({
          firstName: consolationSingle.firstName,
          matchFirstName: otherSingle?.firstName,
          recipientEmail: consolationSingle.email,
          singleId: consolationSingle.id,
        });
        sendEmail({
          to: { email: consolationSingle.email, name: consolationSingle.firstName },
          subject: email.subject,
          htmlContent: email.htmlBody,
        }).catch(err => console.error("[ExpiryScheduler] Consolation email failed:", err));
      }
    }

    console.log(`[ExpiryScheduler] Match ${match.id} expired (proposed ${match.proposedAt ? new Date(match.proposedAt).toISOString() : "unknown"})`);
  }

  return expired;
}
