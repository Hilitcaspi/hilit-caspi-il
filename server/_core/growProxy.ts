/**
 * Local Grow Payment Proxy
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the external Cloudflare Worker (grow-proxy.hilitcaspi.workers.dev)
 * that the browser-side Grow SDK (`client/public/grow-sdk/gs.min.js`) relied on.
 *
 * The Grow SDK monkey-patches `window.fetch` so that browser requests to
 * Meshulam domains are routed through a same-origin proxy (to bypass CORS and
 * Incapsula bot protection that blocks cross-origin browser calls). The patched
 * SDK now points at `/api/grow-proxy` on THIS server instead of the Worker.
 *
 * URL mapping (mirrors the original Worker behavior):
 *   /api/grow-proxy/prod/<path>  → https://api.meshulam.co.il/<path>
 *   /api/grow-proxy/<path>       → https://secure.meshulam.co.il/<path>
 *
 * Notes:
 * - The runtime config (params.json) calls https://secure.meshulam.co.il directly
 *   in PRODUCTION; the patched SDK rewrites that host to this proxy as well.
 * - We forward method, query string, headers (minus hop-by-hop / host), and the
 *   raw body. We must register this BEFORE express.json so the raw body is intact.
 */
import type { Express, Request, Response } from "express";

const PROXY_BASE = "/api/grow-proxy";

// Fallback: the original Cloudflare Worker, used only if Meshulam blocks our
// server egress IP via Incapsula (HTTP 403 + Incapsula HTML). Cloudflare's
// network is not IP-blocked by Meshulam, so it keeps payments working even if
// the Manus production egress IP is ever blacklisted.
const CF_WORKER_BASE = "https://grow-proxy.hilitcaspi.workers.dev";

function looksBlocked(status: number, body: Buffer): boolean {
  if (status !== 403 && status !== 503) return false;
  const head = body.subarray(0, 600).toString("utf8");
  return /Incapsula|_Incapsula_Resource|Request unsuccessful/i.test(head);
}

// Browser-like headers to avoid Incapsula 403 blocking on server→Meshulam calls.
const SPOOF_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: "https://secure.meshulam.co.il",
  Referer: "https://secure.meshulam.co.il/",
};

// Headers we must NOT forward upstream.
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "origin",
  "referer",
  "cookie",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

function resolveUpstream(pathAfterBase: string): string {
  // pathAfterBase always starts with "/"
  if (pathAfterBase === "/prod" || pathAfterBase.startsWith("/prod/")) {
    const rest = pathAfterBase.slice("/prod".length) || "/";
    return `https://api.meshulam.co.il${rest}`;
  }
  return `https://secure.meshulam.co.il${pathAfterBase}`;
}

export function registerGrowProxy(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    try {
      // Everything after PROXY_BASE, preserving the original query string.
      const fullPath = req.originalUrl; // e.g. /api/grow-proxy/prod/api/...?x=1
      const afterBase = fullPath.slice(PROXY_BASE.length) || "/";
      const upstreamUrl = resolveUpstream(afterBase);

      // Build forwarded headers.
      const headers: Record<string, string> = { ...SPOOF_HEADERS };
      for (const [key, value] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (HOP_BY_HOP.has(lower)) continue;
        if (typeof value === "string") headers[key] = value;
        else if (Array.isArray(value)) headers[key] = value.join(", ");
      }

      const method = req.method.toUpperCase();
      const hasBody = method !== "GET" && method !== "HEAD";

      // Collect the raw request body (this route runs before express.json).
      let body: Buffer | undefined;
      if (hasBody) {
        body = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on("data", (c) => chunks.push(Buffer.from(c)));
          req.on("end", () => resolve(Buffer.concat(chunks)));
          req.on("error", reject);
        });
      }

      const bodyInit =
        hasBody && body && body.length > 0 ? new Uint8Array(body) : undefined;

      const doFetch = (url: string) =>
        fetch(url, { method, headers, body: bodyInit });

      // Primary attempt: direct from this server to Meshulam.
      let upstream = await doFetch(upstreamUrl);
      let buf = Buffer.from(await upstream.arrayBuffer());
      let status = upstream.status;
      let contentType = upstream.headers.get("content-type");

      // Fallback: if Meshulam blocks our egress IP (Incapsula), retry via the
      // Cloudflare Worker, whose network is not IP-blocked.
      if (looksBlocked(status, buf)) {
        try {
          const fbUrl = `${CF_WORKER_BASE}${afterBase}`;
          const fb = await doFetch(fbUrl);
          const fbBuf = Buffer.from(await fb.arrayBuffer());
          if (!looksBlocked(fb.status, fbBuf)) {
            upstream = fb;
            buf = fbBuf;
            status = fb.status;
            contentType = fb.headers.get("content-type");
            console.log("[GrowProxy] Served via Cloudflare Worker fallback");
          }
        } catch (fbErr: any) {
          console.warn(
            "[GrowProxy] Worker fallback failed:",
            fbErr?.message || fbErr,
          );
        }
      }

      // CORS — allow the browser SDK (same-origin in prod, but be permissive).
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-KEY",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );

      if (contentType) res.setHeader("Content-Type", contentType);
      res.status(status).send(buf);
    } catch (err: any) {
      console.error("[GrowProxy] Proxy error:", err?.message || err);
      res.status(502).json({ status: false, err: { message: "grow proxy error" } });
    }
  };

  // Preflight
  app.options(`${PROXY_BASE}/*`, (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-KEY",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.sendStatus(204);
  });

  app.all(`${PROXY_BASE}/*`, handler);
}
