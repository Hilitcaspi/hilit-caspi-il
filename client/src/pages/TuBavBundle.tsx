/**
 * TuBavBundle - דף נחיתה נסתר למבצע טו באב
 * חבילת מאגר + מדריך "לבחור נכון" ב-349₪ במקום 498₪
 */

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import GrowWallet from "@/components/GrowWallet";
import { trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, ראיתי את מבצע טו באב ויש לי שאלה");
const INSTAGRAM_URL = "https://www.instagram.com/hilitcaspi_relationship";

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
    <div className="min-h-screen bg-[#f0eadc] font-['Rubik',sans-serif]" dir="rtl">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[90vh] bg-[#191265] overflow-hidden flex items-center">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #ff6b9d 0%, transparent 40%), radial-gradient(circle at 70% 30%, #ffe27c 0%, transparent 40%), radial-gradient(circle at 50% 50%, #c084fc 0%, transparent 50%)" }} />
        
        {/* Floating hearts decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-3xl opacity-20"
              initial={{ y: "100vh", x: `${15 + i * 15}%` }}
              animate={{ y: "-10vh" }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear", delay: i * 1.5 }}
            >
              💜
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d] text-sm font-bold px-5 py-2.5 rounded-full mb-6">
            💜 מבצע מיוחד לחודש האהבה הישראלי
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            דייט ביום האהבה?<br />
            <span className="text-[#ffe27c]">זה מתחיל עכשיו.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
            className="text-white/85 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8">
            לכבוד ט"ו באב, הכנתי לכם חבילה מיוחדת: הצטרפות למאגר הרווקים שלי + המדריך "לבחור נכון" שילווה אתכם בתהליך. הכל במחיר אחד, בלי הפתעות.
          </motion.p>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-md mx-auto mb-8">
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="line-through text-white/50 text-xl">₪498</span>
              <span className="text-[#ffe27c] font-black text-4xl">₪349</span>
            </div>
            <p className="text-white/70 text-sm">מאגר + מדריך | חיסכון של ₪149</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}>
            <button onClick={scrollToPayment}
              className="bg-[#ffe27c] text-[#191265] font-black text-lg px-10 py-4 rounded-2xl hover:bg-[#ffd94a] transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#ffe27c]/20">
              רוצה להצטרף ←
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}
            className="flex gap-8 justify-center pt-10 border-t border-white/10 mt-10 flex-wrap">
            {[
              { val: "ט\"ו באב", label: "יום האהבה הישראלי" },
              { val: "₪349", label: "במקום ₪498" },
              { val: "2 מוצרים", label: "מאגר + מדריך" },
              { val: "₪149", label: "חיסכון" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-black text-[#ffe27c]">{val}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ WHY NOW ═══════════ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6">
            למה דווקא עכשיו?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555] text-lg leading-relaxed mb-8">
            לכבוד חודש האהבה הישראלי, אני נותנת גז על ההתאמות. שולחת יותר הצעות, גם כאלה עם אחוזי התאמה שבדרך כלל הייתי מחכה איתם. למה? כי לפעמים מה שנראה "לא מושלם על הנייר" הוא בדיוק מה שצריך במציאות.
          </motion.p>
          <motion.p variants={fadeUp} className="text-[#191265] font-bold text-xl">
            זו הזדמנות אמיתית להצטרף ולקבל התאמות מהר.
          </motion.p>
        </AnimatedSection>
      </section>

      {/* ═══════════ WHAT YOU GET ═══════════ */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] text-center mb-12">
            מה כלול בחבילה?
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Database card */}
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-8 shadow-sm border border-[#e9e8e8]">
              <div className="bg-[#191265] text-white text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-4">מאגר הרווקים</div>
              <h3 className="text-2xl font-black text-[#191265] mb-3">הצטרפות למאגר שלי</h3>
              <p className="text-[#555] leading-relaxed mb-4">
                אני עוברת על כל פרופיל אישית. האלגוריתם שלי מבוסס על מודלים מדעיים שמובילים לזוגיות ארוכת טווח. התאמות נשלחות רק כשיש אחוז התאמה גבוה על בסיס עשרות פרמטרים.
              </p>
              <ul className="text-[#555] text-sm space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#191265] mt-0.5">✓</span> שאלון מדעי מקיף</li>
                <li className="flex items-start gap-2"><span className="text-[#191265] mt-0.5">✓</span> התאמות מבוססות אלגוריתם</li>
                <li className="flex items-start gap-2"><span className="text-[#191265] mt-0.5">✓</span> ליווי אישי שלי בתהליך</li>
                <li className="flex items-start gap-2"><span className="text-[#191265] mt-0.5">✓</span> ללא מנוי חודשי</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#e9e8e8]">
                <span className="text-[#888] text-sm">שווי: </span>
                <span className="line-through text-[#888] text-sm">₪249</span>
                <span className="text-[#191265] font-bold text-sm mr-2">כלול בחבילה</span>
              </div>
            </motion.div>

            {/* Guide card */}
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-8 shadow-sm border border-[#e9e8e8]">
              <div className="bg-[#ff6b9d] text-white text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-4">בונוס מיוחד</div>
              <h3 className="text-2xl font-black text-[#191265] mb-3">המדריך "לבחור נכון"</h3>
              <p className="text-[#555] leading-relaxed mb-4">
                המדריך שילווה אתכם בתהליך ההצטרפות למאגר. הוא עוזר להבין מה באמת חשוב לכם בזוגיות, איך לזהות התאמה אמיתית, ואיך להגיב נכון להתאמות שמגיעות. כי לפעמים מה שנראה "לא מושלם" הוא בדיוק מה שצריך.
              </p>
              <ul className="text-[#555] text-sm space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">✓</span> תרגילים מעשיים להבנת עצמך</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">✓</span> כלים לזיהוי התאמה אמיתית</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">✓</span> איך לגשת לדייט ראשון</li>
                <li className="flex items-start gap-2"><span className="text-[#ff6b9d] mt-0.5">✓</span> גישה דיגיטלית לצמיתות</li>
              </ul>
              <div className="mt-5 pt-4 border-t border-[#e9e8e8]">
                <span className="text-[#888] text-sm">מחיר רגיל: </span>
                <span className="line-through text-[#888] text-sm">₪249</span>
                <span className="text-[#ff6b9d] font-bold text-sm mr-2">₪99 בלבד בחבילה</span>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ THE LOGIC ═══════════ */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6">
            למה המדריך + המאגר ביחד?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#555] text-lg leading-relaxed mb-6">
            רוב האנשים שנכנסים למאגר שלי מקבלים התאמות תוך ימים. אבל חלקם לא יודעים איך להגיב. הם רואים פרופיל שלא תואם בדיוק את מה שדמיינו, ומוותרים. המדריך "לבחור נכון" נותן את הכלים להבין למה שלחתי את ההתאמה הזו, מה לחפש מעבר למה שרואים על הנייר, ואיך לגשת לדייט ראשון בצורה שמגדילה את הסיכוי שתצא מזה זוגיות.
          </motion.p>
          <motion.p variants={fadeUp} className="text-[#191265] font-bold text-lg">
            בקיצור: המאגר מביא את ההתאמות. המדריך עוזר לכם לעשות איתן את הדבר הנכון.
          </motion.p>
        </AnimatedSection>
      </section>

      {/* ═══════════ PAYMENT SECTION ═══════════ */}
      <section id="payment" className="py-20 px-6 bg-[#191265]" ref={paymentRef}>
        <AnimatedSection className="max-w-lg mx-auto text-center">
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d] text-sm font-bold px-4 py-2 rounded-full mb-6">
            💜 מבצע טו באב | תקף לחודש יולי בלבד
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white leading-tight mb-6">
            מאגר + מדריך<br />
            <span className="text-[#ffe27c]">₪349 במקום ₪498</span>
          </motion.h2>

          {/* Value box */}
          <motion.div variants={fadeUp} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8 text-right">
            <p className="text-white font-bold text-base mb-3">מה כלול:</p>
            <ul className="text-white/80 text-sm space-y-2.5 mb-5">
              <li>✅ <strong>הצטרפות למאגר הרווקים</strong> שאלון מדעי + התאמות אישיות</li>
              <li>✅ <strong>המדריך "לבחור נכון"</strong> גישה דיגיטלית מיידית</li>
              <li>✅ <strong>ליווי אישי שלי</strong> אני עוברת על כל פרופיל</li>
              <li>✅ <strong>ללא מנוי</strong> תשלום חד פעמי, בלי הפתעות</li>
            </ul>
            <div className="flex items-center gap-3 justify-center pt-4 border-t border-white/20">
              <span className="line-through text-white/40 text-lg">₪498</span>
              <span className="text-[#ffe27c] font-black text-3xl">₪349</span>
            </div>
            <p className="text-white/50 text-xs mt-2 text-center">חיסכון של ₪149 | תשלום מאובטח</p>
          </motion.div>

          {/* GrowWallet */}
          <motion.div variants={fadeUp}>
            <GrowWallet
              product="bundle_tubav"
              buttonLabel="הצטרפות לחבילת טו באב ←"
              buttonClassName="!bg-[#ffe27c] !text-[#191265] !font-black !text-lg !rounded-2xl hover:!bg-[#ffd94a] !shadow-lg !shadow-[#ffe27c]/20"
              termsPath="/terms/database"
            />
          </motion.div>

          <motion.p variants={fadeUp} className="text-white/40 text-xs mt-4">
            לחיצה על הכפתור תפתח את מערכת התשלום המאובטחת. לאחר התשלום תקבלו מייל עם קישור לשאלון המדעי + גישה למדריך.
          </motion.p>
        </AnimatedSection>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection className="max-w-3xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">
            שאלות נפוצות
          </motion.h2>

          <div className="space-y-5">
            {[
              { q: "מה קורה אחרי התשלום?", a: "תקבלו שני מיילים: אחד עם קישור לשאלון המדעי (למאגר), ואחד עם גישה למדריך \"לבחור נכון\". את המדריך אפשר לפתוח מיד, ואת השאלון ממליצה למלא בזמן שקט." },
              { q: "כמה זמן לוקח לקבל התאמות?", a: "ברגע שתמלאו את השאלון, אני מתחילה לחפש התאמות. בדרך כלל ההתאמה הראשונה מגיעה תוך ימים ספורים. ולכבוד טו באב, אני שולחת יותר הצעות מהרגיל." },
              { q: "האם יש מנוי חודשי?", a: "לא. תשלום חד פעמי של ₪349 וזהו. ללא מנוי, ללא חיובים נוספים." },
              { q: "המדריך דיגיטלי? אפשר לקרוא בטלפון?", a: "כן, המדריך דיגיטלי ונגיש מכל מכשיר. הגישה שלכם נשמרת לצמיתות." },
              { q: "עד מתי המבצע?", a: "המבצע תקף לחודש יולי 2026 לכבוד טו באב. אחרי זה, כל מוצר חוזר למחיר הרגיל שלו." },
              { q: "אני כבר במאגר, אפשר לקנות רק את המדריך?", a: "בטח! המדריך נמכר גם בנפרד ב-249₪. הקישור: hilitcaspi.com/guide" },
            ].map(({ q, a }, i) => (
              <motion.div key={i} variants={fadeUp} className="bg-white rounded-2xl p-6 border border-[#e9e8e8]">
                <h3 className="text-[#191265] font-bold text-base mb-2">{q}</h3>
                <p className="text-[#555] text-sm leading-relaxed">{a}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-16 px-6 bg-[#191265]">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-black text-white mb-4">
            ט"ו באב מתקרב.<br />
            <span className="text-[#ffe27c]">הדייט שלך מחכה.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/70 text-base mb-6">
            ₪349 במקום ₪498 | מאגר + מדריך | תשלום חד פעמי
          </motion.p>
          <motion.div variants={fadeUp}>
            <button onClick={scrollToPayment}
              className="bg-[#ffe27c] text-[#191265] font-black text-lg px-10 py-4 rounded-2xl hover:bg-[#ffd94a] transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#ffe27c]/20">
              הצטרפות לחבילה ←
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
      <footer className="bg-[#0d0a3e] py-8 px-6 text-center">
        <p className="text-white/40 text-xs">© 2026 הילית כספי | כל הזכויות שמורות</p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/terms/database" className="text-white/30 text-xs hover:text-white/50 transition-colors">תקנון</a>
          <a href="/privacy" className="text-white/30 text-xs hover:text-white/50 transition-colors">מדיניות פרטיות</a>
        </div>
      </footer>
    </div>
  );
}
