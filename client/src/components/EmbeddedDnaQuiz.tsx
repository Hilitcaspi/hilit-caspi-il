/**
 * EmbeddedDnaQuiz - Embedded version of the DNA Quiz for use inside CourseView
 * Skips the lead capture phase (user is already registered via course token)
 * Calls onComplete(dnaType, gender) when done
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";

type DnaType = "leader" | "romantic" | "free_spirit" | "anchor";
type Gender = "female" | "male";

interface Props {
  onComplete: (dnaType: DnaType, gender: Gender) => void;
  initialDnaType?: DnaType | null;
  initialGender?: Gender;
}

const STATEMENTS_FEMALE: string[] = [
  "בסביבה שלי (בעבודה או עם חברים) אני בדרך כלל זו שלוקחת פיקוד, מזמינה ומקבלת החלטות.",
  "קשה לי לשחרר שליטה ולתת לאדם אחר לנהל את הדברים, גם בתוך זוגיות.",
  "לפעמים גברים אומרים לי שאני משדרת עוצמה שעלולה להרתיע, או שאני נראית 'בלתי מושגת'.",
  "ברגעי משבר או ריב, אני פועלת בצורה רציונלית, מנתחת את המצב ומחפשת פתרון מעשי.",
  "חשוב לי מאוד להרגיש שאני שומרת על העצמאות שלי ולא תלויה באף אחד.",
  "אני נותנת את כל עצמי בזוגיות ולפעמים מרגישה שאני משקיעה יותר מהצד השני.",
  "תגובות רומנטיות, מילים חמות ומגע פיזי תכוף הם אוויר לנשימה עבורי בקשר.",
  "כשאני פוגשת מישהו שמוצא חן בעיניי, אני יכולה לדמיין את העתיד המשותף שלנו מהר מאוד.",
  "לעתים קרובות אני מנתחת הודעות או התנהגויות של בן הזוג מדחף לפחד מלהיפגע או לעשות טעות.",
  "אני נוטה להימנע מעימותים קשים ומעדיפה לוותר לפעמים רק כדי לשמור על ההרמוניה בינינו.",
  "שגרה קבועה ומצופה מדי בזוגיות גורמת לי להרגיש כלואה או להתשעמם.",
  "סוף שבוע מושלם עבורי חייב לכלול יציאות, חברים, הרפתקה ספונטנית או חוויות שעוד לא עשינו.",
  "אני זקוקה להרבה מאוד מרחב וזמן לעצמי כדי להיטען, גם כשאני מאוהבת עד הגג.",
  "אני פועלת לפי אינטואיציה ותחושות בטן יותר מאשר לפי תכנון מראש ורשימות.",
  "כשאני מרגישה שמישהו מנסה להגביל אותי או הופך תלותית, אני לוקחת צעד אחורה באינסטינקט.",
  "הדבר הכי חשוב שלי למצוא בבן זוג הוא יציבות, עקביות ותחושת ביטחון מוחלטת.",
  "אני אוהבת לדאוג לבן הזוג שלי (לבשל, לארגן, לפנק) ומרגישה שזו הדרך המרכזית שלי להראות אהבה.",
  "אני מעדיפה ערב אינטימי ושקט בבית עם בן הזוג על פני יציאה למסיבה או בר רועש.",
  "אני אדם שמתכננת קדימה ולי חשוב לדעת שיש לנו מטרות משותפות וכיוון ברור לקשר.",
  "תקשורת יומיומית רציפה (הודעות בוקר טוב, עדכונים במהלך היום) היא קריטית עבורי כדי להרגיש מחוברת.",
];

const STATEMENTS_MALE: string[] = [
  "בסביבה שלי (בעבודה או עם חברים) אני בדרך כלל זה שלוקח פיקוד, מזמין ומקבל החלטות.",
  "קשה לי לשחרר שליטה ולתת לאדם אחר לנהל את הדברים, גם בתוך זוגיות.",
  "לפעמים נשים אומרות לי שאני משדר עוצמה שעלולה להרתיע, או שאני נראה 'בלתי מושג'.",
  "ברגעי משבר או ריב, אני פועל בצורה רציונלית, מנתח את המצב ומחפש פתרון מעשי.",
  "חשוב לי מאוד להרגיש שאני שומר על העצמאות שלי ולא תלוי באף אחד.",
  "אני נותן את כל עצמי בזוגיות ולפעמים מרגיש שאני משקיע יותר מהצד השני.",
  "תגובות רומנטיות, מילים חמות ומגע פיזי תכוף הם אוויר לנשימה עבורי בקשר.",
  "כשאני פוגש מישהי שמוצאת חן בעיניי, אני יכול לדמיין את העתיד המשותף שלנו מהר מאוד.",
  "לעתים קרובות אני מנתח הודעות או התנהגויות של בת הזוג מדחף לפחד מלהיפגע או לעשות טעות.",
  "אני נוטה להימנע מעימותים קשים ומעדיף לוותר לפעמים רק כדי לשמור על ההרמוניה בינינו.",
  "שגרה קבועה ומצופה מדי בזוגיות גורמת לי להרגיש כלוא או להתשעמם.",
  "סוף שבוע מושלם עבורי חייב לכלול יציאות, חברים, הרפתקה ספונטנית או חוויות שעוד לא עשינו.",
  "אני זקוק להרבה מאוד מרחב וזמן לעצמי כדי להיטען, גם כשאני מאוהב עד הגג.",
  "אני פועל לפי אינטואיציה ותחושות בטן יותר מאשר לפי תכנון מראש ורשימות.",
  "כשאני מרגיש שמישהי מנסה להגביל אותי או הופכת תלותית, אני לוקח צעד אחורה באינסטינקט.",
  "הדבר הכי חשוב שלי למצוא בבת זוג הוא יציבות, עקביות ותחושת ביטחון מוחלטת.",
  "אני אוהב לדאוג לבת הזוג שלי (לבשל, לארגן, לפנק) ומרגיש שזו הדרך המרכזית שלי להראות אהבה.",
  "אני מעדיף ערב אינטימי ושקט בבית עם בת הזוג על פני יציאה למסיבה או בר רועש.",
  "אני אדם שמתכנן קדימה ולי חשוב לדעת שיש לנו מטרות משותפות וכיוון ברור לקשר.",
  "תקשורת יומיומית רציפה (הודעות בוקר טוב, עדכונים במהלך היום) היא קריטית עבורי כדי להרגיש מחובר.",
];

const SCALE_LABELS_FEMALE = ["לא מאפיינת אותי בכלל", "לא מאפיינת", "ניטרלית", "מאפיינת", "מאפיינת אותי מאוד"];
const SCALE_LABELS_MALE   = ["לא מאפיין אותי בכלל", "לא מאפיין", "ניטרלי", "מאפיין", "מאפיין אותי מאוד"];

const GROUP_LABELS: Record<number, string> = {
  0: "מנהיגות ועצמאות",
  1: "רומנטיות ורגש",
  2: "חופש וספונטניות",
  3: "יציבות ובית",
};

const DNA_LABELS: Record<DnaType, { f: string; m: string }> = {
  leader:      { f: "המנהיגה הממגנטת", m: "המנהיג הממגנט" },
  romantic:    { f: "הרומנטיקנית העמוקה", m: "הרומנטיקן העמוק" },
  free_spirit: { f: "רוח החופש", m: "רוח החופש" },
  anchor:      { f: "העוגן היציב", m: "העוגן היציב" },
};

const DNA_COLORS: Record<DnaType, string> = {
  leader:      "#191265",
  romantic:    "#e83e8c",
  free_spirit: "#1800ad",
  anchor:      "#2d6a4f",
};

const TIEBREAKER_QUESTIONS = [
  {
    types: ["leader", "romantic"] as [DnaType, DnaType],
    question_f: "כשאת מאוהבת, מה יותר חזק אצלך באמת?",
    question_m: "כשאתה מאוהב, מה יותר חזק אצלך באמת?",
    option_a_f: "הרצון להיות עצמאית ועוצמת",
    option_a_m: "הרצון להיות עצמאי ועוצמת",
    option_b_f: "הרצון להיות קרובה ומחוברת",
    option_b_m: "הרצון להיות קרוב ומחובר",
  },
  {
    types: ["leader", "free_spirit"] as [DnaType, DnaType],
    question_f: "מה יותר מאפיין אותך בזוגיות?",
    question_m: "מה יותר מאפיין אותך בזוגיות?",
    option_a_f: "אני מובילה ויודעת לאן אני הולכת",
    option_a_m: "אני מוביל ויודע לאן אני הולך",
    option_b_f: "אני חופשיית וספונטנית",
    option_b_m: "אני חופשי וספונטני",
  },
  {
    types: ["leader", "anchor"] as [DnaType, DnaType],
    question_f: "מה יותר חשוב לך בזוגיות?",
    question_m: "מה יותר חשוב לך בזוגיות?",
    option_a_f: "להיות חזקה ועצמאית",
    option_a_m: "להיות חזק ועצמאי",
    option_b_f: "להרגיש בטוחה ויצורת בית",
    option_b_m: "להרגיש בטוח וליצור בית",
  },
  {
    types: ["romantic", "free_spirit"] as [DnaType, DnaType],
    question_f: "מה יותר מאפיין אותך בזוגיות?",
    question_m: "מה יותר מאפיין אותך בזוגיות?",
    option_a_f: "להיות לב ולאהוב בעומק",
    option_a_m: "להיות לב ולאהוב בעומק",
    option_b_f: "להיות הרפתקה וספונטניות",
    option_b_m: "להיות הרפתקה וספונטניות",
  },
  {
    types: ["romantic", "anchor"] as [DnaType, DnaType],
    question_f: "מה יותר מאפיין אותך בזוגיות?",
    question_m: "מה יותר מאפיין אותך בזוגיות?",
    option_a_f: "לתת אהבה ולהרגיש עמוק",
    option_a_m: "לתת אהבה ולהרגיש עמוק",
    option_b_f: "ליצור בית ולהרגיש בטוחה",
    option_b_m: "ליצור בית ולהרגיש בטוח",
  },
  {
    types: ["free_spirit", "anchor"] as [DnaType, DnaType],
    question_f: "מה יותר מאפיין אותך בזוגיות?",
    question_m: "מה יותר מאפיין אותך בזוגיות?",
    option_a_f: "להיות חופשיית וספונטנית",
    option_a_m: "להיות חופשי וספונטני",
    option_b_f: "להיות בית ועוגן יציבה",
    option_b_m: "להיות בית ועוגן יציבה",
  },
];

export default function EmbeddedDnaQuiz({ onComplete, initialDnaType, initialGender }: Props) {
  const [phase, setPhase] = useState<"gender" | "quiz" | "tiebreaker" | "result">(
    initialDnaType ? "result" : "gender"
  );
  const [gender, setGender] = useState<Gender>(initialGender ?? "female");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [dnaType, setDnaType] = useState<DnaType | null>(initialDnaType ?? null);
  const [scores, setScores] = useState<Record<DnaType, number> | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<number[]>([]);
  const [tiebreakerQuestion, setTiebreakerQuestion] = useState<typeof TIEBREAKER_QUESTIONS[0] | null>(null);
  const [tiebreakerAnswer, setTiebreakerAnswer] = useState<DnaType | null>(null);

  const submitMutation = trpc.dnaQuiz.submit.useMutation({
    onSuccess: (data) => {
      const type = data.dnaType as DnaType;
      setDnaType(type);
      setScores(data.scores as Record<DnaType, number>);
      // Call onComplete immediately - skip the result display phase
      // so the parent (Register.tsx) can navigate to the next step
      onComplete(type, gender);
    },
  });
  // Read UTM params from sessionStorage (set by DnaQuiz.tsx or any landing page)
  const getUtmParams = () => ({
    utmSource: sessionStorage.getItem("utm_source") || undefined,
    utmMedium: sessionStorage.getItem("utm_medium") || undefined,
    utmCampaign: sessionStorage.getItem("utm_campaign") || undefined,
    utmContent: sessionStorage.getItem("utm_content") || undefined,
    utmTerm: sessionStorage.getItem("utm_term") || undefined,
  });

  const STATEMENTS = gender === "female" ? STATEMENTS_FEMALE : STATEMENTS_MALE;
  const SCALE_LABELS = gender === "female" ? SCALE_LABELS_FEMALE : SCALE_LABELS_MALE;

  const computeGroupScores = (ans: number[]) => ({
    leader:      ans.slice(0, 5).reduce((s, v) => s + v, 0),
    romantic:    ans.slice(5, 10).reduce((s, v) => s + v, 0),
    free_spirit: ans.slice(10, 15).reduce((s, v) => s + v, 0),
    anchor:      ans.slice(15, 20).reduce((s, v) => s + v, 0),
  });

  const handleRate = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = value;
    setAnswers(newAnswers);
    if (currentIdx < STATEMENTS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const finalAnswers: number[] = Array.from({ length: 20 }, (_, i) =>
        typeof newAnswers[i] === "number" ? newAnswers[i] : 3
      );
      setPendingAnswers(finalAnswers);
      const gs = computeGroupScores(finalAnswers);
      const maxScore = Math.max(...Object.values(gs));
      const topTypes = (Object.keys(gs) as DnaType[]).filter(k => gs[k] === maxScore);
      if (topTypes.length >= 2) {
        const [t1, t2] = topTypes.slice(0, 2);
        const tbq = TIEBREAKER_QUESTIONS.find(
          q => (q.types[0] === t1 && q.types[1] === t2) ||
               (q.types[0] === t2 && q.types[1] === t1)
        ) ?? null;
        if (tbq) {
          setTiebreakerQuestion(tbq);
          setPhase("tiebreaker");
          return;
        }
      }
      // Submit directly without capture (user already registered)
      const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      submitMutation.mutate({
        sessionId,
        gender,
        answers: finalAnswers,
        ...(tiebreakerAnswer ? { tiebreaker: tiebreakerAnswer } : {}),
        ...getUtmParams(),
      });
    }
  };

  const handleTiebreaker = (chosen: DnaType) => {
    setTiebreakerAnswer(chosen);
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    submitMutation.mutate({
      sessionId,
      gender,
      answers: pendingAnswers,
      tiebreaker: chosen,
      ...getUtmParams(),
    });
  };

  const progress = Math.round((currentIdx / STATEMENTS.length) * 100);
  const currentGroup = Math.floor(currentIdx / 5);

  // ── Gender selection ──────────────────────────────────────────────────────
  if (phase === "gender") {
    return (
      <div className="bg-[#191265] rounded-3xl p-8 text-center" dir="rtl">
        <div className="text-5xl mb-4">🧬</div>
        <h2 className="text-2xl font-black text-white mb-2">פיצוח ה-DNA הזוגי</h2>
        <p className="text-white/70 mb-8 leading-relaxed text-sm">
          20 משפטים שיחשפו את ה-DNA הזוגי שלך. ענה/י בכנות מוחלטת כדי שהאבחון יהיה מדויק.
        </p>
        <p className="font-bold text-white mb-4">אני:</p>
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => { setGender("female"); setPhase("quiz"); }}
            className="flex-1 max-w-[140px] bg-[#ffe27c] text-[#191265] font-black py-4 rounded-2xl text-lg hover:bg-white transition-colors"
          >
            אישה
          </button>
          <button
            onClick={() => { setGender("male"); setPhase("quiz"); }}
            className="flex-1 max-w-[140px] border-2 border-white text-white font-black py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors"
          >
            גבר
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    return (
      <div className="rounded-3xl overflow-hidden" dir="rtl">
        <div className="bg-[#191265] px-6 py-4">
          <div className="flex items-center justify-between text-white/70 text-sm mb-2">
            <span>שאלה {currentIdx + 1} מתוך {STATEMENTS.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#ffe27c] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-white/50 text-xs mt-1">{GROUP_LABELS[currentGroup]}</p>
        </div>
        <div className="bg-white p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <span className="bg-[#191265]/10 text-[#191265] text-xs font-bold px-3 py-1.5 rounded-full">
                  {GROUP_LABELS[currentGroup]}
                </span>
                <p className="text-[#191265] font-bold text-lg mt-4 leading-relaxed text-right">
                  {STATEMENTS[currentIdx]}
                </p>
              </div>
              <p className="text-center text-[#727272] text-sm mb-4">
                עד כמה המשפט מאפיין אותך? (1 = בכלל לא, 5 = מאוד)
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleRate(val)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl font-black text-lg transition-all duration-200 flex items-center justify-center
                      ${val <= 2 ? "bg-[#f0eadc] text-[#727272] group-hover:bg-[#e0d8ca]" :
                        val === 3 ? "bg-[#191265]/10 text-[#191265] group-hover:bg-[#191265]/20" :
                        "bg-[#191265] text-white group-hover:bg-[#1800ad]"}
                      group-hover:scale-110 shadow-sm`}
                    >
                      {val}
                    </div>
                    <span className="text-[9px] text-[#727272] text-center max-w-[52px] leading-tight hidden sm:block">
                      {SCALE_LABELS[val - 1]}
                    </span>
                  </button>
                ))}
              </div>
              {currentIdx > 0 && (
                <button
                  onClick={() => { setAnswers(answers.slice(0, -1)); setCurrentIdx(currentIdx - 1); }}
                  className="mt-6 w-full text-center text-[#727272] text-sm hover:text-[#191265] transition-colors"
                >
                  ← חזרה לשאלה הקודמת
                </button>
              )}
            </motion.div>
          </AnimatePresence>
          {submitMutation.isPending && (
            <div className="text-center mt-6">
              <div className="text-4xl animate-bounce">🧬</div>
              <p className="text-[#191265] font-bold mt-2">מנתח/ת את ה-DNA שלך...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Tiebreaker ────────────────────────────────────────────────────────────
  if (phase === "tiebreaker" && tiebreakerQuestion) {
    const question = gender === "female" ? tiebreakerQuestion.question_f : tiebreakerQuestion.question_m;
    const [typeA, typeB] = tiebreakerQuestion.types;
    const optionA = gender === "female" ? (tiebreakerQuestion as any).option_a_f : (tiebreakerQuestion as any).option_a_m;
    const optionB = gender === "female" ? (tiebreakerQuestion as any).option_b_f : (tiebreakerQuestion as any).option_b_m;
    return (
      <div className="bg-white rounded-3xl p-8 text-center" dir="rtl">
        <div className="text-5xl mb-4">🧬</div>
        <p className="text-[#1800ad] text-xs font-bold uppercase tracking-widest mb-3">שאלת הכרעה</p>
        <h3 className="text-xl font-black text-[#191265] mb-2 leading-relaxed">{question}</h3>
        <p className="text-[#727272] text-sm mb-8">בחר/י את האפשרות שמרגישה לך הכי נכונה</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => handleTiebreaker(typeA)}
            className="w-full bg-[#191265] text-white font-black py-4 rounded-2xl hover:bg-[#1800ad] transition-colors">
            {optionA}
          </button>
          <button onClick={() => handleTiebreaker(typeB)}
            className="w-full border-2 border-[#191265] text-[#191265] font-black py-4 rounded-2xl hover:bg-[#f0eadc] transition-colors">
            {optionB}
          </button>
        </div>
        {submitMutation.isPending && (
          <div className="text-center mt-6">
            <div className="text-4xl animate-bounce">🧬</div>
            <p className="text-[#191265] font-bold mt-2">מנתח/ת את ה-DNA שלך...</p>
          </div>
        )}
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === "result" && dnaType) {
    const label = gender === "female" ? DNA_LABELS[dnaType].f : DNA_LABELS[dnaType].m;
    const color = DNA_COLORS[dnaType];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden"
        dir="rtl"
      >
        <div className="p-6 text-center text-white" style={{ background: `linear-gradient(135deg, ${color} 0%, #1800ad 100%)` }}>
          <div className="text-5xl mb-3">🧬</div>
          <p className="text-white/70 text-sm mb-1">ה-DNA הזוגי שלך הוא</p>
          <h3 className="text-2xl font-black">{label}</h3>
        </div>
        {scores && (
          <div className="bg-white p-4">
            <p className="text-[#727272] text-xs text-center mb-3">הציונים שלך לפי קטגוריה (מתוך 25)</p>
            <div className="space-y-2">
              {(Object.entries(scores) as [DnaType, number][]).sort((a, b) => b[1] - a[1]).map(([type, score]) => {
                const pct = Math.round((score / 25) * 100);
                const lbl = gender === "female" ? DNA_LABELS[type].f : DNA_LABELS[type].m;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-bold ${type === dnaType ? "text-[#191265]" : "text-[#727272]"}`}>
                        {lbl} {type === dnaType && "✓"}
                      </span>
                      <span className="text-[#727272]">{score}/25</span>
                    </div>
                    <div className="h-2 bg-[#f0eadc] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${type === dnaType ? "bg-[#191265]" : "bg-[#191265]/30"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-[#f0eadc] p-4 text-center">
          <p className="text-[#191265] text-sm font-semibold">
            ✓ ה-DNA שלך נשמר במפה הזוגית שלך
          </p>
          <p className="text-[#727272] text-xs mt-1">תמצא/י את הפרופיל המלא שלך בסוף הקורס</p>
        </div>
      </motion.div>
    );
  }

  return null;
}
