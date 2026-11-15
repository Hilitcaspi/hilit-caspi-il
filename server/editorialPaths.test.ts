import { describe, expect, it } from "vitest";
import { editorialNextStep, FEATURED_EDITORIAL, parseEditorialTags } from "../shared/editorialPaths";

describe("editorial acquisition paths", () => {
  it("keeps matchmaking focused on database purchases", () => {
    expect(editorialNextStep("serious-matchmaking-alternatives-to-apps").primaryHref).toBe("/database");
  });
  it("allows reflection before a purchase", () => {
    expect(editorialNextStep("chemistry-vs-compatibility-first-date").primaryHref).toBe("/dna-quiz");
  });
  it("connects personal coaching content to a meeting", () => {
    expect(editorialNextStep("relationship-coaching-guide").primaryHref).toBe("/single-session");
  });
  it("promotes the bundle only inside its existing offer window", () => {
    const slug = "november-2026-database-course-offer";
    expect(editorialNextStep(slug, Date.parse("2026-11-15T12:00:00Z")).primaryHref).toBe("/november-love");
    expect(editorialNextStep(slug, Date.parse("2026-12-01T12:00:00Z")).primaryHref).toBe("/database");
  });
  it("links existing guides directly, without duplicate blog copies or attribution UTMs", () => {
    expect(FEATURED_EDITORIAL.map(item => item.href)).toEqual(["/signs", "/attraction"]);
    expect(FEATURED_EDITORIAL.every(item => !item.href.includes("utm_"))).toBe(true);
  });
  it("normalizes existing JSON tags and comma-separated tags", () => {
    expect(parseEditorialTags('["זוגיות", "היכרויות"]')).toEqual(["זוגיות", "היכרויות"]);
    expect(parseEditorialTags("זוגיות, היכרויות")).toEqual(["זוגיות", "היכרויות"]);
    expect(parseEditorialTags(null)).toEqual([]);
  });
});
