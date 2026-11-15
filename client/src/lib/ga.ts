/**
 * Google Analytics 4 via Google Tag Manager — dataLayer helpers
 * GTM Container: GTM-WJDX3F93
 * GA4 Property: G-ZH1CYQCTMN
 *
 * All events are pushed to window.dataLayer and picked up by GTM.
 * Configure GA4 tags in GTM to fire on these custom events.
 */

import { getMarketingUtmParams } from "./acquisitionTracking";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

/**
 * Hidden UTM fields attached to EVERY GA/GTM dataLayer event.
 * NEVER rendered in the UI — read as one sanitized last-explicit-visit bundle.
 * Link tags are not verified ad clicks and are not merged with legacy keys or
 * first touch. This does not establish GA4 session attribution by itself.
 */
function hiddenUtmFields(): Record<string, string | null> {
  const utm = getMarketingUtmParams();
  // GTM's data model survives individual pushes. Clear missing fields so it
  // cannot silently carry a campaign/medium forward from another visit.
  return {
    utm_source: utm.utmSource ?? null,
    utm_medium: utm.utmMedium ?? null,
    utm_campaign: utm.utmCampaign ?? null,
    utm_content: utm.utmContent ?? null,
    utm_term: utm.utmTerm ?? null,
  };
}

function push(event: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ...event, ...hiddenUtmFields() });
  } catch {
    /* Analytics failures must never block registration or payment. */
  }
}

// ─── Products catalogue ────────────────────────────────────────────────────────
export const GA_PRODUCTS = {
  database: {
    item_id: "database_299",
    item_name: "מאגר רווקים",
    item_category: "matchmaking",
    price: 299,
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
    item_id: "coaching_2960",
    item_name: "ליווי אישי 8 פגישות",
    item_category: "coaching",
    price: 2960,
    currency: "ILS",
  },
  coaching_mas: {
    item_id: "coaching_mas_4200",
    item_name: "ליווי אישי 12 פגישות",
    item_category: "coaching",
    price: 4200,
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
  live_october: {
    item_id: "live_october_2026_149",
    item_name: "סודות ההתאמה המושלמת - לייב אוקטובר",
    item_category: "event",
    price: 149,
    currency: "ILS",
  },
  bundle_tubav: {
    item_id: "bundle_tubav_349",
    item_name: "חבילת טו באב - מאגר + מדריך",
    item_category: "bundle",
    price: 349,
    currency: "ILS",
  },
  bundle_new_year: {
    item_id: "bundle_new_year_399",
    item_name: "חבילת שנה חדשה - מאגר + מדריך + קורס",
    item_category: "bundle",
    price: 399,
    currency: "ILS",
  },
  bundle_november: {
    item_id: "bundle_november_349",
    item_name: "חבילת נובמבר - מאגר + הקורס המלא",
    item_category: "bundle",
    price: 349,
    currency: "ILS",
  },
  match_boost: {
    item_id: "match_boost_1990",
    item_name: "Boost - שליחת הצעת התאמה",
    item_category: "matchmaking",
    price: 19.9,
    currency: "ILS",
  },
  plus: {
    item_id: "plus_99",
    item_name: "Database Plus",
    item_category: "subscription",
    price: 99,
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

/** Purchase from a confirmed server response; optional actual charge overrides list price. */
export function gaPurchase(
  productKey: ProductKey,
  transactionId?: string,
  actualAmount?: number
) {
  const product = GA_PRODUCTS[productKey];
  const value = actualAmount ?? product.price;
  if (!Number.isFinite(value) || value <= 0) return;
  push({
    event: "purchase",
    ecommerce: {
      transaction_id: transactionId || `${productKey}_${Date.now()}`,
      currency: product.currency,
      value,
      items: [{ ...product, price: value, quantity: 1 }],
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
