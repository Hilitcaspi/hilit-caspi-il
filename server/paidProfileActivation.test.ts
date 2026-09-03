import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("paid profile activation", () => {
  const registrationProcedure = routerSource.slice(
    routerSource.indexOf("registerBasicProfile: publicProcedure"),
    routerSource.indexOf("getByQuestionnaireToken: publicProcedure"),
  );

  it("loads payment state when updating a Grow-created skeleton", () => {
    expect(registrationProcedure).toContain("isPaid: singles.isPaid");
    expect(registrationProcedure).toContain("isActive: singles.isActive");
  });

  it("preserves paid state after Grow while allowing a validated free token to activate an unpaid draft", () => {
    expect(registrationProcedure).toContain("isActive: input.freeToken ? true : (existingProfile.isPaid || existingProfile.isActive)");
    expect(registrationProcedure).toContain("isPaid: input.freeToken ? true : existingProfile.isPaid");
    expect(registrationProcedure).toContain("if (input.deferUntilPayment && existingProfile.isPaid)");
  });
});
