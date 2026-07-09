/**
 * Meta Conversions API (CAPI) — server-side event reporting
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends Purchase events to Facebook/Meta after confirmed Grow payments.
 * Runs server-side to capture events that the browser pixel may miss
 * (ad blockers, iOS privacy, etc.) and to deduplicate with the browser pixel.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * Required env vars:
 *   META_PIXEL_ID   — your Facebook Pixel ID (numeric string, e.g. "1234567890")
 *   META_CAPI_TOKEN — Conversions API access token (from Events Manager → Settings)
 */

import crypto from "crypto";

const CAPI_URL = "https://graph.facebook.com/v21.0";

// ─── Product catalog ──────────────────────────────────────────────────────────
const CAPI_PRODUCTS: Record<string, { name: string; price: number; currency: string }> = {
  database:     { name: "מאגר רווקים",          price: 249,  currency: "ILS" },
  guide:        { name: "מדריך לבחור נכון",      price: 149,  currency: "ILS" },
  course:       { name: "קורס המסע",             price: 249,  currency: "ILS" },
  coaching:     { name: "ליווי אישי 8 פגישות",   price: 2900, currency: "ILS" },
  coaching_mas: { name: "ליווי המסע 12 פגישות",  price: 4200, currency: "ILS" },
  session:      { name: "פגישה בודדת",           price: 500,  currency: "ILS" },
  live_event:   { name: "אירוע לייב",             price: 99,   currency: "ILS" },
  bundle_tubav: { name: "חבילת טו באב - מאגר + מדריך", price: 349, currency: "ILS" },
};

// ─── Hashing helper (Meta requires SHA-256 of PII) ────────────────────────────
function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// ─── Normalize phone to E.164 without + ──────────────────────────────────────
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Israeli numbers: 05X → 9725X
  if (digits.startsWith("05") && digits.length === 10) return "972" + digits.slice(1);
  // Already has country code
  if (digits.startsWith("972")) return digits;
  return digits;
}

// ─── Main CAPI purchase event ─────────────────────────────────────────────────
export async function capiPurchase(params: {
  email: string;
  name?: string;
  phone?: string;
  product: string;
  /** Actual amount paid (ILS) — overrides catalog price if provided */
  sum?: number;
  transactionId?: string;
  /** fbp cookie value (from _fbp cookie on the browser) */
  fbp?: string;
  /** fbc cookie value (from _fbc cookie or fbclid query param) */
  fbc?: string;
  /** Client IP address */
  ip?: string;
  /** User-Agent string */
  userAgent?: string;
  /** UTM source for attribution */
  utmSource?: string;
}): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const token   = process.env.META_CAPI_TOKEN;

  if (!pixelId || !token) {
    console.warn("[MetaCAPI] META_PIXEL_ID or META_CAPI_TOKEN not set — skipping CAPI event");
    return;
  }

  const product = CAPI_PRODUCTS[params.product];
  if (!product) {
    console.warn(`[MetaCAPI] Unknown product "${params.product}" — skipping`);
    return;
  }

  const value = params.sum ?? product.price;
  const eventId = params.transactionId
    ? `grow-${params.transactionId}`
    : `grow-${params.product}-${Date.now()}`;

  // Build user_data with hashed PII
  const userData: Record<string, string | string[]> = {};
  if (params.email) userData["em"] = sha256(params.email);
  if (params.phone) {
    const normalized = normalizePhone(params.phone);
    if (normalized) userData["ph"] = sha256(normalized);
  }
  if (params.name) {
    const parts = params.name.trim().split(/\s+/);
    if (parts[0]) userData["fn"] = sha256(parts[0]);
    if (parts[1]) userData["ln"] = sha256(parts.slice(1).join(" "));
  }
  if (params.fbp) userData["fbp"] = params.fbp;
  if (params.fbc) userData["fbc"] = params.fbc;
  if (params.ip)  userData["client_ip_address"] = params.ip;
  if (params.userAgent) userData["client_user_agent"] = params.userAgent;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,   // used for deduplication with browser pixel
        event_source_url: "https://hilitcaspi.com",
        action_source: "website",
        user_data: userData,
        custom_data: {
          value,
          currency: product.currency,
          content_name: product.name,
          content_ids: [params.product],
          content_type: "product",
          order_id: eventId,
          ...(params.utmSource ? { utm_source: params.utmSource } : {}),
        },
      },
    ],
    // test_event_code: "TEST12345",  // uncomment to test in Events Manager
  };

  try {
    const res = await fetch(`${CAPI_URL}/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error(`[MetaCAPI] API error ${res.status}:`, JSON.stringify(json));
      return;
    }

    const eventsReceived = json?.events_received ?? "?";
    const quality = json?.messages?.[0] ?? "";
    console.log(`[MetaCAPI] ✓ Purchase sent for ${params.email} | product=${params.product} | value=${value} ILS | events_received=${eventsReceived} ${quality}`);
  } catch (err) {
    console.error("[MetaCAPI] Fetch failed:", err);
  }
}
