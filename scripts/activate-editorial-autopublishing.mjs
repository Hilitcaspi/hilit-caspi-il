// Run only after the owner has published the checkpoint containing the callback.
// No credentials or contact data are printed. This never invokes the article job.
import {execFileSync} from 'node:child_process';
import mysql from 'mysql2/promise';

const ORIGIN='https://hilitcaspi.com';
const NAME='website-editorial-twice-weekly';
const PATH='/api/scheduled/editorial-article';
const CRON='0 0 7,8 * * 1,4'; // One candidate matches 10:00 Israel, across DST.
if(!process.argv.includes('--after-owner-publish')) throw new Error('Owner Publish confirmation is required.');
const r=await fetch(ORIGIN+PATH,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',redirect:'error'});
if(r.status!==403 || r.headers.get('x-editorial-publisher-version')!=='1') throw new Error('The exact secured publisher callback is not deployed. Do not create a cron yet.');
function jobs(){const result=JSON.parse(execFileSync('manus-heartbeat',['list'],{encoding:'utf8'}));if(!Array.isArray(result.jobs))throw new Error('Unknown scheduler response');return result.jobs;}
let job=jobs().find(j=>j.name===NAME);
if(job){
 if(job.callback_path!==PATH || job.cron_expression!==CRON || !job.is_enable)throw new Error('An existing editorial cron needs explicit review; no schedule is overwritten.');
}else{
 execFileSync('manus-heartbeat',['create','--name',NAME,'--cron',CRON,'--path',PATH,'--description','Publish an original, checked website article on Monday and Thursday at 10:00 Asia/Jerusalem. No email or external social publication.'],{encoding:'utf8'});
 job=jobs().find(j=>j.name===NAME);
}
if(!job || typeof job.task_uid!=='string' || !job.task_uid) throw new Error('Cron creation was not confirmed.');
const c=await mysql.createConnection(process.env.LEGACY_DATABASE_URL||process.env.DATABASE_URL);
try{
 const [rows]=await c.execute('SELECT schedule_cron_task_uid FROM editorial_automation_settings WHERE id=1');
 if(rows.length!==1)throw new Error('Editorial settings row missing');
 if(rows[0].schedule_cron_task_uid && rows[0].schedule_cron_task_uid!==job.task_uid)throw new Error('Different cron already bound; stop for review');
 await c.execute('UPDATE editorial_automation_settings SET schedule_cron_task_uid=?, enabled=true, updated_at=? WHERE id=1',[job.task_uid,Date.now()]);
 console.log('Confirmed: secured editorial scheduler bound and enabled for Monday/Thursday 10:00 Israel.');
}catch(error){
 // A cron that is not bound to the settings row cannot generate or publish.
 console.error('Activation not completed; the callback remains unable to publish until matching settings are bound.');
 throw error;
}finally{await c.end();}
