import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Loader2, RefreshCw, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NovemberQueueRow = {
  paymentId: number;
  singleId: number | null;
  name: string;
  paidAt: number;
  readyAt: number | null;
  dueAt: number | null;
  firstProposalDeliveredAt: number | null;
  activeMatchHold: boolean;
  state: string;
  profileRequirementsMissing: string[];
  eligibilityIssues: string[];
};

const FILTERS = [
  { value: "now", label: "לטיפול עכשיו" },
  { value: "awaiting_profile", label: "ממתינים לפרופיל" },
  { value: "needs_review", label: "נדרש בירור" },
  { value: "fulfilled", label: "קוימו" },
  { value: "all", label: "הכול" },
] as const;

type QueueFilter = (typeof FILTERS)[number]["value"];

const STATE_PRESENTATION: Record<string, { label: string; className: string }> = {
  awaiting_profile: { label: "נדרשת השלמת פרופיל", className: "border-slate-200 bg-slate-50 text-slate-700" },
  ready: { label: "אפשר להכין הצעה", className: "border-sky-200 bg-sky-50 text-sky-900" },
  overdue: { label: "באיחור", className: "border-rose-200 bg-rose-50 text-rose-900" },
  needs_review: { label: "נדרש בירור", className: "border-violet-200 bg-violet-50 text-violet-900" },
  fulfilled: { label: "הצעה נמסרה", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
};

const ISSUE_LABELS: Record<string, string> = {
  unpaid: "אין ראיית תשלום פעילה בפרופיל",
  inactive: "הפרופיל אינו פעיל",
  seed: "פרופיל בדיקה אינו זכאי",
  readiness_time: "אין ראיה קבועה למועד ההשלמה המלאה",
};

function formatJerusalemDateTime(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));
}

function formatTimeRemaining(dueAt: number, now: number) {
  const delta = dueAt - now;
  if (delta === 0) return "הדדליין הגיע כעת";
  const hours = Math.max(1, Math.ceil(Math.abs(delta) / (60 * 60 * 1000)));
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  const duration = days > 0 ? `${days} ימים${remainder ? ` ו־${remainder} שעות` : ""}` : `${hours} שעות`;
  return delta < 0 ? `באיחור של ${duration}` : `נותרו ${duration}`;
}

function stateMatchesFilter(state: string, filter: QueueFilter) {
  if (filter === "all") return true;
  if (filter === "now") return state === "ready" || state === "overdue";
  return state === filter;
}

/**
 * A read-only staff view for verified November bundle purchasers.
 * The component is conditionally mounted only from the dedicated CRM tab, so its
 * one queue query is not loaded while staff use other CRM views.
 */
export default function NovemberMembersAdminSection() {
  const [filter, setFilter] = useState<QueueFilter>("now");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const novemberQueue = trpc.liveOctober.adminNovemberBundleFirstMatchQueue.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const data = novemberQueue.data;
  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("he-IL");
    // Do not sort here: the server is authoritative for urgency order.
    return (data?.rows || []).filter((row: NovemberQueueRow) => {
      const matchesFilter = stateMatchesFilter(row.state, filter);
      const matchesName = !normalizedSearch || row.name.toLocaleLowerCase("he-IL").includes(normalizedSearch);
      return matchesFilter && matchesName;
    });
  }, [data?.rows, filter, search]);

  if (novemberQueue.isLoading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-[#191265]" dir="rtl"><Loader2 className="size-5 animate-spin" />טוענים את תור מצטרפי נובמבר…</div>;
  }

  if (novemberQueue.isError || !data) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900" dir="rtl">לא ניתן לטעון כרגע את תור מצטרפי נובמבר. <button type="button" onClick={() => void novemberQueue.refetch()} className="font-bold underline">לנסות שוב</button></div>;
  }

  const summary = data.summary;
  const nowCount = summary.ready + summary.overdue;
  const filterCount = (value: QueueFilter) => {
    if (value === "all") return summary.total;
    if (value === "now") return nowCount;
    if (value === "awaiting_profile") return summary.awaitingProfile;
    if (value === "needs_review") return summary.needsReview;
    return summary.fulfilled;
  };

  return (
    <section className="space-y-4 text-right" dir="rtl">
      <Card className="overflow-hidden border-[#514451]/20 shadow-sm">
        <CardHeader className="bg-gradient-to-l from-[#171519] to-[#514451] text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><ShieldCheck className="size-6 text-[#ffe27c]" />מצטרפי נובמבר</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/75">תור קריאה בלבד של רכישות חבילה מאומתות: 349 ₪, מוצר נובמבר ומקור תשלום Grow. יעד ההצעה מוצג רק לאחר ראיית תשלום והשלמה מוכחת של הפרופיל.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => void novemberQueue.refetch()} disabled={novemberQueue.isFetching} className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`ml-2 size-4 ${novemberQueue.isFetching ? "animate-spin" : ""}`} />רענון
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["סה״כ מאומתים", summary.total, "text-[#191265]"],
              ["לטיפול עכשיו", nowCount, "text-rose-700"],
              ["ממתינים לפרופיל", summary.awaitingProfile, "text-slate-700"],
              ["נדרש בירור", summary.needsReview, "text-violet-700"],
              ["הצעה נמסרה", summary.fulfilled, "text-emerald-700"],
            ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-[#191265]/10 bg-white p-3 text-center"><div className={`text-2xl font-black ${color}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>)}
          </div>

          <p className="rounded-xl bg-[#fffaf3] p-3 text-sm leading-6 text-[#514451]">התור לא יוצר, מסמן או שולח התאמות. סטטוס ״הצעה נמסרה״ נקבע רק מראיית מסירה שתועדה בשרת.</p>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === item.value ? "bg-[#191265] text-white" : "bg-[#f0eadc] text-[#191265] hover:bg-[#e8dfcb]"}`}>{item.label} ({filterCount(item.value)})</button>)}
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש לפי שם" className="border-[#191265]/15 pr-9" />
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#191265]/20 bg-white p-10 text-center text-slate-500">
          {summary.total === 0 ? "אין כרגע רכישות חבילת נובמבר מאומתות של 349 ₪ בתור. רכישות יופיעו כאן רק לאחר אימות תשלום Grow." : "אין רשומות שמתאימות למסנן או לחיפוש שבחרת."}
        </div>
      ) : <div className="space-y-3">{rows.map((row: NovemberQueueRow) => {
        const state = STATE_PRESENTATION[row.state] || STATE_PRESENTATION.needs_review;
        const hasDeliveryEvidence = Boolean(row.firstProposalDeliveredAt);
        const hasMissingRequirements = row.profileRequirementsMissing.length > 0;
        const hasIssues = row.eligibilityIssues.length > 0 || row.activeMatchHold;
        return <Card key={row.paymentId} className={`border shadow-sm ${row.state === "overdue" ? "border-rose-300" : row.state === "needs_review" ? "border-violet-300" : "border-[#191265]/10"}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[#191265]">{row.name}</h3><Badge variant="outline" className={state.className}>{state.label}</Badge></div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">מועד תשלום מאומת</span><strong className="mt-1 block text-slate-800">{formatJerusalemDateTime(row.paidAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">השלמה מוכחת</span><strong className="mt-1 block text-slate-800">{formatJerusalemDateTime(row.readyAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">דדליין להצעה ראשונה</span><strong className="mt-1 block text-slate-800">{formatJerusalemDateTime(row.dueAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">ראיית מסירה בפועל</span><strong className="mt-1 block text-slate-800">{formatJerusalemDateTime(row.firstProposalDeliveredAt)}</strong></div>
                </div>

                {row.dueAt ? <p className={`mt-3 flex items-center gap-2 text-sm font-bold ${row.state === "fulfilled" ? "text-emerald-700" : row.state === "overdue" ? "text-rose-700" : "text-[#514451]"}`}><Clock3 className="size-4" />{row.state === "fulfilled" ? "ההתחייבות תועדה כקוימה; הדדליין המוצג הוא המועד המקורי." : formatTimeRemaining(row.dueAt, now)}</p> : <p className="mt-3 flex items-center gap-2 text-sm font-bold text-violet-800"><Clock3 className="size-4" />אין דדליין מוצג ללא מועד השלמה מוכח.</p>}

                <p className={`mt-2 flex items-center gap-2 text-sm font-bold ${hasDeliveryEvidence ? "text-emerald-700" : "text-slate-600"}`}>{hasDeliveryEvidence ? <CheckCircle2 className="size-4" /> : <UserRoundCheck className="size-4" />}{hasDeliveryEvidence ? "הצעה ראשונה נמסרה בפועל לפי ראיית המסירה המתועדת." : "אין ראיית מסירה מתועדת להצעה ראשונה."}</p>

                {hasMissingRequirements && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>חסרים להשלמה:</strong> {row.profileRequirementsMissing.join(" · ")}</div>}
                {hasIssues && <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900"><strong>עיכובים ובדיקות:</strong><ul className="mt-1 list-inside list-disc space-y-1">{row.eligibilityIssues.map((issue: string) => <li key={issue}>{ISSUE_LABELS[issue] || issue}</li>)}{row.activeMatchHold && <li>יש התאמה פעילה עם ראיית שליחה — נדרש בירור ידני לפני הצעה נוספת.</li>}</ul></div>}
                {row.state === "needs_review" && !hasIssues && <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-900">אין ראיה מספקת לקביעת מוכנות או דדליין; נדרש בירור ידני.</p>}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                {row.singleId ? <>
                  <a href={`/crm/matchmaking?tab=singles&singleId=${row.singleId}`} className="inline-flex items-center justify-center rounded-xl border border-[#191265]/20 px-3 py-2 text-sm font-bold text-[#191265] hover:bg-[#191265]/5">פתיחת הפרופיל <ExternalLink className="mr-2 size-4" /></a>
                  <a href={`/crm/matchmaking?tab=compatibility&singleId=${row.singleId}`} className="inline-flex items-center justify-center rounded-xl bg-[#191265] px-3 py-2 text-sm font-bold text-white hover:bg-[#1800ad]">לבדיקת התאמה</a>
                </> : <span className="text-xs text-slate-500">לא נמצא פרופיל מקושר</span>}
              </div>
            </div>
          </CardContent>
        </Card>;
      })}</div>}
    </section>
  );
}
