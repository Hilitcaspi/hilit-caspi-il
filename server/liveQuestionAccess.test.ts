import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_OCTOBER_SLUG } from "./liveOctober";
import { liveQuestionTicket, liveQuestionToken, verifyLiveQuestionToken } from "./liveQuestionAccess";
import { getDb } from "./db";

vi.mock("./db", () => ({ getDb: vi.fn() }));
const previousSecret = process.env.JWT_SECRET;
const now = Date.parse("2026-10-07T18:00:00Z");
const standalone = {
  id: 17, eventSlug: LIVE_OCTOBER_SLUG, email: "attendee@example.com", voucherCode: "HC31-AABBCC112233",
  issuedAt: now - 60_000, revokedAt: null, source: "standalone" as const, singleId: null,
};
const fakeDb = (ticket: object) => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => [ticket] }) }) }),
});

beforeEach(() => {
  process.env.JWT_SECRET = "test-question-secret-at-least-32-characters";
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

describe("October live question capability", () => {
  it("accepts a verified standalone ticket without a database member login", async () => {
    vi.mocked(getDb).mockResolvedValue(fakeDb(standalone) as any);
    const token = liveQuestionToken(standalone);
    expect(token).toMatch(/^17\.[A-Za-z0-9_-]{43}$/);
    expect(await liveQuestionTicket(token)).toMatchObject({ id: 17, source: "standalone" });
    expect(verifyLiveQuestionToken(token, standalone, now)).toBe(true);
  });

  it("does not admit an inactive Plus member even with a valid signed link", async () => {
    const plusTicket = { ...standalone, source: "plus" as const, singleId: 11 };
    vi.mocked(getDb).mockResolvedValue(fakeDb(plusTicket) as any);
    expect(await liveQuestionTicket(liveQuestionToken(plusTicket))).toBeNull();
  });

  it.each(["database_live", "friends", "standalone", "plus"] as const)("signs a distinct %s ticket", source => {
    const ticket = { ...standalone, source, singleId: source === "plus" ? 11 : null };
    expect(verifyLiveQuestionToken(liveQuestionToken(ticket), ticket, now)).toBe(true);
  });

  it("rejects a changed signature, changed recipient, revoked, TEST1, or another event", () => {
    const token = liveQuestionToken(standalone);
    expect(verifyLiveQuestionToken(token.replace(/.$/, token.at(-1) === "a" ? "b" : "a"), standalone, now)).toBe(false);
    expect(verifyLiveQuestionToken(token, { ...standalone, email: "other@example.com" }, now)).toBe(false);
    expect(verifyLiveQuestionToken(token, { ...standalone, voucherCode: "HC31-OTHER" }, now)).toBe(false);
    expect(verifyLiveQuestionToken(token, { ...standalone, revokedAt: now }, now)).toBe(false);
    expect(verifyLiveQuestionToken(token, { ...standalone, eventSlug: "old-event" }, now)).toBe(false);
    expect(() => liveQuestionToken({ ...standalone, voucherCode: "TEST-HC31" })).toThrow();
    expect(verifyLiveQuestionToken("17.fake", standalone, now)).toBe(false);
  });

  it("closes question submissions when the live begins", () => {
    const token = liveQuestionToken(standalone);
    expect(verifyLiveQuestionToken(token, standalone, Date.parse("2026-10-31T18:30:00Z"))).toBe(false);
    vi.setSystemTime(Date.parse("2026-10-31T18:30:00Z"));
    return expect(liveQuestionTicket(token)).resolves.toBeNull();
  });

  it("fails closed if the server signing key is missing", () => {
    const token = liveQuestionToken(standalone);
    delete process.env.JWT_SECRET;
    expect(verifyLiveQuestionToken(token, standalone, now)).toBe(false);
    expect(() => liveQuestionToken(standalone)).toThrow();
  });
});
