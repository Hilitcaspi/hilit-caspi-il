/**
 * ThankYouBundle - עמוד תודה לאחר רכישת חבילת טו באב (מאגר + מדריך)
 * After payment, the webhook sends two emails automatically:
 * 1. Email with /join?free_token=XXX link (for full registration: profile + DNA + questionnaire)
 * 2. Email with guide access link
 * This page simply tells the user to check their email.
 */

import { motion } from "framer-motion";
import { useEffect } from "react";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { gaPurchase } from "@/lib/ga";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, רכשתי את חבילת טו באב ואשמח לעזרה");

export default function ThankYouBundle() {
  useEffect(() => {
    trackPurchase({ value: 349, currency: "ILS", content_name: "חבילת טו באב - מאגר + מדריך" });
    track({ eventType: "purchase", page: "/thank-you/bundle", metadata: { product: "bundle_tubav", value: 349 } });
    gaPurchase("bundle_tubav");
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-['Rubik',sans-serif]" dir="rtl">
      {/* Hero */}
      <section className="bg-[#191265] pt-20 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #ff6b9d 0%, transparent 40%), radial-gradient(circle at 70% 30%, #ffe27c 0%, transparent 40%)" }} />

        <div className="relative z-10 max-w-xl mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="text-5xl mb-4">💜</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl md:text-4xl font-black text-white mb-3">
            התשלום עבר בהצלחה!
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
            className="text-white/80 text-lg">
            חבילת טו באב: מאגר + מדריך "לבחור נכון"
          </motion.p>
        </div>
      </section>

      {/* What happens now */}
      <section className="py-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Check email notice */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-[#191265] rounded-2xl p-6 mb-6 text-center">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-xl font-black text-white mb-3">בדקו את תיבת המייל שלכם</h2>
            <p className="text-white/80 text-base leading-relaxed">
              שלחנו לכם <strong className="text-[#ffe27c]">שני מיילים</strong> לכתובת שאיתה שילמתם:
            </p>
          </motion.div>

          {/* Two things you got */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-[#e9e8e8] mb-6">
            <h2 className="text-xl font-black text-[#191265] mb-4">מה קיבלתם:</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-[#191265] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-[#191265] font-bold">קישור לשאלון המדעי</p>
                  <p className="text-[#555] text-sm">לחצו על הקישור במייל, מלאו את השאלון ואני אתחיל לחפש לכם התאמות.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-[#ff6b9d] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-[#191265] font-bold">המדריך "לבחור נכון"</p>
                  <p className="text-[#555] text-sm">מייל נפרד עם קישור אישי למדריך. אפשר לפתוח אותו מיד מכל מכשיר.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-[#e9e8e8] mb-6">
            <h3 className="text-[#191265] font-bold text-base mb-3">💡 טיפ שלי:</h3>
            <p className="text-[#555] text-sm leading-relaxed">
              ממליצה לפתוח את המדריך "לבחור נכון" <strong>לפני</strong> שממלאים את השאלון. הוא יעזור לכם להבין מה באמת חשוב לכם, ולמלא את השאלון בצורה מדויקת יותר. ככל שהשאלון מדויק יותר, ההתאמות שלי טובות יותר.
            </p>
          </motion.div>

          {/* Spam notice */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }}
            className="bg-[#fff8e1] rounded-2xl p-5 border border-[#ffe27c]/40 mb-6">
            <p className="text-[#191265] text-sm leading-relaxed text-center">
              <strong>לא מצאתם?</strong> בדקו בתיקיית הספאם או בקידומי מכירות. המייל מגיע תוך דקה מרגע התשלום.
            </p>
          </motion.div>

          {/* Support */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}
            className="text-center">
            <p className="text-[#888] text-sm mb-3">עדיין לא קיבלתם? כתבו לי ואעזור:</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1da851] transition-all text-sm">
              📱 וואטסאפ עם הילית
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
