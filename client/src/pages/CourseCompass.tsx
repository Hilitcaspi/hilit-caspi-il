import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
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
  background.addColorStop(0, "#2b0e38");
  background.addColorStop(0.6, "#651645");
  background.addColorStop(1, "#9b245f");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);

  const glow = context.createRadialGradient(170, 180, 20, 170, 180, 420);
  glow.addColorStop(0, "rgba(241,207,134,.28)");
  glow.addColorStop(1, "rgba(241,207,134,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 700, 700);

  context.strokeStyle = "rgba(241,207,134,.5)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(158, 154, 58, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(158, 104); context.lineTo(176, 154); context.lineTo(158, 204); context.lineTo(140, 154); context.closePath();
  context.stroke();

  context.fillStyle = "#f1cf86";
  context.font = "700 22px Arial, sans-serif";
  context.fillText("HILIT CASPI · THE COMPASS", 940, 105);
  context.font = "700 28px Arial, sans-serif";
  const firstName = input.name?.trim().split(/\s+/)[0];
  context.fillText(firstName ? `המצפן של ${firstName}` : "המצפן שלי", 940, 230);

  context.fillStyle = "#ffffff";
  context.font = "700 68px Georgia, 'Times New Roman', serif";
  const titleLines = wrapCanvasText(context, input.result.content.title, 840);
  titleLines.forEach((line, index) => context.fillText(line, 940, 340 + index * 86));

  let y = 340 + titleLines.length * 86 + 42;
  context.fillStyle = "rgba(255,255,255,.82)";
  context.font = "400 34px Arial, sans-serif";
  const summaryLines = wrapCanvasText(context, input.result.content.summary, 840);
  summaryLines.forEach((line, index) => context.fillText(line, 940, y + index * 52));

  y += summaryLines.length * 52 + 92;
  context.strokeStyle = "rgba(255,255,255,.18)";
  context.beginPath(); context.moveTo(140, y); context.lineTo(940, y); context.stroke();
  context.fillStyle = "#f1cf86";
  context.font = "700 26px Arial, sans-serif";
  context.fillText("הצעד הבא", 940, y + 65);
  context.fillStyle = "#ffffff";
  context.font = "700 38px Arial, sans-serif";
  const actionLines = wrapCanvasText(context, input.action, 800);
  actionLines.forEach((line, index) => context.fillText(line, 940, y + 125 + index * 54));

  context.fillStyle = "rgba(255,255,255,.48)";
  context.font = "400 20px Arial, sans-serif";
  context.fillText("תוצאה מתוך אתגר המצפן של הילית כספי", 940, 1270);

  const link = document.createElement("a");
  link.download = `hilit-caspi-compass-${input.result.primary}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `compass-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`min-h-screen bg-[#f5efe9] text-[#2b1038] font-rubik ${className}`} dir="rtl">{children}</main>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} rounded-full border border-[#f1cf86]/60 bg-[#f1cf86]/10 flex items-center justify-center`}>
        <Compass className="text-[#f1cf86]" size={compact ? 19 : 23} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[#f1cf86] text-[10px] tracking-[0.26em] uppercase">Hilit Caspi</p>
        <p className="text-white font-serif text-base leading-tight">The Compass</p>
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <PageFrame className="overflow-hidden">
      <section className="relative min-h-screen bg-[#260c35] flex items-center overflow-hidden px-5 py-10">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_18%_20%,rgba(185,36,111,.42),transparent_34%),radial-gradient(circle_at_82%_75%,rgba(241,207,134,.16),transparent_30%)]" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full border border-[#f1cf86]/10" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border border-[#f1cf86]/10" />
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <BrandMark />
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/70">8 לחיצות. בלי לכתוב דבר.</span>
          </div>

          <div className="grid lg:grid-cols-[1.08fr_.92fr] gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f1cf86]/35 bg-[#f1cf86]/10 px-4 py-2 text-[#f1cf86] text-sm mb-6">
                <Sparkles size={15} /> חוויה חינמית מתוך שיטת סוד ההתאמה המושלמת
              </div>
              <h1 className="font-serif text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.02] mb-6">
                מה באמת חסר לכם
                <span className="block text-[#f1cf86]">לפני הצעד הבא?</span>
              </h1>
              <p className="text-white/75 text-lg sm:text-xl leading-8 max-w-2xl mb-8">
                לא עוד שאלון אישיות ארוך. המצפן מציג בכל פעם שאלה אחת, משנה את השאלה הבאה לפי הבחירות שלכם, ומחזיר כיוון פעולה שאפשר לקחת לחיים כבר היום.
              </p>
              <button
                onClick={onStart}
                className="group min-h-14 w-full sm:w-auto rounded-full bg-[#f1cf86] px-8 py-4 text-[#2b1038] font-black text-lg shadow-[0_18px_42px_rgba(241,207,134,.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#ffe3a8] active:scale-[.98]"
              >
                <span className="inline-flex items-center gap-3">גלו את הכיוון שלכם <ArrowLeft className="transition-transform group-hover:-translate-x-1" size={20} /></span>
              </button>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-2"><LockKeyhole size={14} /> התוצאה נחשפת לפני השארת פרטים</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> התשובות עצמן אינן נשמרות</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.75, delay: 0.12 }} className="relative mx-auto w-full max-w-md aspect-square">
              <div className="absolute inset-[5%] rounded-full border border-[#f1cf86]/20 animate-[spin_40s_linear_infinite]" />
              <div className="absolute inset-[15%] rounded-full border border-dashed border-[#f1cf86]/30 animate-[spin_28s_linear_infinite_reverse]" />
              <div className="absolute inset-[27%] rounded-full bg-gradient-to-br from-[#9b245f] via-[#651645] to-[#2b1038] shadow-[0_35px_90px_rgba(0,0,0,.36)] flex items-center justify-center">
                <Compass size={112} strokeWidth={0.8} className="text-[#f1cf86] drop-shadow-[0_0_18px_rgba(241,207,134,.32)]" />
              </div>
              {["מידע", "עקביות", "קצב", "גבול", "בחירה"].map((label, index) => {
                const positions = ["top-2 left-1/2 -translate-x-1/2", "top-[26%] right-0", "bottom-[16%] right-[8%]", "bottom-[16%] left-[8%]", "top-[26%] left-0"];
                return <span key={label} className={`absolute ${positions[index]} text-[#f1cf86]/80 text-xs tracking-wide`}>{label}</span>;
              })}
            </motion.div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

function QuestionFlow({
  responses,
  onAnswer,
}: {
  responses: CompassResponses;
  onAnswer: (questionId: string, answerId: string) => void;
}) {
  const question = getNextCompassQuestion(responses);
  const progress = getCompassProgress(responses);
  if (!question) return null;

  return (
    <PageFrame>
      <header className="bg-[#260c35] px-5 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <BrandMark compact />
          <span className="text-white/55 text-xs">המצפן נבנה תוך כדי הבחירה</span>
        </div>
      </header>
      <section className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs text-[#765f79] mb-3">
            <span>התקדמות</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#e5d8d4] overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full rounded-full bg-gradient-to-l from-[#9b245f] to-[#f1cf86]" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 22 }} transition={{ duration: 0.24 }}>
            <fieldset>
              <legend className="w-full">
                <p className="text-[#9b245f] text-sm font-bold tracking-wide mb-3">{question.eyebrow}</p>
                <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-[#2b1038] mb-3">{question.prompt}</h1>
                {question.hint && <p className="text-[#765f79] leading-7 mb-2">{question.hint}</p>}
              </legend>

              <div className="mt-8 grid gap-3">
                {question.answers.map((answer, index) => (
                  <motion.button
                    key={answer.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.045 }}
                    onClick={() => onAnswer(question.id, answer.id)}
                    className="group min-h-[68px] w-full rounded-2xl border border-[#dfd0ce] bg-white px-5 py-4 text-right shadow-[0_8px_24px_rgba(43,16,56,.05)] transition duration-200 hover:border-[#9b245f] hover:shadow-[0_12px_30px_rgba(101,22,69,.11)] active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9b245f]"
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-[#2b1038] text-base sm:text-lg font-semibold leading-7">{answer.label}</span>
                      <span className="h-9 w-9 flex-shrink-0 rounded-full border border-[#ead7d1] bg-[#fbf6f2] flex items-center justify-center text-[#9b245f] group-hover:bg-[#9b245f] group-hover:text-white transition">
                        <ArrowLeft size={17} />
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </fieldset>
            <p className="mt-8 text-center text-xs text-[#8d7b90]">אין תשובה נכונה. הבחירה הבאה משתנה לפי מה שסימנתם עד עכשיו.</p>
          </motion.div>
        </AnimatePresence>
      </section>
    </PageFrame>
  );
}

function Revealing({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1800);
    return () => window.clearTimeout(timer);
  }, [onComplete]);
  return (
    <PageFrame>
      <section className="min-h-screen bg-[#260c35] flex items-center justify-center px-6 text-center">
        <div>
          <div className="relative mx-auto h-44 w-44 mb-8">
            <motion.div className="absolute inset-0 rounded-full border border-[#f1cf86]/30" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute inset-5 rounded-full border border-dashed border-[#f1cf86]/45" animate={{ rotate: -360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            <div className="absolute inset-0 flex items-center justify-center"><Compass size={70} strokeWidth={0.9} className="text-[#f1cf86]" /></div>
          </div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-white text-4xl mb-3">המצפן קושר את הסימנים</motion.h1>
          <p className="text-white/55">מפריד בין מידע, עקביות, קצב, גבול ובחירה...</p>
        </div>
      </section>
    </PageFrame>
  );
}

function ResultView({
  responses,
  sessionId,
  onRestart,
}: {
  responses: CompassResponses;
  sessionId: string;
  onRestart: () => void;
}) {
  const result = useMemo(() => getCompassResult(responses), [responses]);
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
    track({ eventType: "section_view", metadata: { feature: "course_compass", section: "result", result: result.primary } });
  }, [result.primary]);

  const downloadResult = async () => {
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
  const scoreLabels: Record<string, string> = { information: "מידע", consistency: "עקביות", pace: "קצב", boundary: "גבול", self_choice: "בחירה" };
  const maxScore = Math.max(...scoreEntries.map(([, value]) => value), 1);

  return (
    <PageFrame>
      <header className="bg-[#260c35] px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between"><BrandMark compact /><span className="text-white/55 text-xs">התוצאה שלכם מוכנה</span></div>
      </header>

      <section className="relative overflow-hidden bg-[#260c35] px-5 pt-10 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(185,36,111,.42),transparent_32%),radial-gradient(circle_at_82%_80%,rgba(241,207,134,.15),transparent_28%)]" />
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="mx-auto h-16 w-16 rounded-full border border-[#f1cf86]/40 bg-[#f1cf86]/10 flex items-center justify-center mb-6"><Compass className="text-[#f1cf86]" size={32} strokeWidth={1.2} /></div>
          <p className="text-[#f1cf86] font-bold mb-3">המצפן שלכם מצביע על {result.content.label}</p>
          <h1 className="font-serif text-white text-4xl sm:text-6xl leading-tight mb-6">{result.content.title}</h1>
          <p className="text-white/75 text-lg sm:text-xl leading-8 max-w-2xl mx-auto">{result.content.summary}</p>
        </motion.div>
      </section>

      <section className="max-w-4xl mx-auto px-5 -mt-10 relative z-10 pb-20 space-y-5">
        <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_22px_60px_rgba(43,16,56,.12)] border border-[#eadbd4]">
          <p className="text-[#9b245f] text-sm font-bold mb-3">למה המצפן הגיע לכאן</p>
          <p className="text-[#5d4965] leading-8 mb-5">{result.content.rationale}</p>
          {result.evidence.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {result.evidence.map(evidence => <div key={evidence} className="rounded-2xl bg-[#faf5f2] border border-[#eadbd4] px-4 py-3 text-sm text-[#4b3653]">“{evidence}”</div>)}
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-[#fff8ee] p-6 sm:p-8 border border-[#efd8a9]">
          <p className="text-[#8a5a18] text-sm font-bold mb-2">הבדיקה הנגדית</p>
          <p className="text-[#5b4931] leading-8">{result.content.counterSign}</p>
        </div>

        <div className="rounded-[28px] bg-white p-6 sm:p-8 border border-[#eadbd4] shadow-sm">
          <p className="text-[#9b245f] text-sm font-bold mb-2">בחרו פעולה אחת</p>
          <h2 className="font-serif text-3xl text-[#2b1038] mb-5">מה לקחת ל־24 השעות הקרובות?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.content.actions.map(action => {
              const selected = selectedAction === action.id;
              return (
                <button key={action.id} onClick={() => setSelectedAction(action.id)} className={`min-h-16 rounded-2xl border px-5 py-4 text-right font-semibold transition active:scale-[.99] ${selected ? "border-[#9b245f] bg-[#9b245f] text-white shadow-lg" : "border-[#dfd0ce] bg-[#fbf7f4] text-[#2b1038] hover:border-[#9b245f]"}`}>
                  <span className="flex items-center justify-between gap-3">{action.label}{selected && <Check size={18} />}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => setShowMethod(value => !value)} className="w-full rounded-2xl border border-[#dfd0ce] bg-transparent px-5 py-4 text-[#5d4965] text-sm font-semibold flex items-center justify-between">
          איך הגענו לתוצאה הזאת? {showMethod ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <AnimatePresence>
          {showMethod && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-[28px] bg-[#eee5f2] p-6 sm:p-8">
                <p className="text-sm text-[#5d4965] leading-7 mb-5">המצפן אינו קורא מחשבות ואינו מאבחן את האדם שמולכם. הוא נותן משקל לבחירות הסגורות שלכם, מפצל שאלה אחת לפי שני הכיוונים המובילים, ומחזיר את הכיוון שקיבל את התמיכה החזקה ביותר.</p>
                <div className="space-y-3">
                  {scoreEntries.map(([key, value]) => <div key={key}><div className="flex justify-between text-xs mb-1"><span>{scoreLabels[key]}</span><span>{value}</span></div><div className="h-2 rounded-full bg-white/70 overflow-hidden"><div className="h-full bg-gradient-to-l from-[#9b245f] to-[#f1cf86] rounded-full" style={{ width: `${Math.round((value / maxScore) * 100)}%` }} /></div></div>)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={downloadResult} className="min-h-13 flex-1 rounded-full border border-[#9b245f] bg-white px-6 py-3.5 text-[#9b245f] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#fff5f8] active:scale-[.99]"><Download size={18} /> שמירת התוצאה כתמונה</button>
          <button onClick={onRestart} className="min-h-13 rounded-full px-6 py-3.5 text-[#765f79] font-semibold inline-flex items-center justify-center gap-2 hover:bg-white"><RotateCcw size={17} /> להתחיל מחדש</button>
        </div>

        <div className="rounded-[32px] overflow-hidden bg-gradient-to-br from-[#2b1038] via-[#651645] to-[#9b245f] text-white shadow-[0_24px_70px_rgba(101,22,69,.2)]">
          <div className="grid lg:grid-cols-[.72fr_1.28fr]">
            <div className="relative min-h-64 bg-[#ead4c8] overflow-hidden">
              <img src={PROFILE_IMG} alt="הילית כספי" className="absolute inset-0 h-full w-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2b1038]/45 to-transparent" />
            </div>
            <div className="p-7 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f1cf86]/40 bg-[#f1cf86]/10 px-4 py-2 text-[#f1cf86] text-xs font-bold mb-5"><Sparkles size={14} /> הטבת השקה למי שמצטרפים עכשיו</div>
              <h2 className="font-serif text-4xl leading-tight mb-4">זה היה רק המצפן הראשון.</h2>
              <p className="text-white/78 leading-8 mb-6">קורס הדגל החדש נבנה כדי להפוך דפוסים, משיכה, בחירה ודייטים למפה מעשית. הוא יכלול קורס דיגיטלי ומארז פיזי שנשלח הביתה. המכירה עדיין לא נפתחה.</p>
              <div className="grid gap-2 mb-7 text-sm text-white/85">
                <p className="rounded-xl bg-white/8 px-4 py-3">קדימות לקבלת כל פרטי הקורס לפני הפתיחה לקהל הרחב</p>
                <p className="rounded-xl bg-white/8 px-4 py-3">הטבת השקה ייעודית לחברי הרשימה</p>
                <p className="rounded-xl bg-white/8 px-4 py-3">קדימות למארז המצפן, שיופק בכמות מוגבלת בהשקה</p>
              </div>

              {joined ? (
                <div className="rounded-2xl border border-[#f1cf86]/35 bg-[#f1cf86]/12 p-6 text-center" aria-live="polite">
                  <div className="mx-auto h-11 w-11 rounded-full bg-[#f1cf86] text-[#2b1038] flex items-center justify-center mb-3"><Check size={23} /></div>
                  <h3 className="font-bold text-xl mb-2">המקום ברשימת ההשקה נשמר</h3>
                  <p className="text-white/72 text-sm leading-6">{confirmationSent ? "שלחנו גם אישור למייל." : "המקום נשמר. אם אישור המייל יתעכב, אין צורך להירשם שוב."} אין חיוב ואין הזמנה בשלב הזה.</p>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-3" noValidate>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block"><span className="sr-only">שם</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="שם" autoComplete="name" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#f1cf86]" /></label>
                    <label className="block"><span className="sr-only">מייל</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="מייל" autoComplete="email" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#f1cf86]" /></label>
                  </div>
                  <label className="block"><span className="sr-only">טלפון, לא חובה</span><input type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="טלפון, לא חובה" autoComplete="tel" className="min-h-13 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#f1cf86]" /></label>
                  <label className="flex items-start gap-3 cursor-pointer text-sm text-white/82 leading-6"><input type="checkbox" checked={waitlistConsent} onChange={event => setWaitlistConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#f1cf86]" /><span>אני רוצה לקבל את הודעת פתיחת הקורס והטבת ההשקה במייל. אפשר לבטל בכל עת.</span></label>
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-white/58 leading-5"><input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#f1cf86]" /><span>אשמח לקבל גם תוכן ועדכונים נוספים מהילית כספי.</span></label>
                  {formError && <p className="rounded-xl bg-red-950/35 border border-red-200/20 px-4 py-3 text-sm text-red-100" role="alert">{formError}</p>}
                  <button type="submit" disabled={joinWaitlist.isPending} className="min-h-14 w-full rounded-full bg-[#f1cf86] px-7 py-4 text-[#2b1038] font-black text-lg hover:bg-[#ffe3a8] active:scale-[.99] disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    {joinWaitlist.isPending ? "שומרים את המקום..." : <><Mail size={19} /> שמרו לי קדימות והטבת השקה</>}
                  </button>
                  <p className="text-center text-[11px] text-white/45">הקורס והמארז עדיין בבנייה. לא יתבצע חיוב ולא תיפתח הזמנה.</p>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#8d7b90] leading-6 px-4">המצפן הוא כלי להתבוננות וקבלת החלטה. הוא אינו אבחון פסיכולוגי, אינו מעריך את האדם שמולכם ואינו מחליף עזרה מקצועית במצב של חוסר ביטחון.</p>
      </section>

    </PageFrame>
  );
}

export default function CourseCompass() {
  const [phase, setPhase] = useState<"intro" | "questions" | "reveal" | "result">("intro");
  const [responses, setResponses] = useState<CompassResponses>({});
  const [sessionId, setSessionId] = useState(() => createSessionId());

  useEffect(() => {
    document.title = "אתגר המצפן | הילית כספי";
    trackViewContent({ content_name: "אתגר המצפן", content_category: "course_lead_magnet" });
    track({ eventType: "page_view", page: "/compass", metadata: { feature: "course_compass" } });
  }, []);

  const start = () => {
    setPhase("questions");
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "start" } });
  };

  const answer = (questionId: string, answerId: string) => {
    const next = { ...responses, [questionId]: answerId };
    setResponses(next);
    track({ eventType: "button_click", metadata: { feature: "course_compass", action: "answer", question: questionId, answer: answerId } });
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
