import { useState, useMemo, Fragment } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Users, DollarSign, Mail, MousePointerClick,
  ChevronDown, ChevronUp, ArrowLeft, BarChart3,
  Target, Zap, ShoppingCart, ShoppingBag, Dna, Megaphone, Heart, Lightbulb,
  Instagram, Facebook, MessageCircle, Send, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const PRESETS = [
  { label: "7 ימים", days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
  { label: "הכל", days: 365 * 3 },
] as const;

function toDateStr(ts: number) { return new Date(ts).toISOString().split("T")[0]; }
function fromDateStr(s: string) { return new Date(s + "T00:00:00").getTime(); }
function fmt(n: number) { return `₪${Math.round(n).toLocaleString("he-IL")}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "short" }); }

function Change({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
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
  const [preset, setPreset] = useState(2);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const endDate = useMemo(() => {
    if (useCustom && customEnd) return fromDateStr(customEnd) + 86400000 - 1;
    return Date.now();
  }, [useCustom, customEnd]);
  const startDate = useMemo(() => {
    if (useCustom && customStart) return fromDateStr(customStart);
    return Date.now() - PRESETS[preset].days * 24 * 60 * 60 * 1000;
  }, [useCustom, customStart, preset]);

  const dateInput = { startDate, endDate };

  const comp = trpc.dashboard.overviewWithComparison.useQuery(dateInput);
  const overview = trpc.dashboard.overview.useQuery(dateInput);
  const targets = trpc.dashboard.monthlyTargets.useQuery();
  const channels = trpc.dashboard.channelBreakdown.useQuery(dateInput);
  const metaAds = trpc.dashboard.metaAdsPerformance.useQuery(dateInput);
  const dailyFunnel = trpc.dashboard.dailyLeadFunnel.useQuery(dateInput);
  const demographics = trpc.dashboard.databaseDemographics.useQuery(dateInput);
  const emailEngagement = trpc.dashboard.emailEngagement.useQuery(dateInput);
  const socialInsights = trpc.dashboard.socialInsights.useQuery(dateInput);
  const siteTraffic = trpc.dashboard.siteTraffic.useQuery(dateInput);
  const dailyTrend = trpc.dashboard.dailyTrend.useQuery(dateInput);
  const sendReport = trpc.dashboard.sendWeeklyReport.useMutation();

  const isLoading = comp.isLoading;
  const t = targets.data;
  const c = comp.data;
  const b = c?.benchmarks;

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
            <input type="date" value={customEnd || toDateStr(Date.now())} onChange={(e) => { setCustomEnd(e.target.value); setUseCustom(true); }}
              className="bg-white/10 text-white text-[11px] rounded-lg px-2 py-1 border border-white/20 [color-scheme:dark]" />
            <button onClick={() => { if (confirm("לשלוח דוח שבועי עכשיו?")) sendReport.mutate(); }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/10 text-white/80 hover:bg-white/20 transition flex items-center gap-1 mr-2"
              disabled={sendReport.isPending}>
              <Send size={10} />{sendReport.isPending ? "..." : "דוח"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">

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
                  <span className="text-[11px] text-gray-500 font-medium">הכנסות</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{fmt(c.current.revenue)}</div>
                <Change value={c.change.revenue} />
                {t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min((c.current.revenue / t.revenue) * 100, 100)}%` }} /></div>}
                {t && <div className="text-[9px] text-gray-400 mt-0.5">יעד: {fmt(t.revenue)}</div>}
              </div>
              {/* Purchases */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-purple-500">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart size={14} className="text-purple-600" />
                  <span className="text-[11px] text-gray-500 font-medium">רכישות</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{c.current.purchases}</div>
                <Change value={c.change.purchases} />
                {t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min((c.current.purchases / t.purchases) * 100, 100)}%` }} /></div>}
              </div>
              {/* Leads */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-blue-500">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-blue-600" />
                  <span className="text-[11px] text-gray-500 font-medium">לידים</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{c.current.leads}</div>
                <Change value={c.change.leads} />
                {t && <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min((c.current.leads / t.leads) * 100, 100)}%` }} /></div>}
              </div>
              {/* Spend */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-red-500">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone size={14} className="text-red-600" />
                  <span className="text-[11px] text-gray-500 font-medium">הוצאות</span>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {metaAds.data ? fmt([...(metaAds.data.campaigns || []), ...(metaAds.data.boosts || [])].reduce((s: number, x: any) => s + (x.spend || 0), 0)) : '—'}
                </div>
                {metaAds.data && c.current.revenue > 0 && (
                  <div className="text-[10px] text-gray-500">ROAS: <span className="font-bold text-green-600">{(c.current.revenue / Math.max([...(metaAds.data.campaigns || []), ...(metaAds.data.boosts || [])].reduce((s: number, x: any) => s + (x.spend || 0), 0), 1)).toFixed(1)}x</span></div>
                )}
              </div>
              {/* Database members */}
              <div className="bg-white rounded-xl p-4 shadow-sm border-r-4 border-r-amber-500">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={14} className="text-amber-600" />
                  <span className="text-[11px] text-gray-500 font-medium">חברי מאגר</span>
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
                      data={dailyTrend.data.leads.map((d: any) => ({ label: new Date(d.day).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }), value: d.count }))}
                      color="bg-green-400"
                      height={56}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: CHANNEL BREAKDOWN — VISUAL
        ═══════════════════════════════════════════════════════════════════════ */}
        {!channels.data && channels.isLoading && (
          <Card className="border-0 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">📊 ערוצי שיווק</h3>
            <Skeleton className="h-48 w-full rounded-lg" />
          </Card>
        )}
        {channels.data && channels.data.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" />
                <h3 className="font-bold text-gray-900">ביצועים לפי ערוץ</h3>
                <Badge className="bg-gray-100 text-gray-600 text-[10px]">השוואה לחודש שעבר</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-[11px]">
                      <th className="text-right py-2 font-medium">ערוץ</th>
                      <th className="text-center py-2 font-medium">לידים</th>
                      <th className="text-center py-2 font-medium">רכישות</th>
                      <th className="text-center py-2 font-medium">הכנסות</th>
                      <th className="text-center py-2 font-medium">הוצאות</th>
                      <th className="text-center py-2 font-medium">המרה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.data.map((ch: any) => {
                      const leadChange = ch.prevLeads > 0 ? Math.round((ch.leads - ch.prevLeads) / ch.prevLeads * 100) : 0;
                      const purchaseChange = ch.prevPurchases > 0 ? Math.round((ch.purchases - ch.prevPurchases) / ch.prevPurchases * 100) : 0;
                      const convRate = ch.leads > 0 ? ((ch.purchases / ch.leads) * 100).toFixed(1) : "0";
                      const isExpanded = expandedChannel === ch.channel;
                      return (
                        <Fragment key={ch.channel}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedChannel(isExpanded ? null : ch.channel)}>
                            <td className="py-2.5 font-semibold text-gray-900">
                              <span className="text-[10px] ml-1">{isExpanded ? '▼' : '▶'}</span>{ch.channel}
                            </td>
                            <td className="text-center py-2.5">
                              <span className="font-bold">{ch.leads}</span>
                              {leadChange !== 0 && <span className={`block text-[10px] ${leadChange > 0 ? 'text-green-600' : 'text-red-500'}`}>{leadChange > 0 ? '↑' : '↓'}{Math.abs(leadChange)}%</span>}
                            </td>
                            <td className="text-center py-2.5">
                              <span className="font-bold">{ch.purchases}</span>
                              {purchaseChange !== 0 && <span className={`block text-[10px] ${purchaseChange > 0 ? 'text-green-600' : 'text-red-500'}`}>{purchaseChange > 0 ? '↑' : '↓'}{Math.abs(purchaseChange)}%</span>}
                            </td>
                            <td className="text-center py-2.5 font-bold text-emerald-700">₪{ch.revenue.toLocaleString()}</td>
                            <td className="text-center py-2.5">
                              {ch.spend > 0 ? <span className="font-bold text-red-600">₪{ch.spend.toLocaleString()}</span> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="text-center py-2.5">
                              <span className={`font-bold ${parseFloat(convRate) >= 10 ? 'text-green-600' : parseFloat(convRate) >= 5 ? 'text-amber-600' : 'text-gray-600'}`}>{convRate}%</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr><td colSpan={6} className="bg-blue-50/50 p-3 border-b">
                              <div className="text-xs text-gray-700">
                                {ch.campaigns && ch.campaigns.length > 0 && (
                                  <div className="space-y-1">
                                    {ch.campaigns.slice(0, 5).map((camp: any) => (
                                      <div key={camp.name} className="flex justify-between items-center bg-white rounded-lg px-3 py-1.5 shadow-sm">
                                        <span className="font-medium truncate max-w-[200px]">{camp.name}</span>
                                        <span className="text-gray-500">{camp.leads} לידים → {camp.purchases} רכישות (₪{camp.revenue.toLocaleString()})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td></tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: DAILY LEAD FUNNEL — CHART + TABLE
        ═══════════════════════════════════════════════════════════════════════ */}
        {!dailyFunnel.data && dailyFunnel.isLoading && (
          <Card className="border-0 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">🎯 משפך יומי: ליד → רכישה</h3>
            <div className="text-sm text-gray-500 mb-3">טוען נתונים...</div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </Card>
        )}
        {dailyFunnel.data && dailyFunnel.data.days.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900">משפך יומי: ליד → רכישה</h3>
                </div>
                {dailyFunnel.data.totals && (
                  <div className="text-[11px] text-gray-500">
                    ממוצע: <span className="font-bold text-blue-600">{dailyFunnel.data.totals.avgDailyLeads}</span> לידים/יום →
                    <span className="font-bold text-green-600"> {dailyFunnel.data.totals.avgDailyPurchases}</span> רכישות/יום =
                    <span className="font-bold text-amber-600"> {dailyFunnel.data.totals.avgConversionRate}%</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Visual chart */}
              <div className="mb-4 bg-gray-50 rounded-xl p-4">
                <div className="text-[10px] text-gray-500 mb-2 font-medium">לידים מקמפיין (כחול) vs רכישות מאגר (ירוק)</div>
                <div className="flex items-end gap-[4px] h-20">
                  {dailyFunnel.data.days.map((day, i) => {
                    const maxLeads = Math.max(...dailyFunnel.data!.days.map(d => d.campaignLeads), 1);
                    return (
                      <div key={i} className="flex-1 min-w-[8px] group relative flex flex-col items-center gap-[1px]">
                        <div className="absolute -top-7 bg-gray-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          {new Date(day.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}: {day.campaignLeads}→{day.databasePurchases} ({day.conversionRate}%)
                        </div>
                        <div className="w-full bg-blue-300 rounded-t-sm" style={{ height: `${(day.campaignLeads / maxLeads) * 100}%`, minHeight: day.campaignLeads > 0 ? '3px' : '0' }} />
                        <div className="w-full bg-green-400 rounded-b-sm" style={{ height: `${(day.databasePurchases / maxLeads) * 100}%`, minHeight: day.databasePurchases > 0 ? '3px' : '0' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary cards */}
              {dailyFunnel.data.totals && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{dailyFunnel.data.totals.totalCampaign}</div>
                    <div className="text-[10px] text-gray-500">לידים מקמפיין</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{dailyFunnel.data.totals.totalPurchases}</div>
                    <div className="text-[10px] text-gray-500">רכישות מאגר</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{dailyFunnel.data.totals.avgConversionRate}%</div>
                    <div className="text-[10px] text-gray-500">המרה</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-purple-600">{dailyFunnel.data.totals.totalSpend > 0 ? '₪' + Math.round(dailyFunnel.data.totals.totalSpend).toLocaleString() : '—'}</div>
                    <div className="text-[10px] text-gray-500">הוצאות מטא</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-emerald-600">₪{dailyFunnel.data.totals.totalRevenue.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500">הכנסות</div>
                  </div>
                </div>
              )}

              {/* Daily table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-gray-500 text-[10px]">
                    <th className="py-1.5 text-right font-medium">תאריך</th>
                    <th className="py-1.5 text-center font-medium">לידים</th>
                    <th className="py-1.5 text-center font-medium">רכישות</th>
                    <th className="py-1.5 text-center font-medium">המרה</th>
                    <th className="py-1.5 text-center font-medium">הכנסות</th>
                  </tr></thead>
                  <tbody>
                    {dailyFunnel.data.days.map((day, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-right text-gray-700 font-medium">{new Date(day.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</td>
                        <td className="py-1.5 text-center"><span className="text-blue-600 font-semibold">{day.campaignLeads}</span> <span className="text-gray-400">({day.totalLeads})</span></td>
                        <td className="py-1.5 text-center"><span className="text-green-600 font-semibold">{day.databasePurchases}</span></td>
                        <td className="py-1.5 text-center"><span className={`font-bold ${day.conversionRate >= 15 ? 'text-green-600' : day.conversionRate >= 8 ? 'text-amber-600' : 'text-red-500'}`}>{day.conversionRate}%</span></td>
                        <td className="py-1.5 text-center text-emerald-600 font-medium">₪{day.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Insights */}
              {dailyFunnel.data.insights.length > 0 && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                  <div className="text-[11px] text-blue-800 space-y-1">
                    {dailyFunnel.data.insights.map((insight, i) => <p key={i}>💡 {insight}</p>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                <h3 className="font-bold text-gray-900">דמוגרפיה של המאגר</h3>
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
                <h4 className="text-xs font-semibold text-gray-600 mb-2">התפלגות גילאים</h4>
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
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">ערים מובילות</h4>
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
            SECTION 5: META ADS + CAMPAIGN RECOMMENDATIONS
        ═══════════════════════════════════════════════════════════════════════ */}
        {metaAds.data && (metaAds.data.campaigns.length > 0 || metaAds.data.boosts.length > 0) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Meta Ads — קמפיינים והמלצות</h3>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Campaign table */}
              {metaAds.data.campaigns.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-[10px] text-gray-500 border-b">
                      <th className="text-right pb-1.5">קמפיין</th><th className="text-center pb-1.5">הוצאה</th>
                      <th className="text-center pb-1.5">לידים</th><th className="text-center pb-1.5">רכישות</th>
                      <th className="text-center pb-1.5">CPL</th><th className="text-center pb-1.5">CPA</th>
                      <th className="text-center pb-1.5">ROAS</th>
                    </tr></thead>
                    <tbody>
                      {metaAds.data.campaigns.map((camp, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/50">
                          <td className="py-1.5 text-right font-medium max-w-[160px] truncate" title={camp.name}>{camp.name}</td>
                          <td className="py-1.5 text-center text-red-600">{fmt(camp.spend)}</td>
                          <td className="py-1.5 text-center">{camp.leads || '—'}</td>
                          <td className="py-1.5 text-center">{camp.purchases > 0 ? <Badge className="bg-green-100 text-green-700 text-[10px]">{camp.purchases}</Badge> : '—'}</td>
                          <td className="py-1.5 text-center">{camp.cpl > 0 ? fmt(camp.cpl) : '—'}</td>
                          <td className="py-1.5 text-center">{camp.cpa > 0 ? fmt(camp.cpa) : '—'}</td>
                          <td className="py-1.5 text-center"><span className={camp.roas >= 3 ? 'text-green-600 font-bold' : camp.roas > 0 ? 'text-amber-600' : ''}>{camp.roas > 0 ? camp.roas + 'x' : '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metaAds.data.campaigns.filter(camp => camp.roas >= 3 && camp.purchases > 0).map((camp, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1"><span className="text-green-600 font-bold text-xs">✅ להגדיל תקציב</span></div>
                    <div className="text-xs text-gray-700">"{camp.name.substring(0, 30)}" — ROAS {camp.roas}x, CPA {fmt(camp.cpa)}</div>
                  </div>
                ))}
                {metaAds.data.campaigns.filter(camp => camp.spend > 100 && camp.purchases === 0 && camp.leads > 20).map((camp, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1"><span className="text-red-600 font-bold text-xs">⚠️ לבדוק/לכבות</span></div>
                    <div className="text-xs text-gray-700">"{camp.name.substring(0, 30)}" — {camp.leads} לידים, 0 רכישות, הוצאה {fmt(camp.spend)}</div>
                  </div>
                ))}
                {metaAds.data.campaigns.filter(camp => camp.cpl > 0 && camp.cpl <= 5).map((camp, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1"><span className="text-blue-600 font-bold text-xs">💡 CPL מצוין</span></div>
                    <div className="text-xs text-gray-700">"{camp.name.substring(0, 30)}" — CPL {fmt(camp.cpl)} (ממוצע תעשייה: ₪15)</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 6: EMAIL + SOCIAL + SEO (collapsed)
        ═══════════════════════════════════════════════════════════════════════ */}
        {emailEngagement.data && emailEngagement.data.totals.sent > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><Mail size={18} className="text-amber-500" /><h3 className="font-bold text-gray-900">מיילים ומסעות</h3></div>
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

        {socialInsights.data && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><Instagram size={18} className="text-pink-500" /><h3 className="font-bold text-gray-900">סושיאל</h3></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-pink-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-pink-600">{socialInsights.data.instagram.followers.toLocaleString()}</div><div className="text-[10px] text-gray-500">עוקבים IG</div>{socialInsights.data.instagram.followerGrowth !== 0 && <Change value={socialInsights.data.instagram.followerGrowth} suffix="" />}</div>
                <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-purple-600">{socialInsights.data.instagram.avgDailyReach.toLocaleString()}</div><div className="text-[10px] text-gray-500">Reach/יום</div></div>
                <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{socialInsights.data.instagram.engagementRate}%</div><div className="text-[10px] text-gray-500">Engagement</div></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{socialInsights.data.whatsappGroupSize.toLocaleString()}</div><div className="text-[10px] text-gray-500">קהילה WA</div></div>
              </div>
              {socialInsights.data.instagram.dailyReach.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-gray-500 mb-1">Reach יומי</div>
                  <MiniBarChart data={socialInsights.data.instagram.dailyReach.map((d: any) => ({ label: d.date, value: d.value }))} color="bg-pink-400" height={48} />
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
                  { label: "רכישה", value: siteTraffic.data.funnel.purchases, color: "bg-green-500" },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="text-center">
                      <div className={`${step.color} text-white rounded-lg px-4 py-2`}><div className="text-lg font-bold">{step.value}</div></div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{step.label}</div>
                    </div>
                    {i < arr.length - 1 && step.value > 0 && <div className="text-gray-400 text-sm">→ <span className="text-[10px] font-bold text-gray-600">{((arr[i + 1].value / step.value) * 100).toFixed(0)}%</span></div>}
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
