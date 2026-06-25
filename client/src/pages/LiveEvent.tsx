/**
 * Live Q&A Event Landing Page
 * Event: יום שלישי 16/6/2026 20:30
 * Payment: Grow link (direct)
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { buildGrowUrl } from "@/lib/utils";

// CDN Image URLs
const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const ABOUT_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const COUPLE1     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp";
const COUPLE2     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp";
const COUPLE3     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp";

// Links
const GROW_PAYMENT = "https://pay.grow.link/OTkwNzQ~37ba5f3ada87872fd5446ded66942ebe-MzUwODUwMg";
const WA_GROUP     = "https://hilitcaspi.com/api/wa/site";
const WA_DIRECT    = "https://wa.me/972552442334";
const INSTAGRAM    = "https://www.instagram.com/hilitcaspi_relationship";
const ARTICLE_URL  = "https://www.atmag.co.il/ppost/%D7%94%D7%90%D7%99%D7%A9%D7%94-%D7%A9%D7%A4%D7%99%D7%A6%D7%97%D7%94-%D7%90%D7%AA-%D7%A7%D7%95%D7%93-%D7%94%D7%94%D7%AA%D7%90%D7%9E%D7%94-%D7%94%D7%96%D7%95%D7%92%D7%99%D7%AA/";
const EVENT_DATE   = new Date("2026-06-16T17:30:00Z"); // 20:30 Jerusalem

// Animation helpers
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
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

// Countdown Timer — RTL: ימים שעות דקות שניות
function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = EVENT_DATE.getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);

  const units = [
    { label: "ימים",  value: timeLeft.days },
    { label: "שעות",  value: timeLeft.hours },
    { label: "דקות",  value: timeLeft.minutes },
    { label: "שניות", value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-2 justify-center" dir="rtl">
      {units.map(({ label, value }) => (
        <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[68px]">
          <div className="text-3xl md:text-4xl font-black text-[#ffe27c] tabular-nums">
            {String(value).padStart(2, "0")}
          </div>
          <div className="text-white/60 text-xs mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Big CTA Button to Grow
function PayButton({ size = "large" }: { size?: "large" | "small" }) {
  const cls = size === "large"
    ? "inline-block bg-[#ffe27c] text-[#191265] font-black text-xl px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center w-full max-w-sm"
    : "inline-block bg-[#ffe27c] text-[#191265] font-black text-base px-7 py-3.5 rounded-xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-lg text-center";
  return (
    <a href={buildGrowUrl(GROW_PAYMENT)} target="_blank" rel="noopener noreferrer" className={cls}>
      ♡ שמרו לי מקום עכשיו
    </a>
  );
}

export default function LiveEvent() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToRegister = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* STICKY NAV */}
      <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">הילית כספי</a>
          <button onClick={scrollToRegister}
            className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105 shadow-lg">
            הרשמה לאירוע
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen bg-[#191265] overflow-hidden flex items-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16 grid md:grid-cols-2 gap-12 items-center w-full">

          {/* Text */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }} className="order-2 md:order-1 text-right">

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-bold px-4 py-2 rounded-full mb-5">
              🎙️ לייב זום | יום שלישי 16.6 | 20:30
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
              יש לי הפתעה לכם<br />
              <span className="text-[#ffe27c]">ואני כל כך מתרגשת לספר!</span>
            </h1>

            <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-3">
              ב-16.6 ביום שלישי בשעה 20:30 אני עושה לייב זום שבו אני עונה על הכל. ממש הכל. בלי פילטרים, בלי תסריטים.
            </p>
            <p className="text-white/80 text-lg leading-relaxed mb-5">
              רציתם לשאול אותי מה הסוד מאחורי ההתאמות שלי? איך המדע עובד? למה חלק מהאנשים מוצאים אהבה ואחרים תקועים באותו מקום שנים? מה הטעויות שאנשים עושים בדייטינג שאף אחד לא מדבר עליהן?
            </p>
            <p className="text-[#ffe27c] font-black text-xl mb-6">
              זו ההזדמנות שלכם לשאול אותי הכל. פנים אל פנים. בזמן אמת.
            </p>

            {/* BONUS BANNER */}
            <div className="bg-[#ffe27c] rounded-2xl p-5 mb-7 text-right">
              <p className="text-[#191265] font-black text-base mb-2">🎁 ועכשיו תשמעו את ההטבה שהכנתי לכם</p>
              <p className="text-[#191265]/90 text-sm leading-relaxed mb-3">
                50 הנרשמים הראשונים מקבלים ממני מתנה את המדריך שלי <strong>"לבחור נכון"</strong> שווי ₪249 לגמרי בחינם.
              </p>
              <p className="text-[#191265] font-black text-sm">
                כרטיס כניסה ללייב: <span className="line-through font-normal opacity-60">₪299</span> <span className="text-lg">₪99 בלבד</span> לחברי הקהילה שלי. מהרו לפני שהמחיר עולה!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <PayButton size="large" />
            </div>

            <div className="flex gap-6 pt-6 border-t border-white/10 flex-wrap" dir="rtl">
              {[
                { val: "16.6", label: "יום שלישי" },
                { val: "20:30", label: "שעת התחלה" },
                { val: "זום", label: "מצלמות פתוחות" },
                { val: "₪99", label: "במקום ₪299" },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-xl font-black text-[#ffe27c]">{val}</div>
                  <div className="text-white/50 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Image + Countdown */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="order-1 md:order-2 flex flex-col items-center gap-8">
            <div className="relative w-full max-w-sm">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img
                src={HERO_IMG}
                alt="הילית כספי"
                className="relative w-full rounded-3xl object-cover object-[center_20%] shadow-2xl"
                style={{ aspectRatio: "3/4", maxHeight: "480px" }}
              />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-xl">💛</div>
                <div className="text-[#191265] font-black text-xs">מומחית זוגיות</div>
                <div className="text-[#727272] text-xs">ומשדכת</div>
              </div>
            </div>

            <div className="w-full text-center">
              <p className="text-white/60 text-sm mb-3">האירוע מתחיל בעוד:</p>
              <Countdown />
            </div>
          </motion.div>
        </div>
      </section>

      {/* PAIN SECTION */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">את/ה מכיר/ה את התחושה הזו?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] leading-tight mb-8">
              יצאת לדייט נוסף.<br />
              <span className="text-[#1800ad]">שוב לא הרגשת כלום.</span><br />
              שוב שאלת את עצמך למה.
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: "😮‍💨", text: "\"אני כבר לא מאמין/ת שיש מישהו בשבילי\"" },
                { icon: "📱", text: "\"האפליקציות מתישות אותי, אבל אני לא יודע/ת מה עוד לעשות\"" },
                { icon: "🧠", text: "\"אני יודע/ת שמשהו בי עוצר אותי. אבל לא יודע/ת מה\"" },
              ].map(item => (
                <motion.div key={item.text} variants={fadeUp} className="bg-[#f0eadc] rounded-2xl p-6 text-right">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <p className="text-[#191265] font-semibold text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="bg-[#191265] rounded-3xl p-8 text-right mb-8">
              <p className="text-[#ffe27c] font-black text-xl md:text-2xl leading-relaxed mb-4">
                אני מאמינה בכם. לגמרי. בלי שאלות.
              </p>
              <p className="text-white/80 text-base leading-relaxed">
                אחרי שנים של ליווי מאות אנשים, אני יודעת דבר אחד בוודאות: לא קיים אדם שלא מסוגל לזוגיות. יש רק מוח שלמד לחבל. ויש שיטה לשנות את זה. בלייב הזה אני מסבירה הכל.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={WA_GROUP} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1da851] transition-all">
                💬 קבוצת הווטסאפ שלי
              </a>
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">
                📸 אינסטגרם | מדע האהבה
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* WHAT HAPPENS IN THE LIVE */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מה קורה בלייב</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] leading-tight">
                שעה אחת. שאלות אמיתיות.<br />
                <span className="text-[#1800ad]">תשובות שאין בשום מקום אחר.</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: "💬",
                  title: "שאלו אותי הכל ואני עונה",
                  text: "על דייטים שלא הלכו. על אפליקציות שמתישות. על הדפוסים שחוזרים. על איך מוצאים אנשים איכותיים. על לאן לצאת לדייט ראשון. על מה שעוצר אתכם. אין שאלה שאני לא עונה עליה בלי פילטרים.",
                },
                {
                  icon: "🧬",
                  title: "מדע האהבה בפעם הראשונה בלייב",
                  text: "אסביר איך מדע האהבה עובד. למה המוח שלנו בוחר בדיוק את מי שמזיק לנו. ואיך שוברים את הדפוס הזה פעם אחת ולתמיד. זו ההזדמנות שלכם לשאול אותי הכל.",
                },
                {
                  icon: "💎",
                  title: "המאגר הייחודי שבניתי",
                  text: "3,000 רווקים איכותיים. היי-טקיסטים, רופאות, לוחמים, אנשי עסקים. אספר איך הוא עובד, מה הופך אותו לשונה מכל דבר אחר, ואיך נכנסים.",
                },
                {
                  icon: "💛",
                  title: "אינטימי. אישי. עם מצלמות פתוחות.",
                  text: "זו הפעם הראשונה שאני עושה לייב כזה. כי רציתי להכיר אתכם. לראות את הפנים. לשמוע מה באמת מעסיק אתכם. לא הרצאה אלא שיחה אמיתית.",
                },
              ].map((item) => (
                <motion.div key={item.title} variants={fadeUp}
                  className="bg-white rounded-2xl p-7 text-right shadow-sm">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-black text-[#191265] mb-3">{item.title}</h3>
                  <p className="text-[#555] text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* GUIDE BONUS */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#1800ad] to-[#191265] border border-[#ffe27c]/30 rounded-3xl p-8 md:p-10 text-right">
              <div className="inline-block bg-[#ffe27c] text-[#191265] font-black text-sm px-4 py-1.5 rounded-full mb-5">
                🎁 בונוס מיוחד ל-50 הנרשמים הראשונים
              </div>

              <h3 className="text-3xl font-black text-white mb-2">
                המדריך <span className="text-[#ffe27c]">"לבחור נכון"</span>
              </h3>
              <p className="text-white/60 text-sm mb-5">מדריך דיגיטלי שווי ₪249 חינם לגמרי!</p>

              <p className="text-white/85 text-base leading-relaxed mb-6">
                המדריך שיעזור לכם להבין <strong className="text-white">מה באמת עוצר אתכם</strong>, לזהות את הדפוסים שחוזרים על עצמם בדייטים, ולבחור מתוך חופש ולא מתוך פחד, לחץ, או ייאוש.
              </p>

              <div className="grid md:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: "🧠", title: "4 דפוסי חשיבה", text: "שמעכבים אנשים ממציאת זוגיות ואיך מזהים אותם בעצמך" },
                  { icon: "✍️", title: "3 תרגילים מעמיקים", text: "לכל דפוס לעבודה אישית אמיתית, לא קריאה חטופה" },
                  { icon: "🎯", title: "כלים מעשיים", text: "לבחירה מתוך בהירות מי אתם ומה אתם מחפשים באמת" },
                ].map(item => (
                  <div key={item.title} className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-white font-black text-sm mb-1">{item.title}</div>
                    <div className="text-white/60 text-xs leading-relaxed">{item.text}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="line-through text-white/40 text-base">₪249</span>
                <span className="text-[#ffe27c] font-black text-xl">חינם ל-50 הנרשמים הראשונים</span>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* PRESS SECTION */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">כפי שסוקר בתקשורת</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265]">
                הילית בתקשורת
              </motion.h2>
            </div>

            <motion.div variants={fadeUp}>
              <a href={ARTICLE_URL} target="_blank" rel="noopener noreferrer"
                className="block bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow group">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative overflow-hidden">
                    <img
                      src={ABOUT_IMG}
                      alt="הילית כספי בכתבה במגזין את"
                      className="w-full h-64 md:h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-[#191265] text-white font-black text-xs px-3 py-1.5 rounded-full">
                      📰 מגזין "את"
                    </div>
                  </div>
                  <div className="p-8 text-right flex flex-col justify-center">
                    <p className="text-[#1800ad] font-semibold text-xs uppercase tracking-widest mb-3">כתבה מיוחדת</p>
                    <h3 className="text-2xl font-black text-[#191265] leading-tight mb-4">
                      "האישה שפיצחה את קוד ההתאמה הזוגית"
                    </h3>
                    <p className="text-[#555] text-sm leading-relaxed mb-6">
                      מגזין "את" הגדול בישראל פרסם כתבה מיוחדת על הילית כספי ועל השיטה הייחודית שפיתחה לאיתור זוגיות אמיתית. קראו את הסיפור המלא.
                    </p>
                    <span className="inline-flex items-center gap-2 text-[#191265] font-black text-sm">
                      לכתבה המלאה ←
                    </span>
                  </div>
                </div>
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ABOUT HILIT */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div variants={fadeUp} className="flex justify-center">
                <div className="relative">
                  <img
                    src={ABOUT_IMG}
                    alt="הילית כספי"
                    className="w-72 rounded-3xl shadow-2xl object-cover object-[center_20%]"
                    style={{ height: "380px" }}
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="text-right">
                <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">מי אני</p>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-6">
                  הילית כספי<br />
                  <span className="text-[#ffe27c]">פיצחתי את קוד ההתאמה הזוגית</span>
                </h2>

                <div className="space-y-4 text-white/80 text-base leading-relaxed mb-8">
                  <p>מאמנת זוגיות, משדכת, ומייסדת המאגר הגדול ביותר לרווקים בישראל.</p>
                  <p>פיתחתי אלגוריתם ייחודי המבוסס על מחקרים מוכחים שמנבאים הצלחה זוגית. לא אפליקציה. לא שדכן קלאסי. משהו אחר לגמרי.</p>
                  <p className="text-white font-semibold">שדכנית של היי-טקיסטים, רופאות, לוחמים ומפורסמים. מאגר של 3,000 רווקים איכותיים.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { n: "3,000+", label: "רווקים במאגר" },
                    { n: "200K+", label: "האזנות לפודקאסט" },
                    { n: "500+", label: "אנשים שליוויתי" },
                  ].map(({ n, label }) => (
                    <div key={label} className="text-center">
                      <div className="text-2xl font-black text-[#ffe27c]">{n}</div>
                      <div className="text-white/50 text-xs mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={WA_GROUP} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1da851] transition-all">
                    💬 קבוצת הווטסאפ שלי
                  </a>
                  <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">
                    📸 אינסטגרם
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">לקוחות ממליצים</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] leading-tight">
                הם הכירו. הם בחרו. הם בנו.<br />
                <span className="text-[#1800ad]">אחרי תהליך עם הילית.</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { photo: COUPLE1, names: "מיכל ואורי", when: "הכירו דרך המאגר, מרץ 2024", text: "הגעתי להילית אחרי 5 שנים של דייטינג מתיש. תוך 3 חודשים הבנתי לגמרי מה עצר אותי. אנחנו ביחד כבר שנה.", who: "מיכל, 34" },
                { photo: COUPLE2, names: "שירה ודניאל", when: "הכירו בתהליך ליווי, ינואר 2024", text: "חשבתי שאני יודעת מה אני מחפשת. הילית הראתה לי שחיפשתי בדיוק את מה שמזיק לי. היום אני בזוגיות הבריאה הראשונה שלי בחיים.", who: "שירה, 29" },
                { photo: COUPLE3, names: "נועה ואיתי", when: "הכירו דרך המאגר, נובמבר 2023", text: "הייתי בטוחה שהגיל שלי הוא מכשול. הילית הוכיחה לי שזה בדיוק ההפך. אנחנו מאורסים.", who: "נועה, 38" },
              ].map((t) => (
                <motion.div key={t.names} variants={fadeUp} className="bg-white rounded-2xl overflow-hidden shadow-xl">
                  <div className="relative h-48 overflow-hidden">
                    <img src={t.photo} alt={t.names} loading="lazy" className="w-full h-full object-cover object-[center_20%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191265]/80 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="text-white font-black text-sm">{t.names}</div>
                      <div className="text-[#ffe27c] text-xs">{t.when}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-[#ffe27c] text-sm mb-2">★★★★★</div>
                    <p className="text-[#555] text-sm leading-relaxed mb-3">"{t.text}"</p>
                    <p className="text-[#191265] text-xs font-semibold">{t.who}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* REGISTRATION / PAYMENT */}
      <section id="register" className="bg-[#191265] py-20 px-6" style={{ scrollMarginTop: "80px" }}>
        <AnimatedSection>
          <div className="max-w-lg mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-3">הרשמה לאירוע</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white leading-tight mb-6">
              יום שלישי, 16.6<br />
              <span className="text-[#ffe27c]">20:30 | זום</span>
            </motion.h2>

            {/* VALUE BOX */}
            <motion.div variants={fadeUp} className="bg-[#ffe27c] rounded-2xl p-6 mb-6 text-right">
              <p className="text-[#191265] font-black text-lg mb-3">מה כלול:</p>
              <ul className="text-[#191265]/85 text-sm space-y-2 mb-4">
                <li>✅ <strong>שעה שלמה של לייב אישי עם הילית</strong> שאלות ותשובות, מצלמות פתוחות</li>
                <li>✅ <strong>המדריך "לבחור נכון" שווי ₪249 חינם</strong> ל-50 הנרשמים הראשונים</li>
                <li>✅ קישור זום ותזכורת למייל לפני האירוע</li>
              </ul>
              <div className="flex items-center gap-3 justify-end">
                <span className="line-through text-[#191265]/50 text-base">₪299</span>
                <span className="text-[#191265] font-black text-2xl">₪99 בלבד</span>
              </div>
              <p className="text-[#191265]/70 text-xs mt-1">לחברי הקהילה שלי. מהרו לפני שהמחיר עולה!</p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
              <PayButton size="large" />
              <p className="text-white/50 text-xs">לחיצה על הכפתור תעביר אתכם לדף התשלום המאובטח</p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 pt-8 border-t border-white/10">
              <p className="text-white/60 text-sm mb-4">רוצים לשלוח שאלה מראש? אפשר גם בווטסאפ:</p>
              <div className="flex flex-col gap-3">
                <a href={WA_DIRECT} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1da851] transition-all text-sm">
                  📱 שלחו לי שאלה בווטסאפ
                </a>
                <a href={WA_GROUP} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all text-sm">
                  💬 הצטרפות לקבוצת הווטסאפ שלי
                </a>
                <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm">
                  📸 אינסטגרם | תכנים על מדע האהבה
                </a>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* FAQ */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265]">שאלות שאנשים שואלים</motion.h2>
            </div>
            <div className="space-y-4">
              {[
                { q: "האם האירוע מיועד לנשים בלבד?", a: "לא! האירוע מיועד לנשים ולגברים כאחד. כל מי שמחפש זוגיות, בכל גיל ורקע, מוזמן." },
                { q: "האם תהיה הקלטה?", a: "האירוע הוא לייב בלבד. אם תרצו לשמוע שוב, תצטרכו להיות שם." },
                { q: "מה קורה אם לא יכולים להגיע בשעה הזו?", a: "האירוע מתקיים ב-20:30 בזום. אם לא תוכלו להגיע, אפשר לשלוח שאלות מראש בווטסאפ ואני אענה עליהן בלייב." },
                { q: "מה כלול ב-₪99?", a: "שעה שלמה של לייב עם הילית, קישור זום מיד אחרי ההרשמה, תזכורת לפני האירוע, והמדריך 'לבחור נכון' (שווי ₪249) חינם ל-50 הנרשמים הראשונים." },
                { q: "האם אפשר לשאול שאלות אישיות?", a: "כן. זה בדיוק הרעיון. אפשר לשאול על מצב אישי, על דייט ספציפי, על קשר שלא עבד. אני עונה בכנות ובלי פילטרים." },
                { q: "איך שולחים שאלה מראש?", a: "אפשר לשלוח שאלות מראש בווטסאפ. לא כולם יספיקו לשאול בלייב אז ממליצה להכין שאלות מראש." },
              ].map(({ q, a }) => (
                <motion.div key={q} variants={fadeUp} className="bg-white rounded-2xl p-6 text-right shadow-sm">
                  <h3 className="text-[#191265] font-black text-base mb-2">{q}</h3>
                  <p className="text-[#555] text-sm leading-relaxed">{a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.div variants={fadeUp} className="text-5xl mb-6">💛</motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
              בואו לשמוע. בואו לשאול.<br />
              <span className="text-[#ffe27c]">בואו להכיר את חברי הקהילה האיכותית שלי.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/80 text-lg leading-relaxed mb-8">
              אולי זו ההזדמנות שלכם לשאול אותי הכל. להבין למה עד עכשיו זה לא עבד ומה עושים אחרת.
              <br />
              <span className="text-[#ffe27c] font-semibold">₪99 בלבד במקום ₪299. המדריך לבחור נכון שווי ₪249 חינם ל-50 הנרשמים הראשונים.</span>
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
              <PayButton size="large" />
              <div className="flex gap-3 flex-wrap justify-center">
                <a href={WA_GROUP} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1da851] transition-all">
                  💬 קבוצת הווטסאפ שלי
                </a>
                <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">
                  📸 אינסטגרם
                </a>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

    </div>
  );
}
