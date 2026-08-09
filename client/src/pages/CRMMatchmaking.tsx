/**
 * CRM Matchmaking   admin page for managing the singles database and matches
 * URL: /crm/matchmaking
 */
import { useState } from "react";
import MatchmakingDashboard from "./MatchmakingDashboard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Heart, Zap, Copy, RefreshCw, CheckCircle, Clock, XCircle, Send, Gift, Search, X, ChevronDown, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const RELIGIOSITY_LABELS: Record<string, string> = {
  secular:     "חילוני/ת",
  traditional: "מסורתי/ת",
  religious:   "דתי/ת",
  orthodox:    "חרדי/ת",
};
const DNA_LABELS: Record<string, string> = {
  leader:      "מנהיג/ה",
  romantic:    "רומנטיקן/ית",
  free_spirit: "רוח חופשית",
  anchor:      "עוגן",
};
const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational:  "הכשרה מקצועית",
  technician:  "הנדסאי",
  student:     "סטודנט/ית",
  bachelor:    "תואר ראשון",
  master:      "תואר שני",
  phd:         "דוקטורט",
  other:       "אחר",
};
const MARITAL_LABELS: Record<string, string> = {
  single:   "רווק/ה",
  divorced: "גרוש/ה",
  widowed:  "אלמן/ה",
};

// Area/region groupings for city filter
const AREA_CITIES: Record<string, string[]> = {
  "מרכז": ["תל אביב", "רמת גן", "גבעתיים", "הרצליה", "רמת השרון", "כפר סבא", "רעננה", "פתח תקווה", "הוד השרון", "נתניה", "ראשון לציון", "בת ים", "בני ברק", "חולון", "רחובות", "יהוד", "אור יהודה", "גבעתיים", "קרית אונו", "קרית מוצקין"],
  "שרון": ["נתניה", "רעננה", "כפר סבא", "ראש העין", "הרצליה", "פתח תקווה", "הוד השרון", "רמת השרון"],
  "דרום": ["באר שבע", "אשדוד", "אשקלון", "נתיבות", "אופקים", "קרית גת"],
  "צפון": ["חיפה", "נשר הגליל", "עתלית", "קריות", "טירת הכרמל", "זכרון יעקב", "עפולה"],
  "ירושלים": ["ירושלים", "מודיעין", "מעלה אדומים", "בית שמש", "מבשרת"],
};
const GENDER_LABELS: Record<string, string> = {
  female: "אישה",
  male:   "גבר",
  other:  "אחר",
};
// Helper: display age safely, 0 means unknown
const displayAge = (age: number | null | undefined) => (!age || age === 0) ? "?" : age;

const MATCH_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:  { label: "ממתין",   color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
  proposed: { label: "נשלח",    color: "bg-blue-100 text-blue-800",     icon: "📨" },
  matched:  { label: "התאמה!",  color: "bg-green-100 text-green-800",   icon: "💛" },
  rejected: { label: "נדחה",    color: "bg-red-100 text-red-800",       icon: "❌" },
  expired:  { label: "פג תוקף", color: "bg-gray-100 text-gray-500",     icon: "⌛" },
};

// Internal admin notes component - editable textarea per single
function AdminNotesField({ singleId }: { singleId: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const trpcUtils = trpc.useUtils();
  const notesQuery = trpc.matchmaking.getAdminNotes.useQuery({ id: singleId });
  const updateNotes = trpc.matchmaking.updateAdminNotes.useMutation({
    onSuccess: () => {
      trpcUtils.matchmaking.getAdminNotes.invalidate({ id: singleId });
      setIsEditing(false);
    },
  });

  const currentNotes = notesQuery.data?.notes || "";

  return (
    <div className="mt-3 pt-3 border-t border-[#e9e8e8]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-[#191265]">📝 הערות פנימיות</span>
        {!isEditing && (
          <button
            onClick={() => { setDraft(currentNotes); setIsEditing(true); }}
            className="text-xs text-[#191265] underline hover:text-[#ffe27c] transition-colors"
          >
            ערוך
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm border border-[#191265]/20 rounded-lg p-2 min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[#ffe27c]"
            placeholder="הערות פנימיות על המלווה (רק את רואה)..."
            dir="rtl"
            maxLength={2000}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={() => updateNotes.mutate({ id: singleId, notes: draft })}
              disabled={updateNotes.isPending}
              className="text-xs px-3 py-1 rounded-lg bg-[#191265] text-white hover:bg-[#1800ad] transition-colors disabled:opacity-50"
            >
              {updateNotes.isPending ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#727272] whitespace-pre-wrap">{currentNotes || "אין הערות עדיין"}</p>
      )}
    </div>
  );
}

// Full edit modal for all single fields
function EditSingleModal({ single, onClose, onSave, isPending }: {
  single: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    firstName: single.firstName || '',
    lastName: single.lastName || '',
    gender: single.gender || '',
    age: single.age || '',
    city: single.city || '',
    phone: single.phone || '',
    email: single.email || '',
    height: single.height || '',
    education: single.education || '',
    religiosity: single.religiosity || '',
    shomerShabbat: single.shomerShabbat ?? false,
    occupation: single.occupation || '',
    maritalStatus: single.maritalStatus || '',
    hasKids: single.hasKids ?? single.hasChildren ?? false,
    numKids: single.numKids ?? single.numberOfChildren ?? '',
    wantsKids: single.wantsKids ?? single.wantsChildren ?? '',
    hasPets: single.hasPets ?? false,
    petType: single.petType || '',
    acceptsPets: single.acceptsPets ?? false,
    locationPreference: single.locationPreference || '',
    smokingStatus: single.smokingStatus || '',
    smokingPreference: single.smokingPreference || '',
    minAgePreference: single.minAgePreference || '',
    maxAgePreference: single.maxAgePreference || '',
    about: single.about || single.aboutMe || '',
    partnerDescription: single.partnerDescription || '',
    acceptsKids: single.acceptsKids ?? false,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const payload: any = { id: single.id };
    if (form.firstName && form.firstName !== single.firstName) payload.firstName = form.firstName;
    if (form.lastName !== (single.lastName || '')) payload.lastName = form.lastName;
    if (form.gender && form.gender !== single.gender) payload.gender = form.gender;
    if (form.age && Number(form.age) !== single.age) payload.age = Number(form.age);
    if (form.city !== (single.city || '')) payload.city = form.city;
    if (form.phone !== (single.phone || '')) payload.phone = form.phone;
    if (form.email !== (single.email || '')) payload.email = form.email;
    if (form.height && Number(form.height) !== single.height) payload.height = Number(form.height);
    if (form.education && form.education !== single.education) payload.education = form.education;
    if (form.religiosity && form.religiosity !== single.religiosity) payload.religiosity = form.religiosity;
    if (form.shomerShabbat !== (single.shomerShabbat ?? false)) payload.shomerShabbat = form.shomerShabbat;
    if (form.occupation !== (single.occupation || '')) payload.occupation = form.occupation;
    if (form.maritalStatus && form.maritalStatus !== single.maritalStatus) payload.maritalStatus = form.maritalStatus;
    if (form.hasKids !== (single.hasKids ?? single.hasChildren ?? false)) payload.hasKids = form.hasKids;
    if (form.numKids && Number(form.numKids) !== (single.numKids ?? single.numberOfChildren)) payload.numKids = Number(form.numKids);
    if (form.wantsKids && form.wantsKids !== (single.wantsKids ?? single.wantsChildren)) payload.wantsKids = form.wantsKids;
    if (form.hasPets !== (single.hasPets ?? false)) payload.hasPets = form.hasPets;
    if (form.petType !== (single.petType || '')) payload.petType = form.petType;
    if (form.acceptsPets !== (single.acceptsPets ?? false)) payload.acceptsPets = form.acceptsPets;
    if (form.locationPreference && form.locationPreference !== single.locationPreference) payload.locationPreference = form.locationPreference;
    if (form.smokingStatus && form.smokingStatus !== single.smokingStatus) payload.smokingStatus = form.smokingStatus;
    if (form.smokingPreference && form.smokingPreference !== single.smokingPreference) payload.smokingPreference = form.smokingPreference;
    if (form.minAgePreference && Number(form.minAgePreference) !== single.minAgePreference) payload.minAgePreference = Number(form.minAgePreference);
    if (form.maxAgePreference && Number(form.maxAgePreference) !== single.maxAgePreference) payload.maxAgePreference = Number(form.maxAgePreference);
    if (form.about !== (single.about || single.aboutMe || '')) payload.about = form.about;
    if (form.partnerDescription !== (single.partnerDescription || '')) payload.partnerDescription = form.partnerDescription;
    if (form.acceptsKids !== (single.acceptsKids ?? false)) payload.acceptsKids = form.acceptsKids;
    onSave(payload);
  };

  const inputCls = "w-full text-sm border border-[#191265]/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#ffe27c] bg-white";
  const labelCls = "text-xs font-semibold text-[#191265] mb-0.5 block";
  const selectCls = "w-full text-sm border border-[#191265]/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#ffe27c] bg-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto p-6" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#191265]">✏️ עריכת פרטים: {single.firstName} {single.lastName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Personal Info */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#191265] mb-2 border-b border-[#ffe27c] pb-1">פרטים אישיים</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>שם פרטי</label><input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
            <div><label className={labelCls}>שם משפחה</label><input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
            <div><label className={labelCls}>מגדר</label><select className={selectCls} value={form.gender} onChange={e => set('gender', e.target.value)}><option value="">בחר</option><option value="male">גבר</option><option value="female">אישה</option></select></div>
            <div><label className={labelCls}>גיל</label><input type="number" className={inputCls} value={form.age} onChange={e => set('age', e.target.value)} min={18} max={120} /></div>
            <div><label className={labelCls}>עיר</label><input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div><label className={labelCls}>גובה (ס"מ)</label><input type="number" className={inputCls} value={form.height} onChange={e => set('height', e.target.value)} min={100} max={250} /></div>
            <div><label className={labelCls}>טלפון</label><input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div><label className={labelCls}>אימייל</label><input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className={labelCls}>מקצוע</label><input className={inputCls} value={form.occupation} onChange={e => set('occupation', e.target.value)} /></div>
          </div>
        </div>

        {/* Status & Lifestyle */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#191265] mb-2 border-b border-[#ffe27c] pb-1">מצב ואורח חיים</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>השכלה</label><select className={selectCls} value={form.education} onChange={e => set('education', e.target.value)}><option value="">בחר</option><option value="high_school">תיכון</option><option value="vocational">הכשרה מקצועית</option><option value="technician">הנדסאי</option><option value="student">סטודנט/ית</option><option value="bachelor">תואר ראשון</option><option value="master">תואר שני</option><option value="phd">דוקטורט</option><option value="other">אחר</option></select></div>
            <div><label className={labelCls}>דתיות</label><select className={selectCls} value={form.religiosity} onChange={e => set('religiosity', e.target.value)}><option value="">בחר</option><option value="secular">חילוני/ת</option><option value="traditional">מסורתי/ת</option><option value="religious">דתי/ת</option><option value="orthodox">חרדי/ת</option><option value="datlash">דתל"ש</option></select></div>
            <div><label className={labelCls}>מצב משפחתי</label><select className={selectCls} value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}><option value="">בחר</option><option value="single">רווק/ה</option><option value="divorced">גרוש/ה</option><option value="widowed">אלמן/ה</option></select></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.shomerShabbat} onChange={e => set('shomerShabbat', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">שומר/ת שבת</span></div>
            <div><label className={labelCls}>עישון</label><select className={selectCls} value={form.smokingStatus} onChange={e => set('smokingStatus', e.target.value)}><option value="">בחר</option><option value="no">לא מעשן/ת</option><option value="occasionally">לפעמים</option><option value="yes">מעשן/ת</option></select></div>
            <div><label className={labelCls}>העדפת מיקום</label><select className={selectCls} value={form.locationPreference} onChange={e => set('locationPreference', e.target.value)}><option value="">בחר</option><option value="close">רק באזור</option><option value="anywhere">גמיש/ה למרחק</option></select></div>
          </div>
        </div>

        {/* Kids & Pets */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#191265] mb-2 border-b border-[#ffe27c] pb-1">ילדים וחיות</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.hasKids} onChange={e => set('hasKids', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">יש ילדים</span></div>
            {form.hasKids && <div><label className={labelCls}>מספר ילדים</label><input type="number" className={inputCls} value={form.numKids} onChange={e => set('numKids', e.target.value)} min={0} max={20} /></div>}
            <div><label className={labelCls}>רוצה ילדים</label><select className={selectCls} value={form.wantsKids} onChange={e => set('wantsKids', e.target.value)}><option value="">בחר</option><option value="yes">כן</option><option value="no">לא</option><option value="open">פתוח/ה</option></select></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.acceptsKids} onChange={e => set('acceptsKids', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">מוכן/ה לבן/בת זוג עם ילדים</span></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.hasPets} onChange={e => set('hasPets', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">יש חיית מחמד</span></div>
            {form.hasPets && <div><label className={labelCls}>סוג חיה</label><input className={inputCls} value={form.petType} onChange={e => set('petType', e.target.value)} /></div>}
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.acceptsPets} onChange={e => set('acceptsPets', e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm">מוכן/ה לחיות מחמד</span></div>
          </div>
        </div>

        {/* Partner Preferences */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#191265] mb-2 border-b border-[#ffe27c] pb-1">העדפות בן/בת זוג</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>גיל מינימום</label><input type="number" className={inputCls} value={form.minAgePreference} onChange={e => set('minAgePreference', e.target.value)} min={18} max={120} /></div>
            <div><label className={labelCls}>גיל מקסימום</label><input type="number" className={inputCls} value={form.maxAgePreference} onChange={e => set('maxAgePreference', e.target.value)} min={18} max={120} /></div>
            <div><label className={labelCls}>העדפת עישון</label><select className={selectCls} value={form.smokingPreference} onChange={e => set('smokingPreference', e.target.value)}><option value="">בחר</option><option value="no_smokers">לא מעשנים</option><option value="occasionally_ok">לפעמים בסדר</option><option value="doesnt_matter">לא משנה</option></select></div>
          </div>
        </div>

        {/* Free Text */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#191265] mb-2 border-b border-[#ffe27c] pb-1">טקסט חופשי</h3>
          <div className="space-y-3">
            <div><label className={labelCls}>על עצמי</label><textarea className={inputCls + " min-h-[60px] resize-y"} value={form.about} onChange={e => set('about', e.target.value)} /></div>
            <div><label className={labelCls}>מחפש/ת בן/בת זוג</label><textarea className={inputCls + " min-h-[60px] resize-y"} value={form.partnerDescription} onChange={e => set('partnerDescription', e.target.value)} /></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">ביטול</button>
          <button onClick={handleSave} disabled={isPending} className="px-6 py-2 rounded-lg bg-[#191265] text-white text-sm font-bold hover:bg-[#1800ad] transition-colors disabled:opacity-50">{isPending ? 'שומר...' : '💾 שמור שינויים'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CRMMatchmaking() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"singles" | "matches" | "unmatched" | "tokens" | "inactive_leads" | "missing_data" | "update_requests" | "compatibility" | "inactive" | "filter_search" | "dashboard">("singles");
  // Filter-search tab state
  const [filterGender, setFilterGender] = useState("");
  const [filterMinAge, setFilterMinAge] = useState("");
  const [filterMaxAge, setFilterMaxAge] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterReligiosity, setFilterReligiosity] = useState("");
  const [filterDna, setFilterDna] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterCompatTarget, setFilterCompatTarget] = useState<number | null>(null);
  const [filterCompatSearch, setFilterCompatSearch] = useState("");
  const [filterCompatDropdown, setFilterCompatDropdown] = useState(false);
  const [filterCompatResult, setFilterCompatResult] = useState<Record<number, any>>({});
  const [filterMinHeight, setFilterMinHeight] = useState("");
  const [filterMaxHeight, setFilterMaxHeight] = useState("");
  const [filterMaritalStatus, setFilterMaritalStatus] = useState("");
  const [filterWantsKids, setFilterWantsKids] = useState("");
  const [filterHasKids, setFilterHasKids] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const checkCompatForFilter = trpc.admin.checkCompatibility.useMutation({
    onSuccess: (data: any, vars: any) => {
      setFilterCompatResult(prev => ({ ...prev, [vars.idB]: data }));
    },
  });
  const [selectedSingle, setSelectedSingle] = useState<number | null>(null);
  const [inviteNote, setInviteNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [hilitsNotes, setHilitsNotes] = useState<Record<number, string>>({}); // matchId -> personal note
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [singlesSearch, setSinglesSearch] = useState("");
  // Compatibility check state
  const [compatPersonA, setCompatPersonA] = useState<number | null>(null);
  const [compatPersonB, setCompatPersonB] = useState<number | null>(null);
  const [compatSearchA, setCompatSearchA] = useState("");
  const [compatSearchB, setCompatSearchB] = useState("");
  const [compatDropdownA, setCompatDropdownA] = useState(false);
  const [compatDropdownB, setCompatDropdownB] = useState(false);
  const [compatResult, setCompatResult] = useState<any>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [matchSubTab, setMatchSubTab] = useState<"pending" | "proposed" | "matched" | "rejected" | "no_response" | "expired" | "followup">("pending");
  const [matchSearch, setMatchSearch] = useState("");
  const [hideProposed, setHideProposed] = useState(false); // show all singles by default
  const [showOnlyUpdatedThisMonth, setShowOnlyUpdatedThisMonth] = useState(false);
  const [photoUploadSingleId, setPhotoUploadSingleId] = useState<number | null>(null);
  const [editingSingleId, setEditingSingleId] = useState<number | null>(null);
  const [topMatchesPage, setTopMatchesPage] = useState<Record<number, number>>({}); // singleId -> page (0=first 3, 1=next 3, etc.)

  // Queries
  const { data: singles = [], refetch: refetchSingles } = trpc.matchmaking.listSingles.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: pendingMatches = [], refetch: refetchMatches } = trpc.matchmaking.listPendingMatches.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: tokens = [], refetch: refetchTokens } = trpc.invites.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: singlesWithoutMatches = [], refetch: refetchUnmatched } = (trpc.matchmaking as any).getSinglesWithoutMatches.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "unmatched",
  });
  const { data: inactiveSingles = [] } = (trpc.matchmaking as any).listInactiveSingles.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "inactive_leads",
  });
  const { data: updateRequests = [], refetch: refetchUpdateRequests } = trpc.profileUpdates.getAllPending.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "update_requests",
  });
  const approveUpdateMutation = trpc.profileUpdates.review.useMutation({
    onSuccess: () => { toast.success("אושר ונשמר!"); refetchUpdateRequests(); },
    onError: () => toast.error("שגיאה באישור"),
  });
  const rejectUpdateMutation = trpc.profileUpdates.review.useMutation({
    onSuccess: () => { toast.success("נדחה."); refetchUpdateRequests(); },
    onError: () => toast.error("שגיאה בדחייה"),
  });
  // All singles for compatibility check dropdowns
  const { data: allSinglesForCompat = [] } = trpc.admin.getAllSingles.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "compatibility",
  });

  // All inactive singles (for the "לא פעילים" tab)
  const { data: allInactiveSingles = [], refetch: refetchInactive } = (trpc.matchmaking as any).listInactiveSingles.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "inactive",
  });

  // Compatibility check mutation
  const checkCompatMutation = trpc.admin.checkCompatibility.useMutation({
    onSuccess: (data) => {
      setCompatResult(data);
      toast.success("בדיקת ההתאמה הושלמה!");
    },
    onError: (err) => toast.error(`שגיאה: ${err.message}`),
  });

  // Top 3 matches for selected single
  const { data: topMatches = [], isLoading: topMatchesLoading } = (trpc.matchmaking as any).getTopMatchesForSingle.useQuery(
    { singleId: selectedSingle },
    { enabled: !!user && user.role === "admin" && selectedSingle !== null }
  );

  // Mutations
  const runMatching = trpc.matchmaking.runMatching.useMutation({
    onSuccess: (data) => {
      const d = data as { totalFound?: number; newlyInserted?: number; count?: number; status?: string; message?: string };
      if (d.status === "started") {
        toast.success("האלגוריתם רץ ברקע! התאמות יופיעו תוך מספר דקות, רענני את הדף.");
      } else {
        toast.success(`נמצאו ${d.totalFound ?? d.count ?? 0} התאמות (${d.newlyInserted ?? 0} חדשות)!`);
      }
      setTimeout(() => refetchMatches(), 5000);
    },
    onError: () => toast.error("שגיאה בהרצת האלגוריתם"),
  });
  const runMatchingForSingle = (trpc.matchmaking as any).runMatchingForSingle.useMutation({
    onSuccess: () => {
      toast.success("האלגוריתם רץ! התאמות חדשות יופיעו עוד מעט ✅");
      setTimeout(() => refetchMatches(), 2000);
    },
    onError: () => toast.error("שגיאה בהרצת האלגוריתם"),
  });
  const refreshMatchScores = (trpc.matchmaking as any).refreshMatchScores.useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      refetchMatches();
      toast.success(`עודכנו ציונים ל-${data?.updated ?? 0} התאמות! ✅`);
    },
    onError: () => toast.error("שגיאה בחישוב ציונים"),
  });

  const createAndSendMatch = (trpc.admin as any).createAndSendMatch.useMutation({
    onSuccess: () => {
      setCompatResult((prev: any) => prev ? { ...prev, matchStatus: 'proposed' } : prev);
      toast.success("ההצעה נשלחה לשני הצדדים! 💛");
    },
    onError: (err: any) => {
      const msg = err?.message || "שגיאה בשליחת ההצעה";
      toast.error(msg, { duration: 6000 });
    },
  });

  const approveMatch = trpc.matchmaking.approveMatch.useMutation({
    onSuccess: (_, vars) => {
      refetchMatches();
      // Clear the note after sending
      setHilitsNotes(prev => { const n = {...prev}; delete n[vars.matchId]; return n; });
      toast.success("ההצעה נשלחה לשני הצדדים! 💛");
    },
    onError: (err) => {
      // Show server's conflict warning (e.g. person already in active match)
      const msg = (err as any)?.message || "שגיאה בשליחת ההצעה";
      toast.error(msg, { duration: 6000 });
    },
  });

  const rejectMatch = trpc.matchmaking.rejectMatch.useMutation({
    onSuccess: () => {
      refetchMatches();
      toast.success("ההתאמה נדחתה");
    },
  });

  const createToken = trpc.invites.generate.useMutation({
    onSuccess: () => {
      refetchTokens();
      setInviteNote("");
      toast.success("טוקן חינמי נוצר!");
    },
  });

  const revokeToken = trpc.invites.generate.useMutation({ // placeholder - revoke not yet implemented
  // TODO: add revoke procedure to invites router
    onSuccess: () => {
      refetchTokens();
      toast.success("טוקן בוטל");
    },
  });

  const toggleActive = trpc.matchmaking.toggleSingleActive.useMutation({
    onSuccess: () => refetchSingles(),
  });

  const releaseFromMatch = (trpc.matchmaking as any).releaseFromMatch.useMutation({
    onSuccess: () => {
      refetchMatches();
      refetchSingles();
      toast.success("שוחרר/ה מההתאמה הפעילה ✅");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בשחרור מהתאמה"),
  });

  const updateMatchDetailStatus = (trpc.matchmaking as any).updateMatchDetailStatus.useMutation({
    onSuccess: () => { refetchMatches(); toast.success('סטאטוס עודכן!'); },
    onError: () => toast.error('שגיאה בעדכון'),
  });

  const sendMatchReminder = (trpc.matchmaking as any).sendMatchReminder.useMutation({
    onSuccess: () => toast.success("תזכורת נשלחה במייל! 📧"),
    onError: (err: any) => toast.error(err?.message || "שגיאה בשליחת תזכורת"),
  });
  const updatePhotoMutation = (trpc.matchmaking as any).updateSinglePhoto.useMutation({
    onSuccess: () => {
      toast.success('התמונה עודכנה בהצלחה!');
      setPhotoUploadSingleId(null);
      refetchSingles();
    },
    onError: (err: any) => toast.error('שגיאה בהעלאת התמונה: ' + err.message),
  });

  const deactivateSingle = (trpc.matchmaking as any).deactivateSingle.useMutation({
    onSuccess: () => { refetchSingles(); refetchMatches(); toast.success('הרווק/ה הוסר/ה מהמאגר'); },
    onError: (err: any) => toast.error(err?.message || 'שגיאה בהסרה'),
  });

  const updateSingleInline = (trpc.matchmaking as any).updateSingleInline.useMutation({
    onSuccess: () => { refetchSingles(); refetchMatches(); toast.success('פרטים עודכנו!'); },
    onError: (err: any) => toast.error(err?.message || 'שגיאה בעדכון'),
  });
  const toggleCoachingClient = (trpc.matchmaking as any).toggleCoachingClient.useMutation({
    onSuccess: () => { refetchSingles(); refetchMatches(); refetchUnmatched(); toast.success('עודכן!'); },
    onError: (err: any) => { console.error('[toggleCoaching]', err); toast.error('שגיאה בעדכון מלווה: ' + (err?.message || '')); },
  });
  const toggleNotBasic = (trpc.matchmaking as any).toggleNotBasic.useMutation({
    onSuccess: () => { refetchSingles(); refetchMatches(); refetchUnmatched(); toast.success('עודכן!'); },
    onError: () => toast.error('שגיאה'),
  });

  // Non-response counts for serial non-responder badge
  const { data: nonResponseCounts = {} } = (trpc.matchmaking as any).getNonResponseCounts.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  }) as { data: Record<number, number> };

  if (loading) {
    return <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl"><div className="text-[#191265]">טוענת...</div></div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center" dir="rtl">
        <div className="text-center bg-white rounded-3xl p-10 shadow-2xl max-w-sm mx-4">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black text-[#191265] mb-2">ניהול מאגר</h1>
          <a href="/team/login" className="block bg-[#191265] text-white font-bold text-lg px-8 py-4 rounded-2xl text-center mt-4">כניסת צוות</a>
          <a href={getLoginUrl()} className="block text-[#727272] text-sm mt-3 underline">כניסה עם Manus</a>
        </div>
      </div>
    );
  }

  const typedSingles = (singles as unknown) as Array<{
    id: number; firstName: string; lastName?: string | null; gender: string; age: number;
    city?: string | null; dnaType?: string | null; occupation?: string | null;
    isActive: boolean; createdAt: Date | number; compatibilityScore?: number | null;
    phone?: string | null; email?: string | null;
    photoUrl?: string | null; seekingGender?: string | null;
    maritalStatus?: string | null; hasChildren?: boolean | null; numberOfChildren?: number | null;
    hasKids?: boolean | null; numKids?: number | null; wantsKids?: string | null;
    wantsChildren?: string | null; about?: string | null; aboutMe?: string | null; partnerDescription?: string | null;
    height?: number | null; religiosity?: string | null; education?: string | null;
  }>;

  const typedMatches = pendingMatches as Array<{
    id: number; singleAId: number; singleBId: number; score?: number | null;
    status: string; proposedAt?: number | null; createdAt: Date | number;
    approvedByA: boolean; approvedByB: boolean;
    tokenAUsedAt?: number | null; tokenBUsedAt?: number | null;
    emailAOpenedAt?: number | null; emailBOpenedAt?: number | null;
    singleAName?: string; singleBName?: string;
    singleAGender?: string; singleBGender?: string;
    singleACity?: string; singleBCity?: string;
    singleAAge?: number; singleBAge?: number;
    singleADna?: string; singleBDna?: string;
    singleAOccupation?: string; singleBOccupation?: string;
    singleAPhone?: string | null; singleBPhone?: string | null;
    singleAPhotoUrl?: string | null; singleBPhotoUrl?: string | null;
    singleAEducation?: string | null; singleBEducation?: string | null;
    singleAHasKids?: boolean | null; singleBHasKids?: boolean | null;
    singleANumKids?: number | null; singleBNumKids?: number | null;
    singleAWantsKids?: string | null; singleBWantsKids?: string | null;
    singleAReligiosity?: string | null; singleBReligiosity?: string | null;
    singleAAbout?: string | null; singleBAbout?: string | null;
    singleAPartnerDesc?: string | null; singleBPartnerDesc?: string | null;
    singleAHeight?: number | null; singleBHeight?: number | null;
    singleAMinAge?: number | null; singleAMaxAge?: number | null;
    singleBMinAge?: number | null; singleBMaxAge?: number | null;
    scoreBreakdown?: string | null;
    autoExplanation?: string | null;
    matchedAt?: number | null;
    followUpSentAt?: number | null;
    matchDetailStatus?: string | null;
    matchWeekFollowupSentAt?: number | null;
    matchMonthFollowupSentAt?: number | null;
    singleAMaritalStatus?: string | null; singleBMaritalStatus?: string | null;
    singleAShomerShabbat?: boolean | null; singleBShomerShabbat?: boolean | null;
    singleAHasPets?: boolean | null; singleBHasPets?: boolean | null;
    singleAPetType?: string | null; singleBPetType?: string | null;
    singleAAcceptsPets?: boolean | null; singleBAcceptsPets?: boolean | null;
    singleALocationPref?: string | null; singleBLocationPref?: string | null;
    singleASmokingStatus?: string | null; singleBSmokingStatus?: string | null;
    singleASubscriptionEnd?: number | null; singleBSubscriptionEnd?: number | null;
    singleAEmail?: string | null; singleBEmail?: string | null;
    singleAIsActive?: boolean | null; singleBIsActive?: boolean | null;
    returnedToPoolAt?: number | null;
  }>;

  const typedTokens = (tokens as unknown) as Array<{
    id: number; token: string; note?: string | null; usedAt?: number | null;
    usedByEmail?: string | null; createdAt: number; expiresAt?: number | null;
  }>;

  // Set of single IDs currently in an active (proposed) match
  const activeMatchSingleIds = new Set<number>(
    typedMatches
      .filter(m => m.status === "proposed" && m.proposedAt && (Date.now() - (m.proposedAt as number)) < 48 * 60 * 60 * 1000)
      .flatMap(m => [m.singleAId, m.singleBId])
  );
  // Map: singleId -> active match details (partner name, days, matchId, proposedAt)
  const MATCH_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
  const activeMatchBySingleId = new Map<number, { matchId: number; opponentName: string; opponentId: number; daysInMatch: number; proposedAt: number; approvedByA: boolean | null; approvedByB: boolean | null; isA: boolean }>();
  typedMatches.filter(m => m.status === "proposed").forEach(m => {
    const daysInMatch = m.proposedAt ? Math.floor((Date.now() - (m.proposedAt as number)) / (1000 * 60 * 60 * 24)) : 0;
    activeMatchBySingleId.set(m.singleAId, { matchId: m.id, opponentName: m.singleBName || "?", opponentId: m.singleBId, daysInMatch, proposedAt: m.proposedAt as number, approvedByA: m.approvedByA, approvedByB: m.approvedByB, isA: true });
    activeMatchBySingleId.set(m.singleBId, { matchId: m.id, opponentName: m.singleAName || "?", opponentId: m.singleAId, daysInMatch, proposedAt: m.proposedAt as number, approvedByA: m.approvedByA, approvedByB: m.approvedByB, isA: false });
  });

  // Helper: check if a pending match is blocked because one/both persons are in an active proposal
  const getMatchBlockedInfo = (m: { singleAId: number; singleBId: number; id: number }) => {
    if (m.id === 0) return null; // safety
    const blockedA = activeMatchBySingleId.get(m.singleAId);
    const blockedB = activeMatchBySingleId.get(m.singleBId);
    // Only block if the active match is a DIFFERENT match (not this one)
    const aBlocked = blockedA && blockedA.matchId !== m.id;
    const bBlocked = blockedB && blockedB.matchId !== m.id;
    if (!aBlocked && !bBlocked) return null;
    const blockedPersons: Array<{ name: string; opponentName: string; hoursLeft: number }> = [];
    if (aBlocked && blockedA) {
      const elapsed = Date.now() - blockedA.proposedAt;
      const hoursLeft = Math.max(0, Math.ceil((MATCH_EXPIRY_MS - elapsed) / (1000 * 60 * 60)));
      blockedPersons.push({ name: "", opponentName: blockedA.opponentName, hoursLeft });
    }
    if (bBlocked && blockedB) {
      const elapsed = Date.now() - blockedB.proposedAt;
      const hoursLeft = Math.max(0, Math.ceil((MATCH_EXPIRY_MS - elapsed) / (1000 * 60 * 60)));
      blockedPersons.push({ name: "", opponentName: blockedB.opponentName, hoursLeft });
    }
    return { aBlocked: !!aBlocked, bBlocked: !!bBlocked, blockedPersons, maxHoursLeft: Math.max(...blockedPersons.map(p => p.hoursLeft)) };
  };
  // Map: singleId -> match history (all statuses, for showing who was already sent)
  const matchHistoryBySingleId = new Map<number, Array<{ matchId: number; opponentName: string; status: string; score?: number | null; proposedAt?: number | null; opponentPhotoUrl?: string | null }>>();
  // Only include matches that were actually SENT (proposed/matched/rejected/expired) — not pending
  typedMatches.filter(m => m.status !== "pending").forEach(m => {
    const addToHistory = (singleId: number, opponentName: string, opponentPhotoUrl: string | null | undefined) => {
      const existing = matchHistoryBySingleId.get(singleId) || [];
      existing.push({ matchId: m.id, opponentName, status: m.status, score: m.score, proposedAt: m.proposedAt as number | null, opponentPhotoUrl });
      matchHistoryBySingleId.set(singleId, existing);
    };
    addToHistory(m.singleAId, m.singleBName || "?", m.singleBPhotoUrl);
    addToHistory(m.singleBId, m.singleAName || "?", m.singleAPhotoUrl);
  });


  const activeCount = typedSingles.filter(s => s.isActive).length;
  const pendingCount = typedMatches.filter(m => m.status === "pending").length;
  const matchedCount = typedMatches.filter(m => m.status === "matched").length;

  // Match sub-tab counts
  const now14daysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  // "proposed" tab = ALL matches that were ever sent (proposedAt is set, not pending)
  // "no_match" tab = rejected OR expired only
  // Classification uses tokenAUsedAt/tokenBUsedAt to distinguish explicit rejection from no response:
  // - tokenUsedAt SET + approved=false → person clicked the link and explicitly rejected
  // - tokenUsedAt NULL + approved=false/null → person never responded (default value)
  // Categories:
  // 1. Both approved=true (matched then released) → "דחו" tab
  // 2. At least one person clicked AND rejected (tokenUsedAt set + approved=false) → "דחו" tab
  // 3. Sent (proposedAt set) but no explicit rejection by anyone → "לא ענו" tab
  const isRejected = (m: any) => {
    if (m.status !== "rejected" && m.status !== "expired") return false;
    // Case 1: Was matched (both approved) then manually released
    if (m.approvedByA === true && m.approvedByB === true) return true;
    // Case 2: At least one person explicitly rejected (clicked the link and said no)
    // "Explicitly rejected" = tokenUsedAt is set AND approved is false
    const aExplicitlyRejected = m.tokenAUsedAt && m.approvedByA === false;
    const bExplicitlyRejected = m.tokenBUsedAt && m.approvedByB === false;
    if (aExplicitlyRejected || bExplicitlyRejected) return true;
    return false;
  };
  const isNoResponse = (m: any) => {
    if (m.status !== "rejected" && m.status !== "expired") return false;
    // Must have been actually sent (proposedAt exists)
    if (!m.proposedAt) return false;
    // If both approved → not "no response" (it's a released match)
    if (m.approvedByA === true && m.approvedByB === true) return false;
    // If at least one person explicitly rejected (clicked + rejected) → goes to "דחו" not here
    const aExplicitlyRejected = m.tokenAUsedAt && m.approvedByA === false;
    const bExplicitlyRejected = m.tokenBUsedAt && m.approvedByB === false;
    if (aExplicitlyRejected || bExplicitlyRejected) return false;
    // Everything else: sent but nobody explicitly rejected
    // Includes: both ghosted, one approved but other ghosted, expired without action
    return true;
  };
  const isNoMatch = (m: any) => {
    if (m.status === "rejected") return true;
    if (m.status === "expired") return true;
    return false;
  };
  // "proposed" tab = only currently active proposals (status=proposed, within 48h)
  const isActiveProposal = (m: any) => {
    if (m.status !== "proposed") return false;
    return true; // show all proposed regardless of time (48h countdown shown in UI)
  };

  // Hide pending matches where either person is already in an active proposal (within 48h)
  const isMatchBlocked = (m: any) => {
    if (m.status !== "pending") return false;
    return activeMatchSingleIds.has(m.singleAId) || activeMatchSingleIds.has(m.singleBId);
  };

  // IDs of singles currently in a "matched" match (not just proposed)
  const matchedSingleIds = new Set<number>(
    typedMatches.filter(m => m.status === "matched" && !m.returnedToPoolAt).flatMap(m => [m.singleAId, m.singleBId])
  );

  // Pending tab: only show score >= 70, hide if either person is in active match OR already matched
  const isPendingVisible = (m: any) => {
    if (m.status !== "pending") return false;
    if (isMatchBlocked(m)) return false;
    if ((m.score ?? 0) < 70) return false;
    if (matchedSingleIds.has(m.singleAId) || matchedSingleIds.has(m.singleBId)) return false;
    return true;
  };

  const matchSubCounts = {
    pending:  typedMatches.filter(m => isPendingVisible(m)).length,
    proposed: typedMatches.filter(m => isActiveProposal(m)).length,
    matched:  typedMatches.filter(m => m.status === "matched" && !m.returnedToPoolAt).length,
    rejected: typedMatches.filter(m => isRejected(m)).length,
    no_response: typedMatches.filter(m => isNoResponse(m)).length,
    expired:  0, // merged into rejected
        followup: typedMatches.filter(m => m.status === "matched" && m.matchedAt && m.matchedAt < now14daysAgo && !m.returnedToPoolAt).length,
  };
  // Filtered matches per sub-tab
  const filterMatchByName = (m: any) => {
    if (!matchSearch.trim()) return true;
    const q = matchSearch.toLowerCase();
    return (
      (m.singleAName || "").toLowerCase().includes(q) ||
      (m.singleBName || "").toLowerCase().includes(q)
    );
  };

  const filteredMatchesBySubTab = {
    pending:  typedMatches.filter(m => isPendingVisible(m)).filter(filterMatchByName),
    proposed: typedMatches.filter(m => isActiveProposal(m)).filter(filterMatchByName),
    matched:  typedMatches.filter(m => m.status === "matched" && !m.returnedToPoolAt).filter(filterMatchByName),
    rejected: typedMatches.filter(m => isRejected(m)).filter(filterMatchByName),
    no_response: typedMatches.filter(m => isNoResponse(m)).filter(filterMatchByName),
    expired:  [],
    followup: typedMatches.filter(m => m.status === "matched" && m.matchedAt && m.matchedAt < now14daysAgo && !m.returnedToPoolAt).filter(filterMatchByName),
  };

  const baseUrl = window.location.origin;

  // Build set of singles already in active match proposals (only 'proposed' = sent to members, not 'pending' = not yet sent)
  const proposedSingleIds = new Set<number>(
    (pendingMatches as any[]).filter(m => m.status === 'proposed').flatMap((m: any) => [m.singleAId, m.singleBId])
  );

  // Filter singles by search query and optionally hide those already in active proposals
  const filteredSingles = typedSingles
    .filter(s => {
      if (hideProposed && proposedSingleIds.has(s.id)) return false;
      if (showOnlyUpdatedThisMonth) {
        const updAt = (s as any).updatedAt;
        if (!updAt) return false;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (updAt < startOfMonth) return false;
      }
      if (!singlesSearch.trim()) return true;
      const q = singlesSearch.toLowerCase();
      const fullName = `${s.firstName} ${s.lastName || ""}`.toLowerCase();
      return fullName.includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").includes(q) ||
        (s.city || "").toLowerCase().includes(q);
    });

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Photo Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => { if (!open) setLightboxUrl(null); }}>
        <DialogContent className="max-w-2xl bg-black border-0 p-2" showCloseButton>
          <DialogTitle className="sr-only">תמונה מוגדלת</DialogTitle>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="תמונה מוגדלת"
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Single Modal */}
      {editingSingleId && (() => {
        const single = singles.find((s: any) => s.id === editingSingleId);
        if (!single) return null;
        return (
          <EditSingleModal
            single={single}
            onClose={() => setEditingSingleId(null)}
            onSave={(data) => {
              updateSingleInline.mutate(data, {
                onSuccess: () => setEditingSingleId(null),
              });
            }}
            isPending={updateSingleInline.isPending}
          />
        );
      })()}

      {/* Header */}
      <div className="bg-[#191265] text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold">💛 ניהול מאגר הרווקים</h1>
            <p className="text-white/60 text-xs">{activeCount} פעילים · {pendingCount} ממתינים לאישור · {matchedCount} התאמות</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => runMatching.mutate()}
              disabled={runMatching.isPending}
              className="h-8 text-xs bg-[#ffe27c] text-[#191265] hover:bg-[#ffd84a] font-bold border-0"
            >
              <Zap size={12} className="ml-1" />
              {runMatching.isPending ? "מריץ..." : "הרץ אלגוריתם"}
            </Button>
            <Button
              size="sm"
              onClick={() => refreshMatchScores.mutate()}
              disabled={refreshMatchScores.isPending}
              title="רענן ציוני שאלון להתאמות ישנות"
              className="h-8 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30 border"
            >
              {refreshMatchScores.isPending ? "מחשב..." : "📊 רענן ציוני שאלון"}
            </Button>
            <a href="/crm">
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20">
                ← CRM
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "חברי מאגר", value: typedSingles.length, icon: "👥", color: "text-[#191265]" },
            { label: "פעילים", value: activeCount, icon: "✅", color: "text-green-600" },
            { label: "ממתינים לאישור", value: pendingCount, icon: "⏳", color: "text-amber-600" },
            { label: "התאמות הצליחו", value: matchedCount, icon: "💛", color: "text-rose-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-lg">{s.icon}</div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#727272]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 shadow-sm">
          {[
            { id: "singles" as const, label: "חברי המאגר", icon: <Users size={14} /> },
            { id: "matches" as const, label: `התאמות (${pendingCount} ממתינות)`, icon: <Heart size={14} /> },
            { id: "unmatched" as const, label: "ללא התאמה", icon: <Clock size={14} /> },
            { id: "inactive_leads" as const, label: "לידים מאגר", icon: <span>💰</span> },
            { id: "tokens" as const, label: "טוקנים חינמיים", icon: <Gift size={14} /> },
            { id: "missing_data" as const, label: "חסרי נתונים ⚠️", icon: <span>🔧</span> },
            { id: "update_requests" as const, label: `בקשות עדכון (${updateRequests.length})`, icon: <span>✏️</span> },
            { id: "compatibility" as const, label: "בדיקת התאמה 🔍", icon: <Zap size={14} /> },
            { id: "filter_search" as const, label: "חיפוש מתקדם 🔎", icon: <Search size={14} /> },
            { id: "inactive" as const, label: "לא פעילים", icon: <span>🚫</span> },
            { id: "dashboard" as const, label: "דאשבורד 📊", icon: <BarChart3 size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-[#191265] text-white shadow"
                  : "text-[#727272] hover:text-[#191265]"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Singles Tab */}
        {activeTab === "singles" && (
          <div className="space-y-2">
            {/* Search bar + hide proposed toggle */}
            <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2">
              <Search size={16} className="text-[#727272] flex-shrink-0" />
              <input
                type="text"
                value={singlesSearch}
                onChange={e => setSinglesSearch(e.target.value)}
                placeholder="חיפוש לפי שם, עיר, אימייל או טלפון..."
                className="flex-1 text-sm bg-transparent outline-none text-[#191265] placeholder-[#727272]"
                dir="rtl"
              />
              {singlesSearch && (
                <button onClick={() => setSinglesSearch("")} className="text-[#727272] hover:text-[#191265]">
                  <X size={14} />
                </button>
              )}
              <button
                onClick={() => setHideProposed(v => !v)}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded-full border transition-colors ${
                  hideProposed
                    ? "bg-[#191265] text-white border-[#191265]"
                    : "bg-white text-[#727272] border-gray-300 hover:border-[#191265]"
                }`}
                title={hideProposed ? "מציג רק מי שאין לו התאמה פעילה" : "מציג את כולם"}
              >
                {hideProposed ? `🔍 ללא הצעה פעילה (${filteredSingles.length})` : `👥 הכל (${filteredSingles.length})`}
              </button>
              <button
                onClick={() => setShowOnlyUpdatedThisMonth(v => !v)}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded-full border transition-colors ${
                  showOnlyUpdatedThisMonth
                    ? "bg-[#191265] text-white border-[#191265]"
                    : "bg-white text-[#727272] border-gray-300 hover:border-[#191265]"
                }`}
                title={showOnlyUpdatedThisMonth ? "מציג רק מי שעודכן החודש" : "סנן לפי עדכון אחרון"}
              >
                {showOnlyUpdatedThisMonth ? "📅 עודכנו החודש" : "📅 עודכנו החודש"}
              </button>
            </div>

            {filteredSingles.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                <div className="text-4xl mb-2">👥</div>
                <p>{singlesSearch ? "לא נמצאו תוצאות לחיפוש" : "אין חברים במאגר עדיין"}</p>
              </div>
            )}
            {filteredSingles.map(single => (
              <div key={single.id} className={`rounded-xl p-4 shadow-sm border-r-4 ${(single as any).isCoachingClient ? "bg-pink-50 border-pink-400 ring-1 ring-pink-200" : single.isActive ? "bg-white border-green-400" : "bg-white border-gray-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Clickable photo thumbnail */}
                      {single.photoUrl && (
                        <button
                          onClick={() => setLightboxUrl(single.photoUrl!)}
                          className="flex-shrink-0 focus:outline-none"
                          title="הגדל תמונה"
                        >
                          <img
                            src={single.photoUrl}
                            alt={single.firstName}
                            className="w-8 h-8 rounded-full object-cover object-[center_20%] border-2 border-[#191265]/20 hover:border-[#ffe27c] transition-all cursor-zoom-in"
                          />
                        </button>
                      )}
                      <span className="font-bold text-[#191265]">{single.firstName} {single.lastName || ""}</span>
                      {(single as any).isCoachingClient && <span className="text-[9px] bg-pink-200 text-pink-800 font-bold px-1.5 py-0.5 rounded-full">💜 מלווה</span>}
                      {(single as any).isNotBasic && <span className="text-[9px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">⭐ דורש תשומת לב</span>}
                      {((nonResponseCounts as Record<number, number>)[single.id] ?? 0) >= 3 && (
                        <span className="text-[9px] bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded-full" title={`לא ענה ${(nonResponseCounts as Record<number, number>)[single.id]} פעמים`}>
                          🚨 לא עונה ({(nonResponseCounts as Record<number, number>)[single.id]})
                        </span>
                      )}
                      <Badge className="text-xs bg-[#191265]/10 text-[#191265]">{GENDER_LABELS[single.gender] || single.gender}</Badge>
                      <span className="text-sm text-[#727272]">{displayAge(single.age)}</span>
                      {single.city && <span className="text-sm text-[#727272]">📍 {single.city}</span>}
                      {single.dnaType && <Badge className="text-xs bg-[#ffe27c]/50 text-[#191265]">{DNA_LABELS[single.dnaType] || single.dnaType}</Badge>}
                      {single.occupation && <span className="text-xs text-[#727272]">💼 {single.occupation}</span>}
                      {activeMatchBySingleId.has(single.id) && (() => {
                        const am = activeMatchBySingleId.get(single.id)!;
                        return (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              📨 בהתאמה פעילה עם {am.opponentName}
                            </span>
                            <span className="text-xs text-blue-600">({am.daysInMatch} ימים)</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (window.confirm(`לשחרר את ${am.opponentName} מההתאמה?`)) releaseFromMatch.mutate({ matchId: am.matchId }); }}
                              disabled={releaseFromMatch.isPending}
                              className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              🔓 שחרר מהתאמה
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-[#727272]">
                      {single.email && <span>✉️ {single.email}</span>}
                      {single.phone && <span>📞 {single.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCoachingClient.mutate({ id: single.id }); }}
                      disabled={toggleCoachingClient.isPending}
                      className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                        (single as any).isCoachingClient
                          ? "bg-pink-200 text-pink-800 hover:bg-pink-300"
                          : "bg-gray-100 text-gray-500 hover:bg-pink-100 hover:text-pink-700"
                      }`}
                      title={(single as any).isCoachingClient ? "הסר סימון מלווה" : "סמן כמלווה"}
                    >
                      {(single as any).isCoachingClient ? "💜 מלווה" : "💜"}
                    </button>
                    <button
                      onClick={() => toggleNotBasic.mutate({ id: single.id })}
                      disabled={toggleNotBasic.isPending}
                      className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-all ${
                        (single as any).isNotBasic
                          ? "bg-purple-200 text-purple-800 hover:bg-purple-300"
                          : "bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700"
                      }`}
                      title={(single as any).isNotBasic ? "הסר סימון דורש תשומת לב" : "סמן כדורש תשומת לב"}
                    >
                      {(single as any).isNotBasic ? "⭐ דורש תשומת לב" : "⭐"}
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ singleId: single.id, isActive: !single.isActive })}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                        single.isActive
                          ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                          : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                      }`}
                    >
                      {single.isActive ? "✅ פעיל" : "⏸ לא פעיל"}
                    </button>
                    <button
                      onClick={() => setSelectedSingle(selectedSingle === single.id ? null : single.id)}
                      className="text-xs text-[#191265] underline"
                    >
                      {selectedSingle === single.id ? "סגור" : "פרטים"}
                    </button>
                  </div>
                </div>
                {selectedSingle === single.id && (
                  <div className="mt-3 pt-3 border-t border-[#e9e8e8]">
                    <div className="flex gap-4">
                      {/* Clickable Photo */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        {single.photoUrl ? (
                          <button
                            onClick={() => setLightboxUrl(single.photoUrl!)}
                            className="focus:outline-none"
                            title="הגדל תמונה"
                          >
                            <img
                              src={single.photoUrl}
                              alt={single.firstName}
                              className="w-20 h-20 rounded-xl object-cover object-[center_20%] border-2 border-[#191265]/20 hover:border-[#ffe27c] transition-all cursor-zoom-in"
                            />
                          </button>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <span className="text-xs text-[#191265] underline hover:text-[#ffe27c] transition-colors">
                            {single.photoUrl ? "החלף תמונה" : "העלה תמונה"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                updatePhotoMutation.mutate({ singleId: single.id, photoBase64: base64, photoMime: file.type });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {updatePhotoMutation.isPending && photoUploadSingleId === single.id && (
                          <span className="text-xs text-[#727272]">מעלה...</span>
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-[#727272]">
                        <div><span className="font-semibold text-[#191265]">נרשם:</span> {new Date(typeof single.createdAt === 'number' ? single.createdAt : (single.createdAt as Date)).toLocaleDateString("he-IL")}</div>
                        <div><span className="font-semibold text-[#191265]">ID:</span> {single.id}</div>
                        {single.height && <div><span className="font-semibold text-[#191265]">גובה:</span> {single.height} ס"מ</div>}
                        {single.education && <div><span className="font-semibold text-[#191265]">השכלה:</span> {EDUCATION_LABELS[single.education] || single.education}</div>}
                        {single.religiosity && <div><span className="font-semibold text-[#191265]">דת:</span> {RELIGIOSITY_LABELS[single.religiosity] || single.religiosity}</div>}
                        {single.maritalStatus && <div><span className="font-semibold text-[#191265]">מצב משפחתי:</span> {MARITAL_LABELS[single.maritalStatus] || single.maritalStatus}</div>}
                        {(() => {
                          const hasKids = single.hasKids ?? single.hasChildren;
                          const numKids = single.numKids ?? single.numberOfChildren;
                          return <div><span className="font-semibold text-[#191265]">ילדים:</span> {hasKids ? `יש${numKids ? ` (${numKids})` : ""}` : "אין"}</div>;
                        })()}
                        {(() => {
                          const wants = single.wantsKids ?? single.wantsChildren;
                          const WANTS: Record<string, string> = { yes: "רוצה ילדים", no: "לא רוצה ילדים", open: "פתוח/ה לנושא", maybe: "אולי" };
                          return <div><span className="font-semibold text-[#191265]">רוצה ילדים:</span> {wants ? (WANTS[wants] || wants) : "לא צוין"}</div>;
                        })()}
                        {single.seekingGender && <div><span className="font-semibold text-[#191265]">מחפש/ת:</span> {single.seekingGender === 'male' ? 'גבר' : single.seekingGender === 'female' ? 'אישה' : 'לא משנה'}</div>}
                        {single.dnaType && <div><span className="font-semibold text-[#191265]">DNA:</span> {DNA_LABELS[single.dnaType] || single.dnaType}</div>}
                      </div>
                    </div>
                    {(single.about || single.aboutMe) && (
                      <div className="mt-2 text-sm">
                        <span className="font-semibold text-[#191265]">על עצמי:</span>
                        <p className="text-[#727272] mt-0.5">{single.about || single.aboutMe}</p>
                      </div>
                    )}
                    {single.partnerDescription && (
                      <div className="mt-2 text-sm">
                        <span className="font-semibold text-[#191265]">מחפש/ת בן/בת זוג:</span>
                        <p className="text-[#727272] mt-0.5">{single.partnerDescription}</p>
                      </div>
                    )}

                    {/* Admin Notes - internal only */}
                    <AdminNotesField singleId={single.id} />

                    {/* Edit button */}
                    <div className="mt-3 pt-3 border-t border-[#e9e8e8]">
                      <button
                        onClick={() => setEditingSingleId(single.id)}
                        className="inline-flex items-center gap-1.5 bg-[#191265] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#1800ad] transition-colors"
                      >
                        ✏️ ערוך כל הפרטים
                      </button>
                    </div>

                    {/* Top Matches Panel with pagination */}
                    {(() => {
                      const page = topMatchesPage[single.id] ?? 0;
                      const allTop = topMatches as any[];
                      const pageMatches = allTop.slice(page * 3, page * 3 + 3);
                      const hasNext = allTop.length > (page + 1) * 3;
                      const hasPrev = page > 0;
                      const startIdx = page * 3;
                      return (
                        <div className="mt-4 pt-3 border-t border-[#e9e8e8]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-[#191265]">💛 {allTop.length > 0 ? `התאמות מובילות (#${startIdx + 1}–${Math.min(startIdx + 3, allTop.length)} מתוך ${allTop.length})` : "3 ההתאמות המובילות"}</p>
                            {allTop.length > 3 && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setTopMatchesPage(prev => ({ ...prev, [single.id]: page - 1 }))}
                                  disabled={!hasPrev}
                                  className="text-[10px] bg-[#191265] text-white px-2 py-1 rounded-lg disabled:opacity-30"
                                >→ קודם</button>
                                <button
                                  onClick={() => setTopMatchesPage(prev => ({ ...prev, [single.id]: page + 1 }))}
                                  disabled={!hasNext}
                                  className="text-[10px] bg-[#191265] text-white px-2 py-1 rounded-lg disabled:opacity-30"
                                >← הבאות</button>
                              </div>
                            )}
                          </div>
                          {topMatchesLoading ? (
                            <p className="text-xs text-[#727272]">טוען...</p>
                          ) : (
                            <>
                              {allTop.length === 0 && (
                                <p className="text-xs text-[#727272] mb-2">אין התאמות עדיין</p>
                              )}
                              {pageMatches.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  {pageMatches.map((m: any, idx: number) => (
                                    <div key={m.matchId} className="bg-[#f8f6f0] rounded-xl p-3 text-center relative">
                                      <div className="absolute top-1.5 right-1.5 bg-[#ffe27c] text-[#191265] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                        #{startIdx + idx + 1}
                                      </div>
                                      {m.opponent?.photoUrl ? (
                                        <button
                                          onClick={() => setLightboxUrl(m.opponent.photoUrl)}
                                          className="focus:outline-none"
                                          title="הגדל תמונה"
                                        >
                                          <img
                                            src={m.opponent.photoUrl}
                                            alt={m.opponent.name}
                                            className="w-14 h-14 rounded-xl object-cover object-[center_20%] mx-auto mb-1.5 border-2 border-[#191265]/10 hover:border-[#ffe27c] transition-all cursor-zoom-in"
                                          />
                                        </button>
                                      ) : (
                                        <div className="w-14 h-14 rounded-xl bg-[#191265]/10 flex items-center justify-center mx-auto mb-1.5 text-2xl">
                                          {m.opponent?.gender === "female" ? "👩" : "👨"}
                                        </div>
                                      )}
                                      <p className="text-xs font-bold text-[#191265] truncate">{m.opponent?.name || `#${m.opponent?.id}`}</p>
                                      <p className="text-[10px] text-[#727272]">{displayAge(m.opponent?.age)} · {m.opponent?.city || ""}{m.opponent?.height ? ` · ${m.opponent.height} ס"מ` : ''}</p>
                                      <div className="text-[9px] text-[#727272] mt-0.5">
                                        {m.opponent?.maritalStatus && <span>{MARITAL_LABELS[m.opponent.maritalStatus] || m.opponent.maritalStatus}</span>}
                                        {m.opponent?.religiosity && <span> · {RELIGIOSITY_LABELS[m.opponent.religiosity] || m.opponent.religiosity}</span>}
                                        {m.opponent?.education && <span> · {EDUCATION_LABELS[m.opponent.education] || m.opponent.education}</span>}
                                      </div>
                                      <div className="text-[9px] text-[#727272]">
                                        {m.opponent?.hasKids != null && <span>{m.opponent.hasKids ? `ילדים${m.opponent.numKids ? ` (${m.opponent.numKids})` : ''}` : 'אין ילדים'}</span>}
                                        {m.opponent?.wantsKids && <span> · {m.opponent.wantsKids === 'yes' ? 'רוצה ילדים' : m.opponent.wantsKids === 'no' ? 'לא רוצה' : 'פתוח'}</span>}
                                      </div>
                                      {m.opponent?.occupation && <p className="text-[9px] text-[#727272]">💼 {m.opponent.occupation}</p>}
                                      {m.opponent?.dnaType && (
                                        <p className="text-[10px] text-[#1800ad] font-medium">🧬 {DNA_LABELS[m.opponent.dnaType] || m.opponent.dnaType}</p>
                                      )}
                                      {m.opponent?.about && (
                                        <p className="text-[9px] text-[#555] mt-0.5" title={m.opponent.about}>על עצמי: {m.opponent.about.length > 50 ? m.opponent.about.substring(0, 50) + '...' : m.opponent.about}</p>
                                      )}
                                      {m.opponent?.partnerDescription && (
                                        <p className="text-[9px] text-[#555]" title={m.opponent.partnerDescription}>מחפש/ת: {m.opponent.partnerDescription.length > 50 ? m.opponent.partnerDescription.substring(0, 50) + '...' : m.opponent.partnerDescription}</p>
                                      )}
                                      <div className="mt-1.5 bg-[#ffe27c] text-[#191265] font-black text-xs px-2 py-0.5 rounded-full inline-block">
                                        {Math.round(m.score)}%
                                      </div>
                                      {(m.status === "proposed" || m.status === "matched" || m.status === "rejected" || m.status === "expired") && (
                                        <div className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-full inline-block font-bold ${
                                          m.status === "matched" ? "bg-green-100 text-green-700" :
                                          m.status === "proposed" ? "bg-blue-100 text-blue-700" :
                                          (m.status === "rejected" && m.approvedByA === true && m.approvedByB === true) ? "bg-purple-100 text-purple-700" :
                                          (m.status === "rejected" || m.status === "expired") ? "bg-orange-100 text-orange-600" :
                                          "bg-red-100 text-red-600"
                                        }`}>
                                          {m.status === "proposed" ? "📨 כבר נשלחה" :
                                           m.status === "matched" ? "💛 התאמה!" :
                                           (m.status === "rejected" && m.approvedByA === true && m.approvedByB === true) ? "🔓 שוחרר" :
                                           m.status === "expired" ? "⌛ פג תוקף" :
                                           (m.approvedByA === true && m.approvedByB === true) ? "🔓 שוחרר" :
                                           "❌ נדחה"}
                                        </div>
                                      )}
                                      {m.opponent?.phone && (
                                        <div className="mt-1 text-[10px] text-[#727272]">📱 {m.opponent.phone}</div>
                                      )}
                                      {(m.status === "pending" || m.status === "expired") && (
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`לשלוח התאמה בין ${m.selectedSingle?.name || ""} ל-${m.opponent?.name || ""}?`)) {
                                              approveMatch.mutate({ matchId: m.matchId, hilitsNote: "" });
                                            }
                                          }}
                                          disabled={approveMatch.isPending}
                                          className="mt-2 w-full bg-[#191265] text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-[#1800ad] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                          <Send size={10} />
                                          שלח התאמה
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {allTop.length < 3 && (
                                <button
                                  onClick={() => runMatchingForSingle.mutate({ singleId: selectedSingle! })}
                                  disabled={runMatchingForSingle.isPending}
                                  className="text-xs bg-[#191265] text-white px-3 py-1.5 rounded-lg hover:bg-[#1800ad] transition-colors disabled:opacity-50 w-full"
                                >
                                  {runMatchingForSingle.isPending ? "מריץ..." : `⚡ הרץ אלגוריתם עבור רווק/ה זו (${allTop.length}/3 התאמות)`}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
                    {/* Match History — only sent matches (proposed/matched/rejected/expired) */}
                    {matchHistoryBySingleId.has(single.id) && (matchHistoryBySingleId.get(single.id) || []).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#e9e8e8]">
                        <p className="text-xs font-bold text-[#191265] mb-2">📋 היסטוריית התאמות שנשלחו:</p>
                        <div className="space-y-2">
                          {(matchHistoryBySingleId.get(single.id) || []).map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-[#f8f6f0] rounded-lg px-2 py-1.5">
                              {/* Photo */}
                              {h.opponentPhotoUrl ? (
                                <img src={h.opponentPhotoUrl} alt={h.opponentName} className="w-8 h-8 rounded-lg object-cover object-[center_20%] flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#191265]/10 flex items-center justify-center flex-shrink-0 text-base">👤</div>
                              )}
                              {/* Name + score */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#191265] truncate">{h.opponentName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {h.score != null && (
                                    <span className="bg-[#ffe27c] text-[#191265] font-black text-[10px] px-1.5 py-0.5 rounded-full">{Math.round(h.score)}%</span>
                                  )}
                                  {h.proposedAt && (
                                    <span className="text-[#727272] text-[10px]">{new Date(h.proposedAt as number).toLocaleDateString("he-IL")}</span>
                                  )}
                                </div>
                              </div>
                              {/* Status badge */}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                                h.status === "proposed" ? "bg-blue-100 text-blue-700" :
                                h.status === "matched" ? "bg-green-100 text-green-700" :
                                h.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {h.status === "proposed" ? "📨 נשלחה" : h.status === "matched" ? "💚 זוג" : h.status === "rejected" ? "❌ לא התאמה" : h.status === "expired" ? "⏰ פג תוקף" : h.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === "matches" && (
          <div className="space-y-3">
            {/* Search bar */}
            <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2">
              <Search size={16} className="text-[#727272] flex-shrink-0" />
              <input
                type="text"
                value={matchSearch}
                onChange={e => setMatchSearch(e.target.value)}
                placeholder="חיפוש לפי שם..."
                className="flex-1 text-sm bg-transparent outline-none text-[#191265] placeholder-[#727272]"
                dir="rtl"
              />
              {matchSearch && (
                <button onClick={() => setMatchSearch("")} className="text-[#727272] hover:text-[#191265]">
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm overflow-x-auto">
              {([
                { id: "pending"  as const, label: "ממתין לשליחה",    icon: "⏳", count: matchSubCounts.pending },
                { id: "proposed" as const, label: "נשלחו הצעות",      icon: "📨", count: matchSubCounts.proposed },
                { id: "matched"  as const, label: "יש התאמה",        icon: "💛", count: matchSubCounts.matched },
                { id: "rejected" as const, label: "דחו",             icon: "❌", count: matchSubCounts.rejected },
                { id: "no_response" as const, label: "לא ענו",       icon: "🚨", count: matchSubCounts.no_response },
                { id: "followup" as const, label: "מעקב אחרי התאמה", icon: "🔔", count: matchSubCounts.followup },
              ] as const).map(st => (
                <button
                  key={st.id}
                  onClick={() => setMatchSubTab(st.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    matchSubTab === st.id
                      ? "bg-[#191265] text-white shadow"
                      : "text-[#727272] hover:text-[#191265]"
                  }`}
                >
                  {st.icon} {st.label}
                  {st.count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      matchSubTab === st.id ? "bg-white/20 text-white" : "bg-[#f0eadc] text-[#191265]"
                    }`}>{st.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab descriptions */}
            {matchSubTab === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                ⏳ <strong>ממתין לשליחה</strong> — התאמות שנוצרו על ידי האלגוריתם ועדיין לא נשלחו לרווקים. לחצי "שלח הצעה" כדי לשלוח.
              </div>
            )}
            {matchSubTab === "proposed" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                📨 <strong>נשלחו הצעות</strong> — כל ההצעות שנשלחו אי פעם לרווקים. ניתן לראות את הסטטוס של כל הצעה — ממתינה, אושרה, נדחתה או פגה.
              </div>
            )}
            {matchSubTab === "matched" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                💛 <strong>יש התאמה</strong> — שני הצדדים אישרו! פרטי הקשר נחשפו.
              </div>
            )}
            {matchSubTab === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                ❌ <strong>דחו</strong> — התאמות שלפחות אחד מהצדדים דחה במפורש.
              </div>
            )}
            {matchSubTab === "no_response" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
                🚨 <strong>לא ענו</strong> — התאמות שפג תוקפן בלי שאף צד דחה במפורש — פשוט לא הגיבו.
              </div>
            )}
            {matchSubTab === "followup" && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
                🔔 <strong>מעקב אחרי התאמה</strong> — התאמות שהצליחו לפני 14+ יום. כדאי לשאול איך הייתה הפגישה!
              </div>
            )}

            {filteredMatchesBySubTab[matchSubTab].length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                <div className="text-4xl mb-2">
                  {matchSubTab === "pending" ? "⏳" : matchSubTab === "proposed" ? "📨" : matchSubTab === "matched" ? "💛" : matchSubTab === "rejected" ? "❌" : matchSubTab === "expired" ? "⌛" : "🔔"}
                </div>
                <p>אין התאמות בקטגוריה זו</p>
                {matchSubTab === "pending" && (
                  <Button
                    onClick={() => runMatching.mutate()}
                    disabled={runMatching.isPending}
                    className="mt-4 bg-[#ffe27c] text-[#191265] hover:bg-[#ffd84a] font-bold"
                  >
                    <Zap size={14} className="ml-1" />
                    {runMatching.isPending ? "מריץ..." : "הרץ אלגוריתם עכשיו"}
                  </Button>
                )}
              </div>
            )}
            {filteredMatchesBySubTab[matchSubTab].map(match => {
              // Determine display status badge based on actual match outcome
              let displayStatus = match.status;
              if (match.status === 'rejected' || match.status === 'expired') {
                const aExplicit = match.tokenAUsedAt && match.approvedByA === false;
                const bExplicit = match.tokenBUsedAt && match.approvedByB === false;
                if (match.approvedByA === true && match.approvedByB === true && match.returnedToPoolAt) {
                  displayStatus = 'released'; // Was matched then manually released
                } else if (aExplicit || bExplicit) {
                  displayStatus = 'rejected'; // Someone explicitly rejected
                } else {
                  displayStatus = 'expired'; // No explicit rejection → show as "פג תוקף"
                }
              }
              const EXTENDED_STATUS: Record<string, { label: string; color: string; icon: string }> = {
                ...MATCH_STATUS_CONFIG,
                released: { label: "שוחרר", color: "bg-purple-100 text-purple-800", icon: "🔓" },
              };
              const cfg = EXTENDED_STATUS[displayStatus] || MATCH_STATUS_CONFIG.pending;
              const isExpanded = expandedMatch === match.id;


              // Per-person status helper
              const getPersonStatus = (isA: boolean) => {
                const emailOpened = isA ? match.emailAOpenedAt : match.emailBOpenedAt;
                const tokenUsed = isA ? match.tokenAUsedAt : match.tokenBUsedAt;
                const approved = isA ? match.approvedByA : match.approvedByB;
                const isProposed = match.status === "proposed" || match.status === "matched" || match.status === "expired" || match.status === "rejected";
                if (!isProposed) return null;
                if (match.status === "matched") return { icon: "❤️", label: "אישרו: התאמה!", color: "bg-green-100 text-green-800" };
                // Explicitly rejected: clicked the link AND chose to reject
                if (tokenUsed && approved === false) return { icon: "❌", label: "דחה/תה", color: "bg-red-100 text-red-700" };
                if (approved === true) return { icon: "✅", label: "אישר/ה", color: "bg-emerald-100 text-emerald-800" };
                // For expired/rejected matches: if they never clicked, show "no response"
                if (match.status === "expired" || match.status === "rejected") {
                  if (!tokenUsed) return { icon: "⏰", label: "לא ענה", color: "bg-orange-100 text-orange-700" };
                  // tokenUsed but approved=false without explicit click? (edge case - default value)
                  return { icon: "⏰", label: "לא ענה", color: "bg-orange-100 text-orange-700" };
                }
                if (tokenUsed) return { icon: "👀", label: "צפה, טרם השיב/ה", color: "bg-amber-100 text-amber-800" };
                if (emailOpened) return { icon: "📧", label: "פתח מייל, טרם השיב/ה", color: "bg-blue-100 text-blue-700" };
                return { icon: "⏳", label: "לא פתח מייל", color: "bg-gray-100 text-gray-500" };
              };

              const statusA = getPersonStatus(true);
              const statusB = getPersonStatus(false);

              const wantsKidsLabel: Record<string, string> = { yes: "רוצה ילדים", no: "לא רוצה ילדים", open: "פתוח לנושא" };

              const persons = [
                {
                  name: match.singleAName, gender: match.singleAGender, city: match.singleACity,
                  age: match.singleAAge, dna: match.singleADna, occ: match.singleAOccupation,
                  phone: match.singleAPhone, photo: match.singleAPhotoUrl, education: match.singleAEducation,
                  hasKids: match.singleAHasKids, numKids: match.singleANumKids, wantsKids: match.singleAWantsKids,
                  religiosity: match.singleAReligiosity, about: match.singleAAbout,
                  height: match.singleAHeight, minAge: match.singleAMinAge, maxAge: match.singleAMaxAge,
                  partnerDesc: match.singleAPartnerDesc,
                  personStatus: statusA, isA: true, id: match.singleAId,
                  maritalStatus: match.singleAMaritalStatus, shomerShabbat: match.singleAShomerShabbat,
                  hasPets: match.singleAHasPets, petType: match.singleAPetType, acceptsPets: match.singleAAcceptsPets,
                  locationPref: match.singleALocationPref, smokingStatus: match.singleASmokingStatus,
                  subscriptionEnd: match.singleASubscriptionEnd, email: match.singleAEmail, isActive: match.singleAIsActive,
                  isCoachingClient: (match as any).singleAIsCoachingClient, isNotBasic: (match as any).singleAIsNotBasic, updatedAt: (match as any).singleAUpdatedAt,
                },
                {
                  name: match.singleBName, gender: match.singleBGender, city: match.singleBCity,
                  age: match.singleBAge, dna: match.singleBDna, occ: match.singleBOccupation,
                  phone: match.singleBPhone, photo: match.singleBPhotoUrl, education: match.singleBEducation,
                  hasKids: match.singleBHasKids, numKids: match.singleBNumKids, wantsKids: match.singleBWantsKids,
                  religiosity: match.singleBReligiosity, about: match.singleBAbout,
                  height: match.singleBHeight, minAge: match.singleBMinAge, maxAge: match.singleBMaxAge,
                  partnerDesc: match.singleBPartnerDesc,
                  personStatus: statusB, isA: false, id: match.singleBId,
                  maritalStatus: match.singleBMaritalStatus, shomerShabbat: match.singleBShomerShabbat,
                  hasPets: match.singleBHasPets, petType: match.singleBPetType, acceptsPets: match.singleBAcceptsPets,
                  locationPref: match.singleBLocationPref, smokingStatus: match.singleBSmokingStatus,
                  subscriptionEnd: match.singleBSubscriptionEnd, email: match.singleBEmail, isActive: match.singleBIsActive,
                  isCoachingClient: (match as any).singleBIsCoachingClient, isNotBasic: (match as any).singleBIsNotBasic, updatedAt: (match as any).singleBUpdatedAt,
                },
              ];

              const hasCoachingClient = (match as any).singleAIsCoachingClient || (match as any).singleBIsCoachingClient;

              return (
                <div key={match.id} className={`rounded-xl shadow-sm overflow-hidden ${hasCoachingClient ? "bg-pink-50 border border-pink-200 ring-1 ring-pink-100" : "bg-white border border-gray-100"}`}>
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {match.score != null && (
                          <div className="inline-flex items-center gap-1 bg-[#ffe27c] text-[#191265] font-black px-3 py-1 rounded-full text-sm">
                            💛 {Math.round(match.score)}%
                          </div>
                        )}
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.icon} {cfg.label}</Badge>
                        <span className="text-sm font-semibold text-[#191265]">
                          {match.singleAName} + {match.singleBName}
                        </span>
                      </div>
                      {/* Per-side status row — visible without expanding */}
                      {(match.status === "proposed" || match.status === "expired" || match.status === "rejected") && (statusA || statusB) && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {statusA && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusA.color}`}>
                              {statusA.icon} {match.singleAName?.split(" ")[0]}: {statusA.label}
                            </span>
                          )}
                          {statusB && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusB.color}`}>
                              {statusB.icon} {match.singleBName?.split(" ")[0]}: {statusB.label}
                            </span>
                          )}
                        </div>
                      )}
                      {/* "What they seek" summary — visible in collapsed state */}
                      {!isExpanded && (
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#555]">
                          {persons.map((s, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1">
                              <span className="font-bold text-[#191265]">{(s.name as string)?.split(' ')[0]}:</span>
                              {s.age && <span>{displayAge(s.age as number)}</span>}
                              {s.height && <span>· {s.height} ס"מ</span>}
                              {s.maritalStatus && <span>· {MARITAL_LABELS[s.maritalStatus as string] || s.maritalStatus}</span>}
                              {s.wantsKids && <span>· {(s.wantsKids as string) === 'yes' ? '👶 כן' : (s.wantsKids as string) === 'no' ? '👶 לא' : '👶 פתוח'}</span>}
                              {(s.minAge || s.maxAge) && <span>· מחפש {s.minAge || '?'}-{s.maxAge || '?'}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick send button visible in collapsed state for pending matches */}
                      {match.status === "pending" && !isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`לשלוח התאמה בין ${match.singleAName} ל-${match.singleBName}?`)) {
                              approveMatch.mutate({ matchId: match.id, hilitsNote: undefined });
                            }
                          }}
                          disabled={approveMatch.isPending}
                          className="bg-[#ffe27c] text-[#191265] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#ffd84a] transition-colors disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                        >
                          <Send size={12} />שלח התאמה
                        </button>
                      )}
                      {/* 48h countdown for proposed matches */}
                      {match.status === "proposed" && match.proposedAt && (() => {
                        const elapsed = Date.now() - Number(match.proposedAt);
                        const remaining = 48 * 60 * 60 * 1000 - elapsed;
                        if (remaining <= 0) return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">⏰ פג תוקף</span>;
                        const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
                        const minsLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                        return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hoursLeft < 12 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>⏱ {hoursLeft}:{String(minsLeft).padStart(2, '0')} שעות</span>;
                      })()}
                      <span className="text-xs text-[#727272]">
                        {new Date(match.proposedAt ? Number(match.proposedAt) : (typeof match.createdAt === 'number' ? match.createdAt : match.createdAt)).toLocaleDateString("he-IL")}
                      </span>
                      <span className="text-[#727272] text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4">
                      {/* Two profile cards side by side */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {persons.map((s, i) => (
                          <div key={i} className={`rounded-xl p-3 ${(s as any).isCoachingClient ? 'bg-pink-50 ring-1 ring-pink-200' : 'bg-[#f8f6f0]'}`}>
                            {/* Photo + name */}
                            <div className="flex items-start gap-3 mb-2">
                              {s.photo ? (
                                <button
                                  onClick={() => setLightboxUrl(s.photo!)}
                                  className="focus:outline-none flex-shrink-0"
                                  title="הגדל תמונה"
                                >
                                  <img
                                    src={s.photo}
                                    alt={s.name || ""}
                                    className="w-16 h-16 rounded-xl object-cover object-[center_20%] border-2 border-[#191265]/20 hover:border-[#ffe27c] transition-all cursor-zoom-in"
                                  />
                                </button>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-[#191265]/10 flex items-center justify-center flex-shrink-0 text-2xl">
                                  {s.gender === "female" ? "👩" : "👨"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#191265] text-sm truncate">
                                  {s.name || `#${s.id}`}
                                  {(s as any).isCoachingClient && <span className="ml-1 text-[9px] bg-pink-200 text-pink-800 font-bold px-1.5 py-0.5 rounded-full">💜 מלווה</span>}
                                  {(s as any).isNotBasic && <span className="ml-1 text-[9px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">⭐ דורש תשומת לב</span>}
                                </p>
                                <p className="text-xs text-[#727272]">{s.gender ? GENDER_LABELS[s.gender] : ""} · {displayAge(s.age)} · {s.city}</p>
                                {s.dna && <p className="text-xs text-[#1800ad] font-medium">{DNA_LABELS[s.dna] || s.dna}</p>}
                              </div>
                            </div>
                            {/* Details */}
                            <div className="space-y-1 text-xs text-[#727272]">
                              {s.occ && <p>💼 {s.occ}</p>}
                              {s.education && <p>🎓 {EDUCATION_LABELS[s.education] || s.education}</p>}
                              {s.religiosity && <p>✨ {RELIGIOSITY_LABELS[s.religiosity] || s.religiosity}</p>}
                              {s.maritalStatus && <p>💍 {s.maritalStatus === 'single' ? 'רווק/ה' : s.maritalStatus === 'divorced' ? 'גרוש/ה' : s.maritalStatus === 'widowed' ? 'אלמן/ה' : s.maritalStatus}</p>}
                              {s.height && <p>📏 {s.height} ס"מ</p>}
                              {s.hasKids != null && (
                                <p>👶 {s.hasKids ? `יש ילדים${s.numKids ? ` (${s.numKids})` : ""}` : "אין ילדים"}{s.wantsKids ? ` · ${wantsKidsLabel[s.wantsKids] || s.wantsKids}` : ""}</p>
                              )}
                              {s.shomerShabbat != null && <p>🕯️ {s.shomerShabbat ? 'שומר/ת שבת' : 'לא שומר/ת שבת'}</p>}
                              {s.hasPets != null && <p>🐾 {s.hasPets ? `יש חיית מחמד${s.petType ? ` (${s.petType})` : ''}` : 'אין חיית מחמד'}{s.acceptsPets != null ? (s.acceptsPets ? ' · מוכן/ה לחיות' : ' · לא מוכן/ה לחיות') : ''}</p>}
                              {s.smokingStatus && <p>🚬 {s.smokingStatus === 'no' ? 'לא מעשן/ת' : s.smokingStatus === 'yes' ? 'מעשן/ת' : s.smokingStatus === 'social' ? 'חברתי' : s.smokingStatus}</p>}
                              {s.locationPref && <p>📍 {s.locationPref === 'local' ? 'רק באזור' : s.locationPref === 'flexible' ? 'גמיש/ה למרחק' : s.locationPref}</p>}
                              {s.phone && <p>📱 {s.phone}</p>}
                              {(s.minAge || s.maxAge) && (
                                <p>🔍 מחפש/ת גיל: {s.minAge || ""}{s.minAge && s.maxAge ? "-" : ""}{s.maxAge || ""}</p>
                              )}
                              {s.subscriptionEnd && (
                                <p className={`${Date.now() > s.subscriptionEnd ? 'text-red-500 font-semibold' : ''}`}>📅 מנוי עד: {new Date(s.subscriptionEnd).toLocaleDateString('he-IL')}{Date.now() > s.subscriptionEnd ? ' (פג!)' : ''}</p>
                              )}
                            </div>
                            {/* About snippet */}
                            {s.about && (
                              <p className="text-xs text-[#727272] mt-2 italic line-clamp-2">"{s.about}"</p>
                            )}
                            {/* Partner description */}
                            {s.partnerDesc && (
                              <div className="mt-2 text-xs border-t border-[#e9e8e8] pt-2">
                                <span className="font-semibold text-[#191265]">מחפש/ת:</span>
                                <p className="text-[#727272] mt-0.5 line-clamp-3">{s.partnerDesc}</p>
                              </div>
                            )}
                            {/* Per-person status badge */}
                            {s.personStatus && (
                              <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.personStatus.color}`}>
                                <span>{s.personStatus.icon}</span>
                                <span>{s.personStatus.label}</span>
                              </div>
                            )}
                            {/* Action buttons: edit + deactivate */}
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {s.email && (
                                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 text-[10px] px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                                  ✉️ {s.email}
                                </a>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); if (window.confirm(`להסיר את ${s.name} מהמאגר לחלוטין?`)) deactivateSingle.mutate({ singleId: s.id }); }}
                                className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded hover:bg-red-100 transition-colors"
                              >
                                🚫 הסר ממאגר
                              </button>
                            </div>
                            {/* WhatsApp — contact this person with the other's phone number */}
                            {s.phone && (() => {
                              const otherPerson = persons.find(p => p.id !== s.id);
                              const otherPhone = otherPerson?.phone;
                              const otherName = otherPerson?.name?.split(' ')[0] || '';
                              const myName = s.name?.split(' ')[0] || '';
                              const otherPhoneFormatted = otherPhone ? otherPhone.replace(/[^0-9]/g, '') : '';
                              const waMsg = otherPhone
                                ? `היי ${myName} 💛 הילית כאן! ראיתי שיש לך התאמה מיוחדת שמחכה לך. הפרטים של ההתאמה שלך: ${otherName} — מספר טלפון: ${otherPhone}. ממליצה ליצור קשר ולהתחיל שיחה! 😊`
                                : `היי ${myName} 💛 הילית כאן! ראיתי שיש לך התאמה מיוחדת שמחכה לך. כנסי לאתר לראות את הפרטים! 😊`;
                              return (
                                <a
                                  href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(waMsg)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-green-600 transition-colors w-full justify-center"
                                >
                                  💬 WA ל-{myName}{otherPhone ? ` (עם טל׳ ${otherName})` : ''}
                                </a>
                              );
                            })()}
                            {/* WhatsApp reminder — show for anyone who hasn't responded yet (approved is not true/false) */}
                            {match.status === "proposed" && (s.isA ? match.approvedByA : match.approvedByB) === null && s.phone && (
                              <a
                                href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "").replace(/^0/, "972")}?text=${encodeURIComponent(`היי ${s.name?.split(" ")[0] || ""} 💛 הילית כאן. שלחתי לך מייל עם הצעת התאמה מיוחדת שבחרתי עבורך. כדאי לבדוק גם בספאם וללחוץ על הקישור — ממתינה לתשובתך! 😊`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-green-600 transition-colors"
                              >
                                💬 תזכורת WA
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Score breakdown + auto-explanation, v8.0 */}
                      {(() => {
                        const bd = match.scoreBreakdown ? (() => { try { return JSON.parse(match.scoreBreakdown); } catch { return null; } })() : null;
                        const safeScore = (v: unknown) => typeof v === 'number' && !isNaN(v) ? Math.round(v) : null;
                        // Build dims from whatever fields exist in the breakdown (v8.0 aware)
                        const dims = bd ? [
                            { label: "שלב חיים", score: safeScore(bd.lifeStage), icon: "🌱" },
                            { label: "DNA", score: safeScore(bd.dna), icon: "🧬" },
                            { label: "דתיות", score: safeScore(bd.religiosity), icon: "✨" },
                            { label: "מעשי", score: safeScore(bd.practical), icon: "🏠" },
                            { label: "השכלה", score: safeScore(bd.education), icon: "🎓" },
                            { label: "בונוס", score: safeScore(bd.interactionBonus), icon: "⭐" },
                            { label: "עיר", score: safeScore(bd.cityIntelligence), icon: "🏙️" },
                            { label: "אסטרו", score: safeScore(bd.astrologyBonus) !== null ? Math.min(100, (safeScore(bd.astrologyBonus) ?? 0) * 20) : null, icon: "⭐️" },
                          ].filter(d => d.score !== null) : null;
                        const details: string[] = bd?.details ?? [];
                        return (
                          <div className="mb-4 bg-[#f8f6f0] rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-[#191265]">📊 פירוט ציון תאימות</p>
                              {bd?.algorithm && <span className="text-[10px] text-[#727272] bg-white px-2 py-0.5 rounded-full border">{bd.algorithm}</span>}
                            </div>
                            {dims ? (
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                {dims.filter(d => d.score !== undefined).map(d => (
                                  <div key={d.label} className="text-center bg-white rounded-lg p-2">
                                    <div className="text-base">{d.icon}</div>
                                    {d.score === null || d.score === undefined ? (
                                      <div className="text-xs text-gray-400">{(d as any).na ? '--' : 'N/A'}</div>
                            ) : (
                              <div className={`text-sm font-black ${
                                (d.score as number) >= 80 ? "text-green-600" :
                                (d.score as number) >= 60 ? "text-amber-600" : "text-red-500"
                              }`}>
                                {(d as any).na ? '--' : (
                                  <span>{Math.round(d.score as number)}<span className="text-[9px] font-normal text-gray-400">/100</span></span>
                                )}
                              </div>
                            )}
                                    <div className="text-[10px] text-[#727272] mt-0.5">{d.label}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#727272] mb-2">פירוט לא זמין, לחץ "חשב ציונים מחדש" כדי לעדכן</p>
                            )}
                            {details.length > 0 && (
                              <div className="border-t border-[#e9e8e8] pt-2 mb-2">
                                <p className="text-[10px] font-semibold text-[#191265] mb-1">✅ סיבות להתאמה:</p>
                                <ul className="space-y-0.5">
                                  {details.map((det: string, i: number) => (
                                    <li key={i} className="text-[10px] text-[#555] flex items-start gap-1">
                                      <span className="text-green-500 mt-0.5">•</span>
                                      <span>{det}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {match.autoExplanation && (
                              <div className="border-t border-[#e9e8e8] pt-2">
                                <p className="text-xs font-semibold text-[#191265] mb-1">💬 הסבר אוטומטי (בשמך):</p>
                                <p className="text-xs text-[#555] leading-relaxed italic">{match.autoExplanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Hilit's personal note input (only for pending) */}
                      {match.status === "pending" && (
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-[#191265] mb-2">
                            💬 מילה אישית מהילית (רשות: אם לא תמלאי ייוצר אוטומטית לפי ה-DNA)
                          </label>
                          <textarea
                            value={hilitsNotes[match.id] || ""}
                            onChange={e => setHilitsNotes(prev => ({ ...prev, [match.id]: e.target.value }))}
                            placeholder={`למשל: בחרתי לחבר ביניכם כי ראיתי ששניכם מחפשים יציבות ועומק בקשר. ${match.singleAName?.split(" ")[0]} הוא/היא ${DNA_LABELS[match.singleADna || ""] || ""} ו-${match.singleBName?.split(" ")[0]} הוא/היא ${DNA_LABELS[match.singleBDna || ""] || ""}: שני הסוגים האלה משלימים אחד את השני.`}
                            rows={3}
                            className="w-full px-3 py-2 border border-[#e9e8e8] rounded-xl text-sm focus:outline-none focus:border-[#191265] resize-none text-right"
                          />
                        </div>
                      )}

                      {/* Below 80% note */}
                      {match.status === "pending" && match.score != null && match.score < 80 && (
                        <div className="mb-3 bg-[#ffe27c]/20 border border-[#ffe27c] rounded-xl p-3 text-xs text-[#191265]">
                          <p className="font-bold mb-1">✨ הערה על ציון מתחת ל-80%</p>
                          <p>ההתאמה הזו קפצה לי למרות שלא הגיעה ל-80%. אני בכל זאת מאוד מאמינה בה — לפעמים יש ירידה באחוזים בגלל דברים פחות מהותיים בעיני, ואני בוחרת לשחרר אותה כי אני מוצאת את הקסם וההתאמה בכל זאת. לפי המחקרים, התאמות מעל 60% נחשבות טובות מאוד — וגם ההתאמה הזו גבוהה ומבטיחה 💛</p>
                        </div>
                      )}

                      {/* Action buttons for pending matches */}
                      {match.status === "pending" && (
                        <div className="flex flex-col gap-2">

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMatch.mutate({ matchId: match.id, hilitsNote: hilitsNotes[match.id] || undefined })}
                              disabled={approveMatch.isPending}
                              className="flex-1 font-bold border-0 py-3 bg-[#ffe27c] text-[#191265] hover:bg-[#ffd84a]"
                            >
                              <Send size={14} className="ml-1" />
                              שלח הצעה לשני הצדדים
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMatch.mutate({ matchId: match.id })}
                              disabled={rejectMatch.isPending}
                              className="px-4 py-3 text-red-500 border-red-200 hover:bg-red-50"
                            >
                              <XCircle size={14} className="ml-1" />
                              דחי
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Email reminder button for proposed matches */}
                      {match.status === "proposed" && (
                        <div className="flex gap-2 flex-wrap mb-3">
                          {/* Remind person A if they haven't responded */}
                          {match.approvedByA === null && (
                            <button
                              onClick={() => sendMatchReminder.mutate({ matchId: match.id, singleId: match.singleAId })}
                              disabled={sendMatchReminder.isPending}
                              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              📧 תזכורת מייל ל-{match.singleAName?.split(" ")[0]}
                            </button>
                          )}
                          {/* Remind person B if they haven't responded */}
                          {match.approvedByB === null && (
                            <button
                              onClick={() => sendMatchReminder.mutate({ matchId: match.id, singleId: match.singleBId })}
                              disabled={sendMatchReminder.isPending}
                              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                              📧 תזכורת מייל ל-{match.singleBName?.split(" ")[0]}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Release both from rejected/no-response match */}
                      {(match.status === "rejected" || match.status === "expired") && (
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`לשחרר את ${match.singleAName} ו-${match.singleBName} מההתאמה הזו? שניהם יחזרו למאגר.`)) {
                                releaseFromMatch.mutate({ matchId: match.id });
                              }
                            }}
                            disabled={releaseFromMatch.isPending}
                            className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            ♻️ החזר שניהם למאגר
                          </button>
                        </div>
                      )}

                      {/* Resend button for expired matches */}
                      {match.status === "expired" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`לשלוח מחדש את ההצעה בין ${match.singleAName} ל-${match.singleBName}?`)) {
                                approveMatch.mutate({ matchId: match.id, hilitsNote: hilitsNotes[match.id] || undefined });
                              }
                            }}
                            disabled={approveMatch.isPending}
                            className="flex-1 bg-[#191265] text-white hover:bg-[#1800ad] font-bold border-0 py-3"
                          >
                            <Send size={14} className="ml-1" />
                            שלח מחדש
                          </Button>
                        </div>
                      )}

                      {/* Match detail status + release for matched */}
                      {match.status === "matched" && (
                        <div className="space-y-3 mb-3">
                          {/* Detail status dropdown */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[#191265]">📊 סטאטוס:</span>
                            <select
                              value={match.matchDetailStatus || ''}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                updateMatchDetailStatus.mutate({ matchId: match.id, status: val });
                              }}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                            >
                              <option value="">לא נקבע</option>
                              <option value="talking">💬 מדברים</option>
                              <option value="dating">💕 יוצאים לדייט</option>
                              <option value="met">🤝 נפגשו</option>
                              <option value="together">❤️ ביחד</option>
                              <option value="ended">🚫 לא הצליח</option>
                            </select>
                          </div>
                          {/* Follow-up emails sent info */}
                          {(match.matchWeekFollowupSentAt || match.matchMonthFollowupSentAt) && (
                            <div className="flex items-center gap-3 text-[10px] text-[#727272]">
                              {match.matchWeekFollowupSentAt && <span>📧 פולואפ שבוע: {new Date(match.matchWeekFollowupSentAt).toLocaleDateString('he-IL')}</span>}
                              {match.matchMonthFollowupSentAt && <span>📧 פולואפ חודש: {new Date(match.matchMonthFollowupSentAt).toLocaleDateString('he-IL')}</span>}
                            </div>
                          )}
                          {/* Release button */}
                          <button
                            onClick={() => {
                              if (window.confirm(`לשחרר את ${match.singleAName} ו-${match.singleBName} מההתאמה? שניהם יחזרו למאגר לקבלת התאמות חדשות.`)) {
                                releaseFromMatch.mutate({ matchId: match.id });
                              }
                            }}
                            disabled={releaseFromMatch.isPending}
                            className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            🔓 שחרר התאמה
                          </button>
                        </div>
                      )}

                      {/* Follow-up actions for matched 14+ days */}
                      {match.status === "matched" && match.matchedAt && match.matchedAt < now14daysAgo && (
                        <div className="bg-purple-50 rounded-xl p-3 space-y-3">
                          <p className="text-xs font-bold text-purple-800">🔔 מעקב אחרי ההתאמה</p>
                          <p className="text-xs text-purple-700">ההתאמה הצליחה לפני {Math.floor((Date.now() - (match.matchedAt || 0)) / (1000 * 60 * 60 * 24))} ימים. כדאי לשאול איך הייתה הפגישה!</p>
                          {/* How was the date */}
                          <div>
                            <p className="text-[10px] font-bold text-purple-700 mb-1">💬 שאלי איך היתה הפגישה:</p>
                            <div className="flex gap-2 flex-wrap">
                              {match.singleAPhone && (
                                <a
                                  href={`https://wa.me/${match.singleAPhone.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי ${match.singleAName?.split(' ')[0]}! 💛 הילית כאן. רציתי לדעת איך הייתה הפגישה עם ${match.singleBName?.split(' ')[0]}? מקווה שהיה נעים! 😊`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                  💬 WA ל-{match.singleAName?.split(' ')[0]}
                                </a>
                              )}
                              {match.singleBPhone && (
                                <a
                                  href={`https://wa.me/${match.singleBPhone.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי ${match.singleBName?.split(' ')[0]}! 💛 הילית כאן. רציתי לדעת איך הייתה הפגישה עם ${match.singleAName?.split(' ')[0]}? מקווה שהיה נעים! 😊`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                  💬 WA ל-{match.singleBName?.split(' ')[0]}
                                </a>
                              )}
                            </div>
                          </div>
                          {/* Ask to return to matching */}
                          <div>
                            <p className="text-[10px] font-bold text-purple-700 mb-1">🔄 שאלי אם רוצים לחזור להתאמות:</p>
                            <div className="flex gap-2 flex-wrap">
                              {match.singleAPhone && (
                                <a
                                  href={`https://wa.me/${match.singleAPhone.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי ${match.singleAName?.split(' ')[0]}! 💛 הילית כאן שוב. רציתי לשאול אם את/ה מעוניין/ת שאחזור להתאמות במאגר? 😊`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                  🔄 שאלי את {match.singleAName?.split(' ')[0]}
                                </a>
                              )}
                              {match.singleBPhone && (
                                <a
                                  href={`https://wa.me/${match.singleBPhone.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי ${match.singleBName?.split(' ')[0]}! 💛 הילית כאן שוב. רציתי לשאול אם את/ה מעוניין/ת שאחזור להתאמות במאגר? 😊`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                  🔄 שאלי את {match.singleBName?.split(' ')[0]}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unmatched Tab */}
        {activeTab === "unmatched" && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#191265]">🔍 לא קיבלו התאמה בחודשיים האחרונים</p>
                <p className="text-xs text-[#727272]">רווקים פעילים שלא נשלחה להם הצעה ב-60 הימים האחרונים (כולל מי שמעולם לא קיבל)</p>
              </div>
              <button
                onClick={() => refetchUnmatched()}
                className="text-xs text-[#191265] bg-[#f0eadc] px-3 py-1.5 rounded-lg hover:bg-[#ffe27c] transition-colors"
              >
                <RefreshCw size={12} className="inline ml-1" />
                רענן
              </button>
            </div>
            {(singlesWithoutMatches as any[]).length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-[#191265] font-bold">כל הרווקים קיבלו התאמה!</p>
                <p className="text-xs text-[#727272] mt-1">אין רווקים פעילים ללא התאמה כרגע</p>
              </div>
            ) : (
              (singlesWithoutMatches as any[]).map((s: any) => (
                <div key={s.id} className={`rounded-xl shadow-sm overflow-hidden ${s.isCoachingClient ? 'bg-pink-50 border border-pink-200 ring-1 ring-pink-100' : 'bg-white border border-orange-100'}`}>
                  <div className="p-4">
                    {/* Person header */}
                    <div className="flex items-start gap-3 mb-3">
                      {s.photoUrl ? (
                        <button
                          onClick={() => setLightboxUrl(s.photoUrl)}
                          className="focus:outline-none flex-shrink-0"
                          title="הגדל תמונה"
                        >
                          <img src={s.photoUrl} alt={s.firstName} className="w-14 h-14 rounded-xl object-cover object-[center_20%] border-2 border-orange-200 hover:border-[#ffe27c] transition-all cursor-zoom-in" />
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 text-2xl">
                          {s.gender === 'female' ? '👩' : '👨'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#191265]">{s.firstName} {s.lastName || ''}</p>
                          {s.isCoachingClient && <span className="text-[9px] bg-pink-200 text-pink-800 font-bold px-1.5 py-0.5 rounded-full">💜 מלווה</span>}
                          {s.isNotBasic && <span className="text-[9px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">⭐ דורש תשומת לב</span>}
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                            ⏳ {s.waitingDays} ימים במאגר
                          </span>
                          {s.lastMatchAt ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                              📬 התאמה אחרונה: {Math.floor((Date.now() - s.lastMatchAt) / (1000 * 60 * 60 * 24))} ימים
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                              🆕 מעולם לא קיבל/ה התאמה
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#727272]">
                          {s.gender === 'female' ? 'אישה' : 'גבר'} · {displayAge(s.age)} · {s.city || 'לא ידוע'}
                          {s.height ? ` · ${s.height} ס"מ` : ''}
                          {s.dnaType && ` · ${DNA_LABELS[s.dnaType] || s.dnaType}`}
                          {s.religiosity && ` · ${RELIGIOSITY_LABELS[s.religiosity] || s.religiosity}`}
                        </p>
                        <p className="text-xs text-[#727272]">
                          {s.maritalStatus && `${MARITAL_LABELS[s.maritalStatus] || s.maritalStatus}`}
                          {s.education && ` · ${EDUCATION_LABELS[s.education] || s.education}`}
                          {s.hasKids != null && ` · ${s.hasKids ? `יש ילדים${s.numKids ? ` (${s.numKids})` : ''}` : 'אין ילדים'}`}
                          {s.wantsKids && ` · ${s.wantsKids === 'yes' ? 'רוצה ילדים' : s.wantsKids === 'no' ? 'לא רוצה ילדים' : 'פתוח לנושא'}`}
                        </p>
                        <p className="text-xs text-[#727272]">
                          {s.shomerShabbat != null && `שבת: ${s.shomerShabbat ? 'כן' : 'לא'}`}
                          {s.smokingStatus && ` · עישון: ${s.smokingStatus === 'no' ? 'לא מעשן' : s.smokingStatus === 'sometimes' ? 'לפעמים' : 'מעשן'}`}
                          {s.hasPets != null && ` · חיות: ${s.hasPets ? (s.petType || 'כן') : 'אין'}`}
                          {s.locationPreference && ` · מרחק: ${s.locationPreference}`}
                        </p>
                        {s.occupation && <p className="text-xs text-[#727272]">💼 {s.occupation}</p>}
                        {(s.minAgePreference || s.maxAgePreference) && (
                          <p className="text-xs text-[#727272]">🔍 מחפש/ת גיל: {s.minAgePreference || ''}{s.minAgePreference && s.maxAgePreference ? '-' : ''}{s.maxAgePreference || ''}</p>
                        )}
                        {s.subscriptionEnd && (
                          <p className={`text-xs ${Date.now() > s.subscriptionEnd ? 'text-red-500 font-semibold' : 'text-[#727272]'}`}>
                            📅 מנוי עד: {new Date(s.subscriptionEnd).toLocaleDateString('he-IL')}{Date.now() > s.subscriptionEnd ? ' (פג!)' : ''}
                          </p>
                        )}
                        {s.about && <p className="text-xs text-[#727272] mt-1 italic line-clamp-2">"על עצמי: {s.about}"</p>}
                        {s.partnerDescription && <p className="text-xs text-[#727272] mt-0.5 line-clamp-2">💖 מחפש/ת: {s.partnerDescription}</p>}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {s.phone && (
                            <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '972')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 bg-green-50 text-green-700 text-[10px] px-2 py-1 rounded hover:bg-green-100 transition-colors">
                              📱 {s.phone}
                            </a>
                          )}
                          {s.email && (
                            <a href={`mailto:${s.email}`}
                              className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 text-[10px] px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                              ✉️ {s.email}
                            </a>
                          )}
                          <button
                            onClick={() => { if (window.confirm(`להסיר את ${s.firstName} ${s.lastName || ''} מהמאגר?`)) deactivateSingle.mutate({ singleId: s.id }); }}
                            className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded hover:bg-red-100 transition-colors"
                          >
                            🚫 הסר
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Suggested matches */}
                    {s.suggestions && s.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#191265] mb-2">💡 התאמות מומלצות:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {s.suggestions.map((sug: any) => (
                            <div key={sug.id} className="bg-[#f8f6f0] rounded-lg p-3 text-right">
                              <div className="flex items-center gap-2 mb-1">
                                {sug.photoUrl ? (
                                  <button
                                    onClick={() => setLightboxUrl(sug.photoUrl)}
                                    className="focus:outline-none flex-shrink-0"
                                    title="הגדל תמונה"
                                  >
                                    <img src={sug.photoUrl} alt={sug.name} className="w-12 h-12 rounded-lg object-cover object-[center_20%] hover:opacity-80 cursor-zoom-in transition-opacity" />
                                  </button>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-[#191265]/10 flex items-center justify-center text-lg flex-shrink-0">
                                    {sug.gender === 'female' ? '👩' : '👨'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#191265] truncate">{sug.name}</p>
                                  <p className="text-[10px] text-[#727272]">{displayAge(sug.age)} · {sug.city || ''}{sug.height ? ` · ${sug.height} ס"מ` : ''}</p>
                                  <div className="text-[10px] font-black text-[#1800ad]">{sug.score}%</div>
                                </div>
                              </div>
                              <div className="text-[9px] text-[#727272] space-y-0.5 border-t border-gray-200 pt-1 mt-1">
                                <p>
                                  {sug.maritalStatus && <span>{MARITAL_LABELS[sug.maritalStatus] || sug.maritalStatus}</span>}
                                  {sug.religiosity && <span> · {RELIGIOSITY_LABELS[sug.religiosity] || sug.religiosity}</span>}
                                  {sug.education && <span> · {EDUCATION_LABELS[sug.education] || sug.education}</span>}
                                </p>
                                <p>
                                  {sug.hasKids != null && <span>{sug.hasKids ? `ילדים${sug.numKids ? ` (${sug.numKids})` : ''}` : 'אין ילדים'}</span>}
                                  {sug.wantsKids && <span> · {sug.wantsKids === 'yes' ? 'רוצה ילדים' : sug.wantsKids === 'no' ? 'לא רוצה ילדים' : 'פתוח לילדים'}</span>}
                                </p>
                                {sug.occupation && <p>💼 {sug.occupation}</p>}
                                {sug.smokingStatus && sug.smokingStatus !== 'no' && <p>🚬 {sug.smokingStatus === 'yes' ? 'מעשן/ת' : sug.smokingStatus === 'social' ? 'חברתי' : sug.smokingStatus}</p>}
                                {sug.dnaType && <p className="text-[#1800ad] font-medium">🧬 {DNA_LABELS[sug.dnaType] || sug.dnaType}</p>}
                              </div>
                              {sug.about && (
                                <div className="text-[9px] text-[#555] mt-1 border-t border-gray-200 pt-1">
                                  <span className="font-semibold">על עצמי:</span> {sug.about.length > 80 ? sug.about.substring(0, 80) + '...' : sug.about}
                                </div>
                              )}
                              {sug.partnerDescription && (
                                <div className="text-[9px] text-[#555] mt-0.5">
                                  <span className="font-semibold">מחפש/ת:</span> {sug.partnerDescription.length > 80 ? sug.partnerDescription.substring(0, 80) + '...' : sug.partnerDescription}
                                </div>
                              )}
                              {sug.phone && (
                                <div className="text-[9px] text-[#727272] mt-1">📞 {sug.phone}</div>
                              )}
                              {sug.hasActiveProposal && (
                                <div className="text-[9px] bg-orange-100 text-orange-700 font-bold rounded px-1 py-0.5 mt-0.5">⏳ בהתאמה פעילה</div>
                              )}
                              {sug.totalSentMatches > 0 && (
                                <div className="text-[9px] text-[#727272] mt-0.5">📬 {sug.totalSentMatches} התאמות</div>
                              )}
                              {/* Send match button for every suggestion */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`לשלוח התאמה בין ${s.firstName} ל-${sug.name}?`)) {
                                    createAndSendMatch.mutate({ idA: s.id, idB: sug.id });
                                  }
                                }}
                                disabled={createAndSendMatch.isPending}
                                className="mt-1.5 w-full bg-[#191265] text-white text-[9px] font-bold px-1.5 py-1 rounded-lg hover:bg-[#1800ad] transition-colors disabled:opacity-50 flex items-center justify-center gap-0.5"
                              >
                                <Send size={8} />
                                שלח התאמה
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === "tokens" && (
          <div className="space-y-4">
            {/* Create token */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-[#191265] mb-3">צור קישור גישה חינמית</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={inviteNote}
                  onChange={e => setInviteNote(e.target.value)}
                  placeholder="הערה לזיהוי (שם האדם)"
                  className="w-full px-3 py-2 border border-[#e9e8e8] rounded-lg text-sm focus:outline-none focus:border-[#191265]"
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="אימייל ספציפי (אופציונלי - לנעילה לאדם מסוים)"
                    className="flex-1 px-3 py-2 border border-[#e9e8e8] rounded-lg text-sm focus:outline-none focus:border-[#191265]"
                  />
                  <Button
                    onClick={() => createToken.mutate({ note: inviteNote || undefined, boundEmail: inviteEmail || undefined })}
                    disabled={createToken.isPending}
                    className="bg-[#191265] text-white hover:bg-[#1800ad] whitespace-nowrap"
                  >
                    <Gift size={14} className="ml-1" />
                    צור קישור
                  </Button>
                </div>
              </div>
              <p className="text-xs text-[#727272] mt-2">הקישור יאפשר כניסה חינמית חד-פעמית למאגר ללא תשלום. תוקף: 30 יום.</p>
            </div>

            {/* Token list */}
            <div className="space-y-2">
              {typedTokens.length === 0 && (
                <div className="bg-white rounded-xl p-6 text-center text-[#727272] text-sm">אין טוקנים עדיין</div>
              )}
              {typedTokens.map(token => {
                const inviteUrl = `${baseUrl}/join?free_token=${token.token}`;
                return (
                  <div key={token.id} className={`bg-white rounded-xl p-4 shadow-sm border-r-4 ${token.usedAt ? "border-gray-200 opacity-60" : "border-green-400"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {token.note && <p className="font-semibold text-[#191265] text-sm">{token.note}</p>}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#727272]">קוד:</span>
                            <code className="text-sm bg-[#f8f6f0] px-2 py-1 rounded font-mono text-[#191265] font-bold tracking-wider">{token.token}</code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(token.token); toast.success("הקוד הועתק!"); }}
                              className="text-[#191265] hover:text-[#1800ad] flex items-center gap-1 text-xs"
                              title="העתק קוד בלבד"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#727272]">לינק:</span>
                            <code className="text-xs bg-[#f8f6f0] px-2 py-1 rounded font-mono text-[#727272] max-w-[180px] truncate">{inviteUrl}</code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("הלינק הועתק!"); }}
                              className="text-[#727272] hover:text-[#191265] flex items-center gap-1 text-xs"
                              title="העתק לינק מלא"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                       <p className="text-xs text-[#727272] mt-1">
                          נוצר: {new Date(token.createdAt).toLocaleDateString("he-IL")}
                          {token.usedAt && ` · נוצל: ${new Date(token.usedAt).toLocaleDateString("he-IL")} ע"י ${token.usedByEmail || "?"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {token.usedAt ? (
                          <Badge className="text-xs bg-gray-100 text-gray-500">✅ נוצל</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700">🟢 פעיל</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Leads Tab - paid but didn't complete questionnaire */}
        {activeTab === "inactive_leads" && (
          <div className="space-y-2">
            <div className="bg-[#ffe27c]/20 border border-[#ffe27c] rounded-xl p-3 mb-3">
              <p className="text-sm text-[#191265] font-semibold">💰 לידים שרכשו כניסה למאגר אך לא השלימו את השאלון המדעי</p>
              <p className="text-xs text-[#727272] mt-1">ניתן לפנות אליהם בוואטסאפ ולעודד להשלים את התהליך</p>
            </div>
            {(inactiveSingles as any[]).length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                <div className="text-4xl mb-2">🎉</div>
                <p>אין לידים ממתינים, כולם השלימו את השאלון!</p>
              </div>
            )}
            {(inactiveSingles as any[]).map((s: any) => (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-yellow-400">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#191265]">{s.firstName} {s.lastName}</span>
                      <Badge className="text-xs bg-yellow-100 text-yellow-700">⏳ לא השלים שאלון</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[#727272] flex-wrap">
                      {s.email && <span>✉️ {s.email}</span>}
                      {s.phone && <span>📞 {s.phone}</span>}
                      <span className="text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('he-IL') : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {s.phone && (
                      <a
                        href={`https://wa.me/972${s.phone.replace(/^0/, '').replace(/-/g, '')}?text=${encodeURIComponent('היי ' + s.firstName + ', שמתי לב שנרשמת למאגר הרווקים של הילית אך טרם השלמת את השאלון המדעי. השאלון הוא שלב חשוב שמאפשר לנו למצוא לך התאמה מדויקת. אשמח לעזור אם יש שאלות!')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition-colors"
                      >
                        💬 וואטסאפ
                      </a>
                    )}
                    {s.questionnaireToken && (
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/join/questionnaire?token=${s.questionnaireToken}`;
                          navigator.clipboard.writeText(url);
                          toast.success('קישור לשאלון הועתק!');
                        }}
                        className="bg-[#191265] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1800ad] transition-colors"
                      >
                        🔗 העתק קישור
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Missing Data Tab - singles with age=0 or empty city */}
        {activeTab === "missing_data" && (
          <MissingDataTab />
        )}
        {/* Compatibility Check Tab */}
        {activeTab === "compatibility" && (
          <CompatibilityCheckTab
            allSingles={allSinglesForCompat}
            compatPersonA={compatPersonA}
            setCompatPersonA={(id: number | null) => { setCompatPersonA(id); setCompatResult(null); }}
            compatPersonB={compatPersonB}
            setCompatPersonB={(id: number | null) => { setCompatPersonB(id); setCompatResult(null); }}
            compatSearchA={compatSearchA}
            setCompatSearchA={setCompatSearchA}
            compatSearchB={compatSearchB}
            setCompatSearchB={setCompatSearchB}
            compatDropdownA={compatDropdownA}
            setCompatDropdownA={setCompatDropdownA}
            compatDropdownB={compatDropdownB}
            setCompatDropdownB={setCompatDropdownB}
            compatResult={compatResult}
            isLoading={checkCompatMutation.isPending}
            onCheck={() => {
              if (!compatPersonA || !compatPersonB) { toast.error("בחר/י שני אנשים"); return; }
              if (compatPersonA === compatPersonB) { toast.error("בחר/י שני אנשים שונים"); return; }
              checkCompatMutation.mutate({ idA: compatPersonA, idB: compatPersonB });
            }}
            onSendMatch={() => {
              if (compatResult?.matchId) {
                // Match record already exists — use approveMatch
                approveMatch.mutate({ matchId: compatResult.matchId, hilitsNote: "" }, {
                  onSuccess: () => {
                    setCompatResult((prev: any) => prev ? { ...prev, matchStatus: 'proposed' } : prev);
                  }
                });
              } else if (compatPersonA && compatPersonB) {
                // No match record yet — create and send directly
                createAndSendMatch.mutate({ idA: compatPersonA, idB: compatPersonB });
              }
            }}
            canSendDirectly={!!(compatPersonA && compatPersonB)}
            isSendingMatch={approveMatch.isPending || createAndSendMatch.isPending}
          />
        )}
        {/* Profile Update Requests Tab */}
        {activeTab === "update_requests" && (
          <div className="space-y-4">
            {updateRequests.length === 0 ? (
              <div className="text-center py-12 text-[#727272]">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold">אין בקשות עדכון ממתינות</p>
              </div>
            ) : (
              updateRequests.map((req: any) => {
                const changes = JSON.parse(req.req.changesJson || "{}");
                const single = req.single;
                return (
                  <div key={req.req.id} className="bg-white rounded-2xl shadow-sm p-5 text-right border border-[#f0f0f0]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveUpdateMutation.mutate({ requestId: req.req.id, action: "approve" })}
                          disabled={approveUpdateMutation.isPending}
                          className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          ✓ אשר
                        </button>
                        <button
                          onClick={() => rejectUpdateMutation.mutate({ requestId: req.req.id, action: "reject" })}
                          disabled={rejectUpdateMutation.isPending}
                          className="bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          ✗ דחה
                        </button>
                      </div>
                      <div>
                        <h3 className="font-black text-[#191265] text-lg">{single.firstName} {single.lastName}</h3>
                        <p className="text-sm text-[#727272]">{single.email} • {single.phone}</p>
                        <p className="text-xs text-[#aaa]">{new Date(req.req.createdAt).toLocaleString("he-IL")}</p>
                      </div>
                    </div>
                    {/* Photo */}
                    {req.req.pendingPhotoUrl && (
                      <div className="mb-4 flex justify-end">
                        <div>
                          <p className="text-xs text-[#727272] mb-1 text-right">תמונה חדשה:</p>
                          <img src={req.req.pendingPhotoUrl} alt="תמונה חדשה" className="w-24 h-24 rounded-xl object-cover border-2 border-[#ffe27c]" />
                        </div>
                      </div>
                    )}
                    {/* Changes */}
                    <div className="bg-[#f9f7f3] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#191265] mb-2">שינויים מבוקשים:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(changes).map(([key, value]: [string, any]) => (
                          <div key={key} className="text-sm">
                            <span className="text-[#727272] text-xs">{key}: </span>
                            <span className="font-semibold text-[#191265]">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
                    </div>
        )}

        {/* Filter Search Tab */}
        {activeTab === "filter_search" && (() => {
          const allSinglesForFilter = typedSingles;
          const filteredResultsRaw = allSinglesForFilter.filter(s => {
            if (filterGender && s.gender !== filterGender) return false;
            if (filterMinAge && s.age < parseInt(filterMinAge)) return false;
            if (filterMaxAge && s.age > parseInt(filterMaxAge)) return false;
            if (filterArea) {
              const areaCities = AREA_CITIES[filterArea] || [];
              const sCity = (s.city || "").toLowerCase();
              if (!areaCities.some(c => sCity.includes(c.toLowerCase()) || c.toLowerCase().includes(sCity))) return false;
            }
            if (filterCity && !filterArea && !(s.city || "").toLowerCase().includes(filterCity.toLowerCase())) return false;
            if (filterReligiosity && s.religiosity !== filterReligiosity) return false;
            if (filterDna && s.dnaType !== filterDna) return false;
            if (filterName && !(`${s.firstName} ${s.lastName || ""}`).toLowerCase().includes(filterName.toLowerCase())) return false;
            if (filterMinHeight && (!(s as any).height || (s as any).height < parseInt(filterMinHeight))) return false;
            if (filterMaxHeight && (!(s as any).height || (s as any).height > parseInt(filterMaxHeight))) return false;
            if (filterMaritalStatus && (s as any).maritalStatus !== filterMaritalStatus) return false;
            if (filterWantsKids && (s as any).wantsChildren !== filterWantsKids) return false;
            if (filterHasKids === "yes" && !(s as any).hasChildren) return false;
            if (filterHasKids === "no" && (s as any).hasChildren) return false;
            return true;
          });
          const filteredResults = filterCompatTarget
            ? [...filteredResultsRaw].sort((a, b) => {
                const scoreA = filterCompatResult[a.id]?.score ?? -1;
                const scoreB = filterCompatResult[b.id]?.score ?? -1;
                return scoreB - scoreA;
              })
            : filteredResultsRaw;

          return (
            <div className="space-y-4">
              {/* Filter panel */}
              <div className="bg-white rounded-2xl shadow-sm p-5" dir="rtl">
                <h3 className="font-black text-[#191265] text-lg mb-4">🔎 חיפוש מתקדם לפי פרמטרים</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">שם</label>
                    <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)}
                      placeholder="חיפוש לפי שם..."
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">מגדר</label>
                    <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      <option value="male">גבר</option>
                      <option value="female">אישה</option>
                    </select>
                  </div>
                  {/* Min age */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">גיל מינימלי</label>
                    <input type="number" value={filterMinAge} onChange={e => setFilterMinAge(e.target.value)}
                      placeholder="מ-" min={18} max={80}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  {/* Max age */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">גיל מקסימלי</label>
                    <input type="number" value={filterMaxAge} onChange={e => setFilterMaxAge(e.target.value)}
                      placeholder="עד-" min={18} max={80}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  {/* City */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">אזור / עיר</label>
                    <input type="text" value={filterCity} onChange={e => setFilterCity(e.target.value)}
                      placeholder="תל אביב, ירושלים..."
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  {/* Religiosity */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">רמה דתית</label>
                    <select value={filterReligiosity} onChange={e => setFilterReligiosity(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      {Object.entries(RELIGIOSITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {/* DNA type */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">סוג DNA</label>
                    <select value={filterDna} onChange={e => setFilterDna(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      {Object.entries(DNA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {/* Marital Status */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">מצב משפחתי</label>
                    <select value={filterMaritalStatus} onChange={e => setFilterMaritalStatus(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      {Object.entries(MARITAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {/* Wants Kids */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">רוצה ילדים</label>
                    <select value={filterWantsKids} onChange={e => setFilterWantsKids(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      <option value="yes">כן</option>
                      <option value="no">לא</option>
                      <option value="maybe">אולי</option>
                      <option value="open">פתוח/ה</option>
                    </select>
                  </div>
                  {/* Has Kids */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">יש ילדים</label>
                    <select value={filterHasKids} onChange={e => setFilterHasKids(e.target.value)}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      <option value="yes">כן, יש ילדים</option>
                      <option value="no">לא, אין ילדים</option>
                    </select>
                  </div>
                  {/* Area */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">אזור</label>
                    <select value={filterArea} onChange={e => { setFilterArea(e.target.value); if (e.target.value) setFilterCity(""); }}
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]">
                      <option value="">הכל</option>
                      {Object.keys(AREA_CITIES).map(area => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </div>
                  {/* Height range */}
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">גובה מינימלי (ס"מ)</label>
                    <input type="number" value={filterMinHeight ?? ""} onChange={e => setFilterMinHeight(e.target.value ? (Number(e.target.value) as any) : null as any)}
                      placeholder="160"
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#727272] mb-1">גובה מקסימלי (ס"מ)</label>
                    <input type="number" value={filterMaxHeight ?? ""} onChange={e => setFilterMaxHeight(e.target.value ? (Number(e.target.value) as any) : null as any)}
                      placeholder="190"
                      className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                  </div>
                  {/* Compare with person */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#727272] mb-1">בדוק התאמה מול (אופציונלי)</label>
                    <div className="relative">
                      <input type="text" value={filterCompatSearch}
                        onChange={e => { setFilterCompatSearch(e.target.value); setFilterCompatDropdown(true); }}
                        onFocus={() => setFilterCompatDropdown(true)}
                        placeholder="הקלד שם לחיפוש..."
                        className="w-full border border-[#e9e8e8] rounded-lg px-3 py-2 text-sm text-[#191265] focus:outline-none focus:border-[#191265]" />
                      {filterCompatTarget && (
                        <button onClick={() => { setFilterCompatTarget(null); setFilterCompatSearch(""); setFilterCompatResult({}); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-[#727272] hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                      {filterCompatDropdown && filterCompatSearch && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[#e9e8e8] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {typedSingles.filter(s => `${s.firstName} ${s.lastName || ""}`.toLowerCase().includes(filterCompatSearch.toLowerCase())).slice(0, 10).map(s => (
                            <button key={s.id} onClick={() => { setFilterCompatTarget(s.id); setFilterCompatSearch(`${s.firstName} ${s.lastName || ""}`); setFilterCompatDropdown(false); setFilterCompatResult({}); }}
                              className="w-full text-right px-4 py-2 text-sm hover:bg-[#f0eadc] text-[#191265]">
                              {s.firstName} {s.lastName} — {GENDER_LABELS[s.gender]} גיל {displayAge(s.age)} {s.city ? `📍${s.city}` : ""}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {filterCompatTarget && (
                      <p className="text-xs text-[#191265] mt-1 font-semibold">✅ בדיקת התאמה מול: {filterCompatSearch}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={() => { setFilterGender(""); setFilterMinAge(""); setFilterMaxAge(""); setFilterCity(""); setFilterReligiosity(""); setFilterDna(""); setFilterName(""); setFilterCompatTarget(null); setFilterCompatSearch(""); setFilterCompatResult({}); setFilterMinHeight(""); setFilterMaxHeight(""); setFilterMaritalStatus(""); setFilterWantsKids(""); setFilterHasKids(""); setFilterArea(""); }}
                    className="text-xs text-[#727272] underline">נקה הכל</button>
                  <span className="text-sm font-bold text-[#191265]">{filteredResults.length} תוצאות</span>
                  {filterCompatTarget && (
                    <button
                      onClick={() => {
                        const toCheck = filteredResults.filter(s => s.id !== filterCompatTarget && !filterCompatResult[s.id]);
                        toCheck.slice(0, 50).forEach(s => {
                          checkCompatForFilter.mutate({ idA: filterCompatTarget, idB: s.id });
                        });
                      }}
                      className="text-xs bg-[#191265] text-white font-bold px-4 py-1.5 rounded-full hover:bg-[#191265]/80 transition-colors"
                    >
                      🔍 בדוק התאמה לכולם ({filteredResults.filter(s => s.id !== filterCompatTarget && !filterCompatResult[s.id]).length})
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              {filteredResults.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>לא נמצאו תוצאות. שנה/י את הפרמטרים.</p>
                </div>
              ) : (
                filteredResults.map(single => {
                  const compatData = filterCompatResult[single.id];
                  const scoreColor = compatData ? (compatData.score >= 75 ? "border-green-500" : compatData.score >= 60 ? "border-amber-500" : compatData.score >= 45 ? "border-orange-400" : "border-red-300") : "border-[#191265]/20";
                  return (
                    <div key={single.id} className={`bg-white rounded-xl p-4 shadow-sm border-r-4 ${scoreColor}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {compatData && (
                              <span className={`text-sm font-black px-2.5 py-1 rounded-full ${compatData.score >= 75 ? 'bg-green-100 text-green-700' : compatData.score >= 60 ? 'bg-amber-100 text-amber-700' : compatData.score >= 45 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-600'}`}>
                                {Math.round(compatData.score)}%
                              </span>
                            )}
                            {single.photoUrl && (
                              <img src={single.photoUrl} alt={single.firstName}
                                className="w-8 h-8 rounded-full object-cover border-2 border-[#191265]/20" />
                            )}
                            <span className="font-bold text-[#191265]">{single.firstName} {single.lastName || ""}</span>
                            <Badge className="text-xs bg-[#191265]/10 text-[#191265]">{GENDER_LABELS[single.gender] || single.gender}</Badge>
                            <span className="text-sm text-[#727272]">{displayAge(single.age)}</span>
                            {single.city && <span className="text-sm text-[#727272]">📍 {single.city}</span>}
                            {single.religiosity && <Badge className="text-xs bg-[#f0eadc] text-[#191265]">{RELIGIOSITY_LABELS[single.religiosity] || single.religiosity}</Badge>}
                            {single.dnaType && <Badge className="text-xs bg-[#ffe27c]/50 text-[#191265]">{DNA_LABELS[single.dnaType] || single.dnaType}</Badge>}
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-[#727272] flex-wrap">
                            {single.email && <span>✉️ {single.email}</span>}
                            {single.phone && <span>📞 {single.phone}</span>}
                            {single.height && <span>📏 {single.height} ס"מ</span>}
                            {single.maritalStatus && <span>{MARITAL_LABELS[single.maritalStatus] || single.maritalStatus}</span>}
                            {single.hasChildren != null && <span>👶 {single.hasChildren ? `יש ילדים` : "אין ילדים"}</span>}
                            {single.wantsChildren && <span>🍼 {single.wantsChildren === "yes" ? "רוצה ילדים" : single.wantsChildren === "no" ? "לא רוצה ילדים" : single.wantsChildren === "maybe" ? "אולי ילדים" : "פתוח/ה"}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {filterCompatTarget && filterCompatTarget !== single.id && (
                            <button
                              onClick={() => checkCompatForFilter.mutate({ idA: filterCompatTarget, idB: single.id })}
                              disabled={checkCompatForFilter.isPending}
                              className="text-xs bg-[#ffe27c] text-[#191265] font-bold px-3 py-1.5 rounded-full hover:bg-[#ffd84a] transition-colors disabled:opacity-50"
                            >
                              {checkCompatForFilter.isPending ? "..." : "בדוק התאמה"}
                            </button>
                          )}
                          {compatData && (
                            <div className="flex flex-col gap-1 items-end">
                              <div className="inline-flex items-center gap-1 bg-[#ffe27c] text-[#191265] font-black px-3 py-1.5 rounded-full text-sm">
                                💛 {Math.round(compatData.score)}%
                              </div>
                              {/* Score breakdown */}
                              {compatData.breakdown && (
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {Object.entries(compatData.breakdown as Record<string, number>).map(([key, val]) => {
                                    const labels: Record<string, string> = { questionnaire: "שאלון", lifeStage: "שלב חיים", dna: "DNA", practical: "מעשי", religiosity: "דתיות", education: "השכלה", cityIntelligence: "עיר" };
                                    return (
                                      <span key={key} className="text-[10px] bg-white border border-[#e9e8e8] px-1.5 py-0.5 rounded-full text-[#191265]">
                                        {labels[key] || key}: {Math.round(val as number)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Send match button */}
                              {filterCompatTarget && filterCompatTarget !== single.id && !compatData.alreadySent && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`לשלוח התאמה בין ${typedSingles.find(s => s.id === filterCompatTarget)?.firstName} ל-${single.firstName}?`)) {
                                      if (compatData.matchId) {
                                        approveMatch.mutate({ matchId: compatData.matchId, hilitsNote: "" });
                                      } else {
                                        createAndSendMatch.mutate({ idA: filterCompatTarget, idB: single.id });
                                      }
                                    }
                                  }}
                                  disabled={approveMatch.isPending || createAndSendMatch.isPending}
                                  className="text-xs bg-[#191265] text-white font-bold px-3 py-1.5 rounded-full hover:bg-[#1800ad] transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Send size={10} />
                                  שלח התאמה
                                </button>
                              )}
                              {compatData.alreadySent && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">📨 כבר נשלחה</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* Inactive Singles Tab */}
        {activeTab === "inactive" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-sm text-[#191265] font-semibold">🚫 חברי מאגר לא פעילים — אפשר להפעיל אותם חזרה</p>
              <p className="text-xs text-[#727272] mt-1">{(allInactiveSingles as any[]).length} חברי מאגר לא פעילים</p>
            </div>
            {(allInactiveSingles as any[]).length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                <div className="text-4xl mb-2">🎉</div>
                <p>אין חברי מאגר לא פעילים</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(allInactiveSingles as any[]).map((s: any) => (
                  <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-red-300">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#191265]">{s.firstName} {s.lastName}</span>
                          {s.gender && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{s.gender === 'male' ? 'גבר' : 'אישה'}</span>}
                          {s.age > 0 && <span className="text-xs text-[#727272]">{s.age}</span>}
                          {s.city && <span className="text-xs text-[#727272]">📍 {s.city}</span>}
                          {s.isCoachingClient && <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">💜 מלווה</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#727272] flex-wrap">
                          {s.height && <span>{s.height} ס"מ</span>}
                          {s.religiosity && <span>· {RELIGIOSITY_LABELS[s.religiosity] || s.religiosity}</span>}
                          {s.maritalStatus && <span>· {MARITAL_LABELS[s.maritalStatus] || s.maritalStatus}</span>}
                          {s.wantsKids && <span>· {s.wantsKids === 'yes' ? '👶 כן' : s.wantsKids === 'no' ? '👶 לא' : '👶 פתוח'}</span>}
                          {s.education && <span>· {EDUCATION_LABELS[s.education] || s.education}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-[#727272] flex-wrap">
                          {s.email && <span>✉️ {s.email}</span>}
                          {s.phone && <span>📞 {s.phone}</span>}
                          <span>נרשם: {s.createdAt ? new Date(s.createdAt).toLocaleDateString('he-IL') : ''}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            toggleActive.mutate({ singleId: s.id, isActive: true });
                            refetchInactive();
                            toast.success(`${s.firstName} הופעל מחדש!`);
                          }}
                          className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          ✅ הפעל מחדש
                        </button>
                        {s.phone && (
                          <a
                            href={`https://wa.me/972${s.phone.replace(/^0/, '').replace(/-/g, '')}?text=${encodeURIComponent('היי ' + s.firstName + ', רציתי לבדוק אם את/ה מעוניין/ת לחזור למאגר הרווקים?')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition-colors"
                          >
                            💬 ואטסאפ
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "dashboard" && (
          <MatchmakingDashboard />
        )}
      </div>
    </div>
  );
}
// ── MissingDataTab ────────────────────────────────────────────────────────────────────────────────
function MissingDataTab() {
  const { data: rows = [], isLoading, refetch } = trpc.admin.getMissingData.useQuery();
  const patchMutation = trpc.admin.patchMissingData.useMutation({
    onSuccess: () => { toast.success("נשמר!"); refetch(); },
    onError: () => toast.error("שגיאה בשמירה"),
  });

  // Local edit state: id -> { age, city, gender }
    const [edits, setEdits] = useState<Record<number, Record<string, string>>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const getEdit = (id: number, field: string, fallback: string) =>
    edits[id]?.[field] ?? fallback;
  const setField = (id: number, field: string, value: string) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const save = (row: any) => {
    const e = edits[row.id];
    if (!e || Object.values(e).every(v => !v)) { toast.error("לא הוזנו נתונים לעדכון"); return; }
    const patch: any = { id: row.id };
    if (e.age) patch.age = parseInt(e.age);
    if (e.city) patch.city = e.city;
    if (e.gender) patch.gender = e.gender;
    if (e.height) patch.height = parseInt(e.height);
    if (e.religiosity) patch.religiosity = e.religiosity;
    if (e.education) patch.education = e.education;
    if (e.maritalStatus) patch.maritalStatus = e.maritalStatus;
    if (e.wantsKids) patch.wantsKids = e.wantsKids;
    if (e.hasKids) patch.hasKids = e.hasKids === "true";
    if (e.phone) patch.phone = e.phone;
    if (e.occupation) patch.occupation = e.occupation;
    patchMutation.mutate(patch);
  };
  const updateSingleInline = (trpc.matchmaking as any).updateSingleInline.useMutation({
    onSuccess: () => { toast.success("נשמר!"); refetch(); setEditingId(null); },
    onError: () => toast.error("שגיאה"),
  });

  if (isLoading) return <div className="text-center py-12 text-[#727272]">טוען...</div>;

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
        <p className="text-sm text-amber-800 font-semibold">⚠️ {rows.length} רווקים עם פרטים חסרים בפרופיל</p>
        <p className="text-xs text-amber-600 mt-1">פרטים חסרים משפיעים על איכות ההתאמות. ניתן לעדכן כאן או לשלוח להם קישור לעדכון פרופיל</p>
      </div>
      {rows.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
          <div className="text-4xl mb-2">✅</div>
          <p>אין רשומות חסרות נתונים!</p>
        </div>
      )}
      {rows.map((row: any) => (
        <div key={row.id} className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-red-400">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-[#191265]">{row.firstName} {row.lastName}</span>
                <Badge className={`text-xs ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {row.isActive ? "פעיל" : "לא פעיל"}
                </Badge>
                {row.questionnaireCompletedAt ? <Badge className="text-xs bg-blue-100 text-blue-700">✓ שאלון</Badge> : <Badge className="text-xs bg-orange-100 text-orange-700">⏳ לא מילא שאלון</Badge>}
              </div>
              {/* Missing fields badges */}
              {row.missingFields && row.missingFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(row.missingFields as string[]).map((f: string) => (
                    <span key={f} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">❌ {f}</span>
                  ))}
                </div>
              )}
              <div className="text-xs text-[#727272] mb-3 flex flex-wrap gap-2">
                {row.email && <span>✉️ {row.email}</span>}
                {row.phone && <span>📞 {row.phone}</span>}
              </div>
              {/* Edit fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">מגדר</label>
                  <select value={getEdit(row.id, "gender", row.gender || "")} onChange={e => setField(row.id, "gender", e.target.value)}
                    className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]">
                    <option value="">בחר</option><option value="male">גבר</option><option value="female">אישה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">גיל ({row.age || "?"})</label>
                  <input type="number" min={18} max={80} value={getEdit(row.id, "age", "")} onChange={e => setField(row.id, "age", e.target.value)}
                    placeholder="גיל" className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">עיר ({row.city || "ריק"})</label>
                  <input type="text" value={getEdit(row.id, "city", "")} onChange={e => setField(row.id, "city", e.target.value)}
                    placeholder="עיר" className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">גובה ({row.height || "?"})</label>
                  <input type="number" min={100} max={250} value={getEdit(row.id, "height", "")} onChange={e => setField(row.id, "height", e.target.value)}
                    placeholder="ס'מ" className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">דתיות</label>
                  <select value={getEdit(row.id, "religiosity", "")} onChange={e => setField(row.id, "religiosity", e.target.value)}
                    className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]">
                    <option value="">בחר</option><option value="secular">חילוני/ת</option><option value="traditional">מסורתי/ת</option><option value="religious">דתי/ת</option><option value="orthodox">חרדי/ת</option><option value="datlash">דתל"ש</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">מצב משפחתי</label>
                  <select value={getEdit(row.id, "maritalStatus", "")} onChange={e => setField(row.id, "maritalStatus", e.target.value)}
                    className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]">
                    <option value="">בחר</option><option value="single">רווק/ה</option><option value="divorced">גרוש/ה</option><option value="widowed">אלמן/ה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">רוצה ילדים</label>
                  <select value={getEdit(row.id, "wantsKids", "")} onChange={e => setField(row.id, "wantsKids", e.target.value)}
                    className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]">
                    <option value="">בחר</option><option value="yes">כן</option><option value="no">לא</option><option value="open">פתוח/ה</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">יש ילדים</label>
                  <select value={getEdit(row.id, "hasKids", "")} onChange={e => setField(row.id, "hasKids", e.target.value)}
                    className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]">
                    <option value="">בחר</option><option value="true">כן</option><option value="false">לא</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">טלפון</label>
                  <input type="text" value={getEdit(row.id, "phone", "")} onChange={e => setField(row.id, "phone", e.target.value)}
                    placeholder="050..." className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#727272] mb-0.5">מקצוע</label>
                  <input type="text" value={getEdit(row.id, "occupation", "")} onChange={e => setField(row.id, "occupation", e.target.value)}
                    placeholder="מקצוע" className="w-full border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-xs text-[#191265] focus:outline-none focus:border-[#191265]" />
                </div>
                <div className="flex items-end gap-2 col-span-2">
                  <button onClick={() => save(row)} disabled={patchMutation.isPending}
                    className="bg-[#191265] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1800ad] transition-colors disabled:opacity-50">
                    שמור שינויים
                  </button>
                  <button onClick={() => setEditingId(row.id)}
                    className="bg-[#ffe27c] text-[#191265] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#ffd84a] transition-colors">
                    ✏️ ערוך כל הפרטים
                  </button>
                </div>
              </div>
              {/* Full edit modal for this person */}
              {editingId === row.id && (
                <EditSingleModal
                  single={row}
                  onClose={() => setEditingId(null)}
                  onSave={(data: any) => updateSingleInline.mutate(data, { onSuccess: () => setEditingId(null) })}
                  isPending={updateSingleInline.isPending}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── CompatibilityCheckTab ─────────────────────────────────────────────────────
interface CompatibilityCheckTabProps {
  allSingles: any[];
  compatPersonA: number | null;
  setCompatPersonA: (id: number | null) => void;
  compatPersonB: number | null;
  setCompatPersonB: (id: number | null) => void;
  compatSearchA: string;
  setCompatSearchA: (s: string) => void;
  compatSearchB: string;
  setCompatSearchB: (s: string) => void;
  compatDropdownA: boolean;
  setCompatDropdownA: (v: boolean) => void;
  compatDropdownB: boolean;
  setCompatDropdownB: (v: boolean) => void;
  compatResult: any;
  isLoading: boolean;
  onCheck: () => void;
  onSendMatch: () => void;
  isSendingMatch: boolean;
  canSendDirectly?: boolean;
}

function PersonSelector({
  label,
  allSingles,
  selectedId,
  onSelect,
  search,
  setSearch,
  dropdownOpen,
  setDropdownOpen,
}: {
  label: string;
  allSingles: any[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  search: string;
  setSearch: (s: string) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (v: boolean) => void;
}) {
  const selectedPerson = allSingles.find(s => s.id === selectedId);
  const filtered = allSingles.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.firstName || "").toLowerCase().includes(q) ||
      (s.lastName || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.phone || "").includes(q) ||
      (s.city || "").toLowerCase().includes(q)
    );
  }).slice(0, 50);

  return (
    <div className="flex-1 min-w-0 relative">
      <label className="block text-sm font-bold text-[#191265] mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-[#e9e8e8] rounded-xl text-right hover:border-[#191265] transition-colors focus:outline-none focus:border-[#191265]"
      >
        {selectedPerson ? (
          <span className="text-[#191265] font-semibold text-sm">
            {selectedPerson.firstName} {selectedPerson.lastName}
            {selectedPerson.age && selectedPerson.age > 0 ? ` (${selectedPerson.age})` : ""}
            {selectedPerson.city ? ` · ${selectedPerson.city}` : ""}
          </span>
        ) : (
          <span className="text-[#aaa] text-sm">בחר/י אדם...</span>
        )}
        <ChevronDown size={16} className={`text-[#727272] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-white border border-[#e9e8e8] rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#f9f7f3] rounded-lg">
              <Search size={14} className="text-[#727272]" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם, עיר, אימייל..."
                className="flex-1 bg-transparent text-sm text-[#191265] placeholder-[#aaa] outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[#aaa] hover:text-[#191265]">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-[#aaa] text-sm">לא נמצאו תוצאות</div>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelect(s.id); setDropdownOpen(false); setSearch(""); }}
                  className={`w-full text-right px-4 py-2.5 hover:bg-[#f9f7f3] transition-colors flex items-center gap-3 ${selectedId === s.id ? "bg-[#f0eadc]" : ""}`}
                >
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover object-[center_20%] flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#191265] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(s.firstName || "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#191265] text-sm">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-[#727272] truncate">
                      {s.age && s.age > 0 ? `${s.age} · ` : ""}{s.city || ""}{s.gender ? ` · ${s.gender === "female" ? "אישה" : "גבר"}` : ""}
                    </div>
                  </div>
                  {selectedId === s.id && <CheckCircle size={14} className="text-green-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BREAKDOWN_LABELS: Record<string, string> = {
  questionnaire: "שאלון מדעי",
  lifeStage: "שלב חיים",
  dna: "DNA",
  practical: "פרקטי",
  religiosity: "דתיות",
  education: "השכלה",
  cityIntelligence: "מיקום",
};

const BREAKDOWN_MAX: Record<string, number> = {
  questionnaire: 40,
  lifeStage: 20,
  dna: 15,
  practical: 5,
  religiosity: 7,
  education: 6,
  cityIntelligence: 7,
};

function CompatibilityCheckTab({
  allSingles,
  compatPersonA,
  setCompatPersonA,
  compatPersonB,
  setCompatPersonB,
  compatSearchA,
  setCompatSearchA,
  compatSearchB,
  setCompatSearchB,
  compatDropdownA,
  setCompatDropdownA,
  compatDropdownB,
  setCompatDropdownB,
  compatResult,
  isLoading,
  onCheck,
  onSendMatch,
  isSendingMatch,
  canSendDirectly,
}: CompatibilityCheckTabProps) {
  const scoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 55) return "text-yellow-600";
    return "text-red-500";
  };

  const scoreBg = (score: number) => {
    if (score >= 75) return "bg-green-50 border-green-200";
    if (score >= 55) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-black text-[#191265] mb-1">בדיקת התאמה ידנית</h2>
        <p className="text-sm text-[#727272]">בחרי שני אנשים מהמאגר לקבלת ניתוח התאמה מלא עם ציון וסיפור AI</p>
      </div>

      {/* Person Selectors */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex gap-4 items-start flex-wrap">
          <PersonSelector
            label="אדם א׳"
            allSingles={allSingles}
            selectedId={compatPersonA}
            onSelect={setCompatPersonA}
            search={compatSearchA}
            setSearch={setCompatSearchA}
            dropdownOpen={compatDropdownA}
            setDropdownOpen={setCompatDropdownA}
          />
          <div className="flex items-center justify-center pt-8 text-2xl text-[#727272] font-bold">⟷</div>
          <PersonSelector
            label="אדם ב׳"
            allSingles={allSingles}
            selectedId={compatPersonB}
            onSelect={setCompatPersonB}
            search={compatSearchB}
            setSearch={setCompatSearchB}
            dropdownOpen={compatDropdownB}
            setDropdownOpen={setCompatDropdownB}
          />
        </div>

        <button
          onClick={onCheck}
          disabled={isLoading || !compatPersonA || !compatPersonB}
          className="mt-5 w-full bg-[#191265] text-white font-black text-base py-3.5 rounded-xl hover:bg-[#1800ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              מחשב התאמה + יוצר ניתוח AI... (עד 20 שניות)
            </>
          ) : (
            <>
              <Zap size={18} />
              בדוק התאמה
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {compatResult && (
        <div className="space-y-4">
          {/* Warnings Banner */}
          {compatResult.warnings && compatResult.warnings.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4" dir="rtl">
              <div className="font-black text-amber-700 text-sm mb-2">⚠️ אזהרות פילטר קשה (בדיקה ידנית)</div>
              <ul className="space-y-1">
                {compatResult.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-amber-800 text-sm">{w}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">הציון מחושב ללא הפילטרים הקשים, ההחלטה הסופית בידיים שלך.</p>
            </div>
          )}
          {/* Score Card */}
          <div className={`rounded-2xl border-2 p-6 ${scoreBg(compatResult.score)}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className={`text-6xl font-black ${scoreColor(compatResult.score)}`}>
                  {Math.round(compatResult.score)}%
                </div>
                <div className="text-sm text-[#727272] mt-1">ציון התאמה כולל</div>
              </div>
              <div className="flex gap-4 flex-wrap">
                {/* Person A */}
                <div className="text-center">
                  {compatResult.personA?.photoUrl ? (
                    <img src={compatResult.personA.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover object-[center_20%] mx-auto mb-1 border-2 border-white shadow" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#191265] flex items-center justify-center text-white text-xl font-bold mx-auto mb-1">
                      {(compatResult.personA?.firstName || "?")[0]}
                    </div>
                  )}
                  <div className="text-sm font-bold text-[#191265]">{compatResult.personA?.firstName} {compatResult.personA?.lastName}</div>
                  <div className="text-xs text-[#727272]">{compatResult.personA?.age && compatResult.personA.age > 0 ? `${compatResult.personA.age} · ` : ""}{compatResult.personA?.city || ""}</div>
                </div>
                <div className="flex items-center text-2xl text-[#727272]">💛</div>
                {/* Person B */}
                <div className="text-center">
                  {compatResult.personB?.photoUrl ? (
                    <img src={compatResult.personB.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover object-[center_20%] mx-auto mb-1 border-2 border-white shadow" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#191265] flex items-center justify-center text-white text-xl font-bold mx-auto mb-1">
                      {(compatResult.personB?.firstName || "?")[0]}
                    </div>
                  )}
                  <div className="text-sm font-bold text-[#191265]">{compatResult.personB?.firstName} {compatResult.personB?.lastName}</div>
                  <div className="text-xs text-[#727272]">{compatResult.personB?.age && compatResult.personB.age > 0 ? `${compatResult.personB.age} · ` : ""}{compatResult.personB?.city || ""}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Bars */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-black text-[#191265] mb-4">פירוט ציונים</h3>
            <div className="space-y-3">
              {Object.entries(compatResult.breakdown || {}).map(([key, value]: [string, any]) => {
                const maxVal = BREAKDOWN_MAX[key] || 100;
                const pct = Math.min(100, Math.round((value / maxVal) * 100));
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#191265]">{value}/{maxVal}</span>
                      <span className="text-sm text-[#727272]">{BREAKDOWN_LABELS[key] || key}</span>
                    </div>
                    <div className="h-2.5 bg-[#f0eadc] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Narrative */}
          {compatResult.narrative && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-black text-[#191265] mb-3 flex items-center gap-2">
                <span>✨</span> ניתוח AI
              </h3>
              <div className="text-sm text-[#191265] leading-relaxed whitespace-pre-wrap bg-[#f9f7f3] rounded-xl p-4">
                {compatResult.narrative}
              </div>
            </div>
          )}

          {/* Send Match Button */}
          {compatResult.matchId ? (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <button
                onClick={() => {
                  if (window.confirm(`לשלוח התאמה בין ${compatResult.personA?.firstName || ''} ל-${compatResult.personB?.firstName || ''}?`)) {
                    onSendMatch();
                  }
                }}
                disabled={isSendingMatch || compatResult.matchStatus === 'proposed' || compatResult.matchStatus === 'matched'}
                className="w-full bg-[#191265] text-white font-black text-base py-4 rounded-xl hover:bg-[#1800ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSendingMatch ? (
                  <><RefreshCw size={18} className="animate-spin" /> שולח...</>
                ) : compatResult.matchStatus === 'proposed' ? (
                  <><CheckCircle size={18} /> ההצעה כבר נשלחה</>
                ) : compatResult.matchStatus === 'matched' ? (
                  <><CheckCircle size={18} /> התאמה מאושרת!</>
                ) : (
                  <><Send size={18} /> שלח התאמה לשני הצדדים 💛</>
                )}
              </button>
              {(compatResult.matchStatus === 'proposed' || compatResult.matchStatus === 'matched') && (
                <p className="text-center text-xs text-[#727272] mt-2">סטטוס: {MATCH_STATUS_CONFIG[compatResult.matchStatus]?.label}</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              {canSendDirectly ? (
                <>
                  <p className="text-center text-sm text-[#727272] mb-3">שליחת התאמה ישירה ללא הרצת אלגוריתם — הציון יחושב אוטומטית</p>
                  <button
                    onClick={() => {
                      if (window.confirm('לשלוח התאמה ישירהת לשני האנשים האלה?')) {
                        onSendMatch();
                      }
                    }}
                    disabled={isSendingMatch}
                    className="w-full bg-[#191265] text-white font-black text-base py-4 rounded-xl hover:bg-[#1800ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingMatch ? (
                      <><RefreshCw size={18} className="animate-spin" /> שולח...</>
                    ) : (
                      <><Send size={18} /> שלח התאמה לשני הצדדים 💛</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-[#727272] mb-3">בחרי שני אנשים כדי לשלוח התאמה</p>
                  <button
                    disabled
                    className="w-full bg-gray-200 text-gray-400 font-black text-base py-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> שלח התאמה לשני הצדדים
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!compatResult && !isLoading && (
        <div className="text-center py-16 text-[#aaa]">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold text-[#727272]">בחרי שני אנשים ולחצי "בדוק התאמה"</p>
          <p className="text-sm mt-1">הניתוח כולל ציון מפורט + סיפור AI מותאם אישית</p>
        </div>
      )}
    </div>
  );
}
