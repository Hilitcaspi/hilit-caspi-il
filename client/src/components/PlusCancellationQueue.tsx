import * as React from "react";

export type PlusCancellationDeliveryStatus = "pending" | "sending" | "accepted" | "failed" | "unknown" | "not_recorded";

export type PlusCancellationQueueRow = {
  plusMemberId: number;
  single: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  requestedAt: number | null;
  legacy: boolean;
  pushStatus: PlusCancellationDeliveryStatus;
  emailStatus: PlusCancellationDeliveryStatus;
  smsStatus: PlusCancellationDeliveryStatus;
};

type PlusCancellationQueueProps = {
  rows: PlusCancellationQueueRow[];
  refreshing: boolean;
  onRefresh: () => void;
  onEnd: (row: PlusCancellationQueueRow) => void;
};

type DeliveryChannel = "push" | "email" | "sms";

const DELIVERY_STATUS_META: Record<DeliveryChannel, Record<PlusCancellationDeliveryStatus, { label: string; className: string }>> = {
  push: {
    pending: { label: "ממתין לשליחת התראה", className: "bg-amber-100 text-amber-900" },
    sending: { label: "התראה נשלחת", className: "bg-blue-100 text-blue-900" },
    accepted: { label: "התראה התקבלה", className: "bg-emerald-100 text-emerald-900" },
    failed: { label: "שליחת ההתראה נכשלה", className: "bg-red-100 text-red-900" },
    unknown: { label: "מצב ההתראה אינו ידוע", className: "bg-slate-100 text-slate-800" },
    not_recorded: { label: "מצב ההתראה לא תועד", className: "bg-slate-100 text-slate-800" },
  },
  email: {
    pending: { label: "ממתין להעברת מייל", className: "bg-amber-100 text-amber-900" },
    sending: { label: "המייל מועבר לשליחה", className: "bg-blue-100 text-blue-900" },
    accepted: { label: "מייל הועבר לשליחה", className: "bg-emerald-100 text-emerald-900" },
    failed: { label: "העברת המייל נכשלה", className: "bg-red-100 text-red-900" },
    unknown: { label: "מצב העברת המייל אינו ידוע", className: "bg-slate-100 text-slate-800" },
    not_recorded: { label: "מצב העברת המייל לא תועד", className: "bg-slate-100 text-slate-800" },
  },
  sms: {
    pending: { label: "ממתין להעברת SMS", className: "bg-amber-100 text-amber-900" },
    sending: { label: "ה־SMS מועבר לשליחה", className: "bg-blue-100 text-blue-900" },
    accepted: { label: "SMS הועבר לשליחה", className: "bg-emerald-100 text-emerald-900" },
    failed: { label: "העברת ה־SMS נכשלה", className: "bg-red-100 text-red-900" },
    unknown: { label: "מצב העברת ה־SMS אינו ידוע", className: "bg-slate-100 text-slate-800" },
    not_recorded: { label: "מצב העברת ה־SMS לא תועד", className: "bg-slate-100 text-slate-800" },
  },
};

function formatIsraelDateTime(value: number | null) {
  if (!value) return "מועד הקליטה אינו מתועד";
  return new Date(value).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function deliveryStatus(channel: DeliveryChannel, status: PlusCancellationDeliveryStatus) {
  return DELIVERY_STATUS_META[channel][status];
}

export default function PlusCancellationQueue({ rows, refreshing, onRefresh, onEnd }: PlusCancellationQueueProps) {
  return (
    <section className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm" aria-label="בקשות עצירת חיוב ב־Grow" data-plus-cancellation-queue>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-amber-950">בקשות עצירת חיוב ב־Grow</h4>
            <span className="rounded-full bg-amber-900 px-2.5 py-1 text-[10px] font-black text-amber-50" data-cancellation-count={String(rows.length)}>{rows.length}</span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-amber-950">הבקשה התקבלה באתר. נדרש לעצור את הוראת הקבע ב־Grow; אין אישור ספק אוטומטי.</p>
          <p className="mt-1 text-[10px] leading-5 text-amber-900">כל בקשה נשארת בתור עד לסיום Plus באתר, גם אם העברת המייל נכשלה.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="shrink-0 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-950 disabled:opacity-50">
          {refreshing ? "מרענן…" : "רענון"}
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 space-y-2">
          {rows.map(row => {
            const push = deliveryStatus("push", row.pushStatus);
            const email = deliveryStatus("email", row.emailStatus);
            const sms = deliveryStatus("sms", row.smsStatus);
            const fullName = `${row.single.firstName} ${row.single.lastName || ""}`.trim();
            return (
              <article key={row.plusMemberId} className="rounded-xl border border-amber-200 bg-white p-3" data-cancellation-request={row.plusMemberId}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-xs text-[#191265]">{fullName}</strong>
                      {row.legacy && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-800">בקשה ישנה · סטטוסי שליחה לא תועדו</span>}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-700">{row.single.email || "ללא כתובת מייל"} · {row.single.phone || "ללא טלפון"}</p>
                    <time className="mt-1 block text-[10px] text-slate-500">הבקשה התקבלה: {formatIsraelDateTime(row.requestedAt)}</time>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold">
                      <span className={`rounded-full px-2 py-1 ${push.className}`} data-push-status={row.pushStatus}>{push.label}</span>
                      <span className={`rounded-full px-2 py-1 ${email.className}`} data-email-status={row.emailStatus}>{email.label}</span>
                      <span className={`rounded-full px-2 py-1 ${sms.className}`} data-sms-status={row.smsStatus}>{sms.label}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => onEnd(row)} className="shrink-0 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-900 hover:bg-red-100">
                    החיוב הופסק ב־Grow? סיום Plus באתר
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-white/70 p-4 text-center text-xs text-amber-950">אין כרגע בקשות עצירה פתוחות.</p>
      )}
    </section>
  );
}
