import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Read UTM parameters from:
 * 1. Current URL params (highest priority)
 * 2. sessionStorage (persisted across in-app navigation)
 * 3. localStorage (survives cross-domain redirects like Grow payment page)
 */
export function getUtmParams() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const get = (key: string) =>
    p.get(key) ??
    sessionStorage.getItem(key) ??
    localStorage.getItem(key) ??
    undefined;
  return {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    utmContent: get("utm_content"),
    utmTerm: get("utm_term"),
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
