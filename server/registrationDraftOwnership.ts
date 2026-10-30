export const REGISTRATION_DRAFT_TOKEN_RE = /^[a-f0-9]{64}$/i;
export const DNA_SESSION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExistingRegistrationProfile = {
  id: number;
  email?: string | null;
  questionnaireToken?: string | null;
};

type VerifiedDnaSession = {
  sessionId?: string | null;
  singleId?: number | null;
} | null | undefined;

export type RegistrationDraftOwnershipInput = {
  existingProfile: ExistingRegistrationProfile;
  normalizedEmail: string;
  draftToken?: string | null;
  hasVerifiedFreeToken: boolean;
  dnaSessionId?: string | null;
  verifiedDnaSession?: VerifiedDnaSession;
};

export type RegistrationDraftOwnership =
  | { authorized: true; proof: "draft_token" | "free_token" | "dna_session" }
  | { authorized: false; proof: null };

function normalizedEmailMatches(storedEmail: string | null | undefined, normalizedEmail: string): boolean {
  return Boolean(storedEmail && storedEmail.trim().toLowerCase() === normalizedEmail.trim().toLowerCase());
}

/**
 * Existing registration records are mutable only with an unguessable draft token,
 * a free-access token that was verified for the record's email, or a DNA UUID that
 * is already linked to that exact record and email. Email and phone are lookup keys,
 * never ownership proofs.
 */
export function resolveRegistrationDraftOwnership(input: RegistrationDraftOwnershipInput): RegistrationDraftOwnership {
  const hasMatchingDraftToken = Boolean(
    input.draftToken
    && REGISTRATION_DRAFT_TOKEN_RE.test(input.draftToken)
    && input.existingProfile.questionnaireToken === input.draftToken,
  );
  if (hasMatchingDraftToken) return { authorized: true, proof: "draft_token" };

  const emailMatches = normalizedEmailMatches(input.existingProfile.email, input.normalizedEmail);
  if (input.hasVerifiedFreeToken && emailMatches) {
    return { authorized: true, proof: "free_token" };
  }

  const dnaSessionMatches = Boolean(
    input.dnaSessionId
    && DNA_SESSION_UUID_RE.test(input.dnaSessionId)
    && input.verifiedDnaSession?.sessionId === input.dnaSessionId
    && input.verifiedDnaSession.singleId === input.existingProfile.id
    && emailMatches,
  );
  if (dnaSessionMatches) return { authorized: true, proof: "dna_session" };

  return { authorized: false, proof: null };
}
