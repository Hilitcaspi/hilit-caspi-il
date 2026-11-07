import "dotenv/config";
import { appRouter } from "../server/routers";

// Manual read-only verification. Does not create a payment process, lead or send a message.
async function verify() {
  const caller = appRouter.createCaller({ user: null, req: { headers: {}, ip: "127.0.0.1" }, res: {} } as any);
  const excluded = ["bundle_november", "plus", "match_boost"];
  for (const product of ["database", "course", "guide", "session", "coaching", "coaching_mas", ...excluded]) {
    const result = await caller.coupons.validate({ code: "november10", product });
    if (excluded.includes(product) ? result.valid : !result.valid || result.discountPercent !== 10) {
      throw new Error(`Unexpected coupon eligibility: ${product}`);
    }
    console.log(JSON.stringify({ product, valid: result.valid, percent: "discountPercent" in result ? result.discountPercent : null }));
  }
}
verify().then(() => process.exit(0)).catch(() => { console.error("Coupon verification failed"); process.exit(1); });
