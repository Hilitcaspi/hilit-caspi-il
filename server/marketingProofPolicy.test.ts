import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicSalesPages = [
  "client/src/pages/Home.tsx",
  "client/src/pages/CoachingSales.tsx",
  "client/src/pages/CourseSales.tsx",
  "client/src/pages/DatabaseLanding.tsx",
  "client/src/pages/DatabaseSales.tsx",
  "client/src/pages/DnaQuiz.tsx",
  "client/src/pages/GuideSales.tsx",
  "client/src/pages/LeadCall.tsx",
  "client/src/pages/LiveEvent.tsx",
  "client/src/pages/Register.tsx",
  "client/src/pages/ScientificQuestionnaire.tsx",
  "client/src/pages/SingleSessionSales.tsx",
  "client/src/pages/Speaking.tsx",
];

const readPages = () => publicSalesPages.map(path => readFileSync(path, "utf8")).join("\n");

describe("marketing proof policy", () => {
  it("does not hardcode customer testimonials or unidentified couple imagery", () => {
    const source = readPages();
    const prohibited = [
      "couple1-",
      "couple2-",
      "couple3-",
      "SOCIAL_PROOF",
      "TESTIMONIALS",
      "רותם ועידו",
      "יעל ותומר",
      "אורית ואלון",
      "מיכל ואורי",
      "שירה ודניאל",
      "נועה ואיתי",
    ];

    for (const token of prohibited) {
      expect(source, `prohibited marketing proof token: ${token}`).not.toContain(token);
    }
  });

  it("does not create visitor-specific fake offer countdowns", () => {
    const source = readPages();
    expect(source).not.toContain("guide_countdown");
    expect(source).not.toContain("database_countdown");
  });

  it("uses dated, verified database evidence with a non-guarantee", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    const database = readFileSync("client/src/pages/DatabaseLanding.tsx", "utf8");
    const combined = `${home}\n${database}`;

    expect(combined).toContain("1,171");
    expect(combined).toContain("26.8.2026");
    expect(combined).toMatch(/אינם מבטיחים|אין התחייבות/);
  });
});
