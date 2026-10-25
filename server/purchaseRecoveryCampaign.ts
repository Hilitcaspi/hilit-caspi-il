import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { purchaseRecoveryRecipients, emailLog } from '../drizzle/schema';
import type { PurchaseRecoveryRecipient } from '../drizzle/purchaseRecoverySchema';
import { getDb } from './db';
import { isPermanentlyBlockedEmail, sendEmailBatch } from './brevo';
import { buildSignedUnsubscribeUrl } from './emailUnsubscribe';
import { buildSignedSmsUnsubscribeUrl } from './smsMarketingUnsubscribe';
import { sendSMSBulkDetailed, getVibrateSmsBalance, normalizeIsraeliMobile } from './vibrate';
import { buildPurchaseRecoveryNewsletter } from './purchaseRecoveryNewsletter';
import { readBrevoBlockedRecipientSet } from './liveLaunchCampaign';
import { buildPurchaseRecoverySms } from './purchaseRecoverySms';
import { RECOVERY_CAMPAIGN, RECOVERY_SEND_AT, RECOVERY_SEND_EXPIRES_AT, purchaseRecoveryOfferUrl } from '../shared/purchaseRecoveryLinks';

type Channel = 'email' | 'sms';
type Decision = { allowed: boolean; reason?: string };
export type RecoveryCampaignDependencies = {
  readDue: (channel: Channel, limit: number) => Promise<PurchaseRecoveryRecipient[]>;
  refreshEligibility: (row: PurchaseRecoveryRecipient, channel: Channel, now: number) => Promise<Decision>;
  claim: (row: PurchaseRecoveryRecipient, channel: Channel, now: number) => Promise<boolean>;
  finish: (row: PurchaseRecoveryRecipient, channel: Channel, state: 'accepted'|'failed'|'skipped', now: number, providerId?: string, reason?: string) => Promise<void>;
  deliver: (row: PurchaseRecoveryRecipient, channel: Channel, now: number) => Promise<{ accepted: boolean; providerId?: string }>;
};
const rows = <T>(v: any): T[] => Array.isArray(v?.[0]) ? v[0] : Array.isArray(v) ? v : [];
const changed = (v: any) => Number(v?.[0]?.affectedRows ?? v?.affectedRows ?? 0);
const stateField = (channel: Channel) => channel === 'email' ? purchaseRecoveryRecipients.emailState : purchaseRecoveryRecipients.smsState;
const productOkay = (v: string): v is 'database'|'session'|'plus' => ['database','session','plus'].includes(v);

/** Atomic row claims are never recycled: an ambiguous provider result requires owner review. */
export async function runPurchaseRecoveryCampaign(input: { now?: number; dryRun?: boolean; limit?: number; taskUid?: string } = {}, injected?: RecoveryCampaignDependencies) {
  const now = input.now ?? Date.now();
  const summary = { campaign: RECOVERY_CAMPAIGN, dryRun: input.dryRun !== false, window: 'in_window', email: { due:0, eligible:0, accepted:0, failed:0, skipped:0 }, sms: { due:0, eligible:0, accepted:0, failed:0, skipped:0 } };
  if (now < RECOVERY_SEND_AT) { summary.window = 'too_early'; return summary; }
  if (now > RECOVERY_SEND_EXPIRES_AT) { summary.window = 'expired'; return summary; }
  const deps = injected ?? await recoveryDependencies(input.taskUid);
  const limit = Math.max(1, Math.min(100, input.limit ?? 100));
  const handledPhones = new Set<string>();
  const handledEmails = new Set<string>();
  for (const channel of ['email','sms'] as const) {
    const due = await deps.readDue(channel, limit); summary[channel].due = due.length;
    for (let start = 0; start < due.length; start += 4) {
    await Promise.all(due.slice(start, start + 4).map(async (row) => {
      const now = input.now ?? Date.now();
      if (row.campaignKey !== RECOVERY_CAMPAIGN || !productOkay(row.product) || !row.sendAt || row.sendAt > now || !row.sendExpiresAt || now > row.sendExpiresAt || row.offerRedeemedAt) {
        summary[channel].skipped++; return;
      }
      const decision = await deps.refreshEligibility(row, channel, now);
      const phone = channel === 'sms' ? normalizeIsraeliMobile(row.phone || '') : null;
      const canonicalEmail = row.email.trim().toLowerCase();
      if (!decision.allowed || (channel === 'email' && handledEmails.has(canonicalEmail)) || (channel === 'sms' && (!phone || handledPhones.has(phone)))) {
        summary[channel].skipped++;
        if (!summary.dryRun) await deps.finish(row, channel, 'skipped', now, undefined, decision.reason || 'duplicate_or_invalid_phone');
        return;
      }
      summary[channel].eligible++;
      if (phone) handledPhones.add(phone);
      if (channel === 'email') handledEmails.add(canonicalEmail);
      if (summary.dryRun) return;
      if (!await deps.claim(row, channel, now)) { summary[channel].skipped++; return; }
      try {
        const delivered = await deps.deliver(row, channel, now);
        await deps.finish(row, channel, delivered.accepted ? 'accepted' : 'failed', now, delivered.providerId, delivered.accepted ? undefined : 'provider_result_failed_or_uncertain');
        summary[channel][delivered.accepted ? 'accepted' : 'failed']++;
      } catch {
        // Never retry a claimed row, even when the final DB write is the part that failed.
        summary[channel].failed++;
        try { await deps.finish(row, channel, 'failed', now, undefined, 'provider_result_failed_or_uncertain'); } catch { /* processing is also terminal for automatic dispatch */ }
      }
    }));
    }
  }
  return summary;
}

export async function recoveryDependencies(taskUid?: string): Promise<RecoveryCampaignDependencies> {
  const db = await getDb(); if (!db) throw new Error('recovery_database_unavailable');
  const sameEmail = (table: any, email: string) => sql`LOWER(TRIM(${table.email})) = ${email.trim().toLowerCase()}`;
  let smtpBlocks: Promise<Set<string>> | undefined;
  return {
    readDue: async (channel, limit) => db.select().from(purchaseRecoveryRecipients).where(and(
      eq(purchaseRecoveryRecipients.campaignKey, RECOVERY_CAMPAIGN), eq(stateField(channel), 'queued'),
      ...(taskUid ? [eq(purchaseRecoveryRecipients.scheduleCronTaskUid, taskUid)] : []),
    )).limit(limit),
    refreshEligibility: async (row, channel, now) => {
      if (isPermanentlyBlockedEmail(row.email)) return {allowed:false,reason:'local_permanent_block'};
      if (channel === 'email' && !row.emailConsent) return {allowed:false,reason:'missing_email_consent'};
      if (channel === 'sms' && !row.smsConsent) return {allowed:false,reason:'missing_sms_consent'};
      const {crmLeads, singles, completedPayments, plusPilotMembers} = await import('../drizzle/schema');
      const leads = await db.select({unsubscribed:crmLeads.emailUnsubscribed,status:crmLeads.status}).from(crmLeads).where(sameEmail(crmLeads,row.email)).limit(20);
      if (leads.some(l=>l.unsubscribed || ['not_relevant','client_coaching'].includes(l.status))) return {allowed:false,reason:'current_crm_suppression'};
      const profiles = await db.select({id:singles.id,isPaid:singles.isPaid,isActive:singles.isActive,isSeed:singles.isSeed,excluded:singles.boostExcluded,market:singles.market,marketing:singles.consentEmailMarketing,coaching:singles.isCoachingClient}).from(singles).where(sameEmail(singles,row.email)).limit(20);
      if(profiles.some(p=>!p.isActive||p.isSeed||p.excluded||p.market==='us'||!p.marketing||p.coaching))return {allowed:false,reason:'current_profile_suppression'};
      const purchases = await db.select({id:completedPayments.id}).from(completedPayments).where(and(sameEmail(completedPayments,row.email),eq(completedPayments.product,row.product))).limit(1);
      if(purchases.length || (row.product==='database' && profiles.some(p=>p.isPaid)))return {allowed:false,reason:'purchased_since_audience_review'};
      if(row.product==='plus'){
        const paid=profiles.filter(p=>p.isPaid&&p.isActive);
        if(paid.length!==1)return {allowed:false,reason:'plus_requires_unique_paid_database_member'};
        const prior=await db.select({status:plusPilotMembers.status,billing:plusPilotMembers.billingStatus,activatedAt:plusPilotMembers.activatedAt,lastPaymentAt:plusPilotMembers.lastPaymentAt}).from(plusPilotMembers).where(eq(plusPilotMembers.singleId,paid[0].id)).limit(1);
        if(prior.some(p=>p.activatedAt||p.lastPaymentAt||['active','cancelled','churned'].includes(p.status)||['active','ended','cancelled','past_due'].includes(p.billing||'')))return {allowed:false,reason:'existing_or_previous_plus_member'};
      }
      // Respect the approved campaign's 24-hour rest. Ordinary journeys retain their own longer policy.
      const recent=await db.select({id:emailLog.id,journeyKey:emailLog.journeyKey,emailIndex:emailLog.emailIndex}).from(emailLog).where(and(sql`LOWER(TRIM(${emailLog.recipientEmail})) = ${row.email.toLowerCase().trim()}`,eq(emailLog.status,'sent'),gte(emailLog.sentAt,now-24*3600000))).limit(100);
      const operational=new Set(['women_guide','men_guide','women_course','men_course','women_matchmaking','men_matchmaking','women_matchmaking_welcome','men_matchmaking_welcome']);
      if(recent.some(l=>!l.journeyKey.startsWith(RECOVERY_CAMPAIGN)&&!(l.emailIndex===1&&operational.has(l.journeyKey))&&!/(^match_|^match:|^transactional:|^service:)/.test(l.journeyKey)))return {allowed:false,reason:'marketing_sent_within_24h'};
      const contact=await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(row.email)}`,{headers:{'api-key':process.env.BREVO_API_KEY||''},signal:AbortSignal.timeout(10000)});
      if(contact.status!==404){if(!contact.ok)return {allowed:false,reason:'provider_consent_check_unavailable'};const c=await contact.json();if(c.emailBlacklisted||(channel==='sms'&&c.smsBlacklisted))return {allowed:false,reason:'provider_marketing_suppression'};}
      if(channel==='sms'){
        const phone=normalizeIsraeliMobile(row.phone||'');if(!phone)return {allowed:false,reason:'invalid_phone'};
        const opt=rows<any>(await db.execute(sql`SELECT id FROM sms_optouts WHERE phone=${phone} LIMIT 1`));
        if(opt.length)return {allowed:false,reason:'sms_optout'};
        const balance=await getVibrateSmsBalance();if(balance===null||balance<5)return {allowed:false,reason:'sms_balance_unverified_or_low'};
      }
      // SMTP permanent blocks are not changed for this marketing campaign.
      smtpBlocks ??= readBrevoBlockedRecipientSet();
      if((await smtpBlocks).has(row.email.trim().toLowerCase()))return {allowed:false,reason:'smtp_block'};
      return {allowed:true};
    },
    claim: async (row,channel,now) => changed(await db.update(purchaseRecoveryRecipients).set(channel==='email'?{emailState:'processing',updatedAt:now}:{smsState:'processing',updatedAt:now}).where(and(eq(purchaseRecoveryRecipients.id,row.id),eq(purchaseRecoveryRecipients.campaignKey,RECOVERY_CAMPAIGN),eq(stateField(channel),'queued'),eq(channel==='email'?purchaseRecoveryRecipients.emailConsent:purchaseRecoveryRecipients.smsConsent,true),isNull(purchaseRecoveryRecipients.offerRedeemedAt),...(channel==='sms'?[eq(purchaseRecoveryRecipients.phone,row.phone||'')]:[]))))===1,
    finish: async (row,channel,state,now,providerId,reason) => {
      await db.update(purchaseRecoveryRecipients).set(channel==='email'
        ?{emailState:state,emailProviderMessageId:providerId||null,...(state==='accepted'?{emailSentAt:now}:{}),suppressionReason:reason||null,updatedAt:now}
        :{smsState:state,smsProviderMessageId:providerId||null,...(state==='accepted'?{smsSentAt:now}:{}),updatedAt:now}).where(eq(purchaseRecoveryRecipients.id,row.id));
    },
    deliver: async (row,channel,now) => {
      if(!productOkay(row.product))return {accepted:false};
      let offerUrl=purchaseRecoveryOfferUrl(row.product,channel);
      if(row.product==='plus'){
        const {singles}=await import('../drizzle/schema');
        const members=await db.select({token:singles.questionnaireToken,active:singles.isActive,paid:singles.isPaid}).from(singles).where(sameEmail(singles,row.email)).limit(2);
        if(members.length!==1||!members[0].active||!members[0].paid||!members[0].token||members[0].token.length<16)return {accepted:false};
        const personal=new URL(offerUrl);
        personal.searchParams.set('email',row.email.trim().toLowerCase());
        personal.searchParams.set('token',members[0].token);
        offerUrl=personal.toString();
      }
      const unsubscribeUrl=channel==='sms' ? buildSignedSmsUnsubscribeUrl({phone:row.phone||''}) : buildSignedUnsubscribeUrl({email:row.email});
      if(channel==='sms'){
        const message=buildPurchaseRecoverySms({product:row.product,offerUrl,unsubscribeUrl});
        const sent=await sendSMSBulkDetailed({messages:[{phone:row.phone||'',message}],idempotencyKey:`${RECOVERY_CAMPAIGN}:sms:${row.id}`,campaignId:RECOVERY_CAMPAIGN});
        return {accepted:sent.accepted,providerId:sent.providerRunId||undefined};
      }
      const mail=buildPurchaseRecoveryNewsletter({product:row.product,offerUrl,unsubscribeUrl,firstName:row.name?.split(/\s+/)[0]});
      // cancelled prevents an independent legacy pending-mail runner from picking up our claim.
      const ins=await db.insert(emailLog).values({recipientEmail:row.email,recipientName:row.name?.slice(0,100),journeyKey:`${RECOVERY_CAMPAIGN}_${row.product}`,emailIndex:1,subject:mail.subject,htmlBody:mail.htmlContent,textBody:mail.textContent,scheduledAt:now,status:'cancelled',errorMessage:'claimed_by_recovery_worker',createdAt:now});
      const logId=Number((ins as any)[0]?.insertId);if(!logId)throw new Error('recovery_log_not_saved');
      const tracked=injectRecoveryTracking(mail.htmlContent,logId);
      await db.update(emailLog).set({htmlBody:tracked}).where(eq(emailLog.id,logId));
      const sent=await sendEmailBatch({subject:mail.subject,textContent:mail.textContent,versions:[{to:[{email:row.email,name:row.name||undefined}],htmlContent:tracked,textContent:mail.textContent}],idempotencyKey:`${RECOVERY_CAMPAIGN}:email:${row.id}`});
      const accepted=Boolean(sent.success&&sent.messageIds?.length);
      await db.update(emailLog).set({status:accepted?'sent':'failed',sentAt:accepted?now:null,errorMessage:accepted?null:'provider_result_failed_or_uncertain'}).where(eq(emailLog.id,logId));
      return {accepted,providerId:sent.messageIds?.[0]};
    },
  };
}

/** Decode HTML entities BEFORE wrapping: the existing click endpoint must retain coupon and UTM query params. */
export function injectRecoveryTracking(html:string,logId:number){
  const base='https://hilitcaspi.com';
  return html.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi,(match,before,href,after)=>{
    const target=href.replace(/&amp;/g,'&');if(target.includes('/unsubscribe')||target.includes('/api/email/')||!target.startsWith(base))return match;
    return `<a ${before}href="${base}/api/email/click/${logId}?url=${encodeURIComponent(target)}"${after}>`;
  }).replace('</body>',`<img src="${base}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none;border:0" /></body>`);
}
