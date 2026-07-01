/**
 * Server-side error alerting.
 *
 * Sends an email to the site owner whenever a server-side error occurs
 * (tRPC procedures, Express REST routes, or uncaught process-level errors).
 *
 * Design goals:
 * - Never throw from the alert path (an alerting failure must not crash the app).
 * - De-duplicate / throttle: identical errors are collapsed within a time window
 *   so a repeating error does not flood the inbox.
 * - Zero external deps beyond the existing Brevo helper.
 */
import { sendEmail } from "../brevo";

// Where alerts are sent. Kept as a constant (owner-facing operational channel).
const ALERT_TO = { email: "hilit@hilitcaspi.com", name: "הילית כספי" };

// Throttle window: identical error signatures are sent at most once per window.
const THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

// In-memory throttle map. Process-local (fine for single-instance / per-instance).
// Maps a stable error signature -> { firstSeen, lastSent, count }.
const seen = new Map<string, { firstSeen: number; lastSent: number; count: number }>();

// Cap the map size so a high-cardinality error source cannot grow memory unbounded.
const MAX_KEYS = 500;

export type ErrorAlertInput = {
  /** Where the error originated, e.g. "tRPC", "express", "process". */
  source: string;
  /** The error object or a string. */
  error: unknown;
  /** Optional context: request path, procedure name, user id, etc. */
  context?: Record<string, unknown>;
};

/** Build a short, stable signature so identical errors throttle together. */
function signatureFor(source: string, message: string, context?: Record<string, unknown>): string {
  const path = (context?.path ?? context?.route ?? "") as string;
  // Use only the first line of the message so stack noise doesn't defeat dedupe.
  const firstLine = message.split("\n")[0].slice(0, 200);
  return `${source}|${path}|${firstLine}`;
}

function extractMessageAndStack(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name || "Unknown error", stack: error.stack || "" };
  }
  if (error && typeof error === "object") {
    try {
      return { message: JSON.stringify(error).slice(0, 1000), stack: "" };
    } catch {
      return { message: String(error), stack: "" };
    }
  }
  return { message: String(error), stack: "" };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Report a server-side error. Fire-and-forget safe: never throws.
 * Returns true if an email was dispatched, false if throttled/skipped/failed.
 */
export async function sendErrorAlert(input: ErrorAlertInput): Promise<boolean> {
  try {
    const { source } = input;
    const { message, stack } = extractMessageAndStack(input.error);
    const sig = signatureFor(source, message, input.context);
    const now = Date.now();

    const prev = seen.get(sig);
    if (prev && now - prev.lastSent < THROTTLE_MS) {
      // Within throttle window: count it but don't send another email.
      prev.count += 1;
      return false;
    }

    // Record / refresh this signature.
    if (seen.size >= MAX_KEYS && !prev) {
      // Evict the oldest entry to bound memory.
      const oldestKey = seen.keys().next().value;
      if (oldestKey) seen.delete(oldestKey);
    }
    const suppressedSince = prev ? prev.count : 0;
    seen.set(sig, { firstSeen: prev?.firstSeen ?? now, lastSent: now, count: 0 });

    const ts = new Date(now).toISOString();
    const contextRows = input.context
      ? Object.entries(input.context)
          .map(([k, v]) => `<tr><td style="padding:4px 10px;color:#727272;">${escapeHtml(k)}</td><td style="padding:4px 10px;font-family:monospace;">${escapeHtml(String(v))}</td></tr>`)
          .join("")
      : "";

    const suppressedNote =
      suppressedSince > 0
        ? `<p style="color:#727272;font-size:13px;">הערה: מאז ההתראה הקודמת על שגיאה זהה נרשמו עוד ${suppressedSince} מקרים (דוכאו כדי למנוע הצפה).</p>`
        : "";

    const htmlContent = `
      <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#191265;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;font-size:18px;">⚠️ שגיאת שרת באתר</h2>
          <p style="margin:6px 0 0;color:#ffe27c;font-size:13px;">hilitcaspi.com · ${escapeHtml(source)}</p>
        </div>
        <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 6px;"><strong>הודעת שגיאה:</strong></p>
          <pre style="background:#f7f5ef;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:13px;">${escapeHtml(message)}</pre>
          <p style="margin:14px 0 6px;"><strong>זמן:</strong> ${escapeHtml(ts)}</p>
          ${contextRows ? `<table style="border-collapse:collapse;width:100%;margin-top:8px;">${contextRows}</table>` : ""}
          ${stack ? `<p style="margin:14px 0 6px;"><strong>Stack:</strong></p><pre style="background:#f7f5ef;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:11px;color:#555;max-height:320px;overflow:auto;">${escapeHtml(stack.slice(0, 4000))}</pre>` : ""}
          ${suppressedNote}
          <p style="color:#999;font-size:12px;margin-top:16px;">התראה אוטומטית ממערכת הניטור של האתר. שגיאות זהות מדוכאות למשך ${THROTTLE_MS / 60000} דקות.</p>
        </div>
      </div>`;

    const textContent = `שגיאת שרת באתר (${source})\nזמן: ${ts}\n\n${message}\n\n${stack ? stack.slice(0, 2000) : ""}`;

    const result = await sendEmail({
      to: ALERT_TO,
      subject: `⚠️ שגיאת שרת: ${message.slice(0, 80)}`,
      htmlContent,
      textContent,
    });
    return result.success;
  } catch {
    // Alerting must never throw.
    return false;
  }
}

/** Install process-level handlers once. Safe to call multiple times. */
let processHandlersInstalled = false;
export function installProcessErrorAlerts(): void {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;

  process.on("uncaughtException", (err) => {
    // Log then alert; do not exit — keep behavior consistent with prior setup.
    console.error("[uncaughtException]", err);
    void sendErrorAlert({ source: "process:uncaughtException", error: err });
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
    void sendErrorAlert({ source: "process:unhandledRejection", error: reason });
  });
}
