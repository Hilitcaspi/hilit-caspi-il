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
  onRestart,
}: {
  gender: CompassGender;
  responses: CompassResponses;
  lead: LeadDetails;
  onRestart: () => void;
}) {
  const result = useMemo(() => getCompassResult(responses, gender), [responses, gender]);
  const [accuracyFeedback, setAccuracyFeedback] = useState<string | null>(null);
  const { data: testimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery();
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

  const registerAccuracy = (value: string) => {
    setAccuracyFeedback(value);
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "result_accuracy", value, result: result.primary, gender } });
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

        <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#191265] via-[#25145d] to-[#651645] text-white shadow-[0_24px_70px_rgba(25,18,101,.22)]">
          <div className="p-7 text-center sm:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]"><Sparkles size={14} /> קורס הדגל החדש</div>
            <p className="mb-2 text-sm font-black uppercase tracking-[.18em] text-[#ffe27c]">מהניצוץ למצפן</p>
            <h2 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">סוד ההתאמה המושלמת</h2>
            <p className="mx-auto mb-8 max-w-3xl text-lg font-bold leading-8 text-white/90">{female ? "קורס מעשי שנועד לעזור לך להבין מי באמת מתאים לך, לשנות את ההרגלים שמחזירים אותך לאותם קשרים ולבנות דרך חדשה אל הזוגיות שאת מחפשת." : "קורס מעשי שנועד לעזור לך להבין מי באמת מתאימה לך, לשנות את ההרגלים שמחזירים אותך לאותם קשרים ולבנות דרך חדשה אל הזוגיות שאתה מחפש."}</p>
            <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">9</p><p className="mt-1 text-sm font-bold">מודולים</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">27</p><p className="mt-1 text-sm font-bold">שיעורים</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">9</p><p className="mt-1 text-sm font-bold">תרגילי עומק</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-5"><p className="text-3xl font-black text-[#ffe27c]">30</p><p className="mt-1 text-sm font-bold">ימי יישום</p></div></div>
          </div>
          <div className="grid border-t border-white/12 sm:grid-cols-2">
            {[{ icon: BrainCircuit, title: "לפצח את הדפוס", text: "להבין למה אותם אנשים ואותם תסריטים חוזרים." }, { icon: Compass, title: "לבנות מצפן חדש", text: "להפריד בין משיכה, פוטנציאל והתאמה אמיתית." }, { icon: HeartHandshake, title: "לפעול אחרת", text: "לתרגל בחירה, תקשורת, גבולות וזמינות רגשית." }, { icon: Map, title: "לצאת עם מפה", text: "תוכנית ברורה לדייטים, להיכרויות ולהחלטות בזמן אמת." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 border-b border-white/10 p-6 text-right sm:border-l"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#ffe27c] text-[#191265]"><Icon size={21} /></div><div><h3 className="mb-1 font-black">{title}</h3><p className="text-sm leading-6 text-white/70">{text}</p></div></div>)}
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

        {testimonials.length > 0 && <div className="rounded-[34px] bg-[#f7eef3] p-6 sm:p-9"><div className="mb-6 text-center"><p className="mb-2 text-sm font-black text-[#b92776]">סיפורי הצלחה אמיתיים</p><h2 className="text-3xl font-black text-[#191265]">מה קורה כשמשנים את הדרך</h2></div><div className="grid gap-4 md:grid-cols-3">{testimonials.slice(0, 3).map(testimonial => <article key={testimonial.id} className="rounded-[24px] bg-white p-5 shadow-sm"><Quote className="mb-3 text-[#b92776]" size={24} /><p className="mb-4 leading-7 text-[#514a67]">{testimonial.text}</p><p className="text-sm font-black text-[#191265]">{testimonial.displayName}</p></article>)}</div></div>}

        <div className="overflow-hidden rounded-[34px] border border-[#d9c78b] bg-[#fff8dc] shadow-[0_22px_60px_rgba(25,18,101,.10)]">
          <div className="p-7 text-center sm:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#191265] text-[#ffe27c]"><Gift size={27} /></div>
            <p className="mb-2 text-sm font-black text-[#b92776]">מחזור המייסדים הראשון</p>
            <h2 className="mb-4 text-3xl font-black text-[#191265] sm:text-4xl">הקורס עדיין בבנייה. המקום שלך כבר שמור.</h2>
            <p className="mx-auto mb-7 max-w-2xl leading-8 text-[#5d5571]">חברי רשימת ההשקה יקבלו את המחיר המיוחד ואת ההטבה לפני פתיחת ההרשמה לקהל. כמות ערכות המצפן במחזור הראשון תהיה מוגבלת למספר המארזים שיופקו בפועל.</p>
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5"><p className="text-xs font-black text-[#8a8291]">המחיר המלא</p><p className="mt-1 text-xl font-black text-[#191265]">ייחשף עם פתיחת ההרשמה</p></div><div className="rounded-2xl bg-[#191265] p-5 text-white"><p className="text-xs font-black text-[#ffe27c]">לחברי הרשימה</p><p className="mt-1 text-xl font-black">מחיר מייסדים והטבה מיוחדת</p></div></div>
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#d9c78b] bg-white p-5" aria-live="polite"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f7e9] text-[#21683a]"><Check size={23} /></div><h3 className="mb-1 text-xl font-black text-[#191265]">{female ? "את כבר ברשימת ההשקה" : "אתה כבר ברשימת ההשקה"}</h3><p className="text-sm leading-6 text-[#5d5571]">{female ? "אין צורך להירשם שוב. אעדכן אותך לפני כולם כשהמחיר, התאריך והכמות יאושרו." : "אין צורך להירשם שוב. אעדכן אותך לפני כולם כשהמחיר, התאריך והכמות יאושרו."}</p></div>
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
  return <ResultView gender={gender} responses={responses} lead={lead} onRestart={restart} />;
}
