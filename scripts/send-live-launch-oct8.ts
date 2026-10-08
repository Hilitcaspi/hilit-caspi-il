import { readFileSync, writeFileSync, existsSync } from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  loadLiveLaunchAudience, runLiveLaunchCampaign, liveLaunchRecipientHash,
  LIVE_LAUNCH_SEND_EXPIRES_AT, smsUnitReport,
} from "../server/liveLaunchCampaign";
import { buildLiveLaunchWavePlan, liveLaunchPhaseAt, type LiveLaunchWavePlan, type LiveLaunchPhase } from "../server/liveLaunchWaves";
import { LIVE_LAUNCH_SMS } from "../shared/liveLaunchSms";
import { getVibrateSmsBalance } from "../server/vibrate";

const approvalFile = process.env.LIVE_LAUNCH_APPROVAL_FILE || "/home/ubuntu/.live-launch-oct8-approved.json";
const prepare = process.argv.includes("--prepare");
const approve = process.argv.includes("--owner-approved-2026-10-08");
const execute = process.argv.includes("--execute-due");

function summary(plan: LiveLaunchWavePlan) {
  const phases = Object.fromEntries(Object.entries(plan.phases).map(([key, value]) => [key, {
    scheduledAt: new Date(value.startsAt).toISOString(), email: value.email,
    sms: value.smsTotal, smsComboEmail: value.smsComboHashes.length,
    comparisonEmailOnly: value.email.cold - value.smsComboHashes.length,
  }]));
  return { approved: plan.approved, phases, databaseEmails: 0, databaseSms: 0, plusSms: 0, expiresAt: new Date(plan.expiresAt).toISOString() };
}

async function runPhase(plan: LiveLaunchWavePlan, phase: LiveLaunchPhase) {
  const now = Date.now();
  const group = plan.phases[phase];
  if (!group || now < group.startsAt || now > group.expiresAt || !Array.isArray(group.recipientHashes)) throw new Error("Invalid phase bounds");
  const sms = phase.startsWith("sms");
  const hour = phase.endsWith("20") ? "2000" : phase.endsWith("21") ? "2100" : "1900";
  const combo = new Set(group.smsComboHashes);
  if (group.recipientHashes.length === 0) { console.log(JSON.stringify({ phase, skipped: "empty_group" })); return; }
  let runtimeHashes = group.recipientHashes;
  let verifiedPlusCount = group.email.plus;
  if (phase === "email19" && group.email.plus > 0) {
    const check = spawnSync("python3", ["/home/ubuntu/.live-launch-oct8-public-rsvp-check.py"], { encoding: "utf8", timeout: 150000, maxBuffer: 1024 * 1024 });
    try {
      if (check.status !== 0) throw new Error("Public preflight failed");
      const data = JSON.parse(check.stdout.trim().split("\n").at(-1) || "{}");
      if (!Array.isArray(data.valid) || !Array.isArray(data.failed) || !data.totals) throw new Error("Invalid public preflight");
      const failed = new Set<string>(data.failed);
      runtimeHashes = runtimeHashes.filter(hash => !failed.has(hash));
      verifiedPlusCount = Math.min(group.email.plus, data.valid.length);
      console.log(JSON.stringify({ phase, publicPlusPreflight: data.totals }));
    } catch {
      verifiedPlusCount = 0;
      console.log(JSON.stringify({ phase, plusSkipped: "public_invite_preflight_unavailable", coldContinues: true }));
    }
  }
  const limits = sms ? { cold: group.smsTotal, database: 0, plus: 0, smsTotal: group.smsTotal }
    : { ...group.email, plus: verifiedPlusCount, smsTotal: 0 };
  const result = await runLiveLaunchCampaign({
    execute: true, dryRun: false, deliveryPhase: phase, now, expiresAt: group.expiresAt,
    allowedSegments: sms ? ["cold"] : ["cold", "plus"], verifyBrevoSmtpBlacklist: true,
    limits,
    frozen: { email: sms ? { cold: group.smsTotal, database: 0, plus: 0 } : group.email,
      smsTotal: sms ? group.smsTotal : 0, recipientHashes: runtimeHashes },
    waveContent: member => member.segment === "plus" ? "plus_rsvp"
      : combo.has(liveLaunchRecipientHash(member)) ? `launch_cold_sms_combo_${hour}`
      : `launch_cold_${hour}`,
    ...(sms ? {
      smsConsent: () => ({ permitted: true, provenance: "Explicit owner approval 2026-10-08: new high-intent leads only, existing CRM eligibility; opt-outs, paid members, Plus, tests and known blocks suppressed; maximum 200 across three waves" }),
      buildSms: () => ({ message: LIVE_LAUNCH_SMS.cold.replace("hilitcaspi.com/ld", `hilitcaspi.com/ld?h=${hour.slice(0, 2)}`) }),
    } : {}),
  });
  if ("review" in result) console.log(JSON.stringify({ phase, email: result.email, sms: result.sms }));
}

async function main() {
  if (prepare) {
    if (Date.now() >= Date.parse("2026-10-08T19:00:00+03:00")) throw new Error("Preparation deadline passed; do not replace an executing plan");
    if (existsSync(approvalFile)) throw new Error("A frozen plan already exists; inspect before replacement");
    const audience = await loadLiveLaunchAudience({ verifyBrevoSmtpBlacklist: true, allowedSegments: ["cold", "plus"] });
    const plan = buildLiveLaunchWavePlan(audience.members, crypto.randomBytes(32).toString("hex"));
    if (approve) { plan.approved = true; plan.approvedAt = Date.now(); }
    if (plan.expiresAt !== LIVE_LAUNCH_SEND_EXPIRES_AT) throw new Error("Plan and server expiry disagree");
    const units = smsUnitReport(LIVE_LAUNCH_SMS.cold.replace("hilitcaspi.com/ld", "hilitcaspi.com/ld?h=19"));
    if (units.providerUnits256 !== 1) throw new Error("SMS draft exceeds one provider billing unit");
    const balance = await getVibrateSmsBalance();
    const smsCount = plan.phases.sms19.smsTotal + plan.phases.sms20.smsTotal + plan.phases.sms21.smsTotal;
    if (balance === null || balance < smsCount) throw new Error("SMS balance could not be verified; no plan frozen");
    writeFileSync(approvalFile, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ ...summary(plan), smsUtf16: units.utf16Units, smsBalanceVerified: true }));
    return;
  }
  if (!existsSync(approvalFile)) throw new Error("Approved frozen plan not found");
  const plan = JSON.parse(readFileSync(approvalFile, "utf8")) as LiveLaunchWavePlan;
  if (!execute) { console.log(JSON.stringify(summary(plan))); return; }
  if (plan.version !== 2 || !plan.approved || !plan.approvedAt || plan.expiresAt !== LIVE_LAUNCH_SEND_EXPIRES_AT) throw new Error("Missing explicit approval or invalid plan");
  const now = Date.now();
  const phase = liveLaunchPhaseAt(now);
  if (!phase || now > plan.expiresAt) { console.log(JSON.stringify({ skipped: "outside_approved_slots_no_sends" })); return; }
  await runPhase(plan, phase);
  await runPhase(plan, phase.replace("email", "sms") as LiveLaunchPhase);
}

main().then(() => process.exit(0)).catch(error => {
  const message = error instanceof Error ? error.message : "Campaign stopped";
  console.error(message.includes("@") || /https?:/i.test(message) ? "Campaign stopped; inspect protected provider logs, never blindly retry" : message);
  process.exit(1);
});
