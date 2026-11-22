import React from "react";

export type WaitingTreatmentView = "over14" | "nonresponse" | "neverDelivered" | "feedback" | "missingPhoto" | "difficulty" | "blocked";
export type WaitingTreatmentSummary = { over14: number; fromFeedback: number; neverDelivered: number; missingPhoto: number; difficulty: number; blocked: number };
export const WAITING_TREATMENT_TABS: { id: WaitingTreatmentView; label: string; count?: keyof WaitingTreatmentSummary }[] = [
  { id: "over14", label: "לא קיבלו התאמה מעל 14 יום", count: "over14" },
  { id: "nonresponse", label: "אי־מענה חוזר להצעות" },
  { id: "neverDelivered", label: "לא קיבלו התאמה מעולם", count: "neverDelivered" },
  { id: "feedback", label: "בעקבות משוב", count: "fromFeedback" },
  { id: "missingPhoto", label: "חסרי תמונה", count: "missingPhoto" },
  { id: "difficulty", label: "קושי במציאת התאמה", count: "difficulty" },
  { id: "blocked", label: "הצעה פתוחה לטיפול", count: "blocked" },
];
export function waitingTreatmentTitle(view: WaitingTreatmentView): string {
  return WAITING_TREATMENT_TABS.find(tab => tab.id === view)?.label || WAITING_TREATMENT_TABS[0].label;
}
export default function WaitingTreatmentTabs({ value, onChange, summary, nonresponseCount }: {
  value: WaitingTreatmentView;
  onChange: (view: WaitingTreatmentView) => void;
  summary?: WaitingTreatmentSummary;
  nonresponseCount?: number;
}) {
  return <div className="rounded-xl bg-white p-2 shadow-sm" dir="rtl">
    <div role="group" aria-label="תתי־טאבים להתאמות לטיפול" className="flex flex-wrap gap-2">
      {WAITING_TREATMENT_TABS.map(tab => {
        const selected = tab.id === value;
        const count = tab.id === "nonresponse" ? nonresponseCount : tab.count ? summary?.[tab.count] : undefined;
        return <button key={tab.id} type="button" aria-pressed={selected} onClick={() => onChange(tab.id)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${selected ? tab.id === "difficulty" ? "bg-emerald-700 text-white" : "bg-[#191265] text-white" : tab.id === "difficulty" ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-[#f8f6f0] text-[#191265] hover:bg-[#eee8db]"}`}>
          <span>{tab.label}</span>{typeof count === "number" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${selected ? "bg-white/20" : "bg-black/5"}`}>{count}</span>}
        </button>;
      })}
    </div>
    <p className="mt-2 px-1 text-[11px] text-[#727272]">אותו פרופיל יכול להופיע בכמה קבוצות. הסימונים אינם מבטלים זה את זה.</p>
  </div>;
}
