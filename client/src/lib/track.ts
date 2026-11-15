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
import {
  marketingUtmParams,
  sanitizeMarketingPagePath,
} from "@shared/marketingAttributionStorage";
import { getMarketingUtmParams } from "./acquisitionTracking";

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

function getUtmParams(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
} {
  const utm = getMarketingUtmParams();
  return {
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    utmContent: utm.utmContent,
  };
}

export function track(payload: TrackPayload): void {
  try {
    const { utmSource, utmMedium, utmCampaign, utmContent, page, ...event } =
      payload;
    const hasExplicitBundle = [
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmContent",
    ].some(field => Object.prototype.hasOwnProperty.call(payload, field));
    // Explicit callers replace the entire bundle, never partially merge their
    // source/campaign with an unrelated persisted visit. Sanitize both paths.
    const utm = hasExplicitBundle
      ? marketingUtmParams({ utmSource, utmMedium, utmCampaign, utmContent })
      : getUtmParams();
    const enriched = {
      ...event,
      ...utm,
      page: sanitizeMarketingPagePath(
        page ??
          (typeof window !== "undefined" ? window.location.pathname : undefined)
      ),
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
  track({
    eventType: "page_view",
    page:
      page ??
      (typeof window !== "undefined" ? window.location.pathname : undefined),
  });
}

const LANDING_PATH_KEY = "hc_landing_path";

/** Remembers the first page this browser tab opened on. Path only, no query string. */
export function rememberLandingPath(): void {
  try {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(LANDING_PATH_KEY)) {
      sessionStorage.setItem(
        LANDING_PATH_KEY,
        sanitizeLandingPath(
          sanitizeMarketingPagePath(window.location.pathname) ?? "/"
        )
      );
    }
  } catch {
    // storage may be blocked; tracking must never throw
  }
}

export function getLandingPath(): string {
  try {
    if (typeof window === "undefined") return "/";
    return sanitizeLandingPath(
      sanitizeMarketingPagePath(
        sessionStorage.getItem(LANDING_PATH_KEY) || window.location.pathname
      ) ?? "/"
    );
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
  reason: CheckoutReason | "-" = "-"
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
