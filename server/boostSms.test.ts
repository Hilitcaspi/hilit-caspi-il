import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import {
  buildInitialMatchSmsMessage,
  isBoostProposalEmailAccepted,
  sendInitialMatchSmsOnce,
} from "./matchSms";
import { recordMatchDelivery } from "./matchDeliveryLog";

// Every profile, phone, token and provider result is synthetic; no live DB/transport.
vi.mock("./vibrate", () => ({ sendSMS: vi.fn() }));
vi.mock("./matchDeliveryLog", () => ({
  recordMatchDelivery: vi.fn().mockResolvedValue(undefined),
  matchDeliveryEventKey: vi.fn().mockReturnValue("synthetic-delivery"),
}));

const NOW = 2_000_000_000_000;
const TOKEN_A = "a".repeat(48);
const TOKEN_B = "b".repeat(48);
const recipientA = { singleId: 101, phone: "synthetic-phone-a", firstName: "Test A", matchFirstName: "PRIVATE B" };
const recipientB = { singleId: 202, phone: "synthetic-phone-b", firstName: "Test B", matchFirstName: "PRIVATE A" };
const accepted = { success: true, messageId: "synthetic-email" };
const failed = { success: false };
const blocked = { success: true, messageId: "blocked" };
const baseInput = {
  matchId: 303, score: 75, proposalSource: "boost" as const,
  boostSenderSide: "A" as "A" | "B", recipientA, recipientB,
  boostEmailResults: { A: accepted, B: accepted },
};

function fakeDb(rows: unknown[] = [], initialClaimed = false) {
  let claimed = initialClaimed;
  const updateWhere = vi.fn().mockImplementation(async () => {
    if (claimed) return [{ affectedRows: 0 }];
    claimed = true;
    return [{ affectedRows: 1 }];
  });
  const limit = vi.fn();
  rows.forEach(row => limit.mockResolvedValueOnce(row));
  limit.mockResolvedValue([]);
  const selectWhere = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: selectWhere }) });
  return {
    db: { select, update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: updateWhere }) }) } as any,
    select, selectWhere, limit, updateWhere,
  };
}

const persistedMatch = (overrides = {}) => ({
  singleAId: 101, singleBId: 202, approvalTokenA: TOKEN_A, approvalTokenB: TOKEN_B,
  ownerApprovalToken: "c".repeat(48), tokenAUsedAt: null, tokenBUsedAt: null,
  approvedByA: false, approvedByB: false, approvalExpiresAt: NOW + 5_000,
  proposedAt: NOW, ownerApprovedAt: null, status: "proposed", returnedToPoolAt: null,
  autoExplanation: "[BOOST] algorithmic", notes: "[BOOST_SENT] dispatched", ...overrides,
});

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Date, "now").mockReturnValue(NOW); });
afterEach(() => vi.restoreAllMocks());

describe("future Boost service SMS after recipient email acceptance", () => {
  it.each([undefined, failed, blocked])("does not mistake absent, failed or suppressed email %j for acceptance", result => {
    expect(isBoostProposalEmailAccepted(result)).toBe(false);
  });

  it("accepts the existing provider success contract without requiring handset/inbox delivery proof", () => {
    expect(isBoostProposalEmailAccepted(accepted)).toBe(true);
    expect(isBoostProposalEmailAccepted({ success: true })).toBe(true);
  });

  it("preserves the requester text exactly and adds email/spam/promotions guidance only to the recipient", () => {
    expect(buildInitialMatchSmsMessage("Test A", "PRIVATE B", 75, "boost", "sender"))
      .toBe("היי Test A, בקשת ה־Boost שלך עם 75% התאמה נשלחה לשני הצדדים. השליחה והתשלום אינם אישור להתאמה. התמונה, הפרטים וכפתורי האישור מחכים במייל. הילית כספי");
    expect(buildInitialMatchSmsMessage("Test A", "PRIVATE B", 75, "boost", "sender", "synthetic-link"))
      .toBe("היי Test A, בקשת ה־Boost שלך עם 75% התאמה נשלחה לשני הצדדים. השליחה והתשלום אינם אישור להתאמה. לצפייה ולהחלטה אישית: synthetic-link פתיחת הקישור אינה אישור להתאמה. הילית כספי");
    for (const link of [undefined, `https://hilitcaspi.com/match/respond?token=${TOKEN_A}`]) {
      const message = buildInitialMatchSmsMessage("Test A", "PRIVATE B", 75, "boost", "recipient", link);
      expect(message).toContain("התאמת ה־Boost ממתינה לך במייל");
      expect(message).toContain("בספאם ובתיקיית השיווק");
      expect(message).toContain("לא נבחרה אישית על ידי הילית");
      expect(message).not.toContain("PRIVATE B");
      expect(message).not.toContain("response=");
    }
  });

  it.each(["A", "B"] as const)("sends one initial SMS to both intended sides when requester is %s", async side => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    expect(await sendInitialMatchSmsOnce(db, { ...baseInput, boostSenderSide: side }, sender))
      .toEqual({ skipped: false, sentA: true, sentB: true });
    expect(sender).toHaveBeenCalledTimes(2);
    const requesterIndex = side === "A" ? 0 : 1;
    expect(sender.mock.calls[requesterIndex][1]).toContain("בקשת ה־Boost שלך");
    expect(sender.mock.calls[1 - requesterIndex][1]).toContain("בספאם ובתיקיית השיווק");
    expect(sender.mock.calls.map(call => call[0])).toEqual([recipientA.phone, recipientB.phone]);
    expect(recordMatchDelivery).toHaveBeenCalledWith(db, expect.objectContaining({ singleId: 101, side: "A", success: true }));
    expect(recordMatchDelivery).toHaveBeenCalledWith(db, expect.objectContaining({ singleId: 202, side: "B", success: true }));
  });

  it.each(["A", "B"] as const)("gates only the non-requesting side on its own email when requester is %s", async side => {
    const { db, selectWhere } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    const emailResults = side === "A" ? { A: accepted, B: failed } : { A: failed, B: accepted };
    expect(await sendInitialMatchSmsOnce(db, { ...baseInput, boostSenderSide: side, boostEmailResults: emailResults }, sender))
      .toEqual({ skipped: false, sentA: side === "A", sentB: side === "B" });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0]).toBe(side === "A" ? recipientA.phone : recipientB.phone);
    expect(sender.mock.calls[0][1]).toContain("בקשת ה־Boost שלך");
    expect(selectWhere).toHaveBeenCalledTimes(1);
    const query = new MySqlDialect().sqlToQuery(selectWhere.mock.calls[0][0]);
    expect(query.params).toEqual([`match-sms-response-link:single:${side === "A" ? 101 : 202}`]);
    expect(recordMatchDelivery).toHaveBeenCalledTimes(1);
  });

  it.each(["A", "B"] as const)("keeps requester %s SMS even when their email failed and recipient email succeeded", async side => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    const emailResults = side === "A" ? { A: failed, B: accepted } : { A: accepted, B: failed };
    expect(await sendInitialMatchSmsOnce(db, { ...baseInput, boostSenderSide: side, boostEmailResults: emailResults }, sender))
      .toEqual({ skipped: false, sentA: true, sentB: true });
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, {}, { A: accepted }, { A: accepted, B: blocked }])("fails closed for missing/suppressed recipient acceptance %j", async boostEmailResults => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    expect(await sendInitialMatchSmsOnce(db, { ...baseInput, boostEmailResults }, sender))
      .toEqual({ skipped: false, sentA: true, sentB: false });
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it.each(["A", "B"] as const)("preserves side %s personal link preference for the recipient without enabling the requester", async side => {
    const rows = side === "A"
      ? [[{ isEnabled: true, launchedAt: NOW }], [], [persistedMatch()]]
      : [[], [{ isEnabled: true, launchedAt: NOW }], [persistedMatch()]];
    const { db } = fakeDb(rows);
    const sender = vi.fn().mockResolvedValue(true);
    await sendInitialMatchSmsOnce(db, { ...baseInput, boostSenderSide: side === "A" ? "B" : "A" }, sender);
    const recipientIndex = side === "A" ? 0 : 1;
    const recipientText = sender.mock.calls[recipientIndex][1];
    expect(recipientText).toContain(side === "A" ? TOKEN_A : TOKEN_B);
    expect(recipientText).not.toContain(side === "A" ? TOKEN_B : TOKEN_A);
    expect(recipientText).toContain("פתיחת הקישור אינה אישור");
    expect(recipientText).toContain("בספאם ובתיקיית השיווק");
    expect(recipientText).not.toContain("PRIVATE");
    expect(sender.mock.calls[1 - recipientIndex][1]).not.toContain("token=");
  });

  it.each([{ proposedAt: NOW - 1 }, { approvalExpiresAt: NOW }, { tokenBUsedAt: NOW }, { singleBId: 999 }])("falls back to email guidance without leaking a stale/consumed/wrong-side token %j", async overrides => {
    const { db } = fakeDb([[], [{ isEnabled: true, launchedAt: NOW }], [persistedMatch(overrides)]]);
    const sender = vi.fn().mockResolvedValue(true);
    await sendInitialMatchSmsOnce(db, baseInput, sender);
    expect(sender.mock.calls[1][1]).not.toContain("token=");
    expect(sender.mock.calls[1][1]).toContain("בספאם ובתיקיית השיווק");
  });

  it.each([{ isActive: false }, { isSeed: true }, { phone: null }])("does not send recipient service SMS to an ineligible profile %j", async overrides => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    expect(await sendInitialMatchSmsOnce(db, { ...baseInput, recipientB: { ...recipientB, ...overrides } }, sender))
      .toEqual({ skipped: false, sentA: true, sentB: false });
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it("retains the shared atomic initial claim for duplicate/concurrent Boost calls", async () => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValue(true);
    const results = await Promise.all([
      sendInitialMatchSmsOnce(db, baseInput, sender),
      sendInitialMatchSmsOnce(db, baseInput, sender),
    ]);
    expect(results).toContainEqual({ skipped: false, sentA: true, sentB: true });
    expect(results).toContainEqual({ skipped: true, sentA: false, sentB: false });
    expect(sender).toHaveBeenCalledTimes(2);
    expect(recordMatchDelivery).toHaveBeenCalledTimes(2);
  });

  it("does not backfill historical initial claims or change them when wording changes", async () => {
    const { db, select } = fakeDb([], true);
    const sender = vi.fn();
    expect(await sendInitialMatchSmsOnce(db, baseInput, sender)).toEqual({ skipped: true, sentA: false, sentB: false });
    expect(sender).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("records a recipient SMS provider failure without duplicating the initial send", async () => {
    const { db } = fakeDb();
    const sender = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await sendInitialMatchSmsOnce(db, baseInput, sender)).toEqual({ skipped: false, sentA: true, sentB: false });
    expect(recordMatchDelivery).toHaveBeenCalledWith(db, expect.objectContaining({ singleId: 202, side: "B", success: false }));
    expect(await sendInitialMatchSmsOnce(db, baseInput, sender)).toEqual({ skipped: true, sentA: false, sentB: false });
    expect(sender).toHaveBeenCalledTimes(2);
  });
});
