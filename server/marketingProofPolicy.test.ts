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
  "client/src/pages/MatchBoostLanding.tsx",
  "client/src/pages/NewYearLoveBundle.tsx",
  "client/src/pages/Register.tsx",
  "client/src/pages/ScientificQuestionnaire.tsx",
  "client/src/pages/SignsGuide.tsx",
  "client/src/pages/SingleSessionSales.tsx",
  "client/src/pages/Speaking.tsx",
  "client/src/pages/TuBavBundle.tsx",
  "client/src/pages/DatabasePlusSales.tsx",
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

  it("does not publish database scale, proposal or profile-completion KPIs", () => {
    const source = readPages();
    const prohibited = [
      "1,171",
      "+5,000",
      "5,000 רווקים",
      "5,000 חברים",
      "5,000+ רווקים",
      "אלפי רווקים",
      "חברים פעילים ומשלמים",
      "קיבלו לפחות הצעה",
      "קיבלו הצעה",
      "השלימו שאלון מדעי",
      "הצעה תוך 30 יום",
      "הצעה בתוך 30 יום",
      "נתוני המאגר בפועל",
      "נתוני מאגר",
      "26.8.2026",
    ];

    for (const token of prohibited) {
      expect(source, `public database KPI token: ${token}`).not.toContain(token);
    }

    const routerSource = readFileSync("server/routers.ts", "utf8");
    expect(routerSource).not.toContain("getPublicTrustStats");
  });
});
