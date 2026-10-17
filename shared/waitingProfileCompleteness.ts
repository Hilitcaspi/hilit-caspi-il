export type WaitingProfileCompletenessInput = {
  age?: number | null;
  height?: number | null;
  photoUrl?: string | null;
  dnaType?: string | null;
  about?: string | null;
  aboutMe?: string | null;
  partnerDescription?: string | null;
  occupation?: string | null;
  religiosity?: string | null;
  education?: string | null;
  city?: string | null;
  questionnaireCompletedAt?: number | null;
  hasKids?: boolean | null;
  acceptsKids?: boolean | null;
};

export type WaitingProfileCompleteness = {
  missingFields: string[];
  questionnaireCompleted: boolean;
  isComplete: boolean;
};

const REQUIRED_FIELD_LABELS = {
  age: "גיל",
  height: "גובה",
  photoUrl: "תמונה",
  dnaType: "DNA",
  description: "תיאור אישי",
  partnerDescription: "תיאור התאמה",
  occupation: "עיסוק",
  religiosity: "רמה דתית",
  education: "השכלה",
  city: "עיר",
  questionnaire: "שאלון מדעי",
} as const;

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPositiveNumber(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Calculates only the fields required for a waiting-to-be-matched profile.
 * Boolean profile preferences are intentionally absent: `false` is a valid answer,
 * not a missing answer.
 */
export function getWaitingProfileCompleteness(
  profile: WaitingProfileCompletenessInput,
): WaitingProfileCompleteness {
  const missingFields: string[] = [];

  if (!hasPositiveNumber(profile.age)) missingFields.push(REQUIRED_FIELD_LABELS.age);
  if (!hasPositiveNumber(profile.height)) missingFields.push(REQUIRED_FIELD_LABELS.height);
  if (!hasText(profile.photoUrl)) missingFields.push(REQUIRED_FIELD_LABELS.photoUrl);
  if (!hasText(profile.dnaType)) missingFields.push(REQUIRED_FIELD_LABELS.dnaType);
  if (!hasText(profile.about) && !hasText(profile.aboutMe)) {
    missingFields.push(REQUIRED_FIELD_LABELS.description);
  }
  if (!hasText(profile.partnerDescription)) {
    missingFields.push(REQUIRED_FIELD_LABELS.partnerDescription);
  }
  if (!hasText(profile.occupation)) missingFields.push(REQUIRED_FIELD_LABELS.occupation);
  if (!hasText(profile.religiosity)) missingFields.push(REQUIRED_FIELD_LABELS.religiosity);
  if (!hasText(profile.education)) missingFields.push(REQUIRED_FIELD_LABELS.education);
  if (!hasText(profile.city)) missingFields.push(REQUIRED_FIELD_LABELS.city);

  const questionnaireCompleted = hasPositiveNumber(profile.questionnaireCompletedAt);
  if (!questionnaireCompleted) missingFields.push(REQUIRED_FIELD_LABELS.questionnaire);

  return {
    missingFields,
    questionnaireCompleted,
    isComplete: missingFields.length === 0,
  };
}

/** Parent-friendly shorthand for cards that need only the visible missing labels. */
export function waitingProfileMissingFields(profile: WaitingProfileCompletenessInput): string[] {
  return getWaitingProfileCompleteness(profile).missingFields;
}

export { REQUIRED_FIELD_LABELS };
