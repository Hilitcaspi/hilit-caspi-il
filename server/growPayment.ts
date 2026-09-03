/**
 * Grow Payment SDK — Server-side helpers
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the Grow createPaymentProcess API (sandbox.meshulam.co.il) so the
 * frontend can open the inline wallet without ever touching the Grow API directly.
 *
 * Grow docs: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess
 *
 * Production credentials come from env vars:
 *   GROW_USER_ID  / GROW_PAGE_CODE_DATABASE
 *   GROW_PAGE_CODE_GUIDE / GROW_PAGE_CODE_COURSE
 *   GROW_PAGE_CODE_COACHING / GROW_PAGE_CODE_SESSION
 */

// NOTE: We use globalThis.fetch (native Node 18+) instead of node-fetch.
// node-fetch sends a "node-fetch" User-Agent which gets blocked by Incapsula (403).
// Native fetch + browser-like headers bypasses this.

// ─── Environment ──────────────────────────────────────────────────────────────
// Use GROW_ENV=production to switch to the live Grow API.
// Until Grow provides production pageCodes, keep this as sandbox.
const IS_GROW_PROD = true; // Production — using secure.meshulam.co.il

const GROW_API_BASE = IS_GROW_PROD
  ? "https://secure.meshulam.co.il"
  : "https://sandbox.meshulam.co.il";

const GROW_API_URL = `${GROW_API_BASE}/api/light/server/1.0/createPaymentProcess`;
const GROW_APPROVE_URL = `${GROW_API_BASE}/api/light/server/1.0/approveTransaction`;
const GROW_SANDBOX_API_URL = "https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess";
const GROW_SANDBOX_APPROVE_URL = "https://sandbox.meshulam.co.il/api/light/server/1.0/approveTransaction";

// Browser-like headers to avoid Incapsula 403 blocking
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  "Origin": "https://hilitcaspi.com",
  "Referer": "https://hilitcaspi.com/",
};

// Credentials — fall back to test credentials in dev
const GROW_USER_ID = process.env.GROW_USER_ID || "e02cfda4ca3d4736";

// Per-product page codes (production). In dev we use the sandbox pageCode for all.
const PROD_PAGE_CODE = "b497c06813ac";

const PAGE_CODES: Record<string, string> = {
  database: process.env.GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  guide:    process.env.GROW_PAGE_CODE_GUIDE    || PROD_PAGE_CODE,
  course:   process.env.GROW_PAGE_CODE_COURSE   || PROD_PAGE_CODE,
  coaching:     process.env.GROW_PAGE_CODE_COACHING     || PROD_PAGE_CODE,
  coaching_mas: process.env.GROW_PAGE_CODE_COACHING_MAS || PROD_PAGE_CODE,
  session:      process.env.GROW_PAGE_CODE_SESSION      || PROD_PAGE_CODE,
  bundle_tubav: process.env.GROW_PAGE_CODE_DATABASE   || PROD_PAGE_CODE,
  bundle_new_year: process.env.GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  // Boost is a one-time micro-payment and may safely use the existing one-time
  // wallet page. Product identity is preserved by its unique description and
  // by the pending Boost request created before Grow is opened.
  match_boost: process.env.GROW_PAGE_CODE_MATCH_BOOST || process.env.GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  // No fallback by design: Plus requires a dedicated recurring-payment page.
  plus:         process.env.GROW_PAGE_CODE_PLUS || "",
};

const SITE_BASE = "https://hilitcaspi.com";

// ─── Product definitions ──────────────────────────────────────────────────────
export interface ProductConfig {
  description: string;
  sum: number;
  paymentNum?: number;   // fixed number of installments (1 = single charge)
  maxPaymentNum?: number; // let user choose up to N installments
}

export const PRODUCT_CONFIGS: Record<string, ProductConfig> = {
  database:     { description: "מאגר הרווקים של הילית כספי",                         sum: 299,  paymentNum: 1 },
  guide:        { description: "מדריך לבחור נכון של הילית כספי",                      sum: 149,  paymentNum: 1 },
  course:       { description: "קורס המסע של הילית כספי",                             sum: 249,  paymentNum: 1 },
  coaching:     { description: "ליווי אישי - תהליך הבנה (8 פגישות) עם הילית כספי",  sum: 2960, maxPaymentNum: 8 },
  coaching_mas: { description: "ליווי אישי - תהליך המסע (12 פגישות) עם הילית כספי", sum: 4200, maxPaymentNum: 10 },
  session:      { description: "פגישת היכרות עם הילית כספי",                          sum: 500,  paymentNum: 1 },
  bundle_tubav: { description: "חבילת טו באב - מאגר + מדריך לבחור נכון",            sum: 349,  paymentNum: 1 },
  bundle_new_year: { description: "חבילת שנה חדשה - מאגר + מדריך לבחור נכון + קורס המסע", sum: 399, paymentNum: 1 },
  match_boost:  { description: "Boost - הצעת התאמה אלגוריתמית",                       sum: 19.90, paymentNum: 1 },
  plus:         { description: "Database Plus - מנוי חודשי",                         sum: 99 },
};

export type PlusCheckoutMode = "production" | "sandbox" | "unconfigured";

export function getPlusCheckoutConfig(): {
  configured: boolean;
  mode: PlusCheckoutMode;
  checkoutAmount: number | null;
  displayAmount: number;
} {
  if (process.env.GROW_PAGE_CODE_PLUS?.trim()) {
    return { configured: true, mode: "production", checkoutAmount: 99, displayAmount: 99 };
  }
  const sandboxConfigured = Boolean(
    process.env.GROW_SANDBOX_USER_ID?.trim()
    && process.env.GROW_SANDBOX_RECURRING_PAGE_CODE?.trim(),
  );
  if (sandboxConfigured) {
    return { configured: true, mode: "sandbox", checkoutAmount: 1, displayAmount: 99 };
  }
  return { configured: false, mode: "unconfigured", checkoutAmount: null, displayAmount: 99 };
}

// ─── createPaymentProcess ─────────────────────────────────────────────────────
export interface CreatePaymentInput {
  product: string;
  fullName: string;
  email: string;
  phone?: string;
  /** Override price (e.g. coupon) */
  sum?: number;
  /** Personal questionnaire token used to return Plus/Boost members to their account. */
  personalToken?: string;
  /** Signed server-generated reference used to bind a Boost webhook to one request. */
  webhookReference?: string;
  /** Signed non-PII reference used to bind a public Plus webhook to one checkout. */
  plusWebhookReference?: string;
  /** Browser origin used only for Plus Sandbox callbacks in the temporary preview. */
  origin?: string;
}

export interface CreatePaymentResult {
  authCode: string;
  processToken?: string;
  url?: string;
  checkoutMode?: PlusCheckoutMode;
}

export async function createPaymentProcess(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const { notifyPaymentFailure } = await import("./paymentFailureAlert");
  const config = PRODUCT_CONFIGS[input.product];
  if (!config) throw new Error(`Unknown product: ${input.product}`);

  const plusCheckout = input.product === "plus" ? getPlusCheckoutConfig() : null;
  if (plusCheckout && !plusCheckout.configured) {
    throw new Error("The Database Plus payment product is not configured yet");
  }

  if (plusCheckout?.mode === "sandbox") {
    const pageCode = process.env.GROW_SANDBOX_RECURRING_PAGE_CODE?.trim() || "";
    const userId = process.env.GROW_SANDBOX_USER_ID?.trim() || "";
    const callbackBase = input.origin && /^https:\/\//i.test(input.origin)
      ? input.origin.replace(/\/$/, "")
      : SITE_BASE;
    const form = new FormData();
    form.append("userId", userId);
    form.append("pageCode", pageCode);
    form.append("chargeType", "1");
    form.append("sum", "1");
    form.append("description", "Database Plus Monthly");
    form.append("pageField[invoiceName]", input.fullName);
    form.append("pageField[fullName]", input.fullName);
    form.append("pageField[phone]", input.phone || "");
    form.append("pageField[email]", input.email);
    form.append("successUrl", `${callbackBase}/thank-you/plus`);
    form.append("cancelUrl", callbackBase);
    const sandboxNotifyUrl = new URL(`${callbackBase}/api/grow/webhook`);
    if (input.plusWebhookReference) sandboxNotifyUrl.searchParams.set("plus_ref", input.plusWebhookReference);
    form.append("notifyUrl", sandboxNotifyUrl.toString());

    const response = await globalThis.fetch(GROW_SANDBOX_API_URL, {
      method: "POST",
      headers: { accept: "application/json", ...BROWSER_HEADERS },
      body: form,
    });
    const payload = await response.json().catch(() => null) as {
      status?: number | boolean;
      data?: { url?: string; processToken?: string };
      err?: string;
    } | null;
    if (!response.ok || !(payload?.status === 1 || payload?.status === true) || !payload.data?.url) {
      void notifyPaymentFailure({
        customerName: input.fullName,
        customerEmail: input.email,
        customerPhone: input.phone,
        product: input.product,
        amount: 1,
        errorMessage: payload?.err || `Grow Sandbox returned HTTP ${response.status}`,
        stage: "createProcess",
      });
      throw new Error(payload?.err || "Grow Sandbox did not return a hosted payment form");
    }
    return {
      authCode: "",
      processToken: payload.data.processToken,
      url: payload.data.url,
      checkoutMode: "sandbox",
    };
  }

  const pageCode = PAGE_CODES[input.product];
  if (!pageCode) {
    throw new Error("The selected Grow payment product is not configured yet");
  }
  const sum = input.sum ?? config.sum;

  const params = new URLSearchParams();
  params.append("pageCode", pageCode);
  params.append("userId", GROW_USER_ID);
  params.append("sum", String(sum));
  params.append("description", config.description);
  const SUCCESS_PATHS: Record<string, string> = {
    guide:        "/thank-you/digital",
    database:     "/thank-you/database",
    course:       "/thank-you/course",
    coaching:     "/thank-you/coaching",
    coaching_mas: "/thank-you/coaching",
    session:      "/thank-you/session",
    bundle_tubav: "/thank-you/bundle",
    bundle_new_year: "/thank-you/new-year-love",
    match_boost:  "/thank-you/match-boost",
    plus:         "/thank-you/plus",
  };
  const successPath = SUCCESS_PATHS[input.product] || "/thank-you/digital";
  const successUrl = new URL(`${SITE_BASE}${successPath}`);
  if (input.product === "plus" || input.product === "match_boost") {
    successUrl.searchParams.set("email", input.email);
    if (input.personalToken) successUrl.searchParams.set("token", input.personalToken);
  }
  params.append("successUrl", successUrl.toString());
  params.append("cancelUrl", `${SITE_BASE}`);
  const notifyUrl = new URL(`${SITE_BASE}/api/grow/webhook`);
  if (input.webhookReference) notifyUrl.searchParams.set("boost_ref", input.webhookReference);
  if (input.plusWebhookReference) notifyUrl.searchParams.set("plus_ref", input.plusWebhookReference);
  params.append("notifyUrl", notifyUrl.toString());
  params.append("pageField[fullName]", input.fullName);
  params.append("pageField[email]", input.email);
  if (input.phone) params.append("pageField[phone]", input.phone);

  if (config.paymentNum) {
    params.append("paymentNum", String(config.paymentNum));
  } else if (config.maxPaymentNum) {
    params.append("maxPaymentNum", String(config.maxPaymentNum));
  }

  let res: Response;
  try {
    res = await globalThis.fetch(GROW_API_URL, {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...BROWSER_HEADERS,
      },
    });
  } catch (fetchErr: any) {
    void notifyPaymentFailure({
      customerName: input.fullName,
      customerEmail: input.email,
      customerPhone: input.phone,
      product: input.product,
      amount: sum,
      errorMessage: `Network error: ${fetchErr?.message || "fetch failed"}`,
      stage: "createProcess",
    });
    throw fetchErr;
  }

  if (!res.ok) {
    const text = await res.text();
    void notifyPaymentFailure({
      customerName: input.fullName,
      customerEmail: input.email,
      customerPhone: input.phone,
      product: input.product,
      amount: sum,
      errorMessage: `HTTP ${res.status}: ${text.slice(0, 150)}`,
      stage: "createProcess",
    });
    throw new Error(`Grow API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as any;
  console.log("[GrowPayment] createPaymentProcess response:", JSON.stringify(json).slice(0, 500));

  if (!json.status || !json.data?.authCode) {
    void notifyPaymentFailure({
      customerName: input.fullName,
      customerEmail: input.email,
      customerPhone: input.phone,
      product: input.product,
      amount: sum,
      errorMessage: `Grow returned: ${JSON.stringify(json).slice(0, 150)}`,
      stage: "createProcess",
    });
    throw new Error(`Grow API returned failure: ${JSON.stringify(json)}`);
  }

  return {
    authCode: json.data.authCode,
    processToken: json.data.processToken,
  };
}

// ─── approveTransaction ───────────────────────────────────────────────────────
// According to Grow docs, approveTransaction must send ALL fields received from
// the server notification (webhook), not just transactionId.
// See: https://grow-il.readme.io/reference/post_api-light-server-1-0-approvetransaction-4
export async function approveTransaction(
  transactionId: string,
  webhookData?: Record<string, any>,
  product?: string
): Promise<boolean> {
  const data = webhookData ?? {};
  const plusCheckout = product === "plus" ? getPlusCheckoutConfig() : null;
  const usePlusSandbox = plusCheckout?.mode === "sandbox";
  const growUserId = usePlusSandbox ? process.env.GROW_SANDBOX_USER_ID || "" : GROW_USER_ID;
  const pageCode = usePlusSandbox
    ? process.env.GROW_SANDBOX_RECURRING_PAGE_CODE || ""
    : product ? (PAGE_CODES[product] ?? GROW_USER_ID) : GROW_USER_ID;
  const approveUrl = usePlusSandbox ? GROW_SANDBOX_APPROVE_URL : GROW_APPROVE_URL;

  const params = new URLSearchParams();
  // Required: pageCode and userId
  params.append("pageCode", pageCode);
  params.append("userId", growUserId);

  // Required: transaction identifiers
  params.append("transactionId", String(transactionId));
  if (data.transactionToken)  params.append("transactionToken",  String(data.transactionToken));
  if (data.transactionTypeId) params.append("transactionTypeId", String(data.transactionTypeId));
  if (data.paymentType)       params.append("paymentType",       String(data.paymentType));

  // Required: payment amounts
  if (data.sum !== undefined)                params.append("sum",                  String(data.sum));
  if (data.firstPaymentSum !== undefined)    params.append("firstPaymentSum",      String(data.firstPaymentSum));
  if (data.periodicalPaymentSum !== undefined) params.append("periodicalPaymentSum", String(data.periodicalPaymentSum));
  if (data.paymentsNum !== undefined)        params.append("paymentsNum",          String(data.paymentsNum));
  if (data.allPaymentsNum !== undefined)     params.append("allPaymentsNum",       String(data.allPaymentsNum));
  if (data.paymentDate)                      params.append("paymentDate",          String(data.paymentDate));
  if (data.asmachta !== undefined)           params.append("asmachta",             String(data.asmachta));

  // Required: description and payer info
  if (data.description)  params.append("description",  String(data.description));
  if (data.fullName)     params.append("fullName",     String(data.fullName));
  if (data.payerPhone)   params.append("payerPhone",   String(data.payerPhone));
  if (data.payerEmail)   params.append("payerEmail",   String(data.payerEmail));

  // Required: card info
  if (data.cardSuffix !== undefined)   params.append("cardSuffix",   String(data.cardSuffix));
  if (data.cardType)                   params.append("cardType",     String(data.cardType));
  if (data.cardTypeCode !== undefined) params.append("cardTypeCode", String(data.cardTypeCode));
  if (data.cardBrand)                  params.append("cardBrand",    String(data.cardBrand));
  if (data.cardBrandCode !== undefined) params.append("cardBrandCode", String(data.cardBrandCode));
  if (data.cardExp !== undefined)      params.append("cardExp",      String(data.cardExp));

  // Required: process identifiers
  if (data.processId)    params.append("processId",    String(data.processId));
  if (data.processToken) params.append("processToken", String(data.processToken));

  try {
    const res = await globalThis.fetch(approveUrl, {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...BROWSER_HEADERS,
      },
    });
    const json = (await res.json()) as any;
    console.log("[GrowPayment] approveTransaction response:", JSON.stringify(json).slice(0, 500));
    return json.status === true || json.status === 1 || json.status === "1";
  } catch (err) {
    console.error("[GrowPayment] approveTransaction failed:", err);
    return false;
  }
}
