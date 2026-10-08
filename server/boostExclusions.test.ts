import { describe, expect, it } from "vitest";
import { isBoostExcludedProfile, loadBoostExclusionAnchors } from "./boostExclusions";

describe("Boost test-profile exclusions", () => {
  const anchors = {
    emails: new Set(["fictionalowner@gmail.com", "ownerpilot@hotmail.com"]),
    phones: new Set(["0501234567"]),
  };

  it("excludes explicitly marked and seed profiles regardless of contact details", () => {
    expect(isBoostExcludedProfile({ boostExcluded: true })).toBe(true);
    expect(isBoostExcludedProfile({ isSeed: true })).toBe(true);
  });

  it("matches the owner's Gmail plus/dot alias and internationally formatted Israeli mobile", () => {
    expect(isBoostExcludedProfile({ email: " f.i.c.t.i.o.n.a.l.o.w.n.e.r+pilot@GMAIL.COM " }, anchors)).toBe(true);
    expect(isBoostExcludedProfile({ phone: "+972 (50) 123-4567" }, anchors)).toBe(true);
    expect(isBoostExcludedProfile({ email: "ownerpilot+pilot@hotmail.com" }, anchors)).toBe(true);
  });

  it("does not block an unrelated person who has a similar name, domain or incomplete phone", () => {
    expect(isBoostExcludedProfile({ email: "another.owner@gmail.com", phone: "050123", boostExcluded: false }, anchors)).toBe(false);
    expect(isBoostExcludedProfile({ email: "fictionalowner@another.example", phone: "" }, anchors)).toBe(false);
    expect(isBoostExcludedProfile(null, anchors)).toBe(false);
  });

  it("loads only explicitly marked profiles as identity anchors", async () => {
    const rows = [
      { email: "fictionalowner@gmail.com", phone: "050-123-4567" },
      { email: "ownerpilot@hotmail.com", phone: null },
    ];
    const db = { select: () => ({ from: () => ({ where: async () => rows }) }) };
    const loaded = await loadBoostExclusionAnchors(db);
    expect(loaded.emails).toEqual(anchors.emails);
    expect(loaded.phones).toEqual(anchors.phones);
  });
});
