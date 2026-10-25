import { beforeEach, describe, expect, it, vi } from "vitest";
import { completedPayments, growPaymentReceipts } from "../drizzle/schema";
const m = vi.hoisted(()=>({getDb:vi.fn(),inquiry:vi.fn()}));
vi.mock("./db",()=>({getDb:m.getDb}));
vi.mock("./growInquiry",()=>({verifyGrowTransaction:m.inquiry}));
import {classifyGrowAccounting,encryptGrowReferences,decryptGrowReferences,growReceiptKey,growReceiptConflict,recordGrowPaymentOnce,growAccountingPaidAt,type AccountingInput} from "./growPaymentAccounting";
const input: AccountingInput = {transactionId:"123456",transactionToken:"a123456789abcdef",processToken:"checkout-synthetic",product:"database",email:"synthetic@example.test",amountAgorot:29900,receivedAt:Date.parse("2026-10-13T11:00:00Z"),paymentDate:"13/10/26"};
function harness() {
 const receipts = new Map<string,any>(), ledger:any[]=[];
 let target=input.transactionId;
 let lock=Promise.resolve();
 const insert = (table:unknown)=>({values:async (row:any)=>{
   if(table===growPaymentReceipts){if(receipts.has(row.receiptKey))throw Object.assign(new Error("duplicate"),{code:"ER_DUP_ENTRY"});receipts.set(row.receiptKey,row);}
   else {if(ledger.some(r=>r.transactionId===row.transactionId))throw Object.assign(new Error("duplicate"),{code:"ER_DUP_ENTRY"});ledger.push(row);}
 }});
 const db:any={
  select:()=>({from:(table:unknown)=>({where:()=>({limit:async()=> table===growPaymentReceipts
    ? [...receipts.values()].filter(r=>r.receiptKey===growReceiptKey(target))
    : ledger.filter(r=>r.transactionId===target)})})}),
  insert,
  update:()=>({set:(patch:any)=>({where:async()=>{Object.assign([...receipts.values()][0]||{},patch);}})}),
  transaction:async(fn:any)=>{
    const previous=lock;let release!:()=>void;lock=new Promise<void>(r=>{release=r;});await previous;
    const savedR=new Map(receipts),savedL=[...ledger];
    const update=()=>({set:(patch:any)=>({where:async()=>{
      const r=receipts.get(patch.receiptKey);if(!r||["verified","duplicate_existing"].includes(r.state))return [{affectedRows:0}];
      receipts.set(patch.receiptKey,{...r,...patch});return [{affectedRows:1}];
    }})});
    try{return await fn({insert,update});}catch(e){receipts.clear();for(const[k,v]of savedR)receipts.set(k,v);ledger.splice(0,ledger.length,...savedL);throw e;}
    finally{release();}
  }

 };
 return {db,receipts,ledger,setTarget:(v:string)=>{target=v;}};
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("NODE_ENV","production");vi.stubEnv("JWT_SECRET","synthetic-accounting-secret");m.inquiry.mockResolvedValue({state:"confirmed",verified:{providerAmountAgorot:29900}});});
describe("Grow forward accounting",()=>{
 it("requires canonical provider identity and rejects SDK callback IDs",()=>{
  expect(classifyGrowAccounting(input)).toBe("eligible");
  expect(classifyGrowAccounting({...input,transactionId:"sdk-opaque-token"})).toBe("missing_provider_identity");
  expect(classifyGrowAccounting({...input,statusCode:0})).toBe("non_paid_status");
 });
 it("does not invent an historical receipt's paid date or accept invalid future dates",()=>{
  expect(classifyGrowAccounting({...input,paymentDate:"12/10/26"})).toBe("historical_notification");
  expect(classifyGrowAccounting({...input,paymentDate:"32/10/26"})).toBe("invalid_provider_date");
  expect(classifyGrowAccounting({...input,paymentDate:"14/10/26"})).toBe("future_provider_date");
 });
 it("identity does not use purchaser, amount, process or product",()=>{
  expect(growReceiptKey("123456")).toBe(growReceiptKey("123456"));
  expect(growReceiptKey("123457")).not.toBe(growReceiptKey("123456"));
  expect(growReceiptConflict({product:"database",amountAgorot:29900},input)).toBe(false);
  expect(growReceiptConflict({product:"plus",amountAgorot:29900},input)).toBe(true);
 });
 it("encrypts only whitelisted references with authenticated encryption",()=>{
  const refs={transactionId:input.transactionId,transactionToken:input.transactionToken,processToken:input.processToken};
  const encrypted=encryptGrowReferences(refs);expect(encrypted).not.toContain(refs.transactionToken);expect(decryptGrowReferences(encrypted)).toEqual(refs);
  expect(()=>decryptGrowReferences(encrypted,"wrong-key")).toThrow();
 });
 it("records exactly once even after the old ten-minute window and preserves the original amount",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);
  expect(await recordGrowPaymentOnce(input)).toBe("recorded");
  expect(await recordGrowPaymentOnce({...input,receivedAt:input.receivedAt+3600000})).toBe("duplicate");
  expect(h.ledger).toHaveLength(1);expect(h.receipts.size).toBe(1);expect(m.inquiry).toHaveBeenCalledTimes(1);
  expect(h.ledger[0].amountAgorot).toBe(29900);
 });
 it("a provider mismatch is review only and cannot create revenue",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);m.inquiry.mockResolvedValue({state:"mismatch",verified:{providerAmountAgorot:9900}});
  expect(await recordGrowPaymentOnce(input)).toBe("review");expect(h.ledger).toHaveLength(0);expect([...h.receipts.values()][0].state).toBe("review");
 });
 it("SDK success only never creates a ledger row",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);
  expect(await recordGrowPaymentOnce({...input,transactionId:"sdk-opaque-token",transactionToken:""})).toBe("review");expect(h.ledger).toHaveLength(0);
 });
 it("a conflicting retry cannot rewrite the previous amount",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);await recordGrowPaymentOnce(input);
  expect(await recordGrowPaymentOnce({...input,amountAgorot:9900})).toBe("review");expect(h.ledger[0].amountAgorot).toBe(29900);expect([...h.receipts.values()][0].category).toBe("conflicting_notification");
 });
 it("a pre-rollout exact ledger transaction is not modified",async()=>{
  const h=harness();h.ledger.push({...input,paidAt:1});m.getDb.mockResolvedValue(h.db);
  expect(await recordGrowPaymentOnce(input)).toBe("duplicate");expect(h.ledger).toHaveLength(1);expect(h.ledger[0].paidAt).toBe(1);expect(m.inquiry).not.toHaveBeenCalled();
 });
 it("a persistence failure is not silently reclassified as duplicate",async()=>{
  const h=harness();h.db.transaction=async()=>{throw Object.assign(Error("network"),{code:"ECONNRESET"});};m.getDb.mockResolvedValue(h.db);
  await expect(recordGrowPaymentOnce(input)).rejects.toThrow("grow_accounting_persistence_failed");expect(h.ledger).toHaveLength(0);
 });
 it("temporary inquiry failure stays out of revenue and can be promoted by provider retry",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);m.inquiry.mockResolvedValueOnce({state:"unavailable"});
  expect(await recordGrowPaymentOnce(input)).toBe("pending");expect(h.ledger).toHaveLength(0);
  expect(await recordGrowPaymentOnce({...input,receivedAt:input.receivedAt+600000})).toBe("recorded");
  expect(h.ledger).toHaveLength(1);expect([...h.receipts.values()][0].state).toBe("verified");
 });
 it("records a bound TEST1 diagnostic receipt without creating a revenue ledger row",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);
  const diagnostic={...input,product:"plus",amountAgorot:100,couponCode:"TEST1",testCheckout:true};
  expect(await recordGrowPaymentOnce(diagnostic)).toBe("recorded");
  expect(h.ledger).toHaveLength(0);
  expect([...h.receipts.values()][0]).toMatchObject({state:"verified",category:"test_checkout",amountAgorot:100});
  expect(m.inquiry).toHaveBeenCalledWith(expect.objectContaining({product:"plus",expectedAmountAgorot:100}));
 });
 it("separate Boosts and renewals are not collapsed by purchaser, time or amount",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);
  await recordGrowPaymentOnce({...input,product:"match_boost",amountAgorot:1990});
  h.setTarget("123457");await recordGrowPaymentOnce({...input,transactionId:"123457",product:"match_boost",amountAgorot:1990});
  h.setTarget("123458");await recordGrowPaymentOnce({...input,transactionId:"123458",product:"plus",amountAgorot:9900});
  expect(h.ledger).toHaveLength(3);
 });
 it("two concurrent notifications create one receipt and one ledger row",async()=>{
  const h=harness();m.getDb.mockResolvedValue(h.db);
  const results=await Promise.all([recordGrowPaymentOnce(input),recordGrowPaymentOnce(input)]);
  expect(results.sort()).toEqual(["duplicate","recorded"]);expect(h.ledger).toHaveLength(1);expect(h.receipts.size).toBe(1);
 });
 it("a callback received the next day retains Grow's business date",()=>{
  const delayed=Date.parse("2026-10-14T11:00:00Z");
  expect(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(new Date(growAccountingPaidAt("13/10/26",delayed)))).toBe("2026-10-13");
 });
 it("development cannot inquire or persist",async()=>{
  vi.stubEnv("NODE_ENV","development");expect(await recordGrowPaymentOnce(input)).toBe("disabled");expect(m.getDb).not.toHaveBeenCalled();expect(m.inquiry).not.toHaveBeenCalled();
 });
});
