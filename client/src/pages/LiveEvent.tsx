import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Crown,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRoundCheck,
} from "lucide-react";
import GrowWallet from "@/components/GrowWallet";
import { trpc } from "@/lib/trpc";

const HERO_IMAGE = "/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg";
const AUDIENCE_IMAGE = "/manus-storage/hilit-speaking-to-audience_38bd148d.jpg";
const EVENT_DATE = "שבת, 31 באוקטובר 2026";
const EVENT_TIME = "20:30 לפי שעון ישראל";
const EVENT_START = new Date("2026-10-31T20:30:00+02:00").getTime();

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const liveTopics = [
  ["מה באמת קורה מאחורי ההתאמה", "איך העדפות, תשובות לשאלון והיכרות אנושית מצטרפים לתמונה אחת — ומה אי אפשר לדעת רק מנתון בודד."],
  ["פרופיל שמאפשר להכיר אתכם", "על הפרטים, התמונות והניסוח שעוזרים להציג אדם שלם; בלי לייצר דמות ובלי להעמיס מידע שלא משרת את ההיכרות."],
  ["איך קוראים את השאלון נכון", "איך להשתמש בתשובות כדי לדייק שיחה, ערכים וקצב, ולא להפוך את השאלון לציון או לתווית."],
  ["פסיכולוגיה של התחלה טובה", "מחשבות מבוססות פסיכולוגיה על ציפיות, סקרנות, הקשבה וגבולות בתחילת היכרות — בלי נוסחאות קסם ובלי הבטחות לתוצאה."],
  ["בחירה, סימני שאלה והמשך הדרך", "איך אפשר להישאר קשובים למה שעולה תוך כדי היכרות, ולבחון התאמה בנחת ובכנות."],
  ["שאלות אמיתיות מהקהל", "יהיה זמן ללייב Q&A: אפשר לשלוח שאלה מראש לאחר ההרשמה, והילית תבחר שאלות לשיחה החיה ככל שיתאפשר."],
] as const;

const steps = [
  ["01", "בוחרים דרך להצטרף", "כרטיס רגיל, הטבת FRIENDS אישית למי שזכאים, או שובר Plus חינמי באזור האישי."],
  ["02", "שולחים שאלה מראש", "לאחר ההרשמה אפשר לשלוח שאלה. השאלות עוזרות לעצב את השיחה, בלי התחייבות למענה על כל שאלה."],
  ["03", "נפגשים בלייב", "בשבת בערב נפתח מפגש חי עם הילית: מאחורי הקלעים, כלים מעשיים וזמן לשאלות נבחרות."],
] as const;

function getRemainingTime(now: number) {
  const totalSeconds = Math.max(0, Math.floor((EVENT_START - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function LiveCountdown() {
  const [remaining, setRemaining] = useState(() => getRemainingTime(Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(getRemainingTime(Date.now()));
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    [remaining.days, "ימים"],
    [remaining.hours, "שעות"],
    [remaining.minutes, "דקות"],
    [remaining.seconds, "שניות"],
  ] as const;

  return (
    <div className="mt-8 max-w-xl rounded-[1.5rem] border border-[#ffe27c]/30 bg-white/[.08] p-4 shadow-[0_14px_35px_rgba(0,0,0,.16)] backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-black text-[#ffe27c]">
        <Clock3 className="h-4 w-4" />
        <span>עד תחילת הלייב</span>
      </div>
      <div aria-live="off" aria-label="ספירה לאחור עד תחילת הלייב" className="mt-4 grid grid-cols-4 gap-2 text-center sm:gap-3">
        {units.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-white/12 bg-[#100a48]/45 px-1 py-3">
            <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">{String(value).padStart(2, "0")}</div>
            <div className="mt-1 text-[10px] font-bold text-white/65 sm:text-xs">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-white/68">הספירה היא עד תחילת המפגש. פתיחת רכישת הכרטיסים וההטבות נשארת כפופה לזמינות ההרשמה.</p>
    </div>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={{ visible: { transition: { staggerChildren: 0.11 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Rule({ light = false }: { light?: boolean }) {
  return <div aria-hidden="true" className={`h-px w-20 bg-gradient-to-l from-transparent via-current to-transparent ${light ? "text-[#ffe27c]/80" : "text-[#191265]/35"}`} />;
}

function SectionHeading({ eyebrow, title, description, light = false }: { eyebrow: string; title: React.ReactNode; description?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.div variants={fadeUp} className={`flex items-center justify-center gap-3 text-xs font-black tracking-[.18em] ${light ? "text-[#ffe27c]" : "text-[#191265]"}`}>
        <Rule light={light} />
        <span>{eyebrow}</span>
        <Rule light={light} />
      </motion.div>
      <motion.h2 variants={fadeUp} className={`mt-5 text-3xl font-black leading-[1.18] tracking-[-.04em] md:text-5xl ${light ? "text-white" : "text-[#191265]"}`}>
        {title}
      </motion.h2>
      {description ? <motion.p variants={fadeUp} className={`mx-auto mt-5 max-w-2xl text-base leading-8 md:text-lg ${light ? "text-white/76" : "text-[#5d587e]"}`}>{description}</motion.p> : null}
    </div>
  );
}

function FriendLinkRequest() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const requestLink = trpc.singles.sendDashboardLink.useMutation({
    onSuccess: () => setMessage("אם נמצאה חברות פעילה, נשלח קישור אישי ומאובטח למייל הרשום במאגר."),
    onError: () => setMessage("לא הצלחנו לשלוח קישור כרגע. אפשר לנסות שוב בעוד רגע."),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("יש להזין כתובת אימייל כדי לקבל קישור אישי.");
      return;
    }
    setMessage("");
    requestLink.mutate({ email: normalizedEmail, origin: window.location.origin });
  };

  return (
    <div id="friend-link" className="rounded-[1.7rem] border border-[#191265]/12 bg-[#faf7f0] p-5 text-right shadow-[0_16px_40px_rgba(25,18,101,.08)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]"><KeyRound className="h-5 w-5" /></span>
        <div>
          <p className="font-black text-[#191265]">כבר חברים במאגר ורוצים מחיר FRIENDS?</p>
          <p className="mt-1 text-sm leading-6 text-[#625d78]">הטבת FRIENDS נפתחת רק מתוך קישור אישי ומאובטח. לא מזינים קוד ציבורי: מזינים את כתובת המייל של החברות כדי לבקש קישור אישי לאזור האישי.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="live-friend-email">כתובת אימייל</label>
        <input
          id="live-friend-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="כתובת אימייל"
          className="min-w-0 flex-1 rounded-xl border border-[#191265]/15 bg-white px-4 py-3 text-right text-sm text-[#191265] outline-none transition placeholder:text-[#77718a] focus:border-[#191265] focus:ring-2 focus:ring-[#ffe27c]"
        />
        <button type="submit" disabled={requestLink.isPending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#191265] px-5 py-3 text-sm font-black text-white transition hover:bg-[#292177] disabled:cursor-wait disabled:opacity-70">
          <Mail className="h-4 w-4" />
          {requestLink.isPending ? "שולחים קישור" : "לבקשת קישור אישי"}
        </button>
      </form>
      {message ? <p className="mt-3 text-xs leading-5 text-[#625d78]" role="status">{message}</p> : null}
    </div>
  );
}

export default function LiveEvent() {
  const salesStatus = trpc.liveOctober.salesStatus.useQuery();
  const salesOpen = salesStatus.data?.open === true;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const email = params.get("email")?.trim().toLowerCase() || "";
  const token = params.get("token") || "";
  const hasPersonalLink = Boolean(email && token);
  const eligibilityQuery = trpc.liveOctober.eligibility.useQuery(
    { email, token },
    { enabled: hasPersonalLink, retry: false },
  );
  const eligibility = eligibilityQuery.data;
  const isFriendEligible = Boolean(eligibility?.eligible && !eligibility?.plus);
  const hasPlus = Boolean(eligibility?.plus);
  const personalAreaHref = hasPersonalLink
    ? `/my-profile?${new URLSearchParams({ email, token }).toString()}`
    : "/my-profile";
  const needsFriendGuidance = hasPersonalLink && eligibilityQuery.isSuccess && !eligibility?.eligible;

  const scrollToTickets = () => document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goToThankYou = () => window.location.assign("/live/thank-you");

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265]">
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_16%,rgba(255,226,124,.23),transparent_0_24%),radial-gradient(circle_at_87%_80%,rgba(102,80,224,.34),transparent_0_31%),linear-gradient(142deg,#17105b_0%,#191265_55%,#100a48_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.08)_50%,transparent_50.3%)] [background-size:84px_84px]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="text-sm font-black text-white transition hover:text-[#ffe27c]">הילית כספי</Link>
          <button type="button" onClick={scrollToTickets} className="rounded-full border border-[#ffe27c]/50 bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265] transition hover:bg-white sm:px-5 sm:text-sm">לפרטי הכרטיסים</button>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-9 px-5 pb-16 pt-7 sm:px-8 md:pb-24 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:px-10">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="order-1">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#ffe27c] backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              לראשונה · מפגש לייב אישי עם הילית כספי
            </motion.div>
            <motion.p variants={fadeUp} className="mt-6 text-sm font-bold tracking-wide text-white/66">{EVENT_DATE} · {EVENT_TIME}</motion.p>
            <motion.h1 variants={fadeUp} className="mt-3 max-w-3xl text-5xl font-black leading-[1.05] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              סודות ההתאמה
              <span className="block text-[#ffe27c]">המושלמת.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-white/83 sm:text-xl">
              ערב כזה עוד לא עשיתי: לראשונה ניפגש בלייב כדי לפתוח את מאחורי הקלעים של ההתאמות. נדבר על מה באמת עובד בפרופיל, איך נבחנת התאמה ומה יכול לעזור להגיע להיכרות מדויקת יותר.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 text-sm font-black text-[#ffe27c]">כרטיס רגיל 149 ₪ · חברי מאגר זכאים 49 ₪ · חברי Plus זכאים ללא עלות</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={scrollToTickets} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 text-base font-black text-[#191265] shadow-[0_16px_35px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[.98]">לפרטי הכרטיסים וההטבות <ArrowLeft className="h-5 w-5" /></button>
              <a href="#what-awaits" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-4 text-sm font-bold text-white transition hover:border-[#ffe27c] hover:text-[#ffe27c]">מה נפתח בלייב?</a>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/14 pt-6 text-xs font-bold text-white/72">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />הילית בלייב, לא הקלטה</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />שאלות שנשלחות מראש</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />כלים מעשיים, בלי הבטחות קסם</span>
            </motion.div>
            <motion.div variants={fadeUp}><LiveCountdown /></motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative order-2 mx-auto w-full max-w-md lg:max-w-none">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] border border-[#ffe27c]/25" />
            <div aria-hidden="true" className="absolute -inset-2 rounded-[2.4rem] bg-[#ffe27c]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_28px_80px_rgba(5,2,37,.48)]">
              <img src={HERO_IMAGE} alt="הילית כספי מחייכת" className="aspect-[4/5] w-full object-cover object-[center_18%]" fetchPriority="high" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/18 bg-[#171053]/80 p-4 text-right shadow-xl backdrop-blur-md">
                <p className="text-xs font-black text-[#ffe27c]">בשבת, 31.10 · 20:30</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white">מפגש חי עם הילית על מה שעוזר לפרופיל ולהיכרות לעבוד טוב יותר.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="what-awaits" className="relative overflow-hidden bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute left-0 top-20 h-px w-[27%] bg-[#191265]/15" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading eyebrow="במפגש הזה" title={<>פחות ניחושים.<br /><span className="text-[#4e3eb4]">יותר הבנה של התהליך.</span></>} description="זהו מפגש למי שרוצים לשפר את הדרך שבה הם מציגים את עצמם ובוחרים להכיר. לא נבטיח התאמה, דייט או זוגיות — כן נשתף נקודת מבט, כלים ושאלות טובות יותר." />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveTopics.map(([title, text], index) => (
              <motion.article key={title} variants={fadeUp} className="group relative overflow-hidden rounded-[1.75rem] border border-[#191265]/10 bg-[#faf8f2] p-7 shadow-[0_14px_34px_rgba(25,18,101,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(25,18,101,.11)] sm:p-8">
                <span className="absolute left-5 top-4 text-5xl font-black leading-none text-[#191265]/[.055]">0{index + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]"><Sparkles className="h-5 w-5" /></span>
                <h3 className="mt-5 text-xl font-black text-[#191265]">{title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-[#635e76]">{text}</p>
              </motion.article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute -right-24 top-0 h-72 w-72 rounded-full border-[38px] border-[#ffe27c]/25" />
        <Reveal className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-20">
          <motion.div variants={fadeUp} className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 text-sm font-black text-[#4e3eb4]"><UserRoundCheck className="h-4 w-4" />מאחורי התאמה יש אנשים</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-[1.2] tracking-[-.04em] text-[#191265] md:text-5xl">אני רוצה לפתוח את מה שבדרך כלל נשאר מאחורי הקלעים.</h2>
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-[#625d78]">
              <p>במשך המפגש אספר איך אני מסתכלת על פרופיל, העדפות ותשובות לשאלון כחומר גלם לשיחה — ולא כרשימת נתונים שמחליטה במקומנו.</p>
              <p>חשוב לי שיהיה כאן מקום לשאלות אמיתיות: מה נכון לכתוב, איך ניגשים לבחירה, ומה אפשר ללמוד תוך כדי היכרות. זה לא אבחון אישי או הבטחה לתוצאה מסוימת.</p>
            </div>
            <a href="#tickets" className="mt-8 inline-flex items-center gap-2 font-black text-[#191265] underline decoration-[#ffe27c] decoration-4 underline-offset-8 transition hover:text-[#4e3eb4]">לכרטיסים, להטבות ולשאלות מראש <ArrowLeft className="h-4 w-4" /></a>
          </motion.div>
          <motion.figure variants={fadeUp} className="order-1 overflow-hidden rounded-[2rem] border border-[#191265]/10 bg-[#f0eadc] p-2 shadow-[0_24px_55px_rgba(25,18,101,.14)] lg:order-2">
            <img src={AUDIENCE_IMAGE} alt="הילית כספי מדברת מול קהל" loading="lazy" decoding="async" className="w-full rounded-[1.55rem]" />
            <figcaption className="px-3 py-4 text-sm font-bold leading-6 text-[#625d78]">הילית מול קהל באחד ממפגשיה. בלייב הקרוב נפתח גם מקום לשאלות שלכם.</figcaption>
          </motion.figure>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#191265] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_83%_22%,rgba(255,226,124,.17),transparent_0_25%),linear-gradient(125deg,#191265,#100a4b)]" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading light eyebrow="כך מגיעים מוכנים" title="שלושה רגעים, מפגש אחד." description="פרטי ההצטרפות יימסרו לנרשמים בערוץ המאובטח המתאים. אין קישור גישה בעמוד הציבורי." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, text]) => (
              <motion.article variants={fadeUp} key={number} className="rounded-[1.7rem] border border-white/15 bg-white/[.075] p-6 backdrop-blur-sm sm:p-7">
                <span className="text-3xl font-black text-[#ffe27c]">{number}</span>
                <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">{text}</p>
              </motion.article>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="tickets" className="scroll-mt-8 bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <Reveal className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="כרטיסים והטבות" title={<>מגיעים ללייב<br /><span className="text-[#4e3eb4]">בדרך שמתאימה לכם.</span></>} description="כרטיס רגיל הוא 149 ₪. חברי מאגר זכאים מקבלים הטבה אישית רק דרך קישור מאובטח, וחברי Plus מוצאים שובר חינמי באזור האישי." />

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.1fr]">
            <motion.article variants={fadeUp} className="rounded-[2rem] border border-[#191265]/12 bg-white p-6 text-right shadow-[0_18px_45px_rgba(25,18,101,.08)] sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#191265]/10 pb-5">
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-[#4e3eb4]">כרטיס רגיל</p>
                  <h3 className="mt-2 text-2xl font-black text-[#191265]">כניסה למפגש הלייב</h3>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0eadc] text-[#191265]"><Ticket className="h-5 w-5" /></span>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-[#625d78]">
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />השתתפות בלייב בשבת, 31 באוקטובר, ב־20:30</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />אפשרות לשליחת שאלה מראש לאחר ההרשמה</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />פרטי הצטרפות בערוץ מאובטח לאחר אישור</li>
              </ul>
              <div className="mt-7 rounded-2xl bg-[#191265] p-5 text-center text-white shadow-lg">
                <p className="text-xs font-bold text-white/70">מחיר כרטיס רגיל</p>
                <p className="mt-1 text-5xl font-black text-[#ffe27c]">149 ₪</p>
                <p className="mt-2 text-xs text-white/70">תשלום חד־פעמי · הרכישה זמינה רק כשההרשמה פתוחה</p>
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#17105b,#30247e)] p-6 text-right text-white shadow-[0_23px_60px_rgba(25,18,101,.3)] sm:p-8">
              <div aria-hidden="true" className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#ffe27c]/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-[#ffe27c]">חברי המאגר</p>
                  <h3 className="mt-2 text-2xl font-black">הטבה אישית ל־FRIENDS</h3>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffe27c]/30 bg-white/10 text-[#ffe27c]"><Crown className="h-5 w-5" /></span>
              </div>
              <p className="relative mt-6 text-sm leading-7 text-white/78">חברות פעילה במאגר פותחת מחיר אישי של 49 ₪, רק לאחר אימות דרך קישור אישי. השרת בודק את הזכאות; FRIENDS אינו קוד פתוח לציבור.</p>
              <div className="relative mt-6 flex items-end gap-3">
                <span className="mb-1 text-lg text-white/45 line-through">149 ₪</span>
                <span className="text-4xl font-black text-[#ffe27c]">49 ₪</span>
                <span className="mb-1 text-xs font-bold text-white/65">לאחר אימות חברות</span>
              </div>
              <div className="relative mt-6 rounded-2xl border border-white/15 bg-white/[.08] p-4 text-xs leading-6 text-white/74">
                <span className="font-black text-[#ffe27c]">כבר ב־Plus?</span> שובר חינמי אישי ללייב מחכה באזור האישי, בכפוף לזכאות פעילה.
              </div>
            </motion.article>
          </div>

          <motion.div variants={fadeUp} className="mx-auto mt-6 max-w-6xl rounded-[2rem] border border-[#d9c777] bg-[linear-gradient(115deg,#fffaf0,#f6edcd)] p-6 shadow-[0_16px_40px_rgba(117,91,11,.10)] sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-[#796116]"><Sparkles className="h-4 w-4" />לא חברים במאגר עדיין?</p>
                <h3 className="mt-2 text-2xl font-black text-[#191265]">מצטרפים למאגר עם קוד LIVE ומקבלים כרטיס אחד במתנה.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#625d78]">הצטרפות חד־פעמית למאגר ב־299 ₪. יוצרים פרופיל, ממלאים שאלון ומתחילים את תהליך ההיכרות. ההצטרפות כוללת בדיוק כרטיס אחד למפגש הלייב, ללא כפל כרטיסים.</p>
              </div>
              {salesOpen ? <a href="/live/database" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#191265] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#30247e]">לפרטי ההצטרפות למאגר <ArrowLeft className="h-4 w-4" /></a> : <span className="rounded-2xl border border-[#191265]/20 px-6 py-4 text-sm font-black text-[#191265]">פרטי ההטבה ייפתחו כשההרשמה תהיה זמינה</span>}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mx-auto mt-10 max-w-3xl">
            {hasPersonalLink && eligibilityQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-sm">
                <p className="font-black text-[#191265]">בודקים את הזכאות האישית שלך</p>
                <p className="mt-2 text-sm text-[#625d78]">רגע אחד, כדי לשמור על ההטבה אישית ומאובטחת.</p>
              </div>
            ) : hasPlus ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-[0_16px_40px_rgba(25,18,101,.08)] sm:p-9">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]"><Crown className="h-6 w-6" /></span>
                <h3 className="mt-5 text-2xl font-black text-[#191265]">שובר Plus חינמי מחכה באזור האישי</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#625d78]">עם Plus פעיל, כרטיס הלייב ללא עלות זמין דרך השובר האישי באזור האישי. כך נשמרת ההטבה אישית ומדויקת.</p>
                <a href={personalAreaHref} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#191265] px-7 py-4 text-sm font-black text-white transition hover:bg-[#30247e]">לשובר החינמי שלי באזור האישי <ArrowLeft className="h-4 w-4" /></a>
                <p className="mt-4 text-xs text-[#625d78]">אפשר גם להכיר את מסלול ההטבות של <a href="/database-plus" className="font-black text-[#191265] underline underline-offset-4">Database Plus</a>.</p>
              </div>
            ) : !salesOpen ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-sm">
                <h3 className="text-xl font-black text-[#191265]">ההרשמה ללייב תיפתח בקרוב</h3>
                <p className="mt-2 text-sm leading-7 text-[#625d78]">הכרטיס הרגיל עולה 149 ₪. לחברי מאגר זכאים יש הטבת FRIENDS אישית; לחברי Plus זכאים יש שובר ללא עלות. לא נגבה תשלום עד שהאירוע המקוון וקישורי הכניסה יהיו מוכנים.</p>
                <div className="mx-auto mt-5 max-w-sm text-right">
                  <label htmlFor="friends-code-preview" className="mb-2 block text-sm font-bold text-[#191265]">קוד הטבה לחברי המאגר</label>
                  <input id="friends-code-preview" disabled placeholder="אפשר יהיה להזין קוד כשההרשמה תיפתח" className="w-full rounded-xl border border-[#191265]/15 bg-[#f5f3ef] px-4 py-3 text-sm text-[#625d78] placeholder:text-[#807b8b]" />
                  <p className="mt-2 text-xs leading-5 text-[#625d78]">הפעלת FRIENDS תדרוש גם אימות חברות דרך קישור אישי. הקוד לבדו אינו מעניק הנחה.</p>
                </div>
              </div>
            ) : isFriendEligible ? (
              <div className="overflow-hidden rounded-[1.9rem] border border-[#191265]/10 bg-white shadow-[0_18px_45px_rgba(25,18,101,.1)]">
                <div className="bg-[#191265] px-6 py-5 text-center text-white">
                  <p className="text-xs font-black tracking-[.16em] text-[#ffe27c]">ההטבה האישית נפתחה</p>
                  <h3 className="mt-2 text-2xl font-black">כרטיס FRIENDS ב־49 ₪</h3>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-center text-sm leading-7 text-[#625d78]">האימות בוצע בקישור האישי. קוד FRIENDS מוחל כאן בלבד והשרת מאמת את הזכאות, כדי שההטבה תישאר לחברי המאגר הזכאים.</p>
                  <GrowWallet
                    product="live_october"
                    prefillEmail={email}
                    prefillCoupon="FRIENDS"
                    personalToken={token}
                    showCoupon={true}
                    buttonLabel="להמשך לתשלום המאובטח ב־49 ₪"
                    buttonClassName="!mt-6 !w-full !rounded-2xl !bg-[#191265] !py-4 !font-black !text-white hover:!bg-[#30247e]"
                    termsPath="/terms/live-october"
                    onSuccess={goToThankYou}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 rounded-[1.9rem] border border-[#191265]/10 bg-white p-6 shadow-[0_18px_45px_rgba(25,18,101,.08)] md:grid-cols-[.9fr_1.1fr] md:items-center sm:p-8">
                <div className="text-right">
                  <p className="text-xs font-black tracking-[.16em] text-[#4e3eb4]">כרטיס רגיל</p>
                  <h3 className="mt-2 text-2xl font-black text-[#191265]">מקום ללייב ב־149 ₪</h3>
                  <p className="mt-3 text-sm leading-7 text-[#625d78]">המחיר הרגיל פתוח לכל מי שרוצים להצטרף לשיחה. פרטי ההצטרפות יועברו לאחר אישור ההרשמה.</p>
                </div>
                <GrowWallet
                  product="live_october"
                  showCoupon={true}
                  buttonLabel="להמשך לתשלום המאובטח ב־149 ₪"
                  buttonClassName="!w-full !rounded-2xl !bg-[#191265] !py-4 !font-black !text-white hover:!bg-[#30247e]"
                  termsPath="/terms/live-october"
                  onSuccess={goToThankYou}
                />
                <p className="md:col-span-2 text-center text-xs leading-6 text-[#625d78]">כבר חברים במאגר? קוד FRIENDS אינו קוד ציבורי: ההטבה נפתחת רק דרך קישור אישי מאומת. <a href="#friend-link" className="font-black text-[#191265] underline underline-offset-4">לבקשת קישור אישי</a>.</p>
                {needsFriendGuidance ? <div className="md:col-span-2 rounded-xl border border-[#d9c777] bg-[#fffaf0] p-4 text-center text-xs leading-6 text-[#625d78]"><strong className="text-[#191265]">הטבת FRIENDS לא נפתחה בקישור הזה.</strong> קוד FRIENDS אינו זמין ללא אימות חברות פעילה. כדי לבדוק זכאות או לקבל קישור אישי עדכני, אפשר <a href="#friend-link" className="font-black text-[#191265] underline underline-offset-4">לבקש קישור אישי</a>.</div> : null}
              </div>
            )}
          </motion.div>

          {(!hasPersonalLink || needsFriendGuidance) && !hasPlus ? <motion.div variants={fadeUp} className="mx-auto mt-6 max-w-3xl"><FriendLinkRequest /></motion.div> : null}
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-[#6d6780]">הכרטיס מעניק השתתפות באירוע עצמו. המפגש הוא תוכן לימודי ואינו מבטיח התאמה, היכרות, דייט או זוגיות.</motion.p>
        </Reveal>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 md:py-24 lg:px-10">
        <Reveal className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="שאלות קצרות לפני שמצטרפים" title="טוב לדעת" />
          <div className="mt-10 space-y-3">
            {[
              ["למי מתאים המפגש?", "למי שרוצים להבין טוב יותר היכרות, פרופיל ובחירה. אין צורך להיות חברים במאגר כדי לרכוש כרטיס רגיל כשההרשמה פתוחה."],
              ["אפשר לשלוח שאלה מראש?", "כן. לאחר ההרשמה תהיה דרך לשלוח שאלה מראש. נעשה מאמץ להתייחס לשאלות, אך אין התחייבות למענה על כל שאלה."],
              ["איך מקבלים את פרטי ההצטרפות?", "לאחר אישור ההרשמה פרטי ההצטרפות יימסרו לנרשמים בערוץ מאובטח. העמוד הציבורי אינו מציג קישור גישה."],
              ["איך עובדת הטבת FRIENDS או Plus?", "הטבת FRIENDS זמינה רק דרך קישור אישי ואימות זכאות בשרת; זה אינו קוד ציבורי. לחברי Plus זכאים מחכה שובר חינמי אישי באזור האישי."],
            ].map(([question, answer]) => (
              <motion.details variants={fadeUp} key={question} className="group rounded-2xl border border-[#191265]/10 bg-[#faf9f5] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-[#191265] marker:content-none"><span>{question}</span><ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" /></summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#625d78]">{answer}</p>
              </motion.details>
            ))}
          </div>
        </Reveal>
      </section>

      <footer className="bg-[#100a48] px-5 py-10 text-center text-white/65 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
          <ShieldCheck className="h-6 w-6 text-[#ffe27c]" />
          <p className="text-sm font-black text-white">מאחורי הקלעים של ההתאמות · הילית כספי</p>
          <p className="max-w-2xl text-xs leading-6">ההרשמה והתשלום מתבצעים במערכת מאובטחת. תנאי ההשתתפות והביטול מפורטים בתקנון.</p>
          <div className="flex items-center gap-4 text-xs font-bold"><a href="/terms/live-october" className="transition hover:text-[#ffe27c]">תקנון הלייב</a><a href="/database-plus" className="transition hover:text-[#ffe27c]">Database Plus</a><Link href="/" className="transition hover:text-[#ffe27c]">חזרה לאתר</Link></div>
        </div>
      </footer>
    </main>
  );
}
