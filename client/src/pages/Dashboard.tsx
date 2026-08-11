import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Users, DollarSign, Mail, MousePointerClick,
  ChevronDown, ChevronUp, ArrowLeft, Calendar, BarChart3,
  Target, Zap, ShoppingCart, Dna, Megaphone, Heart, Lightbulb
} from "lucide-react";

// ─── Date presets ────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "7 ימים", days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
  { label: "הכל", days: 365 * 3 },
] as const;

function formatCurrency(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

// ─── Simple bar chart component ──────────────────────────────────────────────
function SimpleBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState(2); // default: 30 days
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [showAllLeads, setShowAllLeads] = useState(false);

  const endDate = useMemo(() => Date.now(), []);
  const startDate = useMemo(() => endDate - PRESETS[preset].days * 24 * 60 * 60 * 1000, [preset, endDate]);

  const dateInput = { startDate, endDate };

  const overview = trpc.dashboard.overview.useQuery(dateInput);
  const channels = trpc.dashboard.channelBreakdown.useQuery(dateInput);
  const products = trpc.dashboard.revenueByProduct.useQuery(dateInput);
  const journeys = trpc.dashboard.journeyFunnel.useQuery(dateInput);
  const sources = trpc.dashboard.leadSources.useQuery(dateInput);
  const campaigns = trpc.dashboard.topCampaigns.useQuery(dateInput);
  const recentLeads = trpc.dashboard.recentLeads.useQuery({ ...dateInput, limit: 50 });
  const dailyTrend = trpc.dashboard.dailyTrend.useQuery(dateInput);
  const metaAds = trpc.dashboard.metaAdsPerformance.useQuery(dateInput);
  const coachingRev = trpc.dashboard.coachingRevenue.useQuery(dateInput);

  const isLoading = overview.isLoading;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#191265] to-[#2d1f8a] text-white px-4 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/crm" className="p-1.5 rounded-lg hover:bg-white/10 transition">
              <ArrowLeft size={18} />
            </a>
            <div>
              <h1 className="text-lg font-bold">דשבורד שיווק ומכירות</h1>
              <p className="text-xs text-white/60">הילית כספי — ניתוח ביצועים</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPreset(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  preset === i ? "bg-white text-[#191265]" : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="לידים חדשים" value={overview.data?.totalLeads ?? 0} icon={Users} color="bg-blue-500" />
            <KpiCard title="הכנסות" value={formatCurrency(overview.data?.totalRevenue ?? 0)} icon={DollarSign} color="bg-green-500" />
            <KpiCard title="רכישות" value={overview.data?.totalPurchases ?? 0} subtitle={`המרה: ${formatPercent(overview.data?.conversionRate ?? 0)}`} icon={ShoppingCart} color="bg-purple-500" />
            <KpiCard title="שאלוני DNA" value={overview.data?.dnaCompleted ?? 0} icon={Dna} color="bg-pink-500" />
            <KpiCard title="מיילים נשלחו" value={overview.data?.emailsSent ?? 0} icon={Mail} color="bg-amber-500" />
            <KpiCard title="פתיחות" value={overview.data?.emailsOpened ?? 0} subtitle={overview.data?.emailsSent ? `${((overview.data.emailsOpened / overview.data.emailsSent) * 100).toFixed(0)}%` : ""} icon={MousePointerClick} color="bg-teal-500" />
            <KpiCard title="קליקים" value={overview.data?.emailsClicked ?? 0} icon={Target} color="bg-indigo-500" />
            <KpiCard title="הסרות" value={overview.data?.unsubscribes ?? 0} icon={Zap} color="bg-red-400" />
          </div>
        )}

        {/* Daily Trend */}
        {dailyTrend.data && dailyTrend.data.leads.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-900">מגמה יומית</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> לידים</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> הכנסות</span>
              </div>
              <div className="flex items-end gap-[2px] h-32 overflow-x-auto">
                {dailyTrend.data.leads.map((d, i) => {
                  const maxLeads = Math.max(...dailyTrend.data!.leads.map(l => l.count), 1);
                  const revDay = dailyTrend.data!.revenue.find(r => r.day === d.day);
                  const maxRev = Math.max(...dailyTrend.data!.revenue.map(r => r.amount), 1);
                  return (
                    <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center gap-[1px] group relative">
                      <div className="absolute -top-8 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                        {d.day.slice(5)}: {d.count} לידים{revDay ? `, ${formatCurrency(revDay.amount)}` : ""}
                      </div>
                      <div className="w-full flex flex-col justify-end h-full gap-[1px]">
                        <div className="bg-blue-400 rounded-t-sm transition-all" style={{ height: `${(d.count / maxLeads) * 100}%`, minHeight: d.count > 0 ? "3px" : "0" }} />
                        {revDay && revDay.amount > 0 && (
                          <div className="bg-green-500 rounded-b-sm transition-all" style={{ height: `${(revDay.amount / maxRev) * 40}%`, minHeight: "2px" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two columns: Channels + Products */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Channel Breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-500" />
                <h3 className="font-bold text-gray-900">ביצועים לפי ערוץ</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {channels.isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : (
                channels.data?.map((ch) => {
                  const maxLeads = Math.max(...(channels.data?.map(c => c.leads) ?? [1]));
                  return (
                    <div key={ch.channel} className="border border-gray-100 rounded-lg p-3">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedChannel(expandedChannel === ch.channel ? null : ch.channel)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ch.channel}</span>
                          <Badge variant="outline" className="text-[10px]">{ch.leads} לידים</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {ch.revenue > 0 && <span className="text-xs font-bold text-green-600">{formatCurrency(ch.revenue)}</span>}
                          {ch.purchases > 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">{ch.purchases} רכישות</Badge>}
                          {ch.campaigns.length > 1 && (expandedChannel === ch.channel ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                        </div>
                      </div>
                      <SimpleBar value={ch.leads} max={maxLeads} color="bg-purple-400" />
                      {expandedChannel === ch.channel && ch.campaigns.length > 0 && (
                        <div className="mt-2 pr-3 space-y-1.5 border-r-2 border-purple-100">
                          {ch.campaigns.map((camp) => (
                            <div key={camp.name} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate max-w-[180px]">{camp.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{camp.leads} לידים</span>
                                {camp.purchases > 0 && <span className="text-green-600 font-medium">{camp.purchases} רכישות</span>}
                                {camp.revenue > 0 && <span className="text-green-700 font-bold">{formatCurrency(camp.revenue)}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Revenue by Product */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-green-500" />
                <h3 className="font-bold text-gray-900">הכנסות לפי מוצר</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : (
                <>
                  {products.data?.map((p) => {
                    const maxRev = Math.max(...(products.data?.map(x => x.revenue) ?? [1]));
                    return (
                      <div key={p.product} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{p.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{p.count} רכישות</span>
                            <span className="text-sm font-bold text-green-600">{formatCurrency(p.revenue)}</span>
                          </div>
                        </div>
                        <SimpleBar value={p.revenue} max={maxRev} color="bg-green-400" />
                      </div>
                    );
                  })}
                  {products.data && products.data.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-sm">סה״כ</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(products.data.reduce((sum, p) => sum + p.revenue, 0))}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Sources */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-900">מקורות לידים</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sources.isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)
              ) : (
                sources.data?.map((s) => (
                  <div key={s.source} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{s.count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>


        {/* ═══ META ADS PERFORMANCE ═══ */}
        {metaAds.data && (metaAds.data.campaigns.length > 0 || metaAds.data.boosts.length > 0) && (
          <>
            <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-50 to-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900">ביצועי Meta Ads</h3>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">Live from Meta API</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100"><div className="text-[10px] text-gray-500">הוצאה כוללת</div><div className="text-lg font-bold text-red-600">{formatCurrency(metaAds.data.totals.spend)}</div></div>
                  <div className="bg-white rounded-lg p-3 border border-green-100"><div className="text-[10px] text-gray-500">הכנסה (רכישות)</div><div className="text-lg font-bold text-green-600">{formatCurrency(metaAds.data.totals.revenue)}</div></div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100"><div className="text-[10px] text-gray-500">ROAS</div><div className="text-lg font-bold text-purple-600">{metaAds.data.totals.roas}x</div></div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100"><div className="text-[10px] text-gray-500">עלות לרכישה</div><div className="text-lg font-bold text-amber-600">{formatCurrency(metaAds.data.totals.avgCPA)}</div></div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100"><div className="text-[10px] text-gray-500">עלות לליד</div><div className="text-lg font-bold text-teal-600">{formatCurrency(metaAds.data.totals.avgCPL)}</div></div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100"><div className="text-[10px] text-gray-500">חשיפות</div><div className="text-lg font-bold text-gray-700">{metaAds.data.totals.impressions.toLocaleString()}</div></div>
                </div>
                {metaAds.data.campaigns.length > 0 && (<div className="mb-4"><h4 className="text-sm font-bold text-gray-700 mb-2">קמפיינים (חשבון ראשי)</h4><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-[10px] text-gray-500 border-b"><th className="text-right pb-1.5 font-medium">קמפיין</th><th className="text-center pb-1.5 font-medium">הוצאה</th><th className="text-center pb-1.5 font-medium">לידים</th><th className="text-center pb-1.5 font-medium">רכישות</th><th className="text-center pb-1.5 font-medium">CPL</th><th className="text-center pb-1.5 font-medium">CPA</th><th className="text-center pb-1.5 font-medium">ROAS</th><th className="text-center pb-1.5 font-medium">קליקים</th></tr></thead><tbody>{metaAds.data.campaigns.map((c, i) => (<tr key={i} className="border-b border-gray-50 hover:bg-blue-50/50"><td className="py-1.5 text-right font-medium max-w-[180px] truncate" title={c.name}>{c.name}</td><td className="py-1.5 text-center text-red-600 font-medium">{formatCurrency(c.spend)}</td><td className="py-1.5 text-center">{c.leads || '—'}</td><td className="py-1.5 text-center">{c.purchases > 0 ? <Badge className="bg-green-100 text-green-700 text-[10px]">{c.purchases}</Badge> : '—'}</td><td className="py-1.5 text-center">{c.cpl > 0 ? formatCurrency(c.cpl) : '—'}</td><td className="py-1.5 text-center"><span className={c.cpa > 0 && c.cpa <= 50 ? 'text-green-600 font-bold' : c.cpa > 100 ? 'text-red-500' : ''}>{c.cpa > 0 ? formatCurrency(c.cpa) : '—'}</span></td><td className="py-1.5 text-center"><span className={c.roas >= 3 ? 'text-green-600 font-bold' : c.roas > 0 ? 'text-amber-600' : ''}>{c.roas > 0 ? c.roas + 'x' : '—'}</span></td><td className="py-1.5 text-center text-gray-500">{c.clicks.toLocaleString()}</td></tr>))}</tbody></table></div></div>)}
                {metaAds.data.boosts.length > 0 && (<div><h4 className="text-sm font-bold text-gray-700 mb-2">בוסטים (חשבון קידום)</h4><div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3"><div className="bg-pink-50 rounded p-2 text-center"><div className="text-[9px] text-gray-500">הוצאה</div><div className="font-bold text-sm text-red-600">{formatCurrency(metaAds.data.boostsTotals.spend)}</div></div><div className="bg-blue-50 rounded p-2 text-center"><div className="text-[9px] text-gray-500">חשיפות</div><div className="font-bold text-sm">{metaAds.data.boostsTotals.impressions.toLocaleString()}</div></div><div className="bg-purple-50 rounded p-2 text-center"><div className="text-[9px] text-gray-500">אינטראקציות</div><div className="font-bold text-sm">{metaAds.data.boostsTotals.engagement.toLocaleString()}</div></div><div className="bg-teal-50 rounded p-2 text-center"><div className="text-[9px] text-gray-500">צפיות וידאו</div><div className="font-bold text-sm">{metaAds.data.boostsTotals.videoViews.toLocaleString()}</div></div><div className="bg-amber-50 rounded p-2 text-center"><div className="text-[9px] text-gray-500">קליקים</div><div className="font-bold text-sm">{metaAds.data.boostsTotals.clicks.toLocaleString()}</div></div></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-[10px] text-gray-500 border-b"><th className="text-right pb-1.5 font-medium">פוסט</th><th className="text-center pb-1.5 font-medium">הוצאה</th><th className="text-center pb-1.5 font-medium">חשיפות</th><th className="text-center pb-1.5 font-medium">קליקים</th><th className="text-center pb-1.5 font-medium">אינטראקציות</th><th className="text-center pb-1.5 font-medium">וידאו</th></tr></thead><tbody>{metaAds.data.boosts.map((b, i) => (<tr key={i} className="border-b border-gray-50 hover:bg-pink-50/50"><td className="py-1.5 text-right font-medium max-w-[200px] truncate" title={b.name}>{b.name}</td><td className="py-1.5 text-center text-red-600">{formatCurrency(b.spend)}</td><td className="py-1.5 text-center">{b.impressions.toLocaleString()}</td><td className="py-1.5 text-center">{b.clicks.toLocaleString()}</td><td className="py-1.5 text-center">{b.postEngagement.toLocaleString()}</td><td className="py-1.5 text-center">{b.videoViews > 0 ? b.videoViews.toLocaleString() : '—'}</td></tr>))}</tbody></table></div></div>)}
              </CardContent>
            </Card>
            {/* AI Insights */}
            <Card className="border-0 shadow-sm border-r-4 border-r-amber-400">
              <CardHeader className="pb-2"><div className="flex items-center gap-2"><Lightbulb size={18} className="text-amber-500" /><h3 className="font-bold text-gray-900">תובנות והמלצות</h3></div></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {metaAds.data.campaigns.filter(c => c.cpa > 0 && c.cpa <= 40).length > 0 && (<div className="flex gap-2 items-start bg-green-50 rounded-lg p-3"><span className="text-green-600 mt-0.5">✅</span><div><span className="font-bold text-green-800">קמפיינים מנצחים: </span><span className="text-green-700">{metaAds.data.campaigns.filter(c => c.cpa > 0 && c.cpa <= 40).map(c => c.name.substring(0, 30)).join(', ')} — עלות לרכישה מתחת ל-₪40. כדאי להגדיל תקציב.</span></div></div>)}
                {metaAds.data.campaigns.filter(c => c.leads > 50 && c.purchases === 0).length > 0 && (<div className="flex gap-2 items-start bg-red-50 rounded-lg p-3"><span className="text-red-600 mt-0.5">⚠️</span><div><span className="font-bold text-red-800">לא ממירים: </span><span className="text-red-700">{metaAds.data.campaigns.filter(c => c.leads > 50 && c.purchases === 0).map(c => c.name.substring(0, 25) + ' (' + c.leads + ' לידים, 0 רכישות)').join('; ')} — לשקול לכבות או לשנות קהל.</span></div></div>)}
                {metaAds.data.campaigns.filter(c => c.cpa > 100).length > 0 && (<div className="flex gap-2 items-start bg-amber-50 rounded-lg p-3"><span className="text-amber-600 mt-0.5">💡</span><div><span className="font-bold text-amber-800">עלות גבוהה: </span><span className="text-amber-700">{metaAds.data.campaigns.filter(c => c.cpa > 100).map(c => c.name.substring(0, 25) + ' (CPA: ₪' + c.cpa + ')').join('; ')} — לבדוק קהל/קריאייטיב.</span></div></div>)}
                {metaAds.data.totals.roas > 0 && (<div className="flex gap-2 items-start bg-blue-50 rounded-lg p-3"><span className="text-blue-600 mt-0.5">📊</span><div><span className="font-bold text-blue-800">סיכום: </span><span className="text-blue-700">הוצאת {formatCurrency(metaAds.data.totals.spend)} והכנסת {formatCurrency(metaAds.data.totals.revenue)} מ-{metaAds.data.totals.purchases} רכישות. {metaAds.data.totals.roas >= 3 ? 'ROAS מצוין!' : metaAds.data.totals.roas >= 1.5 ? 'ROAS סביר — יש מקום לשיפור.' : 'ROAS נמוך — צריך אופטימיזציה.'}</span></div></div>)}
                {metaAds.data.boostsTotals.spend > 0 && (<div className="flex gap-2 items-start bg-purple-50 rounded-lg p-3"><span className="text-purple-600 mt-0.5">📣</span><div><span className="font-bold text-purple-800">בוסטים: </span><span className="text-purple-700">הוצאת {formatCurrency(metaAds.data.boostsTotals.spend)}. {metaAds.data.boostsTotals.engagement.toLocaleString()} אינטראקציות, {metaAds.data.boostsTotals.videoViews.toLocaleString()} צפיות וידאו. עלות לאינטראקציה: {formatCurrency(Math.round(metaAds.data.boostsTotals.spend / Math.max(metaAds.data.boostsTotals.engagement, 1) * 100) / 100)}. בוסטים בונים מודעות למותג.</span></div></div>)}
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══ COACHING & SESSIONS ═══ */}
        {coachingRev.data && (coachingRev.data.sessionCount > 0 || coachingRev.data.coachingCount > 0) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><div className="flex items-center gap-2"><Heart size={18} className="text-pink-500" /><h3 className="font-bold text-gray-900">ליווי ופגישות</h3></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-pink-50 rounded-lg p-3 text-center"><div className="text-[10px] text-gray-500">תהליכי ליווי</div><div className="text-xl font-bold text-pink-600">{coachingRev.data.coachingCount}</div><div className="text-[10px] text-gray-500">{formatCurrency(coachingRev.data.totalCoachingRevenue)}</div></div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center"><div className="text-[10px] text-gray-500">פגישות בודדות</div><div className="text-xl font-bold text-indigo-600">{coachingRev.data.sessionCount}</div><div className="text-[10px] text-gray-500">{formatCurrency(coachingRev.data.totalSessionRevenue)}</div></div>
                <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-[10px] text-gray-500">סה"כ הכנסה</div><div className="text-xl font-bold text-green-600">{formatCurrency(coachingRev.data.totalCoachingRevenue + coachingRev.data.totalSessionRevenue)}</div></div>
                <div className="bg-amber-50 rounded-lg p-3 text-center"><div className="text-[10px] text-gray-500">ממוצע לתהליך</div><div className="text-xl font-bold text-amber-600">{coachingRev.data.coachingCount > 0 ? formatCurrency(Math.round(coachingRev.data.totalCoachingRevenue / coachingRev.data.coachingCount)) : '—'}</div></div>
              </div>
              {(coachingRev.data.coaching.length > 0 || coachingRev.data.sessions.length > 0) && (<div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-[10px] text-gray-500 border-b"><th className="text-right pb-1.5 font-medium">שם</th><th className="text-center pb-1.5 font-medium">סכום</th><th className="text-center pb-1.5 font-medium">סוג</th><th className="text-right pb-1.5 font-medium">מקור</th><th className="text-right pb-1.5 font-medium">תאריך</th></tr></thead><tbody>{[...coachingRev.data.coaching, ...coachingRev.data.sessions].slice(0, 20).map((r, i) => (<tr key={i} className="border-b border-gray-50 hover:bg-gray-50"><td className="py-1.5 text-right font-medium">{r.name || r.email}</td><td className="py-1.5 text-center font-bold text-green-600">{formatCurrency(r.sum)}</td><td className="py-1.5 text-center"><Badge className={r.sum >= 1500 ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'}>{r.sum >= 1500 ? 'ליווי' : 'פגישה'}</Badge></td><td className="py-1.5 text-right text-gray-500">{r.source}</td><td className="py-1.5 text-right text-gray-500">{formatDate(r.date)}</td></tr>))}</tbody></table></div>)}
            </CardContent>
          </Card>
        )}

        {/* Top Campaigns (UTM-based) */}
        {campaigns.data && campaigns.data.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-amber-500" />
                <h3 className="font-bold text-gray-900">קמפיינים מובילים (UTM)</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-right pb-2 font-medium">קמפיין</th>
                      <th className="text-right pb-2 font-medium">ערוץ</th>
                      <th className="text-center pb-2 font-medium">לידים</th>
                      <th className="text-center pb-2 font-medium">רכישות</th>
                      <th className="text-center pb-2 font-medium">המרה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.data.map((c, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-right font-medium max-w-[200px] truncate">{c.campaign}</td>
                        <td className="py-2 text-right text-gray-500">{c.source}</td>
                        <td className="py-2 text-center">{c.leads}</td>
                        <td className="py-2 text-center">
                          {c.purchases > 0 ? <Badge className="bg-green-100 text-green-700">{c.purchases}</Badge> : "—"}
                        </td>
                        <td className="py-2 text-center">
                          {c.conversionRate > 0 ? (
                            <span className={`font-medium ${c.conversionRate >= 5 ? "text-green-600" : "text-gray-600"}`}>
                              {formatPercent(c.conversionRate)}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Journey Funnels */}
        {journeys.data && journeys.data.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-teal-500" />
                <h3 className="font-bold text-gray-900">מסעות מייל — המרות</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {journeys.data.filter(j => j.totalLeads > 5).map((j) => (
                <div key={j.journeyKey} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{j.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{j.totalLeads} לידים</span>
                      <Badge className={j.conversionRate >= 5 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {j.purchased} רכישות ({formatPercent(j.conversionRate)})
                      </Badge>
                    </div>
                  </div>
                  {/* Steps funnel */}
                  <div className="flex gap-1 items-end h-10">
                    {j.steps.map((step, i) => {
                      const maxSent = Math.max(...j.steps.map(s => s.sent), 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                          <div className="absolute -top-7 bg-gray-800 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            מייל {step.index + 1}: {step.sent} נשלחו, {step.opened} פתחו, {step.clicked} לחצו
                          </div>
                          <div className="w-full bg-teal-100 rounded-t-sm relative overflow-hidden" style={{ height: `${(step.sent / maxSent) * 100}%`, minHeight: "4px" }}>
                            <div className="absolute bottom-0 w-full bg-teal-400 rounded-t-sm" style={{ height: `${step.sent > 0 ? (step.opened / step.sent) * 100 : 0}%` }} />
                            <div className="absolute bottom-0 w-full bg-teal-600 rounded-t-sm" style={{ height: `${step.sent > 0 ? (step.clicked / step.sent) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-400">{step.index + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-100 inline-block" /> נשלחו</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-400 inline-block" /> פתחו</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-600 inline-block" /> לחצו</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Leads Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                <h3 className="font-bold text-gray-900">לידים אחרונים</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAllLeads(!showAllLeads)}>
                {showAllLeads ? "הצג פחות" : "הצג הכל"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-right pb-2 font-medium">שם</th>
                    <th className="text-right pb-2 font-medium">מקור</th>
                    <th className="text-right pb-2 font-medium">קמפיין</th>
                    <th className="text-center pb-2 font-medium">מיילים</th>
                    <th className="text-center pb-2 font-medium">המרה</th>
                    <th className="text-right pb-2 font-medium">תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={6}><Skeleton className="h-8 my-1" /></td></tr>
                    ))
                  ) : (
                    (showAllLeads ? recentLeads.data : recentLeads.data?.slice(0, 15))?.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-right">
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-[10px] text-gray-400">{lead.email}</div>
                        </td>
                        <td className="py-2 text-right text-xs text-gray-500">{lead.source || lead.utmSource || "—"}</td>
                        <td className="py-2 text-right text-xs text-gray-500 max-w-[120px] truncate">{lead.utmCampaign || "—"}</td>
                        <td className="py-2 text-center">
                          {lead.emailsSent > 0 ? (
                            <span className="text-xs">
                              {lead.emailsOpened}/{lead.emailsSent}
                              <span className="text-gray-400 mr-0.5">📬</span>
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 text-center">
                          {lead.converted ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                              {lead.purchasedProduct}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right text-xs text-gray-500">{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
