import { describe, expect, it } from "vitest";
import {
  CHOOSE50_CODE,
  CHOOSE50_END_AT,
  CHOOSE50_PRICE_AGOROT,
  CHOOSE50_PRICE_ILS,
  CHOOSE50_START_AT,
  jerusalemDateTimeToUtcMs,
  validateChoose50Coupon,
} from "./choose50Coupon";

describe("Choose50 coupon", () => {
  it("computes the specified Asia/Jerusalem window in UTC", () => {
    expect(CHOOSE50_START_AT).toBe(Date.parse("2026-10-25T22:00:00.000Z"));
    expect(CHOOSE50_END_AT).toBe(Date.parse("2026-10-31T21:59:59.999Z"));
    expect(jerusalemDateTimeToUtcMs({
      year: 2026, month: 10, day: 31, hour: 23, minute: 59, second: 59, millisecond: 999,
    })).toBe(CHOOSE50_END_AT);
  });

  it("accepts case-insensitive code input for the paid guide at both inclusive boundaries", () => {
    expect(validateChoose50Coupon({ code: "choose50", product: "guide", now: CHOOSE50_START_AT })).toEqual({
      valid: true,
      code: CHOOSE50_CODE,
      discountPercent: 50,
      fixedPrice: CHOOSE50_PRICE_ILS,
      priceAgorot: CHOOSE50_PRICE_AGOROT,
    });
    expect(validateChoose50Coupon({ code: "Choose50", product: "guide", now: CHOOSE50_END_AT })).toMatchObject({
      valid: true,
      fixedPrice: 74.5,
      priceAgorot: 7450,
    });
  });

  it("rejects every product other than the paid guide", () => {
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "course", now: CHOOSE50_START_AT })).toEqual({
      valid: false,
      error: "קוד Choose50 תקף למדריך ׳לבחור נכון׳ בלבד",
    });
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "match_boost", now: CHOOSE50_START_AT })).toMatchObject({
      valid: false,
    });
  });

  it("rejects timestamps immediately before and after the authorized window", () => {
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "guide", now: CHOOSE50_START_AT - 1 })).toMatchObject({
      valid: false,
      error: "קוד Choose50 עדיין אינו בתוקף",
    });
    expect(validateChoose50Coupon({ code: "CHOOSE50", product: "guide", now: CHOOSE50_END_AT + 1 })).toMatchObject({
      valid: false,
      error: "קוד Choose50 פג תוקף",
    });
  });
});
