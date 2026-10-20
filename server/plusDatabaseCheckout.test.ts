import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { hasPaidDatabaseMembership } from "../shared/plusDatabaseEligibility";
import { isClosedSeasonalProduct } from "../shared/closedSeasonalOffers";

const state = vi.hoisted(() => ({ rows: [] as any[], available: true, select: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock("./db", () => ({ getDb: vi.fn(async () => state.available ? {
  select: state.select, insert: state.insert, update: state.update,
} : null) }));
import { requirePlusDatabaseCheckout } from "./plusDatabaseCheckout";
import { createPaymentProcess } from "./growPayment";
const member = { id: 1, gender: "female", isPaid: true, isActive: true, isSeed: false, market: "il" };
const email = "member@example.com";
const token = "synthetic-personal-token-123456";

beforeEach(() => {
  vi.clearAllMocks();
  state.available = true; state.rows = [{ ...member }];
  state.select.mockImplementation(() => ({ from: () => ({ where: () => ({ limit: async () => state.rows }) }) }));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External providers forbidden in this test"); }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Plus requires independently registered paid database membership", () => {
  it.each([undefined, null, {}, { isPaid: false, isActive: true }, { isPaid: true, isActive: false },
    { ...member, isSeed: true }, { ...member, market: "us" }, { isPaid: "true", isActive: true }])("blocks an ineligible record %#", profile => {
    expect(hasPaidDatabaseMembership(profile as any)).toBe(false);
  });
  it("preserves paid IL and legacy paid membership without consulting Plus payment flags", () => {
    expect(hasPaidDatabaseMembership(member)).toBe(true);
    expect(hasPaidDatabaseMembership({ ...member, market: null })).toBe(true);
    expect(hasPaidDatabaseMembership({ isPaid: false, isActive: true, plusPaid: true } as any)).toBe(false);
  });
  it("requires a personal link before even reading the database", async () => {
    await expect(requirePlusDatabaseCheckout(email)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(state.select).not.toHaveBeenCalled();
  });
  it("rejects a missing or mismatched identity and a free profile", async () => {
    state.rows = [];
    await expect(requirePlusDatabaseCheckout(email, token)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    state.rows = [{ ...member, isPaid: false }];
    await expect(requirePlusDatabaseCheckout(email, token)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(state.insert).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
  });
  it("fails closed during a database outage", async () => {
    state.available = false;
    await expect(requirePlusDatabaseCheckout(email, token)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("returns the already registered member without creating any profile", async () => {
    await expect(requirePlusDatabaseCheckout(email, token)).resolves.toEqual(member);
    expect(state.insert).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("the lower provider layer rejects bypass attempts before fetching Grow", async () => {
    await expect(createPaymentProcess({ product: "plus", fullName: "Synthetic Member", email })).rejects.toThrow();
    state.rows = [{ ...member, isPaid: false }];
    await expect(createPaymentProcess({ product: "plus", fullName: "Synthetic Member", email, personalToken: token })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled(); expect(state.insert).not.toHaveBeenCalled();
  });
});

describe("Closed Tu B'Av checkout, preserved historical fulfillment", () => {
  it("only closes the retired product", () => {
    expect(isClosedSeasonalProduct("bundle_tubav")).toBe(true);
    for (const product of ["database", "guide", "plus", "bundle_new_year", "match_boost", "live_october"]) {
      expect(isClosedSeasonalProduct(product)).toBe(false);
    }
  });
  it("stops low-level checkout before database or provider calls", async () => {
    await expect(createPaymentProcess({ product: "bundle_tubav", fullName: "Synthetic Member", email })).rejects.toThrow("הטבת ט״ו באב הסתיימה");
    expect(fetch).not.toHaveBeenCalled(); expect(state.select).not.toHaveBeenCalled();
  });
  it("keeps the prior purchase fulfillment and thank-you route intact", () => {
    const webhook = readFileSync("server/growWebhook.ts", "utf8");
    expect(webhook).toContain("async function handleBundleTuBav");
    expect(webhook).toContain("await handleDatabase(email, name, phone, transactionId)");
    expect(webhook).toContain("await handleGuide(email, name, { skipJourney: true })");
    expect(readFileSync("client/src/App.tsx", "utf8")).toContain('path={"/thank-you/bundle"}');
    const page = readFileSync("client/src/pages/TuBavBundle.tsx", "utf8");
    expect(page).not.toContain("GrowWallet"); expect(page).toContain("אין צורך לרכוש שוב");
  });
  it("applies route guards before writes and binds email AND token in the lookup", () => {
    const source = readFileSync("server/routers.ts", "utf8");
    const block = source.slice(source.indexOf("    createProcess: publicProcedure"));
    expect(block.indexOf("isClosedSeasonalProduct(input.product)")).toBeLessThan(block.indexOf("const db = await getDb()"));
    expect(block.indexOf("await requirePlusDatabaseCheckout(normalizedEmail, input.personalToken)")).toBeLessThan(block.indexOf("await db.insert(plusCheckoutIntents)"));
    const lookup = readFileSync("server/plusDatabaseCheckout.ts", "utf8");
    expect(lookup).toContain("eq(singles.questionnaireToken, personalToken)");
    expect(lookup).toContain("email.trim().toLowerCase()");
  });
  it("uses the same paid membership predicate in status, webhook and activation", () => {
    expect(readFileSync("server/plusPilotRouter.ts", "utf8")).toContain("databaseMembershipActive: hasPaidDatabaseMembership(single)");
    expect(readFileSync("server/growWebhook.ts", "utf8")).toContain('hasPaidDatabaseMembership(single) ? "active" : "paid_pending_profile"');
    const activation = readFileSync("server/plusFulfillment.ts", "utf8");
    expect(activation.indexOf("if (!hasPaidDatabaseMembership(databaseMember))")).toBeLessThan(activation.indexOf("const memberValues ="));
  });
  it("provides a verified member entry from the personal dashboard without reviving a closed offer", () => {
    const dashboard = readFileSync("client/src/pages/UserDashboard.tsx", "utf8");
    expect(dashboard).toContain("databaseMembershipActive === true");
    expect(dashboard).toContain("/database-plus?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}");
    expect(dashboard).not.toContain("ההצטרפות למסלול סגורה כרגע");
  });
});
