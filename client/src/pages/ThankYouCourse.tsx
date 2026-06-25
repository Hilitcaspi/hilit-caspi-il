/**
 * ThankYouCourse - דף תודה לאחר רכישת הקורס הדיגיטלי ₪249
 * "המסע"
 * Grow שולח webhook עם פרטי הקונה לשרת → השרת שולח את הקורס אוטומטית.
 * הדף הזה מציג אישור ומסביר שהגישה נשלחה למייל שהוזן בתשלום.
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { trackPurchase } from "@/lib/metaPixel";
import { gaPurchase } from "@/lib/ga";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent('היי הילית! רכשתי את הקורס "המסע" באתר ואשמח לעזרה');

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function ThankYouCourse() {
  useEffect(() => {
    trackPurchase({ value: 249, currency: "ILS", content_name: "קורס המסע" });
    gaPurchase("course");
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Hero */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-2xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-6xl mb-4">🎉</motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
            ברוכים הבאים לקורס!
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#ffe27c] text-xl font-bold mb-2">
            המסע מהפחד לבחירה
          </motion.p>
          <motion.p variants={fadeUp} className="text-white/70 text-base">
            הרכישה הושלמה בהצלחה. הגישה נשלחה למייל שהזנת בתשלום.
          </motion.p>
        </motion.div>
      </section>

      <div className="max-w-lg mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="space-y-6 text-right"
        >
          {/* Course access confirmation */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border-2 border-[#191265]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#191265] text-white rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">1</div>
              <h2 className="text-xl font-black text-[#191265]">גישה לקורס</h2>
            </div>
            <p className="text-[#727272] text-base leading-relaxed mb-4">
              שלחנו לך מייל עם קישור גישה מלאה לכל תכני הקורס. בדקו את תיבת הדואר הנכנס, ואם לא מצאתם גם את תיקיית הספאם.
            </p>
            <div className="bg-[#f0eadc] rounded-2xl p-4 text-sm text-[#191265]/80">
              <strong>הקורס כולל:</strong> 5 מודולים + מפה זוגית אישית בסוף + תרגילים מעשיים לכל שלב
            </div>
          </div>

          {/* Bonus guide */}
          <div className="bg-[#ffe27c] rounded-3xl p-8 border-2 border-[#191265]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#191265] text-white rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">2</div>
              <div>
                <h2 className="text-xl font-black text-[#191265]">הבונוס שלך - המדריך הדיגיטלי</h2>
              </div>
            </div>
            <p className="text-[#191265]/80 text-base leading-relaxed mb-2">
              מגיע לך גם המדריך <strong>"לבחור נכון"</strong> ללא תשלום נוסף.
            </p>
            <p className="text-[#191265]/60 text-sm mb-3">
              קישור למדריך נשלח אליך יחד עם הקורס במייל.
            </p>
          </div>

          {/* WhatsApp */}
          <div className="bg-[#191265] rounded-3xl p-8 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-xl font-black text-white mb-2">יש שאלות?</h3>
            <p className="text-white/70 text-base mb-5">
              אני כאן. שלחו הודעה בוואטסאפ ואחזור אליכם בהקדם.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#ffe27c] text-[#191265] font-black text-base px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300"
            >
              וואטסאפ עם הילית
            </a>
          </div>

          {/* Back home */}
          <div className="text-center pb-8">
            <Link href="/">
              <span className="text-[#727272] text-sm hover:text-[#191265] transition-colors cursor-pointer">
                חזרה לדף הבית
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
