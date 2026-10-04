import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Check, HeartHandshake, ShieldCheck, Sparkles, Ticket, UserRoundCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

const EDITORIAL_IMAGE = "/manus-storage/hilit-portrait-editorial_6e4736cc.jpg";
const BRIGHT_IMAGE = "/manus-storage/hilit-portrait-bright_56720420.jpg";
const JOIN_HREF = "/join?coupon=LIVE&utm_source=site&utm_medium=live_page&utm_campaign=live_october_2026";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.58, ease: [0.23, 1, 0.32, 1] as const } },
};

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-70px" }} variants={{ visible: { transition: { staggerChildren: 0.11 } } }} className={className}>{children}</motion.div>;
}

function Heading({ eyebrow, title, description, light = false }: { eyebrow: string; title: React.ReactNode; description?: string; light?: boolean }) {
  return <div className="mx-auto max-w-3xl text-center">
    <motion.p variants={fadeUp} className={`text-xs font-black tracking-[.18em] ${light ? "text-[#ffe27c]" : "text-[#4e3eb4]"}`}>{eyebrow}</motion.p>
    <motion.h2 variants={fadeUp} className={`mt-4 text-3xl font-black leading-[1.18] tracking-[-.04em] md:text-5xl ${light ? "text-white" : "text-[#191265]"}`}>{title}</motion.h2>
    {description ? <motion.p variants={fadeUp} className={`mx-auto mt-5 max-w-2xl text-base leading-8 md:text-lg ${light ? "text-white/76" : "text-[#625d78]"}`}>{description}</motion.p> : null}
  </div>;
}

export default function LiveDatabase() {
  const salesOpen = trpc.liveOctober.salesStatus.useQuery().data?.open === true;
  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265]">
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_13%_16%,rgba(255,226,124,.23),transparent_0_23%),radial-gradient(circle_at_84%_77%,rgba(91,68,210,.34),transparent_0_30%),linear-gradient(142deg,#17105b_0%,#191265_55%,#100a48_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.1)_50%,transparent_50.3%)] [background-size:86px_86px]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="text-sm font-black text-white transition hover:text-[#ffe27c]">הילית כספי</Link>
          <Link href="/live" className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:border-[#ffe27c] hover:text-[#ffe27c]">חזרה ללייב</Link>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-7 sm:px-8 md:pb-24 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:px-10">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="order-2 lg:order-1">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#ffe27c] backdrop-blur-sm"><Sparkles className="h-4 w-4" />הצטרפות מיוחדת לכבוד סדנת הלייב</motion.div>
            <motion.h1 variants={fadeUp} className="mt-6 max-w-3xl text-5xl font-black leading-[1.06] tracking-[-.055em] sm:text-6xl lg:text-7xl">נכנסים למאגר.<span className="block text-[#ffe27c]">נכנסים לשיחה.</span></motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-white/83 sm:text-xl">הצטרפות חד פעמית למאגר של הילית כספי עם קוד LIVE, ובתוכה כרטיס אחד במתנה לסדנת הלייב <strong className="text-[#ffe27c]">סודות ההתאמה המושלמת</strong>.</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {salesOpen ? <a href={JOIN_HREF} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 text-base font-black text-[#191265] shadow-[0_16px_35px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[.98]">להצטרפות למאגר עם LIVE <ArrowLeft className="h-5 w-5" /></a> : <span className="inline-flex items-center rounded-2xl border border-[#ffe27c]/40 px-8 py-4 font-black text-[#ffe27c]">הטבת LIVE תיפתח לאחר הכנת האירוע</span>}
              <Link href="/live" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-4 text-sm font-bold text-white transition hover:border-[#ffe27c] hover:text-[#ffe27c]">לפרטי הסדנה</Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/14 pt-6 text-xs font-bold text-white/74"><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />299 ₪ בתשלום חד פעמי</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />קוד LIVE נשמר בהרשמה</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />כרטיס לייב אחד כלול</span></motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.18 }} className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] border border-[#ffe27c]/25" />
            <div aria-hidden="true" className="absolute -inset-2 rounded-[2.4rem] bg-[#ffe27c]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_28px_80px_rgba(5,2,37,.48)]">
              <img src={EDITORIAL_IMAGE} alt="הילית כספי" className="aspect-[4/5] w-full object-cover object-[center_18%]" fetchPriority="high" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/18 bg-[#171053]/80 p-4 text-right shadow-xl backdrop-blur-md"><p className="text-xs font-black text-[#ffe27c]">המאגר של הילית כספי</p><p className="mt-1 text-sm font-bold leading-6 text-white">פרופיל, שאלון ותהליך היכרות שמכבד את הקצב שלך.</p></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute left-0 top-20 h-px w-[28%] bg-[#191265]/15" />
        <Reveal className="relative mx-auto max-w-6xl">
          <Heading eyebrow="ההצעה" title={<>המאגר ב־299 ₪.<br /><span className="text-[#4e3eb4]">כרטיס לייב אחד כלול.</span></>} description="הקוד LIVE מצורף להרשמה. ההצטרפות למאגר היא חד פעמית, והכרטיס הכלול מיועד לאירוע אחד בלבד: סודות ההתאמה המושלמת." />
          <motion.div variants={fadeUp} className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-[2rem] border border-[#191265]/12 bg-white shadow-[0_22px_55px_rgba(25,18,101,.1)]">
            <div className="bg-[linear-gradient(135deg,#17105b,#30247e)] p-7 text-center text-white sm:p-9">
              <p className="text-xs font-black tracking-[.18em] text-[#ffe27c]">LIVE · הצטרפות למאגר</p>
              <div className="mt-4 flex items-end justify-center gap-2"><span className="text-5xl font-black text-[#ffe27c]">299 ₪</span><span className="mb-2 text-sm font-bold text-white/65">חד פעמי</span></div>
              <p className="mt-3 text-sm leading-7 text-white/78">פרופיל במאגר, שאלון אישי ותהליך היכרות</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "יצירת פרופיל אישי",
                  "שאלון שמסייע לדייק העדפות",
                  "תהליך התאמה מאחורי הקלעים",
                  "כרטיס אחד לסדנת הלייב במתנה",
                ].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#f0eadc] p-4 text-sm font-bold leading-6 text-[#191265]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />{item}</div>)}
              </div>
              {salesOpen ? <a href={JOIN_HREF} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#191265] px-7 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#30247e]">להצטרפות עם קוד LIVE <ArrowLeft className="h-5 w-5" /></a> : <p className="mt-7 rounded-xl bg-[#f0eadc] p-4 text-center text-sm font-black text-[#191265]">הרשמה להטבת LIVE טרם נפתחה. הפרטים כאן הם תצוגה מוקדמת בלבד.</p>}
              <p className="mt-4 text-center text-xs leading-6 text-[#625d78]">{salesOpen ? "הקישור פותח את טופס ההרשמה עם קוד LIVE. אחרי אישור התשלום יופיע שובר אישי בדף התודה." : "קוד LIVE וטופס ההרשמה להטבה ייפתחו רק לאחר השלמת הכנת האירוע."}</p>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <Reveal className="mx-auto max-w-7xl">
          <Heading eyebrow="לא רק טופס" title="כך מתחיל תהליך היכרות." description="המאגר בנוי כדי לתת מקום לתמונה רחבה יותר: מי האדם, מה חשוב לו, ואיזה חיבור יכול להיות ראוי לבחינה." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ["01", "יוצרים פרופיל", "מוסיפים פרטים שמציגים את האדם שמאחורי הכותרת. פרופיל מדויק עוזר לייצר נקודת פתיחה טובה יותר."],
              ["02", "ממלאים שאלון", "השאלון נותן מקום להעדפות, לדפוסים ולתובנות שיכולות לעזור לדייק את תהליך ההתאמה."],
              ["03", "פותחים אפשרות להיכרות", "התאמות נבחנות מאחורי הקלעים. כל היכרות תלויה באנשים, בהסכמה ובזמן, ואינה מובטחת."],
            ].map(([number, title, text]) => <motion.article variants={fadeUp} key={number} className="rounded-[1.75rem] border border-[#191265]/10 bg-[#faf9f5] p-7 shadow-[0_14px_34px_rgba(25,18,101,.06)]"><span className="text-3xl font-black text-[#4e3eb4]">{number}</span><h3 className="mt-5 text-xl font-black text-[#191265]">{title}</h3><p className="mt-3 text-sm leading-7 text-[#625d78]">{text}</p></motion.article>)}
          </div>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#191265] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_87%_17%,rgba(255,226,124,.15),transparent_0_26%),linear-gradient(125deg,#191265,#100a4b)]" />
        <Reveal className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-sm"><div className="absolute -inset-3 rounded-[2.3rem] bg-[#ffe27c]/15 blur-xl" /><img src={BRIGHT_IMAGE} alt="הילית כספי" loading="lazy" decoding="async" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover object-[center_18%] shadow-[0_24px_55px_rgba(0,0,0,.3)]" /></motion.div>
          <div>
            <motion.p variants={fadeUp} className="inline-flex items-center gap-2 text-sm font-black text-[#ffe27c]"><Ticket className="h-4 w-4" />מתנה שמחברת בין ההתחלה לשיחה</motion.p>
            <motion.h2 variants={fadeUp} className="mt-4 max-w-2xl text-3xl font-black leading-[1.2] tracking-[-.04em] md:text-5xl">כרטיס אחד ללייב, בתוך ההצטרפות למאגר.</motion.h2>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-base leading-8 text-white/76">סדנת הלייב מתקיימת בשבת, 31 באוקטובר 2026, בשעה 20:30 לפי שעון ישראל. היא עוסקת בפרופיל, בהתאמה, בתובנות מהשאלון ובצעדים מעשיים להיכרות.</motion.p>
            <motion.div variants={fadeUp} className="mt-7 rounded-2xl border border-[#ffe27c]/30 bg-white/[.08] p-5 text-sm leading-7 text-white/80"><strong className="text-[#ffe27c]">חשוב:</strong> ההצטרפות כוללת בדיוק כרטיס אחד לאירוע הזה. אינה כוללת כרטיסים נוספים, הקלטה, פגישה אישית או הבטחה לתוצאה זוגית.</motion.div>
            <motion.div variants={fadeUp} className="mt-8"><Link href="/live" className="inline-flex items-center gap-2 font-black text-[#ffe27c] underline decoration-white/30 decoration-2 underline-offset-8 transition hover:text-white">לפרטי סדנת הלייב <ArrowLeft className="h-4 w-4" /></Link></motion.div>
          </div>
        </Reveal>
      </section>

      <section className="bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-24 lg:px-10">
        <Reveal className="mx-auto max-w-4xl">
          <Heading eyebrow="כמה תשובות לפני שמתחילים" title="טוב לדעת" />
          <div className="mt-10 space-y-3">
            {[
              ["מה כולל המחיר של 299 ₪?", "הצטרפות חד פעמית למאגר עם קוד LIVE, כולל יצירת פרופיל, שאלון ותהליך ההצטרפות למאגר, וכן כרטיס אחד לסדנת הלייב."],
              ["כמה כרטיסים לסדנה כלולים?", "בדיוק כרטיס אחד לסדנת סודות ההתאמה המושלמת. ההטבה אינה ניתנת להכפלה או להעברה."],
              ["האם ההצטרפות מבטיחה התאמה או היכרות?", "לא. תהליך ההתאמה תלוי בפרופילים, בהעדפות, בהסכמה ובנסיבות המשתנות. אין הבטחה להתאמה, דייט או זוגיות."],
              ["איך נצטרף כשמכירת LIVE תיפתח?", "נפתח את טופס ההרשמה הקיים עם קוד LIVE שיועבר אוטומטית. משם ממשיכים בשלבי ההרשמה והתשלום המאובטח."],
            ].map(([question, answer]) => <motion.article variants={fadeUp} key={question} className="rounded-2xl border border-[#191265]/10 bg-white p-5"><h3 className="font-black text-[#191265]">{question}</h3><p className="mt-3 text-sm leading-7 text-[#625d78]">{answer}</p></motion.article>)}
          </div>
        </Reveal>
      </section>

      <section className="bg-[#100a48] px-5 py-16 text-center text-white sm:px-8">
        <Reveal className="mx-auto max-w-2xl">
          <motion.div variants={fadeUp} className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#ffe27c]/35 bg-white/10 text-[#ffe27c]"><HeartHandshake className="h-6 w-6" /></motion.div>
          <motion.h2 variants={fadeUp} className="mt-5 text-3xl font-black leading-tight md:text-4xl">לתת להיכרות מקום להתחיל.</motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-base leading-8 text-white/75">מצטרפים למאגר ב־299 ₪ עם קוד LIVE, ומקבלים כרטיס אחד לסדנת הלייב במתנה.</motion.p>
          {salesOpen ? <motion.a variants={fadeUp} href={JOIN_HREF} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 font-black text-[#191265] shadow-xl transition hover:-translate-y-0.5 hover:bg-white">להצטרפות למאגר עם LIVE <ArrowLeft className="h-5 w-5" /></motion.a> : <motion.p variants={fadeUp} className="mt-8 font-bold text-[#ffe27c]">ההרשמה למסלול LIVE תיפתח בקרוב.</motion.p>}
        </Reveal>
      </section>

      <footer className="bg-[#0b0736] px-5 py-9 text-center text-xs text-white/55 sm:px-8"><div className="mx-auto flex max-w-3xl flex-col items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#ffe27c]" /><p>הילית כספי · הצטרפות למאגר ולסדנת הלייב</p><div className="flex gap-4 font-bold"><a href="/terms/database" className="transition hover:text-[#ffe27c]">תקנון</a><Link href="/live" className="transition hover:text-[#ffe27c]">סדנת הלייב</Link><Link href="/" className="transition hover:text-[#ffe27c]">חזרה לאתר</Link></div></div></footer>
    </main>
  );
}
