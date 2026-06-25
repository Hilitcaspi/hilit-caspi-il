/**
 * User Dashboard: /my-profile
 * Accessible via magic link: /my-profile?email=xxx&token=yyy
 * Shows: profile summary, match status, DNA results
 */

import { useState } from "react";
import ProfileEditForm from "@/components/ProfileEditForm";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";

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

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: any }) {
  const statusInfo = STATUS_LABELS[match.status] || STATUS_LABELS.pending;
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
  if (!profile.height || profile.height < 100) missing.push("גובה");
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
  if (missing.length === 0) return null;
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-right">
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

  const [activeTab, setActiveTab] = useState<"profile" | "matches" | "dna">("profile");

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
  const activeMatches = myMatches.filter((m: any) => m.status === "proposed" || m.status === "matched");
  const historyMatches = myMatches.filter((m: any) => m.status === "rejected" || m.status === "expired" || m.status === "pending");

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
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-[#e9e8e8] shadow-sm">
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
              <MissingFieldsBanner profile={profile} onEditClick={() => {
                // Scroll to update section and open form
                document.getElementById('update-profile-section')?.scrollIntoView({ behavior: 'smooth' });
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
              {myMatches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#e9e8e8] p-8 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="font-black text-[#191265] mb-2">הילית מחפשת עבורך</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">
                    ברגע שתמצא התאמה מתאימה, תקבל/י מייל עם פרטי ההצעה.
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
                      <h3 className="text-sm font-bold text-[#191265] mb-3 px-1">התאמות פעילות</h3>
                      <div className="space-y-3">
                        {activeMatches.map((m: any) => <MatchCard key={m.matchId} match={m} />)}
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
