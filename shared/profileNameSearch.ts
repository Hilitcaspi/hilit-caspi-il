export type SearchableProfileName = { firstName?: string | null; lastName?: string | null };

/** Search normalization only; never changes stored profile text. */
export function normalizeProfileName(value: string | null | undefined): string {
  return String(value || "").normalize("NFKC").replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchesProfileName(profile: SearchableProfileName, query: string): boolean {
  const normalized = normalizeProfileName(query);
  if (!normalized) return true;
  const name = normalizeProfileName(`${profile.firstName || ""} ${profile.lastName || ""}`);
  return normalized.split(" ").every(token => name.includes(token));
}

/** Filtering always precedes pagination; preserves the caller's waiting-priority order. */
export function filterProfilesByName<T extends SearchableProfileName>(profiles: readonly T[], query: string): T[] {
  return profiles.filter(profile => matchesProfileName(profile, query));
}

function isSingleEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) === 1;
}

/** Suggestions only: never treats a typo as an exact identity or auto-selects a profile. */
export function getProfileNameSuggestions<T extends SearchableProfileName>(profiles: readonly T[], query: string, limit = 5): T[] {
  const normalized = normalizeProfileName(query);
  if (normalized.length < 4 || normalized.split(" ").length < 2) return [];
  return profiles.filter(profile => !matchesProfileName(profile, query)
    && isSingleEditApart(normalized, normalizeProfileName(`${profile.firstName || ""} ${profile.lastName || ""}`)))
    .slice(0, Math.max(0, Math.min(limit, 10)));
}
