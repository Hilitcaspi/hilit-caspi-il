import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PRODUCT_CONFIGS } from "./growPayment";
import { detectProductByAmount, detectProductByDesc } from "./growWebhook";

describe("Boost Grow product routing", () => {
  it("keeps the Boost amount and description distinct from every other product", () => {
    expect(PRODUCT_CONFIGS.match_boost).toMatchObject({ sum: 19.90, paymentNum: 1 });
    expect(detectProductByAmount(19.90)).toBe("match_boost");
    expect(detectProductByAmount(19.99)).toBe("match_boost");
    expect(detectProductByDesc("Boost - הצעת התאמה אלגוריתמית")).toBe("match_boost");
    expect(detectProductByDesc("בוסט התאמה אלגוריתמי")).toBe("match_boost");
  });

  it("does not confuse the Boost amount with database, bundle, event or Plus products", () => {
    expect(detectProductByAmount(19.90)).not.toBe("database");
    expect(detectProductByAmount(19.90)).not.toBe("bundle_new_year");
    expect(detectProductByAmount(19.90)).not.toBe("live_event");
    expect(detectProductByAmount(19.90)).not.toBe("plus");
  });

  it("carries a signed Boost request reference from createProcess through the Grow webhook", () => {
    const paymentSource = fs.readFileSync(path.join(process.cwd(), "server/growPayment.ts"), "utf8");
    const routerSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    const webhookSource = fs.readFileSync(path.join(process.cwd(), "server/growWebhook.ts"), "utf8");
    const indexSource = fs.readFileSync(path.join(process.cwd(), "server/_core/index.ts"), "utf8");
    expect(paymentSource).toContain('notifyUrl.searchParams.set("boost_ref", input.webhookReference)');
    expect(routerSource).toContain("preparedBoostCheckoutReference = prepared.checkoutReference");
    expect(routerSource).toContain("webhookReference: preparedBoostCheckoutReference || undefined");
    expect(indexSource).toContain('req.query.boost_ref === "string"');
    expect(webhookSource).toContain("context.boostCheckoutReference");
    expect(webhookSource).toContain("checkoutReference,");
  });
});
