import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_FIRST_MATCH_POLICY_STATUS, LIVE_FIRST_MATCH_PUBLIC_PROMISE_ENABLED } from "../shared/liveFirstMatchPolicy";
import { getPlusWednesdayCycleTarget } from "../shared/plusWednesdayOffer";
const source=(path:string)=>readFileSync(path,"utf8");
describe("October14 draft and campaign isolation",()=>{
 it("keeps the public SLA disabled while the operational queue is a draft",()=>{expect(LIVE_FIRST_MATCH_PUBLIC_PROMISE_ENABLED).toBe(false);expect(LIVE_FIRST_MATCH_POLICY_STATUS).toBe("draft");for(const f of["client/src/pages/DatabaseSales.tsx","client/src/pages/TermsLiveOctober.tsx"])expect(source(f)).toContain("LIVE_FIRST_MATCH_PUBLIC_PROMISE_ENABLED");});
 it("newsletter/SMS files are builders only, not mailing pipelines",()=>{for(const f of["server/october14Newsletter.ts","server/october14SmsDraft.ts"])expect(source(f)).not.toMatch(/\b(sendEmail|sendSms|sendSMS|sendWhatsApp|scheduleTask|createAndSendMatch|approveMatch)\s*\(/);});
 it("PLUS3 prevalidation and payment validation both exist and the price is never discounted",()=>{const r=source("server/routers.ts");expect(r).toContain('requested === "PLUS3"');expect(r).toContain("validatePlusWednesdayCoupon(input)");expect(r).toContain("appendPlusWednesdayOfferMarker(cleanUtmTerm)");expect(source("client/src/components/GrowWallet.tsx")).toContain('couponApplied.code !== "PLUS3"');expect(source("shared/october14CampaignLinks.ts")).toContain("evening_oct14_2026");});
 it("preserves legacy bonus/history while adding a separate Wednesday cohort",()=>{const r=source("server/plusPilotRouter.ts");expect(r).toContain("buildPlusHolidayLaunchTracking");expect(r).toContain("holidayLaunchLogs.filter");expect(r).toContain("wednesdayOfferEntitlement");expect(getPlusWednesdayCycleTarget("plus_launch_sep26",0,2)).toBe(3);expect(getPlusWednesdayCycleTarget("plus_launch_sep26",1,3)).toBe(2);expect(getPlusWednesdayCycleTarget("plus_wednesday_2026",0,2)).toBe(3);expect(getPlusWednesdayCycleTarget("plus_wednesday_2026",1,3)).toBe(2);});
});
