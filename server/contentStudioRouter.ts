import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { contentStudioKindSchema } from "../shared/contentStudio";
import { getDb } from "./db";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import {
  archiveContentStudioDocument,
  generateContentStudioDraft,
  getContentStudioDocument,
  getPublicLandingPageBySlug,
  listContentStudioDocuments,
  publishContentStudioLandingPage,
  unpublishContentStudioLandingPage,
  updateContentStudioDocument,
} from "./contentStudioService";

const templateKeySchema = z.string().trim().regex(/^[a-z0-9_-]{1,80}$/i).optional();
const cleanTextSchema = z.string().trim().min(1);

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "מסד הנתונים אינו זמין" });
  return db;
}

function actorFromContext(ctx: {
  user?: { email?: string | null; openId?: string | null; name?: string | null } | null;
  teamMember?: { email?: string | null; name?: string | null } | null;
}) {
  return {
    identifier: ctx.teamMember?.email || ctx.user?.email || ctx.user?.openId || ctx.teamMember?.name || ctx.user?.name || "team",
  };
}

function studioError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (error instanceof Error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  throw new TRPCError({ code: "BAD_REQUEST", message: "בקשת הסטודיו אינה תקינה" });
}

/** Internal studio actions never create external delivery, publishing, or uploads. */
export const contentStudioRouter = router({
  generate: teamProcedure
    .input(z.object({
      kind: contentStudioKindSchema,
      title: cleanTextSchema.max(220),
      brief: cleanTextSchema.max(8_000),
      templateKey: templateKeySchema,
    }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateContentStudioDraft({
          db: await requireDb(),
          actor: actorFromContext(ctx),
          value: input,
        });
      } catch (error) {
        return studioError(error);
      }
    }),

  list: teamProcedure
    .input(z.object({
      kind: contentStudioKindSchema.optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }).optional())
    .query(async ({ input }) => {
      try {
        return await listContentStudioDocuments({
          db: await requireDb(),
          kind: input?.kind,
          status: input?.status,
          limit: input?.limit || 30,
        });
      } catch (error) {
        return studioError(error);
      }
    }),

  get: teamProcedure
    .input(z.object({ id: z.number().int().positive() }).strict())
    .query(async ({ input }) => {
      try {
        return await getContentStudioDocument({ db: await requireDb(), id: input.id });
      } catch (error) {
        return studioError(error);
      }
    }),

  update: teamProcedure
    .input(z.object({
      id: z.number().int().positive(),
      title: cleanTextSchema.max(220).optional(),
      brief: cleanTextSchema.max(8_000).optional(),
      templateKey: templateKeySchema,
      content: z.unknown(),
    }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContentStudioDocument({
          db: await requireDb(),
          actor: actorFromContext(ctx),
          value: input,
        });
      } catch (error) {
        return studioError(error);
      }
    }),

  archive: teamProcedure
    .input(z.object({ id: z.number().int().positive() }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveContentStudioDocument({ db: await requireDb(), id: input.id, actor: actorFromContext(ctx) });
      } catch (error) {
        return studioError(error);
      }
    }),

  publishLandingPage: teamProcedure
    .input(z.object({
      id: z.number().int().positive(),
      slug: cleanTextSchema.max(160),
      confirmation: z.literal(true),
    }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await publishContentStudioLandingPage({ db: await requireDb(), ...input, actor: actorFromContext(ctx) });
      } catch (error) {
        return studioError(error);
      }
    }),

  unpublish: teamProcedure
    .input(z.object({ id: z.number().int().positive() }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await unpublishContentStudioLandingPage({ db: await requireDb(), id: input.id, actor: actorFromContext(ctx) });
      } catch (error) {
        return studioError(error);
      }
    }),

  /** Public data path: no drafts, emails, advertisements, courses, raw JSON, or versions. */
  publicBySlug: publicProcedure
    .input(z.object({ slug: cleanTextSchema.max(160) }).strict())
    .query(async ({ input }) => {
      try {
        return await getPublicLandingPageBySlug({ db: await requireDb(), slug: input.slug });
      } catch (error) {
        // A malformed slug must never disclose whether a draft exists.
        if (error instanceof TRPCError) throw error;
        return null;
      }
    }),
});
