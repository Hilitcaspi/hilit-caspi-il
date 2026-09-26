import { describe, expect, it } from "vitest";
import {
  getCompassProgress,
  getCompassQuestionById,
  getCompassResult,
  getNextCompassQuestion,
  scoreCompassResponses,
  type CompassResponses,
} from "../shared/courseCompass";

const uncertaintyResponses: CompassResponses = {
  want_now: "is_interested",
  no_message: "check_phone",
  most_attractive: "unknown",
  clear_tomorrow: "relief",
  familiar_pattern: "attach_unclear",
  distance: "read_signs",
  hard_to_release: "missing_answer",
  wish_now: "clear_answer",
};

describe("course compass simple gendered engine", () => {
  it("starts with a direct female or male question and no free text", () => {
    const female = getNextCompassQuestion({}, "female");
    const male = getNextCompassQuestion({}, "male");

    expect(female?.id).toBe("want_now");
    expect(female?.prompt).toBe("מה את הכי רוצה לדעת עליו עכשיו?");
    expect(male?.prompt).toBe("מה אתה הכי רוצה לדעת עליה עכשיו?");
    expect(female?.answers).toHaveLength(5);
    expect(female?.answers.every(answer => Boolean(answer.id && answer.label))).toBe(true);
  });

  it("moves through exactly eight simple questions without prediction or tie-break screens", () => {
    const partial = { ...uncertaintyResponses };
    delete partial.wish_now;
    expect(getNextCompassQuestion(partial, "female")?.id).toBe("wish_now");
    expect(getNextCompassQuestion(uncertaintyResponses, "female")).toBeNull();
    expect(Object.keys(uncertaintyResponses)).toHaveLength(8);
  });

  it("reveals a clear uncertainty result from direct everyday choices", () => {
    const result = getCompassResult(uncertaintyResponses, "female");
    expect(result.primary).toBe("uncertainty_loop");
    expect(result.content.label).toBe("חוסר הוודאות");
    expect(result.content.title).toContain("שהוא רוצה אותך");
    expect(result.content.magicLine).toContain("המצפן שלך");
    expect(result.evidence).toContain("בודקת שוב ושוב אם הוא כתב");
    expect(result.content.actions).toHaveLength(1);
    expect(result.content.deeperInsight).toContain("חוסר הוודאות");
    expect(result.content.relationshipCost).toContain("סימנים");
    expect(result.content.courseBridge).toContain("בקורס תלמדי");
  });

  it("uses the same scoring with copy addressed to a man", () => {
    const female = getCompassResult(uncertaintyResponses, "female");
    const male = getCompassResult(uncertaintyResponses, "male");
    expect(male.primary).toBe(female.primary);
    expect(male.scores).toEqual(female.scores);
    expect(male.content.title).toContain("שהיא רוצה אותך");
    expect(male.evidence).toContain("בודק שוב ושוב אם היא כתבה");
    expect(male.content.courseBridge).toContain("בקורס תלמד");
  });

  it("calculates simple progress across eight clicks", () => {
    expect(getCompassProgress({})).toBe(0);
    expect(getCompassProgress({ want_now: "is_interested" })).toBe(13);
    expect(getCompassProgress(uncertaintyResponses)).toBe(100);
    expect(getCompassQuestionById("distance", uncertaintyResponses, "male")?.prompt).toContain("כשהיא מתרחקת");
  });

  it("scores only the saved answer ids and never requires personal text", () => {
    const scores = scoreCompassResponses(uncertaintyResponses);
    expect(scores.uncertainty_loop).toBeGreaterThan(scores.future_projection);
    const question = getCompassQuestionById("most_attractive", {}, "female");
    expect(question).not.toHaveProperty("input");
    expect(question?.answers.every(answer => typeof answer.label === "string")).toBe(true);
  });
});
