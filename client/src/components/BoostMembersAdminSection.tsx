import { useMemo, useState } from "react";
import { RefreshCw, Search, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  approved: "אישור בתוקף",
  needs_reconsent: "נדרש אישור מחדש",
  invited: "הוזמן",
  paused: "מושהה",
  opted_out: "יצא מהשירות",
  removed: "הוסר",
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  needs_reconsent: "bg-amber-100 text-amber-800 ring-amber-200",
  invited: "bg-blue-100 text-blue-800 ring-blue-200",
  paused: "bg-slate-100 text-slate-700 ring-slate-200",
  opted_out: "bg-rose-100 text-rose-800 ring-rose-200",
  removed: "bg-gray-100 text-gray-700 ring-gray-200",
};

export default function BoostMembersAdminSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const overview = trpc.matchmaking.boostMembersOverview.useQuery(undefined, { refetchInterval: 30000 });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (overview.data?.rows || []).filter((row) => {
      const matchesStatus = statusFilter === "all" || row.state === statusFilter;
      const haystack = `${row.firstName || ""} ${row.lastName || ""} ${row.email || ""} ${row.phone || ""} ${row.city || ""}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [overview.data?.rows, search, statusFilter]);

  if (overview.isLoading) return <section className="h-52 animate-pulse rounded-2xl border border-fuchsia-100 bg-white" />;
  if (!overview.data) return <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-800">נתוני Boost אינם זמינים כרגע.</section>;

  const { counts, consentVersion } = overview.data;
  const exited = counts.optedOut + counts.removed;

  return (
    <section className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-[#fff8ff] via-white to-[#fffaf0] p-4 shadow-sm md:p-5" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black text-fuchsia-700"><Sparkles size={13} /> מסלול Boost</p>
          <h2 className="mt-1 text-xl font-black text-[#191265]">מאושרי Boost</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-[#666]">המספר הראשי כולל רק חברים שאישורם בתוקף לפי נוסח ההסכמה הנוכחי. חשבונות ניסוי מוצגים בנפרד ואינם נספרים כלקוחות.</p>
        </div>
        <button onClick={() => overview.refetch()} disabled={overview.isFetching} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-xs font-bold text-fuchsia-800 transition hover:bg-fuchsia-50 disabled:opacity-50">
          <RefreshCw size={14} className={overview.isFetching ? "animate-spin" : ""} /> רענון
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["מאושרים בתוקף", counts.approved, "text-fuchsia-800"],
          ["לקוחות ללא בדיקות", counts.approvedCustomers, "text-emerald-700"],
          ["פעילים ומשלמים", counts.activePaidProfiles, "text-blue-700"],
          ["נדרש אישור מחדש", counts.needsReconsent, "text-amber-700"],
          ["יצאו מהשירות", exited, "text-rose-700"],
          ["חשבונות בדיקה", counts.testAccounts, "text-slate-600"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-fuchsia-100 bg-white p-3 text-center shadow-sm">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="mt-0.5 text-[10px] leading-4 text-[#777]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl bg-pink-50 p-2.5 text-pink-800"><strong>{counts.female}</strong> נשים עם אישור בתוקף</div>
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><strong>{counts.male}</strong> גברים עם אישור בתוקף</div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#ddd] bg-white px-3 py-2.5">
          <Search size={15} className="text-[#777]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל, טלפון או עיר" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-xs">
          <option value="all">כל הסטטוסים ({counts.total})</option>
          <option value="approved">אישור בתוקף ({counts.approved})</option>
          <option value="needs_reconsent">נדרש אישור מחדש ({counts.needsReconsent})</option>
          <option value="invited">הוזמנו ({counts.invited})</option>
          <option value="paused">מושהים ({counts.paused})</option>
          <option value="opted_out">יצאו ({counts.optedOut})</option>
          <option value="removed">הוסרו ({counts.removed})</option>
        </select>
      </div>

      <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <article key={row.membershipId} className="rounded-xl border border-[#ece4ef] bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-[#191265]">{row.firstName} {row.lastName || ""}</strong>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ring-1 ${STATUS_STYLES[row.state]}`}>{STATUS_LABELS[row.state]}</span>
                  {row.pilotCohort === "controlled_test" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">חשבון בדיקה</span>}
                  {!row.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-700">פרופיל לא פעיל</span>}
                  {!row.isPaid && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">ללא תשלום מאגר</span>}
                </div>
                <p className="mt-1 break-words text-[10px] text-[#777]">{row.email || "ללא מייל"} · {row.phone || "ללא טלפון"} · {row.age || "?"} · {row.city || "ללא עיר"}</p>
                <p className="mt-1 text-[9px] text-[#999]">אישור: {row.consentedAt ? new Date(row.consentedAt).toLocaleDateString("he-IL") : "לא תועד"} · גרסה: {row.consentVersion || "ללא גרסה"}</p>
              </div>
              <div className="text-[10px] text-[#777]">{row.gender === "female" ? "אישה" : row.gender === "male" ? "גבר" : "לא צוין"}</div>
            </div>
          </article>
        ))}
        {rows.length === 0 && <div className="rounded-xl bg-white py-10 text-center text-xs text-[#888]">אין חברים לפי הסינון הנוכחי.</div>}
      </div>

      <p className="mt-4 text-[9px] text-[#999]">גרסת הסכמה פעילה: {consentVersion}</p>
    </section>
  );
}
