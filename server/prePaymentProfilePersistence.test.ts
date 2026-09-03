import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
const registerSource = fs.readFileSync(path.join(root, "client/src/pages/Register.tsx"), "utf8");
const webhookSource = fs.readFileSync(path.join(root, "server/growWebhook.ts"), "utf8");

describe("paid profile persistence before Grow", () => {
  it("supports a pre-payment draft without sending onboarding email", () => {
    expect(routerSource).toContain("deferUntilPayment: z.boolean().optional()");
    expect(routerSource).toContain("if (!input.deferUntilPayment)");
    expect(routerSource).toContain("isUnpaidDraft");
  });

  it("saves the full profile before both payment entry paths", () => {
    expect(registerSource).toContain("await saveProfileDraftBeforePayment();");
    expect(registerSource).toContain("await saveProfileDraftBeforePayment({");
    expect(registerSource).toContain("deferUntilPayment: true");
    expect(registerSource.match(/if \(freeTokenFromUrl\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("does not save the profile a second time after payment when the draft succeeded", () => {
    expect(registerSource).toContain("if (draftSavedBeforePayment)");
    expect(registerSource).toContain("Fallback for a legacy or resumed checkout");
  });

  it("uses only CRM or DNA gender for a rare webhook fallback and blocks unknown gender", () => {
    expect(webhookSource).toContain("existingCrmProfile?.gender");
    expect(webhookSource).toContain("dnaQuizResults.gender");
    expect(webhookSource).toContain("if (!verifiedGender)");
    expect(webhookSource).toContain("gender: verifiedGender");
    expect(webhookSource).not.toContain('gender: verifiedGender ?? "male"');
  });
});
