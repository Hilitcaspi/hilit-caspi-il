/**
 * Friendly, value-free summary of invalid form fields for the registration
 * form. Only the page's own field labels and constraint hints are used; the
 * user's input is never read into the summary or analytics.
 */
export interface InvalidFieldSummary {
  label: string;
  hint: string;
}

interface ValidityLike {
  valueMissing?: boolean;
  typeMismatch?: boolean;
  patternMismatch?: boolean;
  rangeUnderflow?: boolean;
  rangeOverflow?: boolean;
  tooShort?: boolean;
  customError?: boolean;
}

export interface InvalidFieldLike {
  type?: string;
  min?: string;
  max?: string;
  validity?: ValidityLike;
  validationMessage?: string;
  dataset?: Record<string, string | undefined>;
  closest?: (selector: string) => { textContent?: string | null } | null;
  parentElement?: { querySelector?: (selector: string) => { textContent?: string | null } | null } | null;
}

function cleanLabel(text: string | null | undefined): string {
  return String(text || "").replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function fieldLabel(el: InvalidFieldLike): string {
  const explicit = cleanLabel(el.dataset?.fieldLabel);
  if (explicit) return explicit;
  if (el.type !== "checkbox") {
    const sibling = cleanLabel(el.parentElement?.querySelector?.("label")?.textContent);
    if (sibling) return sibling;
  }
  return "שדה חובה";
}

function fieldHint(el: InvalidFieldLike): string {
  const v = el.validity || {};
  if (v.valueMissing) return el.type === "checkbox" ? "צריך לסמן" : "חסר";
  if (el.type === "date" && v.rangeOverflow) return "ההצטרפות מגיל 18";
  if (el.type === "date" && v.rangeUnderflow) return "כדאי לבדוק את שנת הלידה";
  if ((v.rangeUnderflow || v.rangeOverflow) && el.min && el.max) return `צריך להיות בין ${el.min} ל־${el.max}`;
  if (el.type === "email" && v.typeMismatch) return "כתובת המייל לא תקינה";
  if (el.type === "tel") return "יש להזין מספר טלפון ישראלי מלא";
  if (v.customError && el.validationMessage) return el.validationMessage.slice(0, 80);
  return "צריך לתקן";
}

export function summarizeInvalidField(el: InvalidFieldLike): InvalidFieldSummary {
  return { label: fieldLabel(el), hint: fieldHint(el) };
}

/** Unique by label, in form order, capped so the banner stays short. */
export function summarizeInvalidFields(fields: ArrayLike<InvalidFieldLike>, max = 6): InvalidFieldSummary[] {
  const out: InvalidFieldSummary[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const item = summarizeInvalidField(field);
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}
