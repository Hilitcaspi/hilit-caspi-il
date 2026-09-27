import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { profileActionConfirmation, profileActionSchema } from "./controlCenterRouter";

const source = readFileSync(resolve(process.cwd(), "server/controlCenterRouter.ts"), "utf8");

describe("control center profile safeguards", () => {
  it("accepts only the supported profile actions", () => {
    expect(profileActionSchema.safeParse("close_profile").success).toBe(true);
    expect(profileActionSchema.safeParse("activate_profile").success).toBe(true);
    expect(profileActionSchema.safeParse("correct_email").success).toBe(true);
    expect(profileActionSchema.safeParse("unsubscribe_marketing").success).toBe(true);
    expect(profileActionSchema.safeParse("delete_profile").success).toBe(false);
  });

  it("requires a distinct Hebrew confirmation phrase for every mutation", () => {
    expect(profileActionConfirmation("close_profile")).toBe("סגירת פרופיל");
    expect(profileActionConfirmation("activate_profile")).toBe("הפעלת פרופיל");
    expect(profileActionConfirmation("correct_email")).toBe("עדכון מייל");
    expect(profileActionConfirmation("unsubscribe_marketing")).toBe("הסרה מדיוור");
  });

  it("uses a preflight, optimistic concurrency and a transaction for profile changes", () => {
    expect(source).toContain("buildProfileActionPreview(input)");
    expect(source).toContain("expectedUpdatedAt");
    expect(source).toContain("db.transaction(async tx =>");
    expect(source).toContain("שחרור התאמות פתוחות וביטול קישורי אישור");
    expect(source).toContain("קיים מנוי PLUS פעיל או בתהליך");
    expect(source).toContain("existingEvent");
    expect(source).toContain("duplicate: true");
    expect(source).toContain("input.expectedUpdatedAt !== undefined");
  });

  it("allows an inactive profile to finish the remaining closure layers", () => {
    expect(source).toContain("הפרופיל כבר אינו פעיל; הפעולה תשלים את שאר שכבות הסגירה");
    expect(source).not.toContain('blockers.push("הפרופיל כבר לא פעיל")');
  });

  it("closes matching, access, messaging, Boost, Plus and follow-up surfaces together", () => {
    expect(source).toContain("questionnaireToken: null");
    expect(source).toContain("approvalTokenA: null");
    expect(source).toContain('matchDetailStatus: "ended"');
    expect(source).toContain('status: "removed"');
    expect(source).toContain('decisionReason: "profile_closed_by_owner"');
    expect(source).toContain('billingStatus: "ended"');
    expect(source).toContain('status: "not_relevant"');
    expect(source).toContain("emailUnsubscribed: true");
    expect(source).toContain('status: "archived"');
    expect(source).toContain('status: "cancelled"');
    expect(source).toContain("matchBoostPilotInterests");
    expect(source).toContain("courseCompassLeads");
    expect(source).toContain("crmTeamTasks");
  });

  it("uses the production seed flag name in aggregate profile counts", () => {
    expect(source).toContain("isSeed=0");
    expect(source).not.toContain("isSeedProfile=0");
  });

  it("never silently restores marketing or matching consent during activation", () => {
    const start = source.indexOf('input.action === "activate_profile"');
    const end = source.indexOf('input.action === "correct_email"', start);
    const activation = source.slice(start, end);
    expect(activation).toContain("הסכמה שיווקית לא תופעל מחדש");
    expect(activation).not.toContain("consentEmailMarketing: true");
    expect(activation).not.toContain("consentMatchmaking: true");
  });
});
