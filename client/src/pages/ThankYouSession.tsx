/**
 * ThankYouSession - עמוד תודה לאחר רכישת פגישה אישית חד-פעמית (₪500)
 * Route: /thank-you/session
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useEffect } from "react";
import { gaPurchase } from "@/lib/ga";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";

const HILIT_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg";
const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית! רכשתי פגישה אישית באתר ואשמח לעזרה בתיאום המועד.");
const WHATSAPP_GROUP = "https://hilitcaspi.com/api/wa/thankyou";
const DNA_QUIZ_URL = "/dna-quiz";
const GUIDE_URL    = "/guide";

export default function ThankYouSession() {
  useEffect(() => {
    gaPurchase("session");
    trackPurchase({ value: 500, currency: "ILS", content_name: "פגישת היכרות אישית" });
    track({ eventType: "purchase", page: "/thank-you/session", metadata: { product: "session", value: 500 } });
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
            הרכישה הושלמה בהצלחה!
          </h1>
          <p className="text-[#727272] text-lg leading-relaxed mb-8">
            כל הכבוד על הצעד הזה. ניצור קשר ביום העסקים הבא לתיאום מועד הפגישה.
          </p>
        </motion.div>

        {/* Steps card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="bg-white rounded-3xl p-8 shadow-lg mb-8 text-right"
        >
          <h2 className="text-[#191265] font-black text-xl mb-5">מה קורה עכשיו?</h2>
          <div className="space-y-4">
            {[
              { num: "1", text: "קיבלת אישור רכישה במייל." },
              { num: "2", text: "הילית תצור קשר ביום העסקים הבא לתיאום מועד הפגישה." },
              { num: "3", text: "לאחר הפגישה תופעל גישה מלאה למאגר הרווקים ורווקות הבלעדי." },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#ffe27c] rounded-full flex items-center justify-center flex-shrink-0 font-black text-[#191265] text-sm">
                  {step.num}
                </div>
                <p className="text-[#727272] leading-relaxed pt-1">{step.text}</p>
              </div>
            ))}
          </div>

          {/* Database info */}
          <div className="mt-6 bg-[#191265]/5 border border-[#191265]/20 rounded-xl px-4 py-4 text-right">
            <p className="text-[#191265] font-bold text-sm mb-2">מה זה מאגר הרווקים ורווקות?</p>
            <p className="text-[#727272] text-sm leading-relaxed">
              מאגר בלעדי של אנשים רווקים שעברו תהליך עם הילית. ההתאמות נעשות באופן אישי על ידי הילית בלבד, לפי גיל, מיקום, אופי, ושאלון ה-DNA הזוגי. לא אפליקציה, לא אלגוריתם. התאמה אמיתית.
            </p>
          </div>
        </motion.div>

        {/* DNA quiz CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="bg-[#ffe27c] rounded-3xl p-6 mb-6 text-right"
        >
          <p className="text-[#191265] font-black text-base mb-1">בינתיים, כדאי לעשות עכשיו:</p>
          <p className="text-[#191265]/80 text-sm leading-relaxed mb-4">
            מלאי את שאלון ה-DNA הזוגי. שאלון קצר שמגלה את הדפוס הזוגי שלך ועוזר לנו להגיע לפגישה ממוקדים יותר. ייקח כ-5 דקות.
          </p>
          <Link href={DNA_QUIZ_URL}>
            <span className="inline-block bg-[#191265] text-white font-black px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-colors cursor-pointer text-sm">
              לשאלון ה-DNA הזוגי
            </span>
          </Link>
        </motion.div>

        {/* Digital product CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="bg-white rounded-3xl p-6 mb-6 text-right border border-[#e0d8cc]"
        >
          <p className="text-[#1800ad] font-semibold text-xs uppercase tracking-widest mb-1">בזמן שמחכים לפגישה</p>
          <p className="text-[#191265] font-black text-base mb-1">המדריך "לבחור נכון"</p>
          <p className="text-[#727272] text-sm leading-relaxed mb-4">
            5 פרקים שמסבירים למה אנחנו בוחרים את מי שבוחרים, ואיך לבחור נכון יותר. קריאה מצוינת לפני הפגישה שלנו.
          </p>
          <Link href={GUIDE_URL}>
            <span className="inline-block border-2 border-[#191265] text-[#191265] font-bold px-6 py-2.5 rounded-xl hover:bg-[#191265] hover:text-white transition-all cursor-pointer text-sm">
              לדף המדריך ₪149
            </span>
          </Link>
        </motion.div>

        {/* Hilit personal note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="bg-[#191265] rounded-3xl p-6 mb-8 text-right"
        >
          <div className="flex items-center gap-4 mb-4">
            <img
              src={HILIT_IMG}
              alt="הילית כספי"
              className="w-14 h-14 rounded-full object-cover object-[center_20%] shadow-md flex-shrink-0"
            />
            <div>
              <p className="font-black text-white">הילית כספי</p>
              <p className="text-[#ffe27c] text-xs font-medium">Relationship Expert & Matchmaker</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">
            שמחה שהחלטת לקחת את הצעד הזה. ניצור קשר ביום העסקים הבא לתיאום המועד. אם יש שאלות בינתיים, אני כאן בוואטסאפ.
          </p>
          <p className="text-[#ffe27c] font-bold text-sm mt-2">באהבה, הילית</p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1da851] text-white font-black px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 text-center text-sm"
          >
            💬 וואטסאפ ישיר להילית
          </a>
          <a
            href={WHATSAPP_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 text-center text-sm"
          >
            קבוצת הוואטסאפ השקטה
          </a>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.7 }}
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
