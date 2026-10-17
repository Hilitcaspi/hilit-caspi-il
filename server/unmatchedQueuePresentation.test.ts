import { describe, expect, it } from "vitest";
import {
  ACCEPTED_DELIVERY_SOURCE_LABEL,
  LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL,
  buildLastAcceptedDeliveryBySingle,
  buildRecipientMatchHistory,
  getWaitingFrom,
  sortWaitingProfilesByWaitingFrom,
} from "../shared/unmatchedQueuePresentation";

const day = 24 * 60 * 60 * 1000;
const now = 100 * day;

describe("unmatched queue presentation", () => {
  it("orders strictly by waitingFrom: accepted delivery or documented profile date, then id", () => {
    const deliveries = buildLastAcceptedDeliveryBySingle([
      { matchId: 50, singleId: 30, acceptedAt: now - 10 * day },
    ]);
    const profiles = [
      { id: 40, questionnaireCompletedAt: now - 20 * day, createdAt: now - 25 * day, feedback: true },
      { id: 30, questionnaireCompletedAt: now - 80 * day, createdAt: now - 90 * day },
      { id: 9, questionnaireCompletedAt: now - 30 * day, createdAt: now - 40 * day },
      { id: 7, questionnaireCompletedAt: now - 30 * day, createdAt: now - 40 * day },
      { id: 50, questionnaireCompletedAt: null, createdAt: now - 25 * day },
    ];

    expect(getWaitingFrom(profiles[1], deliveries, now)).toBe(now - 10 * day);
    expect(sortWaitingProfilesByWaitingFrom(profiles, deliveries, now).map(profile => profile.id))
      .toEqual([7, 9, 50, 40, 30]);
  });

  it("keeps one recipient-specific history record per match and does not infer the other side", () => {
    const history = buildRecipientMatchHistory(
      [
        {
          id: 10,
          singleAId: 1,
          singleBId: 2,
          status: "rejected",
          score: 77,
        },
        {
          id: 11,
          singleAId: 1,
          singleBId: 3,
          status: "expired",
          score: 68,
        },
        {
          id: 12,
          singleAId: 1,
          singleBId: 4,
          status: "proposed",
          score: null,
          emailAOpenedAt: 350,
        },
        {
          id: 13,
          singleAId: 1,
          singleBId: 5,
          status: "proposed",
          score: 80,
        },
      ],
      [
        { matchId: 10, singleId: 1, acceptedAt: 100 },
        { matchId: 10, singleId: 1, acceptedAt: 200 }, // retry: still one match-history entry
        { matchId: 10, singleId: 2, acceptedAt: 110 },
        { matchId: 11, singleId: 3, acceptedAt: 250 }, // recipient 1 must not inherit this
      ],
      new Map([
        [2, { id: 2, firstName: "אדם", lastName: "שני", photoUrl: "https://example.test/2.jpg" }],
        [3, { id: 3, firstName: "שלישי", lastName: null, photoUrl: null }],
        [4, { id: 4, firstName: "רביעי", lastName: null, photoUrl: null }],
        [5, { id: 5, firstName: "חמישי", lastName: null, photoUrl: null }],
      ]),
      new Set([1, 2, 3]),
    );

    expect(history.get(1)).toEqual([
      {
        matchId: 12,
        opponentName: "רביעי",
        opponentPhotoUrl: null,
        sentAt: 350,
        status: "proposed",
        score: null,
        sourceLabel: LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL,
      },
      {
        matchId: 10,
        opponentName: "אדם שני",
        opponentPhotoUrl: "https://example.test/2.jpg",
        sentAt: 100,
        status: "rejected",
        score: 77,
        sourceLabel: ACCEPTED_DELIVERY_SOURCE_LABEL,
      },
    ]);
    expect(history.get(2)).toEqual([
      expect.objectContaining({
        matchId: 10,
        sentAt: 110,
        sourceLabel: ACCEPTED_DELIVERY_SOURCE_LABEL,
      }),
    ]);
    expect(history.get(3)).toEqual([
      expect.objectContaining({
        matchId: 11,
        sentAt: 250,
        sourceLabel: ACCEPTED_DELIVERY_SOURCE_LABEL,
      }),
    ]);
    expect(history.get(1)?.some(entry => entry.matchId === 11 || entry.matchId === 13)).toBe(false);
  });
});
