/**
 * Personality Quiz - "מה סוג האהבה שלך?"
 * 8 questions → 4 personality types → result + CTA to join database
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
type PersonalityType = "connector" | "achiever" | "nurturer" | "adventurer";

const TYPE_INFO: Record<PersonalityType, {
  title: string;
  subtitle: string;
  description: string;
  strengths: string[];
  compatible: string;
  compatibleType: PersonalityType;
  color: string;
  emoji: string;
}> = {
  connector: {
    title: "המחברת",
    subtitle: "The Connector",
    description: "את בנויה לקשרים עמוקים. אנשים נמשכים אלייך מיד - יש לך חום טבעי שגורם לכולם להרגיש בבית. את מחפשת מישהו שיראה אותך באמת.",
    strengths: ["אמפתיה גבוהה", "תקשורת מצוינת", "נאמנות עמוקה"],
    compatible: "המשיג",
    compatibleType: "achiever",
    color: "#ffe27c",
    emoji: "💛",
  },
  achiever: {
    title: "המשיגה",
    subtitle: "The Achiever",
    description: "את אישה שיודעת מה היא רוצה ואיך להשיג את זה. בזוגיות את מחפשת שותף שיכבד את השאיפות שלך ויצמח איתך. הכוח שלך הוא הבהירות שלך.",
    strengths: ["מטרות ברורות", "עצמאות", "מנהיגות טבעית"],
    compatible: "המחבר",
    compatibleType: "connector",
    color: "#191265",
    emoji: "⭐",
  },
  nurturer: {
    title: "המטפחת",
    subtitle: "The Nurturer",
    description: "הלב שלך גדול מהעולם. את נותנת מעצמך ללא גבול - ובזוגיות את מחפשת מישהו שיידע גם לתת בחזרה. את ראויה לאהבה שמרגישה בטוחה.",
    strengths: ["נדיבות", "אינטואיציה רגשית", "יצירת ביטחון"],
    compatible: "ההרפתקן",
    compatibleType: "adventurer",
    color: "#e8a0bf",
    emoji: "🌸",
  },
  adventurer: {
    title: "ההרפתקנית",
    subtitle: "The Adventurer",
    description: "החיים בשבילך הם הרפתקה - ואת מחפשת מישהו שיצא איתך לדרך. ספונטנית, נועזת ומלאת חיים. הזוגיות שלך צריכה לתת לך חופש ולא לכלוא אותך.",
    strengths: ["ספונטניות", "אופטימיות", "יצירתיות"],
    compatible: "המטפחת",
    compatibleType: "nurturer",
    color: "#7ec8e3",
    emoji: "🌟",
  },
};

// ─── Quiz Questions ───────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    question: "שבת בערב - מה הפנטזיה שלך?",
    answers: [
      { text: "ארוחה ביתית עם חברים קרובים", type: 0 }, // connector
      { text: "ערב עם ספר טוב ותוכניות לשבוע הבא", type: 1 }, // achiever
      { text: "לבשל לאנשים שאני אוהבת", type: 2 }, // nurturer
      { text: "ספונטנית - אולי בר, אולי ים, אולי שניהם", type: 3 }, // adventurer
    ],
  },
  {
    question: "מה הדבר שהכי חשוב לך בזוגיות?",
    answers: [
      { text: "חיבור עמוק ותקשורת אמיתית", type: 0 },
      { text: "שותפות לצמיחה ומטרות משותפות", type: 1 },
      { text: "ביטחון, יציבות ואהבה שקטה", type: 2 },
      { text: "הרפתקאות, חדש ומרגש", type: 3 },
    ],
  },
  {
    question: "חברה שלך עוברת משבר - מה את עושה?",
    answers: [
      { text: "מיד שם בשבילה, מקשיבה שעות", type: 0 },
      { text: "עוזרת לה לחשוב על פתרונות מעשיים", type: 1 },
      { text: "מכינה לה אוכל ומגיעה אליה הביתה", type: 2 },
      { text: "לוקחת אותה לצאת ולשנות אוויר", type: 3 },
    ],
  },
  {
    question: "מה מתאר אותך הכי טוב בעבודה?",
    answers: [
      { text: "האחת שכולם פונים אליה לייעוץ", type: 0 },
      { text: "הראשונה שמסיימת פרויקטים ומשיגה מטרות", type: 1 },
      { text: "זו שדואגת שכולם מרגישים טוב", type: 2 },
      { text: "זו שמביאה רעיונות חדשים ויצירתיים", type: 3 },
    ],
  },
  {
    question: "דייט ראשון - מה הכי מרגש אותך?",
    answers: [
      { text: "שיחה עמוקה שמרגישה כמו שנים של היכרות", type: 0 },
      { text: "לגלות שיש לנו חלומות ומטרות משותפות", type: 1 },
      { text: "שהוא שם לב לפרטים הקטנים ודואג לי", type: 2 },
      { text: "הפתעה - מקום שלא ציפיתי, חוויה שלא שכחתי", type: 3 },
    ],
  },
  {
    question: "מה הדבר שהכי מפחיד אותך בזוגיות?",
    answers: [
      { text: "להרגיש לא מובנת", type: 0 },
      { text: "לאבד את עצמי ואת המטרות שלי", type: 1 },
      { text: "להיות פגועה ולא מוגנת", type: 2 },
      { text: "להרגיש כלואה ומשועממת", type: 3 },
    ],
  },
  {
    question: "מה חברות שלך אומרות עלייך?",
    answers: [
      { text: "שאני הכי טובה להקשיב ולהיות שם", type: 0 },
      { text: "שאני מוכשרת ויודעת מה אני רוצה", type: 1 },
      { text: "שאני הכי חמה ואוהבת שיש", type: 2 },
      { text: "שאני ספונטנית ומביאה אנרגיה לכל מקום", type: 3 },
    ],
  },
  {
    question: "מה הסיפור שאת רוצה לספר בעוד 10 שנים?",
    answers: [
      { text: "שמצאתי את הנשמה התאומה שלי", type: 0 },
      { text: "שבנינו יחד משהו מדהים", type: 1 },
      { text: "שיש לי בית מלא אהבה ומשפחה", type: 2 },
      { text: "שחיינו חיים מלאים ומרגשים ביחד", type: 3 },
    ],
  },
];

// ─── Animations ───────────────────────────────────────────────────────────────
const slideIn = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
  transition: { duration: 0.4 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Quiz() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"intro" | "quiz" | "email" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ personalityType: PersonalityType; compatibleType: PersonalityType } | null>(null);
  const sessionId = useRef(Math.random().toString(36).slice(2));

  const submitQuiz = trpc.dnaQuiz.submit.useMutation({
    onSuccess: (data: any) => {
      setResult(data as { personalityType: PersonalityType; compatibleType: PersonalityType });
      setStep("result");
    },
  });

  const handleAnswer = (typeIndex: number) => {
    const newAnswers = [...answers, typeIndex];
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("email");
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuiz.mutate({
      sessionId: sessionId.current,
      answers,
    });
  };

  const skipEmail = () => {
    submitQuiz.mutate({
      sessionId: sessionId.current,
      answers,
    });
  };

  const typeInfo = result ? TYPE_INFO[result.personalityType] : null;

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="text-white/70 hover:text-white text-sm transition-colors">
          ← חזרה לאתר
        </button>
        <span className="text-white font-bold">הילית כספי | שאלון אישיות</span>
        <div className="w-20" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {step === "intro" && (
            <motion.div key="intro" {...slideIn} className="text-center">
              <div className="text-6xl mb-6">💛</div>
              <h1 className="text-3xl md:text-4xl font-black text-[#191265] mb-4 leading-tight">
                מה סוג האהבה שלך?
              </h1>
              <p className="text-[#727272] text-lg mb-8 leading-relaxed max-w-lg mx-auto">
                8 שאלות קצרות שיגלו לך את סוג האישיות הזוגית שלך - ואת מי את באמת מחפשת.
                <br /><br />
                <span className="text-[#191265] font-semibold">לוקח 2 דקות. משנה הכל.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                {["8 שאלות", "תוצאה מיידית", "חינם לגמרי"].map((item) => (
                  <div key={item} className="bg-white rounded-xl px-5 py-3 text-[#191265] font-medium shadow-sm">
                    ✓ {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep("quiz")}
                className="bg-[#191265] text-white font-black text-xl px-12 py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-xl"
              >
                התחילי את השאלון ←
              </button>
            </motion.div>
          )}

          {/* ── QUIZ ── */}
          {step === "quiz" && (
            <motion.div key={`q-${currentQ}`} {...slideIn}>
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-[#727272] mb-2">
                  <span>שאלה {currentQ + 1} מתוך {QUESTIONS.length}</span>
                  <span>{Math.round(((currentQ) / QUESTIONS.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-[#e9e8e8] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#191265] rounded-full"
                    initial={{ width: `${(currentQ / QUESTIONS.length) * 100}%` }}
                    animate={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-[#191265] mb-8 leading-tight text-center">
                {QUESTIONS[currentQ].question}
              </h2>

              <div className="flex flex-col gap-4">
                {QUESTIONS[currentQ].answers.map((answer, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleAnswer(answer.type)}
                    className="bg-white border-2 border-[#e9e8e8] text-[#191265] text-right px-6 py-5 rounded-2xl font-medium text-base hover:border-[#191265] hover:bg-[#191265] hover:text-white transition-all duration-300 hover:scale-[1.02] shadow-sm"
                  >
                    {answer.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── EMAIL CAPTURE ── */}
          {step === "email" && (
            <motion.div key="email" {...slideIn} className="text-center">
              <div className="text-5xl mb-6">🎯</div>
              <h2 className="text-2xl md:text-3xl font-black text-[#191265] mb-4">
                כמעט שם!
              </h2>
              <p className="text-[#727272] text-lg mb-8">
                השאירי את הפרטים שלך וקבלי את תוצאת השאלון + טיפים אישיים ישירות למייל.
              </p>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 max-w-sm mx-auto">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="השם שלך (אופציונלי)"
                  className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="המייל שלך (אופציונלי)"
                  className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base"
                />
                <button
                  type="submit"
                  disabled={submitQuiz.isPending}
                  className="bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-[#ffd84a] transition-all duration-300 disabled:opacity-60"
                >
                  {submitQuiz.isPending ? "מחשבת..." : "גלי את הסוג שלך ←"}
                </button>
                <button
                  type="button"
                  onClick={skipEmail}
                  disabled={submitQuiz.isPending}
                  className="text-[#727272] text-sm hover:text-[#191265] transition-colors"
                >
                  דלגי - הציגי לי את התוצאה ישירות
                </button>
              </form>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {step === "result" && typeInfo && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              {/* Result card */}
              <div className="bg-[#191265] rounded-3xl p-8 md:p-12 text-center text-white mb-8">
                <div className="text-6xl mb-4">{typeInfo.emoji}</div>
                <p className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-2">סוג האישיות שלך</p>
                <h2 className="text-4xl md:text-5xl font-black mb-2">{typeInfo.title}</h2>
                <p className="text-white/60 text-lg mb-6">{typeInfo.subtitle}</p>
                <p className="text-white/85 text-base leading-relaxed max-w-lg mx-auto mb-8">
                  {typeInfo.description}
                </p>
                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {typeInfo.strengths.map((s) => (
                    <span key={s} className="bg-white/10 border border-white/20 text-white text-sm px-4 py-2 rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
                <div className="bg-white/10 rounded-2xl p-5 text-center">
                  <p className="text-white/60 text-sm mb-1">הסוג שהכי מתאים לך</p>
                  <p className="text-[#ffe27c] font-black text-xl">{typeInfo.compatible}</p>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-white rounded-3xl p-8 text-center shadow-lg">
                <h3 className="text-2xl font-black text-[#191265] mb-4">
                  רוצה לפגוש את ה{typeInfo.compatible} שלך?
                </h3>
                <p className="text-[#727272] mb-6 leading-relaxed">
                  במאגר הרווקים הבלעדי שלי יש מאות רווקים שעברו סינון קפדני.
                  <br />
                  <strong className="text-[#191265]">אני אמצא לך 3 התאמות מדויקות - בהתאם לסוג האישיות שלך.</strong>
                </p>
                <div className="bg-[#f0eadc] rounded-2xl p-5 mb-6 text-right">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#191265] font-bold">גישה למאגר + 3 התאמות אישיות</span>
                    <span className="text-[#191265] font-black text-xl">₪249</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#727272] text-sm">פרופיל מפורט + תמונה</span>
                    <span className="text-green-600 text-sm font-medium">כלול</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#727272] text-sm">ליווי אישי מהילית</span>
                    <span className="text-green-600 text-sm font-medium">כלול</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/register?type=${result.personalityType}`)}
                  className="w-full bg-[#191265] text-white font-black text-lg py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-[1.02] shadow-xl mb-4"
                >
                  הצטרפי למאגר - ₪249 ←
                </button>
                <p className="text-[#727272] text-sm">
                  תשלום מאובטח • ביטול בכל עת
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
