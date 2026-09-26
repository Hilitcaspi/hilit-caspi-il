import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Compass, ChevronDown, ChevronUp, Mail, Phone, RefreshCw } from "lucide-react";

const RESULT_LABELS: Record<string, string> = {
  information: "מידע",
  consistency: "עקביות",
  pace: "קצב",
  boundary: "גבול",
  self_choice: "בחירה",
  future_projection: "העתיד שכבר דמיינת",
  uncertainty_loop: "חוסר הוודאות",
  approval_chase: "הרצון שיבחרו בך",
  chemistry_confusion: "הכימיה החזקה",
  novelty_pull: "המרדף",
  safety: "בטיחות",
};

export default function CourseCompassAdminSection() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, refetch } = trpc.courseCompass.adminList.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="mb-4 rounded-xl bg-white p-4 text-sm text-[#727272] shadow-sm">טוענת את רשימת ההשקה של המצפן...</div>;
  }

  const rows = data?.rows ?? [];
  if (!data || data.total === 0) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-[#d9c8d5] bg-white/60 p-4 text-sm text-[#727272]">
        <span className="inline-flex items-center gap-2 font-bold text-[#191265]"><Compass size={16} /> רשימת ההשקה של המצפן</span>
        <p className="mt-1">עדיין אין מצטרפים. הקורס והמארז עדיין בבנייה ואין כאן הזמנות או חיובים.</p>
      </div>
    );
  }

  return (
    <section className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm border border-[#eadfe8]">
      <button onClick={() => setExpanded(value => !value)} className="w-full p-4 text-right" aria-expanded={expanded}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#651645] text-[#f1cf86] flex items-center justify-center"><Compass size={20} /></div>
            <div>
              <h2 className="font-black text-[#191265]">רשימת ההשקה של קורס הדגל</h2>
              <p className="text-xs text-[#727272]">אתגר המצפן, קדימות והטבת השקה. זו עדיין אינה רשימת רוכשים.</p>
            </div>
          </div>
          {expanded ? <ChevronUp size={19} className="text-[#651645]" /> : <ChevronDown size={19} className="text-[#651645]" />}
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="rounded-lg bg-[#f7f1f6] p-3 text-center"><div className="text-xl font-black text-[#651645]">{data.total}</div><div className="text-[11px] text-[#727272]">ברשימת ההשקה</div></div>
          <div className="rounded-lg bg-[#fff7e9] p-3 text-center"><div className="text-xl font-black text-[#8a5a18]">{data.marketingConsent}</div><div className="text-[11px] text-[#727272]">אישרו גם תוכן נוסף</div></div>
          <div className="rounded-lg bg-[#e9f7ee] p-3 text-center"><div className="text-xl font-black text-[#24663b]">{data.courseInterest}</div><div className="text-[11px] text-[#727272]">רוצים מחיר השקה</div></div>
          {Object.entries(data.byResult).slice(0, 2).map(([key, count]) => (
            <div key={key} className="rounded-lg bg-[#f8f6f0] p-3 text-center"><div className="text-xl font-black text-[#191265]">{count}</div><div className="text-[11px] text-[#727272]">{RESULT_LABELS[key] ?? key}</div></div>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#eee4eb] px-4 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.byResult).map(([key, count]) => <span key={key} className="rounded-full bg-[#f3ebf2] px-2.5 py-1 text-[11px] font-semibold text-[#651645]">{RESULT_LABELS[key] ?? key}: {count}</span>)}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 flex-shrink-0"><RefreshCw size={13} /></Button>
          </div>
          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.id} className="rounded-lg border border-[#eee4eb] bg-[#fdfbfc] p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-sm text-[#191265]">{row.name}</p>
                    <p className="text-xs text-[#727272] mt-0.5">{row.gender === "female" ? "אישה" : row.gender === "male" ? "גבר" : "מגדר לא נשמר"} · כיוון: {RESULT_LABELS[row.resultKey] ?? row.resultKey}</p>
                    {row.selectedAction === "course_launch_interest" && <span className="mt-1.5 inline-flex rounded-full bg-[#e3f5e9] px-2.5 py-1 text-[11px] font-black text-[#24663b]">עניין גבוה בקורס</span>}
                    <p className="text-[11px] text-[#9a8b9c] mt-1">{new Date(row.createdAt).toLocaleString("he-IL")}{row.utmSource ? ` · ${row.utmSource}${row.utmCampaign ? ` / ${row.utmCampaign}` : ""}` : ""}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <a href={`mailto:${row.email}`}><Button size="sm" variant="outline" className="h-8 text-xs"><Mail size={12} className="ml-1" /> מייל</Button></a>
                    {row.phone && <a href={`tel:${row.phone}`}><Button size="sm" variant="outline" className="h-8 text-xs"><Phone size={12} className="ml-1" /> טלפון</Button></a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
