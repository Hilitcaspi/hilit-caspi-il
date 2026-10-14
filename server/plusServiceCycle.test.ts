import { describe, expect, it } from "vitest";
import { resolvePlusServiceCycle, isPlusArchived, PLUS_SERVICE_CYCLE_MS as span } from "../shared/plusServiceCycle";
import { calculatePlusServiceProgress } from "./plusSubscription";
import { presentPlusCycle } from "../shared/plusCyclePresentation";
const anchor = Date.parse("2026-09-13T10:00:00+03:00");
const member={ singleId:1,status:"active",billingStatus:"active",billingCycleStartedAt:anchor,billingCycleEndsAt:Date.parse("2026-10-13T10:00:00+03:00"),activatedAt:anchor,monthlyMatchTarget:2 };
describe("30-day Plus service cycles independent of charges",()=>{
 it("renews at the exact 30-day boundary, not the billing calendar month",()=>{
  expect(resolvePlusServiceCycle(member,anchor+span-1).cycleStart).toBe(anchor);
  expect(resolvePlusServiceCycle(member,anchor+span).cycleStart).toBe(anchor+span);
  expect(resolvePlusServiceCycle(member,anchor+span).cycleEnd).toBe(anchor+2*span);
 });
 it("catches up multiple periods in one deterministic calculation without writes",()=>{
  const snapshot=JSON.stringify(member);const a=resolvePlusServiceCycle(member,anchor+4*span+123);
  expect(a.cycleIndex).toBe(4);expect(a.cycleStart).toBe(anchor+4*span);expect(a.cycleEnd).toBe(anchor+5*span);
  expect(JSON.stringify(member)).toBe(snapshot);expect(resolvePlusServiceCycle(member,anchor+4*span+123)).toEqual(a);
 });
 it("does not count previous-period proposals or Boost and never counts generated placeholders",()=>{
  const now=anchor+span+1000;const props=[
    {id:1,singleAId:1,singleBId:2,proposedAt:anchor+1,status:'proposed',ownerApprovedAt:anchor+1},
    {id:2,singleAId:1,singleBId:3,proposedAt:anchor+span,status:'pending'},
    {id:3,singleAId:1,singleBId:4,proposedAt:anchor+span+1,status:'proposed',ownerApprovedAt:anchor+span+1,proposalSource:'boost'},
    {id:4,singleAId:1,singleBId:5,proposedAt:anchor+span+2,status:'proposed',ownerApprovedAt:anchor+span+2},
  ];
  const p=calculatePlusServiceProgress(member,props,now);expect(p.delivered).toBe(1);expect(p.remaining).toBe(1);expect(p.needsMatches).toBe(true);expect(p.kind).toBe('service');
 });
 it("keeps the third launch proposal only in the first service cycle",()=>{
  const launch={...member,pilotCohort:'plus_launch_sep26',monthlyMatchTarget:3};
  expect(calculatePlusServiceProgress(launch,[],anchor+1).target).toBe(3);
  expect(calculatePlusServiceProgress(launch,[],anchor+span+1).target).toBe(2);
  expect(calculatePlusServiceProgress({...launch,pilotCohort:'custom'},[],anchor+span+1).target).toBe(3);
 });
 it.each(['past_due','pending','not_configured'])("does not renew a %s subscription",billingStatus=>{
  const p=calculatePlusServiceProgress({...member,billingStatus},[],anchor+span+1);
  expect(p.autoRenew).toBe(false);expect(p.needsMatches).toBe(false);expect(p.cycleStart).toBe(anchor);
 });
 it("freezes the current service cycle on cancellation instead of continuing to renew",()=>{
  const cancelled={...member,billingStatus:'cancelled',cancelledAt:anchor+span+1000};
  const p=calculatePlusServiceProgress(cancelled,[],anchor+4*span);
  expect(p.cycleStart).toBe(anchor+span);expect(p.cycleEnd).toBe(anchor+2*span);expect(p.autoRenew).toBe(false);expect(p.needsMatches).toBe(false);
 });
 it("archives a local end and never queues more proposals for it",()=>{
  const ended={...member,status:'churned',billingStatus:'ended',endedAt:anchor+span+1000};
  expect(isPlusArchived(ended)).toBe(true);expect(calculatePlusServiceProgress(ended,[],anchor+5*span).needsMatches).toBe(false);
  expect(isPlusArchived(member)).toBe(false);expect(isPlusArchived({...member,billingStatus:'cancelled'})).toBe(false);
 });
 it("does not fabricate an active cycle when there is no anchor",()=>{
  const p=calculatePlusServiceProgress({...member,billingCycleStartedAt:null,activatedAt:null},[],anchor+span);
  expect(p.autoRenew).toBe(false);expect(p.needsMatches).toBe(false);
 });
 it("does not reset a future-start cycle early and handles DST as elapsed time",()=>{
  expect(resolvePlusServiceCycle(member,anchor-1000).cycleStart).toBe(anchor);
  expect(calculatePlusServiceProgress(member,[],anchor-1000).needsMatches).toBe(false);
  const dst=Date.parse('2026-10-10T10:00:00+03:00');
  expect(resolvePlusServiceCycle({...member,billingCycleStartedAt:dst},dst+span).cycleStart-dst).toBe(span);
 });
 it("presents service renewal honestly, without claiming a provider payment",()=>{
  const view=presentPlusCycle(calculatePlusServiceProgress(member,[],anchor+span+1000),anchor+span+1000,'active');
  expect(view.title).toContain('מחזור השירות');expect(view.count).toBe('0 מתוך 2');expect(view.notice).toContain('30 יום');expect(view.notice).not.toContain('מאומת');
 });
});
