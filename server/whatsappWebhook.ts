export const BUSINESS_WHATSAPP_SENDER_LOCAL = "0552442334";
export const BUSINESS_WHATSAPP_SENDER_INTERNATIONAL = "972552442334";
export const HILIT_WHATSAPP = "0544530975";
export const SHAHAR_WHATSAPP = "0529467614";
export const PURCHASE_ALERT_RECIPIENTS = [
  { key: "hilit", phone: HILIT_WHATSAPP },
  { key: "shahar", phone: SHAHAR_WHATSAPP },
] as const;

export type WhatsAppEvent =
  | "match_proposal_sent"
  | "match_follow_up"
  | "match_expired"
  | "profile_completion_request"
  | "purchase_completed"
  | "incomplete_profile_alert"
  | "system_test";

export type MakeWhatsAppPayload = {
  event: WhatsAppEvent;
  channel: "whatsapp";
  idempotencyKey: string;
  phone: string;
  phoneInternational: string;
  phoneLocal: string;
  to: string;
  number: string;
  recipientPhone: string;
  recipient_phone: string;
  chatId: string;
  message: string;
  text: string;
  body: string;
  sender: string;
  from: string;
  senderPhone: string;
  sender_phone: string;
  senderPhoneInternational: string;
  [key: string]: unknown;
};

export function normalizeWhatsAppPhone(phone: string): string | null {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("05")) normalized = `972${normalized.slice(1)}`;
  if (normalized.startsWith("5") && normalized.length === 9) normalized = `972${normalized}`;
  return /^9725\d{8}$/.test(normalized) ? normalized : null;
}

export function toLocalIsraeliPhone(phone: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  return normalized ? `0${normalized.slice(3)}` : null;
}

export function buildMakeWhatsAppPayload(input: {
  event: WhatsAppEvent;
  idempotencyKey: string;
  phone: string;
  message: string;
  metadata?: Record<string, unknown>;
}): MakeWhatsAppPayload | null {
  const phoneInternational = normalizeWhatsAppPhone(input.phone);
  const phoneLocal = toLocalIsraeliPhone(input.phone);
  if (!phoneInternational || !phoneLocal) return null;
  return {
    ...(input.metadata ?? {}),
    event: input.event,
    channel: "whatsapp",
    idempotencyKey: input.idempotencyKey,
    phone: phoneLocal,
    phoneInternational,
    phoneLocal,
    to: phoneLocal,
    number: phoneLocal,
    recipientPhone: phoneLocal,
    recipient_phone: phoneLocal,
    chatId: `${phoneInternational}@c.us`,
    message: input.message,
    text: input.message,
    body: input.message,
    sender: BUSINESS_WHATSAPP_SENDER_LOCAL,
    from: BUSINESS_WHATSAPP_SENDER_LOCAL,
    senderPhone: BUSINESS_WHATSAPP_SENDER_LOCAL,
    sender_phone: BUSINESS_WHATSAPP_SENDER_LOCAL,
    senderPhoneInternational: BUSINESS_WHATSAPP_SENDER_INTERNATIONAL,
  };
}

export async function postWhatsAppWebhook(
  payload: MakeWhatsAppPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const webhookUrl = process.env.MATCH_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[WhatsAppWebhook] MATCH_WHATSAPP_WEBHOOK_URL is not configured");
    return false;
  }

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`[WhatsAppWebhook] Make rejected ${payload.idempotencyKey}: ${response.status} ${responseText.slice(0, 160)}`);
      return false;
    }
    console.log(`[WhatsAppWebhook] Make accepted ${payload.idempotencyKey} for ${payload.phoneInternational.slice(0, 5)}****${payload.phoneInternational.slice(-2)}`);
    return true;
  } catch (error) {
    console.error(`[WhatsAppWebhook] Make failed for ${payload.idempotencyKey}:`, error);
    return false;
  }
}

export async function sendWhatsAppViaMake(input: {
  event: WhatsAppEvent;
  idempotencyKey: string;
  phone: string;
  message: string;
  metadata?: Record<string, unknown>;
}, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const payload = buildMakeWhatsAppPayload(input);
  return payload ? postWhatsAppWebhook(payload, fetchImpl) : false;
}

export function buildPurchaseOwnerMessage(input: {
  name: string;
  email: string;
  phone?: string;
  product: string;
  amount: number;
  transactionId?: string;
}): string {
  const productLabels: Record<string, string> = {
    guide: "המדריך לבחור נכון",
    course: "הקורס הדיגיטלי",
    coaching: "ליווי אישי",
    coaching_mas: "תהליך המסע",
    session: "פגישת היכרות",
    database: "מאגר הרווקים",
    bundle_tubav: "חבילת ט״ו באב",
    live_event: "אירוע לייב",
    plus: "Database Plus",
  };
  return [
    "💳 רכישה חדשה הושלמה",
    `שם: ${input.name}`,
    `מוצר: ${productLabels[input.product] ?? input.product}`,
    `סכום: ${input.amount.toFixed(2)} ש״ח`,
    input.phone ? `טלפון: ${input.phone}` : null,
    `מייל: ${input.email}`,
    input.transactionId ? `עסקה: ${input.transactionId}` : null,
  ].filter(Boolean).join("\n");
}
