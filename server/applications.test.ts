import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createSingleOfWeekApplication: vi.fn(),
  hasRecentSingleOfWeekApplication: vi.fn(),
  listSingleOfWeekApplications: vi.fn(),
  updateSingleOfWeekReviewStatus: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { createSingleOfWeekApplication, hasRecentSingleOfWeekApplication, listSingleOfWeekApplications } from "./db";
import { appRouter } from "./routers";
import { storagePut } from "./storage";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user" | null = null, email = "test@example.com"): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: "test-user",
          name: "Test User",
          email,
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function jpegBase64() {
  const bytes = Buffer.alloc(32, 0);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes.toString("base64");
}

const validSubmission = {
  fullName: "בדיקה לדוגמה",
  age: 30,
  city: "תל אביב",
  phone: "050-0000000",
  selfDescription: "כמה מילים מספקות על האדם שמגיש מועמדות.",
  desiredPartner: "כמה מילים מספקות על קשר ואדם שאשמח להכיר.",
  relationshipStatus: "single" as const,
  hasChildren: false,
  instagramUsername: "test_account",
  photoBase64: jpegBase64(),
  photoFilename: "portrait.jpg",
  photoMimeType: "image/jpeg" as const,
  databaseMembershipConsent: true as const,
  instagramFollowConsent: true as const,
  publicationConsent: true as const,
};

describe("applications router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasRecentSingleOfWeekApplication).mockResolvedValue(false);
    vi.mocked(storagePut).mockResolvedValue({ key: "single-of-week/safe-photo.jpg", url: "/manus-storage/single-of-week/safe-photo.jpg" });
    vi.mocked(createSingleOfWeekApplication).mockResolvedValue(19);
  });

  it("stores a valid application using an S3 reference, not image bytes", async () => {
    const result = await appRouter.createCaller(createContext()).applications.submit(validSubmission);

    expect(result).toEqual({ id: 19 });
    expect(storagePut).toHaveBeenCalledWith(expect.stringMatching(/^single-of-week\/.+\.jpg$/), expect.any(Buffer), "image/jpeg");
    expect(createSingleOfWeekApplication).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "בדיקה לדוגמה",
      photoKey: "single-of-week/safe-photo.jpg",
      photoUrl: "/manus-storage/single-of-week/safe-photo.jpg",
      photoSizeBytes: 32,
    }));
    expect(createSingleOfWeekApplication).not.toHaveBeenCalledWith(expect.objectContaining({ photoBase64: expect.anything() }));
  });

  it("stores an optional DNA questionnaire result when supplied", async () => {
    const result = await appRouter.createCaller(createContext()).applications.submit({ ...validSubmission, dnaResult: "עוגן" });

    expect(result).toEqual({ id: 19 });
    expect(createSingleOfWeekApplication).toHaveBeenCalledWith(expect.objectContaining({ dnaResult: "עוגן" }));
  });

  it("accepts an Instagram username with a leading at-sign and stores its normalized value", async () => {
    await appRouter.createCaller(createContext()).applications.submit({ ...validSubmission, instagramUsername: "@test_account" });

    expect(createSingleOfWeekApplication).toHaveBeenCalledWith(expect.objectContaining({ instagramUsername: "test_account" }));
  });

  it("rejects a self-description shorter than ten characters before storage", async () => {
    await expect(appRouter.createCaller(createContext()).applications.submit({ ...validSubmission, selfDescription: "קצר" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects a desired-partner description shorter than ten characters before storage", async () => {
    await expect(appRouter.createCaller(createContext()).applications.submit({ ...validSubmission, desiredPartner: "קצר" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects an image with an invalid file signature before storage", async () => {
    const caller = appRouter.createCaller(createContext());
    const invalidFile = Buffer.from("this is not an image file").toString("base64");

    await expect(caller.applications.submit({ ...validSubmission, photoBase64: invalidFile })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(createSingleOfWeekApplication).not.toHaveBeenCalled();
  });

  it("limits repeat submissions from the same phone number", async () => {
    vi.mocked(hasRecentSingleOfWeekApplication).mockResolvedValue(true);

    await expect(appRouter.createCaller(createContext()).applications.submit(validSubmission)).rejects.toMatchObject<Partial<TRPCError>>({ code: "TOO_MANY_REQUESTS" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(createSingleOfWeekApplication).not.toHaveBeenCalled();
  });

  it("allows only an admin to list private applications", async () => {
    vi.mocked(listSingleOfWeekApplications).mockResolvedValue([]);

    await expect(appRouter.createCaller(createContext("user")).applications.list()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(createContext("admin")).applications.list()).resolves.toEqual([]);
    expect(listSingleOfWeekApplications).toHaveBeenCalledTimes(1);
  });

  it("allows the explicitly allowlisted manager email to list private applications", async () => {
    vi.mocked(listSingleOfWeekApplications).mockResolvedValue([]);

    await expect(appRouter.createCaller(createContext("user", "ofrivaturi@gmail.com")).applications.list()).resolves.toEqual([]);
    expect(listSingleOfWeekApplications).toHaveBeenCalledTimes(1);
  });

  it("limits the export data to an administrator and omits photo storage paths", async () => {
    vi.mocked(listSingleOfWeekApplications).mockResolvedValue([{
      id: 2,
      fullName: "בדיקה לדוגמה",
      photoKey: "single-of-week/private.jpg",
      photoUrl: "/manus-storage/single-of-week/private.jpg",
      photoFilename: "portrait.jpg",
      photoMimeType: "image/jpeg",
      photoSizeBytes: 32,
    }] as never);

    await expect(appRouter.createCaller(createContext("user")).applications.exportRows()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    const rows = await appRouter.createCaller(createContext("admin")).applications.exportRows();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 2, photoAttached: true });
    expect(rows[0]).not.toHaveProperty("photoKey");
    expect(rows[0]).not.toHaveProperty("photoUrl");
  });
});
