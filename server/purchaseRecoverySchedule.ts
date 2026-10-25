import type { Express } from 'express';
import { and, eq, or } from 'drizzle-orm';
import { sdk } from './_core/sdk';
import { getDb } from './db';
import { purchaseRecoveryRecipients } from '../drizzle/schema';
import { RECOVERY_CAMPAIGN } from '../shared/purchaseRecoveryLinks';
import { runPurchaseRecoveryCampaign } from './purchaseRecoveryCampaign';
import { deleteHeartbeatJob } from './_core/heartbeat';
import { parse as parseCookie } from 'cookie';
import { COOKIE_NAME } from '../shared/const';

/** A header or caller-provided body alone can never authorize this marketing send. */
export function recoveryScheduleAuthorized(user: {role?: string;isCron?: boolean;taskUid?: string}|null, boundTaskUid: string|null) {
  return Boolean(user?.isCron && user.taskUid && boundTaskUid && user.taskUid === boundTaskUid);
}
export function registerPurchaseRecoverySchedule(app: Express) {
  app.post('/api/scheduled/purchase-recovery-oct25', async (req,res) => {
    let user: any;
    try { user = await sdk.authenticateRequest(req); } catch {res.status(403).json({error:'cron-only'});return;}
    if(!user?.isCron || !user.taskUid){res.status(403).json({error:'cron-only'});return;}
    try {
      const db = await getDb();if(!db){res.status(503).json({error:'recovery-database-unavailable'});return;}
      const [row] = await db.select({taskUid:purchaseRecoveryRecipients.scheduleCronTaskUid}).from(purchaseRecoveryRecipients).where(and(eq(purchaseRecoveryRecipients.campaignKey,RECOVERY_CAMPAIGN),eq(purchaseRecoveryRecipients.scheduleCronTaskUid,user.taskUid))).limit(1);
      if(!recoveryScheduleAuthorized(user,row?.taskUid||null)){res.status(403).json({error:'unbound-cron'});return;}
      const result=await runPurchaseRecoveryCampaign({dryRun:false,taskUid:user.taskUid,limit:100});
      const [remaining] = await db.select({id:purchaseRecoveryRecipients.id}).from(purchaseRecoveryRecipients).where(and(eq(purchaseRecoveryRecipients.scheduleCronTaskUid,user.taskUid),or(eq(purchaseRecoveryRecipients.emailState,'queued'),eq(purchaseRecoveryRecipients.smsState,'queued')))).limit(1);
      if(result.window==='expired'||(result.window==='in_window'&&!remaining)){
        const sessionToken=parseCookie(req.headers.cookie||'')[COOKIE_NAME]||'';
        try { await deleteHeartbeatJob(user.taskUid,sessionToken); } catch { /* dates and row claims still prevent any future send */ }
      }
      // Only aggregate counts are returned or logged. Accepted is not proof of inbox delivery.
      res.json({success:true,...result});
    } catch {res.status(503).json({error:'recovery-run-failed'});}
  });
}
