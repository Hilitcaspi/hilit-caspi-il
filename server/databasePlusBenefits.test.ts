import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildPlusBoostMembershipValues } from "./plusFulfillment";

describe("Database Plus benefits", () => {
  it("activates the current Boost consent only after Plus fulfillment", () => {
    const now = Date.UTC(2026, 8, 7, 12, 0, 0);
    const values = buildPlusBoostMembershipValues({
      id: 42,
      firstName: "Test",
      lastName: "Member",
      email: "test@example.com",
      phone: "0500000000",
      gender: "female",
      age: 35,
      city: "תל אביב",
      occupation: "בדיקה",
      height: 165,
      religiosity: "secular",
      about: "פרופיל בדיקה מלא לצורך בדיקת זכאות בלבד",
      partnerDescription: "מחפשת קשר רציני ויציב עם אדם מתאים",
      photoUrl: "/test.jpg",
      dnaType: "anchor",
      questionnaireCompletedAt: now - 1,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      isPaid: true,
      isActive: true,
      isSeed: false,
    } as any, now);

    expect(values).toMatchObject({
      status: "active",
      algorithmicDisclosureAccepted: true,
      anonymousProfileAccepted: true,
      termsAccepted: true,
      source: "plus_checkout",
      eligibleAt: now,
    });
  });

  it("explains the two matches and one included Boost without provider jargon", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "client/src/pages/ThankYouPlus.tsx"), "utf8");
    expect(source).toContain("שתי התאמות בכל חודש");
    expect(source).toContain("בוסט אחד ללא תשלום נוסף");
    expect(source).not.toContain("לאחר ש־Grow יאשר");
  });
});
