import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Fingerprint,
  FlaskConical,
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
  getCompassResultContent,
  getNextCompassQuestion,
  type CompassResponses,
} from "../../../shared/courseCompass";

const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function downloadCompassCard(input: {
  name?: string;
  result: ReturnType<typeof getCompassResult>;
  action: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.direction = "rtl";
  context.textAlign = "right";

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#17124f");
  background.addColorStop(0.58, "#24145c");
  background.addColorStop(1, "#651645");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);
  const glow = context.createRadialGradient(180, 160, 10, 180, 160, 440);
  glow.addColorStop(0, "rgba(255,226,124,.34)");
  glow.addColorStop(1, "rgba(255,226,124,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 720, 720);

  context.strokeStyle = "rgba(255,226,124,.68)";
  context.lineWidth = 2;
  context.beginPath(); context.arc(164, 158, 58, 0, Math.PI * 2); context.stroke();
  context.beginPath();
  context.moveTo(164, 105); context.lineTo(182, 158); context.lineTo(164, 211); context.lineTo(146, 158); context.closePath();
  context.stroke();

  context.fillStyle = "#ffe27c";
  context.font = "700 22px Arial, sans-serif";
  context.fillText("HILIT CASPI · THE PATTERN CODE", 940, 102);
  context.font = "700 28px Arial, sans-serif";
  const firstName = input.name?.trim().split(/\s+/)[0];
  context.fillText(firstName ? `הפיצוח של ${firstName}` : "הפיצוח שלי", 940, 228);

  context.fillStyle = "#ffffff";
  context.font = "700 62px Georgia, 'Times New Roman', serif";
  const titleLines = wrapCanvasText(context, input.result.content.title, 840);
  titleLines.forEach((line, index) => context.fillText(line, 940, 330 + index * 78));

  let y = 330 + titleLines.length * 78 + 42;
  context.fillStyle = "rgba(255,255,255,.82)";
  context.font = "400 31px Arial, sans-serif";
  const summaryLines = wrapCanvasText(context, input.result.content.summary, 840);
  summaryLines.slice(0, 5).forEach((line, index) => context.fillText(line, 940, y + index * 48));

  y += Math.min(summaryLines.length, 5) * 48 + 75;
  context.strokeStyle = "rgba(255,255,255,.18)";
  context.beginPath(); context.moveTo(140, y); context.lineTo(940, y); context.stroke();
  context.fillStyle = "#ffe27c";
  context.font = "700 25px Arial, sans-serif";
  context.fillText("זה לא קסם. זה דפוס שאפשר לשנות.", 940, y + 62);
  context.fillStyle = "#ffffff";
  context.font = "700 34px Arial, sans-serif";
  const actionLines = wrapCanvasText(context, input.action, 800);
  actionLines.slice(0, 3).forEach((line, index) => context.fillText(line, 940, y + 125 + index * 50));

  context.fillStyle = "rgba(255,255,255,.48)";
  context.font = "400 20px Arial, sans-serif";
  context.fillText("מתוך שיטת סוד ההתאמה המושלמת · הילית כספי", 940, 1270);
  const link = document.createElement("a");
  link.download = `hilit-caspi-pattern-${input.result.primary}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `compass-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`min-h-screen overflow-x-hidden bg-[#f0eadc] text-[#191265] font-rubik ${className}`} dir="rtl">{children}</main>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-full border border-[#ffe27c]/70 bg-[#ffe27c]/10 flex items-center justify-center`}>
        <Fingerprint className="text-[#ffe27c]" size={compact ? 19 : 23} strokeWidth={1.6} />
      </div>
      <div>
        <p className="text-[#ffe27c] text-[10px] tracking-[0.24em] uppercase">Hilit Caspi</p>
        <p className="text-white font-serif text-base leading-tight">The Pattern Code</p>
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <PageFrame>
      <section className="relative min-h-screen overflow-hidden bg-[#191265] px-5 pb-14 pt-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,226,124,.18),transparent_25%),radial-gradient(circle_at_82%_65%,rgba(101,22,69,.55),transparent_34%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <BrandMark />
            <span className="rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]">חינם · כ־90 שניות</span>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85">
                <Brain size={16} className="text-[#ffe27c]" /> ניסוי קצר מתוך סוד ההתאמה המושלמת
              </div>
              <h1 className="mb-6 max-w-3xl text-4xl font-black leading-[1.08] text-white sm:text-6xl lg:text-7xl">
                חשבו על אדם אחד.
                <span className="mt-2 block text-[#ffe27c]">אני אנסה לזהות למה דווקא האדם הזה עדיין בראש שלכם.</span>
              </h1>
              <p className="mb-4 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
                בלי שם, בלי הודעות ובלי לכתוב דבר. אחרי ארבע לחיצות אנסה לנחש איזה מנגנון מפעיל את המשיכה. אחר כך אבדוק את עצמי.
              </p>
              <p className="mb-8 text-sm text-white/55">זה יכול להיות אדם חדש, קשר מהעבר או אותו סיפור שחוזר עם אנשים שונים.</p>
              <button onClick={onStart} className="group min-h-16 w-full rounded-2xl bg-[#ffe27c] px-8 py-4 text-lg font-black text-[#191265] shadow-[0_18px_45px_rgba(255,226,124,.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[.98] sm:w-auto">
                <span className="inline-flex items-center gap-3">יש לי אדם בראש <ArrowLeft size={21} className="transition-transform group-hover:-translate-x-1" /></span>
              </button>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
                <span className="inline-flex items-center gap-2"><LockKeyhole size={14} /> התוצאה נחשפת לפני פרטים</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> הבחירות עצמן אינן נשמרות</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.12 }} className="relative mx-auto w-full max-w-md">
              <div className="relative mx-auto aspect-[4/5] w-[82%] overflow-hidden rounded-[42px] border border-white/15 bg-[#e7d5c7] shadow-[0_35px_90px_rgba(0,0,0,.35)]">
                <img src={PROFILE_IMG} alt="הילית כספי" className="h-full w-full object-cover object-top" loading="eager" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#191265] via-[#191265]/75 to-transparent px-6 pb-6 pt-24 text-white">
                  <p className="text-lg font-black">הילית כספי</p>
                  <p className="text-sm text-white/70">חקרתי מאות סיפורי היכרות, בחירה ומשיכה</p>
                </div>
              </div>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -left-1 top-[18%] rounded-2xl border border-[#ffe27c]/35 bg-[#221352]/95 p-4 text-white shadow-xl backdrop-blur sm:-left-8">
                <Eye size={20} className="mb-2 text-[#ffe27c]" />
                <p className="text-xs text-white/60">אחרי 4 תשובות</p>
                <p className="font-black">מגיע הניחוש הראשון</p>
              </motion.div>
              <div className="absolute -right-1 bottom-[12%] rounded-2xl bg-[#ffe27c] px-4 py-3 text-[#191265] shadow-xl sm:-right-7">
                <p className="text-xs font-black">לא קסם</p>
                <p className="text-sm font-black">פסיכולוגיה של משיכה</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

function QuestionFlow({ responses, onAnswer }: { responses: CompassResponses; onAnswer: (questionId: string, answerId: string) => void }) {
  const question = getNextCompassQuestion(responses);
  const progress = getCompassProgress(responses);
  if (!question) return null;
  const number = Object.keys(responses).length + 1;

  return (
    <PageFrame>
      <header className="bg-[#191265] px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between"><BrandMark compact /><span className="text-xs text-white/60">שאלה {number} מתוך כ־10</span></div>
      </header>
      <div className="h-1.5 bg-[#191265]/15"><motion.div className="h-full bg-[#ffe27c]" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} /></div>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.24 }} className={`w-full min-w-0 max-w-full overflow-hidden ${question.prediction ? "rounded-[32px] bg-[#191265] p-6 text-white shadow-2xl sm:p-10" : "rounded-[32px] bg-white p-6 shadow-[0_18px_55px_rgba(25,18,101,.12)] sm:p-10"}`}>
            {question.prediction && (
              <div className="relative mx-auto mb-7 h-24 w-24">
                <motion.div className="absolute inset-0 rounded-full border border-[#ffe27c]/50" animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }} />
                <motion.div className="absolute inset-3 rounded-full border border-dashed border-[#ffe27c]/35" animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />
                <div className="absolute inset-0 flex items-center justify-center"><Eye size={38} className="text-[#ffe27c]" /></div>
              </div>
            )}
            <div role="group" aria-labelledby={`question-${question.id}`} className="min-w-0 max-w-full">
              <div className="min-w-0 max-w-full">
                <p className={`mb-3 text-sm font-black tracking-wide ${question.prediction ? "text-[#ffe27c] text-center" : "text-[#1800ad]"}`}>{question.eyebrow}</p>
                <h1 id={`question-${question.id}`} className={`mb-3 max-w-full break-words font-serif text-3xl leading-tight sm:text-5xl ${question.prediction ? "text-center text-white" : "text-[#191265]"}`}>{question.prompt}</h1>
                {question.hint && <p className={`leading-7 ${question.prediction ? "text-center text-white/65" : "text-[#727272]"}`}>{question.hint}</p>}
              </div>
              <div className="mt-8 grid gap-3">
                {question.answers.map((answer, index) => (
                  <motion.button key={answer.id} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }} onClick={() => onAnswer(question.id, answer.id)} className={`group min-h-[66px] w-full rounded-2xl border px-5 py-4 text-right font-bold transition duration-200 active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe27c] ${question.prediction ? "border-white/15 bg-white/10 text-white hover:border-[#ffe27c] hover:bg-white/15" : "border-[#e1d8cf] bg-[#fbf8f4] text-[#191265] hover:border-[#191265] hover:bg-white hover:shadow-md"}`}>
                    <span className="flex items-center justify-between gap-4"><span className="leading-7">{answer.label}</span><span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${question.prediction ? "bg-[#ffe27c] text-[#191265]" : "bg-[#191265] text-white"}`}><ArrowLeft size={17} /></span></span>
                  </motion.button>
                ))}
              </div>
            </div>
            {!question.prediction && <p className="mt-7 text-center text-xs text-[#8a8291]">בחרו מהר. התשובה הראשונה בדרך כלל מספרת יותר.</p>}
          </motion.div>
        </AnimatePresence>
      </section>
    </PageFrame>
  );
}

function Revealing({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const messages = ["מחברת בין הסימנים...", "בודקת מה גרם לערך לעלות...", "מפרידה בין האדם לבין המנגנון...", "מצאתי את הדפוס הבולט."];
  useEffect(() => {
    const interval = window.setInterval(() => setStep(current => Math.min(current + 1, messages.length - 1)), 520);
    const timer = window.setTimeout(onComplete, 2350);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, [onComplete, messages.length]);
  return (
    <PageFrame>
      <section className="flex min-h-screen items-center justify-center bg-[#191265] px-6 text-center">
        <div className="max-w-lg">
          <div className="relative mx-auto mb-8 h-44 w-44">
            <motion.div className="absolute inset-0 rounded-full border border-[#ffe27c]/35" animate={{ rotate: 360 }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute inset-5 rounded-full border border-dashed border-[#ffe27c]/55" animate={{ rotate: -360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }} />
            <div className="absolute inset-0 flex items-center justify-center"><Fingerprint size={72} strokeWidth={0.9} className="text-[#ffe27c]" /></div>
          </div>
          <AnimatePresence mode="wait"><motion.h1 key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 font-serif text-3xl text-white sm:text-4xl">{messages[step]}</motion.h1></AnimatePresence>
          <div className="mx-auto mt-7 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-[#ffe27c]" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.2, ease: "linear" }} /></div>
        </div>
      </section>
    </PageFrame>
  );
}

function ResultView({ responses, sessionId, onRestart }: { responses: CompassResponses; sessionId: string; onRestart: () => void }) {
  const result = useMemo(() => getCompassResult(responses), [responses]);
  const secondaryContent = result.secondary ? getCompassResultContent(result.secondary) : null;
  const [selectedAction, setSelectedAction] = useState(result.content.actions[0].id);
  const [showMethod, setShowMethod] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [waitlistConsent, setWaitlistConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [formError, setFormError] = useState("");
  const [joined, setJoined] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState<boolean | null>(null);
  const joinWaitlist = trpc.courseCompass.joinWaitlist.useMutation();
  const selectedActionLabel = result.content.actions.find(action => action.id === selectedAction)?.label || result.content.actions[0].label;

  useEffect(() => {
    track({ eventType: "section_view", metadata: { feature: "course_compass", section: "result", result: result.primary, version: COURSE_COMPASS_VERSION } });
  }, [result.primary]);

  const downloadResult = () => {
    try {
      downloadCompassCard({ name: form.name, result, action: selectedActionLabel });
      track({ eventType: "button_click", metadata: { feature: "course_compass", action: "download_result", result: result.primary } });
    } catch {
      setFormError("לא הצלחנו להוריד את הכרטיס כרגע. אפשר לצלם את המסך ולנסות שוב מאוחר יותר.");
    }
  };

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (form.name.trim().length < 2) return setFormError("נא להוסיף שם כדי לשמור את המקום ברשימת ההשקה.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("כתובת המייל אינה תקינה.");
    if (!waitlistConsent) return setFormError("כדי להצטרף לרשימת ההשקה צריך לאשר קבלת הודעת פתיחה והטבה.");
    try {
      const utm = getUtmParams();
      const response = await joinWaitlist.mutateAsync({
        sessionId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        resultKey: result.primary,
        secondaryResultKey: result.secondary,
        selectedAction,
        waitlistConsent: true,
        marketingConsent,
        ...utm,
      });
      setJoined(true);
      setConfirmationSent(response.confirmationSent);
      gaGenerateLead("course_compass_waitlist");
      trackLead({ content_name: "course_compass_waitlist" });
      track({ eventType: "form_submit", metadata: { feature: "course_compass", form: "launch_waitlist", result: result.primary } });
    } catch {
      setFormError("לא הצלחנו לשמור את המקום כרגע. נסו שוב בעוד רגע.");
    }
  };

  const scoreEntries = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
  const scoreLabels: Record<string, string> = {
    future_projection: "השלמת העתיד",
    uncertainty_loop: "לולאת אי־הוודאות",
    approval_chase: "מרדף האישור",
    chemistry_confusion: "בלבול הכימיה",
    novelty_pull: "משיכת החדש",
  };
  const maxScore = Math.max(...scoreEntries.map(([, value]) => value), 1);

  return (
    <PageFrame>
      <header className="bg-[#191265] px-5 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between"><BrandMark compact /><span className="text-xs text-white/55">הפיצוח הושלם</span></div></header>

      <section className="relative overflow-hidden bg-[#191265] px-5 pb-20 pt-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,226,124,.18),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(101,22,69,.62),transparent_32%)]" />
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#ffe27c]/50 bg-[#ffe27c]/10"><Fingerprint className="text-[#ffe27c]" size={32} /></div>
          <p className="mb-3 font-black text-[#ffe27c]">המנגנון הבולט: {result.content.label}</p>
          <h1 className="mb-6 font-serif text-4xl leading-tight text-white sm:text-6xl">{result.content.title}</h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">{result.content.summary}</p>
          <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-white/15 bg-white/8 px-5 py-4 text-white/90"><Eye size={18} className="mx-auto mb-2 text-[#ffe27c]" /><p className="font-bold leading-7">{result.content.magicLine}</p></div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-4xl space-y-5 px-4 pb-20">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_22px_60px_rgba(25,18,101,.13)]">
          <div className="bg-[#ffe27c] px-6 py-5 sm:px-8"><p className="text-sm font-black text-[#191265]">אתם תוהים איך ידעתי את כל זה?</p><h2 className="mt-1 font-serif text-4xl text-[#191265]">זה לא קסם. זה מדע.</h2></div>
          <div className="p-6 sm:p-8">
            <p className="text-lg font-bold leading-8 text-[#191265]">מאחורי הרבה מהמשיכה, הבחירות והדינמיקות הזוגיות שלנו יש מנגנונים פסיכולוגיים שחוזרים על עצמם.</p>
            <p className="mt-4 leading-8 text-[#5d5571]">ברגע שמזהים איזה מנגנון פועל, אפשר להפסיק לפעול על אוטומט. לא חייבים להמשיך לבחור באותו אדם מסוג אחר, להתבלבל בין מתח להתאמה או לתת לפחד מדחייה לנהל את הצעד הבא.</p>
            <div className="mt-6 rounded-2xl bg-[#f5f1e9] p-5"><div className="mb-2 flex items-center gap-2 font-black text-[#651645]"><FlaskConical size={19} /> המנגנון אצלכם</div><p className="leading-7 text-[#4f4660]">{result.content.science}</p></div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-black text-[#1800ad]">שלושת הרמזים שנתנו לי את התשובה</p>
          <p className="mb-5 leading-8 text-[#5d5571]">{result.content.rationale}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {result.evidence.map((evidence, index) => <div key={evidence} className="rounded-2xl border border-[#e6dfd5] bg-[#fbf8f4] p-4 text-sm leading-6 text-[#191265]"><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#191265] text-xs font-black text-white">{index + 1}</span>“{evidence}”</div>)}
          </div>
        </div>

        {secondaryContent && result.primary !== "safety" && (
          <div className="rounded-[28px] border border-[#d8d1ea] bg-[#eeebf7] p-6 sm:p-8">
            <p className="mb-2 text-sm font-black text-[#1800ad]">הניחוש השני שלי היה: {secondaryContent.label}</p>
            <p className="leading-8 text-[#514a67]">גם המנגנון הזה הופיע, אבל הבחירות שלכם חזרו בעוצמה גדולה יותר אל {result.content.label}. שינוי של תשובה מרכזית אחת היה יכול להפוך את הסדר — ולכן זו מפת דפוס, לא גזירת גורל.</p>
          </div>
        )}

        <div className="rounded-[28px] border border-[#efd8a9] bg-[#fff8e7] p-6 sm:p-8">
          <p className="mb-2 text-sm font-black text-[#8a5a18]">הנקודה שהמנגנון מסתיר</p>
          <p className="leading-8 text-[#5b4931]">{result.content.counterSign}</p>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 text-sm font-black text-[#1800ad]">אל תשאירו את הפיצוח רק בראש</p>
          <h2 className="mb-5 font-serif text-3xl text-[#191265]">בחרו ניסוי אחד ל־24 השעות הקרובות</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.content.actions.map(action => {
              const selected = selectedAction === action.id;
              return <button key={action.id} onClick={() => setSelectedAction(action.id)} className={`min-h-16 rounded-2xl border px-5 py-4 text-right font-bold transition active:scale-[.99] ${selected ? "border-[#191265] bg-[#191265] text-white shadow-lg" : "border-[#dfd8ce] bg-[#fbf8f4] text-[#191265] hover:border-[#191265]"}`}><span className="flex items-center justify-between gap-3">{action.label}{selected && <Check size={18} />}</span></button>;
            })}
          </div>
        </div>

        <button onClick={() => setShowMethod(value => !value)} className="flex w-full items-center justify-between rounded-2xl border border-[#d8d1e0] bg-transparent px-5 py-4 text-sm font-bold text-[#514a67]">תראו לי את המפה שמאחורי הניחוש {showMethod ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
        <AnimatePresence>
          {showMethod && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="rounded-[28px] bg-[#e8e5f2] p-6 sm:p-8"><p className="mb-5 text-sm leading-7 text-[#514a67]">כל תשובה הוסיפה או הורידה משקל מחמישה מנגנונים אפשריים. אחרי ארבע לחיצות הצגתי ניחוש ראשון; התגובה שלכם שינתה את השאלה הבאה. לא השתמשתי בשם, בהודעות או במידע על האדם שמולכם.</p><div className="space-y-3">{scoreEntries.map(([key, value], index) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span>{scoreLabels[key]} {index === 0 && "· בולט"}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/75"><div className="h-full rounded-full bg-gradient-to-l from-[#191265] to-[#b92776]" style={{ width: `${Math.max(4, Math.round((value / maxScore) * 100))}%` }} /></div></div>)}</div></div></motion.div>}
        </AnimatePresence>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={downloadResult} className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-full border border-[#191265] bg-white px-6 py-3.5 font-bold text-[#191265] hover:bg-[#f8f6ff]"><Download size={18} /> שמירת הפיצוח כתמונה</button>
          <button onClick={onRestart} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold text-[#716a7d] hover:bg-white"><RotateCcw size={17} /> לחשוב על אדם אחר</button>
        </div>

        <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#191265] via-[#25145d] to-[#651645] text-white shadow-[0_24px_70px_rgba(25,18,101,.22)]">
          <div className="grid lg:grid-cols-[.72fr_1.28fr]">
            <div className="relative min-h-72 overflow-hidden bg-[#ead4c8]"><img src={PROFILE_IMG} alt="הילית כספי" className="absolute inset-0 h-full w-full object-cover object-top" /><div className="absolute inset-0 bg-gradient-to-t from-[#191265]/50 to-transparent" /></div>
            <div className="p-7 sm:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#191265]"><Sparkles size={14} /> קורס הדגל והמארז החדש</div>
              <h2 className="mb-4 font-serif text-4xl leading-tight">לדעת למה זה קורה זו רק ההתחלה. השלב הבא הוא לשנות את זה.</h2>
              <p className="mb-5 leading-8 text-white/80">בשנים האחרונות פירקתי את מנגנוני המשיכה, הבחירה והדינמיקה הזוגית והפכתי אותם לשיטה מעשית. עכשיו אני בונה ממנה קורס אחד שילמד איך לזהות את ההרגל בזמן אמת, לשנות פעולה ולא לחזור שוב לאותה תוצאה.</p>
              <div className="mb-7 grid gap-2 text-sm text-white/88">
                <p className="rounded-xl bg-white/9 px-4 py-3">להפריד בין כימיה, פנטזיה והתאמה אמיתית</p>
                <p className="rounded-xl bg-white/9 px-4 py-3">לשנות הרגלים בדייטים, בהודעות ובבחירת אנשים</p>
                <p className="rounded-xl bg-white/9 px-4 py-3">לקבל הביתה את מארז המצפן ולתרגל את השיטה בעולם האמיתי</p>
              </div>

              {joined ? (
                <div className="rounded-2xl border border-[#ffe27c]/35 bg-[#ffe27c]/12 p-6 text-center" aria-live="polite"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe27c] text-[#191265]"><Check size={23} /></div><h3 className="mb-2 text-xl font-bold">המקום ברשימת ההשקה נשמר</h3><p className="text-sm leading-6 text-white/72">{confirmationSent ? "שלחנו גם אישור למייל." : "המקום נשמר. אם אישור המייל יתעכב, אין צורך להירשם שוב."} אין חיוב ואין הזמנה בשלב הזה.</p></div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-3" noValidate>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="sr-only">שם</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="שם" autoComplete="name" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#ffe27c]" /></label>
                    <label className="block"><span className="sr-only">מייל</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="מייל" autoComplete="email" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#ffe27c]" /></label>
                  </div>
                  <label className="block"><span className="sr-only">טלפון, לא חובה</span><input type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="טלפון, לא חובה" autoComplete="tel" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#ffe27c]" /></label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/82"><input type="checkbox" checked={waitlistConsent} onChange={event => setWaitlistConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#ffe27c]" /><span>אני רוצה לקבל את הודעת פתיחת הקורס והטבת ההשקה במייל. אפשר לבטל בכל עת.</span></label>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/58"><input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#ffe27c]" /><span>אשמח לקבל גם תוכן ועדכונים נוספים מהילית כספי.</span></label>
                  {formError && <p className="rounded-xl border border-red-200/20 bg-red-950/35 px-4 py-3 text-sm text-red-100" role="alert">{formError}</p>}
                  <button type="submit" disabled={joinWaitlist.isPending} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-7 py-4 text-lg font-black text-[#191265] hover:bg-white disabled:opacity-60">{joinWaitlist.isPending ? "שומרים את המקום..." : <><Mail size={19} /> אני רוצה קדימות והטבת השקה</>}</button>
                  <p className="text-center text-[11px] text-white/45">המכירה עדיין לא נפתחה. הקורס והמארז עדיין בבנייה, לא יתבצע חיוב ולא תיפתח הזמנה.</p>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="px-4 text-center text-xs leading-6 text-[#8a8291]">הפיצוח הוא כלי להתבוננות ואינו אבחון פסיכולוגי, אינו קורא מחשבות, אינו מעריך את האדם שמולכם ואינו מחליף עזרה מקצועית במצב של חוסר ביטחון.</p>
      </section>
    </PageFrame>
  );
}

export default function CourseCompass() {
  const [phase, setPhase] = useState<"intro" | "questions" | "reveal" | "result">("intro");
  const [responses, setResponses] = useState<CompassResponses>({});
  const [sessionId, setSessionId] = useState(() => createSessionId());

  useEffect(() => {
    document.title = "אתגר הפיצוח הזוגי | הילית כספי";
    trackViewContent({ content_name: "אתגר הפיצוח הזוגי", content_category: "course_lead_magnet" });
    track({ eventType: "page_view", page: "/compass", metadata: { feature: "course_compass", version: COURSE_COMPASS_VERSION } });
  }, []);

  const start = () => {
    setPhase("questions");
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "start", version: COURSE_COMPASS_VERSION } });
  };

  const answer = (questionId: string, answerId: string) => {
    const next = { ...responses, [questionId]: answerId };
    setResponses(next);
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "step_complete", step: Object.keys(next).length, adaptive: questionId.startsWith("discriminate_") || questionId === "prediction_check" } });
    if (!getNextCompassQuestion(next)) setPhase("reveal");
  };

  const restart = () => {
    setResponses({});
    setSessionId(createSessionId());
    setPhase("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (phase === "intro") return <Intro onStart={start} />;
  if (phase === "questions") return <QuestionFlow responses={responses} onAnswer={answer} />;
  if (phase === "reveal") return <Revealing onComplete={() => setPhase("result")} />;
  return <ResultView responses={responses} sessionId={sessionId} onRestart={restart} />;
}
