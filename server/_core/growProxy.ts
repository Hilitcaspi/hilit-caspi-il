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
 * forever). Every upstream call has a hard timeout. A fallback is permitted
 * only when retrying cannot replay an unknown payment outcome.
 */
import type { Express, Request, Response } from "express";
import { addToPaymentLogBuffer } from "../routers";

const PROXY_BASE = "/api/grow-proxy";

// Fallback: the original Cloudflare Worker. It is intentionally not a general
// retry path for payment mutations: a direct request may already have charged.
const CF_WORKER_BASE = "https://grow-proxy.hilitcaspi.workers.dev";

// Hard timeouts so a request can never hang indefinitely.
const PRIMARY_TIMEOUT_MS = 8000;
const FALLBACK_TIMEOUT_MS = 12000;

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
// IMPORTANT: The SDK's fetch interceptor (gs.min.js) strips the domain and keeps
// the full path. So paths already containing /api/light/ must NOT be re-prefixed.
const API_PREFIX = "/api/light/server/1.0";

/**
 * POST endpoints seen in the checked-in Grow SDK that only retrieve wallet or
 * already-created payment state. This is an allowlist, not a naming heuristic:
 * every other POST is treated as potentially state-changing and is never
 * replayed after an ambiguous direct attempt.
 */
const READ_ONLY_POST_ENDPOINTS = new Set([
  "drawWalletPageData",
  "getBitPaymentStatus",
  "getInstantPaymentDeepLink",
  "getInstantPaymentStatus",
  "getPayBoxTransactionStatus",
]);

export type GrowProxyRequestSafety = "safe-retry" | "mutation-or-unknown";

function stripQuery(path: string): string {
  return path.split("?", 1)[0] || "/";
}

function endpointFromPath(pathAfterBase: string): string | undefined {
  let pathname = stripQuery(pathAfterBase);
  if (pathname === "/prod") pathname = "/";
  else if (pathname.startsWith("/prod/")) pathname = pathname.slice("/prod".length);

  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1);
}

/**
 * Classifies whether an upstream attempt may be retried through the Worker.
 * GET/HEAD are safe by HTTP semantics; POST is safe only for this explicit SDK
 * lookup allowlist. Unknown POST/PUT/PATCH/DELETE routes are fail-closed.
 */
export function classifyGrowProxyRequest(
  method: string,
  pathAfterBase: string,
): GrowProxyRequestSafety {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") return "safe-retry";
  return normalizedMethod === "POST" && READ_ONLY_POST_ENDPOINTS.has(endpointFromPath(pathAfterBase) || "")
    ? "safe-retry"
    : "mutation-or-unknown";
}

function needsPrefix(path: string): boolean {
  // If the path already starts with /api/light/ it came from the SDK with the
  // full Meshulam path intact — do NOT add another prefix.
  return !path.startsWith("/api/light/") && !path.startsWith("/api/providers/");
}

function resolveUpstream(pathAfterBase: string): string {
  // pathAfterBase always starts with "/"
  if (pathAfterBase === "/prod" || pathAfterBase.startsWith("/prod/")) {
    const rest = pathAfterBase.slice("/prod".length) || "/";
    const prefix = needsPrefix(rest) ? API_PREFIX : "";
    return `https://api.meshulam.co.il${prefix}${rest}`;
  }
  const prefix = needsPrefix(pathAfterBase) ? API_PREFIX : "";
  return `https://secure.meshulam.co.il${prefix}${pathAfterBase}`;
}

/**
 * Rebuild the upstream request body + content-type from express's already-parsed
 * `req.body`. Returns `undefined` body for GET/HEAD or empty payloads.
 */
export function encodeGrowUrlEncodedBody(raw: unknown): string {
  const params = new URLSearchParams();

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const nestedKey = item && typeof item === "object" ? `${key}[${index}]` : `${key}[]`;
        appendValue(nestedKey, item);
      });
      return;
    }
    if (typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        appendValue(`${key}[${childKey}]`, childValue);
      }
      return;
    }
    params.append(key, String(value));
  };

  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      appendValue(key, value);
    }
  }
  return params.toString();
}

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
    return {
      body: encodeGrowUrlEncodedBody(raw),
      contentType: "application/x-www-form-urlencoded",
    };
  }

  // Fallback: stringify whatever we have
  return { body: String(raw), contentType: ct || undefined };
}

type GrowProviderPayload = {
  status?: unknown;
  err?: { id?: unknown } | string | null;
};

type UpstreamResult = {
  buf: Buffer;
  status: number;
  contentType: string | null;
  payload: GrowProviderPayload | null;
};

/** Parsing is diagnostic/classification only and must never turn into a retry. */
function parseGrowPayload(buf: Buffer): GrowProviderPayload | null {
  try {
    const parsed: unknown = JSON.parse(buf.toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as GrowProviderPayload
      : null;
  } catch {
    return null;
  }
}

async function readUpstreamResponse(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<UpstreamResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Keep the timer alive while consuming the body too: a server can send
    // headers then stall indefinitely before a payload is available.
    const response = await fetch(url, { ...init, signal: controller.signal });
    const buf = Buffer.from(await response.arrayBuffer());
    return {
      buf,
      status: response.status,
      contentType: response.headers.get("content-type"),
      payload: parseGrowPayload(buf),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A payment mutation can use the Worker only when the direct request was
 * definitely stopped before application processing by Incapsula. Status alone
 * is insufficient: 500/404 HTML, a missing body, and generic 403 pages are all
 * ambiguous and must not be replayed.
 */
function isDefinitelyPreProcessingIncapsulaWaf(result: UpstreamResult): boolean {
  if (result.status !== 403) return false;

  const bodyHead = result.buf.subarray(0, 4096).toString("utf8");
  const htmlLike =
    /text\/html/i.test(result.contentType || "") ||
    /^\s*<!doctype\s+html|^\s*<html[\s>]/i.test(bodyHead);
  return htmlLike && /incapsula|_incapsula_resource|imperva/i.test(bodyHead);
}

function setCorsHeaders(req: Request, res: Response): void {
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
}

function logProxy(message: string): void {
  // Callers pass route/status categories only. Never add URLs with query strings,
  // request bodies, or provider response bodies to the payment log buffer.
  console.log(message);
  addToPaymentLogBuffer(message);
}

function logProxyWarning(message: string): void {
  console.warn(message);
  addToPaymentLogBuffer(message);
}

function errorKind(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "unknown";
}

type CheckoutPaymentReference = { authCode?: string; processToken?: string };

function checkoutPaymentReferenceFromBody(raw: unknown): CheckoutPaymentReference | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const root = raw as Record<string, unknown>;
  const nested = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : undefined;
  const authCode = typeof root.authCode === "string"
    ? root.authCode
    : typeof nested?.authCode === "string" ? nested.authCode : undefined;
  const processToken = typeof root.processToken === "string"
    ? root.processToken
    : typeof nested?.processToken === "string" ? nested.processToken : undefined;
  return authCode || processToken ? { authCode, processToken } : undefined;
}

/**
 * Persist a coordination-only lock for an ambiguous actual charge. This import
 * stays dynamic to avoid a core/router dependency cycle. It is deliberately
 * bounded and failures do not alter the fail-closed proxy response.
 */
async function markDoPaymentOutcomeUncertain(
  pathAfterBase: string,
  rawBody: unknown,
): Promise<void> {
  if (endpointFromPath(pathAfterBase) !== "doPayment") return;
  const reference = checkoutPaymentReferenceFromBody(rawBody);
  if (!reference) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      import("../checkoutReservation").then(({ markCheckoutReservationPaymentUncertain }) =>
        markCheckoutReservationPaymentUncertain(reference),
      ),
      new Promise<void>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("marker_timeout")), 750);
      }),
    ]);
    logProxy("[GrowProxy] checkout uncertainty marker=recorded");
  } catch (error: unknown) {
    // No reference values or payloads in operational logs.
    logProxyWarning(`[GrowProxy] checkout uncertainty marker=unavailable error=${errorKind(error)}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sendOutcomeUnknown(res: Response): void {
  res.status(502).json({
    status: false,
    err: {
      category: "outcome_unknown",
      message: "תוצאת התשלום אינה ידועה. אין לשלם שוב לפני בדיקה.",
    },
  });
}

function sendUnavailable(res: Response): void {
  res.status(502).json({
    status: false,
    err: { category: "upstream_unavailable", message: "grow upstream unavailable" },
  });
}

function sendUpstream(res: Response, result: UpstreamResult): void {
  if (result.contentType) res.setHeader("Content-Type", result.contentType);
  res.status(result.status).send(result.buf);
}

export function registerGrowProxy(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    try {
      const fullPath = req.originalUrl; // e.g. /api/grow-proxy/prod/api/...?x=1
      const afterBase = fullPath.slice(PROXY_BASE.length) || "/";
      const route = stripQuery(afterBase);
      const upstreamUrl = resolveUpstream(afterBase);
      const safety = classifyGrowProxyRequest(req.method, afterBase);
      const method = req.method.toUpperCase();

      // Do not log query values, payload keys/values, or full upstream URLs.
      logProxy(`[GrowProxy] request method=${method} route=${route} safety=${safety}`);
      setCorsHeaders(req, res);

      // Build forwarded headers from express-parsed request.
      const headers: Record<string, string> = { ...SPOOF_HEADERS };
      for (const [key, value] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (HOP_BY_HOP.has(lower)) continue;
        if (lower === "content-type") continue; // set from rebuilt body below
        if (typeof value === "string") headers[key] = value;
        else if (Array.isArray(value)) headers[key] = value.join(", ");
      }

      const { body, contentType } = buildBody(req);
      if (contentType) headers["Content-Type"] = contentType;

      const init: RequestInit = { method, headers };
      if (body !== undefined) init.body = body;

      let direct: UpstreamResult | undefined;
      let directFailed = false;
      try {
        direct = await readUpstreamResponse(upstreamUrl, init, PRIMARY_TIMEOUT_MS);
        logProxy(
          `[GrowProxy] direct response route=${route} http=${direct.status} json=${direct.payload ? "yes" : "no"}`,
        );
      } catch (error: unknown) {
        directFailed = true;
        logProxyWarning(`[GrowProxy] direct failed route=${route} error=${errorKind(error)}`);
      }

      // A safe lookup may retry a network failure, invalid/non-JSON edge page, or
      // 5xx. A payment mutation may retry only the narrowly-proven pre-processing
      // Incapsula 403 condition; all other ambiguous outcomes must not be replayed.
      const shouldFallback = directFailed || (
        direct !== undefined && (
          safety === "safe-retry"
            ? direct.status >= 500 || direct.payload === null
            : isDefinitelyPreProcessingIncapsulaWaf(direct)
        )
      );

      if (shouldFallback && safety === "mutation-or-unknown" && !(
        direct && isDefinitelyPreProcessingIncapsulaWaf(direct)
      )) {
        // A request that did not produce a trustworthy provider JSON response may
        // have reached payment processing. Do not send it anywhere a second time.
        logProxyWarning(`[GrowProxy] mutation outcome unknown route=${route}; fallback=blocked`);
        await markDoPaymentOutcomeUncertain(afterBase, req.body);
        sendOutcomeUnknown(res);
        return;
      }

      if (shouldFallback) {
        logProxy(`[GrowProxy] fallback allowed route=${route} safety=${safety}`);
        try {
          // Preserve the original query string in the actual fallback request,
          // while deliberately keeping it out of every log entry.
          const fallback = await readUpstreamResponse(
            `${CF_WORKER_BASE}${afterBase}`,
            init,
            FALLBACK_TIMEOUT_MS,
          );
          logProxy(
            `[GrowProxy] fallback response route=${route} http=${fallback.status} json=${fallback.payload ? "yes" : "no"}`,
          );

          // Never relay HTML/error pages as if they were provider responses. A
          // 5xx from the Worker is also unknown for a mutation, even if JSON.
          if (fallback.payload && (safety === "safe-retry" || fallback.status < 500)) {
            sendUpstream(res, fallback);
            return;
          }
        } catch (error: unknown) {
          logProxyWarning(`[GrowProxy] fallback failed route=${route} error=${errorKind(error)}`);
        }

        if (safety === "mutation-or-unknown") {
          await markDoPaymentOutcomeUncertain(afterBase, req.body);
          sendOutcomeUnknown(res);
        } else {
          sendUnavailable(res);
        }
        return;
      }

      // A parsed provider JSON response below 5xx is a definitive semantic
      // success/failure and is relayed unchanged. It is never retried.
      if (direct?.payload && direct.status < 500) {
        sendUpstream(res, direct);
        return;
      }

      // This includes malformed/HTML and 5xx mutation responses. Do not expose
      // an HTML edge page as success or replay a potentially charged payment.
      if (safety === "mutation-or-unknown") {
        logProxyWarning(`[GrowProxy] mutation outcome unknown route=${route}; response=ambiguous`);
        await markDoPaymentOutcomeUncertain(afterBase, req.body);
        sendOutcomeUnknown(res);
      } else {
        sendUnavailable(res);
      }
    } catch (error: unknown) {
      // Do not include error.message: fetch errors can contain a URL/query string.
      const proxyErr = `[GrowProxy] proxy error error=${errorKind(error)}`;
      console.error(proxyErr);
      addToPaymentLogBuffer(proxyErr);
      setCorsHeaders(req, res);
      res
        .status(502)
        .json({ status: false, err: { category: "proxy_error", message: "grow proxy error" } });
    }
  };

  // Preflight
  app.options(`${PROXY_BASE}/*`, (req, res) => {
    setCorsHeaders(req, res);
    res.sendStatus(204);
  });

  app.all(`${PROXY_BASE}/*`, handler);
}
