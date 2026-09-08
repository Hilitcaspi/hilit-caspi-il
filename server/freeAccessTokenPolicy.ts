export type FreeAccessTokenState = {
  usedAt?: number | null;
  usedByEmail?: string | null;
  expiresAt: number;
  boundEmail?: string | null;
};

export type FreeAccessTokenValidation =
  | { valid: true }
  | { valid: false; reason: "not_found" | "already_used" | "expired" | "email_mismatch" };

export function normalizeFreeAccessToken(token: string) {
  return token.trim().toLowerCase();
}

export function validateFreeAccessTokenState(
  row: FreeAccessTokenState | null | undefined,
  email?: string,
  now = Date.now(),
  allowUsedBySameEmail = false,
): FreeAccessTokenValidation {
  if (!row) return { valid: false, reason: "not_found" };
  if (row.usedAt) {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedUsedByEmail = row.usedByEmail?.trim().toLowerCase();
    if (!allowUsedBySameEmail || !normalizedEmail || normalizedUsedByEmail !== normalizedEmail) {
      return { valid: false, reason: "already_used" };
    }
  }
  if (now > row.expiresAt) return { valid: false, reason: "expired" };
  if (row.boundEmail && email && row.boundEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return { valid: false, reason: "email_mismatch" };
  }
  return { valid: true };
}
