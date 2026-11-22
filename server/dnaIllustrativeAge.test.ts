import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DnaResultProfileCard from "../client/src/components/DnaResultProfileCard";
import { EMAIL_SEQUENCES, getDnaEmailVars, renderTemplate } from "./emailTemplates";

const dnaTypes = ["leader", "romantic", "free_spirit", "anchor"] as const;
const cases = [
  { gender: "male", names: ["נועה", "מאיה", "תמר"], journeys: ["men_first_step", "men_first_step_v2"] },
  { gender: "female", names: ["אורי", "יואב", "איתן"], journeys: ["women_first_step", "women_first_step_v2"] },
] as const;
const cardSource = readFileSync(new URL("../client/src/components/DnaResultProfileCard.tsx", import.meta.url), "utf8");

// Only visible age signatures, not CSS dimensions, prices, scores or asset hashes.
const ageLabel = /(?:\b(?:age|birthDate|dateOfBirth)\b|גיל\s*:?\s*\d|(?:בן|בת)\s+\d{2}|\d{2}\s*·|(?:נועה|מאיה|תמר|אורי|יואב|איתן)\s*[,،]\s*\d{2})/iu;
const visibleEmailText = (html: string) => html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("DNA editorial examples omit unsupported ages", () => {
  for (const { gender, names, journeys } of cases) {
    for (const dnaType of dnaTypes) {
      it(`${gender}/${dnaType}: keeps three examples, disclosure and both CTA modes without ages`, () => {
        const resultLabel = getDnaEmailVars(dnaType, gender).dnaTypeLabel;
        const onContinue = vi.fn();
        for (const href of [null, "/november-bundle?utm_source=dna"] as const) {
          const html = renderToStaticMarkup(React.createElement(DnaResultProfileCard, {
            name: "שם בדיקה", gender, resultLabel, href, onContinue,
          }));
          const captions = html.match(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/g) ?? [];
          expect(captions).toHaveLength(3);
          captions.forEach((caption, index) => {
            expect(caption).toContain(names[index]);
            expect(caption.replace(/<[^>]+>/g, " ")).not.toMatch(/\d|·|גיל/u);
          });
          for (const city of ["תל אביב", "רמת גן", "הרצליה"]) expect(html).toContain(city);
          expect(html).toContain("תצוגת פרופילים לדוגמה");
          expect(html).toContain(resultLabel);
          expect(html).toContain("grid grid-cols-3 gap-2");
          expect(html).toContain("כן, הילית. אני רוצה להכיר");
          expect(html).toContain(href ? `<a href="${href}"` : '<button type="button"');
          expect(html).toContain('data-testid="dna-profile-card-cta"');
          if (gender === "male") {
            expect(html.match(/<img\b/g)).toHaveLength(3);
            for (const name of names) expect(html).toContain(`פרופיל בדיוני לדוגמה: ${name}`);
          } else {
            expect(html).not.toContain("<img");
            expect(html.match(/פרופיל דוגמה ללא תמונה/g)).toHaveLength(3);
          }
        }
        expect(onContinue).not.toHaveBeenCalled();
      });

      for (const journey of journeys) {
        it(`${journey}/${dnaType}: HTML and text result mail do not present age-labelled candidates`, () => {
          const rendered = renderTemplate(EMAIL_SEQUENCES[journey][0], {
            firstName: "שם בדיקה",
            ...getDnaEmailVars(dnaType, gender),
            joinDnaType: dnaType,
            joinGender: gender,
            joinFirstName: encodeURIComponent("שם בדיקה"),
          });
          expect(visibleEmailText(rendered.htmlBody)).not.toMatch(ageLabel);
          expect(rendered.textBody).not.toMatch(ageLabel);
          // The corresponding first-step emails currently contain DNA descriptions,
          // not the web's fictional candidate gallery. Do not invent email candidates.
          expect(rendered.htmlBody).not.toContain("tv-demo-fictional");
          expect(rendered.htmlBody).not.toContain("<figcaption");
          if (journey.endsWith("_v2")) {
            const expectedHref = `https://hilitcaspi.com/join?utm_source=email&utm_medium=brevo&utm_campaign=database&dna=${dnaType}&gender=${gender}&name=${encodeURIComponent("שם בדיקה")}`;
            expect(rendered.htmlBody).toContain(`href="${expectedHref}"`);
            expect(rendered.textBody).toContain(expectedHref);
          } else {
            expect(rendered.htmlBody).toContain('href="https://hilitcaspi.com/api/wa/email" class="cta"');
            expect(rendered.textBody).toContain("https://hilitcaspi.com/api/wa/email");
          }
        });
      }
    }
  }

  it("does not keep dormant fictional ages that another viewport could display", () => {
    expect(cardSource).not.toMatch(/\bage\s*:|\bprofile\.age\b|\bageRange\b/);
    expect(cardSource).toContain('onClick={onContinue}');
    for (const image of [
      "/manus-storage/tv-demo-fictional-noa_729c3436.webp",
      "/manus-storage/tv-demo-fictional-maya_d18c6c36.webp",
      "/manus-storage/tv-demo-fictional-tamar_82047198.webp",
    ]) expect(cardSource).toContain(image);
  });
});
