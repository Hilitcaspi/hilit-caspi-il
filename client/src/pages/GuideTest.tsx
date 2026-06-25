/**
 * GuideTest — דף ניסיון לתשלום מדריך דרך Cloudflare Worker proxy
 * Route: /guide-test
 * 
 * דף זה בלבד משתמש ב-GrowWallet (inline wallet) דרך ה-Worker.
 * שאר האתר ממשיך לעבוד עם pay.grow.link ישיר.
 * 
 * לאחר אישור — נחליף את כל הדפים.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── Config ──────────────────────────────────────────────────────────────────
// PROXY_URL: כתובת ה-Cloudflare Worker שלנו (יש לעדכן לאחר הפריסה)
// כרגע ריק — יש להזין לאחר פריסת ה-Worker
const PROXY_URL = import.meta.env.VITE_GROW_PROXY_URL || "";

const GROW_ENV = "DEV" as string; // "DEV" for sandbox, "PRODUCTION" for live
const GROW_VERSION = 1;
const GROW_USER_ID = import.meta.env.VITE_GROW_USER_ID || "10be6655a4711b2a";
const GUIDE_PAGE_CODE = import.meta.env.VITE_GROW_PAGE_CODE_GUIDE || "d9ee228fd53b";

const GROW_SDK_URL = "/grow-sdk/gs.min.js";

declare global {
  interface Window {
    growPayment?: {
      init: (config: any) => Promise<void>;
      renderPaymentOptions: (authCode: string) => void;
      updateEvents: (events: any) => void;
    };
  }
}

function loadGrowSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.growPayment) { resolve(); return; }
    const existing = document.querySelector('script[data-grow-sdk]');
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = GROW_SDK_URL;
    script.setAttribute("data-grow-sdk", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Grow SDK"));
    document.head.appendChild(script);
  });
}

async function createPaymentViaProxy(opts: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<{ authCode: string }> {
  if (!PROXY_URL) {
    throw new Error("VITE_GROW_PROXY_URL לא מוגדר — יש לפרוס את ה-Cloudflare Worker ולהזין את הכתובת");
  }

  const params = new URLSearchParams();
  params.append("pageCode", GUIDE_PAGE_CODE);
  params.append("userId", GROW_USER_ID);
  params.append("sum", "149");
  params.append("description", "מדריך לבחור נכון של הילית כספי");
  params.append("successUrl", `${window.location.origin}/thank-you/digital`);
  params.append("cancelUrl", window.location.origin);
  params.append("notifyUrl", `${window.location.origin}/api/grow/webhook`);
  params.append("paymentNum", "1");
  params.append("pageField[fullName]", opts.fullName);
  params.append("pageField[email]", opts.email);
  if (opts.phone) params.append("pageField[phone]", opts.phone);

  const res = await fetch(
    `${PROXY_URL}/api/light/server/1.0/createPaymentProcess`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker/Grow error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as any;
  console.log("[GuideTest] createPaymentProcess response:", JSON.stringify(json).slice(0, 300));

  if (!json.status || !json.data?.authCode) {
    throw new Error(`Grow API returned failure: ${JSON.stringify(json)}`);
  }

  return { authCode: json.data.authCode };
}

export default function GuideTest() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const sdkInitialized = useRef(false);

  useEffect(() => {
    loadGrowSDK().catch(err => console.error("[GuideTest] SDK preload failed:", err));
  }, []);

  const handlePay = useCallback(async () => {
    const fullName = name.trim();
    const userEmail = email.trim();

    if (!fullName || fullName.split(" ").filter(Boolean).length < 2) {
      toast.error("שם מלא נדרש — יש להזין שם פרטי ושם משפחה.");
      return;
    }
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error("אימייל לא תקין.");
      return;
    }
    if (!termsAccepted) {
      toast.error("יש לאשר את התקנון לפני התשלום.");
      return;
    }

    setLoading(true);
    try {
      const { authCode } = await createPaymentViaProxy({
        fullName,
        email: userEmail,
        phone: phone.trim() || undefined,
      });

      await loadGrowSDK();
      if (!window.growPayment) throw new Error("Grow SDK not available");

      if (!sdkInitialized.current) {
        await window.growPayment.init({
          environment: GROW_ENV,
          version: GROW_VERSION,
          events: {
            onSuccess: () => {
              setLoading(false);
              navigate("/thank-you/digital");
            },
            onFailure: () => {
              setLoading(false);
              toast.error("התשלום נכשל. אנא נסי שוב.");
            },
            onCancel: () => setLoading(false),
            onError: (err: any) => {
              setLoading(false);
              toast.error("שגיאה בטעינת מערכת התשלום.");
              console.error("[GuideTest] SDK error:", err);
            },
          },
        });
        sdkInitialized.current = true;
      }

      window.growPayment.renderPaymentOptions(authCode);
    } catch (err: any) {
      setLoading(false);
      toast.error(`שגיאה: ${err?.message || "נסי שוב"}`);
      console.error("[GuideTest] Error:", err);
    }
  }, [name, email, phone, termsAccepted, navigate]);

  const proxyConfigured = !!PROXY_URL;

  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📖</div>
          <h1 className="text-2xl font-black text-[#191265]">מדריך לבחור נכון</h1>
          <p className="text-[#727272] text-sm mt-1">דף ניסיון — Cloudflare Worker Proxy</p>
          <div className={`mt-2 text-xs px-3 py-1 rounded-full inline-block font-semibold ${proxyConfigured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {proxyConfigured ? `Worker: ${PROXY_URL}` : "Worker לא מוגדר — יש להזין VITE_GROW_PROXY_URL"}
          </div>
          <div className="mt-3 bg-[#ffe27c]/30 rounded-xl p-3">
            <span className="text-[#191265] font-black text-3xl">₪149</span>
            <span className="text-[#727272] text-sm mr-2 line-through">₪249</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <Label htmlFor="gt-name" className="text-sm font-medium mb-1 block text-[#191265]">שם מלא</Label>
            <Input
              id="gt-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="שם פרטי ושם משפחה"
              className="text-right border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label htmlFor="gt-email" className="text-sm font-medium mb-1 block text-[#191265]">אימייל</Label>
            <Input
              id="gt-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="text-right border-gray-300 focus:border-[#191265]"
            />
          </div>
          <div>
            <Label htmlFor="gt-phone" className="text-sm font-medium mb-1 block text-[#191265]">טלפון (אופציונלי)</Label>
            <Input
              id="gt-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="050-0000000"
              className="text-right border-gray-300 focus:border-[#191265]"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <Checkbox
            id="gt-terms"
            checked={termsAccepted}
            onCheckedChange={v => setTermsAccepted(!!v)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="gt-terms" className="text-sm cursor-pointer leading-snug text-[#191265]">
            קראתי ואני מסכים/ה ל<a href="/terms/guide" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:opacity-80 mx-1">תקנון ומדיניות ביטול</a>
          </label>
        </div>

        <button
          onClick={handlePay}
          disabled={loading || !termsAccepted || !proxyConfigured}
          className="w-full flex items-center justify-center gap-2 bg-[#ffe27c] text-[#191265] font-bold text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>מעבד...</span></>
          ) : (
            <span>לרכישה המאובטחת ₪149 ←</span>
          )}
        </button>

        <div className="flex justify-center items-center gap-4 mt-3 text-xs text-[#191265] opacity-70">
          <span>🔒 תשלום מאובטח</span>
          <span>⚡ גישה מיידית</span>
          <span>✓ תוכן מעשי וישים</span>
        </div>
        <p className="text-center text-xs mt-1 text-[#191265] opacity-60">תשלום מאובטח באמצעות Grow Payments</p>
      </div>
    </div>
  );
}
