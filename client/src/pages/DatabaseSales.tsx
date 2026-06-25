/**
 * DatabaseSales - דף מכירה למאגר הרווקים הבלעדי
 * עיצוב: Deep navy #191265, warm cream #f0eadc, gold #ffe27c
 */

import { useState, useEffect, useRef } from "react";
import React from "react";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";
import { gaViewItem } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link, useSearch } from "wouter";

const CASUAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const DNA_QUIZ_URL = "/dna-quiz";

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
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

const DIMENSIONS = [
  { icon: "🧬", label: "דפוס ההתקשרות", desc: "האופן שבו אדם מתנהל בתוך קרבה רגשית. האם הוא מתקרב כשקשה, או מתרחק. זה הפרמטר שמנבא יותר מכל אחר אם שני אנשים יוכלו לבנות ביחד ביטחון אמיתי." },
  { icon: "🔥", label: "כימיה ומשיכה", desc: "גם המראה חשוב. האלגוריתם לוקח בחשבון העדפות פיזיות ואת הפרמטרים שאנשים מגדירים כחשובים להם. כי משיכה היא לא שטחיות, היא נקודת הפתיחה." },
  { icon: "🧭", label: "מה מניע אותך בפועל", desc: "לא מה שאומרים בראיון עבודה. הערכים שמכתיבים את ההחלטות היומיומיות: כסף, משפחה, חופש, ביטחון. זוגות שנוסעים לכיוונים שונים מגיעים לצמתים קשים." },
  { icon: "🌱", label: "מוכנות לזוגיות עכשיו", desc: "לא בעוד שנה. עכשיו. האם שניכם בשלים לאותו הדבר, באותו הזמן. ההתאמה הכי מושלמת על הנייר מתפרקת כשאחד מוכן ואחד עדיין לא." },
  { icon: "🏠", label: "קצב החיים", desc: "שגרה, חברתיות, ספונטניות, סדר. הדברים הקטנים שנראים טריוויאליים בתחילת הדרך הם אלה שיוצרים חיכוך יומיומי אחרי שנה ביחד." },
  { icon: "🎯", label: "לאן אתם הולכים", desc: "ילדים, מגורים, קריירה, חזון לעתיד. כשהכיוונים מסונכרנים, הזוגיות צומחת. כשהם לא, גם האהבה הכי גדולה נתקעת." },
];

const STEPS = [
  { num: 1, title: "שאלון DNA זוגי", desc: "ממלאים שאלון מעמיק שחושף את הדפוסים הזוגיים האמיתיים שלך. לא מה שאתה/את חושבים שאתם רוצים. מה שבאמת מנבא הצלחה בזוגיות." },
  { num: 2, title: "פרופיל אישי", desc: "מוסיפים תמונה ומספר משפטים עליך. אני קוראת כל פרופיל לפני שהוא נכנס, ומאשרת אותו אישית." },
  { num: 3, title: "כניסה למאגר", desc: "תשלום חד-פעמי. אין דמי חבר חודשיים, אין הפתעות. משלמים פעם אחת ונכנסים." },
  { num: 4, title: "האלגוריתם עובד", desc: "האלגוריתם סורק את כל המאגר ומחפש התאמות מעל 80% על בסיס כל הממדים. רק ההתאמות הגבוהות ביותר מגיעות אליי לבדיקה אישית." },
  { num: 5, title: "אישור הדדי", desc: "שניכם מקבלים מייל ומחליטים בנפרד אם להתקדם לפגישה. רק אם שניכם אמרתם כן, הפרטים נחשפים. אם אחד מכם לא מעוניין, לא קורה כלום, וממשיכים הלאה עד שמגיעה ההתאמה הבאה." },
];

const COUPLE_TESTIMONIALS = [
  { photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp", names: "ליאת ורון", when: "הכירו דרך המאגר, מרץ 2024", text: "אחרי חצי שנה במאגר פגשתי את הבן זוג שלי. הילית ידעה בדיוק מה אני צריכה.", who: "ליאת, 32" },
  { photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp", names: "מורן ודן", when: "הכירו דרך המאגר, יולי 2023", text: "ניסיתי אפליקציות שנים. המאגר של הילית שונה לגמרי. ההתאמות היו מדויקות.", who: "דן, 37" },
  { photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp", names: "נועה ואיתי", when: "הכירו דרך המאגר, נובמבר 2023", text: "הפרופיל שלי עבר סינון אמיתי. ידעתי שכל מי שאני פוגשת רציני ומחפש את אותו הדבר.", who: "נועה, 34" },
];

export default function DatabaseSales() {
  // Track database page view
  React.useEffect(() => {
    track({ eventType: "database_view" });
    trackViewContent({ content_name: "מאגר רווקים", content_category: "matchmaking" });
    gaViewItem("database");
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const dna = params.get("dna");
    const gender = params.get("gender");
    const session = params.get("session");
    if (dna) localStorage.setItem("dna_type", dna);
    if (gender) localStorage.setItem("dna_gender", gender);
    if (session) localStorage.setItem("dna_session", session);
  }, [search]);

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
          <Link href="/join?source=database">
            <span className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105 cursor-pointer">
              הצטרפות למאגר
            </span>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] pt-28 pb-20 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 85%, #ffe27c 0%, transparent 45%), radial-gradient(circle at 85% 15%, #1800ad 0%, transparent 45%)" }} />
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85 }} className="text-right">
            <div className="inline-block bg-[#ffe27c]/15 border border-[#ffe27c]/35 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              ✦ הדור הבא של matchmaking
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
              לא שידוך.<br />
              לא אפליקציה.<br />
              <span className="text-[#ffe27c]">משהו אחר לגמרי.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              בניתי שיטה שלוקחת את כל מה שטוב בכל אחד מהעולמות: גם המראה חשוב, גם הפרמטרים הבסיסיים, וגם הדפוסים הפנימיים שמנבאים אהבה שתחזיק לאורך שנים. לא בחרתי בין הגישות. שילבתי את כולן.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/join?source=database">
                <span className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center cursor-pointer block">
                  ♡ הצטרפות למאגר
                </span>
              </Link>
              <Link href={DNA_QUIZ_URL}>
                <span className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center cursor-pointer block">
                  🧬 שאלון DNA חינמי קודם
                </span>
              </Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.2 }} className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={CASUAL_IMG} alt="הילית כספי" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-[#191265] font-black text-2xl">2,400+</div>
                <div className="text-[#727272] text-xs">רווקים במאגר</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── THE PROBLEM: WHY EVERYTHING ELSE FAILS ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4 text-center">למה הכל עד עכשיו לא עבד</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-8 text-center leading-snug">
              אפליקציות מראות לך פנים.<br />
              <span className="text-[#1800ad]">אבל פנים לא מנבאות אהבה.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5 text-[#444] text-lg leading-relaxed">
              <p>
                המחקר בפסיכולוגיה חיובית מראה שוב ושוב: אנשים לא יודעים מה יגרום להם להיות מאושרים בזוגיות. הם אומרים שהם רוצים מישהו גבוה, מצחיק, מצליח. אבל כשמסתכלים על הזוגות המאושרים באמת, מה שמחזיק אותם ביחד הוא משהו אחר לגמרי.
              </p>
              <p>
                שדכנים מסורתיים עובדים על אינטואיציה. אפליקציות עובדות על תמונות. שניהם מפספסים את הדבר הכי חשוב: <span className="font-bold text-[#191265]">הדפוסים הפנימיים שמנבאים אם שני אנשים יבנו ביחד משהו שיחזיק.</span>
              </p>
              <p>
                זה מה שבניתי. שיטה שמסתכלת על מה שבאמת חשוב.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── THE ALGORITHM: WHAT ACTUALLY PREDICTS LOVE ── */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#ffe27c]/70 font-semibold text-sm uppercase tracking-widest mb-4">השיטה</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-5 leading-snug">
                האלגוריתם שמנבא<br />
                <span className="text-[#ffe27c]">אם שניים ייהפכו לזוג.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/65 text-lg max-w-2xl mx-auto leading-relaxed">
                לקחתי את המחקרים המוכחים ביותר בתחום הזוגיות ובניתי מהם אלגוריתם שמחשב תאימות על פני ששה ממדים מרכזיים. לא ניחוש. לא אינטואיציה. מתמטיקה שמבוססת על מדע.
              </motion.p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {DIMENSIONS.map((d) => (
                <motion.div key={d.label} variants={fadeUp}
                  className="bg-white/8 border border-white/12 rounded-2xl p-6 text-right hover:bg-white/12 transition-colors">
                  <div className="text-3xl mb-3">{d.icon}</div>
                  <h3 className="font-black text-[#ffe27c] text-base mb-2">{d.label}</h3>
                  <p className="text-white/65 text-sm leading-relaxed">{d.desc}</p>
                </motion.div>
              ))}
            </div>
            <motion.div variants={fadeUp} className="mt-12 bg-[#ffe27c]/10 border border-[#ffe27c]/25 rounded-2xl p-8 text-center">
              <div className="text-[#ffe27c] font-black text-5xl mb-2">80%</div>
              <p className="text-white/80 text-lg font-semibold mb-2">סף המינימום להתאמה</p>
              <p className="text-white/55 text-base max-w-xl mx-auto leading-relaxed">
                להגיע ל-80% תאימות על פני כל הממדים זה קשה מאוד. כשהאלגוריתם מזהה התאמה כזו, זה כמו 100%. רק אז ההתאמה מגיעה אליי לבדיקה אישית, ורק ההתאמות שאני מאמינה בהן יוצאות הלאה.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── THE HUMAN LAYER ── */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4 text-center">השכבה האנושית</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-8 text-center leading-snug">
              האלגוריתם מוצא.<br />
              <span className="text-[#1800ad]">אני מחליטה.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5 text-[#444] text-lg leading-relaxed text-right">
              <p>
                אחרי שהאלגוריתם מזהה התאמה מעל 80%, ההתאמה מגיעה אליי. אני לומדת את המאפיינים של כל אחד מהצדדים, קראתי את הפרופילים שלהם, ומפעילה את האינטואיציה שלי על מה שהמחשב לא יכול לראות.
              </p>
              <p>
                כשהאלגוריתם מנבא 80% תאימות, זה כבר ציון גבוה מאוד. אבל יש דברים שרק עין אנושית רואה. <span className="font-bold text-[#191265]">השילוב הזה בין מדע לשיקול דעת הוא מה שמבדיל בין matchmaking אמיתי לכל שאר הדרכים להכיר.</span>
              </p>
              <p>
                ורק אחרי שאני אישרתי, שניכם מקבלים מייל. כל אחד מחליט בנפרד אם להתקדם לפגישה. רק אם שניכם אמרתם כן, הפרטים נחשפים. אם אחד מכם לא מעוניין, לא קורה כלום, וממשיכים הלאה עד שמגיעה ההתאמה הבאה.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── HOW IT WORKS: 5 STEPS ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">התהליך</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-3">מהרגע שנכנסים עד הפגישה הראשונה</motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] text-center text-base mb-14 max-w-xl mx-auto">תהליך פשוט, אנושי, ומלווה. לא ממלאים טופס ונעלמים לחלל.</motion.p>
            <div className="grid md:grid-cols-5 gap-4">
              {STEPS.map((s) => (
                <motion.div key={s.num} variants={fadeUp} className="text-center flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#191265] text-[#ffe27c] rounded-full flex items-center justify-center font-black text-xl mx-auto mb-4 shrink-0">
                    {s.num}
                  </div>
                  <h3 className="font-black text-[#191265] mb-2 text-sm">{s.title}</h3>
                  <p className="text-[#727272] text-xs leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} className="text-center text-[#727272] text-xs mt-10 max-w-xl mx-auto leading-relaxed">
              ממוצע 7-14 ימים מרגע ההצטרפות ועד להתאמה הראשונה (כשהאלגוריתם מזהה התאמה מתאימה)
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── WHO'S IN THE DATABASE ── */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#ffe27c]/70 font-semibold text-sm uppercase tracking-widest mb-4">מי נמצא במאגר</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white mb-5 leading-snug">
              אנשים מרתקים.<br />
              <span className="text-[#ffe27c]">שמחפשים בן זוג אמיתי.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/65 text-base max-w-2xl mx-auto mb-4 leading-relaxed">
              רופאים, עורכי דין, אנשי עסקים, סלבס, יזמים, ורווקים מאוחרים מכל רקע. גרושים ואלמנים שמוכנים לפרק חדש.
            </motion.p>
            <motion.p variants={fadeUp} className="text-[#ffe27c] text-lg font-bold max-w-xl mx-auto mb-12">
              מה שמשותף לכולם: הם רוצים אהבה אמיתית, ויודעים שהגיע הזמן למצוא אותה.
            </motion.p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { icon: "🩺", label: "רופאים ורופאות" },
                { icon: "⚖️", label: "עורכי ועורכות דין" },
                { icon: "⭐", label: "סלבס ואנשי תקשורת" },
                { icon: "💼", label: "אנשי ונשות עסקים" },
              ].map(({ icon, label }) => (
                <motion.div key={label} variants={fadeUp}
                  className="bg-white/8 border border-white/10 rounded-2xl py-5 px-3 text-center">
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-white/80 text-sm font-medium">{label}</div>
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} className="text-white/35 text-sm italic">
              הפרטים האישיים נשמרים בסודיות מלאה ונחשפים רק לאחר אישור הדדי
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">סיפורי הצלחה אמיתיים</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] mb-2">הם הכירו דרך המאגר.</motion.h2>
              <motion.p variants={fadeUp} className="text-[#727272] text-base">סיפורים אמיתיים. לא שיווק.</motion.p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {COUPLE_TESTIMONIALS.map((t) => (
                <motion.div key={t.names} variants={fadeUp} className="bg-white rounded-2xl overflow-hidden shadow-md border border-[#e9e8e8]">
                  <div className="relative h-52 overflow-hidden">
                    <img src={t.photo} alt={t.names} className="w-full h-full object-cover object-[center_20%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191265]/75 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="text-white font-black text-sm">{t.names}</div>
                      <div className="text-[#ffe27c] text-xs">{t.when}</div>
                    </div>
                  </div>
                  <div className="p-5 text-right">
                    <div className="text-[#ffe27c] text-sm mb-2">★★★★★</div>
                    <p className="text-[#727272] text-sm leading-relaxed mb-2">"{t.text}"</p>
                    <p className="text-[#191265] text-xs font-semibold">{t.who}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-5 leading-snug">
              מוכנים שאמצא אתכם?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/65 text-lg mb-8 leading-relaxed max-w-lg mx-auto">
              ממלאים שאלון DNA, יוצרים פרופיל, ואני עושה את השאר. תשלום חד-פעמי, ללא דמי חבר חודשיים, ללא התחייבות.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/join?source=database">
                <span className="inline-block bg-[#ffe27c] text-[#191265] font-black text-xl px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl cursor-pointer">
                  ♡ הצטרפות למאגר
                </span>
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="text-white/35 text-xs mt-5 max-w-lg mx-auto leading-relaxed">
              ממוצע 7-14 ימים מרגע ההצטרפות ועד להתאמה הראשונה (כשהאלגוריתם מזהה התאמה מתאימה)
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── WHATSAPP GROUP ── */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#191265]/50 text-sm font-semibold uppercase tracking-widest mb-3">עדיין רוצים להכיר קודם?</p>
          <h3 className="text-2xl md:text-3xl font-black text-[#191265] mb-3">
            הצטרפו לקבוצת הווטסאפ השקטה שלי
          </h3>
          <p className="text-[#727272] text-base mb-6 leading-relaxed">
            כל שבוע אני שולחת תובנה אחת מהקליניקה. לא ספאם. לא פרסומות. רק משהו שיגרום לכם לחשוב אחרת על אהבה.
            <br />חינם לחלוטין. אפשר לצאת בכל רגע.
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
            הצטרפות לקבוצה - חינם לחלוטין
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#191265] border-t border-white/10 py-6 px-6 text-center">
        <div className="flex flex-wrap justify-center gap-4 text-white/40 text-sm">
          <Link href="/terms/database"><span className="hover:text-white/70 transition-colors cursor-pointer">תקנון ומדיניות ביטול</span></Link>
          <span>·</span>
          <Link href="/"><span className="hover:text-white/70 transition-colors cursor-pointer">חזרה לדף הבית</span></Link>
        </div>
      </footer>
    </div>
  );
}
