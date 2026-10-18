import { eq } from "drizzle-orm";
import { plusCancellationRequests, plusCancellationSettings } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./brevo";
import { normalizeIsraeliMobile, sendSMSBulkDetailed } from "./vibrate";

export const PLUS_CANCELLATION_ADMIN_URL = "https://hilitcaspi.com/crm/matchmaking?tab=plus";
const TITLE = "בקשת עצירת חיוב Plus חדשה";
const CONTENT = `התקבלה בקשת ביטול Plus. יש לעצור ידנית את הוראת הקבע ב־Grow, ואז לאשר סיום באתר. לטיפול: ${PLUS_CANCELLATION_ADMIN_URL}`;

export async function getPlusCancellationRecipients(db: any) {
  const [settings] = await db.select({ email: plusCancellationSettings.recipientEmail, phone: plusCancellationSettings.recipientPhone })
    .from(plusCancellationSettings).where(eq(plusCancellationSettings.ownerOpenId, process.env.OWNER_OPEN_ID || "")).limit(1);
  const email = (process.env.PLUS_CANCELLATION_OWNER_EMAIL || settings?.email || "").trim();
  const phone = normalizeIsraeliMobile(process.env.PLUS_CANCELLATION_OWNER_SMS || settings?.phone || "");
  return { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null, phone };
}

type Dependencies = {
  push: typeof notifyOwner;
  email: typeof sendEmail;
  sms: typeof sendSMSBulkDetailed;
};

/** Called only for the transaction winner, after the request has durably committed. */
export async function notifyPlusCancellation(db: any, requestKey: string, deps: Dependencies = {
  push: notifyOwner, email: sendEmail, sms: sendSMSBulkDetailed,
}) {
  let recipients: Awaited<ReturnType<typeof getPlusCancellationRecipients>> = { email: null, phone: null };
  try { recipients = await getPlusCancellationRecipients(db); } catch { /* Fail individual channels, not intake. */ }
  const attempt = async (field: "pushStatus" | "emailStatus" | "smsStatus", send: () => Promise<boolean>) => {
    let accepted = false;
    try { accepted = await send(); } catch { /* No raw provider errors or identifiers in logs. */ }
    try {
      await db.update(plusCancellationRequests).set({ [field]: accepted ? "accepted" : "failed", updatedAt: Date.now() })
        .where(eq(plusCancellationRequests.requestKey, requestKey));
    } catch { console.warn("[PlusCancellation] Could not record notification outcome; request remains queued."); }
  };
  await Promise.all([
    attempt("pushStatus", () => deps.push({ title: TITLE, content: CONTENT })),
    attempt("emailStatus", async () => {
      if (!recipients.email) return false;
      const result = await deps.email({
        to: { email: recipients.email }, subject: TITLE,
        textContent: CONTENT,
        htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#292552"><h2>${TITLE}</h2><p>התקבלה בקשת ביטול Plus. הבקשה נקלטה באתר, אך הוראת הקבע ב־Grow עדיין דורשת עצירה ידנית.</p><p>לאחר העצירה, יש לאשר סיום Plus בתור הבקשות באתר.</p><p><a href="${PLUS_CANCELLATION_ADMIN_URL}">לתור בקשות עצירת חיוב Plus</a></p><p>פרטי הבקשה מופיעים רק במסך הצוות המאובטח.</p></div>`,
      });
      return result.success && result.messageId !== "blocked";
    }),
    attempt("smsStatus", async () => {
      if (!recipients.phone) return false;
      const result = await deps.sms({
        messages: [{ phone: recipients.phone, message: `בקשת ביטול Plus חדשה. נדרשת עצירת חיוב ידנית ב־Grow. לטיפול: ${PLUS_CANCELLATION_ADMIN_URL}` }],
        idempotencyKey: `${requestKey}:owner-sms`,
      });
      return result.accepted;
    }),
  ]);
}
