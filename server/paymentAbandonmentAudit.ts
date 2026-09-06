import { sql } from "drizzle-orm";
import { getDb } from "./db";

export type PaymentAttemptClassification =
  | "completed_later"
  | "sandbox_plus"
  | "excluded_contact"
  | "recovery_already_sent"
  | "recovery_clicked"
  | "repeat_purchase_abandoned"
  | "abandoned_without_recovery";

export type PaymentAttemptEvidence = {
  product: string;
  completedSameProductAfter: number;
  completedSameProductBefore: number;
  abandonmentEmailsSent: number;
  abandonmentEmailsClicked: number;
  emailUnsubscribed: boolean;
  singleIsActive: boolean | null;
  plusCheckoutMode: string | null;
};

export function classifyPaymentAttempt(input: PaymentAttemptEvidence): PaymentAttemptClassification {
  if (input.completedSameProductAfter > 0) return "completed_later";
  if (input.product === "plus" && input.plusCheckoutMode !== "production") return "sandbox_plus";
  if (input.emailUnsubscribed || input.singleIsActive === false) return "excluded_contact";
  if (input.abandonmentEmailsClicked > 0) return "recovery_clicked";
  if (input.abandonmentEmailsSent > 0) return "recovery_already_sent";
  if (input.completedSameProductBefore > 0) return "repeat_purchase_abandoned";
  return "abandoned_without_recovery";
}

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר ההיכרויות",
  match_boost: "Boost",
  bundle_new_year: "באנדל החג",
  bundle_tubav: "ט״ו באב",
  session: "פגישה אישית",
  coaching: "ליווי",
  coaching_mas: "ליווי",
  guide: "מדריך",
  course: "קורס",
  plus: "Database Plus",
};

function recommendationFor(classification: PaymentAttemptClassification, product: string) {
  if (classification === "completed_later") return "לא לפנות: הרכישה הושלמה לאחר פתיחת התשלום.";
  if (classification === "sandbox_plus") return "לא לפנות: ניסיון Plus בוצע בסביבת Sandbox של הפיילוט הסגור.";
  if (classification === "excluded_contact") return "לא לפנות: קיימת הסרת דיוור או שהפרופיל אינו פעיל.";
  if (classification === "recovery_clicked") return "לבדיקה ידנית: מסע הנטישה נלחץ אך הרכישה לא הושלמה.";
  if (classification === "recovery_already_sent") return "לא לשלוח כרגע הודעה נוספת: מסע הנטישה כבר נשלח.";
  if (product === "match_boost") return "אפשר לפנות בעדינות עם קישור חדש לאזור ה־Boost; ההצעה המקורית פגה.";
  if (product === "bundle_new_year") return "אפשר לפנות פעם אחת עם קישור לבאנדל, ללא הנחה אוטומטית.";
  if (classification === "repeat_purchase_abandoned") return "אפשר לפנות כלקוח קיים שניסה לבצע רכישה נוספת ולא השלים.";
  return "אפשר לפנות פעם אחת ולשאול אם הייתה תקלה, עם קישור חדש להשלמה.";
}

export async function getPaymentAbandonmentAudit(startDate: number, endDate: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [rows] = await db.execute(sql`
    SELECT
      pl.id,
      pl.name,
      pl.email,
      pl.phone,
      pl.product,
      pl.created_at AS startedAt,
      (SELECT COUNT(*) FROM completed_payments cp
        WHERE LOWER(TRIM(cp.email)) = LOWER(TRIM(pl.email))
          AND cp.amount_source = 'grow'
          AND cp.product = pl.product
          AND cp.paid_at >= pl.created_at) AS completedSameProductAfter,
      (SELECT MIN(cp.paid_at) FROM completed_payments cp
        WHERE LOWER(TRIM(cp.email)) = LOWER(TRIM(pl.email))
          AND cp.amount_source = 'grow'
          AND cp.product = pl.product
          AND cp.paid_at >= pl.created_at) AS completedAt,
      (SELECT COUNT(*) FROM completed_payments cp
        WHERE LOWER(TRIM(cp.email)) = LOWER(TRIM(pl.email))
          AND cp.amount_source = 'grow'
          AND cp.product = pl.product
          AND cp.paid_at < pl.created_at) AS completedSameProductBefore,
      (SELECT COUNT(*) FROM email_log el
        WHERE LOWER(TRIM(el.recipientEmail)) = LOWER(TRIM(pl.email))
          AND el.journeyKey = CASE
            WHEN pl.product = 'database' THEN 'abandoned_database'
            WHEN pl.product = 'guide' THEN 'abandoned_guide'
            WHEN pl.product = 'course' THEN 'abandoned_course'
            WHEN pl.product IN ('coaching', 'coaching_mas', 'session') THEN 'abandoned_coaching'
            ELSE '__none__'
          END
          AND el.createdAt >= pl.created_at AND el.sentAt IS NOT NULL) AS abandonmentEmailsSent,
      (SELECT COUNT(*) FROM email_log el
        WHERE LOWER(TRIM(el.recipientEmail)) = LOWER(TRIM(pl.email))
          AND el.journeyKey = CASE
            WHEN pl.product = 'database' THEN 'abandoned_database'
            WHEN pl.product = 'guide' THEN 'abandoned_guide'
            WHEN pl.product = 'course' THEN 'abandoned_course'
            WHEN pl.product IN ('coaching', 'coaching_mas', 'session') THEN 'abandoned_coaching'
            ELSE '__none__'
          END
          AND el.createdAt >= pl.created_at AND el.clickedAt IS NOT NULL) AS abandonmentEmailsClicked,
      COALESCE((SELECT cl.emailUnsubscribed FROM crm_leads cl
        WHERE LOWER(TRIM(cl.email)) = LOWER(TRIM(pl.email)) ORDER BY cl.id DESC LIMIT 1), 0) AS emailUnsubscribed,
      (SELECT cl.status FROM crm_leads cl
        WHERE LOWER(TRIM(cl.email)) = LOWER(TRIM(pl.email)) ORDER BY cl.id DESC LIMIT 1) AS crmStatus,
      (SELECT s.isActive FROM singles s
        WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(pl.email)) ORDER BY s.id DESC LIMIT 1) AS singleIsActive,
      (SELECT pci.checkout_mode FROM plus_checkout_intents pci
        WHERE LOWER(TRIM(pci.email)) = LOWER(TRIM(pl.email)) LIMIT 1) AS plusCheckoutMode
    FROM payment_leads pl
    WHERE pl.created_at >= ${startDate} AND pl.created_at <= ${endDate}
    ORDER BY pl.created_at DESC, pl.id DESC
  `) as any;

  const all = (rows as any[]).map(row => {
    const evidence: PaymentAttemptEvidence = {
      product: String(row.product),
      completedSameProductAfter: Number(row.completedSameProductAfter || 0),
      completedSameProductBefore: Number(row.completedSameProductBefore || 0),
      abandonmentEmailsSent: Number(row.abandonmentEmailsSent || 0),
      abandonmentEmailsClicked: Number(row.abandonmentEmailsClicked || 0),
      emailUnsubscribed: Boolean(Number(row.emailUnsubscribed || 0)),
      singleIsActive: row.singleIsActive == null ? null : Boolean(Number(row.singleIsActive)),
      plusCheckoutMode: row.plusCheckoutMode ? String(row.plusCheckoutMode) : null,
    };
    const classification = classifyPaymentAttempt(evidence);
    return {
      id: Number(row.id),
      name: String(row.name || ""),
      email: String(row.email || ""),
      phone: String(row.phone || ""),
      product: evidence.product,
      productLabel: PRODUCT_LABELS[evidence.product] || evidence.product,
      startedAt: Number(row.startedAt),
      completedAt: row.completedAt == null ? null : Number(row.completedAt),
      classification,
      recoveryEmailsSent: evidence.abandonmentEmailsSent,
      recoveryClicked: evidence.abandonmentEmailsClicked > 0,
      recommendation: recommendationFor(classification, evidence.product),
      canContact: !["completed_later", "sandbox_plus", "excluded_contact", "recovery_already_sent"].includes(classification),
    };
  });

  const unresolved = all.filter(item => item.classification !== "completed_later");
  return {
    summary: {
      started: all.length,
      completedLater: all.length - unresolved.length,
      unresolved: unresolved.length,
      reviewReady: unresolved.filter(item => item.canContact).length,
      sandboxPlus: unresolved.filter(item => item.classification === "sandbox_plus").length,
      excluded: unresolved.filter(item => item.classification === "excluded_contact").length,
      recoveryAlreadySent: unresolved.filter(item => item.classification === "recovery_already_sent").length,
    },
    unresolved,
  };
}
