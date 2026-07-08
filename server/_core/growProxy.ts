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
 * IMPORTANT — body handling:
 * This route is registered AFTER express.json()/express.urlencoded(), so the
 * request stream has already been consumed. We therefore MUST rebuild the
 * upstream body from the already-parsed `req.body` (never re-read the raw
 * stream — `req.on("end")` would never fire again and the request would hang
 * forever). We also wrap every upstream call in a hard AbortController timeout
 * with a fast Cloudflare Worker fallback so a slow/blocked Meshulam edge can
 * never freeze the wallet.
 */
import type { Express, Request, Response } from "express";

const PROXY_BASE = "/api/grow-proxy";

// Fallback: the original Cloudflare Worker, used if Meshulam blocks our server
// egress IP via Incapsula (HTTP 403 + Incapsula HTML) or if the direct call
// times out. Cloudflare's network is not IP-blocked by Meshulam.
const CF_WORKER_BASE = "https://grow-proxy.hilitcaspi.workers.dev";

// Hard timeouts so a request can never hang indefinitely.
const PRIMARY_TIMEOUT_MS = 8000;
const FALLBACK_TIMEOUT_MS = 12000;

function looksBlocked(status: number, body: Buffer): boolean {
  // Incapsula blocks our server IP in multiple ways:
  // 1. HTTP 500 empty response (sensitive endpoints like /doPayment)
  // 2. HTTP 403 with Incapsula HTML
  // 3. HTTP 404 redirect to grow.business HTML (newest form of blocking)
  // Since Meshulam ALWAYS returns JSON for valid API calls, any non-JSON
  // response is a sign of blocking.
  if (status >= 500) return true;
  if (status === 403 || status === 404) {
    const head = body.subarray(0, 600).toString("utf8");
    if (/Incapsula|_Incapsula_Resource|Request unsuccessful|grow\.business/i.test(head)) return true;
    // If it's a 404 and doesn't look like JSON, it's likely a block
    if (status === 404 && !head.trimStart().startsWith("{")) return true;
  }
  // Any response that isn't JSON from Meshulam is suspicious
  if (body.length > 0) {
    const firstChar = body.subarray(0, 1).toString("utf8").trim();
    if (firstChar && firstChar !== "{" && firstChar !== "[" && status !== 200) return true;
  }
  return false;
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

// Incapsula blocks direct paths (e.g. /doPayment, /drawWalletPageData) but
// allows the /api/light/server/1.0/ prefix. Meshulam routes correctly either way.
const API_PREFIX = "/api/light/server/1.0";

function resolveUpstream(pathAfterBase: string): string {
  // pathAfterBase always starts with "/"
  if (pathAfterBase === "/prod" || pathAfterBase.startsWith("/prod/")) {
    const rest = pathAfterBase.slice("/prod".length) || "/";
    return `https://api.meshulam.co.il${API_PREFIX}${rest}`;
  }
  return `https://secure.meshulam.co.il${API_PREFIX}${pathAfterBase}`;
}

/**
 * Rebuild the upstream request body + content-type from express's already-parsed
 * `req.body`. Returns `undefined` body for GET/HEAD or empty payloads.
 */
function buildBody(req: Request): { body?: string; contentType?: string } {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return {};

  const raw = (req as any).body;
  if (raw == null || (typeof raw === "object" && Object.keys(raw).length === 0)) {
    return {};
  }

  const ct = (req.headers["content-type"] || "").toString().toLowerCase();

  // JSON body
  if (ct.includes("application/json")) {
    return { body: JSON.stringify(raw), contentType: "application/json" };
  }

  // urlencoded body (the Grow SDK uses this for createPaymentProcess etc.)
  if (ct.includes("application/x-www-form-urlencoded") || typeof raw === "object") {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
      else params.append(k, String(v));
    }
    return {
      body: params.toString(),
      contentType: "application/x-www-form-urlencoded",
    };
  }

  // Fallback: stringify whatever we have
  return { body: String(raw), contentType: ct || undefined };
}

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<FetchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function registerGrowProxy(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    try {
      const fullPath = req.originalUrl; // e.g. /api/grow-proxy/prod/api/...?x=1
      const afterBase = fullPath.slice(PROXY_BASE.length) || "/";
      const upstreamUrl = resolveUpstream(afterBase);

      // Build forwarded headers from express-parsed request.
      const headers: Record<string, string> = { ...SPOOF_HEADERS };
      for (const [key, value] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (HOP_BY_HOP.has(lower)) continue;
        if (lower === "content-type") continue; // set from rebuilt body below
        if (typeof value === "string") headers[key] = value;
        else if (Array.isArray(value)) headers[key] = value.join(", ");
      }

      const method = req.method.toUpperCase();
      const { body, contentType } = buildBody(req);
      if (contentType) headers["Content-Type"] = contentType;

      const init: RequestInit = { method, headers };
      if (body !== undefined) init.body = body;

      // Primary attempt: direct from this server to Meshulam (hard timeout).
      let upstream: FetchResponse | null = null;
      let buf: Buffer | null = null;
      let status = 0;
      let contentTypeOut: string | null = null;
      let primaryFailed = false;

      try {
        upstream = await fetchWithTimeout(upstreamUrl, init, PRIMARY_TIMEOUT_MS);
        buf = Buffer.from(await upstream.arrayBuffer());
        status = upstream.status;
        contentTypeOut = upstream.headers.get("content-type");
      } catch (e: any) {
        primaryFailed = true;
        console.warn(
          "[GrowProxy] Direct Meshulam call failed/timed out:",
          e?.name || e?.message || e,
        );
      }

      // Fallback: if direct attempt timed out, errored, or was Incapsula-blocked,
      // retry via the Cloudflare Worker (different egress network).
      if (primaryFailed || (buf && looksBlocked(status, buf))) {
        try {
          const fbUrl = `${CF_WORKER_BASE}${afterBase}`;
          const fb = await fetchWithTimeout(fbUrl, init, FALLBACK_TIMEOUT_MS);
          const fbBuf = Buffer.from(await fb.arrayBuffer());
          if (!looksBlocked(fb.status, fbBuf)) {
            buf = fbBuf;
            status = fb.status;
            contentTypeOut = fb.headers.get("content-type");
            console.log("[GrowProxy] Served via Cloudflare Worker fallback");
          }
        } catch (fbErr: any) {
          console.warn(
            "[GrowProxy] Worker fallback failed:",
            fbErr?.name || fbErr?.message || fbErr,
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

      if (buf == null) {
        // Both attempts failed — return a fast error instead of hanging.
        res
          .status(502)
          .json({ status: false, err: { message: "grow upstream unavailable" } });
        return;
      }

      if (contentTypeOut) res.setHeader("Content-Type", contentTypeOut);
      res.status(status).send(buf);
    } catch (err: any) {
      console.error("[GrowProxy] Proxy error:", err?.message || err);
      res
        .status(502)
        .json({ status: false, err: { message: "grow proxy error" } });
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
