/**
 * SignsGuide - דף נחיתה למדריך סימנים להתעניינות ולתקשורת בקשר
 * Route: /signs
 * סימנים להתבוננות ולשיחה, לא אבחון או תחזית לזוגיות
 */
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/track";
import { trackLead } from "@/lib/metaPixel";
import { getUtmParams } from "@/lib/utils";
import { getFirstTouchAcquisition } from "@/lib/acquisitionTracking";
import EditorialNextStep from "@/components/EditorialNextStep";

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
    label: "יוזמה והדדיות",
    body: `לפעמים התעניינות ניכרת דווקא ברגעים הקטנים: הוא שולח לך מאמר שזכר שאמרת שמעניין אותך, מתקשר לשאול איך עבר היום, או מגיב למשהו ששיתפת.

מה שחשוב לא פחות: יש מקום גם ליוזמה שלך. כשאת מספרת לו משהו קטן על היום שלך, הוא מקשיב, שואל ומתעניין.

אלה יכולים להיות סימנים לרצון בחיבור. הודעה או תגובה לסטורי לבדן לא אומרות מה הוא מרגיש או לאן הקשר יתקדם. שימי לב להדדיות לאורך זמן, וגם למה שאתם אומרים זה לזו.`,
  },
  {
    num: "02",
    title: "הוא מספר לך דברים שהוא לא מספר לכולם",
    label: "פתיחות בקצב אישי",
    body: `שיחה יכולה להתחיל בקריירה, בטיול ובהצלחות, ובהמשך להגיע גם לדברים פחות נוחים: התלבטות, חשש או משהו שעדיין מכאיב.

כשיש מקום לשיתוף הדדי, בלי לחץ ובלי צורך להוכיח משהו, יכולה להיבנות קרבה. שימי לב גם לאופן שבו הוא מקשיב לדברים שאת משתפת ולכבוד שהוא נותן לגבולות שלך.

לא כולם נפתחים באותו קצב. קושי לדבר על רגשות אינו הוכחה לחוסר עניין, ושיתוף אישי אינו הבטחה למחויבות. אפשר לשאול בעדינות מה עוזר לכל אחד מכם להרגיש בנוח.`,
  },
  {
    num: "03",
    title: "הוא מכניס אותך לחיים שלו, לא רק לזמן הפנוי שלו",
    label: "מקום בחיים",
    body: `כשהקשר מתקדם, כדאי לשים לב אם נוצר עבורך מקום בחיים שלו: הוא מתכנן איתך מפגש מראש, משתף בשגרה שלו או מציע להכיר אנשים שחשובים לו.

אלה צעדים שאפשר לדבר עליהם, ולא רק לנסות לפרש. האם הקצב מתאים גם לך? האם ברור לשניכם איזה קשר אתם רוצים לבנות?

היכרות עם חברים או משפחה יכולה להגיע בקצב שונה בגלל פרטיות, נסיבות או העדפות אישיות. היא לא מבחן בפני עצמה. החשוב הוא שיש שיחה פתוחה והסכמות שמתאימות לשניכם.`,
  },
  {
    num: "04",
    title: "הוא נמצא גם כשזה לא נוח לו",
    label: "עקביות והתחשבות",
    body: `התעניינות אינה רק התלהבות כשהכול קל. כדאי לשים לב גם לאופן שבו אתם מתנהלים כשאת עסוקה, כשהתוכניות משתנות או כשיש אי-נוחות.

למשל: הוא מודיע אם לא יוכל להגיע, מציע מועד אחר למפגש, או מוכן לחזור לשיחה שלא הסתיימה בנעימות. גם לך מותר להיות פחות זמינה ולבקש התחשבות.

עקביות אינה זמינות תמידית או ויתור על גבולות. זו היכולת למצוא דרך לתקשר ולכבד זה את זו גם כשלא הכול מסתדר.`,
  },
  {
    num: "05",
    title: "הוא שם לב לדברים שלא אמרת",
    label: "קשב וסקרנות",
    body: `הוא שם לב שאת שקטה יותר מהרגיל ושואל איך את מרגישה, במקום להחליט בשבילך מה קרה. הוא זוכר משהו שהיה חשוב לך ובודק איך הסתדר.

התחושה שרואים אותך יכולה להיות משמעותית מאוד. כדאי לשים לב אם הקשב הזה מלווה גם בכבוד לתשובות שלך, לרצונות שלך ולגבולות שלך.

אף אחד לא אמור לקרוא מחשבות. גם בקשר קרוב צריך לומר מה אנחנו צריכות. מחווה קשובה יכולה לעזור לבנות קרבה, אבל אינה מעידה לבדה על התאמה או על עתיד הקשר.`,
  },
];

const NO_SIGNS = [
  {
    num: "01",
    title: "הוא זמין לפי הנוחות שלו - לא לפי הצורך שלך",
    label: "תיאום חד-צדדי",
    body: `הפגישות נקבעות רק ביום ובשעה שנוחים לו. כשאת מציעה שינוי, אין ניסיון למצוא פתרון, והצרכים שלך כמעט לא מקבלים מקום.

אם זה חוזר, כדאי לומר באופן ברור מה את צריכה ולבדוק אם יש נכונות לתאם יחד. עומס או מגבלות אמיתיות יכולים להשפיע על הזמינות, אבל אפשר לדבר גם עליהם.

מההתנהגות הזו לבדה אי אפשר להסיק מה הוא מרגיש, מה המניע שלו או מה דפוס ההתקשרות שלו. כן אפשר לשאול אם ההתנהלות בפועל מתאימה לקשר שאת רוצה.`,
  },
  {
    num: "02",
    title: "הוא חם ואז קר - ואת לא מבינה למה",
    label: "תקשורת לא עקבית",
    body: `תקופה של הודעות תכופות ומפגשים קרובים, ואז שתיקה בלי הסבר. כשהמעברים האלה חוזרים, קל להישאר עם סימני שאלה ולהשקיע הרבה בניסיון להבין מה השתנה.

לא צריך לתת לזה אבחנה כדי לדבר על ההשפעה עלייך. אפשר לשאול: "כשאנחנו בקשר קרוב ואז אין תקשורת, אני לא יודעת למה לצפות. איזה קצב מתאים לך?"

הסיבות לשינוי יכולות להיות שונות. שימי לב אם השיחה מביאה להבנה ולתיאום, ולא רק להסבר רגעי. משיכה לא מחייבת אותך להישאר בדפוס שמשאיר אותך בחוסר ודאות.`,
  },
  {
    num: "03",
    title: "הוא לא מציג אותך - ולא מסביר למה",
    label: "שיחה על מקום בקשר",
    body: `הקשר מתקדם מבחינתך, אבל את עדיין לא מכירה אנשים מהחיים שלו ולא ברור לך איך הוא רואה את המקום שלך בהם. כשאת שואלת, הנושא נשאר פתוח.

יכולות להיות לכך סיבות של פרטיות, משפחה, קצב אישי או נסיבות אחרות. אין מועד אחיד שבו כולם צריכים להכיר את כולם, והיעדר היכרות לא מוכיח שהוא מסתיר משהו או מתכנן לעזוב.

השאלה היא אם אפשר לדבר על זה בכנות. הסבירי מה חשוב לך, שאלי מה מתאים לו ובדקי אם יש דרך להתקדם שמכבדת גם אותך.`,
  },
  {
    num: "04",
    title: "הוא מדבר על עתיד - אבל לא מתכנן",
    label: "פער בין מילים למעשים",
    body: `"ניסע ביחד לפורטוגל", "בוא נעשה את זה בחורף", "אני רוצה להכיר את ההורים שלך" - ואז כלום.

אפשר ליהנות מלחלום יחד. אבל אם את מסתמכת על הדברים כתוכנית, כדאי לברר אם זו משאלה או משהו ששניכם רוצים לקדם בפועל.

האם יש תאריך, תיאום או צעד מעשי? האם הוא חוזר לנושא כשאת מבקשת לסגור פרטים, או שהשיחה מתפוגגת שוב ושוב?

פער חוזר בין מילים למעשים שווה שיחה. הוא אינו מוכיח מניפולציה או כוונה מסוימת, אבל מותר לך לבקש בהירות ולא לבנות ציפיות רק על הבטחות.`,
  },
  {
    num: "05",
    title: "הוא לא מתמודד עם קונפליקט - הוא נעלם ממנו",
    label: "חזרה לשיחה קשה",
    body: `כשאת מעלה משהו שמפריע לך, הוא מפסיק לענות או מבטל את התחושה שלך באמירה כמו "את דרמטית". הנושא לא מקבל מקום, וגם בהמשך אין חזרה לשיחה.

לפעמים הפסקה עוזרת להירגע. יש הבדל בין "אני צריך זמן, בואי נחזור לזה כשנוכל להקשיב" לבין שתיקה מתמשכת שמשאירה אותך בלי אפשרות לברר.

אפשר לבקש הסכמה על הדרך שבה עוצרים שיחה וחוזרים אליה. שימי לב אם יש נכונות להקשיב, לקחת אחריות ולכבד את הגבולות של שניכם.

אי אפשר לדעת מהשתיקה לבדה מה הסיבה לה. אם ביטול או הימנעות חוזרים ולא משתנים גם אחרי שיחה, מותר לך לשקול אם הקשר נותן מקום לצרכים שלך.`,
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
    submitLead.mutate({ name: name.trim(), email: email.trim(), ...getUtmParams(), firstTouch: getFirstTouchAcquisition() });
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
              סימנים שיכולים להעיד על התעניינות<br />
              <span className="text-[#ffe27c]">ומה כדאי לברר לפני שמסיקים מסקנות</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed max-w-2xl">
              קל להתבלבל בין התלהבות רגעית לבין קשר שמקבל מקום בחיים. המדריך הזה מציע להתבונן ביוזמה, בהדדיות ובתקשורת - ולשאול מה מתאים לך, במקום לנסות לנחש מה עובר לו בראש.
            </p>
            <p className="text-white/65 text-base leading-relaxed max-w-2xl mt-4">
              אלה נקודות למחשבה ולשיחה, לא אבחון קליני, לא דרך לקבוע דפוס התקשרות ולא מנבא מובטח להצלחת זוגיות. התנהגות מקבלת משמעות בתוך ההקשר שלה ולאורך זמן.
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
                התנהגויות שיכולות לתמוך בחיבור
              </h2>
              <p className="text-[#727272] mt-4 text-base leading-relaxed">
                פרחים ומחמאות יכולים להיות נעימים. כדאי לשים לב גם למה שקורה בשגרה: האם יש הקשבה, הדדיות ורצון להכיר, והאם זה מתאים גם לך?
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
                דפוסים שכדאי לעצור ולברר
              </h2>
              <p className="text-white/60 mt-4 text-base leading-relaxed">
                לא כדי לתייג אותו או להפחיד אותך. כדי לתת מקום למה שאת מרגישה, לבקש בהירות ולבדוק אם ההתנהלות בקשר מתאימה לצרכים שלך.
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
                אני הילית כספי, מלווה רווקים ורווקות ושדכנית מקצועית. בגישה שלי יש מקום להיכרות עם עצמך, לשיחה על מה שאת מחפשת ולבחינה של הקשר כפי שהוא מתנהל בפועל.
              </p>
              <p className="text-[#555] leading-relaxed mb-4">
                אני לא מחפשת לתת לך רשימת מבחנים שהוא צריך לעבור. אני רוצה לעזור לך לשאול שאלות, להקשיב לעצמך ולבחור צעד שמתאים לך - בלי להבטיח שסימן מסוים יוביל לאהבה.
              </p>
              <p className="text-[#555] leading-relaxed">
                אם את רוצה לחשוב יחד על קשר או על דפוס שחוזר, אפשר לעשות את זה ב<Link href="/single-session" className="text-[#1800ad] underline hover:text-[#191265]">פגישה אישית איתי</Link>. אפשר גם <a href="/#about" className="text-[#1800ad] underline hover:text-[#191265]">להכיר את הסיפור והגישה שלי</a> לפני שבוחרים איך להמשיך.
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
                מעבר לשאלה אם הוא מעוניין<br />
                <span className="text-[#1800ad]">מה חשוב לך בקשר?</span>
              </h2>
              <p className="text-[#555] text-lg leading-relaxed mb-8">
                גם כשיש התעניינות הדדית, כדאי לברר מה מתאים לך. שאלון ה-DNA החינמי הוא כלי להתבוננות עצמית בהעדפות ובצרכים שלך בקשר. הוא יכול לפתוח כיווני מחשבה, לא לאבחן אותך, לקבוע עבורך מה לחפש או להבטיח התאמה.
              </p>
              <Link href="/dna-quiz"
                className="inline-block bg-[#191265] text-white font-black text-xl px-10 py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-xl">
                לשאלון DNA החינמי
              </Link>
              <p className="text-[#555] leading-relaxed mt-8">
                להמשך הקריאה: <Link href="/attraction" className="text-[#1800ad] underline hover:text-[#191265]">משיכה ומה כדאי לשים לב אליו</Link>, <Link href="/blog/chemistry-vs-compatibility-first-date" className="text-[#1800ad] underline hover:text-[#191265]">כימיה לעומת התאמה בדייט ראשון</Link>, או <Link href="/blog" className="text-[#1800ad] underline hover:text-[#191265]">מאמרים נוספים בבלוג</Link>.
              </p>
              <EditorialNextStep slug="signs" />
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
                תהליך ההצטרפות למאגר כולל מילוי פרופיל, שאלונים והעדפות, ובדיקה אנושית של המידע כחלק מתהליך השידוך. זו דרך להציע היכרויות בהתאם למידע שנמסר - לא אבחון של המשתתפים ולא הבטחה להתאמה או לזוגיות.
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
