import { describe, expect, it } from "vitest";
import {
  DNA_PROFILES,
  EMAIL_SEQUENCES,
  getDnaEmailVars,
  renderTemplate,
} from "./emailTemplates";

const profiles = ["leader", "romantic", "free_spirit", "anchor"] as const;
const cases = [
  { gender: "female", journeys: ["women_first_step", "women_first_step_v2"] },
  { gender: "male", journeys: ["men_first_step", "men_first_step_v2"] },
] as const;

// These are recipient-addressed expressions, not every grammatical gender in an email:
// the sender may talk about herself or about another man or woman in a story.
const masculineAddress = /אתה|שאתה|אתכם|מביא(?!ה)|מוצא(?!ת)|עלול(?!ה)|דואג(?!ת)|נאמן(?!ה)|מעשי(?!ת)|יודע(?!ת)|מנהל(?!ת)/u;
const feminineAddress = /את מביאה|את מוצאת|את עלולה|את דואגת|את הופכת|את נאמנה|את מעשית|את יודעת|אלייך|בת זוג שאוהבת/u;

describe("DNA result email gender", () => {
  for (const { gender, journeys } of cases) {
    for (const dnaType of profiles) {
      it(`${gender}: ${dnaType} renders gendered copy in both result journeys and both MIME bodies`, () => {
        const vars = getDnaEmailVars(dnaType, gender);
        const profile = DNA_PROFILES[dnaType];
        expect(vars.dnaTypeLabel).toBe(gender === "female" ? profile.label_f : profile.label_m);
        expect(vars.dnaTypeMatch).toBe(gender === "female" ? profile.match_f : profile.match_m);
        expect(vars.dnaTypeMatch).toContain(gender === "female" ? "גבר" : "אישה");

        for (const field of [vars.dnaTypeSuperpower, vars.dnaTypeChallenge]) {
          expect(field.length).toBeGreaterThan(30);
          expect(field).not.toMatch(gender === "female" ? masculineAddress : feminineAddress);
        }

        for (const journey of journeys) {
          const template = EMAIL_SEQUENCES[journey][0];
          const rendered = renderTemplate(template, { firstName: "בדיקה", ...vars });
          expect(rendered.htmlBody).toContain(vars.dnaTypeSubtitle);
          for (const body of [rendered.htmlBody, rendered.textBody]) {
            for (const [key, value] of Object.entries(vars)) {
              if (key !== "dnaTypeSubtitle") expect(body).toContain(value);
            }
            expect(body).not.toMatch(/\{\{dnaType(?:Label|Subtitle|Superpower|Challenge|Match)\}\}/u);
          }
          if (journey === journeys[0]) {
            expect(rendered.htmlBody).toContain(gender === "female" ? "הצטרפי" : "הצטרף");
          }
        }

        // The next message in the original journey also quotes this challenge.
        const followUp = renderTemplate(EMAIL_SEQUENCES[journeys[0]][1], vars);
        expect(followUp.htmlBody).toContain(vars.dnaTypeChallenge);
      });
    }
  }

  it("does not default an invalid gender or unknown profile to masculine copy", () => {
    expect(() => getDnaEmailVars("anchor", "other" as "female")).toThrow("Invalid DNA email gender");
    const unknown = getDnaEmailVars("not-a-profile", "female");
    expect(unknown.dnaTypeLabel).toBe("לא ידוע");
    expect(unknown.dnaTypeSuperpower).toBe("");
    expect(unknown.dnaTypeChallenge).toBe("");
    expect(unknown.dnaTypeMatch).toBe("");
  });
});
