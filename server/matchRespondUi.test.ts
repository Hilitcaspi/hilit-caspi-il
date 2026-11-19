import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  data: null as any,
  mutationOptions: null as any,
  mutate: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    matchmaking: {
      getMatchDetails: {
        useQuery: () => ({
          data: mocks.data,
          isLoading: false,
          error: null,
          refetch: mocks.refetch,
        }),
      },
      respondToMatch: {
        useMutation: (options: unknown) => {
          mocks.mutationOptions = options;
          return { mutate: mocks.mutate, isPending: false };
        },
      },
    },
  },
}));
import MatchRespond, {
  getSavedResponseOutcome,
  SavedResponseScreen,
} from "../client/src/pages/MatchRespond";

const base = () => ({
  status: "proposed",
  alreadyResponded: false,
  myDecision: null,
  isExpired: false,
  canRespond: true,
  closed: false,
  responseOutcome: null,
  proposalSource: "manual",
  myName: "Synthetic recipient",
  score: 88,
  partner: {
    firstName: "Synthetic partner",
    age: 35,
    city: "QA",
    isAnonymous: false,
    photoUrl: null,
    height: null,
    education: null,
    religiosity: null,
    occupation: "QA occupation",
    about: "QA profile",
    reasons: [],
  },
});
const page = () => renderToStaticMarkup(React.createElement(MatchRespond));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.data = base();
  mocks.refetch.mockResolvedValue({ data: null });
  vi.stubGlobal("window", { location: { search: "?token=synthetic" } });
});
afterEach(() => vi.unstubAllGlobals());

describe("public match response page", () => {
  it("renders identical proposal before own vote even with legacy decline state", () => {
    const proposal = page();
    mocks.data = {
      ...base(),
      status: "rejected",
      canRespondAfterDecline: true,
    };
    const afterDecline = page();
    expect(afterDecline).toEqual(proposal);
    expect(afterDecline).toContain("Synthetic partner");
    expect(afterDecline).toContain("כן, מעניין אותי");
    expect(afterDecline).toContain("לא הפעם");
    expect(afterDecline).not.toContain("משוב");
    expect(afterDecline).not.toContain("הפעם לא הייתה התאמה");
    expect(afterDecline).not.toContain("ההצעה הזו נסגרה");
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it.each(["yes", "no"])(
    "never votes automatically from legacy response=%s",
    response => {
      vi.stubGlobal("window", {
        location: { search: `?token=synthetic&response=${response}` },
      });
      expect(page()).toContain("כן, מעניין אותי");
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );

  it.each(["matched", "waiting", "not_matched", "closed"] as const)(
    "confirms saved %s on replay",
    outcome => {
      mocks.data = {
        ...base(),
        alreadyResponded: true,
        canRespond: false,
        responseOutcome: outcome,
        myDecision: true,
      };
      const html = page();
      expect(html).toContain("הבחירה נשמרה");
      expect(html).not.toContain("כן, מעניין אותי");
      expect(html).not.toContain("לא הפעם");
      if (outcome === "not_matched")
        expect(html).toContain("הפעם לא הייתה התאמה");
      if (outcome === "waiting")
        expect(html).toContain("ממתינים לתשובת הצד השני");
      if (outcome === "matched") expect(html).toContain("יש התאמה הדדית");
    }
  );

  it("does not show expired proposal controls or claim the unused vote was saved", () => {
    mocks.data = { ...base(), isExpired: true, canRespond: false };
    const html = page();
    expect(html).toContain("עבר המועד להגיב");
    expect(html).not.toContain("הבחירה נשמרה");
    expect(html).not.toContain("כן, מעניין אותי");
  });

  it.each([{ closed: true }, { canRespond: false }])(
    "guards manual closure %j without claiming a vote",
    fields => {
      mocks.data = { ...base(), ...fields };
      const html = page();
      expect(html).toContain("ההצעה הזו נסגרה");
      expect(html).not.toContain("הבחירה נשמרה");
      expect(html).not.toContain("כן, מעניין אותי");
    }
  );

  it("does not put contact values or unsupported delivery promises in confirmation screens", () => {
    for (const outcome of ["matched", "waiting", "not_matched"] as const) {
      const html = renderToStaticMarkup(
        React.createElement(SavedResponseScreen, { outcome })
      );
      expect(html).not.toContain("mailto:");
      expect(html).not.toContain("tel:");
      expect(html).not.toContain("שלחתי לשניכם מייל");
    }
  });

  it("uses synchronous client double-submit guard and the explicit-only mutation", () => {
    const source = readFileSync(
      new URL("../client/src/pages/MatchRespond.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toMatch(/submissionInFlight\.current\s*\|\|\s*respond\.isPending/);
    expect(source).toContain("submissionInFlight.current = true");
    expect(source).toContain("respond.mutate({ token, response })");
    expect(source).not.toContain('params.get("response")');
    expect(source).not.toContain("canRespondAfterDecline");
  });
});

describe("post-save result contract", () => {
  it("interprets saved feedback as no match rather than a refused write", () => {
    expect(
      getSavedResponseOutcome(
        { closed: true, lateFeedback: true, status: "rejected" },
        "yes"
      )
    ).toBe("not_matched");
  });
  it("honors authoritative outcome over legacy status", () => {
    expect(
      getSavedResponseOutcome({
        responseOutcome: "closed",
        status: "matched",
        alreadyResponded: true,
      })
    ).toBe("closed");
  });
  it("ignores the replay input and confirms the persisted yes/no", () => {
    expect(
      getSavedResponseOutcome(
        { alreadyResponded: true, myDecision: true, status: "proposed" },
        "no"
      )
    ).toBe("waiting");
    expect(
      getSavedResponseOutcome(
        { alreadyResponded: true, myDecision: false, status: "rejected" },
        "yes"
      )
    ).toBe("not_matched");
  });
  it("does not infer matched from an unconfirmed raw matched state", () => {
    expect(
      getSavedResponseOutcome({ status: "matched", bothApproved: false }, "yes")
    ).toBe("waiting");
    expect(
      getSavedResponseOutcome({ status: "matched", bothApproved: true }, "yes")
    ).toBe("matched");
  });
});
