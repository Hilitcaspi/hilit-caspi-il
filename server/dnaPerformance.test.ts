import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }));
vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    analytics: { track: { useMutation: () => ({ isPending: false, ...mocks }) } },
    dnaQuiz: { submit: { useMutation: () => ({ isPending: false, ...mocks }) } },
    crm: { createLead: { useMutation: () => ({ isPending: false, ...mocks }) } },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/dna-quiz", vi.fn()], useSearch: () => "" }));
vi.mock("../client/src/lib/metaPixel", () => ({ trackLead: vi.fn() }));
vi.mock("../client/src/lib/ga", () => ({ gaGenerateLead: vi.fn(), gaQuizComplete: vi.fn() }));
vi.mock("../client/src/lib/acquisitionTracking", () => ({
  getFirstTouchAcquisition: () => null, getLastUtmAcquisition: () => null,
}));
import DnaQuiz from "../client/src/pages/DnaQuiz";

const source = readFileSync(new URL("../client/src/pages/DnaQuiz.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

describe("DNA landing critical rendering (all integrations mocked)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("crypto", { randomUUID: () => "mock-dna-session" });
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders approved hero copy and both quiz start buttons without a hidden entrance", () => {
    const html = renderToStaticMarkup(React.createElement(DnaQuiz));
    expect(html).toContain("3 דקות כדי להתחיל להבין");
    expect(html).toContain("איזה דפוס זוגי מוביל אותך");
    expect(html).toContain('data-testid="dna-gender-female"');
    expect(html).toContain('data-testid="dna-gender-male"');
    expect(html).not.toContain("opacity:0");
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("uses the same approved portrait as a dimensioned, eager, asynchronously decoded storage asset", () => {
    const html = renderToStaticMarkup(React.createElement(DnaQuiz));
    const img = html.match(/<img[^>]+alt="הילית כספי"[^>]*>/)?.[0];
    expect(img).toBeDefined();
    expect(img).toContain('src="/manus-storage/hilit-dna-profile-240_2633cb2b.webp"');
    expect(img).toContain('width="80"');
    expect(img).toContain('height="80"');
    expect(img).toContain('loading="eager"');
    expect(img).toContain('decoding="async"');
    expect(img).toContain("object-[center_20%]");
  });

  it("retains all 20 approved statements for each gender and the existing lead/acquisition hooks", () => {
    const approvedHashes: Record<string, string> = {
      FEMALE: "d90ad42cfd05f5ada6088c6557b92d710431babd9a23dc01b7354a9c90e46368",
      MALE: "3b3a8b1d4087da768a9eb508cb0e953a2fc5d207dad4d5614fbdc2fb5ad54341",
    };
    for (const gender of ["FEMALE", "MALE"]) {
      const statements = source.split(`const STATEMENTS_${gender}: string[] = [`)[1]?.split("\n];")[0];
      const lines = statements?.split("\n").filter(line => /^\s*"/.test(line)) ?? [];
      expect(lines).toHaveLength(20);
      expect(createHash("sha256").update(lines.join("\n")).digest("hex")).toBe(approvedHashes[gender]);
    }
    expect(source).toContain("getFirstTouchAcquisition()");
    expect(source).toContain("getLastUtmAcquisition()");
    expect(source).toContain("await createLeadMutation.mutateAsync({");
    expect(source).toContain("submitMutation.mutate({");
    expect(source).toContain('trackLead({ content_name: "שאלון DNA - תוצאות" });');
    expect(source).toContain("buildNovemberDnaResultHref(novemberContext)");
  });
});

describe("DNA critical route regression", () => {
  it("keeps Home lazy rather than pulling its dependencies into the DNA entry", () => {
    expect(appSource).not.toMatch(/import\s+Home\s+from/);
    expect(appSource).toMatch(/const Home = lazy\(\(\) => import\("@\/pages\/Home"\)\)/);
  });

  it("preserves both DNA aliases and one eagerly available DNA component", () => {
    expect(appSource).toContain('import DnaQuiz from "@/pages/DnaQuiz"');
    expect(appSource).toContain('<Route path={"/dna"} component={DnaQuiz} />');
    expect(appSource).toContain('<Route path={"/dna-quiz"} component={DnaQuiz} />');
  });
});
