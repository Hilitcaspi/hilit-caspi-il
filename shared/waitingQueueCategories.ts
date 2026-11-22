import { filterProfilesByName } from "./profileNameSearch";
import {
  getWaitingFrom,
  sortWaitingProfilesByWaitingFrom,
  type WaitingQueueProfile,
  type WaitingQueueSortOrder,
} from "./unmatchedQueuePresentation";

export const WAITING_QUEUE_CATEGORIES = ["over14", "neverDelivered", "feedback", "missingPhoto", "blocked", "difficulty"] as const;
export type WaitingQueueCategory = typeof WAITING_QUEUE_CATEGORIES[number];
export type WaitingCategoryProfile = WaitingQueueProfile & {
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  isMatchingDifficult?: boolean | null;
};
export type WaitingQueueSummary = {
  over14: number;
  fromFeedback: number;
  neverDelivered: number;
  blocked: number;
  missingPhoto: number;
  difficulty: number;
};
export function emptyWaitingQueueSummary(): WaitingQueueSummary {
  return { over14: 0, fromFeedback: 0, neverDelivered: 0, blocked: 0, missingPhoto: 0, difficulty: 0 };
}

/**
 * The caller supplies only active, paid, non-seed, consent-eligible profiles with
 * a completed questionnaire. Categories are independent operational views, not
 * authorization to send: blocked/missing-photo profiles remain unsendable.
 * Only the overdue category excludes active, recipient-delivered connections.
 */
export function selectWaitingQueueCategory<T extends WaitingCategoryProfile>(
  eligibleProfiles: readonly T[],
  evidence: {
    lastAcceptedDeliveryBySingle: ReadonlyMap<number, number>;
    activeDeliveredConnectionIds: ReadonlySet<number>;
    feedbackAttentionIds: ReadonlySet<number>;
    blockingIds: ReadonlySet<number>;
  },
  options: {
    category?: WaitingQueueCategory;
    search?: string;
    sortOrder?: WaitingQueueSortOrder;
    page?: number;
    limit?: number;
    now?: number;
  } = {},
) {
  const now = options.now ?? Date.now();
  const cutoff = now - 14 * 24 * 60 * 60 * 1000;
  const category = options.category ?? "over14";
  const page = options.page ?? 1;
  const limit = options.limit ?? 40;
  const base = filterProfilesByName([...eligibleProfiles], options.search ?? "");
  const summary = emptyWaitingQueueSummary();
  const selected: T[] = [];
  for (const profile of base) {
    const flags: Record<WaitingQueueCategory, boolean> = {
      over14: !evidence.activeDeliveredConnectionIds.has(profile.id)
        && getWaitingFrom(profile, evidence.lastAcceptedDeliveryBySingle, now) < cutoff,
      neverDelivered: !evidence.lastAcceptedDeliveryBySingle.has(profile.id),
      feedback: evidence.feedbackAttentionIds.has(profile.id),
      missingPhoto: !profile.photoUrl?.trim(),
      blocked: evidence.blockingIds.has(profile.id),
      difficulty: profile.isMatchingDifficult === true,
    };
    for (const key of WAITING_QUEUE_CATEGORIES) {
      if (flags[key]) summary[key === "feedback" ? "fromFeedback" : key]++;
    }
    if (flags[category]) selected.push(profile);
  }
  const sorted = sortWaitingProfilesByWaitingFrom(selected, evidence.lastAcceptedDeliveryBySingle, now, options.sortOrder);
  return { items: sorted.slice((page - 1) * limit, page * limit), total: sorted.length, page, limit, summary };
}
