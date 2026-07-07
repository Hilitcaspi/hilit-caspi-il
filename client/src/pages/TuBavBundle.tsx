/**
 * TuBavBundle - דף נחיתה נסתר למבצע טו באב
 * חבילת מאגר + מדריך "לבחור נכון" ב-349₪
 * מטרה: דייט ביום האהבה הישראלי!
 */

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import GrowWallet from "@/components/GrowWallet";
import { trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, ראיתי את מבצע טו באב ויש לי שאלה");
const INSTAGRAM_URL = "https://www.instagram.com/hilitcaspi_relationship";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const ABOUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] as any } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Floating hearts component */
function FloatingHearts() {
  const hearts = ["❤️", "💕", "💗", "❤️", "💖", "💕", "❤️", "💗", "💖", "❤️", "💕", "💗"];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hearts.map((heart, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl md:text-3xl"
          style={{ left: `${5 + (i * 8) % 90}%` }}
          initial={{ y: "110vh", opacity: 0.4, rotate: -15 + Math.random() * 30 }}
          animate={{ y: "-10vh", opacity: [0.4, 0.7, 0.4] }}
          transition={{
            duration: 10 + i * 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.8,
          }}
        >
          {heart}
        </motion.div>
      ))}
    </div>
  );
}

export default function TuBavBundle() {
  const paymentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackViewContent({ content_name: "tu_bav_bundle" });
    track({ eventType: "page_view", page: "/tu-bav", metadata: { campaign: "tubav_bundle" } });
  }, []);

  const scrollToPayment = () => {
    paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#fff5f5] font-['Rubik',sans-serif]" dir="rtl">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[92vh] overflow-hidden flex items-center"
        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #2d1052 30%, #4a1942 60%, #6b1d3a 100%)" }}>
        
        {/* Warm glow overlays */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,70,100,0.25) 0%, transparent 45%), radial-gradient(circle at 80% 20%, rgba(255,180,100,0.15) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(255,100,150,0.1) 0%, transparent 60%)" }} />
        
        <FloatingHearts />

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          {/* Urgency badge */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff4466]/30 to-[#ff6b9d]/30 border border-[#ff4466]/50 text-white text-sm font-bold px-5 py-2.5 rounded-full mb-6 backdrop-blur-sm">
            <span className="animate-pulse">❤️</span> מבצע חד פעמי לחודש האהבה
            <span className="animate-pulse">❤️</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
            יש לנו מטרה משותפת:
          </motion.h1>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
            className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-8"
            style={{ color: "#ff6b9d" }}>
            למצוא לך דייט לט"ו באב! 💕
          </motion.h2>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7 }}
            className="text-white/85 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            לכבוד יום האהבה הישראלי, הכנתי חבילה מיוחדת שתעזור לך להגיע לדייט עם האדם הנכון. מאגר הרווקים שלי + המדריך "לבחור נכון" שילווה אותך בתהליך. הכל במחיר מטורף, פעם אחת בשנה.
          </motion.p>

          {/* Price hero box */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md border-2 border-[#ff6b9d]/40 rounded-3xl p-8 max-w-md mx-auto mb-10 relative overflow-hidden">
            {/* Corner ribbon */}
            <div className="absolute top-4 left-4 bg-[#ff4466] text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
              חיסכון ₪399!
            </div>
            <p className="text-white/60 text-sm mb-2 mt-2">מאגר + מדריך</p>
            <div className="flex items-center justify-center gap-4 mb-2">
              <span className="line-through text-white/40 text-2xl">₪748</span>
              <span className="font-black text-5xl" style={{ color: "#ffe27c" }}>₪349</span>
            </div>
            <p className="text-white/50 text-xs">תשלום חד פעמי | ללא מנוי | מבצע לחודש יולי בלבד</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}>
            <button onClick={scrollToPayment}
              className="bg-gradient-to-r from-[#ff4466] to-[#ff6b9d] text-white font-black text-lg px-12 py-5 rounded-full hover:shadow-xl hover:shadow-[#ff4466]/30 transition-all duration-200 active:scale-[0.97] shadow-lg">
              רוצה דייט לטו באב ← ❤️
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
            className="flex gap-6 md:gap-10 justify-center pt-10 border-t border-white/10 mt-12 flex-wrap">
            {[
              { val: "29 ביולי", label: "ט\"ו באב 💕" },
              { val: "₪349", label: "במקום ₪748" },
              { val: "חד פעמי", label: "לא מנוי!" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-black text-white">{val}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ WHO AM I ═══════════ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={fadeUp} className="relative">
            <img src={ABOUT_IMG} alt="הילית כספי" loading="lazy" decoding="async" className="w-full max-w-sm mx-auto rounded-3xl object-cover shadow-2xl" />
            <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-[#ff4466] to-[#ff6b9d] text-white rounded-2xl p-4 shadow-xl max-w-[180px]">
              <div className="font-black text-xl">+2,400</div>
              <div className="text-white/90 text-xs">רווקים במאגר</div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <p className="text-[#ff4466] font-bold text-sm mb-3">מי אני?</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1a0a2e] mb-5 leading-tight">
              הילית כספי
              <br />
              <span className="text-[#ff4466]">מומחית לזוגיות ושדכנית</span>
            </h2>
            <div className="space-y-4 text-[#555] leading-relaxed text-base">
              <p>
                שנים עסקתי בשאלה אחת: <strong className="text-[#1a0a2e]">למה אנשים טובים, חכמים ואוהבים לא מצליחים למצוא אהבה?</strong>
              </p>
              <p>
                ליוויתי מאות אנשים שהצליחו בכל תחום בחיים, אבל הרגישו אבודים לגמרי בעולם הדייטינג. גיליתי שהבעיה אף פעם לא הייתה "שאין אנשים טובים". הבעיה הייתה תמיד דפוסים עמוקים שפועלים מתחת לפני השטח.
              </p>
              <p>
                פיתחתי שיטה ייחודית שמשלבת פסיכולוגיה, אינטואיציה, וניסיון מעשי של שנים. עם השיטה הזו, <strong className="text-[#1a0a2e]">מאות אנשים מצאו את הזוגיות שחלמו עליה.</strong>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["פסיכולוגיה חיובית", "NLP", "שדכנית", "בעלת פודקאסט", "מומחית לדפוסים זוגיים"].map(tag => (
                <span key={tag} className="bg-[#1a0a2e] text-white text-xs px-3 py-1.5 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════ EARLY PAYMENT CTA ═══════════ */}
      <section className="py-12 px-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4a1942 0%, #6b1d3a 100%)" }}>
        <AnimatedSection className="max-w-lg mx-auto text-center relative z-10">
          <motion.div variants={fadeUp}
            className="bg-[#ff4466] text-white text-xs font-black px-4 py-2 rounded-full mb-4 inline-flex items-center gap-2">
            🔥 מבצע חד פעמי לטו באב
          </motion.div>
          <motion.h3 variants={fadeUp} className="text-2xl font-black text-white mb-2">
            מאגר + מדריך = ₪349
          </motion.h3>
          <motion.p variants={fadeUp} className="text-white/60 text-sm mb-5">
            במקום ₪748 | תשלום חד פעמי | ללא מנוי
          </motion.p>
          <motion.div variants={fadeUp}>
            <GrowWallet
              product="bundle_tubav"
              buttonLabel="רוצה להצטרף עכשיו ❤️"
              buttonClassName="!bg-gradient-to-r !from-[#ff4466] !to-[#ff6b9d] !text-white !font-black !text-base !rounded-full hover:!shadow-xl hover:!shadow-[#ff4466]/30 !py-4"
              termsPath="/terms/database"
            />
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════ WHY NOW — URGENCY ═══════════ */}
      <section className="py-20 px-6 bg-[#fff5f5] relative overflow-hidden">
        {/* Subtle hearts background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ff4466'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E\")", backgroundSize: "60px", backgroundRepeat: "repeat" }} />
        
        <AnimatedSection className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#ff4466]/10 text-[#ff4466] text-sm font-bold px-4 py-2 rounded-full mb-6">
            ⏰ מבצע חד פעמי לחודש יולי בלבד
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#1a0a2e] mb-6">
            למה דווקא עכשיו?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555] text-lg leading-relaxed mb-6">
            לכבוד חודש האהבה הישראלי, אני נותנת גז על ההתאמות. שולחת יותר הצעות, גם כאלה עם אחוזי התאמה שבדרך כלל הייתי מחכה איתם. למה? כי לפעמים מה שנראה "לא מושלם על הנייר" הוא בדיוק מה שצריך במציאות.
          </motion.p>
          <motion.p variants={fadeUp} className="text-[#555] text-lg leading-relaxed mb-8">
            המטרה שלי ושלך אחת: <strong>לצאת לדייט ביום האהבה הישראלי</strong>. ולשם כך, אני מורידה מחירים, מגבירה התאמות, ונותנת לך את הכלים הכי טובים שלי.
          </motion.p>
          <motion.div variants={fadeUp} className="bg-gradient-to-r from-[#ff4466]/10 to-[#ff6b9d]/10 border border-[#ff4466]/20 rounded-2xl p-6">
            <p className="text-[#1a0a2e] font-black text-xl">
              🎯 המטרה: דייט ביום האהבה. המבצע הזה הוא הצעד הראשון.
            </p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════ WHAT YOU GET ═══════════ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#1a0a2e] text-center mb-4">
            מה כלול בחבילה?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-[#ff4466] font-bold mb-12">
            שני המוצרים הכי חזקים שלי במחיר חד פעמי מטורף
          </motion.p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Database card */}
            <motion.div variants={fadeUp} className="bg-[#fff5f5] rounded-3xl p-8 shadow-md border border-[#ffe0e6] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#ff4466]/10 to-transparent rounded-bl-full" />
              <div className="bg-[#1a0a2e] text-white text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-4">מאגר הרווקים</div>
              <h3 className="text-2xl font-black text-[#1a0a2e] mb-3">הצטרפות למאגר שלי</h3>
              <p className="text-[#555] leading-relaxed mb-4">
                אני עוברת על כל פרופיל אישית. האלגוריתם שלי מבוסס על מודלים מדעיים שמובילים לזוגיות ארוכת טווח. התאמות נשלחות רק כשיש אחוז התאמה גבוה על בסיס עשרות פרמטרים.
              </p>
              <ul className="text-[#555] text-sm space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#ff4466] mt-0.5">❤️</span> שאלון מדעי מקיף</li>
                <li className="flex items-start gap-2"><span className="text-[#ff4466] mt-0.5">❤️</span> התאמות מבוססות אלגוריתם</li>
                <li className="flex items-start gap-2"><span className="text-[#ff4466] mt-0.5">❤️</span> ליווי אישי שלי בתהליך</li>
                <li className="flex items-start gap-2"><span className="text-[#ff4466] mt-0.5">❤️</span> ללא מנוי חודשי</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#ffe0e6]">
                <span className="text-[#888] text-sm">מחיר רגיל: </span>
                <span className="line-through text-[#888] text-sm">₪499</span>
                <span className="text-[#1a0a2e] font-bold text-sm mr-2">₪249 בחבילה</span>
              </div>
            </motion.div>

            {/* Guide card */}
            <motion.div variants={fadeUp} className="bg-[#fff5f5] rounded-3xl p-8 shadow-md border border-[#ffe0e6] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#ff6b9d]/10 to-transparent rounded-bl-full" />
              <div className="bg-gradient-to-r from-[#ff4466] to-[#ff6b9d] text-white text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-4">💕 בונוס מיוחד</div>
              <h3 className="text-2xl font-black text-[#1a0a2e] mb-3">המדריך "לבחור נכון"</h3>
              <p className="text-[#555] leading-relaxed mb-4">
                המדריך הזה שווה ערך ל-2 שעות ייעוץ אישי איתי (₪1,000). הוא עוזר להבין מה באמת חשוב לך בזוגיות, איך לזהות התאמה אמיתית, ואיך להגיב נכון להתאמות שמגיעות. כי לפעמים מה שנראה "לא מושלם" הוא בדיוק מה שצריך.
              </p>
              <ul className="text-[#555] text-sm space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">💗</span> שווה ערך ל-2 שעות ייעוץ (₪1,000)</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">💗</span> תרגילים מעשיים להבנת עצמך</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">💗</span> כלים לזיהוי התאמה אמיתית</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">💗</span> גישה דיגיטלית לצמיתות</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#ffe0e6]">
                <span className="text-[#888] text-sm">מחיר רגיל: </span>
                <span className="line-through text-[#888] text-sm">₪249</span>
                <span className="text-[#ff4466] font-bold text-sm mr-2">₪99 בלבד בחבילה!</span>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ WHY TOGETHER ═══════════ */}
      <section className="py-20 px-6 bg-[#fff5f5]">
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#1a0a2e] mb-6">
            למה המדריך + המאגר ביחד?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555] text-lg leading-relaxed mb-6">
            רוב האנשים שנכנסים למאגר שלי מקבלים התאמות תוך ימים. אבל חלקם לא יודעים איך להגיב. הם רואים פרופיל שלא תואם בדיוק את מה שדמיינו, ומוותרים. המדריך "לבחור נכון" נותן את הכלים להבין למה שלחתי את ההתאמה הזו, מה לחפש מעבר למה שרואים על הנייר, ואיך לגשת לדייט ראשון בצורה שמגדילה את הסיכוי שתצא מזה זוגיות.
          </motion.p>
          <motion.div variants={fadeUp} className="bg-white border border-[#ffe0e6] rounded-2xl p-6">
            <p className="text-[#1a0a2e] font-black text-lg">
              💕 המאגר מביא את ההתאמות. המדריך עוזר לך לעשות איתן את הדבר הנכון.
            </p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════ MAIN PAYMENT SECTION ═══════════ */}
      <section id="payment" className="py-20 px-6 relative overflow-hidden" ref={paymentRef}
        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #3d1052 50%, #6b1d3a 100%)" }}>
        
        <FloatingHearts />

        <AnimatedSection className="max-w-lg mx-auto text-center relative z-10">
          {/* Urgency banner */}
          <motion.div variants={fadeUp}
            className="bg-[#ff4466] text-white text-sm font-black px-6 py-3 rounded-full mb-8 inline-flex items-center gap-2 shadow-lg shadow-[#ff4466]/30">
            <span className="animate-pulse">🔥</span>
            מבצע חד פעמי לכבוד טו באב!
            <span className="animate-pulse">🔥</span>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
            מאגר + מדריך
          </motion.h2>
          <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl font-black mb-8" style={{ color: "#ffe27c" }}>
            ₪349 במקום ₪748
          </motion.h3>

          {/* Value breakdown */}
          <motion.div variants={fadeUp} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-4 text-right">
            <p className="text-white font-bold text-base mb-3">מה כלול:</p>
            <ul className="text-white/80 text-sm space-y-2.5 mb-5">
              <li>✅ <strong>הצטרפות למאגר הרווקים</strong> שאלון מדעי + התאמות אישיות (שווי ₪499)</li>
              <li>✅ <strong>המדריך "לבחור נכון"</strong> שווה ערך ל-2 שעות ייעוץ אישי (שווי ₪1,000)</li>
              <li>✅ <strong>ליווי אישי שלי</strong> אני עוברת על כל פרופיל</li>
              <li>✅ <strong>ללא מנוי</strong> תשלום חד פעמי, בלי הפתעות</li>
            </ul>
            <div className="flex items-center gap-3 justify-center pt-4 border-t border-white/20">
              <span className="line-through text-white/40 text-lg">₪748</span>
              <span className="font-black text-4xl" style={{ color: "#ffe27c" }}>₪349</span>
            </div>
            <p className="text-white/50 text-xs mt-2 text-center">חיסכון של ₪399! | תשלום מאובטח</p>
          </motion.div>

          {/* Urgency reminder */}
          <motion.div variants={fadeUp} className="bg-[#ff4466]/20 border border-[#ff4466]/40 rounded-xl p-3 mb-6">
            <p className="text-white text-sm font-bold">
              ❤️ המטרה שלנו: דייט ביום האהבה. הצטרפו עכשיו ואני מתחילה לחפש!
            </p>
          </motion.div>

          {/* GrowWallet */}
          <motion.div variants={fadeUp}>
            <GrowWallet
              product="bundle_tubav"
              buttonLabel="רוצה דייט לטו באב! ❤️"
              buttonClassName="!bg-gradient-to-r !from-[#ff4466] !to-[#ff6b9d] !text-white !font-black !text-lg !rounded-full hover:!shadow-xl hover:!shadow-[#ff4466]/30 !py-4"
              termsPath="/terms/database"
            />
          </motion.div>

          <motion.p variants={fadeUp} className="text-white/40 text-xs mt-4">
            לחיצה על הכפתור תפתח את מערכת התשלום המאובטחת. לאחר התשלום תקבלו מייל עם קישור לשאלון המדעי + גישה למדריך.
          </motion.p>
        </AnimatedSection>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-3xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#1a0a2e] text-center mb-10">
            שאלות נפוצות
          </motion.h2>

          <div className="space-y-5">
            {[
              { q: "מה קורה אחרי התשלום?", a: "תקבלו שני מיילים: אחד עם קישור לשאלון המדעי (למאגר), ואחד עם גישה למדריך \"לבחור נכון\". את המדריך אפשר לפתוח מיד, ואת השאלון ממליצה למלא בזמן שקט." },
              { q: "כמה זמן לוקח לקבל התאמות?", a: "ברגע שתמלאו את השאלון, אני מתחילה לחפש התאמות. בדרך כלל ההתאמה הראשונה מגיעה תוך ימים ספורים. ולכבוד טו באב, אני שולחת יותר הצעות מהרגיל ונותנת גז!" },
              { q: "האם יש מנוי חודשי?", a: "לא! תשלום חד פעמי של ₪349 וזהו. ללא מנוי, ללא חיובים נוספים. לעולם." },
              { q: "המדריך דיגיטלי? אפשר לקרוא בטלפון?", a: "כן, המדריך דיגיטלי ונגיש מכל מכשיר. הגישה שלכם נשמרת לצמיתות." },
              { q: "עד מתי המבצע?", a: "המבצע חד פעמי לכבוד טו באב (29 ביולי), תקף לחודש יולי 2026 בלבד. אחרי זה, כל מוצר חוזר למחיר הרגיל שלו." },
              { q: "אני כבר במאגר, אפשר לקנות רק את המדריך?", a: "בטח! המדריך נמכר גם בנפרד ב-249₪. הקישור: hilitcaspi.com/guide" },
            ].map(({ q, a }, i) => (
              <motion.div key={i} variants={fadeUp} className="bg-[#fff5f5] rounded-2xl p-6 border border-[#ffe0e6] shadow-sm">
                <h3 className="text-[#1a0a2e] font-bold text-base mb-2">{q}</h3>
                <p className="text-[#555] text-sm leading-relaxed">{a}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-16 px-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #4a1942 50%, #6b1d3a 100%)" }}>
        
        <FloatingHearts />

        <AnimatedSection className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp} className="text-4xl mb-4">💕</motion.div>
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-black text-white mb-3">
            ט"ו באב מתקרב.
          </motion.h2>
          <motion.h3 variants={fadeUp} className="text-2xl md:text-3xl font-black mb-6" style={{ color: "#ff6b9d" }}>
            הדייט שלך מחכה.
          </motion.h3>
          <motion.p variants={fadeUp} className="text-white/70 text-base mb-8">
            ₪349 במקום ₪748 | מאגר + מדריך | תשלום חד פעמי
          </motion.p>
          <motion.div variants={fadeUp}>
            <button onClick={scrollToPayment}
              className="bg-gradient-to-r from-[#ff4466] to-[#ff6b9d] text-white font-black text-lg px-12 py-5 rounded-full hover:shadow-xl hover:shadow-[#ff4466]/30 transition-all duration-200 active:scale-[0.97] shadow-lg">
              הצטרפות לחבילה ← ❤️
            </button>
          </motion.div>

          {/* Support links */}
          <motion.div variants={fadeUp} className="mt-10 pt-8 border-t border-white/10 flex flex-col gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold px-6 py-3 rounded-xl hover:bg-[#25D366]/30 transition-all text-sm">
              📱 שאלות? כתבו לי בוואטסאפ
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/70 font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all text-sm">
              📸 עקבו אחריי באינסטגרם
            </a>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#0d0520] py-8 px-6 text-center">
        <p className="text-white/40 text-xs">© 2026 הילית כספי | כל הזכויות שמורות</p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/terms/database" className="text-white/30 text-xs hover:text-white/50 transition-colors">תקנון</a>
          <a href="/privacy" className="text-white/30 text-xs hover:text-white/50 transition-colors">מדיניות פרטיות</a>
        </div>
      </footer>
    </div>
  );
}
