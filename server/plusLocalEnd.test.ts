import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { endPlusLocally } from "./plusLocalEnd";
import { plusPilotMembers, crmTeamTasks } from "../drizzle/schema";
import { plusPilotRouter } from "./plusPilotRouter";
function fakeDb(member:any,failAudit=false) {
 const writes:any[]=[];
 const tx:any={select:()=>({from:()=>({where:()=>({limit:()=>({for:()=>Promise.resolve(member?[member]:[])})})})}),
 update:(table:any)=>({set:(values:any)=>({where:async()=>writes.push({table,values})})}),
 insert:(table:any)=>({values:async(values:any)=>{if(failAudit)throw Error('synthetic audit failure');writes.push({table,values});}})};
 const db={transaction:vi.fn(async(fn:any)=>fn(tx))};return {db,writes};
}
describe('local Plus end without provider action',()=>{
 it('rejects anonymous and non-admin callers before any database operation',async()=>{
  const base={req:{headers:{}},res:{},user:null,teamMember:null};
  await expect(plusPilotRouter.createCaller(base as any).adminEndMembership({id:1,providerStoppedConfirmed:true})).rejects.toMatchObject({code:'UNAUTHORIZED'});
  await expect(plusPilotRouter.createCaller({...base,user:{role:'user'}} as any).adminEndMembership({id:1,providerStoppedConfirmed:true})).rejects.toMatchObject({code:'FORBIDDEN'});
 });
 it('rejects missing provider-stop confirmation even for an admin',async()=>{
  const caller=plusPilotRouter.createCaller({req:{headers:{}},res:{},user:{role:'admin'},teamMember:null} as any);
  await expect(caller.adminEndMembership({id:1,providerStoppedConfirmed:false} as any)).rejects.toMatchObject({code:'BAD_REQUEST'});
 });
 it('atomically ends Plus and records a local staff action only',async()=>{
  const {db,writes}=fakeDb({id:1,singleId:2,status:'active',billingStatus:'active'});
  expect(await endPlusLocally(db,1,1000)).toEqual({success:true,alreadyEnded:false,providerChanged:false});
  expect(db.transaction).toHaveBeenCalledOnce();expect(writes.length).toBe(3);
  expect(writes[0].table).toBe(plusPilotMembers);expect(writes[0].values).toEqual({status:'churned',billingStatus:'ended',premiumSupportEnabled:false,nextBillingAt:null,endedAt:1000,cancelledAt:1000,updatedAt:1000});
  expect(writes[1].table).toBe(crmTeamTasks);expect(writes[1].values.status).toBe('cancelled');
  expect(writes[2].values.createdBy).toBe('plus_local_end');expect(writes[2].values.status).toBe('done');
  expect(writes[0].values).not.toHaveProperty('billingCycleStartedAt');expect(writes[0].values).not.toHaveProperty('lastPaymentAt');
 });
 it('makes repeat end idempotent without another audit or record write',async()=>{
  const {db,writes}=fakeDb({id:1,singleId:2,status:'churned',billingStatus:'ended'});
  expect((await endPlusLocally(db,1,2000)).alreadyEnded).toBe(true);expect(writes).toEqual([]);
 });
 it('preserves a previously recorded cancellation timestamp',async()=>{
  const {db,writes}=fakeDb({id:1,singleId:2,status:'active',billingStatus:'cancelled',cancelledAt:900});await endPlusLocally(db,1,1000);expect(writes[0].values.cancelledAt).toBe(900);
 });
 it('rejects missing members before any write',async()=>{
  const {db,writes}=fakeDb(null);await expect(endPlusLocally(db,1)).rejects.toMatchObject({code:'NOT_FOUND'});expect(writes).toEqual([]);
 });
 it('rejects a waitlist entry rather than treating it as a subscription',async()=>{
  const {db,writes}=fakeDb({status:'waitlist'});await expect(endPlusLocally(db,1)).rejects.toMatchObject({code:'BAD_REQUEST'});expect(writes).toEqual([]);
 });
 it('propagates failures through the transaction rather than pretending success',async()=>{
  const {db}=fakeDb({id:1,singleId:2,status:'active'},true);await expect(endPlusLocally(db,1)).rejects.toThrow('synthetic audit failure');
 });
 it('exposes only a team-only route that requires literal provider-stop confirmation',()=>{
  const source=readFileSync(new URL('./plusPilotRouter.ts',import.meta.url),'utf8');const section=source.split('adminEndMembership:')[1].split('adminUpdateSubscription:')[0];
  expect(section).toContain('teamProcedure');expect(section).toContain('providerStoppedConfirmed: z.literal(true)');expect(section).toContain('assertAdmin(ctx)');
  const local=readFileSync(new URL('./plusLocalEnd.ts',import.meta.url),'utf8');expect(local).not.toMatch(/sendEmail|fetch\(|notifyOwner|plusPaymentEvents|completedPayments|update\(singles\)/);expect(local).toContain('.for("update")');
 });
 it('keeps archive collapsed and prevents a local end before staff confirmation',()=>{
  const ui=readFileSync(new URL('../client/src/components/PlusPilotAdminSection.tsx',import.meta.url),'utf8');expect(ui).toContain('!row.archived');expect(ui).toContain('מנויי Plus שהסתיימו · ארכיון');expect(ui).toContain('disabled={!providerStopped');expect(ui).toContain('מחזור שירות אינו אישור תשלום');expect(ui).toContain('הצג מנויים שצריכים התאמות');
 });
});
