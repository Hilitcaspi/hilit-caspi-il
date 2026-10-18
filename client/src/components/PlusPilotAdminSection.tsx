import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PlusCancellationQueue from "@/components/PlusCancellationQueue";

const STATUS_LABELS: Record<string, string> = {
  waitlist: "רשימת המתנה",
  eligible: "זכאי/ת",
  invited: "הוזמן/ה",
  active: "פעיל/ה",
  declined: "לא מומש",
  churned: "מנוי שהסתיים",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  proposed: "ממתינה לתשובה",
  matched: "שני הצדדים אישרו",
  rejected: "ההצעה נסגרה",
  expired: "פג תוקף",
  pending: "חזרה למאגר",
};

function formatDate(value: number | null | undefined) {
  return value ? new Date(value).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—";
}

type ServiceDeparture = {
  requested?: boolean;
  state?: "not_requested" | "finishing_cycle" | "archived" | "needs_review";
  endsAt?: number | null;
  remaining?: number;
  reason?: "target_met" | "cycle_elapsed" | null;
};

function ServiceDepartureNotice({
  serviceDeparture,
  cancellationPending,
  archived = false,
  endedAt,
}: {
  serviceDeparture?: ServiceDeparture;
  cancellationPending?: boolean;
  archived?: boolean;
  endedAt?: number | null;
}) {
  if (archived) {
    const serviceEndedAt = serviceDeparture?.endsAt ?? endedAt;
    const expiredWithRemaining = serviceDeparture?.reason === "cycle_elapsed" && (serviceDeparture.remaining || 0) > 0;
    return <div data-service-departure-state={serviceDeparture?.state || "archived"} className="mt-2 space-y-1 text-[10px]">
      <p className="font-bold text-[#5d557d]">שירות Plus הסתיים · {formatDate(serviceEndedAt)}</p>
      {expiredWithRemaining && <p className="text-amber-900">נותרו {serviceDeparture?.remaining} הצעות במחזור שהסתיים</p>}
      {cancellationPending && <p className="font-bold text-amber-900">עצירת Grow טרם אושרה</p>}
    </div>;
  }

  if (serviceDeparture?.state === "finishing_cycle") {
    return <div data-service-departure-state="finishing_cycle" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-950">
      <strong>סיום שירות Plus בתום המחזור</strong>
      <p className="mt-1">נותרו {serviceDeparture.remaining || 0} הצעות להשלמה במחזור הנוכחי.</p>
      <p className="mt-1">מועד העברה אוטומטית לארכיון: {formatDate(serviceDeparture.endsAt)}</p>
    </div>;
  }

  if (serviceDeparture?.state === "needs_review") {
    return <div data-service-departure-state="needs_review" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-950">
      <strong>בקשת סיום שירות דורשת בירור</strong>
      <p className="mt-1">נדרשים פרטי המחזור כדי לקבוע את מועד סיום השירות.</p>
    </div>;
  }

  return null;
}

export default function PlusPilotAdminSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [serviceDepartureView, setServiceDepartureView] = useState<"active" | "finishing" | "archived">("active");
  const [cohort, setCohort] = useState("pilot-01");
  const [price, setPrice] = useState("99");
  const [endMember, setEndMember] = useState<{ id: number; name: string } | null>(null);
  const [providerStopped, setProviderStopped] = useState(false);
  const overview = trpc.plusPilot.adminOverview.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const updateStatus = trpc.plusPilot.adminUpdateStatus.useMutation({ onSuccess: () => overview.refetch(), onError: error => toast.error(error.message) });
  const endMembership = trpc.plusPilot.adminEndMembership.useMutation({
    onSuccess: () => { setEndMember(null); setProviderStopped(false); overview.refetch(); toast.success("מנוי Plus הסתיים באתר והועבר לארכיון. החברות במאגר לא שונתה."); },
    onError: error => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview.data?.rows || []).filter((row: any) => {
      const matchesStatus = !row.archived && (serviceDepartureView !== "active" || row.serviceDeparture?.state === "needs_review" || (statusFilter === "needs_matches" ? row.cycleProgress.needsMatches : statusFilter === "all" || row.pilot.status === statusFilter));
      const matchesServiceView = serviceDepartureView === "active"
        ? !row.archived && (!row.serviceDeparture?.requested || row.serviceDeparture?.state === "needs_review")
        : serviceDepartureView === "finishing"
          ? !row.archived && row.serviceDeparture?.state === "finishing_cycle"
          : false;
      const haystack = `${row.single.firstName || ""} ${row.single.lastName || ""} ${row.single.email || ""} ${row.single.phone || ""}`.toLowerCase();
      return matchesStatus && matchesServiceView && (!query || haystack.includes(query));
    });
  }, [overview.data?.rows, search, statusFilter, serviceDepartureView]);

  const archivedRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview.data?.rows || []).filter(row => row.archived && (!query || `${row.single.firstName} ${row.single.lastName || ""} ${row.single.email || ""}`.toLowerCase().includes(query)));
  }, [overview.data?.rows, search]);

  const verifiedPurchases = useMemo(() => {
    const active = (overview.data?.rows || [])
      .filter((row: any) => row.confirmedPayment && !row.archived)
      .map((row: any) => ({
        key: `active-${row.pilot.id}`,
        fullName: `${row.single.firstName || ""} ${row.single.lastName || ""}`.trim(),
        amountAgorot: row.pilot.pilotPriceAgorot || 9900,
        paidAt: row.pilot.lastPaymentAt,
        state: "active" as const,
      }));
    const pending = (overview.data?.pendingPaidProfiles || []).map((row: any) => ({
      key: `pending-${row.id}`,
      fullName: row.fullName,
      amountAgorot: row.amountAgorot || 9900,
      paidAt: row.paidAt,
      state: "pending_database" as const,
    }));
    return [...active, ...pending]
      .sort((a, b) => Number(b.paidAt || 0) - Number(a.paidAt || 0))
      .slice(0, 12);
  }, [overview.data?.rows, overview.data?.pendingPaidProfiles]);

  if (overview.isLoading) return <section className="h-44 rounded-2xl bg-white animate-pulse border border-[#e9e8e8]" />;
  if (!overview.data) return <section className="rounded-2xl border bg-white p-5"><p>לא ניתן לטעון את נתוני Plus כרגע.</p><button type="button" onClick={() => overview.refetch()}>ניסיון נוסף</button></section>;
  const { counts, commitment, capacity, capacityBreakdown, pendingPaidProfiles, relaunchStats, holidayLaunchStats, waitlistToInviteRate, inviteToActiveRate, retentionRate, serviceNeeds } = overview.data;
  const cancellationQueue = overview.data.cancellationQueue;

  const changeStatus = (id: number, status: "waitlist" | "eligible" | "invited" | "active" | "declined" | "churned") => {
    updateStatus.mutate({
      id,
      status,
      pilotCohort: cohort || undefined,
      pilotPriceAgorot: price ? Math.round(Number(price) * 100) : undefined,
    });
  };

  return (
    <section className="rounded-2xl border border-[#e4d27e] bg-gradient-to-br from-[#fffdf4] to-white p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#8b7420]">מנוי פרימיום · יעד מדיד של 2 הצעות, או 3 במחזור ההשקה לזכאים</p>
          <h3 className="mt-1 text-lg font-black text-[#191265]">Database Plus</h3>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-[#666]">מחזור ההתאמות הידניות מתקדם אוטומטית כל 30 יום כל עוד Plus פעיל, גם אם הודעת החידוש מ־Grow לא נקלטה. מחזור שירות אינו אישור תשלום. מנוי שסיימת יופיע רק בארכיון המקופל למטה.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => overview.refetch()} disabled={overview.isFetching} className="rounded-xl border border-[#d8b67e] bg-white px-3 py-2 font-bold text-[#6f541d] disabled:opacity-50">
            {overview.isFetching ? "מרענן…" : "רענון עכשיו"}
          </button>
          <label className="rounded-xl border bg-white px-3 py-2">קוהורט <input value={cohort} onChange={event => setCohort(event.target.value)} className="mr-2 w-24 outline-none" /></label>
          <label className="rounded-xl border bg-white px-3 py-2">מחיר פיילוט ₪ <input type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} className="mr-2 w-16 outline-none" /></label>
        </div>
      </div>

      <PlusCancellationQueue
        rows={cancellationQueue}
        refreshing={overview.isFetching}
        onRefresh={() => overview.refetch()}
        onEnd={request => {
          const fullName = `${request.single.firstName} ${request.single.lastName || ""}`.trim();
          setEndMember({ id: request.plusMemberId, name: fullName });
          setProviderStopped(false);
        }}
      />

      <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          ["ממתינים", counts.waitlist + counts.eligible, "text-[#191265]"],
          ["הוזמנו", counts.invited, "text-blue-700"],
          ["פעילים", counts.active, "text-green-700"],
          ["שילמו · חסר פרופיל", pendingPaidProfiles.length, "text-amber-700"],
          ["שימור", `${retentionRate}%`, "text-purple-700"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-[#ece7c8] bg-white p-3 text-center">
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-[10px] text-[#777]">{label}</div>
          </div>
        ))}
      </div>

      {verifiedPurchases.length > 0 && <div className="mt-4 rounded-2xl border border-[#d8b67e] bg-[#fffaf0] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong className="text-sm text-[#191265]">רכישות Plus מאומתות ב־Grow</strong>
            <p className="mt-1 text-[10px] leading-5 text-[#75674f]">כל רכישה מופיעה כאן מיד עם הסטטוס המדויק שלה, גם לפני שניתן להפעיל את המנוי.</p>
          </div>
          <span className="rounded-full bg-[#191265] px-3 py-1 text-[10px] font-black text-[#ffe27c]">{verifiedPurchases.length} אחרונות</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {verifiedPurchases.map(purchase => <div key={purchase.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#eadfc8] bg-white px-3 py-2.5">
            <div className="min-w-0">
              <strong className="block truncate text-xs text-[#191265]">{purchase.fullName}</strong>
              <span className="text-[10px] text-[#8a7d70]">שולם {Math.round(purchase.amountAgorot / 100)} ₪ · {formatDate(purchase.paidAt)}</span>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${purchase.state === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {purchase.state === "active" ? "פעיל/ה במערכת" : "שולם · ממתין/ה להצטרפות למאגר"}
            </span>
          </div>)}
        </div>
      </div>}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className={`rounded-xl border p-3 ${capacity.female.remaining === 0 ? "border-red-200 bg-red-50 text-red-800" : "border-pink-200 bg-pink-50 text-pink-800"}`}>
          <strong className="text-lg">{capacity.female.reserved}/{capacity.female.limit}</strong>
          <span className="mr-1">מנויות Plus פעילות</span>
          <div className="text-[10px]">{capacityBreakdown.female.active} פעילות · {capacityBreakdown.female.invited} הזמנות פתוחות · נותרו {capacity.female.remaining}</div>
        </div>
        <div className={`rounded-xl border p-3 ${capacity.male.remaining === 0 ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
          <strong className="text-lg">{capacity.male.reserved}/{capacity.male.limit}</strong>
          <span className="mr-1">מנויי Plus פעילים</span>
          <div className="text-[10px]">{capacityBreakdown.male.active} פעילים · {capacityBreakdown.male.invited} הזמנות פתוחות · נותרו {capacity.male.remaining}</div>
        </div>
      </div>

      {relaunchStats.cohort > 0 && <div className="mt-3 rounded-xl border border-pink-200 bg-pink-50 p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs text-pink-950">גל ההשקה עם מתנת המדריך</strong><span className="text-[10px] text-pink-800">חלון אישי של 72 שעות</span></div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] sm:grid-cols-8">
          {[
            ["קהל", relaunchStats.cohort],
            ["מייל נשלח", relaunchStats.emailSent],
            ["SMS נשלח", relaunchStats.smsSent],
            ["SMS נכשל", relaunchStats.smsFailed],
            ["ללא נייד", relaunchStats.noMobile],
            ["פתחו מייל", relaunchStats.uniqueOpened],
            ["הקליקו", relaunchStats.uniqueClicked],
            ["רכשו", relaunchStats.active],
          ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/80 p-2"><strong className="block text-sm text-[#191265]">{value}</strong>{label}</div>)}
        </div>
        {relaunchStats.smsFailed > 0 && <p className="mt-2 text-[10px] text-amber-800">הודעות ה־SMS שנכשלו נשמרו וניתנות לשליחה חוזרת בטוחה לאחר חידוש יתרת Vibrate; המייל כבר נשלח אליהן.</p>}
      </div>}

      {holidayLaunchStats.cohort > 0 && <div className="mt-3 rounded-xl border border-[#d8b67e] bg-[#10182f] p-3 text-[#fffaf1]">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs">השקת החגים · הצעה שלישית במחזור הראשון</strong><span className="rounded-full border border-[#d8b67e]/60 px-2 py-1 text-[10px] text-[#f0d9ad]">מעקב אוטומטי מהתשלום</span></div>
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] sm:grid-cols-6">
          {[
            ["קהל", holidayLaunchStats.cohort],
            ["מייל נשלח", holidayLaunchStats.emailSent],
            ["SMS נשלח", holidayLaunchStats.smsSent],
            ["רכשו", holidayLaunchStats.active],
            ["מהמייל", holidayLaunchStats.fromEmail],
            ["מה־SMS", holidayLaunchStats.fromSms],
          ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/10 p-2"><strong className="block text-sm text-[#ffe27c]">{value}</strong>{label}</div>)}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-white/70">לכל מצטרף דרך הקמפיין נשמרים מקור הרכישה ויעד אישי של 3 הצעות במחזור הראשון. במחזור הבא היעד חוזר אוטומטית ל־2.</p>
      </div>}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-lg bg-[#f7f6fb] p-2">המתנה ← הזמנה <strong>{waitlistToInviteRate}%</strong></div>
        <div className="rounded-lg bg-[#f7f6fb] p-2">הזמנה ← הפעלה <strong>{inviteToActiveRate}%</strong></div>
        <div className="rounded-lg bg-[#f7f6fb] p-2">פעילים שנשמרו <strong>{retentionRate}%</strong></div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">עמדו ביעד האישי <strong>{commitment.met}</strong></div>
        <div className="rounded-lg bg-amber-50 p-2 text-amber-800">בתהליך <strong>{commitment.inProgress}</strong></div>
        <div className="rounded-lg bg-red-50 p-2 text-red-800">דורשים טיפול <strong>{commitment.atRisk}</strong></div>
      </div>

      <div className="mt-4 rounded-xl border border-[#e4d27e] bg-[#191265] p-4 text-white" role="status">
        <strong className="text-sm">התאמות חדשות למחזור השירות</strong>
        <p className="mt-1 text-xs leading-6">{serviceNeeds.members} מנויים ממתינים להשלמת {serviceNeeds.proposals} הצעות ידניות במחזור שלהם. עם תחילת כל מחזור, ההצעות מהמחזור הקודם נשארות בהיסטוריה ולא נספרות שוב.</p>
        <button type="button" onClick={() => setStatusFilter("needs_matches")} className="mt-2 rounded-lg bg-[#ffe27c] px-3 py-2 text-xs font-black text-[#191265]">הצג מנויים שצריכים התאמות</button>
        <p className="mt-2 text-[10px] leading-5 text-white/65">ההתראה היא לצוות בלבד. אין שליחת התאמות או הודעות אוטומטית. זכאות הבוסט החינמי נשארת לפי מחזור החיוב המתועד, ללא שינוי במסגרת זו.</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="תצוגת סיום שירות Plus">
          {[
            ["active", "פעילים"],
            ["finishing", "מסיימים עם יתרת התאמות"],
            ["archived", "הפסיקו את השירות"],
          ].map(([view, label]) => <button
            key={view}
            type="button"
            role="tab"
            aria-selected={serviceDepartureView === view}
            onClick={() => setServiceDepartureView(view as "active" | "finishing" | "archived")}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${serviceDepartureView === view ? "border-[#191265] bg-[#191265] text-white" : "border-[#dcd8ef] bg-white text-[#4c3f8f]"}`}
          >{label}</button>)}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל או טלפון" className="flex-1 rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#191265]" />
        {serviceDepartureView === "active" && <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-xs">
          <option value="all">כל הסטטוסים ללא הארכיון</option>
          <option value="needs_matches">צריכים התאמות במחזור הנוכחי</option>
          {Object.entries(STATUS_LABELS).filter(([value]) => value !== "churned").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        }
        </div>
      </div>

      {serviceDepartureView !== "archived" && <div className="mt-4 max-h-[420px] overflow-y-auto space-y-2">
        {rows.map((row: any) => (
          <article key={row.pilot.id} className="rounded-xl border border-[#ebe8d7] bg-white p-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-xs text-[#191265]">{row.single.firstName} {row.single.lastName}</strong>
                  <span className="rounded-full bg-[#f3f1fb] px-2 py-0.5 text-[9px] font-bold text-[#4c3f8f]">{STATUS_LABELS[row.pilot.status]}</span>
                  {row.pilot.eligibilityScore != null && <span className="text-[9px] text-[#777]">ציון זכאות {row.pilot.eligibilityScore}</span>}
                </div>
                <p className="mt-1 text-[10px] text-[#777]">{row.single.email} · {row.single.phone || "ללא טלפון"} · {row.single.age || "?"} · {row.single.city || ""}</p>
                <p className="mt-1 text-[9px] text-[#999]">נרשם/ה לרשימה: {new Date(row.pilot.waitlistedAt).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold">
                  <span className={`rounded-full px-2 py-1 ${row.cycleProgress.state === "green" ? "bg-emerald-100 text-emerald-800" : row.cycleProgress.state === "red" ? "bg-red-100 text-red-800" : row.cycleProgress.state === "yellow" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{row.cycleProgress.delivered} מתוך {row.cycleProgress.target} הצעות · {row.cycleProgress.daysRemaining} ימים</span>
                  {row.cancellationPending ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">בקשת עצירה · ממתין לטיפול ב־Grow</span> : <span className={`rounded-full px-2 py-1 ${row.pilot.billingStatus === "active" ? "bg-blue-100 text-blue-800" : row.pilot.billingStatus === "past_due" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>מצב חיוב רשום: {row.pilot.billingStatus}</span>}
                  {row.cycleProgress.needsMatches && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">נדרשות {row.cycleProgress.remaining} הצעות חדשות</span>}
                  {row.confirmedPayment && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">תשלום הצטרפות מתועד</span>}
                  {row.holidayLaunchEntitlement && <span className="rounded-full bg-[#10182f] px-2 py-1 text-[#ffe27c]">הטבת השקה · יעד 3/3</span>}
                  {row.holidayLaunchEntitlement && row.launchAttribution?.source && <span className="rounded-full bg-[#f3ead7] px-2 py-1 text-[#7b5d27]">מקור: {row.launchAttribution.source === "sms" ? "SMS" : row.launchAttribution.source === "email" ? "מייל" : row.launchAttribution.source}</span>}
                  {row.pilot.premiumSupportEnabled && <span className="rounded-full bg-[#191265] px-2 py-1 text-[#ffe27c]">שירות פרימיום</span>}
                  {row.pilot.socialExposureConsent === "approved" && <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-800">אושר לסושיאל</span>}
                </div>
                <ServiceDepartureNotice serviceDeparture={row.serviceDeparture} cancellationPending={row.cancellationPending} />
                {row.pilot.status === "active" && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e4e0f4] bg-[#faf9ff] p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#191265]">הצעות Plus במחזור השירות</strong><span className="text-sm font-black text-[#191265]">{row.cycleMatchCount} מתוך {row.cycleProgress.target}</span></div>
                    <p className="mt-1 text-[9px] text-[#888]">{formatDate(row.cycleProgress.cycleStart)} עד {formatDate(row.cycleProgress.cycleEnd)} · {row.cycleProgress.daysRemaining} ימים נותרו</p>
                    <div className="mt-2 space-y-1 text-[10px] text-[#666]">
                      {row.cycleMatches.length > 0 ? row.cycleMatches.map((match: any) => <div key={match.id} className="flex items-start justify-between gap-2 rounded-lg bg-white px-2 py-1.5"><span>{match.other ? `${match.other.firstName} ${match.other.lastName || ""}`.trim() : `התאמה #${match.id}`}<small className="block text-[9px] text-[#999]">{MATCH_STATUS_LABELS[match.status] || match.status}</small></span><span className="shrink-0 text-left">{match.source === "boost" ? "בוסט" : "הצעת Plus"}<small className="block text-[9px] text-[#999]">{formatDate(match.proposedAt)}</small></span></div>) : <span>טרם נשלחו הצעות במחזור השירות הנוכחי</span>}
                    </div>
                  </div>
                  <div className={`rounded-xl border p-3 ${row.boostBenefit.used ? "border-violet-200 bg-violet-50" : row.boostBenefit.inProgress ? "border-blue-200 bg-blue-50" : row.boostBenefit.available ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#191265]">הבוסט החינמי לפי מחזור החיוב המתועד</strong><span className="text-[10px] font-black">{row.boostBenefit.used ? "נשלח בפועל" : row.boostBenefit.inProgress ? "בטיפול" : row.boostBenefit.available ? "זמין" : "לא זמין"}</span></div>
                    <p className="mt-2 text-[10px] text-[#666]">{row.boostBenefit.used ? `הבוסט נשלח ב־${formatDate(row.boostBenefit.usedAt)}${row.boostBenefit.requestStatus === "rejected" ? " וההצעה נסגרה לאחר מכן" : ""}` : row.boostBenefit.inProgress ? `הבקשה נקלטה ב־${formatDate(row.boostBenefit.requestedAt)} ועדיין לא נשלחה בפועל` : row.boostBenefit.available ? "הבוסט עדיין זמין להפעלה מהאזור האישי" : `חברות Boost: ${row.boostMembership?.status || "לא הוגדרה"}`}</p>
                  </div>
                </div>}
                {row.serviceHistory?.periods?.length > 0 && <details className="mt-3 rounded-xl border border-[#e9e5dd] bg-[#f8f7f4] p-3">
                  <summary className="cursor-pointer text-[10px] font-bold text-[#5d557d]">היסטוריית שירות שהושלמה · {row.serviceHistory.periods.length}{row.serviceHistory.omittedPeriodCount ? ` מתוך תקופה ארוכה יותר (+${row.serviceHistory.omittedPeriodCount} ישנות)` : ""}</summary>
                  <p className="mt-2 text-[9px] leading-5 text-[#888]">כל שורה היא חלון שירות רציף של 30 יום, לא חודש קלנדרי ולא אישור לחידוש או תשלום ב־Grow. תווית החודש היא עזר ניווט בלבד.</p>
                  <div className="mt-2 space-y-2">
                    {row.serviceHistory.periods.map((period: any) => <div key={period.cycleIndex} className="rounded-lg border border-[#e5e2da] bg-white p-2 text-[10px]">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[#625d73]"><strong className="text-[#191265]">מחזור שירות 30 יום #{period.cycleIndex + 1}</strong><span>{formatDate(period.serviceStart)}–{formatDate(period.serviceEnd)}</span><span className="rounded-full bg-[#f3f1fb] px-2 py-0.5 text-[9px]">עזר: {period.calendarMonthLabel}</span></div>
                      <p className="mt-1 text-[9px] text-[#777]">{period.manualProposalCount} הצעות ידניות שנשלחו בפועל מתוך יעד {period.target}; בוסט ומועמדים שנוצרו לא נספרים.</p>
                      {period.manualProposals.length > 0 && <ol className="mt-1.5 space-y-1 border-r border-[#e6e1f2] pr-2 text-[9px] text-[#666]">
                        {period.manualProposals.map((proposal: any) => <li key={proposal.id} className="flex flex-wrap justify-between gap-x-2"><span>{proposal.other ? `${proposal.other.firstName} ${proposal.other.lastName || ""}`.trim() : `התאמה #${proposal.id}`} · {MATCH_STATUS_LABELS[proposal.status] || proposal.status || "נשלחה"}</span><time>{formatDate(proposal.proposedAt)}</time></li>)}
                        {period.omittedManualProposalCount > 0 && <li>ועוד {period.omittedManualProposalCount} הצעות מתועדות</li>}
                      </ol>}
                    </div>)}
                  </div>
                </details>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.pilot.status === "active" && <button type="button" disabled={endMembership.isPending} onClick={() => { setEndMember({ id: row.pilot.id, name: `${row.single.firstName} ${row.single.lastName || ""}`.trim() }); setProviderStopped(false); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-800">סיום מנוי Plus</button>}
                {(["eligible", "invited", "active", "declined"] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => changeStatus(row.pilot.id, status)}
                    disabled={
                      updateStatus.isPending
                      || row.pilot.status === status
                      || (
                        (status === "invited" || status === "active")
                        && row.pilot.status !== "invited"
                        && row.pilot.status !== "active"
                        && (
                          (row.single.gender === "female" && capacity.female.remaining === 0)
                          || (row.single.gender === "male" && capacity.male.remaining === 0)
                          || !["female", "male"].includes(row.single.gender)
                        )
                      )
                    }
                    className="rounded-lg border border-[#dcd8ef] px-2.5 py-1.5 text-[9px] font-bold text-[#191265] hover:bg-[#f3f1fb] disabled:opacity-40">
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
        {rows.length === 0 && <div className="py-8 text-center text-xs text-[#888]">אין נרשמים לפי הסינון הנוכחי</div>}
      </div>}
      {serviceDepartureView === "archived" && <div className="mt-4 rounded-xl border border-[#e9e5dd] bg-[#f8f7f4] p-4">
        <h4 className="text-xs font-bold text-[#777]">מנויי Plus שהסתיימו · ארכיון ({archivedRows.length})</h4>
        <p className="mt-2 text-[10px] leading-5 text-[#888]">ההיסטוריה נשמרת. אלה אינם מופיעים ברשימת המנויים הפעילים או בתור ההתאמות.</p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {archivedRows.map((row: any) => <article key={row.pilot.id} className="rounded-lg border bg-white p-3 text-xs text-[#777]">
            <strong>{row.single.firstName} {row.single.lastName}</strong>
            <ServiceDepartureNotice serviceDeparture={row.serviceDeparture} cancellationPending={row.cancellationPending} archived endedAt={row.pilot.endedAt} />
            <span className="mt-1 block text-[10px]">מחזור אחרון: {formatDate(row.cycleProgress.cycleStart)} עד {formatDate(row.cycleProgress.cycleEnd)} · {row.cycleProgress.delivered} הצעות ידניות</span>
            {row.serviceHistory?.periods?.length > 0 && <details className="mt-2 rounded-lg bg-[#f8f7f4] p-2 text-[10px]"><summary className="cursor-pointer font-bold text-[#5d557d]">היסטוריית שירות של 30 יום ({row.serviceHistory.periods.length})</summary><p className="mt-1 text-[9px]">חלונות שירות בלבד; תווית החודש אינה גבול השירות ואינה מאמתת תשלום.</p>{row.serviceHistory.periods.map((period: any) => <div key={period.cycleIndex} className="mt-1 flex flex-wrap justify-between gap-x-2 border-t pt-1"><span>#{period.cycleIndex + 1} · {formatDate(period.serviceStart)}–{formatDate(period.serviceEnd)} · עזר: {period.calendarMonthLabel}</span><span>{period.manualProposalCount}/{period.target} ידניות</span></div>)}</details>}
          </article>)}
          {!archivedRows.length && <p className="text-xs text-[#999]">אין מנויים שהסתיימו לפי החיפוש</p>}
        </div>
      </div>}
      <Dialog open={Boolean(endMember)} onOpenChange={open => { if (!open && !endMembership.isPending) { setEndMember(null); setProviderStopped(false); } }}>
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader><DialogTitle>סיום מנוי Plus באתר</DialogTitle><DialogDescription>סיום Plus עבור {endMember?.name}. המנוי יוסר מרשימת הפעילים ומתור ההתאמות ויועבר לארכיון. הטבות Plus יסתיימו מיד; החברות הרגילה במאגר והיסטוריית ההתאמות יישארו ללא שינוי.</DialogDescription></DialogHeader>
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">פעולה זו אינה מבטלת תשלום ב־Grow. יש להפסיק את החיוב שם לפני סיום המנוי כאן.</p>
          <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" checked={providerStopped} onChange={event => setProviderStopped(event.target.checked)} disabled={endMembership.isPending} className="mt-1" />אישור: החיוב ב־Grow הופסק; אפשר לסיים את Plus באתר.</label>
          <div className="flex gap-2"><button type="button" disabled={!providerStopped || !endMember || endMembership.isPending} onClick={() => endMember && providerStopped && endMembership.mutate({ id: endMember.id, providerStoppedConfirmed: true })} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{endMembership.isPending ? "מסיים…" : "סיום Plus והעברה לארכיון"}</button><button type="button" disabled={endMembership.isPending} onClick={() => { setEndMember(null); setProviderStopped(false); }} className="rounded-lg border px-4 py-2 text-sm">ביטול</button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
