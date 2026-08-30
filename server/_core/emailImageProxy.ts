import type { Express, Request, Response } from "express";
import { extractEmailImageKeyFromPath } from "../emailImages";
import { storageGetSignedUrl } from "../storage";

const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function sendFallback(res: Response) {
  res.set("Content-Type", "image/png");
  res.set("Content-Length", String(TRANSPARENT_PIXEL.length));
  res.set("Cache-Control", "no-store, max-age=0");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Email-Image-Fallback", "1");
  res.status(200).send(TRANSPARENT_PIXEL);
}

async function fetchImageWithRetry(key: string): Promise<{ body: Buffer; contentType: string }> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const signedUrl = await storageGetSignedUrl(key);
      const response = await fetch(signedUrl, {
        redirect: "follow",
        headers: { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
        throw new Error(`Unexpected image response ${response.status} ${contentType}`);
      }
      return { body: Buffer.from(await response.arrayBuffer()), contentType };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 150));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to load email image");
}

export function registerEmailImageProxy(app: Express) {
  app.get("/email-images/*", async (req: Request, res: Response) => {
    const key = extractEmailImageKeyFromPath((req.params as Record<string, string>)[0] || "");
    if (!key) {
      res.status(404).send("Image not found");
      return;
    }

    try {
      const image = await fetchImageWithRetry(key);
      res.set("Content-Type", image.contentType);
      res.set("Content-Length", String(image.body.length));
      res.set("Cache-Control", "public, max-age=604800, immutable");
      res.set("Access-Control-Allow-Origin", "*");
      res.set("X-Content-Type-Options", "nosniff");
      res.status(200).send(image.body);
    } catch (error) {
      console.error(`[EmailImageProxy] failed for key ${key}:`, error);
      sendFallback(res);
    }
  });
}
