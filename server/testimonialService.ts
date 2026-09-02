import type { TestimonialRecord } from "../drizzle/schema";

export const TESTIMONIAL_CONSENT_VERSION = "2026-09-02-v2";

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
export const TESTIMONIAL_SOURCE_TYPES = ["match", "database", "dna", "guide", "course", "bundle", "boost", "service", "manual"] as const;
export const TESTIMONIAL_IDENTITY_SCOPES = ["anonymous", "first_name", "full_name", "full_name_photo"] as const;
export const TESTIMONIAL_CHANNELS = ["website", "organic_social", "email", "paid_ads", "pr"] as const;
export const TESTIMONIAL_SURVEY_KINDS = ["positive_experience", "satisfaction_survey"] as const;
export const TESTIMONIAL_TOUCHPOINTS = [
  "match_mutual",
  "match_week",
  "dna_result",
  "database_complete",
  "guide_complete",
  "course_complete",
  "product_followup",
  "personal_session",
  "historical_match",
  "representative_sample",
  "manual",
] as const;
export const TESTIMONIAL_REWARD_TYPES = ["none", "date_map", "boost_free", "boost_one_shekel"] as const;

export type TestimonialStatus = typeof TESTIMONIAL_STATUSES[number];
export type TestimonialProofType = typeof TESTIMONIAL_PROOF_TYPES[number];
export type TestimonialSourceType = typeof TESTIMONIAL_SOURCE_TYPES[number];
export type TestimonialIdentityScope = typeof TESTIMONIAL_IDENTITY_SCOPES[number];
export type TestimonialChannel = typeof TESTIMONIAL_CHANNELS[number];
export type TestimonialSurveyKind = typeof TESTIMONIAL_SURVEY_KINDS[number];
export type TestimonialTouchpoint = typeof TESTIMONIAL_TOUCHPOINTS[number];
export type TestimonialRewardType = typeof TESTIMONIAL_REWARD_TYPES[number];

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

export function resolveFeedbackRewardGrant(input: {
  surveyKind: TestimonialSurveyKind;
  rewardType: TestimonialRewardType;
  existingGrantedAt?: number | null;
  now: number;
}): number | null {
  if (input.surveyKind !== "positive_experience" || input.rewardType === "none") return null;
  return input.existingGrantedAt || input.now;
}

export function buildTestimonialDraft(input: {
  firstName: string;
  sourceType: TestimonialSourceType;
  surveyKind?: TestimonialSurveyKind;
}): { subject: string; body: string } {
  const sourceLabels: Record<TestimonialSourceType, string> = {
    match: "החוויה מההתאמה",
    database: "החוויה במאגר",
    dna: "שאלון ה־DNA הזוגי",
    guide: "המדריך לבחור נכון",
    course: "הקורס המסע לזוגיות",
    bundle: "חבילת החג",
    boost: "שירות Boost",
    service: "השירות שקיבלת",
    manual: "התהליך שעברת איתנו",
  };
  const firstName = input.firstName.trim().split(/\s+/)[0] || "שלום";
  if (input.surveyKind === "satisfaction_survey") {
    return {
      subject: `${firstName}, נשמח לשמוע מה דעתך`,
      body: `היי ${firstName}, הכנו סקר קצר על ${sourceLabels[input.sourceType]}. המטרה היא להבין מה עובד ומה נכון לשפר. התשובות נשמרות לצורכי למידה, ולא ישמשו לפרסום ללא בקשת רשות נפרדת.`,
    };
  }
  return {
    subject: `${firstName}, אשמח לשמוע על החוויה שלך ולהעניק לך מתנה אישית ממני`,
    body: `היי ${firstName}, אשמח לשמוע בכמה מילים על ${sourceLabels[input.sourceType]} ועל מה שהיה משמעותי עבורך. השיתוף שלך יכול לעזור לעוד אנשים שמחפשים אהבה להכיר דרך, תהליך וכלים שיכולים לקדם גם אותם. בסיום מחכה לך מתנה אישית ממני. המתנה ניתנת על עצם השיתוף, גם בלי אישור לפרסם. רק אם מתאים לך, אפשר לבחור בנפרד מה מותר לנו לשתף, היכן ובאיזו זהות.`,
  };
}

export function publicQuestionsForSource(sourceType: TestimonialSourceType, surveyKind: TestimonialSurveyKind = "positive_experience"): {
  heading: string;
  intro: string;
  primaryQuestion: string;
  secondaryQuestion: string;
  testimonialPrompt: string;
  showRatings: boolean;
  showImprovement: boolean;
  rewardLabel: string | null;
} {
  if (surveyKind === "satisfaction_survey") {
    return {
      heading: "חשוב לנו לשמוע מה דעתך",
      intro: "הסקר הקצר עוזר לנו להבין מה עובד ומה נכון לשפר. התשובות נשמרות לצורכי למידה ולא יפורסמו ללא רשות נפרדת.",
      primaryQuestion: "איך הייתה החוויה שלך עד עכשיו?",
      secondaryQuestion: "מה היה מועיל במיוחד, ומה אפשר לעשות טוב יותר?",
      testimonialPrompt: "אם יש משהו שתרצו לאפשר לנו לשתף בעתיד, אפשר לכתוב אותו כאן בנפרד",
      showRatings: true,
      showImprovement: true,
      rewardLabel: null,
    };
  }

  const map: Record<TestimonialSourceType, { heading: string; primaryQuestion: string; secondaryQuestion: string; testimonialPrompt: string }> = {
    match: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "איך הייתה ההיכרות ומה הרגיש טוב או משמעותי בחיבור?",
      secondaryQuestion: "מה חשבת על הדרך שבה ההתאמה נבנתה והוצגה לך?",
      testimonialPrompt: "מה היית רוצה לספר למי שמתלבט אם לתת הזדמנות לתהליך?",
    },
    database: {
      heading: "אשמח לשמוע על החוויה שלך במאגר",
      primaryQuestion: "מה הרגיש לך ברור, אישי או שונה בתהליך ההצטרפות?",
      secondaryQuestion: "איזה חלק בתהליך נתן לך תחושה שיש כאן דרך אחרת להכיר?",
      testimonialPrompt: "מה היית רוצה שמי שמתלבט לגבי המאגר ידע?",
    },
    dna: {
      heading: "אשמח לשמוע מה לקחת משאלון ה־DNA",
      primaryQuestion: "איזו תובנה חדשה קיבלת על עצמך או על הבחירות שלך?",
      secondaryQuestion: "מה בתוצאה הרגיש לך מדויק או מסקרן במיוחד?",
      testimonialPrompt: "איך אפשר לתאר את הערך שקיבלת מהשאלון?",
    },
    guide: {
      heading: "אשמח לשמוע על המדריך לבחור נכון",
      primaryQuestion: "איזו שאלה או תרגיל גרמו לך לעצור ולחשוב?",
      secondaryQuestion: "מה השתנה בדרך שבה מסתכלים על בחירה והתאמה?",
      testimonialPrompt: "מה היית רוצה לספר למי ששוקלים לקרוא את המדריך?",
    },
    course: {
      heading: "אשמח לשמוע על המסע לזוגיות",
      primaryQuestion: "איזה חלק בקורס היה משמעותי ומה הצלחת ליישם?",
      secondaryQuestion: "איזו תובנה תלווה אותך גם אחרי סיום הקורס?",
      testimonialPrompt: "איך אפשר לתאר את התהליך למי ששוקלים להצטרף?",
    },
    bundle: {
      heading: "אשמח לשמוע על חוויית חבילת החג",
      primaryQuestion: "איזה מהכלים בחבילה היה משמעותי עבורך עד עכשיו?",
      secondaryQuestion: "איזו תובנה או פעולה חדשה לקחת מהשילוב בין המאגר, המדריך והקורס?",
      testimonialPrompt: "מה היית רוצה לספר למי ששוקלים לבחור בחבילה?",
    },
    boost: {
      heading: "אשמח לשמוע על חוויית Boost",
      primaryQuestion: "מה היה ברור, מסקרן או שימושי בתהליך?",
      secondaryQuestion: "איך הרגישה האפשרות לבחור ולשלוח בקשה באופן עצמאי?",
      testimonialPrompt: "מה הערך שקיבלת מהאפשרות לבחור ולשלוח בקשה בעצמך?",
    },
    service: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "מה היה משמעותי או מועיל עבורך בפגישה ובתהליך?",
      secondaryQuestion: "עם איזו תובנה או תחושה יצאת מהמפגש?",
      testimonialPrompt: "מה היית רוצה לשתף על השירות שקיבלת?",
    },
    manual: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "מה היה משמעותי עבורך בתהליך?",
      secondaryQuestion: "מה הרגיש לך מדויק או מועיל במיוחד?",
      testimonialPrompt: "מה היית רוצה לשתף עם מי שמתלבט?",
    },
  };
  return {
    ...map[sourceType],
    intro: "כמה מילים ממך יעזרו לנו לספר על הדרך כפי שהיא באמת. השיתוף שלך יכול לעזור לעוד אנשים שמחפשים אהבה להכיר כלים ותהליכים שיכולים לקדם גם אותם. בסיום מחכה לך מתנה אישית מהילית.",
    showRatings: false,
    showImprovement: false,
    rewardLabel: "מפת הדייט הבא",
  };
}
