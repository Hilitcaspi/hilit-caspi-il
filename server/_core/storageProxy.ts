import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Pipe the image content directly instead of redirecting.
      // This ensures email clients (which don't follow 307 redirects) can load images,
      // and avoids issues with signed URLs expiring.
      const imageResp = await fetch(url);
      if (!imageResp.ok) {
        // Fallback to redirect if piping fails
        res.set("Cache-Control", "no-store");
        res.redirect(307, url);
        return;
      }

      const contentType = imageResp.headers.get("content-type") || "application/octet-stream";
      const contentLength = imageResp.headers.get("content-length");

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24h
      res.set("Access-Control-Allow-Origin", "*");
      if (contentLength) {
        res.set("Content-Length", contentLength);
      }

      // Stream the response body to the client
      const reader = imageResp.body?.getReader();
      if (!reader) {
        res.status(502).send("Failed to read image stream");
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
