import { normalizeIsraeliPhone } from "@shared/profileValidation";

export type StorageArea = "local" | "session";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const REGISTRATION_DRAFT_TTL_MS = 6 * 60 * 60 * 1000;
export const MAX_PERSISTED_REGISTRATION_PHOTO_CHARS = 900_000;

const SNAPSHOT_VERSION = 1;
const DRAFT_STORAGE_PREFIX = "registration-draft:v1";
const ANONYMOUS_SCOPE_PREFIX = "registration-draft:anonymous-scope:v1";

export type RegistrationDraftQuery = {
  dna?: string;
  gender?: string;
  session?: string;
  source?: string;
  coupon?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type RegistrationDraftForm = {
  step?: string;
  firstName?: string;
  lastName?: string;
  gender?: "female" | "male";
  seekingGender?: "female" | "male" | "any";
  birthDate?: string;
  phone?: string;
  email?: string;
  city?: string;
  height?: string;
  education?: string;
  religiosity?: string;
  shomerShabbat?: boolean | null;
  religiosityOrigin?: string;
  occupation?: string;
  maritalStatus?: string;
  hasKids?: boolean;
  numKids?: string;
  wantsKids?: string;
  about?: string;
  partnerDescription?: string;
  minAge?: string;
  maxAge?: string;
  minHeight?: string;
  maxHeight?: string;
  religiosityPref?: string[];
  acceptsKids?: string;
  openToPartnerWithKids?: string;
  locationPref?: string;
  interests?: string;
  consentMatchmaking?: boolean;
  consentDataSharing?: boolean;
  consentEmailMarketing?: boolean;
  dnaFromQuiz?: string | null;
  genderFromQuiz?: "female" | "male" | null;
  sessionId?: string;
  photoPreview?: string;
  quizAnswers?: Record<string, unknown>;
  currentQuizIndex?: number;
  showMiniQuiz?: boolean;
  draftSavedBeforePayment?: boolean;
};

export type RegistrationDraftSnapshot = {
  version: typeof SNAPSHOT_VERSION;
  savedAt: number;
  scope: string;
  form: RegistrationDraftForm;
  query: RegistrationDraftQuery;
};

function browserStorage(area: StorageArea): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Safari private browsing and embedded browsers can throw SecurityError here.
    return null;
  }
}

export function safeStorageGet(area: StorageArea, key: string, storage: StorageLike | null = browserStorage(area)): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeStorageSet(area: StorageArea, key: string, value: string, storage: StorageLike | null = browserStorage(area)): boolean {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function safeStorageRemove(area: StorageArea, key: string, storage: StorageLike | null = browserStorage(area)): boolean {
  try {
    storage?.removeItem(key);
    return Boolean(storage);
  } catch {
    return false;
  }
}

function opaqueHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function randomScopeNonce(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the non-credential local nonce.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const PUBLIC_QUERY_KEYS = [
  "dna",
  "gender",
  "session",
  "source",
  "coupon",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export function registrationDraftQueryFromSearch(params: URLSearchParams): RegistrationDraftQuery {
  const query: RegistrationDraftQuery = {};
  for (const key of PUBLIC_QUERY_KEYS) {
    const value = params.get(key)?.trim();
    if (value) query[key] = value.slice(0, 500);
  }
  // Intentionally exclude free_token, resume, payment process IDs, and all other
  // bearer/payment query values. A snapshot never persists an authorization token.
  return query;
}

export function createRegistrationDraftScope(input: {
  resumeToken?: string;
  freeToken?: string;
  dnaSessionId?: string;
  pathname?: string;
  query?: RegistrationDraftQuery;
}): string {
  const resumeToken = input.resumeToken?.trim();
  if (resumeToken) return `resume:${opaqueHash(resumeToken)}`;

  const freeToken = input.freeToken?.trim();
  if (freeToken) return `free:${opaqueHash(freeToken)}`;

  const publicIdentity = [
    input.pathname || "/join",
    input.query?.dna || "",
    input.query?.gender || "",
    input.query?.source || "",
    input.query?.coupon || "",
    // Retain a supplied DNA session as a scope discriminator, but do not make a
    // later in-page DNA result switch an already active anonymous form into a
    // different storage key.
    input.dnaSessionId?.trim() || "",
  ].join("|");
  const namespace = opaqueHash(publicIdentity);
  const key = `${ANONYMOUS_SCOPE_PREFIX}:${namespace}`;
  const existing = safeStorageGet("session", key);
  const nonce = existing && /^[a-z0-9-]{8,80}$/i.test(existing) ? existing : randomScopeNonce();
  if (!existing) safeStorageSet("session", key, nonce);
  return `anonymous:${namespace}:${nonce}`;
}

export function registrationDraftStorageKey(scope: string): string {
  return `${DRAFT_STORAGE_PREFIX}:${opaqueHash(scope)}`;
}

function cleanString(value: unknown, maxLength = 10_000): string | undefined {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function cleanStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map(item => item.slice(0, 100))
    .slice(0, 20);
}

function cleanQuizAnswers(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 150_000) return undefined;
    const parsed = JSON.parse(serialized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** True only for bytes created by the user-selected image flow, never an existing remote photo URL. */
export function registrationPhotoPayload(preview: unknown, declaredMime?: unknown): { photoBase64: string; photoMime: string } | undefined {
  if (typeof preview !== "string") return undefined;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,[a-z0-9+/=\s]+$/i.exec(preview);
  if (!match) return undefined;
  const photoMime = typeof declaredMime === "string" && /^image\/(?:jpeg|png|webp)$/i.test(declaredMime)
    ? declaredMime.toLowerCase()
    : match[1].toLowerCase();
  return { photoBase64: preview, photoMime };
}

function sanitizeForm(form: RegistrationDraftForm): RegistrationDraftForm {
  const cleaned: RegistrationDraftForm = {};
  const textKeys: Array<keyof RegistrationDraftForm> = [
    "step", "firstName", "lastName", "birthDate", "phone", "email", "city", "height",
    "education", "religiosity", "religiosityOrigin", "occupation", "maritalStatus", "numKids",
    "wantsKids", "about", "partnerDescription", "minAge", "maxAge", "minHeight", "maxHeight",
    "acceptsKids", "openToPartnerWithKids", "locationPref", "interests", "dnaFromQuiz", "genderFromQuiz",
    "sessionId",
  ];
  for (const key of textKeys) {
    const value = cleanString(form[key]);
    if (value !== undefined) (cleaned as Record<string, unknown>)[key] = value;
  }

  if (form.gender === "female" || form.gender === "male") cleaned.gender = form.gender;
  const seekingGender = form.seekingGender;
  if (seekingGender === "female" || seekingGender === "male" || seekingGender === "any") {
    cleaned.seekingGender = seekingGender;
  }
  if (typeof form.shomerShabbat === "boolean" || form.shomerShabbat === null) cleaned.shomerShabbat = form.shomerShabbat;
  if (typeof form.hasKids === "boolean") cleaned.hasKids = form.hasKids;
  if (typeof form.consentMatchmaking === "boolean") cleaned.consentMatchmaking = form.consentMatchmaking;
  if (typeof form.consentDataSharing === "boolean") cleaned.consentDataSharing = form.consentDataSharing;
  if (typeof form.consentEmailMarketing === "boolean") cleaned.consentEmailMarketing = form.consentEmailMarketing;
  if (typeof form.showMiniQuiz === "boolean") cleaned.showMiniQuiz = form.showMiniQuiz;
  if (typeof form.draftSavedBeforePayment === "boolean") cleaned.draftSavedBeforePayment = form.draftSavedBeforePayment;
  const currentQuizIndex = form.currentQuizIndex;
  if (Number.isInteger(currentQuizIndex) && (currentQuizIndex ?? -1) >= 0 && (currentQuizIndex ?? 0) < 100) {
    cleaned.currentQuizIndex = currentQuizIndex;
  }

  const religiosityPref = cleanStringArray(form.religiosityPref);
  if (religiosityPref) cleaned.religiosityPref = religiosityPref;
  const quizAnswers = cleanQuizAnswers(form.quizAnswers);
  if (quizAnswers) cleaned.quizAnswers = quizAnswers;

  // Large photos can consume Safari's modest localStorage quota. Keep the rest of
  // the draft even when the photo itself cannot safely fit; a saved server photo is
  // restored from the resume draft instead.
  if (typeof form.photoPreview === "string" && form.photoPreview.length <= MAX_PERSISTED_REGISTRATION_PHOTO_CHARS) {
    const photo = registrationPhotoPayload(form.photoPreview);
    if (photo) cleaned.photoPreview = photo.photoBase64;
  }
  return cleaned;
}

function sanitizeQuery(query: RegistrationDraftQuery): RegistrationDraftQuery {
  const cleaned: RegistrationDraftQuery = {};
  for (const key of PUBLIC_QUERY_KEYS) {
    const value = cleanString(query[key], 500);
    if (value) cleaned[key] = value;
  }
  return cleaned;
}

export function saveRegistrationDraft(
  scope: string,
  input: { form: RegistrationDraftForm; query: RegistrationDraftQuery },
  options: { now?: number; storage?: StorageLike | null } = {},
): boolean {
  const snapshot: RegistrationDraftSnapshot = {
    version: SNAPSHOT_VERSION,
    savedAt: options.now ?? Date.now(),
    scope,
    form: sanitizeForm(input.form),
    query: sanitizeQuery(input.query),
  };
  try {
    return safeStorageSet("local", registrationDraftStorageKey(scope), JSON.stringify(snapshot), options.storage);
  } catch {
    return false;
  }
}

export function readRegistrationDraft(
  scope: string,
  options: { now?: number; storage?: StorageLike | null } = {},
): RegistrationDraftSnapshot | null {
  const raw = safeStorageGet("local", registrationDraftStorageKey(scope), options.storage);
  if (!raw || raw.length > 1_500_000) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RegistrationDraftSnapshot>;
    const now = options.now ?? Date.now();
    if (
      parsed.version !== SNAPSHOT_VERSION ||
      parsed.scope !== scope ||
      typeof parsed.savedAt !== "number" ||
      parsed.savedAt > now + 60_000 ||
      now - parsed.savedAt > REGISTRATION_DRAFT_TTL_MS ||
      !parsed.form || typeof parsed.form !== "object" || Array.isArray(parsed.form) ||
      !parsed.query || typeof parsed.query !== "object" || Array.isArray(parsed.query)
    ) {
      return null;
    }
    return {
      version: SNAPSHOT_VERSION,
      savedAt: parsed.savedAt,
      scope,
      form: sanitizeForm(parsed.form as RegistrationDraftForm),
      query: sanitizeQuery(parsed.query as RegistrationDraftQuery),
    };
  } catch {
    return null;
  }
}

/** Matches local state only to the same submitted profile; never use a snapshot to replace a different server draft. */
export function sameRegistrationIdentity(
  draft: Pick<RegistrationDraftForm, "email" | "phone"> | null | undefined,
  identity: { email?: string | null; phone?: string | null },
): boolean {
  const draftEmail = draft?.email?.trim().toLowerCase();
  const identityEmail = identity.email?.trim().toLowerCase();
  const draftPhone = draft?.phone ? normalizeIsraeliPhone(draft.phone) : undefined;
  const identityPhone = identity.phone ? normalizeIsraeliPhone(identity.phone) : undefined;
  return Boolean(draftEmail && identityEmail && draftPhone && identityPhone && draftEmail === identityEmail && draftPhone === identityPhone);
}

export function registrationDraftCanContinueToPayment(form: Pick<RegistrationDraftForm,
  "firstName" | "lastName" | "birthDate" | "city" | "email" | "phone" | "consentMatchmaking" | "consentDataSharing" | "dnaFromQuiz"
>): boolean {
  const fullName = `${form.firstName || ""} ${form.lastName || ""}`.trim().split(/\s+/).filter(Boolean);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email?.trim() || "");
  return fullName.length >= 2 && Boolean(form.birthDate) && Boolean(form.city?.trim()) && validEmail && Boolean(normalizeIsraeliPhone(form.phone || ""))
    && Boolean(form.consentMatchmaking) && Boolean(form.consentDataSharing) && Boolean(form.dnaFromQuiz);
}
