/**
 * DatabaseSales - דף מכירה למאגר הרווקים הבלעדי
 * עיצוב: Deep navy #191265, warm cream #f0eadc, gold #ffe27c
 */

import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import { track } from "@/lib/track";
import { buildDatabaseJoinHref, buildLiveDatabaseJoinHref } from "@/lib/landingPageExperiment";
import { trackViewContent } from "@/lib/metaPixel";
import { gaViewItem } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";

const CASUAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const SMILING_IMG = "/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg";
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
  { num: 1, title: "שאלון DNA זוגי", desc: "ממלאים שאלון שעוזר לזהות דפוסים, העדפות ומה חשוב בתוך קשר. אלה תובנות שיכולות לדייק את תהליך ההיכרות." },
  { num: 2, title: "פרופיל אישי", desc: "מוסיפים תמונה וכמה משפטים על עצמכם. כל פרופיל נבדק לפני הכניסה למאגר." },
  { num: 3, title: "כניסה למאגר", desc: "תשלום חד-פעמי. אין דמי חבר חודשיים, אין הפתעות. משלמים פעם אחת ונכנסים." },
  { num: 4, title: "המערכת בודקת", desc: "המערכת משווה בין פרופילים, העדפות ושאלונים. הציון הוא כלי עזר, וההתאמות האפשריות עוברות בדיקה אנושית לפני שליחה." },
  { num: 5, title: "אישור הדדי", desc: "שניכם מקבלים מייל ומחליטים בנפרד אם להתקדם לפגישה. רק אם שניכם אמרתם כן, הפרטים נחשפים. אם אחד מכם לא מעוניין, לא קורה כלום, וממשיכים הלאה עד שמגיעה ההתאמה הבאה." },
];

export function DatabaseSalesContent({ campaign }: { campaign?: "live" } = {}) {
  const isLiveOffer = campaign === "live";
  const liveSales = trpc.liveOctober.salesStatus.useQuery(undefined, { enabled: isLiveOffer });
  const liveGiftOpen = liveSales.data?.databaseGiftOpen === true;
  // Track database page view
  React.useEffect(() => {
    track({ eventType: "database_view", page: isLiveOffer ? "/live/database" : "/database" });
    trackViewContent({ content_name: "מאגר רווקים", content_category: "matchmaking" });
    gaViewItem("database");
  }, [isLiveOffer]);
  const [scrolled, setScrolled] = useState(false);
  const search = useSearch();
  const isNowHolidayOffer = !isLiveOffer && new URLSearchParams(search).get("coupon")?.toUpperCase() === "NOW";
  const joinHref = useMemo(
    () => isLiveOffer
      ? buildLiveDatabaseJoinHref(search, window.sessionStorage, window.localStorage)
      : buildDatabaseJoinHref(search, window.sessionStorage, window.localStorage),
    [isLiveOffer, search],
  );
  // Never redirect a visitor on this gift page to a checkout without LIVE.
  const offerLocked = isLiveOffer && !liveGiftOpen;
  const actionHref = offerLocked ? "#live-offer" : joinHref;
  const actionLabel = isLiveOffer
    ? offerLocked ? "פרטי הטבת המאגר והלייב" : "להצטרפות למאגר עם כרטיס במתנה"
    : isNowHolidayOffer ? "הצטרפות עם קוד NOW" : "הצטרפות למאגר";
  const trackJoinClick = (placement: "navbar" | "hero" | "final") => {
    track({
      eventType: "database_cta",
      page: isLiveOffer ? "/live/database" : "/database",
      metadata: { destination: offerLocked ? "#live-offer" : "/join", placement, experiment: isLiveOffer ? "live_october_2026" : "database_lp_test_sep2026" },
    });
  };

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
          <div className="flex items-center gap-4">
            <a href={actionHref} onClick={() => trackJoinClick("navbar")} className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105 cursor-pointer">
              {actionLabel}
            </a>
            <Link href="/">
              <span className="text-white/80 hover:text-[#ffe27c] text-sm cursor-pointer transition-colors">חזרה לאתר →</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] pt-28 pb-20 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 85%, #ffe27c 0%, transparent 45%), radial-gradient(circle at 85% 15%, #1800ad 0%, transparent 45%)" }} />
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85 }} className="text-right">
            <div className="inline-block bg-[#ffe27c]/15 border border-[#ffe27c]/35 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              {isLiveOffer ? "✦ הצטרפות למאגר + כרטיס ללייב אונליין בזום במתנה" : isNowHolidayOffer ? "✦ הטבת חג עד 1.10" : "✦ הדור הבא של matchmaking"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
              לא שידוך.<br />
              לא אפליקציה.<br />
            <span className="text-[#ffe27c]">משהו אחר לגמרי.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              {isLiveOffer
                ? "הקמתי את המאגר כדי להכיר אנשים לעומק, לא רק לראות תמונה ולגלול הלאה. השאלון הזוגי, הפרופיל וההעדפות עוזרים לי לזהות חיבורים שכדאי לבחון מקרוב, ולתת להיכרות התחלה אחרת."
                : "בניתי שיטה שלוקחת את כל מה שטוב בכל אחד מהעולמות: גם המראה חשוב, גם הפרמטרים הבסיסיים, וגם הדפוסים הפנימיים שמנבאים אהבה שתחזיק לאורך שנים. לא בחרתי בין הגישות. שילבתי את כולן."}
            </p>
            {isLiveOffer && (
              <div className="mb-7 rounded-2xl border border-[#ffe27c]/55 bg-white/10 p-5 text-white shadow-lg backdrop-blur-sm">
                <p className="text-sm font-black text-[#ffe27c]">הצעה מיוחדת למצטרפים חדשים למאגר</p>
                <p className="mt-2 text-2xl font-black">מצטרפים למאגר ב־299 ₪ ומקבלים כרטיס ללייב שלי בזום במתנה</p>
                <p className="mt-2 text-sm leading-7 text-white/85">ממלאים שאלון ויוצרים פרופיל במאגר, וכרטיס אחד למפגש אונליין איתי בזום נוסף במתנה. אין צורך להגיע לשום מקום או להזין קוד הטבה.</p>
              </div>
            )}
            {isNowHolidayOffer && (
              <div className="mb-7 rounded-2xl border border-[#ffe27c]/45 bg-white/10 p-4 text-white shadow-lg backdrop-blur-sm">
                <p className="text-sm font-bold text-[#ffe27c]">קוד NOW בתוקף עד 1.10 · עד 200 מימושים בסך הכול</p>
                <p className="mt-1 text-3xl font-black">299 ₪ <span className="text-base font-normal text-white/50 line-through">499 ₪</span></p>
                <p className="mt-2 text-sm leading-6 text-white/85">תשלום חד-פעמי וגם הצעת התאמה ראשונה בתוך 3 ימים מהשלמת הפרופיל והשאלון.</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={actionHref} onClick={() => trackJoinClick("hero")} className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center cursor-pointer block">♡ {actionLabel}</a>
              {isLiveOffer ? <a href="#how-it-works" className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center cursor-pointer block">איך עובד המאגר?</a> : <Link href={DNA_QUIZ_URL}>
                <span className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center cursor-pointer block">
                  🧬 שאלון DNA חינמי קודם
                </span>
              </Link>}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.2 }} className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={isLiveOffer ? SMILING_IMG : CASUAL_IMG} alt="הילית כספי מחייכת" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" fetchPriority="high" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-[#191265] font-black text-lg">התאמה לעומק</div>
                <div className="text-[#727272] text-xs">שאלון, נתונים ובדיקה אנושית</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {isLiveOffer && (
        <section id="live-offer" className="scroll-mt-24 bg-[#fff8e8] px-6 py-16 md:py-20" aria-labelledby="live-offer-title">
          <div className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] border border-[#e3cb78] bg-white p-7 shadow-[0_20px_65px_rgba(25,18,101,.1)] md:grid-cols-[1.25fr_.75fr] md:p-10">
            <div className="text-right">
              <p className="text-xs font-black tracking-wider text-[#594593]">הטבת הלייב · למצטרפים חדשים למאגר</p>
              <h2 id="live-offer-title" className="mt-3 text-3xl font-black leading-tight text-[#191265] md:text-4xl">אני רוצה להכיר אתכם במאגר. <span className="text-[#4e3eb4]">ואז לפגוש אתכם בלייב בזום.</span></h2>
              <p className="mt-4 text-base leading-8 text-[#625d78]"><>בהצטרפות למאגר ב־299 ₪ ממלאים שאלון זוגי ופרופיל, ואני בוחנת חיבורים שיכולים להתאים. למצטרפים חדשים דרך העמוד הזה מחכה גם <strong className="text-[#191265]">כרטיס אחד במתנה למפגש אונליין בזום ב־31.10 בשעה 20:30</strong>. מחיר הכרטיס בנפרד הוא 149 ₪.</></p>
              <p className="mt-4 rounded-xl bg-[#f5efff] px-4 py-3 text-sm font-bold leading-6 text-[#191265]">כרטיס המתנה נוסף אוטומטית להצטרפות דרך העמוד הזה. הכרטיס האישי ללייב יישלח לכתובת המייל שלך לאחר אישור התשלום ויופיע גם בדף התודה ובאזור האישי. קישור הכניסה לזום יישלח לקראת המפגש.</p>
              {offerLocked && <p className="mt-4 text-sm font-bold text-[#75591e]">{liveSales.isLoading ? "בודקים את זמינות ההטבה. עוד רגע אפשר יהיה להמשיך בהרשמה." : "ההטבה אינה זמינה כרגע. לא נבצע רכישה בלי הכרטיס במתנה מהעמוד הזה."}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {liveGiftOpen ? <a href={joinHref} onClick={() => trackJoinClick("hero")} className="rounded-2xl bg-[#191265] px-7 py-4 text-sm font-black text-white transition hover:bg-[#30247e]">להצטרפות למאגר ולקבלת הכרטיס</a> : <span className="rounded-2xl border border-[#191265]/20 px-7 py-4 text-sm font-black text-[#191265]">ממתינים לאימות ההטבה</span>}
                <a href="#about-live" className="text-sm font-bold text-[#4e3eb4] underline underline-offset-4">מה יהיה בלייב?</a>
              </div>
            </div>
            <div className="self-center rounded-[1.5rem] bg-[#191265] p-7 text-center text-white">
              <p className="text-xs font-black tracking-wider text-[#ffe27c]">מתנת הצטרפות למצטרפים חדשים</p>
              <p className="mt-5 text-5xl font-black text-[#ffe27c]">299 ₪</p>
              <p className="mt-2 text-sm text-white/75">מאגר · תשלום חד־פעמי</p>
              <div className="my-6 h-px bg-white/20" />
              <p className="text-lg font-black">+ כרטיס אחד ללייב במתנה</p>
              <p className="mt-2 text-xs text-white/70">כרטיס רגיל בנפרד: 149 ₪</p>
              <p className="mt-4 text-sm font-bold text-[#ffe27c]">מספר המקומות בלייב מוגבל.</p>
              <div className="mt-6 rounded-xl border border-[#ffe27c]/35 bg-white/10 px-4 py-3 text-sm"><strong className="text-[#ffe27c]">כרטיס המתנה כלול בהצטרפות</strong><span className="mt-1 block text-xs text-white/65">נוסף אוטומטית, בלי צורך בקוד הטבה</span></div>
            </div>
          </div>
        </section>
      )}

      {isLiveOffer && (
        <section id="about-live" className="scroll-mt-24 bg-[#fffdf8] px-6 py-16" aria-labelledby="about-live-title">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#e9dec6] bg-white p-7 shadow-[0_18px_45px_rgba(25,18,101,.06)] md:p-10">
            <p className="text-sm font-black text-[#4e3eb4]">לראשונה, מפגש לייב אונליין איתי בזום</p>
            <h2 id="about-live-title" className="mt-3 text-3xl font-black text-[#191265] md:text-4xl">מה באמת קורה מאחורי ההתאמה?</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#625d78]">בערב אחד אפתח את מאחורי הקלעים של השיטה שבניתי, אראה מה עוזר לפרופיל לעבוד טוב יותר ואדבר על הדברים שאני מחפשת כשאני בוחנת התאמה. אחרי ההרשמה תוכלו לשלוח לי שאלה מראש, ואביא שאלות מהקהל לשיחה החיה.</p>
            <div className="mt-7 grid gap-3 text-sm font-bold text-[#191265] md:grid-cols-3">
              <div className="rounded-2xl bg-[#f8f4ea] p-4">איך השאלון, ההעדפות וההיכרות האישית מתחברים</div>
              <div className="rounded-2xl bg-[#f8f4ea] p-4">מה כדאי להראות בתמונות ובפרופיל שלכם</div>
              <div className="rounded-2xl bg-[#f8f4ea] p-4">השאלות שתמיד רציתם לשאול אותי על היכרות</div>
            </div>
            <a href="#live-offer" className="mt-7 inline-flex rounded-2xl bg-[#191265] px-6 py-3 text-sm font-black text-white transition hover:bg-[#30247e]">חזרה לפרטי ההצטרפות למאגר</a>
          </div>
        </section>
      )}

      {/* ── THE PROBLEM: WHY EVERYTHING ELSE FAILS ── */}
      <section id="how-it-works" className="scroll-mt-20 py-20 px-6 bg-white">
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
                לא רק תמונה או גיל.<br />
                <span className="text-[#ffe27c]">גם מה שקורה בין השורות.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/65 text-lg max-w-2xl mx-auto leading-relaxed">
                השאלון, הפרופיל וההעדפות נבחנים יחד עם דפוסים של קרבה, ערכים וקצב חיים. מחשב מזהה אפשרויות, אבל בדיקה אנושית והסכמה הדדית הן חלק בלתי נפרד מהתהליך.
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
              <div className="text-[#ffe27c] font-black text-5xl mb-2">2 שכבות</div>
              <p className="text-white/80 text-lg font-semibold mb-2">חישוב התאמה ובדיקה אנושית</p>
              <p className="text-white/55 text-base max-w-xl mx-auto leading-relaxed">
                {isLiveOffer
                  ? "המערכת מזהה חיבורים אפשריים, ואני בוחנת את הפרופילים, ההעדפות וההתאמה הכוללת לפני שמציעים לשני הצדדים להכיר."
                  : "הציון עוזר לזהות התאמות אפשריות, אבל אינו מבטיח קשר או תוצאה. לפני שליחה נבדקים תנאי הסף, הפרופילים וההתאמה הכוללת, ורק אז מתקבלת החלטה אם להציע אותה לשני הצדדים."}
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
                אחרי שהמערכת מזהה התאמה אפשרית, היא מגיעה לבדיקה אנושית. אני בוחנת את המאפיינים של שני הצדדים, את הפרופילים ואת תנאי הסף שהגדירו.
              </p>
              <p>
                הציון אינו תחליף לשיקול דעת. יש דברים שרק עין אנושית רואה. <span className="font-bold text-[#191265]">{isLiveOffer ? "אני מכירה את האנשים שמאחורי הנתונים, ולכן בוחנת כל חיבור לפני שהוא מגיע אליכם." : "השילוב בין נתונים לבדיקה אנושית נועד לשמור על רלוונטיות בלי להבטיח התאמה או תדירות קבועה."}</span>
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
            {!isLiveOffer && <motion.p variants={fadeUp} className="text-center text-[#727272] text-xs mt-10 max-w-xl mx-auto leading-relaxed">
              זמן ההמתנה משתנה מאדם לאדם ותלוי בהתאמה הדדית למאפיינים ולהעדפות של שני הצדדים.
            </motion.p>}
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

      {/* ── VERIFIED OUTCOMES ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">תוצאות, לא רק הרשמות</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] mb-2">אנחנו מודדים את הדרך עד הקשר.</motion.h2>
              <motion.p variants={fadeUp} className="text-[#727272] text-base max-w-2xl mx-auto leading-relaxed">כל הצעה, אישור הדדי, שיחה, פגישה והמשכיות נכנסים למעקב. כך אפשר לשפר את ההתאמות ולפרסם רק תוצאות שנבדקו ואושרו.</motion.p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { num: "1", title: "הצעה ואישור", text: "אנחנו מודדים אם ההצעה נפתחה, האם כל צד אישר והאם נחשפו פרטים." },
                { num: "2", title: "שיחה ופגישה", text: "המעקב בודק אם נוצר קשר, אם נקבעה פגישה ומה קרה לאחריה." },
                { num: "3", title: "המשכיות וזוגיות", text: "תוצאה מפורסמת רק לאחר אימות והסכמה מפורשת לשימוש בשם, בציטוט או בתמונה." },
              ].map((item) => (
                <motion.div key={item.num} variants={fadeUp} className="bg-[#f8f6f0] rounded-2xl p-6 border border-[#e9e8e8] text-right">
                  <div className="w-10 h-10 rounded-full bg-[#191265] text-[#ffe27c] font-black flex items-center justify-center mb-4">{item.num}</div>
                  <h3 className="font-black text-[#191265] mb-2">{item.title}</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">{item.text}</p>
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
              ממלאים שאלון DNA, יוצרים פרופיל, והמערכת ואני בודקות התאמות רלוונטיות. תשלום חד-פעמי, ללא דמי חבר חודשיים.
            </motion.p>
            <motion.div variants={fadeUp}>
              <a href={actionHref} onClick={() => trackJoinClick("final")}>
                <span className="inline-block bg-[#ffe27c] text-[#191265] font-black text-xl px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl cursor-pointer">
                  ♡ {actionLabel}
                </span>
              </a>
            </motion.div>
            {!isLiveOffer && <motion.p variants={fadeUp} className="text-white/50 text-xs mt-5 max-w-lg mx-auto leading-relaxed">
              אין התחייבות למספר התאמות או לתדירות קבועה. כל הצעה נשלחת רק לאחר שנמצאה התאמה הדדית ורלוונטית.
            </motion.p>}
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

export default function DatabaseSales() {
  return <DatabaseSalesContent />;
}
