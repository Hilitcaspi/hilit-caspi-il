import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizeInvalidFields } from "../client/src/lib/formValidationSummary";

const field = (type: string, label: string | null, validity: Record<string, boolean>, extra: Record<string, unknown> = {}) => ({
  type, validity,
  parentElement: { querySelector: () => (label === null ? null : { textContent: label }) },
  ...extra,
});

describe("registration form missing-field summary", () => {
  it("lists friendly labels and hints, never the typed values", () => {
    const summary = summarizeInvalidFields([
      field("text", "שם משפחה *", { valueMissing: true }, { value: "secret-value" }),
      field("date", "תאריך לידה *", { rangeOverflow: true }),
      field("email", "אימייל *", { typeMismatch: true }, { value: "not-an-email" }),
      field("checkbox", null, { valueMissing: true }, { dataset: { fieldLabel: "אישור השתתפות בשירות ההתאמות" } }),
    ]);
    expect(summary).toEqual([
      { label: "שם משפחה", hint: "חסר" },
      { label: "תאריך לידה", hint: "ההצטרפות מגיל 18" },
      { label: "אימייל", hint: "כתובת המייל לא תקינה" },
      { label: "אישור השתתפות בשירות ההתאמות", hint: "צריך לסמן" },
    ]);
    expect(JSON.stringify(summary)).not.toContain("secret-value");
    expect(JSON.stringify(summary)).not.toContain("not-an-email");
  });

  it("dedupes by label, explains ranges and caps the list", () => {
    const many = Array.from({ length: 10 }, (_, i) => field("number", `שדה ${i}`, { rangeUnderflow: true }, { min: "18", max: "80" }));
    const summary = summarizeInvalidFields([...many, many[0]]);
    expect(summary).toHaveLength(6);
    expect(summary[0]).toEqual({ label: "שדה 0", hint: "צריך להיות בין 18 ל־80" });
  });

  it("keeps the form blocked but always shows the summary and jumps to the field", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Register.tsx"), "utf8");
    expect(source).toContain("noValidate");
    expect(source).toContain("if (!form.checkValidity())");
    expect(source).toContain("setProfileIssues(summarizeInvalidFields(");
    expect(source).toContain("להשלמה עכשיו");
    expect(source).toContain('role="alert"');
    expect(source).toContain('trackCheckoutStage("database", "profile_invalid"');
  });
});
