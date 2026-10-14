import { describe, expect, it } from "vitest";
import { buildOctober14SmsDraft } from "./october14SmsDraft";
import { october14SmsAliasTarget } from "../shared/october14CampaignLinks";
import { readFileSync } from "node:fs";
describe("October14 SMS draft", () => {
 it("is under one 256-unit provider unit while reports Unicode transport multipart honestly", () => {
  const x=buildOctober14SmsDraft();expect(x.utf16Units).toBe(x.message.length);expect(x.providerUnits256).toBe(1);expect(x.unicodeTransportParts).toBe(3);
  expect(x.message).toContain("פרסומת");expect(x.message).toContain("hilitcaspi.com/u");expect(x.message).toContain("תמונה ושאלון עד הלייב");expect(x.message).toContain("💛");
 });
 it("uses one local alias with full new UTM and no identity in URL", () => {
  const x=buildOctober14SmsDraft();const target=october14SmsAliasTarget();
  expect(x.offerUrl).toBe("https://hilitcaspi.com/o14");expect(target).toContain("coupon=LIVE");expect(target).toContain("utm_source=sms");expect(target).toContain("utm_campaign=evening_oct14_2026");expect(target).toContain("utm_content=database_warm_checkout");expect(target).not.toMatch(/email=|token=/);
  const app=readFileSync(new URL("../client/src/App.tsx",import.meta.url),"utf8");expect(app).toContain('<Route path={"/o14"} component={October14SmsRedirect} />');
 });
});
