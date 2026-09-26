import { describe, expect, it } from "vitest";
import {
  getCompassProgress,
  getCompassQuestionById,
  getCompassResult,
  getInterimPrediction,
  getNextCompassQuestion,
  scoreCompassResponses,
  type CompassResponses,
} from "../shared/courseCompass";

describe("course compass adaptive pattern engine", () => {
  it("starts by asking the visitor to hold one person in mind without free text", () => {
    const question = getNextCompassQuestion({});
    expect(question?.id).toBe("scene");
    expect(question?.prompt).toContain("ביניכם");
    expect(question?.answers.length).toBeGreaterThanOrEqual(4);
    expect(question?.answers.every(answer => Boolean(answer.id && answer.label))).toBe(true);
  });

  it("makes a visible interim prediction after four clicks", () => {
    const responses: CompassResponses = {
      scene: "mixed_messages",
      fast_hook: "decode_everything",
      value_signal: "unavailable",
      silence_response: "check_phone",
    };
    const prediction = getInterimPrediction(responses);
    const question = getNextCompassQuestion(responses);
    expect(prediction.primary).toBe("uncertainty_loop");
    expect(prediction.text).toContain("שום דבר עדיין לא נסגר");
    expect(question?.id).toBe("prediction_check");
    expect(question?.prediction).toBe(true);
    expect(question?.prompt).toBe(prediction.text);
  });

  it("uses the reaction to the first guess before choosing the discriminating question", () => {
    const responses: CompassResponses = {
      scene: "mixed_messages",
      fast_hook: "decode_everything",
      value_signal: "unavailable",
      silence_response: "check_phone",
      prediction_check: "close",
    };
    const question = getNextCompassQuestion(responses);
    expect(question?.id).toBe("discriminate_chemistry_confusion__uncertainty_loop");
    expect(question?.prompt).toContain("מה חזק יותר");
  });

  it("asks exactly one adaptive discriminator before moving deeper", () => {
    const responses: CompassResponses = {
      scene: "mixed_messages",
      fast_hook: "decode_everything",
      value_signal: "unavailable",
      silence_response: "check_phone",
      prediction_check: "close",
      discriminate_chemistry_confusion__uncertainty_loop: "uncertainty_loop",
    };
    expect(getNextCompassQuestion(responses)?.id).toBe("hard_truth");
  });

  it("reveals the uncertainty loop with evidence copied from actual choices", () => {
    const responses: CompassResponses = {
      scene: "mixed_messages",
      fast_hook: "decode_everything",
      value_signal: "unavailable",
      silence_response: "check_phone",
      discriminate_chemistry_confusion__uncertainty_loop: "uncertainty_loop",
      prediction_check: "close",
      hard_truth: "clarity_scary",
      facts_only: "close_far_pattern",
      old_solution: "look_for_sign",
      safety: "no",
    };
    const result = getCompassResult(responses);
    expect(result.primary).toBe("uncertainty_loop");
    expect(result.content.title).toContain("חוסר הבהירות");
    expect(result.content.science).toContain("תגמול");
    expect(result.evidence).toContain("מנתח הודעות, זמנים ושינויים קטנים");
    expect(result.content.actions.length).toBe(2);
  });

  it("overrides the attraction pattern when safety is uncertain", () => {
    const responses: CompassResponses = {
      scene: "strong_attraction_little_ground",
      fast_hook: "feel_intensity",
      value_signal: "intense_moment",
      silence_response: "want_more",
      prediction_check: "close",
      discriminate_chemistry_confusion__future_projection: "chemistry_confusion",
      hard_truth: "intensity_wins",
      facts_only: "intensity_few_facts",
      old_solution: "rules_then_break",
      safety: "uncertain",
    };
    const result = getCompassResult(responses);
    expect(result.primary).toBe("safety");
    expect(result.clarity).toBe("safety");
    expect(getNextCompassQuestion(responses)).toBeNull();
  });

  it("uses a final transparent guess when two mechanisms remain close", () => {
    const responses: CompassResponses = {
      scene: "after_date_replay",
      fast_hook: "build_future",
      value_signal: "intense_moment",
      silence_response: "want_more",
      prediction_check: "partial",
      discriminate_chemistry_confusion__future_projection: "chemistry_confusion",
      hard_truth: "knew_but_stayed",
      facts_only: "intensity_few_facts",
      old_solution: "wait_for_potential",
      safety: "no",
    };
    const scores = scoreCompassResponses(responses);
    expect(Math.abs(scores.chemistry_confusion - scores.future_projection)).toBeLessThan(2);
    expect(getNextCompassQuestion(responses)?.id).toBe("tie_break");
  });

  it("calculates progress across ten clicks and never exceeds one hundred percent", () => {
    const responses: CompassResponses = {
      scene: "mixed_messages",
      fast_hook: "decode_everything",
      value_signal: "unavailable",
      silence_response: "check_phone",
      prediction_check: "close",
      discriminate_chemistry_confusion__uncertainty_loop: "uncertainty_loop",
      hard_truth: "clarity_scary",
      facts_only: "close_far_pattern",
      old_solution: "look_for_sign",
      safety: "no",
    };
    expect(getCompassProgress(responses)).toBe(100);
    expect(getCompassQuestionById("hard_truth", responses)?.answers).toHaveLength(5);
  });
});
