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
import { liveDatabaseOfferHref } from "@shared/liveCampaignLinks";

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
  ["מה קורה מאחורי ההתאמה", "אפתח את הדרך שבה אני מחברת בין העדפות, תשובות לשאלון והיכרות אישית עם האנשים שמאחורי הפרופילים."],
  ["פרופיל שעובד בשבילכם", "נדבר על תמונות, ניסוח ופרטים קטנים שעוזרים לי לראות מי אתם באמת ולתת לאדם הנכון הזדמנות להכיר אתכם."],
  ["מה מספר השאלון הזוגי", "אראה איך אפשר להבין מהתשובות ערכים, קצב וציפיות, ומה כדאי לשאול לפני שממהרים להחליט על התאמה."],
  ["סודות של התחלה טובה", "נדבר על המשיכה הראשונית, על ציפיות ועל הדרך שבה שיחה אחת יכולה לפתוח דלת להיכרות אחרת."],
  ["מה עושים כשההיכרות מתחילה", "אשתף מהניסיון שלי על בחירה, סקרנות ותקשורת בתחילת קשר, וגם על הרגעים שבהם כדאי לעצור ולבדוק מה באמת מרגיש נכון."],
  ["השאלות שלכם", "אחרי ההרשמה תוכלו לשלוח לי שאלה מראש. אבחר נושאים שעלו ואקדיש להם מקום בשיחה החיה."],
] as const;

const steps = [
  ["01", "בוחרים את הדרך להצטרף", "כרטיס רגיל, הטבה אישית לחברי המאגר או שובר חינמי לחברי Plus באזור האישי."],
  ["02", "שולחים לי שאלה", "אחרי ההרשמה תוכלו לשלוח שאלה מראש ולעזור לי להבין מה הכי מסקרן אתכם לקראת הערב."],
  ["03", "נפגשים בזום", "מכל מקום, נפתח יחד את מאחורי הקלעים של ההתאמות, נדבר על פרופילים ועל היכרות, ונשאיר זמן לשאלות שלכם."],
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

function LiveCountdown({ salesOpen }: { salesOpen: boolean }) {
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
      <p className="mt-3 text-xs leading-5 text-white/68">{salesOpen ? "ההרשמה פתוחה. קישור הכניסה האישי יישלח בנפרד לקראת המפגש." : "השעון סופר עד תחילת המפגש. ההרשמה תיפתח אחרי שפרטי הכניסה יהיו מוכנים."}</p>
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
          <p className="font-black text-[#191265]">כבר חברים במאגר? הכנתי לכם מחיר מיוחד.</p>
          <p className="mt-1 text-sm leading-6 text-[#625d78]">השאירו את כתובת המייל שאיתה נרשמתם למאגר. אשלח אליה קישור אישי, ומהקישור תוכלו לראות את ההטבה לאחר בדיקת הזכאות.</p>
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
  const databaseGiftOpen = salesStatus.data?.databaseGiftOpen === true;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const databaseOfferHref = liveDatabaseOfferHref(window.location.search);
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

  const scrollToTickets = () => document.getElementById("ticket-purchase")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  const goToThankYou = (appliedCode?: string) => window.location.assign(appliedCode === "TEST1" ? "/live/thank-you?test=1" : "/live/thank-you");

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265]">
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_16%,rgba(255,226,124,.23),transparent_0_24%),radial-gradient(circle_at_87%_80%,rgba(102,80,224,.34),transparent_0_31%),linear-gradient(142deg,#17105b_0%,#191265_55%,#100a48_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.08)_50%,transparent_50.3%)] [background-size:84px_84px]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="text-sm font-black text-white transition hover:text-[#ffe27c]">הילית כספי</Link>
          <button type="button" onClick={scrollToTickets} className="rounded-full border border-[#ffe27c]/50 bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265] transition hover:bg-white sm:px-5 sm:text-sm">לרכישת כרטיס</button>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-9 px-5 pb-16 pt-7 sm:px-8 md:pb-24 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:px-10">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="order-1">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#ffe27c] backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              לראשונה · מפגש לייב אונליין בזום עם הילית כספי
            </motion.div>
            <motion.p variants={fadeUp} className="mt-6 text-sm font-bold tracking-wide text-white/66">{EVENT_DATE} · {EVENT_TIME} · אונליין בזום</motion.p>
            <motion.h1 variants={fadeUp} className="mt-3 max-w-3xl text-5xl font-black leading-[1.05] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              סודות ההתאמה
              <span className="block text-[#ffe27c]">המושלמת.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-white/83 sm:text-xl">
              ערב כזה עוד לא עשיתי. בפעם הראשונה אני מזמינה אתכם למפגש חי איתי בזום, מכל מקום, לשמוע איך אני בוחנת התאמות מאחורי הקלעים ולגלות מה יכול להפוך את הפרופיל שלכם להזדמנות אמיתית להיכרות.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 text-sm font-black text-[#ffe27c]">כרטיס ללייב ב־149 ₪. לחברי המאגר הכנתי מחיר מיוחד.</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={scrollToTickets} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 text-base font-black text-[#191265] shadow-[0_16px_35px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[.98]">{hasPlus ? "לכרטיס Plus שלי" : isFriendEligible ? "לרכישת כרטיס ב־49 ₪" : "לרכישת כרטיס ב־149 ₪"} <ArrowLeft className="h-5 w-5" /></button>
              <a href="#what-awaits" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-4 text-sm font-bold text-white transition hover:border-[#ffe27c] hover:text-[#ffe27c]">מה נפתח בלייב?</a>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/14 pt-6 text-xs font-bold text-white/72">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />אונליין בזום, בשידור חי ולא בהקלטה</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />שאלות שנשלחות מראש</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />רעיונות שאפשר לקחת כבר להיכרות הבאה</span>
            </motion.div>
            <motion.div variants={fadeUp}><LiveCountdown salesOpen={salesOpen} /></motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative order-2 mx-auto w-full max-w-md lg:max-w-none">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] border border-[#ffe27c]/25" />
            <div aria-hidden="true" className="absolute -inset-2 rounded-[2.4rem] bg-[#ffe27c]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_28px_80px_rgba(5,2,37,.48)]">
              <img src={HERO_IMAGE} alt="הילית כספי מחייכת" className="aspect-[4/5] w-full object-cover object-[center_18%]" fetchPriority="high" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/18 bg-[#171053]/80 p-4 text-right shadow-xl backdrop-blur-md">
                <p className="text-xs font-black text-[#ffe27c]">בשבת, 31.10 · 20:30</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white">מפגש חי אונליין בזום על מה שעוזר לפרופיל ולהיכרות לעבוד טוב יותר.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="what-awaits" className="relative overflow-hidden bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute left-0 top-20 h-px w-[27%] bg-[#191265]/15" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading eyebrow="במפגש הזה" title={<>פחות ניחושים.<br /><span className="text-[#4e3eb4]">יותר הבנה של התהליך.</span></>} description="אני רוצה שתצאו מהערב עם מבט חדש על הפרופיל שלכם, על הדרך שבה נוצרת התאמה ועל הדברים הקטנים שמשנים את תחילתה של היכרות." />
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
              <p>אני קוראת את הפרופיל, ההעדפות והתשובות לשאלון, ואז מסתכלת גם על האנשים שמאחורי הנתונים. בלייב אראה לכם איך כל החלקים האלה נפגשים בתהליך ההתאמה.</p>
              <p>אני גם רוצה לשמוע אתכם. מה נכון לכתוב בפרופיל? איך מחליטים אם לתת הזדמנות? מה אפשר ללמוד כבר מהשיחה הראשונה? אלה בדיוק השאלות שנביא לערב הזה.</p>
            </div>
            <a href="#ticket-purchase" className="mt-8 inline-flex items-center gap-2 font-black text-[#191265] underline decoration-[#ffe27c] decoration-4 underline-offset-8 transition hover:text-[#4e3eb4]">לרכישת כרטיס ללייב <ArrowLeft className="h-4 w-4" /></a>
          </motion.div>
          <motion.figure variants={fadeUp} className="order-1 overflow-hidden rounded-[2rem] border border-[#191265]/10 bg-[#f0eadc] p-2 shadow-[0_24px_55px_rgba(25,18,101,.14)] lg:order-2">
            <img src={AUDIENCE_IMAGE} alt="הילית כספי מדברת מול קהל" loading="lazy" decoding="async" className="w-full rounded-[1.55rem]" />
            <figcaption className="px-3 py-4 text-sm font-bold leading-6 text-[#625d78]">אני אוהבת את הרגע שבו שאלה אחת מהקהל פותחת שיחה חדשה. האירוע הקרוב מתקיים אונליין בזום, וגם בו יהיה מקום לשאלות שלכם.</figcaption>
          </motion.figure>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#191265] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_83%_22%,rgba(255,226,124,.17),transparent_0_25%),linear-gradient(125deg,#191265,#100a4b)]" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading light eyebrow="כך מגיעים מוכנים" title="שלושה רגעים, מפגש אחד." description="בוחרים כרטיס, שולחים לי את מה שמסקרן אתכם, ונפגשים אונליין בזום בשבת בערב. קישור הכניסה האישי יישלח לנרשמים לפני המפגש." />
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
          <motion.div variants={fadeUp} id="ticket-purchase" className="mx-auto max-w-4xl scroll-mt-6">
            {hasPersonalLink && eligibilityQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-sm">
                <p className="font-black text-[#191265]">בודקים את הזכאות האישית שלך</p>
                <p className="mt-2 text-sm text-[#625d78]">רגע אחד, כדי לשמור על ההטבה אישית ומאובטחת.</p>
              </div>
            ) : hasPlus ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-[0_16px_40px_rgba(25,18,101,.08)] sm:p-9">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]"><Crown className="h-6 w-6" /></span>
                <h3 className="mt-5 text-2xl font-black text-[#191265]">שובר Plus חינמי מחכה באזור האישי</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#625d78]">אם אתם חברי Plus פעילים, כרטיס הלייב האישי כבר מחכה לכם באזור האישי. אין צורך לרכוש כרטיס נוסף.</p>
                <a href={personalAreaHref} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#191265] px-7 py-4 text-sm font-black text-white transition hover:bg-[#30247e]">לשובר החינמי שלי באזור האישי <ArrowLeft className="h-4 w-4" /></a>
                <p className="mt-4 text-xs text-[#625d78]">אפשר גם להכיר את מסלול ההטבות של <a href="/database-plus" className="font-black text-[#191265] underline underline-offset-4">Database Plus</a>.</p>
              </div>
            ) : !salesOpen ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-sm">
                <h3 className="text-xl font-black text-[#191265]">ההרשמה ללייב תיפתח בקרוב</h3>
                <p className="mt-2 text-sm leading-7 text-[#625d78]">אני מסיימת להכין את הכניסה האישית למפגש. {databaseGiftOpen ? "בינתיים, מצטרפים חדשים למאגר מקבלים כבר עכשיו כרטיס מתנה. קישור הכניסה יישלח לקראת האירוע." : "מכירת הכרטיסים הנפרדים תיפתח בהמשך."}</p>
              </div>
            ) : isFriendEligible ? (
              <div className="overflow-hidden rounded-[1.9rem] border border-[#191265]/10 bg-white shadow-[0_18px_45px_rgba(25,18,101,.1)]">
                <div className="bg-[#191265] px-6 py-5 text-center text-white">
                  <p className="text-xs font-black tracking-[.16em] text-[#ffe27c]">ההטבה האישית נפתחה</p>
                  <h3 className="mt-2 text-2xl font-black">כרטיס FRIENDS ב־49 ₪</h3>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-center text-sm leading-7 text-[#625d78]">הזכאות שלכם זוהתה דרך הקישור האישי. ההטבה כבר מוחלת כאן, ולא צריך להקליד קוד נוסף.</p>
                  <GrowWallet
                    product="live_october"
                    prefillEmail={email}
                    prefillCoupon="FRIENDS"
                    personalToken={token}
                    showCoupon={false}
                    buttonLabel="להמשך לתשלום המאובטח ב־49 ₪"
                    buttonClassName="!mt-6 !w-full !rounded-2xl !bg-[#191265] !py-4 !font-black !text-white hover:!bg-[#30247e]"
                    termsPath="/terms/live-october"
                    onSuccess={(_response, appliedCode) => goToThankYou(appliedCode)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 rounded-[1.9rem] border border-[#191265]/10 bg-white p-6 shadow-[0_18px_45px_rgba(25,18,101,.08)] md:grid-cols-[.9fr_1.1fr] md:items-center sm:p-8">
                <div className="text-right">
                  <p className="text-xs font-black tracking-[.16em] text-[#4e3eb4]">כרטיס רגיל</p>
                  <h3 className="mt-2 text-2xl font-black text-[#191265]">רכישת כרטיס ללייב</h3>
                  <p className="mt-3 text-5xl font-black text-[#191265]">149 ₪</p>
                  <p className="mt-2 text-sm font-bold text-[#625d78]">תשלום חד־פעמי · כרטיס אחד ללייב בזום</p>
                  <p className="mt-4 text-sm leading-7 text-[#625d78]">שבת, 31.10.2026 בשעה 20:30. אפשר לרכוש כרטיס גם בלי להיות חברים במאגר.</p>
                  <p className="mt-2 text-sm leading-7 text-[#625d78]">ממלאים את הפרטים כאן וממשיכים לתשלום. אחרי אישור הרכישה אפשר לשלוח לי שאלה לקראת המפגש.</p>
                  <p className="mt-3 rounded-xl bg-[#fff4d4] p-3 text-sm font-bold leading-6 text-[#191265]">יש קוד הטבה? מזינים אותו אחרי פרטי הקשר ולוחצים ״החל״. המחיר מתעדכן לאחר אימות הקוד והמייל.</p>
                </div>
                <GrowWallet
                  product="live_october"
                  showCoupon
                  buttonLabel="להמשך לתשלום המאובטח"
                  buttonClassName="!w-full !rounded-2xl !bg-[#191265] !py-4 !font-black !text-white hover:!bg-[#30247e]"
                  termsPath="/terms/live-october"
                  onSuccess={(_response, appliedCode) => goToThankYou(appliedCode)}
                />
                <p className="md:col-span-2 text-center text-xs leading-6 text-[#625d78]">כבר חברים במאגר? <a href="#friend-link" className="font-black text-[#191265] underline underline-offset-4">בקשו קישור אישי</a> כדי לראות את המחיר שלכם לפני התשלום.</p>
                {needsFriendGuidance ? <div className="md:col-span-2 rounded-xl border border-[#d9c777] bg-[#fffaf0] p-4 text-center text-xs leading-6 text-[#625d78]"><strong className="text-[#191265]">הטבת FRIENDS לא נפתחה בקישור הזה.</strong> קוד FRIENDS אינו זמין ללא אימות חברות פעילה. כדי לבדוק זכאות או לקבל קישור אישי עדכני, אפשר <a href="#friend-link" className="font-black text-[#191265] underline underline-offset-4">לבקש קישור אישי</a>.</div> : null}
              </div>
            )}
          </motion.div>

          <div id="live-benefits" className="mt-14 border-t border-[#191265]/12 pt-12">
            <SectionHeading eyebrow="הטבות הקהילה" title="עוד דרכים להצטרף ללייב" description="מצטרפים חדשים למאגר מקבלים כרטיס במתנה. לחברי המאגר הכנתי מחיר מיוחד, ולחברי Plus פעילים הכניסה כלולה ללא עלות נוספת." />
          </div>
          <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-2">
            <motion.article variants={fadeUp} className="relative h-full rounded-[2rem] border border-[#d9c777] bg-[linear-gradient(115deg,#fffaf0,#f6edcd)] p-6 shadow-[0_16px_40px_rgba(117,91,11,.10)] sm:p-8">
              <div className="flex h-full flex-col gap-6">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-[#796116]"><Sparkles className="h-4 w-4" />לא חברים במאגר עדיין?</p>
                  <h3 className="mt-2 text-2xl font-black text-[#191265]">מצטרפים למאגר ומקבלים כרטיס ללייב במתנה.</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#625d78]">בהצטרפות למאגר ב־299 ₪ ממלאים שאלון, יוצרים פרופיל ונותנים לי להכיר אתכם מעבר לתמונה. כרטיס אחד ללייב בשווי 149 ₪ יתווסף במתנה למצטרפים חדשים מעמוד ההטבה, וקוד LIVE יחול אוטומטית בקופה.</p>
                </div>
                <a href={databaseOfferHref} className="mt-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#191265] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#30247e]">להכיר את המאגר ואת הטבת הלייב <ArrowLeft className="h-4 w-4" /></a>
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="relative h-full overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#17105b,#30247e)] p-6 text-right text-white shadow-[0_23px_60px_rgba(25,18,101,.3)] sm:p-8">
              <div aria-hidden="true" className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#ffe27c]/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-[#ffe27c]">חברי המאגר</p>
                  <h3 className="mt-2 text-2xl font-black">מחיר מיוחד לחברי המאגר</h3>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffe27c]/30 bg-white/10 text-[#ffe27c]"><Crown className="h-5 w-5" /></span>
              </div>
              <p className="relative mt-6 text-sm leading-7 text-white/78">אם אתם כבר במאגר, מגיע לכם מחיר מיוחד. בקשו קישור אישי למייל שאיתו נרשמתם, וההטבה תופיע שם אוטומטית אחרי בדיקת הזכאות.</p>
              <a href="#friend-link" className="relative mt-5 inline-flex items-center gap-2 text-sm font-black text-[#ffe27c] underline underline-offset-4">לבדיקת ההטבה שלי <ArrowLeft className="h-4 w-4" /></a>
              <div className="relative mt-6 rounded-2xl border border-white/15 bg-white/[.08] p-4 text-xs leading-6 text-white/74">
                <span className="font-black text-[#ffe27c]">כבר ב־Plus?</span> מחכה לכם שובר ללייב ללא עלות נוספת באזור האישי.
              </div>
            </motion.article>
          </div>

          {(!hasPersonalLink || needsFriendGuidance) && !hasPlus ? <motion.div variants={fadeUp} className="mx-auto mt-6 max-w-3xl"><FriendLinkRequest /></motion.div> : null}
        </Reveal>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 md:py-24 lg:px-10">
        <Reveal className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="שאלות קצרות לפני שמצטרפים" title="טוב לדעת" />
          <div className="mt-10 space-y-3">
            {[
              ["למי מתאים המפגש?", "למי שרוצים להבין טוב יותר היכרות, פרופיל ובחירה. אין צורך להיות חברים במאגר כדי לרכוש כרטיס רגיל כשההרשמה פתוחה."],
              ["אפשר לשלוח שאלה מראש?", "כן. אחרי ההרשמה תוכלו לשלוח לי שאלה. אבחר מתוך השאלות נושאים שנדבר עליהם יחד בלייב."],
              ["איך מקבלים את קישור הכניסה?", "אחרי שהאירוע המקוון יהיה מוכן אשלח לכל מי שנרשמו קישור אישי למייל של הכרטיס. השובר שמופיע באתר אינו קוד כניסה ל־Zoom."],
              ["איך מקבלים הטבת מאגר או Plus?", "חברי מאגר מבקשים קישור לאזור האישי ורואים שם את המחיר המיוחד. לחברי Plus פעילים מחכה שובר ללא עלות נוספת."],
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
