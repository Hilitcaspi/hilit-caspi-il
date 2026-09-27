import { useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, Clock3, ExternalLink, Loader2, RefreshCw, Search, UserRoundCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATE_LABELS: Record<string, { label: string; className: string }> = {
  overdue: { label: "באיחור", className: "border-red-200 bg-red-50 text-red-800" },
  due_soon: { label: "פחות מ־24 שעות", className: "border-amber-200 bg-amber-50 text-amber-800" },
  active: { label: "בתוך חלון 3 הימים", className: "border-blue-200 bg-blue-50 text-blue-800" },
  awaiting_profile: { label: "ממתין/ה להשלמת פרופיל", className: "border-slate-200 bg-slate-50 text-slate-700" },
  fulfilled: { label: "הצעה נשלחה", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
};

function formatDate(value?: number | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));
}

function formatRemaining(value?: number | null) {
  if (value === null || value === undefined) return "הספירה תתחיל לאחר השלמת הפרופיל והשאלון";
  const absolute = Math.abs(value);
  const hours = Math.max(1, Math.ceil(absolute / (60 * 60 * 1000)));
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  const duration = days > 0 ? `${days} ימים${remainder ? ` ו־${remainder} שעות` : ""}` : `${hours} שעות`;
  return value < 0 ? `באיחור של ${duration}` : `נותרו ${duration}`;
}

function fullName(row: any) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || "רוכש/ת ללא שם פרופיל";
}

export default function DatabaseNowSlaSection() {
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const dashboard = trpc.operations.nowSlaDashboard.useQuery(undefined, { refetchOnWindowFocus: false });
  const data = dashboard.data;
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.rows || []).filter((row: any) => {
      const filterMatch = filter === "all"
        || (filter === "open" && row.state !== "fulfilled")
        || row.state === filter;
      const textMatch = !query || [row.firstName, row.lastName, row.email, row.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      return filterMatch && textMatch;
    });
  }, [data?.rows, filter, search]);

  if (dashboard.isLoading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-[#191265]"><Loader2 className="size-5 animate-spin" />טוענת את רוכשי NOW…</div>;
  }

  if (dashboard.error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">לא ניתן לטעון כרגע את מעקב NOW. {dashboard.error.message}</div>;
  }

  const summary = data?.summary || { total: 0, awaitingProfile: 0, active: 0, dueSoon: 0, overdue: 0, fulfilled: 0 };
  const coupon = data?.coupon;

  return (
    <div dir="rtl" className="space-y-4">
      <Card className="overflow-hidden border-[#8b3152]/20 shadow-sm">
        <CardHeader className="bg-gradient-to-l from-[#71113a] to-[#9b3b60] text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><AlarmClock className="size-6 text-[#ffe27c]" />רוכשי NOW · התחייבות 3 ימים</CardTitle>
              <CardDescription className="mt-2 text-white/75">מקור האמת הוא רכישות Grow שהושלמו עם קוד NOW. הספירה מתחילה רק לאחר השלמת הפרופיל והשאלון.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching} className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`ml-2 size-4 ${dashboard.isFetching ? "animate-spin" : ""}`} />רענון
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["סה״כ רוכשים", summary.total, "text-[#191265]"],
              ["ממתינים לפרופיל", summary.awaitingProfile, "text-slate-700"],
              ["בחלון 3 ימים", summary.active, "text-blue-700"],
              ["פחות מ־24 שעות", summary.dueSoon, "text-amber-700"],
              ["באיחור", summary.overdue, "text-red-700"],
              ["הצעה נשלחה", summary.fulfilled, "text-emerald-700"],
            ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-[#191265]/10 bg-white p-3 text-center"><div className={`text-2xl font-black ${color}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>)}
          </div>

          {coupon && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8b96d] bg-[#fffaf0] p-4">
            <div><p className="font-black text-[#71113a]">קוד {coupon.code} · {coupon.fixedPrice} ₪</p><p className="mt-1 text-sm text-slate-600">בתוקף עד {formatDate(coupon.expiresAt)} · {coupon.usedCount}/{coupon.maxUses ?? "∞"} מימושים</p></div>
            <Badge className={coupon.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>{coupon.isActive ? "פעיל" : "לא פעיל"}</Badge>
          </div>}

          <div className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="border-[#191265]/15"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">דורשים טיפול</SelectItem>
                <SelectItem value="all">כולם</SelectItem>
                <SelectItem value="awaiting_profile">ממתינים לפרופיל</SelectItem>
                <SelectItem value="active">בחלון 3 הימים</SelectItem>
                <SelectItem value="due_soon">פחות מ־24 שעות</SelectItem>
                <SelectItem value="overdue">באיחור</SelectItem>
                <SelectItem value="fulfilled">הצעה נשלחה</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל או טלפון" className="border-[#191265]/15 pr-9" /></div>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-[#191265]/20 bg-white p-10 text-center text-slate-500">אין רוכשי NOW שמתאימים למסנן שבחרת.</div> : <div className="space-y-3">{rows.map((row: any) => {
        const state = STATE_LABELS[row.state] || STATE_LABELS.active;
        const fulfilledWithinSla = row.firstMatchSentAt && row.dueAt && row.firstMatchSentAt <= row.dueAt;
        return <Card key={row.email} className={`border shadow-sm ${row.state === "overdue" ? "border-red-300" : row.state === "due_soon" ? "border-amber-300" : "border-[#191265]/10"}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-[#191265]">{fullName(row)}</h3><Badge variant="outline" className={state.className}>{state.label}</Badge>{row.task?.status === "in_progress" && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">בטיפול</Badge>}</div>
                <p className="mt-1 break-all text-sm text-slate-600">{row.email}{row.phone ? ` · ${row.phone}` : ""}</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">רכישה מאומתת</span><strong className="mt-1 block text-slate-800">{formatDate(row.paidAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">השלמת פרופיל ושאלון</span><strong className="mt-1 block text-slate-800">{formatDate(row.questionnaireCompletedAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">דדליין להצעה ראשונה</span><strong className="mt-1 block text-slate-800">{formatDate(row.dueAt)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">הצעה ראשונה נשלחה</span><strong className="mt-1 block text-slate-800">{formatDate(row.firstMatchSentAt)}</strong></div>
                </div>
                <p className={`mt-3 flex items-center gap-2 text-sm font-bold ${row.state === "overdue" ? "text-red-700" : row.state === "fulfilled" ? "text-emerald-700" : "text-[#71113a]"}`}>
                  {row.state === "fulfilled" ? <CheckCircle2 className="size-4" /> : row.state === "awaiting_profile" ? <UserRoundCheck className="size-4" /> : <Clock3 className="size-4" />}
                  {row.state === "fulfilled" ? (fulfilledWithinSla ? "ההתחייבות קוימה בתוך 3 ימים" : "הצעה נשלחה לאחר הדדליין") : formatRemaining(row.remainingMs)}
                </p>
                {!row.task && row.questionnaireCompletedAt && !row.firstMatchSentAt && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800">לא נמצאה משימת SLA אוטומטית. יש לטפל ברשומה בדחיפות.</p>}
                {row.task?.assignedTeamMemberName && <p className="mt-2 text-xs text-slate-500">מוקצה ל: {row.task.assignedTeamMemberName}</p>}
              </div>
              {row.singleId && <Button type="button" variant="outline" onClick={() => window.location.assign(`/crm/matchmaking?tab=singles&singleId=${row.singleId}`)} className="shrink-0 border-[#191265]/20 text-[#191265] hover:bg-[#191265]/5">פתיחת הפרופיל <ExternalLink className="mr-2 size-4" /></Button>}
            </div>
          </CardContent>
        </Card>;
      })}</div>}
    </div>
  );
}
