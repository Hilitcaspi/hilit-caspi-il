import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLastUtmAcquisition } from "./acquisitionTracking";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Read only the separate last explicit UTM snapshot. First-touch attribution is
 * intentionally not reconstructed here; qualifying consumers send it under
 * `firstTouch` via getFirstTouchAcquisition().
 */
export function getUtmParams() {
  if (typeof window === "undefined") return {};
  const isUsOrEnglishPage = window.location.hostname === "matchbyhilit.com"
    || window.location.hostname === "www.matchbyhilit.com"
    || window.location.pathname === "/en"
    || window.location.pathname.startsWith("/en/");
  if (isUsOrEnglishPage) {
    try {
      const params = new URLSearchParams(window.location.search);
      const get = (key: string) => params.get(key) ?? sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? undefined;
      return {
        utmSource: get("utm_source"),
        utmMedium: get("utm_medium"),
        utmCampaign: get("utm_campaign"),
        utmContent: get("utm_content"),
        utmTerm: get("utm_term"),
      };
    } catch {
      return {};
    }
  }
  const lastUtm = getLastUtmAcquisition();
  return {
    utmSource: lastUtm?.utmSource,
    utmMedium: lastUtm?.utmMedium,
    utmCampaign: lastUtm?.utmCampaign,
    utmContent: lastUtm?.utmContent,
    utmTerm: lastUtm?.utmTerm,
  };
}

/**
 * Append UTM parameters to a Grow payment URL so they pass through
 * the payment flow and are returned in the Grow webhook payload.
 * Grow passes back any extra query params inside the webhook body.
 */
export function buildGrowUrl(baseUrl: string): string {
  if (typeof window === "undefined") return baseUrl;
  const utm = getUtmParams();
  if (!utm.utmSource && !utm.utmMedium && !utm.utmCampaign) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (utm.utmSource) url.searchParams.set("utm_source", utm.utmSource);
    if (utm.utmMedium) url.searchParams.set("utm_medium", utm.utmMedium);
    if (utm.utmCampaign) url.searchParams.set("utm_campaign", utm.utmCampaign);
    if (utm.utmContent) url.searchParams.set("utm_content", utm.utmContent);
    return url.toString();
  } catch {
    return baseUrl;
  }
}
