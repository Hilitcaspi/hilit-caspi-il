import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getBoostAdminState, summarizeBoostMembers, type BoostAdminRow } from "./boostAdmin";

const VERSION = "2026-08-29-v2";
const approved = (overrides: Partial<BoostAdminRow> = {}): BoostAdminRow => ({
  membershipStatus: "active",
  consentVersion: VERSION,
  algorithmicDisclosureAccepted: true,
  anonymousProfileAccepted: true,
  termsAccepted: true,
  pilotCohort: null,
  gender: "female",
  isActive: true,
  isPaid: true,
  ...overrides,
});

describe("Boost CRM overview", () => {
  it("counts only current complete consent as approved", () => {
    expect(getBoostAdminState(approved(), VERSION)).toBe("approved");
    expect(getBoostAdminState(approved({ consentVersion: "old" }), VERSION)).toBe("needs_reconsent");
    expect(getBoostAdminState(approved({ termsAccepted: false }), VERSION)).toBe("needs_reconsent");
  });

  it("separates controlled tests, active paid profiles and customer counts", () => {
    const counts = summarizeBoostMembers([
      approved(),
      approved({ gender: "male", pilotCohort: "controlled_test" }),
      approved({ isActive: false }),
      approved({ consentVersion: "old" }),
      approved({ membershipStatus: "opted_out" }),
    ], VERSION);
    expect(counts.approved).toBe(3);
    expect(counts.approvedCustomers).toBe(2);
    expect(counts.testAccounts).toBe(1);
    expect(counts.activePaidProfiles).toBe(2);
    expect(counts.needsReconsent).toBe(1);
    expect(counts.optedOut).toBe(1);
    expect(counts.female).toBe(2);
    expect(counts.male).toBe(1);
  });

  it("keeps the CRM overview behind team access and wires the dedicated tab", () => {
    const routersSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    const crmSource = fs.readFileSync(path.join(process.cwd(), "client/src/pages/CRMMatchmaking.tsx"), "utf8");
    const componentSource = fs.readFileSync(path.join(process.cwd(), "client/src/components/BoostMembersAdminSection.tsx"), "utf8");

    expect(routersSource).toContain("boostMembersOverview: teamProcedure.query");
    expect(routersSource).toContain('ctx.user.role !== "admin"');
    expect(crmSource).toContain('{ id: "boost" as const, label: "מאושרי Boost"');
    expect(crmSource).toContain('<BoostMembersAdminSection />');
    expect(componentSource).toContain("חיפוש לפי שם, מייל, טלפון או עיר");
    expect(componentSource).toContain("נדרש אישור מחדש");
  });
});
