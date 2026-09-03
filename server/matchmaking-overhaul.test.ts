import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock admin context
function createAdminContext(): { ctx: TrpcContext } {
  const user = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus" as const,
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {} as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
    teamMember: null,
  };
  return { ctx };
}

function createNonAdminContext(): { ctx: TrpcContext } {
  const user = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus" as const,
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {} as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
    teamMember: null,
  };
  return { ctx };
}

describe("CRM Matchmaking Overhaul - Procedures", () => {
  const caller = appRouter.createCaller;

  describe("matchmaking.updateMatchDetailStatus", () => {
    it("should reject non-admin users", async () => {
      const { ctx } = createNonAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).updateMatchDetailStatus({ matchId: 1, status: "talking" })
      ).rejects.toThrow();
    });

    it("should accept valid status values for admin", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      // This will fail because match doesn't exist in test DB, but validates input parsing
      try {
        await (trpc.matchmaking as any).updateMatchDetailStatus({ matchId: 999999, status: "talking" });
      } catch (e: any) {
        // Should not be an input validation error
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });

    it("should reject invalid status values", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).updateMatchDetailStatus({ matchId: 1, status: "invalid_status" })
      ).rejects.toThrow();
    });
  });

  describe("matchmaking.deactivateSingle", () => {
    it("should reject non-admin users", async () => {
      const { ctx } = createNonAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).deactivateSingle({ id: 1 })
      ).rejects.toThrow();
    });

    it("should accept valid input for admin", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      // Will fail because single doesn't exist, but validates input parsing
      try {
        await (trpc.matchmaking as any).deactivateSingle({ id: 999999 });
      } catch (e: any) {
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });
  });

  describe("matchmaking.updateSingleInline", () => {
    it("should reject non-admin users", async () => {
      const { ctx } = createNonAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).updateSingleInline({ id: 1, city: "Tel Aviv" })
      ).rejects.toThrow();
    });

    it("should accept partial updates for admin", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      try {
        await (trpc.matchmaking as any).updateSingleInline({
          id: 999999,
          city: "Tel Aviv",
          shomerShabbat: true,
          smokingStatus: "no",
        });
      } catch (e: any) {
        // Should not be input validation error
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });

    it("should reject invalid smoking status", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).updateSingleInline({
          id: 1,
          smokingStatus: "invalid_value",
        })
      ).rejects.toThrow();
    });
  });

  describe("matchmaking.listPendingMatches", () => {
    it("should reject non-admin users", async () => {
      const { ctx } = createNonAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).listPendingMatches()
      ).rejects.toThrow();
    });

    it("should return array for admin", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      const result = await (trpc.matchmaking as any).listPendingMatches();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("matchmaking.getSinglesWithoutMatches", () => {
    it("should reject non-admin users", async () => {
      const { ctx } = createNonAdminContext();
      const trpc = caller(ctx);
      await expect(
        (trpc.matchmaking as any).getSinglesWithoutMatches()
      ).rejects.toThrow();
    });

    it("should return array for admin", async () => {
      const { ctx } = createAdminContext();
      const trpc = caller(ctx);
      const result = await (trpc.matchmaking as any).getSinglesWithoutMatches();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
