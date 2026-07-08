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

// ─── Grow config from VITE env vars ──────────────────────────────────────────
const GROW_ENV = "PRODUCTION" as string; // "DEV" for sandbox, "PRODUCTION" for live
const GROW_VERSION = 1;
const GROW_PROXY_URL = "https://grow-proxy.hilitcaspi.workers.dev";

const GROW_USER_ID = import.meta.env.VITE_GROW_USER_ID || "e02cfda4ca3d4736";

const PROD_PAGE_CODE = "b497c06813ac";
const PAGE_CODES: Record<string, string> = {
  database:     import.meta.env.VITE_GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
  guide:        import.meta.env.VITE_GROW_PAGE_CODE_GUIDE    || PROD_PAGE_CODE,
  course:       import.meta.env.VITE_GROW_PAGE_CODE_COURSE   || PROD_PAGE_CODE,
  coaching:     import.meta.env.VITE_GROW_PAGE_CODE_COACHING || PROD_PAGE_CODE,
  coaching_mas: import.meta.env.VITE_GROW_PAGE_CODE_COACHING_MAS || PROD_PAGE_CODE,
  session:      import.meta.env.VITE_GROW_PAGE_CODE_SESSION  || PROD_PAGE_CODE,
  bundle_tubav: import.meta.env.VITE_GROW_PAGE_CODE_DATABASE || PROD_PAGE_CODE,
};

const PRODUCT_CONFIGS: Record<string, { description: string; sum: number; paymentNum?: number; maxPaymentNum?: number }> = {
  database:     { description: "מאגר הרווקים של הילית כספי", sum: 249, paymentNum: 1 },
  guide:        { description: "מדריך לבחור נכון של הילית כספי", sum: 149, paymentNum: 1 },
  course:       { description: "קורס המסע של הילית כספי", sum: 249, paymentNum: 1 },
  coaching:     { description: "ליווי אישי - תהליך הבנה (8 פגישות) עם הילית כספי", sum: 2960, maxPaymentNum: 8 },
  coaching_mas: { description: "ליווי אישי - תהליך המסע (12 פגישות) עם הילית כספי", sum: 4200, maxPaymentNum: 10 },
  session:      { description: "פגישה בודדת עם הילית כספי", sum: 500, paymentNum: 1 },
  bundle_tubav: { description: "חבילת טו באב - מאגר + מדריך לבחור נכון", sum: 349, paymentNum: 1 },
};

const SITE_BASE = window.location.origin;

// NOTE: createPaymentProcess is handled server-side via tRPC (payment.createProcess)
// This avoids CORS issues and keeps credentials secure on the server.

// Self-hosted SDK path
const GROW_SDK_URL = "/grow-sdk/gs.min.js";

// ─── SDK Script Preloader ─────────────────────────────────────────────────────
// Just loads the script tag — does NOT call init()
let scriptLoadPromise: Promise<void> | null = null;

function preloadGrowSDKScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.growPayment) { resolve(); return; }
    const existing = document.querySelector('script[data-grow-sdk]');
    if (existing) {
      // Already injected — poll until growPayment appears
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (window.growPayment) { clearInterval(poll); resolve(); }
        else if (tries > 100) { clearInterval(poll); reject(new Error("SDK script load timeout")); }
      }, 50);
      return;
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = GROW_SDK_URL;
    script.setAttribute("data-grow-sdk", "true");
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null; // allow retry
      reject(new Error("Failed to load Grow SDK script"));
    };
    const first = document.getElementsByTagName("script")[0];
    first.parentNode?.insertBefore(script, first);
  });
  return scriptLoadPromise;
}

// Wait for growRuntime AND all payment services to be loaded
function waitForGrowRuntime(timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(() => {
      const runtime = (window as any).growRuntime;
      const servicesLoaded = (window as any).__growServicesLoaded;
      if (runtime) {
        if (servicesLoaded && typeof servicesLoaded === 'function') {
          if (servicesLoaded()) {
            clearInterval(poll);
            console.log('[GrowWallet] All payment services loaded ✓');
            resolve();
            return;
          }
        } else {
          // __growServicesLoaded not available — assume runtime is enough
          clearInterval(poll);
          console.log('[GrowWallet] growRuntime ready (no services check) ✓');
          resolve();
          return;
        }
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error("Grow runtime timeout after " + timeoutMs + "ms"));
      }
    }, 100);
  });
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
  product: "database" | "guide" | "course" | "coaching" | "coaching_mas" | "session" | "bundle_tubav";
  buttonLabel?: string;
  buttonClassName?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
  termsPath?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GrowWallet({
  product,
  buttonLabel = "לרכישה",
  buttonClassName = "",
  prefillName,
  prefillEmail,
  prefillPhone,
  onSuccess,
  onFailure,
  termsPath,
}: GrowWalletProps) {
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [phone, setPhone] = useState(prefillPhone || "");
  const [walletLoading, setWalletLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const instanceId = useId();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPercent?: number; discountAmount?: number; fixedPrice?: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const validateCouponMutation = trpc.coupons.validate.useMutation();
  const saveLeadMutation = trpc.coupons.saveLead.useMutation();
  const createProcessMutation = trpc.payment.createProcess.useMutation();
  const reportFailureMutation = trpc.payment.reportFailure.useMutation();

  // Track processToken from createProcess so we can include it in failure reports
  const lastProcessTokenRef = useRef<string | null>(null);

  // Capture UTM params from URL on mount and persist to sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmKeys.forEach(key => {
      const val = params.get(key);
      if (val) sessionStorage.setItem(key, val);
    });
    // Also check referrer for organic sources
    if (!sessionStorage.getItem('utm_source') && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.hostname.includes('google')) sessionStorage.setItem('utm_source', 'google');
        else if (ref.hostname.includes('facebook') || ref.hostname.includes('fb.com')) sessionStorage.setItem('utm_source', 'facebook');
        else if (ref.hostname.includes('instagram')) sessionStorage.setItem('utm_source', 'instagram');
        else if (ref.hostname.includes('tiktok')) sessionStorage.setItem('utm_source', 'tiktok');
      } catch {}
    }
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const result = await validateCouponMutation.mutateAsync({ code: couponCode.trim(), product });
      if (result.valid) {
        setCouponApplied({ code: result.code, discountPercent: result.discountPercent, discountAmount: result.discountAmount, fixedPrice: result.fixedPrice });
        const label = result.fixedPrice ? `מחיר מיוחד: ₪${result.fixedPrice}` : result.discountPercent ? `${result.discountPercent}% הנחה` : result.discountAmount ? `₪${result.discountAmount} הנחה` : "הנחה";
        toast.success(`קופון הוחל! ${label}`);
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
  }, []);

  const handlePay = useCallback(async () => {
    const fullName = name.trim();
    const userEmail = email.trim();
    const userPhone = phone.trim();

    if (!fullName || fullName.split(" ").filter(Boolean).length < 2) {
      toast.error("שם מלא נדרש — יש להזין שם פרטי ושם משפחה.");
      return;
    }
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error("אימייל לא תקין — יש להזין כתובת אימייל תקינה.");
      return;
    }
    if (!userPhone || userPhone.replace(/\D/g, "").length < 9) {
      toast.error("יש להזין מספר טלפון תקין.");
      return;
    }
    if (!ageConfirmed) {
      toast.error("יש לאשר שאתה/את בן/בת 18 ומעלה.");
      return;
    }
    if (termsPath && !termsAccepted) {
      toast.error("יש לאשר את התקנון לפני התשלום.");
      return;
    }

    setWalletLoading(true);

    try {
      // Step 1: Ensure script is loaded
      await preloadGrowSDKScript();
      if (!window.growPayment) throw new Error("Grow SDK not available after script load");

      // Step 2: Always call init() fresh — it's idempotent and ensures runtime is started
      await window.growPayment.init({
        environment: GROW_ENV,
        version: GROW_VERSION,
        events: {
          onSuccess: (r: any) => {
            setWalletLoading(false);
            callbacksRef.current.onSuccess?.(r);
          },
          onFailure: (r: any) => {
            setWalletLoading(false);
            toast.error("התשלום נכשל. אנא נסי שוב.");
            // Extract meaningful error message from SDK response
            const errMsg = typeof r === "string" ? r
              : r?.message ? `${r.message}${r.status !== undefined ? ` (קוד: ${r.status})` : ""}`
              : JSON.stringify(r)?.slice(0, 200);
            reportFailureMutation.mutate({
              customerName: name.trim(),
              customerEmail: email.trim(),
              customerPhone: phone.trim() || undefined,
              product,
              errorMessage: errMsg,
              stage: "sdk_failure",
              processToken: lastProcessTokenRef.current || undefined,
            });
            callbacksRef.current.onFailure?.(r);
          },
          onCancel: () => {
            setWalletLoading(false);
          },
          onClose: () => {
            // User closed the payment overlay — reset loading so they can try again
            setWalletLoading(false);
          },
          onError: (e: any) => {
            console.error("[GrowWallet] SDK error:", e);
            setWalletLoading(false);
            toast.error("שגיאה בטעינת מערכת התשלום. אנא נסי שוב.");
            const errMsg = typeof e === "string" ? e
              : e?.message ? `${e.message}${e.status !== undefined ? ` (קוד: ${e.status})` : ""}`
              : JSON.stringify(e)?.slice(0, 200);
            reportFailureMutation.mutate({
              customerName: name.trim(),
              customerEmail: email.trim(),
              customerPhone: phone.trim() || undefined,
              product,
              errorMessage: errMsg,
              stage: "sdk_failure",
              processToken: lastProcessTokenRef.current || undefined,
            });
          },
        },
      });

      // Step 3: Wait for runtime to be fully ready
      await waitForGrowRuntime(12000);

      // Step 4: Create payment process via server-side tRPC (secure, no CORS issues)
      // Calculate discounted price if coupon is applied
      const basePrice = PRODUCT_CONFIGS[product]?.sum ?? 0;
      let finalPrice: number | undefined = undefined;
      if (couponApplied) {
        if (couponApplied.fixedPrice) {
          finalPrice = couponApplied.fixedPrice;
        } else if (couponApplied.discountAmount) {
          finalPrice = Math.max(1, basePrice - couponApplied.discountAmount);
        } else if (couponApplied.discountPercent) {
          finalPrice = Math.max(1, Math.round(basePrice * (1 - couponApplied.discountPercent / 100)));
        }
      }
      // Collect UTM data from sessionStorage or localStorage
      const utmSource = sessionStorage.getItem('utm_source') || localStorage.getItem('utm_source') || undefined;
      const utmMedium = sessionStorage.getItem('utm_medium') || localStorage.getItem('utm_medium') || undefined;
      const utmCampaign = sessionStorage.getItem('utm_campaign') || localStorage.getItem('utm_campaign') || undefined;
      const utmContent = sessionStorage.getItem('utm_content') || localStorage.getItem('utm_content') || undefined;

      // Extract GA4 client_id from _ga cookie (format: GA1.1.XXXXXXXX.XXXXXXXXXX)
      // The client_id is the last two dot-separated segments: "XXXXXXXX.XXXXXXXXXX"
      let ga4ClientId: string | undefined;
      try {
        const gaCookie = document.cookie.split('; ').find(row => row.startsWith('_ga='));
        if (gaCookie) {
          const gaValue = gaCookie.split('=')[1]; // e.g. "GA1.1.123456789.1234567890"
          const parts = gaValue.split('.');
          if (parts.length >= 4) {
            ga4ClientId = parts.slice(2).join('.'); // "123456789.1234567890"
          }
        }
      } catch {
        // Ignore cookie read errors
      }
      // Extract GA4 session_id from _ga_ZH1CYQCTMN cookie (format: GS1.1.SESSION_ID.1.1...)
      // session_id (index 2) is required for campaign_details UTM attribution in GA4 reports
      let ga4SessionId: string | undefined;
      try {
        const sessionCookie = document.cookie.split('; ').find(row => row.startsWith('_ga_ZH1CYQCTMN='));
        if (sessionCookie) {
          const sessionValue = sessionCookie.split('=')[1]; // e.g. "GS1.1.1704773506.16.1..."
          const parts = sessionValue.split('.');
          if (parts.length >= 3 && parts[2]) {
            ga4SessionId = parts[2]; // The session_id integer as string
          }
        }
      } catch {
        // Ignore cookie read errors
      }

      // Save lead for cart abandonment tracking (non-blocking)
      try {
        await saveLeadMutation.mutateAsync({ name: fullName, email: userEmail, phone: userPhone || "", product });
      } catch { /* non-blocking */ }

      const result = await createProcessMutation.mutateAsync({
        product: product as "database" | "guide" | "course" | "coaching" | "coaching_mas" | "session",
        fullName,
        email: userEmail,
        phone: userPhone || undefined,
        couponCode: couponApplied?.code || undefined,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        ga4ClientId,
      });

      // Save processToken for failure reporting (if SDK payment fails later)
      lastProcessTokenRef.current = result.processToken || null;

      // Step 5: Render wallet (opens the payment overlay)
      window.growPayment!.renderPaymentOptions(result.authCode);

    } catch (err: any) {
      console.error("[GrowWallet] Payment init failed:", err);
      setWalletLoading(false);
      toast.error(`שגיאה ביצירת תהליך תשלום: ${err?.message || "נסי שוב בעוד מספר שניות."}`);
      reportFailureMutation.mutate({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        product,
        errorMessage: err?.message?.slice(0, 200) || "Unknown error",
        stage: "createProcess",
      });
    }
  }, [name, email, phone, product, termsPath, termsAccepted]);

  const hasAllDetails = prefillName && prefillEmail;

  return (
    <div className="grow-wallet-container bg-white rounded-2xl p-6 shadow-lg" dir="rtl" style={{ color: '#191265' }}>
      {!hasAllDetails && (
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <Label htmlFor={`gw-name-${instanceId}`} className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
              שם מלא
            </Label>
            <Input
              id={`gw-name-${instanceId}`}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="שם פרטי ושם משפחה"
              style={{ color: '#1a1a1a', backgroundColor: 'white' }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label htmlFor={`gw-email-${instanceId}`} className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
              אימייל
            </Label>
            <Input
              id={`gw-email-${instanceId}`}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ color: '#1a1a1a', backgroundColor: 'white' }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label htmlFor={`gw-phone-${instanceId}`} className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
              טלפון <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`gw-phone-${instanceId}`}
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="050-0000000"
              style={{ color: '#1a1a1a', backgroundColor: 'white' }}
              className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
            />
          </div>
        </div>
      )}

      {/* Coupon field */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[#727272] mb-1.5">יש לך קוד קופון?</p>
        {couponApplied ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded-xl px-4 py-2.5">
            <span className="text-green-700 text-sm font-bold">
              ✓ קופון "{couponApplied.code}" הוחל
              {couponApplied.discountPercent ? ` — ${couponApplied.discountPercent}% הנחה` : ""}
              {couponApplied.discountAmount ? ` — ₪${couponApplied.discountAmount} הנחה` : ""}
            </span>
            <button onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors mr-2">✕</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="text"
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
              placeholder="הכנס קוד קופון"
              className="text-right text-sm"
              style={{ color: '#1a1a1a', backgroundColor: 'white' }}
              onKeyDown={e => { if (e.key === 'Enter') handleApplyCoupon(); }}
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || couponLoading}
              className="shrink-0 bg-[#191265] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1800ad] transition-colors disabled:opacity-50"
            >
              {couponLoading ? "..." : "החל"}
            </button>
          </div>
        )}
        {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
      </div>

      {/* Age confirmation */}
      <div className="flex items-start gap-2 mb-2">
        <Checkbox id={`gw-age-${instanceId}`} checked={ageConfirmed} onCheckedChange={(v) => setAgeConfirmed(!!v)} className="mt-0.5 shrink-0" />
        <label htmlFor={`gw-age-${instanceId}`} className="text-sm cursor-pointer leading-snug" style={{ color: '#191265' }}>
          אני מאשר/ת שאני בן/בת 18 ומעלה
        </label>
      </div>

      {termsPath && (
        <div className="flex items-start gap-2 mb-3">
          <Checkbox
            id={`gw-terms-${instanceId}`}
            checked={termsAccepted}
            onCheckedChange={(v) => setTermsAccepted(!!v)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor={`gw-terms-${instanceId}`} className="text-sm cursor-pointer leading-snug" style={{ color: '#191265' }}>
            קראתי ואני מסכים/ה ל<a
              href={termsPath}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80 mx-1"
              onClick={(e) => e.stopPropagation()}
            >
              תקנון ומדיניות ביטול
            </a>
          </label>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={walletLoading || !ageConfirmed || (!!termsPath && !termsAccepted)}
        className={`w-full flex items-center justify-center gap-2 bg-[#ffe27c] text-[#191265] font-bold text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${buttonClassName}`}
      >
        {walletLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>מעבד...</span>
          </>
        ) : (
          <span>{buttonLabel}</span>
        )}
      </button>

      <div className="flex justify-center items-center gap-4 mt-3 text-xs opacity-70" style={{ color: '#191265' }}>
        <span>🔒 תשלום מאובטח</span>
        <span>⚡ גישה מיידית</span>
        <span>✓ תוכן מעשי וישים</span>
      </div>
      <p className="text-center text-xs mt-1 opacity-60" style={{ color: '#191265' }}>
        תשלום מאובטח באמצעות Grow Payments
      </p>
    </div>
  );
}
