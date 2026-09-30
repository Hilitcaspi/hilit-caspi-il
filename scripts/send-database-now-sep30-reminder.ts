import 'dotenv/config';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { loadDatabaseHolidayNowAudience } from '../server/databaseHolidayNowCampaign';
import { buildDatabaseHolidayNowReminder, DATABASE_NOW_REMINDER_SUBJECT } from '../server/databaseHolidayNowReminder';
import { isPermanentlyBlockedEmail, sendEmailBatch } from '../server/brevo';
import { buildSignedUnsubscribeUrl } from '../server/emailUnsubscribe';
import { getVibrateSmsBalance, normalizeIsraeliMobile, sendSMSBulkDetailed } from '../server/vibrate';
import { DATABASE_NOW_CAMPAIGN, DATABASE_NOW_EXPIRES_AT, databaseNowOfferUrl } from '../shared/databaseHolidayNow';

/** One authorized reminder, 30 September 2026 only. No WhatsApp or Plus sends. */
const START = Date.parse('2026-09-30T15:00:00Z');
const STOP = Date.parse('2026-09-30T20:45:00Z'); // don't send 'tomorrow' after 23:45 Israel
const EMAIL_KEY = `${DATABASE_NOW_CAMPAIGN}_reminder_email`;
const SMS_KEY = `${DATABASE_NOW_CAMPAIGN}_reminder_sms`;
const RUN_KEY = 'database-now-20260930-reminder-v1';
const MAX_SMS = 1200;
const ORIGINAL_EMAIL_KEY = `${DATABASE_NOW_CAMPAIGN}_email`;
const ORIGINAL_SMS_KEY = `${DATABASE_NOW_CAMPAIGN}_sms`;
const SMS_TEXT = '🎁 בגלל הביקוש הרחבתי את הטבת NOW בעוד 100 מקומות: 299 ₪ במקום 499 ₪, תשלום חד־פעמי. הצעת התאמה ראשונה בתוך 3 ימים מהשלמת הפרופיל ושאלון DNA. ההטבה מסתיימת מחר או בגמר המכסה 💛 https://hilitcaspi.com/now?s=sms להסרה: hilitcaspi.com/unsubscribe';
const UNITS = Math.ceil(SMS_TEXT.length / 256);
if (UNITS !== 1) throw new Error('SMS is longer than one Vibrate unit');
const dryRun = process.argv.includes('--dry-run');

type Member = Awaited<ReturnType<typeof loadDatabaseHolidayNowAudience>>[number];
type Signal = { email: string; opened_at: number | null; clicked_at: number | null; open_count: number | null; payment_at: number | null; sms_clicked_at: number | null };
function digestId(s: string) { return crypto.createHash('sha256').update(s).digest('hex'); }
function idempotencyKey(channel: string, ids: number[]) {
  const hex = digestId(`${RUN_KEY}:${channel}:${ids.join(',')}`).slice(0, 32).split('');
  hex[12] = '4'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const s = hex.join(''); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function tracked(html: string, logId: number) {
  const base = 'https://hilitcaspi.com';
  const pixel = `<img src="${base}/api/email/open/${logId}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
  return html.replace('</body>', `${pixel}</body>`).replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi, (match, before, url, after) => {
    if (url.includes('/unsubscribe') || url.includes('/api/email/') || url.startsWith('mailto:') || url.startsWith('tel:')) return match;
    return `<a ${before}href="${base}/api/email/click/${logId}?url=${encodeURIComponent(url)}"${after}>`;
  });
}
function canon(s: string) { return String(s || '').trim().toLowerCase(); }
function nowOfferCanBeSent(rows: any[]) {
  const row = rows[0];
  if (!row || row.code !== 'NOW' || Number(row.isActive) !== 1 || Number(row.maxUses) !== 200 || Number(row.usedCount) >= Number(row.maxUses) || Number(row.expiresAt) <= Date.now() || DATABASE_NOW_EXPIRES_AT <= Date.now()) throw new Error('NOW offer is unavailable; no sends');
}
function assertWindow() {
  if (Date.now() < START || Date.now() >= STOP) throw new Error('outside 30 September 18:00–23:45 Israel send window');
}

async function main() {
  const uri = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
  if (!uri) throw new Error('database unavailable');
  const connection = await mysql.createConnection(uri);
  const summary = { eligibleEmail: 0, strongSms: 0, engagedSms: 0, selectedSms: 0, sentEmail: 0, acceptedSms: 0, suppressedEmail: 0, suppressedSms: 0, balanceBefore: 0, status: 'preview' };
  try {
    if (!dryRun) assertWindow();
    const [coupon] = await connection.query<any[]>("SELECT code,usedCount,maxUses,expiresAt,isActive FROM discount_codes WHERE code='NOW'");
    nowOfferCanBeSent(coupon);
    const audience = (await loadDatabaseHolidayNowAudience()).filter(m => !isPermanentlyBlockedEmail(m.email));
    const byEmail = new Map(audience.map(m => [canon(m.email), m]));
    const [bounces] = await connection.query<any[]>("SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE journeyKey=? AND status='failed' AND errorMessage IN ('soft_bounce','hard_bounce')", [ORIGINAL_EMAIL_KEY]);
    for (const b of bounces) byEmail.delete(b.email);
    const [engagement] = await connection.query<any[]>(`
      SELECT LOWER(TRIM(recipientEmail)) email,
        MAX(IF(journeyKey=?,openedAt,NULL)) opened_at,
        MAX(IF(journeyKey=?,clickedAt,NULL)) clicked_at,
        MAX(IF(journeyKey=?,openCount,NULL)) open_count,
        MAX(IF(journeyKey=?,clickedAt,NULL)) sms_clicked_at
      FROM email_log WHERE journeyKey IN (?,?) AND status='sent'
      GROUP BY LOWER(TRIM(recipientEmail))`,
      [ORIGINAL_EMAIL_KEY,ORIGINAL_EMAIL_KEY,ORIGINAL_EMAIL_KEY,ORIGINAL_SMS_KEY,ORIGINAL_EMAIL_KEY,ORIGINAL_SMS_KEY]);
    const signals = new Map<string,Signal>(engagement.map(s => [canon(s.email), {...s,payment_at:null}]));
    const [payments] = await connection.query<any[]>("SELECT LOWER(TRIM(email)) email,MAX(created_at) payment_at FROM payment_leads WHERE product='database' AND confirmed_at IS NULL GROUP BY LOWER(TRIM(email))");
    for (const payment of payments) {
      const key=canon(payment.email);
      signals.set(key,{email:key,opened_at:null,clicked_at:null,open_count:null,sms_clicked_at:null,...signals.get(key),payment_at:Number(payment.payment_at)});
    }
    const [alreadyEmail] = await connection.query<any[]>('SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE journeyKey=?', [EMAIL_KEY]);
    const priorEmail = new Set(alreadyEmail.map(row => row.email));
    const mailing = [...byEmail.values()].filter(m => !priorEmail.has(canon(m.email))).sort((a,b) => a.leadId-b.leadId);
    const [blockedPhones] = await connection.query<any[]>("SELECT phone FROM crm_leads WHERE emailUnsubscribed=1 AND phone IS NOT NULL AND TRIM(phone)<>''");
    const blocked = new Set(blockedPhones.map(x=>normalizeIsraeliMobile(x.phone)).filter(Boolean));
    const [oldSms] = await connection.query<any[]>("SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE journeyKey=? AND status='sent'", [SMS_KEY]);
    const smsAlready = new Set(oldSms.map(x=>x.email));
    const [recentSms] = await connection.query<any[]>("SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE UPPER(subject) LIKE 'SMS%' AND status='sent' AND sentAt>=?", [Date.now()-24*3600_000]);
    const recentSmsEmails = new Set(recentSms.map(x=>x.email));
    const candidates = [...byEmail.values()].filter(m => m.phone && !blocked.has(m.phone) && !smsAlready.has(canon(m.email)) && !recentSmsEmails.has(canon(m.email)))
      .map(m=>({ m, s: signals.get(canon(m.email)) }));
    const hasStrong = (x: typeof candidates[number]) => Boolean(x.m.highIntent || Number(x.s?.clicked_at)>0 || Number(x.s?.sms_clicked_at)>0 || Number(x.s?.payment_at)>Date.now()-90*86400_000);
    const qualified = candidates.filter(x => hasStrong(x) || Number(x.s?.opened_at)>0);
    qualified.sort((a,b) => {
      const strongDiff = Number(hasStrong(b))-Number(hasStrong(a));
      if(strongDiff) return strongDiff;
      const recencyDiff = Math.max(Number(b.s?.clicked_at)||0, Number(b.s?.payment_at)||0, Number(b.s?.opened_at)||0)-Math.max(Number(a.s?.clicked_at)||0, Number(a.s?.payment_at)||0, Number(a.s?.opened_at)||0);
      if(recencyDiff) return recencyDiff;
      return (Number(b.s?.open_count)||0)-(Number(a.s?.open_count)||0) || a.m.leadId-b.m.leadId;
    });
    const sms = [...new Map(qualified.map(x=>[x.m.phone!,x])).values()].slice(0,MAX_SMS);
    summary.eligibleEmail=mailing.length;
    summary.strongSms=sms.filter(hasStrong).length;
    summary.engagedSms=qualified.length;
    summary.selectedSms=sms.length;
    const balance = await getVibrateSmsBalance();
    if(balance===null) throw new Error('cannot verify Vibrate balance');
    summary.balanceBefore=balance;
    if(balance<sms.length*UNITS) throw new Error('insufficient Vibrate credits');
    if(dryRun) { console.log('DRY_RUN',JSON.stringify(summary)); return; }
    if(alreadyEmail.length || oldSms.length) throw new Error('reminder already staged or sent: refuse rerun and inspect records before manual recovery');
    const [claim] = await connection.query<any>('INSERT IGNORE INTO lifecycle_run_claims(run_key,status,started_at) VALUES(?,\'running\',?)',[RUN_KEY,Date.now()]);
    if(claim.affectedRows!==1) throw new Error('reminder run already claimed; do not retry automatically');
    summary.status='sending';
    try {
      // Batch email so suppression and Grow purchases are rechecked before each provider call.
      for(let i=0;i<mailing.length;i+=500){
        assertWindow();
        const [code] = await connection.query<any[]>("SELECT code,usedCount,maxUses,expiresAt,isActive FROM discount_codes WHERE code='NOW'");
        nowOfferCanBeSent(code);
        const chunk=mailing.slice(i,i+500);
        const current = new Set((await loadDatabaseHolidayNowAudience()).map(m=>canon(m.email)));
        const [freshBounce] = await connection.query<any[]>("SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE journeyKey=? AND status='failed' AND errorMessage IN ('soft_bounce','hard_bounce')", [ORIGINAL_EMAIL_KEY]);
        const bounceSet = new Set(freshBounce.map(x=>x.email));
        const deliverable=chunk.filter(m=>current.has(canon(m.email)) && !bounceSet.has(canon(m.email)));
        summary.suppressedEmail+=chunk.length-deliverable.length;
        if(deliverable.length===0) continue;
        const rows=[] as { id:number; member:Member; body:ReturnType<typeof buildDatabaseHolidayNowReminder> }[];
        for(const member of deliverable){
          const body=buildDatabaseHolidayNowReminder({firstName:member.firstName, offerUrl:databaseNowOfferUrl('email'), unsubscribeUrl:buildSignedUnsubscribeUrl({email:member.email,leadId:member.leadId})});
          const stamp=Date.now();
          const [insert]=await connection.query<any>('INSERT INTO email_log(leadId,recipientEmail,recipientName,journeyKey,emailIndex,subject,htmlBody,textBody,scheduledAt,status,createdAt,errorMessage) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',[member.leadId,member.email,member.firstName,EMAIL_KEY,1,body.subject,body.htmlContent,body.textContent,stamp,'processing',stamp,'queued']);
          rows.push({id:insert.insertId,member,body});
        }
        // Filter again immediately before provider submission: time elapsed during row preparation.
        const stillEligible=new Set((await loadDatabaseHolidayNowAudience()).map(x=>canon(x.email)));
        const [freshPaid]=await connection.query<any[]>("SELECT LOWER(TRIM(email)) email FROM completed_payments WHERE product IN ('database','bundle_new_year') AND LOWER(TRIM(email)) IN (?)",[rows.map(x=>canon(x.member.email))]);
        const paid=new Set(freshPaid.map(x=>x.email));
        const sending=rows.filter(x=>stillEligible.has(canon(x.member.email))&&!paid.has(canon(x.member.email)));
        const cancelled=rows.filter(x=>!sending.includes(x));
        if(cancelled.length){await connection.query("UPDATE email_log SET status='cancelled',sentAt=?,errorMessage='ineligible_before_send' WHERE id IN (?)",[Date.now(),cancelled.map(x=>x.id)]);summary.suppressedEmail+=cancelled.length;}
        if(!sending.length) continue;
        const result=await sendEmailBatch({subject:DATABASE_NOW_REMINDER_SUBJECT, textContent:'תזכורת להצטרפות למאגר NOW וקישור אישי להסרה בגוף ההודעה', versions:sending.map(x=>({to:[{email:x.member.email,name:x.member.firstName||undefined}],htmlContent:tracked(x.body.htmlContent,x.id),textContent:x.body.textContent})),idempotencyKey:idempotencyKey('email',sending.map(x=>x.id))});
        if(!result.success || result.duplicate) throw new Error('Brevo batch failed or ambiguous duplicate; stop without automatic retry');
        await connection.query("UPDATE email_log SET status='sent',sentAt=?,errorMessage='brevo_accepted' WHERE id IN (?)",[Date.now(),sending.map(x=>x.id)]);
        summary.sentEmail+=sending.length;
        console.log('EMAIL_PROGRESS',JSON.stringify({accepted:summary.sentEmail,suppressed:summary.suppressedEmail,batches:Math.ceil((i+chunk.length)/500)}));
      }
      for(let i=0;i<sms.length;i+=400){
        assertWindow();
        const [code] = await connection.query<any[]>("SELECT code,usedCount,maxUses,expiresAt,isActive FROM discount_codes WHERE code='NOW'");
        nowOfferCanBeSent(code);
        const batch=sms.slice(i,i+400);
        const current=new Set((await loadDatabaseHolidayNowAudience({allowSameCampaignReminderEmail:true})).map(m=>canon(m.email)));
        const [freshBounce] = await connection.query<any[]>("SELECT LOWER(TRIM(recipientEmail)) email FROM email_log WHERE journeyKey=? AND status='failed' AND errorMessage IN ('soft_bounce','hard_bounce')",[ORIGINAL_EMAIL_KEY]);
        const bounceSet=new Set(freshBounce.map(x=>x.email));
        const [newBlockedPhones]=await connection.query<any[]>("SELECT phone FROM crm_leads WHERE emailUnsubscribed=1 AND phone IS NOT NULL AND TRIM(phone)<>''");
        const blockedNow=new Set(newBlockedPhones.map(x=>normalizeIsraeliMobile(x.phone)).filter(Boolean));
        const [freshPaid]=await connection.query<any[]>("SELECT LOWER(TRIM(email)) email FROM completed_payments WHERE product IN ('database','bundle_new_year') AND LOWER(TRIM(email)) IN (?)",[batch.map(x=>canon(x.m.email))]);
        const paid=new Set(freshPaid.map(x=>x.email));
        const deliverable=batch.filter(x=>current.has(canon(x.m.email))&&!bounceSet.has(canon(x.m.email))&&!blockedNow.has(x.m.phone)&&!paid.has(canon(x.m.email)));
        summary.suppressedSms+=batch.length-deliverable.length;
        if(!deliverable.length) continue;
        const remaining=await getVibrateSmsBalance();
        if(remaining===null||remaining<deliverable.length) throw new Error('Vibrate credits insufficient before SMS batch');
        const result=await sendSMSBulkDetailed({messages:deliverable.map(x=>({phone:x.m.phone!,message:SMS_TEXT})),idempotencyKey:idempotencyKey('sms',deliverable.map(x=>x.m.leadId)),campaignId:`${RUN_KEY}`});
        if(!result.accepted) throw new Error('Vibrate batch not accepted; stop without automatic retry');
        const stamp=Date.now();
        for(const x of deliverable){
          await connection.query('INSERT INTO email_log(leadId,recipientEmail,recipientName,journeyKey,emailIndex,subject,htmlBody,textBody,scheduledAt,sentAt,status,errorMessage,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[x.m.leadId,x.m.email,x.m.firstName,SMS_KEY,1,'SMS תזכורת NOW',SMS_TEXT,SMS_TEXT,stamp,stamp,'sent','vibrate_accepted',stamp]);
        }
        summary.acceptedSms+=deliverable.length;
        console.log('SMS_PROGRESS',JSON.stringify({providerAccepted:summary.acceptedSms,suppressed:summary.suppressedSms}));
      }
      summary.status='provider_accepted';
      await connection.query("UPDATE lifecycle_run_claims SET status='completed',completed_at=?,result_json=? WHERE run_key=?",[Date.now(),JSON.stringify(summary),RUN_KEY]);
      console.log('COMPLETE',JSON.stringify(summary));
    }catch(e){
      await connection.query("UPDATE lifecycle_run_claims SET status='failed',completed_at=?,result_json=? WHERE run_key=?",[Date.now(),JSON.stringify(summary),RUN_KEY]);
      throw e;
    }
  }finally{await connection.end();}
}
main().then(()=>process.exit(0)).catch(e=>{console.error('STOPPED',e instanceof Error?e.message:'unknown error');process.exit(1)});
