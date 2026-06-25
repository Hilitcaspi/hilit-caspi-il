/**
 * SignsGuide - דף נחיתה למדריך "5 סימנים שגבר מעוניין בך (ו-5 שהוא ממש לא)"
 * Route: /signs
 * גרסה: עמוקה, סמכותית, מבוססת מדע האהבה
 */
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/track";
import { trackLead } from "@/lib/metaPixel";
import { getUtmParams } from "@/lib/utils";

const HILIT_PROFILE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.13 } } };

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

const YES_SIGNS = [
  {
    num: "01",
    title: "הוא מחפש אותך - גם בלי סיבה",
    label: "מחקר גוטמן",
    body: `פרופסור ג'ון גוטמן, שחקר אלפי זוגות במשך ארבעה עשורים, גילה שהמנבא הכי חזק לזוגיות מוצלחת הוא לא אהבה, כימיה, או ערכים משותפים. הוא הפנייה לעבר - הנטייה לחפש את השני גם כשאין סיבה ברורה.

גבר שמעוניין בך שולח לך מאמר שזכר שאמרת שמעניין אותך. מתקשר בלי שקרה כלום. מגיב לסטורי שלך בהתלהבות אמיתית. הוא מחפש אותך - לא כי הוא משועמם, אלא כי הוא רוצה שתהיי בחייו.

מה שחשוב לא פחות: הוא מגיב כשאת מחפשת אותו. כשאת מספרת לו משהו קטן על היום שלך, הוא לא ממשיך הלאה. הוא שואל. הוא שם.

גוטמן מצא שזוגות שנשארו יחד הגיבו לניסיונות החיבור של הפרטנר 86% מהזמן. זוגות שנפרדו - רק 33%.

המספרים לא משקרים.`,
  },
  {
    num: "02",
    title: "הוא מספר לך דברים שהוא לא מספר לכולם",
    label: "תיאוריית ההתקשרות",
    body: `יש גברים שמספרים לך רק על ההצלחות שלהם. על הקריירה, על הטיול, על מה שהם גאים בו. זה נחמד - אבל זה לא קרבה.

גבר שמעוניין בך מספר לך גם על הדברים הפחות נוחים. על הפחד שהוא לא מספיק טוב. על הכישלון שעדיין מכאיב. על מה שהוא לא בטוח בו. הוא בוחר להיות פגיע בפניך - כי הוא מאמין שאת תשמרי על זה.

חוקרי תיאוריית ההתקשרות הראו שגברים שמסוגלים לפתיחות רגשית עושים אותה בצורה מדורגת ומכוונת - לא בבת אחת, אבל בהתקדמות ברורה.

גבר שלא פותח - לא כי הוא "מורכב" או "גבר שלא מדבר על רגשות". הוא לא פותח כי הוא לא בחר בך. פתיחות רגשית אצל גבר היא בחירה. לא יכולת.`,
  },
  {
    num: "03",
    title: "הוא מכניס אותך לחיים שלו, לא רק לזמן הפנוי שלו",
    label: "מחויבות לפי סטרנברג",
    body: `פרופסור רוברט סטרנברג מאוניברסיטת ייל הגדיר שאהבה אמיתית בנויה משלושה דברים: קרבה, תשוקה, ומחויבות. רוב הגברים שנשים מתלוננות עליהם מציעים תשוקה - אבל לא מחויבות.

מחויבות לא מתבטאת בהצהרות. היא מתבטאת בשילוב בחיים.

גבר שמעוניין בך מציג אותך לאנשים שחשובים לו. הוא מזכיר אותך בשיחות עם חברים לפני שהם פגשו אותך. הוא מתכנן איתך קדימה - לא כי הוא "רציני" אלא כי הוא פשוט לא מדמיין את העתיד בלעדייך.

הוא לא מחכה לראות לאן זה הולך. הוא מכוון לאן זה הולך.`,
  },
  {
    num: "04",
    title: "הוא נמצא גם כשזה לא נוח לו",
    label: "מדע האהבה",
    body: `ההבדל בין גבר שמעוניין בך לגבר שנהנה מהתשומת לב שלך הוא פשוט: עקביות.

כשאת נגישה, נחמדה ומשיבה מהר - כל גבר יהיה נוכח. הבחינה האמיתית היא מה הוא עושה כשאת עסוקה, כשאת פחות זמינה, כשיש חיכוך קטן.

גבר שמעוניין בך לא נעלם כשהדברים מסתבכים. הוא לא נותן לך "מרחב" כשיש אי-נוחות - הוא מתמודד איתה. הוא מגיע גם כשזה לא נוח לו, גם כשאת לא בשיאך, גם כשהדייט לא היה מושלם.

עקביות לאורך זמן, בתנאים שונים - זה הסימן שאין לו תחליף.`,
  },
  {
    num: "05",
    title: "הוא שם לב לדברים שלא אמרת",
    label: "כוונון רגשי",
    body: `גוטמן הגדיר Attunement - כוונון רגשי - כיכולת לזהות ולהגיב למצב הרגשי של הפרטנר, גם כשהוא לא מוצהר במפורש.

גבר שמעוניין בך שם לב שאת שקטה יותר מהרגיל. הוא שואל. הוא לא מניח שהכל בסדר כי לא אמרת שיש בעיה. הוא מזהה שינויים קטנים בך - ומגיב אליהם.

בעבודה שלי, ראיתי שנשים רבות מתאהבות בגברים שגורמים להן להרגיש "נראות". לא מוערכות, לא מוצאות חן - נראות. זה הבדל עצום.

גבר שרואה אותך - את הגרסה האמיתית, לא רק את מה שאת מציגה - הוא גבר שיש לו יכולת לאהבה אמיתית.`,
  },
];

const NO_SIGNS = [
  {
    num: "01",
    title: "הוא זמין לפי הנוחות שלו - לא לפי הצורך שלך",
    label: "Avoidant Attachment",
    body: `מחקרי ה-Attachment Theory מזהים דפוס שנקרא Avoidant Attachment - גברים שלמדו בילדות שצרכים רגשיים הם עול, ולכן פיתחו מנגנון של ניתוק.

הם לא "עסוקים". הם לא "מורכבים". הם פשוט לא נוכחים רגשית - ומחפשים את הנוחות שלהם בלי לקחת בחשבון את שלך.

הסימן: כל הלוגיסטיקה של הקשר מתאימה לו. הפגישות ביום שנוח לו. בשעה שנוח לו. כשהוא "מרגיש כמו". כשאת מנסה לשנות - יש התנגדות, עייפות, או פשוט שתיקה.

זה לא אומר שהוא לא אוהב אותך. זה אומר שהוא לא בחר לתעדף אותך.`,
  },
  {
    num: "02",
    title: "הוא חם ואז קר - ואת לא מבינה למה",
    label: "Anxious Availability",
    body: `זה אחד הדפוסים שהכי הרבה נשים מגיעות איתו אליי. שבוע אינטנסיבי, שבוע מרוחק. הודעות תכופות, ואז שתיקה. "אני פשוט היה עסוק" - כל פעם מחדש.

המדע מסביר את זה: גברים עם דפוס התקשרות חרד (Anxious Attachment) או עם אמביוולנטיות לגבי הקשר יוצרים תנודתיות שמרגישה כמו "כימיה" - אבל היא בעצם חוסר יציבות.

הבעיה שלנו כנשים: המוח שלנו מפרש את הריצה הזו כמשיכה. כשמישהו לא בטוח, אנחנו עובדות קשה יותר לזכות בו. זה לא אהבה. זה ביולוגיה.

גבר שמחויב לא גורם לך לתהות מה קרה.`,
  },
  {
    num: "03",
    title: "הוא לא מציג אותך - ולא מסביר למה",
    label: "מחויבות נסתרת",
    body: `חצי שנה ביחד ואת עדיין לא מכירה אף אחד מהחיים שלו. הוא לא מזכיר אותך לחברים. כשאת שואלת, יש תירוץ סביר - "עוד לא הגיע הזמן", "אנחנו עדיין בהתחלה", "הם לא יבינו".

בעבודה שלי עם מאות זוגות, למדתי שגבר שרציני לגביך רוצה שכולם ידעו. לא כי הוא צריך אישור חברתי - אלא כי הוא גאה. כי הוא בחר.

היעדר שילוב חברתי אחרי תקופה סבירה הוא לא "אישיות מופנמת" ולא "אנחנו בועה שלנו". זה גבר שמשאיר לעצמו דלת יציאה פתוחה.`,
  },
  {
    num: "04",
    title: "הוא מדבר על עתיד - אבל לא מתכנן",
    label: "Future Faking",
    body: `"ניסע ביחד לפורטוגל", "בוא נעשה את זה בחורף", "אני רוצה להכיר את ההורים שלך" - ואז כלום.

פסיכולוגים מכנים את זה Future Faking: הצהרות על עתיד משותף שנועדו ליצור תחושת מחויבות בלי לממש אותה. זה לא בהכרח מניפולציה מודעת - לפעמים הגבר עצמו מאמין בזה ברגע שהוא אומר.

אבל הבחינה היא פשוטה: האם ההצהרות מתממשות? האם יש תאריכים, תוכניות, פעולות? או שכל פעם שאת מנסה לסגור פרטים, הנושא מתפוגג?

עתיד שלא הופך לתוכניות הוא לא עתיד - הוא שיחה.`,
  },
  {
    num: "05",
    title: "הוא לא מתמודד עם קונפליקט - הוא נעלם ממנו",
    label: "Stonewalling",
    body: `גוטמן זיהה ארבעה "רוכבי האפוקליפסה" של מערכות יחסים: ביקורת, בוז, הגנתיות, ו-Stonewalling - סגירה רגשית מוחלטת בזמן קונפליקט.

גבר שנעלם כשיש חיכוך, שמפסיק לענות כשאת מנסה לדבר על משהו שמפריע לך, שהופך כל שיחה קשה ל"את דרמטית" - הוא לא גבר שלא יודע לתקשר. הוא גבר שבחר לא לתקשר.

בעבודה שלי, ראיתי שנשים רבות מפרשות Stonewalling כ"הוא צריך זמן לעצמו". לפעמים זה נכון. אבל כשזה דפוס חוזר - זה לא צורך בזמן. זה סירוב להיות שם.

גבר שמחויב לקשר - מתמודד עם הקשר.`,
  },
];

export default function SignsGuide() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      track({ eventType: "guide_download", email: email.trim() });
      trackLead({ content_name: "מדריך סימנים - מדע האהבה" });
    },
    onError: (err: { message?: string }) => setError(err.message || "משהו השתבש, נסי שוב"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) return;
    submitLead.mutate({ name: name.trim(), email: email.trim(), ...getUtmParams() });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* NAVBAR */}
      <nav className="bg-[#191265] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl">הילית כספי</Link>
        <Link href="/dna-quiz" className="text-[#ffe27c] text-sm font-medium hover:underline">
          שאלון DNA חינמי
        </Link>
      </nav>

      {/* HERO */}
      <section className="bg-[#191265] py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />
        <div className="relative z-10 max-w-4xl mx-auto text-right">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              מדע האהבה - הילית כספי
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              5 סימנים שגבר באמת מעוניין בך<br />
              <span className="text-[#ffe27c]">ו-5 שהוא ממש לא</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed max-w-2xl">
              אחרי מאות שעות של ליווי רווקים ורווקות לזוגיות, ראיתי שוב ושוב את אותה תבנית: הסימנים שנשים מפרשות כהתעניינות הם לא תמיד אלה שמנבאים קשר אמיתי. והסימנים שהן מתעלמות מהם - הם בדיוק אלה שהמדע מזהה כמכריעים.
            </p>
          </motion.div>
        </div>
      </section>

      {/* YES SIGNS */}
      <section className="py-20 px-6 bg-white">
        <Section>
          <div className="max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="text-right mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">חלק ראשון</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                5 סימנים שגבר באמת מעוניין בך
              </h2>
              <p className="text-[#727272] mt-4 text-base leading-relaxed">
                לא "הוא שלח לי פרחים" ולא "הוא אמר שאני יפה". הסימנים שמנבאים קשר אמיתי הם עדינים יותר - ומדויקים הרבה יותר.
              </p>
            </motion.div>

            <div className="flex flex-col gap-10">
              {YES_SIGNS.map((s) => (
                <motion.div key={s.num} variants={fadeUp} className="border-r-4 border-[#191265] pr-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-black text-[#ffe27c]">{s.num}</span>
                    <span className="text-xs font-semibold text-[#1800ad] bg-[#1800ad]/10 px-3 py-1 rounded-full">{s.label}</span>
                  </div>
                  <h3 className="text-xl font-black text-[#191265] mb-4">{s.title}</h3>
                  <div className="text-[#444] text-base leading-relaxed whitespace-pre-line">{s.body}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* NO SIGNS */}
      <section className="py-20 px-6 bg-[#191265]">
        <Section>
          <div className="max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="text-right mb-14">
              <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-3">חלק שני</p>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                5 סימנים שהוא ממש לא שם
              </h2>
              <p className="text-white/60 mt-4 text-base leading-relaxed">
                לא כדי להפחיד. כדי לתת לך את הבהירות שמגיעה לך - ולשחרר אותך מלבזבז זמן על מי שלא בחר בך.
              </p>
            </motion.div>

            <div className="flex flex-col gap-10">
              {NO_SIGNS.map((s) => (
                <motion.div key={s.num} variants={fadeUp} className="border-r-4 border-[#ffe27c] pr-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-black text-[#ffe27c]">{s.num}</span>
                    <span className="text-xs font-semibold text-[#ffe27c] bg-[#ffe27c]/15 px-3 py-1 rounded-full">{s.label}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-4">{s.title}</h3>
                  <div className="text-white/70 text-base leading-relaxed whitespace-pre-line">{s.body}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </section>

      {/* ABOUT + AUTHORITY */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <Section>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} className="flex justify-center">
              <img src={HILIT_PROFILE} alt="הילית כספי" className="w-64 h-80 rounded-2xl object-cover shadow-xl" />
            </motion.div>
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מי אני</p>
              <h2 className="text-2xl font-black text-[#191265] mb-4">הילית כספי</h2>
              <p className="text-[#555] leading-relaxed mb-4">
                Relationship Expert ושדכנית מקצועית. מאות שעות של ליווי אינטנסיבי של רווקים ורווקות לזוגיות, פודקאסט עם למעלה מ-200,000 האזנות, ומאגר רווקים עם מעל 3,000 חברים.
              </p>
              <p className="text-[#555] leading-relaxed mb-4">
                מה שמייחד את הגישה שלי: אני לא מאמינה ב"טיפים לדייטינג". אני מאמינה שהדרך למצוא אהבה עוברת דרך הבנה עמוקה של עצמך - ושל מה שאת באמת מחפשת. מדע האהבה הוא הבסיס. הניסיון הוא הכלי.
              </p>
              <p className="text-[#555] leading-relaxed">
                הסימנים שכתבתי כאן הם לא תיאוריה. הם מה שראיתי שוב ושוב, בשיחות, בתהליכים, בהצלחות ובכישלונות. הם עבדו.
              </p>
            </motion.div>
          </div>
        </Section>
      </section>

      {/* DNA CTA */}
      <section className="py-20 px-6 bg-white">
        <Section>
          <div className="max-w-3xl mx-auto text-right">
            <motion.div variants={fadeUp}>
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">השלב הבא</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
                עכשיו שאת יודעת לזהות גבר מעוניין<br />
                <span className="text-[#1800ad]">השאלה היא: איזה גבר מתאים לך?</span>
              </h2>
              <p className="text-[#555] text-lg leading-relaxed mb-8">
                לא כל גבר מחויב הוא גבר נכון עבורך. שאלון ה-DNA שלי חינמי ולוקח 5 דקות. הוא יגלה לך את הפרופיל הזוגי שלך ומה את צריכה לחפש - על פי מדע האהבה.
              </p>
              <Link href="/dna-quiz"
                className="inline-block bg-[#191265] text-white font-black text-xl px-10 py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-xl">
                גלי את הפרופיל הזוגי שלך - חינמי
              </Link>
            </motion.div>
          </div>
        </Section>
      </section>

      {/* EMAIL SIGNUP */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <Section>
          <div className="max-w-xl mx-auto text-center">
            <motion.div variants={fadeUp}>
              <h2 className="text-2xl font-black text-[#191265] mb-3">
                רוצה לקבל ממני תוכן כזה באופן קבוע?
              </h2>
              <p className="text-[#727272] mb-8">
                אשלח לך תובנות מהשטח, מדע האהבה בשפה שלי, ועדכונים ראשונים.
              </p>
              {submitted ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                  <div className="text-4xl mb-3">💛</div>
                  <h3 className="text-xl font-black text-[#191265] mb-2">נרשמת!</h3>
                  <p className="text-[#727272] text-sm">תבדקי את תיבת המייל שלך.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="השם שלך"
                    className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="כתובת המייל שלך"
                    className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
                  />
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitLead.isPending}
                    className="bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60"
                  >
                    {submitLead.isPending ? "שולחת..." : "אני רוצה לקבל תוכן כזה"}
                  </button>
                  <p className="text-[#727272] text-xs text-center">ללא ספאם. ניתן להסרה בכל עת.</p>
                </form>
              )}
            </motion.div>
          </div>
        </Section>
      </section>

      {/* FINAL CTA - DATABASE */}
      <section className="py-20 px-6 bg-[#191265]">
        <Section>
          <div className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                מוכנה לפגוש גברים<br />
                <span className="text-[#ffe27c]">שמחפשים זוגיות אמיתית?</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
                במאגר הרווקים שלי יש גברים שעברו אבחון, שיחה, ומחויבות לתהליך. לא אפליקציה. לא הימור. שידוך מקצועי.
              </p>
              <Link href="/database"
                className="inline-block bg-[#ffe27c] text-[#191265] font-black text-xl px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl">
                הצטרפי למאגר הרווקים
              </Link>
              <p className="text-white/30 text-sm mt-6">
                או{" "}
                <Link href="/guide" className="text-[#ffe27c]/70 hover:text-[#ffe27c] underline">
                  קראי את המדריך המלא "לבחור נכון"
                </Link>
              </p>
            </motion.div>
          </div>
        </Section>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0d0b3a] py-8 px-6 text-center">
        <p className="text-white/40 text-sm">2025 הילית כספי. כל הזכויות שמורות.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/terms/guide" className="text-white/30 text-xs hover:text-white/60">תנאי שימוש</Link>
          <Link href="/unsubscribe" className="text-white/30 text-xs hover:text-white/60">הסרה מרשימת תפוצה</Link>
        </div>
      </footer>

    </div>
  );
}
