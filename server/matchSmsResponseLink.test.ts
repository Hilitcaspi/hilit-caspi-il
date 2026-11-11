import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { getMatchSmsLinkPreference, matchSmsLinkPreferenceKey, parseMatchSmsLinkPreference } from "./matchSmsPreferences";
import { buildMatchSmsResponseLink, type MatchSmsLinkState } from "./matchSmsResponseLink";
import { buildInitialMatchSmsMessage, sendInitialMatchSmsOnce } from "./matchSms";

// All IDs/tokens/phones below are synthetic. Never import a live transport/DB.
vi.mock("./vibrate", () => ({ sendSMS: vi.fn() }));
vi.mock("./matchDeliveryLog", () => ({
  recordMatchDelivery: vi.fn().mockResolvedValue(undefined),
  matchDeliveryEventKey: vi.fn().mockReturnValue("synthetic-delivery"),
}));

const NOW = 2_000_000_000_000;
const TOKEN_A = "a".repeat(48);
const TOKEN_B = "b".repeat(48);
const ENABLED = { enabled: true, effectiveFrom: NOW - 1_000 };
const match = (overrides: Partial<MatchSmsLinkState> = {}): MatchSmsLinkState => ({
  singleAId: 101, singleBId: 202, approvalTokenA: TOKEN_A, approvalTokenB: TOKEN_B,
  ownerApprovalToken: "c".repeat(48), tokenAUsedAt: null, tokenBUsedAt: null,
  approvedByA: false, approvedByB: false, approvalExpiresAt: NOW + 5_000,
  proposedAt: NOW, ownerApprovedAt: NOW, status: "proposed", autoExplanation: null,
  notes: null, returnedToPoolAt: null, ...overrides,
});

function fakeDb(rows: unknown[], affectedRows = 1) {
  const limit = vi.fn();
  rows.forEach(row => limit.mockResolvedValueOnce(row));
  const selectWhere = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: selectWhere }) });
  const updateWhere = vi.fn().mockResolvedValue([{ affectedRows }]);
  return {
    db: { select, update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: updateWhere }) }) } as any,
    select, selectWhere, limit,
  };
}

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Date, "now").mockReturnValue(NOW); });

const recipientA = { singleId: 101, phone: "synthetic-phone-a", firstName: "Test A", matchFirstName: "Test B" };
const recipientB = { singleId: 202, phone: "synthetic-phone-b", firstName: "Test B", matchFirstName: "Test A" };

describe("per-profile future match SMS link preferences", () => {
  it("uses isolated existing settings keys, not a global opt-in", () => {
    expect(matchSmsLinkPreferenceKey(101)).toBe("match-sms-response-link:single:101");
    expect(matchSmsLinkPreferenceKey(202)).not.toBe(matchSmsLinkPreferenceKey(101));
    for (const id of [0, -1, 1.5, NaN]) expect(() => matchSmsLinkPreferenceKey(id)).toThrow();
  });

  it.each([undefined, {}, { isEnabled: false, launchedAt: NOW }, { isEnabled: "true", launchedAt: NOW },
    { isEnabled: true }, { isEnabled: true, launchedAt: "2000000000000" },
    { isEnabled: true, launchedAt: 0 }, { isEnabled: true, launchedAt: NaN },
  ])("fails closed for absent/invalid preference %j", row => {
    expect(parseMatchSmsLinkPreference(row)).toEqual({ enabled: false, effectiveFrom: null });
  });

  it("loads only the requested profile's existing settings row", async () => {
    const { db, selectWhere } = fakeDb([[{ isEnabled: true, launchedAt: NOW }]]);
    expect(await getMatchSmsLinkPreference(db, 101)).toEqual({ enabled: true, effectiveFrom: NOW });
    const query = new MySqlDialect().sqlToQuery(selectWhere.mock.calls[0][0]);
    expect(query.params).toEqual([matchSmsLinkPreferenceKey(101)]);
  });

  it("does not query settings for an invalid/missing profile", async () => {
    const { db, select } = fakeDb([]);
    expect((await getMatchSmsLinkPreference(db)).enabled).toBe(false);
    expect((await getMatchSmsLinkPreference(db, -1)).enabled).toBe(false);
    expect(select).not.toHaveBeenCalled();
  });

  it("fails closed if settings lookup fails", async () => {
    expect((await getMatchSmsLinkPreference({ select: () => { throw new Error("offline"); } } as any, 101)).enabled).toBe(false);
  });
});

describe("read-only side-bound match response links", () => {
  it("includes ONLY the recipient's token, with no automatic response", () => {
    const urlA = new URL(buildMatchSmsResponseLink(match(), "A", 101, ENABLED, NOW)!);
    expect(urlA.origin).toBe("https://hilitcaspi.com");
    expect(urlA.pathname).toBe("/match/respond");
    expect([...urlA.searchParams]).toEqual([["token", TOKEN_A]]);
    expect(buildMatchSmsResponseLink(match(), "B", 202, ENABLED, NOW)).toContain(TOKEN_B);
    expect(urlA.href).not.toContain(TOKEN_B);
  });

  it.each<Partial<MatchSmsLinkState>>([
    { status: "pending" }, { status: "expired" }, { status: "matched" }, { status: "rejected" },
    { approvalExpiresAt: NOW }, { approvalExpiresAt: NOW - 1 }, { approvalExpiresAt: null },
    { proposedAt: NOW - 1_001 }, { proposedAt: null }, { proposedAt: NOW + 1 },
    { tokenAUsedAt: NOW }, { tokenAUsedAt: 0 }, { approvedByA: true }, { ownerApprovedAt: null },
    { approvalTokenA: null }, { approvalTokenA: "bad&response=yes" },
    { approvalTokenB: TOKEN_A }, { ownerApprovalToken: TOKEN_A }, { singleBId: 101 },
    { returnedToPoolAt: NOW },
  ])("does not expose a link for invalid/old/consumed state %j", overrides => {
    expect(buildMatchSmsResponseLink(match(overrides), "A", 101, ENABLED, NOW)).toBeNull();
  });

  it("does not cross sides or require the other side to remain unanswered", () => {
    expect(buildMatchSmsResponseLink(match(), "A", 202, ENABLED, NOW)).toBeNull();
    expect(buildMatchSmsResponseLink(match(), "B", 101, ENABLED, NOW)).toBeNull();
    expect(buildMatchSmsResponseLink(match({ tokenBUsedAt: NOW, approvedByB: true }), "A", 101, ENABLED, NOW)).toContain(TOKEN_A);
  });

  it("requires explicit opt-in and applies the future effective cutoff inclusively", () => {
    expect(buildMatchSmsResponseLink(match(), "A", 101, { enabled: false, effectiveFrom: NOW }, NOW)).toBeNull();
    expect(buildMatchSmsResponseLink(match(), "A", 101, { enabled: true, effectiveFrom: null }, NOW)).toBeNull();
    expect(buildMatchSmsResponseLink(match({ proposedAt: ENABLED.effectiveFrom }), "A", 101, ENABLED, NOW)).toContain(TOKEN_A);
  });

  it("allows only an already-dispatched Boost, preserving its existing approval path", () => {
    const boost = { ownerApprovedAt: null, autoExplanation: "[BOOST] algorithmic", notes: "[BOOST_SENT] dispatched" };
    expect(buildMatchSmsResponseLink(match(boost), "A", 101, ENABLED, NOW)).toContain(TOKEN_A);
    expect(buildMatchSmsResponseLink(match({ ...boost, notes: "[BOOST_CANDIDATE] draft" }), "A", 101, ENABLED, NOW)).toBeNull();
  });

  it("keeps Boost identity private and distinct sender/recipient disclosure with a link", () => {
    for (const role of ["sender", "recipient"] as const) {
      const text = buildInitialMatchSmsMessage("Test A", "PRIVATE PARTNER", 80, "boost", role, "https://hilitcaspi.com/match/respond?token=synthetic");
      expect(text).not.toContain("PRIVATE PARTNER");
      expect(text).toContain("פתיחת הקישור אינה אישור");
      expect(text).toContain(role === "sender" ? "התשלום אינם אישור" : "לא נבחרה אישית");
      expect(text).not.toContain("response=");
    }
  });
});

describe("initial SMS delivery resolves preference without caller token payloads", () => {
  it.each(["A", "B"] as const)("sends an opted-in %s side its own link while the other is unchanged", async side => {
    const rows = side === "A"
      ? [[{ isEnabled: true, launchedAt: NOW }], [], [match()]]
      : [[], [{ isEnabled: true, launchedAt: NOW }], [match()]];
    const { db } = fakeDb(rows);
    const sender = vi.fn().mockResolvedValue(true);
    expect(await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA, recipientB }, sender))
      .toEqual({ skipped: false, sentA: true, sentB: true });
    const opted = side === "A" ? 0 : 1;
    const other = side === "A" ? 1 : 0;
    expect(sender.mock.calls[opted][1]).toContain(side === "A" ? TOKEN_A : TOKEN_B);
    expect(sender.mock.calls[opted][1]).not.toContain(side === "A" ? TOKEN_B : TOKEN_A);
    const recipient = side === "A" ? recipientB : recipientA;
    expect(sender.mock.calls[other][1]).toBe(buildInitialMatchSmsMessage(recipient.firstName, recipient.matchFirstName, 80));
  });

  it("preserves default messages and avoids match lookup when neither opts in", async () => {
    const { db, select } = fakeDb([[], []]);
    const sender = vi.fn().mockResolvedValue(true);
    await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA, recipientB }, sender);
    expect(select).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[0][1]).toBe(buildInitialMatchSmsMessage("Test A", "Test B", 80));
    expect(sender.mock.calls[1][1]).toBe(buildInitialMatchSmsMessage("Test B", "Test A", 80));
  });

  it("does not look up preferences or send after the existing one-time delivery claim", async () => {
    const { db, select } = fakeDb([], 0);
    const sender = vi.fn();
    expect(await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA, recipientB }, sender))
      .toEqual({ skipped: true, sentA: false, sentB: false });
    expect(select).not.toHaveBeenCalled();
    expect(sender).not.toHaveBeenCalled();
  });

  it("leaves inactive and seed recipients unsent even when opted in", async () => {
    const { db, select } = fakeDb([]);
    const sender = vi.fn();
    await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA: { ...recipientA, isActive: false }, recipientB: { ...recipientB, isSeed: true } }, sender);
    expect(select).not.toHaveBeenCalled();
    expect(sender).not.toHaveBeenCalled();
  });

  it.each([{ approvalExpiresAt: NOW - 1 }, { tokenAUsedAt: NOW }, { proposedAt: NOW - 1 }])("falls back without sending an invalid/old token %j", async overrides => {
    const { db } = fakeDb([[{ isEnabled: true, launchedAt: NOW }], [], [match(overrides)]]);
    const sender = vi.fn().mockResolvedValue(true);
    await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA, recipientB }, sender);
    expect(sender.mock.calls[0][1]).toBe(buildInitialMatchSmsMessage("Test A", "Test B", 80));
  });

  it("does not suppress normal delivery when reading persisted match state fails", async () => {
    const { db, limit } = fakeDb([[{ isEnabled: true, launchedAt: NOW }], []]);
    limit.mockRejectedValueOnce(new Error("offline"));
    const sender = vi.fn().mockResolvedValue(true);
    await sendInitialMatchSmsOnce(db, { matchId: 303, score: 80, recipientA, recipientB }, sender);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[0][1]).not.toContain("token=");
  });
});
