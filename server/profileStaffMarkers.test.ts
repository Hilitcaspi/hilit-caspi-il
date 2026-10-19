import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileStaffMarkers, { profileStaffSurface } from "../client/src/components/ProfileStaffMarkers";

const renderMarkers = (profile: { isCoachingClient?: boolean | null; isNotBasic?: boolean | null }) =>
  renderToStaticMarkup(createElement(ProfileStaffMarkers, { profile }));

describe("ProfileStaffMarkers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders accessible Lucide heart and star markers when both staff flags are true", () => {
    const markup = renderMarkers({ isCoachingClient: true, isNotBasic: true });

    expect(markup).toContain('data-profile-staff-markers="true"');
    expect(markup).toContain('data-profile-coaching="true"');
    expect(markup).toContain('data-profile-special-attention="true"');
    expect(markup).toContain('aria-label="מלווה"');
    expect(markup).toContain('aria-label="יחס מיוחד"');
    expect(markup).toContain("lucide-heart");
    expect(markup).toContain("lucide-star");
  });

  it("renders no markers for false and null flags", () => {
    expect(renderMarkers({ isCoachingClient: false, isNotBasic: false })).toBe("");
    expect(renderMarkers({ isCoachingClient: null, isNotBasic: null })).toBe("");
  });

  it("uses pink only for a coaching client and keeps neutral profiles out of pink", () => {
    expect(profileStaffSurface({ isCoachingClient: true })).toBe("bg-pink-50 ring-1 ring-inset ring-pink-300");
    expect(profileStaffSurface({ isCoachingClient: false, isNotBasic: true })).toBe("bg-white");
    expect(profileStaffSurface({ isCoachingClient: null, isNotBasic: null }, "bg-slate-50")).toBe("bg-slate-50");
  });

  it("renders from an immutable profile without fetches or mutations", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const profile = Object.freeze({ isCoachingClient: true, isNotBasic: false });

    const markup = renderMarkers(profile);

    expect(markup).toContain("מלווה");
    expect(profile).toEqual({ isCoachingClient: true, isNotBasic: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
