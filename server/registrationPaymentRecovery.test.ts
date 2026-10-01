import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readRecoverablePaymentDraft } from "../shared/registrationRecovery";

const lead = {
  email: "person@example.test",
  phone: "0501234567",
  gender: "female" as const,
  dnaType: "anchor" as const,
};
const localDraft = {
  firstName: "בדיקה",
  gender: "female",
  age: 32,
  city: "תל אביב",
  email: "Person@Example.Test ",
  phone: "050-1234567",
  birthDate: "1994-01-02",
  dnaType: "anchor",
  partnerDescription: "Synthetic data",
};

describe("DNA payment recovery", () => {
  it("accepts a complete browser draft for the same verified lead", () => {
    const draft = readRecoverablePaymentDraft(JSON.stringify(localDraft), lead);
    expect(draft).toMatchObject({ firstName: "בדיקה", partnerDescription: "Synthetic data" });
  });

  it("refuses another person's saved draft or a missing answer", () => {
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, email: "other@example.test" }), lead)).toBeNull();
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, phone: "0507654321" }), lead)?.phone).toBe("0507654321");
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, phone: "123" }), lead)).toBeNull();
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, city: "" }), lead)).toBeNull();
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, age: 17 }), lead)).toBeNull();
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, gender: "male" }), lead)?.gender).toBe("male");
    expect(readRecoverablePaymentDraft(JSON.stringify({ ...localDraft, gender: "unknown" }), lead)).toBeNull();
    expect(readRecoverablePaymentDraft("not-json", lead)).toBeNull();
    expect(readRecoverablePaymentDraft(null, lead)).toBeNull();
  });

  it("checks paid Grow transactions before offering a repeat checkout", () => {
    const server = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const start = server.indexOf("getRegistrationRecoveryBySession: publicProcedure");
    const end = server.indexOf("getByQuestionnaireToken: publicProcedure", start);
    const recovery = server.slice(start, end);
    expect(recovery).toContain("eq(completedPayments.product, \"database\")");
    expect(recovery).toContain('status: "already_paid"');
    expect(recovery).toContain('status: "recover_local"');
    expect(recovery).toContain('status: "resume"');
    const client = readFileSync(new URL("../client/src/pages/RegistrationPaymentRecovery.tsx", import.meta.url), "utf8");
    expect(client).toContain("readRecoverablePaymentDraft(saved, recovery.lead)");
    expect(client).toContain("deferUntilPayment: true");
    expect(client).toContain("רק לאחר שהפרופיל יישמר ייפתח התשלום");
    expect(client).toContain('sessionStorage.setItem("registration_recovery_prefill"');
    expect(client).not.toContain('encodeURIComponent(lead.email)');
    const register = readFileSync(new URL("../client/src/pages/Register.tsx", import.meta.url), "utf8");
    expect(register).toContain('sessionStorage.getItem("registration_recovery_prefill")');
    expect(register).toContain('localStorage.setItem("pending_profile_payload", JSON.stringify(buildRegisterPayload()))');
  });
});
