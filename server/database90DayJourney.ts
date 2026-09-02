import { and, eq, gte, inArray } from "drizzle-orm";
import { emailLog, matches, singles } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { getDb } from "./db";
import { getMissingProfileFields } from "./matchmakingMetrics";
import { buildSignedUnsubscribeUrl, isEmailMarketingSuppressed } from "./emailUnsubscribe";

const SITE_BASE = "https://hilitcaspi.com";
const JOURNEY_KEY = "database_90_day_v1";
const DAY_MS = 24 * 60 * 60 * 1000;
// Prevent the first deployment from sending historical stages to the entire database.
export const DATABASE_90_DAY_LAUNCH_AT = Date.UTC(2026, 7, 22, 0, 0, 0);

export const DATABASE_90_DAY_STAGES = [
  { index: 1, day: 3 },
  { index: 2, day: 7 },
  { index: 3, day: 14 },
  { index: 4, day: 30 },
  { index: 5, day: 60 },
  { index: 6, day: 90 },
] as const;

type JourneySingle = typeof singles.$inferSelect;
type JourneyMatch = Pick<typeof matches.$inferSelect,
  "id" | "singleAId" | "singleBId" | "proposedAt" | "approvedByA" | "approvedByB" |
  "matchedAt" | "matchDetailStatus" | "approvalTokenA" | "approvalTokenB"
>;

type JourneyStats = {
  proposals: number;
  mutualApprovals: number;
  meetings: number;
  endedMatches: number;
  positiveOutcomes: number;
  latestOutcomeUrl: string | null;
};

export type DatabaseUpsellOffer = "none" | "community" | "single_session" | "coaching";

export function selectDatabaseUpsellOffer(
  day: number,
  stats: JourneyStats,
  missing: string[],
): DatabaseUpsellOffer {
  if (missing.length > 0 || stats.positiveOutcomes > 0) return "none";
  if (day <= 14 && stats.proposals === 0) return "community";
  if (day >= 60 && (stats.endedMatches > 0 || (stats.mutualApprovals > 0 && stats.meetings === 0))) return "coaching";
  if (day >= 30 && (stats.proposals === 0 || stats.mutualApprovals === 0)) return "single_session";
  if (day >= 90) return "coaching";
  return "none";
}

function upsellBlock(offer: DatabaseUpsellOffer): string {
  if (offer === "community") {
    return `<div style="margin:24px 0;padding:18px;border:1px solid #ded9cc;border-radius:14px;background:#faf9f6"><strong>בינתיים אפשר להישאר קרובים</strong><p style="margin:8px 0">בקבוצת התוכן עולים חיבורים, עדכונים וכלים לזוגיות. ההצטרפות אינה משנה את מקומך במאגר.</p>${cta(`${SITE_BASE}/api/wa/group`, "הצטרפות לקבוצת התוכן")}</div>`;
  }
  if (offer === "single_session") {
    return `<div style="margin:24px 0;padding:18px;border:1px solid #f0d86d;border-radius:14px;background:#fff9dc"><strong>רוצה שנבחן יחד מה אפשר לדייק?</strong><p style="margin:8px 0">פגישה אישית היא שירות נפרד ואופציונלי לבדיקת הפרופיל, ההעדפות והאסטרטגיה שלך. היא אינה רכישה של התאמה ואינה מבטיחה התאמה.</p>${cta(`${SITE_BASE}/single-session?utm_source=database&utm_medium=email&utm_campaign=behavioral_upsell&utm_content=single_session`, "פרטים על פגישה אישית")}</div>`;
  }
  if (offer === "coaching") {
    return `<div style="margin:24px 0;padding:18px;border:1px solid #c9c4ef;border-radius:14px;background:#f5f3ff"><strong>כשיש דפוס שחוזר — אפשר לעבוד עליו לעומק</strong><p style="margin:8px 0">הליווי האישי הוא שירות נפרד מהמאגר. הוא מתאים למי שרוצה לעבוד על בחירה, תקשורת, פתיחות והתקדמות בתוך קשר — ולא לקנות יותר התאמות.</p>${cta(`${SITE_BASE}/coaching?utm_source=database&utm_medium=email&utm_campaign=behavioral_upsell&utm_content=coaching`, "פרטים על תהליך ליווי")}</div>`;
  }
  return "";
}

function profileUrl(single: JourneySingle): string {
  if (!single.questionnaireToken) return `${SITE_BASE}/join`;
  return `${SITE_BASE}/my-profile?email=${encodeURIComponent(single.email || "")}&token=${encodeURIComponent(single.questionnaireToken)}`;
}

function questionnaireUrl(single: JourneySingle): string {
  if (!single.questionnaireToken) return `${SITE_BASE}/join`;
  return `${SITE_BASE}/join/questionnaire?token=${encodeURIComponent(single.questionnaireToken)}`;
}

function emailFrame(content: string, email: string): string {
  const unsubscribeUrl = buildSignedUnsubscribeUrl({ email });
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f0eadc;font-family:Arial,sans-serif;color:#191265"><div style="max-width:620px;margin:0 auto;background:#fff"><div style="background:#191265;padding:28px 36px;text-align:center"><div style="color:#ffe27c;font-size:22px;font-weight:900">הילית כספי</div><div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:5px">מאגר הרווקים והרווקות</div></div><div style="padding:34px;line-height:1.8;font-size:16px">${content}</div><div style="background:#191265;padding:20px 32px;text-align:center;color:rgba(255,255,255,.55);font-size:12px">הילית כספי | <a href="${unsubscribeUrl}" style="color:#ffe27c">הסרה ממסרים שיווקיים</a></div></div></body></html>`;
}

function cta(url: string, label: string): string {
  return `<a href="${url}" style="display:block;background:#ffe27c;color:#191265!important;font-weight:800;text-align:center;padding:15px 24px;border-radius:12px;text-decoration:none;margin:24px 0">${label}</a>`;
}

export function buildDatabase90DayEmail(
  stageIndex: number,
  single: JourneySingle,
  stats: JourneyStats,
  missing: string[],
): { subject: string; htmlBody: string; textBody: string; skipReason?: string } {
  const firstName = single.firstName || "היי";
  const personalProfileUrl = profileUrl(single);
  const frame = (content: string) => emailFrame(content, single.email || "");

  if (stageIndex === 1 && missing.length === 0) {
    return { subject: "הפרופיל מלא", htmlBody: "", textBody: "", skipReason: "profile_complete" };
  }

  if (stageIndex === 1) {
    const missingText = missing.join(", ");
    const url = questionnaireUrl(single);
    return {
      subject: `${firstName}, נשארו כמה פרטים כדי שנוכל להתאים לך נכון`,
      htmlBody: frame(`<h2 style="font-size:24px">${firstName}, הפרופיל עדיין לא מלא</h2><p>כדי שנוכל לבדוק התאמות באופן רציני והדדי, חסרים כרגע: <strong>${missingText}</strong>.</p><p>פרופיל מלא עוזר לנו להבין לא רק מי מתאים לך, אלא גם למי את/ה מתאים/ה.</p>${cta(url, "השלמת הפרטים והשאלון")}<p style="font-size:13px;color:#777">התשלום אינו התחייבות למספר התאמות או לתדירות קבועה. התאמה נשלחת כאשר נמצאת התאמה הדדית ורלוונטית.</p>`),
      textBody: `${firstName}, חסרים בפרופיל: ${missingText}. להשלמה: ${url}`,
    };
  }

  if (stageIndex === 2) {
    return {
      subject: `${firstName}, כך פועל תהליך ההתאמה במאגר`,
      htmlBody: frame(`<h2 style="font-size:24px">התאמה טובה צריכה לעבוד לשני הכיוונים</h2><p>אנחנו לא שולחים שמות כדי לעמוד במכסה. כל הצעה נבדקת לפי גיל, אזור, אורח חיים, רצון בילדים, ערכים, שאלון מדעי והעדפות הדדיות.</p><p><strong>299 ש״ח הם דמי הצטרפות למאגר ולתהליך ההתאמה המקצועי.</strong> הם אינם שירות אישי צמוד ואינם התחייבות לכמות או לתדירות קבועה.</p><p>מטרת העל שלנו היא להגדיל בהתמדה את מספר ההזדמנויות המתאימות — בלי להחליף איכות בכמות.</p>${cta(personalProfileUrl, "כניסה לאזור האישי")}`),
      textBody: `${firstName}, כל הצעה נבדקת לשני הכיוונים. אין התחייבות לכמות או לתדירות קבועה. אזור אישי: ${personalProfileUrl}`,
    };
  }

  if (stageIndex === 3) {
    const hasProposals = stats.proposals > 0;
    const offer = selectDatabaseUpsellOffer(14, stats, missing);
    return {
      subject: hasProposals ? `${firstName}, עדכון על ההזדמנויות שלך במאגר` : `${firstName}, הפרופיל פעיל ואנחנו ממשיכים לחפש`,
      htmlBody: frame(hasProposals
        ? `<h2 style="font-size:24px">הפרופיל שלך פעיל</h2><p>עד עכשיו נשלחו עבורך <strong>${stats.proposals}</strong> הצעות התאמה. אנחנו ממשיכים לבדוק הזדמנויות נוספות לפי ההתאמה ההדדית.</p>${cta(personalProfileUrl, "צפייה באזור האישי")}`
        : `<h2 style="font-size:24px">הפרופיל שלך פעיל במאגר</h2><p>עדיין לא נשלחה הצעה. זה לא אומר שהפרופיל נשכח: המערכת והצוות ממשיכים לבדוק התאמות, אך לא נשלח אדם שאינו עומד בהתאמה ההדדית רק כדי לייצר כמות.</p><p>כדאי לוודא שהפרופיל וההעדפות שלך עדכניים — זה מגדיל את היכולת שלנו לזהות הזדמנויות נכונות.</p>${cta(personalProfileUrl, "בדיקת הפרופיל וההעדפות")}${upsellBlock(offer)}`),
      textBody: hasProposals
        ? `${firstName}, נשלחו עבורך ${stats.proposals} הצעות עד כה. אזור אישי: ${personalProfileUrl}`
        : `${firstName}, הפרופיל פעיל ואנחנו ממשיכים לחפש התאמה הדדית ורלוונטית. בדיקת פרופיל: ${personalProfileUrl}`,
    };
  }

  if (stageIndex === 4) {
    const offer = selectDatabaseUpsellOffer(30, stats, missing);
    return {
      subject: `${firstName}, סיכום החודש הראשון שלך במאגר`,
      htmlBody: frame(`<h2 style="font-size:24px">חודש במאגר: תמונת המצב שלך</h2><div style="background:#f8f6f0;border-radius:14px;padding:18px 22px"><p style="margin:0 0 8px">הצעות שנשלחו: <strong>${stats.proposals}</strong></p><p style="margin:0 0 8px">אישורים הדדיים: <strong>${stats.mutualApprovals}</strong></p><p style="margin:0">פגישות שדווחו: <strong>${stats.meetings}</strong></p></div><p>המספרים אינם ציון אישי. הם עוזרים לנו להבין איפה נדרש דיוק, הרחבת העדפות או עוד זמן כדי למצוא התאמה הדדית.</p>${cta(personalProfileUrl, "בדיקת הפרופיל שלי")}${upsellBlock(offer)}`),
      textBody: `${firstName}, בחודש הראשון: ${stats.proposals} הצעות, ${stats.mutualApprovals} אישורים הדדיים, ${stats.meetings} פגישות שדווחו. ${personalProfileUrl}`,
    };
  }

  if (stageIndex === 5) {
    const offer = selectDatabaseUpsellOffer(60, stats, missing);
    return {
      subject: `${firstName}, אנחנו ממשיכים לעבוד על ההזדמנויות שלך`,
      htmlBody: frame(`<h2 style="font-size:24px">60 יום במאגר</h2><p>המטרה שלנו נשארת ברורה: לייצר יותר ויותר הזדמנויות מתאימות, תוך שמירה על התאמה הדדית ואיכותית.</p><p>עד כה נשלחו עבורך <strong>${stats.proposals}</strong> הצעות ונוצרו <strong>${stats.mutualApprovals}</strong> אישורים הדדיים. אם השתנו אצלך אזור, טווח גילאים, רצון בילדים או העדפות אחרות, חשוב לעדכן — שינוי קטן יכול לפתוח אפשרויות חדשות.</p>${cta(personalProfileUrl, "עדכון הפרופיל וההעדפות")}${upsellBlock(offer)}`),
      textBody: `${firstName}, 60 יום במאגר: ${stats.proposals} הצעות ו-${stats.mutualApprovals} אישורים הדדיים. לעדכון: ${personalProfileUrl}`,
    };
  }

  const finalUrl = stats.latestOutcomeUrl || personalProfileUrl;
  const offer = selectDatabaseUpsellOffer(90, stats, missing);
  return {
    subject: `${firstName}, סיכום 90 הימים הראשונים שלך`,
    htmlBody: frame(`<h2 style="font-size:24px">90 יום: עוזרים לנו לדייק את ההמשך</h2><p>עד עכשיו נשלחו עבורך <strong>${stats.proposals}</strong> הצעות, נוצרו <strong>${stats.mutualApprovals}</strong> אישורים הדדיים ודווחו <strong>${stats.meetings}</strong> פגישות.</p><p>אם נוצר חיבור, נקבע דייט או שהדברים לא המשיכו — עדכון קצר יעזור לנו למדוד תוצאות אמיתיות ולשפר את ההמשך. שום דבר לא יפורסם ללא הסכמה מפורשת.</p>${cta(finalUrl, stats.latestOutcomeUrl ? "עדכון קצר על ההתאמה" : "בדיקת הפרופיל שלי")}${upsellBlock(offer)}`),
    textBody: `${firstName}, סיכום 90 יום: ${stats.proposals} הצעות, ${stats.mutualApprovals} אישורים הדדיים, ${stats.meetings} פגישות. עדכון: ${finalUrl}`,
  };
}

function statsForSingle(singleId: number, allMatches: JourneyMatch[]): JourneyStats {
  const relevant = allMatches.filter(match => match.singleAId === singleId || match.singleBId === singleId);
  const proposed = relevant.filter(match => Boolean(match.proposedAt));
  const latestMatched = [...relevant]
    .filter(match => Boolean(match.matchedAt))
    .sort((a, b) => Number(b.matchedAt || 0) - Number(a.matchedAt || 0))[0];
  const token = latestMatched
    ? (latestMatched.singleAId === singleId ? latestMatched.approvalTokenA : latestMatched.approvalTokenB)
    : null;

  return {
    proposals: proposed.length,
    mutualApprovals: relevant.filter(match => match.approvedByA && match.approvedByB).length,
    meetings: relevant.filter(match => ["met", "dating", "together"].includes(match.matchDetailStatus || "")).length,
    endedMatches: relevant.filter(match => match.matchDetailStatus === "ended").length,
    positiveOutcomes: relevant.filter(match => ["dating", "together"].includes(match.matchDetailStatus || "")).length,
    latestOutcomeUrl: token ? `${SITE_BASE}/match/outcome?token=${encodeURIComponent(token)}` : null,
  };
}

export async function processDatabase90DayJourney(options: { now?: number; limit?: number } = {}): Promise<{
  evaluated: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 100;

  const cohort = await db.select().from(singles).where(and(
    eq(singles.isPaid, true),
    eq(singles.isActive, true),
    eq(singles.consentEmailMarketing, true),
    eq(singles.isSeed, false),
    eq(singles.market, "il"),
    gte(singles.createdAt, DATABASE_90_DAY_LAUNCH_AT),
  ));

  if (cohort.length === 0) return { evaluated: 0, sent: 0, skipped: 0, failed: 0 };

  const ids = cohort.map(single => single.id);
  const allMatches = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    proposedAt: matches.proposedAt,
    approvedByA: matches.approvedByA,
    approvedByB: matches.approvedByB,
    matchedAt: matches.matchedAt,
    matchDetailStatus: matches.matchDetailStatus,
    approvalTokenA: matches.approvalTokenA,
    approvalTokenB: matches.approvalTokenB,
  }).from(matches).where(and(
    inArray(matches.singleAId, ids),
  ));
  // Include rows where a cohort member is side B as well.
  const sideBMatches = await db.select({
    id: matches.id,
    singleAId: matches.singleAId,
    singleBId: matches.singleBId,
    proposedAt: matches.proposedAt,
    approvedByA: matches.approvedByA,
    approvedByB: matches.approvedByB,
    matchedAt: matches.matchedAt,
    matchDetailStatus: matches.matchDetailStatus,
    approvalTokenA: matches.approvalTokenA,
    approvalTokenB: matches.approvalTokenB,
  }).from(matches).where(inArray(matches.singleBId, ids));
  const matchMap = new Map<number, JourneyMatch>();
  [...allMatches, ...sideBMatches].forEach(match => matchMap.set(match.id, match));
  const matchRows = Array.from(matchMap.values());

  const existingLogs = await db.select({
    recipientEmail: emailLog.recipientEmail,
    emailIndex: emailLog.emailIndex,
    status: emailLog.status,
  }).from(emailLog).where(eq(emailLog.journeyKey, JOURNEY_KEY));
  const processed = new Set(existingLogs
    .filter(log => log.status !== "failed")
    .map(log => `${log.recipientEmail.toLowerCase()}:${log.emailIndex}`));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let evaluated = 0;

  for (const single of cohort) {
    if (evaluated >= limit) break;
    if (!single.email) continue;
    const recipientEmail = single.email;
    const suppression = await isEmailMarketingSuppressed(recipientEmail);
    if (suppression.suppressed) { skipped++; continue; }
    const joinedAt = Number(single.subscriptionStartedAt || single.createdAt || 0);
    if (!joinedAt) continue;
    const ageDays = Math.floor((now - joinedAt) / DAY_MS);
    const due = [...DATABASE_90_DAY_STAGES].reverse().find(stage => ageDays >= stage.day);
    if (!due || processed.has(`${recipientEmail.toLowerCase()}:${due.index}`)) continue;
    evaluated++;

    const missing = getMissingProfileFields(single as any);
    const stats = statsForSingle(single.id, matchRows);
    const template = buildDatabase90DayEmail(due.index, single, stats, missing);
    const createdAt = Date.now();

    if (template.skipReason) {
      await db.insert(emailLog).values({
        recipientEmail,
        recipientName: single.firstName,
        journeyKey: JOURNEY_KEY,
        emailIndex: due.index,
        subject: template.subject,
        htmlBody: "",
        textBody: template.skipReason,
        scheduledAt: createdAt,
        sentAt: createdAt,
        status: "cancelled",
        errorMessage: template.skipReason,
        createdAt,
      });
      skipped++;
      continue;
    }

    const insertResult = await db.insert(emailLog).values({
      recipientEmail,
      recipientName: single.firstName,
      journeyKey: JOURNEY_KEY,
      emailIndex: due.index,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      scheduledAt: createdAt,
      status: "processing",
      createdAt,
    });
    const logId = Number((insertResult as any)[0]?.insertId || 0);

    const result = await sendEmail({
      to: { email: recipientEmail, name: single.firstName },
      subject: template.subject,
      htmlContent: template.htmlBody,
      textContent: template.textBody,
    });

    if (result.success) {
      if (logId) await db.update(emailLog).set({ status: "sent", sentAt: Date.now(), errorMessage: null }).where(eq(emailLog.id, logId));
      sent++;
    } else {
      if (logId) await db.update(emailLog).set({ status: "failed", errorMessage: result.error || "send_failed" }).where(eq(emailLog.id, logId));
      failed++;
    }
  }

  return { evaluated, sent, skipped, failed };
}
