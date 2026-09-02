import type { TestimonialRecord } from "../drizzle/schema";

export const TESTIMONIAL_CONSENT_VERSION = "2026-09-02-v3";

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
  outcomeQuestion: string | null;
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
      outcomeQuestion: null,
      showRatings: true,
      showImprovement: true,
      rewardLabel: null,
    };
  }

  const map: Record<TestimonialSourceType, { heading: string; primaryQuestion: string; secondaryQuestion: string; testimonialPrompt: string; outcomeQuestion: string }> = {
    match: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "עוד לפני ההיכרות עצמה, מה בתהליך, בשיטה או בליווי של הילית גרם לך להרגיש שיש כאן דרך אחרת למצוא אהבה?",
      secondaryQuestion: "מה היה מקצועי, אישי או מדויק בדרך שבה החיבור נבנה והוצג לך?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה שואל למה כדאי לתת הזדמנות לתהליך של הילית, מה היית רוצה לומר לו?",
      outcomeQuestion: "ולבסוף, אם הייתה לך התאמה טובה, מה בחיבור עצמו הפתיע או ריגש אותך לטובה?",
    },
    database: {
      heading: "אשמח לשמוע על החוויה שלך במאגר",
      primaryQuestion: "מה במאגר ובדרך האישית של הילית הרגיש לך שונה מאפליקציות או מהיכרויות שניסית בעבר?",
      secondaryQuestion: "מה בתהליך, בשירות או בהסברים נתן לך תחושת ביטחון וערך?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם להצטרף למאגר, מה היית רוצה לומר לו?",
      outcomeQuestion: "אם כבר קיבלת התאמה, מה הרגיש טוב או מדויק בדרך שבה היא נבחרה והוצגה לך?",
    },
    dna: {
      heading: "אשמח לשמוע מה לקחת משאלון ה־DNA",
      primaryQuestion: "איזו תובנה חדשה קיבלת על עצמך, על הבחירות שלך או על הזוגיות שמתאימה לך?",
      secondaryQuestion: "מה גרם לך להרגיש שמדובר בשאלון מדויק ובעל ערך ולא בעוד שאלון כללי?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה שואל למה כדאי למלא את שאלון ה־DNA, מה היית רוצה לומר לו?",
      outcomeQuestion: "איזה צעד, מחשבה או שינוי כבר התחילו אצלך בעקבות התוצאה?",
    },
    guide: {
      heading: "אשמח לשמוע על המדריך לבחור נכון",
      primaryQuestion: "איזו שאלה, תובנה או משימה במדריך גרמו לך לעצור ולהסתכל אחרת על הבחירות שלך?",
      secondaryQuestion: "מה במדריך הרגיש לך מקצועי, אישי או שימושי במיוחד?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם לקרוא את המדריך, מה היית רוצה לומר לו?",
      outcomeQuestion: "מה כבר השתנה בדרך שבה את או אתה בוחנים התאמה בעקבות המדריך?",
    },
    course: {
      heading: "אשמח לשמוע על המסע לזוגיות",
      primaryQuestion: "איזה חלק בקורס היה משמעותי עבורך, ומה הצלחת להבין או ליישם בזכותו?",
      secondaryQuestion: "מה בדרך, בשיטה או בליווי של הילית הרגיש לך מדויק ובעל ערך?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם להצטרף למסע לזוגיות, מה היית רוצה לומר לו?",
      outcomeQuestion: "איזה שינוי, תובנה או צעד ימשיכו איתך גם אחרי סיום הקורס?",
    },
    bundle: {
      heading: "אשמח לשמוע על חוויית חבילת החג",
      primaryQuestion: "איזה כלי בחבילת החג נתן לך עד עכשיו את הערך המשמעותי ביותר, ולמה?",
      secondaryQuestion: "מה בשילוב בין המאגר, המדריך והקורס גרם לך להרגיש שיש כאן תהליך שלם ומדויק?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם לבחור בחבילת החג, מה היית רוצה לומר לו?",
      outcomeQuestion: "איזו תובנה, פעולה או הזדמנות חדשה כבר נוצרו עבורך בזכות החבילה?",
    },
    boost: {
      heading: "אשמח לשמוע על חוויית Boost",
      primaryQuestion: "מה היה מסקרן, ברור או שימושי באפשרות לבחור ולשלוח בקשת התאמה בעצמך?",
      secondaryQuestion: "מה בשירות Boost נתן לך תחושה שיש יותר אפשרויות ויותר שליטה בתהליך?",
      testimonialPrompt: "אם חבר מאגר היה מתלבט אם להשתמש ב־Boost, מה היית רוצה לומר לו?",
      outcomeQuestion: "אם נוצר חיבור בעקבות Boost, מה היה טוב או מפתיע בחוויה?",
    },
    service: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "מה היה משמעותי או מועיל במיוחד בפגישה ובתהליך עם הילית?",
      secondaryQuestion: "מה בדרך, בהקשבה או בשירות גרם לך להרגיש שרואים ומבינים אותך?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם לפנות להילית, מה היית רוצה לומר לו?",
      outcomeQuestion: "עם איזו תובנה, תחושה או פעולה יצאת מהמפגש?",
    },
    manual: {
      heading: "אשמח לשמוע על החוויה שלך",
      primaryQuestion: "מה בתהליך עם הילית היה משמעותי, אישי או בעל ערך עבורך?",
      secondaryQuestion: "מה בשיטה, בליווי או בשירות הרגיש לך מדויק במיוחד?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם להכיר את הדרך של הילית, מה היית רוצה לומר לו?",
      outcomeQuestion: "איזו תוצאה, תובנה או תחושה טובה כבר לקחת מהתהליך?",
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
