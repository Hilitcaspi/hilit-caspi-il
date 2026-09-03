export type TestimonialConsentChannel = "website" | "organic_social" | "email" | "paid_ads" | "pr";

export const QUICK_TEXT_CHANNELS: TestimonialConsentChannel[] = ["website", "organic_social", "email"];

export function enableQuickTextConsent(currentChannels: TestimonialConsentChannel[]) {
  return {
    consentText: true,
    identityScope: "first_name" as const,
    allowedChannels: Array.from(new Set([...currentChannels, ...QUICK_TEXT_CHANNELS])),
    allowSpellingEdits: true,
  };
}

export function disableQuickTextConsent(currentChannels: TestimonialConsentChannel[], keepSharedChannels: boolean) {
  return {
    consentText: false,
    identityScope: "anonymous" as const,
    allowedChannels: keepSharedChannels ? currentChannels : currentChannels.filter(channel => !QUICK_TEXT_CHANNELS.includes(channel)),
    allowSpellingEdits: false,
  };
}
