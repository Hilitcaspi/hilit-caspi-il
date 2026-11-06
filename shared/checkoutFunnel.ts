/**
 * Anonymous checkout funnel stages for the Israeli site.
 *
 * Events are aggregate-only diagnostics: no email, name, phone, coupon value,
 * provider token or raw error text is ever stored. Only a stage, a short
 * reason code from a fixed list, the product key and the first landing path
 * of the browser tab.
 */
export const CHECKOUT_FUNNEL_ACTION = "checkout_stage" as const;

export const CHECKOUT_STAGES = [
  "validation_error",
  "profile_invalid",
  "wallet_opened",
  "sdk_success",
  "sdk_failure",
  "sdk_timeout",
  "sdk_closed",
  "rejected",
  "error",
] as const;
export type CheckoutStage = (typeof CHECKOUT_STAGES)[number];

export const CHECKOUT_REASONS = [
  "name",
  "email",
  "phone",
  "age",
  "terms",
  "coupon_pending",
  "coupon_unverified",
  "open_process",
  "already_paid",
  "pending_previous",
  "uncertain_previous",
  "plus_requires_database",
  "plus_already_active",
  "boost_link_required",
  "resume_required",
  "photo",
  "required_field",
  "connectivity",
  "outcome_unknown",
  "other",
] as const;
export type CheckoutReason = (typeof CHECKOUT_REASONS)[number];

const STAGE_SET = new Set<string>(CHECKOUT_STAGES);
const REASON_SET = new Set<string>(CHECKOUT_REASONS);

export function isCheckoutStage(value: unknown): value is CheckoutStage {
  return typeof value === "string" && STAGE_SET.has(value);
}

export function isCheckoutReason(value: unknown): value is CheckoutReason {
  return typeof value === "string" && REASON_SET.has(value);
}

/** Maps a server/SDK error message to a fixed reason code. Never returns the text. */
export function classifyCheckoutErrorReason(message: unknown): CheckoutReason {
  const text = typeof message === "string" ? message : "";
  if (!text) return "other";
  if (text.includes("כבר נפתח תהליך תשלום")) return "open_process";
  if (text.includes("התשלום עבור מוצר זה כבר זוהה")) return "already_paid";
  if (text.includes("בקשת התשלום כבר נמצאת בעיבוד") || text.includes("עדיין ממתינה לאישור")) return "pending_previous";
  if (text.includes("אפשר לפנות לתמיכה") || text.includes("אינו ברור")) return "uncertain_previous";
  if (text.includes("זמין רק לחברי המאגר")) return "plus_requires_database";
  if (text.includes("התשלום עבור Plus כבר נקלט") || text.includes("מנוי Plus כבר פעיל")) return "plus_already_active";
  if (text.includes("Boost")) return "boost_link_required";
  if (/resume|המשך ההרשמה|להשלים את ההרשמה/i.test(text)) return "resume_required";
  if (/PAYMENT_PHONE_INVALID/.test(text)) return "phone";
  if (/Grow API error|fetch failed|Failed to fetch|HTTP\s*\d+|network|timeout/i.test(text)) return "connectivity";
  return "other";
}

/** Reduces a path to a safe, short landing path (no query string, no tokens). */
export function sanitizeLandingPath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/")) return "/";
  const clean = path.split(/[?#]/)[0].slice(0, 60);
  // Drop any long opaque segment that could be a personal token.
  return clean
    .split("/")
    .map(segment => (segment.length > 32 || /^[a-f0-9]{16,}$/i.test(segment) ? ":id" : segment))
    .join("/") || "/";
}

export type CheckoutFunnelRow = {
  product: string;
  stage: string;
  reason: string;
  landing: string;
  count: number;
};

export type CheckoutFunnelSummary = {
  product: string;
  starts: number;
  walletOpened: number;
  success: number;
  closed: number;
  failed: number;
  rejected: number;
  validation: number;
  errors: number;
  topReasons: Array<{ reason: string; count: number }>;
};

export type CheckoutFunnelResult = {
  byProduct: CheckoutFunnelSummary[];
  byLanding: Array<{ landing: string; walletOpened: number; success: number; closed: number; rejected: number }>;
  trackedSince: "checkout_stage_v1";
};

const PRODUCT_RE = /^[a-z][a-z0-9_]{0,39}$/;

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Converts grouped analytics rows (metadata JSON + count) into the funnel.
 * Unknown stages/reasons/products are dropped, so arbitrary client input can
 * never surface as free text in the dashboard.
 */
export function buildCheckoutFunnelFromEventRows(
  stageRows: Array<{ metadata?: unknown; cnt?: unknown }>,
  initiateRows: Array<{ metadata?: unknown; cnt?: unknown }>,
): CheckoutFunnelResult {
  const rows: CheckoutFunnelRow[] = [];
  for (const r of stageRows ?? []) {
    const m = parseMetadata(r?.metadata);
    const count = Number(r?.cnt);
    if (!m || m.action !== CHECKOUT_FUNNEL_ACTION || !Number.isFinite(count) || count <= 0) continue;
    if (!isCheckoutStage(m.stage)) continue;
    const product = typeof m.product === "string" && PRODUCT_RE.test(m.product) ? m.product : "unknown";
    const reason = isCheckoutReason(m.reason) ? m.reason : "-";
    rows.push({ product, stage: m.stage, reason, landing: sanitizeLandingPath(m.landing), count });
  }
  const startsMap = new Map<string, number>();
  for (const r of initiateRows ?? []) {
    const m = parseMetadata(r?.metadata);
    const count = Number(r?.cnt);
    if (!m || m.action !== "initiate_checkout" || !Number.isFinite(count) || count <= 0) continue;
    const product = typeof m.product === "string" && PRODUCT_RE.test(m.product) ? m.product : "unknown";
    startsMap.set(product, (startsMap.get(product) ?? 0) + count);
  }
  const starts = Array.from(startsMap.entries()).map(([product, count]) => ({ product, count }));

  const landingMap = new Map<string, { landing: string; walletOpened: number; success: number; closed: number; rejected: number }>();
  for (const row of rows) {
    let e = landingMap.get(row.landing);
    if (!e) {
      e = { landing: row.landing, walletOpened: 0, success: 0, closed: 0, rejected: 0 };
      landingMap.set(row.landing, e);
    }
    if (row.stage === "wallet_opened") e.walletOpened += row.count;
    else if (row.stage === "sdk_success") e.success += row.count;
    else if (row.stage === "sdk_closed") e.closed += row.count;
    else if (row.stage === "rejected") e.rejected += row.count;
  }
  return {
    byProduct: summarizeCheckoutFunnel(rows, starts),
    byLanding: Array.from(landingMap.values())
      .sort((a, b) => b.walletOpened - a.walletOpened)
      .slice(0, 12),
    trackedSince: "checkout_stage_v1",
  };
}

/** Pure aggregation used by the dashboard; initiate counts come from the existing initiate_checkout click. */
export function summarizeCheckoutFunnel(
  rows: CheckoutFunnelRow[],
  starts: Array<{ product: string; count: number }>,
): CheckoutFunnelSummary[] {
  const byProduct = new Map<string, CheckoutFunnelSummary & { reasons: Map<string, number> }>();
  const get = (product: string) => {
    let entry = byProduct.get(product);
    if (!entry) {
      entry = {
        product,
        starts: 0,
        walletOpened: 0,
        success: 0,
        closed: 0,
        failed: 0,
        rejected: 0,
        validation: 0,
        errors: 0,
        topReasons: [],
        reasons: new Map(),
      };
      byProduct.set(product, entry);
    }
    return entry;
  };
  for (const s of starts) get(s.product || "unknown").starts += s.count;
  for (const row of rows) {
    const entry = get(row.product || "unknown");
    const n = row.count;
    switch (row.stage) {
      case "wallet_opened": entry.walletOpened += n; break;
      case "sdk_success": entry.success += n; break;
      case "sdk_closed": entry.closed += n; break;
      case "sdk_failure":
      case "sdk_timeout": entry.failed += n; break;
      case "rejected": entry.rejected += n; break;
      case "validation_error":
      case "profile_invalid": entry.validation += n; break;
      case "error": entry.errors += n; break;
      default: break;
    }
    if (row.reason && row.reason !== "-" && row.stage !== "wallet_opened" && row.stage !== "sdk_success") {
      entry.reasons.set(`${row.stage}:${row.reason}`, (entry.reasons.get(`${row.stage}:${row.reason}`) ?? 0) + n);
    }
  }
  return Array.from(byProduct.values())
    .map(({ reasons, ...rest }) => ({
      ...rest,
      topReasons: Array.from(reasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    }))
    .sort((a, b) => b.starts - a.starts);
}

/** Maps the first invalid form control to a field-type code. Reads type/name only, never the value. */
export function classifyInvalidField(el: { type?: unknown; name?: unknown; id?: unknown } | null | undefined): CheckoutReason {
  if (!el) return "other";
  const type = typeof el.type === "string" ? el.type.toLowerCase() : "";
  const key = `${typeof el.name === "string" ? el.name : ""} ${typeof el.id === "string" ? el.id : ""}`.toLowerCase();
  if (type === "file" || /photo|image|picture/.test(key)) return "photo";
  if (type === "email" || /mail/.test(key)) return "email";
  if (type === "tel" || /phone/.test(key)) return "phone";
  if (type === "checkbox" && /terms|takanon/.test(key)) return "terms";
  if (type === "checkbox" && /age/.test(key)) return "age";
  if (/name/.test(key)) return "name";
  return "required_field";
}
