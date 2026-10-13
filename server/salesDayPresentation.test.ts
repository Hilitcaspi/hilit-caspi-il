import {describe,expect,it} from 'vitest';
import {israelSalesDay,splitSalesVisibleDay} from '../shared/salesDayPresentation';
import {readFileSync} from 'node:fs';
import {chooseAcquisition,diagnoseSalesSource,type PaymentRow} from './salesIntelligence';
import {explainSalesSourceEvidence} from '../shared/salesSourcePresentation';
const now=Date.parse('2026-10-13T19:00:00+03:00');
const payment:PaymentRow={id:1,email:'synthetic@example.test',transactionId:'synthetic',product:'database',amountAgorot:29900,amountSource:'grow',couponCode:null,paidAt:now};
const history=(extra:any)=>({email:payment.email,createdAt:now-3600000,sourceKind:'legacy' as const,...extra});
describe('purchase-day compact presentation',()=>{
 it('splits by Israel midnight rather than browser timezone',()=>{
 const rows=[{paidAt:Date.parse('2026-10-12T21:00:00Z')},{paidAt:Date.parse('2026-10-12T20:59:59Z')}];
 expect(israelSalesDay(rows[0].paidAt)).toBe('2026-10-13');
 expect(splitSalesVisibleDay(rows,now,now)).toMatchObject({day:'2026-10-13',visible:[rows[0]],older:[rows[1]]});
 });
 it('shows selected historical day even when empty, without silently substituting a different day',()=>{
 const previous=Date.parse('2026-10-12T23:59:59+03:00');
 expect(splitSalesVisibleDay([{paidAt:now}],previous,now).visible).toEqual([]);
 expect(splitSalesVisibleDay([{paidAt:previous}],previous,now).visible).toHaveLength(1);
 });
 it('handles DST winter and summer days and never mutates input',()=>{
 expect(israelSalesDay(Date.parse('2026-12-01T22:00:00Z'))).toBe('2026-12-02');
 const rows=[{paidAt:now}];splitSalesVisibleDay(rows,now,now);expect(rows).toEqual([{paidAt:now}]);
 });
 it('keeps historical list closed and bounded, while period summary stays product scoped',()=>{
 const ui=readFileSync(new URL('../client/src/components/SalesSourcesTable.tsx',import.meta.url),'utf8');
 expect(ui).toContain('splitSalesVisibleDay(rows');expect(ui).toContain('rows={dayRows.visible}');expect(ui).toContain('rows={dayRows.older}');
 expect(ui).toContain('max-h-[28rem] overflow-y-auto');expect(ui).not.toContain('<details open');expect(ui).toContain('summarizeSalesSources(productSales)');
 });
});
describe('source-gap evidence safeguards',()=>{
 it('does not allow a lifecycle label to mask a real source record',()=>{
 const evidence=[history({source:'paid_database',createdAt:now-7200000}),history({utmSource:'meta',utmMedium:'paid_social',utmCampaign:'synthetic-campaign'})];
 expect(chooseAcquisition(payment,evidence).channelSource).toBe('meta');
 expect(chooseAcquisition(payment,[history({source:'dna_quiz'})]).channelSource).toBe('');
 });
 it('uses explicitly linked DNA evidence and rejects future events',()=>{
 expect(chooseAcquisition(payment,[history({sourceKind:'linked_dna',utmSource:'facebook',utmMedium:'paid_social'})]).channelSource).toBe('facebook');
 expect(chooseAcquisition(payment,[history({sourceKind:'linked_dna',utmSource:'facebook',createdAt:now+1000})]).channelSource).toBe('');
 });
 it('reports late mutable CRM evidence without attributing it or emitting personal fields',()=>{
 const result=diagnoseSalesSource(payment,[history({sourceKind:'crm',utmSource:'meta',updatedAt:now+1000})]);
 expect(result).toEqual({checkoutTagged:false,priorSourceFound:false,mutableCrmAfterPurchase:true,capturedFirstTouch:false});
 expect(Object.values(result).every(v=>typeof v==='boolean')).toBe(true);
 });
 it('shows specific gaps and distinguishes recorded discovery from an unknown checkout',()=>{
 const source={channel:'ישיר / לא ידוע',campaign:'ללא קמפיין',confidence:'לא נמצא'};
 const sale={closing:source,acquisition:source,sourceDiagnostics:diagnoseSalesSource(payment,[])};
 expect(explainSalesSourceEvidence(sale)).toContain('אין תיוג מקור בעסקה');
 expect(explainSalesSourceEvidence({...sale,sourceDiagnostics:{...sale.sourceDiagnostics,mutableCrmAfterPurchase:true}})).toContain('עודכנה אחרי הרכישה');
 expect(explainSalesSourceEvidence({...sale,acquisition:{channel:'Meta Ads (ממומן)',campaign:'קמפיין בדיקה',confidence:'תיעוד'}})).toContain('מקור ההיכרות מתועד');
 });
});
