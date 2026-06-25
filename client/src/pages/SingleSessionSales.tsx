/**
 * SingleSessionSales - דף מכירה לפגישה אישית חד-פעמית
 * מחיר: ₪500 (ניתן לקיזוז מחבילת ליווי מלאה)
 * כולל: כניסה אוטומטית למאגר הרווקים
 * מיקום: קליניקה ברמת השרון / קליניקה בתל אביב / זום
 * Route: /single-session
 */

import { useState, useEffect, useRef } from "react";
import { gaViewItem, gaBeginCheckout } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import GrowWallet from "@/components/GrowWallet";

const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const ABOUT_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const COUPLE1     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp";
const COUPLE2     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp";

const WHATSAPP_URL      = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, אני מעוניין/ת לקבוע פגישה אישית חד-פעמית. אשמח לפרטים נוספים.");

const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.13 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

const WHAT_HAPPENS = [
  { icon: "🧬", title: "מיפוי אישי", desc: "נבין יחד מה עוצר אותך, מה הדפוסים שחוזרים, ומה את/ה מחפש/ת בזוגיות." },
  { icon: "🗺️", title: "תמונה ברורה", desc: "תצא/י מהפגישה עם הבנה מדויקת של הצעד הבא שלך, לא עוד ניחושים." },
  { icon: "🏆", title: "כניסה למאגר", desc: "מיד לאחר הפגישה תקבל/י גישה מלאה למאגר הרווקים הבלעדי." },
  { icon: "💰", title: "ניתן לקיזוז", desc: "אם תחליט/י להמשיך לתהליך ליווי מלא, ₪500 יקוזזו מהמחיר הכולל." },
];

const TESTIMONIALS = [
  {
    photo: COUPLE1,
    text: "הגעתי לפגישה אחת כדי לבדוק. יצאתי עם הבנה שלא הייתה לי אחרי שנים. הילית רואה דברים שאתה לא רואה בעצמך.",
    who: "דניאל, 41",
  },
  {
    photo: COUPLE2,
    text: "שעה אחת שינתה לי את הגישה לדייטינג. הבנתי מה אני מחפשת ולמה לא מצאתי. שלושה חודשים אחר כך אני בזוגיות.",
    who: "מיכל, 36",
  },
];

const SESSION_FLOW = [
  { num: "01", title: "מה מביא אותך לכאן", desc: "נפתח בסיפור שלך: מה ניסית, מה לא עבד, ומה את/ה מרגיש/ת תקוע/ה בו." },
  { num: "02", title: "מיפוי הדפוסים", desc: "נזהה יחד את הדפוסים החוזרים בקשרים שלך ומה הם אומרים על מה שאת/ה צריך/ה." },
  { num: "03", title: "הפרופיל שלך", desc: "נבין מה את/ה מחפש/ת באמת, לא רק מה שכתוב ברשימה שלך." },
  { num: "04", title: "הצעד הבא", desc: "תצא/י עם תוכנית ברורה: מה לעשות שונה, ואיך להיכנס למאגר בצורה הנכונה." },
];

export default function SingleSessionSales() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    gaViewItem("session");
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* Navbar */}
      <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-[#191265]"}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/"><span className="text-white font-bold text-lg cursor-pointer hover:text-[#ffe27c] transition-colors">הילית כספי</span></Link>
          <button onClick={() => document.getElementById('session-wallet-hero')?.scrollIntoView({behavior:'smooth'})}
            className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
            קביעת פגישה ₪500
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#191265] pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-right order-2 md:order-1">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-5">
              פגישה אישית 1:1 ✦ פעם אחת
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              שעה אחת שיכולה<br />
              <span className="text-[#ffe27c]">לשנות את הכיוון</span>
            </h1>

            <p className="text-white/75 text-lg leading-relaxed mb-6">
              לא תמיד צריך תהליך ארוך. לפעמים פגישה אחת נותנת את הבהירות שחיפשת. נמפה יחד חלק מהדפוסים שלך, נבין מה עוצר אותך, ותצא/י עם כיוון יותר ברור.
            </p>

            {/* Location badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["📍 קליניקה ברמת השרון", "📍 קליניקה בתל אביב", "💻 זום לבחירתך"].map((loc) => (
                <span key={loc} className="bg-white/10 text-white/80 text-sm px-3 py-1.5 rounded-full border border-white/20">{loc}</span>
              ))}
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-[#ffe27c] font-black text-3xl">₪500</span>
              <span className="text-white/50 text-base">לפגישה אחת של 60 דקות</span>
            </div>

            {/* Offset note */}
            <div className="bg-[#ffe27c]/15 border border-[#ffe27c]/30 rounded-2xl p-4 mb-6">
              <p className="text-[#ffe27c] font-bold text-sm">
                💡 אם תחליט/י להמשיך לתהליך ליווי מלא, ₪500 יקוזזו מהמחיר הכולל
              </p>
            </div>

            {/* Database bonus */}
            <div className="bg-[#ffe27c] rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🏆</span>
                <p className="text-[#191265] font-black text-base">כולל: כניסה למאגר הרווקים (שווי ₪499)</p>
              </div>
              <p className="text-[#191265]/70 text-sm pr-9">לאחר הפגישה תקבל/י גישה מלאה למאגר הרווקים הבלעדי, ללא תשלום נוסף (שווי ₪499)</p>
            </div>

            <div id="session-wallet-hero" className="mt-2">
              <GrowWallet
                product="session"
                buttonLabel="קביעת פגישה עכשיו"
                termsPath="/terms/single-session"
                onSuccess={() => { window.location.href = "/thank-you/session"; }}
              />
            </div>
            <div className="mt-4">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center inline-block">
                💬 שאלות? וואטסאפ
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex justify-center order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="הילית כספי" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-[#191265] font-black text-lg">500+</div>
                <div className="text-[#727272] text-xs">אנשים שליוויתי</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* After purchase note */}
      <section className="bg-[#ffe27c] py-5 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#191265] font-bold text-base">
            📞 לאחר השלמת התשלום ניצור קשר ביום העסקים הבא לתיאום מועד הפגישה
          </p>
        </div>
      </section>

      {/* What happens in the session */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">מה קורה בפגישה</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">60 דקות שמשנות כיוון</motion.h2>
            <div className="grid md:grid-cols-2 gap-4">
              {SESSION_FLOW.map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="bg-[#f0eadc] rounded-2xl p-6 flex gap-4 items-start">
                  <span className="text-[#ffe27c] font-black text-2xl bg-[#191265] rounded-xl w-12 h-12 flex items-center justify-center flex-shrink-0 text-base">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="font-black text-[#191265] mb-1">{step.title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* What's included */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">מה כלול</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">הכל בפגישה אחת</motion.h2>
            <div className="grid md:grid-cols-2 gap-6">
              {WHAT_HAPPENS.map((item) => (
                <motion.div key={item.title} variants={fadeUp} className="bg-white rounded-2xl p-6 flex gap-4 items-start">
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-black text-[#191265] mb-1">{item.title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* About Hilit */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-[#ffe27c]/20 to-[#191265]/10 rounded-3xl blur-xl" />
                <img src={ABOUT_IMG} alt="הילית כספי" className="relative w-72 h-auto rounded-3xl object-cover shadow-xl" />
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">על הילית</p>
              <h2 className="text-3xl font-black text-[#191265] mb-4">מאמנת ומשדכת בכירה</h2>
              <p className="text-[#727272] leading-relaxed mb-4">
                הילית כספי היא מאמנת זוגיות ומשדכת עם ניסיון עשיר בליווי מאות אנשים בדרכם לזוגיות. היא פיתחה שיטה ייחודית שמשלבת הבנה פסיכולוגית עמוקה עם כלים מעשיים שעובדים בשטח.
              </p>
              <p className="text-[#727272] leading-relaxed mb-6">
                בפגישה אחת איתה נתחיל להבין יחד את התמונה שלך, לזהות דפוסים, ולהבין מה הצעד הבא שלך.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { n: "2,400+", l: "רווקים במאגר" },
                  { n: "500+", l: "אנשים שליוויתי" },
                  { n: "200K+", l: "האזנות לפודקאסט" },
                ].map(({ n, l }) => (
                  <div key={l} className="text-center bg-[#f0eadc] rounded-xl px-4 py-3">
                    <div className="font-black text-[#191265] text-xl">{n}</div>
                    <div className="text-[#727272] text-xs">{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest text-center mb-3">מה אומרים</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white text-center mb-10">אחרי פגישה אחת</motion.h2>
            <div className="grid md:grid-cols-2 gap-6">
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.who} variants={fadeUp} className="bg-white/10 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={t.photo} alt={t.who} className="w-12 h-12 rounded-full object-cover border-2 border-[#ffe27c]" />
                    <span className="text-white font-bold text-sm">{t.who}</span>
                  </div>
                  <p className="text-white/75 text-sm leading-relaxed italic">"{t.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">שאלות נפוצות</motion.h2>
            <div className="space-y-4">
              {[
                { q: "כמה זמן נמשכת הפגישה?", a: "60 דקות מלאות, ללא קיצורים." },
                { q: "איפה הפגישה מתקיימת?", a: "לבחירתך: קליניקה ברמת השרון, קליניקה בתל אביב, או בזום. כל האפשרויות זמינות." },
                { q: "מתי מתאמים את הפגישה?", a: "לאחר השלמת התשלום ניצור קשר ביום העסקים הבא לתיאום מועד שמתאים לשניכם." },
                { q: "מה קורה עם המאגר?", a: "לאחר הפגישה תקבל/י גישה מלאה למאגר הרווקים הבלעדי, כולל מילוי שאלון ה-DNA הזוגי." },
                { q: "האם ₪500 מקוזזים אם אמשיך לתהליך מלא?", a: "כן. אם תחליט/י להצטרף לחבילת הליווי המלאה, ₪500 יקוזזו מהמחיר הכולל." },
                { q: "מה מדיניות הביטול?", a: "ניתן לבטל עד 24 שעות לפני הפגישה לקבלת החזר מלא. ביטול מאוחר יותר לא יזכה בהחזר." },
              ].map(({ q, a }) => (
                <motion.div key={q} variants={fadeUp} className="bg-white rounded-2xl p-6">
                  <h3 className="font-black text-[#191265] mb-2">{q}</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">{a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-4">
              מוכן/ה לשעה שמשנה כיוון?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/70 text-lg mb-8">
              פגישה אחת. 60 דקות. בהירות שחיפשת.
            </motion.p>
            <motion.div variants={fadeUp}>
              <GrowWallet
                product="session"
                buttonLabel="קביעת פגישה עכשיו ₪500"
                termsPath="/terms/single-session"
                onSuccess={() => { window.location.href = "/thank-you/session"; }}
              />
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* WhatsApp group CTA */}
      <section className="py-10 px-6 bg-[#f0eadc] border-t border-[#e0d8cc]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#191265] font-bold mb-3">רוצה לקבל תוכן חינמי על זוגיות ודייטינג?</p>
          <a
            href="https://hilitcaspi.com/api/wa/site"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#20ba5a] transition-colors"
          >
            הצטרפות לקבוצת הוואטסאפ השקטה
          </a>
          <p className="text-[#727272] text-xs mt-2">ללא ספאם. תוכן בלבד. ניתן לצאת בכל עת.</p>
        </div>
      </section>

    </div>
  );
}
