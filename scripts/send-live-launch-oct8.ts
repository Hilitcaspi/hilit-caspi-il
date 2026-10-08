import { readFileSync, writeFileSync } from "node:fs";
import { readLiveLaunchDryRun, runLiveLaunchCampaign, LIVE_LAUNCH_SEND_EXPIRES_AT } from "../server/liveLaunchCampaign";
import { LIVE_LAUNCH_SMS } from "../shared/liveLaunchSms";

const dryRun = process.argv.includes("--dry-run");
const execute = process.argv.includes("--execute");
const approvalFile = process.env.LIVE_LAUNCH_APPROVAL_FILE;
const options = {
  verifyBrevoSmtpBlacklist: true,
  limits: { smsTotal: 200 },
  smsConsent: () => ({ permitted: true, provenance: "Owner-approved existing CRM campaign eligibility, high-intent subset only; opt-outs and inactive/test/blocked recipients already suppressed" }),
  buildSms: ({ audience }: { audience: keyof typeof LIVE_LAUNCH_SMS }) => ({ message: LIVE_LAUNCH_SMS[audience] }),
};

async function main() {
  if (!execute || dryRun) {
    const review = await readLiveLaunchDryRun(options);
    if (approvalFile) writeFileSync(approvalFile, JSON.stringify({ approved: false, review }, null, 2) + "\n", { mode: 0o600 });
    const { recipientHashes, audienceDigest, ...summary } = review;
    console.log(JSON.stringify({ ...summary, approved: false }));
    return;
  }
  if (!approvalFile) throw new Error("A private owner-approved plan file is required");
  const approval = JSON.parse(readFileSync(approvalFile, "utf8"));
  if (approval.approved !== true || !approval.approvedAt || approval.expiresAt !== LIVE_LAUNCH_SEND_EXPIRES_AT || !Array.isArray(approval.review?.recipientHashes)) {
    throw new Error("Plan not explicitly approved or incomplete; no sends permitted");
  }
  const frozen = { email: approval.review.email, smsTotal: approval.review.sms.cappedAt, audienceDigest: approval.review.audienceDigest, recipientHashes: approval.review.recipientHashes };
  const result = await runLiveLaunchCampaign({ ...options, execute: true, dryRun: false, expiresAt: approval.expiresAt, frozen });
  if ("review" in result) console.log(JSON.stringify({ campaign: result.review.campaign, email: result.email, sms: result.sms }));
}

main().then(() => process.exit(0)).catch(error => {
  // Provider response bodies, identities and personalized URLs must not reach task logs.
  const message = error instanceof Error ? error.message : "Campaign preparation failed";
  console.error(message.includes("@") || /https?:/i.test(message) ? "Campaign stopped; inspect protected provider/account logs" : message);
  process.exit(1);
});
