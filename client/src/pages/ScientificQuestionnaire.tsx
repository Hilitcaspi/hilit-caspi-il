/**
 * ScientificQuestionnaire - Full registration + 15-question scientific compatibility quiz
 * Route: /join/questionnaire?token=xxx
 * Flow: Opened via email link after payment → details → DNA → 15 questions → confirmation
 *
 * The token identifies the single and pre-fills their DNA type.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useSearch, useLocation } from "wouter";
import { MATCH_QUESTIONS, IMPORTANCE_LABELS, type MatchAnswer } from "@/lib/matchmakingQuestions";
import EmbeddedDnaQuiz from "@/components/EmbeddedDnaQuiz";

const slideIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.4 },
};

const DNA_LABELS: Record<string, { f: string; m: string }> = {
  leader:      { f: "המנהיגה המגנטת", m: "המנהיג המגנטי" },
  romantic:    { f: "הרומנטית העמוקה", m: "הרומנטיקן העמוק" },
  free_spirit: { f: "רוח חופשית", m: "רוח חופשית" },
  anchor:      { f: "העוגן היציבה", m: "העוגן היציב" },
};

const CITIES = [
  "תל אביב", "יפו", "רמת גן", "גבעתיים", "בני ברק",
  "בת ים", "חולון", "אור יהודה", "אזור", "בני עיש",
  "גבעת שמואל", "רמת השרון", "קריית אונו",
  "ראשון לציון", "פתח תקווה", "רחובות", "הרצליה", "רעננה",
  "כפר סבא", "הוד השרון", "ראש העין", "לוד", "רמלה",
  "נס ציונה", "יבנה", "גן יבנה", "נתניה", "שוהם", "הדרום", "חריש",
  "חדרה", "פרדס חנה", "בנימינה", "זכרון יעקב", "קיסריה", "עמק חפר",
  "ירושלים", "מודיעין", "מודיעין מכבים רעות", "בית שמש",
  "ביתר", "מעלה אדומים", "מעלה החמישה", "קריית מלאכי", "אלעד מנשה",
  "חיפה", "קריית אתא", "קריית ביאליק", "קריית ים", "קריית מוצקין",
  "נשר", "טירת הכרמל", "זיכרון יעקב", "באקה אלגרבייה", "אום אלפחם",
  "עכו", "נהריה", "קריית שמונה", "צפת", "טבריה",
  "מגדל", "יקנעם", "אופק", "בית שאן", "ראש פינה",
  "קריית ימק",
  "אשדוד", "אשקלון", "באר שבע", "אילת", "עפולה",
  "קריית גת", "דימונה", "נתיבות", "שדרות", "אופקים",
  "רהט", "לקיה", "ערד", "מיתר ביקע",
  "העמק הגדול", "מגדל העמק",
  "אריאל", "מאלה אדומים", "עפרה", "ביתאל", "אלקנה",
].sort((a, b) => a.localeCompare(b, 'he'));

type Step = "intro" | "details" | "partner_prefs" | "dna" | "quiz" | "uploading" | "done" | "error" | "invalid";

export default function ScientificQuestionnaire() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const storageKey = token ? `questionnaire_progress_${token}` : null;

  const [step, setStep] = useState<Step>("intro");

  // Scroll to top on every step change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!storageKey) return 0;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.currentIndex || 0;
      }
    } catch {}
    return 0;
  });
  const [answers, setAnswers] = useState<Record<string, MatchAnswer>>(() => {
    if (!storageKey) return {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.answers || {};
      }
    } catch {}
    return {};
  });
  const [errorMsg, setErrorMsg] = useState("");

  // ── Profile fields (details step) ──
  const [missingGender, setMissingGender] = useState<"female" | "male">("female");
  const [seekingGender, setSeekingGender] = useState<"female" | "male" | "any">("male");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [lastName, setLastName] = useState("");
  const [missingCity, setMissingCity] = useState("");
  const [missingHeight, setMissingHeight] = useState("");
  const [missingMaritalStatus, setMissingMaritalStatus] = useState<"single" | "divorced" | "widowed" | "">("");
  const [missingReligiosity, setMissingReligiosity] = useState<"secular" | "traditional" | "religious" | "orthodox" | "datlash" | "">("");
  const [shomerShabbat, setShomerShabbat] = useState<boolean | null>(null);
  const [religiosityOrigin, setReligiosityOrigin] = useState("");
  const [missingEducation, setMissingEducation] = useState<"high_school" | "vocational" | "technician" | "student" | "bachelor" | "master" | "phd" | "other" | "">("");
  const [missingOccupation, setMissingOccupation] = useState("");
  const [hasKids, setHasKids] = useState(false);
  const [numKids, setNumKids] = useState("0");
  const [wantsKids, setWantsKids] = useState("");
  const [missingAbout, setMissingAbout] = useState("");
  const [missingPhotoBase64, setMissingPhotoBase64] = useState<string>("");

  // ── Partner preferences ──
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [minHeight, setMinHeight] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [religiosityPref, setReligiosityPref] = useState<string[]>([]);
  const [acceptsKids, setAcceptsKids] = useState("");
  const [openToPartnerWithKids, setOpenToPartnerWithKids] = useState("");
  const [locationPref, setLocationPref] = useState("");
  const [partnerDescription, setPartnerDescription] = useState("");

  // ── DNA ──
  const [dnaType, setDnaType] = useState("");

  // Derived age from birthDate
  const calculatedAge = birthDate ? (() => {
    const today = new Date();
    const birth = new Date(birthDate);
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  })() : null;

  // If we have saved progress, start at quiz step instead of intro
  const [hasRestoredProgress] = useState(() => {
    if (!storageKey) return false;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.currentIndex > 0 || Object.keys(parsed.answers || {}).length > 0;
      }
    } catch {}
    return false;
  });

  // Load profile by token
  const { data: profile, isLoading: profileLoading, error: profileError } = trpc.singles.getByQuestionnaireToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // If already completed, go straight to done
  useEffect(() => {
    if (profile?.questionnaireCompletedAt) {
      setStep("done");
    }
  }, [profile]);

  // Detect skeleton record: age=0 or city empty, will need details before quiz
  const isSkeleton = profile && (!profile.age || profile.age === 0 || !profile.city);

  useEffect(() => {
    if (!token || profileError) {
      setStep("invalid");
    }
  }, [token, profileError]);

  const completeMutation = trpc.singles.completeQuestionnaire.useMutation({
    onSuccess: () => {
      try {
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("track", "CompleteRegistration", {
            content_name: "maagar_questionnaire",
            status: "completed",
          });
        }
      } catch (e) { /* Pixel not loaded - silent fail */ }
      setStep("done");
    },
    onError: (err) => {
      let friendlyMsg = "אירעה שגיאה. אנא נסה/י שוב.";
      const raw = err.message || "";
      if (raw.includes('height')) {
        friendlyMsg = "שגיאה בשדה הגובה. יש להזין גובה בסנטימטרים (לדוגמה: 170).";
      } else if (raw.includes('age')) {
        friendlyMsg = "שגיאה בשדה הגיל. יש להזין גיל תקין.";
      } else if (raw.includes('too_small') || raw.includes('too_big')) {
        friendlyMsg = "אחד מהערכים שהוזנו אינו תקין. אנא בדקי את הפרטים ונסי שוב.";
      } else if (raw.length > 0 && !raw.includes('{') && !raw.includes('[')) {
        friendlyMsg = raw;
      }
      setErrorMsg(friendlyMsg);
      setStep("error");
    },
  });

  // Save progress to localStorage whenever answers or index changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ currentIndex, answers }));
    } catch {}
  }, [currentIndex, answers, storageKey]);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-6 font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black text-[#191265] mb-2">קישור לא תקין</h2>
          <p className="text-[#727272] text-sm">הקישור שהגעת דרכו אינו תקין. אנא פנה/י להילית בוואטסאפ.</p>
          <a href="https://wa.me/972552442334" target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
            💬 וואטסאפ עם הילית
          </a>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">💛</div>
          <p className="text-[#191265] font-bold">טוענת את הפרופיל שלך...</p>
        </div>
      </div>
    );
  }

  if (!profile || step === "invalid") {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-6 font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-[#191265] mb-2">קישור לא נמצא</h2>
          <p className="text-[#727272] text-sm mb-4">הקישור פג תוקף או אינו תקין. אנא פנה/י להילית.</p>
          <a href="https://wa.me/972552442334" target="_blank" rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
            💬 וואטסאפ עם הילית
          </a>
        </div>
      </div>
    );
  }

  const isFemale = missingGender === "female";
  const effectiveDnaType = dnaType || profile.dnaType || "";
  const dnaLabel = effectiveDnaType ? DNA_LABELS[effectiveDnaType]?.[isFemale ? "f" : "m"] : null;

  // Filter questions based on profile
  const isChapter2 = missingMaritalStatus === "divorced" || missingMaritalStatus === "widowed" || profile.maritalStatus === "divorced" || profile.maritalStatus === "widowed";
  const profileAge = calculatedAge || profile.age || 0;
  const activeQuestions = MATCH_QUESTIONS.filter(q => {
    if (q.chapter2Only && !isChapter2) return false;
    if (q.forParentsOnly && !hasKids && !profile.hasKids) return false;
    if (isChapter2 && (q.id === "q_kids_future" || q.id === "q_marriage")) return false;
    if (q.conditionalAge && profileAge < q.conditionalAge) return false;
    return true;
  });

  const safeCurrentIndex = Math.min(currentIndex, activeQuestions.length - 1);
  const currentQ = activeQuestions[safeCurrentIndex];
  const progress = ((safeCurrentIndex) / activeQuestions.length) * 100;

  const handleAnswer = (myAnswer: number | number[]) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: { qId: currentQ.id, myAnswer, importance: prev[currentQ.id]?.importance ?? 1 },
    }));
  };

  const handleRankToggle = (idx: number) => {
    const currentRank = Array.isArray(currentAnswer?.myAnswer) ? (currentAnswer.myAnswer as number[]) : [];
    const pos = currentRank.indexOf(idx);
    let newRank: number[];
    if (pos >= 0) {
      newRank = currentRank.filter(i => i !== idx);
    } else if (currentRank.length < 3) {
      newRank = [...currentRank, idx];
    } else {
      newRank = [...currentRank.slice(0, 2), idx];
    }
    handleAnswer(newRank);
  };

  const handleImportance = (importance: 0 | 1 | 2) => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: { ...prev[currentQ.id], qId: currentQ.id, myAnswer: prev[currentQ.id]?.myAnswer ?? 0, importance },
    }));
  };

  const handleNext = () => {
    if (safeCurrentIndex < activeQuestions.length - 1) {
      setCurrentIndex(safeCurrentIndex + 1);
    } else {
      // Submit
      if (storageKey) {
        try { localStorage.removeItem(storageKey); } catch {}
      }
      setStep("uploading");
      const ageVal = calculatedAge || (profile.age || 0);
      completeMutation.mutate({
        token,
        answers: Object.values(answers),
        age: ageVal > 0 ? ageVal : undefined,
        gender: missingGender,
        city: missingCity || undefined,
        birthDate: birthDate || undefined,
        height: missingHeight ? (() => { const h = parseInt(missingHeight); return (h >= 50 && h < 100) ? h + 100 : h; })() : undefined,
        religiosity: missingReligiosity || undefined,
        education: missingEducation || undefined,
        occupation: missingOccupation || undefined,
        about: missingAbout || undefined,
        maritalStatus: missingMaritalStatus || undefined,
        photoBase64: missingPhotoBase64 || undefined,
        phone: phone || undefined,
        lastName: lastName || undefined,
        seekingGender: seekingGender || undefined,
        shomerShabbat: shomerShabbat !== null ? shomerShabbat : undefined,
        religiosityOrigin: religiosityOrigin === "cultural" || religiosityOrigin === "halachic" ? religiosityOrigin : undefined,
        hasKids,
        numKids: hasKids ? parseInt(numKids) || 0 : 0,
        wantsKids: wantsKids === "yes" || wantsKids === "no" || wantsKids === "open" ? wantsKids : undefined,
        minAgePreference: minAge ? parseInt(minAge) : undefined,
        maxAgePreference: maxAge ? parseInt(maxAge) : undefined,
        minHeightPreference: minHeight ? parseInt(minHeight) : undefined,
        maxHeightPreference: maxHeight ? parseInt(maxHeight) : undefined,
        religiosityPreference: religiosityPref.length > 0 ? religiosityPref.join(",") : undefined,
        acceptsKids: acceptsKids === "yes" || acceptsKids === "no" || acceptsKids === "open" ? acceptsKids as "yes" | "no" | "open" : undefined,
        openToPartnerWithKids: openToPartnerWithKids === "yes" || openToPartnerWithKids === "no" || openToPartnerWithKids === "depends_on_age" ? openToPartnerWithKids as any : undefined,
        locationPreference: locationPref === "close" || locationPref === "anywhere" ? locationPref : undefined,
        partnerDescription: partnerDescription || undefined,
        dnaType: effectiveDnaType || undefined,
      });
    }
  };

  const handleBack = () => {
    if (safeCurrentIndex > 0) setCurrentIndex(safeCurrentIndex - 1);
  };

  const currentAnswer = answers[currentQ?.id];
  const hasAnswer = currentAnswer?.myAnswer !== undefined &&
    (currentQ?.type === "rankTop3"
      ? Array.isArray(currentAnswer.myAnswer) && (currentAnswer.myAnswer as number[]).length >= 1
      : true
    );

  // Validation for details step
  const detailsValid = birthDate && missingCity && phone;

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <div className="w-20" />
        <a href="/" className="text-white/70 hover:text-[#ffe27c] transition-colors text-sm flex items-center gap-1">
          ← לדף הבית
        </a>
        <span className="text-white font-bold">הילית כספי | שאלון מדעי</span>
        <div className="w-24" />
        <div className="w-20" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {step === "intro" && (
            <motion.div key="intro" {...slideIn}>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🧬</div>
                <h1 className="text-2xl md:text-3xl font-black text-[#191265] mb-3">
                  שלום {profile.firstName}! 💛
                </h1>
                {dnaLabel && (
                  <div className="inline-block bg-[#191265] text-[#ffe27c] font-bold px-4 py-2 rounded-full text-sm mb-4">
                    הפרופיל הזוגי שלך: {dnaLabel}
                  </div>
                )}
                <p className="text-[#555] text-base leading-relaxed max-w-lg mx-auto">
                  כדי לבצע התאמות מדויקות, נצטרך ממך כמה פרטים, שאלון DNA זוגי ו-15 שאלות מדעיות שפותחו על בסיס מחקרי גוטמן, תיאוריית ההתקשרות ומודל Big Five.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h3 className="font-black text-[#191265] mb-4 text-lg">מה כולל התהליך:</h3>
                <div className="space-y-3">
                  {[
                    { icon: "📋", text: "מילוי פרטים אישיים (2-3 דקות)" },
                    { icon: "🧬", text: "שאלון DNA זוגי — גילוי הפרופיל שלך (5 דקות)" },
                    { icon: "🔬", text: "15 שאלות מדעיות להתאמה (10 דקות)" },
                    { icon: "💯", text: "אין תשובות נכונות או לא נכונות: ענה/י בכנות" },
                    { icon: "🔒", text: "הקישור אישי ולשימוש חד-פעמי בלבד" },
                  ].map(item => (
                    <div key={item.text} className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <span className="text-[#555] text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {hasRestoredProgress && (
                <div className="bg-[#ffe27c]/20 border border-[#ffe27c] rounded-xl p-4 mb-4 text-center">
                  <p className="text-[#191265] font-bold text-sm">
                    שמרנו את ההתקדמות שלך עד שאלה {currentIndex + 1} מתוך {activeQuestions.length}
                  </p>
                </div>
              )}
              <button
                onClick={() => setStep("details")}
                className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg"
              >
                {hasRestoredProgress ? `המשך משאלה ${currentIndex + 1} ←` : "בואו נתחיל! ←"}
              </button>
            </motion.div>
          )}

          {/* ── DETAILS ── */}
          {step === "details" && (
            <motion.div key="details" {...slideIn}>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📋</div>
                <h1 className="text-2xl font-black text-[#191265] mb-3">הפרטים שלך</h1>
                <p className="text-[#555] text-sm leading-relaxed">
                  כדי שנוכל להתאים לך את ההצעות הטובות ביותר
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 space-y-5">
                {/* Gender */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">מגדר *</label>
                  <div className="flex gap-3">
                    {([{ v: "male", l: "גבר" }, { v: "female", l: "אישה" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => { setMissingGender(v); setSeekingGender(v === "female" ? "male" : "female"); }}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${missingGender === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seeking Gender */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">מחפש/ת *</label>
                  <div className="flex gap-2">
                    {([{ v: "male", l: "גבר" }, { v: "female", l: "אישה" }, { v: "any", l: "לא משנה" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setSeekingGender(v)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${seekingGender === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">שם משפחה</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="שם משפחה"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all" />
                </div>

                {/* Birth Date + Height */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#191265] font-bold text-sm mb-2">תאריך לידה *</label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      min={new Date(new Date().setFullYear(new Date().getFullYear() - 80)).toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                    {calculatedAge && <p className="text-xs text-[#191265] mt-1 font-medium">גיל: {calculatedAge}</p>}
                  </div>
                  <div>
                    <label className="block text-[#191265] font-bold text-sm mb-2">גובה (ס"מ)</label>
                    <input type="number" value={missingHeight} onChange={e => setMissingHeight(e.target.value)}
                      onBlur={e => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 50 && val < 100) setMissingHeight(String(val + 100)); }}
                      min={100} max={250} placeholder="170"
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">טלפון *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all" />
                </div>

                {/* City (closed list) */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">עיר מגורים *</label>
                  <select value={missingCity} onChange={e => setMissingCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right bg-white">
                    <option value="">בחרי עיר</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">מצב משפחתי *</label>
                  <div className="flex gap-2 flex-wrap">
                    {([{ v: "single", l: "רווק/ה" }, { v: "divorced", l: "גרוש/ה" }, { v: "widowed", l: "אלמן/ה" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setMissingMaritalStatus(v)}
                        className={`flex-1 min-w-[80px] py-3 rounded-xl border-2 font-medium text-sm transition-all ${missingMaritalStatus === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Religiosity (with datlash) */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">זהות דתית *</label>
                  <div className="flex gap-2 flex-wrap">
                    {([{ v: "secular", l: "חילוני/ת" }, { v: "traditional", l: "מסורתי/ת" }, { v: "religious", l: "דתי/ה" }, { v: "orthodox", l: "חרדי/ת" }, { v: "datlash", l: "דתל\"ש" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => { setMissingReligiosity(v); setShomerShabbat(null); setReligiosityOrigin(""); }}
                        className={`flex-1 min-w-[70px] py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${missingReligiosity === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shomer Shabbat sub-question */}
                {(missingReligiosity === "traditional" || missingReligiosity === "religious" || missingReligiosity === "datlash") && (
                  <div>
                    <label className="block text-[#191265] font-bold text-sm mb-2">שומר/ת שבת?</label>
                    <div className="flex gap-3">
                      {([{ v: true, l: "כן" }, { v: false, l: "לא" }] as const).map(({ v, l }) => (
                        <button key={String(v)} type="button" onClick={() => setShomerShabbat(v)}
                          className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${shomerShabbat === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Religiosity origin (traditional only) */}
                {missingReligiosity === "traditional" && (
                  <div>
                    <label className="block text-[#191265] font-bold text-sm mb-2">איזה סוג מסורתיות?</label>
                    <div className="flex gap-3">
                      {([{ v: "cultural", l: "תרבותי (מסורת משפחתית)" }, { v: "halachic", l: "הלכתי (שומר מצוות חלקית)" }] as const).map(({ v, l }) => (
                        <button key={v} type="button" onClick={() => setReligiosityOrigin(v)}
                          className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-xs transition-all ${religiosityOrigin === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kids */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">ילדים</label>
                  <div className="flex gap-3 mb-3">
                    {([{ v: false, l: "אין לי ילדים" }, { v: true, l: "יש לי ילדים" }] as const).map(({ v, l }) => (
                      <button key={String(v)} type="button" onClick={() => setHasKids(v)}
                        className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${hasKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {hasKids && (
                    <div className="mb-3">
                      <label className="block text-[#191265] text-xs mb-1">כמה ילדים?</label>
                      <input type="number" value={numKids} onChange={e => setNumKids(e.target.value)} min={1} max={15}
                        className="w-24 px-3 py-2 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265]" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[#191265] text-xs mb-1">רוצה ילדים בעתיד?</label>
                    <div className="flex gap-2">
                      {([{ v: "yes", l: "כן" }, { v: "open", l: "פתוח/ה" }, { v: "no", l: "לא" }] as const).map(({ v, l }) => (
                        <button key={v} type="button" onClick={() => setWantsKids(v)}
                          className={`flex-1 py-2 rounded-xl border-2 font-medium text-xs transition-all ${wantsKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Education */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">השכלה</label>
                  <div className="flex gap-2 flex-wrap">
                    {([{ v: "high_school", l: "תיכון" }, { v: "vocational", l: "הכשרה מקצועית" }, { v: "technician", l: "הנדסאי" }, { v: "student", l: "סטודנט/ית" }, { v: "bachelor", l: "תואר ראשון" }, { v: "master", l: "תואר שני" }, { v: "phd", l: "דוקטורט" }, { v: "other", l: "אחר" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setMissingEducation(v)}
                        className={`min-w-[80px] py-2.5 px-3 rounded-xl border-2 font-medium text-sm transition-all ${missingEducation === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">עיסוק / תפקיד</label>
                  <input type="text" value={missingOccupation} onChange={e => setMissingOccupation(e.target.value)}
                    placeholder="למשל: מהנדסת תוכנה, מורה, עורך דין..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all" />
                </div>

                {/* About me */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">כמה מילים עליך</label>
                  <textarea value={missingAbout} onChange={e => setMissingAbout(e.target.value)} rows={3}
                    placeholder="ספר/י על עצמך בכמה משפטים — מה אוהב/ת, מה מחפש/ת..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all resize-none" />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">תמונת פרופיל</label>
                  <div className="border-2 border-dashed border-[#e9e8e8] rounded-xl p-4 text-center cursor-pointer hover:border-[#191265] transition-all"
                    onClick={() => document.getElementById("details-photo-input")?.click()}>
                    {missingPhotoBase64 ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={missingPhotoBase64} alt="תמונת פרופיל" className="w-24 h-24 rounded-full object-cover mx-auto" />
                        <p className="text-xs text-[#191265] font-medium">התמונה נטענה בהצלחה ✓</p>
                        <button type="button" onClick={e => { e.stopPropagation(); setMissingPhotoBase64(""); }} className="text-xs text-red-500 underline">הסר תמונה</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="text-3xl">📷</div>
                        <p className="text-sm text-[#727272]">לחץ/י להעלאת תמונה</p>
                        <p className="text-xs text-[#aaa]">JPG, PNG עד 5MB</p>
                      </div>
                    )}
                  </div>
                  <input id="details-photo-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { alert("התמונה גדולה מדי. אנא בחר/י תמונה עד 5MB."); return; }
                      const reader = new FileReader();
                      reader.onload = ev => setMissingPhotoBase64(ev.target?.result as string || "");
                      reader.readAsDataURL(file);
                    }} />
                </div>
              </div>

              {!detailsValid && (
                <p className="text-center text-red-500 text-xs mb-3">* יש למלא תאריך לידה, עיר מגורים וטלפון</p>
              )}
              <button
                onClick={() => setStep("partner_prefs")}
                disabled={!detailsValid}
                className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                המשך ←
              </button>
            </motion.div>
          )}

          {/* ── PARTNER PREFERENCES ── */}
          {step === "partner_prefs" && (
            <motion.div key="partner_prefs" {...slideIn}>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">💑</div>
                <h1 className="text-2xl font-black text-[#191265] mb-3">מה חשוב לך בבן/בת הזוג?</h1>
                <p className="text-[#555] text-sm leading-relaxed">
                  זה עוזר לנו לסנן ולהתאים טוב יותר
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 space-y-5">
                {/* Age range */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">טווח גילאים רצוי</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#727272]">מגיל</label>
                      <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} min={18} max={80} placeholder="25"
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265]" />
                    </div>
                    <div>
                      <label className="text-xs text-[#727272]">עד גיל</label>
                      <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} min={18} max={80} placeholder="45"
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265]" />
                    </div>
                  </div>
                </div>

                {/* Height range */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">טווח גובה רצוי (ס"מ)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#727272]">מ-</label>
                      <input type="number" value={minHeight} onChange={e => setMinHeight(e.target.value)} min={140} max={220} placeholder="160"
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265]" />
                    </div>
                    <div>
                      <label className="text-xs text-[#727272]">עד</label>
                      <input type="number" value={maxHeight} onChange={e => setMaxHeight(e.target.value)} min={140} max={220} placeholder="185"
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265]" />
                    </div>
                  </div>
                </div>

                {/* Religiosity preference (multi-select) */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">דתיות רצויה (אפשר לבחור כמה)</label>
                  <div className="flex gap-2 flex-wrap">
                    {([{ v: "secular", l: "חילוני/ת" }, { v: "traditional", l: "מסורתי/ת" }, { v: "religious", l: "דתי/ה" }, { v: "orthodox", l: "חרדי/ת" }, { v: "datlash", l: "דתל\"ש" }] as const).map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => setReligiosityPref(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                        className={`min-w-[70px] py-2 px-3 rounded-xl border-2 font-medium text-xs transition-all ${religiosityPref.includes(v) ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Open to partner with kids */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">פתוח/ה לבן/בת זוג עם ילדים?</label>
                  <div className="flex gap-2">
                    {([{ v: "yes", l: "כן" }, { v: "depends_on_age", l: "תלוי בגיל" }, { v: "no", l: "לא" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setOpenToPartnerWithKids(v)}
                        className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${openToPartnerWithKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location preference */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">מיקום בן/בת הזוג</label>
                  <div className="flex gap-3">
                    {([{ v: "close", l: "קרוב אליי" }, { v: "anywhere", l: "לא משנה" }] as const).map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setLocationPref(v)}
                        className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${locationPref === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partner description */}
                <div>
                  <label className="block text-[#191265] font-bold text-sm mb-2">תאר/י את בן/בת הזוג האידיאלי</label>
                  <textarea value={partnerDescription} onChange={e => setPartnerDescription(e.target.value)} rows={3}
                    placeholder="מה חשוב לך? מה אתה/את מחפש/ת?"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] text-right focus:outline-none focus:border-[#191265] transition-all resize-none" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("details")}
                  className="flex-1 border-2 border-[#191265] text-[#191265] font-bold py-3.5 rounded-2xl hover:bg-[#191265] hover:text-white transition-all">
                  ← חזרה
                </button>
                <button onClick={() => setStep(effectiveDnaType ? "quiz" : "dna")}
                  className="flex-1 bg-[#ffe27c] text-[#191265] font-black text-lg py-3.5 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg">
                  המשך ←
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DNA QUIZ ── */}
          {step === "dna" && (
            <motion.div key="dna" {...slideIn}>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🧬</div>
                <h1 className="text-2xl font-black text-[#191265] mb-3">שאלון DNA זוגי</h1>
                <p className="text-[#555] text-sm leading-relaxed">
                  20 שאלות קצרות שיעזרו לנו לזהות את הפרופיל הזוגי שלך
                </p>
              </div>
              <EmbeddedDnaQuiz
                initialGender={missingGender}
                onComplete={(type, _gender, _sessionId) => {
                  setDnaType(type);
                  setStep("quiz");
                }}
              />
            </motion.div>
          )}

          {/* ── QUIZ ── */}
          {step === "quiz" && currentQ && (
            <motion.div key={`q-${currentIndex}`} {...slideIn}>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-[#727272] mb-2">
                  <span>שאלה {currentIndex + 1} מתוך {activeQuestions.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-[#e9e8e8] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#191265] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Category badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{currentQ.categoryIcon}</span>
                <span className="text-xs font-medium text-[#1800ad] bg-[#1800ad]/10 px-3 py-1 rounded-full">
                  {currentQ.categoryLabel}
                </span>
              </div>

              {/* Question */}
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                <h2 className="text-lg md:text-xl font-black text-[#191265] mb-2 leading-tight">
                  {isFemale ? currentQ.text_f : currentQ.text_m}
                </h2>
                <p className="text-[#727272] text-xs leading-relaxed mb-5 bg-[#f0eadc] rounded-xl p-3">
                  💡 {currentQ.explanation}
                </p>

                {/* Answer options */}
                {currentQ.type === "rankTop3" ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#727272] mb-2">בחר/י עד 3, לפי סדר עדיפות (הראשון שתבחר/י = הכי חשוב)</p>
                    {currentQ.options.map((opt, idx) => {
                      const rank = Array.isArray(currentAnswer?.myAnswer) ? (currentAnswer.myAnswer as number[]) : [];
                      const pos = rank.indexOf(idx);
                      const isSelected = pos >= 0;
                      return (
                        <button key={idx} onClick={() => handleRankToggle(idx)}
                          className={`w-full text-right px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 flex items-center justify-between
                            ${isSelected ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] bg-white text-[#191265] hover:border-[#191265]/40"}`}>
                          <span>{opt}</span>
                          {isSelected && (
                            <span className="text-xs font-black bg-[#ffe27c] text-[#191265] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-2">
                              {pos + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {Array.isArray(currentAnswer?.myAnswer) && (currentAnswer.myAnswer as number[]).length > 0 && (
                      <p className="text-xs text-[#1800ad] font-medium">
                        {(currentAnswer.myAnswer as number[]).length === 3
                          ? "✅ בחרת 3 שפות, מעולה!"
                          : `בחרת/י ${(currentAnswer.myAnswer as number[]).length}/3`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, idx) => (
                      <button key={idx} onClick={() => handleAnswer(idx)}
                        className={`w-full text-right px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200
                          ${currentAnswer?.myAnswer === idx ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] bg-white text-[#191265] hover:border-[#191265]/40"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Importance */}
              {hasAnswer && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                  <p className="text-sm font-bold text-[#191265] mb-3">
                    כמה חשוב לך שהשותף/ה יענה אותו דבר?
                  </p>
                  <div className="flex gap-2">
                    {([0, 1, 2] as const).map(imp => (
                      <button key={imp} onClick={() => handleImportance(imp)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                          ${currentAnswer?.importance === imp ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#555] hover:border-[#191265]/40"}`}>
                        {IMPORTANCE_LABELS[imp]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                {currentIndex > 0 && (
                  <button onClick={handleBack}
                    className="flex-1 border-2 border-[#191265] text-[#191265] font-bold py-3.5 rounded-2xl hover:bg-[#191265] hover:text-white transition-all">
                    ← חזרה
                  </button>
                )}
                <button onClick={handleNext} disabled={!hasAnswer}
                  className={`flex-1 font-black text-lg py-3.5 rounded-2xl transition-all duration-300
                    ${hasAnswer ? "bg-[#191265] text-white hover:bg-[#1800ad] hover:scale-[1.02] shadow-lg" : "bg-[#e9e8e8] text-[#727272] cursor-not-allowed"}`}>
                  {currentIndex < activeQuestions.length - 1 ? "הבא ←" : "סיום ←"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── UPLOADING ── */}
          {step === "uploading" && (
            <motion.div key="uploading" {...slideIn} className="text-center py-20">
              <div className="text-6xl mb-6 animate-bounce">💛</div>
              <h2 className="text-2xl font-black text-[#191265] mb-4">שומרת את התשובות...</h2>
              <p className="text-[#727272]">מחשבת התאמות ראשוניות</p>
              <div className="mt-8 flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-3 h-3 rounded-full bg-[#191265]" />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <motion.div key="done" {...slideIn} className="flex flex-col items-center text-center py-10 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-[#191265] flex items-center justify-center mb-6 shadow-xl">
                <span className="text-4xl text-[#ffe27c]">✓</span>
              </div>

              <h2 className="text-3xl font-black text-[#191265] mb-2 leading-tight">
                ברוכ{isFemale ? "ה" : ""} הבא{isFemale ? "ה" : ""} למאגר!
              </h2>
              <p className="text-[#727272] text-base leading-relaxed mb-2">
                הפרופיל שלך פעיל במאגר הרווקים של הילית.
              </p>
              <p className="text-[#191265] font-bold text-sm mb-8">
                ממוצע זמן המתנה: 7–14 ימים
              </p>

              <div className="w-full bg-white rounded-3xl p-6 shadow-md mb-5 text-right">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg"
                    alt="הילית כספי"
                    className="w-14 h-14 rounded-full object-cover object-[center_20%] shadow flex-shrink-0"
                  />
                  <div>
                    <p className="font-black text-[#191265] text-sm">הילית כספי</p>
                    <p className="text-[#1800ad] text-xs">Relationship Expert & Matchmaker</p>
                  </div>
                </div>
                <p className="text-[#191265]/80 leading-relaxed text-sm">
                  שמחתי לקבל אותך! אני אעבור על הפרופיל שלך אישית ואיצור איתך קשר ברגע שתהיה התאמה מתאימה. בינתיים, הצטרפ{isFemale ? "י" : ""} לקבוצת הוואטסאפ שלי לטיפים יומיומיים. 💛
                </p>
              </div>

              <a href="https://hilitcaspi.com/api/wa/site" target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-bold py-4 rounded-2xl transition-all duration-300 text-base mb-3">
                💬 הצטרפ{isFemale ? "י" : ""} לקבוצת הוואטסאפ
              </a>

              <button
                onClick={() => navigate(`/my-profile?email=${encodeURIComponent(profile?.email || '')}&token=${token}`)}
                className="w-full bg-[#191265] text-white font-bold py-4 rounded-2xl text-base hover:bg-[#1800ad] transition-colors mb-4">
                👤 לאזור האישי שלי
              </button>

              <button onClick={() => navigate("/")}
                className="text-[#727272] text-sm hover:text-[#191265] transition-colors underline underline-offset-4">
                חזרה לדף הבית
              </button>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <motion.div key="error" {...slideIn} className="text-center py-16">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-black text-red-600 mb-3">אירעה שגיאה</h2>
              <p className="text-[#727272] text-sm mb-6">{errorMsg}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => { setStep("quiz"); setCurrentIndex(activeQuestions.length - 1); }}
                  className="bg-[#191265] text-white font-bold py-3 rounded-2xl">
                  נסה/י שוב
                </button>
                <a href="https://wa.me/972552442334" target="_blank" rel="noopener noreferrer"
                  className="border-2 border-[#191265] text-[#191265] font-bold py-3 rounded-2xl text-center">
                  💬 וואטסאפ עם הילית
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
