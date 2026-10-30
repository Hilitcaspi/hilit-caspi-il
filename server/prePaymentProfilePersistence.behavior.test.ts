import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  notifyOwner: vi.fn().mockResolvedValue(true),
  ga4SignUp: vi.fn().mockResolvedValue(undefined),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, resetDb: vi.fn() }));
vi.mock("./brevo", () => ({
  sendEmail: mocks.sendEmail,
  addContactToList: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./_core/ga4", () => ({
  ga4GenerateLead: vi.fn().mockResolvedValue(undefined),
  ga4SignUp: mocks.ga4SignUp,
  clientIdFromEmail: vi.fn(() => "synthetic-client-id"),
}));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appRouter } from "./routers";

const DRAFT_TOKEN = "a".repeat(64);
const OTHER_DRAFT_TOKEN = "b".repeat(64);

type DbHarness = ReturnType<typeof createDbHarness>;

function createDbHarness(selectRows: unknown[][]) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  let selectIndex = 0;

  const db = {
    select: vi.fn(() => {
      const rows = selectRows[selectIndex++] ?? [];
      const limit = vi.fn().mockResolvedValue(rows);
      const where = vi.fn(() => ({
        limit,
        orderBy: vi.fn(() => ({ limit })),
      }));
      return { from: vi.fn(() => ({ where })) };
    }),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push(values);
        return Promise.resolve([{ insertId: 42 }]);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
  };

  return { db, inserts, updates };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const fullDraftInput = {
  firstName: "Synthetic",
  lastName: "Draft",
  gender: "female" as const,
  seekingGender: "male" as const,
  age: 34,
  birthDate: "1992-01-10",
  city: "Test City",
  phone: "0500000000",
  email: "synthetic.draft@example.test",
  height: 168,
  education: "bachelor" as const,
  religiosity: "secular" as const,
  occupation: "Synthetic QA",
  about: "Synthetic profile only",
  interests: "music,travel",
  maritalStatus: "single" as const,
  hasKids: false,
  numKids: 0,
  wantsKids: "yes" as const,
  dnaType: "anchor" as const,
  minAgePreference: 31,
  maxAgePreference: 40,
  minHeightPreference: 170,
  maxHeightPreference: 195,
  religiosityPreference: "secular,traditional",
  acceptsKids: "open" as const,
  openToPartnerWithKids: "yes" as const,
  locationPreference: "close" as const,
  partnerDescription: "Synthetic description",
  consentMatchmaking: true,
  consentDataSharing: true,
  consentEmailMarketing: false,
  deferUntilPayment: true,
};

function existingDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    age: 34,
    city: "Test City",
    email: "synthetic.draft@example.test",
    isPaid: false,
    isActive: false,
    questionnaireToken: DRAFT_TOKEN,
    questionnaireCompletedAt: null,
    firstName: "Synthetic",
    birthDate: "1989-03-20",
    hasKids: true,
    numKids: 2,
    acceptsKids: true,
    seekingGender: "any",
    photoUrl: "https://storage.example.test/old-photo.jpg",
    ...overrides,
  };
}

function tokenLookupRows(profile = existingDraft()): unknown[][] {
  return [[profile], [profile]];
}

describe("registerBasicProfile pre-payment draft ownership and persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storagePut.mockResolvedValue({ url: "https://storage.example.test/new-photo.jpg" });
    vi.stubGlobal("fetch", vi.fn(() => {
      throw new Error("network is blocked in focused behavior tests");
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("stores a new inactive unpaid draft and sends nothing before payment", async () => {
    const harness: DbHarness = createDbHarness([[], [{ id: 91 }]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile(fullDraftInput);
    await Promise.resolve();

    expect(result).toMatchObject({ singleId: 42, success: true });
    expect(harness.inserts).toHaveLength(1);
    expect(harness.inserts[0]).toMatchObject({
      firstName: "Synthetic",
      gender: "female",
      seekingGender: "male",
      age: 34,
      birthDate: "1992-01-10",
      city: "Test City",
      phone: "0500000000",
      email: "synthetic.draft@example.test",
      occupation: "Synthetic QA",
      dnaType: "anchor",
      isPaid: false,
      isActive: false,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.ga4SignUp).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("rejects an existing email or phone match without a bearer proof before uploads or writes", async () => {
    const harness = createDbHarness([[existingDraft()]]);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      photoBase64: "data:image/jpeg;base64,AA==",
      photoMime: "image/jpeg",
    })).rejects.toMatchObject({ code: "FORBIDDEN", message: "resume-required" });

    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates).toHaveLength(0);
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("updates the intended existing draft and returns its token only with the correct draft token", async () => {
    const profile = existingDraft();
    const harness = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
      occupation: "Updated synthetic QA",
    });

    expect(result).toMatchObject({ singleId: 42, questionnaireToken: DRAFT_TOKEN, success: true, alreadyExists: false });
    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates[0]).toMatchObject({
      occupation: "Updated synthetic QA",
      gender: "female",
      isPaid: false,
      isActive: false,
    });
  });

  it("rejects a valid token that resolves to a different contact record", async () => {
    const draftProfile = existingDraft();
    const collidingProfile = existingDraft({ id: 88, questionnaireToken: OTHER_DRAFT_TOKEN });
    const harness = createDbHarness([[draftProfile], [collidingProfile]]);
    mocks.getDb.mockResolvedValue(harness.db);

    await expect(appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
    })).rejects.toMatchObject({ code: "FORBIDDEN", message: "resume-required" });

    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates).toHaveLength(0);
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("gates an existing paid profile return and never exposes its questionnaire token by email alone", async () => {
    const paid = existingDraft({ isPaid: true, isActive: true });
    const unauthorized = createDbHarness([[paid]]);
    mocks.getDb.mockResolvedValue(unauthorized.db);

    await expect(appRouter.createCaller(createPublicContext()).singles.registerBasicProfile(fullDraftInput))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "resume-required" });
    expect(unauthorized.inserts).toHaveLength(0);
    expect(unauthorized.updates).toHaveLength(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();

    const authorized = createDbHarness(tokenLookupRows(paid));
    mocks.getDb.mockResolvedValue(authorized.db);
    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({ ...fullDraftInput, draftToken: DRAFT_TOKEN });
    expect(result).toMatchObject({ singleId: 42, questionnaireToken: DRAFT_TOKEN, alreadyExists: true });
    expect(authorized.inserts).toHaveLength(0);
    expect(authorized.updates).toHaveLength(0);
  });

  it("preserves omitted birth date, children, accepts-kids, and seeking-gender fields for an existing draft", async () => {
    const profile = existingDraft();
    const harness = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(harness.db);
    const { birthDate: _birthDate, hasKids: _hasKids, numKids: _numKids, acceptsKids: _acceptsKids, seekingGender: _seekingGender, ...omitted } = fullDraftInput;

    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({ ...omitted, draftToken: DRAFT_TOKEN });

    expect(harness.updates[0]).toMatchObject({
      birthDate: "1989-03-20",
      hasKids: true,
      numKids: 2,
      acceptsKids: true,
      seekingGender: "any",
    });
  });

  it("applies explicit optional-field changes for an authorized existing draft", async () => {
    const profile = existingDraft();
    const harness = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(harness.db);

    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
      birthDate: "1990-04-15",
      hasKids: false,
      numKids: 0,
      acceptsKids: "no",
      seekingGender: "male",
    });

    expect(harness.updates[0]).toMatchObject({
      birthDate: "1990-04-15",
      hasKids: false,
      numKids: 0,
      acceptsKids: false,
      seekingGender: "male",
    });
  });

  it("keeps an old photo when omitted, remote, or upload fails and replaces it only after a valid data-url upload", async () => {
    const profile = existingDraft();
    const omittedPhoto = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(omittedPhoto.db);
    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({ ...fullDraftInput, draftToken: DRAFT_TOKEN });
    expect(omittedPhoto.updates[0]).not.toHaveProperty("photoUrl");
    expect(mocks.storagePut).not.toHaveBeenCalled();

    const remotePhoto = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(remotePhoto.db);
    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
      photoBase64: "https://images.example.test/not-a-data-url.jpg",
      photoMime: "image/jpeg",
    });
    expect(remotePhoto.updates[0]).not.toHaveProperty("photoUrl");
    expect(mocks.storagePut).not.toHaveBeenCalled();

    const uploadFailure = createDbHarness(tokenLookupRows(profile));
    mocks.storagePut.mockRejectedValueOnce(new Error("synthetic storage failure"));
    mocks.getDb.mockResolvedValue(uploadFailure.db);
    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
      photoBase64: "data:image/jpeg;base64,AA==",
      photoMime: "image/jpeg",
    });
    expect(uploadFailure.updates[0]).not.toHaveProperty("photoUrl");

    const replacement = createDbHarness(tokenLookupRows(profile));
    mocks.getDb.mockResolvedValue(replacement.db);
    await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      draftToken: DRAFT_TOKEN,
      photoBase64: "data:image/jpeg;base64,AA==",
      photoMime: "image/jpeg",
    });
    expect(mocks.storagePut).toHaveBeenCalledTimes(2);
    expect(replacement.updates[0]).toMatchObject({ photoUrl: "https://storage.example.test/new-photo.jpg" });
  });

  it("keeps a validated free-token update flow usable for its matching stored email", async () => {
    const profile = existingDraft();
    const harness = createDbHarness([[
      {
        id: 7,
        token: "synthetic-validated-token",
        boundEmail: "synthetic.draft@example.test",
        usedAt: null,
        usedByEmail: null,
        expiresAt: Date.now() + 60_000,
      },
    ], [profile], [{ id: 91 }]]);
    mocks.getDb.mockResolvedValue(harness.db);

    const result = await appRouter.createCaller(createPublicContext()).singles.registerBasicProfile({
      ...fullDraftInput,
      deferUntilPayment: false,
      freeToken: "SYNTHETIC-VALIDATED-TOKEN",
    });
    await Promise.resolve();

    expect(result).toMatchObject({ singleId: 42, questionnaireToken: DRAFT_TOKEN, success: true, alreadyExists: false });
    expect(harness.inserts).toHaveLength(0);
    expect(harness.updates[0]).toMatchObject({ isPaid: true, isActive: true, gender: "female" });
    expect(harness.updates).toContainEqual(expect.objectContaining({
      status: "client_database",
      singleId: 42,
      product: "database",
    }));
  });
});
