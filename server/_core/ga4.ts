/**
 * GA4 Measurement Protocol — Server-side event tracking
 * Sends events directly to GA4 without GTM or client-side JS.
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * UTM Attribution:
 * To attribute a server-side purchase to a UTM campaign, GA4 requires sending
 * a `campaign_details` event with the session_id BEFORE the `purchase` event.
 * The session_id comes from the browser's _ga_ZH1CYQCTMN cookie (index 2 of the value).
 * Without a matching session_id, GA4 cannot link the server event to the browser session.
 */

const GA4_MEASUREMENT_ID = "G-ZH1CYQCTMN";
const GA4_API_SECRET = "IFIVH-uXRYe3XgcgCFJ6mw";
const GA4_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

interface GA4Item {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  currency?: string;
}

interface GA4EventParams {
  [key: string]: string | number | boolean | GA4Item[] | undefined;
}

interface GA4Event {
  name: string;
  params?: GA4EventParams;
}

/**
 * Send one or more events to GA4 via Measurement Protocol.
 * client_id is required — use email hash or a random UUID if not available.
 * Set debugMode=true to route through the validation endpoint and appear in DebugView.
 */
export async function sendGA4Events(
  clientId: string,
  events: GA4Event[],
  debugMode = false
): Promise<void> {
  try {
    const endpoint = debugMode
      ? `https://www.google-analytics.com/debug/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`
      : GA4_ENDPOINT;

    const body = {
      client_id: clientId,
      // debug_mode=1 tells GA4 to surface this event in DebugView
      ...(debugMode ? { user_properties: { debug_mode: { value: "1" } } } : {}),
      events: debugMode
        ? events.map(e => ({ ...e, params: { ...e.params, debug_mode: 1 } }))
        : events,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // GA4 MP returns 204 on success; debug endpoint returns 200 with validation JSON
    if (debugMode) {
      const text = await res.text();
      console.log("[GA4 Debug] Validation response:", text);
    } else if (!res.ok && res.status !== 204) {
      console.warn("[GA4] Unexpected response:", res.status);
    }
  } catch (err) {
    // Non-blocking — never throw, just log
    console.warn("[GA4] Failed to send event:", err);
  }
}

// ─── Product catalog ───────────────────────────────────────────────────────────

export const GA4_PRODUCTS: Record<string, { id: string; name: string; price: number }> = {
  database:  { id: "database",  name: "מאגר רווקים",         price: 249 },
  course:    { id: "course",    name: "קורס המסע",            price: 249 },
  coaching:  { id: "coaching",  name: "ליווי אישי 8 פגישות",  price: 2900 },
  guide:     { id: "guide",     name: "מדריך לבחור נכון",     price: 149 },
  session:   { id: "session",   name: "פגישה בודדת",          price: 500 },
};

// ─── Convenience helpers ───────────────────────────────────────────────────────

/**
 * purchase — fired when a payment webhook confirms a successful purchase.
 *
 * UTM attribution flow:
 * 1. Browser reads _ga cookie → ga4ClientId (e.g. "123456789.1234567890")
 * 2. Browser reads _ga_ZH1CYQCTMN cookie → ga4SessionId (e.g. "1704773506")
 * 3. Both are saved to crm_leads at createProcess time
 * 4. Webhook fetches them and calls this function
 * 5. If ga4SessionId is provided, we first send campaign_details to tie the
 *    UTM source to the session, then send the purchase event.
 *    GA4 then attributes the purchase to the correct campaign in Acquisition reports.
 */
export async function ga4Purchase(
  clientId: string,
  productKey: keyof typeof GA4_PRODUCTS,
  transactionId?: string,
  utm?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string },
  sessionId?: string
): Promise<void> {
  const product = GA4_PRODUCTS[productKey];
  if (!product) return;

  const events: GA4Event[] = [];

  // ── Step 1: campaign_details event (required for UTM attribution in GA4 reports) ──
  // This event must be sent BEFORE the purchase event and MUST include session_id.
  // Without this, UTM params on the purchase event are ignored by GA4 Acquisition reports.
  if (utm?.utmSource && sessionId) {
    events.push({
      name: "campaign_details",
      params: {
        session_id: sessionId,
        campaign_source: utm.utmSource,
        ...(utm.utmMedium   ? { campaign_medium:  utm.utmMedium }   : {}),
        ...(utm.utmCampaign ? { campaign_name:    utm.utmCampaign } : {}),
        ...(utm.utmContent  ? { campaign_content: utm.utmContent }  : {}),
      },
    });
    console.log(`[GA4] Sending campaign_details: source=${utm.utmSource} session=${sessionId}`);
  } else if (utm?.utmSource) {
    // No session_id — log a warning but still try to send purchase with utm params
    console.warn(`[GA4] UTM source=${utm.utmSource} but no session_id — UTM may not appear in Acquisition reports`);
  }

  // ── Step 2: purchase event ──
  events.push({
    name: "purchase",
    params: {
      transaction_id: transactionId ?? `${productKey}-${Date.now()}`,
      value: product.price,
      currency: "ILS",
      // Include session_id on purchase event too for better stitching
      ...(sessionId ? { session_id: sessionId } : {}),
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: 1,
        },
      ],
    },
  });

  // Send both events in a single MP request (GA4 supports up to 25 events per request)
  await sendGA4Events(clientId, events);
}

/** generate_lead — fired when a lead form is submitted */
export async function ga4GenerateLead(
  clientId: string,
  formName: string,
  value?: number
): Promise<void> {
  await sendGA4Events(clientId, [
    {
      name: "generate_lead",
      params: {
        form_name: formName,
        ...(value !== undefined ? { value, currency: "ILS" } : {}),
      },
    },
  ]);
}

/** sign_up — fired when a user completes registration */
export async function ga4SignUp(
  clientId: string,
  method: string
): Promise<void> {
  await sendGA4Events(clientId, [
    {
      name: "sign_up",
      params: { method },
    },
  ]);
}

/** quiz_complete — fired when DNA quiz is completed */
export async function ga4QuizComplete(
  clientId: string,
  quizName: string
): Promise<void> {
  await sendGA4Events(clientId, [
    {
      name: "quiz_complete",
      params: { quiz_name: quizName },
    },
  ]);
}

/**
 * Derive a stable client_id from an email address.
 * GA4 client_id should be consistent per user.
 * We use a simple hash — not cryptographically sensitive.
 */
export function clientIdFromEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${Math.abs(hash)}.${Date.now()}`;
}
