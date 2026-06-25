// Meta Pixel event tracking helpers
// Pixel ID: 1993907891537316

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

export function trackLead(params?: { content_name?: string; value?: number; currency?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", params || {});
  }
}

export function trackPurchase(params: { value: number; currency?: string; content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase", {
      value: params.value,
      currency: params.currency || "ILS",
      content_name: params.content_name,
    });
  }
}

export function trackViewContent(params?: { content_name?: string; content_category?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "ViewContent", params || {});
  }
}

export function trackCompleteRegistration(params?: { content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "CompleteRegistration", params || {});
  }
}

export function trackInitiateCheckout(params?: { value?: number; currency?: string; content_name?: string }) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", params || {});
  }
}
