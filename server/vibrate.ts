/**
 * SMS Integration via Vibrate API
 * https://www.vibrate.co.il
 *
 * Sends SMS notifications to users when match proposals are sent.
 * Fire-and-forget pattern — never throws, never blocks the main flow.
 */

const VIBRATE_API_KEY = process.env.VIBRATE_API_KEY ?? "";
const VIBRATE_API_URL = "https://api.vibrate.co.il/v1/sms/send";
const SENDER_NAME = "HilitCaspi";

/**
 * Normalize Israeli phone number to 05XXXXXXXX format
 */
function normalizePhone(phone: string): string | null {
  let normalized = phone.replace(/[\s\-\(\)\+]/g, "");
  // Convert international format (972...) to local (0...)
  if (normalized.startsWith("972")) {
    normalized = "0" + normalized.slice(3);
  }
  // Must be a valid Israeli mobile number (05X...)
  if (/^05\d{8}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Send an SMS via Vibrate API
 * @param phone - Phone number in any Israeli format (05X, +972, 972...)
 * @param message - Message text (plain text)
 * @returns true if sent successfully, false otherwise
 */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!VIBRATE_API_KEY) {
    console.warn("[Vibrate] VIBRATE_API_KEY not set, skipping SMS send");
    return false;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    console.warn(`[Vibrate] Invalid phone number: ${phone.slice(0, 4)}****`);
    return false;
  }

  try {
    const res = await fetch(VIBRATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VIBRATE_API_KEY}`,
      },
      body: JSON.stringify({
        recipients: [normalizedPhone],
        message,
        sender: SENDER_NAME,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 202) {
      const data = await res.json().catch(() => ({}));
      console.log(`[Vibrate] SMS sent to ${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-2)}, runId: ${data.runId ?? "unknown"}`);
      return true;
    }

    const text = await res.text().catch(() => "");
    console.error(`[Vibrate] Failed to send SMS to ${normalizedPhone.slice(0, 4)}****: ${res.status} ${text}`);
    return false;
  } catch (err) {
    console.error(`[Vibrate] Error sending SMS:`, err);
    return false;
  }
}

/**
 * Build the match notification SMS message
 */
export function buildMatchSmsMessage(firstName: string, matchFirstName: string, score: number): string {
  return `היי ${firstName}\n\nשלחתי לך מייל עם התאמה של ${score}% מיוחדת שבחרתי עבורך, ${matchFirstName} מחכה לתשובתך!\n\nכדאי לבדוק את תיבת המייל (גם ספאם והשיווק) וללחוץ על הקישור.\n\nהילית 💛`;
}
