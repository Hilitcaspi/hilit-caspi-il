import { describe, expect, it } from "vitest";
import { EMAIL_SEQUENCES, renderTemplate } from "./emailTemplates";

describe("DNA journey checkout links", () => {
  it("renders a valid encoded registration link without unresolved gender placeholders", () => {
    const template = EMAIL_SEQUENCES.men_first_step_v2[0];
    const rendered = renderTemplate(template, {
      firstName: "שם בדיקה",
      dnaType: "anchor",
      dnaTypeLabel: "העוגן היציב",
      dnaTypeSubtitle: "",
      dnaTypeSuperpower: "",
      dnaTypeChallenge: "",
      dnaTypeMatch: "",
      joinDnaType: "anchor",
      joinGender: "male",
      joinFirstName: encodeURIComponent("שם בדיקה"),
      guideLink: "https://example.com/guide",
      courseLink: "https://example.com/course",
    });

    expect(rendered.htmlBody).toContain("dna=anchor&gender=male&name=%D7%A9%D7%9D%20%D7%91%D7%93%D7%99%D7%A7%D7%94");
    expect(rendered.htmlBody).not.toContain("{{gender}}");
    expect(rendered.htmlBody).not.toContain("{{joinGender}}");
  });
});
