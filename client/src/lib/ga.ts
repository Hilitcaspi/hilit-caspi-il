/**
 * Google Analytics 4 via Google Tag Manager — dataLayer helpers
 * GTM Container: GTM-WJDX3F93
 * GA4 Property: G-ZH1CYQCTMN
 *
 * All events are pushed to window.dataLayer and picked up by GTM.
 * Configure GA4 tags in GTM to fire on these custom events.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

/**
 * Hidden UTM fields attached to EVERY GA/GTM dataLayer event.
 * NEVER rendered in the UI — read from the URL / stored campaign data and
 * pushed only inside the event payload so GA4 can attribute leads and
 * purchases to their traffic source (utm_source / utm_medium / utm_campaign).
 */
function hiddenUtmFields(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const get = (key: string) =>
    p.get(key) ??
    sessionStorage.getItem(key) ??
    localStorage.getItem(key) ??
    undefined;
  const out: Record<string, string> = {};
  const s = get("utm_source");
  const m = get("utm_medium");
  const c = get("utm_campaign");
  if (s) out.utm_source = s;
  if (m) out.utm_medium = m;
  if (c) out.utm_campaign = c;
  return out;
}

function push(event: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ...event, ...hiddenUtmFields() });
}

// ─── Products catalogue ────────────────────────────────────────────────────────
export const GA_PRODUCTS = {
  database: {
    item_id: "database_249",
    item_name: "מאגר רווקים",
    item_category: "matchmaking",
    price: 249,
    currency: "ILS",
  },
  course: {
    item_id: "course_249",
    item_name: "קורס דיגיטלי המסע",
    item_category: "course",
    price: 249,
    currency: "ILS",
  },
  coaching: {
    item_id: "coaching_2900",
    item_name: "ליווי אישי 8 פגישות",
    item_category: "coaching",
    price: 2900,
    currency: "ILS",
  },
  guide: {
    item_id: "guide_149",
    item_name: "מדריך לבחור נכון",
    item_category: "digital_product",
    price: 149,
    currency: "ILS",
  },
  session: {
    item_id: "session_500",
    item_name: "פגישה אישית חד-פעמית",
    item_category: "coaching",
    price: 500,
    currency: "ILS",
  },
  live_event: {
    item_id: "live_event",
    item_name: "אירוע לייב",
    item_category: "event",
    price: 0, // update when known
    currency: "ILS",
  },
} as const;

export type ProductKey = keyof typeof GA_PRODUCTS;

// ─── E-commerce Events ─────────────────────────────────────────────────────────

/** view_item — fired when user lands on a product/sales page */
export function gaViewItem(productKey: ProductKey) {
  const product = GA_PRODUCTS[productKey];
  push({
    event: "view_item",
    ecommerce: {
      currency: product.currency,
      value: product.price,
      items: [{ ...product, quantity: 1 }],
    },
  });
}

/** begin_checkout — fired when user clicks the payment button (Grow) */
export function gaBeginCheckout(productKey: ProductKey) {
  const product = GA_PRODUCTS[productKey];
  push({
    event: "begin_checkout",
    ecommerce: {
      currency: product.currency,
      value: product.price,
      items: [{ ...product, quantity: 1 }],
    },
  });
}

/** purchase — fired on ThankYou page load (after successful payment) */
export function gaPurchase(productKey: ProductKey, transactionId?: string) {
  const product = GA_PRODUCTS[productKey];
  push({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId || `${productKey}_${Date.now()}`,
      currency: product.currency,
      value: product.price,
      items: [{ ...product, quantity: 1 }],
    },
  });
}

// ─── Form / Lead Events ────────────────────────────────────────────────────────

/** generate_lead — fired when a lead form is successfully submitted */
export function gaGenerateLead(formName: string, value?: number) {
  push({
    event: "generate_lead",
    form_name: formName,
    currency: "ILS",
    value: value ?? 0,
  });
}

/** sign_up — fired when a user completes registration */
export function gaSignUp(method: string) {
  push({
    event: "sign_up",
    method,
  });
}

/** form_submit — generic form submission event */
export function gaFormSubmit(formName: string) {
  push({
    event: "form_submit",
    form_name: formName,
  });
}

/** quiz_complete — fired when DNA quiz is completed */
export function gaQuizComplete(quizName: string) {
  push({
    event: "quiz_complete",
    quiz_name: quizName,
  });
}
