import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Compass,
  LockKeyhole,
  Mail,
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
  getCompassProgress,
  getCompassResult,
  getNextCompassQuestion,
  type CompassGender,
  type CompassResponses,
} from "../../../shared/courseCompass";

const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

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
  const female = gender === "female";
  const firstName = lead.name.split(/\s+/)[0];

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

        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_22px_60px_rgba(25,18,101,.13)]">
          <div className="bg-[#ffe27c] px-6 py-6 text-center"><p className="text-sm font-black text-[#191265]">{female ? "את תוהה איך ידעתי את כל זה?" : "אתה תוהה איך ידעתי את כל זה?"}</p><h2 className="mt-1 font-serif text-4xl text-[#191265]">זה לא קסם. זה מדע.</h2></div>
          <div className="p-6 text-center sm:p-9">
            <p className="mx-auto max-w-2xl text-lg font-bold leading-8 text-[#191265]">
              רוב הדינמיקות הזוגיות, המשיכה והדרך שבה אנחנו בוחרים את מי שאנחנו רוצים פועלות לפי דפוסים שאפשר לזהות.
            </p>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-[#5d5571]">
              {female ? "בשנים האחרונות פירקתי את הדפוסים האלה לשיטה מעשית. כשאת מבינה מה מפעיל אותך, את יכולה לשנות הרגלים, לפעול אחרת ולהתקדם לזוגיות שאת באמת רוצה." : "בשנים האחרונות פירקתי את הדפוסים האלה לשיטה מעשית. כשאתה מבין מה מפעיל אותך, אתה יכול לשנות הרגלים, לפעול אחרת ולהתקדם לזוגיות שאתה באמת רוצה."}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#191265] via-[#25145d] to-[#651645] text-white shadow-[0_24px_70px_rgba(25,18,101,.22)]">
          <div className="grid lg:grid-cols-[.72fr_1.28fr]">
            <div className="relative min-h-72 overflow-hidden bg-[#ead4c8]"><img src={PROFILE_IMG} alt="הילית כספי" className="absolute inset-0 h-full w-full object-cover object-top" /><div className="absolute inset-0 bg-gradient-to-t from-[#191265]/55 to-transparent" /></div>
            <div className="p-7 sm:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]"><Sparkles size={14} /> קורס הדגל והמארז החדש</div>
              <h2 className="mb-4 text-4xl font-black leading-tight">סוד ההתאמה המושלמת</h2>
              <p className="mb-5 text-lg font-bold leading-8 text-white/90">{female ? "הקורס שילמד אותך להבין מי באמת מתאים לך, איך לפעול מול מי שמוצא חן בעינייך ואיך לשנות את ההרגלים שמרחיקים אותך מהזוגיות שאת רוצה." : "הקורס שילמד אותך להבין מי באמת מתאימה לך, איך לפעול מול מי שמוצאת חן בעיניך ואיך לשנות את ההרגלים שמרחיקים אותך מהזוגיות שאתה רוצה."}</p>
              <p className="mb-6 leading-7 text-white/72">הקורס והמארז עדיין בבנייה. אין כרגע תשלום או הזמנה.</p>
              <div className="rounded-2xl border border-[#ffe27c]/35 bg-[#ffe27c]/12 p-5 text-center" aria-live="polite"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe27c] text-[#191265]"><Check size={23} /></div><h3 className="mb-1 text-xl font-bold">{female ? "את כבר ברשימת ההשקה" : "אתה כבר ברשימת ההשקה"}</h3><p className="text-sm leading-6 text-white/74">{female ? "הקדימות והטבת ההשקה נשמרו לך. אעדכן אותך לפני כולם." : "הקדימות והטבת ההשקה נשמרו לך. אעדכן אותך לפני כולם."}</p></div>
            </div>
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
