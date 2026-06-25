/**
 * ThankYouCoaching - עמוד תודה לאחר רכישת חבילת ליווי אישי (8 פגישות ₪2,900)
 * מוצג לאחר תשלום מוצלח דרך Grow/Meshulam
 * Route: /thank-you/coaching
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useEffect } from "react";
import { trackPurchase } from "@/lib/metaPixel";
import { gaPurchase } from "@/lib/ga";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית! רכשתי חבילת ליווי אישי 8 פגישות באתר ואשמח לעזרה 🙏");
const INSTAGRAM_URL = "https://www.instagram.com/hilitcaspi_relationship";

export default function ThankYouCoaching() {
  useEffect(() => {
    trackPurchase({ value: 2900, currency: "ILS", content_name: "ליווי אישי 8 פגישות" });
    gaPurchase("coaching");
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik flex flex-col items-center justify-center px-6 py-16" dir="rtl">
      {/* Background texture */}
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

        {/* Main message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4 leading-tight">
            ברוכים הבאים לתהליך
          </h1>
          <p className="text-[#727272] text-lg leading-relaxed mb-8">
            תודה על האמון. קיבלתי את הרכישה שלך ואני שמח/ה לקבל אותך.
            <br />
            <br />
            ניצור קשר ביום העסקים הבא כדי לקבוע את הפגישה הראשונה שלנו.
            בינתיים - ישלח אלייך מייל עם פרטים נוספים ועם הסבר על הכניסה החינמית למאגר הרווקים.
            <br />
            <br />
            <span className="text-[#191265] font-bold">הילית</span>
          </p>
        </motion.div>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-8 text-right"
        >
          <h2 className="text-[#191265] font-black text-xl mb-4">מה קורה עכשיו?</h2>
          <div className="space-y-4">
            {[
              { num: "1", text: "מייל אישור + קישור למאגר הרווקים נשלח אלייך" },
              { num: "2", text: "הילית תצור קשר ביום העסקים הבא לקביעת הפגישה הראשונה" },
              { num: "3", text: "פגישות של עבודה אמיתית, עמוקה, ומשנה חיים" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#ffe27c] rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#191265] text-sm">
                  {step.num}
                </div>
                <p className="text-[#727272] leading-relaxed pt-1">{step.text}</p>
              </div>
            ))}
          </div>

          {/* Database bonus */}
          <div className="mt-6 bg-[#191265]/5 border border-[#191265]/20 rounded-xl px-4 py-4 text-right">
            <p className="text-[#191265] font-bold text-sm mb-1">הבונוס שלך</p>
            <p className="text-[#727272] text-xs leading-relaxed">
              כחלק מחבילת הליווי, תקבלי גישה חינמית למאגר הרווקים הבלעדי (שווי ₪499). הקישור יישלח למייל.
            </p>
          </div>
        </motion.div>

        {/* Hilit personal note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="bg-[#191265] rounded-3xl p-6 mb-8 text-right"
        >
          <div className="flex items-center gap-4 mb-4">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg"
              alt="הילית כספי"
              className="w-14 h-14 rounded-full object-cover object-[center_20%] shadow-md flex-shrink-0"
            />
            <div>
              <p className="font-black text-white">הילית כספי</p>
              <p className="text-[#ffe27c] text-xs font-medium">Relationship Expert & Coach</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">
            קיבלתי את הרכישה שלך ואני כבר מחכה לפגישה הראשונה שלנו. אם יש שאלות בינתיים, אני זמינ/ה בוואטסאפ.
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1da851] text-white font-black px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 text-center text-sm"
          >
            💬 וואטסאפ - רכשתי ואשמח לעזרה
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 text-center text-sm"
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
            ← חזרה לעמוד הבית
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
