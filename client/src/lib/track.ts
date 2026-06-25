/**
 * Client-side analytics tracking utility
 * Sends events to /api/track (no auth required, fire-and-forget)
 */

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
  | "page_view";

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
