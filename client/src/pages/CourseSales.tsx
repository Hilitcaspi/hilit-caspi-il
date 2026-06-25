/**
 * CourseSales - דף מכירה לקורס "המסע"
 * מחיר: ₪249 (מחיר מלא ₪497)
 * מודולים: 5 מודולים אמיתיים מהקורס
 * שפה: מותאמת לגברים ונשים
 */

import { useState, useEffect, useRef } from "react";
import React from "react";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";
import { gaViewItem, gaBeginCheckout } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import GrowWallet from "@/components/GrowWallet";

const COUPLE1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp";
const COUPLE4 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple4-Zr2SS5VPXgS3gKAzHobA5s.webp";
const COUPLE3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

function useCountdown(hours = 24) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem('course_countdown');
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem('course_countdown', String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem('course_countdown');
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

const WHATSAPP_URL = "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%A7%D7%95%D7%A8%D7%A1";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
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

const MODULES = [
  {
    num: 1,
    title: "מפת הפחדים שלך",
    subtitle: "להכיר את הפחדים שמעכבים אותך ולהפוך אותם למידע",
    icon: "🗺️",
    desc: "פחד מדחייה, מנטישה, מאובדן עצמי. כולנו נושאים פחדים שנבנו מניסיון. במודול הזה מזהים אותם, מבינים מאיפה הם הגיעו, ולומדים להשתמש בהם כמצפן במקום לברוח מהם.",
  },
  {
    num: 2,
    title: "שורשי הדפוסים שלך",
    subtitle: "להבין מאיפה מגיעים הדפוסים הרגשיים שלך ואיך לשנות אותם",
    icon: "🌱",
    desc: "למה אנחנו חוזרים על אותן טעויות? סגנון ההתקשרות שלנו (שנוצר עוד בילדות) מכתיב את הדינמיקה בכל קשר. כאן מגלים את הסגנון שלך ומתחילים לשנות אותו.",
  },
  {
    num: 3,
    title: "לבחור נכון",
    subtitle: "להבין מה אתם באמת מחפשים, ולמה המוח מוביל לבחירות לא נכונות",
    icon: "🎯",
    desc: "המוח שלנו גרוע בלנבא מה יגרום לנו לאושר. מחקרי ייל והרווארד מראים שמה שאנחנו חושבים שאנחנו רוצים, לא תמיד מה שיגרום לנו להיות מאושרים. כאן לומדים לבחור מתוך חופש.",
  },
  {
    num: 4,
    title: "לצאת לדייט נכון",
    subtitle: "לצאת לדייטים בצורה שיוצרת חיבור אמיתי, לא הצגה",
    icon: "💬",
    desc: "הרוב יוצאים לדייט כדי 'להרשים'. אנחנו נלמד לצאת כדי 'להכיר'. ההבדל הזה משנה הכל. כלים מעשיים שיוצרים חיבור אמיתי מהפגישה הראשונה.",
  },
  {
    num: 5,
    title: "תוכנית הפעולה שלך",
    subtitle: "לצאת עם מפה אישית מלאה וכלים ברורים להמשך",
    icon: "🧭",
    desc: "בסוף הקורס מקבלים מפה זוגית אישית: מסמך מלא שמסכם את הפחדים, הדפוסים, הצרכים, וסגנון ההתקשרות שלכם. משהו אמיתי שאפשר לקחת לתהליך ליווי, לשיחה עם פרטנר, או פשוט לדרך.",
  },
];

const TESTIMONIALS = [
  {
    photo: COUPLE1,
    names: "מיכל ואורי",
    when: "הכירו דרך המאגר, מרץ 2024",
    text: "הקורס שינה לי את הראש. הבנתי למה כל הקשרים שלי נגמרו אותו הדבר, ואיך לשבור את הדפוס.",
    who: "מיכל, 34",
  },
  {
    photo: COUPLE4,
    names: "שירה ואיתי",
    when: "הכירו בתהליך ליווי, יוני 2024",
    text: "ציפיתי לעוד 'טיפים לדייטינג'. קיבלתי כלים אמיתיים לחיים. שווה כל שקל ועוד.",
    who: "שירה, 31",
  },
  {
    photo: COUPLE3,
    names: "נועה ואיתי",
    when: "הכירו דרך המאגר, נובמבר 2023",
    text: "המפה שקיבלתי בסוף הקורס עזרה לי להסביר לפרטנר שלי מה אני צריכה. זה שינה את הדינמיקה בינינו.",
    who: "נועה, 34",
  },
];

const WHAT_YOU_GET = [
  { icon: "🎬", title: "5 מודולים דיגיטליים", desc: "תוכן מעמיק שנבנה מאות פגישות קליניקה" },
  { icon: "📋", title: "חוברת עבודה", desc: "תרגילים מעשיים לכל מודול" },
  { icon: "🗺️", title: "מפה זוגית אישית", desc: "מסמך מסכם שיוצא מהקורס, שלכם לתמיד" },
  { icon: "🎁", title: "מדריך דיגיטלי (בונוס)", desc: "כלול בחבילה, ללא תשלום נוסף" },
];

export default function CourseSales() {
  React.useEffect(() => {
    track({ eventType: "course_view" });
    trackViewContent({ content_name: "קורס המסע", content_category: "course" });
    gaViewItem("course");
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const { h, m, s } = useCountdown(24);
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
          <Link href="/">
            <span className="text-white font-bold text-lg cursor-pointer hover:text-[#ffe27c] transition-colors">הילית כספי</span>
          </Link>
          <button onClick={() => document.getElementById('course-wallet-hero')?.scrollIntoView({behavior:'smooth'})}
            className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
            הצטרפות לקורס ₪249
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#191265] pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-right order-2 md:order-1">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-5">
              קורס דיגיטלי ✦ 5 מודולים ✦ מפה אישית בסוף
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              המסע<br />
              <span className="text-[#ffe27c]">מהפחד לבחירה</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              קורס מבוסס פסיכולוגיה חיובית (ייל, הרווארד) שמוביל אתכם מהמקום שבו אתם תקועים, למקום שבו בוחרים מתוך חופש ואוהבים נכון.
              <br /><br />
              <span className="text-white font-semibold">בסוף הקורס מקבלים מפה זוגית אישית מלאה</span>, משהו אמיתי שאפשר לקחת לתהליך ליווי.
            </p>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-white/40 text-2xl line-through">₪497</span>
              <span className="text-[#ffe27c] font-black text-5xl">₪249</span>
              <span className="text-white/60 text-base">הטבה מיוחדת</span>
            </div>

            {/* Countdown */}
            <div className="bg-white/10 border border-[#ffe27c]/30 rounded-2xl p-4 mb-5">
              <p className="text-[#ffe27c] text-xs font-semibold mb-2 text-center">⏰ ההטבה בתוקף עוד:</p>
              <div className="flex justify-center gap-3">
                {[{ v: String(h).padStart(2,'0'), l: 'שעות' }, { v: String(m).padStart(2,'0'), l: 'דקות' }, { v: String(s).padStart(2,'0'), l: 'שניות' }].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <div className="bg-[#191265] border border-[#ffe27c]/40 rounded-xl w-14 h-12 flex items-center justify-center text-[#ffe27c] font-black text-xl">{v}</div>
                    <div className="text-white/50 text-xs mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Early bird bonus */}
            <div className="bg-[#ffe27c]/15 border border-[#ffe27c]/40 rounded-2xl p-4 mb-5">
              <p className="text-[#ffe27c] font-black text-sm text-center">🎁 בונוס מיוחד</p>
              <p className="text-white/80 text-xs text-center mt-1">גישה למדריך הדיגיטלי המלא, ללא תשלום נוסף</p>
            </div>

            <div id="course-wallet-hero" className="mt-2">
              <GrowWallet
                product="course"
                buttonLabel="♡ הצטרפות לקורס עכשיו"
                termsPath="/terms/course"
                onSuccess={() => { window.location.href = "/thank-you/course"; }}
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex justify-center order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={PROFILE_IMG} alt="הילית כספי" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-[#191265] font-black text-lg">500+</div>
                <div className="text-[#727272] text-xs">בוגרי הקורס</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>



      {/* What you get */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">מה מקבלים</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">הקורס המלא + מפה אישית</motion.h2>
            <div className="grid md:grid-cols-4 gap-5">
              {WHAT_YOU_GET.map((item) => (
                <motion.div key={item.title} variants={fadeUp} className="bg-white rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-black text-[#191265] text-sm mb-1">{item.title}</h3>
                  <p className="text-[#727272] text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Modules */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">תוכן הקורס</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-10">5 המודולים</motion.h2>
            <div className="space-y-4">
              {MODULES.map((mod) => (
                <motion.div key={mod.num} variants={fadeUp} className="bg-[#f0eadc] rounded-2xl p-6 flex gap-5 items-start">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-12 h-12 bg-[#191265] text-[#ffe27c] rounded-full flex items-center justify-center font-black text-lg mb-1">
                      {mod.num}
                    </div>
                    <div className="text-xl">{mod.icon}</div>
                  </div>
                  <div className="text-right">
                    <h3 className="font-black text-[#191265] mb-0.5">{mod.title}</h3>
                    <p className="text-[#1800ad] text-xs font-semibold mb-2">{mod.subtitle}</p>
                    <p className="text-[#727272] text-sm leading-relaxed">{mod.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Map highlight */}
            <motion.div variants={fadeUp} className="mt-8 bg-[#191265] rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="font-black text-[#ffe27c] text-lg mb-2">בסוף הקורס: מפה זוגית אישית מלאה</h3>
              <p className="text-white/80 text-sm leading-relaxed max-w-xl mx-auto">
                מסמך מסכם שנבנה מהתשובות שלכם לאורך הקורס: הפחדים, הדפוסים, הצרכים, וסגנון ההתקשרות. משהו אמיתי שאפשר לקחת לתהליך ליווי, לשיחה עם פרטנר, או פשוט לדרך.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#ffe27c]/70 font-semibold text-sm uppercase tracking-widest text-center mb-3">סיפורי הצלחה אמיתיים</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white text-center mb-10">הם למדו. הם יישמו. הם מצאו.</motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.names} variants={fadeUp} className="bg-white rounded-2xl overflow-hidden shadow-xl">
                  <div className="relative h-56 overflow-hidden">
                    <img src={t.photo} alt={t.names} className="w-full h-full object-cover object-[center_20%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191265]/80 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="text-white font-black text-base">{t.names}</div>
                      <div className="text-[#ffe27c] text-xs">{t.when}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-[#ffe27c] text-sm mb-2">★★★★★</div>
                    <p className="text-[#727272] text-sm leading-relaxed mb-3">"{t.text}"</p>
                    <p className="text-[#191265] text-xs font-semibold">{t.who}</p>
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
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <motion.img variants={fadeUp} src={PROFILE_IMG} alt="הילית כספי" className="w-full rounded-3xl shadow-lg" />
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מי אני</p>
              <h2 className="text-2xl font-black text-[#191265] mb-4">הילית כספי</h2>
              <p className="text-[#727272] leading-relaxed text-sm mb-4">
                מאמנת זוגיות ומשדכת. ליוויתי מאות אנשים בתהליך מציאת הזוגיות ופיתחתי שיטה ייחודית המבוססת על DNA זוגי.
              </p>
              <p className="text-[#727272] leading-relaxed text-sm">
                הקורס הזה הוא תמצית של כל מה שלמדתי, ארוז בצורה ברורה, מעשית, ושניתן ליישם מיד. ובסוף, מסמך שיישאר אתכם.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
              מוכנים להתחיל?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] text-lg mb-8">
              5 מודולים. מפה אישית. מסע שמשנה.
            </motion.p>
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-8 shadow-sm mb-6">
              <div className="flex justify-center items-baseline gap-3 mb-2">
                <span className="text-[#727272] text-xl line-through">₪497</span>
                <span className="text-[#191265] font-black text-5xl">₪249</span>
              </div>
              <p className="text-[#727272] text-sm mb-6">הטבה מיוחדת, לזמן מוגבל</p>
              <div className="grid grid-cols-2 gap-3 mb-6 text-right">
                {WHAT_YOU_GET.map(item => (
                  <div key={item.title} className="flex items-center gap-2 text-sm text-[#191265]">
                    <span className="text-[#1800ad] font-bold">✓</span>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
              <GrowWallet
                product="course"
                buttonLabel="הצטרפות לקורס ₪249"
                termsPath="/terms/course"
                onSuccess={() => { window.location.href = "/thank-you/course"; }}
              />
            </motion.div>
            <motion.p variants={fadeUp} className="text-[#727272] text-sm">
              יש שאלות?{" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#191265] font-semibold underline">
                כתבו לי בוואטסאפ
              </a>
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* WhatsApp Group CTA */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#191265]/50 text-sm font-semibold uppercase tracking-widest mb-3">עדיין לא בטוחים?</p>
          <h3 className="text-2xl md:text-3xl font-black text-[#191265] mb-3">
            הצטרפו לקבוצת הווטסאפ השקטה שלי
          </h3>
          <p className="text-[#727272] text-base mb-6 leading-relaxed">
            תוכן שבועי חינמי מהקליניקה: תובנות, כלים, ושאלות שיגרמו לכם לחשוב אחרת על אהבה.
            <br />ללא רעש. ללא לחץ. רק ערך.
          </p>
          <a
            href="https://hilitcaspi.com/api/wa/site?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#1da851] transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            הצטרפות לקבוצה, חינם לחלוטין
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#191265] border-t border-white/10 py-6 px-6 text-center">
        <div className="flex flex-wrap justify-center gap-4 text-white/40 text-sm">
          <Link href="/terms/course"><span className="hover:text-white/70 transition-colors cursor-pointer">תקנון ומדיניות ביטול</span></Link>
          <span>·</span>
          <Link href="/"><span className="hover:text-white/70 transition-colors cursor-pointer">חזרה לדף הבית</span></Link>
        </div>
      </footer>
    </div>
  );
}
