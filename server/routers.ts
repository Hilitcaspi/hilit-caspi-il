import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createSingleOfWeekApplication,
  hasRecentSingleOfWeekApplication,
  listSingleOfWeekApplications,
  updateSingleOfWeekReviewStatus,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

const MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024;
const RESUBMISSION_COOLDOWN_MS = 60 * 60 * 1000;
const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"] as const;

const submissionInput = z.object({
  fullName: z.string().trim().min(2, "יש להזין שם מלא").max(120),
  age: z.number().int().min(18, "ההגשה מיועדת למועמדים ולמועמדות מגיל 18").max(99),
  city: z.string().trim().min(2, "יש להזין עיר או אזור").max(120),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "יש להזין מספר טלפון תקין"),
  selfDescription: z.string().trim().min(10, "כתבו כמה מילים על עצמכם").max(800),
  desiredPartner: z.string().trim().min(10, "כתבו מה חשוב לכם בקשר").max(800),
  relationshipStatus: z.enum(["single", "divorced", "widowed", "separated", "other"]),
  hasChildren: z.boolean(),
  instagramUsername: z
    .string()
    .trim()
    .transform(value => value.replace(/^@+/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "שם המשתמש באינסטגרם אינו תקין")),
  photoBase64: z.string().min(32).max(5_600_000),
  photoFilename: z.string().trim().min(1).max(255),
  photoMimeType: z.enum(allowedImageMimes),
  databaseMembershipConsent: z.literal(true, { error: "נדרש אישור חברות במאגר" }),
  instagramFollowConsent: z.literal(true, { error: "נדרש אישור מעקב באינסטגרם" }),
  publicationConsent: z.literal(true, { error: "נדרשת הסכמה לפרסום בפינה" }),
});

function hasExpectedImageSignature(buffer: Buffer, mimeType: (typeof allowedImageMimes)[number]) {
  if (mimeType === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length > 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
}

function extensionFor(mimeType: (typeof allowedImageMimes)[number]) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  applications: router({
    submit: publicProcedure.input(submissionInput).mutation(async ({ input }) => {
      try {
        const hasRecentSubmission = await hasRecentSingleOfWeekApplication(
          input.phone,
          new Date(Date.now() - RESUBMISSION_COOLDOWN_MS),
        );
        if (hasRecentSubmission) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "כבר התקבלה הגשה ממספר זה בשעה האחרונה. אפשר לנסות שוב מאוחר יותר." });
        }

        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.photoBase64)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "קובץ התמונה אינו תקין" });
        }

        const photoBuffer = Buffer.from(input.photoBase64, "base64");
        if (!photoBuffer.length || photoBuffer.length > MAX_PHOTO_SIZE_BYTES || !hasExpectedImageSignature(photoBuffer, input.photoMimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "יש לצרף תמונת פנים תקינה מסוג JPG, PNG או WEBP עד 4MB" });
        }

        const photoKey = `single-of-week/${randomUUID()}.${extensionFor(input.photoMimeType)}`;
        const photo = await storagePut(photoKey, photoBuffer, input.photoMimeType);
        const id = await createSingleOfWeekApplication({
          fullName: input.fullName,
          age: input.age,
          city: input.city,
          phone: input.phone,
          selfDescription: input.selfDescription,
          desiredPartner: input.desiredPartner,
          relationshipStatus: input.relationshipStatus,
          hasChildren: input.hasChildren,
          instagramUsername: input.instagramUsername,
          photoKey: photo.key,
          photoUrl: photo.url,
          photoFilename: input.photoFilename,
          photoMimeType: input.photoMimeType,
          photoSizeBytes: photoBuffer.length,
          databaseMembershipConsent: input.databaseMembershipConsent,
          instagramFollowConsent: input.instagramFollowConsent,
          publicationConsent: input.publicationConsent,
        });
        return { id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Applications] Submission failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "לא ניתן לשמור את ההגשה כרגע. נסו שוב בעוד מספר דקות." });
      }
    }),
    list: adminProcedure.query(() => listSingleOfWeekApplications()),
    exportRows: adminProcedure.query(async () => {
      const applications = await listSingleOfWeekApplications();
      return applications.map(({ photoKey, photoUrl, photoFilename, photoMimeType, photoSizeBytes, ...application }) => ({
        ...application,
        photoAttached: Boolean(photoKey && photoFilename && photoMimeType && photoSizeBytes),
      }));
    }),
    updateReviewStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), reviewStatus: z.enum(["new", "reviewing", "approved", "rejected"]) }))
      .mutation(async ({ input }) => {
        await updateSingleOfWeekReviewStatus(input.id, input.reviewStatus);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
