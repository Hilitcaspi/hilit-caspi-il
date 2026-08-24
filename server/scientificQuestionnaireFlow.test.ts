import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/ScientificQuestionnaire.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("scientific questionnaire save recovery", () => {
  it("keeps saved answers until the server confirms success", () => {
    const successBlock = source.slice(source.indexOf("onSuccess: () =>"), source.indexOf("onError: (err) =>"));
    const submitBlock = source.slice(source.indexOf("const handleNext"), source.indexOf("const handleBack"));
    expect(successBlock).toContain("localStorage.removeItem(storageKey)");
    expect(submitBlock).not.toContain("localStorage.removeItem(storageKey)");
  });

  it("returns age errors to the details step instead of the final quiz question", () => {
    expect(source).toContain('setErrorRetryStep("details")');
    expect(source).toContain("setStep(errorRetryStep)");
  });

  it("accepts retry payloads from an already-open older form and sanitizes optional ranges on the server", () => {
    const procedure = routerSource.slice(
      routerSource.indexOf("completeQuestionnaire: publicProcedure"),
      routerSource.indexOf("saveDnaResults: publicProcedure"),
    );
    expect(procedure).toContain("age: z.number().finite().optional()");
    expect(procedure).toContain("const resolvedAge = ageFromBirthDate ?? input.age");
    expect(procedure).toContain("input.minAgePreference >= 18 && input.minAgePreference <= 120");
    expect(procedure).toContain("input.maxHeightPreference >= 100 && input.maxHeightPreference <= 250");
  });
});
