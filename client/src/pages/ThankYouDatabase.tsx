/**
 * ThankYouDatabase - עמוד תודה לאחר הצטרפות למאגר הרווקים
 * המעבר לעמוד אינו אישור תשלום; קישור אישי מתקבל רק לאחר אימות בשרת.
 * מבקש הזנת מייל ידנית ומפנה לשאלון המדעי לאחר האימות.
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import DatabaseExpectations from "@/components/DatabaseExpectations";
import { readPurchaseTrackingToken } from "@/lib/purchaseTracking";
import LiveVoucherCard from "@/components/LiveVoucherCard";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, שילמתי כניסה למאגר הרווקים באתר ואשמח לעזרה");
const INSTAGRAM_URL = "https://www.instagram.com/hilitcaspi_relationship";

export default function ThankYouDatabase() {
  const isLiveOffer = new URLSearchParams(window.location.search).get("offer") === "live";
  // Analytics may clear global storage while this page is waiting for the webhook.
  // Keep this exact proof for this page's lifetime; never switch to another purchase.
  const [trackingToken] = useState(() => readPurchaseTrackingToken());
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const checking = useRef(false);
  const retryWait = useRef<{ timer: ReturnType<typeof setTimeout>; cancel: () => void } | null>(null);
  const requestPersonalLink = trpc.singles.sendDashboardLink.useMutation();
  const getLinkMutation = trpc.singles.getQuestionnaireLink.useMutation();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      checking.current = false;
      retryWait.current?.cancel();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard stale/double clicks before the disabled state has rendered.
    if (checking.current || isRetrying || getLinkMutation.isPending || requestPersonalLink.isPending) return;
    const submittedEmail = email.trim().toLowerCase();
    if (!submittedEmail) return;
    checking.current = true;
    const id = ++requestId.current;
    const isCurrent = () => mounted.current && requestId.current === id;
    const request = { email: submittedEmail, origin: window.location.origin };
    setErrorMsg("");
    setRetryCount(0);
    setIsRetrying(true);
    try {
      if (!trackingToken) {
        // No proof: request the existing private email flow, never grant access here.
        await requestPersonalLink.mutateAsync(request);
        if (isCurrent()) setErrorMsg("הבקשה התקבלה. אם המייל רשום במאגר, אפשר לבדוק בו קישור אישי לאזור שלך.");
        return;
      }
      const verifiedRequest = { ...request, trackingToken };
      for (let retry = 0; retry <= 4 && isCurrent(); retry += 1) {
        const data = await getLinkMutation.mutateAsync(verifiedRequest);
        if (!isCurrent()) return;
        if (data.success && data.url) {
          window.location.href = data.url;
          return;
        }
        if (data.success && "alreadyCompleted" in data && data.alreadyCompleted) {
          setErrorMsg("השאלון כבר הושלם! ניתן להיכנס לאזור האישי.");
          return;
        }
        if (!("notFound" in data && data.notFound)) {
          setErrorMsg("לא הצלחנו לאמת את הגישה כרגע. אפשר לכתוב לנו בוואטסאפ.");
          return;
        }
        if (retry === 4) {
          setErrorMsg("עדיין לא נמצא אישור תשלום עבור המייל הזה. אין לשלם שוב לפני בדיקה. אפשר לבדוק שוב בעוד דקה, או לכתוב לנו בוואטסאפ.");
          return;
        }
        setRetryCount(retry + 1);
        const continueRetry = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => { retryWait.current = null; resolve(true); }, (retry + 1) * 3000);
          retryWait.current = { timer, cancel: () => { clearTimeout(timer); retryWait.current = null; resolve(false); } };
        });
        if (!continueRetry) return;
      }
    } catch {
      if (isCurrent()) setErrorMsg("לא הצלחנו לבדוק את הבקשה כרגע. אין לשלם שוב לפני בדיקה. אפשר לכתוב לנו בוואטסאפ.");
    } finally {
      if (isCurrent()) {
        checking.current = false;
        setIsRetrying(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik flex flex-col items-center justify-center px-6 py-16" dir="rtl">
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #191265 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center">
        {isLiveOffer && <div className="mb-8"><LiveVoucherCard receiptOnly showPending /></div>}
        {/* Neutral status icon: visiting this URL is not proof of payment. */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-[#191265] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
        >
          <span className="text-4xl text-[#ffe27c] font-black">?</span>
        </motion.div>

        {/* Main message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4 leading-tight">
            בדיקת התשלום והמשך הרישום
          </h1>
          <p className="text-[#727272] text-lg leading-relaxed mb-6">
            ההגעה לעמוד הזה אינה אישור תשלום. הגישה לשאלון נפתחת רק לאחר אימות במערכת. אם כבר ניסית לשלם, אין לשלם שוב לפני בדיקה.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.6 }}
          className="mb-6"
        >
          <DatabaseExpectations compact showStats={false} />
        </motion.div>

        {/* Direct questionnaire CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="bg-[#191265] rounded-3xl p-6 shadow-xl mb-6 text-right"
        >
          <div className="text-center mb-5">
            <span className="text-3xl">🧬</span>
            <h2 className="text-[#ffe27c] font-black text-xl mt-2">המשך לשאלון לאחר אימות</h2>
            <p className="text-white text-sm mt-2 leading-relaxed">
              מלאו את השאלון המדעי (15 דקות). הוא מאפשר להתאים בדיוק את בן/בת הזוג הנכון/ה, על בסיס מחקר מדעי.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-white font-bold text-sm text-right">
                הכניסי את המייל שאיתו נרשמת למאגר:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                placeholder="example@gmail.com"
                required
                disabled={getLinkMutation.isPending || requestPersonalLink.isPending || isRetrying}
                className="px-4 py-3 rounded-xl text-right text-[#191265] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#ffe27c] disabled:opacity-60 placeholder-gray-400"
              />
            </div>

            {isRetrying && retryCount > 0 && (
              <p role="status" className="text-[#ffe27c]/80 text-sm text-center animate-pulse">בודקים את אישור התשלום... (בדיקה חוזרת {retryCount}/4)</p>
            )}
            {errorMsg && (
              <p role="status" className="text-[#ffe27c] text-sm text-center leading-relaxed">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={getLinkMutation.isPending || requestPersonalLink.isPending || isRetrying}
              className="bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {(getLinkMutation.isPending || requestPersonalLink.isPending || isRetrying) ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-5 h-5 border-3 border-[#191265] border-t-transparent rounded-full animate-spin" />
                  בודקים את הבקשה, אנא המתינו...
                </span>
              ) : (
                trackingToken ? "בדיקת גישה לשאלון המדעי ←" : "בקשת קישור אישי במייל ←"
              )}
            </button>

            <p className="text-white/50 text-xs text-center">
              אם קיבלתם קישור אישי במייל, אפשר להשתמש בו מאוחר יותר.
            </p>
          </form>
        </motion.div>

        {/* 2-Part Flow Progress */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="bg-[#ffe27c] rounded-3xl p-5 shadow-lg mb-6 text-right"
        >
          <p className="text-[#191265] font-black text-base mb-4 text-center">📋 התקדמות הרישום שלך</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/50 rounded-2xl p-3">
              <div className="w-8 h-8 rounded-full bg-[#191265] text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="text-[#191265] font-black text-sm">שלב 1: אבחון DNA ואימות תשלום</p>
                <p className="text-[#191265]/70 text-xs">סטטוס התשלום והשלמת האבחון לא אומתו בעמוד הזה</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-[#191265]/10 rounded-2xl p-3">
              <div className="w-8 h-8 rounded-full bg-[#191265] text-white text-sm font-black flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="text-[#191265] font-black text-sm">שלב 2: שאלון מדעי ואישיות</p>
                <p className="text-[#191265]/70 text-xs">השאלון לוקח כ-15 דקות ומאפשר התאמה מדויקת. מומלץ למלא בסביבה שקטה.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preparation tips */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-6 text-right"
        >
          <h2 className="text-[#191265] font-black text-xl mb-4">לפני שממלאים את השאלון</h2>
          <div className="space-y-4">
            {[
              { icon: "🕐", text: "מומלץ למלא במקום שקט ולהקדיש את הזמן. השאלון מפורט ומשפיע על ההתאמות." },
              { icon: "📸", text: "כדאי להכין תמונה עדכונית ואמיתית. פרופיל עם תמונה מקבל התאמות טובות יותר." },
              { icon: "💭", text: "כדאי לחשוב מה באמת חשוב בבן/בת הזוג, מעבר לדברים השטחיים." },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
                <p className="text-[#727272] leading-relaxed text-sm">{tip.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-8 text-right"
        >
          <h2 className="text-[#191265] font-black text-xl mb-4">מה קורה אחרי שממלאים?</h2>
          <div className="space-y-4">
            {[
              { num: "1", text: "הפרופיל שלך נכנס למאגר הבלעדי" },
              { num: "2", text: "הילית עוברת על הפרופיל אישית ומחפשת התאמה שמרגישה נכון" },
              { num: "3", text: "כשתימצא התאמה, תישלח הצעה לשניכם בנפרד, בלי לחשוף פרטים" },
              { num: "4", text: "רק אם שניכם תאשרו, הפרטים ייחשפו ותוכלו ליצור קשר" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#ffe27c] rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#191265] text-sm">
                  {step.num}
                </div>
                <p className="text-[#727272] leading-relaxed pt-1">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-[#727272] text-xs mt-4 text-center">הזמן להצעה ראשונה משתנה לפי ההתאמה ההדדית למאפיינים ולהעדפות של שני הצדדים.</p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1da851] text-white font-black px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 text-center"
          >
            💬 לא קיבלת מייל? כתבו לי
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 text-center"
          >
            לאינסטגרם שלי
          </a>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="mt-8"
        >
          <Link
            href="/"
            className="text-[#727272] hover:text-[#191265] transition-colors text-sm underline underline-offset-4"
          >
            חזרה לעמוד הבית
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
