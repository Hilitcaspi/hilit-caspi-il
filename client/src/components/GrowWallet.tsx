import { isPlusBonusCouponCode } from "@shared/plusWednesdayOffer";
import { boostEntryChannelFromSearch } from "../../../shared/boostEntryChannel";
/*
 * GrowWallet — Payment component using Grow Wallet SDK
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow:
 * 1. On mount: preloads SDK script in background (fast, ~1s).
 * 2. On click: calls init() → waits for runtime → createPaymentProcess → renderPaymentOptions.
 *
 * This approach is reliable because:
 * - Script is already loaded when user clicks (no network delay)
 * - init() is called fresh each time (avoids stale state issues)
 * - No complex state machine that can get stuck
 */

import { useState, useCallback, useEffect, useRef, useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { gaBeginCheckout } from "@/lib/ga";
import { trackInitiateCheckout } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import {
  isGrowPaymentRendererReady,
  isGrowWalletVisible,
} from "@/lib/growSdkReadiness";
import { normalizeIsraeliPhone } from "@shared/profileValidation";
import {
  getMetaBrowserIdentifiers,
  rememberPurchaseTrackingToken,
} from "@/lib/purchaseTracking";
import { isExpectedCheckoutRejection } from "@shared/paymentFailureClassification";
import {
  hasCompleteCheckoutPrefill,
  isValidCheckoutEmail,
  isValidCheckoutFullName,
  normalizeCheckoutFullName,
} from "@shared/checkoutIdentity";
import {
  getFirstTouchAcquisition,
  getLastUtmAcquisition,
} from "@/lib/acquisitionTracking";
import {
  acquireCheckoutOwner,
  checkoutAttemptStorageKey,
  completeCheckoutOwner,
  getOrCreateCheckoutAttemptId,
  isCheckoutAttemptCompleted,
  isCheckoutOwner,
  releaseCheckoutOwner,
  type CheckoutOwnerLease,
} from "@/lib/checkoutSafety";

// ─── Grow config from VITE env vars ──────────────────────────────────────────
const GROW_ENV = "PRODUCTION" as string; // "DEV" for sandbox, "PRODUCTION" for live
const GROW_VERSION = 1;
const GROW_PROXY_URL = "https://grow-proxy.hilitcaspi.workers.dev";

const GROW_USER_ID = import.meta.env.VITE_GROW_USER_ID || "e02cfda4ca3d4736";

const PROD_PAGE_CODE = "b497c06813ac";
const PAGE_CODES: Record<string, string> = {
  database: import.meta.env.VITE_GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  guide: import.meta.env.VITE_GROW_PAGE_CODE_GUIDE || PROD_PAGE_CODE,
  course: import.meta.env.VITE_GROW_PAGE_CODE_COURSE || PROD_PAGE_CODE,
  coaching: import.meta.env.VITE_GROW_PAGE_CODE_COACHING || PROD_PAGE_CODE,
  coaching_mas:
    import.meta.env.VITE_GROW_PAGE_CODE_COACHING_MAS || PROD_PAGE_CODE,
  session: import.meta.env.VITE_GROW_PAGE_CODE_SESSION || PROD_PAGE_CODE,
  bundle_tubav: import.meta.env.VITE_GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  bundle_new_year:
    import.meta.env.VITE_GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  match_boost:
    import.meta.env.VITE_GROW_PAGE_CODE_MATCH_BOOST ||
    import.meta.env.VITE_GROW_PAGE_CODE_DATABASE ||
    PROD_PAGE_CODE,
  live_october:
    import.meta.env.VITE_GROW_PAGE_CODE_LIVE_OCTOBER ||
    import.meta.env.VITE_GROW_PAGE_CODE_DATABASE ||
    PROD_PAGE_CODE,
  plus: import.meta.env.VITE_GROW_PAGE_CODE_PLUS || "",
};

const PRODUCT_CONFIGS: Record<
  string,
  {
    description: string;
    sum: number;
    paymentNum?: number;
    maxPaymentNum?: number;
  }
> = {
  database: {
    description: "מאגר הרווקים של הילית כספי",
    sum: 299,
    paymentNum: 1,
  },
  guide: {
    description: "מדריך לבחור נכון של הילית כספי",
    sum: 149,
    paymentNum: 1,
  },
  course: { description: "קורס המסע של הילית כספי", sum: 249, paymentNum: 1 },
  coaching: {
    description: "ליווי אישי - תהליך הבנה (8 פגישות) עם הילית כספי",
    sum: 2960,
    maxPaymentNum: 8,
  },
  coaching_mas: {
    description: "ליווי אישי - תהליך המסע (12 פגישות) עם הילית כספי",
    sum: 4200,
    maxPaymentNum: 10,
  },
  session: {
    description: "פגישה בודדת עם הילית כספי",
    sum: 500,
    paymentNum: 1,
  },
  bundle_tubav: {
    description: "חבילת טו באב - מאגר + מדריך לבחור נכון",
    sum: 349,
    paymentNum: 1,
  },
  bundle_new_year: {
    description: "חבילת שנה חדשה - מאגר + מדריך לבחור נכון + קורס המסע",
    sum: 399,
    paymentNum: 1,
  },
  match_boost: {
    description: "Boost - הצעת התאמה אלגוריתמית",
    sum: 19.9,
    paymentNum: 1,
  },
  live_october: {
    description: "כרטיס ללייב סודות ההתאמה המושלמת 31.10.2026",
    sum: 149,
    paymentNum: 1,
  },
  plus: { description: "Database Plus - מנוי חודשי", sum: 99 },
};

const SITE_BASE = window.location.origin;

// NOTE: createPaymentProcess is handled server-side via tRPC (payment.createProcess)
// This avoids CORS issues and keeps credentials secure on the server.

// Official Meshulam CDN SDK
// Keep the wallet on the local 1.3.5 loader. It rewrites Grow's browser-side
// API calls through our same-origin /api/grow-proxy route, whose Cloudflare
// fallback protects checkout from intermittent Incapsula blocks.
const GROW_SDK_URL = "/grow-sdk/gs.min.js";

// ─── SDK Script Preloader ─────────────────────────────────────────────────────
// Just loads the script tag — does NOT call init()
let scriptLoadPromise: Promise<void> | null = null;

function preloadGrowSDKScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.growPayment) {
      resolve();
      return;
    }
    const existing = document.querySelector("script[data-grow-sdk]");
    if (existing) {
      // Already injected — poll until growPayment appears
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (window.growPayment) {
          clearInterval(poll);
          resolve();
        } else if (tries > 100) {
          clearInterval(poll);
          reject(new Error("SDK script load timeout"));
        }
      }, 50);
      return;
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = GROW_SDK_URL;
    script.setAttribute("data-grow-sdk", "true");
    script.onload = () => {
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (window.growPayment) {
          clearInterval(poll);
          resolve();
        } else if (tries > 100) {
          clearInterval(poll);
          scriptLoadPromise = null;
          reject(
            new Error("Grow SDK API did not initialize after script load")
          );
        }
      }, 50);
    };
    script.onerror = () => {
      scriptLoadPromise = null; // allow retry
      reject(new Error("Failed to load Grow SDK script"));
    };
    const first = document.getElementsByTagName("script")[0];
    first.parentNode?.insertBefore(script, first);
  });
  return scriptLoadPromise;
}

// Wait for the exact public renderer used by checkout. Grow can expose
// growRuntime before renderPaymentOptions is attached to growPayment.
const GROW_RUNTIME_TIMEOUT_MS = 35_000;

function waitForGrowRuntime(
  timeoutMs = GROW_RUNTIME_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(() => {
      if (isGrowPaymentRendererReady(window)) {
        clearInterval(poll);
        console.log("[GrowWallet] Payment renderer ready ✓");
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(
          new Error("Grow payment renderer timeout after " + timeoutMs + "ms")
        );
      }
    }, 100);
  });
}

function waitForGrowWalletOpen(timeoutMs = 2500): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(() => {
      const root = document.getElementById("Gr0W8-wallet-root");
      if (root && isGrowWalletVisible(window.getComputedStyle(root))) {
        clearInterval(poll);
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error("Grow wallet did not become visible"));
      }
    }, 100);
  });
}

async function renderGrowPaymentOptionsWithRetry(
  authCode: string,
  logStep: (step: string, detail?: string) => void
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    await waitForGrowRuntime(GROW_RUNTIME_TIMEOUT_MS);
    const growPaymentSdk = window.growPayment;
    if (
      !growPaymentSdk ||
      typeof growPaymentSdk.renderPaymentOptions !== "function"
    ) {
      throw new Error(
        "מערכת התשלום לא נטענה במלואה. אפשר לרענן את העמוד ולנסות שוב."
      );
    }

    growPaymentSdk.renderPaymentOptions(authCode);
    logStep("5_renderPaymentOptions_attempt", `attempt=${attempt}`);
    try {
      // The same-origin proxy may first receive a fast Incapsula block and then
      // complete through its Worker fallback. Give that single request enough
      // time before issuing another draw for the same authCode.
      await waitForGrowWalletOpen(9000);
      return;
    } catch {
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, attempt * 350));
      }
    }
  }

  throw new Error("מערכת התשלום לא נפתחה. אפשר לנסות שוב בעוד כמה רגעים.");
}

// ─── Declare global types ─────────────────────────────────────────────────────
declare global {
  interface Window {
    growPayment?: {
      init: (config: any) => Promise<void>;
      renderPaymentOptions: (authCode: string) => void;
      updateEvents: (events: any) => void;
    };
    growRuntime?: any;
    __growServicesLoaded?: () => boolean;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface GrowWalletProps {
  product:
    | "database"
    | "guide"
    | "course"
    | "coaching"
    | "coaching_mas"
    | "session"
    | "bundle_tubav"
    | "bundle_new_year"
    | "match_boost"
    | "plus"
    | "live_october";
  buttonLabel?: string;
  buttonClassName?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  customerGender?: "female" | "male";
  prefillCoupon?: string;
  onSuccess?: (response: any, appliedCouponCode?: string) => void;
  onFailure?: (response: any) => void;
  termsPath?: string;
  personalToken?: string;
  /** Unpredictable draft bearer proof; only the server may authorize its use. */
  registrationResumeToken?: string;
  boostMatchId?: number;
  showCoupon?: boolean;
  onFreeAccessCode?: (
    code: string,
    email: string
  ) => Promise<{ valid: boolean; error?: string }>;
  plusConsents?: {
    renewalAccepted: boolean;
    termsAccepted: boolean;
    boostAccepted: boolean;
  };
}

type CheckoutCallbacks = Pick<GrowWalletProps, "onSuccess" | "onFailure">;

interface LocalCheckoutAttempt {
  attemptId: string;
  storageKey: string;
  fullName: string;
  email: string;
  phone: string;
  couponCode?: string;
  callbacks: CheckoutCallbacks;
  lease?: CheckoutOwnerLease;
  authCode?: string;
  processToken?: string | null;
  terminal: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GrowWallet({
  product,
  buttonLabel = "לרכישה",
  buttonClassName = "",
  prefillName,
  prefillEmail,
  prefillPhone,
  customerGender,
  prefillCoupon,
  onSuccess,
  onFailure,
  termsPath,
  personalToken,
  registrationResumeToken,
  boostMatchId,
  showCoupon = true,
  onFreeAccessCode,
  plusConsents,
}: GrowWalletProps) {
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [phone, setPhone] = useState(prefillPhone || "");
  // Preparation is a short, pre-overlay spinner. A visible Grow overlay has its
  // own state so the form is frozen without pretending the page is still loading.
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [paymentStatusAmbiguous, setPaymentStatusAmbiguous] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const instanceId = useId();
  const [couponCode, setCouponCode] = useState(prefillCoupon || "");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discountPercent?: number;
    discountAmount?: number;
    fixedPrice?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const validateCouponMutation = trpc.coupons.validate.useMutation();
  const saveLeadMutation = trpc.coupons.saveLead.useMutation();
  const createProcessMutation = trpc.payment.createProcess.useMutation();
  const reportFailureMutation = trpc.payment.reportFailure.useMutation();
  const autoCouponKeyRef = useRef("");
  const activeCheckoutCouponRef = useRef<string | undefined>(undefined);
  const checkoutLockRef = useRef(false);
  const checkoutAttemptRef = useRef<LocalCheckoutAttempt | null>(null);
  const identityTouchedRef = useRef({ name: false, email: false, phone: false });
  const customerInputFrozen = walletLoading || walletOpen || paymentStatusAmbiguous || paymentCompleted;

  // A saved registration draft can arrive after the wallet has mounted. Keep a
  // pristine wallet synchronized with it, but never overwrite a user's edit or
  // mutate an identity once it has been used for a checkout attempt.
  useEffect(() => {
    if (checkoutAttemptRef.current || checkoutLockRef.current || customerInputFrozen) return;
    if (!identityTouchedRef.current.name && prefillName !== undefined) setName(prefillName || "");
    if (!identityTouchedRef.current.email && prefillEmail !== undefined) setEmail(prefillEmail || "");
    if (!identityTouchedRef.current.phone && prefillPhone !== undefined) setPhone(prefillPhone || "");
  }, [prefillName, prefillEmail, prefillPhone, customerInputFrozen]);

  useEffect(() => {
    const requestedCode = prefillCoupon?.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (!requestedCode || !normalizedEmail) return;
    const attemptKey = `${requestedCode}:${product}:${normalizedEmail}`;
    if (autoCouponKeyRef.current === attemptKey) return;
    autoCouponKeyRef.current = attemptKey;
    setCouponCode(requestedCode);
    setCouponError("");
    validateCouponMutation
      .mutateAsync({
        code: requestedCode,
        product,
        email: normalizedEmail,
        personalToken,
      })
      .then(result => {
        if (result.valid) {
          setCouponApplied({
            code: result.code,
            discountPercent: result.discountPercent,
            discountAmount: result.discountAmount,
            fixedPrice: result.fixedPrice,
          });
        } else {
          setCouponError((result as any).error || "קוד קופון לא תקין");
        }
      })
      .catch(() =>
        setCouponError("לא ניתן היה לאמת את ההטבה. אפשר לנסות שוב.")
      );
  }, [prefillCoupon, email, product]);

  // Track processToken from createProcess so we can include it in failure reports
  const lastProcessTokenRef = useRef<string | null>(null);

  // Server-side step logger for debugging payment flow on mobile
  const logStepMutation = trpc.payment.logStep.useMutation();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    const normalizedCode = couponCode.trim();
    setCouponError("");
    setCouponLoading(true);
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: normalizedCode,
        product,
        email: email.trim() || undefined,
        personalToken,
      });
      if (result.valid) {
        setCouponApplied({
          code: result.code,
          discountPercent: result.discountPercent,
          discountAmount: result.discountAmount,
          fixedPrice: result.fixedPrice,
        });
        const label =
          result.code === "PLUSGIFT"
            ? "בוסט נוסף במתנה לאחר הצטרפות ראשונה ל־Plus; המחיר נשאר 99 ₪ לחודש"
            : isPlusBonusCouponCode(result.code)
              ? "3 הצעות ידניות במחזור הראשון; המחיר נשאר 99 ₪"
              : result.fixedPrice
                ? `מחיר מיוחד: ₪${result.fixedPrice}`
                : result.discountPercent
                  ? `${result.discountPercent}% הנחה`
                  : result.discountAmount
                    ? `₪${result.discountAmount} הנחה`
                    : "כרטיס ללייב במתנה";
        toast.success(`קוד הוחל! ${label}`);
      } else if (product === "database" && onFreeAccessCode) {
        const freeAccess = await onFreeAccessCode(normalizedCode, email.trim());
        if (!freeAccess.valid) {
          setCouponError(
            freeAccess.error || (result as any).error || "קוד לא תקין"
          );
        }
      } else {
        setCouponError((result as any).error || "קוד קופון לא תקין");
      }
    } catch {
      setCouponError("שגיאה בבדיקת הקופון. נסה שוב.");
    } finally {
      setCouponLoading(false);
    }
  };

  // Keep latest callbacks in ref so they don't stale-close
  const callbacksRef = useRef({ onSuccess, onFailure });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onFailure };
  }, [onSuccess, onFailure]);

  // Preload SDK script on mount (background, no init yet)
  useEffect(() => {
    preloadGrowSDKScript().catch(err => {
      console.warn("[GrowWallet] Script preload failed:", err);
    });
  }, [product]);

  useEffect(() => () => {
    const attempt = checkoutAttemptRef.current;
    if (attempt?.lease) releaseCheckoutOwner(attempt.lease);
  }, []);

  const handlePay = useCallback(async () => {
    // This ref is intentionally set before the first await. React state alone
    // cannot prevent two click handlers from entering in the same event turn.
    if (checkoutLockRef.current || paymentCompleted || paymentStatusAmbiguous) return;

    const fullName = normalizeCheckoutFullName(name);
    const userEmail = email.trim();
    const userPhone = normalizeIsraeliPhone(phone);

    if (!isValidCheckoutFullName(fullName)) {
      toast.error("שם מלא נדרש — יש להזין שם פרטי ושם משפחה.");
      return;
    }
    if (!isValidCheckoutEmail(userEmail)) {
      toast.error("אימייל לא תקין — יש להזין כתובת אימייל תקינה.");
      return;
    }
    if (!userPhone) {
      toast.error(
        "מספר הטלפון אינו תקין. יש להזין מספר ישראלי מלא, לדוגמה 050-0000000."
      );
      return;
    }
    if (name !== fullName) setName(fullName);
    if (phone !== userPhone) setPhone(userPhone);
    if (!ageConfirmed) {
      toast.error("יש לאשר שאתה/את בן/בת 18 ומעלה.");
      return;
    }
    if (termsPath && !termsAccepted) {
      toast.error("יש לאשר את התקנון לפני התשלום.");
      return;
    }
    // A database gift-page visitor must never pay for a plain database order
    // just because the automatic LIVE coupon validation is still pending.
    if (
      product === "database" &&
      ["LIVE", "TEST1"].includes(prefillCoupon?.trim().toUpperCase() || "") &&
      couponApplied?.code !== prefillCoupon?.trim().toUpperCase()
    ) {
      toast.error(
        "ממתינים לאימות קוד ההטבה. אין לבצע תשלום בלי שהקוד מופיע בקופה."
      );
      return;
    }
    if (
      showCoupon &&
      couponCode.trim() &&
      couponApplied?.code !== couponCode.trim().toUpperCase()
    ) {
      toast.error(
        "יש לאמת את הקוד שהוזן לפני פתיחת התשלום, או למחוק אותו כדי להמשיך במחיר הרגיל."
      );
      return;
    }

    const storageKey = checkoutAttemptStorageKey({
      product,
      email: userEmail,
      boostMatchId,
    });
    let attempt = checkoutAttemptRef.current;
    if (!attempt || attempt.storageKey !== storageKey || attempt.terminal) {
      attempt = {
        attemptId: getOrCreateCheckoutAttemptId({
          product,
          email: userEmail,
          boostMatchId,
        }),
        storageKey,
        fullName,
        email: userEmail,
        phone: userPhone,
        couponCode: couponApplied?.code,
        // Snapshot callbacks with the identity. A later render must not make a
        // delayed SDK callback act on a different customer or component.
        callbacks: { ...callbacksRef.current },
        terminal: false,
      };
      checkoutAttemptRef.current = attempt;
    }

    if (isCheckoutAttemptCompleted(attempt.attemptId)) {
      attempt.terminal = true;
      checkoutLockRef.current = true;
      setPaymentCompleted(true);
      toast.message("תהליך התשלום הזה כבר הושלם. התשלום מאומת מול השרת לאחר קבלת אישור מתאים.");
      return;
    }

    checkoutLockRef.current = true;
    const lease = acquireCheckoutOwner(attempt.attemptId, instanceId);
    if (!lease) {
      checkoutLockRef.current = false;
      toast.error(
        "תהליך תשלום כבר פתוח בעמוד זה. אפשר לסיים או לסגור אותו לפני פתיחה נוספת."
      );
      return;
    }
    attempt.lease = lease;
    setWalletLoading(true);
    setWalletOpen(false);
    setPaymentStatusAmbiguous(false);

    const isCurrentAttempt = () =>
      checkoutAttemptRef.current === attempt &&
      !attempt.terminal &&
      isCheckoutOwner(lease);
    const releaseRecoverableAttempt = (ambiguous = false) => {
      if (!isCurrentAttempt()) return;
      releaseCheckoutOwner(lease);
      attempt.lease = undefined;
      checkoutLockRef.current = false;
      setWalletLoading(false);
      setWalletOpen(false);
      setPaymentStatusAmbiguous(ambiguous);
    };
    const logStep = (step: string, detail?: string) => {
      try {
        logStepMutation.mutate({
          product,
          step,
          detail: detail || "",
          email: attempt.email,
        });
      } catch {}
    };
    const reportSdkFailure = (response: any) => {
      const fullRaw = JSON.stringify(response)?.slice(0, 500) || "(empty)";
      const errMsg =
        typeof response === "string"
          ? response
          : response?.message
            ? `${response.message}${response.status !== undefined ? ` (קוד: ${response.status})` : ""}`
            : fullRaw.slice(0, 200);
      reportFailureMutation.mutate({
        customerName: attempt.fullName,
        customerEmail: attempt.email,
        customerPhone: attempt.phone,
        product,
        errorMessage: `${errMsg} | RAW: ${fullRaw}`,
        stage: "sdk_failure",
        processToken:
          attempt.processToken || lastProcessTokenRef.current || undefined,
      });
    };

    // Only failures from the server-side process creation step are critical
    // createProcess incidents. SDK boot/render failures are recoverable client
    // failures and must not trigger the operational createProcess SMS alert.
    let failureStage: "createProcess" | "sdk_failure" =
      product === "plus" ? "createProcess" : "sdk_failure";

    try {
      // Plus returns a hosted recurring-payment URL, so it must not depend on
      // the regular Grow wallet SDK. An authorized TEST1 Plus checkout is a
      // one-time diagnostic wallet, and therefore still initializes the SDK.
      if (product !== "plus" || attempt.couponCode === "TEST1") {
        logStep("1_script_load_start");
        await preloadGrowSDKScript();
        if (!isCurrentAttempt()) return;
        if (!window.growPayment)
          throw new Error("Grow SDK not available after script load");
        logStep("1_script_load_done");

        logStep("2_init_start");
        await window.growPayment.init({
          environment: GROW_ENV,
          version: GROW_VERSION,
          events: {
            onSuccess: (r: any) => {
              if (!isCurrentAttempt()) return;
              // Terminal success wins over every later close/cancel/error
              // callback. The SDK result is not presented as server verification.
              attempt.terminal = true;
              completeCheckoutOwner(lease);
              attempt.lease = undefined;
              checkoutLockRef.current = true;
              setWalletLoading(false);
              setWalletOpen(false);
              setPaymentStatusAmbiguous(false);
              setPaymentCompleted(true);
              if (attempt.couponCode === "TEST1") {
                toast.success(
                  "בקשת תשלום הבדיקה הושלמה. לא הופעל מנוי ולא נשלחה התאמה; יש לוודא את החיוב ב־Grow."
                );
                return;
              }
              // The attempt intentionally uses its callback snapshot; a later
              // render must not redirect or act for a different customer.
              attempt.callbacks.onSuccess?.(r, attempt.couponCode);
            },
            onFailure: (r: any) => {
              if (!isCurrentAttempt()) return;
              const ambiguousFailure = /outcome_unknown|timeout|network|fetch failed|Failed to fetch|מצב התשלום/i.test(JSON.stringify(r) || "");
              releaseRecoverableAttempt(ambiguousFailure);
              toast.error(ambiguousFailure
                ? "מצב התשלום אינו ברור. אין לשלם שוב לפני בדיקה; אפשר לפנות אלינו לבירור."
                : "התשלום נכשל. אפשר לפתוח שוב את אותו תהליך תשלום.");
              reportSdkFailure(r);
              attempt.callbacks.onFailure?.(r);
            },
            onCancel: () => {
              if (!isCurrentAttempt()) return;
              releaseRecoverableAttempt(false);
            },
            onPaymentCancel: () => {
              if (!isCurrentAttempt()) return;
              releaseRecoverableAttempt(false);
            },
            onClose: () => {
              if (!isCurrentAttempt()) return;
              // Closing is recoverable: keep the immutable authCode/process
              // client-side and reopen it, rather than creating a new purchase.
              releaseRecoverableAttempt(false);
            },
            onWalletChange: (state: unknown) => {
              if (state !== "close" || !isCurrentAttempt()) return;
              releaseRecoverableAttempt(false);
            },
            onError: (e: any) => {
              if (!isCurrentAttempt()) return;
              // This may arrive after a provider action, so it is distinct from
              // a confirmed SDK failure. The customer can reopen the same process.
              releaseRecoverableAttempt(true);
              toast.error(
                "מצב התשלום עדיין אינו ברור. אין לשלם שוב לפני בדיקה; אפשר לפנות אלינו לבירור."
              );
              reportSdkFailure(e);
            },
          },
        });

        if (!isCurrentAttempt()) return;
        logStep("2_init_done");
        logStep("3_wait_runtime_start");
        await waitForGrowRuntime(GROW_RUNTIME_TIMEOUT_MS);
        if (!isCurrentAttempt()) return;
        logStep("3_wait_runtime_done");
      }

      // A close/error after createProcess must redraw the same provider process.
      // Do not mint a second intended purchase or server nonce for this identity.
      if (!attempt.authCode) {
        const baseCheckoutPrice = PRODUCT_CONFIGS[product]?.sum ?? 0;
        const trackedCheckoutPrice = isPlusBonusCouponCode(attempt.couponCode)
          ? baseCheckoutPrice
          : (couponApplied?.fixedPrice ??
            (couponApplied?.discountAmount
              ? Math.max(1, baseCheckoutPrice - couponApplied.discountAmount)
              : couponApplied?.discountPercent
                ? Math.max(
                    1,
                    Math.round(
                      baseCheckoutPrice *
                        (1 - couponApplied.discountPercent / 100)
                    )
                  )
                : baseCheckoutPrice));
        const checkoutDescription =
          PRODUCT_CONFIGS[product]?.description ?? product;
        if (attempt.couponCode !== "TEST1") {
          gaBeginCheckout(product);
          trackInitiateCheckout({
            value: trackedCheckoutPrice,
            currency: "ILS",
            content_name: checkoutDescription,
          });
        }
        track({
          eventType: "button_click",
          metadata: {
            product,
            action: "initiate_checkout",
            value: trackedCheckoutPrice,
          },
        });

        // Calculate discounted price if coupon is applied. The authoritative
        // final price remains server-validated; this is retained for pricing flow parity.
        const basePrice = PRODUCT_CONFIGS[product]?.sum ?? 0;
        let finalPrice: number | undefined = undefined;
        if (couponApplied && !isPlusBonusCouponCode(couponApplied.code)) {
          if (couponApplied.fixedPrice) finalPrice = couponApplied.fixedPrice;
          else if (couponApplied.discountAmount)
            finalPrice = Math.max(1, basePrice - couponApplied.discountAmount);
          else if (couponApplied.discountPercent)
            finalPrice = Math.max(
              1,
              Math.round(basePrice * (1 - couponApplied.discountPercent / 100))
            );
        }
        const lastUtm = getLastUtmAcquisition();
        const {
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          metaCampaignId,
          metaAdSetId,
          metaAdId,
          metaPlacement,
          siteSourceName,
        } = lastUtm || {};
        const attributionTerm =
          [utmTerm, metaPlacement, siteSourceName]
            .filter(Boolean)
            .join("|")
            .slice(0, 200) || undefined;

        let ga4ClientId: string | undefined;
        try {
          const gaCookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("_ga="));
          if (gaCookie) {
            const parts = gaCookie.split("=")[1].split(".");
            if (parts.length >= 4) ga4ClientId = parts.slice(2).join(".");
          }
        } catch {}
        let ga4SessionId: string | undefined;
        try {
          const sessionCookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("_ga_ZH1CYQCTMN="));
          if (sessionCookie) {
            const parts = sessionCookie.split("=")[1].split(".");
            if (parts.length >= 3 && parts[2]) ga4SessionId = parts[2];
          }
        } catch {}
        const { fbp, fbc } = getMetaBrowserIdentifiers();

        // Save lead for cart abandonment tracking (non-blocking)
        try {
          await saveLeadMutation.mutateAsync({
            name: attempt.fullName,
            email: attempt.email,
            phone: attempt.phone || "",
            product,
          });
        } catch {
          /* non-blocking */
        }
        if (!isCurrentAttempt()) return;

        logStep("4_createProcess_start");
        failureStage = "createProcess";
        const result = await createProcessMutation.mutateAsync({
          product: product as
            | "database"
            | "guide"
            | "course"
            | "coaching"
            | "coaching_mas"
            | "session"
            | "bundle_tubav"
            | "bundle_new_year"
            | "match_boost"
            | "plus"
            | "live_october",
          fullName: attempt.fullName,
          email: attempt.email,
          phone: attempt.phone || undefined,
          couponCode: attempt.couponCode || undefined,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm: attributionTerm,
          metaCampaignId,
          metaAdSetId,
          metaAdId,
          firstTouch: getFirstTouchAcquisition(),
          ga4ClientId,
          ga4SessionId,
          fbp,
          fbc,
          personalToken,
          // A server-verified registration token may only continue an existing
          // matching open database checkout; it is never a provider credential.
          registrationResumeToken:
            product === "database" ? registrationResumeToken : undefined,
          boostTermsAccepted: product === "match_boost" ? true : undefined,
          boostMatchId: product === "match_boost" ? boostMatchId : undefined,
          boostEntryChannel:
            product === "match_boost"
              ? boostEntryChannelFromSearch(window.location.search)
              : undefined,
          plusRenewalAccepted:
            product === "plus" && plusConsents?.renewalAccepted
              ? true
              : undefined,
          plusTermsAccepted:
            product === "plus" && plusConsents?.termsAccepted
              ? true
              : undefined,
          plusBoostAccepted:
            product === "plus" && plusConsents?.boostAccepted
              ? true
              : undefined,
          origin: product === "plus" ? window.location.origin : undefined,
          // The server treats this as an idempotency/continuation key. It is an
          // opaque UUID; no token, payment data, or personal data is persisted here.
          checkoutAttemptId: attempt.attemptId,
        } as any);
        if (!isCurrentAttempt()) return;

        rememberPurchaseTrackingToken(result.purchaseTrackingToken);
        activeCheckoutCouponRef.current = attempt.couponCode;
        attempt.processToken = result.processToken || null;
        lastProcessTokenRef.current = attempt.processToken;

        if (result.url) {
          // Hosted Plus bypasses the embedded SDK. Releasing before navigation
          // avoids a stale page-level owner if navigation is blocked by a browser.
          releaseCheckoutOwner(lease);
          attempt.lease = undefined;
          checkoutLockRef.current = false;
          setWalletLoading(false);
          window.location.assign(result.url);
          return;
        }

        attempt.authCode = result.authCode;
        logStep(
          "4_createProcess_done",
          `authCode=${result.authCode ? "present" : "missing"} processToken=${result.processToken ? "present" : "missing"}`
        );
        failureStage = "sdk_failure";
        logStep("5_renderPaymentOptions_start");
        // The first open uses the just-created process. A later close/error
        // reaches the cached-attempt branch below and redraws this same authCode.
        await renderGrowPaymentOptionsWithRetry(result.authCode, logStep);
        if (!isCurrentAttempt()) return;
        setWalletLoading(false);
        setWalletOpen(true);
        logStep("5_renderPaymentOptions_done");
        return;
      }

      if (!isCurrentAttempt()) return;
      failureStage = "sdk_failure";
      logStep("5_renderPaymentOptions_start");
      // Re-check after the network round-trip as the SDK mutates its global
      // object asynchronously during initialization on some first loads.
      await renderGrowPaymentOptionsWithRetry(attempt.authCode!, logStep);
      if (!isCurrentAttempt()) return;
      setWalletLoading(false);
      setWalletOpen(true);
      logStep("5_renderPaymentOptions_done");
    } catch (err: any) {
      if (!isCurrentAttempt()) return;
      const technicalMessage = String(err?.message || "Unknown");
      const errDetail = `${technicalMessage} | stack: ${err?.stack?.slice(0, 200) || "N/A"}`;
      const expectedRejection = isExpectedCheckoutRejection(technicalMessage);
      logStep(expectedRejection ? "REJECTED" : "ERROR", errDetail);
      releaseRecoverableAttempt(
        failureStage === "sdk_failure" && Boolean(attempt.authCode)
      );
      const isConnectivityFailure =
        /Grow API error|fetch failed|Failed to fetch|HTTP\s*\d+/i.test(
          technicalMessage
        );
      if (/PAYMENT_PHONE_INVALID/.test(technicalMessage)) {
        toast.error("מספר הטלפון אינו תקין. יש לבדוק את הספרות ולנסות שוב.");
        return;
      }
      toast.error(
        isConnectivityFailure
          ? "לא ניתן להתחבר כרגע למערכת התשלום. אפשר לנסות שוב בעוד כמה רגעים."
          : technicalMessage
      );
      if (!expectedRejection) {
        reportFailureMutation.mutate({
          customerName: attempt.fullName,
          customerEmail: attempt.email,
          customerPhone: attempt.phone,
          product,
          errorMessage: errDetail.slice(0, 300),
          stage: failureStage,
          processToken: attempt.processToken || undefined,
        });
      }
    }
  }, [
    name,
    email,
    phone,
    product,
    termsPath,
    termsAccepted,
    ageConfirmed,
    personalToken,
    registrationResumeToken,
    boostMatchId,
    couponApplied,
    couponCode,
    showCoupon,
    prefillCoupon,
    plusConsents,
    instanceId,
    paymentCompleted,
    paymentStatusAmbiguous,
  ]);

  const hasAllDetails = hasCompleteCheckoutPrefill(
    { fullName: name, email, phone },
    normalizeIsraeliPhone(phone),
  );

  return (
    <div
      className="grow-wallet-container bg-white rounded-2xl p-6 shadow-lg"
      dir="rtl"
      style={{ color: "#191265" }}
    >
      {!hasAllDetails && (
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <Label
              htmlFor={`gw-name-${instanceId}`}
              className="text-sm font-medium mb-1 block"
              style={{ color: "#191265" }}
            >
              שם מלא
            </Label>
            <Input
              id={`gw-name-${instanceId}`}
              type="text"
              value={name}
              disabled={customerInputFrozen}
              onChange={e => {
                identityTouchedRef.current.name = true;
                setName(e.target.value);
              }}
              placeholder="שם פרטי ושם משפחה"
              style={{ color: "#1a1a1a", backgroundColor: "white" }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label
              htmlFor={`gw-email-${instanceId}`}
              className="text-sm font-medium mb-1 block"
              style={{ color: "#191265" }}
            >
              אימייל
            </Label>
            <Input
              id={`gw-email-${instanceId}`}
              type="email"
              value={email}
              disabled={customerInputFrozen}
              onChange={e => {
                identityTouchedRef.current.email = true;
                setEmail(e.target.value);
                setCouponApplied(null);
                setCouponError("");
              }}
              placeholder="your@email.com"
              style={{ color: "#1a1a1a", backgroundColor: "white" }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label
              htmlFor={`gw-phone-${instanceId}`}
              className="text-sm font-medium mb-1 block"
              style={{ color: "#191265" }}
            >
              טלפון <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`gw-phone-${instanceId}`}
              type="tel"
              value={phone}
              disabled={customerInputFrozen}
              onChange={e => {
                identityTouchedRef.current.phone = true;
                setPhone(e.target.value);
              }}
              placeholder="050-0000000"
              style={{ color: "#1a1a1a", backgroundColor: "white" }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
        </div>
      )}

      {/* Coupon field */}
      {showCoupon && (
        <div
          className={
            product === "live_october"
              ? "mb-4 rounded-xl border border-[#d8c695] bg-[#fffaf0] p-4"
              : "mb-4"
          }
        >
          {couponApplied ? (
            <p className="mb-1.5 text-sm font-bold text-[#191265]">
              קוד ההטבה שלך
            </p>
          ) : (
            <label
              htmlFor={`gw-coupon-${instanceId}`}
              className="mb-1.5 block text-sm font-bold text-[#191265]"
            >
              {product === "live_october"
                ? "יש לך קוד הטבה? מזינים אותו כאן"
                : product === "database"
                  ? "יש לך קוד הנחה לרכישה?"
                  : "יש לך קוד קופון?"}
            </label>
          )}
          {couponApplied ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded-xl px-4 py-2.5">
              <span className="text-green-700 text-sm font-bold">
                ✓ קופון "{couponApplied.code}" הוחל
                {couponApplied.code === "PLUSGIFT"
                  ? " · בוסט נוסף במתנה בהצטרפות ראשונה, במחיר הרגיל של 99 ₪ לחודש"
                  : ""}
                {isPlusBonusCouponCode(couponApplied.code)
                  ? " — 3 הצעות ידניות במחזור הראשון, במחיר 99 ₪"
                  : ""}
                {couponApplied.discountPercent
                  ? ` — ${couponApplied.discountPercent}% הנחה`
                  : ""}
                {couponApplied.discountAmount
                  ? ` — ₪${couponApplied.discountAmount} הנחה`
                  : ""}
                {couponApplied.fixedPrice
                  ? ` — מחיר לתשלום: ₪${couponApplied.fixedPrice}`
                  : ""}
                {product === "guide" &&
                  couponApplied.code === "CHOOSE50" &&
                  couponApplied.fixedPrice !== undefined && (
                    <span
                      className="mt-2 flex items-baseline gap-3"
                      aria-label={`במקום ${PRODUCT_CONFIGS.guide.sum} שקלים, מחיר המבצע ${couponApplied.fixedPrice.toFixed(2)} שקלים`}
                    >
                      <del className="text-sm font-normal text-gray-500">
                        ₪{PRODUCT_CONFIGS.guide.sum}
                      </del>
                      <span className="text-xl font-extrabold text-[#191265]">
                        ₪{couponApplied.fixedPrice.toFixed(2)}
                      </span>
                    </span>
                  )}
              </span>
              <button
                onClick={() => {
                  setCouponApplied(null);
                  setCouponCode("");
                }}
                disabled={customerInputFrozen}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors mr-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id={`gw-coupon-${instanceId}`}
                type="text"
                value={couponCode}
                disabled={customerInputFrozen}
                onChange={e => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponApplied(null);
                  setCouponError("");
                }}
                placeholder={
                  product === "database" ? "הכנס/י קוד הנחה" : "הכנס קוד קופון"
                }
                className="text-right text-sm"
                style={{ color: "#1a1a1a", backgroundColor: "white" }}
                onKeyDown={e => {
                  if (e.key === "Enter") handleApplyCoupon();
                }}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading || customerInputFrozen}
                className="shrink-0 bg-[#191265] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1800ad] transition-colors disabled:opacity-50"
              >
                {couponLoading ? "..." : "החל"}
              </button>
            </div>
          )}
          {couponError && (
            <p className="text-red-500 text-xs mt-1">{couponError}</p>
          )}
        </div>
      )}

      {/* Age confirmation */}
      <div className="flex items-start gap-2 mb-2">
        <Checkbox
          id={`gw-age-${instanceId}`}
          checked={ageConfirmed}
          disabled={customerInputFrozen}
          onCheckedChange={v => setAgeConfirmed(!!v)}
          className="mt-0.5 shrink-0"
        />
        <label
          htmlFor={`gw-age-${instanceId}`}
          className="text-sm cursor-pointer leading-snug"
          style={{ color: "#191265" }}
        >
          {customerGender === "male"
            ? "אני מאשר שאני בן 18 ומעלה"
            : customerGender === "female"
              ? "אני מאשרת שאני בת 18 ומעלה"
              : "אני מעל גיל 18"}
        </label>
      </div>

      {termsPath && (
        <div className="flex items-start gap-2 mb-3">
          <Checkbox
            id={`gw-terms-${instanceId}`}
            checked={termsAccepted}
            disabled={customerInputFrozen}
            onCheckedChange={v => setTermsAccepted(!!v)}
            className="mt-0.5 shrink-0"
          />
          <label
            htmlFor={`gw-terms-${instanceId}`}
            className="text-sm cursor-pointer leading-snug"
            style={{ color: "#191265" }}
          >
            {product === "match_boost"
              ? "קראתי, הבנתי ואישרתי את "
              : "קראתי ואישרתי את "}
            <a
              href={termsPath}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80 mx-1"
              onClick={e => e.stopPropagation()}
            >
              תקנון ומדיניות ביטול
            </a>
            {product === "match_boost" &&
              " כולל קבלת הצעות Boost אלגוריתמיות, שליחת שם, תמונה ופרטי פרופיל לשני הצדדים בעת שליחת ההצעה, ואישור נפרד של כל צד"}
          </label>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={
          walletLoading || walletOpen || paymentCompleted || paymentStatusAmbiguous || !ageConfirmed || (!!termsPath && !termsAccepted)
        }
        className={`w-full flex items-center justify-center gap-2 bg-[#ffe27c] text-[#191265] font-bold text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${buttonClassName}`}
      >
        {paymentCompleted ? (
          <span>התשלום הושלם</span>
        ) : walletLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>מכינים תשלום...</span>
          </>
        ) : walletOpen ? (
          <span>התשלום פתוח</span>
        ) : paymentStatusAmbiguous ? (
          <span>מצב התשלום דורש בדיקה</span>
        ) : (
          <span>
            {product === "guide" &&
            couponApplied?.code === "CHOOSE50" &&
            couponApplied.fixedPrice !== undefined
              ? `לרכישה המאובטחת ₪${couponApplied.fixedPrice.toFixed(2)} ←`
              : buttonLabel}
          </span>
        )}
      </button>

      {paymentStatusAmbiguous && !walletLoading && !walletOpen && !paymentCompleted && (
        <p className="mt-3 text-center text-xs leading-5 text-amber-800">
          לא הצלחנו לוודא אם התשלום נקלט. כדי להימנע מחיוב נוסף, אין לשלם שוב לפני בדיקה. אפשר לפנות אלינו לבירור.
        </p>
      )}

      <div
        className="flex justify-center items-center gap-4 mt-3 text-xs opacity-70"
        style={{ color: "#191265" }}
      >
        <span>🔒 תשלום מאובטח</span>
        {product === "match_boost" ? (
          <span>✓ חיוב חד־פעמי</span>
        ) : product === "live_october" ? (
          <span>✓ שובר אישי לאחר אישור התשלום</span>
        ) : (
          <span>⚡ גישה מיידית</span>
        )}
        {product === "live_october" ? (
          <span>✓ קישור כניסה יישלח לקראת האירוע</span>
        ) : (
          product !== "match_boost" && <span>✓ תוכן מעשי וישים</span>
        )}
      </div>
      {product !== "match_boost" && (
        <p
          className="text-center text-xs mt-1 opacity-60"
          style={{ color: "#191265" }}
        >
          תשלום מאובטח באמצעות Grow Payments
        </p>
      )}
    </div>
  );
}
