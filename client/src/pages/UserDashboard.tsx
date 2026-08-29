/**
 * User Dashboard: /my-profile
 * Accessible via magic link: /my-profile?email=xxx&token=yyy
 * Shows: profile summary, match status, DNA results
 */

import { useEffect, useRef, useState } from "react";
import ProfileEditForm from "@/components/ProfileEditForm";
import DatabaseExpectations from "@/components/DatabaseExpectations";
import GrowWallet from "@/components/GrowWallet";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";

function PlusPilotCard({ email, token }: { email: string; token: string }) {
  const utils = trpc.useUtils();
  const [socialText, setSocialText] = useState("");
  const [photoApproved, setPhotoApproved] = useState(false);
  const [copyApproved, setCopyApproved] = useState(false);
  const statusQuery = trpc.plusPilot.getMyStatus.useQuery(
    { email, token },
    { enabled: Boolean(email && token), retry: false },
  );
  const joinWaitlist = trpc.plusPilot.joinWaitlist.useMutation({
    onSuccess: () => utils.plusPilot.getMyStatus.invalidate({ email, token }),
  });
  const updateSocialConsent = trpc.plusPilot.updateSocialExposureConsent.useMutation({
    onSuccess: () => utils.plusPilot.getMyStatus.invalidate({ email, token }),
  });
  const cancelPlus = trpc.plusPilot.requestCancellation.useMutation({
    onSuccess: () => utils.plusPilot.getMyStatus.invalidate({ email, token }),
  });

  if (statusQuery.isLoading) {
    return <div className="mb-4 h-32 rounded-2xl bg-white/60 animate-pulse border border-[#e9e8e8]" />;
  }
  if (!statusQuery.data) return null;

  const { status, pilot, eligibility, benefits, cycleProgress } = statusQuery.data;
  const registered = (status as string) !== "none";
  const checkoutUrl = `/database-plus?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const statusLabel: Record<string, string> = {
    waitlist: "ברשימת ההמתנה",
    eligible: "מתאים/ה לפיילוט",
    invited: "הוזמנת לפיילוט",
    active: "Plus פעיל",
    declined: "ההזמנה לא מומשה",
    churned: "הפיילוט הסתיים",
  };

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[#e3cf74] bg-gradient-to-br from-white to-[#fff8da] text-right shadow-sm">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-[#8b7420]">שירות פרימיום לחברים פעילים במאגר</p>
            <h4 className="mt-1 text-lg font-black text-[#191265]">Database Plus</h4>
            <p className="mt-1 max-w-xl text-xs leading-6 text-[#555]">
              99 ש״ח לחודש, ביטול בכל עת, עם לפחות שתי הצעות שנבדקו ידנית ובוסט אלגוריתמי אחד נוסף בכל מחזור חיוב.
            </p>
          </div>
          {registered && (
            <span className="rounded-full bg-[#191265] px-3 py-1.5 text-[11px] font-black text-white">
              {statusLabel[status] || status}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {benefits.map((benefit: string) => (
            <div key={benefit} className="rounded-xl border border-[#eadf9e] bg-white/80 p-3 text-[11px] leading-5 text-[#555]">
              <span className="ml-1 font-black text-[#191265]">✓</span>{benefit}
            </div>
          ))}
        </div>

        {status === "active" && cycleProgress && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl bg-[#191265] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs text-white/70">הצעות שנשלחו במחזור הנוכחי</p><p className="mt-1 text-3xl font-black text-[#ffe27c]">{cycleProgress.delivered}/{cycleProgress.target}</p></div>
                <div className="text-left text-[11px] leading-5 text-white/65">נותרו {cycleProgress.daysRemaining} ימים<br />עד {new Date(cycleProgress.cycleEnd).toLocaleDateString("he-IL")}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ffe27c]" style={{ width: `${cycleProgress.progressPercent}%` }} /></div>
              <p className="mt-2 text-[10px] leading-5 text-white/60">המונה כולל רק הצעות שנבדקו ידנית ונשלחו בפועל. בוסט אלגוריתמי אינו מחליף את יעד 2 ההצעות. אישור הדדי, דייט או זוגיות אינם מובטחים.</p>
            </div>
            <a href="https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%2C%20%D7%90%D7%A0%D7%99%20%D7%9C%D7%A7%D7%95%D7%97%2F%D7%AA%20Database%20Plus%20%D7%95%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94" target="_blank" rel="noreferrer" className="flex min-h-24 items-center justify-center rounded-xl border border-[#eadf9e] bg-white px-5 text-center text-xs font-black text-[#191265]">
              שירות Plus אישי<br />בוואטסאפ העסקי
            </a>
          </div>
        )}

        {status === "active" && (pilot as any)?.billingStatus === "active" && (
          <div className="mt-4 grid gap-3 rounded-xl border border-[#eadf9e] bg-white/90 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-black text-[#191265]">הטבות לחברי Plus</p>
              <p className="mt-1 text-[11px] leading-5 text-[#666]">פגישת היכרות ב־450 ש״ח במקום 500 ש״ח, ו־50 ש״ח הנחה על המדריך, הקורס וחבילות הליווי עם PLUS50. ההטבה מאומתת לפי מייל המנוי.</p>
            </div>
            <a href={`/single-session?coupon=PLUS50&email=${encodeURIComponent(email)}`} className="rounded-xl bg-[#ffe27c] px-4 py-3 text-center text-xs font-black text-[#191265]">
              לפגישת היכרות ב־450 ₪
            </a>
          </div>
        )}

        {status === "active" && (
          <div className="mt-4 rounded-xl border border-[#eadf9e] bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs">רוצה שנציג אותך בסושיאל?</strong><span className="text-[10px] text-[#777]">אופציונלי בלבד · ללא פרטי קשר</span></div>
            {(pilot as any)?.socialExposureConsent === "approved" ? (
              <p className="mt-2 text-xs font-bold text-emerald-700">ההסכמה שלך נשמרה. הפרסום יבוצע רק לפי הטקסט והתמונה שאישרת.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <textarea value={socialText} onChange={event => setSocialText(event.target.value)} placeholder="הטקסט המדויק שאני מאשר/ת לפרסום" className="min-h-20 w-full rounded-xl border p-3 text-xs" />
                <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={photoApproved} onChange={event => setPhotoApproved(event.target.checked)} />אני מאשר/ת להשתמש בתמונת הפרופיל שלי בפרסום זה</label>
                <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={copyApproved} onChange={event => setCopyApproved(event.target.checked)} />קראתי ואישרתי את הטקסט שהוזן למעלה</label>
                <button type="button" disabled={!photoApproved || !copyApproved || !socialText.trim() || updateSocialConsent.isPending} onClick={() => updateSocialConsent.mutate({ email, token, consent: "approved", photoApproved, copyApproved, approvedText: socialText })} className="rounded-xl bg-[#191265] px-4 py-2 text-[11px] font-black text-white disabled:opacity-40">שמירת הסכמה מפורשת</button>
              </div>
            )}
          </div>
        )}

        {status === "active" && (pilot as any)?.billingStatus === "active" && (
          <details className="mt-4 rounded-xl border border-[#e6dfcc] bg-white/70 p-4 text-[11px] text-[#666]">
            <summary className="cursor-pointer font-bold text-[#191265]">ניהול וביטול המנוי</summary>
            <p className="mt-2 leading-5">אפשר לבטל בכל עת. הטבות Plus נשארות עד סוף המחזור הנוכחי והחברות הרגילה במאגר אינה נפגעת.</p>
            <button
              type="button"
              disabled={cancelPlus.isPending}
              onClick={() => {
                if (window.confirm("לבטל את חידוש Database Plus?")) {
                  cancelPlus.mutate({ email, token });
                }
              }}
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700 disabled:opacity-50"
            >
              {cancelPlus.isPending ? "שולח/ת בקשה..." : "ביטול החידוש הבא"}
            </button>
          </details>
        )}

        {status === "active" && (pilot as any)?.billingStatus === "cancelled" && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">בקשת הביטול התקבלה. Plus נשאר פעיל עד סוף המחזור הנוכחי ולא יתחדש לאחר מכן.</p>
        )}

        {(status === "eligible" || status === "invited") && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eadf9e] pt-4">
            <p className="text-[11px] leading-5 text-[#6b6250]">הצטרפות חודשית אופציונלית, בנוסף לחברות הרגילה במאגר.</p>
            <a href={checkoutUrl} className="rounded-xl bg-[#191265] px-5 py-2.5 text-xs font-black text-white">לפרטים ולמסך התשלום</a>
          </div>
        )}

        {!registered && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eadf9e] pt-4">
            <p className="text-[11px] leading-5 text-[#6b6250]">
              ההצטרפות לרשימה אינה רכישה ואינה יוצרת חיוב. לאחר בדיקת זכאות נשלח קישור אישי להצעה המלאה.
            </p>
            <button
              type="button"
              onClick={() => joinWaitlist.mutate({ email, token, source: "personal_area" })}
              disabled={joinWaitlist.isPending}
              className="rounded-xl bg-[#191265] px-5 py-2.5 text-xs font-black text-white transition-colors hover:bg-[#1800ad] disabled:opacity-50"
            >
              {joinWaitlist.isPending ? "מצרף/ת..." : "רוצה להצטרף לרשימת ההמתנה"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DnaType = "leader" | "romantic" | "free_spirit" | "anchor";

const DNA_INFO: Record<DnaType, {
  label_f: string;
  label_m: string;
  color: string;
  bg: string;
  emoji: string;
  description: string;
  strengths: string[];
  compatibleWith: string;
}> = {
  leader: {
    label_f: "המנהיגה המגנטת",
    label_m: "המנהיג המגנטי",
    color: "#191265",
    bg: "#e8e6f5",
    emoji: "👑",
    description: "אתה/את מובילים, בטוחים בעצמכם ויודעים מה אתם רוצים. בזוגיות אתם מחפשים שותף/ה שיכול/ה להכיל את הנוכחות החזקה שלכם.",
    strengths: ["מנהיגות טבעית", "בטחון עצמי", "יכולת קבלת החלטות", "כריזמה"],
    compatibleWith: "הסלע הבטוח",
  },
  romantic: {
    label_f: "הרומנטית העמוקה",
    label_m: "הרומנטיקן העמוק",
    color: "#c2185b",
    bg: "#fce4ec",
    emoji: "💖",
    description: "אתם אנשי לב. אהבה עמוקה, קשר אמיתי ואינטימיות רגשית הם הדברים החשובים ביותר עבורכם בזוגיות.",
    strengths: ["אמפתיה גבוהה", "עומק רגשי", "נאמנות", "יכולת אהבה עמוקה"],
    compatibleWith: "האביר התקשורתי",
  },
  free_spirit: {
    label_f: "הרוח החופשית",
    label_m: "הרוח החופשית",
    color: "#1565c0",
    bg: "#e3f2fd",
    emoji: "🌊",
    description: "חופש, הרפתקה וספונטניות הם חלק מהמהות שלכם. אתם מחפשים זוגיות שמאפשרת לכם לנשום ולגדול.",
    strengths: ["יצירתיות", "ספונטניות", "פתיחות לחדש", "חיוניות"],
    compatibleWith: "העוגן הגמיש",
  },
  anchor: {
    label_f: "העוגן היציב",
    label_m: "העוגן היציב",
    color: "#2e7d32",
    bg: "#e8f5e9",
    emoji: "⚓",
    description: "יציבות, ביטחון ובית הם הערכים המרכזיים שלכם. אתם הבסיס שעליו בנויה זוגיות בריאה ואמיתית.",
    strengths: ["אמינות", "יציבות רגשית", "מחויבות", "בניית בית"],
    compatibleWith: "היוזם/ת המעריך/ה",
  },
};

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational:  "הכשרה מקצועית",
  technician:  "הנדסאי",
  student:     "סטודנט/ית",
  bachelor: "תואר ראשון",
  master: "תואר שני",
  phd: "דוקטורט",
  other: "אחר",
};

const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני/ת",
  traditional: "מסורתי/ת",
  religious: "דתי/ת",
  orthodox: "חרדי/ת",
};

const MARITAL_LABELS: Record<string, string> = {
  single: "רווק/ה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
};

const WANTS_KIDS_LABELS: Record<string, string> = {
  yes: "כן",
  no: "לא",
  open: "פתוח/ה",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "ממתין לאישור הילית", color: "#727272", bg: "#f5f5f5", icon: "⏳" },
  proposed: { label: "הצעה נשלחה אליך", color: "#1565c0", bg: "#e3f2fd", icon: "💌" },
  matched: { label: "התאמה מוצלחת!", color: "#2e7d32", bg: "#e8f5e9", icon: "💚" },
  rejected: { label: "לא התאים הפעם", color: "#727272", bg: "#f5f5f5", icon: "✕" },
  expired: { label: "פג תוקף", color: "#727272", bg: "#f5f5f5", icon: "⌛" },
};

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const sendLink = trpc.singles.sendDashboardLink.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setSent(true);
      } else {
        setError("לא מצאנו חשבון עם כתובת המייל הזו. בדוק/י שהמייל נכון.");
      }
    },
    onError: () => setError("אירעה שגיאה. נסה/י שוב."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    sendLink.mutate({ email, origin: window.location.origin });
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">💛</div>
          <h2 className="text-2xl font-black text-[#191265] mb-3">הקישור נשלח!</h2>
          <p className="text-[#727272] leading-relaxed">
            שלחנו קישור כניסה לאזור האישי שלך ל-<strong className="text-[#191265]">{email}</strong>.
            בדוק/י את תיבת הדואר הנכנס.
          </p>
          <p className="text-xs text-[#aaa] mt-4">לא קיבלת? בדוק/י בתיקיית הספאם.</p>
          <a href={`https://wa.me/972552442334?text=${encodeURIComponent('היי הילית, לא קיבלתי את הקישור לאזור האישי')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1da851] transition-colors">
            💬 כתוב/י לי בוואטסאפ
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💛</div>
          <h1 className="text-2xl font-black text-[#191265]">האזור האישי שלך</h1>
          <p className="text-[#727272] text-sm mt-2">הכנס/י את כתובת המייל שלך ונשלח לך קישור כניסה</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="כתובת המייל שלך"
            className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#aaa] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
          />
          {error && <p className="text-red-500 text-sm text-right">{error}</p>}
          <button type="submit" disabled={sendLink.isPending}
            className="w-full bg-[#191265] text-white font-black text-base py-3.5 rounded-xl hover:bg-[#1800ad] transition-all disabled:opacity-60">
            {sendLink.isPending ? "שולח..." : "שלח/י לי קישור כניסה ←"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── DNA Card ─────────────────────────────────────────────────────────────────
function DnaCard({ dnaType, gender }: { dnaType: DnaType; gender: "female" | "male" }) {
  const info = DNA_INFO[dnaType];
  const label = gender === "female" ? info.label_f : info.label_m;
  return (
    <div className="rounded-2xl overflow-hidden border border-[#e9e8e8]">
      <div className="p-5" style={{ background: info.bg }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{info.emoji}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: info.color }}>הפרופיל הזוגי שלך</p>
            <h3 className="text-xl font-black" style={{ color: info.color }}>{label}</h3>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: info.color + "cc" }}>{info.description}</p>
      </div>
      <div className="bg-white p-5">
        <p className="text-xs font-bold text-[#191265] mb-3 uppercase tracking-wide">החוזקות שלך</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {info.strengths.map(s => (
            <span key={s} className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: info.bg, color: info.color }}>
              {s}
            </span>
          ))}
        </div>
        <div className="border-t border-[#f0eadc] pt-4">
          <p className="text-xs text-[#727272]">
            <span className="font-bold text-[#191265]">הכי מתאים/ה לך: </span>
            {info.compatibleWith}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchBoostCard({
  email,
  token,
  profile,
  hasCompletedQuestionnaire,
  onCompleteProfile,
}: {
  email: string;
  token: string;
  profile: any;
  hasCompletedQuestionnaire: boolean;
  onCompleteProfile: () => void;
}) {
  const utils = trpc.useUtils();
  const [resultMessage, setResultMessage] = useState("");
  const [algorithmicConsent, setAlgorithmicConsent] = useState(false);
  const [anonymousProfileConsent, setAnonymousProfileConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const didAutoFocusRef = useRef(false);
  const didRefreshOptionsRef = useRef(false);
  const statusQuery = trpc.matchBoost.getMyStatus.useQuery(
    { email, token },
    { enabled: Boolean(email && token), retry: false },
  );
  useEffect(() => {
    if (didAutoFocusRef.current || !statusQuery.data) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== "boost" && params.get("tab") !== "matches" && window.location.hash !== "#boost-card") return;
    didAutoFocusRef.current = true;
    const timeout = window.setTimeout(() => {
      document.getElementById("boost-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [statusQuery.data]);
  const redeemPlus = trpc.matchBoost.redeemPlusBoost.useMutation({
    onSuccess: () => {
      setResultMessage("בקשת ה־Boost התקבלה. לאחר בדיקת הזכאות הסופית היא תישלח לצד השני.");
      utils.matchBoost.getMyStatus.invalidate({ email, token });
    },
    onError: error => setResultMessage(error.message),
  });
  const redeemCredit = trpc.matchBoost.redeemPaidCredit.useMutation({
    onSuccess: () => {
      setResultMessage("קרדיט ה־Boost מומש וההצעה האלגוריתמית נשלחה לשני הצדדים.");
      utils.matchBoost.getMyStatus.invalidate({ email, token });
    },
    onError: error => setResultMessage(error.message),
  });
  const joinPool = trpc.matchBoost.joinPool.useMutation({
    onSuccess: () => {
      setResultMessage("ההצטרפות למסלול Boost נשמרה. אפשר לצאת ממנו בכל עת.");
      utils.matchBoost.getMyStatus.invalidate({ email, token });
    },
    onError: error => setResultMessage(error.message),
  });
  const leavePool = trpc.matchBoost.leavePool.useMutation({
    onSuccess: () => {
      setResultMessage("יצאת ממסלול Boost. הפרופיל לא יוצג בכרטיסי Boost חדשים.");
      utils.matchBoost.getMyStatus.invalidate({ email, token });
    },
    onError: error => setResultMessage(error.message),
  });
  const refreshOptions = trpc.matchBoost.refreshOptions.useMutation({
    onSuccess: () => utils.matchBoost.getMyStatus.invalidate({ email, token }),
  });

  useEffect(() => {
    const status = statusQuery.data;
    if (
      didRefreshOptionsRef.current
      || !status?.membership?.active
      || !status.profileReady
      || status.candidateCount > 0
      || Boolean(status.openRequest)
    ) return;
    didRefreshOptionsRef.current = true;
    refreshOptions.mutate({ email, token });
  }, [email, token, statusQuery.data]);

  if (statusQuery.isLoading) {
    return <div id="boost-card" className="h-44 animate-pulse rounded-[2rem] border border-[#d52b8c]/30 bg-[#241257]" />;
  }
  const status = statusQuery.data;
  if (!status) return null;

  if (!status.membership?.active) {
    const allAccepted = algorithmicConsent && anonymousProfileConsent && termsConsent;
    return (
      <section id="boost-card" className="overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] text-right text-white shadow-xl shadow-fuchsia-950/20 ring-offset-4 ring-offset-[#f0eadc] target:ring-4 target:ring-[#ffe27c]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#ffe27c]">Boost לחברי המאגר</p>
              <h3 className="mt-1 text-2xl font-black text-white">יותר אפשרויות, יותר בחירה בידיים שלכם</h3>
            </div>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-black text-white backdrop-blur">שירות נוסף לבחירתכם</span>
          </div>
          <p className="mt-3 text-sm font-bold leading-7 text-white/85">
            Boost פותח לבחירתכם אפשרויות התאמה של 60% ומעלה. האפשרויות נוצרות על ידי האלגוריתם ואינן עוברות אישור אישי של הילית.
          </p>

          <div className="mt-5 space-y-3 rounded-2xl border border-white/30 bg-white p-4 text-[#20113e] shadow-lg sm:p-5">
              <p className="text-sm font-black text-[#20113e]">כדי לפתוח את Boost בפרופיל, מאשרים שלושה דברים:</p>
              <label className="flex items-start gap-3 text-xs leading-5 text-[#555]">
                <input type="checkbox" checked={algorithmicConsent} onChange={event => setAlgorithmicConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#191265]" />
                <span>אני מסכים או מסכימה לקבל הצעות Boost אלגוריתמיות שלא נבדקו ידנית על ידי הילית.</span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-[#555]">
                <input type="checkbox" checked={anonymousProfileConsent} onChange={event => setAnonymousProfileConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#191265]" />
                <span>אני מאשר או מאשרת הצגת כרטיס אנונימי עם גיל, אזור כללי, תחום עיסוק, השכלה, אורח חיים וסיבות התאמה, ללא שם, תמונה או פרטי קשר.</span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-[#555]">
                <input type="checkbox" checked={termsConsent} onChange={event => setTermsConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#191265]" />
                <span>קראתי והבנתי שאין הבטחה להסכמת הצד השני, לחשיפת פרטים, לדייט או לזוגיות, ושאפשר לצאת מהמסלול בכל עת.</span>
              </label>
              <button
                type="button"
                disabled={!allAccepted || joinPool.isPending}
                onClick={() => joinPool.mutate({
                  email,
                  token,
                  algorithmicDisclosureAccepted: true,
                  anonymousProfileAccepted: true,
                  termsAccepted: true,
                })}
                className="w-full rounded-xl bg-gradient-to-l from-[#a52178] to-[#5d176d] px-5 py-3.5 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {joinPool.isPending ? "שומר/ת הסכמה..." : "הצטרפות למסלול Boost"}
              </button>
              <p className="text-center text-[11px] font-bold text-[#777]">האישור וההצטרפות ל־Boost אינם כרוכים בתשלום.</p>
          </div>
          {resultMessage && <p className="mt-3 rounded-lg bg-[#e8f5e9] p-2 text-center text-xs font-bold text-[#2e7d32]">{resultMessage}</p>}
        </div>
      </section>
    );
  }

  if (!status.profileReady) {
    return (
      <section id="boost-card" className="overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] p-6 text-right text-white shadow-xl shadow-fuchsia-950/20">
        <p className="text-xs font-black text-[#ffe27c]">✓ אישור Boost נשמר בפרופיל</p>
        <h3 className="mt-2 text-xl font-black text-white">האישור הושלם בהצלחה</h3>
        <p className="mt-3 text-sm leading-7 text-white/85">אפשרויות Boost מתאימות יופיעו כאן כאשר יהיו זמינות עבורך.</p>
        <details className="mt-4 text-center text-[11px] text-white/75">
          <summary className="cursor-pointer font-bold text-white">ניהול מסלול Boost</summary>
          <button type="button" disabled={leavePool.isPending} onClick={() => leavePool.mutate({ email, token })} className="mt-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 font-bold text-white disabled:opacity-50">יציאה מהמסלול</button>
        </details>
        {resultMessage && <p className="mt-3 rounded-lg bg-[#e8f5e9] p-2 text-center text-xs font-bold text-[#2e7d32]">{resultMessage}</p>}
      </section>
    );
  }

  if (status.candidateCount === 0 && !status.openRequest) {
    return (
      <section id="boost-card" className="rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] p-6 text-right text-white shadow-xl shadow-fuchsia-950/20">
        <p className="text-xs font-black text-[#ffe27c]">Boost פעיל</p>
        <h3 className="mt-1 text-xl font-black text-white">{refreshOptions.isPending ? "מחפשים עבורך אפשרויות Boost..." : "אין כרגע אפשרויות Boost זמינות"}</h3>
        <p className="mt-2 text-sm leading-6 text-white/80">{refreshOptions.isPending ? "המערכת בודקת כעת רק חברי מאגר פעילים שאישרו Boost ועומדים בתנאי ההתאמה ההדדיים." : "נבדקו חברי המאגר שאישרו Boost. כשתימצא אפשרות חדשה שעוברת את תנאי ההתאמה ההדדיים, היא תופיע כאן."}</p>
        {status.creditAvailable && <p className="mt-3 rounded-xl bg-[#f5f2ff] p-3 text-xs font-bold leading-5 text-[#51448c]">קרדיט ה־Boost שלך שמור. ברגע שיופיע כרטיס חדש שעובר את כל תנאי הסף, ניתן יהיה לממש אותו ללא חיוב נוסף.</p>}
        <button type="button" disabled={leavePool.isPending} onClick={() => leavePool.mutate({ email, token })} className="mt-4 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">ניהול או יציאה משירות Boost</button>
        {resultMessage && <p className="mt-3 text-xs font-bold text-emerald-700">{resultMessage}</p>}
      </section>
    );
  }

  if (status.openRequest) {
    const labels: Record<string, string> = {
      awaiting_payment: "ממתין להשלמת הפעולה",
      paid: "הבקשה התקבלה",
      queued: "הבקשה בדרך לצד השני",
      reviewing: "הבקשה בבדיקה",
    };
    return (
      <section id="boost-card" className="overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] p-6 text-right text-white shadow-xl shadow-fuchsia-950/20">
        <p className="text-xs font-black text-[#ffe27c]">Boost בתהליך</p>
        <h3 className="mt-1 text-xl font-black text-white">הבקשה שלך בטיפול</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-white/90">{labels[status.openRequest.status] || "הבקשה נמצאת בטיפול"}</p>
        <p className="mt-3 text-xs leading-5 text-white/70">לפני השליחה המערכת בודקת שוב ששני הצדדים פעילים, פנויים והסכימו לשירות. הצעת Boost אינה נבדקת ידנית על ידי הילית.</p>
      </section>
    );
  }

  const primaryBlocker = status.blockers[0];
  const options = status.options?.length
    ? status.options
    : status.anonymousCard
      ? [{ matchId: undefined, card: status.anonymousCard }]
      : [];
  return (
    <section id="boost-card" className="overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] text-right text-white shadow-xl shadow-fuchsia-950/20">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#ffe27c]">אפשרויות Boost לבחירה עצמאית</p>
            <h3 className="mt-1 text-2xl font-black text-white">בחרו למי תרצו לשלוח בקשת Boost</h3>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black text-white">
            {status.candidateCount} אפשרויות זמינות
          </span>
        </div>
        <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm leading-6 text-white/85">
          <p><strong className="text-[#ffe27c]">60% ומעלה</strong> מצביעים על פוטנציאל התאמה לפי הנתונים והשאלונים. ככל שהציון גבוה יותר, האלגוריתם מצא התאמה חזקה יותר, אך אין בכך הבטחה להצלחה.</p>
          <p className="mt-2">במסלול הרגיל הילית מעדיפה את ההתאמות הגבוהות ביותר ובודקת כל הצעה אישית. Boost מאפשר לבחור הזדמנות נוספת בעצמכם.</p>
          <p className="mt-2">השם והתמונה מוסתרים מטעמי פרטיות ומתוך רצון להכיר קודם את האדם, מעבר למראה.</p>
        </div>

        <div className="mt-5 space-y-5">
          {options.map((option: any, index: number) => {
            const card = option.card;
            return (
              <article key={option.matchId || index} className="overflow-hidden rounded-[1.6rem] border border-white/30 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="mx-auto flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-[#191265] shadow-md sm:mx-0">
                    <div className="flex h-16 w-14 items-center justify-center rounded-full bg-white/15 text-3xl blur-[1px]">?</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#ffe27c]">אפשרות Boost {index + 1}</p>
                      {card.score !== null && card.score !== undefined && <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black text-white">{card.score}% התאמה</span>}
                    </div>
                    <h4 className="mt-2 text-xl font-black text-white">לפני תמונה, מכירים את האדם</h4>
                    <p className="mt-2 text-sm leading-6 text-white/80">האפשרות פתוחה ל־Boost כי שני הצדדים אישרו את השירות ועומדים כעת בתנאי הזכאות.</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["גיל", card.age], ["אזור", card.region], ["תחום עיסוק", card.occupation],
                    ["השכלה", card.education], ["גובה", card.height ? `${card.height} ס״מ` : "לא צוין"],
                    ["מצב משפחתי", card.maritalStatus], ["ילדים", card.hasKids], ["עישון", card.smoking],
                    ["זיקה דתית", card.religiosity], ["כיוון משפחתי", card.relationshipIntent],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <p className="text-[10px] font-bold text-[#ffe27c]">{label}</p>
                      <p className="mt-1 text-xs font-black text-white">{value || "לא צוין"}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#eef9f1] p-4">
                    <p className="text-xs font-black text-[#24613a]">למה האלגוריתם סימן התאמה</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#315d3f]">{(card.reasons || []).map((reason: string) => <li key={reason}>✓ {reason}</li>)}</ul>
                  </div>
                  <div className="rounded-xl bg-[#fff3e8] p-4">
                    <p className="text-xs font-black text-[#8a4b17]">מה כדאי לקחת בחשבון</p>
                    {(card.considerations || []).length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#75431e]">{card.considerations.map((item: string) => <li key={item}>• {item}</li>)}</ul>
                    ) : <p className="mt-2 text-xs leading-5 text-[#75431e]">לא נמצא פער מהותי בנתונים שהוצגו.</p>}
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/25 bg-white/10 p-3 text-center text-xs font-black text-white">{card.disclosure}</div>
                <p className="mt-3 text-center text-xs leading-5 text-white/75">לפני השליחה המערכת תבדוק שוב ששני הצדדים פעילים, פנויים ואישרו Boost. פרטים מזהים ייחשפו רק לאחר הסכמה הדדית.</p>

                <div className="mt-4">
                  {status.creditAvailable ? (
                    <button type="button" disabled={!status.eligible || redeemCredit.isPending} onClick={() => redeemCredit.mutate({ email, token, matchId: option.matchId })} className="w-full rounded-xl bg-[#ffe27c] px-5 py-3 font-black text-[#191265] disabled:cursor-not-allowed disabled:opacity-50">
                      {redeemCredit.isPending ? "מפעיל את הקרדיט..." : "מימוש קרדיט ושליחת Boost"}
                    </button>
                  ) : status.plusBenefitAvailable ? (
                    <button type="button" disabled={!status.eligible || redeemPlus.isPending} onClick={() => redeemPlus.mutate({ email, token, matchId: option.matchId })} className="w-full rounded-xl bg-[#ffe27c] px-5 py-3 font-black text-[#191265] disabled:cursor-not-allowed disabled:opacity-50">
                      {redeemPlus.isPending ? "שולח את ה־Boost..." : "שליחת Boost"}
                    </button>
                  ) : status.eligible ? (
                    <GrowWallet
                      product="match_boost"
                      buttonLabel="שליחת Boost | 19.90 ₪"
                      prefillName={`${profile.firstName || ""} ${profile.lastName || ""}`.trim()}
                      prefillEmail={profile.email || email}
                      prefillPhone={profile.phone || ""}
                      termsPath="/terms/match-boost"
                      personalToken={token}
                      boostMatchId={option.matchId}
                      showCoupon={false}
                      onSuccess={() => {
                        setResultMessage("בקשת ה־Boost התקבלה. המערכת בודקת את זמינות שני הצדדים ושולחת את ההצעה, או שומרת עבורך אפשרות למימוש חוזר.");
                        setTimeout(() => utils.matchBoost.getMyStatus.invalidate({ email, token }), 1800);
                      }}
                      onFailure={() => setResultMessage("התשלום לא הושלם ולא יישלח Boost.")}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="border-t border-white/15 bg-white p-4 text-[#20113e]">
        {primaryBlocker && <p className="mt-2 text-center text-xs font-medium text-[#9a5b00]">{primaryBlocker}</p>}
        {resultMessage && <p className="mt-3 rounded-lg bg-[#e8f5e9] p-2 text-center text-xs font-bold text-[#2e7d32]">{resultMessage}</p>}
        <details className="mt-3 text-center text-[11px] text-[#777]">
          <summary className="cursor-pointer font-bold text-[#191265]">ניהול מסלול Boost</summary>
          <button type="button" disabled={leavePool.isPending} onClick={() => leavePool.mutate({ email, token })} className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-bold text-red-700 disabled:opacity-50">יציאה מהמסלול</button>
        </details>
      </div>
    </section>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: any }) {
  const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.pending;
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const utils = trpc.useUtils();
  const releaseMutation = trpc.matchmaking.returnToPool.useMutation({
    onSuccess: () => {
      utils.singles.getDashboard.invalidate();
      setShowReleaseConfirm(false);
    },
  });
  const expiresIn = match.approvalExpiresAt
    ? Math.max(0, Math.ceil((match.approvalExpiresAt - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#e9e8e8] overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-[#f5f5f5]">
        <span className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: statusInfo.bg, color: statusInfo.color }}>
          {statusInfo.icon} {statusInfo.label}
        </span>
        {match.score && (
          <span className="text-xs text-[#727272]">
            התאמה: <strong className="text-[#191265]">{Math.round(match.score)}%</strong>
          </span>
        )}
      </div>

      {match.status === 'proposed' && match.other && (
        <div className="p-5">
          <div className="flex gap-4 items-start">
            {match.other.photoUrl ? (
              <img src={match.other.photoUrl} alt={match.other.firstName}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-[#ffe27c]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#f0eadc] flex items-center justify-center text-2xl shrink-0">
                {match.other.firstName?.[0] || "?"}
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-black text-[#191265] text-lg">{match.other.firstName}</h4>
              <p className="text-[#727272] text-sm">{match.other.age && match.other.age > 0 ? match.other.age : "?"} · {match.other.city}</p>
              {match.other.dnaType && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[#f0eadc] text-[#191265]">
                  {DNA_INFO[match.other.dnaType as DnaType]?.emoji} {DNA_INFO[match.other.dnaType as DnaType]?.label_m}
                </span>
              )}
            </div>
          </div>
          {!match.myConsent && (
            <div className="mt-4 bg-[#fff8e1] border border-[#ffe27c] rounded-xl p-3 text-sm text-right">
              <p className="font-bold text-[#191265] mb-1">💌 יש לך הצעת התאמה!</p>
              <p className="text-[#555] text-xs">בדוק/י את המייל שלך לאישור ההצעה.</p>
              {expiresIn !== null && expiresIn > 0 && (
                <p className="text-xs text-[#727272] mt-1">תוקף: עוד {expiresIn} שעות</p>
              )}
            </div>
          )}
          {match.myConsent && !match.theirConsent && (
            <div className="mt-4 bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-3 text-sm text-right">
              <p className="font-bold text-[#2e7d32]">✓ אישרת את ההצעה</p>
              <p className="text-[#555] text-xs">ממתין/ה לאישור הצד השני...</p>
            </div>
          )}
        </div>
      )}

      {match.status === 'matched' && match.other && (
        <div className="p-5">
          <div className="bg-[#e8f5e9] rounded-xl p-4 mb-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-black text-[#2e7d32]">שניכם אמרתם כן!</p>
            <p className="text-sm text-[#555]">הפרטים של {match.other.firstName} נחשפו</p>
          </div>
          <div className="flex gap-4 items-start">
            {match.other.photoUrl ? (
              <img src={match.other.photoUrl} alt={match.other.firstName}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-[#ffe27c]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#f0eadc] flex items-center justify-center text-2xl shrink-0">
                {match.other.firstName?.[0] || "?"}
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-black text-[#191265] text-lg">{match.other.firstName}</h4>
              <p className="text-[#727272] text-sm">{match.other.age && match.other.age > 0 ? match.other.age : "?"} · {match.other.city}</p>
              {match.other.occupation && <p className="text-[#555] text-sm">{match.other.occupation}</p>}
              <div className="mt-3 space-y-1">
                {match.other.phone && (
                  <a href={`tel:${match.other.phone}`}
                    className="flex items-center gap-2 text-sm text-[#191265] font-bold hover:text-[#1800ad]">
                    📞 {match.other.phone}
                  </a>
                )}
                {match.other.email && (
                  <a href={`mailto:${match.other.email}`}
                    className="flex items-center gap-2 text-sm text-[#191265] font-bold hover:text-[#1800ad]">
                    ✉️ {match.other.email}
                  </a>
                )}
                {match.other.phone && (
                 <a href={`https://wa.me/972${match.other.phone.replace(/^0/, '').replace(/-/g, '')}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 mt-2 bg-[#25D366] text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#1da851] transition-colors">
                   💬 שלח/י הודעה בוואטסאפ
                 </a>
                )}
              </div>
            </div>
          </div>
          {/* Release match section */}
          <div className="mx-5 mb-4 mt-2 border-t border-[#f0f0f0] pt-4">
            {!showReleaseConfirm ? (
              <button
                onClick={() => setShowReleaseConfirm(true)}
                className="w-full text-center text-sm text-[#999] hover:text-[#e53935] transition-colors py-2"
              >
                לא הסתדר? לחצ/י כאן לשחרור מההתאמה
              </button>
            ) : (
              <div className="bg-[#fff3e0] border border-[#ffcc80] rounded-xl p-4 text-center">
                <p className="font-bold text-[#e65100] text-sm mb-2">בטוח/ה שרוצה להשתחרר מההתאמה?</p>
                <p className="text-xs text-[#555] mb-3">לאחר השחרור, שניכם תחזרו למאגר ותוכלו לקבל התאמות חדשות.</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => releaseMutation.mutate({ matchId: match.matchId })}
                    disabled={releaseMutation.isPending}
                    className="bg-[#e53935] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#c62828] transition-colors disabled:opacity-50"
                  >
                    {releaseMutation.isPending ? "משחרר..." : "כן, שחרר אותי"}
                  </button>
                  <button
                    onClick={() => setShowReleaseConfirm(false)}
                    className="bg-[#f5f5f5] text-[#555] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#e0e0e0] transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(match.status === 'rejected' || match.status === 'expired') && (
        <div className="p-5 text-center text-[#aaa] text-sm">
          <p>ההצעה לא התאימה הפעם. הילית תמשיך לחפש עבורך.</p>
        </div>
      )}

      {match.status === 'pending' && (
        <div className="p-5 text-center text-[#727272] text-sm">
          <p>הילית בוחנת את ההתאמה. תקבל/י עדכון בקרוב.</p>
          <p className="mt-2 text-xs leading-5 text-[#999]">אחוז ההתאמה משקף פוטנציאל לפי נתוני הפרופילים. לפני שליחה הילית בוחנת גם זמינות, סטטוס נוכחי והתאמה אנושית.</p>
        </div>
      )}

      {match.proposedAt && (
        <div className="px-5 pb-4 text-xs text-[#aaa] text-left">
          {new Date(match.proposedAt).toLocaleDateString("he-IL")}
        </div>
      )}
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection({ profile }: { profile: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#e9e8e8] overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt={profile.firstName}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#ffe27c] shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#f0eadc] flex items-center justify-center text-3xl shrink-0 border-2 border-[#ffe27c]">
            {profile.firstName?.[0] || "?"}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-black text-[#191265]">
            {profile.firstName} {profile.lastName || ""}
          </h3>
          <p className="text-[#727272] text-sm">{profile.age && profile.age > 0 ? profile.age : "?"} · {profile.city}</p>
          {profile.occupation && <p className="text-[#555] text-sm">{profile.occupation}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {profile.isActive ? (
              <span className="text-xs px-2 py-1 rounded-full bg-[#e8f5e9] text-[#2e7d32] font-bold">✓ פעיל/ה במאגר</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-[#fff8e1] text-[#f57f17] font-bold">⏳ ממתין/ה להשלמת שאלון</span>
            )}
            {profile.dnaType && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#f0eadc] text-[#191265]">
                {DNA_INFO[profile.dnaType as DnaType]?.emoji} {profile.gender === "female" ? DNA_INFO[profile.dnaType as DnaType]?.label_f : DNA_INFO[profile.dnaType as DnaType]?.label_m}
              </span>
            )}
          </div>
        </div>
      </div>

      {profile.about && (
        <div className="px-5 pb-4 border-t border-[#f5f5f5] pt-4">
          <p className="text-xs font-bold text-[#191265] mb-1 uppercase tracking-wide">על עצמי</p>
          <p className="text-sm text-[#555] leading-relaxed">{profile.about}</p>
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 text-sm text-[#727272] hover:text-[#191265] border-t border-[#f5f5f5] transition-colors text-right flex items-center justify-between">
        <span>{expanded ? "הסתר פרטים" : "הצג פרטים נוספים"}</span>
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 grid grid-cols-2 gap-3 border-t border-[#f5f5f5] pt-4">
              {profile.education && (
                <div>
                  <p className="text-xs text-[#aaa]">השכלה</p>
                  <p className="text-sm font-bold text-[#191265]">{EDUCATION_LABELS[profile.education] || profile.education}</p>
                </div>
              )}
              {profile.religiosity && (
                <div>
                  <p className="text-xs text-[#aaa]">זהות דתית</p>
                  <p className="text-sm font-bold text-[#191265]">{RELIGIOSITY_LABELS[profile.religiosity] || profile.religiosity}</p>
                </div>
              )}
              {profile.maritalStatus && (
                <div>
                  <p className="text-xs text-[#aaa]">מצב משפחתי</p>
                  <p className="text-sm font-bold text-[#191265]">{MARITAL_LABELS[profile.maritalStatus] || profile.maritalStatus}</p>
                </div>
              )}
              {profile.wantsKids && (
                <div>
                  <p className="text-xs text-[#aaa]">רוצה ילדים</p>
                  <p className="text-sm font-bold text-[#191265]">{WANTS_KIDS_LABELS[profile.wantsKids] || profile.wantsKids}</p>
                </div>
              )}
              {profile.hasKids && (
                <div>
                  <p className="text-xs text-[#aaa]">ילדים</p>
                  <p className="text-sm font-bold text-[#191265]">{profile.numKids} ילדים</p>
                </div>
              )}
              {profile.interests && (
                <div className="col-span-2">
                  <p className="text-xs text-[#aaa] mb-1">תחומי עניין</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.split(",").map((i: string) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#f0eadc] text-[#555]">{i.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Missing Fields Banner ───────────────────────────────────────────────────
function getMissingFields(profile: any): string[] {
  const missing: string[] = [];
  if (!profile.height || profile.height === 0) missing.push("גובה");
  if (!profile.education) missing.push("השכלה");
  if (!profile.religiosity) missing.push("זהות דתית");
  if (!profile.occupation) missing.push("עיסוק");
  if (!profile.about && !profile.aboutMe) missing.push("קצת עליך");
  if (!profile.maritalStatus) missing.push("מצב משפחתי");
  if (!profile.wantsKids) missing.push("רצון בילדים");
  if (!profile.photoUrl) missing.push("תמונה");
  return missing;
}

function MissingFieldsBanner({ profile, onEditClick }: { profile: any; onEditClick: () => void }) {
  const missing = getMissingFields(profile);
  // Also check if there's a pending profile update - if so, don't nag them
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const pendingUpdate = trpc.profileUpdates.getMyPending.useQuery({ token }, { enabled: !!token });
  if (missing.length === 0 || pendingUpdate.data) return null;
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-right" id="missing-fields-banner">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-amber-800 font-black mb-1">פרטים חסרים בפרופיל שלך</h3>
          <p className="text-amber-700 text-sm mb-3">
            כדי שנוכל למצוא לך את ההתאמה הטובה ביותר, חשוב להשלים את הפרטים הבאים:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {missing.map(field => (
              <span key={field} className="text-xs px-3 py-1 rounded-full bg-amber-200 text-amber-900 font-bold">
                {field}
              </span>
            ))}
          </div>
          <button
            onClick={onEditClick}
            className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-colors">
            ✏️ השלם/י פרטים עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Update Profile Section ---
function UpdateProfileSection({ profile, token, autoOpen = false }: { profile: any; token: string; autoOpen?: boolean }) {
  const [showForm, setShowForm] = useState(autoOpen);
  const [submitted, setSubmitted] = useState(false);
  const pendingQuery = trpc.profileUpdates.getMyPending.useQuery({ token }, { enabled: !!token });

  if (submitted || pendingQuery.data) {
    return (
      <div className="bg-[#e8f5e9] rounded-2xl p-5 text-right border border-[#a5d6a7]">
        <h3 className="text-[#2e7d32] font-black mb-1">&#x2713; בקשת עדכון נשלחה</h3>
        <p className="text-[#555] text-sm">הילית תבדוק ותאשר את השינויים בקרוב. בדרך כלל תוך 24 שעות.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#191265] rounded-2xl p-5 text-right">
        <h3 className="text-[#ffe27c] font-black mb-2">רוצה לעדכן את הפרופיל?</h3>
        <p className="text-white/70 text-sm mb-3">שלח/י בקשת עדכון, הילית תאשר לפני שהשינויים יופיעו.</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-[#ffe27c] text-[#191265] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-white transition-colors">
          ✏️ עדכן/י פרופיל
        </button>
      </div>
      {showForm && (
        <ProfileEditForm
          profile={profile}
          token={token}
          onClose={() => setShowForm(false)}
          onSubmitted={() => { setShowForm(false); setSubmitted(true); }}
        />
      )}
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function UserDashboard() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const requestedTab = params.get("tab");
  const shouldFocusBoost = params.get("focus") === "boost";
  const [activeTab, setActiveTab] = useState<"profile" | "matches" | "dna">(
    requestedTab === "boost" || shouldFocusBoost
      ? "matches"
      : requestedTab === "matches" || requestedTab === "dna"
        ? requestedTab
        : "profile",
  );

  const { data, isLoading, error } = trpc.singles.getDashboard.useQuery(
    { email, token },
    { enabled: !!email && !!token, retry: false, refetchInterval: 30000 }
  );

  // No email or token in URL → show login form
  if (!email || !token) return <LoginForm />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">💛</div>
          <p className="text-[#191265] font-bold">טוען את האזור האישי שלך...</p>
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-[#191265] mb-3">הקישור לא תקין</h2>
          <p className="text-[#727272] text-sm mb-6">הקישור שבו השתמשת לא תקין או שפג תוקפו.</p>
          <button onClick={() => window.location.href = "/my-profile"}
            className="bg-[#191265] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#1800ad] transition-colors">
            בקש/י קישור חדש
          </button>
        </div>
      </div>
    );
  }

  const { profile, matches: myMatches, dnaResult, hasCompletedQuestionnaire, questionnaireToken } = data;

  // Blocked/removed users see a "profile removed" message
  const REMOVED_PROFILES: Record<string, string> = {
    'eli.fribert1@gmail.com': '',
    'michalbs5921@gmail.com': 'פעילות אחרונה שבוצעה בפרופיל זה: 20/6/26',
    'tomy.23@gmail.com': '',
  };
  const removedMsg = REMOVED_PROFILES[(profile.email || '').toLowerCase()];
  if (removedMsg !== undefined) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-black text-[#191265] mb-3">הפרופיל לא פעיל והוסר מהמערכת</h2>
          {removedMsg && <p className="text-[#727272] text-sm mb-4">{removedMsg}</p>}
        </div>
      </div>
    );
  }

  const activeMatches = myMatches.filter((m: any) => (m.status === "proposed" || m.status === "matched") && !m.returnedToPoolAt);
  const pendingMatches = myMatches.filter((m: any) => m.status === "pending" && !m.returnedToPoolAt);
  const historyMatches = myMatches.filter((m: any) => m.status === "rejected" || m.status === "expired" || m.returnedToPoolAt);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-white/70 hover:text-white text-sm transition-colors">← לאתר הראשי</a>
        <span className="text-white font-bold text-sm">האזור האישי שלך</span>
        <div className="w-24" />
      </div>

      {/* Hero greeting */}
      <div className="bg-[#191265] px-6 pb-8 pt-2">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.firstName}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#ffe27c] shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#ffe27c]/20 flex items-center justify-center text-2xl shrink-0 border-2 border-[#ffe27c]">
              {profile.firstName?.[0] || "?"}
            </div>
          )}
          <div>
            <h1 className="text-white font-black text-xl">שלום, {profile.firstName} 💛</h1>
            <p className="text-white/60 text-sm">
              {profile.isActive ? "הפרופיל שלך פעיל במאגר" : "ממתין/ה להשלמת הרישום"}
            </p>
          </div>
        </div>

        {/* Status bar */}
        {!hasCompletedQuestionnaire && questionnaireToken && (
          <div className="max-w-2xl mx-auto mt-4 bg-[#ffe27c]/20 border border-[#ffe27c]/40 rounded-xl p-3 flex items-center justify-between gap-3">
            <p className="text-[#ffe27c] text-sm font-bold">יש להשלים את השאלון המדעי כדי להיכנס למאגר</p>
            <a href={`/join/questionnaire?token=${questionnaireToken}`}
              className="shrink-0 bg-[#ffe27c] text-[#191265] font-black text-xs px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
              למילוי ←
            </a>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "התאמות פעילות", value: activeMatches.length, icon: "💌" },
            { label: "התאמות מוצלחות", value: myMatches.filter((m: any) => m.status === "matched").length, icon: "💚" },
            { label: "ימים במאגר", value: profile.createdAt ? Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24)) : 0, icon: "📅" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-[#e9e8e8]">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-2xl font-black text-[#191265]">{value}</div>
              <div className="text-xs text-[#727272] leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-3 gap-1 bg-white rounded-xl p-1 border border-[#e9e8e8] shadow-sm">
          {[
            { id: "profile" as const, label: "הפרופיל שלי", icon: "👤" },
            { id: "matches" as const, label: `התאמות (${myMatches.length})`, icon: "💌" },
            { id: "dna" as const, label: "הDNA שלי", icon: "🧬" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#191265] text-white shadow-sm"
                  : "text-[#727272] hover:text-[#191265]"
              }`}>
              <span className="block text-base mb-0.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
	     <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <AnimatePresence mode="wait">
          {/* ── Profile Tab ── */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <DatabaseExpectations compact showStats={false} />
              <PlusPilotCard email={email} token={token} />
              <MissingFieldsBanner profile={profile} onEditClick={() => {
                // Scroll to update section and click the edit button
                const section = document.getElementById('update-profile-section');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                  // Auto-click the edit button after scroll
                  setTimeout(() => {
                    const editBtn = section.querySelector('button');
                    if (editBtn) editBtn.click();
                  }, 400);
                }
              }} />
              <ProfileSection profile={profile} />
              <div id="update-profile-section">
                <UpdateProfileSection profile={profile} token={token} />
              </div>
            </motion.div>
          )}

          {/* ── Matches Tab ── */}
         {activeTab === "matches" && (
           <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
             className="space-y-4">
              <div className="rounded-2xl border border-[#ded8ef] bg-white p-4 text-right shadow-sm">
                <h2 className="font-black text-[#191265]">כל ההזדמנויות להיכרות במקום אחד</h2>
                <p className="mt-1 text-xs leading-5 text-[#666]">כאן מופיעות ההתאמות שהילית בוחנת ושולחת, ולצדן אפשרויות Boost שאפשר לבחור ולשלוח באופן עצמאי.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
                  <a href="#regular-matches" className="rounded-xl bg-[#f0eadc] px-3 py-2.5 text-[#191265]">ההתאמות של הילית</a>
                  <a href="#boost-card" className="rounded-xl bg-[#f7e7f1] px-3 py-2.5 text-[#8c1763]">אפשרויות Boost</a>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ded8ef] bg-white p-4 text-right shadow-sm">
                <p className="text-xs font-black text-[#a52178]">אפשרויות Boost לבחירה עצמאית</p>
                <p className="mt-1 text-xs leading-5 text-[#666]">כאן אפשר לבחור התאמות אלגוריתמיות של 60% ומעלה. הן מופיעות רק כששני הצדדים אישרו Boost, פנויים ועומדים בתנאי ההתאמה.</p>
              </div>
              <MatchBoostCard
                email={email}
                token={token}
                profile={profile}
                hasCompletedQuestionnaire={hasCompletedQuestionnaire}
                onCompleteProfile={() => setActiveTab("profile")}
              />

              <div id="regular-matches" className="scroll-mt-24 rounded-2xl border border-[#e9e8e8] bg-white p-4 text-right shadow-sm">
                <p className="text-xs font-black text-[#191265]">התאמות שהילית בוחנת ושולחת</p>
                <p className="mt-1 text-xs leading-5 text-[#727272]">במסלול הרגיל הילית מעדיפה את ההתאמות הגבוהות ביותר, ובוחנת אישית את הזמינות וההתאמה האנושית לפני שליחת הצעה.</p>
              </div>
              {myMatches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#e9e8e8] p-8 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="font-black text-[#191265] mb-2">הילית מחפשת עבורך</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">
                    התאמות נשלחות כשנמצאת התאמה הדדית ורלוונטית — לא לפי מכסה או לוח זמנים קבוע. ברגע שתימצא התאמה מתאימה, יישלחו מייל ו-SMS עם פרטי ההצעה.
                    {!hasCompletedQuestionnaire && " השלם/י את השאלון המדעי כדי לשפר את ההתאמות."}
                  </p>
                  {!hasCompletedQuestionnaire && questionnaireToken && (
                    <a href={`/join/questionnaire?token=${questionnaireToken}`}
                      className="inline-block mt-4 bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#ffd84a] transition-colors">
                      השלם/י את השאלון ←
                    </a>
                  )}
                </div>
              ) : (
                <>
                  {activeMatches.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-[#191265] mb-3 px-1">התאמות שנשלחו</h3>
                      <div className="space-y-3">
                        {activeMatches.map((m: any) => <MatchCard key={m.matchId} match={m} />)}
                      </div>
                    </div>
                  )}
                  {pendingMatches.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-[#191265] mb-3 px-1">התאמות שהילית בוחנת</h3>
                      <div className="space-y-3">
                        {pendingMatches.map((m: any) => <MatchCard key={m.matchId} match={m} />)}
                      </div>
                    </div>
                  )}
                  {historyMatches.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-[#727272] mb-3 px-1">היסטוריה</h3>
                      <div className="space-y-3">
                        {historyMatches.map((m: any) => <MatchCard key={m.matchId} match={m} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── DNA Tab ── */}
          {activeTab === "dna" && (
            <motion.div key="dna" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4">
              {profile.dnaType ? (
                <>
                  <DnaCard dnaType={profile.dnaType as DnaType} gender={profile.gender} />
                  {dnaResult?.scores && (() => {
                    try {
                      const scores = JSON.parse(dnaResult.scores) as Record<string, number>;
                      const total = Object.values(scores).reduce((a: number, b: number) => a + b, 0);
                      const typeMap: Record<string, DnaType> = { A: "leader", B: "romantic", C: "free_spirit", D: "anchor" };
                      return (
                        <div className="bg-white rounded-2xl border border-[#e9e8e8] p-5">
                          <h3 className="font-black text-[#191265] mb-4">פירוט הציונים</h3>
                          <div className="space-y-3">
                            {Object.entries(scores).map(([key, val]) => {
                              const type = typeMap[key];
                              if (!type) return null;
                              const info = DNA_INFO[type];
                              const pct = total > 0 ? Math.round((val as number / total) * 100) : 0;
                              return (
                                <div key={key}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-[#727272]">{info.emoji} {profile.gender === "female" ? info.label_f : info.label_m}</span>
                                    <span className="text-xs font-bold text-[#191265]">{pct}%</span>
                                  </div>
                                  <div className="h-2 bg-[#f0eadc] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all"
                                      style={{ width: `${pct}%`, background: info.color }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  <div className="bg-[#f0eadc] rounded-2xl p-5 text-right">
                    <p className="text-xs text-[#727272] mb-2">רוצה לדעת יותר על הפרופיל הזוגי שלך?</p>
                    <a href="/dna-quiz" className="text-[#191265] font-bold text-sm hover:underline">
                      חזרה לשאלון ה-DNA ←
                    </a>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-[#e9e8e8] p-8 text-center">
                  <div className="text-4xl mb-3">🧬</div>
                  <h3 className="font-black text-[#191265] mb-2">עוד לא מילאת את שאלון ה-DNA</h3>
                  <p className="text-[#727272] text-sm mb-4">מלא/י את שאלון ה-DNA כדי לגלות את הפרופיל הזוגי שלך ולשפר את ההתאמות.</p>
                  <a href="/dna-quiz"
                    className="inline-block bg-[#191265] text-white font-black px-6 py-3 rounded-xl text-sm hover:bg-[#1800ad] transition-colors">
                    למילוי שאלון DNA ←
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
