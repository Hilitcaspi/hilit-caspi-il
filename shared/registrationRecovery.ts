import { normalizeIsraeliPhone } from "./profileValidation";

export type RecoveryLead = {
  email: string;
  phone: string;
  gender: "female" | "male";
  dnaType: "leader" | "romantic" | "free_spirit" | "anchor";
};

export type SavedPaymentDraft = {
  firstName: string;
  lastName?: string;
  gender: "female" | "male";
  age: number;
  city: string;
  email: string;
  phone: string;
  [key: string]: unknown;
};

/** A browser backup can be used only for this same verified DNA lead. */
export function readRecoverablePaymentDraft(raw: string | null, lead: RecoveryLead): SavedPaymentDraft | null {
  if (!raw || raw.length > 5_000_000) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (typeof value.firstName !== "string" || !value.firstName.trim()) return null;
    if (typeof value.city !== "string" || !value.city.trim()) return null;
    if (!Number.isInteger(value.age) || value.age < 18 || value.age > 80) return null;
    if (value.gender !== "female" && value.gender !== "male") return null;
    if (typeof value.email !== "string" || value.email.trim().toLowerCase() !== lead.email.trim().toLowerCase()) return null;
    if (typeof value.phone !== "string") return null;
    const savedPhone = normalizeIsraeliPhone(value.phone);
    // A customer may have corrected the phone on the join form after DNA capture.
    // Keep the validated value she entered instead of silently reverting it.
    if (!savedPhone) return null;
    return value as SavedPaymentDraft;
  } catch {
    return null;
  }
}
