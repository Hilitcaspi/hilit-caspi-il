import { describe, expect, it } from "vitest";
import { EMAIL_SEQUENCES } from "./emailTemplates";

describe("matchmaking expectation messaging", () => {
  const journeys = [
    EMAIL_SEQUENCES.women_matchmaking_welcome,
    EMAIL_SEQUENCES.men_matchmaking_welcome,
  ];

  it("states that membership does not guarantee a number or frequency of matches", () => {
    for (const journey of journeys) {
      expect(journey[0]?.htmlBody).toContain("אינם התחייבות למספר התאמות או לתדירות קבועה");
      expect(journey[0]?.textBody).toContain("אין התחייבות למספר התאמות או לתדירות קבועה");
    }
  });

  it("does not promise a fixed average time to a first match", () => {
    for (const journey of journeys) {
      expect(journey[0]?.htmlBody).not.toContain("זמן ממוצע עד לחיבור הראשון");
      expect(journey[0]?.textBody).not.toContain("זמן ממוצע");
    }
  });

  it("explains the quality-over-quantity approach", () => {
    for (const journey of journeys) {
      expect(journey[2]?.htmlBody).toContain("המטרה אינה לשלוח יותר שמות");
      expect(journey[2]?.htmlBody).toContain("התאמה רלוונטית");
    }
  });

  it("routes personal support to the paid personal-session page", () => {
    for (const journey of journeys) {
      expect(journey[3]?.htmlBody).toContain("המאגר הוא שירות התאמה, לא תהליך ליווי אישי");
      expect(journey[3]?.htmlBody).toContain("https://hilitcaspi.com/single-session");
    }
  });
});
