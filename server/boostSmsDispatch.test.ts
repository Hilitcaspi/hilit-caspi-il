import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { matches, matchBoostMemberships, matchBoostRequests, singles } from "../drizzle/schema";
import { BOOST_CONSENT_VERSION, fulfillPaidBoostPayment } from "./matchBoostRouter";
import { getDb } from "./db";
import { sendEmail } from "./brevo";
import { sendSMS } from "./vibrate";
import { buildMatchProposalEmail } from "./emailTemplates";

// All external effects are mocked. Run the existing payment -> Boost dispatch
// -> shared SMS helper path against synthetic in-memory state only.
vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./brevo", () => ({ sendEmail: vi.fn() }));
vi.mock("./vibrate", () => ({ sendSMS: vi.fn() }));
vi.mock("./emailTemplates", () => ({
  buildMatchProposalEmail: vi.fn().mockReturnValue({ subject: "synthetic-proposal", htmlBody: "synthetic-profile" }),
}));
vi.mock("./matchDeliveryLog", () => ({
  recordMatchDelivery: vi.fn().mockResolvedValue(undefined),
  matchDeliveryEventKey: vi.fn().mockReturnValue("synthetic-delivery"),
}));
vi.mock("./matchmakingMetrics", () => ({ getMissingProfileFields: vi.fn().mockReturnValue([]) }));
vi.mock("./compatibility", () => ({
  computeFullScore: vi.fn().mockReturnValue({ total: 75 }),
  passesHardFilters: vi.fn().mockReturnValue({ pass: true }),
}));
vi.mock("./boostExclusions", () => ({
  loadBoostExclusionAnchors: vi.fn().mockResolvedValue({ emails: new Set(), phones: new Set() }),
  isBoostExcludedProfile: vi.fn().mockImplementation(party => Boolean(party.isSeed || party.boostExcluded)),
}));
vi.mock("./lifecycleEmailQueue", () => ({ queuePostBoostPlusUpsell: vi.fn().mockResolvedValue(undefined) }));

const NOW = 2_000_000_000_000;
const accepted = { success: true, messageId: "synthetic-email" };
const failed = { success: false, error: "synthetic-failure" };
const blocked = { success: true, messageId: "blocked" };

type EmailResult = typeof accepted | typeof failed;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function fixture(requesterSide: "A" | "B") {
  const partyA = { id: 101, firstName: "Test A", email: "a@example.invalid", phone: "synthetic-phone-a", isPaid: true, isActive: true, isSeed: false };
  const partyB = { id: 202, firstName: "Test B", email: "b@example.invalid", phone: "synthetic-phone-b", isPaid: true, isActive: true, isSeed: false };
  const requester = requesterSide === "A" ? partyA : partyB;
  const match: Record<string, any> = { id: 303, singleAId: 101, singleBId: 202, status: "pending", score: 75, notes: "[BOOST_CANDIDATE] synthetic", waSentAt: null, returnedToPoolAt: null };
  const request: Record<string, any> = { id: 404, singleId: requester.id, matchId: 303, status: "paid", source: "paid", providerTransactionId: "synthetic-transaction", paidAt: NOW };
  const memberships = [partyA, partyB].map(party => ({
    singleId: party.id, status: "active", consentVersion: BOOST_CONSENT_VERSION,
    algorithmicDisclosureAccepted: true, anonymousProfileAccepted: true, termsAccepted: true,
    consentedAt: NOW, lastActiveAt: NOW,
  }));
  const dialect = new MySqlDialect();
  const select = vi.fn().mockImplementation((selection?: unknown) => {
    let table: unknown;
    let condition: any;
    const getRows = () => {
      if (table === matchBoostRequests) return [{ ...request }];
      if (table === matches) return selection ? [] : [{ ...match }];
      if (table === matchBoostMemberships) return memberships;
      if (table === singles) {
        const params = condition ? dialect.sqlToQuery(condition).params : [];
        return [params.includes(partyB.id) || params.includes(partyB.email) ? partyB : partyA];
      }
      // Preferences absent, scientific answers absent. No DB access occurs.
      return [];
    };
    const query: any = {
      from: (value: unknown) => { table = value; return query; },
      where: (value: unknown) => { condition = value; return query; },
      orderBy: () => query,
      limit: async () => getRows(),
      then: (resolve: (rows: any[]) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(getRows()).then(resolve, reject),
    };
    return query;
  });
  const update = vi.fn().mockImplementation((table: unknown) => ({
    set: (patch: Record<string, unknown>) => ({ where: async () => {
      if (table === matches) {
        if (patch.waSentAt != null && match.waSentAt != null) return [{ affectedRows: 0 }];
        Object.assign(match, patch);
      }
      if (table === matchBoostRequests) Object.assign(request, patch);
      return [{ affectedRows: 1 }];
    } }),
  }));
  const db: any = { select, update, transaction: async (work: (tx: any) => unknown) => work(db) };
  vi.mocked(getDb).mockResolvedValue(db);
  return {
    db, match, request, partyA, partyB, requester, memberships,
    fulfill: () => fulfillPaidBoostPayment({ email: requester.email, transactionId: "synthetic-transaction", amountAgorot: 1990 }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  vi.mocked(sendSMS).mockResolvedValue(true);
  vi.mocked(sendEmail).mockResolvedValue(accepted);
});
afterEach(() => vi.mocked(Date.now).mockRestore());

describe("Boost dispatch integration with mocked providers and DB", () => {
  it.each(["A", "B"] as const)("waits for email acceptance, then sends the intended recipient and requester when requester is %s", async side => {
    const f = fixture(side);
    const emailA = deferred<EmailResult>();
    const emailB = deferred<EmailResult>();
    vi.mocked(sendEmail).mockImplementation(input => input.to.email === f.partyA.email ? emailA.promise : emailB.promise);
    const pending = f.fulfill();
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(2));
    expect(sendSMS).not.toHaveBeenCalled();
    emailA.resolve(accepted);
    await Promise.resolve();
    expect(sendSMS).not.toHaveBeenCalled();
    emailB.resolve(accepted);
    expect(await pending).toMatchObject({ delivered: true, creditAvailable: false });
    expect(sendSMS).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(sendSMS).mock.calls;
    expect(calls.map(call => call[0])).toEqual([f.partyA.phone, f.partyB.phone]);
    const requesterIndex = side === "A" ? 0 : 1;
    expect(calls[requesterIndex][1]).toContain("בקשת ה־Boost שלך");
    expect(calls[1 - requesterIndex][1]).toContain("התאמת ה־Boost ממתינה לך במייל");
    expect(calls[1 - requesterIndex][1]).toContain("בספאם ובתיקיית השיווק");
    expect(vi.mocked(buildMatchProposalEmail).mock.calls.map(call => call[0].boostRole))
      .toEqual(side === "A" ? ["sender", "recipient"] : ["recipient", "sender"]);
    expect(f.request.status).toBe("approved");
  });

  it.each(["A", "B"] as const)("does not notify recipient after their failed email when requester is %s; preserves credit failure flow", async side => {
    const f = fixture(side);
    const recipientEmail = side === "A" ? f.partyB.email : f.partyA.email;
    vi.mocked(sendEmail).mockImplementation(async input => input.to.email === recipientEmail ? failed : accepted);
    expect(await f.fulfill()).toMatchObject({ delivered: false, creditAvailable: true });
    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(sendSMS).toHaveBeenCalledWith(f.requester.phone, expect.stringContaining("בקשת ה־Boost שלך"));
    expect(f.request.status).toBe("refunded");
    expect(f.match.status).toBe("pending");
    expect(f.match.waSentAt).toBeNull();
  });

  it.each(["A", "B"] as const)("preserves requester %s SMS fallback while accepted recipient gets service notification", async side => {
    const f = fixture(side);
    vi.mocked(sendEmail).mockImplementation(async input => input.to.email === f.requester.email ? failed : accepted);
    expect(await f.fulfill()).toMatchObject({ delivered: true, creditAvailable: false });
    expect(sendSMS).toHaveBeenCalledTimes(2);
    expect(f.match.status).toBe("proposed");
  });

  it.each(["A", "B"] as const)("does not send new recipient SMS for Brevo local suppression when requester is %s", async side => {
    const f = fixture(side);
    vi.mocked(sendEmail).mockImplementation(async input => input.to.email === f.requester.email ? accepted : blocked);
    await f.fulfill();
    expect(sendSMS).toHaveBeenCalledTimes(1);
    expect(sendSMS).toHaveBeenCalledWith(f.requester.phone, expect.stringContaining("בקשת ה־Boost שלך"));
  });

  it.each(["A", "B"] as const)("honors recipient Boost pool opt-out before any email/SMS when requester is %s", async side => {
    const f = fixture(side);
    f.memberships[side === "A" ? 1 : 0].status = "opted_out";
    expect(await f.fulfill()).toMatchObject({ delivered: false, creditAvailable: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(f.match.status).toBe("pending");
  });

  it.each(["A", "B"] as const)("does not duplicate initial email or SMS on an approved payment callback for requester %s", async side => {
    const f = fixture(side);
    const result = await f.fulfill();
    expect(result, String(f.request.decisionReason)).toMatchObject({ delivered: true });
    expect(await f.fulfill()).toMatchObject({ delivered: true, alreadyProcessed: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendSMS).toHaveBeenCalledTimes(2);
  });
});
