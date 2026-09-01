import type { TestimonialRecord } from "../drizzle/schema";

export const TESTIMONIAL_CONSENT_VERSION = "2026-09-01-v1";

export const TESTIMONIAL_STATUSES = [
  "draft",
  "candidate",
  "approved_to_contact",
  "sent",
  "submitted",
  "awaiting_consent",
  "awaiting_verification",
  "approved",
  "published",
  "revoked",
  "archived",
] as const;

export const TESTIMONIAL_PROOF_TYPES = ["success", "progress", "product", "database", "service", "internal"] as const;
export const TESTIMONIAL_SOURCE_TYPES = ["match", "database", "dna", "guide", "course", "boost", "service", "manual"] as const;
export const TESTIMONIAL_IDENTITY_SCOPES = ["anonymous", "first_name", "full_name", "full_name_photo"] as const;
export const TESTIMONIAL_CHANNELS = ["website", "organic_social", "email", "paid_ads", "pr"] as const;

export type TestimonialStatus = typeof TESTIMONIAL_STATUSES[number];
export type TestimonialProofType = typeof TESTIMONIAL_PROOF_TYPES[number];
export type TestimonialSourceType = typeof TESTIMONIAL_SOURCE_TYPES[number];
export type TestimonialIdentityScope = typeof TESTIMONIAL_IDENTITY_SCOPES[number];
export type TestimonialChannel = typeof TESTIMONIAL_CHANNELS[number];

export function normalizeTestimonialEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function publicDisplayName(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0];
  return firstName || "";
}

export function deriveSubmissionStatus(input: {
  testimonialText?: string | null;
  consentText: boolean;
  consentPhoto: boolean;
  consentVideo: boolean;
  allowedChannels: TestimonialChannel[];
}): TestimonialStatus {
  const hasPublishableConsent = input.allowedChannels.length > 0
    && (input.consentText || input.consentPhoto || input.consentVideo);
  if (hasPublishableConsent) return "awaiting_verification";
  if ((input.testimonialText || "").trim()) return "awaiting_consent";
  return "submitted";
}

export function consentAllowsChannel(record: TestimonialRecord, channel: TestimonialChannel): boolean {
  if (record.consentRevokedAt) return false;
  if (channel === "website") return record.allowWebsite;
  if (channel === "organic_social") return record.allowOrganicSocial;
  if (channel === "email") return record.allowEmail;
  if (channel === "paid_ads") return record.allowPaidAds;
  return record.allowPr;
}

export function mediaConsentAllows(record: TestimonialRecord, mediaType: "image" | "video"): boolean {
  return mediaType === "image" ? record.consentPhoto : record.consentVideo;
}

export function buildTestimonialDraft(input: {
  firstName: string;
  sourceType: TestimonialSourceType;
}): { subject: string; body: string } {
  const sourceLabels: Record<TestimonialSourceType, string> = {
    match: "החוויה מההתאמה",
    database: "החוויה במאגר",
    dna: "שאלון ה־DNA הזוגי",
    guide: "המדריך לבחור נכון",
    course: "הקורס המסע לזוגיות",
    boost: "שירות Boost",
    service: "השירות שקיבלת",
    manual: "התהליך שעברת איתנו",
  };
  const firstName = input.firstName.trim().split(/\s+/)[0] || "שלום";
  return {
    subject: `${firstName}, נשמח לשמוע איך הייתה החוויה שלך`,
    body: `היי ${firstName}, חשוב לנו ללמוד מה עבד ומה אפשר לשפר ב${sourceLabels[input.sourceType]}. הכנו טופס קצר שבו אפשר לשתף משוב. רק אם תרצו, תוכלו לבחור בנפרד האם לאפשר לנו לפרסם חלק מהדברים ובאיזה היקף.`,
  };
}

export function publicQuestionsForSource(sourceType: TestimonialSourceType): {
  heading: string;
  primaryQuestion: string;
  testimonialPrompt: string;
} {
  const map: Record<TestimonialSourceType, { heading: string; primaryQuestion: string; testimonialPrompt: string }> = {
    match: {
      heading: "נשמח לשמוע איך הייתה ההיכרות",
      primaryQuestion: "מה קרה מאז החיבור ומה היה משמעותי עבורך בתהליך?",
      testimonialPrompt: "אם מתאים, מה היית רוצה לומר למי שמתלבט אם לתת הזדמנות להיכרות?",
    },
    database: {
      heading: "נשמח לשמוע על החוויה במאגר",
      primaryQuestion: "מה הרגיש לך ברור, בטוח או שונה בתהליך?",
      testimonialPrompt: "מה היית רוצה שמי שמתלבט לגבי המאגר ידע?",
    },
    dna: {
      heading: "נשמח לשמוע מה לקחת משאלון ה־DNA",
      primaryQuestion: "איזו תובנה חדשה קיבלת על עצמך או על הבחירות שלך?",
      testimonialPrompt: "איך היית מתארת או מתאר את הערך שקיבלת מהשאלון?",
    },
    guide: {
      heading: "נשמח לשמוע על המדריך לבחור נכון",
      primaryQuestion: "איזו שאלה או תרגיל גרמו לך לעצור ולחשוב?",
      testimonialPrompt: "מה השתנה בדרך שבה את או אתה בוחרים?",
    },
    course: {
      heading: "נשמח לשמוע על המסע לזוגיות",
      primaryQuestion: "איזה חלק בקורס היה משמעותי ומה הצלחת ליישם?",
      testimonialPrompt: "איך היית מתארת או מתאר את התהליך למי ששוקל להצטרף?",
    },
    boost: {
      heading: "נשמח לשמוע על חוויית Boost",
      primaryQuestion: "מה היה ברור, מסקרן או שימושי בתהליך?",
      testimonialPrompt: "מה הערך שקיבלת מהאפשרות לבחור ולשלוח בקשה בעצמך?",
    },
    service: {
      heading: "נשמח לשמוע על השירות שקיבלת",
      primaryQuestion: "מה היה מועיל ומה אפשר לשפר בחוויה מול הצוות?",
      testimonialPrompt: "מה היית רוצה לשתף על השירות שקיבלת?",
    },
    manual: {
      heading: "נשמח לשמוע על התהליך שלך",
      primaryQuestion: "מה היה משמעותי עבורך ומה אפשר לשפר?",
      testimonialPrompt: "מה היית רוצה לשתף עם מי שמתלבט?",
    },
  };
  return map[sourceType];
}
