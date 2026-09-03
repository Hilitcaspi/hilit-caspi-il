export const PARTICIPANT_OUTCOME_STATUSES = [
  "not_contacted",
  "talking",
  "date_scheduled",
  "met",
  "continuing",
  "ended",
  "relationship",
] as const;

export const PUBLICITY_SCOPES = [
  "none",
  "anonymous",
  "first_name",
  "full_name",
  "photo",
] as const;

export type ParticipantOutcomeStatus = typeof PARTICIPANT_OUTCOME_STATUSES[number];
export type PublicityScope = typeof PUBLICITY_SCOPES[number];

export type MatchParticipantFeedback = {
  status: ParticipantOutcomeStatus;
  rating?: number | null;
  comment?: string | null;
  testimonialText?: string | null;
  publicityScope: PublicityScope;
  consentToFollowUp: boolean;
  consentConfirmed: boolean;
  consentTextVersion?: string | null;
  consentAt?: number | null;
  submittedAt: number;
  source: "participant_portal" | "admin";
};

export type MatchFeedbackRequest = {
  requestedAt: number;
  requestedBy: "team" | "system";
  channel: "email";
  mode: "manual" | "automatic";
};

export type MatchOutcomeRecord = {
  version: 1;
  legacyNote?: string | null;
  participantA?: MatchParticipantFeedback | null;
  participantB?: MatchParticipantFeedback | null;
  feedbackRequestA?: MatchFeedbackRequest | null;
  feedbackRequestB?: MatchFeedbackRequest | null;
  adminNote?: string | null;
  adminVerifiedAt?: number | null;
  updatedAt: number;
};

export function parseMatchOutcomeNotes(raw: string | null | undefined): MatchOutcomeRecord {
  const now = Date.now();
  if (!raw) return { version: 1, updatedAt: now };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) {
      return {
        version: 1,
        legacyNote: parsed.legacyNote || null,
        participantA: parsed.participantA || null,
        participantB: parsed.participantB || null,
        feedbackRequestA: parsed.feedbackRequestA || null,
        feedbackRequestB: parsed.feedbackRequestB || null,
        adminNote: parsed.adminNote || null,
        adminVerifiedAt: parsed.adminVerifiedAt || null,
        updatedAt: Number(parsed.updatedAt) || now,
      };
    }
  } catch {
    // Existing free-text notes are preserved below.
  }

  return { version: 1, legacyNote: raw, updatedAt: now };
}

export function serializeMatchOutcomeNotes(record: MatchOutcomeRecord): string {
  return JSON.stringify({ ...record, version: 1, updatedAt: Date.now() });
}

export function setParticipantFeedback(
  raw: string | null | undefined,
  side: "A" | "B",
  feedback: MatchParticipantFeedback,
): string {
  const current = parseMatchOutcomeNotes(raw);
  if (side === "A") current.participantA = feedback;
  else current.participantB = feedback;
  return serializeMatchOutcomeNotes(current);
}

export function setFeedbackRequest(
  raw: string | null | undefined,
  side: "A" | "B",
  request: MatchFeedbackRequest,
): string {
  const current = parseMatchOutcomeNotes(raw);
  if (side === "A") current.feedbackRequestA = request;
  else current.feedbackRequestB = request;
  return serializeMatchOutcomeNotes(current);
}

export function setAdminOutcome(
  raw: string | null | undefined,
  adminNote: string | null | undefined,
  verified: boolean,
): string {
  const current = parseMatchOutcomeNotes(raw);
  current.adminNote = adminNote?.trim() || null;
  current.adminVerifiedAt = verified ? Date.now() : null;
  return serializeMatchOutcomeNotes(current);
}

export function setLegacyMatchNote(raw: string | null | undefined, note: string): string {
  const current = parseMatchOutcomeNotes(raw);
  current.legacyNote = note;
  return serializeMatchOutcomeNotes(current);
}

export function mapParticipantStatusToDetailStatus(
  participantA?: MatchParticipantFeedback | null,
  participantB?: MatchParticipantFeedback | null,
): "talking" | "dating" | "met" | "together" | "ended" | null {
  const statuses = [participantA?.status, participantB?.status].filter(Boolean);
  if (statuses.length === 0) return null;
  if (statuses.every(status => status === "relationship")) return "together";
  if (statuses.includes("continuing")) return "dating";
  if (statuses.includes("met")) return "met";
  if (statuses.includes("date_scheduled") || statuses.includes("talking")) return "talking";
  if (statuses.every(status => status === "ended" || status === "not_contacted")) return "ended";
  return null;
}
