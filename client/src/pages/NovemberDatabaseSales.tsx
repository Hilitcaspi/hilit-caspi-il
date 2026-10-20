import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const ABOUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const faqs = [
  {
    question: "האם זו תוכנית Plus?",
    answer: "לא. זו הטבת נובמבר לתוכנית המאגר בלבד. Plus אינו כלול, אינו נפתח אוטומטית ואינו חלק מהתצוגה המוקדמת הזו.",
  },
  {
    question: "האם זה תשלום חודשי?",
    answer: "לא. במחיר ההטבה המתוכנן מדובר בתשלום חד־פעמי של 349 ₪, ללא חיוב מתחדש. המכירה עצמה עדיין אינה פתוחה.",
  },
  {
    question: "מתי מתחיל חלון שלושת הימים?",
    answer: "רק לאחר אישור התשלום וגם לאחר השלמת הפרופיל, התמונה, השאלון וההעדפות. משם נספרים עד 3 ימים קלנדריים להצעת התאמה ראשונה.",
  },
  {
    question: "מה כולל המדריך ״לבחור נכון״?",
    answer: "זהו מדריך דיגיטלי עם שאלות ותרגילים שמסייעים לדייק מה חשוב לך בהיכרות ובבחירה. מחירו בנפרד הוא 149 ₪, והוא צפוי להינתן במתנה במסגרת ההטבה.",
  },
  {
    question: "עד מתי התוכנית צפויה להיות בתוקף?",
    answer: "תוקף תוכנית נובמבר המתוכנן הוא 1–30.11.2026. התאריכים והזמינות הסופיים יוצגו רק לאחר השלמת ההכנה.",
  },
  {
    question: "כבר רכשתי או הצטרפתי בעבר — מה זה אומר עבורי?",
    answer: "אין צורך לרכוש שוב את רכיב המאגר. לפני פתיחת המכירה יוצגו בצורה ברורה אפשרויות הזכאות והשירות למי שכבר רכשו, כדי שלא תתבצע רכישה כפולה בטעות.",
  },
];

function Heart({ className = "", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M12 21.1 10.55 19.78C5.4 15.1 2 12.02 2 8.27 2 5.2 4.42 2.8 7.5 2.8c1.74 0 3.41.81 4.5 2.08A6.1 6.1 0 0 1 16.5 2.8C19.58 2.8 22 5.2 22 8.27c0 3.75-3.4 6.83-8.55 11.52L12 21.1Z" />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2.75c.76 5.24 3.27 7.75 8.5 8.5-5.23.76-7.74 3.27-8.5 8.5-.75-5.23-3.26-7.74-8.5-8.5 5.24-.75 7.75-3.26 8.5-8.5Z" />
      <path d="M19.1 2.7c.28 1.92 1.2 2.84 3.12 3.12-1.92.28-2.84 1.2-3.12 3.12-.28-1.92-1.2-2.84-3.12-3.12 1.92-.28 2.84-1.2 3.12-3.12Z" />
    </svg>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function NovemberDatabaseSales() {
  const detailsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const existingRobots = document.querySelector('meta[name="robots"]');
    const hadRobotsMeta = Boolean(existingRobots);
    const robotsMeta = existingRobots ?? document.createElement("meta");
    const previousRobotsContent = robotsMeta.getAttribute("content");

    if (!hadRobotsMeta) {
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }

    document.title = "הטבת נובמבר למאגר | תצוגה מוקדמת | הילית כספי";
    robotsMeta.setAttribute("content", "noindex, nofollow");

    return () => {
      document.title = previousTitle;
      if (!hadRobotsMeta) {
        robotsMeta.remove();
      } else if (previousRobotsContent === null) {
        robotsMeta.removeAttribute("content");
      } else {
        robotsMeta.setAttribute("content", previousRobotsContent);
      }
    };
  }, []);

  const scrollToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#fff8ef] font-['Rubik',sans-serif] text-[#25163f]">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#ffe8a8]/35 bg-[#27133f]/95 px-4 py-2 text-center text-xs font-black tracking-[0.02em] text-[#fff5d1] shadow-lg backdrop-blur-md sm:text-sm">
        תצוגה מוקדמת · המכירה עדיין לא נפתחה
      </div>

      <section className="relative isolate overflow-hidden bg-[#27133f] px-5 pb-20 pt-22 text-white md:px-8 md:pb-28 md:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_84%,rgba(244,97,151,.35),transparent_30%),radial-gradient(circle_at_89%_15%,rgba(255,216,120,.24),transparent_23%),linear-gradient(132deg,#210e36_0%,#4b1b5a_53%,#7c254e_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:28px_28px]" />
        <Heart className="absolute right-[8%] top-34 h-9 w-9 text-[#ffb0cb]/35" />
        <Heart className="absolute bottom-14 left-[8%] h-13 w-13 text-[#ffcf7a]/20" />
        <Heart className="absolute left-[29%] top-23 h-5 w-5 text-white/20" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffd972]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#fff0b9] shadow-lg backdrop-blur-sm">
              <Sparkle className="h-4 w-4" /> הטבת נובמבר חדשה · תכנון ל־1–30.11.2026
            </div>
            <h1 className="max-w-3xl text-[2.7rem] font-black leading-[1.04] tracking-[-0.045em] md:text-6xl lg:text-7xl">
              היכרות שמתחילה
              <span className="mt-2 block text-[#ffd978]">בדיוק שלך.</span>
            </h1>
            <p className="mt-6 flex flex-wrap items-center gap-3 text-[#fff0b9]">
              <strong className="text-3xl font-black">349 ₪</strong>
              <span className="text-base">במקום מחיר רגיל של <span className="line-through">499 ₪</span></span>
              <span className="rounded-full bg-[#ffd978] px-3 py-1.5 text-sm font-black text-[#2a153f]">כ־30% הנחה</span>
            </p>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/86 md:text-xl md:leading-9">
              בנובמבר מתוכננת הטבה חדשה להצטרפות למאגר הרווקים והרווקות: תהליך אישי יותר, מסגרת ברורה, והמדריך ״לבחור נכון״ במתנה.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/63 md:text-base">
              זהו דף הכנה בלבד. כאן אפשר להבין את פרטי ההטבה המתוכננת — בלי תשלום, בלי הרשמה ובלי שמירת מקום בשלב הזה.
            </p>
            <button
              type="button"
              onClick={scrollToDetails}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#ffd978] px-7 py-4 text-base font-black text-[#2a153f] shadow-[0_18px_46px_rgba(12,4,24,.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff3c8] active:scale-[0.97] md:text-lg"
            >
              לכל פרטי ההטבה
              <span aria-hidden="true" className="text-xl leading-none">↓</span>
            </button>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/62 md:text-sm">
              <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-[#ffabc5]" /> תשלום חד־פעמי מתוכנן</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-[#ffabc5]" /> מדריך במתנה</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-[#ffabc5]" /> תצוגה מוקדמת בלבד</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className="mx-auto w-full max-w-sm">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[2.4rem] border border-white/12" />
              <div className="absolute -inset-3 rounded-[2.15rem] bg-[#f58db4]/18 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/25 bg-[#351846] p-2 shadow-[0_34px_80px_rgba(13,5,24,.5)]">
                <img src={PROFILE_IMG} alt="הילית כספי" fetchPriority="high" className="aspect-[4/5] w-full rounded-[1.6rem] object-cover object-top" />
                <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/18 bg-[#29133c]/82 px-4 py-3 text-center shadow-xl backdrop-blur-md">
                  <p className="text-xs font-bold text-[#ffd978]">הילית כספי</p>
                  <p className="mt-1 text-sm font-black text-white">להכיר עם יותר הקשבה ודיוק</p>
                </div>
              </div>
              <div className="absolute -right-4 top-8 rounded-2xl border border-[#ffd978]/35 bg-[#fff5dd] px-4 py-3 text-center text-[#3d1a4f] shadow-xl">
                <p className="text-[10px] font-black">הטבת נובמבר</p>
                <p className="mt-0.5 text-xl font-black">349 ₪</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={detailsRef} id="november-details" className="scroll-mt-20 bg-[#fff8ef] px-5 py-18 md:px-8 md:py-26" aria-labelledby="november-details-title">
        <Reveal className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black text-[#a32d66]">מה מתוכנן לנובמבר</p>
            <h2 id="november-details-title" className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#2c1643] md:text-5xl">הצטרפות למאגר, עם כלי שעוזר לבחור נכון יותר.</h2>
            <p className="mt-5 text-base leading-8 text-[#68556e] md:text-lg">ההטבה מחברת בין הכניסה למאגר לבין הכנה אישית להיכרות. אלה הפרטים המתוכננים; פתיחת המכירה והזמינות כפופות להשלמת בדיקת הזכאות ותור השירות.</p>
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
            <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[2rem] border border-[#d8bee0] bg-white p-7 shadow-[0_20px_55px_rgba(66,25,77,.1)] md:p-9">
              <div className="absolute -left-12 -top-12 h-35 w-35 rounded-full bg-[#f8c5d9]/45 blur-2xl" />
              <div className="relative">
                <span className="inline-flex rounded-full bg-[#321748] px-3 py-1.5 text-xs font-black text-white">מאגר הרווקים והרווקות</span>
                <h3 className="mt-5 text-3xl font-black text-[#2c1643]">349 ₪</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-lg text-[#91758f] line-through">499 ₪</span>
                  <span className="rounded-full bg-[#fde7ae] px-3 py-1 text-xs font-black text-[#5c4216]">כ־30% פחות מהמחיר הרגיל</span>
                </div>
                <p className="mt-5 max-w-xl text-base leading-8 text-[#66556a]">מחיר ההטבה המתוכנן עבור ההצטרפות למאגר הוא 349 ₪ במקום מחיר רגיל של 499 ₪. מדובר בתשלום חד־פעמי בלבד, ולא בתוכנית Plus.</p>
                <ul className="mt-6 space-y-3 text-sm font-medium leading-6 text-[#4b3551]">
                  {[
                    "יצירת פרופיל אישי והוספת תמונה",
                    "שאלון והעדפות שמסייעים לבחון היכרות אפשרית",
                    "בחינת הצעות והתאמה הדדית לפני חשיפת פרטים",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#a32d66] text-[10px] text-white">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[2rem] bg-[#3a1b53] p-7 text-white shadow-[0_22px_58px_rgba(48,15,66,.25)] md:p-9">
              <Heart className="absolute -left-6 -top-6 h-28 w-28 text-[#ff9abb]/12" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd978]/35 bg-white/10 px-3 py-1.5 text-xs font-black text-[#ffe9a2]"><Sparkle className="h-3.5 w-3.5" /> במתנה בהטבה</span>
                <h3 className="mt-5 text-3xl font-black">המדריך ״לבחור נכון״</h3>
                <p className="mt-4 text-base leading-8 text-white/76">מדריך דיגיטלי עם שאלות ותרגילים שעוזרים לעשות סדר במה שחשוב לך, להבחין בין הרגל לבחירה ולהגיע להיכרות עם יותר בהירות.</p>
                <div className="mt-6 rounded-2xl border border-white/12 bg-white/8 p-4">
                  <p className="text-xs font-bold text-white/60">מחיר נפרד</p>
                  <p className="mt-1 text-2xl font-black text-[#ffe28b]">149 ₪</p>
                  <p className="mt-2 text-xs leading-6 text-white/65">במסגרת ההטבה המתוכננת, המדריך צפוי להינתן במתנה לצד ההצטרפות למאגר.</p>
                </div>
              </div>
            </motion.article>
          </div>
        </Reveal>
      </section>

      <section className="relative overflow-hidden bg-[#f7ebf0] px-5 py-18 md:px-8 md:py-24">
        <Heart className="absolute bottom-8 left-[8%] h-18 w-18 text-[#d95889]/10" />
        <Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[.84fr_1.16fr] md:gap-16">
          <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 rounded-[2rem] bg-[#edbad2]/45 blur-xl" />
            <img src={ABOUT_IMG} alt="הילית כספי" loading="lazy" decoding="async" className="relative aspect-[4/5] w-full rounded-[1.8rem] object-cover shadow-[0_24px_65px_rgba(84,26,68,.22)]" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <p className="text-sm font-black text-[#a32d66]">מה עומד מאחורי התהליך</p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#2c1643] md:text-5xl">להכיר אדם, לא רק נתונים על המסך.</h2>
            <p className="mt-6 text-lg leading-9 text-[#68556e]">המאגר נועד לפתוח מקום להיכרות על בסיס פרופיל, שאלון והעדפות — יחד עם בדיקה אנושית והסכמה של שני הצדדים לפני חשיפת פרטים.</p>
            <div className="mt-7 rounded-2xl border-r-4 border-[#c2487d] bg-white/75 p-5 text-sm font-bold leading-7 text-[#563d5b] shadow-sm">הצעת התאמה היא הזמנה לבחון היכרות אפשרית. היא אינה קובעת עבורך, ולא מחליפה את הבחירה החופשית של שני האנשים.</div>
          </motion.div>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#2d1647] px-5 py-20 text-white md:px-8 md:py-26" aria-labelledby="first-match-title">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_90%,rgba(239,104,158,.27),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,219,123,.18),transparent_23%)]" />
        <Reveal className="relative mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black text-[#ffdf8a]">מסגרת השירות המתוכננת</p>
            <h2 id="first-match-title" className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">מתי מתחילים לספור?</h2>
            <p className="mt-5 text-lg leading-8 text-white/75">שלושת הימים אינם נספרים מרגע צפייה בעמוד, ואינם מתחילים רק מהתשלום. הם מתחילים רק כשהתמונה המלאה מוכנה.</p>
          </motion.div>
          <div className="mt-11 grid gap-4 md:grid-cols-3">
            {[
              { number: "01", title: "אישור התשלום", copy: "הספירה תתחיל רק לאחר אישור תשלום, כששלב המכירה ייפתח." },
              { number: "02", title: "השלמת הפרופיל", copy: "פרופיל, תמונה, שאלון והעדפות צריכים להיות מלאים כדי שאפשר יהיה להתחיל בבחינה." },
              { number: "03", title: "עד 3 ימים קלנדריים", copy: "במסגרת ההטבה תישלח הצעת התאמה ראשונה בתוך עד 3 ימים קלנדריים מהשלמת שני התנאים." },
            ].map((step) => (
              <motion.article key={step.number} variants={fadeUp} className="rounded-[1.6rem] border border-white/13 bg-white/[0.07] p-6 text-right backdrop-blur-sm">
                <span className="text-4xl font-black text-[#ffdc84]/45">{step.number}</span>
                <h3 className="mt-4 text-xl font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/69">{step.copy}</p>
              </motion.article>
            ))}
          </div>
          <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#ffdf8a]/30 bg-[#fff4d8]/10 px-6 py-5 text-center text-sm font-bold leading-7 text-[#fff1cb]">זו התחייבות להצעת התאמה ראשונה בלבד. אין בכך התחייבות לדייט, למענה מצד אדם אחר, לאישור הדדי או לזוגיות.</motion.div>
        </Reveal>
      </section>

      <section className="bg-[#fff8ef] px-5 py-18 md:px-8 md:py-26" aria-labelledby="preview-guard-title">
        <Reveal className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="overflow-hidden rounded-[2rem] border border-[#dec8d7] bg-white shadow-[0_20px_60px_rgba(71,28,75,.1)] md:grid md:grid-cols-[.78fr_1.22fr]">
            <div className="bg-[linear-gradient(145deg,#7c2855_0%,#40194f_100%)] p-7 text-white md:p-10">
              <p className="text-sm font-black text-[#ffe391]">לפני שנפתחת המכירה</p>
              <h2 id="preview-guard-title" className="mt-3 text-3xl font-black leading-tight">לא מדלגים על ההכנה.</h2>
              <Heart className="mt-8 h-12 w-12 text-[#ffb4cf]" />
            </div>
            <div className="p-7 md:p-10">
              <p className="text-lg font-black text-[#2c1643]">אין כרגע קופה ב־349 ₪.</p>
              <p className="mt-4 text-base leading-8 text-[#68556e]">לפני השלמת מימוש הזכאות ותור השירות, לא ניתן לרכוש, להירשם או להתחיל תהליך דרך העמוד. השלב הבא יפורסם בנפרד, ורק לאחר שההכנה תושלם.</p>
              <div className="mt-6 rounded-2xl bg-[#fff3cf] px-5 py-4 text-sm font-bold leading-7 text-[#5c4520]">1.11 הוא מועד מתוכנן לפתיחת התוכנית — לא הפעלה אוטומטית של מכירה, תשלום או שירות.</div>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section className="bg-[#f7ebf0] px-5 py-18 md:px-8 md:py-24" aria-labelledby="faq-title">
        <Reveal className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-sm font-black text-[#a32d66]">שקיפות לפני הכול</p>
            <h2 id="faq-title" className="mt-3 text-3xl font-black text-[#2c1643] md:text-5xl">שאלות נפוצות</h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map(({ question, answer }) => (
              <motion.details key={question} variants={fadeUp} className="group rounded-2xl border border-[#dbc7d8] bg-white p-5 shadow-[0_8px_24px_rgba(77,29,71,.05)] md:p-6">
                <summary className="cursor-pointer list-none text-base font-black text-[#34203f] marker:hidden md:text-lg">
                  {question}
                  <span aria-hidden="true" className="float-left text-2xl font-medium leading-5 text-[#a32d66] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 border-t border-[#eadde8] pt-4 text-sm leading-7 text-[#695a6c]">{answer}</p>
              </motion.details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative overflow-hidden bg-[#321748] px-5 py-20 text-center text-white md:px-8 md:py-24">
        <Heart className="absolute left-[10%] top-8 h-14 w-14 text-white/10" />
        <Heart className="absolute bottom-8 right-[11%] h-9 w-9 text-[#ffd978]/18" />
        <Reveal className="relative mx-auto max-w-3xl">
          <motion.div variants={fadeUp} className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/18 bg-white/[0.07]"><Heart className="h-6 w-6 text-[#ffb0c8]" /></motion.div>
          <motion.h2 variants={fadeUp} className="mt-6 text-3xl font-black leading-tight md:text-4xl">ההטבה בדרך, אבל עדיין לא למכירה.</motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/70">אפשר לשמור את הפרטים ולחזור לכאן אחרי שתושלם ההכנה. עד אז, לא נבצע רכישה ולא נפעיל שירות מהעמוד הזה.</motion.p>
          <motion.button variants={fadeUp} type="button" disabled aria-disabled="true" className="mt-8 w-full cursor-not-allowed rounded-full border border-[#ffe49a]/25 bg-white/10 px-6 py-4 text-base font-black text-white/58 shadow-inner sm:w-auto sm:px-9">
            המכירה תיפתח לאחר השלמת ההכנה
          </motion.button>
          <motion.p variants={fadeUp} className="mt-5 text-xs font-medium text-white/44">מועד מתוכנן: 1.11.2026 · תוקף התוכנית המתוכנן: 1–30.11.2026</motion.p>
        </Reveal>
      </section>

      <footer className="bg-[#1d0d31] px-5 py-8 text-center">
        <nav aria-label="קישורי תחתית" className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-bold text-white/64">
          <a href="/" className="transition hover:text-[#ffe28b]">חזרה לבית</a>
          <a href="/terms/database" className="transition hover:text-[#ffe28b]">תקנון המאגר</a>
          <a href="/privacy" className="transition hover:text-[#ffe28b]">מדיניות פרטיות</a>
        </nav>
      </footer>
    </main>
  );
}
