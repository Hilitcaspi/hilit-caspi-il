import { CITY_DB, haversineKm, normalizeIsraeliCityName } from "./cities";

export type PairPreferenceState = "met" | "not_met" | "unknown";

export type PairPreferenceIndicator = {
  state: PairPreferenceState;
  reason: string;
};

export type PairPreferenceIndicatorKey =
  | "age"
  | "gender"
  | "location"
  | "height"
  | "religiosity"
  | "education"
  | "hasKids"
  | "wantsKids"
  | "pets"
  | "smoking";

/**
 * A deliberately small, display-only view of the profile fields used by the
 * indicators. Every property is optional because an incomplete profile must
 * produce an explicit "unknown", never an inferred preference.
 */
export type PairPreferenceProfile = {
  age?: number | null;
  gender?: string | null;
  city?: string | null;
  height?: number | null;
  religiosity?: string | null;
  education?: string | null;
  hasKids?: boolean | null;
  wantsKids?: string | null;
  hasPets?: boolean | null;
  smokingStatus?: string | null;
  minAgePreference?: number | null;
  maxAgePreference?: number | null;
  minHeightPreference?: number | null;
  maxHeightPreference?: number | null;
  seekingGender?: string | null;
  locationPreference?: string | null;
  religiosityPreference?: string | null;
  openToPartnerWithKids?: string | null;
  acceptsKids?: boolean | null;
  acceptsPets?: boolean | null;
  smokingPreference?: string | null;
};

export type PairPreferenceIndicators = Record<
  PairPreferenceIndicatorKey,
  PairPreferenceIndicator
>;

type Profile = PairPreferenceProfile | null | undefined;
type NumericRange = { min?: number; max?: number };

const RELIGIOSITY_VALUES = ["secular", "traditional", "religious", "orthodox", "datlash"] as const;
const GENDER_VALUES = ["male", "female"] as const;
const SEEKING_GENDER_VALUES = ["male", "female", "any"] as const;
const WANTS_KIDS_VALUES = ["yes", "no", "open"] as const;
const SMOKING_STATUS_VALUES = ["no", "occasionally", "yes"] as const;
const SMOKING_PREFERENCE_VALUES = ["no_smokers", "occasionally_ok", "doesnt_matter"] as const;
const OPEN_TO_KIDS_VALUES = ["yes", "no", "depends_on_age"] as const;

const religiosityLabels: Record<(typeof RELIGIOSITY_VALUES)[number], string> = {
  secular: "חילוניות",
  traditional: "מסורתיות",
  religious: "דתיות",
  orthodox: "חרדיות",
  datlash: "יציאה מהדת",
};

const genderPreferenceLabels: Record<(typeof SEEKING_GENDER_VALUES)[number], string> = {
  male: "גברים",
  female: "נשים",
  any: "כל מגדר",
};

const smokingPreferenceLabels: Record<(typeof SMOKING_PREFERENCE_VALUES)[number], string> = {
  no_smokers: "ללא עישון",
  occasionally_ok: "עד עישון מזדמן",
  doesnt_matter: "ללא מגבלת עישון",
};

function indicator(state: PairPreferenceState, reason: string): PairPreferenceIndicator {
  return { state, reason };
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isDocumentedBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** A range may be open on either side, but every supplied side must be valid. */
function documentedRange(
  minValue: unknown,
  maxValue: unknown,
  allowedMin: number,
  allowedMax: number,
): NumericRange | null {
  const hasMin = minValue !== null && minValue !== undefined;
  const hasMax = maxValue !== null && maxValue !== undefined;
  if (!hasMin && !hasMax) return {};

  if ((hasMin && !isIntegerInRange(minValue, allowedMin, allowedMax)) ||
      (hasMax && !isIntegerInRange(maxValue, allowedMin, allowedMax))) {
    return null;
  }

  const range: NumericRange = {
    ...(hasMin ? { min: minValue as number } : {}),
    ...(hasMax ? { max: maxValue as number } : {}),
  };
  if (range.min !== undefined && range.max !== undefined && range.min > range.max) return null;
  return range;
}

function hasDocumentedRange(range: NumericRange): boolean {
  return range.min !== undefined || range.max !== undefined;
}

function formatRange(range: NumericRange, unit = ""): string {
  const suffix = unit ? ` ${unit}` : "";
  if (range.min !== undefined && range.max !== undefined) return `${range.min}–${range.max}${suffix}`;
  if (range.min !== undefined) return `מ-${range.min}${suffix}`;
  return `עד ${range.max}${suffix}`;
}

function evaluateRange(
  candidateValue: unknown,
  seekerMin: unknown,
  seekerMax: unknown,
  allowedMin: number,
  allowedMax: number,
  criterion: "גיל" | "גובה",
  unit = "",
): PairPreferenceIndicator {
  const range = documentedRange(seekerMin, seekerMax, allowedMin, allowedMax);
  if (range === null) {
    return indicator("unknown", `${criterion}: טווח ההעדפה המתועד אינו תקין.`);
  }
  if (!hasDocumentedRange(range)) {
    return indicator("unknown", `${criterion}: אין טווח העדפה מתועד לבדיקה.`);
  }
  if (!isIntegerInRange(candidateValue, allowedMin, allowedMax)) {
    return indicator("unknown", `${criterion}: אין נתון מתועד ותקין לבדיקת הטווח ${formatRange(range, unit)}.`);
  }

  const met = (range.min === undefined || candidateValue >= range.min) &&
    (range.max === undefined || candidateValue <= range.max);
  return indicator(
    met ? "met" : "not_met",
    `${criterion}: הנתון ${met ? "עומד" : "אינו עומד"} בטווח ההעדפה המתועד ${formatRange(range, unit)}.`,
  );
}

function evaluateGender(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const requestedGender = seeker?.seekingGender;
  const candidateGender = candidate?.gender;
  if (!isOneOf(requestedGender, SEEKING_GENDER_VALUES)) {
    return indicator("unknown", "מגדר: אין העדפת מגדר מפורשת ותקינה מתועדת.");
  }
  if (!isOneOf(candidateGender, GENDER_VALUES)) {
    return indicator("unknown", "מגדר: אין מגדר מתועד ותקין לבדיקת ההעדפה.");
  }

  const met = requestedGender === "any" || requestedGender === candidateGender;
  return indicator(
    met ? "met" : "not_met",
    `מגדר: המגדר המתועד ${met ? "תואם" : "אינו תואם"} להעדפה המתועדת: ${genderPreferenceLabels[requestedGender]}.`,
  );
}

function knownCity(city: unknown) {
  if (typeof city !== "string") return null;
  const normalized = normalizeIsraeliCityName(city);
  return normalized ? CITY_DB[normalized] ?? null : null;
}

function evaluateLocation(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const preference = seeker?.locationPreference;
  if (preference !== "close" && preference !== "anywhere") {
    return indicator("unknown", "מיקום: אין העדפת מרחק מפורשת ותקינה מתועדת.");
  }

  const candidateCity = knownCity(candidate?.city);
  if (!candidateCity) {
    return indicator("unknown", "מיקום: אין עיר מגורים מוכרת מתועדת לאדם.");
  }
  if (preference === "anywhere") {
    return indicator("met", "מיקום: קיימת עיר מגורים מוכרת מתועדת; העדפת המרחק היא ללא מגבלה.");
  }

  const seekerCity = knownCity(seeker?.city);
  if (!seekerCity) {
    return indicator("unknown", "מיקום: העדפת הקרבה תועדה, אך אין שתי ערים מוכרות למדידת המרחק.");
  }

  const distanceKm = haversineKm(candidateCity.lat, candidateCity.lng, seekerCity.lat, seekerCity.lng);
  const met = distanceKm <= 30;
  const displayedKm = Math.ceil(distanceKm * 10) / 10;
  return indicator(
    met ? "met" : "not_met",
    `מיקום: מרחק משוער של ${displayedKm} ק״מ בין מרכזי הערים; העדפת קרבה היא עד 30 ק״מ ולכן היא ${met ? "מתקיימת" : "אינה מתקיימת"}.`,
  );
}

function parseReligiosityPreference(value: unknown): readonly (typeof RELIGIOSITY_VALUES)[number][] | null {
  if (typeof value !== "string") return null;
  const values = value.split(",").map(item => item.trim());
  if (values.length === 0 || values.some(value => !isOneOf(value, RELIGIOSITY_VALUES))) return null;
  return values as (typeof RELIGIOSITY_VALUES)[number][];
}

function evaluateReligiosity(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const preferences = parseReligiosityPreference(seeker?.religiosityPreference);
  if (!preferences) {
    return indicator("unknown", "דתיות: אין רשימת העדפה תקינה ומתועדת לבדיקה.");
  }
  const candidateReligiosity = candidate?.religiosity;
  if (!isOneOf(candidateReligiosity, RELIGIOSITY_VALUES)) {
    return indicator("unknown", "דתיות: אין ערך דתיות מתועד ותקין לבדיקת ההעדפה.");
  }

  const met = preferences.includes(candidateReligiosity);
  const preferenceText = preferences.map(value => religiosityLabels[value]).join(", ");
  return indicator(
    met ? "met" : "not_met",
    `דתיות: הערך המתועד ${met ? "תואם" : "אינו תואם"} להעדפה המתועדת: ${preferenceText}.`,
  );
}

function hasContradictoryKidsPreferences(seeker: Profile): boolean {
  const modern = seeker?.openToPartnerWithKids;
  const legacy = seeker?.acceptsKids;
  if ((modern !== "yes" && modern !== "no") || !isDocumentedBoolean(legacy)) return false;
  return (modern === "yes") !== legacy;
}

function evaluateHasKids(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const candidateHasKids = candidate?.hasKids;
  if (!isDocumentedBoolean(candidateHasKids)) {
    return indicator("unknown", "ילדים קיימים: אין נתון מתועד לבדיקת ההעדפה.");
  }
  if (hasContradictoryKidsPreferences(seeker)) {
    return indicator("unknown", "ילדים קיימים: קיימת סתירה בין ההעדפה החדשה להעדפה הישנה, ולכן לא ניתן לקבוע בבטחה.");
  }

  const modern = seeker?.openToPartnerWithKids;
  const legacy = seeker?.acceptsKids;
  const modernDocumented = modern !== null && modern !== undefined;
  const legacyDocumented = legacy !== null && legacy !== undefined;
  if (modernDocumented && !isOneOf(modern, OPEN_TO_KIDS_VALUES)) {
    return indicator("unknown", "ילדים קיימים: ההעדפה החדשה המתועדת אינה תקינה.");
  }
  if (legacyDocumented && !isDocumentedBoolean(legacy)) {
    return indicator("unknown", "ילדים קיימים: ההעדפה הישנה המתועדת אינה תקינה.");
  }
  if (!modernDocumented && !legacyDocumented) {
    return indicator("unknown", "ילדים קיימים: אין העדפה מתועדת לבדיקת הנתון.");
  }

  // When the candidate has no children, a documented preference is sufficient;
  // no assumption is made about an undocumented preference.
  if (!candidateHasKids) {
    return indicator("met", "ילדים קיימים: אין ילדים מתועדים אצל האדם וההעדפה תועדה.");
  }

  if (modern === "depends_on_age") {
    return indicator("unknown", "ילדים קיימים: ההעדפה תלויה בגיל הילדים, וגיל הילדים אינו מתועד.");
  }
  const acceptsKids = modern === "yes" || (!modernDocumented && legacy === true);
  const met = acceptsKids;
  return indicator(
    met ? "met" : "not_met",
    `ילדים קיימים: ההעדפה המתועדת ${met ? "מקבלת" : "אינה מקבלת"} זוגיות עם אדם שיש לו ילדים.`,
  );
}

function evaluateWantsKids(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const candidatePreference = candidate?.wantsKids;
  const seekerPreference = seeker?.wantsKids;
  if (!isOneOf(candidatePreference, WANTS_KIDS_VALUES) || !isOneOf(seekerPreference, WANTS_KIDS_VALUES)) {
    return indicator("unknown", "כוונת ילדים: נדרשות שתי העדפות מתועדות ותקינות כדי לקבוע התאמה.");
  }

  const met = candidatePreference === seekerPreference ||
    candidatePreference === "open" || seekerPreference === "open";
  const reason = met
    ? candidatePreference === "open" || seekerPreference === "open"
      ? "כוונת ילדים: אחת ההעדפות המתועדות היא פתוחה, ולכן אין סתירה מתועדת."
      : "כוונת ילדים: שתי ההעדפות המתועדות תואמות."
    : "כוונת ילדים: ההעדפות המתועדות סותרות זו את זו (כן לעומת לא).";
  return indicator(met ? "met" : "not_met", reason);
}

function evaluatePets(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const candidateHasPets = candidate?.hasPets;
  const acceptsPets = seeker?.acceptsPets;
  if (!isDocumentedBoolean(candidateHasPets)) {
    return indicator("unknown", "חיות מחמד: אין נתון מתועד על חיות מחמד לבדיקת ההעדפה.");
  }
  if (!isDocumentedBoolean(acceptsPets)) {
    return indicator("unknown", "חיות מחמד: אין העדפה מתועדת לבדיקת הנתון.");
  }

  const met = !candidateHasPets || acceptsPets;
  return indicator(
    met ? "met" : "not_met",
    `חיות מחמד: הנתון המתועד ${met ? "תואם" : "אינו תואם"} להעדפת הקבלה של חיות מחמד.`,
  );
}

function evaluateSmoking(candidate: Profile, seeker: Profile): PairPreferenceIndicator {
  const status = candidate?.smokingStatus;
  const preference = seeker?.smokingPreference;
  if (!isOneOf(status, SMOKING_STATUS_VALUES)) {
    return indicator("unknown", "עישון: אין סטטוס עישון מתועד ותקין לבדיקת ההעדפה.");
  }
  if (!isOneOf(preference, SMOKING_PREFERENCE_VALUES)) {
    return indicator("unknown", "עישון: אין העדפת עישון מתועדת ותקינה.");
  }

  const met = preference === "doesnt_matter" ||
    (preference === "no_smokers" && status === "no") ||
    (preference === "occasionally_ok" && (status === "no" || status === "occasionally"));
  return indicator(
    met ? "met" : "not_met",
    `עישון: סטטוס העישון המתועד ${met ? "תואם" : "אינו תואם"} להעדפה: ${smokingPreferenceLabels[preference]}.`,
  );
}

/**
 * Returns presentation indicators for facts belonging to `candidate`, evaluated
 * only against preferences or documented fields belonging to `seeker`.
 * This helper is local, synchronous, immutable, and does not change matching
 * scores or matching eligibility.
 */
export function getPairPreferenceIndicators(
  candidate?: PairPreferenceProfile | null,
  seeker?: PairPreferenceProfile | null,
): PairPreferenceIndicators {
  return {
    age: evaluateRange(candidate?.age, seeker?.minAgePreference, seeker?.maxAgePreference, 18, 120, "גיל"),
    gender: evaluateGender(candidate, seeker),
    location: evaluateLocation(candidate, seeker),
    height: evaluateRange(candidate?.height, seeker?.minHeightPreference, seeker?.maxHeightPreference, 100, 250, "גובה", "ס״מ"),
    religiosity: evaluateReligiosity(candidate, seeker),
    education: indicator("unknown", "השכלה: אין בסכמה העדפת השכלה מתועדת, ולכן לא ניתן לקבוע עמידה בהעדפה."),
    hasKids: evaluateHasKids(candidate, seeker),
    wantsKids: evaluateWantsKids(candidate, seeker),
    pets: evaluatePets(candidate, seeker),
    smoking: evaluateSmoking(candidate, seeker),
  };
}
