import { describe, expect, it } from "vitest";
import {
  getCompassProgress,
  getCompassQuestionById,
  getCompassResult,
  getNextCompassQuestion,
  scoreCompassResponses,
  type CompassResponses,
} from "../shared/courseCompass";

describe("course compass adaptive engine", () => {
  it("starts with a closed-choice question and never requires free text", () => {
    const question = getNextCompassQuestion({});
    expect(question?.id).toBe("moment");
    expect(question?.answers).toHaveLength(4);
    expect(question?.answers.every(answer => Boolean(answer.id && answer.label))).toBe(true);
  });

  it("selects the information-versus-consistency discriminator from the first four answers", () => {
    const responses: CompassResponses = {
      moment: "after_date",
      decision: "ask",
      fog: "words_actions",
      calm: "direct_answer",
    };
    const question = getNextCompassQuestion(responses);
    expect(question?.id).toBe("discriminate_consistency__information");
    expect(question?.prompt).toBe("מה ישנה יותר את התמונה?");
    expect(question?.answers.map(answer => answer.id)).toEqual(["information", "consistency"]);
  });

  it("changes the fifth question when the leading pair changes", () => {
    const responses: CompassResponses = {
      moment: "relationship_question",
      decision: "stop",
      fog: "speed",
      calm: "time",
    };
    const question = getNextCompassQuestion(responses);
    expect(question?.id).toBe("discriminate_boundary__pace");
    expect(question?.answers.map(answer => answer.id)).toEqual(["pace", "boundary"]);
  });

  it("explains a consistency result with evidence from choices", () => {
    const responses: CompassResponses = {
      moment: "after_date",
      decision: "slow",
      fog: "words_actions",
      calm: "repeated_action",
      discriminate_consistency__pace: "consistency",
      reaction: "wait_sign",
      possible_action: "observe_action",
      safety: "no",
    };
    const result = getCompassResult(responses);
    expect(result.primary).toBe("consistency");
    expect(result.content.title).toBe("בדקו עקביות, לא רק כוונה");
    expect(result.evidence).toContain("יש מילים יפות, אבל המעשים אינם עקביים");
    expect(result.content.actions.length).toBeGreaterThanOrEqual(2);
  });

  it("overrides ordinary scoring when safety is uncertain", () => {
    const responses: CompassResponses = {
      moment: "new_connection",
      decision: "approach",
      fog: "intent",
      calm: "direct_answer",
      discriminate_information__pace: "information",
      reaction: "ask_directly",
      possible_action: "one_question",
      safety: "uncertain",
    };
    const result = getCompassResult(responses);
    expect(result.primary).toBe("safety");
    expect(result.clarity).toBe("safety");
    expect(getNextCompassQuestion(responses)).toBeNull();
  });

  it("uses a transparent tie-break when the two leading directions remain close", () => {
    const responses: CompassResponses = {
      moment: "new_connection",
      decision: "approach",
      fog: "speed",
      calm: "direct_answer",
      discriminate_information__pace: "pace",
      reaction: "ask_directly",
      possible_action: "one_question",
      safety: "no",
    };
    const scores = scoreCompassResponses(responses);
    expect(Math.abs(scores.information - scores.pace)).toBeLessThan(2);
    expect(getNextCompassQuestion(responses)?.id).toBe("tie_break");
  });

  it("calculates progress without exceeding one hundred percent", () => {
    const responses: CompassResponses = {
      moment: "after_date",
      decision: "ask",
      fog: "intent",
      calm: "direct_answer",
      discriminate_information__self_choice: "information",
      reaction: "ask_directly",
      possible_action: "one_question",
      safety: "no",
      tie_break: "information",
    };
    expect(getCompassProgress(responses)).toBe(100);
    expect(getCompassQuestionById("possible_action", responses)?.answers).toHaveLength(5);
  });
});
