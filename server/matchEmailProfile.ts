import type { Single } from "../drizzle/schema";

/** Explicit public profile allowlist. Never spreads a customer row into an email. */
export function matchEmailProfile(single: Partial<Single>) {
  return {
    matchFirstName: single.firstName || "",
    matchAge: single.age ?? 0,
    matchCity: single.city || "",
    matchOccupation: single.occupation ?? undefined,
    matchDnaType: single.dnaType ?? undefined,
    matchPhotoUrl: single.photoUrl ?? undefined,
    matchEducation: single.education ?? undefined,
    matchHeight: single.height ?? undefined,
    matchAbout: single.about ?? undefined,
    matchMaritalStatus: single.maritalStatus ?? undefined,
    matchGender: single.gender ?? undefined,
    matchHasKids: single.hasKids ?? undefined,
    matchNumKids: single.numKids ?? undefined,
    matchWantsKids: single.wantsKids ?? undefined,
    matchReligiosity: single.religiosity ?? undefined,
    matchSmokingStatus: single.smokingStatus ?? undefined,
    matchHasPets: single.hasPets ?? undefined,
    matchPetType: single.petType ?? undefined,
    matchInterests: single.interests ?? undefined,
    matchReligiosityOrigin: single.religiosityOrigin ?? undefined,
    matchShomerShabbat: single.shomerShabbat ?? undefined,
  };
}

/** Only use the admin-reviewed public explanation, never private staff notes. */
export function matchEmailReason(match: { autoExplanation?: string | null }, isBoost = false) {
  const text = String(match.autoExplanation || "").trim();
  if (isBoost || text.startsWith("[")) return "ההצעה מבוססת על נתוני הפרופיל, ההעדפות ושאלוני ההתאמה שמילאו שני הצדדים.";
  return text || "ההצעה נבחרה על בסיס נתוני הפרופיל ושאלוני ההתאמה. ההיכרות עצמה תאפשר לבדוק אם יש גם חיבור אישי.";
}
