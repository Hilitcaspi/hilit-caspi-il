import { useState, useMemo } from "react";
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

// Change indicator component
function Change({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {positive ? '+' : ''}{value}{suffix}
    </span>
  );
}

// Benchmark comparison
function Benchmark({ value, benchmark, label, unit = "%" }: { value: number; benchmark: number; label: string; unit?: string }) {
  const diff = value - benchmark;
  const color = diff >= 0 ? 'text-green-600' : 'text-red-500';
  return (
    <div className="text-[9px] text-gray-400 mt-0.5">
      <span className={color}>{diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}{unit}</span>
      <span className="mr-1">מממוצע ({benchmark}{unit})</span>
    </div>
  );
}

// Progress toward target
function TargetProgress({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = Math.min((current / Math.max(target, 1)) * 100, 100);
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>יעד: {target.toLocaleString()}</span>
        <span className={pct >= 80 ? 'text-green-600 font-bold' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
        <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ title, value, change, target, benchmark, benchmarkLabel, icon: Icon, color }: {
  title: string; value: string | number; change?: number; target?: { current: number; goal: number };
  benchmark?: { value: number; avg: number; unit?: string }; benchmarkLabel?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${color} shrink-0`}>
            <Icon size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
              {change !== undefined && <Change value={change} />}
            </div>
            {target && <TargetProgress current={target.current} target={target.goal} label="" />}
            {benchmark && <Benchmark value={benchmark.value} benchmark={benchmark.avg} label={benchmarkLabel || ""} unit={benchmark.unit} />}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const products = trpc.dashboard.revenueByProduct.useQuery(dateInput);
  const campaigns = trpc.dashboard.topCampaigns.useQuery(dateInput);
  const productFunnels = trpc.dashboard.productFunnels.useQuery(dateInput);
  const socialInsights = trpc.dashboard.socialInsights.useQuery(dateInput);
  const emailEngagement = trpc.dashboard.emailEngagement.useQuery(dateInput);
  const siteTraffic = trpc.dashboard.siteTraffic.useQuery(dateInput);
  const recentLeads = trpc.dashboard.recentLeads.useQuery({ ...dateInput, limit: 50 });
  const dailyTrend = trpc.dashboard.dailyTrend.useQuery(dateInput);
  const metaAds = trpc.dashboard.metaAdsPerformance.useQuery(dateInput);
  const coachingRev = trpc.dashboard.coachingRevenue.useQuery(dateInput);
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

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {/* ═══ KPI CARDS WITH COMPARISON ═══ */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : c && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="לידים" value={c.current.leads} change={c.change.leads} target={t ? { current: c.current.leads, goal: t.leads } : undefined} icon={Users} color="bg-blue-500" />
            <KpiCard title="הכנסות" value={fmt(c.current.revenue)} change={c.change.revenue} target={t ? { current: c.current.revenue, goal: t.revenue } : undefined} icon={DollarSign} color="bg-green-500" />
            <KpiCard title="רכישות" value={c.current.purchases} change={c.change.purchases} target={t ? { current: c.current.purchases, goal: t.purchases } : undefined}
              benchmark={b ? { value: c.current.conversionRate, avg: b.conversionRate, unit: "%" } : undefined} benchmarkLabel="המרה"
              icon={ShoppingCart} color="bg-purple-500" />
            <KpiCard title="שאלוני DNA" value={c.current.dna} change={c.change.dna} icon={Dna} color="bg-pink-500" />
            <KpiCard title="מיילים נשלחו" value={overview.data?.emailsSent ?? 0} icon={Mail} color="bg-amber-500"
              benchmark={b && overview.data ? { value: overview.data.emailsSent > 0 ? Math.round((overview.data.emailsOpened / overview.data.emailsSent) * 100) : 0, avg: b.emailOpenRate, unit: "%" } : undefined} benchmarkLabel="פתיחה" />
            <KpiCard title="פתיחות" value={overview.data?.emailsOpened ?? 0} icon={MousePointerClick} color="bg-teal-500" />
            <KpiCard title="קליקים" value={overview.data?.emailsClicked ?? 0} icon={Target} color="bg-indigo-500" />
            <KpiCard title="הסרות" value={overview.data?.unsubscribes ?? 0} icon={Zap} color="bg-red-400" />
          </div>
        )}

        {/* ═══ LEAD JOURNEY ATTRIBUTION ═══ */}
        {c && c.journeyAttribution.length > 0 && (
          <Card className="border-0 shadow-sm border-r-4 border-r-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-900">מסע ליד: קמפיין → מסע מיילים → רכישה</h3>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">איזה קמפיינים מביאים לידים שבסוף רוכשים (דרך מסעות המיילים)</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-[10px] text-gray-500 border-b">
                    <th className="text-right pb-1.5 font-medium">קמפיין / מקור</th>
                    <th className="text-center pb-1.5 font-medium">לידים</th>
                    <th className="text-center pb-1.5 font-medium">רכשו</th>
                    <th className="text-center pb-1.5 font-medium">% המרה</th>
                    <th className="text-right pb-1.5 font-medium">ערוץ</th>
                  </tr></thead>
                  <tbody>
                    {c.journeyAttribution.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/50">
                        <td className="py-1.5 text-right font-medium max-w-[200px] truncate">{r.campaign}</td>
                        <td className="py-1.5 text-center">{r.leads}</td>
                        <td className="py-1.5 text-center">{r.converted > 0 ? <Badge className="bg-green-100 text-green-700 text-[10px]">{r.converted}</Badge> : '—'}</td>
                        <td className="py-1.5 text-center">
                          <span className={r.conversionRate >= 5 ? 'text-green-600 font-bold' : r.conversionRate > 0 ? 'text-amber-600' : 'text-gray-400'}>
                            {r.conversionRate > 0 ? fmtPct(r.conversionRate) : '—'}
                          </span>
                        </td>
                        <td className="py-1.5 text-right text-gray-500">{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Deep insight */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-800">
                    <span className="font-bold">ניתוח: </span>
                    {(() => {
                      const best = c.journeyAttribution.filter(r => r.converted > 0).sort((a, b) => b.conversionRate - a.conversionRate)[0];
                      const worst = c.journeyAttribution.filter(r => r.leads > 10 && r.converted === 0)[0];
                      let text = '';
                      if (best) text += `הקמפיין "${best.campaign}" ממיר ${fmtPct(best.conversionRate)} מהלידים לרכישות. `;
                      if (worst) text += `"${worst.campaign}" הביא ${worst.leads} לידים בלי רכישה אחת — כדאי לבדוק את מסע המיילים או את איכות הלידים. `;
                      if (!best && !worst) text = 'אין מספיק נתונים להמלצות. ';
                      const totalConverted = c.journeyAttribution.reduce((s, r) => s + r.converted, 0);
                      const totalLeads = c.journeyAttribution.reduce((s, r) => s + r.leads, 0);
                      if (totalLeads > 0) text += `סה"כ ${fmtPct(totalLeads > 0 ? totalConverted / totalLeads * 100 : 0)} מהלידים שהגיעו מקמפיינים רכשו.`;
                      return text;
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ META ADS ═══ */}
        {metaAds.data && (metaAds.data.campaigns.length > 0 || metaAds.data.boosts.length > 0) && (
          <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-50 to-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">ביצועי Meta Ads</h3>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border border-red-100 text-center">
                  <div className="text-[10px] text-gray-500">הוצאה</div>
                  <div className="text-lg font-bold text-red-600">{fmt(metaAds.data.totals.spend)}</div>
                  {t && <TargetProgress current={metaAds.data.totals.spend} target={t.budget} label="" />}
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100 text-center">
                  <div className="text-[10px] text-gray-500">הכנסה</div>
                  <div className="text-lg font-bold text-green-600">{fmt(metaAds.data.totals.revenue)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                  <div className="text-[10px] text-gray-500">ROAS</div>
                  <div className={`text-lg font-bold ${metaAds.data.totals.roas >= 3 ? 'text-green-600' : metaAds.data.totals.roas >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>{metaAds.data.totals.roas}x</div>
                  {b && <Benchmark value={metaAds.data.totals.roas} benchmark={b.metaROAS} label="" unit="x" />}
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-100 text-center">
                  <div className="text-[10px] text-gray-500">CPA</div>
                  <div className="text-lg font-bold text-amber-600">{fmt(metaAds.data.totals.avgCPA)}</div>
                  {b && <Benchmark value={metaAds.data.totals.avgCPA} benchmark={b.metaCPA} label="" unit="₪" />}
                </div>
                <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                  <div className="text-[10px] text-gray-500">CPL</div>
                  <div className="text-lg font-bold text-teal-600">{fmt(metaAds.data.totals.avgCPL)}</div>
                  {b && <Benchmark value={metaAds.data.totals.avgCPL} benchmark={b.metaCPL} label="" unit="₪" />}
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                  <div className="text-[10px] text-gray-500">חשיפות</div>
                  <div className="text-lg font-bold text-gray-700">{metaAds.data.totals.impressions.toLocaleString()}</div>
                </div>
              </div>
              
              {/* Campaigns table */}
              {metaAds.data.campaigns.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">קמפיינים</h4>
                  <div className="overflow-x-auto">
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
                            <td className="py-1.5 text-center"><span className={camp.cpa > 0 && camp.cpa <= 50 ? 'text-green-600 font-bold' : camp.cpa > 100 ? 'text-red-500' : ''}>{camp.cpa > 0 ? fmt(camp.cpa) : '—'}</span></td>
                            <td className="py-1.5 text-center"><span className={camp.roas >= 3 ? 'text-green-600 font-bold' : camp.roas > 0 ? 'text-amber-600' : ''}>{camp.roas > 0 ? camp.roas + 'x' : '—'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Deep AI Insights */}
              <div className="p-3 bg-gradient-to-l from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <Lightbulb size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 space-y-1.5">
                    <p className="font-bold text-sm">תובנות מקצועיות:</p>
                    {metaAds.data.campaigns.filter(camp => camp.roas >= 3 && camp.purchases > 0).length > 0 && (
                      <p>✅ <strong>להגדיל תקציב:</strong> {metaAds.data.campaigns.filter(camp => camp.roas >= 3).map(camp => `"${camp.name.substring(0, 25)}" (ROAS ${camp.roas}x, CPA ${fmt(camp.cpa)})`).join(', ')}. קמפיינים אלו ממירים מעל הממוצע בתעשייה.</p>
                    )}
                    {metaAds.data.campaigns.filter(camp => camp.spend > 100 && camp.purchases === 0 && camp.leads > 20).length > 0 && (
                      <p>⚠️ <strong>בעיית המרה:</strong> {metaAds.data.campaigns.filter(camp => camp.spend > 100 && camp.purchases === 0 && camp.leads > 20).map(camp => `"${camp.name.substring(0, 25)}" (${camp.leads} לידים, 0 רכישות, הוצאה ${fmt(camp.spend)})`).join(', ')}. הלידים נכנסים למסע אבל לא ממירים — כדאי לבדוק את תוכן המסע או את איכות הקהל.</p>
                    )}
                    {metaAds.data.campaigns.filter(camp => camp.cpl > 0 && camp.cpl <= 5).length > 0 && (
                      <p>💡 <strong>עלות ליד מצוינת:</strong> {metaAds.data.campaigns.filter(camp => camp.cpl > 0 && camp.cpl <= 5).map(camp => `"${camp.name.substring(0, 25)}" (CPL ${fmt(camp.cpl)})`).join(', ')}. מתחת לממוצע בתעשייה (₪15). הקריאייטיב והקהל עובדים.</p>
                    )}
                    {metaAds.data.totals.spend > 0 && (
                      <p>📊 <strong>סיכום:</strong> הוצאת {fmt(metaAds.data.totals.spend)} והכנסת {fmt(metaAds.data.totals.revenue)}. רווח נקי: {fmt(metaAds.data.totals.revenue - metaAds.data.totals.spend)}. {metaAds.data.totals.roas >= 3 ? 'ROAS מצוין — מעל ממוצע התעשייה.' : metaAds.data.totals.roas >= 1.5 ? 'ROAS סביר — יש מקום לאופטימיזציה.' : 'ROAS נמוך — צריך לכבות קמפיינים לא ממירים.'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ EMAIL ENGAGEMENT ═══ */}
        {emailEngagement.data && emailEngagement.data.totals.sent > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-amber-500" />
                <h3 className="font-bold text-gray-900">מיילים ומסעות</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">נשלחו</div>
                  <div className="text-xl font-bold text-amber-600">{emailEngagement.data.totals.sent}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">נפתחו</div>
                  <div className="text-xl font-bold text-green-600">{emailEngagement.data.totals.opened}</div>
                  <div className="text-[9px]"><span className={emailEngagement.data.totals.openRate >= (b?.emailOpenRate || 21.5) ? 'text-green-600' : 'text-red-500'}>{emailEngagement.data.totals.openRate}%</span> <span className="text-gray-400">(ממוצע: {b?.emailOpenRate || 21.5}%)</span></div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">קליקים</div>
                  <div className="text-xl font-bold text-blue-600">{emailEngagement.data.totals.clicked}</div>
                  <div className="text-[9px]"><span className={emailEngagement.data.totals.clickRate >= (b?.emailClickRate || 2.3) ? 'text-green-600' : 'text-red-500'}>{emailEngagement.data.totals.clickRate}%</span> <span className="text-gray-400">(ממוצע: {b?.emailClickRate || 2.3}%)</span></div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">Click-to-Open</div>
                  <div className="text-xl font-bold text-purple-600">{emailEngagement.data.totals.clickToOpenRate}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">מסעות</div>
                  <div className="text-xl font-bold text-gray-700">{emailEngagement.data.journeys.length}</div>
                </div>
              </div>
              {emailEngagement.data.journeys.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-[10px] text-gray-500 border-b">
                      <th className="text-right pb-1.5">מסע</th><th className="text-center pb-1.5">נשלחו</th>
                      <th className="text-center pb-1.5">% פתיחה</th><th className="text-center pb-1.5">% קליק</th>
                    </tr></thead>
                    <tbody>
                      {emailEngagement.data.journeys.map((j, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 text-right font-medium">{j.journey}</td>
                          <td className="py-1.5 text-center">{j.sent}</td>
                          <td className="py-1.5 text-center"><span className={j.openRate >= 30 ? 'text-green-600 font-bold' : j.openRate >= 15 ? 'text-amber-600' : 'text-red-500'}>{j.openRate}%</span></td>
                          <td className="py-1.5 text-center"><span className={j.clickRate >= 3 ? 'text-green-600 font-bold' : 'text-gray-600'}>{j.clickRate}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ SOCIAL MEDIA ═══ */}
        {socialInsights.data && (
          <Card className="border-0 shadow-sm bg-gradient-to-l from-pink-50 to-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Instagram size={18} className="text-pink-500" />
                <h3 className="font-bold text-gray-900">סושיאל — @{socialInsights.data.instagram.username}</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 border border-pink-100 text-center">
                  <div className="text-[10px] text-gray-500">עוקבים IG</div>
                  <div className="text-xl font-bold text-pink-600">{socialInsights.data.instagram.followers.toLocaleString()}</div>
                  {socialInsights.data.instagram.followerGrowth !== 0 && <Change value={socialInsights.data.instagram.followerGrowth} suffix="" />}
                </div>
                <div className="bg-white rounded-xl p-3 border border-purple-100 text-center">
                  <div className="text-[10px] text-gray-500">Reach ממוצע/יום</div>
                  <div className="text-xl font-bold text-purple-600">{socialInsights.data.instagram.avgDailyReach.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                  <div className="text-[10px] text-gray-500">Engagement</div>
                  <div className="text-xl font-bold text-blue-600">{socialInsights.data.instagram.engagementRate}%</div>
                  {b && <Benchmark value={socialInsights.data.instagram.engagementRate} benchmark={b.igEngagement} label="" unit="%" />}
                </div>
                <div className="bg-white rounded-xl p-3 border border-green-100 text-center">
                  <div className="text-[10px] text-gray-500">קהילה</div>
                  <div className="text-xl font-bold text-green-600">{socialInsights.data.whatsappGroupSize.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-400">WhatsApp + {socialInsights.data.facebook.fans} FB</div>
                </div>
              </div>
              
              {/* IG Reach chart */}
              {socialInsights.data.instagram.dailyReach.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-[10px] font-bold text-gray-600 mb-1">Reach יומי</h4>
                  <div className="flex items-end gap-[2px] h-16">
                    {socialInsights.data.instagram.dailyReach.map((d: any, i: number) => {
                      const max = Math.max(...socialInsights.data!.instagram.dailyReach.map((x: any) => x.value), 1);
                      return (
                        <div key={i} className="flex-1 min-w-[5px] group relative">
                          <div className="absolute -top-5 bg-gray-800 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{d.value.toLocaleString()}</div>
                          <div className="bg-gradient-to-t from-pink-400 to-pink-200 rounded-t-sm" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '2px' : '0' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Engagement breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-red-50 rounded-lg"><div className="text-sm font-bold text-red-500">{socialInsights.data.instagram.likes}</div><div className="text-[8px] text-gray-500">לייקים</div></div>
                <div className="text-center p-2 bg-blue-50 rounded-lg"><div className="text-sm font-bold text-blue-500">{socialInsights.data.instagram.comments}</div><div className="text-[8px] text-gray-500">תגובות</div></div>
                <div className="text-center p-2 bg-green-50 rounded-lg"><div className="text-sm font-bold text-green-500">{socialInsights.data.instagram.shares}</div><div className="text-[8px] text-gray-500">שיתופים</div></div>
                <div className="text-center p-2 bg-purple-50 rounded-lg"><div className="text-sm font-bold text-purple-500">{socialInsights.data.instagram.saves}</div><div className="text-[8px] text-gray-500">שמירות</div></div>
              </div>
              
              <div className="p-3 bg-pink-50 rounded-lg">
                <div className="text-xs text-pink-800">
                  <span className="font-bold">ניתוח: </span>
                  Engagement {socialInsights.data.instagram.engagementRate}% ({socialInsights.data.instagram.engagementRate >= (b?.igEngagement || 3.5) ? 'מעל' : 'מתחת'} לממוצע {b?.igEngagement || 3.5}% בתעשייה).
                  {socialInsights.data.instagram.saves > socialInsights.data.instagram.shares ? ' שמירות גבוהות מהשיתופים — התוכן ערכי אבל לא ויראלי. נסי Reels קצרים עם hook חזק.' : ' שיתופים גבוהים — התוכן ויראלי, ממשיכים ככה!'}
                  {socialInsights.data.instagram.followerGrowth < 0 ? ` ירידה של ${Math.abs(socialInsights.data.instagram.followerGrowth)} עוקבים — כדאי להגביר תדירות ולבדוק תוכן.` : socialInsights.data.instagram.followerGrowth > 50 ? ` גדילה יפה של +${socialInsights.data.instagram.followerGrowth}!` : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SITE BEHAVIOR FUNNEL ═══ */}
        {siteTraffic.data && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500" />
                <h3 className="font-bold text-gray-900">משפך התנהגות באתר</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">צפיות</div>
                  <div className="text-xl font-bold text-indigo-600">{siteTraffic.data.totalPageViews.toLocaleString()}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">מבקרים</div>
                  <div className="text-xl font-bold text-blue-600">{siteTraffic.data.uniqueVisitors.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">התחלות DNA</div>
                  <div className="text-xl font-bold text-purple-600">{siteTraffic.data.funnel.dnaStarts}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500">רכישות</div>
                  <div className="text-xl font-bold text-green-600">{siteTraffic.data.funnel.purchases}</div>
                </div>
              </div>
              
              {/* Funnel visualization */}
              <div className="flex items-center justify-center gap-1 flex-wrap mb-4">
                {[
                  { label: "ביקור", value: siteTraffic.data.funnel.pageViews, color: "bg-indigo-500" },
                  { label: "DNA", value: siteTraffic.data.funnel.dnaStarts, color: "bg-blue-500" },
                  { label: "השלמה", value: siteTraffic.data.funnel.dnaCompletes, color: "bg-purple-500" },
                  { label: "רכישה", value: siteTraffic.data.funnel.purchases, color: "bg-green-500" },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="text-center">
                      <div className={`${step.color} text-white rounded-lg px-3 py-2 min-w-[55px]`}>
                        <div className="text-base font-bold">{step.value}</div>
                      </div>
                      <div className="text-[8px] text-gray-500 mt-0.5">{step.label}</div>
                    </div>
                    {i < arr.length - 1 && step.value > 0 && (
                      <div className="text-center mx-0.5">
                        <div className="text-xs text-gray-400">→</div>
                        <div className="text-[9px] font-bold text-gray-600">{((arr[i + 1].value / step.value) * 100).toFixed(0)}%</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Top pages + sources */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border border-gray-100 rounded-lg p-3">
                  <h4 className="text-[10px] font-bold text-gray-600 mb-1.5">דפים פופולריים</h4>
                  {siteTraffic.data.topPages.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex justify-between text-[11px] py-0.5"><span className="text-gray-600 truncate max-w-[150px]">{p.page === '/' ? 'דף הבית' : p.page}</span><span className="font-medium text-indigo-600">{p.views}</span></div>
                  ))}
                </div>
                <div className="border border-gray-100 rounded-lg p-3">
                  <h4 className="text-[10px] font-bold text-gray-600 mb-1.5">מקורות תנועה</h4>
                  {siteTraffic.data.trafficSources.slice(0, 6).map((s, i) => (
                    <div key={i} className="flex justify-between text-[11px] py-0.5"><span className="text-gray-600">{s.source === 'direct' ? 'ישיר' : s.source}</span><span className="font-medium text-blue-600">{s.visits}</span></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ RECENT LEADS ═══ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Users size={18} className="text-indigo-500" /><h3 className="font-bold text-gray-900">לידים אחרונים</h3></div>
              <Button variant="outline" size="sm" onClick={() => setShowAllLeads(!showAllLeads)}>{showAllLeads ? "פחות" : "הכל"}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] text-gray-500 border-b">
                  <th className="text-right pb-1.5">שם</th><th className="text-right pb-1.5">מקור</th>
                  <th className="text-right pb-1.5">קמפיין</th><th className="text-center pb-1.5">מיילים</th>
                  <th className="text-center pb-1.5">המרה</th><th className="text-right pb-1.5">תאריך</th>
                </tr></thead>
                <tbody>
                  {recentLeads.isLoading ? (
                    [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6}><Skeleton className="h-6 my-1" /></td></tr>)
                  ) : (
                    (showAllLeads ? recentLeads.data : recentLeads.data?.slice(0, 12))?.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-right"><div className="font-medium text-[11px]">{lead.name}</div><div className="text-[9px] text-gray-400">{lead.email}</div></td>
                        <td className="py-1.5 text-right text-[10px] text-gray-500">{lead.source || lead.utmSource || "—"}</td>
                        <td className="py-1.5 text-right text-[10px] text-gray-500 max-w-[100px] truncate">{lead.utmCampaign || "—"}</td>
                        <td className="py-1.5 text-center text-[10px]">{lead.emailsSent > 0 ? `${lead.emailsOpened}/${lead.emailsSent}` : "—"}</td>
                        <td className="py-1.5 text-center">{lead.converted ? <Badge className="bg-green-100 text-green-700 text-[9px]">{lead.purchasedProduct}</Badge> : <span className="text-[10px] text-gray-400">—</span>}</td>
                        <td className="py-1.5 text-right text-[10px] text-gray-500">{fmtDate(lead.createdAt)}</td>
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
