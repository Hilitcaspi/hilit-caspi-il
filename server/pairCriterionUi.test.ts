import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import MatchProfileCard, { type MatchProfile } from "../client/src/components/MatchProfileCard";

const ui = readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/CRMMatchmaking.tsx"), "utf8");
const marker = readFileSync(path.resolve(import.meta.dirname, "../client/src/components/PairCriterionIndicator.tsx"), "utf8");
const fact: MatchProfile = { id: 1, firstName: "פרופיל דמה", age: 32, gender: "male", city: "חיפה", height: 180, education: "bachelor", religiosity: "secular", hasKids: false, wantsKids: "yes", hasPets: false, smokingStatus: "no" };
const seeker: MatchProfile = { id: 2, firstName: "פרופיל נוסף", age: 30, gender: "female", city: "חיפה", minAgePreference: 30, maxAgePreference: 35, minHeightPreference: 175, maxHeightPreference: 190, seekingGender: "male", locationPreference: "close", religiosityPreference: "secular,traditional", openToPartnerWithKids: "no", wantsKids: "yes", acceptsPets: false, smokingPreference: "no_smokers" };
const htmlFor = (profile: MatchProfile, otherProfile?: MatchProfile, comparison = true) => renderToStaticMarkup(createElement(MatchProfileCard, { profile, otherProfile, comparison }));
const hasState = (html: string, criterion: string, state: string) => new RegExp(`data-pair-criterion="${criterion}"[^>]*data-criterion-state="${state}"`).test(html);

describe("pair criterion presentation without network or customer data", () => {
  // Vitest uses classic JSX here; the application's Vite build uses automatic JSX.
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  it("marks this person's facts against the other person's preferences", () => {
    const html = htmlFor(fact, seeker);
    for (const criterion of ["גיל", "גובה", "מגורים", "מגדר", "רמה דתית", "ילדים קיימים", "רצון בילדים", "חיות מחמד", "עישון"]) expect(hasState(html, criterion, "met")).toBe(true);
    expect(hasState(html, "השכלה", "unknown")).toBe(true);
    expect(html).toContain('data-match-comparison="classic"');
    expect(html).toContain("עומד בהעדפה של הצד השני");
  });
  it("keeps a near miss out of the green checks, independently in each direction", () => {
    expect(hasState(htmlFor({ ...fact, age: 37, height: 172 }, seeker), "גיל", "not_met")).toBe(true);
    expect(hasState(htmlFor({ ...fact, age: 37, height: 172 }, seeker), "גובה", "not_met")).toBe(true);
    const reverse = htmlFor({ ...seeker, height: 170 }, fact);
    expect(hasState(reverse, "גיל", "unknown")).toBe(true);
    expect(hasState(reverse, "גובה", "unknown")).toBe(true);
  });
  it("does not decorate single-person cards or invent criteria without a counterpart", () => {
    expect(htmlFor(fact, seeker, false)).not.toContain("data-pair-criterion=");
    expect(htmlFor(fact)).not.toContain("data-pair-criterion=");
    expect(htmlFor({ ...fact, age: null, city: null }, seeker)).toContain("לא ניתן לקבוע");
  });
  it("wires the two directions in waiting/advanced, pending/history and manual comparison", () => {
    expect(ui).toContain("profile.id === filterTargetProfile.id ? single : filterTargetProfile");
    expect(ui).toContain("comparisonProfile(persons[i === 0 ? 1 : 0])");
    expect(ui).toContain('data-manual-pair-comparison');
    expect(ui).toContain("otherProfile={comparisonProfiles[index === 0 ? 1 : 0]}");
    expect(ui.match(/<PairCriteriaLegend \/>/g)).toHaveLength(3);
    expect(ui).toContain("[compatResult?.personA, compatResult?.personB]");
  });
  it("explains statuses on focus or tap without any sending operation", () => {
    expect(marker).toContain('type="button"');
    expect(marker).toContain("event.stopPropagation()");
    expect(marker).toContain("toast.info");
    expect(marker).toContain("aria-label=");
    expect(marker).not.toMatch(/fetch\(|\.mutate|createAndSendMatch|approveMatch|sendEmail|sendSms/);
    expect(marker).toContain("לא למסנני החיפוש");
  });
});
