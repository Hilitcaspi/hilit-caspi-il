import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mock = vi.hoisted(()=>({db:null as any}));
vi.mock('./db',()=>({getDb:async()=>mock.db}));
import { rankAdvancedCandidates, scoreAdvancedPair } from './advancedMatchRanking';
import { computeFullScoreAdmin, computeFullScore } from './compatibility';
const person=(id:number,extra:any={})=>({id,gender:id===1?'female':'male',seekingGender:id===1?'male':'female',age:30,city:'חיפה',locationPreference:'close',religiosity:'secular',dnaType:'anchor',hasKids:false,isActive:true,isSeed:false,...extra});
const prepare=(people:any[],answers:any[]=[],matches:any[]=[])=>{
 const results=[people,answers,matches];const select=vi.fn(()=>({from:()=>({where:async()=>results.shift()})}));mock.db={select};return select;
};
describe('advanced bulk ranking, no sends or narrative generation',()=>{
 beforeEach(()=>{mock.db=null});
 it('uses exactly the regular deterministic admin and strict algorithms',()=>{
  const a=person(1),b=person(2);const fast=scoreAdvancedPair(a,b,[],[]),full=computeFullScoreAdmin(a as any,b as any,[],[]),strict=computeFullScore(a as any,b as any,[],[]);
  expect(fast.score).toBe(full.total);expect(fast.hasHardBlock).toBe(strict.total===0);expect(fast.breakdown).toEqual({questionnaire:full.questionnaire,lifeStage:full.lifeStage,dna:full.dna,practical:full.practical,religiosity:full.religiosity,education:full.education,cityIntelligence:full.cityIntelligence});expect(fast.narrativeDeferred).toBe(true);
 });
 it('ranks all candidates with only three bulk reads and returns no private records',async()=>{
  const people=[person(1),...Array.from({length:213},(_,i)=>person(i+2,{photoUrl:'private-photo',questionnaireToken:'synthetic-private-token'}))];const select=prepare(people);const out=await rankAdvancedCandidates(1,people.slice(1).map(p=>p.id));expect(select).toHaveBeenCalledTimes(3);expect(out.results).toHaveLength(213);expect(out.results[0].breakdown.cityIntelligence).toBe(100);
  const json=JSON.stringify(out);for(const field of ['questionnaireToken','private-photo','synthetic-private-token','answersJson','approvalToken','notes','personA','personB'])expect(json).not.toContain(field);
  expect(out.results.every((p,i)=>i===0||p.score<=out.results[i-1].score)).toBe(true);
 });
 it('excludes active, prior sent, inactive and seed candidates but keeps generated unsent rows',async()=>{
  const people=Array.from({length:7},(_,i)=>person(i+1));people[4].isActive=false;people[5].isSeed=true;
  const now=Date.now();prepare(people,[],[
   {singleAId:2,singleBId:99,status:'proposed',proposedAt:now-1000,ownerApprovedAt:now-1000},
   {singleAId:3,singleBId:1,status:'rejected',proposedAt:now-500000,ownerApprovedAt:now-500000},
   {singleAId:4,singleBId:1,status:'pending',proposedAt:now-1000},
  ]);
  const out=await rankAdvancedCandidates(1,[2,3,4,5,6,7]);expect(out.results.map(p=>p.id)).toEqual([4,7]);expect(out.excludedIds).toEqual([2,3,5,6]);
 });
 it('refuses a missing or inactive target',async()=>{
  prepare([person(2)]);await expect(rankAdvancedCandidates(1,[2])).rejects.toMatchObject({code:'NOT_FOUND'});
  prepare([person(1,{isActive:false}),person(2)]);await expect(rankAdvancedCandidates(1,[2])).rejects.toMatchObject({code:'NOT_FOUND'});
 });
 it('refuses ranking for an occupied target and never creates a proposal',async()=>{
  prepare([person(1),person(2)],[],[{singleAId:1,singleBId:99,status:'matched',matchedAt:Date.now()}]);await expect(rankAdvancedCandidates(1,[2])).rejects.toMatchObject({code:'CONFLICT'});
 });
 it('returns strict blocker and override safety just like single-pair check',()=>{
  const out=scoreAdvancedPair(person(1,{minAgePreference:40,maxAgePreference:50}),person(2,{age:25}),[],[]);expect(out.hasHardBlock).toBe(true);expect(out.canOverrideCriteria).toBe(true);expect(out.warnings.length).toBeGreaterThan(0);
 });
 it('contains no narrative or write/send path and route is team-only and bounded',()=>{
  const source=readFileSync(new URL('./advancedMatchRanking.ts',import.meta.url),'utf8');expect(source).not.toMatch(/buildMatchExplanation|sendEmail|sendSms|createAndSendMatch|\.insert\(|\.update\(|fetch\(/);
  const router=readFileSync(new URL('./routers.ts',import.meta.url),'utf8').split('rankAdvancedCandidates: teamProcedure')[1].split('checkCompatibility:')[0];expect(router).toContain('.max(2000)');
 });
});
