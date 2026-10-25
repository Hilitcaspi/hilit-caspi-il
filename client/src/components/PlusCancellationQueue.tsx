import * as React from "react";
import ProfileStaffMarkers, { profileStaffSurface } from "@/components/ProfileStaffMarkers";

export type PlusCancellationDeliveryStatus = "pending" | "sending" | "accepted" | "failed" | "unknown" | "not_recorded";
export type ProviderStopEvidence = "staff_confirmation" | "legacy_staff_confirmation" | "not_confirmed";
export type PlusCancellationServiceState = "finishing_cycle" | "archived" | "needs_review" | "not_requested";

export type PlusCancellationTrackingRow = {
  requestId: number | null;
  plusMemberId: number;
  single: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isCoachingClient?: boolean | null;
    isNotBasic?: boolean | null;
  };
  joinedAt: number | null;
  requestedAt: number | null;
  requestDateSource: string;
  providerStoppedAt: number | null;
  providerStopEvidence: ProviderStopEvidence;
  resolvedAt: number | null;
  serviceState: PlusCancellationServiceState;
  serviceEndsAt: number | null;
  remaining: number;
  outstandingAtClosure?: number;
  target: number;
  delivered: number;
  legacy: boolean;
  subscriptionUnverified: boolean;
  pushStatus: PlusCancellationDeliveryStatus;
  emailStatus: PlusCancellationDeliveryStatus;
  smsStatus: PlusCancellationDeliveryStatus;
};

/** @deprecated Use PlusCancellationTrackingRow for the full tracking contract. */
export type PlusCancellationQueueRow = PlusCancellationTrackingRow;

export type PlusCancellationSummary = {
  requested: number;
  pendingGrow: number;
  confirmedGrow: number;
  withRemaining: number;
  archived: number;
  subscriptionUnverified: number;
};

export type PlusCancellationTrackingTab = "pendingGrow" | "confirmedGrow" | "unverified" | "all";

type PlusCancellationQueueProps = {
  rows: PlusCancellationTrackingRow[];
  summary: PlusCancellationSummary;
  refreshing: boolean;
  onRefresh: () => void;
  onConfirmProviderStopped: (row: PlusCancellationTrackingRow) => void;
  initialTab?: PlusCancellationTrackingTab;
};

type DeliveryChannel = "push" | "email" | "sms";

const DELIVERY_STATUS_META: Record<DeliveryChannel, Record<PlusCancellationDeliveryStatus, string>> = {
  push: {
    pending: "התראה ממתינה",
    sending: "התראה נשלחת",
    accepted: "התראה התקבלה",
    failed: "שליחת התראה נכשלה",
    unknown: "מצב התראה לא ידוע",
    not_recorded: "מצב התראה לא תועד",
  },
  email: {
    pending: "מייל ממתין",
    sending: "מייל נשלח",
    accepted: "מייל הועבר לשליחה",
    failed: "העברת מייל נכשלה",
    unknown: "מצב מייל לא ידוע",
    not_recorded: "מצב מייל לא תועד",
  },
  sms: {
    pending: "SMS ממתין",
    sending: "SMS נשלח",
    accepted: "SMS הועבר לשליחה",
    failed: "העברת SMS נכשלה",
    unknown: "מצב SMS לא ידוע",
    not_recorded: "מצב SMS לא תועד",
  },
};

function formatIsraelDate(value: number | null) {
  if (!value) return "לא מתועד";
  return new Date(value).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
  });
}

function formatIsraelDateTime(value: number | null) {
  if (!value) return "לא מתועד";
  return new Date(value).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function requestSourceLabel(source: string) {
  const labels: Record<string, string> = {
    cancellation_request: "בקשה באתר",
    member_cancellation: "רישום קודם במנוי",
    cancellation_task: "משימת הפסקה מתועדת",
    unknown: "מועד לא מתועד",
    request: "בקשה באתר",
    legacy_cancelled_at: "רישום קודם",
    legacy_member_cancelled_at: "רישום קודם",
    legacy: "רישום קודם",
  };
  return labels[source] || "רישום בקשה";
}

function isProviderConfirmed(row: PlusCancellationTrackingRow) {
  return row.providerStopEvidence === "staff_confirmation" || row.providerStopEvidence === "legacy_staff_confirmation";
}

function ServiceEligibility({ row }: { row: PlusCancellationTrackingRow }) {
  if (row.serviceState === "archived") {
    const outstanding = row.outstandingAtClosure ?? row.remaining;
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-700" data-service-state="archived">
        <strong className="block text-slate-900">שירות Plus נסגר</strong>
        <span>מועד סיום השירות: {formatIsraelDate(row.serviceEndsAt)}</span>
        {outstanding > 0 && <span className="mt-1 block text-amber-900">פער בסגירת המחזור: {outstanding} הצעות שלא הושלמו מתוך יעד {row.target}</span>}
      </div>
    );
  }

  if (row.serviceState === "needs_review") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-950" data-service-state="needs_review">
        <strong>זכאות השירות דורשת בירור</strong>
        <span className="block">החיוב והזכאות לשירות הם שני נושאים נפרדים.</span>
      </div>
    );
  }

  if (row.serviceState === "not_requested") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-700" data-service-state="not_requested">
        <strong>לא תועדה בקשת סיום שירות</strong>
        <span className="block">אישור עצירת החיוב אינו מסיים את השירות.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-[11px] leading-5 text-violet-950" data-service-state="finishing_cycle">
      <strong>זכאות השירות נשמרת עד סוף המחזור</strong>
      <span className="block">עד {formatIsraelDate(row.serviceEndsAt)} · נותרו {row.remaining} מתוך {row.target} הצעות במחזור</span>
      <span className="block text-violet-800">נמסרו עד כה {row.delivered} הצעות.</span>
    </div>
  );
}

function DeliveryDetails({ row }: { row: PlusCancellationTrackingRow }) {
  return (
    <details className="mt-2 text-[10px] text-slate-600">
      <summary className="cursor-pointer font-bold text-slate-600">פרטי תיעוד והודעות</summary>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(["push", "email", "sms"] as DeliveryChannel[]).map(channel => (
          <span key={channel} className="rounded-full bg-slate-100 px-2 py-1" data-delivery-channel={channel} data-delivery-status={row[`${channel}Status`]}>
            {DELIVERY_STATUS_META[channel][row[`${channel}Status`] as PlusCancellationDeliveryStatus]}
          </span>
        ))}
        {row.legacy && <span className="rounded-full bg-slate-200 px-2 py-1 font-bold text-slate-700">רישום היסטורי</span>}
      </div>
    </details>
  );
}

export default function PlusCancellationQueue({ rows, summary, refreshing, onRefresh, onConfirmProviderStopped, initialTab = "pendingGrow" }: PlusCancellationQueueProps) {
  const [tab, setTab] = React.useState<PlusCancellationTrackingTab>(initialTab);
  const [search, setSearch] = React.useState("");

  const visibleRows = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase("he-IL");
    return rows.filter(row => {
      const matchesTab = tab === "all"
        || (tab === "pendingGrow" && !row.subscriptionUnverified && !isProviderConfirmed(row))
        || (tab === "confirmedGrow" && !row.subscriptionUnverified && isProviderConfirmed(row))
        || (tab === "unverified" && row.subscriptionUnverified);
      const haystack = [row.single.firstName, row.single.lastName, row.single.email, row.single.phone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("he-IL");
      return matchesTab && (!query || haystack.includes(query));
    });
  }, [rows, search, tab]);

  const tabCount = (value: PlusCancellationTrackingTab) => {
    if (value === "pendingGrow") return summary.pendingGrow;
    if (value === "confirmedGrow") return summary.confirmedGrow;
    if (value === "unverified") return summary.subscriptionUnverified;
    return rows.length;
  };

  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-4 shadow-sm" aria-label="בקשות הפסקת Plus" data-plus-cancellation-queue data-plus-cancellation-tracking dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-bold text-amber-800">מעקב תפעולי · חיוב ב־Grow בנפרד מזכאות השירות</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-[#191265]">בקשות הפסקת Plus</h3>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-700">אישור עצירת חיוב ב־Grow מתעד את פעולת הצוות בלבד. הוא אינו מסיים את שירות Plus, והזכאות נשמרת עד סוף המחזור המתועד.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="shrink-0 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-950 transition active:scale-[.97] disabled:opacity-50">
          {refreshing ? "מרענן…" : "רענון"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="סיכום בקשות הפסקת Plus">
        {[
          ["בקשות Plus מתועדות", summary.requested, "text-[#191265]", "bg-white"],
          ["טרם אישרת עצירה ב־Grow", summary.pendingGrow, "text-amber-900", "bg-amber-100/70"],
          ["עצירה ב־Grow אושרה", summary.confirmedGrow, "text-emerald-800", "bg-emerald-100/70"],
          ["נותרו התאמות במחזור", summary.withRemaining, "text-violet-800", "bg-violet-100/70"],
        ].map(([label, value, color, surface]) => (
          <div key={String(label)} className={`rounded-xl border border-white/80 px-3 py-2 text-center shadow-sm ${surface}`}>
            <strong className={`block text-xl font-black ${color}`} data-cancellation-summary={String(label)}>{value}</strong>
            <span className="block text-[10px] leading-4 text-slate-600">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">{summary.archived} בקשות נמצאות בארכיון השירות. {summary.subscriptionUnverified} רשומות היסטוריות ללא הפעלת Plus או תשלום מתועד מופיעות בנפרד לבירור.</p>

      <div className="mt-4 flex flex-col gap-2 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="סינון בקשות הפסקת Plus">
          {([
            ["pendingGrow", "ממתינות ל־Grow"],
            ["confirmedGrow", "עצירה אושרה"],
            ["unverified", "רשומות ישנות לבירור"],
            ["all", "כל התיעוד"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-[.97] ${tab === value ? "border-[#191265] bg-[#191265] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#191265]"}`}
            >
              {label} <span className="mr-1 opacity-80">{tabCount(value)}</span>
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="חיפוש שם, טלפון או מייל"
          aria-label="חיפוש בקשות הפסקת Plus"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#191265] focus:ring-2 focus:ring-[#dcd8ef] sm:max-w-xs"
        />
      </div>

      <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-0.5">
        {visibleRows.map(row => {
          const fullName = `${row.single.firstName} ${row.single.lastName || ""}`.trim();
          const providerConfirmed = isProviderConfirmed(row);
          return (
            <article key={row.requestId ?? row.plusMemberId} className={`rounded-2xl border border-amber-200 p-3 shadow-sm ${profileStaffSurface(row.single)}`} data-cancellation-request={row.requestId ?? row.plusMemberId} data-provider-stop={providerConfirmed ? "confirmed" : "pending"}>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-base font-black text-[#191265]">{fullName}</strong>
                    {row.legacy && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-700">בקשה היסטורית</span>}
                    {row.subscriptionUnverified && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-950" data-subscription-unverified>רשומה ישנה לבירור</span>}
                  </div>
                  <ProfileStaffMarkers profile={row.single} compact />
                  <p className="mt-1 text-[11px] text-slate-700">{row.single.phone || "ללא טלפון"} · {row.single.email || "ללא כתובת מייל"}</p>
                  <div className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
                    <span><strong className="text-slate-800">הצטרפות לפלוס:</strong> {formatIsraelDate(row.joinedAt)}</span>
                    <span><strong className="text-slate-800">בקשת הפסקה:</strong> {formatIsraelDateTime(row.requestedAt)} <span className="text-slate-500">· {requestSourceLabel(row.requestDateSource)}</span></span>
                  </div>
                  <DeliveryDetails row={row} />
                </div>

                <div className="grid gap-2 xl:w-[330px]">
                  {row.subscriptionUnverified ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-950" data-provider-stop-unverified>
                      <strong className="block">לא נמצאה הפעלת Plus או רכישת Plus מתועדת</strong>
                      <span>אין לאשר עצירת חיוב ב־Grow מתוך רשומה זו; נדרש בירור נפרד.</span>
                    </div>
                  ) : providerConfirmed ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] leading-5 text-emerald-900" data-provider-stop-confirmed>
                      <strong className="block">עצירת החיוב ב־Grow אושרה</strong>
                      <span>{formatIsraelDateTime(row.providerStoppedAt)}</span>
                      {row.providerStopEvidence === "legacy_staff_confirmation" && <span className="mr-1 text-emerald-800">· תיעוד קודם</span>}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-950" data-provider-stop-pending>
                      <strong className="block">טרם אישרת עצירה ב־Grow</strong>
                      <span>יש לבדוק ולעצור את החיוב ב־Grow לפני האישור.</span>
                    </div>
                  )}
                  {!row.subscriptionUnverified && <ServiceEligibility row={row} />}
                  {!row.subscriptionUnverified && !providerConfirmed && (
                    <button type="button" onClick={() => onConfirmProviderStopped(row)} data-confirm-provider-stop={row.plusMemberId} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 active:scale-[.97]">
                      אישור עצירת החיוב ב־Grow
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {visibleRows.length === 0 && (
          <p className="rounded-xl border border-dashed border-amber-300 bg-white/80 p-5 text-center text-xs text-slate-600">
            אין בקשות בתצוגה זו.
          </p>
        )}
      </div>
    </section>
  );
}
