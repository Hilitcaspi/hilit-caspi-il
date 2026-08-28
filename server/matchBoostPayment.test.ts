import { describe, expect, it } from "vitest";
import { PRODUCT_CONFIGS } from "./growPayment";
import { detectProductByAmount, detectProductByDesc } from "./growWebhook";

describe("Boost Grow product routing", () => {
  it("keeps the Boost amount and description distinct from every other product", () => {
    expect(PRODUCT_CONFIGS.match_boost).toMatchObject({ sum: 19.99, paymentNum: 1 });
    expect(detectProductByAmount(19.99)).toBe("match_boost");
    expect(detectProductByDesc("Boost - הצעת התאמה אלגוריתמית")).toBe("match_boost");
    expect(detectProductByDesc("בוסט התאמה אלגוריתמי")).toBe("match_boost");
  });

  it("does not confuse the Boost amount with database, bundle, event or Plus products", () => {
    expect(detectProductByAmount(19.99)).not.toBe("database");
    expect(detectProductByAmount(19.99)).not.toBe("bundle_new_year");
    expect(detectProductByAmount(19.99)).not.toBe("live_event");
    expect(detectProductByAmount(19.99)).not.toBe("plus");
  });
});
