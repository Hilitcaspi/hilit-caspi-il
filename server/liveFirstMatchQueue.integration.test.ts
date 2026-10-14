import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const dbMock=vi.hoisted(()=>({execute:vi.fn(), getDb:vi.fn()}));
vi.mock("./db",()=>({getDb:dbMock.getDb}));
import { loadLiveFirstMatchQueue } from "./liveFirstMatchQueue";
import { LIVE_FIRST_MATCH_OFFER_START, LIVE_FIRST_MATCH_OFFER_END, LIVE_FIRST_MATCH_EVENT_START, LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE } from "../shared/liveFirstMatchPolicy";
const now=LIVE_FIRST_MATCH_EVENT_START-60_000;
const paidAt=LIVE_FIRST_MATCH_OFFER_START+60_000;
function row(extra:Record<string,unknown>={}){
 return {ticket_id:10,ticket_name:"פרופיל דמה",ticket_issued_at:paidAt,paid_registration_at:paidAt,single_id:11,first_name:"פרופיל",last_name:"דמה",age:30,city:"עיר דמה",gender:"male",seeking_gender:"female",photo_url:"/synthetic-photo.svg",questionnaire_completed_at:paidAt,is_active:1,is_paid:1,is_seed:0,match_id:null,match_status:null,match_proposed_at:null,match_approval_expires_at:null,match_owner_approved_at:null,match_approval_token_a:null,match_approval_token_b:null,match_single_a_token:null,match_single_b_token:null,match_email_a_opened_at:null,match_email_b_opened_at:null,match_token_a_used_at:null,match_token_b_used_at:null,match_approved_by_a:null,match_approved_by_b:null,match_email_retried_at:null,match_wa_sent_at:null,match_notes:null,match_matched_at:null,match_contact_revealed_at:null,match_returned_to_pool_at:null,match_detail_status:null,delivered_at:null,...extra};
}
beforeEach(()=>{vi.resetAllMocks();dbMock.getDb.mockResolvedValue({execute:dbMock.execute});});
describe("live queue query and mapping with no real DB",()=>{
 it("maps complete paid profile to ready and accepted delivered proposal to fulfilled",async()=>{
  dbMock.execute.mockResolvedValue([[row(),row({ticket_id:12,single_id:13,match_id:14,match_status:"proposed",match_proposed_at:paidAt+1000,match_approval_token_a:"synthetic-proof",delivered_at:paidAt+1000})],[]]);
  const x=await loadLiveFirstMatchQueue(now);expect(x.summary).toMatchObject({total:2,ready:1,fulfilled:1});expect(x.policyStatus).toBe("active");expect(x.rows.every(y=>y.originalPromiseDeadline===LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE)).toBe(true);
  expect(dbMock.execute).toHaveBeenCalledTimes(1);
 });
 it("generated match with misleading delivery field never fulfils the promise",async()=>{
  dbMock.execute.mockResolvedValue([[row({match_id:14,match_status:"pending",delivered_at:paidAt+1000})],[]]);
  expect((await loadLiveFirstMatchQueue(now)).rows[0].state).toBe("ready");
 });
 it("rejects delivery before paid registration and releases an expired nonmutual proposal",async()=>{
  dbMock.execute.mockResolvedValue([[row({match_id:14,match_status:"proposed",match_proposed_at:paidAt+1000,match_approval_expires_at:now-1,match_approval_token_a:"synthetic-proof",delivered_at:paidAt-1})],[]]);
  expect((await loadLiveFirstMatchQueue(now)).rows[0].state).toBe("ready");
 });
 it("current sent proposal holds while active mutual holds even after proposal expiry",async()=>{
  dbMock.execute.mockResolvedValue([[row({match_id:14,match_status:"proposed",match_proposed_at:now-1000,match_approval_expires_at:now+1000,match_approval_token_a:"synthetic-proof"}),row({ticket_id:12,single_id:13,match_id:15,match_status:"matched",match_proposed_at:paidAt,match_approval_token_a:"synthetic-proof",match_matched_at:paidAt+1000})],[]]);
  expect((await loadLiveFirstMatchQueue(now)).summary.needsReview).toBe(2);
 });
 it("does not hide overdue incomplete or late profiles",async()=>{
  dbMock.execute.mockResolvedValue([[row({photo_url:null,questionnaire_completed_at:LIVE_FIRST_MATCH_EVENT_START+1})],[]]);
  const x=(await loadLiveFirstMatchQueue(LIVE_FIRST_MATCH_ORIGINAL_PROMISE_DEADLINE+1)).rows[0];expect(x.state).toBe("overdue");expect(x.completedAfterLive).toBe(true);expect(x.profileRequirementsMissing).toContain("photo");
 });
 it("SQL selects required fields/aliases and joins exact real payment+per-side delivery without writing",async()=>{
  dbMock.execute.mockResolvedValue([[],[]]);await loadLiveFirstMatchQueue(now);
  const q=new MySqlDialect().sqlToQuery(dbMock.execute.mock.calls[0][0]);
  expect(q.sql.trim().startsWith("WITH eligible_tickets")).toBe(true);expect(q.sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
  for(const f of ["s.age","s.city","s.gender","s.seekingGender","rs.firstName AS first_name","rs.photoUrl AS photo_url","rs.isActive AS is_active","rs.isPaid AS is_paid","cp.transaction_id = t.provider_transaction_id","mde.singleId = rs.id","mde.status = 'accepted'","cp.amount_agorot >= 29900","br.match_id = mm.match_id"]){expect(q.sql).toContain(f);}
  expect(q.params).toContain("matching-secrets-2026-10-31");expect(q.params).toContain(LIVE_FIRST_MATCH_OFFER_START);expect(q.params).toContain(LIVE_FIRST_MATCH_OFFER_END);expect(q.sql).not.toContain("AND t.issued_at <");
 });
});
