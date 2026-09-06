import { describe, expect, it } from "vitest";
import { APPROVED_FEEDBACK_CAMPAIGN_COUNTS, validateApprovedFeedbackCampaignSnapshot } from "./feedbackCampaignDelivery";

function makeRows() {
  const rows: Array<{ requestKey: string; contactEmail: string; status: "draft"; scheduledAt: null; requestSentAt: null }> = [];
  for (const [audience, count] of Object.entries(APPROVED_FEEDBACK_CAMPAIGN_COUNTS)) {
    const slug = audience === "successful_matches" ? "successful-matches" : audience === "match_success_followup" ? "match-success-followup" : "dna-completers";
    for (let index = 0; index < count; index += 1) rows.push({ requestKey: `campaign:${slug}:2026-09-v2:${index}`, contactEmail: `${audience}-${index}@example.com`, status: "draft", scheduledAt: null, requestSentAt: null });
  }
  return rows;
}

describe("approved feedback campaign delivery", () => {
  it("accepts only the exact approved 216, 33 and 100 clean drafts", () => {
    expect(() => validateApprovedFeedbackCampaignSnapshot(makeRows())).not.toThrow();
  });

  it("blocks count changes, duplicate recipients and previously sent rows", () => {
    const missing = makeRows().slice(1);
    expect(() => validateApprovedFeedbackCampaignSnapshot(missing)).toThrow(/count mismatch/);
    const duplicate = makeRows();
    duplicate[1].contactEmail = duplicate[0].contactEmail;
    expect(() => validateApprovedFeedbackCampaignSnapshot(duplicate)).toThrow(/Duplicate/);
    const sent = makeRows();
    expect(() => validateApprovedFeedbackCampaignSnapshot([{ ...sent[0], status: "sent" as const, requestSentAt: Date.now() }, ...sent.slice(1)])).toThrow(/clean draft state/);
  });
});
