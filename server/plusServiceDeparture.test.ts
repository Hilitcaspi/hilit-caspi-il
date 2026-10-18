import { describe, expect, it } from 'vitest';
import { getPlusServiceDeparture } from '../shared/plusServiceDeparture';
import { calculatePlusServiceProgress } from './plusSubscription';
import { PLUS_SERVICE_CYCLE_MS } from '../shared/plusServiceCycle';
const start=Date.UTC(2026,9,1);const end=start+PLUS_SERVICE_CYCLE_MS;
const member={singleId:1,status:'active',billingStatus:'cancelled',activatedAt:start,cancelledAt:start+10*86400000,monthlyMatchTarget:2};
const progress={cycleStart:start,cycleEnd:end,remaining:1,delivered:1,target:2};

describe('Plus service departure presentation',()=>{
 it('retains an outstanding proposal until the current cycle deadline',()=>{
  expect(getPlusServiceDeparture(member,progress,{pending:true},start+15*86400000)).toMatchObject({state:'finishing_cycle',endsAt:end,remaining:1});
 });
 it('automatically displays service in archive at the cycle boundary',()=>{
  expect(getPlusServiceDeparture(member,progress,{pending:true},end-1).state).toBe('finishing_cycle');
  expect(getPlusServiceDeparture(member,progress,{pending:true},end)).toMatchObject({state:'archived',reason:'cycle_elapsed',remaining:1,endsAt:end});
 });
 it('immediately archives display when the monthly target was already fulfilled',()=>{
  expect(getPlusServiceDeparture(member,{...progress,remaining:0,delivered:2},{pending:true},start+15*86400000)).toMatchObject({state:'archived',reason:'target_met',endsAt:member.cancelledAt});
 });
 it('uses the last actual delivery when completion happened after the request',()=>{
  const deliveredAt=start+12*86400000;
  expect(getPlusServiceDeparture(member,{...progress,remaining:0,delivered:2},{pending:true,lastManualProposalAt:deliveredAt},start+15*86400000).endsAt).toBe(deliveredAt);
 });
 it('does not archive a normal active membership merely because its target is met',()=>{
  expect(getPlusServiceDeparture({...member,billingStatus:'active',cancelledAt:null},{...progress,remaining:0,delivered:2},{},start+15*86400000).state).toBe('not_requested');
 });
 it('preserves an existing staff-confirmed archive',()=>{
  const m={...member,status:'churned',billingStatus:'ended',endedAt:member.cancelledAt};
  expect(getPlusServiceDeparture(m,progress,{pending:false},start+15*86400000)).toMatchObject({state:'archived',endsAt:member.cancelledAt});
 });
 it('holds missing dates for review rather than inventing a service end',()=>{
  expect(getPlusServiceDeparture({...member,cancelledAt:null},progress,{pending:true},start+15*86400000).state).toBe('needs_review');
  expect(getPlusServiceDeparture(member,{...progress,cycleStart:0,cycleEnd:0},{pending:true},start+15*86400000).state).toBe('needs_review');
 });
 it('does not mutate provider, membership or evidence when computing display',()=>{
  const before=JSON.stringify(member);getPlusServiceDeparture(member,progress,{pending:true},end);
  expect(JSON.stringify(member)).toBe(before);expect(member.billingStatus).toBe('cancelled');
 });
 it('keeps cancelled memberships in the matching queue only during the remaining cycle',()=>{
  expect(calculatePlusServiceProgress(member,[],start+15*86400000).needsMatches).toBe(true);
  expect(calculatePlusServiceProgress(member,[],end).needsMatches).toBe(false);
  expect(calculatePlusServiceProgress(member,[],end+PLUS_SERVICE_CYCLE_MS).cycleEnd).toBe(end);
 });
});
