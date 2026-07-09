// © 2024–2025 Hilit Caspi. All rights reserved. Proprietary and confidential.
// שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים ומהווים סוד מסחרי של הילית כספי.

import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { singles, dnaQuizResults, matches, leads, crmLeads, emailLog, blogPosts, freeAccessTokens, productAccessTokens, courseProgress, matchmakingAnswers, inviteTokens, analyticsEvents } from "../drizzle/schema";
import { calculateCompatibility, findMatches, findMatchesWithText, computeFullScore, computeFullScoreAdmin, computeProfileScore, scoreVisualAsync, scoreOpenText } from "./compatibility";
import type { ScoreBreakdown as FullScoreBreakdown } from "./compatibility";
import type { MatchAnswer } from "../shared/matchmakingTypes";
import crypto from "crypto";
import { eq, and, ne, sql, desc, lt, isNull, isNotNull, or, asc, inArray } from "drizzle-orm";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { startJourney, getJourneyKey } from "./automation";
import { ga4GenerateLead, ga4SignUp, clientIdFromEmail } from "./_core/ga4";
import { EMAIL_SEQUENCES, renderTemplate, JourneyKey, buildMatchProposalEmail as buildMatchProposalEmailTemplate, buildContactRevealEmail as buildContactRevealEmailTemplate, buildMatchRejectionAckEmail, buildOwnerMatchApprovalEmail, buildConsolationEmail, WOMEN_MATCHMAKING_EMAIL_1, MEN_MATCHMAKING_EMAIL_1, DNA_PROFILES, buildMatchFollowUpEmail } from "./emailTemplates";
import { sendEmail } from "./brevo";
import { sendWhatsApp } from "./joni";

// ─── Payment log ring buffer (in-memory, last 200 entries) ─────────────────────
const PAYMENT_LOG_BUFFER: string[] = [];
const MAX_LOG_BUFFER = 200;

export function addToPaymentLogBuffer(msg: string): void {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  PAYMENT_LOG_BUFFER.push(entry);
  if (PAYMENT_LOG_BUFFER.length > MAX_LOG_BUFFER) PAYMENT_LOG_BUFFER.shift();
}

export function getPaymentLogBuffer(last = 50): string[] {
  return PAYMENT_LOG_BUFFER.slice(-last);
}

// ─── DNA type compatibility map ───────────────────────────────────────────────
const COMPATIBLE_TYPES: Record<string, string> = {
  leader:      "anchor",
  anchor:      "leader",
  romantic:    "free_spirit",
  free_spirit: "romantic",
};

// DNA Hebrew labels
const DNA_HEBREW_LABELS: Record<string, string> = {
  leader: "המנהיג המגנטי",
  anchor: "העוגן היציב",
  romantic: "הרומנטיקן העמוק",
  free_spirit: "רוח חופשית",
};

// Journey labels for server-side alerts
const JOURNEY_LABELS_SERVER: Record<string, string> = {
  women_first_step_v2: "מסע DNA - נשים",
  men_first_step_v2: "מסע DNA - גברים",
  free_guide_nurture: "מדריך חינמי",
  sales_call_lead: "שיחת היכרות",
  meta_lead_dna: "Meta ליד DNA",
  women_matchmaking_welcome: "ברוך הבא למאגר - נשים",
  men_matchmaking_welcome: "ברוך הבא למאגר - גברים",
  women_guide: "מדריך - נשים",
  men_guide: "מדריך - גברים",
  women_course: "קורס - נשים",
  men_course: "קורס - גברים",
  women_transformation: "טרנספורמציה - נשים",
  men_transformation: "טרנספורמציה - גברים",
  abandoned_guide: "נטישת עגלה - מדריך",
  abandoned_database: "נטישת עגלה - מאגר",
  abandoned_course: "נטישת עגלה - קורס",
  abandoned_coaching: "נטישת עגלה - ליווי",
};

type SingleRow = typeof singles.$inferSelect;

/**
 * Auto-link DNA quiz result to a single's profile.
 * Strategy: look up CRM lead by email/phone → get quizSessionId → find dna_quiz_results row.
 * If found and single has no dnaType, update singles.dnaType and link dna_quiz_results.singleId.
 * Returns the resolved dnaType or null if no match found.
 */
async function autoLinkDnaType(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  singleId: number,
  email: string,
  phone?: string,
  existingDnaType?: string | null
): Promise<string | null> {
  // If already has a dnaType, just ensure dna_quiz_results is linked
  if (existingDnaType) {
    // Still try to link the dna_quiz_results row if not already linked
    const [alreadyLinked] = await db.select({ id: dnaQuizResults.id })
      .from(dnaQuizResults).where(eq(dnaQuizResults.singleId, singleId)).limit(1);
    if (!alreadyLinked) {
      // Try to find via CRM lead
      const [crmLead] = await db.select({ quizSessionId: crmLeads.quizSessionId })
        .from(crmLeads)
        .where(
          and(
            or(
              sql`LOWER(${crmLeads.email}) = ${email.toLowerCase()}`,
              phone && phone.length >= 9 ? eq(crmLeads.phone, phone) : sql`0=1`
            ),
            isNotNull(crmLeads.quizSessionId)
          )
        )
        .orderBy(desc(crmLeads.createdAt))
        .limit(1);
      if (crmLead?.quizSessionId) {
        await db.update(dnaQuizResults)
          .set({ singleId, convertedToRegistration: true })
          .where(and(
            eq(dnaQuizResults.sessionId, crmLead.quizSessionId),
            isNull(dnaQuizResults.singleId)
          ));
      }
    }
    return existingDnaType;
  }

  // No dnaType — try to find one via CRM lead → dna_quiz_results
  const crmLeadRows = await db.select({ quizSessionId: crmLeads.quizSessionId, dnaType: crmLeads.dnaType })
    .from(crmLeads)
    .where(
      and(
        or(
          sql`LOWER(${crmLeads.email}) = ${email.toLowerCase()}`,
          phone && phone.length >= 9 ? eq(crmLeads.phone, phone) : sql`0=1`
        ),
        isNotNull(crmLeads.quizSessionId)
      )
    )
    .orderBy(desc(crmLeads.createdAt))
    .limit(1);

  const crmLead = crmLeadRows[0];
  if (!crmLead?.quizSessionId) return null;

  // Look up the actual quiz result
  const [quizResult] = await db.select({ dnaType: dnaQuizResults.dnaType, id: dnaQuizResults.id })
    .from(dnaQuizResults)
    .where(eq(dnaQuizResults.sessionId, crmLead.quizSessionId))
    .limit(1);

  if (!quizResult) return null;

  // Found! Update the single's dnaType and link the quiz result
  await db.update(singles)
    .set({ dnaType: quizResult.dnaType, updatedAt: Date.now() })
    .where(eq(singles.id, singleId));

  await db.update(dnaQuizResults)
    .set({ singleId, convertedToRegistration: true })
    .where(and(
      eq(dnaQuizResults.sessionId, crmLead.quizSessionId),
      isNull(dnaQuizResults.singleId)
    ));

  console.log(`[AutoLinkDNA] Linked dnaType=${quizResult.dnaType} to single id=${singleId} via CRM quizSession=${crmLead.quizSessionId}`);
  return quizResult.dnaType;
}

// ─── Matching algorithm ───────────────────────────────────────────────────────
// Legacy ScoreBreakdown kept for backward compatibility with generateMatchesForSingle
interface ScoreBreakdown {
  dna: number;         // 0 / 20 / 40
  age: number;         // 0 / 10 / 20
  religiosity: number; // 0 / 10 / 20
  kids: number;        // 0 / 5 / 10
  city: number;        // 0 / 10
  total: number;
}

function computeScoreWithBreakdown(user: SingleRow, candidate: SingleRow): ScoreBreakdown {
  let dna = 0, age = 0, religiosity = 0, kids = 0, city = 0;

  // ── DNA ──────────────────────────────────────────────────────────────────
  if (user.dnaType && candidate.dnaType) {
    if (COMPATIBLE_TYPES[user.dnaType] === candidate.dnaType) dna = 40;
    else if (user.dnaType === candidate.dnaType) dna = 20;
  }

  // ── AGE (gender-aware) ────────────────────────────────────────────────────
  // Age scoring with 3-year flexibility buffer.
  // If someone is within 3 years outside the stated preference, we still score it (just lower).
  // This prevents good matches from scoring 0 just because of a 1-2 year gap.
  const AGE_FLEX = 3; // years of flexibility beyond stated range

  const userInCandidateRange =
    candidate.minAgePreference && candidate.maxAgePreference
      ? user.age >= candidate.minAgePreference && user.age <= candidate.maxAgePreference
      : true;
  const candidateInUserRange =
    user.minAgePreference && user.maxAgePreference
      ? candidate.age >= user.minAgePreference && candidate.age <= user.maxAgePreference
      : true;

  // Soft range: within AGE_FLEX years outside stated preference
  const userInCandidateSoftRange =
    candidate.minAgePreference && candidate.maxAgePreference
      ? user.age >= candidate.minAgePreference - AGE_FLEX && user.age <= candidate.maxAgePreference + AGE_FLEX
      : true;
  const candidateInUserSoftRange =
    user.minAgePreference && user.maxAgePreference
      ? candidate.age >= user.minAgePreference - AGE_FLEX && candidate.age <= user.maxAgePreference + AGE_FLEX
      : true;

  const ageDiff = candidate.age - user.age; // positive = candidate is older

  if (userInCandidateRange && candidateInUserRange) {
    // Both fully within range, full score, gender-aware
    if (user.gender === "male" && ageDiff < 0) {
      age = 20; // man seeking younger woman: natural
    } else if (user.gender === "female" && ageDiff > 0) {
      age = 20; // woman accepting older man: standard
    } else if (user.gender === "female" && ageDiff < 0) {
      age = 14; // woman accepting younger man: less common
    } else if (user.gender === "male" && ageDiff > 0) {
      age = 14; // man accepting older woman: less common
    } else {
      age = 20; // same age
    }
  } else if (userInCandidateRange || candidateInUserRange) {
    age = 8; // only one side fits exactly
  } else if (userInCandidateSoftRange && candidateInUserSoftRange) {
    // Both within soft range (up to 3 years outside preference), partial score
    age = 6;
  } else if (userInCandidateSoftRange || candidateInUserSoftRange) {
    // One side within soft range, minimal score
    age = 3;
  } else if (!user.minAgePreference && !candidate.minAgePreference) {
    age = 10; // neither set preferences
  } else {
    age = 0; // truly outside range for both
  }

  // ── RELIGIOSITY (deep, origin-aware) ─────────────────────────────────────
  // Hard block: orthodox ↔ secular never match
  const hardBlock =
    (user.religiosity === "orthodox" && candidate.religiosity === "secular") ||
    (user.religiosity === "secular" && candidate.religiosity === "orthodox");
  if (hardBlock) {
    religiosity = 0;
  } else if (user.religiosity && candidate.religiosity) {
    if (user.religiosity === candidate.religiosity) {
      religiosity = 20;
    } else if (
      (user.religiosity === "traditional" && candidate.religiosity === "secular") ||
      (user.religiosity === "secular" && candidate.religiosity === "traditional")
    ) {
      // Traditional ↔ secular: check if traditional is cultural (not halachic)
      const tradPerson = user.religiosity === "traditional" ? user : candidate;
      religiosity = (tradPerson as any).religiosityOrigin === "cultural" ? 15 : 8;
    } else if (
      (user.religiosity === "traditional" && candidate.religiosity === "religious") ||
      (user.religiosity === "religious" && candidate.religiosity === "traditional")
    ) {
      const tradPerson = user.religiosity === "traditional" ? user : candidate;
      religiosity = (tradPerson as any).religiosityOrigin === "halachic" ? 15 : 8;
    } else if (
      (user.religiosity === "religious" && candidate.religiosity === "orthodox") ||
      (user.religiosity === "orthodox" && candidate.religiosity === "religious")
    ) {
      religiosity = 10;
    } else {
      religiosity = 0;
    }
  }

  // ── KIDS (complex, openToPartnerWithKids-aware) ───────────────────────────
  const candidateHasKids = candidate.hasKids && (candidate.numKids ?? 0) > 0;
  const userHasKids = user.hasKids && (user.numKids ?? 0) > 0;
  const userOpenToKids = (user as any).openToPartnerWithKids as string | null;
  const candidateOpenToKids = (candidate as any).openToPartnerWithKids as string | null;

  if (candidateHasKids) {
    if (userOpenToKids === "no") kids = 0;
    else if (userOpenToKids === "depends_on_age") kids = 4;
    else if (userOpenToKids === "yes" || user.stepParentOpenness === "yes") kids = 10;
    else if (user.stepParentOpenness === "open") kids = 7;
    else kids = 3;
  } else if (userHasKids) {
    if (candidateOpenToKids === "no") kids = 0;
    else if (candidateOpenToKids === "depends_on_age") kids = 4;
    else if (candidateOpenToKids === "yes" || candidate.stepParentOpenness === "yes") kids = 10;
    else if (candidate.stepParentOpenness === "open") kids = 7;
    else kids = 3;
  } else {
    // Neither has kids: score based on future kids preference
    if (user.wantsKids && candidate.wantsKids) {
      if (user.wantsKids === candidate.wantsKids) kids = 10;
      else if (user.wantsKids === "open" || candidate.wantsKids === "open") kids = 5;
      else kids = 0;
    } else {
      kids = 5;
    }
  }

  // ── CITY ─────────────────────────────────────────────────────────────────
  if (user.city && candidate.city && user.city === candidate.city) city = 10;

  // ── PARTNER DESCRIPTION SCAN (bonus up to 5 pts) ─────────────────────────
  let descBonus = 0;
  if (user.partnerDescription && candidate.dnaType) {
    const desc = user.partnerDescription.toLowerCase();
    const dnaKeywords: Record<string, string[]> = {
      leader:      ["מנהיג", "חזק", "בטוח", "דומיננטי", "ביטחון"],
      romantic:    ["רומנטי", "רגיש", "עמוק", "מרגיש", "אוהב"],
      free_spirit: ["חופשי", "הרפתקן", "יצירתי", "ספונטני", "עצמאי"],
      anchor:      ["יציב", "אמין", "בוגר", "אחראי", "ביתי"],
    };
    const kwList = dnaKeywords[candidate.dnaType] || [];
    const matchCount = kwList.filter(kw => desc.includes(kw)).length;
    if (matchCount >= 2) descBonus = 5;
    else if (matchCount === 1) descBonus = 2;
  }

  const total = Math.min(dna + age + religiosity + kids + city + descBonus, 100);
  return { dna, age, religiosity, kids, city, total };
}

function computeScore(user: SingleRow, candidate: SingleRow): number {
  return computeScoreWithBreakdown(user, candidate).total;
}

export async function buildMatchExplanation(
  a: SingleRow, b: SingleRow, breakdown: FullScoreBreakdown | ScoreBreakdown,
  answersA: MatchAnswer[] = [], answersB: MatchAnswer[] = []
): Promise<string> {
  // Build a rich, factual context string for the LLM
  const DNA_LABELS: Record<string, string> = {
    leader: "מנהיג/ה", romantic: "רומנטיקן/קית", free_spirit: "רוח חופשית", anchor: "עוגן/גנת",
  };
  const REL_LABELS: Record<string, string> = {
    secular: "חילוני/ת", traditional: "מסורתי/ת", religious: "דתי/ת", orthodox: "חרדי/ת",
  };
  const WANTS_KIDS_LABELS: Record<string, string> = {
    yes: "רוצה/ה ילדים", no: "לא רוצה/ה ילדים", open: "פתוח/ה לאפשרות",
  };

  // Support both legacy ScoreBreakdown and new FullScoreBreakdown
  const fullBd = breakdown as FullScoreBreakdown;
  const legacyBd = breakdown as ScoreBreakdown;
  const hasFullBreakdown = 'questionnaire' in breakdown;

  // ── Build questionnaire insights (specific matching points from the scientific questionnaire) ──
  const Q_OPTIONS: Record<string, string[]> = {
    q_commitment: ["תחושת ביטחון ויציבות", "תשוקה ורגש עמוק", "שותפות ועשייה משותפת", "חופש וצמיחה אישית", "חברות ואינטימיות רגשית"],
    q_conflict_style: ["מדבר/ת על זה מיד", "צריכ/ה זמן לעצמי/ה ואז מדבר/ת", "פותר/ת בשקט בלי עימות", "מחכה שהצד השני יפתח"],
    q_love_language: ["מילים ומחמאות", "מגע פיזי וחיבוקים", "זמן איכות ביחד", "מתנות ומחוות קטנות", "עזרה מעשית ומעשים"],
    q_attachment: ["זקוק/ה לאישורים וחרד/ה כשמתרחקים", "נוח/ה עם קרבה ובטוח/ה בקשר", "מעדיפ/ה מרחב ומתקשה עם תלות", "לפעמים קרבה ולפעמים מרחק"],
    q_kids_future: ["רוצה ילדים בהחלט", "פתוח/ה לרעיון", "לא בטוח/ה עדיין", "לא רוצה ילדים"],
    q_marriage: ["חשוב לי מאוד להתחתן", "פתוח/ה לנישואין", "מעדיפ/ה זוגיות ללא נישואין", "עדיין לא יודע/ת"],
    q_friday_night: ["ערב שקט בבית", "ארוחת ערב עם חברים קרובים", "יציאה לבר/מסעדה/אירוע", "תלוי במצב הרוח"],
    q_energy: ["זמן לבד ושקט", "עם אנשים וחברים", "שילוב של שניהם"],
    q_ambition: ["קריירה מרכזית ושאפתן/ית", "עבודה חשובה אבל לא על חשבון הזוגיות", "שיווי משקל", "הזוגיות והמשפחה הן העדיפות"],
    q_communication: ["הרבה הודעות לאורך היום", "כמה הודעות ביום", "בעיקר שיחות טלפון/וידאו", "מינימום הודעות, פנים אל פנים"],
    q_money: ["הכל משותף", "חשבון משותף + חשבון אישי", "חשבונות נפרדים", "תלוי בשלב הקשר"],
  };

  // Find matching questionnaire answers between the two (shared values)
  const matchingInsights: string[] = [];
  for (const qId of Object.keys(Q_OPTIONS)) {
    const ansA = answersA.find(a => a.qId === qId);
    const ansB = answersB.find(b => b.qId === qId);
    if (!ansA || !ansB) continue;
    const optLabels = Q_OPTIONS[qId];
    if (!optLabels) continue;
    // For single-answer questions: check if both gave same answer
    if (typeof ansA.myAnswer === 'number' && typeof ansB.myAnswer === 'number') {
      if (ansA.myAnswer === ansB.myAnswer && optLabels[ansA.myAnswer]) {
        const importance = Math.max(ansA.importance ?? 0, ansB.importance ?? 0);
        if (importance >= 1) { // only include if at least one finds it important
          matchingInsights.push(`שניהם: ${optLabels[ansA.myAnswer]} (${qId.replace('q_', '')})`);
        }
      }
    }
    // For rankTop3 questions: check overlap in top choices
    if (Array.isArray(ansA.myAnswer) && Array.isArray(ansB.myAnswer)) {
      const overlap = (ansA.myAnswer as number[]).filter(v => (ansB.myAnswer as number[]).includes(v));
      if (overlap.length >= 2) {
        const sharedLabels = overlap.slice(0, 2).map(i => optLabels[i]).filter(Boolean);
        if (sharedLabels.length > 0) {
          matchingInsights.push(`ערכים משותפים: ${sharedLabels.join(" ו")} (${qId.replace('q_', '')})`);
        }
      }
    }
  }

  const facts = [
    `${a.firstName} (${a.gender === 'female' ? 'אשה' : 'גבר'}, גיל ${a.age}, ${a.city ?? 'לא ידוע'})`,
    `${b.firstName} (${b.gender === 'female' ? 'אשה' : 'גבר'}, גיל ${b.age}, ${b.city ?? 'לא ידוע'})`,
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
    hasFullBreakdown && fullBd.questionnaire > 0 ? `ציון שאלון מדעי: ${fullBd.questionnaire}/45` : null,
    hasFullBreakdown && fullBd.dna > 0 ? `ציון התאמת DNA: ${fullBd.dna}/12` : null,
    !hasFullBreakdown && legacyBd.dna > 0 ? `ציון התאמת DNA: ${legacyBd.dna}/40` : null,
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

  // Fallback: structured Hebrew explanation
  const parts: string[] = [];
  if (breakdown.dna === 40 && a.dnaType && b.dnaType) {
    const aLabel = DNA_HEBREW_LABELS[a.dnaType] || a.dnaType;
    const bLabel = DNA_HEBREW_LABELS[b.dnaType] || b.dnaType;
    parts.push(`${a.firstName} הוא ${aLabel} ו-${b.firstName} הוא ${bLabel} - שני הטיפוסים האלה משלימים אחד את השני בצורה יוצאת דופן.`);
  } else if (breakdown.dna === 20 && a.dnaType) {
    const aLabel = DNA_HEBREW_LABELS[a.dnaType] || a.dnaType;
    parts.push(`שניהם טיפוס ${aLabel} - שפה משותפת עמוקה.`);
  }
  // Only mention religiosity if non-secular (secular is the default, no need to highlight)
  if (a.religiosity && a.religiosity !== 'secular' && a.religiosity === b.religiosity) {
    const relLabel: Record<string, string> = { traditional: "מסורתיים", religious: "דתיים", orthodox: "חרדיים" };
    if (relLabel[a.religiosity]) {
      parts.push(`שניהם ${relLabel[a.religiosity]} - אורח חיים תואם.`);
    }
  }
  if (!hasFullBreakdown && legacyBd.kids === 10 && a.wantsKids) {
    const kidsLabel: Record<string, string> = { yes: "רוצים ילדים", no: "לא רוצים ילדים", open: "פתוחים לאפשרות" };
    parts.push(`שניהם ${kidsLabel[a.wantsKids] || a.wantsKids}.`);
  }
  if (!hasFullBreakdown && legacyBd.city === 10 && a.city) parts.push(`שניהם מ${a.city}.`);
  if (parts.length === 0) return `ראיתי פוטנציאל אמיתי בין ${a.firstName} ל-${b.firstName} על בסיס מספר פרמטרים.`;
  return `בחרתי לחבר ביניכם כי: ${parts.join(" ")} ציון תאימות כולל: ${breakdown.total}%.`;
}

async function generateMatchesForSingle(singleId: number, gender: "female" | "male") {
  const db = await getDb();
  if (!db) return;

  const [mySingle] = await db.select().from(singles).where(eq(singles.id, singleId));
  if (!mySingle) return;

  // Respect seekingGender: if not set, default to opposite gender
  const seekingGender = mySingle.seekingGender ?? (gender === "female" ? "male" : "female");

  const candidates = await db
    .select()
    .from(singles)
    .where(and(
      seekingGender === "any"
        ? sql`1=1`
        : eq(singles.gender, seekingGender as "female" | "male"),
      eq(singles.isActive, true),
      ne(singles.id, singleId)
    ));

  // Filter: candidate must also be seeking this person's gender
  const compatibleCandidates = candidates.filter((c: SingleRow) =>
    !c.seekingGender || c.seekingGender === "any" || c.seekingGender === gender
  );

  // Load questionnaire answers for mySingle and all candidates
  const myAnswerRow = await db.select().from(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, singleId)).limit(1);
  const myAnswers: MatchAnswer[] = myAnswerRow[0] ? JSON.parse(myAnswerRow[0].answersJson) : [];

  const candidateIds = compatibleCandidates.map((c: SingleRow) => c.id);
  const candidateAnswerRows = candidateIds.length > 0
    ? await db.select().from(matchmakingAnswers).where(inArray(matchmakingAnswers.singleId, candidateIds))
    : [];
  const answersMap = new Map(candidateAnswerRows.map(r => [r.singleId, JSON.parse(r.answersJson) as MatchAnswer[]]));

  // Use computeFullScore (v6.0 algorithm, 0-100 per dimension)
  const allScored = compatibleCandidates
    .map((c: SingleRow) => {
      const candidateAnswers = answersMap.get(c.id) ?? [];
      const breakdown = computeFullScore(mySingle as any, c as any, myAnswers, candidateAnswers);
      return { candidate: c, breakdown, candidateAnswers };
    })
    .sort((a, b) => b.breakdown.total - a.breakdown.total);

  // Take top 6 candidates (not 3) so that after skipping already-matched pairs,
  // we still end up with at least 3 new match records. This ensures every single
  // always sees 3 matches in the CRM even if some candidates were previously matched.
  let scored = allScored.filter(({ breakdown }) => breakdown.total >= 45).slice(0, 6);
  if (scored.length === 0) {
    scored = allScored.filter(({ breakdown }) => breakdown.total >= 30).slice(0, 6);
  }
  if (scored.length === 0) {
    // Last resort: take top 6 regardless of score
    scored = allScored.slice(0, 6);
  }

  for (const { candidate, breakdown, candidateAnswers } of scored) {
    // Skip if a match already exists (including rejected) — never re-propose a rejected pair
    const [existingMatch] = await db.select().from(matches).where(
      or(
        and(eq(matches.singleAId, singleId), eq(matches.singleBId, candidate.id)),
        and(eq(matches.singleAId, candidate.id), eq(matches.singleBId, singleId))
      )
    ).limit(1);
    if (existingMatch) continue;

    const now = Date.now();
    const explanation = await buildMatchExplanation(mySingle, candidate, breakdown, myAnswers, candidateAnswers);
    await db.insert(matches).values({
      singleId: singleId,
      matchedSingleId: candidate.id,
      singleAId: singleId,
      singleBId: candidate.id,
      score: breakdown.total,
      scoreBreakdown: JSON.stringify(breakdown),
      autoExplanation: explanation,
      proposedAt: now,
      status: "pending",
      updatedAt: now,
    });
  }
}

// ─── Match Email Builders ───────────────────────────────────────────────────
// buildMatchProposalEmail is now imported from emailTemplates.ts

// buildContactRevealEmail is now imported from emailTemplates.ts

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Legacy Leads (landing page guide form) ─────────────────────────────────
  leads: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        utmContent: z.string().optional(),
        utmTerm: z.string().optional(),
        lang: z.enum(["he", "en"]).optional(), // "en" = US market
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(leads).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          source: input.lang === "en" ? "en_guide" : "guide", // varchar field, supports any value
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          utmTerm: input.utmTerm,
        });
        // notifyOwner removed, lead notifications disabled
        // Insert into CRM leads for journey tracking
        const nowTs = Date.now();
        const nameParts = input.name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        // Check if CRM lead already exists
        const existingCrm = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.email, input.email)).limit(1);
        let crmLeadId: number;
        if (existingCrm.length > 0) {
          crmLeadId = existingCrm[0].id;
        } else {
          const inserted = await db.insert(crmLeads).values({
            name: input.name,
            email: input.email,
            phone: input.phone ?? undefined,
            source: "guide_form",
            status: "new_lead",
            createdAt: nowTs,
            updatedAt: nowTs,
          });
          crmLeadId = (inserted as any)[0].insertId as number;
        }
        // Route to English or Hebrew journey based on lang
        const journeyKey = input.lang === "en" ? "en_free_guide_nurture" : "free_guide_nurture";
        startJourney({
          email: input.email,
          firstName,
          lastName,
          phone: input.phone,
          gender: "female", // gender-neutral content
          journeyKey,
          leadId: crmLeadId,
        }).catch(err => console.error(`[Free Guide ${input.lang ?? "he"}] startJourney failed:`, err));
        return { success: true };
      }),

    // Paid database (₪149) - generates a personal join link and sends it via email
    submitPaidDatabase: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        origin: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        utmContent: z.string().optional(),
        utmTerm: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(leads).values({
          name: input.name,
          email: input.email,
          source: "paid_database",
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          utmTerm: input.utmTerm,
        }).catch(() => {});
        const origin = input.origin || "https://hilitcaspi.com";
        const now = Date.now();
        // Generate single-use join token (bound to this email, expires in 30 days)
        const joinToken = crypto.randomBytes(32).toString("hex");
        await db.insert(freeAccessTokens).values({
          token: joinToken,
          email: input.email,
          source: "paid_database",
          expiresAt: now + 30 * 24 * 60 * 60 * 1000,
          createdAt: now,
        });
        const joinUrl = `${origin}/join?free_token=${joinToken}`;
        const firstName = input.name.trim().split(" ")[0];
        await notifyOwner({
          title: "רכישת מאגר חדשה! 💛",
          content: `${input.name} (${input.email}) רכש כניסה למאגר הרווקים`,
        });
        sendEmail({
          to: { email: input.email, name: input.name },
          subject: "הקישור האישי שלך למאגר הרווקים",
          htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">ברוכים הבאים למאגר! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הקישור האישי שלך מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחה שהחלטת להצטרף למאגר הרווקים שלי. הקישור הבא הוא אישי ומאפשר שימוש חד-פעמי בלבד.</p><div style="text-align:center;margin:32px 0;"><a href="${joinUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">מילוי השאלון המדעי</a></div><div style="background:#f0eadc;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:14px;color:#191265;font-weight:bold;margin:0 0 8px;">לפני שמתחילים:</p><ul style="font-size:14px;color:#555;margin:0;padding-right:20px;line-height:2;"><li>מומלץ למלא אותו במקום שקט ולהקדיש את הזמן</li><li>הכינו תמונה עדכונית ואמיתית</li><li>הקישור תקף ל-30 יום ולשימוש חד-פעמי בלבד</li></ul></div><p style="font-size:13px;color:#888;margin:24px 0 0;">לא ניתן להעביר את הקישור לאחרים. אם יש בעיה, כתבו לי בוואטסאפ.</p><div style="text-align:center;margin:24px 0;"><a href="https://wa.me/972552442334" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">וואטסאפ עם הילית</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת כניסה למאגר הרווקים של הילית כספי.<br><a href="https://hilitcaspi.com/unsubscribe?email=${encodeURIComponent(input.email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
        }).catch(err => console.error("[Paid Database] Email send failed:", err));
        return { success: true };
      }),

    // Paid guide (₪149) - generates a single-use free access token for matchmaking database
    submitPaidGuide: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        origin: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        utmContent: z.string().optional(),
        utmTerm: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Save as lead
        await db.insert(leads).values({
          name: input.name,
          email: input.email,
          source: "paid_guide",
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          utmTerm: input.utmTerm,
        }).catch(() => {}); // ignore duplicate
        const origin = input.origin || "https://hilitcaspi.manus.space";
        const now = Date.now();

        // Generate product access token for the interactive guide (/guide/view)
        const guideToken = crypto.randomBytes(32).toString("hex");
        await db.insert(productAccessTokens).values({
          token: guideToken,
          email: input.email,
          name: input.name,
          product: "guide_149",
          expiresAt: now + 365 * 24 * 60 * 60 * 1000,
          accessCount: 0,
          createdAt: now,
        });
        const PAID_GUIDE_URL = `${origin}/guide/view?token=${guideToken}`;

        const firstName = input.name.trim().split(" ")[0];
        await notifyOwner({
          title: "רכישת מדריך חדשה! 💛",
          content: `${input.name} (${input.email}) רכשה את המדריך ב-149 שח`,
        });
        sendEmail({
          to: { email: input.email, name: input.name },
          subject: "המדריך שלך מחכה 💛",
          htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">תודה על הרכישה! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">המדריך שלך מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחתי מאוד שרכשתם את המדריך "לבחור נכון"! בתוכו תמצאו כלים מעשיים ותרגילים שיעזרו לכם לבחור נכון בדרך לזוגיות.</p><div style="text-align:center;margin:24px 0;"><a href="${PAID_GUIDE_URL}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">פתיחת המדריך</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת את המדריך של הילית כספי.<br><a href="https://hilitcaspi.manus.space/unsubscribe?email=${encodeURIComponent(input.email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
        }).catch(err => console.error("[Paid Guide] Email send failed:", err));
        return { success: true, guideToken };
      }),
    // Send guide link to email (called from ThankYouDigital when user wants link for later access)
    sendGuideEmailLink: publicProcedure
      .input(z.object({
        email: z.string().email(),
        token: z.string().min(10),
        origin: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Validate token exists in productAccessTokens
        const [row] = await db.select().from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token)).limit(1);
        if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "טוקן לא תקין" });
        const origin = input.origin || "https://hilitcaspi.com";
        const guideUrl = `${origin}/guide/view?token=${input.token}`;
        const name = row.name || "";
        const firstName = name.trim().split(" ")[0] || "שלום";
        await sendEmail({
          to: { email: input.email, name: name || input.email },
          subject: 'הקישור למדריך "לבחור נכון" 💛',
          htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">המדריך שלך מחכה 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הנה הקישור לגישה מכל מכשיר</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">הנה הקישור האישי שלך למדריך "לבחור נכון". שמרי אותו כי הוא מאפשר גישה מכל מכשיר בכל עת.</p><div style="text-align:center;margin:24px 0;"><a href="${guideUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">פתיחת המדריך</a></div><p style="font-size:14px;color:#888;margin:16px 0 0;">המדריך מיועד לעבודה לאורך מספר ימים. קחי את הזמן עם כל תרגיל.</p><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת את המדריך של הילית כספי.<br><a href="${origin}/unsubscribe?email=${encodeURIComponent(input.email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
        });
        return { success: true };
      }),
    // Course purchase (₪249) - generates access token for /course/view and sends guide bonus
    submitCourse: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        origin: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        utmContent: z.string().optional(),
        utmTerm: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Save as lead
        await db.insert(leads).values({
          name: input.name,
          email: input.email,
          source: "paid_course",
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          utmTerm: input.utmTerm,
        }).catch(() => {}); // ignore duplicate
        const origin = input.origin || "https://hilitcaspi.com";
        const now = Date.now();
        // Generate product access token for the course (/course/view)
        const courseToken = crypto.randomBytes(32).toString("hex");
        await db.insert(productAccessTokens).values({
          token: courseToken,
          email: input.email,
          name: input.name,
          product: "course_249",
          expiresAt: now + 365 * 24 * 60 * 60 * 1000,
          accessCount: 0,
          createdAt: now,
        });
        // Generate bonus guide token (/guide/view) - free for course buyers
        const guideToken = crypto.randomBytes(32).toString("hex");
        await db.insert(productAccessTokens).values({
          token: guideToken,
          email: input.email,
          name: input.name,
          product: "guide_149",
          expiresAt: now + 365 * 24 * 60 * 60 * 1000,
          accessCount: 0,
          createdAt: now,
        });
        const COURSE_URL = `${origin}/course/view?token=${courseToken}`;
        const GUIDE_URL = `${origin}/guide/view?token=${guideToken}`;
        const firstName = input.name.trim().split(" ")[0];
        await notifyOwner({
          title: "רכישת קורס חדשה! 🎓",
          content: `${input.name} (${input.email}) רכש/ה את הקורס ב-249 שח`,
        });
        sendEmail({
          to: { email: input.email, name: input.name },
          subject: "הקורס שלך מחכה! 🎓",
          htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">תודה על הרכישה! 🎓</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">הקורס שלך מחכה</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">שמחתי מאוד שהצטרפתם לקורס "המסע"! 5 מודולים מעשיים שיוביל אתכם מהמקום שבו אתם תקועים אל האהבה שאתם מחפשים.</p><div style="text-align:center;margin:32px 0;"><a href="${COURSE_URL}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">כניסה לקורס</a></div><div style="background:#ffe27c;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:15px;color:#191265;font-weight:bold;margin:0 0 8px;">🎁 הבונוס שלך - המדריך הדיגיטלי</p><p style="font-size:14px;color:#191265;margin:0 0 16px;">כמי שרכש/ה את הקורס, מגיע לך גם המדריך "לבחור נכון" - ללא תשלום נוסף.</p><div style="text-align:center;"><a href="${GUIDE_URL}" style="display:inline-block;background:#191265;color:#ffe27c;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">פתיחת המדריך החינמי</a></div></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי רכשת את הקורס של הילית כספי.<br><a href="${origin}/unsubscribe?email=${encodeURIComponent(input.email)}" style="color:rgba(255,255,255,0.5);">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
        }).catch(err => console.error("[Course] Email send failed:", err));
        return { success: true, courseUrl: COURSE_URL, guideUrl: GUIDE_URL };
      }),
  }),

  // ── Free Access Token validation ───────────────────────────────────────────
  freeToken: router({
    // Validate a free access token (called from /join page before showing free entry)
    // Returns the bound email so the frontend can auto-fill it: no need for user to type it
    validate: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false, reason: "server_error", email: null };
        const [row] = await db.select().from(freeAccessTokens)
          .where(eq(freeAccessTokens.token, input.token)).limit(1);
        if (!row) return { valid: false, reason: "not_found", email: null };
        if (row.usedAt) return { valid: false, reason: "already_used", email: null };
        if (Date.now() > row.expiresAt) return { valid: false, reason: "expired", email: null };
        return { valid: true, email: row.email };
      }),
    // Redeem a free access token (called when /join form is submitted with token)
    redeem: publicProcedure
      .input(z.object({ token: z.string(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [row] = await db.select().from(freeAccessTokens)
          .where(eq(freeAccessTokens.token, input.token)).limit(1);
        if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "קוד לא תקין" });
        if (row.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "קוד זה כבר נוצל" });
        if (Date.now() > row.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "הקוד פג תוקף" });
        if (row.email.toLowerCase() !== input.email.toLowerCase()) throw new TRPCError({ code: "BAD_REQUEST", message: "הקוד שייך לכתובת מייל אחרת" });
        // Mark as used
        await db.update(freeAccessTokens).set({
          usedAt: Date.now(),
          usedByEmail: input.email,
        }).where(eq(freeAccessTokens.token, input.token));
        return { success: true };
      }),
  }),

  // ── CRM ────────────────────────────────────────────────────────────────────
  crm: router({
    // Create a new CRM lead (called when user leaves contact details in DNA quiz)
    createLead: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        gender: z.enum(["female", "male"]).optional(),
        dnaType: z.enum(["leader", "romantic", "free_spirit", "anchor"]).optional(),
        quizSessionId: z.string().optional(),
        source: z.enum(["dna_quiz", "guide_form", "direct", "referral", "instagram", "podcast", "meta_lead_guide", "meta_lead_dna", "meta_lead_call", "press_article"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const nowTs = Date.now();

        // Check if lead already exists for this email (upsert pattern)
        const [existingLead] = await db
          .select({ id: crmLeads.id, status: crmLeads.status })
          .from(crmLeads)
          .where(eq(crmLeads.email, input.email))
          .limit(1);

        let leadId: number;
        let isNew = false;

        if (existingLead) {
          // Update existing lead with latest info
          leadId = existingLead.id;
          await db.update(crmLeads).set({
            name: input.name,
            phone: input.phone ?? undefined,
            gender: input.gender ?? undefined,
            dnaType: input.dnaType ?? undefined,
            quizSessionId: input.quizSessionId ?? undefined,
            updatedAt: nowTs,
          }).where(eq(crmLeads.id, leadId));
        } else {
          // Create new lead
          isNew = true;
          const inserted = await db.insert(crmLeads).values({
            name: input.name,
            email: input.email,
            phone: input.phone ?? undefined,
            gender: input.gender ?? undefined,
            dnaType: input.dnaType ?? undefined,
            quizSessionId: input.quizSessionId ?? undefined,
            source: input.source ?? "dna_quiz",
            status: "new_lead",
            createdAt: nowTs,
            updatedAt: nowTs,
          });
          leadId = (inserted as any)[0].insertId as number;
        }

        // notifyOwner removed, DNA lead notifications disabled

        // Start email automation journey (idempotency guard inside startJourney prevents duplicate sends)
        if (input.email && input.gender) {
          const nameParts = input.name.trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          const journeyKey = getJourneyKey(input.gender, "first_step_v2");
          // Fire and forget - don't block the response
          startJourney({
            email: input.email,
            firstName,
            lastName,
            phone: input.phone,
            gender: input.gender,
            dnaType: input.dnaType,
            journeyKey,
            leadId,
          }).catch(err => console.error("[Automation] startJourney failed:", err));
        }

        // Fire GA4 generate_lead event server-side
        if (isNew) {
          ga4GenerateLead(clientIdFromEmail(input.email), input.source ?? "dna_quiz").catch(() => {});
        }

        return { leadId, success: true };
      }),

    // Get all CRM leads (admin only)
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
    }),

    // Get leads that need follow-up (48h+ with no purchase, not yet flagged)
    getNeedingFollowup: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      return db
        .select()
        .from(crmLeads)
        .where(
          and(
            eq(crmLeads.status, "new_lead"),
            lt(crmLeads.createdAt, cutoff),
            isNull(crmLeads.followupFlaggedAt)
          )
        )
        .orderBy(crmLeads.createdAt);
    }),

    // Update lead status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum([
          "new_lead",
          "needs_followup",
          "call_scheduled",
          "call_done",
          "client_database",
          "client_guide",
          "client_course",
          "client_coaching",
          "not_relevant",
        ]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(crmLeads).set({ status: input.status, updatedAt: Date.now() }).where(eq(crmLeads.id, input.id));

        // Trigger automation journey on status transitions
        const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, input.id)).limit(1);
        if (lead && lead.email && lead.gender) {
          const nameParts = (lead.name ?? "").trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          let journeyType: "first_step" | "guide" | "matchmaking" | "matchmaking_welcome" | "transformation" | "course" | null = null;

          if (input.status === "client_guide") journeyType = "guide";
          else if (input.status === "client_database") journeyType = "matchmaking_welcome";
          else if (input.status === "client_course") journeyType = "course";
          else if (input.status === "client_coaching") journeyType = "transformation";

          if (journeyType) {
            const journeyKey = getJourneyKey(lead.gender, journeyType);
            startJourney({
              email: lead.email,
              firstName,
              lastName,
              phone: lead.phone ?? undefined,
              gender: lead.gender,
              dnaType: lead.dnaType ?? undefined,
              journeyKey,
              leadId: lead.id,
            }).catch(err => console.error("[Automation] Journey trigger failed:", err));
          }
        }

        return { success: true };
      }),

    // Update lead notes
    updateNotes: protectedProcedure
      .input(z.object({ id: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(crmLeads).set({ notes: input.notes }).where(eq(crmLeads.id, input.id));
        return { success: true };
      }),

    // Update lead contact fields (inline editing from CRM card)
    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gender: z.enum(["female", "male"]).optional().nullable(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = { updatedAt: Date.now() };
        if (fields.name !== undefined) updateData.name = fields.name;
        if (fields.email !== undefined) updateData.email = fields.email;
        if (fields.phone !== undefined) updateData.phone = fields.phone;
        if (fields.gender !== undefined) updateData.gender = fields.gender;
        if (fields.notes !== undefined) updateData.notes = fields.notes;
        await db.update(crmLeads).set(updateData as any).where(eq(crmLeads.id, id));
        return { success: true };
      }),

    // Schedule a meeting
    scheduleMeeting: protectedProcedure
      .input(z.object({
        id: z.number(),
        meetingAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(crmLeads).set({
          meetingAt: input.meetingAt,
          status: "call_scheduled",
          meetingReminder1Sent: false,
          meetingReminder2Sent: false,
        }).where(eq(crmLeads.id, input.id));
        return { success: true };
      }),

    // Get upcoming meetings (next 7 days)
    getUpcomingMeetings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const now = new Date();
      const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      return db
        .select()
        .from(crmLeads)
        .where(
          and(
            eq(crmLeads.status, "call_scheduled"),
            sql`${crmLeads.meetingAt} >= ${now}`,
            sql`${crmLeads.meetingAt} <= ${weekAhead}`
          )
        )
        .orderBy(crmLeads.meetingAt);
    }),

    // Flag leads for follow-up (run periodically or manually)
    flagForFollowup: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const staleLeads = await db
        .select()
        .from(crmLeads)
        .where(
          and(
            eq(crmLeads.status, "new_lead"),
            lt(crmLeads.createdAt, cutoff),
            isNull(crmLeads.followupFlaggedAt)
          )
        );

      for (const lead of staleLeads) {
        await db.update(crmLeads)
          .set({ status: "needs_followup", followupFlaggedAt: new Date() })
          .where(eq(crmLeads.id, lead.id));

        // notifyOwner removed, follow-up notifications disabled
      }

      return { flagged: staleLeads.length };
    }),

    // Get CRM stats
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return {};

      const statuses = [
        "new_lead", "needs_followup", "call_scheduled", "call_done",
        "client_database", "client_guide", "client_course", "client_coaching", "not_relevant"
      ] as const;

      const counts: Record<string, number> = {};
      for (const status of statuses) {
        const [row] = await db
          .select({ count: sql<number>`count(*)` })
          .from(crmLeads)
          .where(eq(crmLeads.status, status));
        counts[status] = Number(row?.count ?? 0);
      }

      // WhatsApp group click stats by source
      const waRows = await db.execute(
        sql`SELECT source, COUNT(*) as cnt FROM wa_clicks GROUP BY source`
      ) as any;
      const waStats: Record<string, number> = {};
      const waRowsArr = Array.isArray(waRows[0]) ? waRows[0] : waRows;
      for (const r of waRowsArr) {
        if (r && r.source) waStats[r.source] = Number(r.cnt ?? 0);
      }

      // Purchase stats by product and UTM source
      // Database product: read from singles table (UTM saved at registration time)
      // Other products (guide, course, coaching, session, live): read from crm_leads
      const purchaseRowsDb = await db.execute(
        sql`SELECT 'database' as product, utm_source, utm_campaign, COUNT(*) as cnt FROM singles WHERE is_paid = 1 GROUP BY utm_source, utm_campaign ORDER BY cnt DESC`
      ) as any;
      const purchaseRowsCrm = await db.execute(
        sql`SELECT product, utm_source, utm_campaign, COUNT(*) as cnt FROM crm_leads WHERE product IS NOT NULL AND product != 'database' GROUP BY product, utm_source, utm_campaign ORDER BY product, cnt DESC`
      ) as any;
      const purchaseRowsArr = [
        ...(Array.isArray(purchaseRowsDb[0]) ? purchaseRowsDb[0] : purchaseRowsDb),
        ...(Array.isArray(purchaseRowsCrm[0]) ? purchaseRowsCrm[0] : purchaseRowsCrm),
      ];
      const purchaseStats: Array<{ product: string; utmSource: string | null; utmCampaign: string | null; count: number }> = [];
      for (const r of purchaseRowsArr) {
        if (r && r.product) {
          purchaseStats.push({
            product: r.product,
            utmSource: r.utm_source || null,
            utmCampaign: r.utm_campaign || null,
            count: Number(r.cnt ?? 0),
          });
        }
      }

      // Calendly click stats by source and page
      const calendlyRows = await db.execute(
        sql`SELECT utm_source, utm_campaign, page, COUNT(*) as cnt FROM analytics_events WHERE event_type = 'calendly_click' GROUP BY utm_source, utm_campaign, page ORDER BY cnt DESC`
      ) as any;
      const calendlyRowsArr = Array.isArray(calendlyRows[0]) ? calendlyRows[0] : calendlyRows;
      const calendlyStats: Array<{ utmSource: string | null; utmCampaign: string | null; page: string | null; count: number }> = [];
      for (const r of calendlyRowsArr) {
        calendlyStats.push({
          utmSource: r.utm_source || null,
          utmCampaign: r.utm_campaign || null,
          page: r.page || null,
          count: Number(r.cnt ?? 0),
        });
      }

      return { ...counts, waStats, purchaseStats, calendlyStats };
    }),

    // Get full journey for a single lead (emails sent, DNA quiz, singles profile)
    getLeadJourney: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Get the lead
        const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, input.leadId)).limit(1);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

        // Get emails sent to this lead
        const emails = await db
          .select()
          .from(emailLog)
          .where(eq(emailLog.recipientEmail, lead.email))
          .orderBy(desc(emailLog.createdAt));

        // Get singles profile (if they joined the database) - needed for DNA lookup fallback
        const [singleProfile] = await db.select().from(singles)
          .where(eq(singles.email, lead.email)).limit(1);

        // Get DNA quiz result: first by quizSessionId, then by singleId (for singles who registered directly)
        let dnaResult = null;
        if (lead.quizSessionId) {
          const [quiz] = await db.select().from(dnaQuizResults)
            .where(eq(dnaQuizResults.sessionId, lead.quizSessionId)).limit(1);
          dnaResult = quiz ?? null;
        }
        // Fallback: look up by singleId if profile exists and no quiz found yet
        if (!dnaResult && singleProfile) {
          const [quiz] = await db.select().from(dnaQuizResults)
            .where(eq(dnaQuizResults.singleId, singleProfile.id)).limit(1);
          dnaResult = quiz ?? null;
        }

         // Get free access tokens
        const tokens = await db.select().from(freeAccessTokens)
          .where(eq(freeAccessTokens.email, lead.email));
        // Get scientific questionnaire answers (matchmakingAnswers) if they registered
        let scientificAnswers = null;
        if (singleProfile) {
          const [answers] = await db.select().from(matchmakingAnswers)
            .where(eq(matchmakingAnswers.singleId, singleProfile.id)).limit(1);
          scientificAnswers = answers ?? null;
        }

        // Get purchased products
        const purchasedProducts = await db.select().from(productAccessTokens)
          .where(eq(productAccessTokens.email, lead.email))
          .orderBy(desc(productAccessTokens.createdAt));

        // Derive journeys from email history
        const nowMs = Date.now();
        type JourneyEntry = { journeyKey: string; startedAt: number; nextEmailAt: number | null; emailsSent: number; totalEmails: number; lastEmailSubject: string; };
        const journeyMap: Record<string, JourneyEntry> = {};
        for (const e of emails) {
          const key = e.journeyKey;
          if (!journeyMap[key]) {
            journeyMap[key] = { journeyKey: key, startedAt: e.createdAt ?? nowMs, nextEmailAt: null, emailsSent: 0, totalEmails: 0, lastEmailSubject: '' };
          }
          const entry = journeyMap[key];
          entry.totalEmails++;
          if (e.status === 'sent') { entry.emailsSent++; entry.lastEmailSubject = e.subject; }
          if (e.status === 'pending' && e.scheduledAt && e.scheduledAt > nowMs) {
            if (entry.nextEmailAt === null || e.scheduledAt < entry.nextEmailAt) entry.nextEmailAt = e.scheduledAt;
          }
        }
        const activeJourneys = Object.values(journeyMap).sort((a, b) => b.startedAt - a.startedAt);

        return {
          lead,
          emails,
          dnaResult: dnaResult ?? null,
          singleProfile: singleProfile ?? null,
          freeTokens: tokens,
          scientificAnswers,
          purchasedProducts,
          activeJourneys,
        };
      }),
  }),

  // ── DNA Quizz ───────────────────────────────────────────────────────────────
  dnaQuiz: router({
    submit: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          gender: z.enum(["female", "male"]).optional(),
          answers: z.array(z.number().min(1).max(5)).length(20),
          // tiebreaker: the DNA type key chosen by the user when scores are tied
          tiebreaker: z.enum(["leader", "romantic", "free_spirit", "anchor"]).optional(),
          // UTM tracking fields
          utmSource: z.string().max(100).optional(),
          utmMedium: z.string().max(100).optional(),
          utmCampaign: z.string().max(200).optional(),
          utmContent: z.string().max(200).optional(),
          utmTerm: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const groupScores = {
          leader:      input.answers.slice(0, 5).reduce((s, v) => s + v, 0),
          romantic:    input.answers.slice(5, 10).reduce((s, v) => s + v, 0),
          free_spirit: input.answers.slice(10, 15).reduce((s, v) => s + v, 0),
          anchor:      input.answers.slice(15, 20).reduce((s, v) => s + v, 0),
        };

        type DnaKey = "leader" | "romantic" | "free_spirit" | "anchor";
        const maxScore = Math.max(...Object.values(groupScores));
        // Only exact ties trigger tiebreaker (same score)
        const topTypes = (Object.keys(groupScores) as DnaKey[]).filter(
          (k) => groupScores[k] === maxScore
        );

        // If the user answered the tiebreaker and it's among the top types, use it
        let dnaType: DnaKey;
        if (input.tiebreaker && topTypes.includes(input.tiebreaker)) {
          dnaType = input.tiebreaker;
        } else {
          // Fallback: pick the highest scorer; break ties by fixed order
          const tiebreakOrder = ["leader", "anchor", "romantic", "free_spirit"] as const;
          dnaType = tiebreakOrder.reduce((best, type) =>
            groupScores[type as DnaKey] > groupScores[best as DnaKey] ? type : best
          ) as DnaKey;
        }

        await db.insert(dnaQuizResults).values({
          sessionId: input.sessionId,
          gender: input.gender,
          dnaType,
          scores: JSON.stringify(groupScores),
          answers: JSON.stringify(input.answers),
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent: input.utmContent ?? null,
          utmTerm: input.utmTerm ?? null,
        });

        // notifyOwner removed, DNA quiz completion notifications disabled

        return { dnaType, scores: groupScores };
      }),

    markConverted: publicProcedure
      .input(z.object({ sessionId: z.string(), singleId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db
          .update(dnaQuizResults)
          .set({ convertedToRegistration: true, singleId: input.singleId })
          .where(eq(dnaQuizResults.sessionId, input.sessionId));

        // Reverse linkage: if the single has no dnaType, fill it from the quiz result
        const [quizRow] = await db.select({ dnaType: dnaQuizResults.dnaType })
          .from(dnaQuizResults)
          .where(eq(dnaQuizResults.sessionId, input.sessionId))
          .limit(1);
        if (quizRow?.dnaType) {
          const [single] = await db.select({ dnaType: singles.dnaType })
            .from(singles)
            .where(eq(singles.id, input.singleId))
            .limit(1);
          if (single && !single.dnaType) {
            await db.update(singles)
              .set({ dnaType: quizRow.dnaType, updatedAt: Date.now() })
              .where(eq(singles.id, input.singleId));
            console.log(`[markConverted] Reverse-linked dnaType=${quizRow.dnaType} to single id=${input.singleId}`);
          }
        }

        return { success: true };
      }),
  }),

  // ── Singles / Profiles ─────────────────────────────────────────────────────
  singles: router({
    register: publicProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().optional(),
          gender: z.enum(["female", "male"]),
          seekingGender: z.enum(["female", "male", "any"]).optional(),
          age: z.number().min(18).max(80),
          birthDate: z.string().optional(),
          city: z.string().min(1),
          phone: z.string().min(9),
          email: z.string().email(),
          height: z.number().min(100).max(250).optional(),
          education: z.enum(["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]).optional(),
          religiosity: z.enum(["secular", "traditional", "religious", "orthodox", "datlash"]).optional(),
          religiosityOrigin: z.enum(["cultural", "halachic"]).optional(),
          shomerShabbat: z.boolean().optional(),
          occupation: z.string().optional(),
          about: z.string().optional(),
          interests: z.string().optional(),
          maritalStatus: z.enum(["single", "divorced", "widowed"]).optional(),
          hasKids: z.boolean().optional(),
          numKids: z.number().optional(),
          wantsKids: z.enum(["yes", "no", "open"]).optional(),
          dnaType: z.enum(["leader", "romantic", "free_spirit", "anchor"]).optional(),
          dnaSessionId: z.string().optional(),
          minAgePreference: z.number().optional(),
          maxAgePreference: z.number().optional(),
          minHeightPreference: z.number().optional(),
          maxHeightPreference: z.number().optional(),
          religiosityPreference: z.string().optional(),
          acceptsKids: z.enum(["yes", "no", "open"]).optional(),
          openToPartnerWithKids: z.enum(["yes", "no", "depends_on_age"]).optional(),
          locationPreference: z.enum(["close", "anywhere"]).optional(),
          partnerDescription: z.string().optional(),
          photoBase64: z.string().optional(),
          photoMime: z.string().optional(),
          crmLeadId: z.number().optional(),
          source: z.enum(["dna_quiz", "guide_form", "direct", "referral", "instagram", "podcast", "meta_lead_guide", "meta_lead_dna", "meta_lead_call", "press_article"]).optional(),
          utmSource: z.string().optional(),
          utmMedium: z.string().optional(),
          utmCampaign: z.string().optional(),
          utmContent: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        let photoUrl: string | undefined;
        if (input.photoBase64 && input.photoMime) {
          const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const ext = input.photoMime.split("/")[1] || "jpg";
          const key = `singles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const result = await storagePut(key, buffer, input.photoMime);
          photoUrl = result.url;
        }

        const inserted = await db.insert(singles).values({
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          seekingGender: input.seekingGender ?? (input.gender === "female" ? "male" : "female"),
          age: input.birthDate ? Math.floor((Date.now() - new Date(input.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : (input.age ?? 0),
          birthDate: input.birthDate || null,
          city: input.city,
          phone: input.phone,
          email: input.email,
          height: input.height,
          education: input.education,
          religiosity: input.religiosity,
          religiosityOrigin: input.religiosityOrigin,
          shomerShabbat: input.shomerShabbat,
          occupation: input.occupation,
          about: input.about,
          interests: input.interests,
          maritalStatus: input.maritalStatus,
          hasKids: input.hasKids ?? false,
          numKids: input.numKids ?? 0,
          wantsKids: input.wantsKids,
          dnaType: input.dnaType,
          minAgePreference: input.minAgePreference,
          maxAgePreference: input.maxAgePreference,
          minHeightPreference: input.minHeightPreference,
          maxHeightPreference: input.maxHeightPreference,
          religiosityPreference: input.religiosityPreference,
          acceptsKids: input.acceptsKids === "yes" ? true : input.acceptsKids === "no" ? false : null,
          openToPartnerWithKids: input.openToPartnerWithKids,
          locationPreference: input.locationPreference,
          partnerDescription: input.partnerDescription,
          photoUrl,
          registrationSource: input.source ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent: input.utmContent ?? null,
          isActive: true,
          isSeed: false,
          isPaid: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const newSingleId = (inserted as any)[0].insertId as number;

        // Mark DNA quiz session as converted
        if (input.dnaSessionId) {
          await db
            .update(dnaQuizResults)
            .set({ convertedToRegistration: true, singleId: newSingleId })
            .where(eq(dnaQuizResults.sessionId, input.dnaSessionId));
        }

        // Auto-link DNA type if not provided (user may have taken quiz separately)
        if (!input.dnaType && !input.dnaSessionId) {
          const linkedDna = await autoLinkDnaType(db, newSingleId, input.email, input.phone);
          if (linkedDna) {
            // Update the dnaType in the notification below
            (input as any).dnaType = linkedDna;
          }
        }

        // Update CRM lead status to client_database
        // Try by explicit crmLeadId first, then by dnaSessionId, then by email
        let resolvedCrmLeadId = input.crmLeadId;
        if (!resolvedCrmLeadId && input.dnaSessionId) {
          const [leadBySession] = await db.select({ id: crmLeads.id })
            .from(crmLeads)
            .where(eq(crmLeads.quizSessionId, input.dnaSessionId))
            .limit(1);
          if (leadBySession) resolvedCrmLeadId = leadBySession.id;
        }
        if (!resolvedCrmLeadId) {
          const [leadByEmail] = await db.select({ id: crmLeads.id })
            .from(crmLeads)
            .where(eq(crmLeads.email, input.email))
            .orderBy(desc(crmLeads.createdAt))
            .limit(1);
          if (leadByEmail) resolvedCrmLeadId = leadByEmail.id;
        }
        if (resolvedCrmLeadId) {
          await db.update(crmLeads)
            .set({ status: "client_database", singleId: newSingleId, product: "database", updatedAt: Date.now() })
            .where(eq(crmLeads.id, resolvedCrmLeadId));
        } else {
          // No existing CRM lead - create one automatically
          const ins2 = await db.insert(crmLeads).values({
            name: `${input.firstName} ${input.lastName || ""}`.trim(),
            email: input.email,
            phone: input.phone,
            gender: input.gender,
            dnaType: input.dnaType,
            quizSessionId: input.dnaSessionId,
            source: "direct",
            status: "client_database",
            singleId: newSingleId,
            product: "database",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          resolvedCrmLeadId = (ins2 as any)[0].insertId as number;
        }

        await generateMatchesForSingle(newSingleId, input.gender);

        await notifyOwner({
          title: "פרופיל חדש נרשם! 💎",
          content: `${input.firstName} ${input.lastName || ""} (${input.gender === "female" ? "אישה" : "גבר"}, ${input.age > 0 ? input.age : '?'}, ${input.city}) הצטרפ${input.gender === "female" ? "ה" : ""} למאגר. DNA: ${input.dnaType || "לא מולא"}`,
        });

        // Start the matchmaking_welcome journey (handles welcome email + follow-up sequence)
        // Using startJourney instead of a direct send to prevent duplicates when CRM status also triggers it
        const journeyKey = getJourneyKey(input.gender, "matchmaking_welcome");
        startJourney({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName ?? "",
          phone: input.phone ?? undefined,
          gender: input.gender,
          dnaType: input.dnaType ?? undefined,
          journeyKey,
          leadId: resolvedCrmLeadId ?? undefined,
        }).catch(err => console.error("[Register] Welcome journey failed:", err));

        return { singleId: newSingleId, success: true };
      }),

    getMatches: publicProcedure
      .input(z.object({ singleId: z.number(), token: z.string().min(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        // [SECURITY] Verify ownership: the caller must present the single's own
        // questionnaireToken that matches the requested singleId. This prevents
        // IDOR enumeration by simply changing the numeric id in the URL.
        const [owner] = await db.select({ id: singles.id, token: singles.questionnaireToken })
          .from(singles)
          .where(eq(singles.id, input.singleId))
          .limit(1);
        if (!owner || !owner.token || owner.token !== input.token) {
          return [];
        }

        const myMatches = await db
          .select()
          .from(matches)
          .where(
            or(
              eq(matches.singleAId, input.singleId),
              eq(matches.singleBId, input.singleId)
            )
          )
          .orderBy(sql`${matches.score} DESC`)
          .limit(3);

        const matchedProfiles = await Promise.all(
          myMatches.map(async (m) => {
            const otherId = m.singleAId === input.singleId ? m.singleBId : m.singleAId;
            const [profile] = await db.select().from(singles).where(eq(singles.id, otherId));
            if (!profile) return null;
            return {
              ...profile,
              matchStatus: m.status,
              matchScore: m.score ?? null,
              matchAutoExplanation: m.autoExplanation ?? null,
            };
          })
        );

        return matchedProfiles.filter(Boolean);
      }),

    // [SECURITY] singles.getById was removed. It was a public endpoint returning a
    // full profile (incl. phone/email/questionnaireToken) by sequential numeric id,
    // enabling IDOR enumeration of the whole database. It was unused by the client.
    // If an admin-only lookup is needed in the future, reintroduce it guarded by a
    // role check (protectedProcedure + ctx.user.role === "admin").

    /**
     * Register a basic profile after payment (before the 15-question scientific questionnaire).
     * Saves the profile, generates a questionnaire token, and sends an email with the link.
     * The questionnaire is completed separately via /join/questionnaire?token=xxx
     */
    registerBasicProfile: publicProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().nullish(),
          gender: z.enum(["female", "male"]),
          seekingGender: z.enum(["female", "male", "any"]).nullish(),
          age: z.number().min(18).max(80),
          birthDate: z.string().optional(),
          city: z.string().min(1),
          phone: z.string().min(9),
          email: z.string().email(),
          height: z.number().min(100).max(250).nullish(),
          education: z.enum(["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]).nullish(),
          religiosity: z.enum(["secular", "traditional", "religious", "orthodox", "datlash"]).nullish(),
          religiosityOrigin: z.enum(["cultural", "halachic"]).nullish(),
          shomerShabbat: z.boolean().nullish(),
          occupation: z.string().nullish(),
          about: z.string().nullish(),
          interests: z.string().nullish(),
          maritalStatus: z.enum(["single", "divorced", "widowed"]).nullish(),
          hasKids: z.boolean().nullish(),
          numKids: z.number().nullish(),
          wantsKids: z.enum(["yes", "no", "open"]).nullish(),
          dnaType: z.enum(["leader", "romantic", "free_spirit", "anchor"]).nullish(),
          dnaSessionId: z.string().nullish(),
          minAgePreference: z.number().nullish(),
          maxAgePreference: z.number().nullish(),
          minHeightPreference: z.number().nullish(),
          maxHeightPreference: z.number().nullish(),
          religiosityPreference: z.string().nullish(),
          acceptsKids: z.enum(["yes", "no", "open"]).nullish(),
          openToPartnerWithKids: z.enum(["yes", "no", "depends_on_age"]).nullish(),
          locationPreference: z.enum(["close", "anywhere"]).nullish(),
          partnerDescription: z.string().nullish(),
          photoBase64: z.string().nullish(),
          photoMime: z.string().nullish(),
          origin: z.string().nullish(),
          freeToken: z.string().nullish(),
          utmSource: z.string().nullish(),
          utmMedium: z.string().nullish(),
          utmCampaign: z.string().nullish(),
          utmContent: z.string().nullish(),
          // US Market fields
          market: z.enum(["il", "us"]).nullish(),
          country: z.string().nullish(),
          usState: z.string().nullish(),
          zoomOk: z.boolean().nullish(),
          registrationSource: z.string().nullish(),
          // Consent fields
          consentMatchmaking: z.boolean().nullish(),
          consentDataSharing: z.boolean().nullish(),
          consentEmailMarketing: z.boolean().nullish(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Normalize email and phone to match Grow webhook storage format
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedPhone = input.phone.trim().replace(/[\s\-]/g, "");

        // Bug #1 fix: Prevent duplicate registrations
        // Also handles race condition: Grow webhook may create skeleton record (age=0, city="") before form submission
        // Search by normalized email OR phone to catch both cases
        const existingProfiles = await db.select({
          id: singles.id,
          age: singles.age,
          city: singles.city,
          questionnaireToken: singles.questionnaireToken,
          questionnaireCompletedAt: singles.questionnaireCompletedAt,
          firstName: singles.firstName,
        }).from(singles).where(
          or(
            sql`LOWER(${singles.email}) = ${normalizedEmail}`,
            normalizedPhone.length >= 9 ? eq(singles.phone, normalizedPhone) : sql`0=1`
          )
        ).limit(1);
        const existingProfile = existingProfiles[0] ?? null;

        if (existingProfile) {
          // Check if this is a skeleton record created by Grow webhook (age=0, city empty)
          const isSkeleton = existingProfile.age === 0 && (!existingProfile.city || existingProfile.city === "");

          if (isSkeleton) {
            // Update the skeleton record with the full profile data from the form
            console.log("[RegisterBasic] Updating Grow skeleton record id:", existingProfile.id, "for:", normalizedEmail);
            let photoUrl: string | undefined;
            if (input.photoBase64 && input.photoMime) {
              try {
                const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const ext = input.photoMime.split("/")[1] || "jpg";
                const key = `singles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const result = await storagePut(key, buffer, input.photoMime);
                photoUrl = result.url;
              } catch (photoErr) {
                console.error("[RegisterBasic] Photo upload failed (non-blocking):", photoErr);
              }
            }
            const now = Date.now();
            await db.update(singles).set({
              firstName: input.firstName,
              lastName: input.lastName,
              gender: input.gender,
              seekingGender: input.seekingGender ?? (input.gender === "female" ? "male" : "female"),
              age: input.birthDate ? Math.floor((Date.now() - new Date(input.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : (input.age ?? 0),
              birthDate: input.birthDate || null,
              city: input.city,
              phone: normalizedPhone || input.phone,
              email: normalizedEmail,
              height: input.height,
              education: input.education,
              religiosity: input.religiosity,
              religiosityOrigin: input.religiosityOrigin,
              shomerShabbat: input.shomerShabbat,
              occupation: input.occupation,
              about: input.about,
              interests: input.interests,
              maritalStatus: input.maritalStatus,
              hasKids: input.hasKids ?? false,
              numKids: input.numKids ?? 0,
              wantsKids: input.wantsKids,
              dnaType: input.dnaType,
              minAgePreference: input.minAgePreference,
              maxAgePreference: input.maxAgePreference,
              minHeightPreference: input.minHeightPreference,
              maxHeightPreference: input.maxHeightPreference,
              religiosityPreference: input.religiosityPreference,
              acceptsKids: input.acceptsKids === "yes" ? true : input.acceptsKids === "no" ? false : null,
              openToPartnerWithKids: input.openToPartnerWithKids,
              locationPreference: input.locationPreference,
              partnerDescription: input.partnerDescription,
              ...(photoUrl ? { photoUrl } : {}),
              isActive: false,
              isPaid: true,
              updatedAt: now,
              // Save UTM from the registration form (sessionStorage → frontend → here)
              ...(input.utmSource ? { utmSource: input.utmSource } : {}),
              ...(input.utmMedium ? { utmMedium: input.utmMedium } : {}),
              ...(input.utmCampaign ? { utmCampaign: input.utmCampaign } : {}),
              ...(input.utmContent ? { utmContent: input.utmContent } : {}),
            }).where(eq(singles.id, existingProfile.id));
            // Send questionnaire email with the existing token
            const origin = input.origin || "https://hilitcaspi.com";
            const questionnaireUrl = `${origin}/join/questionnaire?token=${existingProfile.questionnaireToken}`;
            sendEmail({
              to: { email: normalizedEmail, name: input.firstName },
              subject: "השלמת הרישום למאגר הרווקים של הילית",
              htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">שלב אחד נוסף! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">השאלון המדעי מחכה לך</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${input.firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">התשלום עבר בהצלחה ופרטיך נשמרו. כדי להיכנס למאגר ולקבל התאמות, יש להשלים את השאלון המדעי.</p><div style="text-align:center;margin:32px 0;"><a href="${questionnaireUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">למילוי השאלון המדעי</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div></div></body></html>`,
            }).catch(err => console.error("[RegisterBasic] Skeleton update email failed:", err));
            // notifyOwner removed — profile updated from Grow no longer sends email/push
            // Link DNA quiz session to this single (non-blocking)
            if (input.dnaSessionId) {
              db.update(dnaQuizResults)
                .set({ convertedToRegistration: true, singleId: existingProfile.id })
                .where(eq(dnaQuizResults.sessionId, input.dnaSessionId))
                .catch(err => console.error("[RegisterBasic] dnaQuizResults skeleton update failed:", err));
            }
            // Auto-link DNA type for skeleton records when dnaType/dnaSessionId are missing
            if (!input.dnaType && !input.dnaSessionId) {
              autoLinkDnaType(db, existingProfile.id, normalizedEmail, normalizedPhone)
                .then(linkedDna => {
                  if (linkedDna) console.log(`[RegisterBasic/Skeleton] Auto-linked dnaType=${linkedDna} for single id=${existingProfile.id}`);
                })
                .catch(err => console.error("[RegisterBasic/Skeleton] autoLinkDnaType failed:", err));
            }
            return { singleId: existingProfile.id, questionnaireToken: existingProfile.questionnaireToken || "", success: true, alreadyExists: false };
          }

          // Already fully registered - resend questionnaire email if not yet completed
          if (!existingProfile.questionnaireCompletedAt && existingProfile.questionnaireToken) {
            const origin = input.origin || "https://hilitcaspi.com";
            const questionnaireUrl = `${origin}/join/questionnaire?token=${existingProfile.questionnaireToken}`;
            sendEmail({
              to: { email: normalizedEmail, name: existingProfile.firstName },
              subject: "קישור לשאלון המדעי - הילית כספי",
              htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:24px;color:#191265"><h2>שלום ${existingProfile.firstName},</h2><p>כבר נרשמת למאגר. הנה הקישור לשאלון המדעי:</p><p style="margin:24px 0"><a href="${questionnaireUrl}" style="background:#ffe27c;color:#191265;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">למילוי השאלון</a></p><p style="color:#888;font-size:12px">אם לא ביקשת זאת, התעלם/י מהודעה זו.</p></div>`,
            }).catch(err => console.error("[RegisterBasic] Resend email failed:", err));
          }
          return { singleId: existingProfile.id, questionnaireToken: existingProfile.questionnaireToken || "", success: true, alreadyExists: true };
        }

        let photoUrl: string | undefined;
        if (input.photoBase64 && input.photoMime) {
          try {
            const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const ext = input.photoMime.split("/")[1] || "jpg";
            const key = `singles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const result = await storagePut(key, buffer, input.photoMime);
            photoUrl = result.url;
            console.log("[RegisterBasic] Photo uploaded:", photoUrl);
          } catch (photoErr) {
            console.error("[RegisterBasic] Photo upload failed (non-blocking):", photoErr);
            // Photo upload failure is non-blocking - proceed without photo
          }
        }

        // Generate unique questionnaire token
        const questionnaireToken = crypto.randomBytes(32).toString("hex");
        const now = Date.now();

        console.log("[RegisterBasic] Inserting into singles for:", input.email);
        const inserted = await db.insert(singles).values({
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          seekingGender: input.seekingGender ?? (input.gender === "female" ? "male" : "female"),
          age: input.birthDate ? Math.floor((Date.now() - new Date(input.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : (input.age ?? 0),
          birthDate: input.birthDate || null,
          city: input.city,
          phone: input.phone,
          email: input.email,
          height: input.height,
          education: input.education,
          religiosity: input.religiosity,
          religiosityOrigin: input.religiosityOrigin,
          shomerShabbat: input.shomerShabbat,
          occupation: input.occupation,
          about: input.about,
          interests: input.interests,
          maritalStatus: input.maritalStatus,
          hasKids: input.hasKids ?? false,
          numKids: input.numKids ?? 0,
          wantsKids: input.wantsKids,
          dnaType: input.dnaType,
          minAgePreference: input.minAgePreference,
          maxAgePreference: input.maxAgePreference,
          minHeightPreference: input.minHeightPreference,
          maxHeightPreference: input.maxHeightPreference,
          religiosityPreference: input.religiosityPreference,
          // acceptsKids in DB is boolean (tinyint), not enum - convert accordingly
          acceptsKids: input.acceptsKids === "yes" ? true : input.acceptsKids === "no" ? false : null,
          openToPartnerWithKids: input.openToPartnerWithKids,
          locationPreference: input.locationPreference,
          partnerDescription: input.partnerDescription,
          photoUrl,
          questionnaireToken,
          registrationSource: input.registrationSource ?? "dna_quiz",
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent: input.utmContent ?? null,
          // US Market fields
          market: input.market ?? "il",
          country: input.country ?? "IL",
          usState: input.usState ?? null,
          zoomOk: input.zoomOk ?? false,
          // Consent fields
          consentMatchmaking: input.consentMatchmaking ?? false,
          consentDataSharing: input.consentDataSharing ?? false,
          consentEmailMarketing: input.consentEmailMarketing ?? false,
          isActive: input.freeToken ? true : false, // active immediately if paid (free token); otherwise wait for payment
          isSeed: false,
          isPaid: input.freeToken ? true : false, // free token = paid; DNA form = wait for Grow webhook
          createdAt: now,
          updatedAt: now,
        });

        const newSingleId = (inserted as any)[0].insertId as number;
        console.log("[RegisterBasic] Inserted single id:", newSingleId, "for:", input.email);

        // Mark DNA quiz session as converted (non-blocking)
        if (input.dnaSessionId) {
          db.update(dnaQuizResults)
            .set({ convertedToRegistration: true, singleId: newSingleId })
            .where(eq(dnaQuizResults.sessionId, input.dnaSessionId))
            .catch(err => console.error("[RegisterBasic] dnaQuizResults update failed:", err));
        }

        // Auto-link DNA type if not provided (user may have taken quiz separately)
        if (!input.dnaType && !input.dnaSessionId) {
          autoLinkDnaType(db, newSingleId, normalizedEmail, normalizedPhone)
            .then(linkedDna => {
              if (linkedDna) console.log(`[RegisterBasic] Auto-linked dnaType=${linkedDna} for single id=${newSingleId}`);
            })
            .catch(err => console.error("[RegisterBasic] autoLinkDnaType failed:", err));
        }

        // Create or update CRM lead (non-blocking)
        db.select({ id: crmLeads.id })
          .from(crmLeads)
          .where(eq(crmLeads.email, input.email))
          .orderBy(desc(crmLeads.createdAt))
          .limit(1)
          .then(async ([leadByEmail]) => {
            if (leadByEmail) {
              await db.update(crmLeads)
                .set({ status: "client_database", singleId: newSingleId, product: "database", updatedAt: now })
                .where(eq(crmLeads.id, leadByEmail.id));
            } else {
              await db.insert(crmLeads).values({
                name: `${input.firstName} ${input.lastName || ""}`.trim(),
                email: input.email,
                phone: input.phone,
                gender: input.gender,
                dnaType: input.dnaType,
                quizSessionId: input.dnaSessionId,
                source: "direct",
                status: "client_database",
                singleId: newSingleId,
                product: "database",
                createdAt: now,
                updatedAt: now,
              });
            }
          })
          .catch(err => console.error("[RegisterBasic] CRM lead update failed:", err));

        // Notify owner only if this is a free-token registration (paid registrations are notified by Grow webhook)
        if (input.freeToken) {
          notifyOwner({
            title: "פרופיל חדש נרשם! (גישה חינמית) 💎",
            content: `${input.firstName} ${input.lastName || ""} (${input.gender === "female" ? "אישה" : "גבר"}, ${input.age > 0 ? input.age : '?'}, ${input.city}) נרשמ${input.gender === "female" ? "ה" : ""} למאגר עם גישה חינמית. DNA: ${input.dnaType || "לא מולא"}. ממתינ${input.gender === "female" ? "ה" : ""} להשלמת שאלון מדעי.`,
          }).catch(err => console.error("[RegisterBasic] notifyOwner failed:", err));
        }

        // Send email with questionnaire link
        const origin = input.origin || "https://hilitcaspi.com";
        const questionnaireUrl = `${origin}/join/questionnaire?token=${questionnaireToken}`;
        const isF = input.gender === "female";
        const isUS = input.market === "us";
        const dnaLabel = input.dnaType ? (isF ?
          { leader: "המנהיגה המגנטת", romantic: "הרומנטית העמוקה", free_spirit: "רוח חופשית", anchor: "העוגן היציבה" }[input.dnaType] :
          { leader: "המנהיג המגנטי", romantic: "הרומנטיקן העמוק", free_spirit: "רוח חופשית", anchor: "העוגן היציב" }[input.dnaType]
        ) : null;
        const dnaLabelEn = input.dnaType ? {
          leader: "The Magnetic Leader",
          romantic: "The Deep Romantic",
          free_spirit: "The Free Spirit",
          anchor: "The Stable Anchor",
        }[input.dnaType] : null;

        if (isUS) {
          // English email for US market registrants
          const unsubLink = `${origin}/unsubscribe?email=${encodeURIComponent(input.email)}`;
          sendEmail({
            to: { email: input.email, name: input.firstName },
            subject: `${input.firstName}, one more step to complete your profile`,
            htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg" alt="Hilit Caspi" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid #ffe27c;" /><h1 style="color:#ffe27c;font-size:22px;margin:12px 0 4px;">Match by Hilit</h1><p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Relationship Expert &amp; Matchmaker</p></div><div style="padding:40px;color:#191265;line-height:1.8;font-size:16px;"><h2 style="color:#191265;font-size:22px;margin-bottom:16px;">Hi ${input.firstName}, you are almost in!</h2>${dnaLabelEn ? `<div style="background:#f0eadc;border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:center;"><p style="font-size:13px;color:#727272;margin:0 0 4px;">Your Relationship Personality Type</p><p style="font-size:18px;font-weight:bold;color:#191265;margin:0;">${dnaLabelEn}</p></div>` : ""}<p style="margin:0 0 16px;">Your registration is confirmed. To activate your profile and start receiving match proposals, please complete the scientific questionnaire.</p><p style="margin:0 0 16px;">This questionnaire (about 15 minutes) helps me understand exactly who you are and what you truly need in a partner. The more honest you are, the better your matches will be.</p><div style="text-align:center;margin:32px 0;"><a href="${questionnaireUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">Complete My Questionnaire</a></div><div style="background:#f0eadc;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:14px;color:#191265;font-weight:bold;margin:0 0 8px;">Before you start:</p><ul style="font-size:14px;color:#555;margin:0;padding-left:20px;line-height:2;"><li>Find a quiet moment and take your time</li><li>This link is personal and single-use only</li><li>After completing it, your profile becomes active</li></ul></div><p style="font-size:13px;color:#888;margin:24px 0 0;">This link cannot be shared. If you have any issues, reach out via WhatsApp.</p><div style="text-align:center;margin:24px 0;"><a href="https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%20need%20help%20with%20my%20questionnaire" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">WhatsApp Hilit</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">With love,<br>Hilit Caspi<br><span style="font-size:13px;font-weight:normal;color:#727272;">Relationship Expert &amp; Matchmaker</span></p></div><div style="background:#191265;padding:24px 40px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0;">Match by Hilit | Relationship Expert &amp; Matchmaker</p><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0;">You received this email because you registered at matchbyhilit.com.</p><p style="font-size:11px;margin-top:8px;"><a href="${unsubLink}" style="color:rgba(255,255,255,0.4);">Unsubscribe</a></p></div></div></body></html>`,
          }).catch(err => console.error("[RegisterBasic] EN Email send failed:", err));
        } else {
          // Hebrew email for Israeli market
          sendEmail({
            to: { email: input.email, name: input.firstName },
            subject: "השלמת הרישום למאגר הרווקים של הילית",
            htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">שלב אחד נוסף! 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">השאלון המדעי מחכה לך</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${input.firstName},</p>${dnaLabel ? `<div style="background:#f0eadc;border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:center;"><p style="font-size:13px;color:#727272;margin:0 0 4px;">הפרופיל הזוגי שלך</p><p style="font-size:18px;font-weight:bold;color:#191265;margin:0;">${dnaLabel}</p></div>` : ""}<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">התשלום עבר בהצלחה ופרטיך נשמרו. כדי להיכנס למאגר ולקבל התאמות, יש להשלים את השאלון המדעי.</p><p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">השאלון כולל 15 שאלות שמאפשרות לי לבצע התאמות מדויקות יותר. מומלץ למלא אותו במקום שקט ולקחת את הזמן.</p><div style="text-align:center;margin:32px 0;"><a href="${questionnaireUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">למילוי השאלון המדעי</a></div><div style="background:#f0eadc;border-radius:12px;padding:20px 24px;margin:24px 0;"><p style="font-size:14px;color:#191265;font-weight:bold;margin:0 0 8px;">לפני שמתחילים:</p><ul style="font-size:14px;color:#555;margin:0;padding-right:20px;line-height:2;"><li>מומלץ למלא במקום שקט</li><li>הקישור אישי ולשימוש חד-פעמי בלבד</li><li>לאחר המילוי תקבל/י אישור כניסה למאגר</li></ul></div><p style="font-size:13px;color:#888;margin:24px 0 0;">לא ניתן להעביר את הקישור לאחרים. אם יש בעיה, כתוב/י לי בוואטסאפ.</p><div style="text-align:center;margin:24px 0;"><a href="https://wa.me/972552442334" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">וואטסאפ עם הילית</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי נרשמת למאגר הרווקים של הילית כספי.</p></div></div></body></html>`,
          }).catch(err => console.error("[RegisterBasic] Email send failed:", err));
        }

        // Fire GA4 sign_up event server-side
        ga4SignUp(clientIdFromEmail(input.email), input.freeToken ? "free_token" : "database").catch(() => {});

        return { singleId: newSingleId, questionnaireToken, success: true };
      }),

    /**
     * Get a single profile by questionnaire token (for the questionnaire page).
     */
    getByQuestionnaireToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [profile] = await db.select().from(singles)
          .where(eq(singles.questionnaireToken, input.token))
          .limit(1);
        if (!profile) return null;
        // Security: only allow access to questionnaire if payment has been confirmed OR if registered via free token
        // Free token users are created with isPaid=true (set in registerBasicProfile when freeToken is provided)
        if (!profile.isPaid) {
          console.warn(`[Security] Blocked unpaid questionnaire access for single id=${profile.id} email=${profile.email}`);
          return null;
        }
        return profile;
      }),

    /**
     * Get missing fields for a single by token (for the /join/complete page).
     * Returns the user's first name and a list of missing field names.
     */
    getMissingFields: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [profile] = await db.select().from(singles)
          .where(eq(singles.questionnaireToken, input.token))
          .limit(1);
        if (!profile) return null;
        if (!profile.isPaid) return null;

        const missingFields: string[] = [];
        if (!profile.age || profile.age === 0) missingFields.push("age");
        if (!profile.height) missingFields.push("height");
        if (!profile.city || profile.city === "") missingFields.push("city");
        if (!profile.occupation || profile.occupation === "") missingFields.push("occupation");
        if (!profile.photoUrl || profile.photoUrl === "") missingFields.push("photoUrl");
        if (!profile.lastName || profile.lastName === "") missingFields.push("lastName");

        return { firstName: profile.firstName, missingFields };
      }),

    /**
     * Update only the missing fields for a single (from /join/complete page).
     * Only updates fields that are currently empty/null.
     */
    updateMissingFields: publicProcedure
      .input(z.object({
        token: z.string(),
        age: z.number().min(18).max(80).optional(),
        height: z.number().min(100).max(250).optional(),
        city: z.string().max(100).optional(),
        occupation: z.string().max(150).optional(),
        lastName: z.string().max(100).optional(),
        photoBase64: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [profile] = await db.select().from(singles)
          .where(eq(singles.questionnaireToken, input.token))
          .limit(1);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "קישור לא תקין" });
        if (!profile.isPaid) throw new TRPCError({ code: "FORBIDDEN", message: "גישה נדחתה" });

        const patchData: Record<string, any> = { updatedAt: Date.now() };

        // Only update fields that are currently missing
        if (input.age && (!profile.age || profile.age === 0)) {
          patchData.age = input.age;
        }
        if (input.height && !profile.height) {
          patchData.height = input.height;
        }
        if (input.city && (!profile.city || profile.city === "")) {
          patchData.city = input.city;
        }
        if (input.occupation && (!profile.occupation || profile.occupation === "")) {
          patchData.occupation = input.occupation;
        }
        if (input.lastName && (!profile.lastName || profile.lastName === "")) {
          patchData.lastName = input.lastName;
        }
        if (input.photoBase64 && (!profile.photoUrl || profile.photoUrl === "")) {
          try {
            const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const ext = input.photoBase64.startsWith("data:image/png") ? "png" : "jpg";
            const key = `singles-photos/single-${profile.id}-${Date.now()}.${ext}`;
            const result = await storagePut(key, buffer, ext === "png" ? "image/png" : "image/jpeg");
            patchData.photoUrl = result.url;
          } catch (photoErr) {
            console.error("[updateMissingFields] Photo upload failed:", photoErr);
          }
        }

        if (Object.keys(patchData).length > 1) {
          await db.update(singles).set(patchData).where(eq(singles.id, profile.id));
        }

        return { success: true, updatedFields: Object.keys(patchData).filter(k => k !== "updatedAt") };
      }),

    /**
     * Complete the scientific questionnaire and activate the single in the database.
     * Called after the 15-question quiz is completed via the email link.
     */
    completeQuestionnaire: publicProcedure
      .input(z.object({
        token: z.string(),
        answers: z.array(z.object({
          qId: z.string(),
          myAnswer: z.union([z.number(), z.array(z.number())]),
          importance: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        })),
        // Optional fields for skeleton records (Grow payments without profile form)
        age: z.number().min(18).max(80).optional(),
        gender: z.enum(["female", "male"]).optional(),
        city: z.string().optional(),
        birthDate: z.string().optional(),
        height: z.number().min(100).max(250).optional(),
        religiosity: z.enum(["secular", "traditional", "religious", "orthodox", "datlash"]).optional(),
        education: z.enum(["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]).optional(),
        occupation: z.string().max(150).optional(),
        about: z.string().optional(),
        maritalStatus: z.enum(["single", "divorced", "widowed"]).optional(),
        photoBase64: z.string().optional(),
        // Additional fields for bundle flow
        phone: z.string().max(20).optional(),
        lastName: z.string().max(100).optional(),
        seekingGender: z.enum(["female", "male", "any"]).optional(),
        shomerShabbat: z.boolean().optional(),
        religiosityOrigin: z.enum(["cultural", "halachic"]).optional(),
        hasKids: z.boolean().optional(),
        numKids: z.number().min(0).max(15).optional(),
        wantsKids: z.enum(["yes", "no", "open"]).optional(),
        minAgePreference: z.number().min(18).max(80).optional(),
        maxAgePreference: z.number().min(18).max(80).optional(),
        minHeightPreference: z.number().min(100).max(250).optional(),
        maxHeightPreference: z.number().min(100).max(250).optional(),
        religiosityPreference: z.string().optional(),
        acceptsKids: z.enum(["yes", "no", "open"]).optional(),
        openToPartnerWithKids: z.enum(["yes", "no", "depends_on_age"]).optional(),
        locationPreference: z.enum(["close", "anywhere"]).optional(),
        partnerDescription: z.string().optional(),
        interests: z.string().optional(),
        dnaType: z.string().optional(),
        dnaSessionId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Find the single by token
        const [profile] = await db.select().from(singles)
          .where(eq(singles.questionnaireToken, input.token))
          .limit(1);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "קישור לא תקין" });
        // Security: block questionnaire completion if payment not confirmed
        // Note: free token users are created with isPaid=true so they pass this check
        if (!profile.isPaid) {
          console.warn(`[Security] Blocked unpaid completeQuestionnaire for single id=${profile.id} email=${profile.email}`);
          throw new TRPCError({ code: "FORBIDDEN", message: "התשלום טרם אושר. אנא צרו קשר עם הילית." });
        }
        if (profile.questionnaireCompletedAt) {
          // Already completed - just return success
          return { singleId: profile.id, success: true, alreadyCompleted: true };
        }

        const now = Date.now();
        // Always update personal details if provided (all users, not just skeleton records)
        {
          const patchData: Record<string, any> = { updatedAt: now };
          // Always update basic identity fields if provided
          if (input.age && input.age > 0) patchData.age = input.age;
          if (input.gender) patchData.gender = input.gender;
          if (input.city) patchData.city = input.city;
          if (input.birthDate) patchData.birthDate = input.birthDate;
          // Always save personal details from the details step (fixes bug where Grow-paid users lost their data)
          if (input.height && input.height > 0) patchData.height = input.height;
          if (input.religiosity) patchData.religiosity = input.religiosity;
          if (input.education) patchData.education = input.education;
          if (input.occupation) patchData.occupation = input.occupation;
          if (input.about) patchData.about = input.about;
          if (input.maritalStatus) patchData.maritalStatus = input.maritalStatus;
          // Additional fields from bundle flow
          if (input.phone) patchData.phone = input.phone;
          if (input.lastName) patchData.lastName = input.lastName;
          if (input.seekingGender) patchData.seekingGender = input.seekingGender;
          if (input.shomerShabbat !== undefined) patchData.shomerShabbat = input.shomerShabbat;
          if (input.religiosityOrigin) patchData.religiosityOrigin = input.religiosityOrigin;
          if (input.hasKids !== undefined) patchData.hasKids = input.hasKids;
          if (input.numKids !== undefined) patchData.numKids = input.numKids;
          if (input.wantsKids) patchData.wantsKids = input.wantsKids;
          if (input.minAgePreference) patchData.minAgePreference = input.minAgePreference;
          if (input.maxAgePreference) patchData.maxAgePreference = input.maxAgePreference;
          if (input.minHeightPreference) patchData.minHeightPreference = input.minHeightPreference;
          if (input.maxHeightPreference) patchData.maxHeightPreference = input.maxHeightPreference;
          if (input.religiosityPreference) patchData.religiosityPreference = input.religiosityPreference;
          if (input.acceptsKids) patchData.acceptsKids = input.acceptsKids === "yes" ? true : input.acceptsKids === "no" ? false : null;
          if (input.openToPartnerWithKids) patchData.openToPartnerWithKids = input.openToPartnerWithKids;
          if (input.locationPreference) patchData.locationPreference = input.locationPreference;
          if (input.partnerDescription) patchData.partnerDescription = input.partnerDescription;
          if (input.interests) patchData.interests = input.interests;
          if (input.dnaType) patchData.dnaType = input.dnaType;
          // Handle photo upload (for all users)
          if (input.photoBase64) {
            try {
              const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, "");
              const buffer = Buffer.from(base64Data, "base64");
              const ext = input.photoBase64.startsWith("data:image/png") ? "png" : "jpg";
              const key = `singles-photos/single-${profile.id}-${Date.now()}.${ext}`;
              const result = await storagePut(key, buffer, ext === "png" ? "image/png" : "image/jpeg");
              patchData.photoUrl = result.url;
              console.log("[completeQuestionnaire] Photo uploaded:", result.url);
            } catch (photoErr) {
              console.error("[completeQuestionnaire] Photo upload failed:", photoErr);
            }
          }
          // Only write to DB if there's something to update beyond updatedAt
          if (Object.keys(patchData).length > 1) {
            await db.update(singles).set(patchData).where(eq(singles.id, profile.id));
          }
        }

        // Save answers
        await db.delete(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, profile.id));
        await db.insert(matchmakingAnswers).values({
          singleId: profile.id,
          answersJson: JSON.stringify(input.answers),
          completedAt: now,
          updatedAt: now,
        });

        // Extract smoking data from the two dedicated smoking questions
        const smokingStatusAnswer = input.answers.find(a => a.qId === "q_smoking_status");
        const smokingPrefAnswer   = input.answers.find(a => a.qId === "q_smoking_pref");
        // q_smoking_status options: 0=לא מעשן/ת, 1=לעיתים, 2=מעשן/ת
        const SMOKING_STATUS_MAP: Record<number, "no" | "occasionally" | "yes"> = {
          0: "no",
          1: "occasionally",
          2: "yes",
        };
        const smokingStatus = smokingStatusAnswer && typeof smokingStatusAnswer.myAnswer === "number"
          ? SMOKING_STATUS_MAP[smokingStatusAnswer.myAnswer] ?? null
          : null;
        // q_smoking_pref options: 0=לא מפריע לי, 1=מעדיפ/ה שלא אבל לא קו אדום, 2=חיוני לי שלא (קו אדום)
        const SMOKING_PREF_MAP: Record<number, "doesnt_matter" | "occasionally_ok" | "no_smokers"> = {
          0: "doesnt_matter",
          1: "occasionally_ok",
          2: "no_smokers",
        };
        const smokingPreference = smokingPrefAnswer && typeof smokingPrefAnswer.myAnswer === "number"
          ? SMOKING_PREF_MAP[smokingPrefAnswer.myAnswer] ?? null
          : null;
        // Activate the single
        await db.update(singles)
          .set({
            isActive: true,
            questionnaireCompletedAt: now,
            updatedAt: now,
            ...(smokingStatus ? { smokingStatus } : {}),
            ...(smokingPreference ? { smokingPreference } : {}),
          })
          .where(eq(singles.id, profile.id));

        // Merge input values with profile, input may have patched age/gender/city for skeleton records (Grow payments)
        const finalAge = (input.age && input.age > 0) ? input.age : profile.age;
        const finalGender = input.gender || profile.gender;
        const finalCity = input.city || profile.city;

        // Auto-link DNA type if still missing at questionnaire completion time
        if (!profile.dnaType) {
          await autoLinkDnaType(db, profile.id, profile.email!, profile.phone ?? undefined)
            .catch(err => console.error("[completeQuestionnaire] autoLinkDnaType failed:", err));
        }

        // Generate matches and notify owner in background (fire-and-forget)
        // This avoids LLM timeout blocking the user's response
        setImmediate(async () => {
          try {
            await generateMatchesForSingle(profile.id, finalGender);
            // notifyOwner removed — questionnaire completion no longer sends email/push
          } catch (bgErr) {
            console.error("[completeQuestionnaire] Background match generation failed:", bgErr);
          }
        });

        return { singleId: profile.id, success: true, alreadyCompleted: false };
      }),

    /**
     * Get user dashboard data by email + questionnaire token.
     * Returns profile, matches, and DNA results.
     */
    getDashboard: publicProcedure
      .input(z.object({ email: z.string().email(), token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [profile] = await db.select().from(singles)
          .where(sql`LOWER(${singles.email}) = ${input.email.trim().toLowerCase()}`)
          .limit(1);
        if (!profile) return null;
        // Token is mandatory - verify it matches
        if (profile.questionnaireToken !== input.token) return null;
        // Get matches
        const myMatches = await db.select().from(matches)
          .where(or(
            eq(matches.singleAId, profile.id),
            eq(matches.singleBId, profile.id)
          ))
          .orderBy(desc(matches.createdAt))
          .limit(10);
        const enrichedMatches = await Promise.all(
          myMatches.map(async (m) => {
            const isA = m.singleAId === profile.id;
            const otherId = isA ? m.singleBId : m.singleAId;
            const myConsent = isA ? m.approvedByA : m.approvedByB;
            const theirConsent = isA ? m.approvedByB : m.approvedByA;
            if (m.status === 'matched' && m.approvedByA && m.approvedByB) {
              const [other] = await db.select({
                firstName: singles.firstName,
                age: singles.age,
                city: singles.city,
                occupation: singles.occupation,
                photoUrl: singles.photoUrl,
                dnaType: singles.dnaType,
                phone: singles.phone,
                email: singles.email,
              }).from(singles).where(eq(singles.id, otherId)).limit(1);
              return { matchId: m.id, status: m.status, score: m.score, proposedAt: m.proposedAt, myConsent, theirConsent, approvalExpiresAt: m.approvalExpiresAt, other: other || null, contactRevealed: true };
            }
            if (m.status === 'proposed') {
              const [other] = await db.select({
                firstName: singles.firstName,
                age: singles.age,
                city: singles.city,
                dnaType: singles.dnaType,
                photoUrl: singles.photoUrl,
              }).from(singles).where(eq(singles.id, otherId)).limit(1);
              return { matchId: m.id, status: m.status, score: m.score, proposedAt: m.proposedAt, myConsent, theirConsent, approvalExpiresAt: m.approvalExpiresAt, other: other || null, contactRevealed: false };
            }
            return { matchId: m.id, status: m.status, score: m.score, proposedAt: m.proposedAt, myConsent, theirConsent, approvalExpiresAt: m.approvalExpiresAt, other: null, contactRevealed: false };
          })
        );
        const [dnaResult] = await db.select().from(dnaQuizResults)
          .where(eq(dnaQuizResults.singleId, profile.id))
          .orderBy(desc(dnaQuizResults.createdAt))
          .limit(1);
        return {
          profile: {
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            gender: profile.gender,
            age: profile.age,
            city: profile.city,
            occupation: profile.occupation,
            education: profile.education,
            religiosity: profile.religiosity,
            maritalStatus: profile.maritalStatus,
            hasKids: profile.hasKids,
            numKids: profile.numKids,
            wantsKids: profile.wantsKids,
            about: profile.about,
            interests: profile.interests,
            photoUrl: profile.photoUrl,
            dnaType: profile.dnaType,
            isActive: profile.isActive,
            questionnaireCompletedAt: profile.questionnaireCompletedAt,
            createdAt: profile.createdAt,
          },
          matches: enrichedMatches,
          dnaResult: dnaResult ? { dnaType: dnaResult.dnaType, scores: dnaResult.scores, createdAt: dnaResult.createdAt } : null,
          hasCompletedQuestionnaire: !!profile.questionnaireCompletedAt,
          questionnaireToken: profile.questionnaireToken,
        };
      }),

    /**
     * Send a magic link to the user's email for dashboard access.
     */
    sendDashboardLink: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const normalizedEmail = input.email.trim().toLowerCase();
        const [profile] = await db.select().from(singles)
          .where(sql`LOWER(${singles.email}) = ${normalizedEmail}`)
          .limit(1);
        if (!profile) return { success: false, notFound: true };
        const dashboardUrl = `${input.origin}/my-profile?email=${encodeURIComponent(profile.email || normalizedEmail)}&token=${profile.questionnaireToken || ''}`;
        await sendEmail({
          to: { email: input.email, name: profile.firstName },
          subject: 'הקישור שלך לאזור האישי',
          htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:32px;text-align:center;"><h1 style="color:#ffe27c;font-size:24px;margin:0;">האזור האישי שלך 💛</h1></div><div style="padding:32px;"><p style="font-size:17px;color:#191265;">שלום ${profile.firstName},</p><p style="font-size:15px;color:#555;line-height:1.7;">לחץ/י על הכפתור כדי להיכנס לאזור האישי שלך.</p><div style="text-align:center;margin:32px 0;"><a href="${dashboardUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:17px;font-weight:bold;padding:14px 36px;border-radius:12px;text-decoration:none;">כניסה לאזור האישי</a></div><p style="font-size:13px;color:#888;">הקישור תקף ל-48 שעות.</p><p style="font-size:15px;color:#191265;font-weight:bold;">הילית כספי</p></div></div></body></html>`,
        }).catch(err => console.error('[Dashboard] Email failed:', err));
        return { success: true };
      }),
    /**
     * Get questionnaire link by email - used on thank-you page so user can go directly to questionnaire
     */
    getQuestionnaireLink: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, url: null };
        const [profile] = await db.select({
          id: singles.id,
          firstName: singles.firstName,
          questionnaireToken: singles.questionnaireToken,
          questionnaireCompletedAt: singles.questionnaireCompletedAt,
          isPaid: singles.isPaid,
        }).from(singles)
          .where(sql`LOWER(${singles.email}) = ${input.email.trim().toLowerCase()}`)
          .limit(1);
        if (!profile || !profile.isPaid) return { success: false, url: null, notFound: true };
        if (profile.questionnaireCompletedAt) return { success: true, url: null, alreadyCompleted: true };
        if (!profile.questionnaireToken) return { success: false, url: null };
        const url = `${input.origin}/join/questionnaire?token=${profile.questionnaireToken}`;
        return { success: true, url };
      }),
  }),
  // ── Adminn ──────────────────────────────────────────────────────────────────
  admin: router({
    checkCompatibility: protectedProcedure
      .input(z.object({ idA: z.number(), idB: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [singleA] = await db.select().from(singles).where(eq(singles.id, input.idA)).limit(1);
        const [singleB] = await db.select().from(singles).where(eq(singles.id, input.idB)).limit(1);
        if (!singleA || !singleB) throw new TRPCError({ code: "NOT_FOUND", message: "אחד מהאנשים לא נמצא" });
        const answersA = await db.select().from(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, singleA.id)).limit(1);
        const answersB = await db.select().from(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, singleB.id)).limit(1);
        const parsedA: MatchAnswer[] = answersA[0]?.answersJson ? (typeof answersA[0].answersJson === 'string' ? JSON.parse(answersA[0].answersJson) : answersA[0].answersJson as MatchAnswer[]) : [];
        const parsedB: MatchAnswer[] = answersB[0]?.answersJson ? (typeof answersB[0].answersJson === 'string' ? JSON.parse(answersB[0].answersJson) : answersB[0].answersJson as MatchAnswer[]) : [];
        // Use admin variant: bypasses hard filters, returns warnings instead of 0
        const breakdown = computeFullScoreAdmin(singleA as any, singleB as any, parsedA, parsedB);
        const narrative = await buildMatchExplanation(singleA as any, singleB as any, breakdown, parsedA, parsedB);
        return {
          score: breakdown.total,
          warnings: breakdown.warnings ?? [],
          breakdown: {
            questionnaire: breakdown.questionnaire,
            lifeStage: breakdown.lifeStage,
            dna: breakdown.dna,
            practical: breakdown.practical,
            religiosity: breakdown.religiosity,
            education: breakdown.education,
            cityIntelligence: breakdown.cityIntelligence,
          },
          narrative,
          personA: { id: singleA.id, firstName: singleA.firstName, lastName: singleA.lastName, age: singleA.age, city: singleA.city, gender: singleA.gender, photoUrl: singleA.photoUrl },
          personB: { id: singleB.id, firstName: singleB.firstName, lastName: singleB.lastName, age: singleB.age, city: singleB.city, gender: singleB.gender, photoUrl: singleB.photoUrl },
        };
      }),

    /**
     * Create a match record directly from the compatibility check tab and send proposal emails.
     * Used when Hilit wants to send a match without running the full algorithm first.
     */
    createAndSendMatch: protectedProcedure
      .input(z.object({
        idA: z.number(),
        idB: z.number(),
        hilitsNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [singleA] = await db.select().from(singles).where(eq(singles.id, input.idA)).limit(1);
        const [singleB] = await db.select().from(singles).where(eq(singles.id, input.idB)).limit(1);
        if (!singleA || !singleB) throw new TRPCError({ code: "NOT_FOUND", message: "אחד מהאנשים לא נמצא" });

        // Check if either single already has an active proposed match
        const activeMatchA = await db.select({ id: matches.id }).from(matches).where(
          and(
            or(eq(matches.singleAId, input.idA), eq(matches.singleBId, input.idA)),
            eq(matches.status, "proposed")
          )
        ).limit(1);
        const activeMatchB = await db.select({ id: matches.id }).from(matches).where(
          and(
            or(eq(matches.singleAId, input.idB), eq(matches.singleBId, input.idB)),
            eq(matches.status, "proposed")
          )
        ).limit(1);
        const activeWarnings: string[] = [];
        if (activeMatchA.length > 0) activeWarnings.push(`${singleA.firstName} כבר בהתאמה פעילה`);
        if (activeMatchB.length > 0) activeWarnings.push(`${singleB.firstName} כבר בהתאמה פעילה`);
        if (activeWarnings.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `⚠️ שים לב: ${activeWarnings.join(" ו-")}. לא ניתן לשלוח התאמה נוספת בזמן שהתאמה אחרת ממתינה לתשובה.`
          });
        }

        // Check if a match record already exists between them
        const existingMatch = await db.select().from(matches).where(
          or(
            and(eq(matches.singleAId, input.idA), eq(matches.singleBId, input.idB)),
            and(eq(matches.singleAId, input.idB), eq(matches.singleBId, input.idA))
          )
        ).limit(1);

        // Compute score
        const answersA = await db.select().from(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, singleA.id)).limit(1);
        const answersB = await db.select().from(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, singleB.id)).limit(1);
        const parsedA: MatchAnswer[] = answersA[0]?.answersJson ? (typeof answersA[0].answersJson === 'string' ? JSON.parse(answersA[0].answersJson) : answersA[0].answersJson as MatchAnswer[]) : [];
        const parsedB: MatchAnswer[] = answersB[0]?.answersJson ? (typeof answersB[0].answersJson === 'string' ? JSON.parse(answersB[0].answersJson) : answersB[0].answersJson as MatchAnswer[]) : [];
        const breakdown = computeFullScoreAdmin(singleA as any, singleB as any, parsedA, parsedB);
        const score = breakdown.total;

        let matchId: number;
        if (existingMatch.length > 0) {
          matchId = existingMatch[0].id;
          // Reset to pending so approveMatch logic can run
          await db.update(matches).set({ status: "pending", score, updatedAt: Date.now() }).where(eq(matches.id, matchId));
        } else {
          const [inserted] = await db.insert(matches).values({
            singleId: input.idA,
            matchedSingleId: input.idB,
            singleAId: input.idA,
            singleBId: input.idB,
            score,
            status: "pending",
            updatedAt: Date.now(),
          }).$returningId();
          matchId = inserted.id;
        }

        // Now run the same approval logic
        const tokenA = crypto.randomBytes(24).toString("hex");
        const tokenB = crypto.randomBytes(24).toString("hex");
        const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
        const now = Date.now();

        await db.update(matches).set({
          status: "proposed",
          approvalTokenA: tokenA,
          approvalTokenB: tokenB,
          approvalExpiresAt: expiresAt,
          proposedAt: now,
          ownerApprovedAt: now,
          updatedAt: now,
        }).where(eq(matches.id, matchId));

        const dnaLabels = DNA_HEBREW_LABELS;
        const dnaA = singleA.dnaType ? dnaLabels[singleA.dnaType] || singleA.dnaType : null;
        const dnaB = singleB.dnaType ? dnaLabels[singleB.dnaType] || singleB.dnaType : null;
        const defaultNote = input.hilitsNote ||
          `בחרתי לחבר ביניכם כי ראיתי ${score >= 80 ? "התאמה גבוהה מאוד" : score >= 60 ? "התאמה טובה" : "פוטנציאל אמיתי"} בכמה רמות${dnaA && dnaB ? `. ${singleA.firstName} הוא ${dnaA} ו-${singleB.firstName} הוא ${dnaB}, ושני הסוגים האלה משלימים אחד את השני בצורה יוצאת דופן` : ""}. ${singleA.city === singleB.city ? `שניכם מ${singleA.city}, מה שמקל על מפגש ראשון. ` : ""}אני מאמינה שיש כאן בסיס לקשר אמיתי. תנו לזה צ'אנס.`;

        const baseUrl = "https://hilitcaspi.com";
        const emailA = buildMatchProposalEmailTemplate({
          firstName: singleA.firstName,
          recipientGender: (singleA.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleB.firstName,
          matchAge: singleB.age ?? 0,
          matchCity: singleB.city ?? "",
          matchOccupation: singleB.occupation ?? undefined,
          matchDnaType: singleB.dnaType ?? undefined,
          matchPhotoUrl: singleB.photoUrl ? (singleB.photoUrl.startsWith("http") ? singleB.photoUrl : `https://hilitcaspi.com${singleB.photoUrl}`) : undefined,
          matchEducation: singleB.education ?? undefined,
          matchHasKids: singleB.hasKids ?? undefined,
          matchNumKids: singleB.numKids ?? undefined,
          matchWantsKids: singleB.wantsKids ?? undefined,
          matchReligiosity: singleB.religiosity ?? undefined,
          compatibilityScore: score,
          hilitsNote: defaultNote,
          yesUrl: `${baseUrl}/match/respond?token=${tokenA}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenA}&response=no`,
          recipientEmail: singleA.email!,
          singleId: singleA.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenA}&side=a`,
        });
        const emailB = buildMatchProposalEmailTemplate({
          firstName: singleB.firstName,
          recipientGender: (singleB.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleA.firstName,
          matchAge: singleA.age ?? 0,
          matchCity: singleA.city ?? "",
          matchOccupation: singleA.occupation ?? undefined,
          matchDnaType: singleA.dnaType ?? undefined,
          matchPhotoUrl: singleA.photoUrl ? (singleA.photoUrl.startsWith("http") ? singleA.photoUrl : `https://hilitcaspi.com${singleA.photoUrl}`) : undefined,
          matchEducation: singleA.education ?? undefined,
          matchHasKids: singleA.hasKids ?? undefined,
          matchNumKids: singleA.numKids ?? undefined,
          matchWantsKids: singleA.wantsKids ?? undefined,
          matchReligiosity: singleA.religiosity ?? undefined,
          compatibilityScore: score,
          hilitsNote: defaultNote,
          yesUrl: `${baseUrl}/match/respond?token=${tokenB}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenB}&response=no`,
          recipientEmail: singleB.email!,
          singleId: singleB.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenB}&side=b`,
        });

        await Promise.all([
          sendEmail({ to: { email: singleA.email!, name: singleA.firstName }, subject: emailA.subject, htmlContent: emailA.htmlBody }),
          sendEmail({ to: { email: singleB.email!, name: singleB.firstName }, subject: emailB.subject, htmlContent: emailB.htmlBody }),
        ]);

        await notifyOwner({ title: "✅ התאמה נשלחה!", content: `ההצעה ל-${singleA.firstName} ו-${singleB.firstName} נשלחה. ממתינים לתגובה תוך 48 שעות.` });

        const matchWaMsg = (firstName: string, matchName: string) =>
          `היי ${firstName}! 💛\nשלחתי לך עכשיו מייל עם התאמה מיוחדת שבחרתי עבורך, ${matchName} מחכה לתשובתך!\nכדאי לבדוק את תיבת המייל (גם ספאם) וללחוץ על הקישור.\nהילית 💛`;
        const waNow = Date.now();
        await db.update(matches).set({ waSentAt: waNow }).where(eq(matches.id, matchId));
        if (singleA.phone) {
          sendWhatsApp(singleA.phone, matchWaMsg(singleA.firstName, singleB.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleA:", err)
          );
        }
        if (singleB.phone) {
          sendWhatsApp(singleB.phone, matchWaMsg(singleB.firstName, singleA.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleB:", err)
          );
        }

        return { success: true, matchId, score };
      }),

    getAllSingles: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      // Exclude seed/demo data - only show real registrations
      return db.select().from(singles)
        .where(eq(singles.isSeed, false))
        .orderBy(desc(singles.createdAt));
    }),

    getAllLeads: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leads).orderBy(desc(leads.createdAt));
    }),

    getAllQuizResults: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dnaQuizResults).orderBy(desc(dnaQuizResults.createdAt));
    }),

    toggleActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(singles).set({ isActive: input.isActive }).where(eq(singles.id, input.id));
        return { success: true };
      }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { totalSingles: 0, totalLeads: 0, totalQuizResults: 0, paidRegistrations: 0 };

      const [singlesCount] = await db.select({ count: sql<number>`count(*)` }).from(singles);
      const [leadsCount] = await db.select({ count: sql<number>`count(*)` }).from(leads);
      const [quizCount] = await db.select({ count: sql<number>`count(*)` }).from(dnaQuizResults);
      const [paidCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(singles)
        .where(and(eq(singles.isPaid, true), eq(singles.isSeed, false)));

      return {
        totalSingles: Number(singlesCount?.count ?? 0),
        totalLeads: Number(leadsCount?.count ?? 0),
        totalQuizResults: Number(quizCount?.count ?? 0),
        paidRegistrations: Number(paidCount?.count ?? 0),
      };
    }),
    /**
     * Resend questionnaire email to all singles who haven't completed it yet.
     * Used to fix the bug where some users registered but never received the questionnaire email.
     */
    resendPendingQuestionnaireEmails: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Find all singles who have a questionnaireToken but haven't completed the questionnaire
        const pending = await db.select({
          id: singles.id,
          firstName: singles.firstName,
          email: singles.email,
          gender: singles.gender,
          dnaType: singles.dnaType,
          questionnaireToken: singles.questionnaireToken,
        }).from(singles)
          .where(and(
            eq(singles.isSeed, false),
            isNull(singles.questionnaireCompletedAt),
            isNotNull(singles.questionnaireToken),
            isNotNull(singles.email),
          ));
        let sent = 0;
        let failed = 0;
        const origin = input.origin || "https://hilitcaspi.com";
        for (const s of pending) {
          if (!s.email || !s.questionnaireToken) continue;
          const isF = s.gender === "female";
          const dnaLabel = s.dnaType ? (isF ?
            { leader: "המנהיגה המגנטת", romantic: "הרומנטית העמוקה", free_spirit: "רוח חופשית", anchor: "העוגן היציבה" }[s.dnaType as string] :
            { leader: "המנהיג המגנטי", romantic: "הרומנטיקן העמוק", free_spirit: "רוח חופשית", anchor: "העוגן היציב" }[s.dnaType as string]
          ) : null;
          const questionnaireUrl = `${origin}/join/questionnaire?token=${s.questionnaireToken}`;
          try {
            await sendEmail({
              to: { email: s.email, name: s.firstName || "" },
              subject: "תזכורת: השלמת הרישום למאגר הרווקים של הילית",
              htmlContent: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;"><div style="background:#191265;padding:40px 32px;text-align:center;"><h1 style="color:#ffe27c;font-size:26px;margin:0 0 8px;">תזכורת: שאלון מדעי ממתין 💛</h1><p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">כמעט סיימת!</p></div><div style="padding:40px 32px;"><p style="font-size:18px;color:#191265;margin:0 0 16px;">שלום ${s.firstName || ""},</p>${dnaLabel ? `<div style="background:#f0eadc;border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:center;"><p style="font-size:13px;color:#727272;margin:0 0 4px;">הפרופיל הזוגי שלך</p><p style="font-size:18px;font-weight:bold;color:#191265;margin:0;">${dnaLabel}</p></div>` : ""}<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">שלחתי לך מייל עם קישור לשאלון המדעי, אבל נראה שהוא לא הגיע. הנה הקישור שוב:</p><div style="text-align:center;margin:32px 0;"><a href="${questionnaireUrl}" style="display:inline-block;background:#ffe27c;color:#191265;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:12px;text-decoration:none;">למילוי השאלון המדעי</a></div><p style="font-size:13px;color:#888;margin:24px 0 0;">הקישור אישי ולשימוש חד-פעמי בלבד. אם יש בעיה, כתוב/י לי בוואטסאפ.</p><div style="text-align:center;margin:24px 0;"><a href="https://wa.me/972552442334" style="display:inline-block;background:#25D366;color:white;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;">וואטסאפ עם הילית</a></div><p style="font-size:15px;color:#191265;font-weight:bold;margin:24px 0 8px;">באהבה,<br>הילית כספי</p></div><div style="background:#191265;padding:20px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">קיבלת מייל זה כי נרשמת למאגר הרווקים של הילית כספי.</p></div></div></body></html>`,
            });
            sent++;
          } catch (err) {
            console.error(`[ResendQuestionnaire] Failed to send to ${s.email}:`, err);
            failed++;
          }
        }
        return { sent, failed, total: pending.length };
      }),

    /**
     * Get all singles with missing age or city (for admin data-fix UI).
     */
    getMissingData: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: singles.id,
        firstName: singles.firstName,
        lastName: singles.lastName,
        email: singles.email,
        phone: singles.phone,
        gender: singles.gender,
        age: singles.age,
        city: singles.city,
        height: singles.height,
        religiosity: singles.religiosity,
        education: singles.education,
        occupation: singles.occupation,
        about: singles.about,
        photoUrl: singles.photoUrl,
        maritalStatus: singles.maritalStatus,
        isActive: singles.isActive,
        isPaid: singles.isPaid,
        questionnaireCompletedAt: singles.questionnaireCompletedAt,
      })
        .from(singles)
        .where(
          and(
            eq(singles.isSeed, false),
            eq(singles.isActive, true),
            or(
              eq(singles.age, 0),
              isNull(singles.city),
              eq(singles.city, ""),
              isNull(singles.height),
              isNull(singles.religiosity),
              isNull(singles.education),
              isNull(singles.occupation),
              eq(singles.occupation, ""),
              isNull(singles.about),
              eq(singles.about, ""),
            )
          )
        )
        .orderBy(desc(singles.questionnaireCompletedAt));
      // Annotate each row with which fields are missing
      return rows.map(r => ({
        ...r,
        missingFields: [
          (!r.age || r.age === 0) ? "גיל" : null,
          (!r.city || r.city === "") ? "עיר" : null,
          (!r.height) ? "גובה" : null,
          (!r.religiosity) ? "זהות דתית" : null,
          (!r.education) ? "השכלה" : null,
          (!r.occupation || r.occupation === "") ? "עיסוק" : null,
          (!r.about || r.about === "") ? "אודות" : null,
          (!r.photoUrl) ? "תמונה" : null,
        ].filter(Boolean) as string[],
      }));
    }),

    /**
     * Patch age and/or city for a single (admin data-fix).
     */
    patchMissingData: protectedProcedure
      .input(z.object({
        id: z.number(),
        age: z.number().min(18).max(120).optional(),
        city: z.string().min(1).max(100).optional(),
        gender: z.enum(["male", "female"]).optional(),
        height: z.number().min(100).max(250).optional(),
        religiosity: z.enum(["secular", "traditional", "religious", "orthodox"]).optional(),
        education: z.enum(["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]).optional(),
        occupation: z.string().max(200).optional(),
        about: z.string().max(2000).optional(),
        maritalStatus: z.enum(["single", "divorced", "widowed"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const patch: Record<string, any> = { updatedAt: Date.now() };
        if (input.age !== undefined) patch.age = input.age;
        if (input.city !== undefined) patch.city = input.city;
        if (input.gender !== undefined) patch.gender = input.gender;
        if (input.height !== undefined) patch.height = input.height;
        if (input.religiosity !== undefined) patch.religiosity = input.religiosity;
        if (input.education !== undefined) patch.education = input.education;
        if (input.occupation !== undefined) patch.occupation = input.occupation;
        if (input.about !== undefined) patch.about = input.about;
        if (input.maritalStatus !== undefined) patch.maritalStatus = input.maritalStatus;
        await db.update(singles).set(patch).where(eq(singles.id, input.id));
        return { success: true };
      }),
  }),
  // ─── Email Preview & Test ───────────────────────────────────────────────────
  emails: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const journeyLabels: Record<JourneyKey, { label: string; gender: string; timing: string[] }> = {
        women_first_step: { label: "הצעד הראשון - נשים", gender: "נשים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        men_first_step:   { label: "הצעד הראשון - גברים", gender: "גברים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        women_guide:      { label: "מדריך לבחור נכון - נשים", gender: "נשים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        men_guide:        { label: "מדריך לבחור נכון - גברים", gender: "גברים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        women_matchmaking:{ label: "המאגר הבלעדי - נשים", gender: "נשים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        men_matchmaking:  { label: "המאגר הבלעדי - גברים", gender: "גברים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        women_transformation: { label: "מסע הטרנספורמציה - נשים", gender: "נשים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        men_transformation:   { label: "מסע הטרנספורמציה - גברים", gender: "גברים", timing: ["מיד", "אחרי 24 שעות", "אחרי 72 שעות"] },
        // Abandoned cart sequences
        abandoned_guide:      { label: "נטישת עגלה - מדריך", gender: "כלל", timing: ["אחרי 1 שעה", "אחרי 24 שעות", "אחרי 48 שעות"] },
        abandoned_database:   { label: "נטישת עגלה - מאגר", gender: "כלל", timing: ["אחרי 1 שעה", "אחרי 24 שעות", "אחרי 48 שעות"] },
        abandoned_course:     { label: "נטישת עגלה - קורס", gender: "כלל", timing: ["אחרי 1 שעה", "אחרי 24 שעות", "אחרי 48 שעות"] },
        abandoned_coaching:   { label: "נטישת עגלה - ליווי", gender: "כלל", timing: ["אחרי 1 שעה", "אחרי 24 שעות", "אחרי 48 שעות"] },
        // Course purchase sequences
        women_course:         { label: "קורס - נשים", gender: "נשים", timing: ["מיד", "אחרי 72 שעות", "אחרי 7 ימים"] },
        men_course:           { label: "קורס - גברים", gender: "גברים", timing: ["מיד", "אחרי 72 שעות", "אחרי 7 ימים"] },
        // Meta / free guide journeys
        free_guide_nurture:   { label: "מדריך חינמי - חימום", gender: "כלל", timing: ["מיד", "אחרי 3 ימים", "אחרי 7 ימים"] },
        sales_call_lead:      { label: "שיחת היכרות - ליד", gender: "כלל", timing: ["מיד", "אחרי 2 ימים", "אחרי 5 ימים"] },
        meta_lead_dna:        { label: "Meta ליד - שאלון DNA", gender: "כלל", timing: ["מיד", "אחרי 3 ימים", "אחרי 7 ימים"] },
        women_first_step_v2:  { label: "מסע מאגר V2 - נשים", gender: "נשים", timing: ["מיד", "יום 1", "יום 4", "יום 7", "יום 10", "יום 14"] },
        men_first_step_v2:    { label: "מסע מאגר V2 - גברים", gender: "גברים", timing: ["מיד", "יום 1", "יום 4", "יום 7", "יום 10", "יום 14"] },
        // Matchmaking welcome sequences
        women_matchmaking_welcome: { label: "ברוך הבא למאגר - נשים", gender: "נשים", timing: ["מיד", "יום 3", "יום 7", "יום 14"] },
        men_matchmaking_welcome:   { label: "ברוך הבא למאגר - גברים", gender: "גברים", timing: ["מיד", "יום 3", "יום 7", "יום 14"] },
        // English US market
        en_free_guide_nurture:     { label: "EN - Free Guide Nurture (US)", gender: "EN", timing: ["Immediate", "Day 3", "Day 7"] },
      };
      return Object.entries(EMAIL_SEQUENCES).map(([key, emails]) => {
        const meta = journeyLabels[key as JourneyKey];
        return {
          key,
          label: meta.label,
          gender: meta.gender,
          emails: emails.map((email, i) => ({
            index: i,
            subject: email.subject,
            htmlBody: renderTemplate(email, { firstName: "[שם]" }).htmlBody,
            textBody: renderTemplate(email, { firstName: "[שם]" }).textBody,
            timing: meta.timing[i],
          })),
        };
      });
    }),

    sendTest: protectedProcedure
      .input(z.object({
        journeyKey: z.string(),
        emailIndex: z.number().min(0).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const sequence = EMAIL_SEQUENCES[input.journeyKey as JourneyKey];
        if (!sequence) throw new TRPCError({ code: "NOT_FOUND", message: "Journey not found" });
        const template = sequence[input.emailIndex];
        const rendered = renderTemplate(template, { firstName: "הילית" });
        await sendEmail({
          to: { email: "hilitcaspi@gmail.com", name: "הילית כספי" },
          subject: `[בדיקה] ${rendered.subject}`,
          htmlContent: rendered.htmlBody,
          textContent: rendered.textBody,
        });
        return { success: true };
      }),

    sendTestWhatsApp: protectedProcedure
      .input(z.object({ phone: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const phone = input.phone || "0552442334";
        const ok = await sendWhatsApp(phone, "בדיקת מערכת וואטסאפ מהילית כספי - הכל עובד! 💛");
        return { success: ok, phone };
      }),

    sendTestFollowUp: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const emailTemplate = buildMatchFollowUpEmail({
          firstName: "הילית",
          matchFirstName: "דניאל",
          matchAge: 38,
          matchCity: "תל אביב",
          yesUrl: "https://hilitcaspi.com/match/respond?token=test&response=yes",
          noUrl: "https://hilitcaspi.com/match/respond?token=test&response=no",
          feedbackUrl: "https://hilitcaspi.com/match/respond?token=test&response=no",
          recipientEmail: "hilitcaspi@gmail.com",
          singleId: 0,
        });
        await sendEmail({
          to: { email: "hilitcaspi@gmail.com", name: "הילית כספי" },
          subject: `[בדיקה] ${emailTemplate.subject}`,
          htmlContent: emailTemplate.htmlBody,
          textContent: emailTemplate.textBody,
        });
        return { success: true };
      }),
  }),

  // ── Unsubscribe ────────────────────────────────────────────────────────────
  unsubscribe: router({
    /**
     * Unsubscribe a lead from all email communications.
     * Token = base64(leadId:email)
     */
    process: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        let leadId: number;
        let email: string;
        try {
          const decoded = Buffer.from(input.token, "base64").toString("utf-8");
          const [idStr, ...emailParts] = decoded.split(":");
          leadId = parseInt(idStr);
          email = emailParts.join(":");
          if (!leadId || !email) throw new Error("invalid");
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "טוקן לא תקין" });
        }

        await db.update(crmLeads)
          .set({
            emailUnsubscribed: true,
            emailUnsubscribedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(and(eq(crmLeads.id, leadId), eq(crmLeads.email, email)));

        return { success: true, email };
      }),
  }),
  // ── Product Access (guide + course interactive pages) ──────────────────────
  access: router({
    /**
     * Validate a product access token.
     * Returns product type and user name if valid.
     * Locks token to the first device fingerprint that accesses it.
     */
    validate: publicProcedure
      .input(z.object({
        token: z.string(),
        deviceFingerprint: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [row] = await db.select()
          .from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token))
          .limit(1);

        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "קישור גישה לא נמצא" });
        if (row.expiresAt < Date.now()) throw new TRPCError({ code: "FORBIDDEN", message: "קישור הגישה פג תוקף" });

        // Track access stats (device fingerprint stored for info only, not for blocking)
        const fingerprint = input.deviceFingerprint || null;
        await db.update(productAccessTokens)
          .set({
            // Only set fingerprint on first access (informational only)
            ...((!row.deviceFingerprint && fingerprint) ? { deviceFingerprint: fingerprint } : {}),
            lastAccessAt: Date.now(),
            accessCount: (row.accessCount ?? 0) + 1,
          })
          .where(eq(productAccessTokens.token, input.token));

        return {
          valid: true,
          product: row.product,
          name: row.name ?? "",
          email: row.email,
        };
      }),

    /**
     * Admin: reset device fingerprint so a token can be used on a new device.
     */
    resetDevice: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(productAccessTokens)
          .set({ deviceFingerprint: null })
          .where(eq(productAccessTokens.token, input.token));
        return { success: true };
      }),

    /**
     * Get course/guide progress for a token.
     */
    getProgress: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Validate token first
        const [accessRow] = await db.select()
          .from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token))
          .limit(1);
        if (!accessRow) throw new TRPCError({ code: "NOT_FOUND" });

        const [progress] = await db.select()
          .from(courseProgress)
          .where(eq(courseProgress.token, input.token))
          .limit(1);

        if (!progress) {
          return {
            completedChapters: [] as number[],
            exerciseAnswers: {} as Record<string, string>,
            lastChapterId: 1,
            userName: null as string | null,
            userGender: null as string | null,
            userBirthdate: null as string | null,
            analysisResult: null as string | null,
          };
        }

        return {
          completedChapters: JSON.parse(progress.completedChapters || "[]") as number[],
          exerciseAnswers: JSON.parse(progress.exerciseAnswers || "{}") as Record<string, string>,
          lastChapterId: progress.lastChapterId,
          userName: progress.userName ?? null,
          userGender: progress.userGender ?? null,
          userBirthdate: progress.userBirthdate ?? null,
          analysisResult: progress.analysisResult ?? null,
        };
      }),

    /**
     * Save progress for a course/guide chapter.
     */
    saveProgress: publicProcedure
      .input(z.object({
        token: z.string(),
        chapterId: z.number(),
        completed: z.boolean(),
        exerciseAnswers: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Validate token
        const [accessRow] = await db.select()
          .from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token))
          .limit(1);
        if (!accessRow) throw new TRPCError({ code: "NOT_FOUND" });

        const now = Date.now();
        const [existing] = await db.select()
          .from(courseProgress)
          .where(eq(courseProgress.token, input.token))
          .limit(1);

        if (!existing) {
          // Create new progress record
          const completedChapters = input.completed ? [input.chapterId] : [];
          await db.insert(courseProgress).values({
            token: input.token,
            product: accessRow.product,
            completedChapters: JSON.stringify(completedChapters),
            exerciseAnswers: JSON.stringify(input.exerciseAnswers ?? {}),
            lastChapterId: input.chapterId,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update existing progress
          const completed = JSON.parse(existing.completedChapters || "[]") as number[];
          if (input.completed && !completed.includes(input.chapterId)) {
            completed.push(input.chapterId);
          } else if (!input.completed) {
            const idx = completed.indexOf(input.chapterId);
            if (idx > -1) completed.splice(idx, 1);
          }
          const mergedAnswers = {
            ...JSON.parse(existing.exerciseAnswers || "{}"),
            ...(input.exerciseAnswers ?? {}),
          };
          await db.update(courseProgress)
            .set({
              completedChapters: JSON.stringify(completed),
              exerciseAnswers: JSON.stringify(mergedAnswers),
              lastChapterId: input.chapterId,
              updatedAt: now,
            })
            .where(eq(courseProgress.token, input.token));
        }

        return { success: true };
      }),

    /**
     * Admin: generate a product access token for a buyer.
     */
    generate: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        product: z.enum(["guide_149", "course_249"]),
        paymentRef: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
        const now = Date.now();

        await db.insert(productAccessTokens).values({
          token,
          email: input.email,
          name: input.name,
          product: input.product,
          paymentRef: input.paymentRef,
          expiresAt,
          accessCount: 0,
          createdAt: now,
        });

        const baseUrl = "https://hilitcaspi.com";
        const path = input.product === "guide_149" ? "/guide/view" : "/course/view";
        return { token, link: `${baseUrl}${path}?token=${token}` };
      }),

    /**
     * Look up a product access token by email.
     * Used on thank-you pages when sessionStorage token is missing (e.g. user opened on different device).
     * Returns the most recent valid token for the given product.
     */
    getByEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        product: z.enum(["guide_149", "course_249"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select()
          .from(productAccessTokens)
          .where(and(
            eq(productAccessTokens.email, input.email.toLowerCase()),
            eq(productAccessTokens.product, input.product),
          ))
          .limit(5);
        // Return the most recent valid (non-expired) token
        const valid = rows.filter(r => r.expiresAt > Date.now()).pop();
        if (!valid) return { found: false, token: null };
        return { found: true, token: valid.token };
      }),
    /**
     * Save user profile at guide start (name, gender, birthdate).
     */
    saveProfile: publicProcedure
      .input(z.object({
        token: z.string(),
        userName: z.string().min(1).max(100),
        userGender: z.enum(["female", "male", "other"]),
        userBirthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [accessRow] = await db.select()
          .from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token))
          .limit(1);
        if (!accessRow) throw new TRPCError({ code: "NOT_FOUND" });
        const now = Date.now();
        const [existing] = await db.select()
          .from(courseProgress)
          .where(eq(courseProgress.token, input.token))
          .limit(1);
        if (!existing) {
          await db.insert(courseProgress).values({
            token: input.token,
            product: accessRow.product,
            completedChapters: "[]",
            exerciseAnswers: "{}",
            lastChapterId: 1,
            userName: input.userName,
            userGender: input.userGender,
            userBirthdate: input.userBirthdate,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          await db.update(courseProgress)
            .set({
              userName: input.userName,
              userGender: input.userGender,
              userBirthdate: input.userBirthdate,
              updatedAt: now,
            })
            .where(eq(courseProgress.token, input.token));
        }
        return { success: true };
      }),
    /**
     * Generate a personalized AI analysis after completing all guide chapters.
     * Reads all exercise answers + user profile, calls LLM, saves result, sends email.
     */
    generateAnalysis: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [accessRow] = await db.select()
          .from(productAccessTokens)
          .where(eq(productAccessTokens.token, input.token))
          .limit(1);
        if (!accessRow) throw new TRPCError({ code: "NOT_FOUND" });
        const [progress] = await db.select()
          .from(courseProgress)
          .where(eq(courseProgress.token, input.token))
          .limit(1);
        if (!progress) throw new TRPCError({ code: "NOT_FOUND", message: "No progress found" });
        // If already generated, return cached
        if (progress.analysisResult) {
          return { analysis: progress.analysisResult };
        }
        const answers = JSON.parse(progress.exerciseAnswers || "{}") as Record<string, string>;
        const userName = progress.userName || accessRow.name || "משתתף/ת";
        const userGender = progress.userGender || "other";
        const userBirthdate = progress.userBirthdate;
        // Calculate zodiac sign if birthdate provided
        let zodiacInfo = "";
        if (userBirthdate) {
          const [, monthStr, dayStr] = userBirthdate.split("-");
          const month = parseInt(monthStr, 10);
          const day = parseInt(dayStr, 10);
          const zodiacSigns = [
            { sign: "גדי", start: [12, 22], end: [1, 19] },
            { sign: "דלי", start: [1, 20], end: [2, 18] },
            { sign: "דגים", start: [2, 19], end: [3, 20] },
            { sign: "טלה", start: [3, 21], end: [4, 19] },
            { sign: "שור", start: [4, 20], end: [5, 20] },
            { sign: "תאומים", start: [5, 21], end: [6, 20] },
            { sign: "סרטן", start: [6, 21], end: [7, 22] },
            { sign: "אריה", start: [7, 23], end: [8, 22] },
            { sign: "בתולה", start: [8, 23], end: [9, 22] },
            { sign: "מאזניים", start: [9, 23], end: [10, 22] },
            { sign: "עקרב", start: [10, 23], end: [11, 21] },
            { sign: "קשת", start: [11, 22], end: [12, 21] },
          ];
          for (const z of zodiacSigns) {
            const [sm, sd] = z.start;
            const [em, ed] = z.end;
            const afterStart = month > sm || (month === sm && day >= sd);
            const beforeEnd = month < em || (month === em && day <= ed);
            if ((sm <= em && afterStart && beforeEnd) || (sm > em && (afterStart || beforeEnd))) {
              zodiacInfo = `מזל: ${z.sign}`;
              break;
            }
          }
        }
        const QUESTIONS: Record<string, string> = {
          ch1_q1: "5 הקריטריונים הכי חשובים שלך לפרטנר",
          ch1_q2: "הצורך האמיתי מאחורי כל קריטריון",
          ch2_q1: "קשר עבר שהיה טוב - מה היה בו",
          ch2_q2: "קשר שעזבת כי האש כבתה - בדיעבד, האם היה נכון?",
          ch2_q3: "ה'ניצוץ' שאת/ה מחפש/ת - תיאור מפורט",
          ch3_q1: "דפוס שאני מזהה בקשרים שלי",
          ch3_q2: "סגנון התקשרות הכי קרוב אלי ומה בסיפור שלי מסביר אותו",
          ch3_q3: "הפחד הכי גדול שלי בקשר",
          ch4_q1: "שלושת הערכים הכי חשובים לי בחיים",
          ch4_q2: "מה קורה אצלי כשיש קונפליקט בקשר",
          ch5_q1: "התובנה הכי גדולה מהמדריך",
          ch5_q2: "שינוי אחד קטן שאעשה השבוע",
          ch5_q3: "הודעה לעצמי לפני 5 שנים על זוגיות",
        };
        const genderPronoun = userGender === "female" ? "את" : userGender === "male" ? "אתה" : "את/ה";
        const genderPossessive = userGender === "female" ? "שלך" : userGender === "male" ? "שלך" : "שלך";
        const answersText = Object.entries(QUESTIONS)
          .map(([key, question]) => {
            const answer = answers[key];
            if (!answer || answer.trim() === "") return null;
            return `שאלה: ${question}\nתשובה: ${answer.trim()}`;
          })
          .filter(Boolean)
          .join("\n\n");
        const { invokeLLM } = await import("./_core/llm");
        const systemPrompt = `את הילית כספי, מומחית לזוגיות ושדכנית עם ניסיון של שנים רבות. ${
          userGender === "female" ? `עכשיו כתבי ניתוח אישי עמוק ל${userName}, אישה שסיימה את המדריך "לבחור נכון".` :
          userGender === "male" ? `עכשיו כתבי ניתוח אישי עמוק ל${userName}, גבר שסיים את המדריך "לבחור נכון".` :
          `עכשיו כתבי ניתוח אישי עמוק ל${userName}, שסיים/ה את המדריך "לבחור נכון".`
        }

כללים קריטיים:
- כתבי בעברית חמה, אישית, ישירה. לא רשמית ולא קלינית.
- פני ישירות ל${userName} בגוף שני ${genderPronoun === "את" ? "נקבה" : genderPronoun === "אתה" ? "זכר" : "נייטרלי"}
- אסור להשתמש במקף ארוך (,) בשום מקום
- אסור לכתוב "ראיתי", "האלגוריתם", "ציון", "אחוז"
- אסור לבטיח שימצאו זוגיות או שהשיטה מבטיחה תוצאות
- כתבי רק על בסיס מה שהם כתבו, לא הנחות כלליות
- הניתוח צריך להרגיש כמו מכתב אישי ממני, לא דוח

מבנה הניתוח (כתבי בדיוק לפי המבנה הזה, עם כותרות):

## מה שראיתי בך, ${userName}

פסקה אחת חמה ואישית שמסכמת את הדפוס המרכזי שעולה מכל התשובות. מה הנושא שחוזר? מה הסיפור שמתחת לסיפור?

## הכוחות שלך

2-3 כוחות ספציפיים שעולים מהתשובות. לא מחמאות כלליות, אלא דברים ספציפיים שראיתי בתשובות שלהם.

## הדפוס שכדאי לשים לב אליו

דפוס אחד מרכזי שחוזר בתשובות (בקשרים, בבחירות, בפחדים). כתבי בחמלה ובלי שיפוטיות. הסבירי למה הדפוס הזה הגיוני בהתחשב במה שכתבו.

## מה אני ממליצה לך לקחת מכאן

2-3 המלצות ספציפיות ומעשיות שנובעות ישירות מהתשובות שלהם. לא עצות כלליות.

## הצעד הבא

פסקה קצרה שמסיימת בחמימות ומזמינה לפגישה אישית אם הם רוצים להמשיך את העבודה הזו בצורה מעמיקה יותר. ציינו שבפגישה נוכל להשתמש בתשובות שכתבו כנקודת פתיחה. לינק לפגישה: https://hilitcaspi.com/single-session`;

        const userMessage = `שם: ${userName}
${zodiacInfo ? zodiacInfo + "\n" : ""}${userGender !== "other" ? `מגדר: ${userGender === "female" ? "אישה" : "גבר"}\n` : ""}

תשובות המדריך:

${answersText}

כתבי ניתוח אישי מלא לפי המבנה שביקשתי.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });
        const analysisText = response?.choices?.[0]?.message?.content;
        if (!analysisText || typeof analysisText !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate analysis" });
        }
        const now = Date.now();
        await db.update(courseProgress)
          .set({ analysisResult: analysisText, analysisGeneratedAt: now, updatedAt: now })
          .where(eq(courseProgress.token, input.token));
        // Send analysis email
        const email = accessRow.email;
        if (email) {
          const htmlBody = `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #191265;">
  <div style="background: #191265; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: #ffe27c; margin: 0; font-size: 22px;">הניתוח האישי שלך</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">לבחור נכון - המדריך המעשי לזוגיות</p>
  </div>
  <div style="background: #f0eadc; padding: 32px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 24px;">שלום ${userName},</p>
    <p style="font-size: 15px; color: #444; margin-bottom: 24px;">סיימת את המדריך. הנה הניתוח האישי שלי עבורך, על בסיס כל מה שכתבת:</p>
    <div style="background: white; border-radius: 12px; padding: 24px; line-height: 1.8; font-size: 15px; white-space: pre-wrap;">
${analysisText.replace(/## /g, '<h3 style="color: #191265; margin-top: 20px;">').replace(/\n/g, '<br>')}
    </div>
    <div style="margin-top: 32px; text-align: center;">
      <a href="https://hilitcaspi.com/single-session" style="background: #ffe27c; color: #191265; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 16px; display: inline-block;">
        פגישה אישית עם הילית, 500 שח
      </a>
    </div>
    <p style="font-size: 12px; color: #999; margin-top: 24px; text-align: center;">
      לביטול הרשמה לרשימת התפוצה: <a href="mailto:hilitcaspi@gmail.com?subject=הסרה מרשימת תפוצה" style="color: #999;">לחצו כאן</a>
    </p>
  </div>
</div>`;
          await sendEmail({
            to: { email, name: userName },
            subject: `הניתוח האישי שלך, ${userName} - לבחור נכון`,
            htmlContent: htmlBody,
          });
        }
        return { analysis: analysisText };
      }),
  }),
  // ── Matchmaking Questionnaire ────────────────────────────────────────────────
  matchmaking: router({
    /**
     * Save OkCupid-style compatibility answers for a registered single.
     * Called after completing the questionnaire step in /join flow.
     */
    saveAnswers: publicProcedure
      .input(z.object({
        singleId: z.number(),
        answers: z.array(z.object({
          qId: z.string(),
          myAnswer: z.union([z.number(), z.array(z.number())]),
          importance: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const now = Date.now();
        // Upsert: delete old answers and insert new
        await db.delete(matchmakingAnswers).where(eq(matchmakingAnswers.singleId, input.singleId));
        await db.insert(matchmakingAnswers).values({
          singleId: input.singleId,
          answersJson: JSON.stringify(input.answers),
          completedAt: now,
          updatedAt: now,
        });
        return { success: true };
      }),

    /**
     * Get answers for a single (admin use).
     */
    getAnswers: protectedProcedure
      .input(z.object({ singleId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return null;
        const [row] = await db.select().from(matchmakingAnswers)
          .where(eq(matchmakingAnswers.singleId, input.singleId)).limit(1);
        if (!row) return null;
        return {
          ...row,
          answers: JSON.parse(row.answersJson) as MatchAnswer[],
        };
      }),

    /**
     * Run compatibility algorithm for all active singles.
     * Returns top matches per person (admin only).
     * Threshold: 90% first, fallback to 80% if no matches found.
     */
    runMatching: protectedProcedure
      .input(z.object({
        threshold: z.number().min(30).max(100).default(60),
        fallbackThreshold: z.number().min(20).max(100).default(45),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const threshold = input?.threshold ?? 60;
        const fallbackThreshold = input?.fallbackThreshold ?? 45;

        // Run matching in background to avoid 504 Gateway Timeout
        // The process takes 3-5 minutes for 130+ singles
        const runInBackground = async () => {
          try {
            console.log("[RunMatching] Background task started...");
            const bgDb = await getDb();
            if (!bgDb) return;

            const allSingles = await bgDb.select().from(singles)
              .where(eq(singles.isActive, true));
            const allAnswerRows = await bgDb.select().from(matchmakingAnswers);
            const answersMap = new Map(
              allAnswerRows.map(r => [r.singleId, JSON.parse(r.answersJson) as MatchAnswer[]])
            );
            const pool = allSingles.map(s => ({
              ...s,
              seekingGender: s.seekingGender ?? (s.gender === "female" ? "male" : "female"),
              answers: answersMap.get(s.id) ?? [],
            }));

            const newMatches: Array<{ singleAId: number; singleBId: number; score: number; scoreBreakdown?: string; autoExplanation?: string }> = [];
            const seen = new Set<string>();

            for (const person of pool) {
              let results = await findMatchesWithText(
                person.id, person.answers, person.dnaType,
                person.gender, person.seekingGender,
                person.about, person.partnerDescription,
                pool, threshold
              );
              if (results.length === 0) {
                results = await findMatchesWithText(
                  person.id, person.answers, person.dnaType,
                  person.gender, person.seekingGender,
                  person.about, person.partnerDescription,
                  pool, fallbackThreshold
                );
              }
              for (const { memberId, score } of results) {
                const key = [Math.min(person.id, memberId), Math.max(person.id, memberId)].join("-");
                if (seen.has(key)) continue;
                seen.add(key);
                const candidateInPool = pool.find(s => s.id === memberId);
                let scoreBreakdown: string | undefined;
                let autoExplanation: string | undefined;
                if (candidateInPool) {
                  const bd = computeFullScore(
                    person, candidateInPool,
                    person.answers ?? [],
                    candidateInPool.answers ?? []
                  );
                  scoreBreakdown = JSON.stringify(bd);
                  autoExplanation = await buildMatchExplanation(person, candidateInPool, bd);
                }
                newMatches.push({ singleAId: person.id, singleBId: memberId, score, scoreBreakdown, autoExplanation });
              }
            }

            let inserted = 0;
            for (const m of newMatches) {
              const [existing] = await bgDb.select().from(matches).where(
                or(
                  and(eq(matches.singleAId, m.singleAId), eq(matches.singleBId, m.singleBId)),
                  and(eq(matches.singleAId, m.singleBId), eq(matches.singleBId, m.singleAId))
                )
              ).limit(1);
              // Never re-propose a rejected pair — if it exists in any status (including rejected), skip it
              if (existing) continue;

              const now = Date.now();
              await bgDb.insert(matches).values({
                singleAId: m.singleAId,
                singleBId: m.singleBId,
                score: m.score,
                scoreBreakdown: m.scoreBreakdown,
                autoExplanation: m.autoExplanation,
                proposedAt: now,
                status: "pending",
                updatedAt: now,
              });
              inserted++;
            }
            console.log(`[RunMatching] Background complete: ${newMatches.length} found, ${inserted} newly inserted`);
          } catch (err) {
            console.error("[RunMatching] Background error:", err);
          }
        };

        // Fire and forget, return immediately
        runInBackground();

        return { totalFound: 0, newlyInserted: 0, status: "started", message: "ההתאמות רצות ברקע. תוצאות יופיעו תוך מספר דקות." };
      }),

    /**
     * Run the matching algorithm for a single specific person.
     * Useful when a person has fewer than 3 matches and you want to top them up.
     */
    runMatchingForSingle: protectedProcedure
      .input(z.object({ singleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [single] = await db.select().from(singles).where(eq(singles.id, input.singleId)).limit(1);
        if (!single) throw new TRPCError({ code: "NOT_FOUND", message: "רווק לא נמצא" });
        await generateMatchesForSingle(single.id, single.gender);
        return { success: true };
      }),

    /**
     * Refresh scoreBreakdown for existing matches that have hasAnswers=false.
     * Run this after singles complete the scientific questionnaire.
     */
    refreshMatchScores: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Load all active singles with their questionnaire answers
      const allSingles = await db.select().from(singles).where(eq(singles.isActive, true));
      const allAnswerRows = await db.select().from(matchmakingAnswers);
      const answersMap = new Map(
        allAnswerRows.map(r => [r.singleId, JSON.parse(r.answersJson) as MatchAnswer[]])
      );
      const singlesMap = new Map(allSingles.map(s => [s.id, { ...s, answers: answersMap.get(s.id) ?? [] }]));

      // Get all matches with scoreBreakdown
      const allMatches = await db.select().from(matches).where(isNotNull(matches.scoreBreakdown));

      let updated = 0;
      for (const m of allMatches) {
        try {
          const bd = JSON.parse(m.scoreBreakdown!);
          // Only refresh if hasAnswers is false
          if (bd.hasAnswers) continue;

          const sA = singlesMap.get(m.singleAId);
          const sB = singlesMap.get(m.singleBId);
          if (!sA || !sB) continue;

          // Recompute with latest answers
          const newBd = computeFullScore(sA as any, sB as any, sA.answers, sB.answers);
          const newExplanation = await buildMatchExplanation(sA, sB, newBd);

          await db.update(matches)
            .set({
              score: newBd.total,
              scoreBreakdown: JSON.stringify(newBd),
              autoExplanation: newExplanation,
              updatedAt: Date.now(),
            })
            .where(eq(matches.id, m.id));
          updated++;
        } catch {
          // skip malformed breakdown
        }
      }

      return { updated };
    }),

    /**
     * Get all pending matches awaiting Hilit's approval.
     */
    getPendingMatches: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const pendingMatches = await db.select().from(matches)
        .where(eq(matches.status, "pending"))
        .orderBy(desc(matches.score ?? 0));

      return Promise.all(pendingMatches.map(async (m) => {
        const [singleA] = await db.select().from(singles).where(eq(singles.id, m.singleAId)).limit(1);
        const [singleB] = await db.select().from(singles).where(eq(singles.id, m.singleBId)).limit(1);
        return { match: m, singleA: singleA ?? null, singleB: singleB ?? null };
      }));
    }),

    /**
     * Approve a match and send proposal emails to both parties.
     * Hilit reviews and clicks "approve" - emails go out automatically.
     */
    approveMatch: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        hilitsNote: z.string().optional(), // Personal note from Hilit about why she believes in this match
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        if (match.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Match is not pending" });

        const [singleA] = await db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1);
        const [singleB] = await db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1);
        if (!singleA || !singleB) throw new TRPCError({ code: "NOT_FOUND" });

        // ⚠️ Check if either single already has an active proposed match
        const activeMatchA = await db.select({ id: matches.id }).from(matches).where(
          and(
            or(eq(matches.singleAId, match.singleAId), eq(matches.singleBId, match.singleAId)),
            eq(matches.status, "proposed"),
            ne(matches.id, input.matchId)
          )
        ).limit(1);
        const activeMatchB = await db.select({ id: matches.id }).from(matches).where(
          and(
            or(eq(matches.singleAId, match.singleBId), eq(matches.singleBId, match.singleBId)),
            eq(matches.status, "proposed"),
            ne(matches.id, input.matchId)
          )
        ).limit(1);
        const activeWarnings: string[] = [];
        if (activeMatchA.length > 0) activeWarnings.push(`${singleA.firstName} כבר בהתאמה פעילה`);
        if (activeMatchB.length > 0) activeWarnings.push(`${singleB.firstName} כבר בהתאמה פעילה`);
        if (activeWarnings.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `⚠️ שים לב: ${activeWarnings.join(" ו-")}. לא ניתן לשלוח התאמה נוספת בזמן שהתאמה אחרת ממתינה לתשובה.`
          });
        }

        // Generate approval tokens for both singles
        const tokenA = crypto.randomBytes(24).toString("hex");
        const tokenB = crypto.randomBytes(24).toString("hex");
        const expiresAt = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
        const now = Date.now();

        await db.update(matches).set({
          status: "proposed",
          approvalTokenA: tokenA,
          approvalTokenB: tokenB,
          approvalExpiresAt: expiresAt,
          proposedAt: now,
          ownerApprovedAt: now,
          updatedAt: now,
        }).where(eq(matches.id, input.matchId));

        const score = match.score ?? 0;
        const baseUrl = "https://hilitcaspi.com";

        // Build Hilit's personal note based on DNA compatibility + profile details
        const dnaLabels = DNA_HEBREW_LABELS;
        const dnaA = singleA.dnaType ? dnaLabels[singleA.dnaType] || singleA.dnaType : null;
        const dnaB = singleB.dnaType ? dnaLabels[singleB.dnaType] || singleB.dnaType : null;
        const defaultNote = input.hilitsNote ||
          `בחרתי לחבר ביניכם כי ראיתי ${score >= 80 ? "התאמה גבוהה מאוד" : score >= 60 ? "התאמה טובה" : "פוטנציאל אמיתי"} בכמה רמות${dnaA && dnaB ? `. ${singleA.firstName} הוא ${dnaA} ו-${singleB.firstName} הוא ${dnaB}, ושני הסוגים האלה משלימים אחד את השני בצורה יוצאת דופן` : ""}. ${singleA.city === singleB.city ? `שניכם מ${singleA.city}, מה שמקל על מפגש ראשון. ` : ""}אני מאמינה שיש כאן בסיס לקשר אמיתי. תנו לזה צ'אנס.`;

        // Send proposal emails to both singles
        const emailA = buildMatchProposalEmailTemplate({
          firstName: singleA.firstName,
          recipientGender: (singleA.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleB.firstName,
          matchAge: singleB.age ?? 0,
          matchCity: singleB.city ?? "",
          matchOccupation: singleB.occupation ?? undefined,
          matchDnaType: singleB.dnaType ?? undefined,
          matchPhotoUrl: singleB.photoUrl ? (singleB.photoUrl.startsWith("http") ? singleB.photoUrl : `https://hilitcaspi.com${singleB.photoUrl}`) : undefined,
          matchEducation: singleB.education ?? undefined,
          matchHasKids: singleB.hasKids ?? undefined,
          matchNumKids: singleB.numKids ?? undefined,
          matchWantsKids: singleB.wantsKids ?? undefined,
          matchReligiosity: singleB.religiosity ?? undefined,
          compatibilityScore: score,
          hilitsNote: defaultNote,
          yesUrl: `${baseUrl}/match/respond?token=${tokenA}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenA}&response=no`,
          recipientEmail: singleA.email!,
          singleId: singleA.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenA}&side=a`,
        });
        const emailB = buildMatchProposalEmailTemplate({
          firstName: singleB.firstName,
          recipientGender: (singleB.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleA.firstName,
          matchAge: singleA.age ?? 0,
          matchCity: singleA.city ?? "",
          matchOccupation: singleA.occupation ?? undefined,
          matchDnaType: singleA.dnaType ?? undefined,
          matchPhotoUrl: singleA.photoUrl ? (singleA.photoUrl.startsWith("http") ? singleA.photoUrl : `https://hilitcaspi.com${singleA.photoUrl}`) : undefined,
          matchEducation: singleA.education ?? undefined,
          matchHasKids: singleA.hasKids ?? undefined,
          matchNumKids: singleA.numKids ?? undefined,
          matchWantsKids: singleA.wantsKids ?? undefined,
          matchReligiosity: singleA.religiosity ?? undefined,
          compatibilityScore: score,
          hilitsNote: defaultNote,
          yesUrl: `${baseUrl}/match/respond?token=${tokenB}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenB}&response=no`,
          recipientEmail: singleB.email!,
          singleId: singleB.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenB}&side=b`,
        });

        await Promise.all([
          sendEmail({ to: { email: singleA.email!, name: singleA.firstName }, subject: emailA.subject, htmlContent: emailA.htmlBody }),
          sendEmail({ to: { email: singleB.email!, name: singleB.firstName }, subject: emailB.subject, htmlContent: emailB.htmlBody }),
        ]);

        await notifyOwner({ title: "✅ התאמה נשלחה!", content: `ההצעה ל-${singleA.firstName} ו-${singleB.firstName} נשלחה. ממתינים לתגובה תוך 48 שעות.` });

        // Send WhatsApp notifications to both singles
        const matchWaMsg = (firstName: string, matchName: string) =>
          `היי ${firstName}! 💛\nשלחתי לך עכשיו מייל עם התאמה מיוחדת שבחרתי עבורך, ${matchName} מחכה לתשובתך!\nכדאי לבדוק את תיבת המייל (גם ספאם) וללחוץ על הקישור.\nהילית 💛`;
        const waNow2 = Date.now();
        await db.update(matches).set({ waSentAt: waNow2 }).where(eq(matches.id, input.matchId));
        if (singleA.phone) {
          sendWhatsApp(singleA.phone, matchWaMsg(singleA.firstName, singleB.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleA:", err)
          );
        }
        if (singleB.phone) {
          sendWhatsApp(singleB.phone, matchWaMsg(singleB.firstName, singleA.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleB:", err)
          );
        }

        return { success: true, sentTo: [singleA.email, singleB.email] };
      }),

    /**
     * Owner clicks approve/reject in email. If approve → sends proposal emails to both singles.
     */
    ownerApproveMatch: publicProcedure
      .input(z.object({
        token: z.string(),
        action: z.enum(["approve", "reject"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [match] = await db.select().from(matches).where(eq(matches.ownerApprovalToken, input.token)).limit(1);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "קישור לא תקין" });
        if (input.action === "reject") {
          await db.update(matches).set({ status: "rejected", updatedAt: Date.now() }).where(eq(matches.id, match.id));
          return { success: true, action: "rejected" };
        }
        // action === "approve" → generate tokens and send to both singles
        const [singleA] = await db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1);
        const [singleB] = await db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1);
        if (!singleA || !singleB) throw new TRPCError({ code: "NOT_FOUND" });
        const tokenA = crypto.randomBytes(24).toString("hex");
        const tokenB = crypto.randomBytes(24).toString("hex");
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        await db.update(matches).set({
          status: "proposed",
          approvalTokenA: tokenA,
          approvalTokenB: tokenB,
          approvalExpiresAt: expiresAt,
          proposedAt: now,
          ownerApprovedAt: now,
          updatedAt: now,
        }).where(eq(matches.id, match.id));
        const score = match.score ?? 0;
        const baseUrl = "https://hilitcaspi.com";
        const matchReason = `על בסיס ${score}% התאמה, שניכם חולקים ערכים דומים בתחום הזוגיות, אורח החיים והתקשורת. זה בדיוק הסוג של חיבור שמוביל לזוגיות אמיתית. במידה ושניכם תאשרו: יחשפו הפרטים. אם לא: צפו להתאמה הבאה 💛`;
        const emailA = buildMatchProposalEmailTemplate({
          firstName: singleA.firstName,
          recipientGender: (singleA.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleB.firstName,
          matchAge: singleB.age ?? 0,
          matchCity: singleB.city ?? "",
          matchOccupation: singleB.occupation ?? undefined,
          matchDnaType: singleB.dnaType ?? undefined,
          matchPhotoUrl: singleB.photoUrl ? (singleB.photoUrl.startsWith("http") ? singleB.photoUrl : `https://hilitcaspi.com${singleB.photoUrl}`) : undefined,
          matchHasKids: singleB.hasKids ?? undefined,
          matchNumKids: singleB.numKids ?? undefined,
          matchWantsKids: singleB.wantsKids ?? undefined,
          compatibilityScore: score,
          hilitsNote: matchReason,
          yesUrl: `${baseUrl}/match/respond?token=${tokenA}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenA}&response=no`,
          recipientEmail: singleA.email!,
          singleId: singleA.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenA}&side=a`,
        });
        const emailB = buildMatchProposalEmailTemplate({
          firstName: singleB.firstName,
          recipientGender: (singleB.gender as "male" | "female" | "other") ?? undefined,
          matchFirstName: singleA.firstName,
          matchAge: singleA.age ?? 0,
          matchCity: singleA.city ?? "",
          matchOccupation: singleA.occupation ?? undefined,
          matchDnaType: singleA.dnaType ?? undefined,
          matchPhotoUrl: singleA.photoUrl ? (singleA.photoUrl.startsWith("http") ? singleA.photoUrl : `https://hilitcaspi.com${singleA.photoUrl}`) : undefined,
          matchHasKids: singleA.hasKids ?? undefined,
          matchNumKids: singleA.numKids ?? undefined,
          matchWantsKids: singleA.wantsKids ?? undefined,
          compatibilityScore: score,
          hilitsNote: matchReason,
          yesUrl: `${baseUrl}/match/respond?token=${tokenB}&response=yes`,
          noUrl: `${baseUrl}/match/respond?token=${tokenB}&response=no`,
          recipientEmail: singleB.email!,
          singleId: singleB.id,
          trackingPixelUrl: `${baseUrl}/api/match-open?token=${tokenB}&side=b`,
        });
        await Promise.all([
          sendEmail({ to: { email: singleA.email!, name: singleA.firstName }, subject: emailA.subject, htmlContent: emailA.htmlBody }),
          sendEmail({ to: { email: singleB.email!, name: singleB.firstName }, subject: emailB.subject, htmlContent: emailB.htmlBody }),
        ]);
        await notifyOwner({ title: "✅ התאמה נשלחה!", content: `ההצעה ל-${singleA.firstName} ו-${singleB.firstName} נשלחה בהצלחה.` });
        // Send WhatsApp notifications to both singles
        const ownerWaMsg = (firstName: string, matchName: string) =>
          `היי ${firstName}! 💛\nשלחתי לך עכשיו מייל עם התאמה מיוחדת שבחרתי עבורך, ${matchName} מחכה לתשובתך!\nכדאי לבדוק את תיבת המייל (גם ספאם) וללחוץ על הקישור.\nהילית 💛`;
        const waNow3 = Date.now();
        await db.update(matches).set({ waSentAt: waNow3 }).where(eq(matches.id, match.id));
        if (singleA.phone) {
          sendWhatsApp(singleA.phone, ownerWaMsg(singleA.firstName, singleB.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleA:", err)
          );
        }
        if (singleB.phone) {
          sendWhatsApp(singleB.phone, ownerWaMsg(singleB.firstName, singleA.firstName)).catch(err =>
            console.error("[WhatsApp] Failed to send to singleB:", err)
          );
        }
        return { success: true, action: "approved", sentTo: [singleA.email, singleB.email] };
      }),

    /**
     * Get match details by token — used to show the match card before the user responds.
     * Does NOT consume the token.
     */
    getMatchDetails: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [match] = await db.select().from(matches).where(
          or(
            eq(matches.approvalTokenA, input.token),
            eq(matches.approvalTokenB, input.token)
          )
        ).limit(1);

        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "קישור לא תקין" });

        const isA = match.approvalTokenA === input.token;
        const mySingleId = isA ? match.singleAId : match.singleBId;
        const partnerSingleId = isA ? match.singleBId : match.singleAId;

        // Check if expired — return expired flag instead of throwing so frontend can show a specific message
        const isExpired = (match.approvalExpiresAt && Date.now() > match.approvalExpiresAt) || match.status === "expired";

        const [[me], [partner]] = await Promise.all([
          db.select().from(singles).where(eq(singles.id, mySingleId)).limit(1),
          db.select().from(singles).where(eq(singles.id, partnerSingleId)).limit(1),
        ]);

        const alreadyResponded = isA ? !!match.tokenAUsedAt : !!match.tokenBUsedAt;
        const myDecision = isA ? match.approvedByA : match.approvedByB;

        return {
          matchId: match.id,
          status: match.status,
          isExpired: !!isExpired,
          alreadyResponded,
          myDecision,
          partner: partner ? {
            firstName: partner.firstName,
            age: partner.age,
            city: partner.city,
            height: partner.height,
            education: partner.education,
            occupation: partner.occupation,
            about: partner.about,
            photoUrl: partner.photoUrl,
            religiosity: partner.religiosity,
          } : null,
          myName: me?.firstName ?? "",
        };
      }),

    /**
     * Handle match response (yes/no) from a single via email link.
     * When both say yes → send contact reveal emails.
     */
    respondToMatch: publicProcedure
      .input(z.object({
        token: z.string(),
        response: z.enum(["yes", "no"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Find match by token (either A or B)
        const [match] = await db.select().from(matches).where(
          or(
            eq(matches.approvalTokenA, input.token),
            eq(matches.approvalTokenB, input.token)
          )
        ).limit(1);

        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "קישור לא תקין" });
        if (match.approvalExpiresAt && Date.now() > match.approvalExpiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "הקישור פג תוקף" });
        }
        if (match.status === "matched" || match.status === "rejected" || match.status === "expired") {
          return { alreadyResponded: true, status: match.status };
        }

        const isA = match.approvalTokenA === input.token;
        const now = Date.now();

        // One-time token: check if this token was already used
        const tokenAlreadyUsed = isA ? !!match.tokenAUsedAt : !!match.tokenBUsedAt;
        if (tokenAlreadyUsed) {
          return { alreadyResponded: true, status: match.status };
        }

        // Mark token as used immediately (one-time use)
        const tokenUsedField = isA ? { tokenAUsedAt: now } : { tokenBUsedAt: now };
        await db.update(matches).set({ ...tokenUsedField, updatedAt: now }).where(eq(matches.id, match.id));

        if (input.response === "no") {
          await db.update(matches).set({ status: "rejected", updatedAt: now }).where(eq(matches.id, match.id));
          // If the other party already said yes, send them a consolation email
          const otherAlreadyApproved = isA ? match.approvedByB : match.approvedByA;
          if (otherAlreadyApproved) {
            const otherSingleId = isA ? match.singleBId : match.singleAId;
            const declinerSingleId = isA ? match.singleAId : match.singleBId;
            const [[otherSingle], [declinerSingle]] = await Promise.all([
              db.select().from(singles).where(eq(singles.id, otherSingleId)).limit(1),
              db.select().from(singles).where(eq(singles.id, declinerSingleId)).limit(1),
            ]);
            if (otherSingle?.email) {
              const consolation = buildConsolationEmail({
                firstName: otherSingle.firstName,
                matchFirstName: declinerSingle?.firstName,
                recipientEmail: otherSingle.email,
                singleId: otherSingle.id,
              });
              sendEmail({
                to: { email: otherSingle.email, name: otherSingle.firstName },
                subject: consolation.subject,
                htmlContent: consolation.htmlBody,
              }).catch(err => console.error("[Consolation email] Failed:", err));
            }
          }
          return { success: true, status: "rejected" };
        }

        // response === "yes"
        const updateData: Record<string, unknown> = { updatedAt: now };
        if (isA) updateData.approvedByA = true;
        else updateData.approvedByB = true;

        await db.update(matches).set(updateData).where(eq(matches.id, match.id));

        // Re-fetch to check if both approved
        const [updated] = await db.select().from(matches).where(eq(matches.id, match.id)).limit(1);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        if (updated.approvedByA && updated.approvedByB) {
          // Both said yes! Reveal contact details
          await db.update(matches).set({ status: "matched", matchedAt: now, updatedAt: now }).where(eq(matches.id, match.id));

          const [singleA] = await db.select().from(singles).where(eq(singles.id, match.singleAId)).limit(1);
          const [singleB] = await db.select().from(singles).where(eq(singles.id, match.singleBId)).limit(1);

          if (singleA && singleB) {
            const score = match.score ?? 0;
            const tipFemale = `בחרי מקום שקט שמאפשר שיחה אמיתית. בואי פתוחה, בלי ציפיות מוגדרות מראש. תני לשיחה לזרום באופן טבעי   הסקרנות האמיתית שלך היא הנכס הגדול ביותר שלך.`;
            const tipMale = `בחר מקום שקט שמאפשר שיחה אמיתית. בוא סקרן, לא מוכן. שאל שאלות אמיתיות ותקשיב   לא כדי לענות, אלא כדי להבין. הנוכחות שלך היא מה שתזכר.`;

            const emailRevealA = buildContactRevealEmailTemplate({
              firstName: singleA.firstName,
              gender: (singleA.gender as "male" | "female" | "other") ?? "other",
              matchFirstName: singleB.firstName,
              matchLastName: singleB.lastName ?? undefined,
              matchPhone: singleB.phone ?? "",
              matchEmail: singleB.email ?? "",
              matchAge: singleB.age ?? 0,
              matchCity: singleB.city ?? "",
              matchOccupation: singleB.occupation ?? undefined,
              matchDnaType: singleB.dnaType ?? undefined,
              compatibilityScore: score,
              preDateTip: singleA.gender === "female" ? tipFemale : tipMale,
              recipientEmail: singleA.email!,
              singleId: singleA.id,
            });

            const emailRevealB = buildContactRevealEmailTemplate({
              firstName: singleB.firstName,
              gender: (singleB.gender as "male" | "female" | "other") ?? "other",
              matchFirstName: singleA.firstName,
              matchLastName: singleA.lastName ?? undefined,
              matchPhone: singleA.phone ?? "",
              matchEmail: singleA.email ?? "",
              matchAge: singleA.age ?? 0,
              matchCity: singleA.city ?? "",
              matchOccupation: singleA.occupation ?? undefined,
              matchDnaType: singleA.dnaType ?? undefined,
              compatibilityScore: score,
              preDateTip: singleB.gender === "female" ? tipFemale : tipMale,
              recipientEmail: singleB.email!,
              singleId: singleB.id,
            });

            // Send contact reveal emails to both
            await Promise.all([
              sendEmail({
                to: { email: singleA.email!, name: singleA.firstName },
                subject: emailRevealA.subject,
                htmlContent: emailRevealA.htmlBody,
              }),
              sendEmail({
                to: { email: singleB.email!, name: singleB.firstName },
                subject: emailRevealB.subject,
                htmlContent: emailRevealB.htmlBody,
              }),
            ]);

            await notifyOwner({
              title: "💛 התאמה הצליחה!",
              content: `${singleA.firstName} ו-${singleB.firstName} שניהם אמרו כן! הפרטים נשלחו.`,
            });
          }

          return { success: true, status: "matched", bothApproved: true };
        }

        return { success: true, status: "waiting", bothApproved: false };
      }),

    /**
     * Reject a pending match (admin dismisses it without sending).
     */
    rejectMatch: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(matches).set({ status: "rejected", updatedAt: Date.now() }).where(eq(matches.id, input.matchId));
        return { success: true };
      }),

    /**
     * Admin: list all singles in the database.
     */
    listSingles: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(singles)
        .where(and(eq(singles.isSeed, false), eq(singles.isActive, true)))
        .orderBy(desc(singles.createdAt));
    }),

    /**
     * Admin: list inactive singles (paid but didn't complete questionnaire) - shown as leads.
     */
    listInactiveSingles: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(singles)
        .where(and(eq(singles.isSeed, false), eq(singles.isActive, false), eq(singles.isPaid, true)))
        .orderBy(desc(singles.createdAt));
    }),

    /**
     * Admin: list all matches (all statuses) for CRM.
     */
    listPendingMatches: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const rawMatches = await db.select().from(matches)
        .orderBy(desc(matches.createdAt), desc(matches.score)); // newest first, then by score

      // Deduplicate: for each pair (A,B) keep only the row with the highest score.
      // A pair can appear as (A,B) or (B,A) so normalise the key.
      const bestPerPair = new Map<string, typeof rawMatches[0]>();
      for (const m of rawMatches) {
        const key = [Math.min(m.singleAId, m.singleBId), Math.max(m.singleAId, m.singleBId)].join('-');
        const existing = bestPerPair.get(key);
        // Keep the newest match per pair (most recent createdAt)
        const mTime = m.createdAt instanceof Date ? m.createdAt.getTime() : Number(m.createdAt) || 0;
        const existingTime = existing ? (existing.createdAt instanceof Date ? existing.createdAt.getTime() : Number(existing.createdAt) || 0) : 0;
        if (!existing || mTime > existingTime) {
          bestPerPair.set(key, m);
        }
      }
      // Re-sort by most relevant date desc (proposedAt if sent, else createdAt) so newly-sent matches appear at top
      const allMatches = Array.from(bestPerPair.values())
        .sort((a, b) => {
          const aTime = a.proposedAt ? Number(a.proposedAt) : (a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt) || 0);
          const bTime = b.proposedAt ? Number(b.proposedAt) : (b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt) || 0);
          return bTime - aTime;
        });

      // Enrich with single names
      const singleIds = Array.from(new Set(allMatches.flatMap(m => [m.singleAId, m.singleBId])));
      const singleRows = singleIds.length > 0
        ? await db.select({
            id: singles.id, firstName: singles.firstName, lastName: singles.lastName,
            gender: singles.gender, city: singles.city, age: singles.age,
            dnaType: singles.dnaType, occupation: singles.occupation, phone: singles.phone,
            photoUrl: singles.photoUrl, education: singles.education,
            hasKids: singles.hasKids, numKids: singles.numKids, wantsKids: singles.wantsKids,
            religiosity: singles.religiosity, about: singles.about, partnerDescription: singles.partnerDescription,
            height: singles.height, minAgePreference: singles.minAgePreference, maxAgePreference: singles.maxAgePreference,
          })
            .from(singles).where(inArray(singles.id, singleIds))
        : [];
      const singleMap = new Map(singleRows.map(s => [s.id, s]));

      return allMatches.map(m => {
        const a = singleMap.get(m.singleAId);
        const b = singleMap.get(m.singleBId);
        return {
          ...m,
          singleAName: a ? `${a.firstName} ${a.lastName || ""}`.trim() : undefined,
          singleBName: b ? `${b.firstName} ${b.lastName || ""}`.trim() : undefined,
          singleAGender: a?.gender,
          singleBGender: b?.gender,
          singleACity: a?.city,
          singleBCity: b?.city,
          singleAAge: a?.age,
          singleBAge: b?.age,
          singleADna: a?.dnaType,
          singleBDna: b?.dnaType,
          singleAOccupation: a?.occupation,
          singleBOccupation: b?.occupation,
          singleAPhone: a?.phone,
          singleBPhone: b?.phone,
          singleAPhotoUrl: a?.photoUrl,
          singleBPhotoUrl: b?.photoUrl,
          singleAEducation: a?.education,
          singleBEducation: b?.education,
          singleAHasKids: a?.hasKids,
          singleBHasKids: b?.hasKids,
          singleANumKids: a?.numKids,
          singleBNumKids: b?.numKids,
          singleAWantsKids: a?.wantsKids,
          singleBWantsKids: b?.wantsKids,
          singleAReligiosity: a?.religiosity,
          singleBReligiosity: b?.religiosity,
          singleAAbout: a?.about,
          singleBAbout: b?.about,
          singleAPartnerDesc: a?.partnerDescription,
          singleBPartnerDesc: b?.partnerDescription,
          singleAHeight: a?.height,
          singleBHeight: b?.height,
          singleAMinAge: a?.minAgePreference,
          singleAMaxAge: a?.maxAgePreference,
          singleBMinAge: b?.minAgePreference,
          singleBMaxAge: b?.maxAgePreference,
        };
      });
    }),

    /**
     * Admin: backfill scores for all existing matches that have no score.
     * Run once to populate scoreBreakdown and autoExplanation for old matches.
     */
    backfillMatchScores: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Recalculate ALL matches with the full v2.2 algorithm
      const allMatches = await db.select().from(matches);
      if (allMatches.length === 0) return { updated: 0 };
      const singleIds = Array.from(new Set(allMatches.flatMap(m => [m.singleAId, m.singleBId])));
      const singleRows = await db.select().from(singles).where(inArray(singles.id, singleIds));
      const singleMap = new Map(singleRows.map(s => [s.id, s]));
      // Fetch all matchmaking answers for these singles
      const allAnswers = await db.select().from(matchmakingAnswers)
        .where(inArray(matchmakingAnswers.singleId, singleIds));
      const answersMap = new Map(allAnswers.map(a => [
        a.singleId,
        JSON.parse(a.answersJson || '[]') as MatchAnswer[]
      ]));
      let updated = 0;
      for (const m of allMatches) {
        const a = singleMap.get(m.singleAId);
        const b = singleMap.get(m.singleBId);
        if (!a || !b) continue;
        const answersA = answersMap.get(a.id) ?? [];
        const answersB = answersMap.get(b.id) ?? [];
        // Run AI visual scoring if both have photos
        let visualScore: number | undefined;
        if (a.photoUrl && b.photoUrl) {
          try { visualScore = await scoreVisualAsync(a.photoUrl, b.photoUrl); } catch { /* use default */ }
        }
        // Compute full score with all v7.0 components
        const fullScore = computeFullScore(a, b, answersA, answersB);
        // Build RICH breakdown for display, includes all dimension scores
        const breakdown = {
          total: fullScore.total,
          // Dimension scores (0-100 each)
          questionnaire: fullScore.questionnaire,
          lifeStage: fullScore.lifeStage,
          dna: fullScore.dna,
          practical: fullScore.practical,
          religiosity: fullScore.religiosity,
          education: fullScore.education,
          interactionBonus: fullScore.interactionBonus,
          // Meta
          visual: visualScore ?? 50,
          hasAnswers: answersA.length > 0 && answersB.length > 0,
          algorithm: 'v7.0',
          // Human-readable reasons
          details: fullScore.details,
        };
        const explanation = await buildMatchExplanation(a as SingleRow, b as SingleRow, fullScore as unknown as { dna: number; age: number; religiosity: number; kids: number; city: number; total: number });
        await db.update(matches)
          .set({
            score: fullScore.total,
            scoreBreakdown: JSON.stringify(breakdown),
            autoExplanation: explanation,
          })
          .where(eq(matches.id, m.id));
        updated++;
      }
      return { updated };
    }),

    /**
     * Admin: get active singles who have NEVER received any match proposal.
     * Ordered by registration date (oldest first = waiting longest).
     */
    getSinglesWithoutMatches: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      // Get all active singles
      const allSingles = await db.select().from(singles)
        .where(eq(singles.isActive, true))
        .orderBy(asc(singles.createdAt)); // oldest first = waiting longest

      // Get only SENT match rows (proposed/matched/rejected/expired) — NOT pending (pending = algorithm generated, never actually sent)
      const sentMatchRows = await db.select({
        singleAId: matches.singleAId,
        singleBId: matches.singleBId,
        proposedAt: matches.proposedAt,
        status: matches.status,
      }).from(matches).where(
        inArray(matches.status, ["proposed", "matched", "rejected", "expired"])
      );

      const twoMonthsAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);

      // Track last SENT match date per single, active proposal status, and total sent count
      const lastMatchDateBySingle = new Map<number, number>();
      const activeProposalBySingle = new Map<number, boolean>();
      const sentMatchCountBySingle = new Map<number, number>();
      for (const m of sentMatchRows) {
        const ts = m.proposedAt ?? 0;
        const ids = [m.singleAId, m.singleBId].filter(Boolean) as number[];
        for (const id of ids) {
          const prev = lastMatchDateBySingle.get(id) ?? 0;
          if (ts > prev) lastMatchDateBySingle.set(id, ts);
          sentMatchCountBySingle.set(id, (sentMatchCountBySingle.get(id) ?? 0) + 1);
          if (m.status === "proposed") activeProposalBySingle.set(id, true);
        }
      }

      // Filter to singles who never received a sent match, OR last sent match was 60+ days ago
      // Also exclude singles currently in an active proposal (they already have a match pending)
      const singlesWithout = allSingles.filter(s => {
        if (activeProposalBySingle.get(s.id)) return false; // currently in active proposal
        const lastMatch = lastMatchDateBySingle.get(s.id);
        if (!lastMatch) return true; // never had a sent match
        return lastMatch < twoMonthsAgo; // last sent match was 60+ days ago
      });

      // For each, find potential matches from the pool
      const pool = allSingles.map(s => ({
        ...s,
        seekingGender: s.seekingGender ?? (s.gender === "female" ? "male" : "female"),
      }));

      // Fetch all matchmaking answers once for efficient lookup
      const allAnswers = await db.select().from(matchmakingAnswers);
      const answersBySingleId = new Map<number, MatchAnswer[]>();
      for (const row of allAnswers) {
        const parsed: MatchAnswer[] = row.answersJson
          ? (typeof row.answersJson === 'string' ? JSON.parse(row.answersJson) : row.answersJson as MatchAnswer[])
          : [];
        answersBySingleId.set(row.singleId, parsed);
      }

      return singlesWithout.map(s => {
        const sAnswers = answersBySingleId.get(s.id) ?? [];

        // Find top 3 potential matches using the full algorithm
        const candidates = pool.filter(c =>
          c.id !== s.id &&
          c.gender !== s.gender
        );

        const suggestions = candidates
          .map(c => {
            const cAnswers = answersBySingleId.get(c.id) ?? [];
            const breakdown = computeFullScoreAdmin(s as any, c as any, sAnswers, cAnswers);
            return {
              id: c.id,
              name: `${c.firstName} ${c.lastName || ''}`.trim(),
              age: c.age,
              city: c.city,
              gender: c.gender,
              dnaType: c.dnaType,
              photoUrl: c.photoUrl,
              height: c.height,
              education: c.education,
              maritalStatus: c.maritalStatus,
              hasKids: c.hasKids,
              numKids: c.numKids,
              wantsKids: c.wantsKids,
              score: breakdown.total,
              hasActiveProposal: activeProposalBySingle.get(c.id) ?? false,
              totalSentMatches: sentMatchCountBySingle.get(c.id) ?? 0,
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const waitingDays = s.createdAt
          ? Math.floor((Date.now() - (typeof s.createdAt === 'number' ? s.createdAt : new Date(s.createdAt).getTime())) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender,
          age: s.age,
          city: s.city,
          dnaType: s.dnaType,
          photoUrl: s.photoUrl,
          phone: s.phone,
          religiosity: s.religiosity,
          height: s.height,
          education: s.education,
          maritalStatus: s.maritalStatus,
          hasKids: s.hasKids,
          numKids: s.numKids,
          wantsKids: s.wantsKids,
          createdAt: s.createdAt,
          waitingDays,
          lastMatchAt: lastMatchDateBySingle.get(s.id) ?? null,
          suggestions,
        };
      });
    }),

    /**
     * Admin: get top 3 matches for a specific single (by score).
     */
    getTopMatchesForSingle: protectedProcedure
      .input(z.object({ singleId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return [];
        // Fetch the main single's age preferences for hard filtering
        const [mainSingle] = await db.select({
          id: singles.id, age: singles.age,
          minAgePreference: singles.minAgePreference,
          maxAgePreference: singles.maxAgePreference,
        }).from(singles).where(eq(singles.id, input.singleId)).limit(1);
        // Get all matches involving this single
        const allMatches = await db.select().from(matches)
          .where(
            or(
              eq(matches.singleAId, input.singleId),
              eq(matches.singleBId, input.singleId)
            )
          )
          .orderBy(desc(matches.score))
          .limit(50);
        // Deduplicate by opponent ID, keep highest score
        const bestByOpponent = new Map<number, typeof allMatches[0]>();
        for (const m of allMatches) {
          const opponentId = m.singleAId === input.singleId ? m.singleBId : m.singleAId;
          const existing = bestByOpponent.get(opponentId);
          if (!existing || (m.score ?? 0) > (existing.score ?? 0)) {
            bestByOpponent.set(opponentId, m);
          }
        }
        // Enrich all candidates first so we can apply age hard-filter
        const allOpponentIds = Array.from(bestByOpponent.keys());
        const allOpponents = allOpponentIds.length > 0
          ? await db.select({
              id: singles.id, firstName: singles.firstName, lastName: singles.lastName,
              age: singles.age, city: singles.city, gender: singles.gender,
              dnaType: singles.dnaType, photoUrl: singles.photoUrl, phone: singles.phone,
              occupation: singles.occupation, religiosity: singles.religiosity,
              height: singles.height, education: singles.education,
              minAgePreference: singles.minAgePreference,
              maxAgePreference: singles.maxAgePreference,
            }).from(singles).where(inArray(singles.id, allOpponentIds))
          : [];
        const allOpponentMap = new Map(allOpponents.map(o => [o.id, o]));
        // Get all singles currently UNAVAILABLE:
        // 1. In an active PROPOSED match (waiting for response)
        // 2. In a MATCHED state and haven't returned to pool yet
        const allActiveMatches = await db.select({
          singleAId: matches.singleAId,
          singleBId: matches.singleBId,
          status: matches.status,
          returnedToPoolAt: matches.returnedToPoolAt,
        }).from(matches).where(
          or(
            eq(matches.status, 'proposed'),
            eq(matches.status, 'matched')
          )
        );
        const unavailableSingleIds = new Set<number>();
        for (const am of allActiveMatches) {
          if (am.status === 'proposed') {
            // Both sides are locked in a proposed match
            unavailableSingleIds.add(am.singleAId);
            unavailableSingleIds.add(am.singleBId);
          } else if (am.status === 'matched' && !am.returnedToPoolAt) {
            // Both sides are in a successful match and haven't returned to pool
            unavailableSingleIds.add(am.singleAId);
            unavailableSingleIds.add(am.singleBId);
          }
        }
        // Get inactive singles to exclude
        const inactiveSingles = await db.select({ id: singles.id })
          .from(singles).where(eq(singles.isActive, false));
        const inactiveSingleIds = new Set(inactiveSingles.map(s => s.id));
        // Hard-filter: exclude opponents who are unavailable, inactive, or outside age preference
        const filteredMatches = Array.from(bestByOpponent.entries())
          .filter(([opponentId, m]) => {
            const opponent = allOpponentMap.get(opponentId);
            // Exclude if opponent is unavailable (proposed or matched without return)
            if (unavailableSingleIds.has(opponentId)) return false;
            // Exclude if opponent is inactive
            if (inactiveSingleIds.has(opponentId)) return false;
            // Also exclude if the main single is currently unavailable
            if (unavailableSingleIds.has(input.singleId)) return false;
            if (!opponent || opponent.age == null) return true; // keep if no age data
            const minPref = mainSingle?.minAgePreference;
            const maxPref = mainSingle?.maxAgePreference;
            if (minPref != null && opponent.age < minPref) return false;
            if (maxPref != null && opponent.age > maxPref) return false;
            // Exclude if this specific pair is already proposed
            if (m.status === 'proposed') return false;
            return true;
          })
          .map(([, m]) => m);
        const top9 = filteredMatches
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 9);
        if (top9.length === 0) return [];
        // Enrich with opponent details
        const opponentIds = top9.map(m => m.singleAId === input.singleId ? m.singleBId : m.singleAId);
        const opponents = allOpponents.filter(o => opponentIds.includes(o.id));
        const opponentMap = new Map(opponents.map(o => [o.id, o]));
        return top9.map(m => {
          const opponentId = m.singleAId === input.singleId ? m.singleBId : m.singleAId;
          const opponent = opponentMap.get(opponentId);
          return {
            matchId: m.id,
            score: m.score ?? 0,
            status: m.status,
            scoreBreakdown: m.scoreBreakdown,
            opponent: opponent ? {
              id: opponent.id,
              name: `${opponent.firstName} ${opponent.lastName || ''}`.trim(),
              age: opponent.age,
              city: opponent.city,
              gender: opponent.gender,
              dnaType: opponent.dnaType,
              photoUrl: opponent.photoUrl,
              phone: opponent.phone,
              occupation: opponent.occupation,
              religiosity: opponent.religiosity,
              height: opponent.height,
              education: opponent.education,
            } : null,
          };
        });
      }),
    /**
     * Public: single returns to the pool after a successful match.
     * Called from the /match/return-to-pool page (linked in follow-up emails).
     */
    returnToPool: publicProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "התאמה לא נמצאה" });
        if (match.status !== "matched") throw new TRPCError({ code: "BAD_REQUEST", message: "ההתאמה אינה פעילה" });
        const now = Date.now();
        await db.update(matches).set({ returnedToPoolAt: now, updatedAt: now }).where(eq(matches.id, input.matchId));
        return { success: true };
      }),

    /**
     * Admin: release a single from an active match (returnedToPool = now).
     */
    releaseFromMatch: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const now = Date.now();
        // Set status to rejected + returnedToPoolAt so both people are freed from the match
        await db.update(matches).set({ status: "rejected", returnedToPoolAt: now, updatedAt: now, notes: "שוחרר ידנית" }).where(eq(matches.id, input.matchId));
        return { success: true };
      }),
    /**
     * Admin: mark a pending match as "already sent before" (status → rejected with note).
     * This removes it from the top-3 suggestions without sending it.
     */
    markMatchSentBefore: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(matches).set({
          status: "rejected",
          notes: "נשלחה בעבר",
          updatedAt: Date.now()
        }).where(eq(matches.id, input.matchId));
        return { success: true };
      }),

    /**
     * Admin: get full match history for a single (all statuses).
     */
    getMatchHistory: protectedProcedure
      .input(z.object({ singleId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return [];
        const allMatches = await db.select().from(matches).where(
          or(
            eq(matches.singleAId, input.singleId),
            eq(matches.singleBId, input.singleId)
          )
        ).orderBy(desc(matches.createdAt));

        // Get all opponent IDs
        const opponentIds = allMatches.map(m => m.singleAId === input.singleId ? m.singleBId : m.singleAId);
        const uniqueOpponentIds = Array.from(new Set(opponentIds));
        const opponents = uniqueOpponentIds.length > 0
          ? await db.select({
              id: singles.id, firstName: singles.firstName, lastName: singles.lastName,
              age: singles.age, city: singles.city, gender: singles.gender,
              dnaType: singles.dnaType, photoUrl: singles.photoUrl, phone: singles.phone,
              religiosity: singles.religiosity, occupation: singles.occupation,
            }).from(singles).where(inArray(singles.id, uniqueOpponentIds))
          : [];
        const opponentMap = new Map(opponents.map(o => [o.id, o]));

        return allMatches.map(m => {
          const opponentId = m.singleAId === input.singleId ? m.singleBId : m.singleAId;
          const opponent = opponentMap.get(opponentId);
          const daysInMatch = m.proposedAt
            ? Math.floor((Date.now() - m.proposedAt) / (1000 * 60 * 60 * 24))
            : null;
          return {
            matchId: m.id,
            status: m.status,
            score: m.score,
            proposedAt: m.proposedAt,
            matchedAt: m.matchedAt,
            returnedToPoolAt: m.returnedToPoolAt,
            notes: m.notes,
            daysInMatch,
            approvedByA: m.approvedByA,
            approvedByB: m.approvedByB,
            isA: m.singleAId === input.singleId,
            opponent: opponent ? {
              id: opponent.id,
              name: `${opponent.firstName} ${opponent.lastName || ''}`.trim(),
              age: opponent.age,
              city: opponent.city,
              gender: opponent.gender,
              dnaType: opponent.dnaType,
              photoUrl: opponent.photoUrl,
              phone: opponent.phone,
              religiosity: opponent.religiosity,
              occupation: opponent.occupation,
            } : null,
          };
        });
      }),

    /**
     * Admin: get the current active match (proposed or matched) for a single.
     */
    getSingleActiveMatch: protectedProcedure
      .input(z.object({ singleId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return null;
        const activeMatches = await db.select().from(matches).where(
          and(
            or(
              eq(matches.singleAId, input.singleId),
              eq(matches.singleBId, input.singleId)
            ),
            or(
              eq(matches.status, 'proposed'),
              and(eq(matches.status, 'matched'), isNull(matches.returnedToPoolAt))
            )
          )
        ).orderBy(desc(matches.createdAt)).limit(1);

        if (activeMatches.length === 0) return null;
        const m = activeMatches[0];
        const opponentId = m.singleAId === input.singleId ? m.singleBId : m.singleAId;
        const [opponent] = await db.select({
          id: singles.id, firstName: singles.firstName, lastName: singles.lastName,
          age: singles.age, city: singles.city, gender: singles.gender,
          dnaType: singles.dnaType, photoUrl: singles.photoUrl, phone: singles.phone,
        }).from(singles).where(eq(singles.id, opponentId)).limit(1);

        const daysInMatch = m.proposedAt
          ? Math.floor((Date.now() - m.proposedAt) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          matchId: m.id,
          status: m.status,
          score: m.score,
          proposedAt: m.proposedAt,
          matchedAt: m.matchedAt,
          daysInMatch,
          approvedByA: m.approvedByA,
          approvedByB: m.approvedByB,
          isA: m.singleAId === input.singleId,
          opponent: opponent ? {
            id: opponent.id,
            name: `${opponent.firstName} ${opponent.lastName || ''}`.trim(),
            age: opponent.age,
            city: opponent.city,
            gender: opponent.gender,
            dnaType: opponent.dnaType,
            photoUrl: opponent.photoUrl,
            phone: opponent.phone,
          } : null,
        };
      }),

    /**
     * Admin: toggle a single's active status.
     */
    toggleSingleActive: protectedProcedure
      .input(z.object({ singleId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(singles).set({ isActive: input.isActive }).where(eq(singles.id, input.singleId));
        return { success: true };
      }),
    /**
     * Admin: send a reminder email to a single who has not responded to a match proposal.
     */
    sendMatchReminder: protectedProcedure
      .input(z.object({ matchId: z.number(), singleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
        if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "התאמה לא נמצאה" });
        if (match.status !== 'proposed') throw new TRPCError({ code: "BAD_REQUEST", message: "ההתאמה אינה פעילה" });
        const isA = match.singleAId === input.singleId;
        const [single] = await db.select().from(singles).where(eq(singles.id, input.singleId)).limit(1);
        if (!single || !single.email) throw new TRPCError({ code: "BAD_REQUEST", message: "אין כתובת מייל לרווק/ה" });
        const opponentId = isA ? match.singleBId : match.singleAId;
        const [opponent] = await db.select().from(singles).where(eq(singles.id, opponentId)).limit(1);
        const token = isA ? match.approvalTokenA : match.approvalTokenB;
        const baseUrl = "https://hilitcaspi.com";
        const approveUrl = token ? `${baseUrl}/match/respond?token=${token}&response=yes` : '';
        const declineUrl = token ? `${baseUrl}/match/respond?token=${token}&response=no` : '';
        const opponentName = opponent ? `${opponent.firstName} ${opponent.lastName || ''}`.trim() : 'מישהו מיוחד';
        const opponentAge = opponent?.age ?? null;
        const opponentCity = opponent?.city ?? null;
        const subject = `תזכורת: ממתינים לתשובתך 💛`;
        const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#191265;">היי ${single.firstName} 💛</h2>
          <p>שלחנו לך לאחרונה הצעת התאמה עם ${opponentName}${opponentAge ? `, גיל ${opponentAge}` : ''}${opponentCity ? `, ${opponentCity}` : ''}.</p>
          <p>עדיין לא קיבלנו את תשובתך. אנחנו מזכירים לך שההצעה ממתינה לך!</p>
          ${approveUrl ? `<div style="margin:20px 0;">
            <a href="${approveUrl}" style="background:#191265;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-left:10px;">✅ מעוניינת</a>
            <a href="${declineUrl}" style="background:#e5e7eb;color:#374151;padding:12px 24px;border-radius:8px;text-decoration:none;">❌ לא מעוניינת</a>
          </div>` : ''}
          <p style="color:#727272;font-size:12px;">בברכה, הילית כספי</p>
        </div>`;
        await sendEmail({ to: { email: single.email, name: single.firstName }, subject, htmlContent: html });
        return { success: true };
      }),
    /**
     * Admin: update a single's photo URL directly (for fixing missing photos).
     */
    updateSinglePhoto: protectedProcedure
      .input(z.object({
        singleId: z.number(),
        photoBase64: z.string(),
        photoMime: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const base64Data = input.photoBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = input.photoMime.split('/')[1] || 'jpg';
        const key = `singles/${input.singleId}-photo-${Date.now()}.${ext}`;
        const result = await storagePut(key, buffer, input.photoMime);
        await db.update(singles).set({ photoUrl: result.url, updatedAt: Date.now() }).where(eq(singles.id, input.singleId));
        return { success: true, photoUrl: result.url };
      }),
  }),

  // ── Invite Tokens (Hilit sends free access manually) ──────────────────────
  invites: router({
    /**
     * Admin: generate a free invite token to send to someone.
     */
    generate: protectedProcedure
      .input(z.object({
        boundEmail: z.string().email().optional(),
        note: z.string().max(200).optional(),
        expiryDays: z.number().min(1).max(365).default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const token = crypto.randomBytes(24).toString("hex");
        const expiresAt = Date.now() + input.expiryDays * 24 * 60 * 60 * 1000;
        const now = Date.now();

        await db.insert(inviteTokens).values({
          token,
          boundEmail: input.boundEmail,
          note: input.note,
          expiresAt,
          createdAt: now,
        });

        const link = `https://hilitcaspi.com/join?invite=${token}`;
        return { token, link, expiresAt };
      }),

    /**
     * Validate an invite token (called from /join page).
     */
    validate: publicProcedure
      .input(z.object({ token: z.string(), email: z.string().email().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false, reason: "server_error" };

        const [row] = await db.select().from(inviteTokens)
          .where(eq(inviteTokens.token, input.token)).limit(1);

        if (!row) return { valid: false, reason: "not_found" };
        if (row.usedAt) return { valid: false, reason: "already_used" };
        if (Date.now() > row.expiresAt) return { valid: false, reason: "expired" };
        if (row.boundEmail && input.email && row.boundEmail.toLowerCase() !== input.email.toLowerCase()) {
          return { valid: false, reason: "email_mismatch" };
        }

        return { valid: true, boundEmail: row.boundEmail };
      }),

    /**
     * Validate an invite token (mutation version - avoids useQuery/refetch anti-pattern).
     */
    validateMutation: publicProcedure
      .input(z.object({ token: z.string(), email: z.string().email().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false, reason: "server_error" };

        const [row] = await db.select().from(inviteTokens)
          .where(eq(inviteTokens.token, input.token)).limit(1);

        if (!row) return { valid: false, reason: "not_found" };
        if (row.usedAt) return { valid: false, reason: "already_used" };
        if (Date.now() > row.expiresAt) return { valid: false, reason: "expired" };
        if (row.boundEmail && input.email && row.boundEmail.toLowerCase() !== input.email.toLowerCase()) {
          return { valid: false, reason: "email_mismatch" };
        }

        return { valid: true, boundEmail: row.boundEmail };
      }),

    /**
     * Redeem an invite token (called when registration completes).
     */
    redeem: publicProcedure
      .input(z.object({
        token: z.string(),
        email: z.string().email(),
        singleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [row] = await db.select().from(inviteTokens)
          .where(eq(inviteTokens.token, input.token)).limit(1);

        if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "קוד לא תקין" });
        if (row.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "קוד זה כבר נוצל" });
        if (Date.now() > row.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "הקוד פג תוקף" });

        await db.update(inviteTokens).set({
          usedAt: Date.now(),
          usedByEmail: input.email,
          usedBySingleId: input.singleId,
        }).where(eq(inviteTokens.token, input.token));

        return { success: true };
      }),

    /**
     * Admin: list all invite tokens.
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(inviteTokens).orderBy(desc(inviteTokens.createdAt));
    }),
  }),

  // ── Blog ──────────────────────────────────────────────────────────────────
  blog: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          coverImage: blogPosts.coverImage,
          tags: blogPosts.tags,
          publishedAt: blogPosts.publishedAt,
        })
          .from(blogPosts)
          .where(eq(blogPosts.isPublished, true))
          .orderBy(desc(blogPosts.publishedAt))
          .limit(input?.limit ?? 20);
      }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [post] = await db.select().from(blogPosts)
          .where(and(eq(blogPosts.slug, input.slug), eq(blogPosts.isPublished, true)))
          .limit(1);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "מאמר לא נמצא" });
        return post;
      }),
    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        title: z.string().min(1),
        slug: z.string().min(1),
        excerpt: z.string().min(1),
        content: z.string().min(1),
        coverImage: z.string().optional(),
        metaDescription: z.string().max(160).optional(),
        tags: z.string().optional(),
        isPublished: z.boolean().default(true),
        publishedAt: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const now = Date.now();
        if (input.id) {
          await db.update(blogPosts)
            .set({ ...input, updatedAt: now })
            .where(eq(blogPosts.id, input.id));
          return { id: input.id };
        } else {
          const [result] = await db.insert(blogPosts).values({
            title: input.title,
            slug: input.slug,
            excerpt: input.excerpt,
            content: input.content,
            coverImage: input.coverImage,
            metaDescription: input.metaDescription,
            tags: input.tags,
            isPublished: input.isPublished,
            publishedAt: input.publishedAt ?? now,
            createdAt: now,
            updatedAt: now,
          });
          return { id: (result as any)[0].insertId };
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(blogPosts).where(eq(blogPosts.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Analytics ──────────────────────────────────────────────────────────────────────────────
  analytics: router({
    // רשום אירוע אנליטיקס (פומבלי - לא דורש אימות)
    track: publicProcedure
      .input(z.object({
        eventType: z.enum([
          "email_open", "email_click", "guide_view", "guide_download",
          "database_view", "database_cta", "course_view", "course_cta",
          "coaching_view", "coaching_cta", "dna_quiz_start", "dna_quiz_complete",
          "calendly_click", "whatsapp_click", "podcast_click", "page_view",
        ]),
        email: z.string().email().optional(),
        leadId: z.number().optional(),
        page: z.string().max(200).optional(),
        emailJourney: z.string().max(100).optional(),
        emailIndex: z.number().optional(),
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const userAgent = (ctx as any).req?.headers?.["user-agent"]?.slice(0, 500) ?? null;
        await db.insert(analyticsEvents).values({
          eventType: input.eventType,
          email: input.email ?? null,
          leadId: input.leadId ?? null,
          page: input.page ?? null,
          emailJourney: input.emailJourney ?? null,
          emailIndex: input.emailIndex ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          userAgent: userAgent,
          createdAt: Date.now(),
        });
        return { success: true };
      }),

    // פאנל מסעות מפורט
    journeyFunnel: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Per-journey aggregate stats
      const journeyRows = await db.execute(sql`
        SELECT 
          el.journeyKey,
          COUNT(DISTINCT el.leadId) as totalLeads,
          SUM(CASE WHEN el.status='sent' THEN 1 ELSE 0 END) as totalSent,
          SUM(CASE WHEN el.status='pending' THEN 1 ELSE 0 END) as totalPending,
          SUM(CASE WHEN el.status='failed' THEN 1 ELSE 0 END) as totalFailed,
          SUM(CASE WHEN el.openCount > 0 THEN 1 ELSE 0 END) as uniqueOpens,
          SUM(CASE WHEN el.clickCount > 0 THEN 1 ELSE 0 END) as uniqueClicks,
          COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN el.leadId END) as convertedToMatchmaking
        FROM email_log el
        LEFT JOIN crm_leads cl ON cl.id = el.leadId
        LEFT JOIN singles s ON s.email = cl.email
        GROUP BY el.journeyKey
        ORDER BY totalLeads DESC
      `);

      // Per-email-index stats per journey
      const emailIndexRows = await db.execute(sql`
        SELECT 
          journeyKey,
          emailIndex,
          COUNT(*) as total,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log
        GROUP BY journeyKey, emailIndex
        ORDER BY journeyKey, emailIndex
      `);

      // Leads with NO journey
      const noJourneyRows = await db.execute(sql`
        SELECT cl.id, cl.name, cl.email, cl.gender, cl.source,
               FROM_UNIXTIME(cl.createdAt/1000, '%Y-%m-%d') as created
        FROM crm_leads cl
        WHERE cl.id NOT IN (
          SELECT DISTINCT leadId FROM email_log WHERE leadId IS NOT NULL
        )
        ORDER BY cl.createdAt DESC
      `);

      // Source breakdown (leads by source + gender)
      const sourceRows = await db.execute(sql`
        SELECT 
          COALESCE(cl.source, 'unknown') as source,
          COALESCE(cl.gender, 'unknown') as gender,
          COUNT(DISTINCT cl.id) as cnt,
          COUNT(DISTINCT CASE WHEN el.leadId IS NOT NULL THEN cl.id END) as withJourney,
          COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN cl.id END) as inMatchmaking
        FROM crm_leads cl
        LEFT JOIN email_log el ON el.leadId = cl.id
        LEFT JOIN singles s ON s.email = cl.email
        GROUP BY cl.source, cl.gender
        ORDER BY cnt DESC
      `);

      return {
        journeys: (journeyRows as any)[0] as any[],
        emailIndex: (emailIndexRows as any)[0] as any[],
        noJourney: (noJourneyRows as any)[0] as any[],
        sources: (sourceRows as any)[0] as any[],
      };
    }),

    // פאנל שאלון DNA
    quizFunnel: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [pageViewRow] = await db.execute(sql`SELECT COUNT(*) as cnt FROM analytics_events WHERE eventType = 'page_view' AND page = '/dna-quiz'`) as any;
      const pageViews = Number((pageViewRow as any[])[0]?.cnt ?? 0);

      const [startRow] = await db.execute(sql`SELECT COUNT(*) as cnt FROM analytics_events WHERE eventType = 'dna_quiz_start'`) as any;
      const quizStarts = Number((startRow as any[])[0]?.cnt ?? 0);

      const [completeRow] = await db.execute(sql`SELECT COUNT(*) as cnt FROM dna_quiz_results`) as any;
      const quizCompletes = Number((completeRow as any[])[0]?.cnt ?? 0);

      const [leadRow] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE source = 'dna_quiz'`) as any;
      const becameLeads = Number((leadRow as any[])[0]?.cnt ?? 0);

      const [journeyRow] = await db.execute(sql`SELECT COUNT(DISTINCT el.leadId) as cnt FROM email_log el JOIN crm_leads cl ON cl.id = el.leadId WHERE cl.source = 'dna_quiz'`) as any;
      const inJourney = Number((journeyRow as any[])[0]?.cnt ?? 0);

      const [matchRow] = await db.execute(sql`SELECT COUNT(DISTINCT cl.id) as cnt FROM crm_leads cl JOIN singles s ON s.email = cl.email WHERE cl.source = 'dna_quiz'`) as any;
      const inMatchmaking = Number((matchRow as any[])[0]?.cnt ?? 0);

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const [dailyRows] = await db.execute(sql`
        SELECT FROM_UNIXTIME(createdAt/1000, '%Y-%m-%d') as day,
          SUM(CASE WHEN eventType='dna_quiz_start' THEN 1 ELSE 0 END) as starts,
          SUM(CASE WHEN eventType='dna_quiz_complete' THEN 1 ELSE 0 END) as completes
        FROM analytics_events
        WHERE eventType IN ('dna_quiz_start','dna_quiz_complete') AND createdAt > ${twoWeeksAgo}
        GROUP BY day ORDER BY day ASC
      `) as any;

      const [dailyLeadRows] = await db.execute(sql`
        SELECT FROM_UNIXTIME(createdAt/1000, '%Y-%m-%d') as day, COUNT(*) as leads
        FROM crm_leads WHERE source = 'dna_quiz' AND createdAt > ${twoWeeksAgo}
        GROUP BY day ORDER BY day ASC
      `) as any;

      return { pageViews, quizStarts, quizCompletes, becameLeads, inJourney, inMatchmaking, daily: dailyRows as any[], dailyLeads: dailyLeadRows as any[] };
    }),

    // ── פאנל מאגר רווקים ──────────────────────────────────────────────────────
    matchmakingFunnel: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // ── Overview counts ──────────────────────────────────────────────────────
      const [[totalRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM singles WHERE isSeed=0`) as any;
      const total = Number(totalRow?.cnt ?? 0);

      const [[activeRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM singles WHERE isSeed=0 AND isActive=1`) as any;
      const active = Number(activeRow?.cnt ?? 0);

      const [[paidRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM singles WHERE isSeed=0 AND isPaid=1`) as any;
      const paid = Number(paidRow?.cnt ?? 0);

      const [[questionnaireRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM singles WHERE isSeed=0 AND questionnaireCompletedAt IS NOT NULL`) as any;
      const questionnaireCompleted = Number(questionnaireRow?.cnt ?? 0);

      const [[photoRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM singles WHERE isSeed=0 AND photoUrl IS NOT NULL AND photoUrl != ''`) as any;
      const hasPhoto = Number(photoRow?.cnt ?? 0);

      // ── Gender breakdown ─────────────────────────────────────────────────────
      const [genderRows] = await db.execute(sql`
        SELECT gender, COUNT(*) as cnt,
          SUM(CASE WHEN isPaid=1 THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN questionnaireCompletedAt IS NOT NULL THEN 1 ELSE 0 END) as questionnaire,
          SUM(CASE WHEN photoUrl IS NOT NULL AND photoUrl != '' THEN 1 ELSE 0 END) as photo
        FROM singles WHERE isSeed=0
        GROUP BY gender
      `) as any;

      // ── Age distribution ─────────────────────────────────────────────────────
      const [ageRows] = await db.execute(sql`
        SELECT 
          CASE 
            WHEN age < 25 THEN 'מתחת 25'
            WHEN age BETWEEN 25 AND 29 THEN '25-29'
            WHEN age BETWEEN 30 AND 34 THEN '30-34'
            WHEN age BETWEEN 35 AND 39 THEN '35-39'
            WHEN age BETWEEN 40 AND 44 THEN '40-44'
            WHEN age BETWEEN 45 AND 49 THEN '45-49'
            WHEN age >= 50 THEN '50+'
          END as ageGroup,
          COUNT(*) as cnt
        FROM singles WHERE isSeed=0
        GROUP BY ageGroup ORDER BY MIN(age)
      `) as any;

      // ── City distribution (top 10) ───────────────────────────────────────────
      const [cityRows] = await db.execute(sql`
        SELECT city, COUNT(*) as cnt FROM singles WHERE isSeed=0
        GROUP BY city ORDER BY cnt DESC LIMIT 10
      `) as any;

      // ── Marital status ───────────────────────────────────────────────────────
      const [maritalRows] = await db.execute(sql`
        SELECT maritalStatus, COUNT(*) as cnt FROM singles WHERE isSeed=0
        GROUP BY maritalStatus ORDER BY cnt DESC
      `) as any;

      // ── Religiosity ──────────────────────────────────────────────────────────
      const [religiosityRows] = await db.execute(sql`
        SELECT religiosity, COUNT(*) as cnt FROM singles WHERE isSeed=0
        GROUP BY religiosity ORDER BY cnt DESC
      `) as any;

      // ── DNA type breakdown ───────────────────────────────────────────────────
      const [dnaRows] = await db.execute(sql`
        SELECT dnaType, COUNT(*) as cnt FROM singles WHERE isSeed=0 AND dnaType IS NOT NULL
        GROUP BY dnaType ORDER BY cnt DESC
      `) as any;

      // ── Matches stats ────────────────────────────────────────────────────────
      const [[matchTotalRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM matches`) as any;
      const matchTotal = Number(matchTotalRow?.cnt ?? 0);

      const [[matchProposedRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM matches WHERE status='proposed'`) as any;
      const matchProposed = Number(matchProposedRow?.cnt ?? 0);

      const [[matchMatchedRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM matches WHERE status='matched'`) as any;
      const matchMatched = Number(matchMatchedRow?.cnt ?? 0);

      const [[matchBothApprovedRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM matches WHERE approvedByA=1 AND approvedByB=1`) as any;
      const matchBothApproved = Number(matchBothApprovedRow?.cnt ?? 0);

      // ── Welcome journey stats ────────────────────────────────────────────────
      const [welcomeJourneyRows] = await db.execute(sql`
        SELECT 
          el.journeyKey,
          COUNT(DISTINCT el.leadId) as enrolled,
          SUM(CASE WHEN el.status='sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN el.status='pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN el.openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN el.clickCount > 0 THEN 1 ELSE 0 END) as clicked,
          el.emailIndex
        FROM email_log el
        WHERE el.journeyKey IN ('women_matchmaking_welcome', 'men_matchmaking_welcome')
        GROUP BY el.journeyKey, el.emailIndex
        ORDER BY el.journeyKey, el.emailIndex
      `) as any;

      // ── Registration trend (last 30 days) ────────────────────────────────────
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const [trendRows] = await db.execute(sql`
        SELECT FROM_UNIXTIME(createdAt/1000, '%Y-%m-%d') as day, COUNT(*) as cnt
        FROM singles WHERE isSeed=0 AND createdAt > ${thirtyDaysAgo}
        GROUP BY day ORDER BY day ASC
      `) as any;

      return {
        total, active, paid, questionnaireCompleted, hasPhoto,
        genderBreakdown: genderRows as any[],
        ageDistribution: ageRows as any[],
        cityDistribution: cityRows as any[],
        maritalStatus: maritalRows as any[],
        religiosity: religiosityRows as any[],
        dnaTypes: dnaRows as any[],
        matches: { total: matchTotal, proposed: matchProposed, matched: matchMatched, bothApproved: matchBothApproved },
        welcomeJourney: welcomeJourneyRows as any[],
        registrationTrend: trendRows as any[],
      };
    }),

    // סטטיסטיקות לדשבורד אדמין
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Page/event analytics
        const events = await db.select().from(analyticsEvents)
          .orderBy(desc(analyticsEvents.createdAt))
          .limit(1000);
        const byType: Record<string, number> = {};
        for (const e of events) {
          byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
        }
        // Email tracking stats per journey
        const emailStats = await db
          .select({
            journeyKey: emailLog.journeyKey,
            emailIndex: emailLog.emailIndex,
            total: sql<number>`COUNT(*)`,
            sent: sql<number>`SUM(CASE WHEN ${emailLog.status} = 'sent' THEN 1 ELSE 0 END)`,
            opened: sql<number>`SUM(CASE WHEN ${emailLog.openedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
            clicked: sql<number>`SUM(CASE WHEN ${emailLog.clickedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
            totalOpens: sql<number>`SUM(${emailLog.openCount})`,
            totalClicks: sql<number>`SUM(${emailLog.clickCount})`,
          })
          .from(emailLog)
          .groupBy(emailLog.journeyKey, emailLog.emailIndex)
          .orderBy(emailLog.journeyKey, emailLog.emailIndex);
        // UTM breakdown
        const utmStats = await db
          .select({
            utmSource: analyticsEvents.utmSource,
            utmCampaign: analyticsEvents.utmCampaign,
            count: sql<number>`COUNT(*)`,
          })
          .from(analyticsEvents)
          .where(isNotNull(analyticsEvents.utmSource))
          .groupBy(analyticsEvents.utmSource, analyticsEvents.utmCampaign)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(20);
        return { events, byType, total: events.length, emailStats, utmStats };
      }),

    // ── Sales by Channel (purchases with UTM attribution) ───────────────
    salesByChannel: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month", "quarter", "all"]).default("all"),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const period = input?.period ?? "all";
        let since = 0;
        if (period === "week") since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        else if (period === "month") since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        else if (period === "quarter") since = Date.now() - 90 * 24 * 60 * 60 * 1000;

        const salesResult = await db.execute(sql`
          SELECT 
            COALESCE(cl.product, wi.product, 'unknown') as product,
            cl.utmSource,
            cl.utmMedium,
            cl.utmCampaign,
            COUNT(*) as count
          FROM crm_leads cl
          LEFT JOIN webhook_idempotency wi ON wi.email = cl.email
          WHERE cl.paymentRef IS NOT NULL
            AND (${since} = 0 OR cl.createdAt > ${since})
          GROUP BY product, cl.utmSource, cl.utmMedium, cl.utmCampaign
          ORDER BY count DESC
        `);
        const rows = (salesResult as any)[0] as any[];
        return rows.map(r => ({
          product: r.product ?? 'unknown',
          utmSource: r.utmSource ?? null,
          utmMedium: r.utmMedium ?? null,
          utmCampaign: r.utmCampaign ?? null,
          count: Number(r.count),
        }));
      }),

    // ── Email Detail - per-email stats with recipients ───────────────
    emailDetail: protectedProcedure
      .input(z.object({
        journeyKey: z.string(),
        emailIndex: z.number(),
        period: z.enum(["week", "month", "quarter", "all"]).default("all"),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        let since = 0;
        if (input.period === "week") since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        else if (input.period === "month") since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        else if (input.period === "quarter") since = Date.now() - 90 * 24 * 60 * 60 * 1000;

        const emails = await db.select()
          .from(emailLog)
          .where(and(
            eq(emailLog.journeyKey, input.journeyKey),
            eq(emailLog.emailIndex, input.emailIndex),
            since > 0 ? sql`${emailLog.createdAt} > ${since}` : undefined,
          ))
          .orderBy(desc(emailLog.sentAt));

        // Get subject from first email
        const subject = emails[0]?.subject ?? '';

        // Aggregate stats
        const total = emails.length;
        const sent = emails.filter(e => e.status === 'sent').length;
        const pending = emails.filter(e => e.status === 'pending').length;
        const failed = emails.filter(e => e.status === 'failed').length;
        const opened = emails.filter(e => e.openedAt).length;
        const clicked = emails.filter(e => e.clickedAt).length;
        const totalOpens = emails.reduce((s, e) => s + (e.openCount ?? 0), 0);
        const totalClicks = emails.reduce((s, e) => s + (e.clickCount ?? 0), 0);

        // Get UTM data for recipients who converted
        const recipientEmails = emails.map(e => e.recipientEmail);
        let conversions: any[] = [];
        if (recipientEmails.length > 0) {
          const convResult = await db.execute(sql`
            SELECT cl.email, cl.utmSource, cl.utmCampaign, cl.product, cl.paymentRef,
                   s.id as singleId
            FROM crm_leads cl
            LEFT JOIN singles s ON s.email = cl.email
            WHERE cl.email IN (${sql.join(recipientEmails.slice(0, 500).map(e => sql`${e}`), sql`, `)})
              AND (cl.paymentRef IS NOT NULL OR s.id IS NOT NULL)
          `) as any;
          conversions = Array.isArray(convResult[0]) ? convResult[0] : convResult;
        }

        // Recipients list (last 50)
        const recipients = emails.slice(0, 50).map(e => ({
          email: e.recipientEmail,
          name: e.recipientName,
          status: e.status,
          sentAt: e.sentAt,
          openCount: e.openCount,
          clickCount: e.clickCount,
          openedAt: e.openedAt,
          clickedAt: e.clickedAt,
        }));

        return {
          journeyKey: input.journeyKey,
          emailIndex: input.emailIndex,
          subject,
          stats: { total, sent, pending, failed, opened, clicked, totalOpens, totalClicks },
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
          conversions,
          recipients,
        };
      }),

    // ── WhatsApp Group Stats ──────────────────────────────────────────
    waGroupStats: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month", "quarter", "all"]).default("month"),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const period = input?.period ?? "month";
        let since = 0;
        if (period === "week") since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        else if (period === "month") since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        else if (period === "quarter") since = Date.now() - 90 * 24 * 60 * 60 * 1000;

        // By source
        const sourceResult = await db.execute(sql`
          SELECT source, COUNT(*) as count
          FROM wa_clicks
          WHERE ${since} = 0 OR createdAt > ${since}
          GROUP BY source
          ORDER BY count DESC
        `) as any;
        const sourceRows = Array.isArray(sourceResult[0]) ? sourceResult[0] : sourceResult;

        // Daily trend
        const dailyResult = await db.execute(sql`
          SELECT FROM_UNIXTIME(createdAt/1000, '%Y-%m-%d') as day, source, COUNT(*) as count
          FROM wa_clicks
          WHERE ${since} = 0 OR createdAt > ${since}
          GROUP BY day, source
          ORDER BY day ASC
        `) as any;
        const dailyRows = Array.isArray(dailyResult[0]) ? dailyResult[0] : dailyResult;

        // Total
        const totalResult = await db.execute(sql`
          SELECT COUNT(*) as total FROM wa_clicks
          WHERE ${since} = 0 OR createdAt > ${since}
        `) as any;
        const totalArr = Array.isArray(totalResult[0]) ? totalResult[0] : totalResult;
        const totalRow = totalArr[0];

        return {
          total: Number(totalRow?.total ?? 0),
          bySource: (sourceRows as any[]).map((r: any) => ({ source: r.source, count: Number(r.count) })),
          daily: (dailyRows as any[]).map((r: any) => ({ day: r.day, source: r.source, count: Number(r.count) })),
        };
      }),

    // ── Journey Funnel with time filter ──────────────────────────────
    journeyFunnelFiltered: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month", "quarter", "all"]).default("all"),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const period = input?.period ?? "all";
        let since = 0;
        if (period === "week") since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        else if (period === "month") since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        else if (period === "quarter") since = Date.now() - 90 * 24 * 60 * 60 * 1000;

        const journeyResult = await db.execute(sql`
          SELECT 
            el.journeyKey,
            COUNT(DISTINCT el.leadId) as totalLeads,
            SUM(CASE WHEN el.status='sent' THEN 1 ELSE 0 END) as totalSent,
            SUM(CASE WHEN el.status='pending' THEN 1 ELSE 0 END) as totalPending,
            SUM(CASE WHEN el.status='failed' THEN 1 ELSE 0 END) as totalFailed,
            SUM(CASE WHEN el.openCount > 0 THEN 1 ELSE 0 END) as uniqueOpens,
            SUM(CASE WHEN el.clickCount > 0 THEN 1 ELSE 0 END) as uniqueClicks,
            SUM(el.openCount) as totalOpenCount,
            SUM(el.clickCount) as totalClickCount,
            COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN el.leadId END) as convertedToMatchmaking,
            COUNT(DISTINCT CASE WHEN cl.paymentRef IS NOT NULL THEN el.leadId END) as convertedToPurchase
          FROM email_log el
          LEFT JOIN crm_leads cl ON cl.id = el.leadId
          LEFT JOIN singles s ON s.email = cl.email
          WHERE ${since} = 0 OR el.createdAt > ${since}
          GROUP BY el.journeyKey
          ORDER BY totalLeads DESC
        `) as any;
        const journeyRows = Array.isArray(journeyResult[0]) ? journeyResult[0] : journeyResult;

        const emailIndexResult = await db.execute(sql`
          SELECT 
            journeyKey,
            emailIndex,
            subject,
            COUNT(*) as total,
            SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
            SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked,
            SUM(openCount) as totalOpens,
            SUM(clickCount) as totalClicks
          FROM email_log
          WHERE ${since} = 0 OR createdAt > ${since}
          GROUP BY journeyKey, emailIndex, subject
          ORDER BY journeyKey, emailIndex
        `) as any;
        const emailIndexRows = Array.isArray(emailIndexResult[0]) ? emailIndexResult[0] : emailIndexResult;

        return {
          journeys: journeyRows as any[],
          emailIndex: emailIndexRows as any[],
        };
      }),

    // ── Smart Alerts & Recommendations ──────────────────────────────
    alerts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const alerts: { type: 'error' | 'warning' | 'success' | 'info'; title: string; message: string; action?: string }[] = [];
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // 1. Check for failed emails in last 7 days
      const [[failedRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM email_log WHERE status='failed' AND createdAt > ${sevenDaysAgo}
      `) as any;
      const failedCount = Number(failedRow?.cnt ?? 0);
      if (failedCount > 0) {
        alerts.push({
          type: 'error',
          title: `${failedCount} מיילים נכשלו בשבוע האחרון`,
          message: 'בדוק את סיבת הכשלון - ייתכן שיש כתובות שגויות או בעיות bounce',
          action: 'עבור לטאב מסעות לפרטים',
        });
      }

      // 2. Check for leads without journey
      const [[noJourneyRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM crm_leads
        WHERE id NOT IN (SELECT DISTINCT leadId FROM email_log WHERE leadId IS NOT NULL)
          AND createdAt > ${sevenDaysAgo}
      `) as any;
      const noJourneyCount = Number(noJourneyRow?.cnt ?? 0);
      if (noJourneyCount > 0) {
        alerts.push({
          type: 'warning',
          title: `${noJourneyCount} לידים חדשים ללא מסע מיילים`,
          message: 'לידים שנכנסו בשבוע האחרון ולא נכנסו לאף מסע אוטומטי. בדוק אם חסר להם מגדר או מייל.',
          action: 'עבור לטאב ללא מסע',
        });
      }

      // 3. Check low open rates
      const [lowOpenRows] = await db.execute(sql`
        SELECT journeyKey, emailIndex,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened
        FROM email_log
        WHERE createdAt > ${sevenDaysAgo} AND status = 'sent'
        GROUP BY journeyKey, emailIndex
        HAVING sent >= 5 AND (opened / sent) < 0.15
      `) as any;
      for (const row of (lowOpenRows as any[])) {
        const openRate = Math.round((Number(row.opened) / Number(row.sent)) * 100);
        const jLabel = (JOURNEY_LABELS_SERVER as any)[row.journeyKey] ?? row.journeyKey;
        alerts.push({
          type: 'warning',
          title: `שיעור פתיחה נמוך: ${openRate}%`,
          message: `מייל ${row.emailIndex} במסע "${jLabel}" - שקול לשנות את כותרת הנושא או התוכן`,
        });
      }

      // 4. Check high bounce rate
      const [[bounceRow]] = await db.execute(sql`
        SELECT 
          SUM(CASE WHEN status='failed' AND errorMessage IN ('hard_bounce','soft_bounce','invalid_email') THEN 1 ELSE 0 END) as bounced,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent
        FROM email_log WHERE createdAt > ${sevenDaysAgo}
      `) as any;
      const bounced = Number(bounceRow?.bounced ?? 0);
      const sentRecent = Number(bounceRow?.sent ?? 0);
      if (sentRecent > 10 && bounced / sentRecent > 0.05) {
        alerts.push({
          type: 'error',
          title: `שיעור bounce גבוה: ${Math.round(bounced/sentRecent*100)}%`,
          message: `${bounced} מיילים חזרו (מתוך ${sentRecent} שנשלחו). בדוק את איכות רשימת התפוצה.`,
        });
      }

      // 5. Good news - high performing emails
      const [highPerformRows] = await db.execute(sql`
        SELECT journeyKey, emailIndex,
          SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log
        WHERE createdAt > ${sevenDaysAgo} AND status = 'sent'
        GROUP BY journeyKey, emailIndex
        HAVING sent >= 5 AND (clicked / sent) > 0.10
      `) as any;
      for (const row of (highPerformRows as any[])) {
        const clickRate = Math.round((Number(row.clicked) / Number(row.sent)) * 100);
        const jLabel = (JOURNEY_LABELS_SERVER as any)[row.journeyKey] ?? row.journeyKey;
        alerts.push({
          type: 'success',
          title: `מייל עם קליקים גבוהים: ${clickRate}%`,
          message: `מייל ${row.emailIndex} במסע "${jLabel}" משיג ביצועים מעולים - שמור על הנוסחה הזו!`,
        });
      }

      // 6. Unsubscribes in last 7 days
      const [[unsubRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM crm_leads
        WHERE emailUnsubscribed = 1 AND emailUnsubscribedAt > ${sevenDaysAgo}
      `) as any;
      const unsubCount = Number(unsubRow?.cnt ?? 0);
      if (unsubCount > 0) {
        alerts.push({
          type: 'info',
          title: `${unsubCount} אנשים הסירו עצמם השבוע`,
          message: 'בדוק אם יש מגמה - אם הרבה מסירים אחרי מייל מסוים, שקול לשנות את התוכן.',
        });
      }

      // 7. Pending emails stuck (scheduled > 1 hour ago but not sent)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const [[stuckRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM email_log
        WHERE status = 'pending' AND scheduledAt < ${oneHourAgo}
      `) as any;
      const stuckCount = Number(stuckRow?.cnt ?? 0);
      if (stuckCount > 0) {
        alerts.push({
          type: 'error',
          title: `${stuckCount} מיילים תקועים`,
          message: 'מיילים שהיו אמורים להישלח אבל לא נשלחו. ייתכן שיש תקלה בשרת Brevo.',
          action: 'בדוק את חיבור Brevo',
        });
      }

      return alerts;
    }),

    // ── Behavior Tracking Stats (Hotjar-style) ───────────────────────
    behaviorStats: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month", "quarter", "all"]).default("month"),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const period = input?.period ?? "month";
        let since = 0;
        if (period === "week") since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        else if (period === "month") since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        else if (period === "quarter") since = Date.now() - 90 * 24 * 60 * 60 * 1000;

        // Page views by page
        const pvResult = await db.execute(sql`
          SELECT page, COUNT(*) as views
          FROM analytics_events
          WHERE eventType = 'page_view'
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page
          ORDER BY views DESC
          LIMIT 20
        `) as any;
        const pageViewRows = Array.isArray(pvResult[0]) ? pvResult[0] : pvResult;

        // Button clicks by page + metadata
        const bcResult = await db.execute(sql`
          SELECT page, metadata, COUNT(*) as clicks
          FROM analytics_events
          WHERE eventType = 'button_click'
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page, metadata
          ORDER BY clicks DESC
          LIMIT 30
        `) as any;
        const buttonClickRows = Array.isArray(bcResult[0]) ? bcResult[0] : bcResult;

        // Scroll depth distribution
        const sdResult = await db.execute(sql`
          SELECT page, metadata, COUNT(*) as cnt
          FROM analytics_events
          WHERE eventType = 'scroll_depth'
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page, metadata
          ORDER BY page, metadata
        `) as any;
        const scrollRows = Array.isArray(sdResult[0]) ? sdResult[0] : sdResult;

        // Form starts vs submits (conversion)
        const fResult = await db.execute(sql`
          SELECT page, eventType, COUNT(*) as cnt
          FROM analytics_events
          WHERE eventType IN ('form_start', 'form_submit')
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page, eventType
          ORDER BY page
        `) as any;
        const formRows = Array.isArray(fResult[0]) ? fResult[0] : fResult;

        // CTA clicks
        const ctaResult = await db.execute(sql`
          SELECT page, eventType, COUNT(*) as cnt
          FROM analytics_events
          WHERE eventType IN ('database_cta', 'course_cta', 'coaching_cta', 'free_guide_cta', 'product_click', 'intro_meeting_click')
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page, eventType
          ORDER BY cnt DESC
          LIMIT 30
        `) as any;
        const ctaRows = Array.isArray(ctaResult[0]) ? ctaResult[0] : ctaResult;

        // Section views (which sections people see)
        const svResult = await db.execute(sql`
          SELECT page, metadata, COUNT(*) as views
          FROM analytics_events
          WHERE eventType = 'section_view'
            AND (${since} = 0 OR createdAt > ${since})
          GROUP BY page, metadata
          ORDER BY views DESC
          LIMIT 30
        `) as any;
        const sectionRows = Array.isArray(svResult[0]) ? svResult[0] : svResult;

        return {
          pageViews: (pageViewRows as any[]).map((r: any) => ({ page: r.page, views: Number(r.views) })),
          buttonClicks: (buttonClickRows as any[]).map((r: any) => ({ page: r.page, metadata: r.metadata, clicks: Number(r.clicks) })),
          scrollDepth: (scrollRows as any[]).map((r: any) => ({ page: r.page, metadata: r.metadata, count: Number(r.cnt) })),
          formConversion: (formRows as any[]).map((r: any) => ({ page: r.page, eventType: r.eventType, count: Number(r.cnt) })),
          ctaClicks: (ctaRows as any[]).map((r: any) => ({ page: r.page, eventType: r.eventType, count: Number(r.cnt) })),
          sectionViews: (sectionRows as any[]).map((r: any) => ({ page: r.page, metadata: r.metadata, views: Number(r.views) })),
        };
      }),
  }),
  // ── Profile Update Requests ─────────────────────────────────────────────
  profileUpdates: router({
    // Single submits a profile update request
    submit: publicProcedure
      .input(z.object({
        token: z.string(),
        changes: z.object({
          height: z.number().optional(),
          education: z.enum(["high_school", "vocational", "technician", "student", "bachelor", "master", "phd", "other"]).optional(),
          religiosity: z.enum(["secular", "traditional", "religious", "orthodox"]).optional(),
          occupation: z.string().optional(),
          aboutMe: z.string().optional(),
          partnerDescription: z.string().optional(),
          city: z.string().optional(),
          maritalStatus: z.enum(["single", "divorced", "widowed"]).optional(),
          wantsChildren: z.enum(["yes", "no", "open"]).optional(),
          hasChildren: z.boolean().optional(),
          numberOfChildren: z.number().optional(),
          hasPets: z.boolean().optional(),
          petType: z.string().optional(),
          acceptsPets: z.boolean().optional(),
          locationFlexibility: z.string().optional(),
          minAgePreference: z.number().optional(),
          maxAgePreference: z.number().optional(),
          minHeightPreference: z.number().optional(),
          maxHeightPreference: z.number().optional(),
          partnerReligiosity: z.string().optional(),
          stepParentOpenness: z.enum(["yes", "open", "no"]).optional(),
          relationshipPace: z.enum(["slow", "medium", "fast"]).optional(),
          photoUrl: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [single] = await db.select({ id: singles.id, firstName: singles.firstName, lastName: singles.lastName, email: singles.email })
          .from(singles).where(eq(singles.questionnaireToken, input.token)).limit(1);
        if (!single) throw new TRPCError({ code: "NOT_FOUND", message: "פרופיל לא נמצא" });
        const { profileUpdateRequests } = await import("../drizzle/schema");
        // Cancel any existing pending request
        await db.delete(profileUpdateRequests).where(
          and(eq(profileUpdateRequests.singleId, single.id), eq(profileUpdateRequests.status, "pending"))
        );
        const { photoUrl, ...otherChanges } = input.changes;
        await db.insert(profileUpdateRequests).values({
          singleId: single.id,
          changesJson: JSON.stringify(otherChanges),
          pendingPhotoUrl: photoUrl ?? null,
          status: "pending",
          createdAt: Date.now(),
        });
        // notifyOwner removed — profile update requests no longer send email/push
        // (was: notifyOwner with title 'בקשת עדכון פרופיל')
        return { success: true };
      }),
    // Get pending request for a single (by token)
    getMyPending: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [single] = await db.select({ id: singles.id }).from(singles)
          .where(eq(singles.questionnaireToken, input.token)).limit(1);
        if (!single) return null;
        const { profileUpdateRequests } = await import("../drizzle/schema");
        const [req] = await db.select().from(profileUpdateRequests)
          .where(and(eq(profileUpdateRequests.singleId, single.id), eq(profileUpdateRequests.status, "pending")))
          .orderBy(desc(profileUpdateRequests.createdAt)).limit(1);
        return req ?? null;
      }),
    // Admin: get all pending requests
    getAllPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { profileUpdateRequests } = await import("../drizzle/schema");
      return db.select({
        req: profileUpdateRequests,
        single: { id: singles.id, firstName: singles.firstName, lastName: singles.lastName, email: singles.email, photoUrl: singles.photoUrl, city: singles.city, age: singles.age },
      }).from(profileUpdateRequests)
        .innerJoin(singles, eq(profileUpdateRequests.singleId, singles.id))
        .where(eq(profileUpdateRequests.status, "pending"))
        .orderBy(desc(profileUpdateRequests.createdAt));
    }),
    // Admin: approve or reject
    review: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        action: z.enum(["approve", "reject"]),
        adminNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { profileUpdateRequests } = await import("../drizzle/schema");
        const [req] = await db.select().from(profileUpdateRequests)
          .where(eq(profileUpdateRequests.id, input.requestId)).limit(1);
        if (!req) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.action === "approve") {
          const changes = JSON.parse(req.changesJson || "{}");
          const updateData: Record<string, unknown> = {};
          if (changes.height !== undefined) updateData.height = changes.height;
          if (changes.education !== undefined) updateData.education = changes.education;
          if (changes.religiosity !== undefined) updateData.religiosity = changes.religiosity;
          if (changes.occupation !== undefined) updateData.occupation = changes.occupation;
          if (changes.aboutMe !== undefined) updateData.about = changes.aboutMe;
          if (changes.partnerDescription !== undefined) updateData.partnerDescription = changes.partnerDescription;
          if (changes.city !== undefined) updateData.city = changes.city;
          if (changes.maritalStatus !== undefined) updateData.maritalStatus = changes.maritalStatus;
          if (changes.wantsChildren !== undefined) updateData.wantsKids = changes.wantsChildren;
          if (changes.hasChildren !== undefined) updateData.hasKids = changes.hasChildren;
          if (changes.numberOfChildren !== undefined) updateData.numKids = changes.numberOfChildren;
          if (changes.hasPets !== undefined) updateData.hasPets = changes.hasPets;
          if (changes.petType !== undefined) updateData.petType = changes.petType;
          if (changes.acceptsPets !== undefined) updateData.acceptsPets = changes.acceptsPets;
          if (changes.locationFlexibility !== undefined) updateData.locationFlexibility = changes.locationFlexibility;
          if (changes.minAgePreference !== undefined) updateData.minAgePreference = changes.minAgePreference;
          if (changes.maxAgePreference !== undefined) updateData.maxAgePreference = changes.maxAgePreference;
          if (changes.minHeightPreference !== undefined) updateData.minHeightPreference = changes.minHeightPreference;
          if (changes.maxHeightPreference !== undefined) updateData.maxHeightPreference = changes.maxHeightPreference;
          if (changes.partnerReligiosity !== undefined) updateData.partnerReligiosity = changes.partnerReligiosity;
          if (changes.stepParentOpenness !== undefined) updateData.stepParentOpenness = changes.stepParentOpenness;
          if (changes.relationshipPace !== undefined) updateData.relationshipPace = changes.relationshipPace;
          if (req.pendingPhotoUrl) updateData.photoUrl = req.pendingPhotoUrl;
          if (Object.keys(updateData).length > 0) {
            await db.update(singles).set(updateData).where(eq(singles.id, req.singleId));
          }
        }
        await db.update(profileUpdateRequests).set({
          status: input.action === "approve" ? "approved" : "rejected",
          adminNote: input.adminNote ?? null,
          reviewedAt: Date.now(),
        }).where(eq(profileUpdateRequests.id, input.requestId));
        return { success: true };
      }),
  }),

  // ── Live Events ────────────────────────────────────────────────────────────
  events: router({
    registerLiveEvent: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { liveEventRegistrations } = await import("../drizzle/schema");

        // Save registration
        await db.insert(liveEventRegistrations).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          createdAt: Date.now(),
        });

        const ZOOM_LINK = "https://us06web.zoom.us/j/86584508771?pwd=XYV0VbPuuGMmaxdMHoOpCa8mmFxx2n.1";
        const PAID_GUIDE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/Hilit_Caspi_Paid_Guide_6518dc09.pdf";
        const firstName = input.name.split(" ")[0];

        // Send confirmation email with Zoom link + guide
        const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f0eadc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: #191265; padding: 40px 30px; text-align: center; }
  .header h1 { color: #ffe27c; margin: 0; font-size: 24px; }
  .header p { color: rgba(255,255,255,0.7); margin: 8px 0 0; }
  .body { padding: 40px 30px; }
  .body h2 { color: #191265; font-size: 22px; }
  .body p { color: #555; line-height: 1.7; }
  .cta { display: block; background: #ffe27c; color: #191265; text-decoration: none; font-weight: bold; padding: 16px 32px; border-radius: 12px; text-align: center; margin: 24px 0; font-size: 16px; }
  .guide-box { background: #f0eadc; border: 2px solid #ffe27c; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .guide-box h3 { color: #191265; margin: 0 0 8px; }
  .guide-box p { color: #727272; margin: 0 0 12px; font-size: 14px; }
  .footer { background: #191265; padding: 24px; text-align: center; }
  .footer p { color: rgba(255,255,255,0.5); font-size: 12px; margin: 0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>💛 נרשמת בהצלחה!</h1>
      <p>לייב שאלות ותשובות עם הילית כספי</p>
    </div>
    <div class="body">
      <h2>היי ${firstName},</h2>
      <p>כל הכבוד! נרשמת ללייב שאלות ותשובות עם הילית כספי.</p>
      <p><strong>יום שלישי, 16 ביוני 2026 | 20:30</strong></p>
      <a href="${ZOOM_LINK}" class="cta">🎥 כניסה לזום ←</a>
      <p style="font-size:13px;color:#999;text-align:center">Meeting ID: 865 8450 8771 | Passcode: 696071</p>

      <div class="guide-box">
        <h3>🎁 המדריך שלך מוכן!</h3>
        <p>"לבחור נכון" — המדריך המעשי לזוגיות (שווי ₪249) — הנה הלינק שלך:</p>
        <a href="${PAID_GUIDE_URL}" class="cta" style="background:#191265;color:white">📖 לקריאת המדריך ←</a>
      </div>

      <p>מחכה לראות אותך בלייב! 💛</p>
      <p>הילית כספי<br>מאמנת ומשדכת | Relationship Expert & Matchmaker</p>
    </div>
    <div class="footer">
      <p>© 2026 הילית כספי | hilitcaspi.com</p>
    </div>
  </div>
</body>
</html>`;

        await sendEmail({
          to: { email: input.email, name: input.name },
          subject: "💛 נרשמת! הנה הלינק לזום + המדריך שלך",
          htmlContent: emailHtml,
          textContent: `היי ${firstName},\n\nנרשמת ללייב שאלות ותשובות עם הילית כספי!\n\nיום שלישי, 16.6.2026 | 20:30\nלינק לזום: ${ZOOM_LINK}\nMeeting ID: 865 8450 8771 | Passcode: 696071\n\nהמדריך שלך: ${PAID_GUIDE_URL}\n\nמחכה לראות אותך!\nהילית`,
        });

        // Update guideSent + confirmationSent
        await db.update(liveEventRegistrations)
          .set({ guideSent: true, confirmationSent: true })
          .where(eq(liveEventRegistrations.email, input.email));

        // notifyOwner removed — live event registration no longer sends email/push

        return { success: true };
      }),

    getSpotsLeft: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { spotsLeft: 50, total: 50, registered: 0 };
      const { liveEventRegistrations } = await import("../drizzle/schema");
      const rows = await db.select().from(liveEventRegistrations);
      const spotsLeft = Math.max(0, 50 - rows.length);
      return { spotsLeft, total: 50, registered: rows.length };
    }),

    getLiveRegistrations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { liveEventRegistrations } = await import("../drizzle/schema");
      const rows = await db.select().from(liveEventRegistrations).orderBy(desc(liveEventRegistrations.createdAt));
      return rows;
    }),
  }),

  // ─── Discount Coupons ─────────────────────────────────────────────────────
  coupons: router({
    // Public: validate a coupon code before payment
    validate: publicProcedure
      .input(z.object({
        code: z.string().min(1).max(50),
        product: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false as const, error: "שגיאת שרת" };
        const { discountCodes } = await import("../drizzle/schema");
        const [code] = await db.select().from(discountCodes)
          .where(eq(discountCodes.code, input.code.toUpperCase()))
          .limit(1);
        if (!code) return { valid: false as const, error: "קוד קופון לא נמצא" };
        if (!code.isActive) return { valid: false as const, error: "קוד קופון אינו פעיל" };
        if (code.expiresAt && code.expiresAt < Date.now()) return { valid: false as const, error: "קוד הקופון פג תוקף" };
        if (code.maxUses !== null && code.maxUses !== undefined && code.usedCount >= code.maxUses) return { valid: false as const, error: "קוד הקופון מוצה" };
        if (code.product && input.product && code.product !== input.product) return { valid: false as const, error: "קוד קופון זה אינו תקף למוצר זה" };
        return {
          valid: true as const,
          discountPercent: code.discountPercent ?? undefined,
          discountAmount: code.discountAmount ?? undefined,
          fixedPrice: code.fixedPrice ?? undefined,
          code: code.code,
        };
      }),
    // Admin: list all coupons
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { discountCodes } = await import("../drizzle/schema");
      return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    }),
    // Admin: create a coupon
    create: protectedProcedure
      .input(z.object({
        code: z.string().min(2).max(50),
        discountPercent: z.number().min(1).max(100).optional(),
        discountAmount: z.number().min(1).optional(),
        product: z.string().optional(),
        maxUses: z.number().min(1).optional(),
        expiresAt: z.number().optional(),
        note: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { discountCodes } = await import("../drizzle/schema");
        await db.insert(discountCodes).values({
          code: input.code.toUpperCase(),
          discountPercent: input.discountPercent ?? null,
          discountAmount: input.discountAmount ?? null,
          product: input.product ?? null,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ?? null,
          note: input.note ?? null,
          createdAt: Date.now(),
        });
        return { success: true };
      }),
    // Admin: toggle active status
    toggle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { discountCodes } = await import("../drizzle/schema");
        const [existing] = await db.select().from(discountCodes).where(eq(discountCodes.id, input.id)).limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        await db.update(discountCodes).set({ isActive: !existing.isActive }).where(eq(discountCodes.id, input.id));
        return { success: true };
      }),
    // Public: save a payment lead (name + email + phone) for tracking
    saveLead: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(9),
        product: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const { paymentLeads } = await import("../drizzle/schema");
        // Upsert by email+product — avoid duplicate rows on re-attempts
        await db.insert(paymentLeads).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          product: input.product,
          createdAt: Date.now(),
        }).onDuplicateKeyUpdate({ set: { name: input.name, phone: input.phone, createdAt: Date.now() } });
        return { success: true };
      }),
  }),

  // ─── Grow SDK Payment ──────────────────────────────────────────────────────
  // Creates a payment process on Grow's server and returns an authCode for the
  // frontend SDK to open the inline wallet (no redirect to pay.grow.link).
  payment: router({
    createProcess: publicProcedure
      .input(z.object({
        product: z.enum(["database", "guide", "course", "coaching", "coaching_mas", "session", "bundle_tubav"]),
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        // Client passes coupon code; server validates and computes final price
        couponCode: z.string().max(50).optional(),
        // UTM tracking
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(200).optional(),
        utmContent: z.string().max(200).optional(),
        // GA4 client_id from browser _ga cookie — enables DebugView and accurate user stitching
        ga4ClientId: z.string().max(100).optional(),
        // GA4 session_id from _ga_ZH1CYQCTMN cookie — required for campaign_details UTM attribution
        ga4SessionId: z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        const { createPaymentProcess, PRODUCT_CONFIGS } = await import("./growPayment");
        const db = await getDb();

        // Server-side coupon validation — never trust client-supplied price
        let finalSum: number | undefined = undefined;
        if (input.couponCode && db) {
          const { discountCodes } = await import("../drizzle/schema");
          const [code] = await db.select().from(discountCodes)
            .where(eq(discountCodes.code, input.couponCode.toUpperCase()))
            .limit(1);
          if (code && code.isActive &&
            (!code.expiresAt || code.expiresAt > Date.now()) &&
            (code.maxUses === null || code.maxUses === undefined || code.usedCount < code.maxUses) &&
            (!code.product || code.product === input.product)) {
            const basePrice = PRODUCT_CONFIGS[input.product]?.sum ?? 0;
            if (code.fixedPrice) {
              finalSum = code.fixedPrice;
            } else if (code.discountAmount) {
              finalSum = Math.max(1, basePrice - code.discountAmount);
            } else if (code.discountPercent) {
              finalSum = Math.max(1, Math.round(basePrice * (1 - code.discountPercent / 100)));
            }
            // Increment usage counter
            await db.update(discountCodes)
              .set({ usedCount: (code.usedCount ?? 0) + 1 })
              .where(eq(discountCodes.id, code.id));
          }
        }

        // Save/update UTM + ga4ClientId + ga4SessionId in crm_leads so the webhook can use them later
        if (db && (input.utmSource || input.utmMedium || input.utmCampaign || input.ga4ClientId || input.ga4SessionId)) {
          try {
            const { crmLeads: crmLeadsTable } = await import("../drizzle/schema");
            // Upsert: update existing lead or insert new one
            const [existing] = await db.select().from(crmLeadsTable)
              .where(eq(crmLeadsTable.email, input.email))
              .limit(1);
            if (existing) {
              await db.update(crmLeadsTable)
                .set({
                  utmSource: input.utmSource || existing.utmSource,
                  utmMedium: input.utmMedium || existing.utmMedium,
                  utmCampaign: input.utmCampaign || existing.utmCampaign,
                  utmContent: input.utmContent || existing.utmContent,
                  // Always overwrite ga4ClientId and ga4SessionId with the freshest browser values
                  ...(input.ga4ClientId ? { ga4ClientId: input.ga4ClientId } : {}),
                  ...(input.ga4SessionId ? { ga4SessionId: input.ga4SessionId } : {}),
                  updatedAt: Date.now(),
                })
                .where(eq(crmLeadsTable.email, input.email));
            } else {
              // Map product to valid crm product enum (session not in crm enum, use null)
              const crmProduct = (["database", "guide", "course", "coaching", "coaching_mas"] as const)
                .includes(input.product as any)
                ? (input.product as "database" | "guide" | "course" | "coaching" | "coaching_mas")
                : undefined;
              await db.insert(crmLeadsTable).values({
                name: input.fullName,
                email: input.email,
                phone: input.phone,
                product: crmProduct,
                source: "direct",
                status: "new_lead",
                utmSource: input.utmSource,
                utmMedium: input.utmMedium,
                utmCampaign: input.utmCampaign,
                utmContent: input.utmContent,
                ga4ClientId: input.ga4ClientId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          } catch (e) {
            console.error("[createProcess] Failed to save UTM/GA4 to CRM:", e);
          }
        }

        const result = await createPaymentProcess({ ...input, sum: finalSum });
        return result; // { authCode, processToken? }
      }),

    // Client reports SDK-level payment failure (onFailure callback from Grow SDK)
    reportFailure: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerEmail: z.string(),
        customerPhone: z.string().optional(),
        product: z.string(),
        amount: z.number().optional(),
        errorMessage: z.string().optional(),
        stage: z.enum(["createProcess", "doPayment", "sdk_failure"]),
        processToken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Log full payment failure details for debugging (visible in server logs)
        const failLog = `[PaymentFailure] ${input.stage} | ${input.product} | ${input.customerName} | ${input.customerEmail} | processToken: ${input.processToken || 'N/A'} | error: ${input.errorMessage || 'N/A'}`;
        console.log(failLog);
        addToPaymentLogBuffer(failLog);
        const { notifyPaymentFailure } = await import("./paymentFailureAlert");
        await notifyPaymentFailure({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          product: input.product,
          amount: input.amount,
          errorMessage: input.errorMessage,
          stage: input.stage,
          processToken: input.processToken,
        });
        return { ok: true };
      }),

    logStep: publicProcedure
      .input(z.object({
        product: z.string(),
        step: z.string(),
        detail: z.string().optional(),
        email: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const msg = `[PaymentStep] ${input.product} | ${input.step} | ${input.email || 'N/A'} | ${input.detail || ''}`;
        console.log(msg);
        addToPaymentLogBuffer(msg);
        return { ok: true };
      }),

    // Retrieve recent payment/proxy logs from in-memory buffer (secured by secret key)
    getLogs: publicProcedure
      .input(z.object({ last: z.number().min(1).max(200).default(50), key: z.string() }))
      .query(async ({ input }) => {
        if (input.key !== (process.env.JWT_SECRET || '').slice(0, 16)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid key' });
        return { logs: getPaymentLogBuffer(input.last) };
      }),
  }),
});
export type AppRouter = typeof appRouter;
