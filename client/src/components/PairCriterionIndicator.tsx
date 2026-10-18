import type { getPairPreferenceIndicators } from "@shared/pairPreferenceIndicators";
import { toast } from "sonner";

type Indicator = ReturnType<typeof getPairPreferenceIndicators>[keyof ReturnType<typeof getPairPreferenceIndicators>];

/** Presentation only: the fact belongs to this person, the preference to the other. */
export function PairCriterionIndicator({ indicator, criterion }: { indicator?: Indicator; criterion: string }) {
  if (!indicator) return null;
  const matched = indicator.state === "met";
  const mismatch = indicator.state === "not_met";
  const label = matched ? "עומד בהעדפה של הצד השני" : mismatch ? "לא עומד בהעדפה של הצד השני" : "לא ניתן לקבוע עמידה בהעדפה";
  return <button
    type="button"
    onClick={event => { event.stopPropagation(); toast.info(`${criterion}: ${label}`, { description: indicator.reason }); }}
    title={`${label}: ${indicator.reason}`}
    aria-label={`${criterion}: ${label}. ${indicator.reason}`}
    data-pair-criterion={criterion}
    data-criterion-state={indicator.state}
    className={`ms-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full align-middle text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265] ${matched ? "bg-emerald-100 text-emerald-800" : mismatch ? "bg-amber-100 text-amber-800" : "text-slate-400"}`}
  >{matched ? "✓" : mismatch ? "!" : "—"}</button>;
}

export function PairCriteriaLegend() {
  return <p className="my-2 text-[10px] leading-5 text-[#727272]" data-pair-criteria-legend>
    <span className="font-bold text-emerald-800">✓</span> עומד בהעדפה של הצד השני · <span className="font-bold text-amber-800">!</span> חריגה מההעדפה · <span className="text-slate-400">—</span> לא ניתן לקבוע.
    <span className="block">הסימונים מתייחסים להעדפות שנשמרו, לא למסנני החיפוש. השכלה ושמירת שבת מוצגות כנתונים; אין להן העדפה מובנית נפרדת.</span>
  </p>;
}
