import {describe,it,expect,vi} from 'vitest';
vi.mock('./purchaseRecoveryCampaign',()=>({runPurchaseRecoveryCampaign:vi.fn()}));
import {recoveryScheduleAuthorized} from './purchaseRecoverySchedule';
describe('recovery scheduled callback authorization',()=>{
 it('rejects no user, admin-only, header-only, missing UID and a different UID',()=>{
  for(const u of [null,{role:'admin'},{isCron:true},{isCron:true,taskUid:'other'}])expect(recoveryScheduleAuthorized(u,'bound')).toBe(false);
 });
 it('requires verified cron session AND matching stored task UID',()=>{
  expect(recoveryScheduleAuthorized({isCron:true,taskUid:'bound'},'bound')).toBe(true);
  expect(recoveryScheduleAuthorized({isCron:true,taskUid:'bound'},null)).toBe(false);
 });
});
