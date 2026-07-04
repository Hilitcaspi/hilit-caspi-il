/*
 * GuideSales - דף מכירה למדריך המעשי ₪149 - לבחור נכון
 * Route: /guide
 */
import { useState, useRef, useEffect } from "react";
import React from "react";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";
import { gaViewItem } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link, useLocation } from "wouter";
import GrowWallet from "@/components/GrowWallet";

const HILIT_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const HILIT_PROFILE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg";

function useCountdown(hours = 24) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem('guide_countdown');
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem('guide_countdown', String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem('guide_countdown');
        if (stored) {
          const diff = parseInt(stored) - Date.now();
          return diff > 0 ? diff : 0;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return { h, m, s };
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

export default function GuideSales() {
  const [, navigate] = useLocation();
  React.useEffect(() => {
    track({ eventType: "guide_view" });
    trackViewContent({ content_name: "מדריך לבחור נכון", content_category: "guide" });
    gaViewItem("guide");
  }, []);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { h, m, s } = useCountdown(24);

  const faqs = [
    { q: "למי מתאים המדריך?", a: "לכל מי שמחפש זוגיות אמיתית ומרגיש שמשהו תקוע. לא משנה גיל, רקע, או כמה זמן חיפשת עד עכשיו. המדריך מתאים גם למי שנמצא בתהליך דייטינג פעיל וגם למי שעדיין לא שם." },
    { q: "מה פורמט המדריך?", a: "המדריך הוא דיגיטלי ואינטראקטיבי. ניתן לגשת אליו מכל מכשיר דרך הקישור האישי שתקבלי במייל. אפשר לצאת ולחזור אליו בכל עת, והתשובות נשמרות." },
    { q: "כמה זמן לוקח לעבור אותו?", a: "רוב הקוראים מסיימים את הקריאה בשעה עד שעתיים. התרגילים דורשים עוד כמה ימים של עבודה עצמית. אין לחץ של זמן." },
    { q: "האם הוא מחליף פגישה אישית איתך?", a: "לא. המדריך הוא שלב ראשון שמכין אותך לתהליך. הוא נותן לך בסיס, מזהה את הדפוס שלך, ומאפשר לנו להגיע לפגישה הרבה יותר ממוקדת ויעילה. הוא חלק מהותי מהשיטה שלי." },
    { q: "האם התשלום מאובטח?", a: "כן. התשלום מתבצע דרך Grow, מערכת תשלומים ישראלית מאובטחת. ניתן לשלם בכרטיס אשראי או Bit." },
  ];

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* NAV */}
      <nav className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-1">→ חזרה לאתר</Link>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-20" />
      </nav>

      {/* HERO */}
      <section className="bg-[#191265] py-16 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-10">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-xs font-bold px-4 py-2 rounded-full mb-5 uppercase tracking-widest">
              המדריך שפותח את הדרך לזוגיות
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
              לבחור נכון
              <br />
              <span className="text-[#ffe27c]">המדריך המעשי לזוגיות</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              לא עוד מדריך קריאה. מדריך עבודה פרקטי עם כלים מעשיים ותוצרים שמתארים לך בדיוק מי האדם שמתאים לך. השלב הראשון לפני שמגיעים אליי, ובמקום אחד.
            </p>
            <p className="text-[#ffe27c] text-sm font-bold mt-3">
              ✨ שווה ערך ל-2 פגישות אישיות איתי (שווי ₪1,000)
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">

            {/* Left: what's included */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
              {/* Discount banner */}
              <div className="bg-gradient-to-l from-[#ffe27c] to-[#ffcf00] rounded-2xl p-4 mb-5 text-center shadow-lg">
                <p className="text-[#191265] text-xs font-bold uppercase tracking-widest mb-1">🔥 מבצע מוגבל בזמן</p>
                <div className="flex items-baseline justify-center gap-3">
                  <span className="text-[#191265] font-black text-5xl">₪149</span>
                  <span className="text-[#191265]/50 line-through text-2xl font-bold">₪249</span>
                </div>
                <p className="text-[#191265] font-black text-base mt-1">חיסכון של ₪100. המחיר מסתיים בקרוב!</p>
              </div>

              {/* Countdown */}
              <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-5 text-center">
                <p className="text-white/80 text-xs font-semibold mb-2">⏰ המחיר המיוחד נגמר בעוד:</p>
                <div className="flex justify-center gap-3">
                  {[{ v: String(h).padStart(2,'0'), l: 'שעות' }, { v: String(m).padStart(2,'0'), l: 'דקות' }, { v: String(s).padStart(2,'0'), l: 'שניות' }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                      <div className="bg-[#ffe27c] rounded-lg w-14 h-12 flex items-center justify-center text-[#191265] font-black text-xl">{v}</div>
                      <div className="text-white/60 text-xs mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                {[
                  { icon: "🎯", text: "שאלון הדפוס הדומיננטי שלך: מה בדיוק עוצר אותך" },
                  { icon: "💪", text: "3 תרגילים מעמיקים לכל דפוס, לא תיאוריה אלא פרקטיקה" },
                  { icon: "🔑", text: "כלים מעשיים לבחירה מתוך חופש ולא מתוך פחד" },
                  { icon: "📱", text: "גישה מיידית מכל מכשיר לנצח" },
                  { icon: "💛", text: "12 השאלות שמבדילות בין התרגלתי ללא מתאים" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-start gap-3 bg-white/10 rounded-xl px-4 py-3">
                    <span className="text-lg flex-shrink-0">{icon}</span>
                    <span className="text-white text-sm leading-snug font-medium">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-5 text-white/50 text-xs justify-center">
                <span>🔒 תשלום מאובטח</span>
                <span>⚡ גישה מיידית</span>
                <span>🇮🇱 ישראלי 100%</span>
              </div>
            </motion.div>

            {/* Right: payment form */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <GrowWallet
                product="guide"
                buttonLabel="לרכישה המאובטחת ₪149 ←"
                termsPath="/terms/guide"
                onSuccess={() => navigate("/thank-you/digital")}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* WHY THIS GUIDE EXISTS */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">למה כתבתי את המדריך הזה</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] mb-6 leading-tight">
              אחרי אלפי שיחות הבנתי משהו שרוב האנשים לא יודעים על עצמם
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5 text-[#444] text-base leading-relaxed">
              <p>
                כשאנשים מגיעים אליי לפגישה ראשונה, הם בדרך כלל מספרים לי על מה הם מחפשים בבן או בת הזוג. גבוה, מצחיק, מצליח, יפה. רשימה ארוכה ומפורטת. אבל כשאני שואלת אותם על הקשר הכי טוב שהיה להם, הם מתארים משהו אחר לגמרי. "הוא הקשיב לי." "היא גרמה לי להרגיש בטוח." "היה שם בשבילי."
              </p>
              <p>
                הפער הזה בין מה שאנחנו חושבים שאנחנו רוצים לבין מה שבאמת מביא לנו אושר בזוגיות הוא מה שמדענים מכנים Miswanting. ואנחנו כולנו עושים את זה. הבעיה היא שהפער הזה גורם לנו לפספס חיבורים אמיתיים, לעזוב קשרים טובים, ולהמשיך לחפש משהו שלא בדיוק קיים.
              </p>
              <p>
                המדריך הזה נולד מתוך הרצון לתת לאנשים את הכלים שאני משתמשת בהם בפגישות. לא להמתין לפגישה כדי להבין את עצמם. לבוא כבר מוכנים, עם מפה של מה שעוצר אותם ומה הם באמת מחפשים.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* HOW IT WORKS IN MY METHOD */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">חלק מהותי בשיטה שלי</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] leading-tight">
                למה המדריך הוא הצעד הראשון לפני שמגיעים אליי
              </motion.h2>
            </div>
            <div className="space-y-6">
              {[
                {
                  num: "01",
                  title: "הוא מזהה את הדפוס שעוצר אותך",
                  desc: "לכל אחד יש דפוס שמונע ממנו למצוא זוגיות. Miswanting, השוואה לא ריאליסטית, הסתגלות שגויה, או פחד מחיבור. השאלון בתוך המדריך מזהה בדיוק איפה אתה תקוע ומה השורש האמיתי של זה."
                },
                {
                  num: "02",
                  title: "הוא מכין אותך לתהליך",
                  desc: "כשאנשים מגיעים אליי אחרי שעברו את המדריך, הפגישה שלנו היא אחרת לגמרי. אנחנו לא מבזבזים זמן על הבנות בסיסיות. אנחנו עובדים על מה שבאמת חשוב. זה מקצר את התהליך ומעמיק את התוצאות."
                },
                {
                  num: "03",
                  title: "הוא נותן לך כלים שתוכל להשתמש בהם מחר",
                  desc: "לא רק להבין מה עוצר אותך, אלא לשנות את זה. שלושה תרגילים מעמיקים שאפשר ליישם כבר בדייט הבא, בשיחה הבאה, בהחלטה הבאה."
                },
                {
                  num: "04",
                  title: "הוא חלק מהשיטה שפיצחתי",
                  desc: "פיצחתי את הקוד הסודי למציאת אהבה. לא מדובר בעצות גנריות. מדובר בשיטה שבנויה על הבנה עמוקה של מה שמוביל לזוגיות מתמשכת. המדריך הוא השלב הראשון בשיטה הזו."
                },
              ].map(({ num, title, desc }) => (
                <motion.div key={num} variants={fadeUp} className="flex gap-5 bg-white rounded-2xl p-6 text-right shadow-sm">
                  <div className="text-[#191265]/20 font-black text-3xl leading-none flex-shrink-0 w-10">{num}</div>
                  <div>
                    <h3 className="text-[#191265] font-black text-base mb-2">{title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* WHAT'S INSIDE */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מה בתוך המדריך</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265]">5 כלים שישנו את הדרך שבה את/ה בוחר/ת</motion.h2>
            </div>
            <div className="space-y-4">
              {[
                { num: "01", title: "שאלון הדפוס הדומיננטי שלך", desc: "5 שאלות שמזהות בדיוק מה עוצר אותך ספציפית ונותנות תוכנית עבודה מותאמת אישית." },
                { num: "02", title: "3 תרגילים מעמיקים לדפוס שלך", desc: "לא רק להבין את הדפוס אלא לשנות אותו. תרגילים שאני מיישמת בפגישות ובקשרים אמיתיים." },
                { num: "03", title: "תרגיל אפס נקודת הייחוס", desc: "10 דקות לפני דייט שמשנות את כל הפגישה. מאפס את ההשוואות הלא ריאליסטיות ומאפשר לראות אנשים אמיתיים." },
                { num: "04", title: "12 השאלות שמבדילות בין התרגלתי ללא מתאים", desc: "אחד הכלים הכי חזקים שפיתחתי. עוצר אנשים מלעזוב קשרים טובים בגלל הסתגלות שגויה." },
                { num: "05", title: "מפת הפחד האמיתי שלך", desc: "תרגיל שמזהה את הפחד הספציפי שעוצר אותך ונותן כלים מעשיים לכל סוג פחד. לבחור מתוך חופש ולא מתוך פחד." },
              ].map(({ num, title, desc }) => (
                <motion.div key={num} variants={fadeUp} className="flex gap-5 bg-[#f0eadc] rounded-2xl p-6 text-right">
                  <div className="text-[#191265]/20 font-black text-3xl leading-none flex-shrink-0 w-10">{num}</div>
                  <div>
                    <h3 className="text-[#191265] font-black text-base mb-1">{title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* AUTHOR */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} className="order-2 md:order-1 text-right">
              <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">מי כתבה את המדריך</p>
              <h2 className="text-3xl font-black text-white mb-4">הילית כספי</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                מאמנת זוגיות ומשדכת. ליוויתי מאות רווקים ורווקות בדרך לזוגיות אמיתית. פיצחתי את הקוד הסודי למציאת אהבה ועכשיו אני מלמדת אותו.
              </p>
              <p className="text-white/70 leading-relaxed mb-6">
                המדריך הזה הוא תמצית של מה שלמדתי מאלפי שיחות, פגישות ותהליכים. לא תיאורטי, אלא מה שבאמת עובד בשטח.
              </p>
              <div className="flex gap-6">
                {[{ n: "500+", label: "אנשים שליוויתי" }, { n: "2,400+", label: "רווקים במאגר" }, { n: "200K+", label: "האזנות לפודקאסט" }].map(({ n, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-[#ffe27c] font-black text-2xl">{n}</div>
                    <div className="text-white/50 text-xs mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="order-1 md:order-2 flex justify-center">
              <img src={HILIT_PHOTO} alt="הילית כספי" className="w-64 h-80 object-cover object-[center_20%] rounded-3xl shadow-2xl" />
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מה אומרים אחרי שקוראים</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265]">הם קראו. הם יישמו. הם מצאו.</motion.h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { name: "מיכל, 34", text: "קראתי את המדריך בלילה אחד ולא יכולתי להפסיק. הבנתי לראשונה למה כל הקשרים שלי נגמרו אותו הדבר. שינה לי את הראש." },
                { name: "דניאל, 38", text: "חשבתי שאני יודע הכל על דייטינג. טעיתי. הסוד של הדייט הראשון לבד שווה פי 10 מהמחיר." },
                { name: "רחל, 41", text: "הילית כותבת בצורה ישירה ואמיתית. אין שטויות, אין מניפולציות. רק כלים שעובדים." },
                { name: "דני, 29", text: "קניתי בהיסוס. אחרי הדייט הראשון שיישמתי את השיטות, הוא ביקש להיפגש שנית. מספיק אמור." },
              ].map(({ name, text }) => (
                <motion.div key={name} variants={fadeUp} className="bg-white rounded-2xl p-6 shadow-sm text-right">
                  <div className="flex gap-1 mb-3 justify-end">{[...Array(5)].map((_, i) => <span key={i} className="text-[#ffe27c]">★</span>)}</div>
                  <p className="text-[#727272] text-sm leading-relaxed mb-4">"{text}"</p>
                  <p className="text-[#191265] font-bold text-sm">{name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265]">שאלות נפוצות</motion.h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeUp} className="border border-[#e9e8e8] rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-right bg-white hover:bg-[#f0eadc] transition-colors">
                    <span className="text-[#191265] font-bold text-sm">{faq.q}</span>
                    <span className={`text-[#191265] transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-[#727272] text-sm leading-relaxed text-right bg-white">{faq.a}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-xl mx-auto text-center">
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-6">
              <img src={HILIT_PROFILE} alt="הילית כספי" className="w-14 h-14 rounded-full object-cover object-[center_20%] shadow-lg" />
              <div className="text-right">
                <p className="text-white font-black text-sm">הילית כספי</p>
                <p className="text-[#ffe27c] text-xs">מאמנת זוגיות ומשדכת</p>
              </div>
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              מוכנ/ה לשנות את הסיפור?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/70 text-base mb-6 leading-relaxed">
              מאות אנשים כבר שינו את הדרך שבה הם בוחרים ומצאו. עכשיו תורך.
            </motion.p>

            <motion.div variants={fadeUp} className="bg-[#ffe27c] rounded-2xl px-6 py-4 mb-6 inline-block">
              <p className="text-[#191265] font-black text-lg">
                רק <span className="text-3xl">₪149</span> <span className="line-through text-[#191265]/40 text-base font-normal">₪249</span>
              </p>
              <p className="text-[#191265] text-sm font-bold">חיסכון של ₪100. המחיר מסתיים בקרוב!</p>
            </motion.div>

            <motion.div variants={fadeUp} className="w-full">
              <GrowWallet
                product="guide"
                buttonLabel="לרכישה המאובטחת ₪149 ←"
                termsPath="/terms/guide"
                onSuccess={() => navigate("/thank-you/digital")}
              />
            </motion.div>

            <motion.p variants={fadeUp} className="text-white/40 text-xs mt-5">
              כרטיס אשראי / Bit • SSL מאובטח • גישה מיידית
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* WhatsApp Group CTA */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#191265]/50 text-sm font-semibold uppercase tracking-widest mb-3">עדיין לא בטוח/ה?</p>
          <h3 className="text-2xl md:text-3xl font-black text-[#191265] mb-3">הצטרפ/י לקבוצת הווטסאפ השקטה שלי</h3>
          <p className="text-[#727272] text-base mb-6 leading-relaxed">
            תוכן שבועי חינמי. תובנות, כלים, ושאלות שיגרמו לך לחשוב אחרת על אהבה.
            ללא רעש. ללא לחץ. רק ערך.
          </p>
          <a href="https://hilitcaspi.com/api/wa/site?mode=gi_t" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#1da851] transition-all duration-300 hover:scale-105 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            הצטרפות לקבוצה בחינם לחלוטין
          </a>
        </div>
      </section>

    </div>
  );
}
