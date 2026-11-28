import { regularMatchingAccessSql } from "./regularMatchingEligibility";
// © 2024–2025 Hilit Caspi. All rights reserved. Proprietary and confidential.
// שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים ומהווים סוד מסחרי של הילית כספי.

/**
 * Tri-Daily Matchmaking Scheduler
 * Runs every 3 days at 09:00 Israel time.
 * Uses the same weighted computeFullScore as the manual CRM, with full
 * scoreBreakdown and a separate (non-scoring) explanation.
 *
 * Finds all compatible singles (90%+ score, or 80%+ if no 90% found),
 * inserts pending matches into the DB, and notifies Hilit via email.
 */

import { getDb } from "./db";
import { singles, matches, matchmakingAnswers } from "../drizzle/schema";
import { eq, and, or, isNull, isNotNull, gt, lte } from "drizzle-orm";
import { getProposalDeadline, PROPOSAL_WINDOW_MS } from "../shared/matchAvailability";
import { sendSMS } from "./vibrate";
import { buildMatchExpiredSmsMessage } from "./matchSms";
import {
  computeFullScore,
  MATCH_THRESHOLD,
} from "./compatibility";
import type { ScoreBreakdown } from "./compatibility";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./brevo";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import { isInvalidMatchPlaceholder } from "./invalidMatchPlaceholder";
import {
  buildMatchingHealthReport, countStuckProposals, formatMatchingHealthReport, getExistingPairKeys,
  getUnavailableSingleIds, pairKey, selectCandidatesPerUser,
  type MatchingHealthReport, type SingleScanStats,
} from "./matchingAvailabilityPolicy";

const ADMIN_EMAIL = "hilitcaspi@gmail.com";
const HIGH_THRESHOLD = 90;
const LOW_THRESHOLD = MATCH_THRESHOLD;

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
export type WeeklyMatchingResult = { newMatches: number; notified: boolean; report?: MatchingHealthReport; reportLines?: string[]; dryRun?: boolean };

/**
 * Creates PENDING candidates only. Nothing is sent to participants here: every candidate waits
 * for the owner's approval in the CRM, and only then are the one-time approve/decline emails sent.
 * With `dryRun` nothing is written, no LLM text is generated and nobody (including the owner) is notified.
 */
export async function runWeeklyMatching(options: { dryRun?: boolean } = {}): Promise<WeeklyMatchingResult> {
  const dryRun = options.dryRun === true;
  const db = await getDb();
  if (!db) return { newMatches: 0, notified: false, dryRun };

  // Get all active singles with completed profiles
  const activeSingles = await db
    .select()
    .from(singles)
    .where(
      and(
        eq(singles.isActive, true),
        regularMatchingAccessSql(),
        isNotNull(singles.email),
        isNotNull(singles.gender)
      )
    );

  if (activeSingles.length < 2) return { newMatches: 0, notified: false, dryRun };

  // Get all matchmaking answers
  const allAnswers = await db.select().from(matchmakingAnswers);
  const answersMap = new Map(allAnswers.map(a => [a.singleId, a]));

  // Get existing matches to avoid duplicates
  const existingMatches = await db.select().from(matches);
  const existingPairs = getExistingPairKeys(existingMatches.filter(m => !isInvalidMatchPlaceholder(m)));
  const placeholders = new Map(existingMatches.filter(isInvalidMatchPlaceholder)
    .map(m => [`${Math.min(m.singleAId, m.singleBId)}-${Math.max(m.singleAId, m.singleBId)}`, m.id]));

  // Singles who cannot get a new proposal right now. Same shared policy as the CRM and send guards:
  // only a current sent proposal inside its window or an active connection blocks. Expired, ended,
  // returned, declined or never-sent rows do not, and a past match is never a permanent blocker.
  const matchingNow = Date.now();
  const unavailableIds = getUnavailableSingleIds(existingMatches, matchingNow);
  const stuckProposals = countStuckProposals(existingMatches, matchingNow);
  const waitingPendingPairs = new Set(existingMatches
    .filter(m => m.status === "pending" && (m.score ?? 0) >= LOW_THRESHOLD)
    .map(m => pairKey(m.singleAId, m.singleBId)));
  const scanStats = new Map<number, SingleScanStats>();
  const bumpStats = (id: number, passed: boolean, score: number) => {
    const cur = scanStats.get(id) ?? { passedHard: 0, bestScore: 0, hasWaitingCandidate: false };
    if (passed) cur.passedHard++;
    cur.bestScore = Math.max(cur.bestScore, score);
    scanStats.set(id, cur);
  };

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
      const key = pairKey(a.id, b.id);
      if (existingPairs.has(key)) {
        // An existing pending candidate still counts as an available proposal for monitoring.
        if (waitingPendingPairs.has(key)) {
          for (const id of [a.id, b.id]) { const c = scanStats.get(id) ?? { passedHard: 0, bestScore: 0, hasWaitingCandidate: false }; c.hasWaitingCandidate = true; scanStats.set(id, c); }
        }
        continue;
      }

      // Skip if either person is currently unavailable (in proposed or matched)
      if (unavailableIds.has(a.id) || unavailableIds.has(b.id)) continue;

      // Parse questionnaire answers
      const answersA = answersMap.get(a.id);
      const answersB = answersMap.get(b.id);
      const answersAList: MatchAnswer[] = answersA ? JSON.parse(answersA.answersJson ?? "[]") : [];
      const answersBList: MatchAnswer[] = answersB ? JSON.parse(answersB.answersJson ?? "[]") : [];

      // ── SAME RECIPROCAL SCORE AS MANUAL CRM ────────────────────────────────
      const structuredScore = computeFullScore(a, b, answersAList, answersBList);
      if (structuredScore.total === 0) continue; // failed hard filters
      const finalScore = structuredScore.total;
      bumpStats(a.id, true, finalScore);
      bumpStats(b.id, true, finalScore);

      if (finalScore >= LOW_THRESHOLD) {
        // The LLM explanation is generated only for candidates that are actually kept (below).
        newMatchRows.push({
          singleAId: a.id,
          singleBId: b.id,
          score: finalScore,
          scoreBreakdown: JSON.stringify(structuredScore as ScoreBreakdown),
        });
      }
    }
  }

  // Per-person bounded selection: only profiles with no candidate waiting for the owner get new ones.
  const hasWaiting = new Set<number>();
  for (const m of existingMatches) {
    if (m.status === "pending" && (m.score ?? 0) >= LOW_THRESHOLD && !unavailableIds.has(m.singleAId) && !unavailableIds.has(m.singleBId)) {
      hasWaiting.add(m.singleAId); hasWaiting.add(m.singleBId);
    }
  }
  const matchesToInsert = selectCandidatesPerUser(newMatchRows, { lowThreshold: LOW_THRESHOLD, alreadyHasWaitingCandidate: hasWaiting });
  const highMatches = matchesToInsert.filter(m => m.score >= HIGH_THRESHOLD);
  for (const m of matchesToInsert) {
    for (const id of [m.singleAId, m.singleBId]) {
      const c = scanStats.get(id) ?? { passedHard: 0, bestScore: 0, hasWaitingCandidate: false };
      c.hasWaitingCandidate = true;
      scanStats.set(id, c);
    }
  }
  const report = buildMatchingHealthReport({
    eligibleIds: activeSingles.map(s => s.id),
    blocked: unavailableIds,
    stats: scanStats,
    stuckProposals,
    newCandidatesCreated: dryRun ? 0 : matchesToInsert.length,
    lowThreshold: LOW_THRESHOLD,
  });
  const reportLines = formatMatchingHealthReport(report);
  if (dryRun) {
    // Nothing is written, no LLM call, nobody notified.
    return { newMatches: matchesToInsert.length, notified: false, report: { ...report, newCandidatesCreated: matchesToInsert.length }, reportLines, dryRun: true };
  }

  if (matchesToInsert.length === 0) {
    await notifyOwner({
      title: "🔍 ריצת התאמות (כל 3 ימים)",
      content: ["לא נוצרו מועמדים חדשים בהרצה הזו.", "", ...reportLines].join("\n"),
    });
    return { newMatches: 0, notified: true, report, reportLines };
  }

  // Explanations only for kept candidates (previously generated for every 80%+ pair).
  const singleById = new Map(activeSingles.map(s => [s.id, s]));
  for (const m of matchesToInsert) {
    const a = singleById.get(m.singleAId)!;
    const b = singleById.get(m.singleBId)!;
    m.autoExplanation = await buildMatchExplanation(
      a, b, JSON.parse(m.scoreBreakdown!) as ScoreBreakdown,
      answersMap.get(a.id) ? JSON.parse(answersMap.get(a.id)!.answersJson ?? "[]") : [],
      answersMap.get(b.id) ? JSON.parse(answersMap.get(b.id)!.answersJson ?? "[]") : [],
    );
  }

  // Insert into DB as "pending" (waiting for Hilit's approval). Nothing is sent to participants here.
  for (const m of matchesToInsert) {
    const key = pairKey(m.singleAId, m.singleBId);
    const placeholderId = placeholders.get(key);
    if (placeholderId) {
      await db.update(matches).set({
        score: m.score,
        scoreBreakdown: m.scoreBreakdown,
        autoExplanation: m.autoExplanation,
        updatedAt: Date.now(),
      }).where(eq(matches.id, placeholderId));
    } else {
      await db.insert(matches).values({
        singleAId: m.singleAId,
        singleBId: m.singleBId,
        score: m.score,
        scoreBreakdown: m.scoreBreakdown,
        autoExplanation: m.autoExplanation,
        status: "pending",
        updatedAt: Date.now(),
      });
    }
    existingPairs.add(key);
  }

  // Build summary for Hilit
  const singleMap = singleById;
  const summaryLines = matchesToInsert.slice(0, 10).map(m => {
    const a = singleMap.get(m.singleAId);
    const b = singleMap.get(m.singleBId);
    return `${a?.firstName ?? "?"} (${a?.age ?? "?"}, ${a?.city ?? "?"}) ↔ ${b?.firstName ?? "?"} (${b?.age ?? "?"}, ${b?.city ?? "?"}): ${m.score}% התאמה`;
  });

  const content = [
    `נוצרו ${matchesToInsert.length} מועמדים חדשים לאישורך (${highMatches.length} מהם 90%+):`,
    "",
    ...summaryLines,
    matchesToInsert.length > 10 ? `...ועוד ${matchesToInsert.length - 10} נוספות` : "",
    "",
    "מצב המאגר בהרצה:",
    ...reportLines,
    "",
    "כנסי ל-CRM → מאגר רווקים → התאמות ממתינות כדי לאשר ולשלוח. לא נשלחה שום הודעה למשתתפים.",
  ].filter(l => l !== "").join("\n");

  // Notify owner
  await notifyOwner({
    title: `💛 ${matchesToInsert.length} התאמות חדשות ממתינות לאישורך`,
    content,
  });

  // Also send email to admin (owner only)
  try {
    await sendEmail({
      to: { email: ADMIN_EMAIL, name: "הילית כספי" },
      subject: `💛 ${matchesToInsert.length} התאמות חדשות ממתינות לאישורך`,
      htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;color:#191265;padding:24px">
        <h2 style="color:#191265">💛 התאמות חדשות ממתינות לאישורך</h2>
        <p>נוצרו <strong>${matchesToInsert.length}</strong> מועמדים חדשים (${highMatches.length} מהם 90%+):</p>
        <ul>${summaryLines.map(l => `<li>${l}</li>`).join("")}</ul>
        <p><strong>מצב המאגר בהרצה:</strong></p>
        <ul>${reportLines.map(l => `<li>${l}</li>`).join("")}</ul>
        <p><a href="https://hilitcaspi.com/crm/matchmaking" style="background:#ffe27c;color:#191265;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:bold">כנסי לניהול התאמות →</a></p>
        <p style="color:#727272;font-size:12px">לא נשלחה שום הודעה למשתתפים. ההצעות יישלחו רק לאחר אישורך.</p>
      </div>`,
    });
  } catch (e) {
    console.error("[MatchScheduler] Failed to send admin email:", e);
  }

  return { newMatches: matchesToInsert.length, notified: true, report, reportLines };
}

/**
 * Auto-expiry for proposals whose response deadline has passed.
 * Runs every 5 minutes. Explicit deadlines (including extended windows) win;
 * legacy proposals without one retain the 48-hour fallback. Claim expiry under
 * the same row lock as participant decisions, then notify outside the transaction.
 */
import { buildConsolationEmail } from "./emailTemplates";

// SQL equivalent of getProposalDeadline for persisted numeric timestamps.
function proposalDeadlineReached(now: number) {
  return or(
    and(gt(matches.approvalExpiresAt, 0), lte(matches.approvalExpiresAt, now)),
    and(
      or(isNull(matches.approvalExpiresAt), lte(matches.approvalExpiresAt, 0)),
      gt(matches.proposedAt, 0),
      lte(matches.proposedAt, now - PROPOSAL_WINDOW_MS),
    ),
  );
}

const EXPIRY_NOTIFY_GRACE_MS = 30 * 60 * 1000;
export async function expireStaleMatches(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // This scan only finds candidates; its snapshots must never authorize expiry.
  const staleMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "proposed"),
        proposalDeadlineReached(Date.now()),
      )
    );

  let expired = 0;
  for (const candidate of staleMatches) {
    const match = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(matches)
        .where(eq(matches.id, candidate.id)).limit(1).for("update");
      if (!current || current.status !== "proposed") return null;
      // Mutual consent is never an unanswered proposal, even on a legacy row.
      if (current.approvedByA && current.approvedByB) return null;
      const now = Date.now();
      const deadline = getProposalDeadline(current);
      if (deadline === null || now < deadline) return null;

      const [result] = await tx.update(matches)
        .set({ status: "expired", updatedAt: now })
        .where(and(
          eq(matches.id, current.id),
          eq(matches.status, "proposed"),
          proposalDeadlineReached(now),
          // Legacy rows can hold NULL instead of false; NULL must not block expiry.
          or(
            isNull(matches.approvedByA), eq(matches.approvedByA, false),
            isNull(matches.approvedByB), eq(matches.approvedByB, false),
          ),
        ));
      if (result.affectedRows !== 1) return null;
      return { ...current, status: "expired" as const, updatedAt: now, staleBacklog: now - deadline > EXPIRY_NOTIFY_GRACE_MS };
    });
    // Only the transaction that actually claimed expiry may notify or count it.
    if (!match) continue;
    expired++;
    // Rows that should have expired long ago (backlog) are closed silently; telling a
    // customer days later that a proposal ended would be confusing.
    if (match.staleBacklog) {
      console.log(`[ExpiryScheduler] Match ${match.id} closed silently (deadline passed long ago)`);
      continue;
    }

    // Fetch both singles for notifications
    const [singleA, singleB] = await Promise.all([
      db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1).then(r => r[0]),
      db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1).then(r => r[0]),
    ]);

    // Send Vibrate SMS notification to parties who did not respond.
    await Promise.all([
      !match.tokenAUsedAt && singleA?.phone && singleA.isActive && !singleA.isSeed
        ? sendSMS(singleA.phone, buildMatchExpiredSmsMessage(singleA.firstName))
        : Promise.resolve(false),
      !match.tokenBUsedAt && singleB?.phone && singleB.isActive && !singleB.isSeed
        ? sendSMS(singleB.phone, buildMatchExpiredSmsMessage(singleB.firstName))
        : Promise.resolve(false),
    ]);

    // If one party said yes but the other didn't respond, send consolation to the one who said yes
    const aRespondedYes = match.approvedByA && !match.tokenBUsedAt;
    const bRespondedYes = match.approvedByB && !match.tokenAUsedAt;

    if (aRespondedYes || bRespondedYes) {
      const consolationSingle = aRespondedYes ? singleA : singleB;
      const otherSingle = aRespondedYes ? singleB : singleA;
      if (consolationSingle?.email) {
        const email = buildConsolationEmail({
          firstName: consolationSingle.firstName,
          matchFirstName: otherSingle?.firstName,
          recipientEmail: consolationSingle.email,
          singleId: consolationSingle.id,
          reason: "expired",
        });
        await sendEmail({
          to: { email: consolationSingle.email, name: consolationSingle.firstName },
          subject: email.subject,
          htmlContent: email.htmlBody,
          textContent: email.textBody,
        }).catch(err => console.error("[ExpiryScheduler] Consolation email failed:", err));
      }
    }

    console.log(`[ExpiryScheduler] Match ${match.id} expired (proposed ${match.proposedAt ? new Date(match.proposedAt).toISOString() : "unknown"})`);
  }

  return expired;
}
