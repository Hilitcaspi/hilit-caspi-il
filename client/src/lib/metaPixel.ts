// Meta Pixel event tracking helpers
// Pixel ID: 1993907891537316
import { getUtmParams } from "./utils";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

/**
 * Hidden UTM fields attached to every tracked event.
 * These are NEVER rendered in the UI — they are read from the URL / stored
 * campaign data and sent only inside the pixel event payload, so leads and
 * purchases can be attributed to their traffic source (utm_source /
 * utm_medium / utm_campaign).
 */
function hiddenUtmFields(): Record<string, string> {
  const u = getUtmParams();
  const out: Record<string, string> = {};
  if (u.utmSource) out.utm_source = u.utmSource;
  if (u.utmMedium) out.utm_medium = u.utmMedium;
  if (u.utmCampaign) out.utm_campaign = u.utmCampaign;
  return out;
}

export function trackLead(params?: { content_name?: string; value?: number; currency?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", { ...(params || {}), ...hiddenUtmFields() });
  }
}

export function trackPurchase(params: { value: number; currency?: string; content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase", {
      value: params.value,
      currency: params.currency || "ILS",
      content_name: params.content_name,
      ...hiddenUtmFields(),
    });
  }
}

export function trackViewContent(params?: { content_name?: string; content_category?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "ViewContent", { ...(params || {}), ...hiddenUtmFields() });
  }
}

export function trackCompleteRegistration(params?: { content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "CompleteRegistration", { ...(params || {}), ...hiddenUtmFields() });
  }
}

export function trackInitiateCheckout(params?: { value?: number; currency?: string; content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", { ...(params || {}), ...hiddenUtmFields() });
  }
}
