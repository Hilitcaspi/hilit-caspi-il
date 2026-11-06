/**
 * Client-side analytics tracking utility
 * Sends events to /api/track (no auth required, fire-and-forget)
 */

import {
  CHECKOUT_FUNNEL_ACTION,
  sanitizeLandingPath,
  type CheckoutReason,
  type CheckoutStage,
} from "@shared/checkoutFunnel";

type TrackEventType =
  | "email_open"
  | "email_click"
  | "guide_view"
  | "guide_download"
  | "database_view"
  | "database_cta"
  | "course_view"
  | "course_cta"
  | "coaching_view"
  | "coaching_cta"
  | "dna_quiz_start"
  | "dna_quiz_complete"
  | "calendly_click"
  | "whatsapp_click"
  | "podcast_click"
  | "page_view"
  | "button_click"
  | "section_view"
  | "scroll_depth"
  | "form_start"
  | "form_submit"
  | "product_click"
  | "intro_meeting_click"
  | "free_guide_cta"
  | "purchase";

interface TrackPayload {
  eventType: TrackEventType;
  email?: string;
  leadId?: number;
  page?: string;
  emailJourney?: string;
  emailIndex?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  metadata?: Record<string, string | number | boolean>;
}

function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? sessionStorage.getItem("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? sessionStorage.getItem("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? sessionStorage.getItem("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? sessionStorage.getItem("utm_content") ?? undefined,
  };
}

export function track(payload: TrackPayload): void {
  try {
    const enriched = {
      ...getUtmParams(),
      page: typeof window !== "undefined" ? window.location.pathname : undefined,
      ...payload,
    };
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
      keepalive: true,
    }).catch(() => {}); // fire and forget
  } catch {
    // never throw
  }
}

/** Track a page view automatically */
export function trackPageView(page?: string): void {
  track({ eventType: "page_view", page: page ?? (typeof window !== "undefined" ? window.location.pathname : undefined) });
}

const LANDING_PATH_KEY = "hc_landing_path";

/** Remembers the first page this browser tab opened on. Path only, no query string. */
export function rememberLandingPath(): void {
  try {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(LANDING_PATH_KEY)) {
      sessionStorage.setItem(LANDING_PATH_KEY, sanitizeLandingPath(window.location.pathname));
    }
  } catch {
    // storage may be blocked; tracking must never throw
  }
}

export function getLandingPath(): string {
  try {
    if (typeof window === "undefined") return "/";
    return sessionStorage.getItem(LANDING_PATH_KEY) || sanitizeLandingPath(window.location.pathname);
  } catch {
    return "/";
  }
}

/**
 * Anonymous checkout stage event. Never sends email, name, phone, coupon or
 * raw error text; only fixed stage/reason codes, product and landing path.
 */
export function trackCheckoutStage(
  product: string,
  stage: CheckoutStage,
  reason: CheckoutReason | "-" = "-",
): void {
  track({
    eventType: "button_click",
    metadata: {
      action: CHECKOUT_FUNNEL_ACTION,
      product,
      stage,
      reason,
      landing: getLandingPath(),
    },
  });
}
