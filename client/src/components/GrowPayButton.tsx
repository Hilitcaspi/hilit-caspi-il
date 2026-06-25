/**
 * GrowPayButton — כפתור תשלום ישיר לדפי Grow החיצוניים
 * כולל: שם, מייל, טלפון (חובה), אישור תקנון, שדה קופון, אישור גיל 18+
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Grow payment links ───────────────────────────────────────────────────────
const GROW_LINKS: Record<string, string> = {
  database:     "https://pay.grow.link/60e9eca1047ef4a2d619c1ed0bca68a2-MzI2MDI4OQ",
  guide:        "https://pay.grow.link/0810b574ab63e234ec29be0689a54aa7-MzI2MDM0OA",
  course:       "https://pay.grow.link/0428cfc2217c8ce98a6897cc1629416f-MzI2MjUxMQ",
  coaching:     "https://pay.grow.link/7e95519ddda0960adcffa9674ae563a5-MzI2MjUxOQ",
  coaching_mas: "https://pay.grow.link/OTkwNzQ~aa488db43ae3e0e652165d4a938bb90e-MzU2MTgzNQ",
  session:      "https://pay.grow.link/2aed60f53da69fa3144a3cc35554f915-MzI3MDgyOQ",
};

interface GrowPayButtonProps {
  product: "database" | "guide" | "course" | "coaching" | "coaching_mas" | "session";
  buttonLabel?: string;
  buttonClassName?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (response: any) => void;
  termsPath?: string;
  showCoupon?: boolean;
}

export default function GrowPayButton({
  product,
  buttonLabel = "לרכישה",
  buttonClassName = "",
  prefillName = "",
  prefillEmail = "",
  prefillPhone = "",
  termsPath,
  showCoupon = true,
}: GrowPayButtonProps) {
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState(prefillPhone);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discountPercent?: number;
    discountAmount?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const validateCouponMutation = trpc.coupons.validate.useMutation();
  const saveLeadMutation = trpc.coupons.saveLead.useMutation();

  const payUrl = GROW_LINKS[product];

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: couponCode.trim(),
        product,
      });
      if (result.valid) {
        setCouponApplied({
          code: result.code,
          discountPercent: result.discountPercent,
          discountAmount: result.discountAmount,
        });
        const label = result.discountPercent
          ? `${result.discountPercent}% הנחה`
          : result.discountAmount
          ? `₪${result.discountAmount} הנחה`
          : "הנחה";
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

  const handleClick = async () => {
    // Validate required fields
    const fullName = name.trim();
    const userEmail = email.trim();
    const userPhone = phone.trim();

    if (!fullName || fullName.split(" ").filter(Boolean).length < 2) {
      toast.error("יש להזין שם פרטי ושם משפחה.");
      return;
    }
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error("יש להזין כתובת מייל תקינה.");
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

    // Save lead to DB for tracking
    try {
      await saveLeadMutation.mutateAsync({ name: fullName, email: userEmail, phone: userPhone, product });
    } catch {
      // Non-blocking — don't prevent payment if lead save fails
    }

    // Build pay URL with pre-fill params
    let url = payUrl;
    const params = new URLSearchParams();
    params.set("pageField[fullName]", fullName);
    params.set("pageField[email]", userEmail);
    params.set("pageField[phone]", userPhone);
    if (couponApplied) params.set("coupon", couponApplied.code);
    url += (url.includes("?") ? "&" : "?") + params.toString();

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isReady = (!termsPath || termsAccepted) && ageConfirmed;

  return (
    <div className="grow-wallet-container bg-white rounded-2xl p-6 shadow-lg" dir="rtl" style={{ color: '#191265' }}>

      {/* Name / Email / Phone fields */}
      <div className="space-y-3 mb-4">
        <div>
          <Label htmlFor="gpb-name" className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
            שם מלא <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gpb-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="שם פרטי ושם משפחה"
            style={{ color: '#1a1a1a', backgroundColor: 'white' }}
            className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
          />
        </div>
        <div>
          <Label htmlFor="gpb-email" className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
            אימייל <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gpb-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ color: '#1a1a1a', backgroundColor: 'white' }}
            className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
          />
        </div>
        <div>
          <Label htmlFor="gpb-phone" className="text-sm font-medium mb-1 block" style={{ color: '#191265' }}>
            טלפון <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gpb-phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="050-0000000"
            style={{ color: '#1a1a1a', backgroundColor: 'white' }}
            className="text-right placeholder:text-gray-400 border-gray-300 focus:border-[#191265]"
          />
        </div>
      </div>

      {/* Coupon field */}
      {showCoupon && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#727272] mb-1.5">יש לך קוד קופון?</p>
          {couponApplied ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded-xl px-4 py-2.5">
              <span className="text-green-700 text-sm font-bold">
                ✓ קופון "{couponApplied.code}" הוחל
                {couponApplied.discountPercent ? ` — ${couponApplied.discountPercent}% הנחה` : ""}
                {couponApplied.discountAmount ? ` — ₪${couponApplied.discountAmount} הנחה` : ""}
              </span>
              <button
                onClick={() => { setCouponApplied(null); setCouponCode(""); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors mr-2"
              >✕</button>
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
      )}

      {/* Age confirmation */}
      <div className="flex items-start gap-2 mb-2">
        <Checkbox
          id="gpb-age"
          checked={ageConfirmed}
          onCheckedChange={(v) => setAgeConfirmed(!!v)}
          className="mt-0.5 shrink-0"
        />
        <label htmlFor="gpb-age" className="text-sm cursor-pointer leading-snug" style={{ color: '#191265' }}>
          אני מאשר/ת שאני בן/בת 18 ומעלה
        </label>
      </div>

      {/* Terms checkbox */}
      {termsPath && (
        <div className="flex items-start gap-2 mb-3">
          <Checkbox
            id="gpb-terms"
            checked={termsAccepted}
            onCheckedChange={(v) => setTermsAccepted(!!v)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="gpb-terms" className="text-sm cursor-pointer leading-snug" style={{ color: '#191265' }}>
            קראתי ואני מסכים/ה ל
            <a
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

      {/* Pay button */}
      <button
        onClick={handleClick}
        disabled={!isReady}
        className={`w-full flex items-center justify-center gap-2 bg-[#ffe27c] text-[#191265] font-bold text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 ${buttonClassName}`}
      >
        <span>{buttonLabel}</span>
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
