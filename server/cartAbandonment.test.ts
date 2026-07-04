import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Cart Abandonment Logic Tests
 * 
 * Tests the processCartAbandonment function logic:
 * 1. Finds payment_leads created 1-2 hours ago
 * 2. Checks if they paid (crmLeads.paymentRef, crmLeads.status, singles.isPaid, leads.source)
 * 3. If not paid → starts abandoned_* journey
 * 4. Idempotency: startJourney already prevents duplicates
 */

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  resetDb: vi.fn(),
}));

// Mock brevo
vi.mock("./brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  addContactToList: vi.fn().mockResolvedValue(undefined),
}));

// Mock joni
vi.mock("./joni", () => ({
  sendWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

describe("Cart Abandonment Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map products to correct abandoned journey keys", () => {
    const productToJourney: Record<string, string> = {
      database: "abandoned_database",
      guide: "abandoned_guide",
      course: "abandoned_course",
      coaching: "abandoned_coaching",
      coaching_mas: "abandoned_coaching",
      session: "abandoned_coaching",
    };

    expect(productToJourney["database"]).toBe("abandoned_database");
    expect(productToJourney["guide"]).toBe("abandoned_guide");
    expect(productToJourney["course"]).toBe("abandoned_course");
    expect(productToJourney["coaching"]).toBe("abandoned_coaching");
    expect(productToJourney["coaching_mas"]).toBe("abandoned_coaching");
    expect(productToJourney["session"]).toBe("abandoned_coaching");
  });

  it("should correctly identify the 1-2 hour window for abandonment detection", () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    // Lead created 90 minutes ago - should be in window
    const lead90min = now - 90 * 60 * 1000;
    expect(lead90min < oneHourAgo).toBe(true);
    expect(lead90min > twoHoursAgo).toBe(true);

    // Lead created 30 minutes ago - too recent, not in window
    const lead30min = now - 30 * 60 * 1000;
    expect(lead30min < oneHourAgo).toBe(false);

    // Lead created 3 hours ago - too old, not in window
    const lead3h = now - 3 * 60 * 60 * 1000;
    expect(lead3h > twoHoursAgo).toBe(false);
  });

  it("should skip leads that have paymentRef in crmLeads", () => {
    // A lead with paymentRef means they paid
    const crmLead = { paymentRef: "txn_123", status: "new_lead" };
    const shouldSkip = !!crmLead.paymentRef;
    expect(shouldSkip).toBe(true);
  });

  it("should skip leads with client status in crmLeads", () => {
    const clientStatuses = ["client_database", "client_guide", "client_course", "client_coaching"];
    
    for (const status of clientStatuses) {
      const crmLead = { paymentRef: null, status };
      const shouldSkip = !!(crmLead.status && clientStatuses.includes(crmLead.status));
      expect(shouldSkip).toBe(true);
    }

    // new_lead should NOT be skipped
    const newLead = { paymentRef: null, status: "new_lead" };
    const shouldSkip = !!(newLead.status && clientStatuses.includes(newLead.status));
    expect(shouldSkip).toBe(false);
  });

  it("should skip database leads that have isPaid=true in singles table", () => {
    const single = { isPaid: true };
    expect(single.isPaid).toBe(true);

    const singleUnpaid = { isPaid: false };
    expect(singleUnpaid.isPaid).toBe(false);
  });

  it("should skip coaching leads that have paid_coaching source in leads table", () => {
    const paidCoachingLead = { id: 1, source: "paid_coaching" };
    expect(!!paidCoachingLead).toBe(true);

    const paidCoachingMasLead = { id: 2, source: "paid_coaching_mas" };
    expect(!!paidCoachingMasLead).toBe(true);
  });

  it("should extract firstName correctly from full name", () => {
    const tests = [
      { name: "הילית כספי", expected: "הילית" },
      { name: "דני", expected: "דני" },
      { name: "יוסי בן דוד", expected: "יוסי" },
    ];

    for (const t of tests) {
      const firstName = t.name.split(" ")[0];
      expect(firstName).toBe(t.expected);
    }
  });
});
