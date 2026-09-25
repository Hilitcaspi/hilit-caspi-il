import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  waitlist: "רשימת המתנה",
  eligible: "זכאי/ת",
  invited: "הוזמן/ה",
  active: "פעיל/ה",
  declined: "לא מומש",
  churned: "עזב/ה",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  proposed: "ממתינה לתשובה",
  matched: "שני הצדדים אישרו",
  rejected: "ההצעה נסגרה",
  expired: "פג תוקף",
  pending: "חזרה למאגר",
};

function formatDate(value: number | null | undefined) {
  return value ? new Date(value).toLocaleDateString("he-IL") : "—";
}

export default function PlusPilotAdminSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [cohort, setCohort] = useState("pilot-01");
  const [price, setPrice] = useState("99");
  const overview = trpc.plusPilot.adminOverview.useQuery(undefined, { refetchInterval: 30000 });
  const updateStatus = trpc.plusPilot.adminUpdateStatus.useMutation({ onSuccess: () => overview.refetch() });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview.data?.rows || []).filter((row: any) => {
      const matchesStatus = statusFilter === "all" || row.pilot.status === statusFilter;
      const haystack = `${row.single.firstName || ""} ${row.single.lastName || ""} ${row.single.email || ""} ${row.single.phone || ""}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [overview.data?.rows, search, statusFilter]);

  if (overview.isLoading) return <section className="h-44 rounded-2xl bg-white animate-pulse border border-[#e9e8e8]" />;
  if (!overview.data) return null;
  const { counts, commitment, capacity, capacityBreakdown, pendingPaidProfiles, relaunchStats, holidayLaunchStats, waitlistToInviteRate, inviteToActiveRate, retentionRate } = overview.data;

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
          <p className="mt-1 max-w-2xl text-xs leading-6 text-[#666]">ברירת המחדל מציגה מנויים ששילמו והופעלו. לכל מנוי מוצגות שתי הצעות ה־Plus לפי מחזור החיוב האישי, ההתאמות שנשלחו בפועל ומצב הבוסט: זמין, בטיפול או נשלח.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="rounded-xl border bg-white px-3 py-2">קוהורט <input value={cohort} onChange={event => setCohort(event.target.value)} className="mr-2 w-24 outline-none" /></label>
          <label className="rounded-xl border bg-white px-3 py-2">מחיר פיילוט ₪ <input type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} className="mr-2 w-16 outline-none" /></label>
        </div>
      </div>

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

      {pendingPaidProfiles.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs text-amber-900">שילמו 99 ₪ וממתינים להשלמת פרופיל</strong><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900">{pendingPaidProfiles.length}</span></div>
        <p className="mt-1 text-[10px] leading-5 text-amber-800">אלו רכישות Grow מאומתות. הן אינן נספרות כמנוי פעיל עד להשלמת הפרופיל, ואז ההפעלה מתבצעת אוטומטית.</p>
        <div className="mt-2 grid gap-1 text-[10px] text-amber-950 sm:grid-cols-2">
          {pendingPaidProfiles.map((profile: any) => <div key={profile.id} className="rounded-lg bg-white/70 px-2 py-1.5"><strong>{profile.fullName}</strong> · {profile.email} · שולם {formatDate(profile.paidAt)}</div>)}
        </div>
      </div>}

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

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל או טלפון" className="flex-1 rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#191265]" />
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-xs">
          <option value="all">כל הסטטוסים</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="mt-4 max-h-[420px] overflow-y-auto space-y-2">
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
                <p className="mt-1 text-[9px] text-[#999]">נרשם/ה לרשימה: {new Date(row.pilot.waitlistedAt).toLocaleDateString("he-IL")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold">
                  <span className={`rounded-full px-2 py-1 ${row.cycleProgress.state === "green" ? "bg-emerald-100 text-emerald-800" : row.cycleProgress.state === "red" ? "bg-red-100 text-red-800" : row.cycleProgress.state === "yellow" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{row.cycleProgress.delivered}/{row.cycleProgress.target} הצעות · {row.cycleProgress.daysRemaining} ימים</span>
                  <span className={`rounded-full px-2 py-1 ${row.pilot.billingStatus === "active" ? "bg-blue-100 text-blue-800" : row.pilot.billingStatus === "past_due" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>חיוב: {row.pilot.billingStatus}</span>
                  {row.confirmedPayment && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">תשלום 99 ₪ מאומת</span>}
                  {row.holidayLaunchEntitlement && <span className="rounded-full bg-[#10182f] px-2 py-1 text-[#ffe27c]">הטבת השקה · יעד 3/3</span>}
                  {row.holidayLaunchEntitlement && row.launchAttribution?.source && <span className="rounded-full bg-[#f3ead7] px-2 py-1 text-[#7b5d27]">מקור: {row.launchAttribution.source === "sms" ? "SMS" : row.launchAttribution.source === "email" ? "מייל" : row.launchAttribution.source}</span>}
                  {row.pilot.premiumSupportEnabled && <span className="rounded-full bg-[#191265] px-2 py-1 text-[#ffe27c]">שירות פרימיום</span>}
                  {row.pilot.socialExposureConsent === "approved" && <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-800">אושר לסושיאל</span>}
                </div>
                {row.pilot.status === "active" && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e4e0f4] bg-[#faf9ff] p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#191265]">הצעות Plus במחזור החיוב</strong><span className="text-sm font-black text-[#191265]">{row.cycleMatchCount}/{row.cycleProgress.target}</span></div>
                    <p className="mt-1 text-[9px] text-[#888]">{formatDate(row.cycleProgress.cycleStart)} עד {formatDate(row.cycleProgress.cycleEnd)} · {row.cycleProgress.daysRemaining} ימים נותרו</p>
                    <div className="mt-2 space-y-1 text-[10px] text-[#666]">
                      {row.cycleMatches.length > 0 ? row.cycleMatches.map((match: any) => <div key={match.id} className="flex items-start justify-between gap-2 rounded-lg bg-white px-2 py-1.5"><span>{match.other ? `${match.other.firstName} ${match.other.lastName || ""}`.trim() : `התאמה #${match.id}`}<small className="block text-[9px] text-[#999]">{MATCH_STATUS_LABELS[match.status] || match.status}</small></span><span className="shrink-0 text-left">{match.source === "boost" ? "בוסט" : "הצעת Plus"}<small className="block text-[9px] text-[#999]">{formatDate(match.proposedAt)}</small></span></div>) : <span>טרם נשלחו הצעות במחזור החיוב הנוכחי</span>}
                    </div>
                  </div>
                  <div className={`rounded-xl border p-3 ${row.boostBenefit.used ? "border-violet-200 bg-violet-50" : row.boostBenefit.inProgress ? "border-blue-200 bg-blue-50" : row.boostBenefit.available ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#191265]">הבוסט החינמי במחזור</strong><span className="text-[10px] font-black">{row.boostBenefit.used ? "נשלח בפועל" : row.boostBenefit.inProgress ? "בטיפול" : row.boostBenefit.available ? "זמין" : "לא זמין"}</span></div>
                    <p className="mt-2 text-[10px] text-[#666]">{row.boostBenefit.used ? `הבוסט נשלח ב־${formatDate(row.boostBenefit.usedAt)}${row.boostBenefit.requestStatus === "rejected" ? " וההצעה נסגרה לאחר מכן" : ""}` : row.boostBenefit.inProgress ? `הבקשה נקלטה ב־${formatDate(row.boostBenefit.requestedAt)} ועדיין לא נשלחה בפועל` : row.boostBenefit.available ? "הבוסט עדיין זמין להפעלה מהאזור האישי" : `חברות Boost: ${row.boostMembership?.status || "לא הוגדרה"}`}</p>
                  </div>
                </div>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["eligible", "invited", "active", "declined", "churned"] as const).map(status => (
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
      </div>
    </section>
  );
}
