import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  ChevronDown,
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

const EDITORIAL_IMAGE = "/manus-storage/hilit-portrait-editorial_6e4736cc.jpg";
const BRIGHT_IMAGE = "/manus-storage/hilit-portrait-bright_56720420.jpg";
const EVENT_DATE = "שבת, 31 באוקטובר 2026";
const EVENT_TIME = "20:30 לפי שעון ישראל";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const liveTopics = [
  ["הפרופיל שמספר את הסיפור", "איך בניית פרופיל מדויקת נותנת מקום למה שחשוב באמת, בלי להפוך אדם לרשימת נתונים."],
  ["ההתאמה שמתרחשת מאחורי הקלעים", "מבט מפוכח על הדרך שבה העדפות, שאלון והיכרות אנושית פוגשים זה את זה בתהליך."],
  ["טיפים להיכרות מוצלחת", "מחשבות מעשיות על סקרנות, קצב וציפיות, כדי להגיע להיכרות עם קצת יותר בהירות."],
  ["תובנות מהשאלון", "איך להשתמש במה שעולה בשאלון כדי לדייק בחירות ולהבין טוב יותר את דפוסי ההיכרות."],
] as const;

const steps = [
  ["01", "מצטרפים ללייב", "רוכשים כרטיס רגיל, או פותחים הטבה אישית דרך האזור האישי."],
  ["02", "שולחים שאלה מראש", "לאחר ההרשמה אפשר לשלוח שאלה מראש. השאלות עוזרות לעצב את השיחה, בלי התחייבות למענה על כל שאלה."],
  ["03", "נפגשים בזמן אמת", "בשבת בערב נפתח מרחב לשיחה, לתובנות ולצעדים קטנים שאפשר לקחת הלאה."],
] as const;

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
    <div className="rounded-[1.7rem] border border-[#191265]/12 bg-[#faf7f0] p-5 text-right shadow-[0_16px_40px_rgba(25,18,101,.08)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]"><KeyRound className="h-5 w-5" /></span>
        <div>
          <p className="font-black text-[#191265]">חברי FRIENDS במאגר?</p>
                <p className="mt-1 text-sm leading-6 text-[#625d78]">ההטבה נפתחת רק מתוך קישור אישי ומאובטח. מזינים את כתובת המייל של החברות ונשלח קישור לאזור האישי.</p>
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
          {requestLink.isPending ? "שולחים קישור" : "לשליחת קישור אישי"}
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

  const scrollToTickets = () => document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goToThankYou = () => window.location.assign("/live/thank-you");

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265]">
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_16%,rgba(255,226,124,.23),transparent_0_24%),radial-gradient(circle_at_87%_80%,rgba(102,80,224,.34),transparent_0_31%),linear-gradient(142deg,#17105b_0%,#191265_55%,#100a48_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.08)_50%,transparent_50.3%)] [background-size:84px_84px]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="text-sm font-black text-white transition hover:text-[#ffe27c]">הילית כספי</Link>
          <button type="button" onClick={scrollToTickets} className="rounded-full border border-[#ffe27c]/50 bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265] transition hover:bg-white sm:px-5 sm:text-sm">לבחירת כרטיס</button>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-9 px-5 pb-16 pt-7 sm:px-8 md:pb-24 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:px-10">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="order-2 lg:order-1">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#ffe27c] backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {salesOpen ? "סדנת לייב אינטימית עם הילית כספי" : "הלייב בדרך · הרשמה תיפתח לאחר הכנת האירוע"}
            </motion.div>
            <motion.p variants={fadeUp} className="mt-6 text-sm font-bold tracking-wide text-white/66">{EVENT_DATE} · {EVENT_TIME}</motion.p>
            <motion.h1 variants={fadeUp} className="mt-3 max-w-3xl text-5xl font-black leading-[1.05] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              סודות ההתאמה
              <span className="block text-[#ffe27c]">המושלמת.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-white/83 sm:text-xl">
              ערב לייב על הדרך שבה בונים פרופיל, קוראים דפוסים, ניגשים להיכרות ומותירים מקום גם למה שלא רואים במבט ראשון.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={scrollToTickets} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 text-base font-black text-[#191265] shadow-[0_16px_35px_rgba(0,0,0,.2)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[.98]">לבחירת כרטיס ללייב <ArrowLeft className="h-5 w-5" /></button>
              <a href="#what-awaits" className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-4 text-sm font-bold text-white transition hover:border-[#ffe27c] hover:text-[#ffe27c]">מה מחכה בסדנה</a>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/14 pt-6 text-xs font-bold text-white/72">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />שיחה חיה בזמן אמת</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />אפשרות לשאלות מראש</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />תוכן מעשי וללא הבטחות קסם</span>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] border border-[#ffe27c]/25" />
            <div aria-hidden="true" className="absolute -inset-2 rounded-[2.4rem] bg-[#ffe27c]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_28px_80px_rgba(5,2,37,.48)]">
              <img src={EDITORIAL_IMAGE} alt="הילית כספי" className="aspect-[4/5] w-full object-cover object-[center_18%]" fetchPriority="high" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/18 bg-[#171053]/80 p-4 text-right shadow-xl backdrop-blur-md">
                <p className="text-xs font-black text-[#ffe27c]">בהנחיית הילית כספי</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white">מקום לשאלות חשובות על היכרות, בחירה והתאמה.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="what-awaits" className="relative overflow-hidden bg-[#f0eadc] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute left-0 top-20 h-px w-[27%] bg-[#191265]/15" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading eyebrow="בסדנה הזו" title={<>להבין קצת יותר.<br /><span className="text-[#4e3eb4]">לבחור קצת אחרת.</span></>} description="לא תמצאו כאן נוסחה שמבטיחה תוצאה. כן נפתח שיחה כנה על מה אפשר לראות, לשאול ולנסות כשמחפשים היכרות משמעותית." />
          <div className="mt-12 grid gap-4 md:grid-cols-2">
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
        <Reveal className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <motion.div variants={fadeUp} className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 rounded-[2.3rem] bg-[#191265]/10 blur-xl" />
            <img src={BRIGHT_IMAGE} alt="הילית כספי" loading="lazy" decoding="async" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover object-[center_18%] shadow-[0_24px_55px_rgba(25,18,101,.18)]" />
            <div className="absolute -bottom-5 -left-4 rounded-2xl border border-[#191265]/10 bg-[#f0eadc] px-5 py-4 shadow-xl">
              <p className="text-xs font-black text-[#191265]">סודות ההתאמה המושלמת</p>
              <p className="mt-1 text-xs text-[#625d78]">לייב עם הילית כספי</p>
            </div>
          </motion.div>
          <div>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-sm font-black text-[#4e3eb4]"><UserRoundCheck className="h-4 w-4" />מאחורי ההתאמה יש אנשים</motion.div>
            <motion.h2 variants={fadeUp} className="mt-4 max-w-2xl text-3xl font-black leading-[1.2] tracking-[-.04em] text-[#191265] md:text-5xl">פרופיל הוא התחלה. התאמה היא שיחה רחבה יותר.</motion.h2>
            <motion.div variants={fadeUp} className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-[#625d78]">
              <p>בסדנה הילית תשתף איך פרופיל, העדפות ותשובות לשאלון הופכים לחומר גלם לתהליך התאמה. ניגע גם במה שאפשר ללמוד מתהליך ההיכרות עצמו, ולא רק מהתוצאה.</p>
              <p>זהו מרחב ללמידה ולחשיבה, לא אבחון אישי ולא התחייבות לדייט, לזוגיות או לתוצאה מסוימת.</p>
            </motion.div>
            <motion.a variants={fadeUp} href="#tickets" className="mt-8 inline-flex items-center gap-2 font-black text-[#191265] underline decoration-[#ffe27c] decoration-4 underline-offset-8 transition hover:text-[#4e3eb4]">לבחירת הכרטיס המתאים <ArrowLeft className="h-4 w-4" /></motion.a>
          </div>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#191265] px-5 py-20 text-white sm:px-8 md:py-28 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_83%_22%,rgba(255,226,124,.17),transparent_0_25%),linear-gradient(125deg,#191265,#100a4b)]" />
        <Reveal className="relative mx-auto max-w-7xl">
          <SectionHeading light eyebrow="כך מגיעים מוכנים" title="שלושה רגעים, ערב אחד." description="פרטי ההצטרפות יימסרו לנרשמים בערוץ המאובטח המתאים. אין קישור גישה בעמוד הציבורי." />
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
          <SectionHeading eyebrow="בחירת כרטיס" title={<>מקום לשיחה שאולי<br /><span className="text-[#4e3eb4]">תפתח כיוון חדש.</span></>} description="אפשר להצטרף בכרטיס רגיל, לבדוק זכאות להטבת חברי מאגר, או להצטרף למאגר ולקבל כרטיס אחד במתנה." />

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.1fr]">
            <motion.article variants={fadeUp} className="rounded-[2rem] border border-[#191265]/12 bg-white p-6 text-right shadow-[0_18px_45px_rgba(25,18,101,.08)] sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#191265]/10 pb-5">
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-[#4e3eb4]">כרטיס רגיל</p>
                  <h3 className="mt-2 text-2xl font-black text-[#191265]">כניסה לסדנת הלייב</h3>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0eadc] text-[#191265]"><Ticket className="h-5 w-5" /></span>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-[#625d78]">
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />השתתפות בסדנת הלייב בשבת, 31 באוקטובר</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />אפשרות לשליחת שאלה מראש לאחר ההרשמה</li>
                <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />פרטי הצטרפות בערוץ מאובטח לאחר אישור</li>
              </ul>
              <div className="mt-7 rounded-2xl bg-[#f0eadc] p-5 text-center">
                <p className="text-xs font-bold text-[#625d78]">מחיר הכרטיס המתוכנן</p>
                <p className="mt-1 text-4xl font-black text-[#191265]">149 ₪</p>
                <p className="mt-1 text-xs text-[#625d78]">תשלום חד פעמי</p>
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
              <p className="relative mt-6 text-sm leading-7 text-white/78">חברות פעילה במאגר פותחת מחיר אישי של 49 ₪, רק לאחר אימות דרך קישור אישי. הקוד אינו פתוח לשימוש ציבורי.</p>
              <div className="relative mt-6 flex items-end gap-3">
                <span className="mb-1 text-lg text-white/45 line-through">149 ₪</span>
                <span className="text-4xl font-black text-[#ffe27c]">49 ₪</span>
                <span className="mb-1 text-xs font-bold text-white/65">לאחר אימות חברות</span>
              </div>
              <div className="relative mt-6 rounded-2xl border border-white/15 bg-white/[.08] p-4 text-xs leading-6 text-white/74">
                <span className="font-black text-[#ffe27c]">כבר ב־Plus?</span> כרטיס הלייב האישי ללא עלות מחכה באזור האישי, בכפוף לזכאות פעילה.
              </div>
            </motion.article>
          </div>

          <motion.div variants={fadeUp} className="mx-auto mt-6 max-w-6xl rounded-[2rem] border border-[#d9c777] bg-[linear-gradient(115deg,#fffaf0,#f6edcd)] p-6 shadow-[0_16px_40px_rgba(117,91,11,.10)] sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-[#796116]"><Sparkles className="h-4 w-4" />לא חברים במאגר עדיין?</p>
                <h3 className="mt-2 text-2xl font-black text-[#191265]">מצטרפים למאגר עם קוד LIVE ומקבלים כרטיס אחד במתנה.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#625d78]">הצטרפות חד פעמית למאגר ב־299 ₪. יוצרים פרופיל, ממלאים שאלון ומתחילים את תהליך ההיכרות. ההצטרפות כוללת בדיוק כרטיס אחד לסדנת הלייב, ללא כפל כרטיסים.</p>
              </div>
              {salesOpen ? <a href="/live/database" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#191265] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#30247e]">לפרטי ההצטרפות למאגר <ArrowLeft className="h-4 w-4" /></a> : <span className="rounded-2xl border border-[#191265]/20 px-6 py-4 text-sm font-black text-[#191265]">פרטי ההטבה ייפתחו בקרוב</span>}
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
                <h3 className="mt-5 text-2xl font-black text-[#191265]">הטבת Plus האישית מחכה באזור האישי</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#625d78]">עם Plus פעיל, כרטיס הלייב ללא עלות זמין דרך השובר האישי באזור האישי. כך נשמרת ההטבה אישית ומדויקת.</p>
                <a href={personalAreaHref} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#191265] px-7 py-4 text-sm font-black text-white transition hover:bg-[#30247e]">לשובר שלי באזור האישי <ArrowLeft className="h-4 w-4" /></a>
                <p className="mt-4 text-xs text-[#625d78]">אפשר גם להכיר את מסלול ההטבות של <a href="/database-plus" className="font-black text-[#191265] underline underline-offset-4">Database Plus</a>.</p>
              </div>
            ) : !salesOpen ? (
              <div className="rounded-[1.75rem] border border-[#191265]/10 bg-white p-7 text-center shadow-sm"><h3 className="text-xl font-black text-[#191265]">ההרשמה ללייב תיפתח בקרוב</h3><p className="mt-2 text-sm leading-7 text-[#625d78]">המחירים וההטבות המתוכננים מוצגים לעיון. לא נגבה תשלום ולא נפתח קוד LIVE או FRIENDS עד שהאירוע המקוון וקישורי הכניסה יהיו מוכנים.</p></div>
            ) : isFriendEligible ? (
              <div className="overflow-hidden rounded-[1.9rem] border border-[#191265]/10 bg-white shadow-[0_18px_45px_rgba(25,18,101,.1)]">
                <div className="bg-[#191265] px-6 py-5 text-center text-white">
                  <p className="text-xs font-black tracking-[.16em] text-[#ffe27c]">ההטבה האישית נפתחה</p>
                  <h3 className="mt-2 text-2xl font-black">כרטיס FRIENDS ב־49 ₪</h3>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-center text-sm leading-7 text-[#625d78]">האימות בוצע בקישור האישי. קוד FRIENDS מוחל כאן בלבד כדי שההטבה תישאר לחברי המאגר הזכאים.</p>
                  <GrowWallet
                    product="live_october"
                    prefillEmail={email}
                    prefillCoupon="FRIENDS"
                    personalToken={token}
                    showCoupon={false}
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
                  showCoupon={false}
                  buttonLabel="להמשך לתשלום המאובטח"
                  buttonClassName="!w-full !rounded-2xl !bg-[#191265] !py-4 !font-black !text-white hover:!bg-[#30247e]"
                  termsPath="/terms/live-october"
                  onSuccess={goToThankYou}
                />
                {hasPersonalLink && eligibilityQuery.isSuccess && !eligibility?.eligible ? <p className="md:col-span-2 text-center text-xs leading-5 text-[#625d78]">הקישור האישי לא פתח כרגע את הטבת FRIENDS. אפשר להצטרף בכרטיס רגיל או לפנות לאזור האישי.</p> : null}
              </div>
            )}
          </motion.div>

          {!hasPersonalLink && !hasPlus ? <motion.div variants={fadeUp} className="mx-auto mt-6 max-w-3xl"><FriendLinkRequest /></motion.div> : null}
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-[#6d6780]">הכרטיס מעניק השתתפות באירוע עצמו. הסדנה היא תוכן לימודי ואינה מבטיחה התאמה, היכרות, דייט או זוגיות.</motion.p>
        </Reveal>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 md:py-24 lg:px-10">
        <Reveal className="mx-auto max-w-4xl">
          <SectionHeading eyebrow="שאלות קצרות לפני שמצטרפים" title="טוב לדעת" />
          <div className="mt-10 space-y-3">
            {[
              ["למי מתאימה הסדנה?", "למי שרוצים לחשוב מחדש על היכרות, פרופיל ובחירה. אין צורך להיות חברים במאגר כדי לרכוש כרטיס רגיל."],
              ["אפשר לשלוח שאלה מראש?", "כן. לאחר ההרשמה תהיה דרך לשלוח שאלה מראש. נעשה מאמץ להתייחס לשאלות, אך אין התחייבות למענה על כל שאלה."],
              ["איך מקבלים את פרטי ההצטרפות?", "לאחר אישור ההרשמה פרטי ההצטרפות יימסרו לנרשמים בערוץ מאובטח. העמוד הציבורי אינו מציג קישור גישה."],
              ["איך עובדת הטבת FRIENDS או Plus?", "הטבות חברי המאגר ו־Plus זמינות רק דרך קישור אישי ואימות זכאות. קוד FRIENDS אינו קוד פתוח לציבור."],
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
          <p className="text-sm font-black text-white">סודות ההתאמה המושלמת · הילית כספי</p>
          <p className="max-w-2xl text-xs leading-6">ההרשמה והתשלום מתבצעים במערכת מאובטחת. תנאי ההשתתפות והביטול מפורטים בתקנון.</p>
          <div className="flex items-center gap-4 text-xs font-bold"><a href="/terms/live-october" className="transition hover:text-[#ffe27c]">תקנון הלייב</a><a href="/database-plus" className="transition hover:text-[#ffe27c]">Database Plus</a><Link href="/" className="transition hover:text-[#ffe27c]">חזרה לאתר</Link></div>
        </div>
      </footer>
    </main>
  );
}
