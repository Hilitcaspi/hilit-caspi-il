import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const dnaQuiz = readFileSync(resolve(root, "client/src/pages/DnaQuiz.tsx"), "utf8");

const usRouter = app.slice(app.indexOf("function UsRouter()"), app.indexOf("function HeRouter()"));
const heRouter = app.slice(app.indexOf("function HeRouter()"), app.indexOf("function Router()"));

describe("DNA route aliases", () => {
  it("serves the Hebrew DNA quiz from both /dna and /dna-quiz", () => {
    expect(heRouter).toContain('<Route path={"/dna"} component={DnaQuiz} />');
    expect(heRouter).toContain('<Route path={"/dna-quiz"} component={DnaQuiz} />');
  });

  it("keeps /dna on the US domain mapped to the English quiz", () => {
    expect(usRouter).toContain('<Route path={"/dna"} component={EnDnaQuiz} />');
  });

  it("reads query parameters directly so the alias preserves UTM and return-flow values", () => {
    expect(dnaQuiz).toContain("useSearch()");
    expect(dnaQuiz).toContain('urlParams.get("utm_source")');
    expect(dnaQuiz).toContain('urlParams.get("utm_campaign")');
    expect(dnaQuiz).toContain('urlParams.get("return_to")');
  });
});
