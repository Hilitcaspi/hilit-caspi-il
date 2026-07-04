/**
 * ThankYouDigital - עמוד תודה לאחר רכישת מדריך ₪149 דרך Grow
 * Route: /thank-you/digital
 *
 * Flow:
 * 1. Grow redirects here after successful payment
 * 2. Webhook fires async → creates token in DB + sends email with guide link
 * 3. This page shows:
 *    a. If sessionStorage has token (set before redirect) → direct guide button
 *    b. Otherwise → "המדריך נשלח למייל שלך" + button to /guide/access
 *
 * NOTE: Email gate removed. The email was already sent by the webhook.
 * If user needs to re-access, they go to /guide/access and enter their purchase email.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { gaPurchase } from "@/lib/ga";

const WHATSAPP_URL =
  "https://wa.me/972552442334?text=" +
  encodeURIComponent('היי הילית! רכשתי את המדריך "לבחור נכון" באתר ואשמח לעזרה');

export default function ThankYouDigital() {
  const [guideToken, setGuideToken] = useState<string | null>(null);

  useEffect(() => {
    trackPurchase({ value: 149, currency: "ILS", content_name: "מדריך לבחור נכון" });
    track({ eventType: "purchase", page: "/thank-you/guide", metadata: { product: "guide", value: 149 } });
    gaPurchase("guide");
    const token = sessionStorage.getItem("guide_token");
    if (token) {
      setGuideToken(token);
    }
  }, []);

  const guideUrl = guideToken ? `/guide/view?token=${guideToken}` : null;

  return (
    <div
      className="min-h-screen bg-[#f0eadc] font-rubik flex flex-col items-center justify-center px-6 py-16"
      dir="rtl"
    >
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #191265 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-[#191265] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
        >
          <span className="text-4xl text-[#ffe27c] font-black">✓</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4 leading-tight">
            הרכישה הושלמה!
          </h1>
          <p className="text-[#727272] text-lg leading-relaxed mb-8">
            ברוכים הבאים למדריך{" "}
            <strong className="text-[#191265]">"לבחור נכון"</strong>.
            <br />
            עכשיו מתחיל החלק האמיתי.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-6 text-right"
        >
          {guideUrl ? (
            /* ── DIRECT ACCESS (token in sessionStorage) ── */
            <div className="text-center">
              <div className="text-5xl mb-3">📖</div>
              <h2 className="text-[#191265] font-black text-xl mb-3">
                המדריך מוכן לפתיחה
              </h2>
              <p className="text-[#727272] text-sm mb-5 leading-relaxed">
                המדריך הזה הוא חלק מתהליך. הוא לא נועד לקריאה חטופה אחת
                אלא לעבודה אמיתית לאורך כמה ימים. קחו את הזמן עם כל תרגיל,
                חשבו, ערערו על הנחות שנדמות מובנות מאליהן. התוצרים שיצאו
                ממנו שלכם לתמיד, ואם תגיעו לליווי נוכל לעבוד איתם יחד.
              </p>
              <a
                href={guideUrl}
                className="block w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl text-center hover:bg-[#ffd84a] transition-all shadow-lg"
              >
                פתיחת המדריך עכשיו
              </a>
              <p className="text-[#727272] text-xs mt-3 leading-relaxed">
                שלחנו לכם גם מייל עם הקישור לגישה מכל מכשיר בכל עת.
              </p>
            </div>
          ) : (
            /* ── NO TOKEN: email was sent by webhook ── */
            <div className="text-center">
              <div className="text-5xl mb-3">📬</div>
              <h2 className="text-[#191265] font-black text-xl mb-3">
                המדריך נשלח למייל שלך
              </h2>
              <p className="text-[#727272] text-sm leading-relaxed mb-5">
                שלחנו לכם מייל עם הקישור האישי למדריך.
                <br />
                בדקו גם את תיקיית הספאם אם לא הגיע תוך כמה דקות.
              </p>
              <a
                href="/guide/access"
                className="block w-full bg-[#ffe27c] text-[#191265] font-black text-base py-4 rounded-2xl text-center hover:bg-[#ffd84a] transition-all shadow-lg mb-3"
              >
                פתיחת המדריך עכשיו ←
              </a>
              <p className="text-[#727272] text-xs leading-relaxed">
                הזינו את המייל שבו רכשתם ותועברו ישירות למדריך.
              </p>
            </div>
          )}

          {/* ── COACHING CTA ── */}
          <div className="mt-6 bg-[#191265] rounded-2xl p-5 text-right">
            <p className="text-[#ffe27c] font-black text-base mb-2">
              המדריך הוא חלק מהתמונה
            </p>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              אני עובדת עם כלים שונים כדי להבין מי אתם ומה מתאים לכם. אם
              תרגישו שיש משהו שעוצר אתכם בדרך לזוגיות, אשמח לשבת יחד, לעבוד
              עם התוצרים שיצאו מהמדריך, ולהבין יחד מה הצעד הנכון.
            </p>
            <a
              href="/single-session"
              className="block w-full bg-[#ffe27c] text-[#191265] font-black text-base py-3 rounded-xl text-center hover:bg-white transition-all"
            >
              לפגישת היכרות עם הילית
            </a>
          </div>
        </motion.div>

        {/* WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1da851] text-white font-black px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 text-center text-sm"
          >
            💬 שאלות? אני כאן בוואטסאפ
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
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
