/**
 * CRM Matchmaking   admin page for managing the singles database and matches
 * URL: /crm/matchmaking
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Heart, Zap, Copy, RefreshCw, CheckCircle, Clock, XCircle, Send, Gift, Search, X, ChevronDown } from "lucide-react";
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

export default function CRMMatchmaking() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"singles" | "matches" | "unmatched" | "tokens" | "inactive_leads" | "missing_data" | "update_requests" | "compatibility" | "live_event" | "filter_search">("singles");
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
  const [matchSubTab, setMatchSubTab] = useState<"pending" | "proposed" | "matched" | "rejected" | "expired" | "followup">("pending");
  const [matchSearch, setMatchSearch] = useState("");
  const [hideProposed, setHideProposed] = useState(false); // show all singles by default
  const [photoUploadSingleId, setPhotoUploadSingleId] = useState<number | null>(null);
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

  // Live event registrations
  const { data: liveRegistrations = [], isLoading: liveLoading } = (trpc.events as any).getLiveRegistrations.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && activeTab === "live_event",
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

  if (loading) {
    return <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl"><div className="text-[#191265]">טוענת...</div></div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center" dir="rtl">
        <div className="text-center bg-white rounded-3xl p-10 shadow-2xl max-w-sm mx-4">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black text-[#191265] mb-2">ניהול מאגר</h1>
          <a href={getLoginUrl()} className="block bg-[#191265] text-white font-bold text-lg px-8 py-4 rounded-2xl text-center mt-4">כניסה</a>
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
  }>;

  const typedTokens = (tokens as unknown) as Array<{
    id: number; token: string; note?: string | null; usedAt?: number | null;
    usedByEmail?: string | null; createdAt: number; expiresAt?: number | null;
  }>;

  // Set of single IDs currently in an active (proposed) match
  const activeMatchSingleIds = new Set<number>(
    typedMatches
      .filter(m => m.status === "proposed")
      .flatMap(m => [m.singleAId, m.singleBId])
  );
  // Map: singleId -> active match details (partner name, days, matchId)
  const activeMatchBySingleId = new Map<number, { matchId: number; opponentName: string; opponentId: number; daysInMatch: number; approvedByA: boolean | null; approvedByB: boolean | null; isA: boolean }>();
  typedMatches.filter(m => m.status === "proposed").forEach(m => {
    const daysInMatch = m.proposedAt ? Math.floor((Date.now() - (m.proposedAt as number)) / (1000 * 60 * 60 * 24)) : 0;
    activeMatchBySingleId.set(m.singleAId, { matchId: m.id, opponentName: m.singleBName || "?", opponentId: m.singleBId, daysInMatch, approvedByA: m.approvedByA, approvedByB: m.approvedByB, isA: true });
    activeMatchBySingleId.set(m.singleBId, { matchId: m.id, opponentName: m.singleAName || "?", opponentId: m.singleAId, daysInMatch, approvedByA: m.approvedByA, approvedByB: m.approvedByB, isA: false });
  });
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
  // "proposed" tab = ALL sent matches (status=proposed, regardless of approvals)
  // "no_match" tab = rejected OR expired only
  const isNoMatch = (m: any) => {
    if (m.status === "rejected") return true;
    if (m.status === "expired") return true;
    return false;
  };
  const isWaitingProposed = (m: any) => {
    return m.status === "proposed";
  };

  const matchSubCounts = {
    pending:  typedMatches.filter(m => m.status === "pending").length,
    proposed: typedMatches.filter(m => isWaitingProposed(m)).length,
    matched:  typedMatches.filter(m => m.status === "matched" && !(m.matchedAt && m.matchedAt < now14daysAgo)).length,
    rejected: typedMatches.filter(m => isNoMatch(m)).length,
    expired:  0, // merged into rejected
    followup: typedMatches.filter(m => m.status === "matched" && m.matchedAt && m.matchedAt < now14daysAgo).length,
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
    pending:  typedMatches.filter(m => m.status === "pending").filter(filterMatchByName),
    proposed: typedMatches.filter(m => isWaitingProposed(m)).filter(filterMatchByName),
    matched:  typedMatches.filter(m => m.status === "matched" && !(m.matchedAt && m.matchedAt < now14daysAgo)).filter(filterMatchByName),
    rejected: typedMatches.filter(m => isNoMatch(m)).filter(filterMatchByName),
    expired:  [],
    followup: typedMatches.filter(m => m.status === "matched" && m.matchedAt && m.matchedAt < now14daysAgo).filter(filterMatchByName),
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
            { id: "live_event" as const, label: "לייב 16.6 🎙️", icon: <span>🎙️</span> },
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
            </div>

            {filteredSingles.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-[#727272]">
                <div className="text-4xl mb-2">👥</div>
                <p>{singlesSearch ? "לא נמצאו תוצאות לחיפוש" : "אין חברים במאגר עדיין"}</p>
              </div>
            )}
            {filteredSingles.map(single => (
              <div key={single.id} className={`bg-white rounded-xl p-4 shadow-sm border-r-4 ${single.isActive ? "border-green-400" : "border-gray-200"}`}>
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
                  <div className="flex items-center gap-2">
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
                                      <p className="text-[10px] text-[#727272]">{displayAge(m.opponent?.age)} · {m.opponent?.city || ""}</p>
                                      {m.opponent?.dnaType && (
                                        <p className="text-[10px] text-[#1800ad] font-medium">{DNA_LABELS[m.opponent.dnaType] || m.opponent.dnaType}</p>
                                      )}
                                      <div className="mt-1.5 bg-[#ffe27c] text-[#191265] font-black text-xs px-2 py-0.5 rounded-full inline-block">
                                        {Math.round(m.score)}%
                                      </div>
                                      {(m.status === "proposed" || m.status === "matched" || m.status === "rejected") && (
                                        <div className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-full inline-block font-bold ${
                                          m.status === "matched" ? "bg-green-100 text-green-700" :
                                          m.status === "proposed" ? "bg-blue-100 text-blue-700" :
                                          "bg-red-100 text-red-600"
                                        }`}>
                                          {m.status === "proposed" ? "📨 כבר נשלחה" : m.status === "matched" ? "💛 התאמה!" : "❌ נדחה"}
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
                { id: "proposed" as const, label: "נשלחה הצעה",      icon: "📨", count: matchSubCounts.proposed },
                { id: "matched"  as const, label: "יש התאמה",        icon: "💛", count: matchSubCounts.matched },
                { id: "rejected" as const, label: "אין התאמה",       icon: "❌", count: matchSubCounts.rejected },
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
                📨 <strong>נשלחה הצעה</strong> — כל ההצעות שנשלחו לרווקים וממתינות לתשובה. ניתן לראות מי אישר ומי טרם ענה.
              </div>
            )}
            {matchSubTab === "matched" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                💛 <strong>יש התאמה</strong> — שני הצדדים אישרו! פרטי הקשר נחשפו.
              </div>
            )}
            {matchSubTab === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                ❌ <strong>אין התאמה</strong> — כולל: דחיות, הצעות שפג תוקפן, ומקרים שאחד אישר ואחד דחה. ניתן לראות מי עשה מה ליד כל שם.
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
              const cfg = MATCH_STATUS_CONFIG[match.status] || MATCH_STATUS_CONFIG.pending;
              const isExpanded = expandedMatch === match.id;

              // Per-person status helper
              const getPersonStatus = (isA: boolean) => {
                const emailOpened = isA ? match.emailAOpenedAt : match.emailBOpenedAt;
                const tokenUsed = isA ? match.tokenAUsedAt : match.tokenBUsedAt;
                const approved = isA ? match.approvedByA : match.approvedByB;
                const isProposed = match.status === "proposed" || match.status === "matched" || match.status === "expired";
                if (!isProposed) return null;
                if (match.status === "matched") return { icon: "❤️", label: "אישרו: התאמה!", color: "bg-green-100 text-green-800" };
                if (approved === false) return { icon: "❌", label: "דחה/תה את ההצעה", color: "bg-red-100 text-red-700" };
                if (approved === true) return { icon: "✅", label: "אישר/ה", color: "bg-emerald-100 text-emerald-800" };
                if (match.status === "expired") return { icon: "⏰", label: "ההצעה פגה", color: "bg-gray-100 text-gray-500" };
                if (tokenUsed) return { icon: "👀", label: "טרם השיב/ה", color: "bg-amber-100 text-amber-800" };
                if (emailOpened) return { icon: "📧", label: "טרם השיב/ה", color: "bg-blue-100 text-blue-700" };
                return { icon: "⏳", label: "טרם השיב/ה", color: "bg-gray-100 text-gray-500" };
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
                },
              ];

              return (
                <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                          <Send size={12} />
                          שלח התאמה
                        </button>
                      )}
                      <span className="text-xs text-[#727272]">
                        {new Date(typeof match.createdAt === 'number' ? match.createdAt : match.createdAt).toLocaleDateString("he-IL")}
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
                          <div key={i} className="bg-[#f8f6f0] rounded-xl p-3">
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
                                <p className="font-bold text-[#191265] text-sm truncate">{s.name || `#${s.id}`}</p>
                                <p className="text-xs text-[#727272]">{s.gender ? GENDER_LABELS[s.gender] : ""} · {displayAge(s.age)} · {s.city}</p>
                                {s.dna && <p className="text-xs text-[#1800ad] font-medium">{DNA_LABELS[s.dna] || s.dna}</p>}
                              </div>
                            </div>
                            {/* Details */}
                            <div className="space-y-1 text-xs text-[#727272]">
                              {s.occ && <p>💼 {s.occ}</p>}
                              {s.education && <p>🎓 {EDUCATION_LABELS[s.education] || s.education}</p>}
                              {s.religiosity && <p>✨ {RELIGIOSITY_LABELS[s.religiosity] || s.religiosity}</p>}
                              {s.height && <p>📏 {s.height} ס"מ</p>}
                              {s.hasKids != null && (
                                <p>👶 {s.hasKids ? `יש ילדים${s.numKids ? ` (${s.numKids})` : ""}` : "אין ילדים"}{s.wantsKids ? ` · ${wantsKidsLabel[s.wantsKids] || s.wantsKids}` : ""}</p>
                              )}
                              {s.phone && <p>📱 {s.phone}</p>}
                              {(s.minAge || s.maxAge) && (
                                <p>🔍 מחפש/ת גיל: {s.minAge || ""}{s.minAge && s.maxAge ? "-" : ""}{s.maxAge || ""}</p>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMatch.mutate({ matchId: match.id, hilitsNote: hilitsNotes[match.id] || undefined })}
                            disabled={approveMatch.isPending}
                            className="flex-1 bg-[#ffe27c] text-[#191265] hover:bg-[#ffd84a] font-bold border-0 py-3"
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

                      {/* Release both from rejected match */}
                      {match.status === "rejected" && (
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`לשחרר את ${match.singleAName} ו-${match.singleBName} מההתאמה הזו?`)) {
                                releaseFromMatch.mutate({ matchId: match.id });
                              }
                            }}
                            disabled={releaseFromMatch.isPending}
                            className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            🔓 שחרר שניהם מהתאמה זו
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
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
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
                          {s.dnaType && ` · ${DNA_LABELS[s.dnaType] || s.dnaType}`}
                          {s.religiosity && ` · ${RELIGIOSITY_LABELS[s.religiosity] || s.religiosity}`}
                        </p>
                        {s.phone && (
                          <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '972')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:text-green-700">
                            📱 {s.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Suggested matches */}
                    {s.suggestions && s.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[#191265] mb-2">💡 התאמות מומלצות:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {s.suggestions.map((sug: any) => (
                            <div key={sug.id} className="bg-[#f8f6f0] rounded-lg p-2 text-center">
                              {sug.photoUrl ? (
                                <button
                                  onClick={() => setLightboxUrl(sug.photoUrl)}
                                  className="focus:outline-none"
                                  title="הגדל תמונה"
                                >
                                  <img src={sug.photoUrl} alt={sug.name} className="w-10 h-10 rounded-lg object-cover object-[center_20%] mx-auto mb-1 hover:opacity-80 cursor-zoom-in transition-opacity" />
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#191265]/10 flex items-center justify-center mx-auto mb-1 text-lg">
                                  {sug.gender === 'female' ? '👩' : '👨'}
                                </div>
                              )}
                              <p className="text-xs font-bold text-[#191265] truncate">{sug.name}</p>
                              <p className="text-[10px] text-[#727272]">{displayAge(sug.age)} · {sug.city || ''}</p>
                              <div className="text-[10px] font-black text-[#1800ad] mt-0.5">{sug.score}%</div>
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
            if (filterCity && !(s.city || "").toLowerCase().includes(filterCity.toLowerCase())) return false;
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
                <div className="flex items-center gap-3">
                  <button onClick={() => { setFilterGender(""); setFilterMinAge(""); setFilterMaxAge(""); setFilterCity(""); setFilterReligiosity(""); setFilterDna(""); setFilterName(""); setFilterCompatTarget(null); setFilterCompatSearch(""); setFilterCompatResult({}); setFilterMinHeight(""); setFilterMaxHeight(""); setFilterMaritalStatus(""); setFilterWantsKids(""); setFilterHasKids(""); }}
                    className="text-xs text-[#727272] underline">נקה הכל</button>
                  <span className="text-sm font-bold text-[#191265]">{filteredResults.length} תוצאות</span>
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
                  return (
                    <div key={single.id} className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-[#191265]/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Live Event Tab */}
        {activeTab === "live_event" && (
          <div className="space-y-4">
            <div className="bg-[#191265] rounded-2xl p-5 text-white text-center">
              <div className="text-3xl mb-2">🎙️</div>
              <h2 className="text-xl font-black">לייב שאלות ותשובות | 16.6.2026 | 20:30</h2>
              <p className="text-white/70 text-sm mt-1">{liveRegistrations.length} נרשמים</p>
            </div>
            {liveLoading ? (
              <div className="text-center py-10 text-[#727272]">טוענת...</div>
            ) : liveRegistrations.length === 0 ? (
              <div className="text-center py-10 text-[#727272]">
                <div className="text-4xl mb-2">📭</div>
                <p>אין נרשמים עדיין</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-[#f0eadc]">
                    <tr>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">#</th>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">שם</th>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">מייל</th>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">טלפון</th>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">מדריך</th>
                      <th className="px-4 py-3 text-right font-bold text-[#191265]">תאריך הרשמה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(liveRegistrations as any[]).map((reg: any, i: number) => (
                      <tr key={reg.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"}>
                        <td className="px-4 py-3 text-[#727272]">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-[#191265]">{reg.name}</td>
                        <td className="px-4 py-3 text-[#727272]">{reg.email}</td>
                        <td className="px-4 py-3 text-[#191265]">
                          <a href={`https://wa.me/972${(reg.phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                            {reg.phone || 'לא צוין'}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {reg.receivedGuide ? (
                            <span className="text-green-600 font-semibold">✅ קיבל/ה</span>
                          ) : (
                            <span className="text-[#aaa]">לא</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#727272] text-xs">
                          {reg.createdAt ? new Date(reg.createdAt).toLocaleString('he-IL') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ── MissingDataTab ────────────────────────────────────────────────────────────
function MissingDataTab() {
  const { data: rows = [], isLoading, refetch } = trpc.admin.getMissingData.useQuery();
  const patchMutation = trpc.admin.patchMissingData.useMutation({
    onSuccess: () => { toast.success("נשמר!"); refetch(); },
    onError: () => toast.error("שגיאה בשמירה"),
  });

  // Local edit state: id -> { age, city, gender }
  const [edits, setEdits] = useState<Record<number, { age: string; city: string; gender: string }>>({});

  const getEdit = (id: number, field: "age" | "city" | "gender", fallback: string) =>
    edits[id]?.[field] ?? fallback;

  const setField = (id: number, field: "age" | "city" | "gender", value: string) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], age: prev[id]?.age ?? "", city: prev[id]?.city ?? "", gender: prev[id]?.gender ?? "", [field]: value } }));

  const save = (row: any) => {
    const e = edits[row.id];
    const age = e?.age ? parseInt(e.age) : undefined;
    const city = e?.city || undefined;
    const gender = (e?.gender as "male" | "female") || undefined;
    if (!age && !city && !gender) { toast.error("לא הוזנו נתונים לעדכון"); return; }
    patchMutation.mutate({ id: row.id, ...(age ? { age } : {}), ...(city ? { city } : {}), ...(gender ? { gender } : {}) });
  };

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
                {row.questionnaireCompletedAt && <Badge className="text-xs bg-blue-100 text-blue-700">✓ שאלון</Badge>}
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
              <div className="flex gap-2 flex-wrap items-end">
                {/* Gender */}
                <div>
                  <label className="block text-xs text-[#727272] mb-1">מגדר</label>
                  <select
                    value={getEdit(row.id, "gender", row.gender || "male")}
                    onChange={e => setField(row.id, "gender", e.target.value)}
                    className="border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-sm text-[#191265] focus:outline-none focus:border-[#191265]"
                  >
                    <option value="male">גבר</option>
                    <option value="female">אישה</option>
                  </select>
                </div>
                {/* Age */}
                <div>
                  <label className="block text-xs text-[#727272] mb-1">גיל (כרגע: {row.age || "?"})</label>
                  <input
                    type="number"
                    min={18} max={80}
                    value={getEdit(row.id, "age", "")}
                    onChange={e => setField(row.id, "age", e.target.value)}
                    placeholder="גיל"
                    className="border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-sm text-[#191265] w-20 focus:outline-none focus:border-[#191265]"
                  />
                </div>
                {/* City */}
                <div>
                  <label className="block text-xs text-[#727272] mb-1">עיר (כרגע: {row.city || "ריק"})</label>
                  <input
                    type="text"
                    value={getEdit(row.id, "city", "")}
                    onChange={e => setField(row.id, "city", e.target.value)}
                    placeholder="עיר מגורים"
                    className="border border-[#e9e8e8] rounded-lg px-2 py-1.5 text-sm text-[#191265] w-32 focus:outline-none focus:border-[#191265]"
                  />
                </div>
                <button
                  onClick={() => save(row)}
                  disabled={patchMutation.isPending}
                  className="bg-[#191265] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1800ad] transition-colors disabled:opacity-50"
                >
                  שמור
                </button>
              </div>
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
