/**
 * Read-only Grow transaction inquiry.
 *
 * Official Grow references:
 * - https://developers.grow.business/reference/get-transaction-info
 * - https://developers.grow.business/reference/response-get-transaction-info
 * - https://developers.grow.business/reference/live-environment
 *
 * This module deliberately does not write to the database, log request/response
 * data, store transaction identifiers, or invoke a payment-processing endpoint.
 */

const GROW_TRANSACTION_INFO_URL =
  "https://secure.meshulam.co.il/api/light/server/1.0/getTransactionInfo";
const REQUEST_TIMEOUT_MS = 8_000;

/** Products currently configured by the application's Grow checkout integration. */
export type GrowInquiryProduct =
  | "database"
  | "guide"
  | "course"
  | "coaching"
  | "coaching_mas"
  | "session"
  | "bundle_tubav"
  | "bundle_new_year"
  | "match_boost"
  | "live_october"
  | "plus";

export interface GetTransactionInfoInput {
  /** Internal checkout product, used only to select that product's environment credentials. */
  product: GrowInquiryProduct | string;
  /** Grow transaction identifier. It is used only for this request and is never returned or logged. */
  transactionId: string;
  /** Grow transaction token. It is used only for this request and is never returned or logged. */
  transactionToken: string;
  /** Expected transaction sum in agorot (for example, 1990 for ₪19.90). */
  expectedAmountAgorot: number;
}

/**
 * The documented response sample exposes `status: "שולם"`, `statusCode: 2`,
 * `sum`, and `paymentDate`. The payment date format is provider-supplied and
 * intentionally retained as a date string rather than inferred as a timestamp.
 */
export interface VerifiedGrowTransaction {
  /** Exact status string documented in Grow's getTransactionInfo response. */
  providerStatus: "שולם";
  /** Exact numeric paid status code documented alongside providerStatus. */
  providerStatusCode: 2;
  /** Provider `sum`, converted exactly from ILS to agorot. */
  providerAmountAgorot: number;
  /** Provider `paymentDate`; its timezone/clock precision is not documented. */
  paymentDate?: string;
}

export type GetTransactionInfoResult =
  | { state: "confirmed"; verified: VerifiedGrowTransaction }
  | { state: "mismatch"; verified: VerifiedGrowTransaction }
  | { state: "unavailable" };

type GrowCredentials = {
  userId: string;
  pageCode: string;
};

type GrowResponseData = {
  status?: unknown;
  statusCode?: unknown;
  sum?: unknown;
  paymentDate?: unknown;
};

type GrowResponse = {
  status?: unknown;
  data?: GrowResponseData;
};

const PRODUCT_CREDENTIAL_ENV: Record<
  GrowInquiryProduct,
  { userId: string; pageCode: string }
> = {
  database: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_DATABASE" },
  guide: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_GUIDE" },
  course: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_COURSE" },
  coaching: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_COACHING" },
  coaching_mas: {
    userId: "GROW_USER_ID",
    pageCode: "GROW_PAGE_CODE_COACHING_MAS",
  },
  session: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_SESSION" },
  // These two checkout products use the application's database payment page.
  bundle_tubav: { userId: "GROW_USER_ID", pageCode: "GROW_PAGE_CODE_DATABASE" },
  bundle_new_year: {
    userId: "GROW_USER_ID",
    pageCode: "GROW_PAGE_CODE_DATABASE",
  },
  match_boost: {
    userId: "GROW_USER_ID",
    pageCode: "GROW_PAGE_CODE_MATCH_BOOST",
  },
  live_october: {
    userId: "GROW_USER_ID",
    pageCode: "GROW_PAGE_CODE_LIVE_OCTOBER",
  },
  plus: { userId: "GROW_PLUS_USER_ID", pageCode: "GROW_PAGE_CODE_PLUS" },
};

function isGrowInquiryProduct(product: string): product is GrowInquiryProduct {
  return Object.prototype.hasOwnProperty.call(PRODUCT_CREDENTIAL_ENV, product);
}

function readCredentials(product: string): GrowCredentials | null {
  if (!isGrowInquiryProduct(product)) return null;
  const envNames = PRODUCT_CREDENTIAL_ENV[product];
  const userId = process.env[envNames.userId]?.trim();
  const pageCode = process.env[envNames.pageCode]?.trim() || (["match_boost", "live_october"].includes(product) ? process.env.GROW_PAGE_CODE_DATABASE?.trim() : undefined);
  return userId && pageCode && /^[A-Za-z0-9]+$/.test(userId) && /^[A-Za-z0-9]+$/.test(pageCode)
    ? { userId, pageCode }
    : null;
}

function isExpectedAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Grow documents transactionId as an integer and warns against special characters in API parameters. */
function hasSafeRequestIdentifiers(transactionId: string, transactionToken: string): boolean {
  return /^\d{3,30}$/.test(transactionId) && /^[A-Za-z0-9]{12,200}$/.test(transactionToken);
}

function isGrowSuccessStatus(value: unknown): boolean {
  return value === 1 || value === "1";
}

/** The documented paid response pairs the Hebrew paid status with status code 2. */
function isDocumentedPaidStatus(data: GrowResponseData): boolean {
  return data.status === "שולם" && (data.statusCode === 2 || data.statusCode === "2");
}

/** Converts Grow's documented decimal-ILS `sum` field to exact agorot without floating point arithmetic. */
function parseAgorot(sum: unknown): number | null {
  const value = typeof sum === "string" ? sum.trim() : typeof sum === "number" ? String(sum) : "";
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const whole = Number(match[1]);
  const fractional = (match[2] ?? "").padEnd(2, "0");
  const agorot = whole * 100 + Number(fractional);
  return Number.isSafeInteger(agorot) ? agorot : null;
}

/** Keeps only the documented numeric date shape; its timezone and precision are not inferred. */
function safePaymentDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed) ? trimmed : undefined;
}

function unavailable(): GetTransactionInfoResult {
  return { state: "unavailable" };
}

/**
 * Looks up a single Grow transaction using only the official production
 * getTransactionInfo endpoint. It is disabled outside production, has no
 * fallback endpoint, and returns only safe verified payment fields.
 */
export async function verifyGrowTransaction(
  input: GetTransactionInfoInput,
): Promise<GetTransactionInfoResult> {
  // Development and tests must never reach Grow's live environment.
  if (process.env.NODE_ENV !== "production") return unavailable();
  if (!isExpectedAmount(input.expectedAmountAgorot)) return unavailable();
  if (!hasSafeRequestIdentifiers(input.transactionId, input.transactionToken)) return unavailable();

  const credentials = readCredentials(input.product);
  if (!credentials) return unavailable();

  const form = new URLSearchParams({
    userId: credentials.userId,
    pageCode: credentials.pageCode,
    transactionId: input.transactionId,
    transactionToken: input.transactionToken,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await globalThis.fetch(GROW_TRANSACTION_INFO_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: controller.signal,
    });
    if (!response.ok) return unavailable();

    const payload = (await response.json()) as GrowResponse;
    if (!isGrowSuccessStatus(payload?.status) || !payload.data) return unavailable();
    if (!isDocumentedPaidStatus(payload.data)) return unavailable();

    const sumAgorot = parseAgorot(payload.data.sum);
    if (sumAgorot === null) return unavailable();

    const verified: VerifiedGrowTransaction = {
      providerStatus: "שולם",
      providerStatusCode: 2,
      providerAmountAgorot: sumAgorot,
      ...(safePaymentDate(payload.data.paymentDate)
        ? { paymentDate: safePaymentDate(payload.data.paymentDate) }
        : {}),
    };

    return sumAgorot === input.expectedAmountAgorot
      ? { state: "confirmed", verified }
      : { state: "mismatch", verified };
  } catch {
    // Do not expose or log provider/network errors: they can contain sensitive data.
    return unavailable();
  } finally {
    clearTimeout(timeout);
  }
}
