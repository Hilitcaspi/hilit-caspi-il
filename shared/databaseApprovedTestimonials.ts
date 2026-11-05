import { NOVEMBER_APPROVED_TESTIMONIALS } from "./novemberApprovedTestimonials";

/**
 * Existing owner-approved November quotes are reused verbatim.
 * The additional experience quote was supplied for website publication by the
 * owner on 5 November 2026; no name, photograph or relationship outcome supplied.
 * Only spelling and punctuation are lightly normalized, preserving the meaning.
 * Empty displayName must render as "בעילום שם", never an invented identity.
 */
export const DATABASE_APPROVED_TESTIMONIALS = [
  ...NOVEMBER_APPROVED_TESTIMONIALS,
  {
    id: "database-experience-20261105",
    displayName: "",
    topic: "על ההיכרות הראשונה",
    text: "אתמול בערב נפגשנו. תודה רבה על ההיכרות. אין ספק שההיכרות בדרך הזו הרבה יותר נעימה ומוצלחת מהאפליקציות 😎🍷. סופ״ש נעים.",
  },
] as const;
