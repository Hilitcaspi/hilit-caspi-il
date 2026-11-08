import { useId } from "react";

export type WaitingQueuePaginationProps = {
  page: number;
  total: number;
  limit: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function WaitingQueuePagination({ page, total, limit, disabled = false, onPageChange }: WaitingQueuePaginationProps) {
  const id = useId();
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(pages, Math.max(1, page));
  const buttonClass = "rounded-lg border border-[#191265]/20 px-3 py-2 text-xs font-semibold text-[#191265] disabled:opacity-40";
  return (
    <nav aria-label="ניווט בין עמודי הממתינים" className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white p-3 shadow-sm" dir="rtl">
      <button type="button" disabled={disabled || current === 1} onClick={() => onPageChange(1)} className={buttonClass}>ראשון</button>
      <button type="button" disabled={disabled || current === 1} onClick={() => onPageChange(current - 1)} className={buttonClass}>הקודם</button>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-[#191265]">קפיצה לעמוד</label>
        <select id={id} value={current} disabled={disabled || pages === 1} onChange={event => onPageChange(Number(event.target.value))} className="min-h-10 rounded-lg border border-[#191265]/20 bg-white px-2 text-sm text-[#191265] focus:outline-none focus:ring-2 focus:ring-[#ffe27c]">
          {Array.from({ length: pages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
        <span className="text-xs text-[#727272]">מתוך {pages}</span>
      </div>
      <button type="button" disabled={disabled || current === pages} onClick={() => onPageChange(current + 1)} className="rounded-lg bg-[#191265] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">הבא</button>
      <button type="button" disabled={disabled || current === pages} onClick={() => onPageChange(pages)} className={buttonClass}>אחרון</button>
    </nav>
  );
}
