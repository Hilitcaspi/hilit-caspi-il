/**
 * Register - Full profile form for joining the matchmaking database
 * Route: /join?dna=leader&gender=female&session=xxx
 * Flow: Profile form → Payment placeholder (₪149) → Confirmation
 */
import { useState, useRef, useEffect } from "react";
import React from "react";
import { track } from "@/lib/track";
import { trackInitiateCheckout, trackCompleteRegistration } from "@/lib/metaPixel";
import { gaBeginCheckout, gaSignUp } from "@/lib/ga";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { MATCH_QUESTIONS, IMPORTANCE_LABELS, CHAPTER2_QUESTION_IDS, PARENTS_ONLY_QUESTION_IDS, type MatchAnswer } from "@/lib/matchmakingQuestions";
import EmbeddedDnaQuiz from "@/components/EmbeddedDnaQuiz";
import GrowWallet from "@/components/GrowWallet";

type Step = "profile" | "dna_select" | "compatibility_quiz" | "free_token_verify" | "payment" | "uploading" | "uploading_error" | "done";

const DNA_LABELS: Record<string, string> = {
  leader:      "המנהיגה הממגנטת / המנהיג הממגנט",
  romantic:    "הרומנטיקנית העמוקה / הרומנטיקן העמוק",
  free_spirit: "הרוח החופשית",
  anchor:      "העוגן היציב",
};

const CITIES = [
  // מרכז וגוש דן
  "תל אביב", "יפו", "רמת גן", "גבעתיים", "בני ברק",
  "בת ים", "חולון", "אור יהודה", "אזור", "בני עיש",
  "גבעת שמואל", "רמת השרון", "קריית אונו",
  // שפלה
  "ראשון לציון", "פתח תקווה", "רחובות", "הרצליה", "רעננה",
  "כפר סבא", "הוד השרון", "ראש העין", "לוד", "רמלה",
  "נס ציונה", "יבנה", "גן יבנה", "נתניה", "שוהם", "הדרום", "חריש",
  "חדרה", "פרדס חנה", "בנימינה", "זכרון יעקב", "קיסריה", "עמק חפר",
  // ירושלים והר יהודה
  "ירושלים", "מודיעין", "מודיעין מכבים רעות", "בית שמש",
  "ביתר", "מעלה אדומים", "מעלה החמישה", "קריית מלאכי", "אלעד מנשה",
  // חיפה וקריות
  "חיפה", "קריית אתא", "קריית ביאליק", "קריית ים", "קריית מוצקין",
  "נשר", "טירת הכרמל", "זיכרון יעקב", "באקה אלגרבייה", "אום אלפחם",
  // צפון
  "עכו", "נהריה", "קריית שמונה", "צפת", "טבריה",
  "מגדל", "יקנעם", "אופק", "בית שאן", "ראש פינה",
  "קריית ימק",
  // דרום
  "אשדוד", "אשקלון", "באר שבע", "אילת", "עפולה",
  "קריית גת", "דימונה", "נתיבות", "שדרות", "אופקים",
  "רהט", "לקיה", "ערד", "מיתר ביקע",
  // עמקים
  "העמק הגדול", "מגדל העמק",
  // יהודה ושומרון
  "אריאל", "מאלה אדומים", "עפרה", "ביתאל",
  "אלקנה",
].sort((a, b) => a.localeCompare(b, 'he'));

const slideIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.4 },
};

function useCountdown(hours = 48) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem('database_countdown');
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem('database_countdown', String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem('database_countdown');
        if (stored) {
          const diff = parseInt(stored) - Date.now();
          return diff > 0 ? diff : 0;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return { h, m, s };
}

export default function Register() {
  React.useEffect(() => { track({ eventType: "database_cta" }); }, []);
  const countdown = useCountdown(48);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  // Capture UTM params from URL and persist in BOTH sessionStorage AND localStorage
  // localStorage survives cross-domain redirects (Grow payment page → back to site)
  const utmKeysToCapture = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  utmKeysToCapture.forEach(key => {
    const val = params.get(key);
    if (val) {
      sessionStorage.setItem(key, val);
      localStorage.setItem(key, val);
      localStorage.setItem("utm_captured_at", String(Date.now()));
    }
  });
  // Read DNA from URL params, fall back to localStorage (saved when visiting /database-sales from DnaQuiz)
  const freeTokenFromUrl = params.get("free_token") || "";
  const [dnaFromQuiz, setDnaFromQuiz] = useState<string | null>(
    params.get("dna") || localStorage.getItem("dna_type")
  );
  const [genderFromQuiz, setGenderFromQuiz] = useState<"female" | "male" | null>(
    (params.get("gender") || localStorage.getItem("dna_gender")) as "female" | "male" | null
  );
  const [sessionId, setSessionId] = useState(
    params.get("session") || localStorage.getItem("dna_session") || ""
  );

  // Listen for DNA result from DnaQuiz opened in a new tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "DNA_RESULT") {
        const { dnaType, gender: g, sessionId: sid } = event.data;
        if (dnaType) setDnaFromQuiz(dnaType);
        if (g) setGenderFromQuiz(g as "female" | "male");
        if (sid) setSessionId(sid);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const [step, setStep] = useState<Step>("profile");

  // Scroll to top on every step change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step]);
  const [freeTokenEmail, setFreeTokenEmail] = useState("");
  const [freeTokenError, setFreeTokenError] = useState("");
  const [freeTokenVerified, setFreeTokenVerified] = useState(false);
  const [freeTokenStatus, setFreeTokenStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const redeemToken = trpc.freeToken.redeem.useMutation();

  // Auto-validate free token on mount and pre-fill email
  const validateFreeToken = trpc.freeToken.validate.useQuery(
    { token: freeTokenFromUrl },
    {
      enabled: !!freeTokenFromUrl,
      retry: false,
      staleTime: Infinity,
    }
  );

  useEffect(() => {
    if (!freeTokenFromUrl) return;
    if (validateFreeToken.isLoading) { setFreeTokenStatus("loading"); return; }
    if (validateFreeToken.data?.valid && validateFreeToken.data.email) {
      setFreeTokenEmail(validateFreeToken.data.email);
      // Auto-fill email in the profile form so the user sees it
      setEmail(validateFreeToken.data.email);
      setFreeTokenStatus("valid");
    } else if (validateFreeToken.data && !validateFreeToken.data.valid) {
      const msgs: Record<string, string> = {
        not_found: "הקישור לא תקין",
        already_used: "קישור זה כבר נוצל",
        expired: "הקישור פג תוקף (תקף 7 ימים)",
      };
      setFreeTokenError(msgs[(validateFreeToken.data as any).reason] || "קישור לא תקין");
      setFreeTokenStatus("invalid");
    }
  }, [validateFreeToken.isLoading, validateFreeToken.data, freeTokenFromUrl]);
  const [singleId, setSingleId] = useState<number | null>(null);

  // Pre-filled from DNA quiz URL params (name, email, phone)
  const nameFromDna = params.get("name") || "";
  const emailFromDna = params.get("email") || "";
  const phoneFromDna = params.get("phone") || "";
  // If name from DNA has a space, split into first/last
  const firstNameFromDna = nameFromDna.includes(" ") ? nameFromDna.split(" ")[0] : nameFromDna;
  const lastNameFromDna = nameFromDna.includes(" ") ? nameFromDna.split(" ").slice(1).join(" ") : "";
  const fromDna = !!(nameFromDna || emailFromDna); // true = came from DNA quiz with pre-filled data

  // Profile form state
  const [firstName, setFirstName] = useState(firstNameFromDna);
  const [lastName, setLastName] = useState(lastNameFromDna);
  const [gender, setGender] = useState<"female" | "male">(genderFromQuiz || "female");
  // seekingGender: who they are looking for (supports same-sex)
  const [seekingGender, setSeekingGender] = useState<"female" | "male" | "any">(genderFromQuiz === "female" ? "male" : genderFromQuiz === "male" ? "female" : "male");
  const [age, setAge] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState(phoneFromDna);
  const [email, setEmail] = useState(emailFromDna);
  const [city, setCity] = useState("");
  const [height, setHeight] = useState("");
  const [education, setEducation] = useState("");
  const [religiosity, setReligiosity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasKids, setHasKids] = useState(false);
  const [numKids, setNumKids] = useState("0");
  const [wantsKids, setWantsKids] = useState("");
  const [about, setAbout] = useState("");
  const [partnerDescription, setPartnerDescription] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [minHeight, setMinHeight] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [religiosityPref, setReligiosityPref] = useState<string[]>([]);
  const [acceptsKids, setAcceptsKids] = useState("");
  const [openToPartnerWithKids, setOpenToPartnerWithKids] = useState("");
  const [locationPref, setLocationPref] = useState("");
  const [interests, setInterests] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Mini DNA quiz toggle (shown inside dna_select step)
  const [showMiniQuiz, setShowMiniQuiz] = useState(false);

  // Compatibility quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, MatchAnswer>>({});
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);

  const [registerError, setRegisterError] = useState("");
  const registerMutation = trpc.singles.register.useMutation({
    onSuccess: (data) => {
      setSingleId(data.singleId);
      setRegisterError("");
      // Clear DNA localStorage after successful registration
      localStorage.removeItem("dna_type");
      localStorage.removeItem("dna_gender");
      localStorage.removeItem("dna_session");
      setStep("done");
    },
    onError: (err) => {
      setRegisterError(err.message || "אירעה שגיאה בשמירת הפרופיל. אנא נסי שוב.");
      setStep("uploading_error");
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleReligiosityPref = (val: string) => {
    setReligiosityPref(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If DNA already known (came from quiz), skip DNA step entirely
    if (dnaFromQuiz) {
      trackInitiateCheckout({ value: 249, currency: "ILS", content_name: "מאגר רווקים" });
      gaBeginCheckout("database");
      setStep("payment");
    } else {
      // Go directly to the embedded DNA quiz (no manual selection screen)
      setStep("dna_select");
      setShowMiniQuiz(true);
    }
  };

  const handleQuizAnswer = (qId: string, myAnswer: number | number[]) => {
    setQuizAnswers(prev => ({
      ...prev,
      [qId]: { qId, myAnswer, importance: prev[qId]?.importance ?? 1 },
    }));
  };

  // For rankTop3: toggle an option in/out of the ranked list
  const handleQuizRankToggle = (qId: string, idx: number) => {
    const currentRank = Array.isArray(quizAnswers[qId]?.myAnswer) ? (quizAnswers[qId].myAnswer as number[]) : [];
    const pos = currentRank.indexOf(idx);
    let newRank: number[];
    if (pos >= 0) {
      newRank = currentRank.filter(i => i !== idx);
    } else if (currentRank.length < 3) {
      newRank = [...currentRank, idx];
    } else {
      newRank = [...currentRank.slice(0, 2), idx];
    }
    handleQuizAnswer(qId, newRank);
  };

  const handleQuizImportance = (qId: string, importance: 0 | 1 | 2) => {
    setQuizAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], qId, myAnswer: prev[qId]?.myAnswer ?? 0, importance },
    }));
  };

  const handleQuizNext = () => {
    if (currentQuizIndex < activeQuestions.length - 1) {
      setCurrentQuizIndex(i => i + 1);
    } else {
      if (freeTokenFromUrl) {
        if (freeTokenStatus === "valid" && freeTokenEmail) {
          // Token already validated: skip the email-entry screen and register directly
          handleFreeTokenAutoRegister();
        } else {
          // Token not yet validated or invalid: show the verify screen as fallback
          setStep("free_token_verify");
        }
      } else {
        // Paid path: questionnaire is done via email link
        setStep("done");
      }
    }
  };

  // Auto-register when free token is already validated (no manual email entry needed)
  const handleFreeTokenAutoRegister = async () => {
    setFreeTokenError("");
    try {
      await redeemToken.mutateAsync({ token: freeTokenFromUrl, email: freeTokenEmail });
      setFreeTokenVerified(true);
      setIsFreeTokenPath(true);
      setStep("uploading");
      let photoBase64: string | undefined;
      let photoMime: string | undefined;
      if (photoFile && photoPreview) {
        photoBase64 = photoPreview;
        photoMime = photoFile.type;
      }
        registerBasicMutation.mutate({
        firstName, lastName: lastName || undefined, gender, seekingGender, age: parseInt(age), birthDate: birthDate || undefined, phone, email: freeTokenEmail,
        city, height: height ? parseInt(height) : undefined, education: (education as any) || undefined,
        religiosity: (religiosity as any) || undefined, occupation: occupation || undefined,
        maritalStatus: (maritalStatus as any) || undefined, hasKids, numKids: numKids ? parseInt(numKids) : 0,
        wantsKids: (wantsKids as any) || undefined, about: about || undefined,
        partnerDescription: partnerDescription || undefined, dnaType: (dnaFromQuiz as any) || undefined,
        dnaSessionId: sessionId || undefined, minAgePreference: minAge ? parseInt(minAge) : undefined,
        maxAgePreference: maxAge ? parseInt(maxAge) : undefined,
        religiosityPreference: religiosityPref.join(",") || undefined, acceptsKids: (acceptsKids as any) || undefined,
        openToPartnerWithKids: (openToPartnerWithKids as any) || undefined,
        locationPreference: (locationPref as any) || undefined, interests: interests || undefined,
        photoBase64, photoMime, origin: window.location.origin,
        freeToken: freeTokenFromUrl || undefined,
        utmSource: sessionStorage.getItem("utm_source") || localStorage.getItem("utm_source") || undefined,
        utmMedium: sessionStorage.getItem("utm_medium") || localStorage.getItem("utm_medium") || undefined,
        utmCampaign: sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined,
        utmContent: sessionStorage.getItem("utm_content") || localStorage.getItem("utm_content") || undefined,
      });
    } catch (err: any) {
      setFreeTokenError(err?.message || "שגיאה - אנא נסה שוב");
      setStep("free_token_verify");
    }
  };

  const handleQuizBack = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(i => i - 1);
    } else {
      setStep("profile");
    }
  };

  const handleFreeTokenVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreeTokenError("");
    try {
      await redeemToken.mutateAsync({ token: freeTokenFromUrl, email: freeTokenEmail });
      setFreeTokenVerified(true);
      setIsFreeTokenPath(true);
      setStep("uploading");
      // Bug #2 fix: Use registerBasicProfile (sends questionnaire email) not register (which bypasses questionnaire)
      let photoBase64: string | undefined;
      let photoMime: string | undefined;
      if (photoFile && photoPreview) {
        photoBase64 = photoPreview;
        photoMime = photoFile.type;
      }
      registerBasicMutation.mutate({
        firstName, lastName: lastName || undefined, gender, seekingGender, age: parseInt(age), birthDate: birthDate || undefined, phone, email: freeTokenEmail,
        city, height: height ? parseInt(height) : undefined, education: (education as any) || undefined,
        religiosity: (religiosity as any) || undefined, occupation: occupation || undefined,
        maritalStatus: (maritalStatus as any) || undefined, hasKids, numKids: numKids ? parseInt(numKids) : 0,
        wantsKids: (wantsKids as any) || undefined, about: about || undefined,
        partnerDescription: partnerDescription || undefined, dnaType: (dnaFromQuiz as any) || undefined,
        dnaSessionId: sessionId || undefined, minAgePreference: minAge ? parseInt(minAge) : undefined,
        maxAgePreference: maxAge ? parseInt(maxAge) : undefined, minHeightPreference: minHeight ? parseInt(minHeight) : undefined,
        maxHeightPreference: maxHeight ? parseInt(maxHeight) : undefined,
        religiosityPreference: religiosityPref.join(",") || undefined, acceptsKids: (acceptsKids as any) || undefined,
        openToPartnerWithKids: (openToPartnerWithKids as any) || undefined,
        locationPreference: (locationPref as any) || undefined, interests: interests || undefined,
        photoBase64, photoMime, origin: window.location.origin,
        freeToken: freeTokenFromUrl || undefined,
        utmSource: sessionStorage.getItem("utm_source") || localStorage.getItem("utm_source") || undefined,
        utmMedium: sessionStorage.getItem("utm_medium") || localStorage.getItem("utm_medium") || undefined,
        utmCampaign: sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined,
        utmContent: sessionStorage.getItem("utm_content") || localStorage.getItem("utm_content") || undefined,
      });
    } catch (err: any) {
      setFreeTokenError(err?.message || "שגיאה - אנא בדקי/י את המייל");
    }
  };

  const [growOpened, setGrowOpened] = useState(false);
  const [questionnaireToken, setQuestionnaireToken] = useState<string>("");
  const [isFreeTokenPath, setIsFreeTokenPath] = useState(false);

  // Coupon / invite code state (manual entry on payment page)
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponValid, setCouponValid] = useState(false);
  const [couponBoundEmail, setCouponBoundEmail] = useState<string | null>(null);

  const validateInviteMutation = trpc.invites.validateMutation.useMutation();
  const redeemInviteMutation = trpc.invites.redeem.useMutation();

  const handleCouponApply = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const data = await validateInviteMutation.mutateAsync({ token: couponCode.trim(), email: email || undefined });
      if (data?.valid) {
        setCouponValid(true);
        setCouponBoundEmail(data.boundEmail || null);
      } else {
        const msgs: Record<string, string> = {
          not_found: "קוד לא נמצא",
          already_used: "קוד זה כבר נוצל",
          expired: "הקוד פג תוקף",
          email_mismatch: "הקוד מיועד לאימייל אחר",
        };
        setCouponError(msgs[(data as any)?.reason] || "קוד לא תקין");
      }
    } catch {
      setCouponError("שגיאה בבדיקת הקוד");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCouponRegister = async () => {
    setPaymentLoading(true);
    try {
      const emailToUse = couponBoundEmail || email;
      const data = await registerBasicMutation.mutateAsync({
        firstName, lastName: lastName || undefined, gender, seekingGender, age: parseInt(age), birthDate: birthDate || undefined, phone, email: emailToUse,
        city, height: height ? parseInt(height) : undefined, education: (education as any) || undefined,
        religiosity: (religiosity as any) || undefined, occupation: occupation || undefined,
        maritalStatus: (maritalStatus as any) || undefined, hasKids, numKids: numKids ? parseInt(numKids) : 0,
        wantsKids: (wantsKids as any) || undefined, about: about || undefined,
        partnerDescription: partnerDescription || undefined, dnaType: (dnaFromQuiz as any) || undefined,
        dnaSessionId: sessionId || undefined, minAgePreference: minAge ? parseInt(minAge) : undefined,
        maxAgePreference: maxAge ? parseInt(maxAge) : undefined,
        religiosityPreference: religiosityPref.join(",") || undefined, acceptsKids: (acceptsKids as any) || undefined,
        openToPartnerWithKids: (openToPartnerWithKids as any) || undefined,
        locationPreference: (locationPref as any) || undefined, interests: interests || undefined,
        photoBase64: photoPreview || undefined, photoMime: photoFile?.type || undefined,
        origin: window.location.origin,
        freeToken: couponCode.trim() || undefined, // invite token → marks isPaid=true
        utmSource: sessionStorage.getItem("utm_source") || localStorage.getItem("utm_source") || undefined,
        utmMedium: sessionStorage.getItem("utm_medium") || localStorage.getItem("utm_medium") || undefined,
        utmCampaign: sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined,
        utmContent: sessionStorage.getItem("utm_content") || localStorage.getItem("utm_content") || undefined,
      });
      // Redeem the invite token
      if (data && (data as any).singleId) {
        await redeemInviteMutation.mutateAsync({ token: couponCode.trim(), email: emailToUse, singleId: (data as any).singleId });
      }
      trackCompleteRegistration({ content_name: "מאגר רווקים - קופון" });
      gaSignUp("database");
      setGrowOpened(true); // show thank-you screen
    } catch (err) {
      console.error("[Coupon] Registration failed:", err);
      setCouponError("שגיאה ברישום. אנא נסה שוב.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const sendJoinEmailMutation = trpc.leads.submitPaidDatabase.useMutation();
  const registerBasicMutation = trpc.singles.registerBasicProfile.useMutation({
    onSuccess: (data) => {
      track({ eventType: "form_submit", page: "/join", metadata: { form: "register_database" } });
      if (data?.questionnaireToken) setQuestionnaireToken(data.questionnaireToken);
      if (isFreeTokenPath) {
        // Free token path: go to done screen with questionnaire link
        localStorage.removeItem("dna_type");
        localStorage.removeItem("dna_gender");
        localStorage.removeItem("dna_session");
        setStep("done");
      } else {
        setGrowOpened(true);
      }
    },
    onError: (err) => {
      console.error("[Payment] Failed to save basic profile:", err);
      // Still open Grow and show confirmation even if save failed
      setGrowOpened(true);
    },
  });

  const buildRegisterPayload = () => ({
    firstName, lastName: lastName || undefined, gender, seekingGender, age: parseInt(age), birthDate: birthDate || undefined, phone, email,
    city, height: height ? parseInt(height) : undefined, education: (education as any) || undefined,
    religiosity: (religiosity as any) || undefined, occupation: occupation || undefined,
    maritalStatus: (maritalStatus as any) || undefined, hasKids, numKids: numKids ? parseInt(numKids) : 0,
    wantsKids: (wantsKids as any) || undefined, about: about || undefined,
    partnerDescription: partnerDescription || undefined, dnaType: (dnaFromQuiz as any) || undefined,
    dnaSessionId: sessionId || undefined, minAgePreference: minAge ? parseInt(minAge) : undefined,
    maxAgePreference: maxAge ? parseInt(maxAge) : undefined,
    religiosityPreference: religiosityPref.join(",") || undefined, acceptsKids: (acceptsKids as any) || undefined,
    openToPartnerWithKids: (openToPartnerWithKids as any) || undefined,
    locationPreference: (locationPref as any) || undefined, interests: interests || undefined,
    photoBase64: photoPreview || undefined, photoMime: photoFile?.type || undefined,
    origin: window.location.origin,
    utmSource: sessionStorage.getItem("utm_source") || localStorage.getItem("utm_source") || undefined,
    utmMedium: sessionStorage.getItem("utm_medium") || localStorage.getItem("utm_medium") || undefined,
    utmCampaign: sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined,
    utmContent: sessionStorage.getItem("utm_content") || localStorage.getItem("utm_content") || undefined,
  });

  const handlePaymentSuccess = async () => {
    // Fire Meta Pixel
    trackCompleteRegistration({ content_name: "מאגר רווקים" });
    gaSignUp("database");
    // Save profile in background (non-blocking)
    const payload = buildRegisterPayload();
    registerBasicMutation.mutateAsync(payload).catch(err => {
      console.error("[Payment] Failed to save profile (non-blocking):", err);
      setGrowOpened(true);
    });
  };

  const quizAnswersJson = JSON.stringify(Object.values(quizAnswers));

  const isFemale = gender === "female";
  const isChapter2 = maritalStatus === "divorced" || maritalStatus === "widowed";

  // Filter questions based on marital status, kids, and age
  const profileAgeNum = age ? parseInt(age) : 0;
  const activeQuestions = MATCH_QUESTIONS.filter(q => {
    if (q.chapter2Only && !isChapter2) return false;
    if (q.forParentsOnly && !hasKids) return false;
    // Hide kids/marriage questions for chapter 2 people (already have kids/married)
    if (isChapter2 && (q.id === "q_kids_future" || q.id === "q_marriage")) return false;
    // Age-conditional questions
    if (q.conditionalAge && profileAgeNum < q.conditionalAge) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <a href="/" className="text-white/70 hover:text-[#ffe27c] transition-colors text-sm flex items-center gap-1">
          ← לדף הבית
        </a>
        <span className="text-white font-bold">הילית כספי | הצטרפות למאגר</span>
        <div className="w-24" />
      </div>

      {/* Progress */}
        <div className="bg-white border-b border-[#e9e8e8] px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-xs">
          {[
            { id: "profile", label: "פרופיל" },
            { id: "dna_select", label: "DNA" },
            { id: "payment", label: "תשלום" },
            { id: "done", label: "אישור" },
          ].map((s, i, arr) => {
            const isDone =
              (i === 0 && ["dna_select", "payment", "uploading", "compatibility_quiz", "done"].includes(step)) ||
              (i === 1 && ["payment", "uploading", "compatibility_quiz", "done"].includes(step)) ||
              (i === 2 && ["uploading", "compatibility_quiz", "done"].includes(step)) ||
              (i === 3 && ["done"].includes(step));
            const isActive = step === s.id || (step === "free_token_verify" && s.id === "payment") || (step === "uploading" && s.id === "payment");
            return (
              <div key={s.id} className="flex items-center gap-1.5 flex-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isActive ? "bg-[#191265] text-white" : isDone ? "bg-green-600 text-white" : "bg-[#e9e8e8] text-[#727272]"}`}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span className={`hidden sm:inline ${isActive ? "text-[#191265] font-bold" : "text-[#727272]"}`}>{s.label}</span>
                {i < arr.length - 1 && <div className="flex-1 h-px bg-[#e9e8e8]" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">

          {/* ── PROFILE FORM ── */}
          {step === "profile" && (
            <motion.div key="profile" {...slideIn}>
              {/* Database intro (shown when coming from /database) */}
              {params.get("source") === "database" && (
                <div className="bg-[#191265] rounded-2xl p-6 mb-6 text-right">
                  <h2 className="text-[#ffe27c] font-black text-xl mb-3">💎 מאגר הרווקים של הילית כספי</h2>
                  <p className="text-white/80 text-sm leading-relaxed mb-4">
                    המאגר שלי שונה מכל אפליקציה אחרת. ההתאמות מבוססות על חישובים מתקדמים ומודלים מדעיים, ולאחר מכן אני עוברת על כל הצעה אישית ומאשרת אותה בעצמי.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { n: "2,400+", l: "רווקים במאגר" },
                      { n: "500+", l: "סיפורי הצלחה" },
                      { n: "7-14", l: "ימים להתאמה ראשונה" },
                    ].map(({ n, l }) => (
                      <div key={l} className="bg-white/10 rounded-xl p-3 text-center">
                        <div className="text-[#ffe27c] font-black text-xl">{n}</div>
                        <div className="text-white/60 text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#ffe27c]/10 border border-[#ffe27c]/30 rounded-xl p-3">
                    <p className="text-[#ffe27c] text-xs font-bold mb-1">הפלואו:</p>
                    <p className="text-white/70 text-xs">מלא/י פרטים ושאלון DNA → תשלום ₪249 → מייל עם קישור לשאלון המדעי → אישור כניסה למאגר</p>
                  </div>
                </div>
              )}
              {/* Free token status banner */}
              {freeTokenFromUrl && freeTokenStatus === "loading" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-right">
                  <p className="text-blue-700 text-sm font-medium">מאמת קישור כניסה חינמית...</p>
                </div>
              )}
              {freeTokenFromUrl && freeTokenStatus === "valid" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-right">
                  <p className="text-green-700 font-bold text-sm mb-1">✓ כניסה חינמית למאגר אושרה!</p>
                  <p className="text-green-600 text-xs">מלאי את הפרטים ותצטרפי למאגר ללא תשלום.</p>
                </div>
              )}
              {freeTokenFromUrl && freeTokenStatus === "invalid" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-right">
                  <p className="text-red-700 font-bold text-sm mb-1">שגיאה בקישור</p>
                  <p className="text-red-600 text-xs">{freeTokenError || "הקישור לא תקין. אנא פנה/י להילית בוואטסאפ."}</p>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🧬</div>
                <h1 className="text-2xl md:text-3xl font-black text-[#191265] mb-2">
                  בואי נבנה את הפרופיל שלך
                </h1>
                {dnaFromQuiz ? (
                  <div className="inline-block bg-[#191265] text-[#ffe27c] text-sm font-bold px-4 py-2 rounded-full mt-2">
                    DNA: {DNA_LABELS[dnaFromQuiz] || dnaFromQuiz}
                  </div>
                ) : (
                  <div className="mt-3 bg-[#f0eadc] border border-[#ffe27c] rounded-2xl px-5 py-4 text-right max-w-md mx-auto">
                    <p className="text-[#191265] font-bold text-sm">🧬 שאלון ה-DNA הזוגי יופיע בשלב הבא</p>
                    <p className="text-[#727272] text-xs mt-1 leading-relaxed">לאחר מילוי הפרטים, תעבר/י לשאלון קצר שיקבע את הדמות שלך ויוזן אוטומטית לפרופיל.</p>
                  </div>
                )}
                <p className="text-[#727272] mt-3 text-sm">
                  כל שאלון עובר בעיניי אישית לפני שמוזן למאגר - ככל שתמלא/י יותר, ההתאמות יהיו מדויקות יותר
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">

                {/* Photo */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#191265] mb-4">📷 תמונת פרופיל</h3>
                  <div className="flex items-center gap-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#e9e8e8] flex items-center justify-center cursor-pointer hover:border-[#191265] transition-colors overflow-hidden bg-[#f0eadc]"
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-xs text-[#727272]">העלה/י</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="bg-[#f0eadc] text-[#191265] font-medium px-5 py-2.5 rounded-xl hover:bg-[#e9e8e8] transition-colors text-sm">
                        בחרי תמונה
                      </button>
                      <p className="text-[#727272] text-xs mt-2">JPG, PNG עד 5MB</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </div>
                </div>

                {/* Personal details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#191265] mb-4">👤 פרטים אישיים</h3>
                  {fromDna && (
                    <div className="bg-[#191265]/8 border border-[#191265]/20 rounded-2xl px-4 py-3 mb-4 text-right">
                      <p className="text-[#191265] text-sm font-bold">✓ פרטים מהשאלון שלך</p>
                      <p className="text-[#191265]/60 text-xs mt-0.5">השם, המייל והטלפון מולאו אוטומטית מהשאלון. לא ניתן לשנות אותם כדי לשמור על אותו פרופיל.</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">שם פרטי *</label>
                        <input type="text" value={firstName} onChange={e => !fromDna && setFirstName(e.target.value)} required
                          placeholder="שם פרטי"
                          readOnly={fromDna}
                          className={`w-full px-4 py-3 rounded-xl border-2 text-right ${fromDna ? "border-[#191265]/30 bg-[#191265]/5 text-[#191265] cursor-not-allowed" : "border-[#e9e8e8] focus:outline-none focus:border-[#191265]"}`} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">שם משפחה</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                          placeholder="שם משפחה"
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">מגדר *</label>
                      <div className="flex gap-3">
                        {[{ v: "female", l: "אישה" }, { v: "male", l: "גבר" }].map(({ v, l }) => (
                          <button key={v} type="button"
                            disabled={fromDna}
                            onClick={() => {
                              if (fromDna) return;
                              setGender(v as any);
                              if (seekingGender !== "any") {
                                setSeekingGender(v === "female" ? "male" : "female");
                              }
                            }}
                            className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${gender === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"} ${fromDna ? "opacity-70 cursor-not-allowed" : ""}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">מחפש/ת *</label>
                      <div className="flex gap-2">
                        {[
                          { v: "male", l: "גבר" },
                          { v: "female", l: "אישה" },
                          { v: "any", l: "לא משנה" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setSeekingGender(v as any)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${seekingGender === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גיל *</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} required min={18} max={80}
                          placeholder="גיל"
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גובה (ס"מ)</label>
                        <input type="number" value={height} onChange={e => setHeight(e.target.value)} min={140} max={220}
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">תאריך לידה</label>
                      <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      <p className="text-xs text-[#727272] mt-1">לצורך התאמה אסטרולוגית</p>
                    </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">טלפון *</label>
                      <input type="tel" value={phone} onChange={e => !fromDna && setPhone(e.target.value)} required
                        placeholder="050-0000000"
                        readOnly={fromDna}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-right ${fromDna ? "border-[#191265]/30 bg-[#191265]/5 text-[#191265] cursor-not-allowed" : "border-[#e9e8e8] focus:outline-none focus:border-[#191265]"}`} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">אימייל *</label>
                      <input type="email" value={email} onChange={e => !fromDna && setEmail(e.target.value)} required
                        placeholder="your@email.com"
                        readOnly={fromDna}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-right ${fromDna ? "border-[#191265]/30 bg-[#191265]/5 text-[#191265] cursor-not-allowed" : "border-[#e9e8e8] focus:outline-none focus:border-[#191265]"}`} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">עיר מגורים *</label>
                      <select value={city} onChange={e => setCity(e.target.value)} required
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right bg-white">
                        <option value="">בחרי עיר</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">עיסוק / תחום עבודה</label>
                      <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                        placeholder="מה את/ה עושה לפרנסה?"
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                    </div>
                  </div>
                </div>

                {/* Background */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#191265] mb-4">🎓 רקע ואורח חיים</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">השכלה</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: "high_school", l: "תיכון" },
                          { v: "vocational", l: "הכשרה מקצועית" },
                          { v: "technician", l: "הנדסאי" },
                          { v: "student", l: "סטודנט/ית" },
                          { v: "bachelor", l: "תואר ראשון" },
                          { v: "master", l: "תואר שני" },
                          { v: "phd", l: "דוקטורט" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setEducation(v)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${education === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">רמת דתיות</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: "secular", l: "חילוני/ת" },
                          { v: "traditional", l: "מסורתי/ת" },
                          { v: "religious", l: "דתי/ה" },
                          { v: "orthodox", l: "חרדי/ת" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setReligiosity(v)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${religiosity === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">מצב משפחתי</label>
                      <div className="flex gap-2">
                        {[
                          { v: "single", l: "רווק/ה" },
                          { v: "divorced", l: "גרוש/ה" },
                          { v: "widowed", l: "אלמן/ה" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setMaritalStatus(v)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${maritalStatus === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">ילדים</label>
                      <div className="flex gap-3 mb-3">
                        {[{ v: false, l: "אין לי ילדים" }, { v: true, l: "יש לי ילדים" }].map(({ v, l }) => (
                          <button key={String(v)} type="button" onClick={() => setHasKids(v)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${hasKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      {hasKids && (
                        <input type="number" value={numKids} onChange={e => setNumKids(e.target.value)} min={1} max={10}
                          placeholder="כמה ילדים?"
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">רצון בילדים</label>
                      <div className="flex gap-2">
                        {[
                          { v: "yes", l: "כן, רוצה" },
                          { v: "open", l: "פתוח/ה" },
                          { v: "no", l: "לא רוצה" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setWantsKids(v)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${wantsKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#191265] mb-4">💬 ספר/י על עצמך</h3>
                  <textarea value={about} onChange={e => setAbout(e.target.value)} rows={4}
                    placeholder={isFemale ? "מה מאפיין אותך? מה את מחפשת? מה חשוב לך בזוגיות?" : "מה מאפיין אותך? מה אתה מחפש? מה חשוב לך בזוגיות?"}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right resize-none" />
                </div>

                {/* Partner preferences */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#191265] mb-4">💛 מה {isFemale ? "את מחפשת" : "אתה מחפש"} ב{seekingGender === "female" ? "אישה" : seekingGender === "male" ? "גבר" : "בן/בת זוג"}?</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גיל - מ</label>
                        <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} min={18} max={80}
                          placeholder="מגיל"
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גיל - עד</label>
                        <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} min={18} max={80}
                          placeholder="עד גיל"
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גובה - מ (ס"מ)</label>
                        <input type="number" value={minHeight} onChange={e => setMinHeight(e.target.value)} min={140} max={220}
                          placeholder='מ-ס"מ'
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#191265] mb-1">גובה - עד (ס"מ)</label>
                        <input type="number" value={maxHeight} onChange={e => setMaxHeight(e.target.value)} min={140} max={220}
                          placeholder='עד-ס"מ'
                          className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">רמת דתיות מבוקשת (ניתן לבחור כמה)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: "secular", l: "חילוני/ת" },
                          { v: "traditional", l: "מסורתי/ת" },
                          { v: "religious", l: "דתי/ה" },
                          { v: "orthodox", l: "חרדי/ת" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => toggleReligiosityPref(v)}
                            className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${religiosityPref.includes(v) ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">קבלת בן/בת זוג עם ילדים מקשר קודם</label>
                      <div className="flex gap-2">
                        {[
                          { v: "yes", l: "כן, בהחלט" },
                          { v: "depends_on_age", l: "תלוי בגיל הילדים" },
                          { v: "no", l: "לא" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => {
                            setOpenToPartnerWithKids(v);
                            setAcceptsKids(v === "yes" ? "yes" : v === "no" ? "no" : "open");
                          }}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${openToPartnerWithKids === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-2">מיקום</label>
                      <div className="flex gap-3">
                        {[
                          { v: "close", l: "קרוב למגורים" },
                          { v: "anywhere", l: "כל הארץ" },
                        ].map(({ v, l }) => (
                          <button key={v} type="button" onClick={() => setLocationPref(v)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${locationPref === v ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] text-[#191265]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">
                        {seekingGender === "female" ? (isFemale ? "תארי את האישה שאת מחפשת" : "תאר את האישה שאתה מחפש") : seekingGender === "male" ? (isFemale ? "תארי את הגבר שאת מחפשת" : "תאר את הגבר שאתה מחפש") : "תאר/י את בן/בת הזוג שאת/ה מחפש/ת"} (חופשי)
                      </label>
                      <textarea value={partnerDescription} onChange={e => setPartnerDescription(e.target.value)} rows={3}
                        placeholder={seekingGender === "female" ? "מה הכי חשוב לך באישה? מה יגרום לך להרגיש שזאת היא?" : seekingGender === "male" ? "מה הכי חשוב לך בגבר? מה יגרום לך להרגיש שזה הוא?" : "מה הכי חשוב לך בבן/בת זוג?"}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#191265] mb-1">תחומי עניין (מופרדים בפסיק)</label>
                      <input type="text" value={interests} onChange={e => setInterests(e.target.value)}
                        placeholder="יוגה, בישול, טיולים, מוזיקה, ספורט"
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-4 bg-[#f0eadc] rounded-xl">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 w-5 h-5 accent-[#191265] flex-shrink-0"
                  />
                  <span className="text-sm text-[#444] leading-relaxed text-right">
                    אני מסכימה/מסכים לקבל עדכונים ותוכן מהילית כספי בדואר אלקטרוני. אפשר להסיר מרשימת התפוצה בכל עת.
                  </span>
                </label>
                <button type="submit"
                  className="w-full bg-[#191265] text-white font-black text-lg py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 shadow-xl">
                  המשך לתשלום ₪249 ←
                </button>
              </form>
            </motion.div>
          )}

          {/* ── COMPATIBILITY QUIZ ── */}
          {step === "compatibility_quiz" && (() => {
            const q = activeQuestions[currentQuizIndex];
            const ans = quizAnswers[q.id];
            const progress = Math.round(((currentQuizIndex + 1) / activeQuestions.length) * 100);
            const qText = isFemale ? q.text_f : q.text_m;
            return (
              <motion.div key={`quiz-${currentQuizIndex}`} {...slideIn}>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">{q.categoryIcon}</div>
                  <p className="text-[#1800ad] text-xs font-semibold uppercase tracking-widest mb-1">{q.categoryLabel}</p>
                  <p className="text-[#727272] text-xs">שאלה {currentQuizIndex + 1} מתוך {activeQuestions.length}</p>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-[#e9e8e8] rounded-full max-w-xs mx-auto">
                    <div className="h-1.5 bg-[#191265] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                  {/* Question */}
                  <h2 className="text-xl font-black text-[#191265] mb-2 text-right">{qText}</h2>
                  {/* Why we ask */}
                  <p className="text-[#727272] text-xs mb-5 text-right leading-relaxed border-r-2 border-[#ffe27c] pr-3">
                    {q.explanation}
                  </p>

                  {/* Answer options */}
                  {q.type === "rankTop3" ? (
                    <div className="space-y-2.5 mb-6">
                      <p className="text-xs text-[#727272] mb-2">בחר/י עד 3, לפי סדר עדיפות (הראשון = הכי חשוב)</p>
                      {q.options.map((opt, idx) => {
                        const rank = Array.isArray(ans?.myAnswer) ? (ans.myAnswer as number[]) : [];
                        const pos = rank.indexOf(idx);
                        const isSelected = pos >= 0;
                        return (
                          <button key={idx} type="button"
                            onClick={() => handleQuizRankToggle(q.id, idx)}
                            className={`w-full text-right px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-[#191265] bg-[#191265] text-white"
                                : "border-[#e9e8e8] text-[#191265] hover:border-[#191265]/40"
                            }`}>
                            <span>{opt}</span>
                            {isSelected && (
                              <span className="text-xs font-black bg-[#ffe27c] text-[#191265] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mr-2">
                                {pos + 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {Array.isArray(ans?.myAnswer) && (ans.myAnswer as number[]).length > 0 && (
                        <p className="text-xs text-[#1800ad] font-medium">
                          {(ans.myAnswer as number[]).length === 3 ? "✅ בחרת 3 שפות, מעולה!" : `בחרת/י ${(ans.myAnswer as number[]).length}/3`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 mb-6">
                      {q.options.map((opt, idx) => (
                        <button key={idx} type="button"
                          onClick={() => handleQuizAnswer(q.id, idx)}
                          className={`w-full text-right px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            ans?.myAnswer === idx
                              ? "border-[#191265] bg-[#191265] text-white"
                              : "border-[#e9e8e8] text-[#191265] hover:border-[#191265]/40"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Importance selector */}
                  {ans?.myAnswer !== undefined && !Array.isArray(ans?.myAnswer) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-[#f0eadc] pt-4">
                      <p className="text-[#191265] text-sm font-bold mb-2 text-right">כמה חשוב לך שהצד השני יענה אותו הדבר?</p>
                      <div className="flex gap-2">
                        {IMPORTANCE_LABELS.map((label, imp) => (
                          <button key={imp} type="button"
                            onClick={() => handleQuizImportance(q.id, imp as 0 | 1 | 2)}
                            className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                              ans?.importance === imp
                                ? imp === 0 ? "border-gray-400 bg-gray-100 text-gray-700"
                                  : imp === 1 ? "border-blue-500 bg-blue-100 text-blue-700"
                                  : "border-[#191265] bg-[#191265] text-white"
                                : "border-[#e9e8e8] text-[#727272]"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <button type="button" onClick={handleQuizBack}
                    className="flex-1 py-3.5 rounded-xl border-2 border-[#e9e8e8] text-[#727272] font-medium text-sm hover:border-[#191265] transition-colors">
                    ← חזרה
                  </button>
                  <button type="button" onClick={handleQuizNext}
                    disabled={ans?.myAnswer === undefined}
                    className="flex-[2] py-3.5 rounded-xl bg-[#191265] text-white font-black text-sm hover:bg-[#1800ad] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {currentQuizIndex < activeQuestions.length - 1
                      ? `המשך (${activeQuestions.length - currentQuizIndex - 1} שאלות נותרות) →`
                      : freeTokenFromUrl ? "סיימתי! המשך לאישור →" : "סיימתי! המשך לתשלום →"
                    }
                  </button>
                </div>

                {/* Skip option */}
                <button type="button" onClick={handleQuizNext}
                  className="mt-3 w-full text-center text-[#727272] text-xs hover:text-[#191265] transition-colors">
                  דלג על שאלה זו בינתיים
                </button>
              </motion.div>
            );
          })()}

          {/* ── FREE TOKEN VERIFY ── */}
          {step === "free_token_verify" && (
            <motion.div key="free_token_verify" {...slideIn}>
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">💛</div>
                <h1 className="text-2xl md:text-3xl font-black text-[#191265] mb-2">
                  אימות כניסה חינמית
                </h1>
                <p className="text-[#727272] text-sm">אנא אשרי את כתובת המייל שבה קיבלת את הלינק</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <form onSubmit={handleFreeTokenVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#191265] mb-1">כתובת המייל שלך</label>
                    <input type="email" value={freeTokenEmail} onChange={e => setFreeTokenEmail(e.target.value)} required
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] focus:outline-none focus:border-[#191265] text-right" />
                  </div>
                  {freeTokenError && (
                    <p className="text-red-600 text-sm text-center">{freeTokenError}</p>
                  )}
                  <button type="submit" disabled={redeemToken.isPending}
                    className="w-full bg-[#191265] text-white font-black text-lg py-4 rounded-xl hover:bg-[#1800ad] transition-all duration-300 disabled:opacity-60">
                    {redeemToken.isPending ? "מאמת..." : "אימות וכניסה חינמית ←"}
                  </button>
                  <p className="text-center text-[#727272] text-xs">
                    הלינק תקף ל-7 ימים ולשימוש חד-פעמי בלבד
                  </p>
                </form>
              </div>
              <button onClick={() => setStep("profile")}
                className="mt-4 w-full text-center text-[#727272] text-sm hover:text-[#191265] transition-colors">
                ← חזרה לפרופיל
              </button>
            </motion.div>
          )}

          {/* ── DNA QUIZ (inline, for users arriving without DNA) ── */}
          {step === "dna_select" && (
            <motion.div key="dna_select" {...slideIn}>
              <EmbeddedDnaQuiz
                initialGender={gender}
                onComplete={(dnaType, quizGender, quizSessionId) => {
                  setDnaFromQuiz(dnaType);
                  setGender(quizGender as "female" | "male");
                  if (quizSessionId) setSessionId(quizSessionId);
                  trackInitiateCheckout({ value: 249, currency: "ILS", content_name: "מאגר רווקים" });
                  setStep("payment");
                }}
              />
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="text-[#727272] hover:text-[#191265] text-sm transition-colors w-full text-center mt-6"
              >
                ← חזרה לפרופיל
              </button>
            </motion.div>
          )}

          {/* ── PAYMENT ── */}
          {step === "payment" && (
            <motion.div key="payment" {...slideIn}>
              {/* Countdown banner */}
              <div className="bg-[#191265] rounded-2xl p-4 mb-6 text-center">
                <p className="text-[#ffe27c] text-xs font-bold uppercase tracking-widest mb-2">⏳ מחיר ההטבה פוקע בעוד:</p>
                <div className="flex justify-center gap-3">
                  {[{ v: countdown.h, l: 'שעות' }, { v: countdown.m, l: 'דקות' }, { v: countdown.s, l: 'שניות' }].map(({ v, l }) => (
                    <div key={l} className="bg-white/10 rounded-xl px-4 py-2 min-w-[60px]">
                      <div className="text-white font-black text-2xl">{String(v).padStart(2, '0')}</div>
                      <div className="text-white/50 text-xs">{l}</div>
                    </div>
                  ))}
                </div>
                <p className="text-white/60 text-xs mt-2">מחיר מועדף ₪249 במקום ₪499</p>
              </div>

              <div className="text-center mb-8">
                <div className="text-4xl mb-3">💳</div>
                <h1 className="text-2xl md:text-3xl font-black text-[#191265] mb-2">
                  דמי רצינות ורישום
                </h1>
                <p className="text-[#727272] text-sm">תשלום חד-פעמי. אין חידוש אוטומטי.</p>
              </div>

              <div className="bg-[#191265] rounded-2xl p-6 text-white mb-6">
                <h3 className="font-bold text-[#ffe27c] mb-4">מה כלול:</h3>
                <div className="space-y-2.5">
                  {[
                    "הפרופיל שלך נשמר במאגר הבלעדי של הילית",
                    "כל התאמה נבחרת על ידי הילית אישית, לא רק על ידי אלגוריתם",
                    "הילית תצור איתך קשר ברגע שתהיה התאמה",
                    "שילוב של טכנולוגיה מתקדמת ואישור אישי של כל התאמה",
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="text-[#ffe27c] mt-0.5 shrink-0">✓</span>
                      <span className="text-white/85 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/20 mt-5 pt-5 flex justify-between items-center">
                  <span className="text-white/70">תשלום חד-פעמי</span>
                  <span className="text-[#ffe27c] font-black text-3xl">₪249 <span className="text-white/40 line-through text-xl font-normal">₪499</span></span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                {!growOpened ? (
                  <>
                    <GrowWallet
                      product="database"
                      termsPath="/terms/database"
                      prefillName={firstName && lastName ? `${firstName} ${lastName}` : firstName || undefined}
                      prefillEmail={email || undefined}
                      prefillPhone={phone || undefined}
                      onSuccess={handlePaymentSuccess}
                    />

                    {/* Free invite code section (separate from discount coupons) */}
                    <div className="mt-6 pt-5 border-t border-[#e9e8e8]">
                      {!couponValid ? (
                        <>
                          <p className="text-[#727272] text-sm text-right mb-3">יש לך קוד גישה חינמי?</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={e => { setCouponCode(e.target.value); setCouponError(""); }}
                              placeholder="הכנס/י קוד גישה"
                              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#e9e8e8] text-right text-sm focus:outline-none focus:border-[#191265] transition-colors"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={handleCouponApply}
                              disabled={couponLoading || !couponCode.trim()}
                              className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#ffd84a] transition-colors disabled:opacity-50"
                            >
                              {couponLoading ? "בודק..." : "אמת"}
                            </button>
                          </div>
                          {couponError && (
                            <p className="text-red-500 text-xs mt-2 text-right">{couponError}</p>
                          )}
                        </>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-right">
                          <p className="text-green-700 font-bold text-sm mb-1">✓ קוד גישה חינמי אומת!</p>
                          <p className="text-green-600 text-xs mb-3">אין צורך בתשלום. לחצו להשלמת הרישום.</p>
                          <button
                            type="button"
                            onClick={handleCouponRegister}
                            disabled={paymentLoading}
                            className="w-full bg-[#191265] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1800ad] transition-colors disabled:opacity-60"
                          >
                            {paymentLoading ? "רושם..." : "השלם/י רישום חינמי ←"}
                          </button>
                          {couponError && (
                            <p className="text-red-500 text-xs mt-2">{couponError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-5xl mb-4">💛</div>
                    <h3 className="text-xl font-black text-[#191265] mb-3">תודה! התשלום עבר בהצלחה 💛</h3>
                    <div className="bg-[#191265] rounded-xl p-4 mb-4 text-right">
                      <p className="text-[#ffe27c] text-sm font-bold mb-2">⏭️ מה הצעד הבא?</p>
                      <p className="text-white/90 text-sm leading-relaxed">
                        עד עכשיו מילאתם את <strong className="text-[#ffe27c]">החלק האישי</strong> (פרטים, העדפות).
                        כדי לבצע התאמות מדויקות יש להשלים גם את <strong className="text-[#ffe27c]">החלק המדעי</strong>.
                      </p>
                    </div>
                    <div className="bg-[#f0eadc] rounded-xl p-4 mb-4 text-right">
                      <p className="text-[#191265] text-sm font-bold mb-2">📧 שלחנו לך מייל ל-<span className="text-[#1800ad]">{email}</span></p>
                      <p className="text-[#555] text-sm leading-relaxed">
                        במייל נשלח קישור אישי לשאלון המדעי: 15 שאלות שמאפשרות להבין את הדפוסים הזוגיים לעומק.
                      </p>
                      <p className="text-[#727272] text-xs mt-2 font-medium">
                        💡 מומלץ למלא במקום שקט, לקחת את הזמן ולענות בכנות.
                      </p>
                    </div>
                    <div className="bg-white border border-[#e9e8e8] rounded-xl p-4 mb-4 text-right">
                      <p className="text-[#191265] text-sm font-bold mb-2">מה קורה אחרי השאלון?</p>
                      <ul className="text-[#555] text-sm space-y-2">
                        <li className="flex items-start gap-2"><span className="text-[#ffe27c] font-bold mt-0.5">✓</span><span>תקבלו אישור סופי שנכנסתם למאגר</span></li>
                        <li className="flex items-start gap-2"><span className="text-[#ffe27c] font-bold mt-0.5">✓</span><span>אחפש עבורכם התאמות על בסיס DNA + שאלון מדעי + קריטריונים אישיים</span></li>
                        <li className="flex items-start gap-2"><span className="text-[#ffe27c] font-bold mt-0.5">✓</span><span>כשתהיה התאמה תקבלו מייל עם פרטי הצד השני לאישור</span></li>
                      </ul>
                    </div>
                    {questionnaireToken ? (
                      <a
                        href={`/join/questionnaire?token=${questionnaireToken}`}
                        className="block w-full bg-[#ffe27c] text-[#191265] font-black py-5 rounded-2xl text-lg text-center hover:bg-white transition-colors mb-4 shadow-lg"
                      >
                        מילוי השאלון המדעי ←
                      </a>
                    ) : (
                      <div className="bg-[#fff8e1] border border-[#ffe27c] rounded-xl p-3 mb-4 text-right">
                        <p className="text-[#191265] text-xs font-bold">📧 קישור לשאלון נשלח למייל, בדקו בתיקיית ספאם אם לא קיבלתם</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-[#e9e8e8]">
                      <a href={`https://wa.me/972552442334?text=${encodeURIComponent('היי הילית, שילמתי ורוצה לוודא שהרישום עבר')}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1da851] transition-colors">
                        💬 יש בעיה? כתבו לי בוואטסאפ
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setStep("profile")}
                className="mt-4 w-full text-center text-[#727272] text-sm hover:text-[#191265] transition-colors">
                ← חזרה לפרופיל
              </button>
            </motion.div>
          )}

          {/* ── UPLOADING ── */}
          {step === "uploading" && (
            <motion.div key="uploading" {...slideIn} className="text-center py-20">
              <div className="text-6xl mb-6 animate-bounce">💛</div>
              <h2 className="text-2xl font-black text-[#191265] mb-4">
                שומרת את הפרופיל שלך...
              </h2>
              <p className="text-[#727272]">
                הילית תצור איתך קשר ברגע שתהיה התאמה מתאימה
              </p>
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

          {/* ── UPLOADING ERROR ── */}
          {step === "uploading_error" && (
            <motion.div key="uploading_error" {...slideIn} className="text-center py-20">
              <div className="text-6xl mb-6">⚠️</div>
              <h2 className="text-2xl font-black text-red-600 mb-4">
                אירעה שגיאה
              </h2>
              <p className="text-[#727272] mb-6 max-w-sm mx-auto">
                {registerError || "לא הצלחנו לשמור את הפרופיל. אנא נסי שוב."}
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => {
                    setStep("uploading");
                    // BUG FIX: Use registerBasicMutation (sends questionnaire email) not registerMutation (old path, no questionnaire email)
                    registerBasicMutation.mutate({
                      firstName, lastName: lastName || undefined, gender, seekingGender, age: parseInt(age), birthDate: birthDate || undefined, phone,
                      email: freeTokenVerified ? freeTokenEmail : email,
                      city, height: height ? parseInt(height) : undefined, education: (education as any) || undefined,
                      religiosity: (religiosity as any) || undefined, occupation: occupation || undefined,
                      maritalStatus: (maritalStatus as any) || undefined, hasKids, numKids: numKids ? parseInt(numKids) : 0,
                      wantsKids: (wantsKids as any) || undefined, about: about || undefined,
                      partnerDescription: partnerDescription || undefined, dnaType: (dnaFromQuiz as any) || undefined,
                      dnaSessionId: sessionId || undefined, minAgePreference: minAge ? parseInt(minAge) : undefined,
                      maxAgePreference: maxAge ? parseInt(maxAge) : undefined,
                      religiosityPreference: religiosityPref.join(",") || undefined, acceptsKids: (acceptsKids as any) || undefined,
                      openToPartnerWithKids: (openToPartnerWithKids as any) || undefined,
                      locationPreference: (locationPref as any) || undefined, interests: interests || undefined,
                      origin: window.location.origin,
                    });
                  }}
                  className="bg-[#191265] text-white font-bold py-3 rounded-2xl hover:bg-[#1800ad] transition-all"
                >
                  נסי שוב
                </button>
                <a href="https://wa.me/972552442334" target="_blank" rel="noopener noreferrer"
                  className="border-2 border-[#191265] text-[#191265] font-bold py-3 rounded-2xl text-center hover:bg-[#191265] hover:text-white transition-all">
                  צור קשר עם הילית בוואטסאפ
                </a>
              </div>
            </motion.div>
          )}
          {/* ── DONE ── */}
          {step === "done" && (
            <motion.div key="done" {...slideIn} className="text-center py-16">
              <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-black text-[#191265] mb-4">
                הפרופיל שלך במאגר!
              </h2>
              <p className="text-[#727272] text-lg leading-relaxed mb-8 max-w-md mx-auto">
                הפרופיל שלך נשמר בהצלחה ועכשיו הוא בידיים שלי.
                <br /><br />
<span className="text-[#727272] text-sm">ממוצע 7-14 ימים מרגע ההצטרפות ועד להתאמה הראשונה, כשהאלגוריתם מזהה התאמה מתאימה.</span>
              </p>

              {/* Questionnaire button - shown for free token users who have the token */}
              {questionnaireToken && (
                <div className="bg-[#191265] rounded-2xl p-6 mb-6 text-center max-w-md mx-auto">
                  <p className="text-white font-bold mb-2">שלב אחרון — השאלון המדעי</p>
                  <p className="text-white/70 text-sm mb-4">מלאי את השאלון כדי שהאלגוריתם יוכל למצוא לך התאמות מדויקות.</p>
                  <a
                    href={`/join/questionnaire?token=${questionnaireToken}`}
                    className="inline-block bg-[#ffe27c] text-[#191265] font-black px-8 py-3 rounded-xl hover:bg-white transition-colors text-sm"
                  >
                    מילוי השאלון המדעי ←
                  </a>
                </div>
              )}

              {/* Personal message from Hilit */}
              <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 text-right max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg"
                    alt="הילית כספי"
                    className="w-16 h-16 rounded-full object-cover object-[center_20%] shadow-md flex-shrink-0"
                  />
                  <div>
                    <p className="font-black text-[#191265]">הילית כספי</p>
                    <p className="text-[#1800ad] text-xs font-medium">Relationship Expert & Matchmaker</p>
                  </div>
                </div>
                <p className="text-[#191265]/80 leading-relaxed text-sm">
                  שמחה שאתם כאן. אני קוראת כל פרופיל אישית לפני שאני מבצעת התאמה, כי בשבילי זה לא אלגוריתם בלבד - זה שיקול דעת אנושי. אצור איתך קשר ברגע שיהיה מישהו שנראה לי מתאים. 💛
                </p>
                <a
                  href="https://hilitcaspi.com/api/wa/site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-all duration-300 text-sm"
                >
                  <span>💬</span>
                  הצטרפי לקבוצת הוואטסאפ השקטה שלי
                </a>
              </div>

              <div className="bg-[#ffe27c] rounded-2xl p-6 mb-6 text-right max-w-md mx-auto">
                <p className="text-[#191265] font-bold mb-2">רוצה להאיץ את התהליך?</p>
                <p className="text-[#191265]/80 text-sm mb-4">
                  בליווי אישי נבין יחד מה מעכב אותך ונבנה דרך ברורה לזוגיות. פגישת היכרות ללא עלות.
                </p>
                <a href="https://calendly.com/hilitcaspi/meet-with-me" target="_blank" rel="noopener noreferrer"
                  onClick={() => track({ eventType: "calendly_click", page: "/join" })}
                  className="inline-block bg-[#191265] text-white font-black px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-colors text-sm">
                  שיחת היכרות עם הילית
                </a>
              </div>
              <button onClick={() => navigate("/")}
                className="text-[#727272] text-sm hover:text-[#191265] transition-colors">
                חזרה לדף הבית
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
