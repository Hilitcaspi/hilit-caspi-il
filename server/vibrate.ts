/**
 * SMS Integration via Vibrate API
 * https://www.vibrate.co.il
 *
 * Sends operational SMS messages that still use the Vibrate channel.
 * Initial match proposals are sent through the Make WhatsApp webhook instead.
 * Fire-and-forget pattern — never throws, never blocks the main flow.
 * HTTP 202 confirms provider acceptance only; it is not handset delivery proof.
 */

const VIBRATE_API_KEY = process.env.VIBRATE_API_KEY ?? "";
const VIBRATE_API_URL = "https://api.vibrate.co.il/v1/sms/send";
const SENDER_NAME = "HilitCaspi";

/**
 * Normalize Israeli phone number to 05XXXXXXXX format
 */
export function normalizeIsraeliMobile(phone: string): string | null {
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
 * @returns true only when Vibrate accepts the request with HTTP 202; this does not confirm handset delivery
 */
export type SmsDeliveryResult = {
  accepted: boolean;
  providerRunId: string | null;
  error: string | null;
};

export async function sendSMSDetailed(phone: string, message: string): Promise<SmsDeliveryResult> {
  if (!VIBRATE_API_KEY) {
    console.warn("[Vibrate] VIBRATE_API_KEY not set, skipping SMS send");
    return { accepted: false, providerRunId: null, error: "missing_api_key" };
  }

  const normalizedPhone = normalizeIsraeliMobile(phone);
  if (!normalizedPhone) {
    console.warn(`[Vibrate] Invalid phone number: ${phone.slice(0, 4)}****`);
    return { accepted: false, providerRunId: null, error: "invalid_phone" };
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
      console.log(`[Vibrate] SMS accepted by provider for ${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-2)}, runId: ${data.runId ?? "unknown"}`);
      return {
        accepted: true,
        providerRunId: typeof data.runId === "string" && data.runId ? data.runId : null,
        error: null,
      };
    }

    const text = await res.text().catch(() => "");
    console.error(`[Vibrate] Failed to send SMS to ${normalizedPhone.slice(0, 4)}****: ${res.status} ${text}`);
    return { accepted: false, providerRunId: null, error: `http_${res.status}` };
  } catch (err) {
    console.error(`[Vibrate] Error sending SMS:`, err);
    return { accepted: false, providerRunId: null, error: "network_error" };
  }
}

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  return (await sendSMSDetailed(phone, message)).accepted;
}
