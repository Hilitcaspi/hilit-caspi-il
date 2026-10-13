import { presentPlusCycle, type PlusCycleProgressView } from "@shared/plusCyclePresentation";

export function PlusCycleProgressCard({ progress, billingStatus, now = Date.now() }: { progress: PlusCycleProgressView; billingStatus?: string | null; now?: number }) {
  const view = presentPlusCycle(progress, now, billingStatus);
  return <div className="rounded-xl bg-[#191265] p-4 text-white" aria-label="התקדמות מחזור Plus">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs text-white/70">{view.title}</p>
        <p className="mt-1 text-3xl font-black text-[#ffe27c]" dir="rtl">{view.count}</p>
        <p className="mt-1 text-[11px] text-white/65">{view.period}</p>
      </div>
      <p className="text-[11px] leading-5 text-white/80">{view.timing}</p>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="התקדמות לעבר יעד ההצעות" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, progress.progressPercent))}>
      <div className="h-full rounded-full bg-[#ffe27c]" style={{ width: `${Math.max(0, Math.min(100, progress.progressPercent))}%` }} />
    </div>
    {view.notice && <p role="status" className="mt-3 rounded-lg border border-amber-200/30 bg-amber-100/10 p-3 text-xs leading-6 text-amber-100">{view.notice}</p>}
    <p className="mt-2 text-[10px] leading-5 text-white/60">היעד הוא לפחות {progress.target} הצעות במחזור, ולא מכסה מרבית. המונה מציג הצעות שנבדקו ידנית ונשלחו; Boost נספר בנפרד.</p>
  </div>;
}
