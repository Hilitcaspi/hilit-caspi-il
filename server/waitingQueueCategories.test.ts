import { describe, expect, it } from "vitest";
import { selectWaitingQueueCategory, WAITING_QUEUE_CATEGORIES, emptyWaitingQueueSummary } from "../shared/waitingQueueCategories";
import { buildLastAcceptedDeliveryBySingle } from "../shared/unmatchedQueuePresentation";
import { canSuggestNewMatch } from "./unmatchedQueue";

const day = 86400000;
const now = 1000 * day;
const profile = (id: number, ageDays = 20, extra = {}) => ({ id, firstName: "Test", lastName: "Profile", photoUrl: "https://example.test/photo.jpg", questionnaireCompletedAt: now - ageDays * day, ...extra });
const evidence = (extra = {}) => ({ lastAcceptedDeliveryBySingle: new Map<number, number>(), activeDeliveredConnectionIds: new Set<number>(), feedbackAttentionIds: new Set<number>(), blockingIds: new Set<number>(), ...extra });

describe("waiting category policy (actual API helper, synthetic data only)", () => {
  it("uses independent overlapping categories and counts each person once per category", () => {
    const profiles = [profile(1, 25, { photoUrl: " ", isMatchingDifficult: true }), profile(2, 1, { isMatchingDifficult: true }), profile(3, 2)];
    const facts = evidence({ feedbackAttentionIds: new Set([1, 2]), blockingIds: new Set([1]) });
    const expected = { over14: 1, neverDelivered: 3, fromFeedback: 2, missingPhoto: 1, blocked: 1, difficulty: 2 };
    for (const category of WAITING_QUEUE_CATEGORIES) expect(selectWaitingQueueCategory(profiles, facts, { category, now }).summary).toEqual(expected);
    for (const category of WAITING_QUEUE_CATEGORIES) expect(selectWaitingQueueCategory(profiles, facts, { category, now }).items.some(p => p.id === 1)).toBe(true);
  });

  it("neverDelivered includes new eligible profiles while overdue uses a strict 14-day cutoff", () => {
    const profiles = [profile(1, 1), profile(2, 14), profile(3, 14 + 1 / day)];
    expect(selectWaitingQueueCategory(profiles, evidence(), { category: "neverDelivered", now }).items.map(p => p.id)).toEqual([3, 2, 1]);
    expect(selectWaitingQueueCategory(profiles, evidence(), { now }).items.map(p => p.id)).toEqual([3]);
  });

  it("fresh feedback and difficulty never become default-overdue merely by being marked", () => {
    const profiles = [profile(1, 1, { isMatchingDifficult: true, isCoachingClient: true, isNotBasic: true }), profile(2, 20)];
    const facts = evidence({ feedbackAttentionIds: new Set([1]) });
    expect(selectWaitingQueueCategory(profiles, facts, { now }).items.map(p => p.id)).toEqual([2]);
    expect(selectWaitingQueueCategory(profiles, facts, { now, category: "feedback" }).items.map(p => p.id)).toEqual([1]);
    expect(selectWaitingQueueCategory(profiles, facts, { now, category: "difficulty" }).items[0]).toMatchObject({ id: 1, isCoachingClient: true, isNotBasic: true });
  });

  it("only overdue excludes active recipient-delivered connections; all other operational categories remain independent", () => {
    const profiles = [profile(1, 40, { isMatchingDifficult: true, photoUrl: null }), profile(2, 40)];
    const facts = evidence({ lastAcceptedDeliveryBySingle: new Map([[1, now - 30 * day]]), activeDeliveredConnectionIds: new Set([1]), blockingIds: new Set([1, 2]), feedbackAttentionIds: new Set([1]) });
    expect(selectWaitingQueueCategory(profiles, facts, { now }).items.map(p => p.id)).toEqual([2]);
    for (const category of ["feedback", "difficulty", "missingPhoto", "blocked"] as const) expect(selectWaitingQueueCategory(profiles, facts, { category, now }).items.some(p => p.id === 1)).toBe(true);
  });

  it("uses latest accepted per-recipient delivery and ignores invalid timestamps", () => {
    const last = buildLastAcceptedDeliveryBySingle([{ matchId: 10, singleId: 1, acceptedAt: now - 30 * day }, { matchId: 11, singleId: 1, acceptedAt: now - day }, { matchId: 11, singleId: 2, acceptedAt: null }]);
    const profiles = [profile(1, 40), profile(2, 40)];
    const facts = evidence({ lastAcceptedDeliveryBySingle: last });
    expect(selectWaitingQueueCategory(profiles, facts, { now }).items.map(p => p.id)).toEqual([2]);
    expect(selectWaitingQueueCategory(profiles, facts, { now, category: "neverDelivered" }).items.map(p => p.id)).toEqual([2]);
  });

  it("filters category and name globally before sorting and paging; counts are page/category invariant", () => {
    const profiles = Array.from({ length: 120 }, (_, index) => profile(index + 1, 130 - index, { isMatchingDifficult: index >= 70, lastName: index >= 80 ? "Target" : "Other" }));
    const facts = evidence();
    const first = selectWaitingQueueCategory(profiles, facts, { now, category: "difficulty", limit: 10 });
    expect(first.items.map(p => p.id)).toEqual(Array.from({ length: 10 }, (_, i) => i + 71));
    expect(first.total).toBe(50);
    const last = selectWaitingQueueCategory(profiles, facts, { now, category: "difficulty", sortOrder: "shortest", page: 2, limit: 10, search: "Target" });
    expect(last.items.map(p => p.id)).toEqual(Array.from({ length: 10 }, (_, i) => 110 - i));
    expect(last.total).toBe(40);
    expect(last.summary).toMatchObject({ neverDelivered: 40, difficulty: 40, over14: 36 });
    expect(last.summary).toEqual(selectWaitingQueueCategory(profiles, facts, { now, category: "feedback", page: 99, search: "Target" }).summary);
  });

  it("empty pools include difficulty zero and operational visibility cannot bypass send blockers", () => {
    expect(selectWaitingQueueCategory([], evidence(), { now }).summary).toEqual(emptyWaitingQueueSummary());
    const waiting = profile(1, 1, { isMatchingDifficult: true, email: "a@example.test" });
    const candidate = profile(2, 20, { email: "b@example.test" });
    expect(selectWaitingQueueCategory([waiting], evidence({ blockingIds: new Set([1]) }), { now, category: "difficulty" }).total).toBe(1);
    expect(canSuggestNewMatch(waiting, candidate, new Set([1]), new Set())).toBe(false);
    expect(canSuggestNewMatch({ ...waiting, photoUrl: null }, candidate, new Set(), new Set())).toBe(false);
  });
});
