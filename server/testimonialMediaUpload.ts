import express, { type Express, type Request } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { testimonialEvents, testimonialMedia, testimonialRecords } from "../drizzle/schema";
import { storagePut } from "./storage";
import { getTestimonialDb } from "./testimonialDb";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 80 * 1024 * 1024;

function safeFileName(req: Request): string {
  const raw = String(req.headers["x-file-name"] || "media");
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { decoded = raw; }
  return decoded.replace(/[^a-zA-Z0-9._\-א-ת ]/g, "_").slice(0, 200) || "media";
}

function extensionForType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mimeType] || "bin";
}

export function classifyTestimonialMedia(mimeType: string, byteSize: number): { mediaType: "image" | "video"; limit: number } {
  if (IMAGE_TYPES.has(mimeType)) {
    if (byteSize > IMAGE_LIMIT) throw new Error("IMAGE_TOO_LARGE");
    return { mediaType: "image", limit: IMAGE_LIMIT };
  }
  if (VIDEO_TYPES.has(mimeType)) {
    if (byteSize > VIDEO_LIMIT) throw new Error("VIDEO_TOO_LARGE");
    return { mediaType: "video", limit: VIDEO_LIMIT };
  }
  throw new Error("UNSUPPORTED_MEDIA_TYPE");
}

export function registerTestimonialMediaUpload(app: Express) {
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "יותר מדי ניסיונות העלאה. אפשר לנסות שוב מאוחר יותר." },
  });

  app.post(
    "/api/testimonials/media-upload",
    uploadLimiter,
    express.raw({ type: () => true, limit: "80mb" }),
    async (req, res) => {
      try {
        const token = String(req.query.token || "").trim();
        if (!/^[a-f0-9]{64}$/.test(token)) {
          res.status(401).json({ error: "קישור ההעלאה אינו תקין" });
          return;
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({ error: "לא התקבל קובץ" });
          return;
        }
        const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
        let classification: { mediaType: "image" | "video"; limit: number };
        try {
          classification = classifyTestimonialMedia(mimeType, req.body.length);
        } catch (error) {
          const code = error instanceof Error ? error.message : "UNSUPPORTED_MEDIA_TYPE";
          const message = code === "IMAGE_TOO_LARGE"
            ? "התמונה גדולה מ־10MB"
            : code === "VIDEO_TOO_LARGE"
              ? "הסרטון גדול מ־80MB"
              : "סוג הקובץ אינו נתמך";
          res.status(code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 413).json({ error: message });
          return;
        }

        const db = await getTestimonialDb();
        if (!db) {
          res.status(503).json({ error: "שירות ההעלאה אינו זמין כרגע" });
          return;
        }
        const [record] = await db.select({ id: testimonialRecords.id, status: testimonialRecords.status })
          .from(testimonialRecords)
          .where(eq(testimonialRecords.publicToken, token))
          .limit(1);
        if (!record || ["revoked", "archived"].includes(record.status)) {
          res.status(404).json({ error: "קישור ההעלאה אינו פעיל" });
          return;
        }

        const originalFileName = safeFileName(req);
        const relKey = `testimonials/${record.id}/${crypto.randomUUID()}.${extensionForType(mimeType)}`;
        const stored = await storagePut(relKey, req.body, mimeType);
        const now = Date.now();
        const result = await db.insert(testimonialMedia).values({
          recordId: record.id,
          mediaType: classification.mediaType,
          storageKey: stored.key,
          storageUrl: stored.url,
          originalFileName,
          mimeType,
          byteSize: req.body.length,
          status: "uploaded",
          uploadedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        const mediaId = Number((result[0] as { insertId?: number }).insertId);
        await db.insert(testimonialEvents).values({
          recordId: record.id,
          eventType: "media_uploaded",
          actorType: "customer",
          actorRef: null,
          metadata: JSON.stringify({ mediaType: classification.mediaType, byteSize: req.body.length, mimeType }),
          createdAt: now,
        });
        res.status(201).json({
          id: mediaId,
          mediaType: classification.mediaType,
          fileName: originalFileName,
          byteSize: req.body.length,
          message: "הקובץ הועלה. העלאה אינה אישור לפרסום.",
        });
      } catch (error) {
        console.error("[TestimonialMediaUpload] failed", error);
        res.status(500).json({ error: "לא הצלחנו להעלות את הקובץ כרגע" });
      }
    },
  );
}
