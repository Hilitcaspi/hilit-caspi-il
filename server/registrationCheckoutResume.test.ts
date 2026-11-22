import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchesRegistrationCheckoutResume, verifyRegistrationCheckoutResume, type RegistrationCheckoutResumeProfile } from "./registrationCheckoutResume";

const token = "a".repeat(64);
const input = { product: "database", token, email: "resume@example.test", phone: "0500000000", fullName: "Synthetic Resume" };
const profile: RegistrationCheckoutResumeProfile = { firstName: "Synthetic", lastName: "Resume", email: "resume@example.test", phone: "0500000000", isPaid: false };
beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Live network forbidden"); })));
afterEach(() => vi.unstubAllGlobals());

describe("registration checkout bearer verification", () => {
  it("accepts only the exact unpaid draft identity while normalizing legitimate email, phone, and whitespace formats", () => {
    expect(matchesRegistrationCheckoutResume(profile, input)).toBe(true);
    expect(matchesRegistrationCheckoutResume(profile, { ...input, email: " RESUME@example.test ", phone: "+972 50-000-0000", fullName: " Synthetic\u00a0 Resume " })).toBe(true);
  });
  it.each([
    "Synthetic\u200bResume",
    "\u200b Synthetic\u202f\u200bResume \u3000",
    "Ｓｙｎｔｈｅｔｉｃ　Ｒｅｓｕｍｅ",
  ])("accepts equivalent names using the same NFKC/space normalization as checkout (%s)", fullName => {
    expect(matchesRegistrationCheckoutResume(profile, { ...input, fullName })).toBe(true);
  });
  it("normalizes stored name parts as well as the submitted checkout name", () => {
    expect(matchesRegistrationCheckoutResume({ ...profile, firstName: "Ｓｙｎｔｈｅｔｉｃ", lastName: "\u200bResume" }, input)).toBe(true);
    expect(matchesRegistrationCheckoutResume({ ...profile, firstName: "נועה", lastName: "כהן" }, { ...input, fullName: "נועה\u200bכהן" })).toBe(true);
    expect(matchesRegistrationCheckoutResume({ ...profile, firstName: "José" }, { ...input, fullName: "Jose\u0301 Resume" })).toBe(true);
  });
  it.each(["Synthetic\u200bOther", "Ｓｙｎｔｈｅｔｉｃ　Ｏｔｈｅｒ", "synthetic Resume", "SyntheticResume"])("still rejects a true name mismatch after canonicalization (%s)", fullName => {
    expect(matchesRegistrationCheckoutResume(profile, { ...input, fullName })).toBe(false);
  });
  it.each([
    { ...input, product: "guide" },
    { ...input, token: "guessable" },
    { ...input, token: "" },
    { ...input, email: "other@example.test" },
    { ...input, phone: "0500000001" },
    { ...input, phone: undefined },
    { ...input, fullName: "Other Person" },
  ])("rejects a mismatching identity or non-registration product", value => {
    expect(matchesRegistrationCheckoutResume(profile, value)).toBe(false);
  });
  it.each([
    null,
    { ...profile, isPaid: true },
    { ...profile, lastName: null },
    { ...profile, firstName: "" },
    { ...profile, phone: null },
    { ...profile, email: null },
  ])("does not treat a paid or incomplete profile as an open registration proof", value => {
    expect(matchesRegistrationCheckoutResume(value, input)).toBe(false);
  });
  it("reads exactly one token-bound draft and never writes, sends, or creates a payment", async () => {
    const limit = vi.fn().mockResolvedValue([profile]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const db = { select: vi.fn(() => ({ from })), update: vi.fn(), insert: vi.fn() };
    await expect(verifyRegistrationCheckoutResume(input, db as never)).resolves.toBe(true);
    expect(db.select).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(1);
    expect(where).toHaveBeenCalledOnce();
    expect(db.update).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects an unknown bearer and a malformed bearer without broad email search", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) })) };
    await expect(verifyRegistrationCheckoutResume(input, db as never)).resolves.toBe(false);
    db.select.mockClear();
    await expect(verifyRegistrationCheckoutResume({ ...input, token: "invalid" }, db as never)).resolves.toBe(false);
    expect(db.select).not.toHaveBeenCalled();
  });
});
