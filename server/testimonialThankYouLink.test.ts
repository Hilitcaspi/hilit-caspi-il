import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { transactionIdFromSearch } from "../client/src/components/ProductFeedbackThankYouCard";

const root = resolve(process.cwd());

describe("product feedback links on thank-you pages", () => {
  it("reads only an explicit Grow transaction identifier", () => {
    expect(transactionIdFromSearch("?transactionId=grow-123456")).toBe("grow-123456");
    expect(transactionIdFromSearch("?trxId=legacy-123456")).toBe("legacy-123456");
    expect(transactionIdFromSearch("?email=private@example.com")).toBe("");
  });

  it("verifies the transaction and expected product before returning a personal link", () => {
    const routerSource = readFileSync(resolve(root, "server/testimonialRouter.ts"), "utf8");
    expect(routerSource).toContain("productThankYouLink: publicProcedure");
    expect(routerSource).toContain("webhookIdempotency.transactionId");
    expect(routerSource).toContain("purchase.product !== input.expectedProduct");
    expect(routerSource).toContain("buildFeedbackRequestKey");
    expect(routerSource).not.toContain("productThankYouLink: publicProcedure.input(z.object({ email:");
  });

  it.each([
    ["ThankYouDigital.tsx", 'expectedProduct="guide"'],
    ["ThankYouCourse.tsx", 'expectedProduct="course"'],
    ["ThankYouBundle.tsx", 'expectedProduct="bundle_tubav"'],
    ["ThankYouNewYearBundle.tsx", 'expectedProduct="bundle_new_year"'],
  ])("shows the verified personal feedback card on %s", (fileName, expectedMarkup) => {
    const source = readFileSync(resolve(root, "client/src/pages", fileName), "utf8");
    expect(source).toContain("ProductFeedbackThankYouCard");
    expect(source).toContain(expectedMarkup);
  });
});
