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

export default function PlusPilotAdminSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
  const { counts, waitlistToInviteRate, inviteToActiveRate, retentionRate } = overview.data;

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
          <p className="text-[11px] font-bold text-[#8b7420]">פיילוט מדיד — ללא הבטחת כמות התאמות</p>
          <h3 className="mt-1 text-lg font-black text-[#191265]">Database Plus</h3>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-[#666]">רשימת המתנה, זכאות, הזמנה, הפעלה ושימור. מעבר ל״הוזמן״ שולח מייל אישי ומדוד.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="rounded-xl border bg-white px-3 py-2">קוהורט <input value={cohort} onChange={event => setCohort(event.target.value)} className="mr-2 w-24 outline-none" /></label>
          <label className="rounded-xl border bg-white px-3 py-2">מחיר פיילוט ₪ <input type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} className="mr-2 w-16 outline-none" /></label>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["ממתינים", counts.waitlist + counts.eligible, "text-[#191265]"],
          ["הוזמנו", counts.invited, "text-blue-700"],
          ["פעילים", counts.active, "text-green-700"],
          ["שימור", `${retentionRate}%`, "text-purple-700"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-[#ece7c8] bg-white p-3 text-center">
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-[10px] text-[#777]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-lg bg-[#f7f6fb] p-2">המתנה ← הזמנה <strong>{waitlistToInviteRate}%</strong></div>
        <div className="rounded-lg bg-[#f7f6fb] p-2">הזמנה ← הפעלה <strong>{inviteToActiveRate}%</strong></div>
        <div className="rounded-lg bg-[#f7f6fb] p-2">פעילים שנשמרו <strong>{retentionRate}%</strong></div>
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
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["eligible", "invited", "active", "declined", "churned"] as const).map(status => (
                  <button key={status} onClick={() => changeStatus(row.pilot.id, status)} disabled={updateStatus.isPending || row.pilot.status === status}
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
