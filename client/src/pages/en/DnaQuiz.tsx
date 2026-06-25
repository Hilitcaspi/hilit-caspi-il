/**
 * English DNA Quiz — /en/dna
 * "Discover Your Relationship DNA"
 * 20 statements rated 1-5, grouped into 4 personality types:
 * Group A (1-5):  leader
 * Group B (6-10): romantic
 * Group C (11-15): free_spirit
 * Group D (16-20): anchor
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";

type DnaType = "leader" | "romantic" | "free_spirit" | "anchor";
type Gender = "female" | "male";

// ── Statements (gender-neutral English) ─────────────────────────────────────
const STATEMENTS: string[] = [
  // Group A - leader (1-5)
  "In my social or work environment, I'm usually the one who takes charge, initiates, and makes decisions.",
  "It's hard for me to let go of control and let someone else manage things, even in a relationship.",
  "People sometimes tell me I project a strong energy that can feel intimidating or hard to approach.",
  "In moments of conflict, I tend to act rationally, analyze the situation, and look for a practical solution.",
  "It's very important to me to feel that I maintain my independence and don't depend on anyone.",

  // Group B - romantic (6-10)
  "I give everything in a relationship and sometimes feel I invest more than the other person.",
  "Romantic gestures, warm words, and frequent physical affection are essential to me in a relationship.",
  "When I meet someone I'm attracted to, I can quickly imagine a shared future together.",
  "I often find myself analyzing messages or behaviors from a partner, looking for signs that something is wrong, out of fear of being hurt.",
  "I tend to avoid difficult confrontations and sometimes give in just to preserve harmony.",

  // Group C - free_spirit (11-15)
  "Fixed, predictable routines in a relationship make me feel trapped or bored.",
  "A perfect weekend for me has to include going out, friends, spontaneous adventures, or new experiences.",
  "I need a lot of personal space and time alone to recharge, even when I'm deeply in love.",
  "I operate more on intuition and gut feelings than on planning and to-do lists.",
  "When I feel someone is trying to limit me or becomes overly dependent, I instinctively pull back.",

  // Group D - anchor (16-20)
  "The most important thing I look for in a partner is stability, consistency, and a deep sense of security.",
  "I love taking care of my partner (cooking, organizing, nurturing) and see it as my main way of showing love.",
  "I prefer a quiet, intimate evening at home with my partner over going to a loud party or bar.",
  "I'm someone who plans ahead, and it's important to me that we have shared goals and a clear direction.",
  "Continuous daily communication (good morning messages, updates throughout the day) is essential for me to feel connected.",
];

const SCALE_LABELS = [
  "Not like me at all",
  "Not like me",
  "Neutral",
  "Like me",
  "Very much like me",
];

// ── Tiebreaker questions ─────────────────────────────────────────────────────
const TIEBREAKER_QUESTIONS: {
  types: [DnaType, DnaType];
  question: string;
  answer_a: string;
  answer_b: string;
}[] = [
  {
    types: ["leader", "romantic"],
    question: "At the end of a hard day, what feels more natural to you?",
    answer_a: "I want to decompress alone and then talk when I'm ready.",
    answer_b: "I want to connect with my partner and talk through what happened.",
  },
  {
    types: ["leader", "free_spirit"],
    question: "When you're in love, what wins out more often?",
    answer_a: "I stay focused on my goals and maintain my independence.",
    answer_b: "I want to explore and experience everything together.",
  },
  {
    types: ["leader", "anchor"],
    question: "What describes you more in a relationship?",
    answer_a: "I lead and set the direction for us.",
    answer_b: "I create the safe, stable foundation for us.",
  },
  {
    types: ["romantic", "free_spirit"],
    question: "What matters more to you in a relationship?",
    answer_a: "Deep emotional connection and intimacy.",
    answer_b: "Freedom, spontaneity, and shared adventures.",
  },
  {
    types: ["romantic", "anchor"],
    question: "What describes you more?",
    answer_a: "I express love through words, affection, and emotional depth.",
    answer_b: "I express love through actions, care, and creating security.",
  },
  {
    types: ["free_spirit", "anchor"],
    question: "What feels more like you?",
    answer_a: "I need space and spontaneity to feel alive in a relationship.",
    answer_b: "I need consistency and routine to feel safe in a relationship.",
  },
];

// ── DNA type info ────────────────────────────────────────────────────────────
const DNA_INFO: Record<DnaType, {
  label: string;
  subtitle: string;
  superpower: string;
  challenge: string;
  match: string;
  color: string;
  bg: string;
}> = {
  leader: {
    label: "The Magnetic Leader",
    subtitle: "Strength, charisma, independence",
    superpower: "Your charisma and confidence are your greatest relationship asset. You bring clarity, strength, and natural leadership to a partnership. Whoever gets to be with you receives someone who loves without games and is looking for a partner to run alongside them, not behind them.",
    challenge: "Because you're so powerful, many people feel intimidated. You sometimes find yourself managing the relationship and your partner, even though all you really want is to lean on someone else.",
    match: "You need a 'secure rock': someone with genuine self-confidence and inner calm who doesn't get into ego battles, isn't threatened by your success, and stays present and grounded. Their stable presence will make you want to put down your armor and simply be yourself.",
    color: "#191265",
    bg: "#ffe27c",
  },
  romantic: {
    label: "The Deep Romantic",
    subtitle: "Depth, emotion, soul-level connection",
    superpower: "Your heart is your greatest relationship asset. You have a rare ability to love, hold space, and give. You bring real intimacy and emotional depth to a relationship. Whoever gets to be with you will feel like the most special person in the world.",
    challenge: "Your endless giving sometimes causes you to forget your own needs. Your tendency to overthink every message or behavior comes from a fear of being hurt, and sometimes leads you to hold on too tightly or accept crumbs of attention just to avoid losing the connection.",
    match: "Your ideal match is 'the communicative knight': someone who isn't afraid to talk about feelings, initiates deep conversations, gives you consistent verbal reassurance, and creates full transparency. They plan ahead and create the safety that allows your heart to open.",
    color: "#191265",
    bg: "#f0eadc",
  },
  free_spirit: {
    label: "The Free Spirit",
    subtitle: "Spontaneity, vitality, energy",
    superpower: "You bring energy, aliveness, and excitement into every room. Your greatest relationship asset is your spontaneity and joy for life. Being with you is an adventure. When you choose someone, it's a clean, genuine choice, not out of dependency.",
    challenge: "The fear of a confining routine sometimes makes you pull away when things become stable or 'too ordinary'. You may confuse healthy stability with boredom, and be drawn to 'unavailable' people who keep you on edge instead of choosing someone who would actually be good for you long-term.",
    match: "Your ideal match is 'the flexible anchor': a stable person with an open mind who has a full life of their own. They'll give you the space you need without taking it personally. They'll go along with your wild ideas with a smile, but also know how to anchor you with love when you both just need to rest together.",
    color: "#191265",
    bg: "#e8f4f8",
  },
  anchor: {
    label: "The Stable Anchor",
    subtitle: "Stability, loyalty, security",
    superpower: "You are 'home'. Your greatest relationship asset is your ability to create calm, security, and a protected space for whoever is with you. You're loyal, practical, and know how to take responsibility. Quality people who are serious about building a future look straight at you.",
    challenge: "Because you take care of everyone and everything, you sometimes become the 'caretaker' of the relationship and attract people who are looking for someone to look after them. You find it hard to let go of the reins and let your partner invest in you in return.",
    match: "You need a 'positive alpha initiator': someone who knows how to take charge, plans dates, opens doors, and most importantly asks 'What can I do today to make things easier for you?' They're a person of action who knows how to nurture you exactly the way you nurture others.",
    color: "#191265",
    bg: "#f5f0e8",
  },
};

// ── WhatsApp link ────────────────────────────────────────────────────────────
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%20just%20completed%20the%20DNA%20quiz%20and%20would%20love%20to%20learn%20more%20about%20the%20matchmaking%20database.";

// ── Main component ───────────────────────────────────────────────────────────
export default function EnDnaQuiz() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const returnTo = urlParams.get("return_to");
  const returnFreeToken = urlParams.get("free_token");

  const utmSource   = urlParams.get("utm_source")   || sessionStorage.getItem("utm_source")   || localStorage.getItem("utm_source")   || undefined;
  const utmMedium   = urlParams.get("utm_medium")   || sessionStorage.getItem("utm_medium")   || localStorage.getItem("utm_medium")   || undefined;
  const utmCampaign = urlParams.get("utm_campaign") || sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined;
  const utmContent  = urlParams.get("utm_content")  || sessionStorage.getItem("utm_content")  || localStorage.getItem("utm_content")  || undefined;
  const utmTerm     = urlParams.get("utm_term")     || sessionStorage.getItem("utm_term")     || localStorage.getItem("utm_term")     || undefined;

  const [phase, setPhase] = useState<"gender" | "quiz" | "tiebreaker" | "capture" | "result">("gender");
  const [gender, setGender] = useState<Gender>("female");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [dnaType, setDnaType] = useState<DnaType | null>(null);
  const [scores, setScores] = useState<Record<DnaType, number> | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<number[]>([]);
  const [tiebreakerQuestion, setTiebreakerQuestion] = useState<typeof TIEBREAKER_QUESTIONS[0] | null>(null);
  const [tiebreakerAnswer, setTiebreakerAnswer] = useState<DnaType | null>(null);
  const [captureForm, setCaptureForm] = useState({ name: "", email: "", phone: "" });
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const sessionId = useRef(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [phase]);

  const submitMutation = trpc.dnaQuiz.submit.useMutation({
    onSuccess: (data) => {
      setDnaType(data.dnaType as DnaType);
      setScores(data.scores as Record<DnaType, number>);
      setPhase("result");
    },
  });
  const createLeadMutation = trpc.crm.createLead.useMutation();

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
        ) ?? TIEBREAKER_QUESTIONS.find(
          q => topTypes.includes(q.types[0]) && topTypes.includes(q.types[1])
        ) ?? null;
        if (tbq) {
          setTiebreakerQuestion(tbq);
          setPhase("tiebreaker");
          return;
        }
      }
      setPhase("capture");
    }
  };

  const progress = Math.round((currentIdx / STATEMENTS.length) * 100);
  const info = dnaType ? DNA_INFO[dnaType] : null;

  // ── Gender selection ────────────────────────────────────────────────────────
  if (phase === "gender") {
    const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
    return (
      <div className="min-h-screen bg-[#191265] flex flex-col items-center justify-center font-sans px-4 py-12" dir="ltr">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-8">
            <img src={PROFILE_IMG} alt="Hilit Caspi" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-[#ffe27c]" />
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              Free Quiz by Hilit Caspi
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
              Discover Your<br />
              <span className="text-[#ffe27c]">Relationship DNA</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              20 statements. 5 minutes. A complete picture of your relationship personality, your superpower, your challenge, and the partner type that truly fits you.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <p className="text-[#191265] font-bold text-center mb-4">I identify as:</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(["female", "male"] as Gender[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-4 rounded-2xl font-black text-lg transition-all duration-200 border-2 ${
                    gender === g
                      ? "bg-[#191265] text-white border-[#191265]"
                      : "bg-white text-[#191265] border-[#e0d8cc] hover:border-[#191265]"
                  }`}
                >
                  {g === "female" ? "Woman" : "Man"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("quiz")}
              className="w-full bg-[#ffe27c] text-[#191265] font-black text-xl py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg"
            >
              Start the Quiz
            </button>
            <p className="text-center text-xs text-[#727272] mt-3">Free · 5 minutes · No credit card</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Quiz ────────────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const stmt = STATEMENTS[currentIdx];
    return (
      <div className="min-h-screen bg-[#191265] flex flex-col font-sans px-4 py-8" dir="ltr">
        {/* Progress */}
        <div className="max-w-lg w-full mx-auto mb-6">
          <div className="flex justify-between text-white/60 text-xs mb-2">
            <span>Statement {currentIdx + 1} of {STATEMENTS.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#ffe27c] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="max-w-lg w-full mx-auto flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl p-8 shadow-2xl"
            >
              <p className="text-[#191265] font-black text-xl leading-relaxed mb-8 text-center">
                "{stmt}"
              </p>

              <p className="text-[#727272] text-sm text-center mb-4">How much does this describe you?</p>

              <div className="space-y-2">
                {SCALE_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRate(idx + 1)}
                    className={`w-full py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 text-left
                      ${answers[currentIdx] === idx + 1
                        ? "bg-[#191265] text-white border-[#191265]"
                        : "bg-white text-[#191265] border-[#e0d8cc] hover:border-[#191265] hover:bg-[#f0eadc]"
                      }`}
                  >
                    <span className="inline-block w-6 text-center font-black mr-2">{idx + 1}</span>
                    {label}
                  </button>
                ))}
              </div>

              {currentIdx > 0 && (
                <button
                  onClick={() => setCurrentIdx(currentIdx - 1)}
                  className="mt-4 w-full text-[#727272] text-sm hover:text-[#191265] transition-colors"
                >
                  Back to previous statement
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Tiebreaker ──────────────────────────────────────────────────────────────
  if (phase === "tiebreaker" && tiebreakerQuestion) {
    const [typeA, typeB] = tiebreakerQuestion.types;
    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center font-sans px-4" dir="ltr">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🤔</div>
            <h2 className="text-2xl font-black text-[#191265] mb-2">One more question</h2>
            <p className="text-[#727272] text-sm">Your scores are very close. This will help us pinpoint your type.</p>
          </div>
          <p className="text-[#191265] font-black text-lg text-center mb-6">{tiebreakerQuestion.question}</p>
          <div className="space-y-3">
            <button
              onClick={() => { setTiebreakerAnswer(typeA); setPhase("capture"); }}
              className="w-full py-4 px-5 rounded-2xl border-2 border-[#e0d8cc] text-[#191265] font-semibold text-left hover:border-[#191265] hover:bg-[#f0eadc] transition-all"
            >
              {tiebreakerQuestion.answer_a}
            </button>
            <button
              onClick={() => { setTiebreakerAnswer(typeB); setPhase("capture"); }}
              className="w-full py-4 px-5 rounded-2xl border-2 border-[#e0d8cc] text-[#191265] font-semibold text-left hover:border-[#191265] hover:bg-[#f0eadc] transition-all"
            >
              {tiebreakerQuestion.answer_b}
            </button>
          </div>
          <button
            onClick={() => setPhase("capture")}
            className="mt-4 w-full text-[#727272] text-sm hover:text-[#191265] transition-colors"
          >
            Skip this question
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Lead Capture ────────────────────────────────────────────────────────────
  if (phase === "capture") {
    const handleCapture = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!captureForm.name.trim() || !captureForm.email.trim()) {
        setCaptureError("Please enter your name and email.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(captureForm.email.trim())) {
        setCaptureError("Please enter a valid email address.");
        return;
      }
      if (!captureConsent) {
        setCaptureError("Please confirm you agree to receive emails.");
        return;
      }
      setCaptureError("");

      const computedDnaType = tiebreakerAnswer ?? (pendingAnswers.length === 20
        ? (Object.entries({
            leader:      pendingAnswers.slice(0, 5).reduce((s, v) => s + v, 0),
            romantic:    pendingAnswers.slice(5, 10).reduce((s, v) => s + v, 0),
            free_spirit: pendingAnswers.slice(10, 15).reduce((s, v) => s + v, 0),
            anchor:      pendingAnswers.slice(15, 20).reduce((s, v) => s + v, 0),
          } as Record<string, number>).sort((a, b) => b[1] - a[1])[0][0] as DnaType)
        : undefined);

      try {
        await createLeadMutation.mutateAsync({
          name: captureForm.name,
          email: captureForm.email,
          phone: captureForm.phone || undefined,
          source: "dna_quiz",
          quizSessionId: sessionId.current,
          gender,
          dnaType: computedDnaType,
        });
      } catch {
        // Non-blocking
      }

      submitMutation.mutate({
        sessionId: sessionId.current,
        gender,
        answers: pendingAnswers,
        ...(tiebreakerAnswer ? { tiebreaker: tiebreakerAnswer } : {}),
        ...(utmSource ? { utmSource } : {}),
        ...(utmMedium ? { utmMedium } : {}),
        ...(utmCampaign ? { utmCampaign } : {}),
        ...(utmContent ? { utmContent } : {}),
        ...(utmTerm ? { utmTerm } : {}),
      });
    };

    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center font-sans px-4" dir="ltr">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🧬</div>
            <h2 className="text-2xl font-black text-[#191265] mb-2">Your result is ready!</h2>
            <p className="text-[#727272] leading-relaxed text-sm">
              Enter your details to receive your Relationship DNA profile. I'll also send it to your email.
            </p>
          </div>

          <form onSubmit={handleCapture} className="space-y-4">
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1">Full name *</label>
              <input
                type="text"
                value={captureForm.name}
                onChange={e => setCaptureForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1">Email *</label>
              <input
                type="email"
                value={captureForm.email}
                onChange={e => setCaptureForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={captureForm.phone}
                onChange={e => setCaptureForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={captureConsent}
                onChange={e => setCaptureConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#e9e8e8] text-[#191265] flex-shrink-0"
              />
              <span className="text-[#727272] text-xs leading-relaxed">
                I agree to receive my results and occasional emails from Hilit Caspi. I can unsubscribe at any time.
              </span>
            </label>

            {captureError && <p className="text-red-500 text-sm">{captureError}</p>}

            <button
              type="submit"
              disabled={submitMutation.isPending || createLeadMutation.isPending}
              className="w-full bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 disabled:opacity-60"
            >
              {submitMutation.isPending ? "Calculating your DNA..." : "Show My Result"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === "result" && info && dnaType) {
    return (
      <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">
        {/* Progress banner */}
        <div className="bg-[#ffe27c] py-3 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 text-[#191265]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#191265] text-white text-xs font-black flex items-center justify-center">1</div>
              <span className="font-bold text-sm">DNA Profile</span>
              <span className="text-green-700 text-sm font-bold">Done</span>
            </div>
            <div className="w-8 h-0.5 bg-[#191265]/30" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#191265]/20 border-2 border-[#191265] text-[#191265] text-xs font-black flex items-center justify-center">2</div>
              <span className="font-semibold text-sm">Full Profile</span>
              <span className="text-[#191265]/60 text-xs">(after joining)</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#191265] py-8 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-5xl mb-3">🧬</div>
            <p className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-2">Your Relationship DNA</p>
            <h1 className="text-white font-black text-3xl md:text-4xl">{info.label}</h1>
            <p className="text-white/60 mt-2">{info.subtitle}</p>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {/* Score breakdown */}
          {scores && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm">
              <h3 className="font-black text-[#191265] mb-4">Your score breakdown:</h3>
              {(["leader", "romantic", "free_spirit", "anchor"] as DnaType[]).map((type) => {
                const typeInfo = DNA_INFO[type];
                const score = scores[type];
                const pct = Math.round((score / 25) * 100);
                return (
                  <div key={type} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-bold ${type === dnaType ? "text-[#191265]" : "text-[#727272]"}`}>
                        {typeInfo.label} {type === dnaType && "✓"}
                      </span>
                      <span className="text-[#727272]">{score}/25</span>
                    </div>
                    <div className="h-2 bg-[#f0eadc] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${type === dnaType ? "bg-[#191265]" : "bg-[#191265]/30"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Superpower */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-[#191265] mb-3">Your relationship superpower:</h3>
            <p className="text-[#191265]/80 leading-relaxed">{info.superpower}</p>
          </motion.div>

          {/* Challenge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#191265] rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-white mb-3">Your challenge:</h3>
            <p className="text-white/80 leading-relaxed">{info.challenge}</p>
          </motion.div>

          {/* Match */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-3xl p-6 shadow-sm" style={{ background: info.bg }}>
            <h3 className="font-black text-[#191265] mb-3">
              The secret of your perfect match:
            </h3>
            <p className="text-[#191265]/80 leading-relaxed">{info.match}</p>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-[#191265] to-[#1800ad] rounded-3xl p-8 text-center text-white">
            <div className="text-4xl mb-4">💛</div>
            {returnTo === "join" ? (
              <>
                <h3 className="font-black text-xl mb-3">Your DNA has been identified!</h3>
                <p className="text-white/75 text-sm leading-relaxed mb-6">
                  Click the button to return to the registration form and continue joining the database with your result.
                </p>
                <button
                  onClick={() => {
                    const base = returnFreeToken ? `/join?free_token=${returnFreeToken}` : `/join`;
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage({ type: "DNA_RESULT", dnaType, gender, sessionId: sessionId.current }, window.location.origin);
                      window.close();
                    } else {
                      navigate(`${base}&dna=${dnaType}&gender=${gender}&session=${sessionId.current}`);
                    }
                  }}
                  className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-xl"
                >
                  Add my result and return to the form
                </button>
              </>
            ) : (
              <>
                <h3 className="font-black text-xl mb-3">
                  Now that we've uncovered your DNA, let's find your match
                </h3>
                <p className="text-white/75 text-sm leading-relaxed mb-4">
                  I've built a curated, discreet matchmaking database. Quality singles reach out to me every day. Once you join, your profile (including these results) is saved with me, and I'll reach out the moment there's a compatible match.
                  <br /><br />
                  <strong className="text-white">No swiping. Matches are based on advanced compatibility calculations and positive psychology, and personally reviewed by Hilit before every proposal.</strong>
                </p>
                <div className="bg-white/10 rounded-2xl p-4 mb-5 text-left">
                  <p className="text-[#ffe27c] font-bold text-sm mb-3">Registration process (2 steps):</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ffe27c] text-[#191265] text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                      <div>
                        <p className="text-white text-sm font-bold">DNA Profile Done</p>
                        <p className="text-white/60 text-xs">Complete the quiz + pay the one-time registration fee</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                      <div>
                        <p className="text-white text-sm font-bold">Scientific personality questionnaire</p>
                        <p className="text-white/60 text-xs">After joining, you'll receive a link to a deeper questionnaire that allows me to match you precisely. Takes about 15 minutes.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[#ffe27c] font-black text-lg mb-1">Registration fee: $149 (one-time)</div>
                <p className="text-white/50 text-xs mb-6">Every profile is personally reviewed by Hilit before being added to the database</p>
                <button
                  onClick={() => navigate(`/join?dna=${dnaType}&gender=${gender}&session=${sessionId.current}&name=${encodeURIComponent(captureForm.name)}&email=${encodeURIComponent(captureForm.email)}&phone=${encodeURIComponent(captureForm.phone)}`)}
                  className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-xl"
                >
                  Yes! Find my match
                </button>
              </>
            )}
          </motion.div>

          {/* Personal message from Hilit */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg"
                alt="Hilit Caspi"
                className="w-20 h-20 rounded-full object-cover object-[center_20%] shadow-md flex-shrink-0"
              />
              <div>
                <p className="font-black text-[#191265] text-lg">Hilit Caspi</p>
                <p className="text-[#1800ad] text-sm font-medium">Relationship Expert & Matchmaker</p>
              </div>
            </div>
            <p className="text-[#191265]/80 leading-relaxed text-sm">
              I'm so glad you took the quiz! This is the first step toward understanding yourself better and moving toward a real, lasting relationship. I've guided hundreds of people through this process, and I believe you'll find the love you're looking for. 💛
            </p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-all duration-300 text-sm"
            >
              <span className="text-lg">💬</span>
              Message Hilit on WhatsApp
            </a>
          </motion.div>

          {/* Upsell - coaching */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-[#ffe27c] rounded-3xl p-6">
            <span className="bg-[#191265] text-white text-xs font-bold px-3 py-1.5 rounded-full">Recommended upgrade</span>
            <h3 className="text-[#191265] font-black text-lg mt-4 mb-2">Want deeper personal support?</h3>
            <p className="text-[#191265]/80 text-sm leading-relaxed mb-4">
              Beyond the database, Hilit offers a personal coaching process where you work together on your patterns, build the right profile, and find your path to a lasting relationship.
              <br /><strong>The coaching package includes database access ($149 value).</strong>
            </p>
            <a
              href="/coaching"
              className="inline-block bg-[#191265] text-white font-black px-6 py-3 rounded-2xl hover:bg-[#1800ad] transition-colors text-sm"
            >
              Learn about personal coaching
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
