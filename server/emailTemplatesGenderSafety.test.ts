import { describe, expect, it } from "vitest";
import {
  buildContactRevealEmail,
  buildMatchFollowUpEmail,
  buildMatchProposalEmail,
  EMAIL_SEQUENCES,
  renderTemplate,
  type EmailTemplate,
  type JourneyKey,
} from "./emailTemplates";

const renderVars = {
  firstName: "בדיקה",
  guideLink: "https://example.test/guide",
  courseLink: "https://example.test/course",
  dnaTypeLabel: "הרוח החופשית",
  dnaTypeSubtitle: "ספונטניות, חיות, אנרגיה",
  dnaTypeSuperpower: "יכולת נדירה להביא לקשר חיות, עומק ורצון אמיתי לחיבור.",
  dnaTypeChallenge: "לפעמים קשה לזהות דפוסים שחוזרים על עצמם בקשרים.",
  dnaTypeMatch: "התאמה עם תקשורת פתוחה, יציבות וקרבה.",
};

/** Recipient-visible text only: strip markup and URLs before language assertions. */
function recipientCopy(value: string): string {
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/https?:\/\/[^\s"'<>]+/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function visibleParts(template: EmailTemplate): string[] {
  const rendered = renderTemplate(template, renderVars);
  return [rendered.subject, rendered.textBody, rendered.htmlBody].map(recipientCopy);
}

function visibleJourneyCopy(journey: JourneyKey): string {
  return EMAIL_SEQUENCES[journey]
    .flatMap(visibleParts)
    .join("\n");
}

const sharedJourneys = [
  "meta_lead_dna",
  "free_guide_nurture",
  "sales_call_lead",
  "abandoned_guide",
  "abandoned_database",
  "abandoned_course",
  "abandoned_coaching",
  "abandoned_session",
] as const satisfies readonly JourneyKey[];

const womenJourneys = [
  "women_first_step",
  "women_first_step_v2",
  "women_guide",
  "women_matchmaking",
  "women_matchmaking_welcome",
  "women_transformation",
  "women_course",
] as const satisfies readonly JourneyKey[];

const menJourneys = [
  "men_first_step",
  "men_first_step_v2",
  "men_guide",
  "men_matchmaking",
  "men_matchmaking_welcome",
  "men_transformation",
  "men_course",
] as const satisfies readonly JourneyKey[];

// These forms address a recipient directly. Third-party stories and Hilit's first-person
// narration are deliberately outside this focused guard.
const sharedGenderedAddress = /(?:^|[^\p{L}])(?:אתה|אתם|תוכל|תסיים|שתסיים|שלחי)(?=$|[^\p{L}])|(?:[א-ת]+)\/(?:[א-ת]+)/u;
const masculineDirectAddress = /(?:^|[^\p{L}])(?:אתה|אליך|תצטרף|תוכל|תדע|מוזמן|תקבל|הצטרף לקבוצה|כתוב לי בוואטסאפ|שלח לי וואטסאפ|לחץ על|קרא את|ענה למייל|עשה את המודול|היה ספציפי|ספר לי)(?=$|[^\p{L}])/u;
const feminineDirectAddress = /(?:^|[^\p{L}])(?:אלייך|תצטרפי|תוכלי|תדעי|מוזמנת|תקבלי|הצטרפי לקבוצה|כתבי לי בוואטסאפ|שלחי לי וואטסאפ|לחצי על|קראי את|עני למייל|עשי את המודול|תהיי ספציפית|ספרי לי)(?=$|[^\p{L}])/u;

describe("Hebrew email template gender safety", () => {
  it("keeps every rendered shared message neutral in subject, text, and visible HTML", () => {
    for (const journey of sharedJourneys) {
      const copy = visibleJourneyCopy(journey);
      expect(copy, journey).not.toMatch(sharedGenderedAddress);
    }
  });

  it("does not use direct masculine imperatives in women journeys", () => {
    for (const journey of womenJourneys) {
      expect(visibleJourneyCopy(journey), journey).not.toMatch(masculineDirectAddress);
    }
  });

  it("does not use direct feminine imperatives in men journeys", () => {
    for (const journey of menJourneys) {
      expect(visibleJourneyCopy(journey), journey).not.toMatch(feminineDirectAddress);
    }
  });

  it("uses neutral recipient copy for unknown-gender proposal, reveal, and follow-up emails", () => {
    const proposal = buildMatchProposalEmail({
      firstName: "בדיקה",
      recipientGender: "other",
      matchFirstName: "התאמה",
      matchAge: 35,
      matchCity: "תל אביב",
      matchReligiosity: "secular",
      compatibilityScore: 82,
      hilitsNote: "יש כאן פוטנציאל לחיבור.",
      yesUrl: "https://example.test/match/yes",
      noUrl: "https://example.test/match/no",
      recipientEmail: "test@example.com",
      singleId: 1,
      proposalSource: "boost",
      boostRole: "recipient",
    });
    const reveal = buildContactRevealEmail({
      firstName: "בדיקה",
      gender: "other",
      matchFirstName: "התאמה",
      matchPhone: "0500000000",
      matchEmail: "match@example.com",
      matchAge: 35,
      matchCity: "תל אביב",
      compatibilityScore: 82,
      preDateTip: "להגיע בסקרנות.",
      recipientEmail: "test@example.com",
      singleId: 1,
      dashboardUrl: "https://example.test/dashboard",
    });
    const followUp = buildMatchFollowUpEmail({
      firstName: "בדיקה",
      gender: "other",
      matchFirstName: "התאמה",
      matchAge: 35,
      matchCity: "תל אביב",
      yesUrl: "https://example.test/match/yes",
      noUrl: "https://example.test/match/no",
      feedbackUrl: "https://example.test/match/feedback",
      recipientEmail: "test@example.com",
      singleId: 1,
      proposalSource: "boost",
    });

    for (const email of [proposal, reveal, followUp]) {
      const copy = [email.subject, email.textBody, email.htmlBody]
        .map(recipientCopy)
        .join("\n");
      expect(copy).not.toMatch(/נשלחה אליך|שניכם אמרתם כן|(?:^|[^\p{L}])(?:אתה|שלחי)(?=$|[^\p{L}])|\/(?:[א-ת]+)/u);
    }

    expect(proposal.htmlBody).toContain("חילוני או חילונית");
    expect(proposal.textBody).toContain("https://example.test/match/yes");
    expect(reveal.subject).toContain("יש אישור משני הצדדים");
    expect(followUp.textBody).toContain("נשלחה עבורך");
  });
});
