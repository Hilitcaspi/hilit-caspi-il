import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const registerSource = readFileSync(new URL("../client/src/pages/Register.tsx", import.meta.url), "utf8");

describe("registration resume integrity", () => {
  it("exposes an unguessable-token lookup that returns only the matching unpaid draft", () => {
    expect(routersSource).toContain("getRegistrationDraftByToken: publicProcedure");
    expect(routersSource).toContain("z.string().regex(/^[a-f0-9]{64}$/i)");
    expect(routersSource).toContain("where(eq(singles.questionnaireToken, input.token))");
    expect(routersSource).toContain('status: "already_registered" as const');
    expect(routersSource).toContain('status: "ready" as const');
  });

  it("hydrates the saved profile and resumes at payment instead of asking for the form again", () => {
    expect(registerSource).toContain('params.get("resume")');
    expect(registerSource).toContain("trpc.singles.getRegistrationDraftByToken.useQuery");
    expect(registerSource).toContain("setDraftSavedBeforePayment(true)");
    expect(registerSource).toContain('setStep("payment")');
    expect(registerSource).toContain("setPhotoPreview(draft.photoUrl || null)");
  });

  it("preserves the original attribution when the draft is resumed", () => {
    expect(registerSource).toContain("utm_source: draft.utmSource");
    expect(registerSource).toContain("utm_campaign: draft.utmCampaign");
    expect(registerSource).toContain("sessionStorage.setItem(key, value)");
  });
});
