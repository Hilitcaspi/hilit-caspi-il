import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileMatchingDifficultyControl, {
  matchingDifficultyNoteInput,
  matchingDifficultyToggleInput,
  type MatchingDifficultyProfile,
} from "./ProfileMatchingDifficultyControl";
import ProfileStaffMarkers, { profileStaffSurface } from "./ProfileStaffMarkers";
import MatchProfileCard from "./MatchProfileCard";

type SetInput = { id: number; isMatchingDifficult: boolean; note?: string };
type SetResult = { success: boolean; isMatchingDifficult: boolean; matchingDifficultyNote: string | null };
const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { role: string; isTeamMember?: boolean } | null,
    loading: false,
    error: null as Error | null,
  },
  pending: false,
  mutate: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  error: vi.fn(),
  useMutation: vi.fn(),
  options: null as null | {
    onSuccess: (result: SetResult, input: SetInput) => Promise<void>;
    onError: (error: Error, input: SetInput, context?: { previous: { isMatchingDifficult: boolean; matchingDifficultyNote: string } }) => void;
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ matchmaking: { invalidate: mocks.invalidate } }),
    matchmaking: {
      setMatchingDifficulty: {
        useMutation: (options: NonNullable<typeof mocks.options>) => {
          mocks.useMutation();
          mocks.options = options;
          return { mutate: mocks.mutate, isPending: mocks.pending };
        },
      },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const profile: MatchingDifficultyProfile = Object.freeze({
  id: 900001,
  isMatchingDifficult: true,
  matchingDifficultyNote: "PRIVATE_SYNTHETIC_REASON_NOT_PUBLIC",
});
const renderControl = (compact = true) => renderToStaticMarkup(createElement(ProfileMatchingDifficultyControl, { profile, compact }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", {});
  mocks.auth.user = { role: "admin" };
  mocks.auth.loading = false;
  mocks.auth.error = null;
  mocks.pending = false;
  mocks.options = null;
});
afterEach(() => vi.unstubAllGlobals());

describe("matching difficulty control with synthetic data only", () => {
  it("explicitly marks/unmarks without including or changing the private note", () => {
    expect(matchingDifficultyToggleInput(profile)).toEqual({ id: profile.id, isMatchingDifficult: false });
    expect(matchingDifficultyToggleInput({ ...profile, isMatchingDifficult: false })).toEqual({ id: profile.id, isMatchingDifficult: true });
    expect(matchingDifficultyToggleInput({ id: profile.id })).toEqual({ id: profile.id, isMatchingDifficult: true });
    expect(matchingDifficultyToggleInput(profile)).not.toHaveProperty("note");
    expect(profile.matchingDifficultyNote).toBe("PRIVATE_SYNTHETIC_REASON_NOT_PUBLIC");
  });

  it("saves/clears an optional reason independently of the saved mark", () => {
    expect(matchingDifficultyNoteInput(profile, "")).toEqual({ id: profile.id, isMatchingDifficult: true, note: "" });
    expect(matchingDifficultyNoteInput({ ...profile, isMatchingDifficult: false }, "new reason")).toEqual({ id: profile.id, isMatchingDifficult: false, note: "new reason" });
  });

  it.each([
    [null, false, null],
    [{ role: "user" }, false, null],
    [{ role: "admin" }, true, null],
    [{ role: "admin" }, false, new Error("auth failed")],
    [{ role: "user", isTeamMember: true }, false, new Error("auth failed")],
  ])("fails closed for nonstaff, loading and failed auth (%j)", (user, loading, error) => {
    mocks.auth.user = user;
    mocks.auth.loading = loading;
    mocks.auth.error = error;
    expect(renderControl()).toBe("");
    expect(mocks.useMutation).not.toHaveBeenCalled();
  });

  it.each([{ role: "admin" }, { role: "user", isTeamMember: true }])("allows staff %j but never prints the saved reason outside the editor", user => {
    mocks.auth.user = user;
    const html = renderControl();
    expect(html).toContain('data-profile-matching-difficulty-control="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("lucide-puzzle");
    expect(html).not.toContain(profile.matchingDifficultyNote);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("disables both actions throughout a pending save", () => {
    mocks.pending = true;
    const html = renderControl();
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it("invalidates staff matching caches on success and shows an error toast without sending", async () => {
    renderControl();
    await mocks.options!.onSuccess({ success: true, isMatchingDifficult: false, matchingDifficultyNote: profile.matchingDifficultyNote! }, { id: profile.id, isMatchingDifficult: false });
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledOnce();
    mocks.options!.onError(new Error("private server details"), { id: profile.id, isMatchingDifficult: false });
    expect(mocks.error).toHaveBeenCalledWith("לא ניתן לשמור את סימון הקושי בהתאמה. נסו שוב.");
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("renders nothing on static SSR, with no auth or mutation dependency", () => {
    vi.stubGlobal("window", undefined);
    expect(renderControl()).toBe("");
    expect(mocks.useMutation).not.toHaveBeenCalled();
  });
});

describe("passive staff badges and card-root integration", () => {
  it("coexists with heart/star, never makes badges interactive, and keeps existing surface colors", () => {
    const flags = { isCoachingClient: true, isNotBasic: true, isMatchingDifficult: true };
    const html = renderToStaticMarkup(createElement(ProfileStaffMarkers, { profile: flags }));
    for (const icon of ["lucide-heart", "lucide-star", "lucide-puzzle"]) expect(html).toContain(icon);
    expect(html).toContain('data-profile-matching-difficult="true"');
    expect(html).toContain("bg-emerald-100");
    expect(html).not.toMatch(/<button|<textarea|<a\b/);
    expect(profileStaffSurface(flags)).toBe("bg-pink-50 ring-1 ring-inset ring-pink-300");
    expect(profileStaffSurface({ isMatchingDifficult: true }, "bg-slate-50")).toBe("bg-slate-50");
    expect(renderToStaticMarkup(createElement(ProfileStaffMarkers, { profile: { isMatchingDifficult: false } }))).toBe("");
  });

  it.each([false, true])("shows one root control in full/comparison cards (comparison=%s), never the note in profile facts", comparison => {
    const html = renderToStaticMarkup(createElement(MatchProfileCard, { profile, comparison }));
    expect(html.match(/data-profile-matching-difficulty-control="true"/g)).toHaveLength(1);
    expect(html).not.toContain(profile.matchingDifficultyNote);
    const suppressed = renderToStaticMarkup(createElement(MatchProfileCard, { profile, comparison, showMatchingDifficultyControl: false }));
    expect(suppressed).not.toContain("data-profile-matching-difficulty-control");
  });

  it("has exactly one waiting header control and suppresses the nested card copy", () => {
    const waiting = source("./WaitingMemberProfile.tsx");
    expect(waiting.match(/<ProfileMatchingDifficultyControl /g)).toHaveLength(1);
    expect(waiting).toContain("showMatchingDifficultyControl={false}");
    expect(waiting).not.toContain("matchingDifficultyNote");
    const followup = source("./ResponseFollowupSection.tsx");
    expect(followup.match(/<ProfileMatchingDifficultyControl /g)).toHaveLength(1);
    expect(followup).not.toContain("matchingDifficultyNote");
  });

  it("keeps mutations out of markers/facts and the private note confined to an optional 2000-character editor", () => {
    const control = source("./ProfileMatchingDifficultyControl.tsx");
    expect(control).toContain("maxLength={2000}");
    expect(control).toContain('setDraft("")');
    expect(control).toContain("onClick={() => handleOpenChange(false)}");
    expect(control).toContain("await utils.matchmaking.invalidate()");
    expect(control).not.toMatch(/as any|fetch\(|sendEmail|sendSms|createAndSendMatch/);
    const marker = source("./ProfileStaffMarkers.tsx");
    expect(marker).not.toMatch(/useAuth|useMutation|matchingDifficultyNote/);
    const card = source("./MatchProfileCard.tsx");
    const facts = card.slice(card.indexOf("export function MatchProfileFacts"), card.indexOf("export default function MatchProfileCard"));
    expect(facts).not.toContain("ProfileMatchingDifficultyControl");
    expect(facts).not.toContain("matchingDifficultyNote");
  });
});
