import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocked=vi.hoisted(()=>({getDb:vi.fn()}));
vi.mock('./db',()=>({getDb:mocked.getDb}));
import {completedPayments,paymentLeads,plusPilotMembers,purchaseRecoveryRecipients,singles} from '../drizzle/schema';
import {RECOVERY_CAMPAIGN,RECOVERY_OFFER_EXPIRES_AT,recoveryOfferCode} from '../shared/purchaseRecoveryLinks';
import {createPurchaseRecoveryCheckoutReference,redeemPurchaseRecoveryOffer,reservePurchaseRecoveryOffer,bindPurchaseRecoveryProviderProcess} from './purchaseRecoveryOffers';
const now=RECOVERY_OFFER_EXPIRES_AT-60*60*1000;
const email='recovery-synthetic@example.test';
function harness(product:'database'|'session'|'plus'='database'){
 const row:any={id:7,campaignKey:RECOVERY_CAMPAIGN,email,product,offerCode:recoveryOfferCode(product),suppressionReason:null,offerCheckoutRef:null,offerReservedUntil:null,offerRedeemedAt:null,offerTransactionId:null};
 let affected=1;
 const db:any={};
 db.select=vi.fn(()=>{let table:any;const q:any={};q.from=vi.fn((t:any)=>{table=t;return q;});q.where=vi.fn(()=>q);q.limit=vi.fn(()=>q);q.for=vi.fn(()=>q);q.then=(ok:any,bad:any)=>Promise.resolve(table===purchaseRecoveryRecipients?[{...row}]:table===singles?[{id:4,isPaid:product==='plus',isActive:true,isSeed:false,market:'IL'}]:table===plusPilotMembers?[]:table===completedPayments||table===paymentLeads?[]:[]).then(ok,bad);return q;});
 db.update=vi.fn((table:any)=>({set:vi.fn((patch:any)=>({where:vi.fn(async()=>{if(affected&&table===purchaseRecoveryRecipients)Object.assign(row,patch);return [{affectedRows:affected}];})}))}));
 db.transaction=vi.fn((fn:any)=>fn(db));
 return {db,row,setAffected:(n:number)=>affected=n};
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('JWT_SECRET','synthetic-recovery-secret-at-least-32-characters');vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('Providers forbidden');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Recovery coupon reservation and exact verified-payment redemption',()=>{
 it('reserves and binds once, then redeems exact database agorot and tolerates same-transaction replay',async()=>{
  const h=harness();mocked.getDb.mockResolvedValue(h.db);
  const reserved=await reservePurchaseRecoveryOffer({email,product:'database',code:'MATCH10',now});
  expect(reserved.offer.fixedPrice).toBe(269.1);expect(h.row.offerCheckoutRef).toMatch(/^recovery-reservation:/);
  await bindPurchaseRecoveryProviderProcess({reference:reserved.reference,email,product:'database',processToken:'synthetic-process',now});
  expect(h.row.offerCheckoutRef).toBe('synthetic-process');
  const args={reference:reserved.reference,email,product:'database',processToken:'synthetic-process',transactionId:'synthetic-tx',amountAgorot:26910,now};
  await expect(redeemPurchaseRecoveryOffer(args)).resolves.toMatchObject({redeemed:true,alreadyRedeemed:false});
  expect(h.row.offerTransactionId).toBe('synthetic-tx');const writes=h.db.update.mock.calls.length;
  await expect(redeemPurchaseRecoveryOffer(args)).resolves.toMatchObject({redeemed:true,alreadyRedeemed:true});
  expect(h.db.update).toHaveBeenCalledTimes(writes);expect(fetch).not.toHaveBeenCalled();
 });
 it.each([26900,26911,29900])('rejects wrong amount %i before any DB access',async amountAgorot=>{
  const reference=createPurchaseRecoveryCheckoutReference({recipientId:7,email,product:'database',now});
  await expect(redeemPurchaseRecoveryOffer({reference,email,product:'database',processToken:'synthetic-process',transactionId:'synthetic-tx',amountAgorot,now})).rejects.toThrow('purchase_recovery_payment_not_bound');
  expect(mocked.getDb).not.toHaveBeenCalled();
 });
 it('rejects a different provider process without a redemption write',async()=>{
  const h=harness();Object.assign(h.row,{offerCheckoutRef:'bound-process',offerReservedUntil:now+10000});mocked.getDb.mockResolvedValue(h.db);
  const reference=createPurchaseRecoveryCheckoutReference({recipientId:7,email,product:'database',now});
  await expect(redeemPurchaseRecoveryOffer({reference,email,product:'database',processToken:'other-process',transactionId:'synthetic-tx',amountAgorot:26910,now})).rejects.toThrow('purchase_recovery_payment_not_bound');
  expect(h.db.update).not.toHaveBeenCalled();
 });
 it('rejects reuse with another transaction after a successful redemption',async()=>{
  const h=harness();Object.assign(h.row,{offerCheckoutRef:'synthetic-process',offerReservedUntil:now+10000,offerRedeemedAt:now,offerTransactionId:'first-tx'});mocked.getDb.mockResolvedValue(h.db);
  const reference=createPurchaseRecoveryCheckoutReference({recipientId:7,email,product:'database',now});
  await expect(redeemPurchaseRecoveryOffer({reference,email,product:'database',processToken:'synthetic-process',transactionId:'other-tx',amountAgorot:26910,now})).rejects.toThrow('purchase_recovery_offer_already_redeemed');
  expect(h.db.update).not.toHaveBeenCalled();
 });
 it('fails closed on a reservation CAS race before opening any provider',async()=>{
  const h=harness();h.setAffected(0);mocked.getDb.mockResolvedValue(h.db);
  await expect(reservePurchaseRecoveryOffer({email,product:'database',code:'MATCH10',now})).rejects.toThrow('purchase_recovery_reservation_race');expect(fetch).not.toHaveBeenCalled();
 });
 it('accepts a delayed callback only for a previously bound in-window checkout',async()=>{
  const h=harness('session');Object.assign(h.row,{offerCheckoutRef:'synthetic-process',offerReservedUntil:now+10000});mocked.getDb.mockResolvedValue(h.db);
  const reference=createPurchaseRecoveryCheckoutReference({recipientId:7,email,product:'session',now});
  await expect(redeemPurchaseRecoveryOffer({reference,email,product:'session',processToken:'synthetic-process',transactionId:'synthetic-tx',amountAgorot:45000,now:RECOVERY_OFFER_EXPIRES_AT+60000})).resolves.toMatchObject({redeemed:true});
  expect(fetch).not.toHaveBeenCalled();
 });
});
