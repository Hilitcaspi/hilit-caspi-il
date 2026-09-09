/**
 * Payment Failure Alert System
 * 
 * Sends email for payment failures and a throttled operational SMS for technical
 * failures that can block the checkout flow before a customer reaches Grow.
 * This covers:
 * - createPaymentProcess failures (server-side API call to Meshulam fails)
 * - Client-side payment failures reported back from the Grow SDK
 */
import { sendEmail } from "./brevo";
import { sendSMS } from "./vibrate";

const HILIT_EMAIL = "hilit@hilitcaspi.com";
const HILIT_PHONE = "0544530975";

// Throttle: don't send more than 1 alert per email+product+stage per 1 minute
// (keeps alerts frequent enough to catch every real attempt while avoiding exact duplicates from retries)
const recentAlerts = new Map<string, number>();
const THROTTLE_MS = 60 * 1000;
const CRITICAL_SMS_COOLDOWN_MS = 15 * 60 * 1000;
let lastCriticalSmsAt = 0;

function shouldAlert(key: string): boolean {
  const now = Date.now();
  const last = recentAlerts.get(key);
  if (last && now - last < THROTTLE_MS) return false;
  recentAlerts.set(key, now);
  // Clean old entries
  if (recentAlerts.size > 200) {
    const toDelete: string[] = [];
    recentAlerts.forEach((v, k) => {
      if (now - v > THROTTLE_MS) toDelete.push(k);
    });
    toDelete.forEach(k => recentAlerts.delete(k));
  }
  return true;
}

export interface PaymentFailureInfo {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  product: string;
  amount?: number;
  errorMessage?: string;
  stage: "profile_save" | "createProcess" | "doPayment" | "sdk_failure";
  processToken?: string;
}

export function shouldSendCriticalPaymentSms(
  stage: PaymentFailureInfo["stage"],
  now = Date.now(),
): boolean {
  if (stage !== "profile_save" && stage !== "createProcess") return false;
  if (lastCriticalSmsAt && now - lastCriticalSmsAt < CRITICAL_SMS_COOLDOWN_MS) return false;
  lastCriticalSmsAt = now;
  return true;
}

export function resetPaymentFailureAlertStateForTests(): void {
  recentAlerts.clear();
  lastCriticalSmsAt = 0;
}

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר הרווקים (299 ₪)",
  guide: "מדריך לבחור נכון (149 ₪)",
  course: "קורס המסע (249 ₪)",
  coaching: "ליווי אישי (3 חודשים)",
  coaching_mas: "ליווי מסע מלא (5 חודשים)",
  session: "פגישה אישית (500 ₪)",
};

export async function notifyPaymentFailure(info: PaymentFailureInfo): Promise<void> {
  const key = `${info.customerEmail}:${info.product}:${info.stage}`;
  if (!shouldAlert(key)) return;

  const productLabel = PRODUCT_LABELS[info.product] || info.product;
  const stageLabel = info.stage === "profile_save" ? "שמירת פרופיל לפני תשלום"
    : info.stage === "createProcess" ? "יצירת תהליך תשלום"
    : info.stage === "doPayment" ? "סליקת כרטיס"
    : "כשל ב-SDK";

  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  // Email
  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #e53e3e;">🚨 התראת תשלום נכשל</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">שם</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${info.customerName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">מייל</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${info.customerEmail}</td></tr>
        ${info.customerPhone ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">טלפון</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${info.customerPhone}</td></tr>` : ""}
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">מוצר</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${productLabel}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">שלב הכשל</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${stageLabel}</td></tr>
        ${info.errorMessage ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">שגיאה</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${info.errorMessage.slice(0, 200)}</td></tr>` : ""}
        ${info.processToken ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">טוקן תהליך</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${info.processToken}</td></tr>` : ""}
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">זמן</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${now}</td></tr>
      </table>
      <p style="margin-top: 16px; color: #666;">ייתכן שמדובר בכרטיס שנדחה או בעיה זמנית ב-Meshulam. אם זה חוזר על עצמו, כדאי לבדוק בלוח הבקרה של Grow.</p>
    </div>
  `;

  const alertTasks: Promise<unknown>[] = [
    sendEmail({
      to: { email: HILIT_EMAIL, name: "הילית כספי" },
      subject: `🚨 תשלום נכשל - ${info.customerName} (${productLabel})`,
      htmlContent,
    }),
  ];

  if (shouldSendCriticalPaymentSms(info.stage)) {
    alertTasks.push(sendSMS(HILIT_PHONE, [
      "🚨 תקלה במסלול ההצטרפות למאגר",
      `שלב: ${stageLabel}`,
      "לא בוצע חיוב.",
      "נדרשת בדיקה באתר.",
      `זמן: ${now}`,
    ].join("\n")));
  }

  // Send alerts in parallel, never throw or block the customer flow.
  try {
    await Promise.allSettled(alertTasks);
  } catch (err) {
    console.error("[PaymentFailureAlert] Failed to send notification:", err);
  }
}
