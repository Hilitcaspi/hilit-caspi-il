import { parseMatchOutcomeNotes, type PublicityScope } from "./matchOutcome";

const POSITIVE_PUBLIC_STATUSES = new Set(["continuing", "relationship"]);

export type TestimonialCandidate = {
  matchId: number;
  singleAId: number;
  singleBId: number;
  notes: string | null;
};

export type TestimonialPerson = {
  id: number;
  firstName: string;
  lastName?: string | null;
  photoUrl?: string | null;
};

export type ApprovedTestimonialSeed = {
  id: string;
  personId: number;
  text: string;
  publicityScope: Exclude<PublicityScope, "none">;
  submittedAt: number;
};

export type ApprovedPublicTestimonial = {
  id: string;
  text: string;
  displayName: string;
  photoUrl: string | null;
  submittedAt: number;
};

export function extractApprovedTestimonialSeeds(candidate: TestimonialCandidate): ApprovedTestimonialSeed[] {
  const outcome = parseMatchOutcomeNotes(candidate.notes);
  if (!outcome.adminVerifiedAt) return [];

  return ([
    { side: "A", personId: candidate.singleAId, feedback: outcome.participantA },
    { side: "B", personId: candidate.singleBId, feedback: outcome.participantB },
  ] as const).flatMap(({ side, personId, feedback }) => {
    const text = feedback?.testimonialText?.trim();
    if (
      !feedback ||
      !text ||
      !feedback.consentConfirmed ||
      !feedback.consentAt ||
      feedback.publicityScope === "none" ||
      !POSITIVE_PUBLIC_STATUSES.has(feedback.status)
    ) {
      return [];
    }

    return [{
      id: `${candidate.matchId}-${side}`,
      personId,
      text,
      publicityScope: feedback.publicityScope,
      submittedAt: feedback.submittedAt,
    }];
  });
}

export function hydrateApprovedTestimonials(
  seeds: ApprovedTestimonialSeed[],
  people: Map<number, TestimonialPerson>,
): ApprovedPublicTestimonial[] {
  return seeds.flatMap(seed => {
    const person = people.get(seed.personId);
    if (!person) return [];

    const fullName = `${person.firstName} ${person.lastName || ""}`.trim();
    const displayName = seed.publicityScope === "anonymous"
      ? "חבר/ת המאגר"
      : seed.publicityScope === "first_name"
        ? person.firstName
        : fullName;

    return [{
      id: seed.id,
      text: seed.text,
      displayName,
      photoUrl: seed.publicityScope === "photo" ? person.photoUrl || null : null,
      submittedAt: seed.submittedAt,
    }];
  });
}
