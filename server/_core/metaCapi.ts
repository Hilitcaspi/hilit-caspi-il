/** Confirmed Israeli purchases only. Payloads are encrypted in the delivery outbox. */
import crypto from "node:crypto";
import { ISRAEL_META_PIXEL_ID, isIsraeliProductionMeasurementRuntime } from "../../shared/metaPurchasePolicy";

const CAPI_URL = "https://graph.facebook.com/v21.0";
export const CAPI_PRODUCTS: Record<string, { name: string; currency: string }> = {
  database: { name: "מאגר רווקים", currency: "ILS" },
  guide: { name: "מדריך לבחור נכון", currency: "ILS" },
  course: { name: "קורס המסע", currency: "ILS" },
  coaching: { name: "ליווי אישי 8 פגישות", currency: "ILS" },
  coaching_mas: { name: "ליווי המסע 12 פגישות", currency: "ILS" },
  session: { name: "פגישה בודדת", currency: "ILS" },
  live_event: { name: "אירוע לייב", currency: "ILS" },
  live_october: { name: "סודות ההתאמה המושלמת - לייב אוקטובר", currency: "ILS" },
  bundle_tubav: { name: "חבילת טו באב - מאגר + מדריך", currency: "ILS" },
  bundle_new_year: { name: "חבילת שנה חדשה - מאגר + מדריך + קורס", currency: "ILS" },
  match_boost: { name: "Boost - שליחת הצעת התאמה", currency: "ILS" },
  plus: { name: "Database Plus", currency: "ILS" },
};

export type CapiPurchaseParams = {
  email: string; name?: string; phone?: string; product: string;
  /** Never substitute a list price for a confirmed charge. */
  sum?: number; transactionId?: string; eventId?: string; paidAt: number;
  fbp?: string; fbc?: string; ip?: string; userAgent?: string; utmSource?: string;
};
export type MetaPurchasePayload = {
  data: [{ event_name: "Purchase"; event_time: number; event_id: string;
    event_source_url: string; action_source: "website";
    user_data: Record<string, string>;
    custom_data: { value: number; currency: string; content_name: string;
      content_ids: string[]; content_type: "product"; order_id: string } }];
};
function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}
export function normalizeMetaPhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("00") ? digits.slice(2)
    : digits.startsWith("0") && digits.length === 10 ? "972" + digits.slice(1) : digits;
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
}
export function resolvePurchaseEventId(params: {
  eventId?: string; transactionId?: string; product: string;
}, now = Date.now()): string {
  return params.eventId || (params.transactionId
    ? `grow-${sha256(`israeli-purchase:${params.product}:${params.transactionId}`)}` : `grow-${params.product}-${now}`);
}
export function buildCapiPurchasePayload(params: CapiPurchaseParams): MetaPurchasePayload | null {
  const product = CAPI_PRODUCTS[params.product];
  if (!product || !Number.isFinite(params.sum) || (params.sum ?? 0) <= 0
      || (!params.eventId && !params.transactionId)) return null;
  const eventId = resolvePurchaseEventId(params);
  const paidAt = params.paidAt;
  if (!Number.isFinite(paidAt) || paidAt <= 0) return null;
  const userData: Record<string, string> = {};
  if (params.email.trim()) userData.em = sha256(params.email);
  const phone = params.phone ? normalizeMetaPhone(params.phone) : undefined;
  if (phone) userData.ph = sha256(phone);
  const parts = params.name?.trim().split(/\s+/) ?? [];
  if (parts[0]) userData.fn = sha256(parts[0]);
  if (parts.length > 1) userData.ln = sha256(parts.slice(1).join(" "));
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;
  if (params.ip) userData.client_ip_address = params.ip;
  if (params.userAgent) userData.client_user_agent = params.userAgent;
  return { data: [{
    event_name: "Purchase", event_time: Math.floor(paidAt / 1000), event_id: eventId,
    event_source_url: "https://hilitcaspi.com", action_source: "website", user_data: userData,
    custom_data: { value: Math.round(params.sum! * 100) / 100, currency: product.currency,
      content_name: product.name, content_ids: [params.product], content_type: "product", order_id: eventId },
  }] };
}
export type MetaDeliveryResult = {
  state: "accepted" | "retryable" | "permanent" | "configuration_missing";
  category: string; httpStatus?: number; eventsReceived?: number;
};
/** No response bodies, tokens, user identifiers or provider messages enter logs/storage. */
export async function sendMetaPurchasePayload(payload: MetaPurchasePayload): Promise<MetaDeliveryResult> {
  if (!isIsraeliProductionMeasurementRuntime(process.env.NODE_ENV)) {
    return { state: "configuration_missing", category: "nonproduction_disabled" };
  }
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return { state: "configuration_missing", category: "configuration_missing" };
  if (pixelId !== ISRAEL_META_PIXEL_ID) return { state: "configuration_missing", category: "israeli_pixel_mismatch" };
  try {
    const res = await fetch(`${CAPI_URL}/${pixelId}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: token }), signal: AbortSignal.timeout(12_000),
    });
    const json = await res.json().catch(() => null) as any;
    if (res.ok && json?.events_received === 1) {
      return { state: "accepted", category: "accepted", httpStatus: res.status, eventsReceived: 1 };
    }
    if (res.status === 429 || res.status >= 500 || json?.error?.is_transient) {
      return { state: "retryable", category: "provider_transient", httpStatus: res.status };
    }
    if (res.ok) return { state: "retryable", category: "acceptance_not_confirmed", httpStatus: res.status };
    return { state: "permanent", category: "provider_rejected", httpStatus: res.status };
  } catch {
    // Retry preserves event_id and event_time; our local deadline is 24 hours.
    return { state: "retryable", category: "network_uncertain" };
  }
}
export async function capiPurchase(params: CapiPurchaseParams): Promise<void> {
  if (!isIsraeliProductionMeasurementRuntime(process.env.NODE_ENV)) return;
  const payload = buildCapiPurchasePayload(params);
  if (!payload) { console.warn("[MetaCAPI] Purchase skipped: invalid verified amount/product/identity"); return; }
  const { enqueueMetaPurchase } = await import("../metaPurchaseDelivery");
  const state = await enqueueMetaPurchase(payload, params.product);
  if (state === "not_configured") {
    const result = await sendMetaPurchasePayload(payload);
    console.info("[MetaCAPI] rollout immediate delivery", { state: result.state, category: result.category });
  }
}
