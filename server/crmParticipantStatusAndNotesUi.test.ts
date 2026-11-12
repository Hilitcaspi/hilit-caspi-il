import { readFileSync } from "node:fs";
import { createElement, useState } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import {
  getCrmParticipantStatus,
  getRecordedParticipantChoice,
  type CrmParticipantMatch,
} from "../client/src/lib/crmParticipantStatus";

const crm = readFileSync(new URL("../client/src/pages/CRMMatchmaking.tsx", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const profileCard = readFileSync(new URL("../client/src/components/MatchProfileCard.tsx", import.meta.url), "utf8");
const source = ts.createSourceFile("CRMMatchmaking.tsx", crm, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const notesDeclaration = source.statements.find((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && node.name?.text === "AdminNotesField",
);
if (!notesDeclaration) throw new Error("Existing private notes component is missing");
const notesSource = notesDeclaration.getText(source);

const fixture = (overrides: Partial<CrmParticipantMatch> = {}): CrmParticipantMatch => ({
  status: "proposed", approvedByA: false, approvedByB: false,
  tokenAUsedAt: null, tokenBUsedAt: null, ...overrides,
});
const CLOSED = "ההצעה נסגרה לפני שנרשמה תשובה";

describe("CRM personal response presentation (synthetic fixtures only)", () => {
  it.each([true, false])("preserves a recorded yes after partner rejection, isA=%s", isA => {
    const match = fixture({ status: "rejected", approvedByA: isA, approvedByB: !isA,
      tokenAUsedAt: 1000, tokenBUsedAt: 2000 });
    expect(getRecordedParticipantChoice(match, isA)).toBe("yes");
    expect(getCrmParticipantStatus(match, isA)?.label).toBe("בחר כן");
    expect(getRecordedParticipantChoice(match, !isA)).toBe("no");
    expect(getCrmParticipantStatus(match, !isA)?.label).toBe("בחר לא הפעם");
  });

  it.each([true, false])("does not blame the unanswered side when the partner closes the proposal, isA=%s", isA => {
    const match = fixture({ status: "rejected", tokenAUsedAt: isA ? null : 1000,
      tokenBUsedAt: isA ? 1000 : null });
    expect(getCrmParticipantStatus(match, isA)?.label).toBe(CLOSED);
    expect(getCrmParticipantStatus(match, !isA)?.label).toBe("בחר לא הפעם");
  });

  it.each([true, false])("ignores legacy default false without this person's token, isA=%s", isA => {
    const match = fixture();
    expect(getRecordedParticipantChoice(match, isA)).toBeNull();
    expect(getCrmParticipantStatus(match, isA)?.label).toBe("לא פתח מייל");
  });

  it.each([true, false])("does not invent a decline when token consumption has no stored choice, isA=%s", isA => {
    const match = fixture({ approvedByA: null, approvedByB: undefined,
      tokenAUsedAt: 1000, tokenBUsedAt: 1000 });
    expect(getRecordedParticipantChoice(match, isA)).toBeNull();
    expect(getCrmParticipantStatus(match, isA)?.label).toBe("לא תועדה בחירה בתשובה");
    expect(getCrmParticipantStatus({ ...match, status: "rejected" }, isA)?.label).toBe(CLOSED);
  });

  it("recognizes an explicitly consumed zero-valued timestamp without truthiness defaults", () => {
    expect(getRecordedParticipantChoice(fixture({ tokenAUsedAt: 0 }), true)).toBe("no");
  });

  it("retains explicit legacy true without requiring a timestamp", () => {
    expect(getCrmParticipantStatus(fixture({ status: "rejected", approvedByA: true }), true)?.label).toBe("בחר כן");
  });

  it("keeps yes/no choices for both respondents even after the pair returns to the pool", () => {
    const match = fixture({ status: "matched", returnedToPoolAt: 3000,
      approvedByA: true, approvedByB: true, tokenAUsedAt: 1000, tokenBUsedAt: 2000 });
    expect(getCrmParticipantStatus(match, true)?.label).toBe("בחר כן");
    expect(getCrmParticipantStatus(match, false)?.label).toBe("בחר כן");
    expect(getCrmParticipantStatus({ ...match, approvedByB: false }, false)?.label).toBe("בחר לא הפעם");
  });

  it("does not infer personal yes from pair-level lifecycle evidence", () => {
    const match = { ...fixture({ status: "matched" }), matchedAt: 1000, contactRevealedAt: 2000 };
    expect(getCrmParticipantStatus(match, true)?.label).toBe("לא תועדה תשובה אישית");
    expect(getCrmParticipantStatus(match, false)?.label).toBe("לא תועדה תשובה אישית");
  });

  it("distinguishes expiration, closure and active open-mail evidence", () => {
    expect(getCrmParticipantStatus(fixture({ status: "expired" }), true)?.label).toBe("לא נרשמה תשובה עד שפג תוקף ההצעה");
    expect(getCrmParticipantStatus(fixture({ status: "rejected" }), true)?.label).toBe(CLOSED);
    expect(getCrmParticipantStatus(fixture({ returnedToPoolAt: 1000 }), true)?.label).toBe(CLOSED);
    expect(getCrmParticipantStatus(fixture({ status: "expired", tokenBUsedAt: 1000 }), true)?.label).toBe(CLOSED);
    expect(getCrmParticipantStatus(fixture({ emailBOpenedAt: 1000 }), false)?.label).toBe("פתח מייל, טרם נרשמה תשובה");
    expect(getCrmParticipantStatus(fixture({ status: "pending" }), true)).toBeNull();
  });

  it("shows both declines when both sides actually answered no", () => {
    const match = fixture({ status: "rejected", tokenAUsedAt: 1000, tokenBUsedAt: 2000 });
    expect(getCrmParticipantStatus(match, true)?.label).toBe("בחר לא הפעם");
    expect(getCrmParticipantStatus(match, false)?.label).toBe("בחר לא הפעם");
  });
});

function mockedNotes(role: "admin" | "user" | "team" | null, options: {
  pending?: boolean; error?: boolean; empty?: boolean; notes?: string;
  teamMember?: boolean; authLoading?: boolean; authError?: boolean;
} = {}) {
  const query = vi.fn(({ id }: { id: number }) => ({
    data: { notes: options.empty ? "" : options.notes ?? `PRIVATE fixture note for ${id}\nsecond line` },
    isPending: !!options.pending, isError: !!options.error, refetch: vi.fn(),
  }));
  const mutate = vi.fn();
  const auth = vi.fn(() => ({
    user: role ? { role, ...(options.teamMember ? {
      id: 7, openId: "team_7", loginMethod: "team", isTeamMember: true,
    } : {}) } : null,
    loading: !!options.authLoading,
    error: options.authError ? new Error("Synthetic auth failure") : null,
  }));
  const mockTrpc = {
    useUtils: () => ({ matchmaking: { getAdminNotes: { invalidate: vi.fn() } } }),
    matchmaking: {
      getAdminNotes: { useQuery: query },
      updateAdminNotes: { useMutation: () => ({ mutate, isPending: false }) },
    },
  };
  // Compile ONLY the existing local component; do not import the page, router,
  // database, transport, auth provider, or any sending/provider implementation.
  const compiled = ts.transpileModule(notesSource, { compilerOptions: {
    jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const Component = new Function("useAuth", "useState", "trpc", "React", `${compiled}\nreturn AdminNotesField;`)(
    auth, useState, mockTrpc, React,
  ) as React.ComponentType<{ singleId: number }>;
  const render = (id: number) => renderToStaticMarkup(createElement(Component, { singleId: id }));
  return { render, query, mutate, auth };
}

describe("existing private notes component, isolated mocked rendering", () => {
  it("renders distinct existing notes for both profile IDs using the protected query", () => {
    const { render, query, mutate } = mockedNotes("admin");
    expect(render(101)).toContain("PRIVATE fixture note for 101\nsecond line");
    expect(render(202)).toContain("PRIVATE fixture note for 202\nsecond line");
    expect(query.mock.calls.map(call => call[0])).toEqual([{ id: 101 }, { id: 202 }]);
    for (const call of query.mock.calls) expect(call[1]).toMatchObject({ enabled: true, staleTime: 30_000 });
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each(["admin", "team"] as const)("allows a verified team session with UI role=%s", role => {
    // auth.me currently maps ctx.teamMember to role=admin. The team marker also
    // preserves staff access independently of that synthetic UI role mapping.
    const { render, query, mutate } = mockedNotes(role, { teamMember: true });
    expect(render(101)).toContain("PRIVATE fixture note for 101\nsecond line");
    expect(render(202)).toContain("PRIVATE fixture note for 202\nsecond line");
    expect(render(101)).toContain("ערוך");
    for (const call of query.mock.calls) expect(call[1]).toMatchObject({ enabled: true });
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each(["user", null] as const)("never renders cached private notes or enables a query for role=%s", role => {
    const { render, query, mutate } = mockedNotes(role);
    expect(render(101)).toBe("");
    expect(query.mock.calls[0][1]).toMatchObject({ enabled: false });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not treat a bare team role as authenticated staff without the server team marker", () => {
    const { render, query } = mockedNotes("team");
    expect(render(101)).toBe("");
    expect(query.mock.calls[0][1]).toMatchObject({ enabled: false });
  });

  it.each([
    { authLoading: true }, { authError: true },
  ])("hides cached notes while authentication is unresolved or failed: %j", authState => {
    for (const teamMember of [false, true]) {
      const { render, query, mutate } = mockedNotes("admin", { teamMember, ...authState });
      expect(render(101)).toBe("");
      expect(query.mock.calls[0][1]).toMatchObject({ enabled: false });
      expect(mutate).not.toHaveBeenCalled();
    }
  });

  it("hides cached team notes when the auth context becomes an ordinary user or anonymous", () => {
    const { render, query, auth } = mockedNotes("admin", { teamMember: true });
    expect(render(101)).toContain("PRIVATE fixture note for 101");
    auth.mockReturnValue({ user: { role: "user" }, loading: false, error: null });
    expect(render(101)).toBe("");
    auth.mockReturnValue({ user: null, loading: false, error: null });
    expect(render(101)).toBe("");
    expect(query.mock.calls.map(call => call[1]?.enabled)).toEqual([true, false, false]);
  });

  it("wraps a long synthetic note without widening narrow comparison columns", () => {
    const longNote = `${"synthetic-token-".repeat(40)}@example.invalid`;
    const html = mockedNotes("admin", { notes: longNote }).render(101);
    expect(html).toContain(longNote);
    expect(html).toContain("min-w-0 mt-3");
    expect(html).toContain("whitespace-pre-wrap break-words [overflow-wrap:anywhere]");
  });

  it("shows genuine empty notes only after a successful query", () => {
    expect(mockedNotes("admin", { empty: true }).render(101)).toContain("אין הערות עדיין");
  });

  it("shows loading rather than claiming notes are empty or allowing editing", () => {
    const html = mockedNotes("admin", { pending: true, empty: true }).render(101);
    expect(html).toContain("טוענת הערות פנימיות…");
    expect(html).not.toContain("אין הערות עדיין");
    expect(html).not.toContain("ערוך");
  });

  it("shows a retryable error rather than falsely empty notes or allowing editing", () => {
    const html = mockedNotes("admin", { error: true, empty: true }).render(101);
    expect(html).toContain("לא ניתן לטעון את ההערות הפנימיות כרגע.");
    expect(html).toContain("נסי שוב");
    expect(html).not.toContain("אין הערות עדיין");
    expect(html).not.toContain("ערוך");
  });
});

function procedure(name: string) {
  const start = router.search(new RegExp(`\\n    ${name}:\\s*(?:teamProcedure|publicProcedure|protectedProcedure|adminProcedure)`));
  if (start < 0) throw new Error(`Missing procedure ${name}`);
  const rest = router.slice(start + 1);
  const next = /\n    [A-Za-z_]\w*:\s*(?:teamProcedure|publicProcedure|protectedProcedure|adminProcedure)/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

describe("CRM comparison wiring and private-data source contracts", () => {
  it("uses one independent presenter for the collapsed row and expanded personal badges", () => {
    expect(crm).toContain("const statusA = getCrmParticipantStatus(match, true)");
    expect(crm).toContain("const statusB = getCrmParticipantStatus(match, false)");
    expect(crm).toContain("personStatus: statusA");
    expect(crm).toContain("personStatus: statusB");
    expect(crm).toContain("{s.personStatus.label}");
    expect(crm).not.toContain('label: "לא ענה"');
    expect(crm).not.toContain('label: "אישרו: התאמה!"');
    expect(crm).not.toMatch(/token[AB]UsedAt && match\.approvedBy[AB] !== true/);
  });

  it("covers every full side-by-side profile comparison with the existing private notes component", () => {
    const comparisons: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "MatchProfileCard"
        && node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === "comparison")) {
        comparisons.push(node.parent.getText(source));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(comparisons).toHaveLength(3); // advanced candidates, expanded matches, manual comparison
    for (const comparison of comparisons) expect(comparison).toContain("<InternalAdminNotes singleId=");
    expect(crm).toContain("const InternalAdminNotes = AdminNotesField;");
  });

  it("covers standalone and waiting-origin advanced candidates through the shared renderer, lazily per opened pair", () => {
    const advanced = crm.slice(crm.indexOf("const renderAdvancedSearch ="), crm.indexOf("// Photo Lightbox"));
    expect(advanced).toContain("[filterTargetProfile, single].map(profile");
    expect(advanced).toContain("expandedAdvancedComparisonIds.has(single.id) && <InternalAdminNotes singleId={profile.id} />");
    expect(advanced).toContain("onToggle={event =>");
    expect(advanced).toContain("const open = event.currentTarget.open;");
    expect(crm).toContain('activeTab === "filter_search" && renderAdvancedSearch(false)');
    expect(crm).toContain('data-advanced-workspace={embedded ? "waiting" : "standalone"}');
    expect(crm).toContain("setExpandedAdvancedComparisonIds(new Set());");
  });

  it("keeps private notes outside reusable profile props and public responses", () => {
    expect(profileCard).not.toMatch(/getAdminNotes|adminNotes|InternalAdminNotes/);
    const getNotes = procedure("getAdminNotes");
    expect(getNotes).toContain("getAdminNotes: teamProcedure");
    expect(getNotes).toContain('ctx.user.role !== "admin"');
    expect(getNotes).toContain('code: "FORBIDDEN"');
    const publicDetails = procedure("getMatchDetails");
    expect(publicDetails).toContain("getMatchDetails: publicProcedure");
    const projection = publicDetails.slice(publicDetails.indexOf("return {"));
    expect(projection).not.toMatch(/adminNotes|InternalAdminNotes|\.\.\.partner|\.\.\.me/);
    expect(notesSource).not.toMatch(/approveMatch|createAndSendMatch|sendEmail|sendSms|\bfetch\(/);
    const notesEnd = crm.indexOf("const InternalAdminNotes = AdminNotesField;");
    const pageBody = crm.slice(notesEnd);
    expect(pageBody).not.toMatch(/adminNotes:|getAdminNotes\.useQuery/);
  });
});
