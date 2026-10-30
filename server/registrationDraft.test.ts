import { describe, expect, it } from "vitest";
import {
  MAX_PERSISTED_REGISTRATION_PHOTO_CHARS,
  readRegistrationDraft,
  registrationDraftCanContinueToPayment,
  registrationDraftQueryFromSearch,
  registrationDraftStorageKey,
  registrationPhotoPayload,
  safeStorageGet,
  safeStorageSet,
  sameRegistrationIdentity,
  saveRegistrationDraft,
  type StorageLike,
} from "../client/src/lib/registrationDraft";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("registration draft browser persistence", () => {
  it("persists a complete scoped form but excludes bearer/payment query values", () => {
    const storage = new MemoryStorage();
    const query = registrationDraftQueryFromSearch(new URLSearchParams(
      "dna=anchor&session=session-1&utm_source=meta&resume=secret&free_token=also-secret&name=Nope",
    ));
    expect(query).toEqual({ dna: "anchor", session: "session-1", utm_source: "meta" });

    expect(saveRegistrationDraft("resume:opaque", {
      query,
      form: {
        firstName: "דנה",
        lastName: "כהן",
        email: "dana@example.test",
        phone: "050-1234567",
        consentMatchmaking: true,
        consentDataSharing: true,
        dnaFromQuiz: "anchor",
        photoPreview: "data:image/jpeg;base64,AA==",
      },
    }, { now: 10_000, storage })).toBe(true);

    const raw = storage.getItem(registrationDraftStorageKey("resume:opaque")) || "";
    expect(raw).not.toContain("secret");
    expect(raw).not.toContain("free_token");
    expect(readRegistrationDraft("resume:opaque", { now: 10_100, storage })?.form).toMatchObject({
      firstName: "דנה",
      lastName: "כהן",
      dnaFromQuiz: "anchor",
      photoPreview: "data:image/jpeg;base64,AA==",
    });
  });

  it("rejects an expired, wrong-scope, or malformed snapshot", () => {
    const storage = new MemoryStorage();
    saveRegistrationDraft("scope-a", { query: {}, form: { firstName: "דנה" } }, { now: 1_000, storage });
    expect(readRegistrationDraft("scope-a", { now: 6 * 60 * 60 * 1000 + 1_001, storage })).toBeNull();
    expect(readRegistrationDraft("scope-b", { now: 1_001, storage })).toBeNull();

    storage.setItem(registrationDraftStorageKey("scope-a"), "not-json");
    expect(readRegistrationDraft("scope-a", { now: 1_001, storage })).toBeNull();
  });

  it("matches a local overlay only when both email and normalized phone belong to the same person", () => {
    const form = { email: " Dana@Example.test ", phone: "050-123-4567" };
    expect(sameRegistrationIdentity(form, { email: "dana@example.test", phone: "0501234567" })).toBe(true);
    expect(sameRegistrationIdentity(form, { email: "other@example.test", phone: "0501234567" })).toBe(false);
    expect(sameRegistrationIdentity(form, { email: "dana@example.test", phone: "0507654321" })).toBe(false);
  });

  it("keeps remote server photo URLs out of upload payloads and accepts only actual data-image bytes", () => {
    expect(registrationPhotoPayload("https://cdn.example.test/photo.jpg", "image/jpeg")).toBeUndefined();
    expect(registrationPhotoPayload("data:text/plain;base64,AA==", "text/plain")).toBeUndefined();
    expect(registrationPhotoPayload("data:image/jpeg;base64,AA==", "image/png")).toEqual({
      photoBase64: "data:image/jpeg;base64,AA==",
      photoMime: "image/png",
    });
  });

  it("drops an over-quota photo while retaining the rest of the form", () => {
    const storage = new MemoryStorage();
    const oversizedPhoto = `data:image/jpeg;base64,${"A".repeat(MAX_PERSISTED_REGISTRATION_PHOTO_CHARS)}`;
    saveRegistrationDraft("scope-photo", {
      query: {},
      form: { firstName: "דנה", city: "תל אביב", photoPreview: oversizedPhoto },
    }, { now: 1_000, storage });

    expect(readRegistrationDraft("scope-photo", { now: 1_001, storage })?.form).toMatchObject({
      firstName: "דנה",
      city: "תל אביב",
    });
    expect(readRegistrationDraft("scope-photo", { now: 1_001, storage })?.form.photoPreview).toBeUndefined();
  });

  it("tolerates blocked browser storage without throwing", () => {
    const blocked: StorageLike = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("QuotaExceededError"); },
      removeItem: () => { throw new Error("SecurityError"); },
    };
    expect(safeStorageGet("local", "draft", blocked)).toBeNull();
    expect(safeStorageSet("local", "draft", "value", blocked)).toBe(false);
    expect(saveRegistrationDraft("scope", { query: {}, form: { firstName: "דנה" } }, { storage: blocked })).toBe(false);
  });

  it("blocks payment resume until a complete full-name profile has the required identity and consent", () => {
    const base = {
      firstName: "דנה",
      lastName: "כהן",
      birthDate: "1990-01-02",
      city: "תל אביב",
      email: "dana@example.test",
      phone: "0501234567",
      consentMatchmaking: true,
      consentDataSharing: true,
      dnaFromQuiz: "anchor",
    } as const;
    expect(registrationDraftCanContinueToPayment(base)).toBe(true);
    expect(registrationDraftCanContinueToPayment({ ...base, lastName: "" })).toBe(false);
    expect(registrationDraftCanContinueToPayment({ ...base, consentDataSharing: false })).toBe(false);
  });
});
