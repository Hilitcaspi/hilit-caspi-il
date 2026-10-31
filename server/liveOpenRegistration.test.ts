import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  ensureLiveTicket: vi.fn(),
  processOpenLiveRegistrationTicket: vi.fn(),
  sendEmailBatch: vi.fn(),
  registerApprovedLiveAttendee: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./brevo", () => ({
  isPermanentlyBlockedEmail: vi.fn(() => false),
  sendEmailBatch: mocks.sendEmailBatch,
}));
vi.mock("./liveZoomApi", () => ({
  isZoomLiveDeliveryEnabled: vi.fn(() => false),
  zoomLiveConfig: vi.fn(() => ({ encryptionKey: "ab".repeat(32) })),
  registerApprovedLiveAttendee: mocks.registerApprovedLiveAttendee,
  encryptZoomJoinUrl: vi.fn((url: string) => url),
  decryptZoomJoinUrl: vi.fn((url: string) => url),
}));
vi.mock("./liveQuestionAccess", () => ({ liveQuestionToken: vi.fn(() => `1.${"a".repeat(43)}`) }));
vi.mock("./liveZoomTicketEmail", () => ({
  buildLiveZoomTicketEmail: vi.fn(() => ({ subject: "test", textContent: "test", htmlContent: "<p>test</p>" })),
}));

import { createOpenLiveRegistrationService } from "./liveOpenRegistration";
import { processLiveZoomTickets, processOpenLiveRegistrationTicket } from "./liveZoomDelivery";

const EVENT_START = Date.parse("2026-10-31T20:30:00+02:00");
const NOW = EVENT_START - 60_000;
const input = {
  firstName: "נועה",
  lastName: "כהן",
  email: "  NOA@example.com ",
  phone: "050-1234567",
  isDatabaseMember: false,
  marketingConsent: true,
  utmSource: "instagram",
  utmMedium: "social",
  utmCampaign: "live-open",
  utmContent: "story",
};

function makeRegistrationDb(options: {
  existing?: { id: number; firstName?: string; lastName?: string; ticketId: number | null };
  insertFailure?: boolean;
} = {}) {
  const state: {
    registration?: { id: number; firstName: string; lastName: string; ticketId: number | null };
    inserts: Array<Record<string, unknown>>;
    updates: Array<Record<string, unknown>>;
  } = {
    registration: options.existing && {
      id: options.existing.id,
      firstName: options.existing.firstName ?? "שם",
      lastName: options.existing.lastName ?? "שמור",
      ticketId: options.existing.ticketId,
    },
    inserts: [], updates: [],
  };

  const db = {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({ limit: async () => state.registration ? [state.registration] : [] }),
      }),
    })),
    insert: vi.fn(() => ({
      values: async (value: Record<string, unknown>) => {
        if (options.insertFailure) throw new Error("write failed");
        state.inserts.push(value);
        state.registration = { id: 41, firstName: String(value.firstName), lastName: String(value.lastName), ticketId: null };
      },
    })),
    update: vi.fn(() => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(value);
          if (state.registration && value.ticketId !== undefined) state.registration.ticketId = Number(value.ticketId);
          return [{ affectedRows: 1 }];
        },
      }),
    })),
  };
  return { db, state };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("unexpected provider fetch"); }));
  process.env.LIVE_OPEN_REGISTRATION_ENABLED = "true";
  mocks.getDb.mockReset();
  mocks.ensureLiveTicket.mockReset();
  mocks.processOpenLiveRegistrationTicket.mockReset();
  mocks.sendEmailBatch.mockReset();
  mocks.registerApprovedLiveAttendee.mockReset();
});

afterEach(() => {
  delete process.env.LIVE_OPEN_REGISTRATION_ENABLED;
  vi.unstubAllGlobals();
});

describe("open live registration service", () => {
  it("rejects unapproved email consent before any database, ticket or provider access", async () => {
    const getDb = vi.fn();
    const ensureTicket = vi.fn();
    const processTicket = vi.fn();
    const service = createOpenLiveRegistrationService({
      getDb,
      ensureLiveTicket: ensureTicket,
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });
    await expect(service.registerOpenLive({ ...input, marketingConsent: false })).rejects.toThrow("לאשר קבלת מיילים");
    expect(getDb).not.toHaveBeenCalled();
    expect(ensureTicket).not.toHaveBeenCalled();
    expect(processTicket).not.toHaveBeenCalled();
  });

  it("captures an immutable dedicated lead, issues an open-registration ticket, and sends only its target when ready", async () => {
    const { db, state } = makeRegistrationDb();
    const ensureTicket = vi.fn(async () => ({ id: 73, email: "noa@example.com", source: "open_registration" }));
    const processTicket = vi.fn(async () => ({ processed: 1, sent: 1 }));
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: ensureTicket,
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive(input, { ip: "203.0.113.14" })).resolves.toEqual({ success: true, delivery: "sent" });
    expect(state.inserts).toEqual([expect.objectContaining({
      eventSlug: "matching-secrets-2026-10-31",
      firstName: "נועה",
      lastName: "כהן",
      email: "noa@example.com",
      isDatabaseMember: false,
      marketingConsent: true,
      consentedAt: NOW,
      consentVersion: "live-open-v2-required-email",
      utmSource: "instagram",
    })]);
    expect(ensureTicket).toHaveBeenCalledWith({ email: "noa@example.com", name: "נועה כהן", source: "open_registration" });
    expect(state.updates).toEqual([{ ticketId: 73 }]);
    expect(processTicket).toHaveBeenCalledTimes(1);
    expect(processTicket).toHaveBeenCalledWith(73);
  });

  it("rechecks a linked ticket generically without overwriting consent, lead, or issuing another ticket", async () => {
    const { db, state } = makeRegistrationDb({ existing: { id: 7, ticketId: 902 } });
    const ensureTicket = vi.fn();
    // The real processor's sent-state claim makes this a no-op; the public
    // reply stays generic and no provider call is made by this service.
    const processTicket = vi.fn(async () => ({ processed: 0, sent: 0 }));
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: ensureTicket,
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive({ ...input, marketingConsent: true, phone: "050-0000000" })).resolves.toEqual({ success: true, delivery: "queued" });
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
    expect(ensureTicket).not.toHaveBeenCalled();
    expect(processTicket).toHaveBeenCalledWith(902);
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("does not acknowledge a persistence failure as a duplicate when no event-email row can be re-read", async () => {
    const { db } = makeRegistrationDb({ insertFailure: true });
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: vi.fn(),
      processOpenLiveRegistrationTicket: vi.fn(),
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive(input)).rejects.toThrow("ההרשמה אינה זמינה");
  });

  it("resumes an existing unlinked registration after ticket issuance failed, using only the stored name and without replacing consent", async () => {
    const { db, state } = makeRegistrationDb({ existing: { id: 8, firstName: "שם", lastName: "מקורי", ticketId: null } });
    const ensureTicket = vi.fn()
      .mockRejectedValueOnce(new Error("temporary ticket failure"))
      .mockResolvedValueOnce({ id: 903, email: "noa@example.com", source: "open_registration" });
    const processTicket = vi.fn(async () => ({ processed: 1, sent: 1 }));
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: ensureTicket,
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive(input)).resolves.toEqual({ success: true, delivery: "unavailable" });
    await expect(service.registerOpenLive({ ...input, firstName: "לא", lastName: "להחליף", marketingConsent: true })).resolves.toEqual({ success: true, delivery: "sent" });
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toEqual([{ ticketId: 903 }]);
    expect(ensureTicket).toHaveBeenLastCalledWith({ email: "noa@example.com", name: "שם מקורי", source: "open_registration" });
    expect(processTicket).toHaveBeenCalledWith(903);
  });

  it("accepts a honeypot submission generically with no database, ticket, or provider side effect", async () => {
    const getDb = vi.fn();
    const ensureTicket = vi.fn();
    const processTicket = vi.fn();
    const service = createOpenLiveRegistrationService({
      getDb,
      ensureLiveTicket: ensureTicket,
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive({ ...input, website: "https://bot.invalid" })).resolves.toEqual({ success: true, delivery: "queued" });
    expect(getDb).not.toHaveBeenCalled();
    expect(ensureTicket).not.toHaveBeenCalled();
    expect(processTicket).not.toHaveBeenCalled();
  });

  it("keeps delivery queued after a best-effort delivery error while retaining the registration and ticket link", async () => {
    const { db, state } = makeRegistrationDb();
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: async () => ({ id: 88, email: "noa@example.com" }),
      processOpenLiveRegistrationTicket: async () => { throw new Error("provider unavailable"); },
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive(input)).resolves.toEqual({ success: true, delivery: "queued" });
    expect(state.inserts).toHaveLength(1);
    expect(state.updates).toEqual([{ ticketId: 88 }]);
  });

  it("does not revive or target a revoked ticket", async () => {
    const { db, state } = makeRegistrationDb();
    const processTicket = vi.fn();
    const service = createOpenLiveRegistrationService({
      getDb: async () => db,
      ensureLiveTicket: async () => ({ id: 88, email: "noa@example.com", revokedAt: NOW }),
      processOpenLiveRegistrationTicket: processTicket,
      deliveryEnabled: () => true,
      now: () => NOW,
      rateLimit: () => true,
    });

    await expect(service.registerOpenLive(input)).resolves.toEqual({ success: true, delivery: "unavailable" });
    expect(state.updates).toHaveLength(0);
    expect(processTicket).not.toHaveBeenCalled();
  });

  it("reports a closed form after the event and a scoped readiness state without enabling the global worker", async () => {
    const service = createOpenLiveRegistrationService({ now: () => EVENT_START, deliveryEnabled: () => true });
    expect(service.openLiveRegistrationStatus()).toEqual({ open: false, deliveryEnabled: true, eventStart: EVENT_START });
    await expect(service.registerOpenLive(input)).rejects.toThrow("ההרשמה אינה זמינה");
  });

  it("is open by default before the event and closes early only through an explicit false flag", () => {
    delete process.env.LIVE_OPEN_REGISTRATION_ENABLED;
    const service = createOpenLiveRegistrationService({ now: () => NOW, deliveryEnabled: () => false });
    expect(service.openLiveRegistrationStatus()).toEqual({ open: true, deliveryEnabled: false, eventStart: EVENT_START });
    process.env.LIVE_OPEN_REGISTRATION_ENABLED = "false";
    expect(service.openLiveRegistrationStatus().open).toBe(false);
  });
});

describe("targeted Zoom delivery guard", () => {
  it("keeps the globally-disabled worker inert and rejects a direct target with no open-registration proof", async () => {
    const proofDb = {
      select: vi.fn(() => ({
        from: () => ({
          innerJoin: () => ({ where: () => ({ limit: async () => [] }) }),
        }),
      })),
    };
    mocks.getDb.mockResolvedValue(proofDb);

    await expect(processLiveZoomTickets()).resolves.toMatchObject({ processed: 0, sent: 0, skipped: "disabled" });
    expect(proofDb.select).not.toHaveBeenCalled();

    await expect(processOpenLiveRegistrationTicket(999)).resolves.toMatchObject({ processed: 0, sent: 0, skipped: "not_open_registration" });
    await expect(processLiveZoomTickets(1, 999, true)).resolves.toMatchObject({ processed: 0, sent: 0, skipped: "not_open_registration" });
    expect(proofDb.select).toHaveBeenCalledTimes(2);
    expect(mocks.registerApprovedLiveAttendee).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });
});
