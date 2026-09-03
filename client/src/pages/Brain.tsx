/**
 * Brain — דף נחיתה / מאמר עמוק
 * כותרת: "איך לשחק עם המוח שלך כדי להשיג את הגבר שאת רוצה"
 * Route: /brain
 * מוביל ל: /guide (דף מכירה המדריך ₪149)
 */
import React, { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";

const HILIT_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const GUIDE_URL = "/guide?utm_source=instagram&utm_medium=reel&utm_campaign=brain&utm_content=article_cta";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

const sciencePoints = [
  {
    title: "הדופמין שמשקר לך",
    body: "כשאת פוגשת מישהו שמרגש אותך, המוח מציף אותך בדופמין. זה אותו מסלול עצבי שפועל בהתמכרות. הבעיה? הדופמין לא מצביע על מי שטוב לך. הוא מצביע על מי שמרגש אותך. ואלה לא תמיד אותו אדם.",
    source: "Gottman Institute, 2024",
  },
  {
    title: "את רוצה מה שאת חושבת שתרצי",
    body: "פרופסורים גילברט ווילסון מהרווארד קראו לזה Miswanting. הנטייה שלנו לרצות דברים שלא יגרמו לנו אושר. שאלתי פעם קבוצה של נשים מה הן מחפשות. הן אמרו: גבוה, מוצלח, כריזמטי. אחר כך שאלתי מה גרם לקשר הכי טוב שלהן להיות טוב. הן אמרו: הוא הקשיב לי. הוא גרם לי להרגיש בטוחה. שתי הרשימות לא חופפות כמעט בכלל.",
    source: "Gilbert & Wilson, Harvard University",
  },
  {
    title: "חוסר הוודאות מרגיש כמו ריגוש",
    body: "מחקר מאוניברסיטת וירג'יניה הראה שנשים שלא ידעו אם גבר מסוים מעוניין בהן היו מושכות אליו יותר מנשים שידעו בוודאות שהוא מעוניין. חוסר הוודאות יצר יותר מחשבות עליו, יותר עיסוק בו, ויותר משיכה. המוח שלנו מפרש חוסר ודאות כריגוש. ואת לא תמיד יודעת להבדיל.",
    source: "Whitchurch, Wilson & Gilbert, University of Virginia, 2011",
  },
];

const tools = [
  {
    num: "01",
    title: "כלל ה-72 שעות",
    tag: "נגד הדופמין הראשוני",
    body: "לפני שאת מחליטה שמישהו מיוחד, תני לעצמך 72 שעות. לא כי את צריכה להיות קרה, אלא כי הדופמין הראשוני מעוות שיפוט. אחרי 72 שעות שאלי את עצמך: מה אני יודעת עליו בפועל? לא מה הרגשתי, מה אני יודעת.",
  },
  {
    num: "02",
    title: "הכניסי מתחרה למוח",
    tag: "נגד אובססיה",
    body: "המוח לא יכול להתמקד בשני דברים בעוצמה שווה בו זמנית. כשאת שוקעת בו, הכניסי מתחרה. צוללת לעבודה. שוקעת בתחביב. מתחילה פרויקט חדש. יוצאת לאימון. לא כי הוא לא שווה את תשומת הלב, אלא כי את שווה את שלך. וזה, אגב, גם הדבר הכי מושך שיש.",
  },
  {
    num: "03",
    title: "מבחן ה\"אחרי\"",
    tag: "לבחור נכון",
    body: "אחרי כל פגישה שאלי: איך אני מרגישה עכשיו? לא כמה הוא מרגש, אלא כמה אני מרגישה טוב עם עצמי. זוגיות טובה מגבירה את הביטחון שלך, לא מפחיתה אותו. גבר שגורם לך להרגיש קטנה אחרי הפגישה, לא משנה כמה הוא מרגש, הוא לא הגבר הנכון.",
  },
  {
    num: "04",
    title: "עקרון הנדירות, אבל בכיוון הנכון",
    tag: "להיות מושכת",
    body: "המוח האנושי מעריך יותר מה שנדיר. זה עובד בשני הכיוונים. כשאת תמיד זמינה, תמיד עונה מיד, תמיד פנויה, המוח שלו מפסיק לייחס לך ערך. לא כי את צריכה לשחק משחקים. אלא כי כשאת מלאה בחיים שלך ולא מחכה, זה מתבטא בצורה אמיתית. ואנשים מרגישים את ההבדל.",
  },
  {
    num: "05",
    title: "שיקוף, לא חיקוי",
    tag: "ליצור קשר עמוק",
    body: "מחקרים על שפת גוף מראים שאנשים מרגישים יותר קרובים לאנשים שמשקפים אותם בעדינות. לא לחקות, לשקף. אם הוא נשען קדימה, נשעני קדימה. אם הוא מדבר בקצב מסוים, התאימי את הקצב שלך. זה יוצר תחושת כימיה שהוא לא יוכל להסביר, רק להרגיש.",
    source: "Chartrand & Bargh, 1999, The Chameleon Effect",
  },
  {
    num: "06",
    title: "גילוי עצמי הדרגתי",
    tag: "לבנות אינטימיות",
    body: "פרופסור ארתור ארון מאוניברסיטת סטוני ברוק הראה שאינטימיות נבנית דרך גילוי עצמי הדרגתי ומשותף. לא לספר הכל בפגישה הראשונה. לא להישאר שטחית. לפתוח שכבה אחת בכל פעם, ולהזמין אותו לפתוח שכבה בתמורה. זה מה שיוצר תחושת קשר אמיתי, לא רק שיחה נעימה.",
    source: "Aron et al., 1997, The Experimental Generation of Interpersonal Closeness",
  },
  {
    num: "07",
    title: "הפוקוס על הנוכחות שלו, לא על העתיד",
    tag: "לראות את מי שלפנייך",
    body: "במקום לחשוב מה יהיה, שאלי מה יש עכשיו. גבר שנוכח, שמקשיב, שמתעניין בפגישה הזו, שווה יותר מגבר שמבטיח עתיד מזהיר אבל לא נוכח כרגע. הנוכחות היא הנתון הכי אמין שיש לך.",
  },
];

export default function Brain() {
  useEffect(() => {
    track({ eventType: "page_view", page: "/brain" });
    trackViewContent({ content_name: "איך לשחק עם המוח שלך", content_category: "article" });
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── HERO ── */}
      <section className="bg-[#191265] pt-20 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-xs font-medium px-4 py-2 rounded-full mb-6 tracking-widest uppercase">
              מאמר מבוסס מחקר
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              איך לשחק עם המוח שלך
              <br />
              <span className="text-[#ffe27c]">כדי להשיג את הגבר שאת רוצה</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-xl mx-auto">
              מה שמדע המוח יודע על אהבה ומשיכה, שאף אחד עדיין לא הסביר לך בצורה ישירה.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <img src={HILIT_PHOTO} alt="הילית כספי" className="w-12 h-12 rounded-full object-cover border-2 border-[#ffe27c]" />
              <div className="text-right">
                <div className="text-white font-bold text-sm">הילית כספי</div>
                <div className="text-white/50 text-xs">מאמנת זוגיות ומשדכת</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── OPENING QUOTE ── */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <AnimatedSection className="max-w-2xl mx-auto">
          <h2 className="text-[#191265] text-2xl md:text-3xl font-black mb-6 leading-tight">
            המוח שלך הוא כלי. את הבוסית.
          </h2>
          <p className="text-[#444] text-lg leading-relaxed mb-4">
            המוח האנושי התפתח לאורך מיליוני שנים. חלק מהמנגנונים שלו עוזרים לנו. חלק עובדים נגדנו כשאנחנו מחפשות אהבה.
          </p>
          <p className="text-[#191265] font-semibold text-lg leading-relaxed mb-4">
            לדעת איך הוא עובד זה לא להפוך לרובוטית. זה לקבל כוח.
          </p>
          <p className="text-[#444] text-lg leading-relaxed">
            כשאת מבינה למה את מרגישה מה שאת מרגישה, את יכולה לבחור בצורה מודעת. לא להיגרר.
          </p>
        </AnimatedSection>
      </section>

      {/* ── HOW THE BRAIN SABOTAGES YOU ── */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">איך המוח משבש לנו</p>
            <h2 className="text-[#191265] text-2xl font-black mb-10">שלושה מנגנונים שכדאי להכיר</h2>
          </AnimatedSection>
          <div className="space-y-10">
            {sciencePoints.map((pt, i) => (
              <AnimatedSection key={i}>
                <h3 className="text-[#191265] text-xl font-black mb-3">{pt.title}</h3>
                <p className="text-[#444] text-base leading-relaxed mb-3">{pt.body}</p>
                <p className="text-[#727272] text-xs italic border-r-4 border-[#ffe27c] pr-3">{pt.source}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section className="bg-[#191265] py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-3">הכלים הפרקטיים</p>
            <h2 className="text-white text-2xl font-black mb-2">7 כלים לשחק עם המוח שלך</h2>
            <p className="text-white/60 text-base mb-10">אלה הכלים שאני נותנת לנשים בקליניקה שלי</p>
          </AnimatedSection>
          <div className="space-y-6">
            {tools.map((t) => (
              <AnimatedSection key={t.num}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-start gap-4 mb-3">
                    <span className="bg-[#ffe27c] text-[#191265] font-black text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1">{t.num}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg leading-tight">{t.title}</h3>
                      <span className="inline-block bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full mt-1">{t.tag}</span>
                    </div>
                  </div>
                  <p className="text-white/70 text-base leading-relaxed pr-12">{t.body}</p>
                  {t.source && (
                    <p className="text-white/30 text-xs italic mt-3 pr-12">{t.source}</p>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#f0eadc] py-16 px-6">
        <AnimatedSection className="max-w-xl mx-auto">
          <div className="bg-[#191265] rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-4xl mb-4">💛</div>
            <h2 className="text-white text-2xl font-black mb-3">
              רוצה את כל הכלים במקום אחד?
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-6">
              בניתי מדריך מעשי שמלמד אותך בדיוק איך ליישם את הכלים האלה בחיים האמיתיים. לא תיאוריה. תרגילים, שאלות, ושיטות שאני מלמדת בקליניקה שלי. השלב הראשון לפני שפוגשים אותי.
            </p>
            <div className="bg-white/10 rounded-2xl p-5 mb-6 text-right">
              <p className="text-[#ffe27c] font-black text-lg mb-1">המדריך: לבחור נכון</p>
              <p className="text-white/70 text-sm leading-relaxed">
                מדריך עבודה מעשי. לא קריאה בלבד.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-white font-black text-3xl">₪149</span>
                <span className="text-white/40 line-through text-base">₪249</span>
              </div>
            </div>
            <Link href={GUIDE_URL}>
              <button className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg">
                לרכישת המדריך ←
              </button>
            </Link>
            <p className="text-white/40 text-xs mt-4">תשלום מאובטח דרך Grow. ניתן לשלם בכרטיס אשראי או Bit.</p>
          </div>
        </AnimatedSection>
      </section>

    </div>
  );
}
