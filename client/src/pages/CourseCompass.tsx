import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Check,
  Compass,
  Gift,
  HeartHandshake,
  LockKeyhole,
  Mail,
  Map,
  PackageOpen,
  Quote,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/track";
import { trackLead, trackViewContent } from "@/lib/metaPixel";
import { gaGenerateLead } from "@/lib/ga";
import { getUtmParams } from "@/lib/utils";
import {
  COURSE_COMPASS_VERSION,
  CORE_COMPASS_RESULTS,
  getCompassProgress,
  getCompassResult,
  getCompassResultContent,
  getNextCompassQuestion,
  type CompassGender,
  type CompassResponses,
} from "../../../shared/courseCompass";

const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const COURSE_BOX_IMG = "/manus-storage/course-compass-box-web_c20d2d02.jpg";

type LeadDetails = { name: string; email: string; phone: string };

const COURSE_MODULES = [
  { number: "01", title: "לגלות את המצפן הישן", text: "למפות את האנשים שמושכים אותך, את הסיפור שחוזר ואת הרגע שבו הבחירה מתחילה להתעקם." },
  { number: "02", title: "איך המוח בוחר עוד לפני הראש", text: "להבין רושם ראשוני, משיכה, השלמת מידע ופער בין מה שנדמה שמתאים לבין מה שבאמת מתאים." },
  { number: "03", title: "כימיה, עוררות וחוסר ודאות", text: "להפריד בין פרפרים, מתח, אתגר והתאמה שאפשר לבנות עליה חיים." },
  { number: "04", title: "זמינות רגשית ודפוסים חוזרים", text: "לזהות מרדף, הימנעות, בחירה באנשים לא פנויים והסימנים שמופיעים הרבה לפני האכזבה." },
  { number: "05", title: "סטנדרטים שלא נעלמים כשמתאהבים", text: "להגדיר מה באמת חשוב, מה גמיש ומה אסור למחוק רק כדי שמישהו יבחר בך." },
  { number: "06", title: "לקרוא התנהגות במקום לנחש", text: "לבדוק יוזמה, עקביות, כוונה, קצב ויחס בלי לפרש כל הודעה ובלי להישען על מילים יפות." },
  { number: "07", title: "דייטים והודעות בזמן אמת", text: "לקבל כלים מעשיים לרגעים שמבלבלים: מתי לכתוב, מה לשאול, איך להציב גבול ומתי לתת עוד הזדמנות." },
  { number: "08", title: "לבנות קשר הדדי שנשאר", text: "ללמוד תקשורת, ביטחון, תיקון אחרי קושי ובחירה שמתבססת על שני אנשים ולא על מאמץ של צד אחד." },
  { number: "09", title: "מפת הדרך ל־30 הימים הבאים", text: "לצאת מהקורס עם תוכנית אישית, ניסויים שבועיים וכללי החלטה שאפשר להפעיל בכל היכרות חדשה." },
] as const;

const COURSE_DIFFERENTIATORS = [
  { title: "לא ספריית ידע. מערכת החלטה", text: "כל מודל הופך לשאלה, בדיקה או פעולה שאפשר להפעיל מול הודעה, דייט או קשר אמיתי." },
  { title: "לא טיפ אחד לכולם. מצפן אישי", text: "הקורס מתחיל בזיהוי הדרך שבה דווקא אצלך משיכה, פחד ובחירה מתחברים זה לזה." },
  { title: "לא נשארים מול המסך", text: "הקורס הדיגיטלי מחובר לחוברת, לקלפים ולמפת עבודה שמכריחים להפוך הבנה להרגל חדש." },
  { title: "לא רק למצוא. גם לדעת לבחור", text: "המטרה אינה להשיג כל אדם שמוצא חן בעינייך, אלא לזהות מהר יותר מי מתאים ולבנות קשר הדדי ובריא." },
] as const;

function CourseInterestBand({
  saved,
  loading,
  onInterest,
  title,
}: {
  saved: boolean;
  loading: boolean;
  onInterest: () => void;
  title: string;
}) {
  return (
    <div className="rounded-[28px] bg-gradient-to-l from-[#ffe27c] to-[#fff3b6] p-5 text-center shadow-[0_15px_45px_rgba(25,18,101,.10)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:text-right">
      <div><p className="text-xs font-black text-[#b92776]">קורס דיגיטלי חדש + ערכת עבודה שמגיעה הביתה</p><h3 className="mt-1 text-xl font-black leading-7 text-[#191265]">{title}</h3></div>
      <button type="button" onClick={onInterest} disabled={loading || saved} className="mt-4 w-full rounded-full bg-[#191265] px-6 py-4 font-black text-white shadow-lg transition hover:bg-[#2c2288] disabled:cursor-default disabled:bg-[#35714a] sm:mt-0 sm:w-auto sm:min-w-64">
        {saved ? "סימנתי לך עניין בקורס" : loading ? "נשמר..." : "אני רוצה לקבל את מחיר ההשקה"}
      </button>
    </div>
  );
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `compass-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265] ${className}`} dir="rtl">{children}</main>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} flex items-center justify-center rounded-full border border-[#ffe27c]/70 bg-[#ffe27c]/10`}>
        <Compass className="text-[#ffe27c]" size={compact ? 19 : 23} strokeWidth={1.7} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#ffe27c]">Hilit Caspi</p>
        <p className="font-serif text-base leading-tight text-white">המצפן הזוגי</p>
      </div>
    </div>
  );
}

function Intro({ onChooseGender }: { onChooseGender: (gender: CompassGender) => void }) {
  return (
    <PageFrame>
      <section className="relative min-h-screen overflow-hidden bg-[#191265] px-5 pb-14 pt-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,226,124,.18),transparent_25%),radial-gradient(circle_at_82%_65%,rgba(101,22,69,.55),transparent_34%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <BrandMark />
            <span className="rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]">חינם · כ־2 דקות</span>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85">
                <Compass size={16} className="text-[#ffe27c]" /> כמה לחיצות שיכולות לשנות את הכיוון
              </div>
              <h1 className="mb-5 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-6xl lg:text-7xl">
                יש מישהו שלא יוצא לכם מהראש?
                <span className="mt-2 block text-[#ffe27c]">בואו נגלה למה.</span>
              </h1>
              <p className="mb-3 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
                האם יש עניין אמיתי? למה דווקא האדם הזה מושך אתכם? ואיך אפשר להשיג את הזוגיות שאתם באמת רוצים?
              </p>
              <p className="mb-7 text-sm text-white/58">בלי לכתוב דבר. שמונה שאלות קצרות ותוצאה אישית מיד אחריהן.</p>

              <p className="mb-3 font-black text-white">אני:</p>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <button onClick={() => onChooseGender("female")} className="min-h-15 rounded-2xl bg-[#ffe27c] px-6 py-4 text-lg font-black text-[#191265] shadow-[0_16px_40px_rgba(255,226,124,.2)] transition hover:bg-white active:scale-[.98]">
                  אישה
                </button>
                <button onClick={() => onChooseGender("male")} className="min-h-15 rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-lg font-black text-white transition hover:border-[#ffe27c] hover:bg-white/15 active:scale-[.98]">
                  גבר
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
                <span className="inline-flex items-center gap-2"><LockKeyhole size={14} /> התשובות עצמן אינן נשמרות</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> ללא תשלום</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.08 }} className="relative mx-auto w-full max-w-md">
              <div className="relative mx-auto aspect-[4/5] w-[82%] overflow-hidden rounded-[42px] border border-white/15 bg-[#e7d5c7] shadow-[0_35px_90px_rgba(0,0,0,.35)]">
                <img src={PROFILE_IMG} alt="הילית כספי" className="h-full w-full object-cover object-top" loading="eager" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#191265] via-[#191265]/65 to-transparent px-6 pb-6 pt-24 text-white">
                  <p className="text-lg font-black">הילית כספי</p>
                  <p className="text-sm text-white/72">הפכתי מאות סיפורי אהבה לשיטה</p>
                </div>
              </div>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -left-1 top-[18%] rounded-2xl border border-[#ffe27c]/35 bg-[#221352]/95 p-4 text-white shadow-xl backdrop-blur sm:-left-8">
                <Compass size={20} className="mb-2 text-[#ffe27c]" />
                <p className="text-xs text-white/60">בסיום</p>
                <p className="font-black">המצפן שלך מתגלה</p>
              </motion.div>
              <div className="absolute -right-1 bottom-[12%] rounded-2xl bg-[#ffe27c] px-4 py-3 text-[#191265] shadow-xl sm:-right-7">
                <p className="text-xs font-black">זה לא קסם</p>
                <p className="text-sm font-black">זה מדע</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

function QuestionFlow({
  gender,
  responses,
  onAnswer,
}: {
  gender: CompassGender;
  responses: CompassResponses;
  onAnswer: (questionId: string, answerId: string) => void;
}) {
  const question = getNextCompassQuestion(responses, gender);
  const progress = getCompassProgress(responses);
  if (!question) return null;
  const number = Object.keys(responses).length + 1;

  return (
    <PageFrame>
      <header className="bg-[#191265] px-5 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between"><BrandMark compact /><span className="text-xs text-white/65">שאלה {number} מתוך 8</span></div>
      </header>
      <div className="h-1.5 bg-[#191265]/15"><motion.div className="h-full bg-[#ffe27c]" animate={{ width: `${progress}%` }} transition={{ duration: 0.25 }} /></div>

      <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.2 }} className="w-full overflow-hidden rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(25,18,101,.12)] sm:p-10">
            <p className="mb-3 text-sm font-black text-[#b92776]">{question.eyebrow}</p>
            <h1 className="mb-7 text-3xl font-black leading-tight text-[#191265] sm:text-4xl">{question.prompt}</h1>
            <div className="grid gap-3">
              {question.answers.map((answer, index) => (
                <motion.button key={answer.id} type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} onClick={() => onAnswer(question.id, answer.id)} className="group min-h-[62px] w-full rounded-2xl border border-[#e1d8cf] bg-[#fbf8f4] px-5 py-4 text-right font-bold text-[#191265] transition hover:border-[#191265] hover:bg-white hover:shadow-md active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe27c]">
                  <span className="flex items-center justify-between gap-4"><span className="leading-7">{answer.label}</span><span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#191265] text-white"><ArrowLeft size={17} /></span></span>
                </motion.button>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-[#8a8291]">בחרו את התשובה הראשונה שמרגישה נכונה.</p>
          </motion.div>
        </AnimatePresence>
      </section>
    </PageFrame>
  );
}

function Capture({
  gender,
  responses,
  sessionId,
  onComplete,
}: {
  gender: CompassGender;
  responses: CompassResponses;
  sessionId: string;
  onComplete: (lead: LeadDetails) => void;
}) {
  const result = useMemo(() => getCompassResult(responses, gender), [responses, gender]);
  const [form, setForm] = useState<LeadDetails>({ name: "", email: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const joinWaitlist = trpc.courseCompass.joinWaitlist.useMutation();
  const female = gender === "female";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("נא למלא שם.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("כתובת המייל אינה תקינה.");
    if (form.phone.replace(/\D/g, "").length < 9) return setError("מספר הטלפון אינו תקין.");
    if (!consent) return setError("כדי לקבל את התוצאה ועדכונים על הקורס צריך לאשר את ההודעה.");

    try {
      const utm = getUtmParams();
      await joinWaitlist.mutateAsync({
        sessionId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender,
        resultKey: result.primary,
        secondaryResultKey: result.secondary,
        selectedAction: result.content.actions[0].id,
        waitlistConsent: true,
        marketingConsent: false,
        ...utm,
      });
      gaGenerateLead("course_compass_result");
      trackLead({ content_name: "course_compass_result" });
      track({ eventType: "form_submit", metadata: { feature: "course_compass", form: "result_gate", result: result.primary, gender } });
      onComplete({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
    } catch {
      setError("לא הצלחנו לשמור את הפרטים כרגע. נסו שוב בעוד רגע.");
    }
  };

  return (
    <PageFrame>
      <header className="bg-[#191265] px-5 py-4"><div className="mx-auto flex max-w-2xl items-center justify-between"><BrandMark compact /><span className="text-xs text-white/65">המצפן מוכן</span></div></header>
      <section className="relative flex min-h-[calc(100vh-68px)] items-center justify-center overflow-hidden bg-[#191265] px-4 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,226,124,.16),transparent_26%),radial-gradient(circle_at_80%_75%,rgba(101,22,69,.58),transparent_35%)]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl">
          <div className="bg-[#ffe27c] px-6 py-7 text-center text-[#191265]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#191265] text-[#ffe27c]"><Compass size={29} /></div>
            <p className="mb-1 text-sm font-black">סיימנו. המצפן שלך מוכן.</p>
            <h1 className="text-3xl font-black leading-tight">{female ? "לאן לשלוח את הפיצוח שלך?" : "לאן לשלוח את הפיצוח שלך?"}</h1>
          </div>
          <form onSubmit={submit} className="space-y-4 p-6 sm:p-8" noValidate>
            <p className="text-center leading-7 text-[#5d5571]">{female ? "השאירי פרטים ומיד תגלי מה באמת מחזיק אותך בסיפור הזה ומה המצפן שלך מציע לעשות." : "השאר פרטים ומיד תגלה מה באמת מחזיק אותך בסיפור הזה ומה המצפן שלך מציע לעשות."}</p>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">שם</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} autoComplete="name" className="min-h-13 w-full rounded-xl border border-[#d9d1c7] bg-[#fbf8f4] px-4 outline-none focus:ring-2 focus:ring-[#191265]" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">מייל</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} autoComplete="email" className="min-h-13 w-full rounded-xl border border-[#d9d1c7] bg-[#fbf8f4] px-4 outline-none focus:ring-2 focus:ring-[#191265]" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">טלפון</span><input type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} autoComplete="tel" className="min-h-13 w-full rounded-xl border border-[#d9d1c7] bg-[#fbf8f4] px-4 outline-none focus:ring-2 focus:ring-[#191265]" /></label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5d5571]"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#191265]" /><span>{female ? "אני מאשרת לקבל את התוצאה, עדכונים על הקורס והטבת ההשקה. אפשר לבטל בכל עת." : "אני מאשר לקבל את התוצאה, עדכונים על הקורס והטבת ההשקה. אפשר לבטל בכל עת."}</span></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={joinWaitlist.isPending} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#191265] px-7 py-4 text-lg font-black text-white transition hover:bg-[#2b2089] disabled:opacity-60">{joinWaitlist.isPending ? "מכינה את התוצאה..." : <><Mail size={19} /> {female ? "גלי לי את התוצאה" : "גלה לי את התוצאה"}</>}</button>
            <p className="text-center text-xs text-[#8a8291]">התשובות עצמן אינן נשמרות. אין חיוב ואין הזמנה.</p>
          </form>
        </motion.div>
      </section>
    </PageFrame>
  );
}

function Revealing({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const messages = ["מחברת בין התשובות...", "מזהה מה באמת מושך כאן...", "מכוונת את המצפן...", "הפיצוח מוכן."];
  useEffect(() => {
    const interval = window.setInterval(() => setStep(current => Math.min(current + 1, messages.length - 1)), 430);
    const timer = window.setTimeout(onComplete, 1900);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, [onComplete]);
  return (
    <PageFrame>
      <section className="flex min-h-screen items-center justify-center bg-[#191265] px-6 text-center">
        <div className="max-w-lg">
          <div className="relative mx-auto mb-8 h-40 w-40">
            <motion.div className="absolute inset-0 rounded-full border border-[#ffe27c]/45" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute inset-5 rounded-full border border-dashed border-[#ffe27c]/60" animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
            <div className="absolute inset-0 flex items-center justify-center"><Compass size={70} strokeWidth={1} className="text-[#ffe27c]" /></div>
          </div>
          <AnimatePresence mode="wait"><motion.h1 key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-serif text-3xl text-white sm:text-4xl">{messages[step]}</motion.h1></AnimatePresence>
        </div>
      </section>
    </PageFrame>
  );
}

function ResultView({
  gender,
  responses,
  lead,
  sessionId,
  onRestart,
}: {
  gender: CompassGender;
  responses: CompassResponses;
  lead: LeadDetails;
  sessionId: string;
  onRestart: () => void;
}) {
  const result = useMemo(() => getCompassResult(responses, gender), [responses, gender]);
  const [accuracyFeedback, setAccuracyFeedback] = useState<string | null>(null);
  const [courseInterestSaved, setCourseInterestSaved] = useState(false);
  const courseInterest = trpc.courseCompass.markCourseInterest.useMutation({
    onSuccess: () => setCourseInterestSaved(true),
  });
  const { data: testimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery();
  const { data: successStoryPost } = trpc.blog.getBySlug.useQuery({ slug: "sipurei-hatzlacha" }, { retry: false });
  const female = gender === "female";
  const firstName = lead.name.split(/\s+/)[0];
  const highestScore = Math.max(...Object.values(result.scores), 1);
  const resultMap = CORE_COMPASS_RESULTS
    .map(key => ({
      key,
      score: result.scores[key],
      label: getCompassResultContent(key, gender).label,
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  const secondaryLabel = result.secondary ? getCompassResultContent(result.secondary, gender).label : null;
  const publicStoryQuotes = useMemo(() => {
    const content = successStoryPost?.content || "";
    const allQuotes: string[] = [];
    const quotePattern = /["“]([^"”]{20,220})["”]/g;
    let match: RegExpExecArray | null;
    while ((match = quotePattern.exec(content))) allQuotes.push(match[1].trim());
    const positiveQuotes = allQuotes.filter(quote => /שינית|הביתה|אהבה.*מתחילה|אפשרי/.test(quote));
    return Array.from(new Set(positiveQuotes.length >= 2 ? positiveQuotes : allQuotes)).slice(0, 3);
  }, [successStoryPost?.content]);

  const registerAccuracy = (value: string) => {
    setAccuracyFeedback(value);
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "result_accuracy", value, result: result.primary, gender } });
  };

  const registerCourseInterest = (placement: string) => {
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "course_launch_interest", placement, result: result.primary, gender } });
    if (!courseInterestSaved && !courseInterest.isPending) {
      courseInterest.mutate({ sessionId, email: lead.email });
    }
  };

  useEffect(() => {
    track({ eventType: "section_view", metadata: { feature: "course_compass", section: "result", result: result.primary, version: COURSE_COMPASS_VERSION, gender } });
  }, [result.primary, gender]);

  return (
    <PageFrame>
      <header className="bg-[#191265] px-5 py-4"><div className="mx-auto flex max-w-4xl items-center justify-between"><BrandMark compact /><span className="text-xs text-white/60">המצפן של {firstName}</span></div></header>

      <section className="relative overflow-hidden bg-[#191265] px-5 pb-16 pt-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,226,124,.18),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(101,22,69,.62),transparent_32%)]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-17 w-17 items-center justify-center rounded-full border border-[#ffe27c]/55 bg-[#ffe27c]/10"><Compass className="text-[#ffe27c]" size={36} /></div>
          <p className="mb-3 font-black text-[#ffe27c]">המצפן שלך מצביע על: {result.content.label}</p>
          <h1 className="mb-5 text-4xl font-black leading-tight text-white sm:text-6xl">{result.content.title}</h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">{result.content.summary}</p>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-4xl space-y-5 px-4 pb-20">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(25,18,101,.16)]">
          <div className="bg-[#ffe27c] px-6 py-5 text-center"><p className="text-sm font-black text-[#651645]">יש אדם מסוים בראש. זו ההמלצה שלי כרגע.</p></div>
          <div className="p-6 sm:p-9">
            <h2 className="mb-4 text-3xl font-black leading-tight text-[#191265]">{result.content.recommendationTitle}</h2>
            <p className="text-lg leading-8 text-[#514a67]">{result.content.recommendationBody}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-[22px] bg-[#f6f0eb] p-5"><p className="mb-2 text-sm font-black text-[#b92776]">מה לעשות ב־72 השעות הקרובות</p><p className="font-bold leading-7 text-[#191265]">{result.content.next72Hours}</p></div>
              <div className="rounded-[22px] border border-[#191265]/12 p-5"><p className="mb-2 text-sm font-black text-[#191265]">מה המצפן לא יכול לדעת</p><p className="text-sm leading-7 text-[#5d5571]">הוא אינו קורא את המחשבות של האדם שמולך. הוא מזהה מה מפעיל את הבחירה שלך ומחזיר את ההחלטה לעובדות, למעשים ולהדדיות.</p></div>
            </div>
          </div>
        </div>

        <CourseInterestBand saved={courseInterestSaved} loading={courseInterest.isPending} onInterest={() => registerCourseInterest("after_recommendation")} title={female ? "רוצה לדעת לא רק מה לעשות מולו עכשיו, אלא איך לא לחזור שוב לאותו דפוס?" : "רוצה לדעת לא רק מה לעשות מולה עכשיו, אלא איך לא לחזור שוב לאותו דפוס?"} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] bg-white p-5 shadow-sm"><p className="mb-2 text-sm font-black text-[#b92776]">מה זיהיתי</p><p className="leading-7 text-[#514a67]">{result.content.rationale}</p></div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm"><p className="mb-2 text-sm font-black text-[#b92776]">למה זה קורה</p><p className="leading-7 text-[#514a67]">{result.content.science}</p></div>
          <div className="rounded-[24px] bg-[#ffe27c] p-5 shadow-sm"><p className="mb-2 text-sm font-black text-[#651645]">הכיוון של המצפן</p><p className="font-bold leading-7 text-[#191265]">{result.content.actions[0].label}</p></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(25,18,101,.10)] sm:p-8">
            <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191265] text-[#ffe27c]"><BarChart3 size={22} /></div><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b92776]">מפת המצפן שלך</p><h2 className="text-2xl font-black text-[#191265]">מה הפעיל אותך בתשובות</h2></div></div>
            <div className="space-y-5">
              {resultMap.map((item, index) => {
                const width = Math.max(18, Math.round((item.score / highestScore) * 100));
                return <div key={item.key}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-black text-[#191265]">{index + 1}. {item.label}</span><span className="text-xs font-bold text-[#8a8291]">{index === 0 ? "הכיוון המוביל" : index === 1 ? "כיוון נוסף" : "ברקע"}</span></div><div className="h-3 overflow-hidden rounded-full bg-[#eee7df]"><motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8, delay: index * 0.12 }} className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-l from-[#651645] to-[#b92776]" : index === 1 ? "bg-[#8f80c8]" : "bg-[#d4b76d]"}`} /></div></div>;
              })}
            </div>
            <p className="mt-6 text-xs leading-6 text-[#8a8291]">המפה משווה בין הנטיות שעלו בשמונה הבחירות שלך. היא כלי להתבוננות ולא אבחון קליני.</p>
          </div>

          <div className="rounded-[30px] bg-[#fff8e4] p-6 shadow-[0_18px_55px_rgba(25,18,101,.08)] sm:p-8">
            <p className="mb-2 text-sm font-black text-[#b92776]">המצפן לא ראה רק דבר אחד</p>
            <h2 className="mb-4 text-2xl font-black leading-tight text-[#191265]">{secondaryLabel ? `גם ${secondaryLabel} הופיע בתשובות שלך` : "הכיוון שלך יצא חד וברור"}</h2>
            <p className="mb-4 leading-7 text-[#514a67]">{result.content.deeperInsight}</p>
            <div className="rounded-2xl border border-[#d7bd65]/45 bg-white/80 p-4"><p className="mb-1 text-sm font-black text-[#651645]">מה זה עלול לעלות בקשר</p><p className="leading-7 text-[#514a67]">{result.content.relationshipCost}</p></div>
          </div>
        </div>

        <div className="rounded-[30px] bg-white p-6 text-center shadow-[0_18px_55px_rgba(25,18,101,.10)] sm:p-8">
          <p className="mb-2 text-sm font-black text-[#b92776]">רגע של אמת</p>
          <h2 className="mb-5 text-2xl font-black text-[#191265]">עד כמה המצפן קלע?</h2>
          {accuracyFeedback ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#f4f0ff] px-5 py-4 font-bold text-[#191265]">תודה. התשובה נשמרה כדי לעזור לי לדייק את החוויה.</motion.div> : <div className="grid gap-3 sm:grid-cols-3"><button onClick={() => registerAccuracy("exact")} className="rounded-2xl bg-[#191265] px-5 py-4 font-black text-white transition hover:bg-[#2b2089]">בול. זה אני.</button><button onClick={() => registerAccuracy("mostly")} className="rounded-2xl border border-[#191265]/15 bg-[#fbf8f4] px-5 py-4 font-black text-[#191265] transition hover:border-[#191265]">קלע ברובו</button><button onClick={() => registerAccuracy("not_yet")} className="rounded-2xl border border-[#191265]/15 bg-[#fbf8f4] px-5 py-4 font-black text-[#191265] transition hover:border-[#191265]">עוד לא בטוח</button></div>}
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_22px_60px_rgba(25,18,101,.13)]">
          <div className="bg-[#ffe27c] px-6 py-6 text-center"><p className="text-sm font-black text-[#191265]">{female ? "את תוהה איך ידעתי את כל זה?" : "אתה תוהה איך ידעתי את כל זה?"}</p><h2 className="mt-1 font-serif text-4xl text-[#191265]">זה לא קסם. זה מדע.</h2></div>
          <div className="p-6 text-center sm:p-9">
            <p className="mx-auto max-w-2xl text-lg font-bold leading-8 text-[#191265]">
              רוב הדינמיקות הזוגיות, המשיכה והדרך שבה אנחנו בוחרים את מי שאנחנו רוצים פועלות לפי דפוסים שאפשר לזהות, לפרק ולשנות.
            </p>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-[#5d5571]">
              {female ? "במשך שנים למדתי, חקרתי, ליוויתי נשים וגברים ובחנתי שוב ושוב מה באמת עוזר לאנשים למצוא קשר טוב. פירקתי את הדפוסים, ההרגלים והבחירות הקטנות לשיטה מעשית שמחברת בין מדע האהבה, מודלים של מערכות יחסים, פסיכולוגיה חיובית והניסיון שלי מהשטח." : "במשך שנים למדתי, חקרתי, ליוויתי נשים וגברים ובחנתי שוב ושוב מה באמת עוזר לאנשים למצוא קשר טוב. פירקתי את הדפוסים, ההרגלים והבחירות הקטנות לשיטה מעשית שמחברת בין מדע האהבה, מודלים של מערכות יחסים, פסיכולוגיה חיובית והניסיון שלי מהשטח."}
            </p>
            <div className="mx-auto mt-7 max-w-2xl rounded-2xl bg-[#f6f0eb] p-5 text-right"><p className="mb-2 text-sm font-black text-[#b92776]">הפיצוח שלך הוא רק ההתחלה</p><p className="font-bold leading-7 text-[#191265]">{result.content.courseBridge}</p></div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] bg-[#fbf8f4] shadow-[0_22px_60px_rgba(25,18,101,.11)]">
          <div className="grid items-stretch lg:grid-cols-[.86fr_1.14fr]">
            <div className="relative min-h-80 overflow-hidden bg-[#ead4c8]"><img src={PROFILE_IMG} alt="הילית כספי" className="absolute inset-0 h-full w-full object-cover object-top" /><div className="absolute inset-0 bg-gradient-to-t from-[#191265]/75 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 text-white"><p className="font-serif text-3xl">הילית כספי</p><p className="mt-1 text-sm text-white/75">שדכנית ומאמנת למציאת זוגיות</p></div></div>
            <div className="p-7 sm:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#191265] px-4 py-2 text-xs font-black text-[#ffe27c]"><BrainCircuit size={15} /> השיטה מאחורי המצפן</div>
              <h2 className="mb-4 text-3xl font-black leading-tight text-[#191265]">אחרי יותר מ־200 זוגות שנוצרו, ראיתי שוב ושוב את אותו הדבר</h2>
              <p className="mb-4 leading-8 text-[#5d5571]">אנשים חכמים, מצליחים ומלאי רצון לא נשארים לבד כי אין להם מזל. פעמים רבות הם פשוט פועלים לפי מצפן ישן: נמשכים למה שלא זמין, מתעלמים ממה שכן מתאים או מנסים להשיג אישור במקום לבחור.</p>
              <p className="font-bold leading-8 text-[#191265]">הקורס החדש נבנה כדי להפוך את הידע הזה למפה ברורה ולצעדים שאפשר ליישם בחיים האמיתיים.</p>
              <p className="mt-4 text-xs leading-5 text-[#8a8291]">הנתון מתייחס לעבודת השידוכים והליווי של הילית. הקורס החדש עדיין לא הושק ואינו מבטיח תוצאה אישית.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] bg-white p-6 shadow-[0_22px_60px_rgba(25,18,101,.11)] sm:p-10">
          <div className="mx-auto mb-9 max-w-3xl text-center">
            <p className="mb-2 text-sm font-black text-[#b92776]">מה מיוחד בקורס הזה?</p>
            <h2 className="mb-4 text-3xl font-black leading-tight text-[#191265] sm:text-4xl">זה קורס דיגיטלי מלא. המארז הביתי הופך את הידע לשינוי שעובד גם מחוץ למסך.</h2>
            <p className="leading-8 text-[#5d5571]">הרבה קורסים מסבירים למה דברים קורים. הקורס הזה נבנה כדי לעזור לקבל החלטה אחרת ברגע האמיתי: כשלא עונים, כשיש כימיה מסחררת, כשלא ברור אם להמשיך, כשצריך להציב גבול וכשמופיע אדם יציב שלא מרגיש כמו הדפוס המוכר.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COURSE_DIFFERENTIATORS.map((item, index) => <article key={item.title} className="rounded-[24px] border border-[#191265]/8 bg-[#fbf8f4] p-6"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#191265] text-sm font-black text-[#ffe27c]">0{index + 1}</span><h3 className="mb-2 text-xl font-black text-[#191265]">{item.title}</h3><p className="leading-7 text-[#5d5571]">{item.text}</p></article>)}
          </div>
          <div className="mt-7 rounded-[24px] border border-[#d7bd65]/45 bg-[#fff8dc] p-6 text-center"><p className="text-sm font-black text-[#b92776]">ההבדל החשוב ביותר</p><p className="mx-auto mt-2 max-w-3xl text-lg font-bold leading-8 text-[#191265]">לא יוצאים רק עם תובנה על העבר. יוצאים עם שיטת בחירה שאפשר להפעיל מול האדם שנמצא עכשיו בראש וגם מול כל היכרות שתגיע אחריו.</p></div>
        </div>

        <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#191265] via-[#25145d] to-[#651645] text-white shadow-[0_24px_70px_rgba(25,18,101,.22)]">
          <div className="p-7 text-center sm:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]"><Sparkles size={14} /> קורס הדגל החדש</div>
            <p className="mb-2 text-sm font-black uppercase tracking-[.18em] text-[#ffe27c]">מהניצוץ למצפן</p>
            <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">סוד ההתאמה המושלמת</h2>
            <p className="mx-auto mb-8 max-w-3xl text-lg font-bold leading-8 text-white/90">{female ? "קורס מעשי שנועד לעזור לך להבין מי באמת מתאים לך, לשנות את ההרגלים שמחזירים אותך לאותם קשרים ולבנות דרך חדשה אל הזוגיות שאת מחפשת." : "קורס מעשי שנועד לעזור לך להבין מי באמת מתאימה לך, לשנות את ההרגלים שמחזירים אותך לאותם קשרים ולבנות דרך חדשה אל הזוגיות שאתה מחפש."}</p>
            <div className="mx-auto mb-7 max-w-3xl rounded-[24px] border border-[#ffe27c]/30 bg-white/8 p-6 text-right"><p className="mb-2 text-sm font-black text-[#ffe27c]">שנים של עבודה, מרוכזות למסע דיגיטלי אחד</p><p className="leading-8 text-white/82">כתב היד שכבר נבנה לקורס כולל כ־38 אלף מילים. בקצב הוראה מקובל זה מגלם כ־5 שעות של הסבר ממוקד ממני, עוד לפני תרגילי העומק, הניסויים השבועיים והיישום בבית. מבחינת זמן ההסבר בלבד, מדובר בהיקף שדומה לכחמש פגישות של שעה, אך הקורס אינו מחליף ליווי אישי ואינו מתיימר לעשות זאת.</p></div>
            <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">9</p><p className="mt-1 text-sm font-bold">מודולים שבונים שיטה</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">27</p><p className="mt-1 text-sm font-bold">שיעורים קצרים וממוקדים</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">18</p><p className="mt-1 text-sm font-bold">תרגילי עומק וניסויים</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">30</p><p className="mt-1 text-sm font-bold">ימי יישום עם מפה אישית</p></div></div>
          </div>
          <div className="grid border-t border-white/12 sm:grid-cols-2">
            {[{ icon: BrainCircuit, title: "לפצח את הדפוס", text: "להבין למה אותם אנשים ואותם תסריטים חוזרים." }, { icon: Compass, title: "לבנות מצפן חדש", text: "להפריד בין משיכה, פוטנציאל והתאמה אמיתית." }, { icon: HeartHandshake, title: "לפעול אחרת", text: "לתרגל בחירה, תקשורת, גבולות וזמינות רגשית." }, { icon: Map, title: "לצאת עם מפה", text: "תוכנית ברורה לדייטים, להיכרויות ולהחלטות בזמן אמת." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 border-b border-white/10 p-6 text-right sm:border-l"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#ffe27c] text-[#191265]"><Icon size={21} /></div><div><h3 className="mb-1 font-black">{title}</h3><p className="text-sm leading-6 text-white/70">{text}</p></div></div>)}
          </div>
        </div>

        <div className="rounded-[34px] bg-white p-6 shadow-[0_22px_60px_rgba(25,18,101,.11)] sm:p-10">
          <div className="mx-auto mb-8 max-w-3xl text-center"><p className="mb-2 text-sm font-black text-[#b92776]">מה לומדים בפועל</p><h2 className="mb-4 text-3xl font-black leading-tight text-[#191265] sm:text-4xl">תשעה מודולים שעוברים מהבנה לבחירה חדשה</h2><p className="leading-8 text-[#5d5571]">לא צופים ברצף של סרטונים ומקווים שמשהו ישתנה. בכל שלב לומדים עיקרון, רואים איך הוא נראה בחיים, מפעילים אותו על הסיפור האישי ומסיימים בהחלטה או פעולה.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{COURSE_MODULES.map(module => <article key={module.number} className="rounded-[24px] border border-[#191265]/8 bg-[#fbf8f4] p-5"><div className="mb-4 flex items-center justify-between"><span className="font-serif text-3xl text-[#b92776]">{module.number}</span><Compass size={19} className="text-[#d0af58]" /></div><h3 className="mb-2 text-lg font-black text-[#191265]">{module.title}</h3><p className="text-sm leading-7 text-[#5d5571]">{module.text}</p></article>)}</div>
        </div>

        <CourseInterestBand saved={courseInterestSaved} loading={courseInterest.isPending} onInterest={() => registerCourseInterest("after_curriculum")} title="אם זה בדיוק התהליך שחיפשתם, אפשר לסמן לי כבר עכשיו שאתם רוצים להיות הראשונים לדעת." />

        <div className="overflow-hidden rounded-[34px] bg-[#f7eef3] shadow-[0_22px_60px_rgba(25,18,101,.10)]">
          <div className="p-7 text-center sm:p-10"><p className="mb-2 text-sm font-black text-[#b92776]">מה אמור להשתנות בסוף הקורס</p><h2 className="mx-auto mb-4 max-w-3xl text-3xl font-black leading-tight text-[#191265] sm:text-4xl">לא לדעת יותר על אהבה. להתנהל אחרת בתוכה.</h2><p className="mx-auto max-w-3xl leading-8 text-[#5d5571]">המטרה היא לא לצאת עם עוד אבחון יפה. המטרה היא לזהות מוקדם יותר מה נכון, לפעול בלי לאבד את עצמכם ולהתקדם לזוגיות במקום להישאר שנים באותם מסלולים.</p></div>
          <div className="grid border-t border-[#191265]/8 md:grid-cols-2">
            <div className="border-b border-[#191265]/8 p-7 md:border-b-0 md:border-l"><p className="mb-5 text-sm font-black text-[#8a8291]">לפני הקורס</p><div className="space-y-4 text-[#5d5571]">{["מנסים להבין אם האדם שמולכם בעניין דרך הודעות ורמזים", "נמשכים שוב לאותו טיפוס גם כשהסוף כבר מוכר", "לא יודעים אם לתת עוד הזדמנות או לשחרר", "מוותרים על סטנדרטים ברגע שמופיעה כימיה", "יודעים מה לא עובד אבל לא מצליחים לשנות בזמן אמת"].map(item => <p key={item} className="flex gap-3 leading-7"><span className="mt-1 text-[#b92776]">×</span>{item}</p>)}</div></div>
            <div className="p-7"><p className="mb-5 text-sm font-black text-[#b92776]">אחרי הקורס</p><div className="space-y-4 font-bold text-[#191265]">{["יודעים לבקש בהירות ולקרוא מעשים בלי לנתח כל הודעה", "מזהים את הדפוס מוקדם ועוצרים לפני שנשאבים אליו", "משתמשים במפת החלטה ברורה להמשך, גבול או שחרור", "מחזיקים משיכה וסטנדרטים באותו זמן", "יוצאים עם תוכנית אישית ל־30 יום וכלים לכל היכרות חדשה"].map(item => <p key={item} className="flex gap-3 leading-7"><Check size={18} className="mt-1 flex-shrink-0 text-[#2e7b4d]" />{item}</p>)}</div></div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] bg-white shadow-[0_24px_70px_rgba(25,18,101,.13)]">
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative min-h-80 overflow-hidden bg-[#2a1425]"><img src={COURSE_BOX_IMG} alt="הדמיה של ערכת המצפן שתישלח הביתה" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#25121f]/80 to-transparent p-5 text-white"><p className="text-xs font-bold">הדמיית קונספט. העיצוב הסופי עשוי להשתנות.</p></div></div>
            <div className="p-7 sm:p-9">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#f6e9f0] px-4 py-2 text-xs font-black text-[#651645]"><PackageOpen size={15} /> לא רק קורס דיגיטלי</div>
              <h2 className="mb-4 text-3xl font-black leading-tight text-[#191265]">ערכת המצפן מגיעה אליכם הביתה</h2>
              <p className="mb-6 leading-7 text-[#5d5571]">כל פריט במארז מחובר לשיעור ולפעולה. לא מתנות מדף, אלא מערכת שממשיכה את הקורס גם כשהמסך נסגר.</p>
              <div className="grid gap-3 sm:grid-cols-2">{["הספר הקצר: למה זה עדיין לא קרה?", "מחברת המצפן לתרגול אישי", "45 קלפי רגע האמת", "מפת ההתאמה המתקפלת", "כרטיס הכיוון לארנק", "צמיד מצפן יוניסקס", "מכתב מהצד שאחרי"].map(item => <div key={item} className="flex items-start gap-2 rounded-xl bg-[#fbf8f4] px-3 py-3 text-sm font-bold leading-6 text-[#191265]"><Check size={17} className="mt-1 flex-shrink-0 text-[#b92776]" />{item}</div>)}</div>
            </div>
          </div>
        </div>

        <CourseInterestBand saved={courseInterestSaved} loading={courseInterest.isPending} onInterest={() => registerCourseInterest("after_home_kit")} title="הקורס הוא דיגיטלי. הערכה שבבית מחזירה את השיטה לידיים בדיוק ברגעים שבהם צריך לבחור." />

        {publicStoryQuotes.length > 0 && <div className="rounded-[34px] bg-[#191265] p-6 text-white shadow-[0_24px_70px_rgba(25,18,101,.18)] sm:p-9">
          <div className="mb-7 text-center"><p className="mb-2 text-sm font-black text-[#ffe27c]">אנשים אמיתיים. שינוי אמיתי.</p><h2 className="text-3xl font-black sm:text-4xl">מה אנשים מספרים אחרי תהליכים איתי</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-white/68">הציטוטים הבאים פורסמו בסיפורי ההצלחה של הליווי והמאגר. הם אינם עדויות על הקורס החדש, שטרם הושק.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {publicStoryQuotes.map(quote => <article key={quote} className="rounded-[24px] border border-white/12 bg-white/8 p-6"><Quote className="mb-4 text-[#ffe27c]" size={27} /><p className="text-lg font-bold leading-8">“{quote}”</p></article>)}
          </div>
          <a href="/blog/sipurei-hatzlacha" className="mx-auto mt-7 flex w-fit items-center gap-2 rounded-full border border-[#ffe27c]/50 px-5 py-3 text-sm font-black text-[#ffe27c] transition hover:bg-[#ffe27c] hover:text-[#191265]">לקריאת סיפורי ההצלחה שפורסמו <ArrowLeft size={16} /></a>
        </div>}

        {testimonials.length > 0 && <div className="rounded-[34px] bg-[#f7eef3] p-6 sm:p-9"><div className="mb-6 text-center"><p className="mb-2 text-sm font-black text-[#b92776]">סיפורי הצלחה אמיתיים</p><h2 className="text-3xl font-black text-[#191265]">מה קורה כשמשנים את הדרך</h2></div><div className="grid gap-4 md:grid-cols-3">{testimonials.slice(0, 3).map(testimonial => <article key={testimonial.id} className="rounded-[24px] bg-white p-5 shadow-sm"><Quote className="mb-3 text-[#b92776]" size={24} /><p className="mb-4 leading-7 text-[#514a67]">{testimonial.text}</p><p className="text-sm font-black text-[#191265]">{testimonial.displayName}</p></article>)}</div></div>}

        <div id="course-launch-offer" className="overflow-hidden rounded-[34px] border border-[#d9c78b] bg-[#fff8dc] shadow-[0_22px_60px_rgba(25,18,101,.10)]">
          <div className="p-7 text-center sm:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#191265] text-[#ffe27c]"><Gift size={27} /></div>
            <p className="mb-2 text-sm font-black text-[#b92776]">מחזור המייסדים הראשון</p>
            <h2 className="mb-4 text-3xl font-black text-[#191265] sm:text-4xl">הקורס עדיין בבנייה. המקום שלך כבר שמור.</h2>
            <p className="mx-auto mb-7 max-w-2xl leading-8 text-[#5d5571]">חברי רשימת ההשקה יקבלו את המחיר המיוחד ואת ההטבה לפני פתיחת ההרשמה לקהל. כמות ערכות המצפן במחזור הראשון תהיה מוגבלת למספר המארזים שיופקו בפועל.</p>
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5"><p className="text-xs font-black text-[#8a8291]">המחיר המלא</p><p className="mt-1 text-xl font-black text-[#191265]">ייחשף עם פתיחת ההרשמה</p></div><div className="rounded-2xl bg-[#191265] p-5 text-white"><p className="text-xs font-black text-[#ffe27c]">לחברי הרשימה</p><p className="mt-1 text-xl font-black">מחיר מייסדים והטבה מיוחדת</p></div></div>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#d9c78b] bg-white p-5" aria-live="polite"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f7e9] text-[#21683a]"><Check size={23} /></div><h3 className="mb-1 text-xl font-black text-[#191265]">{female ? "את כבר ברשימת ההשקה" : "אתה כבר ברשימת ההשקה"}</h3><p className="text-sm leading-6 text-[#5d5571]">אין צורך להירשם שוב. אעדכן אותך לפני כולם כשהמחיר, התאריך והכמות יאושרו.</p>{courseInterestSaved ? <p className="mt-4 rounded-xl bg-[#e6f7e9] px-4 py-3 font-black text-[#21683a]">{female ? "סימנתי שתרצי לקבל עדיפות כשנפתח." : "סימנתי שתרצה לקבל עדיפות כשנפתח."}</p> : <button type="button" onClick={() => registerCourseInterest("final_offer")} disabled={courseInterest.isPending} className="mt-5 w-full rounded-full bg-[#191265] px-6 py-4 font-black text-white transition hover:bg-[#2c2288] disabled:opacity-60">{courseInterest.isPending ? "נשמר..." : "כן, אני רוצה עדיפות ומחיר השקה"}</button>}</div>
            <p className="mt-4 text-xs leading-5 text-[#8a8291]">אין כרגע תשלום או הזמנה. לא נגבה סכום ולא נשמר אמצעי תשלום.</p>
          </div>
        </div>

        <button onClick={onRestart} className="mx-auto flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold text-[#716a7d] transition hover:bg-white"><RotateCcw size={17} /> {female ? "לבדוק אדם אחר" : "לבדוק אדם אחר"}</button>
        <p className="px-4 text-center text-xs leading-6 text-[#8a8291]">המצפן הוא כלי להתבוננות ואינו קורא מחשבות, אינו מעריך את האדם שמולכם ואינו מבטיח תוצאה זוגית.</p>
      </section>
    </PageFrame>
  );
}

export default function CourseCompass() {
  const [phase, setPhase] = useState<"intro" | "questions" | "capture" | "reveal" | "result">("intro");
  const [gender, setGender] = useState<CompassGender>("female");
  const [responses, setResponses] = useState<CompassResponses>({});
  const [lead, setLead] = useState<LeadDetails>({ name: "", email: "", phone: "" });
  const [sessionId, setSessionId] = useState(() => createSessionId());

  useEffect(() => {
    document.title = "המצפן הזוגי | הילית כספי";
    trackViewContent({ content_name: "המצפן הזוגי", content_category: "course_lead_magnet" });
    track({ eventType: "page_view", page: "/compass", metadata: { feature: "course_compass", version: COURSE_COMPASS_VERSION } });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [phase]);

  const start = (selectedGender: CompassGender) => {
    setGender(selectedGender);
    setPhase("questions");
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "start", gender: selectedGender, version: COURSE_COMPASS_VERSION } });
  };

  const answer = (questionId: string, answerId: string) => {
    const next = { ...responses, [questionId]: answerId };
    setResponses(next);
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "step_complete", step: Object.keys(next).length, gender } });
    if (!getNextCompassQuestion(next, gender)) setPhase("capture");
  };

  const restart = () => {
    setResponses({});
    setLead({ name: "", email: "", phone: "" });
    setSessionId(createSessionId());
    setPhase("intro");
  };

  if (phase === "intro") return <Intro onChooseGender={start} />;
  if (phase === "questions") return <QuestionFlow gender={gender} responses={responses} onAnswer={answer} />;
  if (phase === "capture") return <Capture gender={gender} responses={responses} sessionId={sessionId} onComplete={details => { setLead(details); setPhase("reveal"); }} />;
  if (phase === "reveal") return <Revealing onComplete={() => setPhase("result")} />;
  return <ResultView gender={gender} responses={responses} lead={lead} sessionId={sessionId} onRestart={restart} />;
}
