import { describe, expect, it } from "vitest";
import { buildMatchResponseSummaries, hasParticipantResponded, buildNonResponseFollowupMessage, type ResponseMatch, type ResponseDelivery } from "../shared/matchResponseSummary";
const HOUR = 3600000, NOW = 2000000000;
const row = (id: number, extra: Partial<ResponseMatch> = {}): ResponseMatch => ({ id, singleAId: 10, singleBId: 20, status: "expired", proposedAt: NOW - (10 - id) * 24 * HOUR, approvedByA: false, approvedByB: false, ...extra });
const delivered = (m: ResponseMatch, singleId = 10): ResponseDelivery => ({ matchId: m.id, singleId, status: "accepted", acceptedAt: m.proposedAt, attemptType: "initial" });
describe("individual response summaries", () => {
  it("counts decline as a response, even when both approval flags are false", () => {
    const m = row(1, { status: "rejected", tokenAUsedAt: NOW - HOUR });
    const summary = buildMatchResponseSummaries([m], [delivered(m)])[10];
    expect(summary.respondedCount).toBe(1);expect(summary.unansweredCount).toBe(0);expect(summary.needsFollowup).toBe(false);
  });
  it("does not mistake false database defaults or email opens for a response", () => {
    const m = row(1, { emailAOpenedAt: NOW - 72 * HOUR });
    expect(hasParticipantResponded(m, "A")).toBe(false);
    expect(buildMatchResponseSummaries([m], [], NOW)[10].unansweredCount).toBe(1);
  });
  it("does not count generated, unexposed or failed deliveries", () => {
    const m = row(1);
    expect(buildMatchResponseSummaries([m], [{...delivered(m),status:'failed'}], NOW)).toEqual({});
  });
  it("requires personal evidence rather than the other side's accepted email", () => {
    const m = row(1);
    expect(buildMatchResponseSummaries([m], [delivered(m,20)], NOW)[10]).toBeUndefined();
    expect(buildMatchResponseSummaries([m], [delivered(m,20)], NOW)[20].unansweredCount).toBe(1);
  });
  it("keeps pending response inside the 48h window out of the warning", () => {
    const m = row(1,{status:'proposed',proposedAt:NOW-HOUR,approvalExpiresAt:NOW+HOUR});
    const s=buildMatchResponseSummaries([m],[delivered(m)],NOW)[10];expect(s.waitingCount).toBe(1);expect(s.unansweredCount).toBe(0);
  });
  it("does not penalize a recipient when the other side closed the proposal early", () => {
    const m=row(1,{status:'rejected',tokenBUsedAt:NOW-9*24*HOUR+HOUR});
    const s=buildMatchResponseSummaries([m],[delivered(m)],NOW)[10];expect(s.closedBeforeDeadlineCount).toBe(1);expect(s.unansweredCount).toBe(0);
  });
  it("flags three recent unanswered proposals and resets when the newest was answered", () => {
    const rows=[row(1),row(2),row(3)];
    const s=buildMatchResponseSummaries(rows,rows.map(m=>delivered(m)),NOW)[10];expect(s.consecutiveUnanswered).toBe(3);expect(s.needsFollowup).toBe(true);
    rows.push(row(4,{tokenAUsedAt:NOW-HOUR}));
    const next=buildMatchResponseSummaries(rows,rows.map(m=>delivered(m)),NOW)[10];expect(next.unansweredCount).toBe(3);expect(next.needsFollowup).toBe(false);
  });
  it("a late answer clears an old warning without changing historical unanswered count", () => {
    const rows=[row(1,{tokenAUsedAt:NOW-HOUR}),row(2),row(3),row(4)];
    expect(buildMatchResponseSummaries(rows,rows.map(m=>delivered(m)),NOW)[10].consecutiveUnanswered).toBe(0);
  });
  it("recognizes legacy consent and reversed participant orientation", () => {
    const m=row(1,{singleBConsentAt:NOW-HOUR});expect(hasParticipantResponded(m,'B')).toBe(true);
    expect(buildMatchResponseSummaries([m],[],NOW)[20].respondedCount).toBe(1);
  });
  it("counts a proposal once across email, SMS and manual resend; followup alone is not delivery", () => {
    const m=row(1);const ds=[delivered(m),{...delivered(m),acceptedAt:NOW-HOUR,attemptType:'manual_resend'}];
    expect(buildMatchResponseSummaries([m],ds,NOW)[10].deliveredCount).toBe(1);
    expect(buildMatchResponseSummaries([m],[{...delivered(m),attemptType:'followup'}],NOW)).toEqual({});
  });
  it("honors exact deadline and explicit extension", () => {
    const m=row(1,{approvalExpiresAt:NOW});expect(buildMatchResponseSummaries([m],[delivered(m)],NOW)[10].unansweredCount).toBe(1);
    m.approvalExpiresAt=NOW+HOUR;expect(buildMatchResponseSummaries([m],[delivered(m)],NOW)[10].waitingCount).toBe(1);
  });
  it("prepares a personal neutral message, never a send action", () => {
    const text=buildNonResponseFollowupMessage('שם דמה');expect(text).toContain('גם תשובת ״לא״');expect(text).not.toMatch(/שומר\/ת|את\/ה|token=|https?:/);
  });
  it("does not treat an administrative rejection as a recipient non-response", () => {
    const m=row(1,{status:'rejected'});
    const summary=buildMatchResponseSummaries([m],[delivered(m)],NOW)[10];
    expect(summary.closedBeforeDeadlineCount).toBe(1);expect(summary.unansweredCount).toBe(0);
  });
});
