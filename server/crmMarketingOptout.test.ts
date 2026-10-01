import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => ({
  ...await importOriginal<typeof import("./db")>(),
  getDb: vi.fn(),
}));
vi.mock("./emailUnsubscribe", async (importOriginal) => ({
  ...await importOriginal<typeof import("./emailUnsubscribe")>(),
  applyEmailUnsubscribe: vi.fn(),
}));
vi.mock("./brevo", async (importOriginal) => ({
  ...await importOriginal<typeof import("./brevo")>(),
  blacklistBrevoContactEmail: vi.fn(),
}));

import { appRouter } from "./routers";
import { getDb } from "./db";
import { applyEmailUnsubscribe } from "./emailUnsubscribe";
import { blacklistBrevoContactEmail } from "./brevo";

const context = (role?: "admin" | "user") => ({
  user: role ? { id: 1, role } : null,
  teamMember: null,
  req: {}, res: {},
}) as unknown as TrpcContext;

describe("CRM marketing opt-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(async () => [{ email: "person@example.com" }]);
    vi.mocked(getDb).mockResolvedValue({ select: vi.fn(() => chain) } as any);
    vi.mocked(applyEmailUnsubscribe).mockResolvedValue(true);
    vi.mocked(blacklistBrevoContactEmail).mockResolvedValue("blacklisted");
  });

  it("rejects unauthenticated and non-admin users before reading the CRM", async () => {
    await expect(appRouter.createCaller(context()).crm.unsubscribeMarketingEmail({ id: 24 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(context("user")).crm.unsubscribeMarketingEmail({ id: 24 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("uses the stored lead email and syncs Brevo without deleting the lead", async () => {
    const result = await appRouter.createCaller(context("admin")).crm.unsubscribeMarketingEmail({ id: 24 });
    expect(result).toEqual({ success: true, brevoSynced: true });
    expect(applyEmailUnsubscribe).toHaveBeenCalledWith({ email: "person@example.com", source: "admin_crm" });
    expect(blacklistBrevoContactEmail).toHaveBeenCalledWith("person@example.com");
  });

  it("reports partial synchronization instead of hiding a provider error", async () => {
    vi.mocked(blacklistBrevoContactEmail).mockResolvedValue("failed");
    const result = await appRouter.createCaller(context("admin")).crm.unsubscribeMarketingEmail({ id: 24 });
    expect(result).toEqual({ success: true, brevoSynced: false });
  });
});
