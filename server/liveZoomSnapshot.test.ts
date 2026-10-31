import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  isZoomLiveDeliveryEnabled: vi.fn(() => false),
  zoomLiveConfig: vi.fn(() => ({ encryptionKey: "ab".repeat(32) })),
  registerApprovedLiveAttendee: vi.fn(),
  getRegistrationDisabledMeetingJoin: vi.fn(async () => null),
  sendEmailBatch: vi.fn(),
  isPermanentlyBlockedEmail: vi.fn(() => false),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({
  sendEmailBatch: mocks.sendEmailBatch,
  isPermanentlyBlockedEmail: mocks.isPermanentlyBlockedEmail,
}));
vi.mock("./liveZoomApi", () => ({
  isZoomLiveDeliveryEnabled: mocks.isZoomLiveDeliveryEnabled,
  zoomLiveConfig: mocks.zoomLiveConfig,
  registerApprovedLiveAttendee: mocks.registerApprovedLiveAttendee,
  getRegistrationDisabledMeetingJoin: mocks.getRegistrationDisabledMeetingJoin,
  encryptZoomJoinUrl: vi.fn((url: string) => url),
  decryptZoomJoinUrl: vi.fn((url: string) => url),
}));
vi.mock("./liveQuestionAccess", () => ({ liveQuestionToken: vi.fn(() => `1.${"a".repeat(43)}`) }));
vi.mock("./liveZoomTicketEmail", () => ({
  buildLiveZoomTicketEmail: vi.fn(() => ({ subject: "test", textContent: "test", htmlContent: "<p>test</p>" })),
}));

import {
  processApprovedLiveZoomSnapshot,
  processLiveZoomTickets,
} from "./liveZoomDelivery";

type SnapshotState = {
  where?: unknown;
  limits: number[];
};

function snapshotDb() {
  const state: SnapshotState = { limits: [] };
  const db = {
    select: vi.fn(() => ({
      from: () => ({
        where: (where: unknown) => {
          state.where = where;
          return {
            orderBy: () => ({
              limit: async (limit: number) => {
                state.limits.push(limit);
                return [];
              },
            }),
          };
        },
      }),
    })),
  };
  return { db, state };
}

function openRegistrationProofDb() {
  const state = { proofQueries: 0, selectionWhere: undefined as unknown };
  const db = {
    select: vi.fn(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: async () => {
              state.proofQueries++;
              return [{ id: 77 }];
            },
          }),
        }),
        where: (where: unknown) => {
          state.selectionWhere = where;
          return {
            orderBy: () => ({ limit: async () => [] }),
          };
        },
      }),
    })),
  };
  return { db, state };
}

beforeEach(() => {
  mocks.getDb.mockReset();
  mocks.isZoomLiveDeliveryEnabled.mockReset();
  mocks.isZoomLiveDeliveryEnabled.mockReturnValue(false);
  mocks.zoomLiveConfig.mockReset();
  mocks.zoomLiveConfig.mockReturnValue({ encryptionKey: "ab".repeat(32) });
  mocks.registerApprovedLiveAttendee.mockReset();
  mocks.getRegistrationDisabledMeetingJoin.mockReset();
  mocks.getRegistrationDisabledMeetingJoin.mockResolvedValue(null);
  mocks.sendEmailBatch.mockReset();
  mocks.isPermanentlyBlockedEmail.mockReset();
  mocks.isPermanentlyBlockedEmail.mockReturnValue(false);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("unexpected live request"); }));
  delete process.env.BREVO_API_KEY;
});

afterEach(() => {
  delete process.env.BREVO_API_KEY;
  vi.unstubAllGlobals();
});

describe("approved live Zoom snapshots", () => {
  it.each([
    ["empty", []],
    ["zero", [0]],
    ["negative", [-1]],
    ["fractional", [1.5]],
    ["unsafe", [Number.MAX_SAFE_INTEGER + 1]],
    ["over 5,000 IDs", Array.from({ length: 5001 }, (_, index) => index + 1)],
  ])("rejects %s snapshots before database or provider work", async (_label, ids) => {
    await expect(processApprovedLiveZoomSnapshot(ids)).rejects.toThrow("invalid_live_ticket_snapshot");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires the global rollout switch even for a valid frozen snapshot", async () => {
    await expect(processApprovedLiveZoomSnapshot([41, 42])).resolves.toEqual({
      processed: 0,
      sent: 0,
      skipped: "disabled",
    });

    expect(mocks.isZoomLiveDeliveryEnabled).toHaveBeenCalledTimes(1);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dedupes the frozen IDs and limits the selection to exactly that snapshot", async () => {
    const { db, state } = snapshotDb();
    mocks.getDb.mockResolvedValue(db);
    mocks.isZoomLiveDeliveryEnabled.mockReturnValue(true);

    await expect(processApprovedLiveZoomSnapshot([101, 202, 101])).resolves.toEqual({ processed: 0, sent: 0 });

    const compiled = new MySqlDialect().sqlToQuery(state.where as any);
    expect(compiled.sql).toMatch(/`live_october_tickets`\.`id` in \(\?, \?\)/i);
    expect(compiled.params).toEqual(expect.arrayContaining([101, 202]));
    expect(compiled.params).not.toContain(303); // An outside/later-created ticket is never in the frozen scope.
    expect(compiled.params.filter(value => value === 101)).toHaveLength(1);
    expect(compiled.params.filter(value => value === 202)).toHaveLength(1);
    expect(state.limits).toEqual([5]);
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("caps every snapshot query at five tickets while retaining claim and review exclusions", async () => {
    const { db, state } = snapshotDb();
    mocks.getDb.mockResolvedValue(db);
    mocks.isZoomLiveDeliveryEnabled.mockReturnValue(true);

    await expect(processApprovedLiveZoomSnapshot([9], 999)).resolves.toEqual({ processed: 0, sent: 0 });

    const compiled = new MySqlDialect().sqlToQuery(state.where as any);
    expect(state.limits).toEqual([5]);
    expect(compiled.sql).toContain("zoom_claimed_until");
    expect(compiled.sql).toContain("inactive_plus");
    expect(compiled.sql).toContain("email_inflight");
    expect(compiled.sql).toContain("delivery_uncertain");
    expect(compiled.sql).toContain("recipient_blocked");
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("leaves the proof-scoped open-registration bypass unchanged", async () => {
    const { db, state } = openRegistrationProofDb();
    mocks.getDb.mockResolvedValue(db);
    mocks.isZoomLiveDeliveryEnabled.mockReturnValue(false);
    process.env.BREVO_API_KEY = "test-only";

    await expect(processLiveZoomTickets(1, 77, true)).resolves.toEqual({ processed: 0, sent: 0 });

    expect(state.proofQueries).toBe(1);
    expect(state.selectionWhere).toBeDefined();
    expect(mocks.isZoomLiveDeliveryEnabled).not.toHaveBeenCalled();
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
