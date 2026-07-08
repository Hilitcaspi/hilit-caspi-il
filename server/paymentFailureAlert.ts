/**
 * Payment Failure Alert System
 * 
 * Sends immediate notifications (email + WhatsApp) to Hilit whenever a payment fails.
 * This covers:
 * - createPaymentProcess failures (server-side API call to Meshulam fails)
 * - Client-side payment failures reported back from the Grow SDK
 */
import { sendEmail } from "./brevo";
import { sendWhatsApp } from "./joni";

const HILIT_EMAIL = "hilit@hilitcaspi.com";
const HILIT_PHONE = "0544530975";
const PARTNER_PHONE = "0529467614";

// Throttle: don't send more than 1 alert per email+product+stage per 1 minute
// (keeps alerts frequent enough to catch every real attempt while avoiding exact duplicates from retries)
const recentAlerts = new Map<string, number>();
const THROTTLE_MS = 60 * 1000;

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
  stage: "createProcess" | "doPayment" | "sdk_failure";
  processToken?: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר הרווקים (249 ₪)",
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
  const stageLabel = info.stage === "createProcess" ? "יצירת תהליך תשלום"
    : info.stage === "doPayment" ? "סליקת כרטיס"
    : "כשל ב-SDK";

  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  // WhatsApp message
  const waMsg = [
    `🚨 תשלום נכשל!`,
    `שם: ${info.customerName}`,
    `מייל: ${info.customerEmail}`,
    info.customerPhone ? `טלפון: ${info.customerPhone}` : null,
    `מוצר: ${productLabel}`,
    `שלב: ${stageLabel}`,
    info.errorMessage ? `שגיאה: ${info.errorMessage.slice(0, 100)}` : null,
    info.processToken ? `טוקן תהליך: ${info.processToken.slice(0, 20)}` : null,
    `זמן: ${now}`,
  ].filter(Boolean).join("\n");

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

  // Send both in parallel, never throw
  try {
    await Promise.allSettled([
      sendEmail({
        to: { email: HILIT_EMAIL, name: "הילית כספי" },
        subject: `🚨 תשלום נכשל - ${info.customerName} (${productLabel})`,
        htmlContent,
      }),
      sendWhatsApp(HILIT_PHONE, waMsg),
      sendWhatsApp(PARTNER_PHONE, waMsg),
    ]);
  } catch (err) {
    console.error("[PaymentFailureAlert] Failed to send notification:", err);
  }
}
