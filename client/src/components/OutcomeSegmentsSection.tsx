import { useState } from "react";

type SegmentRow = {
  label: string;
  members: number;
  covered: number;
  coverageRate: number;
  mutual: number;
  mutualRate: number;
  positive: number;
  positiveRate: number;
};

export default function OutcomeSegmentsSection({
  bySource,
  byProduct,
  bySegment,
}: {
  bySource: SegmentRow[];
  byProduct: SegmentRow[];
  bySegment: SegmentRow[];
}) {
  const [tab, setTab] = useState<"source" | "product" | "segment">("source");
  const rows = tab === "source" ? bySource : tab === "product" ? byProduct : bySegment;
  const labels = { source: "מקור שיווק", product: "מוצר", segment: "מגזר" };

  return (
    <section className="rounded-2xl border border-[#e9e8e8] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-[#191265]">תוצאות לפי מקור, מוצר ומגזר</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#727272]">כיסוי, אישור הדדי ותוצאה חיובית מתוך חברי המאגר הפעילים בכל קבוצה</p>
        </div>
        <div className="flex rounded-xl bg-[#f4f2fb] p-1">
          {(["source", "product", "segment"] as const).map(value => (
            <button key={value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${tab === value ? "bg-[#191265] text-white" : "text-[#666]"}`}>
              {labels[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[650px] text-xs">
          <thead>
            <tr className="border-b border-[#ecebf2] text-[#727272]">
              <th className="py-2 text-right">{labels[tab]}</th>
              <th className="py-2 text-center">חברים</th>
              <th className="py-2 text-center">קיבלו הצעה</th>
              <th className="py-2 text-center">אישור הדדי</th>
              <th className="py-2 text-center">תוצאה חיובית</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-[#f2f1f6] last:border-0">
                <td className="py-3 font-bold text-[#191265]">{row.label}</td>
                <td className="py-3 text-center">{row.members}</td>
                <td className="py-3 text-center"><strong className="text-[#077b68]">{row.coverageRate}%</strong><span className="block text-[9px] text-[#999]">{row.covered}</span></td>
                <td className="py-3 text-center"><strong className="text-[#6558c7]">{row.mutualRate}%</strong><span className="block text-[9px] text-[#999]">{row.mutual}</span></td>
                <td className="py-3 text-center"><strong className="text-[#be185d]">{row.positiveRate}%</strong><span className="block text-[9px] text-[#999]">{row.positive}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="py-8 text-center text-xs text-[#888]">אין נתונים לפילוח הנבחר</div>}
      <p className="mt-3 text-[10px] leading-5 text-[#888]">תוצאה חיובית נספרת רק כאשר תועד סטטוס ממשיכים, ביחד, זוגיות, אירוסין או נישואין. היא אינה מבוססת על ניחוש.</p>
    </section>
  );
}
