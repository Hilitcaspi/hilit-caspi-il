import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfitAndLossSection } from "@/components/ProfitAndLossSection";
import { SalesSourcesTable } from "@/components/SalesSourcesTable";
import { MetaPurchaseDeliveryStatus } from "@/components/MetaPurchaseDeliveryStatus";
import { GrowAccountingStatus } from "@/components/GrowAccountingStatus";
import {
  formatIsraelCalendarDate,
  formatIsraelDateRange,
  getCurrentIsraelMonthStart,
  getIsraelCalendarDaysStart,
  addCalendarDays,
  endOfIsraelCalendarDate,
  parseIsraelCalendarDate,
} from "@/lib/dashboardDateRange";
import {
  TrendingUp, Users, DollarSign, Mail, MousePointerClick,
  ChevronDown, ChevronUp, ArrowLeft, BarChart3,
  Target, Zap, ShoppingCart, ShoppingBag, Dna, Megaphone, Heart, Lightbulb,
  Instagram, Facebook, MessageCircle, Send, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const PRESETS = [
  { label: "החודש", days: null },
  { label: "היום", days: 1 },
  { label: "אתמול", days: 2 },
  { label: "3 ימים מלאים", days: 3 },
  { label: "7 ימים", days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
] as const;

function toDateStr(ts: number) { return formatIsraelCalendarDate(ts); }
function fromDateStr(s: string) { return parseIsraelCalendarDate(s); }
function fmt(n: number) { return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n); }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "short" }); }
function fmtDateTime(ts: number) { return new Date(ts).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); }
function pctDelta(current: number, previous: number) {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

const PAYMENT_ATTEMPT_LABELS: Record<string, { label: string; className: string }> = {
  sandbox_plus: { label: "ניסוי Plus", className: "bg-slate-100 text-slate-700" },
  excluded_contact: { label: "לא לפנות", className: "bg-red-100 text-red-700" },
  recovery_already_sent: { label: "כבר נשלח מסע", className: "bg-blue-100 text-blue-700" },
  recovery_clicked: { label: "לחץ ולא השלים", className: "bg-amber-100 text-amber-800" },
  repeat_purchase_abandoned: { label: "רכישה נוספת", className: "bg-purple-100 text-purple-700" },
  abandoned_without_recovery: { label: "טרם טופל", className: "bg-orange-100 text-orange-800" },
};

function Change({ value, suffix = "%" }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {positive ? '+' : ''}{value}{suffix}
    </span>
  );
}

// Mini bar chart component
function MiniBarChart({ data, color = "bg-blue-500", height = 64 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 min-w-[6px] group relative flex flex-col items-center">
          <div className="absolute -top-6 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            {d.label}: {d.value}
          </div>
          <div className={`w-full ${color} rounded-t-sm transition-all`} style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const utils = trpc.useUtils();
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [showPaymentAttempts, setShowPaymentAttempts] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const endDate = useMemo(() => {
    if (useCustom && customEnd) return endOfIsraelCalendarDate(customEnd);
    const label = PRESETS[preset].label;
    if (label === "אתמול" || label === "3 ימים מלאים") return endOfIsraelCalendarDate(addCalendarDays(toDateStr(refreshedAt), -1));
    return refreshedAt;
  }, [useCustom, customEnd, preset, refreshedAt]);
  const startDate = useMemo(() => {
    if (useCustom && customStart) return fromDateStr(customStart);
    const selected = PRESETS[preset];
    if (selected.label === "3 ימים מלאים") return fromDateStr(addCalendarDays(toDateStr(refreshedAt), -3));
    return selected.days == null ? getCurrentIsraelMonthStart(refreshedAt) : getIsraelCalendarDaysStart(selected.label === "אתמול" ? 2 : selected.days, refreshedAt);
  }, [useCustom, customStart, preset, refreshedAt]);

  const dateInput = useMemo(() => ({ startDate, endDate }), [startDate, endDate]);
  const rangeLabel = useMemo(() => formatIsraelDateRange(startDate, endDate), [startDate, endDate]);
  const showMonthlyTargets = !useCustom && preset === 0;
  const includesPartialToday = toDateStr(endDate) === toDateStr(Date.now());

  const comp = trpc.dashboard.overviewWithComparison.useQuery(dateInput);
  const targets = trpc.dashboard.monthlyTargets.useQuery();
  const intelligence = trpc.dashboard.salesIntelligence.useQuery(dateInput, { enabled: endDate > startDate && endDate - startDate <= 93 * 86400000 });
  const metaAds = trpc.dashboard.metaAdsPerformance.useQuery(dateInput);
  const dailyFunnel = trpc.dashboard.dailyLeadFunnel.useQuery(dateInput);
  const paymentAttempts = trpc.dashboard.paymentAbandonmentAudit.useQuery(dateInput, { enabled: showPaymentAttempts });
  const demographics = trpc.dashboard.databaseDemographics.useQuery(dateInput);
  const emailEngagement = trpc.dashboard.emailEngagement.useQuery(dateInput);
  const socialInsights = trpc.dashboard.socialInsights.useQuery(dateInput);
  const siteTraffic = trpc.dashboard.siteTraffic.useQuery(dateInput);
  const dailyTrend = trpc.dashboard.dailyTrend.useQuery(dateInput);
  const isLoading = comp.isLoading || intelligence.isLoading;
  const t = targets.data;
  const c = comp.data && intelligence.data ? { ...comp.data, current: { ...comp.data.current, revenue: intelligence.data.summary.includedRevenueAgorot / 100, purchases: intelligence.data.summary.includedCount }, change: { ...comp.data.change, revenue: null, purchases: null } } : undefined;
  const comparisonLabel = c?.comparisonBasis === "same_dates_previous_month"
    ? "אותם תאריכים בחודש הקודם"
    : "התקופה הקודמת באותו אורך, ללא חפיפה";
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#191265] to-[#2d1f8a] text-white px-4 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <a href="/crm" className="p-1.5 rounded-lg hover:bg-white/10 transition"><ArrowLeft size={18} /></a>
            <div>
              <h1 className="text-lg font-bold">דשבורד שיווק ומכירות</h1>
              <p className="text-[10px] text-white/60">הילית כספי — ניתוח ביצועים</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => { setPreset(i); setUseCustom(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${preset === i && !useCustom ? "bg-white text-[#191265]" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={customStart || toDateStr(startDate)} onChange={(e) => { setCustomStart(e.target.value); setUseCustom(true); }}
              className="bg-white/10 text-white text-[11px] rounded-lg px-2 py-1 border border-white/20 [color-scheme:dark]" />
            <span className="text-white/60 text-[11px]">—</span>
            <input type="date" value={customEnd || toDateStr(endDate)} onChange={(e) => { setCustomEnd(e.target.value); setUseCustom(true); }}
              className="bg-white/10 text-white text-[11px] rounded-lg px-2 py-1 border border-white/20 [color-scheme:dark]" />
            <button onClick={() => { setRefreshedAt(Date.now()); void utils.dashboard.invalidate(); }} className="px-3 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20">רענון</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] text-blue-900">
          <span><strong>טווח:</strong> {rangeLabel}, שעון ישראל</span>
          <span>השוואה: {comparisonLabel}</span>
          <span>Meta: דיווח לפי תאריכים בלבד בשעון חשבון הפרסום (America/Los_Angeles), לא לפי חלון שעות זהה לישראל.</span>
          {includesPartialToday && <span className="font-semibold text-amber-800">היום הנוכחי עדיין חלקי; להשוואת קצב נקייה עדיף לבחור ימים מלאים שהסתיימו.</span>}
          {c && c.change.revenue === null && <span className="font-semibold text-amber-800">השוואת לידים זמינה; השוואת הכנסות קודמת אינה מוצגת עד ליישור הרשומות שבבירור מול Grow.</span>}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1: TOP KPIs — THE BIG PICTURE
        ═══════════════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : c && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Revenue */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-green-500">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} className="text-green-600" />
                  <span className="text-[11px] text-gray-500 font-medium">הכנסות ברוטו · ללא רשומות חשודות</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{fmt(c.current.revenue)}</div>
                <Change value={c.change.revenue} />
                {showMonthlyTargets && t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min((c.current.revenue / t.revenue) * 100, 100)}%` }} /></div>}
                {showMonthlyTargets && t && <div className="text-[9px] text-gray-400 mt-0.5">יעד חודשי: {fmt(t.revenue)}</div>}
              </div>
              {/* Purchases */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-purple-500">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart size={14} className="text-purple-600" />
                  <span className="text-[11px] text-gray-500 font-medium">רכישות שנכללו</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{c.current.purchases}</div>
                <Change value={c.change.purchases} />
                {showMonthlyTargets && t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min((c.current.trackedTargetPurchases / t.purchases) * 100, 100)}%` }} /></div>}
                {showMonthlyTargets && t && <div className="text-[9px] text-gray-400 mt-0.5">מוצרי היעד: {c.current.trackedTargetPurchases}/{t.purchases}</div>}
              </div>
              {/* Leads */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-blue-500">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-blue-600" />
                  <span className="text-[11px] text-gray-500 font-medium">לידים חדשים · CRM</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{c.current.leads}</div>
                <Change value={c.change.leads} />
                {showMonthlyTargets && t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min((c.current.leads / t.leads) * 100, 100)}%` }} /></div>}
              </div>
              {/* Spend */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-red-500">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone size={14} className="text-red-600" />
                  <span className="text-[11px] text-gray-500 font-medium">הוצאות Meta · הישראלי וקידומי הסושיאל</span>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {metaAds.data && metaAds.data.status !== "unavailable" ? fmt(metaAds.data.accountTotals.totalSpend) : '—'}
                </div>
                {metaAds.data && metaAds.data.status !== "unavailable" && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    מכירה ולידים: {fmt(metaAds.data.accountTotals.mainSpend)} · קידומי פרופיל/פוסטים: {fmt(metaAds.data.accountTotals.boostsSpend)}
                  </div>
                )}
                {showMonthlyTargets && t && t.budget !== null && metaAds.data && metaAds.data.status !== "unavailable" && (
                  <div className="text-[9px] text-gray-400 mt-0.5">בפועל {fmt(metaAds.data.accountTotals.totalSpend)} מתוך תוכנית {fmt(t.budget)} · {t.sourceLabel}</div>
                )}
              </div>
              {/* Database members */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-amber-500">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={14} className="text-amber-600" />
                  <span className="text-[11px] text-gray-500 font-medium">חברי מאגר פעילים כיום</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{demographics.data?.total.count || '—'}</div>
                <div className="text-[10px] text-gray-500">
                  {demographics.data ? `${demographics.data.total.males}♂ / ${demographics.data.total.females}♀` : ''}
                </div>
              </div>
            </div>

            {/* Daily trend chart */}
            {!dailyTrend.data && dailyTrend.isLoading && (
              <Card className="border-0 shadow-sm p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">📈 מגמה יומית — לידים ורכישות</h3>
                <Skeleton className="h-32 w-full rounded-lg" />
              </Card>
            )}
            {dailyTrend.data && dailyTrend.data.leads.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-3">📈 מגמה יומית — לידים ורכישות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1 font-medium">לידים</div>
                    <MiniBarChart
                      data={dailyTrend.data.leads.map((d: any) => ({ label: new Date(d.day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }), value: d.count }))}
                      color="bg-blue-400"
                      height={56}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 mb-1 font-medium">רכישות</div>
                    <MiniBarChart
                      data={(intelligence.data?.daily || []).map(d => ({ label: d.day, value: d.count }))}
                      color="bg-green-400"
                      height={56}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <SalesSourcesTable data={intelligence.data} loading={intelligence.isLoading} error={!!intelligence.error} />
        {intelligence.data && <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">סה״כ הוצאות מתועדות</p><strong>{intelligence.data.summary.totalExpenseAgorot == null ? "לא זמין" : fmt(intelligence.data.summary.totalExpenseAgorot / 100)}</strong></div>
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">יתרה לפי הנתונים הקיימים, לא רווח סופי</p><strong>{intelligence.data.summary.balanceAgorot == null ? "לא זמין" : fmt(intelligence.data.summary.balanceAgorot / 100)}</strong></div>
        </div>}
        <details className="rounded-xl bg-white shadow-sm"><summary className="cursor-pointer px-4 py-3 text-sm font-bold">ניהול הוצאות</summary><ProfitAndLossSection startDate={startDate} endDate={endDate} expensesOnly /></details>
        <details className="rounded-xl bg-white shadow-sm"><summary className="cursor-pointer px-4 py-3 text-sm font-bold">מצב מדידה</summary><GrowAccountingStatus startDate={startDate} endDate={endDate} /><MetaPurchaseDeliveryStatus startDate={startDate} endDate={endDate} /></details>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: CHANNEL BREAKDOWN — VISUAL
        ═══════════════════════════════════════════════════════════════════════ */}
        {intelligence.data && <Card className="border-0 shadow-sm">
          <CardHeader><h3 className="font-bold text-gray-900">שיוך לפי ערוץ</h3><p className="text-xs text-gray-500">אותן מכירות שמופיעות ברשימה, לפי מקור הסגירה המתועד. כל מכירה נספרת פעם אחת.</p></CardHeader>
          <CardContent><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b text-gray-500"><th className="py-2 text-right">ערוץ</th><th>רכישות</th><th>הכנסה</th></tr></thead><tbody>{intelligence.data.channels.map(row => <tr key={row.channel} className="border-b border-gray-100"><td className="py-3 font-semibold">{row.channel}</td><td className="text-center">{row.count}</td><td className="text-center font-bold text-emerald-700">{fmt(row.revenueAgorot / 100)}</td></tr>)}</tbody></table></div></CardContent>
        </Card>}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: DAILY CRM, GROW AND META ACTIVITY
        ═══════════════════════════════════════════════════════════════════════ */}
        {!dailyFunnel.data && dailyFunnel.isLoading && (
          <Card className="border-0 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">פעילות יומית: לידים ומכירות</h3>
            <div className="text-sm text-gray-500 mb-3">טוען נתונים...</div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </Card>
        )}
        {dailyFunnel.data && intelligence.data && dailyFunnel.data.days.length > 0 && (() => {
          const included = (intelligence.data?.sales || []).filter(sale => sale.status === "included");
          const days = dailyFunnel.data.days.map(day => {
            const sales = included.filter(sale => sale.day === day.date);
            const database = sales.filter(sale => sale.product === "database");
            return { ...day, revenue: sales.reduce((sum, sale) => sum + sale.amountAgorot, 0) / 100, databaseRevenue: database.reduce((sum, sale) => sum + sale.amountAgorot, 0) / 100, databasePurchases: database.length };
          });
          const totals = dailyFunnel.data.totals ? { ...dailyFunnel.data.totals,
            totalRevenue: (intelligence.data?.summary.includedRevenueAgorot || 0) / 100,
            totalPurchases: included.filter(sale => sale.product === "database").length,
            totalDatabaseRevenue: included.filter(sale => sale.product === "database").reduce((sum, sale) => sum + sale.amountAgorot, 0) / 100,
            purchChange: null, revenueChange: null,
          } : undefined;
          const maxLeads = Math.max(...days.map(d => d.campaignLeads), 1);
          const maxPurchases = Math.max(...days.map(d => d.databasePurchases), 1);
          return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-blue-600" />
                    <div>
                      <h3 className="font-bold text-gray-900">פעילות יומית: CRM, Grow ו־Meta</h3>
                      <p className="mt-0.5 text-[10px] text-gray-500">אלה מדדים מקבילים לפי יום, לא משפך ולא ייחוס סיבתי. המכירות מבוססות על דיווחי תשלום שנכללו באתר; תקציבי Meta מפוצלים לפי החשבון שממנו יצאו.</p>
                    </div>
                </div>
                {totals && (
                  <div className="text-[11px] text-gray-500">
                    ממוצע: <span className="font-bold text-blue-600">{totals.avgDailyLeads}</span> לידי DNA ביום ·
                    <span className="font-bold text-green-600"> {totals.avgDailyPurchases}</span> רכישות מאגר ביום
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary cards */}
              {totals && (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                 <div className="bg-blue-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-blue-600">{totals.totalCampaign}</div>
                   <div className="text-[10px] text-gray-500">לידי DNA ב־CRM</div>
                    {(totals as any).leadsChange !== 0 && <div className={`text-[10px] font-bold ${(totals as any).leadsChange > 0 ? 'text-green-600' : 'text-red-500'}`}>{(totals as any).leadsChange > 0 ? '↑' : '↓'}{Math.abs((totals as any).leadsChange)}% מול {comparisonLabel}</div>}
                 </div>
                 <div className="bg-green-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-green-600">{totals.totalPurchases}</div>
                   <div className="text-[10px] text-gray-500">רכישות מאגר</div>
                    {typeof (totals as any).purchChange === 'number' && (totals as any).purchChange !== 0 && <div className={`text-[10px] font-bold ${(totals as any).purchChange > 0 ? 'text-green-600' : 'text-red-500'}`}>{(totals as any).purchChange > 0 ? '↑' : '↓'}{Math.abs((totals as any).purchChange)}% מול {comparisonLabel}</div>}
                 </div>
                 <div className="bg-amber-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-amber-600">{totals.totalLeads}</div>
                   <div className="text-[10px] text-gray-500">כל הלידים ב־CRM</div>
                 </div>
                 <div className="bg-purple-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-purple-600">{totals.metaSpendStatus === 'available' ? '₪' + Math.round(totals.totalSalesSpend).toLocaleString() : '—'}</div>
                   <div className="text-[10px] text-gray-500">קמפייני מכירה ולידים</div>
                 </div>
                 <div className="bg-pink-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-pink-600">{totals.metaSpendStatus === 'available' ? '₪' + Math.round(totals.totalProfileBoostSpend).toLocaleString() : '—'}</div>
                   <div className="text-[10px] text-gray-500">קידומי פרופיל/פוסטים</div>
                 </div>
                 <div className="bg-emerald-50 rounded-lg p-3 text-center">
                   <div className="text-xl font-bold text-emerald-600">₪{totals.totalRevenue.toLocaleString()}</div>
                   <div className="text-[10px] text-gray-500">הכנסות ברוטו שנכללו</div>
                    {typeof (totals as any).revenueChange === 'number' && (totals as any).revenueChange !== 0 && <div className={`text-[10px] font-bold ${(totals as any).revenueChange > 0 ? 'text-green-600' : 'text-red-500'}`}>{(totals as any).revenueChange > 0 ? '↑' : '↓'}{Math.abs((totals as any).revenueChange)}% מול {comparisonLabel}</div>}
                 </div>
               </div>
              )}

              {/* Daily table with inline bar chart */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b-2 border-gray-200 text-gray-600 text-[11px]">
                   <th className="py-2 text-right font-semibold">תאריך</th>
                   <th className="py-2 text-center font-semibold">לידי DNA / כל CRM</th>
                   <th className="py-2 text-center font-semibold w-28">גרף</th>
                   <th className="py-2 text-center font-semibold">רכישות</th>
                    <th className="py-2 text-center font-semibold">הכנסות מאגר</th>
                    <th className="py-2 text-center font-semibold">תקציב מכירה</th>
                    <th className="py-2 text-center font-semibold">קידומי פרופיל</th>
                    <th className="py-2 text-center font-semibold">Grow כל המוצרים</th>
                  </tr></thead>
                  <tbody>
                    {days.map((day, i) => {
                      const leadsWidth = (day.campaignLeads / maxLeads) * 100;
                      const purchWidth = (day.databasePurchases / maxPurchases) * 100;
                      const dayName = new Date(day.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
                      return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                        <td className="py-2 text-right text-gray-700 font-medium">{dayName}</td>
                        <td className="py-2 text-center"><span className="text-blue-600 font-bold">{day.campaignLeads}</span> <span className="text-gray-400 text-[10px]">({day.totalLeads})</span></td>
                        <td className="py-2 px-1">
                          <div className="flex flex-col gap-[2px]">
                            <div className="h-[6px] bg-blue-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${leadsWidth}%` }} /></div>
                            <div className="h-[6px] bg-green-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${purchWidth}%` }} /></div>
                          </div>
                        </td>
                        <td className="py-2 text-center"><span className="text-green-600 font-bold">{day.databasePurchases}</span></td>
                        <td className="py-2 text-center text-amber-700 font-medium">₪{day.databaseRevenue.toLocaleString()}</td>
                        <td className="py-2 text-center text-purple-600 font-medium">{day.salesSpend > 0 ? fmt(day.salesSpend) : '—'}</td>
                        <td className="py-2 text-center text-pink-600 font-medium">{day.profileBoostSpend > 0 ? fmt(day.profileBoostSpend) : '—'}</td>
                        <td className="py-2 text-center text-emerald-600 font-semibold">₪{day.revenue.toLocaleString()}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                  {totals && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-[11px]">
                      <td className="py-2 text-right">סה״כ</td>
                      <td className="py-2 text-center text-blue-700">{totals.totalCampaign}</td>
                      <td></td>
                      <td className="py-2 text-center text-green-700">{totals.totalPurchases}</td>
                      <td className="py-2 text-center text-amber-700">₪{totals.totalDatabaseRevenue.toLocaleString()}</td>
                      <td className="py-2 text-center text-purple-700">{totals.metaSpendStatus === 'available' ? fmt(totals.totalSalesSpend) : '—'}</td>
                      <td className="py-2 text-center text-pink-700">{totals.metaSpendStatus === 'available' ? fmt(totals.totalProfileBoostSpend) : '—'}</td>
                      <td className="py-2 text-center text-emerald-700">₪{totals.totalRevenue.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                  )}
                </table>
              </div>

              {/* Insights */}
              {intelligence.data.insights.length > 0 && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                  <div className="text-[11px] text-blue-800 space-y-1">
                    {intelligence.data.insights.map((insight, i) => <p key={i}><strong>{insight.title}</strong> · {insight.detail}</p>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })()}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-600" />
                <div>
                  <h3 className="font-bold text-gray-900">ניסיונות תשלום שלא הושלמו</h3>
                  <p className="mt-0.5 text-[10px] text-gray-500">רשימה לקריאה בלבד. פתיחת תשלום אינה הוכחה לכשל: רוב האנשים משלימים בתוך דקות, וניסיונות חוזרים נשמרים כרשומה אחת.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setShowPaymentAttempts(value => !value)}>
                {showPaymentAttempts ? "הסתר רשימה" : "הצג פירוט לכל אדם"}
              </Button>
            </div>
          </CardHeader>
          {showPaymentAttempts && (
            <CardContent>
              {paymentAttempts.isLoading && <Skeleton className="h-40 w-full rounded-lg" />}
              {paymentAttempts.error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">לא ניתן לטעון כרגע את בדיקת ניסיונות התשלום.</div>}
              {paymentAttempts.data && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 mb-4">
                    <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-xl font-bold">{paymentAttempts.data.summary.started}</div><div className="text-[10px] text-gray-500">פתחו תשלום</div></div>
                    <div className="rounded-lg bg-green-50 p-3 text-center"><div className="text-xl font-bold text-green-700">{paymentAttempts.data.summary.completedLater}</div><div className="text-[10px] text-gray-500">השלימו אחר כך</div></div>
                    <div className="rounded-lg bg-orange-50 p-3 text-center"><div className="text-xl font-bold text-orange-700">{paymentAttempts.data.summary.unresolved}</div><div className="text-[10px] text-gray-500">לא השלימו מוצר זה</div></div>
                    <div className="rounded-lg bg-blue-50 p-3 text-center"><div className="text-xl font-bold text-blue-700">{paymentAttempts.data.summary.reviewReady}</div><div className="text-[10px] text-gray-500">לבדיקה ידנית</div></div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center"><div className="text-xl font-bold text-slate-700">{paymentAttempts.data.summary.sandboxPlus + paymentAttempts.data.summary.excluded}</div><div className="text-[10px] text-gray-500">לא לפנות</div></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-xs">
                      <thead><tr className="border-b text-gray-500">
                        <th className="py-2 text-right font-medium">אדם</th>
                        <th className="py-2 text-right font-medium">מוצר</th>
                        <th className="py-2 text-right font-medium">ניסיון אחרון</th>
                        <th className="py-2 text-right font-medium">מצב</th>
                        <th className="py-2 text-center font-medium">מסע נטישה</th>
                        <th className="py-2 text-right font-medium">מה נכון לעשות</th>
                      </tr></thead>
                      <tbody>
                        {paymentAttempts.data.unresolved.map(item => {
                          const status = PAYMENT_ATTEMPT_LABELS[item.classification] || { label: item.classification, className: "bg-gray-100 text-gray-700" };
                          return (
                            <tr key={item.id} className="border-b border-gray-100 align-top">
                              <td className="py-3 pl-3">
                                <div className="font-semibold text-gray-900">{item.name}</div>
                                <div className="text-[10px] text-gray-500">{item.email}</div>
                                {item.phone && <div className="text-[10px] text-gray-400">{item.phone}</div>}
                              </td>
                              <td className="py-3 pl-3 font-medium">{item.productLabel}</td>
                              <td className="py-3 pl-3 whitespace-nowrap">{fmtDateTime(item.startedAt)}</td>
                              <td className="py-3 pl-3"><Badge className={`${status.className} border-0 text-[10px]`}>{status.label}</Badge></td>
                              <td className="py-3 pl-3 text-center">
                                {item.recoveryEmailsSent > 0 ? `${item.recoveryEmailsSent} נשלחו${item.recoveryClicked ? " · נלחץ" : ""}` : "לא נשלח"}
                              </td>
                              <td className="py-3 leading-5 text-gray-700">{item.recommendation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                    אין כאן כפתור שליחה. לפני כל פנייה יש לבדוק שוב שלא בוצעה רכישה, שהמוצר עדיין זמין ושאין הסרת דיוור. שגיאות תשלום ישנות לא נשמרו בעבר בטבלה ייעודית, ולכן היעדר שגיאה מתועדת אינו הוכחה שלא הייתה תקלה נקודתית.
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 4: DEMOGRAPHICS — VISUAL
        ═══════════════════════════════════════════════════════════════════════ */}
        {!demographics.data && demographics.isLoading && (
          <Card className="border-0 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">👥 דמוגרפיה — מי במאגר?</h3>
            <Skeleton className="h-48 w-full rounded-lg" />
          </Card>
        )}
        {demographics.data && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-pink-600" />
                <h3 className="font-bold text-gray-900">דמוגרפיה: מצבה כיום מול נרשמים בטווח</h3>
                <Badge className="bg-pink-100 text-pink-700 text-[10px]">{demographics.data.total.count} פעילים</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Gender split - visual bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600">חלוקת מגדר</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${demographics.data.total.count > 0 ? (demographics.data.total.males / demographics.data.total.count * 100) : 50}%` }}>
                    ♂ {demographics.data.total.males} ({demographics.data.total.count > 0 ? Math.round(demographics.data.total.males / demographics.data.total.count * 100) : 0}%)
                  </div>
                  <div className="bg-pink-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${demographics.data.total.count > 0 ? (demographics.data.total.females / demographics.data.total.count * 100) : 50}%` }}>
                    ♀ {demographics.data.total.females} ({demographics.data.total.count > 0 ? Math.round(demographics.data.total.females / demographics.data.total.count * 100) : 0}%)
                  </div>
                </div>
              </div>

              {/* Age groups - horizontal bars */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">התפלגות גילאים בקרב הנרשמים בטווח ({demographics.data.period.count})</h4>
                <div className="space-y-2">
                  {demographics.data.ageGroups.filter((a: any) => a.group !== 'לא צוין' && a.count > 0).map((ag: any) => {
                    const maxCount = Math.max(...demographics.data!.ageGroups.filter((x: any) => x.group !== 'לא צוין').map((x: any) => x.count), 1);
                    return (
                      <div key={ag.group} className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-600 w-12 text-left">{ag.group}</span>
                        <div className="flex-1 flex h-5 rounded overflow-hidden bg-gray-100">
                          <div className="bg-blue-400 h-full" style={{ width: `${(ag.males / maxCount) * 100}%` }} />
                          <div className="bg-pink-400 h-full" style={{ width: `${(ag.females / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 w-14 text-right">{ag.count} ({ag.males}♂/{ag.females}♀)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top areas */}
              {demographics.data.areas.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">ערים מובילות בקרב הנרשמים בטווח</h4>
                  <div className="flex flex-wrap gap-2">
                    {demographics.data.areas.slice(0, 10).map((a: any) => (
                      <div key={a.city} className="bg-gray-50 rounded-lg px-3 py-1.5 text-xs border">
                        <span className="font-semibold">{a.city}</span> <span className="text-gray-500">{a.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {demographics.data.insights.length > 0 && (
                <div className="bg-pink-50 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-pink-800 mb-1">💡 תובנות שיווקיות</h4>
                  {demographics.data.insights.map((ins: string, i: number) => (
                    <p key={i} className="text-xs text-gray-700 mb-0.5">{ins}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 5: META ADS + VERIFIED UTM ATTRIBUTION
        ═══════════════════════════════════════════════════════════════════════ */}
        {metaAds.error && <Card className="border border-red-100 bg-red-50 p-4 text-sm text-red-800">נתוני Meta אינם זמינים כרגע. לא מוצגים אפסים במקום נתונים חסרים.</Card>}
        {metaAds.data?.status === "unavailable" && <Card className="border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">נתוני Meta אינם זמינים כרגע. לא מוצגים אפסים במקום נתונים חסרים.</Card>}
        {metaAds.data && metaAds.data.status !== "unavailable" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Meta Ads — תקציב ותוצאות מדווחות</h3>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">{metaAds.data.status === "available" ? "זמין" : metaAds.data.status === "partial" ? "חלקי" : "לא זמין"}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">לידים ורכישות בטבלה הם דיווחי הייחוס של Meta. הם אינם זהים בהכרח לחיובי Grow המאומתים, וערך/ROAS מוצגים רק כש־Meta מחזירה ערך רכישה. Insights של Meta מקבלת תאריכים בלבד ומחשבת אותם בשעון החשבון (America/Los_Angeles), לכן אין כאן התאמת שעות מלאה מול נתוני ישראל.</p>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center"><div className="text-xl font-bold text-blue-700">{fmt(metaAds.data.accountTotals.mainSpend)}</div><div className="text-[10px] text-gray-500">מכירה ולידים</div></div>
                <div className="rounded-lg bg-pink-50 p-3 text-center"><div className="text-xl font-bold text-pink-700">{fmt(metaAds.data.accountTotals.boostsSpend)}</div><div className="text-[10px] text-gray-500">קידומי פרופיל/פוסטים</div></div>
                <div className="rounded-lg bg-purple-50 p-3 text-center"><div className="text-xl font-bold text-purple-700">{metaAds.data.totals.metaReportedLeads}</div><div className="text-[10px] text-gray-500">לידים מדווחי Meta</div></div>
                <div className="rounded-lg bg-green-50 p-3 text-center"><div className="text-xl font-bold text-green-700">{metaAds.data.totals.metaReportedPurchases}</div><div className="text-[10px] text-gray-500">Purchase מדווח Meta</div></div>
              </div>

              {metaAds.data.boosts.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-pink-100 bg-pink-50/30 p-3">
                  <h4 className="mb-2 text-xs font-bold text-pink-800">קידומי פרופיל ופוסטים · לא נכללים בטבלת המכירה</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-[10px] text-gray-500"><th className="pb-1.5 text-right">קידום</th><th className="pb-1.5 text-center">הוצאה</th><th className="pb-1.5 text-center">חשיפה</th><th className="pb-1.5 text-center">Reach</th><th className="pb-1.5 text-center">קליקים</th><th className="pb-1.5 text-center">מעורבות</th></tr></thead>
                    <tbody>{metaAds.data.boosts.map((boost, i) => <tr key={i} className="border-b border-pink-100"><td className="max-w-[260px] truncate py-1.5 font-medium" title={boost.name}>{boost.name}</td><td className="py-1.5 text-center text-red-600">{fmt(boost.spend)}</td><td className="py-1.5 text-center">{boost.impressions.toLocaleString()}</td><td className="py-1.5 text-center">{boost.reach.toLocaleString()}</td><td className="py-1.5 text-center">{boost.clicks.toLocaleString()}</td><td className="py-1.5 text-center">{boost.postEngagement.toLocaleString()}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 6: EMAIL + SOCIAL + SEO (collapsed)
        ═══════════════════════════════════════════════════════════════════════ */}
        {emailEngagement.data && emailEngagement.data.totals.sent > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><Mail size={18} className="text-amber-500" /><h3 className="font-bold text-gray-900">מיילים ומסעות · נשלחו בטווח</h3></div>
              <p className="mt-1 text-[10px] text-gray-500">פתיחות וקליקים מתעדכנים לאחר השליחה, ולכן ימים אחרונים עשויים עדיין להשתנות.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-amber-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-amber-600">{emailEngagement.data.totals.sent}</div><div className="text-[10px] text-gray-500">נשלחו</div></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{emailEngagement.data.totals.openRate}%</div><div className="text-[10px] text-gray-500">פתיחה</div></div>
                <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{emailEngagement.data.totals.clickRate}%</div><div className="text-[10px] text-gray-500">קליקים</div></div>
                <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-purple-600">{emailEngagement.data.totals.clickToOpenRate}%</div><div className="text-[10px] text-gray-500">Click-to-Open</div></div>
              </div>
            </CardContent>
          </Card>
        )}

        {socialInsights.isLoading && <Card className="border-0 shadow-sm p-6"><Skeleton className="h-40 w-full rounded-lg" /></Card>}
        {socialInsights.error && <Card className="border border-red-100 bg-red-50 p-4 text-sm text-red-800">נתוני הסושיאל אינם זמינים כרגע. לא מוצג 0 במקום שגיאת API.</Card>}
        {socialInsights.data === null && !socialInsights.isLoading && !socialInsights.error && <Card className="border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">נתוני הסושיאל אינם זמינים כרגע. לא מוצג 0 במקום נתון חסר.</Card>}
        {socialInsights.data && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><Instagram size={18} className="text-pink-500" /><h3 className="font-bold text-gray-900">סושיאל · Instagram ו־Facebook</h3></div>
              <p className="mt-1 text-[10px] text-gray-500">{socialInsights.data.note}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-pink-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-pink-600">{socialInsights.data.instagram.followers.toLocaleString()}</div><div className="text-[10px] text-gray-500">עוקבי IG כעת</div><div className="text-[9px] text-gray-400">אין עדיין בסיס אמין לשינוי נטו</div></div>
                <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{socialInsights.data.facebook.followers.toLocaleString()}</div><div className="text-[10px] text-gray-500">עוקבי Facebook כעת</div></div>
                <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-purple-600">{socialInsights.data.instagram.totalInteractions.toLocaleString()}</div><div className="text-[10px] text-gray-500">אינטראקציות בטווח</div><Change value={pctDelta(socialInsights.data.instagram.totalInteractions, socialInsights.data.instagram.previousTotalInteractions)} /></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{socialInsights.data.instagram.accountsEngaged.toLocaleString()}</div><div className="text-[10px] text-gray-500">חשבונות מעורבים</div><Change value={pctDelta(socialInsights.data.instagram.accountsEngaged, socialInsights.data.instagram.previousAccountsEngaged)} /></div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] text-gray-600">
                <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-900">{socialInsights.data.instagram.likes}</strong>לייקים</div>
                <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-900">{socialInsights.data.instagram.comments}</strong>תגובות</div>
                <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-900">{socialInsights.data.instagram.shares}</strong>שיתופים</div>
                <div className="rounded-lg bg-gray-50 p-2"><strong className="block text-sm text-gray-900">{socialInsights.data.instagram.saves}</strong>שמירות</div>
              </div>
              {socialInsights.data.instagram.dailyReach.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-gray-500 mb-1">Reach יומי משוער, כולל פעילות ממומנת; הימים האחרונים עשויים להיות חלקיים</div>
                  <MiniBarChart data={socialInsights.data.instagram.dailyReach.map((d: any) => ({ label: d.date, value: d.value }))} color="bg-pink-400" height={48} />
                </div>
              )}
              {socialInsights.data.instagram.topPosts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <h4 className="mb-2 text-xs font-bold text-gray-700">פוסטים מהטווח לפי לייקים ותגובות</h4>
                  <table className="w-full text-xs"><thead><tr className="border-b text-[10px] text-gray-500"><th className="py-1.5 text-right">פוסט</th><th className="py-1.5 text-center">תאריך</th><th className="py-1.5 text-center">לייקים</th><th className="py-1.5 text-center">תגובות</th></tr></thead><tbody>
                    {socialInsights.data.instagram.topPosts.map((post: any) => <tr key={post.id} className="border-b border-gray-50"><td className="max-w-[420px] py-2"><a className="font-medium text-blue-700 hover:underline" href={post.permalink || '#'} target="_blank" rel="noreferrer">{post.caption || post.mediaType}</a></td><td className="py-2 text-center text-gray-500">{post.timestamp ? new Date(post.timestamp).toLocaleDateString('he-IL') : '—'}</td><td className="py-2 text-center">{post.likes}</td><td className="py-2 text-center">{post.comments}</td></tr>)}
                  </tbody></table>
                  <p className="mt-2 text-[9px] text-gray-400">הטבלה משווה תגובות ולייקים של תוכן Instagram. ייחוס לידים או מכירות לפוסט יוצג רק כשיש קישור/מודעה מזוהים.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {siteTraffic.data && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500" /><h3 className="font-bold text-gray-900">SEO ותנועה</h3><Badge className="bg-indigo-100 text-indigo-700 text-[10px]">{siteTraffic.data.uniqueVisitors} מבקרים</Badge></div>
            </CardHeader>
            <CardContent>
              {/* Funnel */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                {[
                  { label: "ביקור", value: siteTraffic.data.funnel.pageViews, color: "bg-indigo-500" },
                  { label: "DNA", value: siteTraffic.data.funnel.dnaStarts, color: "bg-blue-500" },
                  { label: "השלמה", value: siteTraffic.data.funnel.dnaCompletes, color: "bg-purple-500" },
                  { label: "פתיחת תשלום", value: siteTraffic.data.funnel.paymentStarts, color: "bg-green-500" },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="text-center">
                      <div className={`${step.color} text-white rounded-lg px-4 py-2`}><div className="text-lg font-bold">{step.value}</div></div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{step.label}</div>
                    </div>
                    {i < arr.length - 1 && <div className="text-gray-300 text-sm">·</div>}
                  </div>
                ))}
              </div>
              {/* Daily traffic */}
              {siteTraffic.data.dailyViews.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">תנועה יומית</div>
                  <MiniBarChart data={siteTraffic.data.dailyViews.map((d: any) => ({ label: d.day, value: d.views }))} color="bg-indigo-400" height={40} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
