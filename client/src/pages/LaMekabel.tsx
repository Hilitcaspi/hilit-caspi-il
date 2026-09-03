/**
 * LaMekabel - דף נחיתה חינמי
 * נושא: "למקבל בתחילת קשר" + טיפים להשיג גבר שאת רוצה
 * Route: /lamekabel
 * מוביל ל: /guide (דף מכירה המדריך ₪149)
 */
import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";

const HILIT_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";

const GUIDE_URL = "/guide?utm_source=instagram&utm_medium=reel&utm_campaign=lamekabel&utm_content=landing_page";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
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

function CTAButton({ label = "לקריאת המדריך המלא ←", className = "" }: { label?: string; className?: string }) {
  return (
    <Link href={GUIDE_URL}>
      <button className={`bg-[#ffe27c] text-[#191265] font-black text-lg px-10 py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl ${className}`}>
        {label}
      </button>
    </Link>
  );
}

export default function LaMekabel() {
  useEffect(() => {
    track({ eventType: "page_view", page: "/lamekabel" });
    trackViewContent({ content_name: "למקבל בתחילת קשר", content_category: "landing" });
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* NAV */}
      <nav className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-white/70 hover:text-white text-sm transition-colors">הילית כספי</Link>
        <Link href={GUIDE_URL}>
          <button className="bg-[#ffe27c] text-[#191265] font-bold text-sm px-5 py-2 rounded-full hover:bg-white transition-all">
            המדריך המלא ₪149
          </button>
        </Link>
      </nav>

      {/* HERO */}
      <section className="bg-[#191265] py-16 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
              הטריק המוחי שאף אחד לא מלמד אותך
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-5">
              למקבל בתחילת קשר
              <br />
              <span className="text-[#ffe27c]">ולמה זה הדבר הכי חכם שתעשי</span>
            </h1>
            <p className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
              כשאת מאוד מתלהבת ממישהו, המוח שלך עובד בדיוק כמו בהתמכרות. דופמין, ציפייה, מחשבות שחוזרות שוב ושוב. יש טריק אחד שמשנה את כל המשחק.
            </p>
            <CTAButton label="רוצה את כל הכלים? לחצי כאן ←" />
          </motion.div>
        </div>
      </section>

      {/* WHAT IS LAMEKABEL */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">
              מה זה בכלל "למקבל"?
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] mb-6 leading-tight">
              זו לא משחק. זו מניפולציה חכמה על המוח שלך.
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5 text-[#444] text-base leading-relaxed">
              <p>
                כשאנחנו מתחילות קשר חדש ומרגישות התלהבות גדולה, קורה משהו ביולוגי. המוח מציף אותנו בדופמין, בדיוק כמו בהתמכרות. אנחנו בודקות את הטלפון כל שתי דקות. חושבות עליו בלי הפסקה. מאבדות את עצמנו.
              </p>
              <p>
                "למקבל" זה לא לשחק קשה ולא להיות קרה. זה לעשות מניפולציה מודעת על המוח שלך. להכניס לו מתחרה. לצלול לעבודה, לשקוע בתחביב, להתחיל פרויקט חדש, לצאת לאימון. לא כי הוא לא שווה את תשומת הלב, אלא כי את שווה את שלך.
              </p>
              <p>
                כשאת מלאה בחיים שלך, את לא מחכה לו. את לא בודקת את הטלפון כל שתי דקות. את פשוט חיה. וזה, אגב, גם הדבר הכי מושך שיש.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* THE BRAIN SCIENCE */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-3">
              מה קורה במוח שלך
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white mb-8 leading-tight">
              ההתלהבות מתחילת קשר היא כמו סם. ממש.
            </motion.h2>
            <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-5">
              {[
                { icon: "🧠", title: "דופמין", text: "כל הודעה ממנו מציפה את המוח בדופמין. אותו מנגנון שמכניס אנשים להתמכרויות. את לא חלשה, את ביולוגית." },
                { icon: "⏳", title: "ציפייה", text: "המוח שלך לא נהנה מהרגע, הוא נהנה מהציפייה. לכן ההמתנה לתגובה מרגישה כל כך אינטנסיבית." },
                { icon: "🔄", title: "לולאה", text: "ככל שאת שמה יותר פוקוס עליו, כך המוח מגביר את ההתמכרות. הפתרון הוא לשבור את הלולאה." },
              ].map(({ icon, title, text }) => (
                <div key={title} className="bg-white/10 border border-white/20 rounded-2xl p-6 text-right">
                  <div className="text-3xl mb-3">{icon}</div>
                  <h3 className="text-[#ffe27c] font-black text-lg mb-2">{title}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* 5 TIPS */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">
              5 טיפים מהקליניקה שלי
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] mb-8 leading-tight">
              איך להשיג את הגבר שאת רוצה בלי לאבד את עצמך
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5">
              {[
                {
                  num: "01",
                  title: "הכניסי מתחרה למוח שלך",
                  text: "בחרי פרויקט אחד שמרגש אותך ותתחילי אותו ברגע שאת מרגישה שאת מאבדת פוקוס. עבודה, קורס, ספר, אימון. לא כי הוא לא חשוב, אלא כי את חשובה יותר.",
                },
                {
                  num: "02",
                  title: "שמרי על קצב ולא על עצירה",
                  text: "למקבל זה לא להיעלם. זה לא לענות מיד לכל הודעה. זה לחיות את החיים שלך בקצב שלך. ההבדל בין מי שמחכה לו ובין מי שהוא מחכה לה הוא הקצב.",
                },
                {
                  num: "03",
                  title: "דאגי לעצמך לפני שאת דואגת לו",
                  text: "כל פעם שאת מוצאת את עצמך חושבת עליו יותר משאת חושבת על עצמך, זה הסימן. שאלי את עצמך: מה אני צריכה עכשיו? לא מה הוא צריך.",
                },
                {
                  num: "04",
                  title: "אל תבטלי תוכניות בגללו",
                  text: "אחת הטעויות הכי נפוצות בתחילת קשר היא לבטל תוכניות עם חברות, עם משפחה, עם עצמך, כדי להיות זמינה. זה מסמן זמינות יתר. שמרי על לוח הזמנים שלך.",
                },
                {
                  num: "05",
                  title: "בחרי ממקום של שפע ולא ממקום של פחד",
                  text: "ההבדל בין אישה שמושכת גברים לבין אישה שרודפת אחריהם הוא פנימי. כשאת מלאה בחיים שלך, את בוחרת אותו. כשאת ריקה, את זקוקה לו. הגברים מרגישים את ההבדל.",
                },
              ].map(({ num, title, text }) => (
                <div key={num} className="bg-white rounded-2xl p-6 flex gap-5 items-start shadow-sm">
                  <div className="text-[#ffe27c] font-black text-3xl leading-none flex-shrink-0 bg-[#191265] w-12 h-12 rounded-xl flex items-center justify-center text-sm">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-[#191265] font-black text-lg mb-2">{title}</h3>
                    <p className="text-[#555] text-sm leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* HILIT INTRO */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <motion.div variants={fadeUp} className="order-2 md:order-1 text-right">
                <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מי אני</p>
                <h2 className="text-3xl font-black text-[#191265] mb-5 leading-tight">
                  הילית כספי
                  <br />
                  <span className="text-[#727272] font-bold text-xl">Relationship Expert & Matchmaker</span>
                </h2>
                <div className="space-y-4 text-[#444] text-base leading-relaxed">
                  <p>
                    עשרים שנה של עבודה קלינית עם מאות נשים לימדו אותי משהו אחד: הבעיה כמעט אף פעם לא היא שלא מצאת את הגבר הנכון. הבעיה היא שאת לא יודעת לזהות אותו כשהוא עומד מולך.
                  </p>
                  <p>
                    פיתחתי שיטה שמבוססת על פסיכולוגיה חיובית ועל מה שבאמת עובד בזוגיות, לא על מה שאנחנו חושבות שעובד. המדריך שלי הוא השלב הראשון בתהליך הזה.
                  </p>
                </div>
              </motion.div>
              <motion.div variants={fadeUp} className="order-1 md:order-2 flex justify-center">
                <img src={HILIT_PHOTO} alt="הילית כספי" className="w-64 h-80 object-cover rounded-3xl shadow-2xl" />
              </motion.div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* FROM CLINIC SECTION */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-3">
              מהקליניקה שלי
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white mb-8 leading-tight">
              מה שאני רואה שוב ושוב אצל נשים שמצאו זוגיות
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-5">
              {[
                "הן הפסיקו לנסות להרשים ולהתחיל לבחור. הן הבינו שהן הבוחרות, לא הנבחרות.",
                "הן למדו לזהות את ההבדל בין גבר שמתאים להן לבין גבר שמרגש אותן. זה לא אותו דבר.",
                "הן הפסיקו לבדוק את הטלפון כל שתי דקות ולהתחיל לחיות. ומשם הכל השתנה.",
                "הן הבינו שהמשיכה שהן מחפשות לא מגיעה מהגבר. היא מגיעה מתוכן.",
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start bg-white/10 border border-white/20 rounded-2xl p-5">
                  <span className="text-[#ffe27c] text-xl flex-shrink-0">💛</span>
                  <p className="text-white/85 text-base leading-relaxed">{text}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA TO GUIDE */}
      <section className="bg-[#ffe27c] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-4 leading-tight">
              רוצה את כל הכלים האלה?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#191265]/75 text-lg mb-3 leading-relaxed">
              כתבתי מדריך מעשי שמלמד אותך לא רק "למקבל" אלא לבחור נכון מהרגע הראשון.
            </motion.p>
            <motion.p variants={fadeUp} className="text-[#191265] font-bold text-base mb-8">
              זה לא מדריך קריאה. זה מדריך עבודה. עם תרגילים, שאלות, וכלים שאני משתמשת בהם בפגישות.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
              <div className="flex items-baseline gap-3 justify-center">
                <span className="text-[#191265] font-black text-5xl">₪149</span>
                <span className="text-[#191265]/50 line-through text-2xl font-bold">₪249</span>
              </div>
              <p className="text-[#191265]/70 text-sm">השלב הראשון לפני שפוגשים אותי. מי שמגיע עם המדריך מגיע מוכן.</p>
              <CTAButton label="לרכישת המדריך המלא ₪149 ←" className="text-xl px-12 py-5" />
              <p className="text-[#191265]/60 text-xs">תשלום מאובטח. גישה מיידית. ללא ספאם.</p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#191265] py-8 px-6 text-center">
        <p className="text-white/40 text-xs">
          הילית כספי | Relationship Expert & Matchmaker
          <br />
          <Link href="/" className="hover:text-white/70 transition-colors">חזרה לאתר הראשי</Link>
        </p>
      </footer>

    </div>
  );
}
