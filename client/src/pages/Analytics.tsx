import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState } from "react";

const JOURNEY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  women_first_step_v2:       { label: "מסע DNA - נשים", icon: "♀", color: "#e91e8c" },
  men_first_step_v2:         { label: "מסע DNA - גברים", icon: "♂", color: "#1800ad" },
  free_guide_nurture:        { label: "מדריך חינמי", icon: "📖", color: "#f59e0b" },
  sales_call_lead:           { label: "שיחת היכרות", icon: "📞", color: "#10b981" },
  women_first_step:          { label: "מסע DNA - נשים (ישן)", icon: "♀", color: "#d1a0c0" },
  men_first_step:            { label: "מסע DNA - גברים (ישן)", icon: "♂", color: "#9090cc" },
  meta_lead_dna:             { label: "Meta ליד DNA", icon: "📱", color: "#6366f1" },
  women_matchmaking_welcome: { label: "ברוך הבא למאגר - נשים", icon: "💛", color: "#e91e8c" },
  men_matchmaking_welcome:   { label: "ברוך הבא למאגר - גברים", icon: "💛", color: "#1800ad" },
  women_matchmaking:         { label: "מאגר - נשים (ישן)", icon: "♀", color: "#d1a0c0" },
  men_matchmaking:           { label: "מאגר - גברים (ישן)", icon: "♂", color: "#9090cc" },
  women_guide:               { label: "מדריך - נשים", icon: "📘", color: "#0ea5e9" },
  men_guide:                 { label: "מדריך - גברים", icon: "📘", color: "#0369a1" },
  women_course:              { label: "קורס - נשים", icon: "🎓", color: "#7c3aed" },
  men_course:                { label: "קורס - גברים", icon: "🎓", color: "#5b21b6" },
  women_transformation:      { label: "טרנספורמציה - נשים", icon: "✨", color: "#db2777" },
  men_transformation:        { label: "טרנספורמציה - גברים", icon: "✨", color: "#9333ea" },
  abandoned_guide:           { label: "נטישת עגלה - מדריך", icon: "🛒", color: "#ef4444" },
  abandoned_database:        { label: "נטישת עגלה - מאגר", icon: "🛒", color: "#f97316" },
  abandoned_course:          { label: "נטישת עגלה - קורס", icon: "🛒", color: "#eab308" },
  abandoned_coaching:        { label: "נטישת עגלה - ליווי", icon: "🛒", color: "#84cc16" },
  english_guide:             { label: "English Guide", icon: "🇺🇸", color: "#3b82f6" },
};

const SOURCE_LABELS: Record<string, string> = {
  dna_quiz: "שאלון DNA (אתר)",
  meta_lead_guide: "Meta - מדריך חינמי",
  meta_lead_dna: "Meta - DNA",
  meta_lead_call: "Meta - שיחת היכרות",
  direct: "ישיר",
  referral: "הפניה",
  press_article: "כתבה במגזין",
  instagram: "אינסטגרם",
  podcast: "פודקאסט",
  unknown: "לא ידוע",
};

const PERIOD_LABELS: Record<string, string> = {
  week: "שבוע אחרון",
  month: "חודש אחרון",
  quarter: "3 חודשים",
  all: "הכל",
};

function pct(num: number, denom: number): string {
  if (!denom || denom === 0) return "-";
  return Math.round((num / denom) * 100) + "%";
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-right">
      <div className="text-[#727272] text-xs mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color: color ?? "#191265" }}>{value}</div>
      {sub && <div className="text-[#727272] text-xs mt-1">{sub}</div>}
    </div>
  );
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  return (
    <div className="flex gap-1 bg-[#f0eadc] rounded-lg p-1">
      {(["week", "month", "quarter", "all"] as const).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === p ? "bg-[#191265] text-white" : "text-[#727272] hover:text-[#191265]"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function AlertBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-green-100 text-green-700",
    info: "bg-blue-100 text-blue-700",
  };
  const icons: Record<string, string> = { error: "🚨", warning: "⚠️", success: "✅", info: "ℹ️" };
  return <span className={`${styles[type] ?? styles.info} px-2 py-0.5 rounded-full text-xs font-bold`}>{icons[type] ?? "ℹ️"}</span>;
}

export default function Analytics() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"alerts" | "journeys" | "sales" | "whatsapp" | "behavior">("alerts");
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "all">("month");
  const [selectedEmail, setSelectedEmail] = useState<{ journeyKey: string; emailIndex: number } | null>(null);

  // Queries
  const { data: alertsData } = trpc.analytics.alerts.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: journeyData, isLoading: journeyLoading } = (trpc.analytics as any).journeyFunnelFiltered.useQuery(
    { period },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: salesData, isLoading: salesLoading } = (trpc.analytics as any).salesByChannel.useQuery(
    { period },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: waData } = (trpc.analytics as any).waGroupStats.useQuery(
    { period },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: behaviorData } = (trpc.analytics as any).behaviorStats.useQuery(
    { period },
    { enabled: !!user && user.role === "admin" }
  );
  const { data: emailDetailData } = (trpc.analytics as any).emailDetail.useQuery(
    selectedEmail ? { ...selectedEmail, period } : undefined,
    { enabled: !!selectedEmail && !!user && user.role === "admin" }
  );

  if (loading) return null;
  if (!user) { window.location.href = getLoginUrl(); return null; }
  if (user.role !== "admin") return <div className="p-8 text-center text-[#727272]">אין הרשאה</div>;

  const alerts = alertsData ?? [];
  const journeys = (journeyData?.journeys ?? []) as any[];
  const emailIndex = (journeyData?.emailIndex ?? []) as any[];

  // Group emailIndex by journeyKey
  const emailByJourney: Record<string, any[]> = {};
  for (const row of emailIndex) {
    if (!emailByJourney[row.journeyKey]) emailByJourney[row.journeyKey] = [];
    emailByJourney[row.journeyKey].push(row);
  }

  // Summary stats
  const totalSent = journeys.reduce((s: number, j: any) => s + Number(j.totalSent), 0);
  const totalOpened = journeys.reduce((s: number, j: any) => s + Number(j.uniqueOpens), 0);
  const totalClicked = journeys.reduce((s: number, j: any) => s + Number(j.uniqueClicks), 0);
  const totalLeads = journeys.reduce((s: number, j: any) => s + Number(j.totalLeads), 0);
  const totalConverted = journeys.reduce((s: number, j: any) => s + Number(j.convertedToMatchmaking ?? 0), 0);
  const totalPurchases = journeys.reduce((s: number, j: any) => s + Number(j.convertedToPurchase ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">📊 אנליטיקס מתקדם</h1>
          <p className="text-white/60 text-sm">מעקב בזמן אמת - מסעות, מיילים, המרות, התנהגות גולשים</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/crm" className="text-white/70 hover:text-white text-sm border border-white/30 px-3 py-1.5 rounded-lg">
            ← חזרה ל-CRM
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Period Filter + Summary */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <div className="text-xs text-[#727272]">
            מציג נתונים: <strong className="text-[#191265]">{PERIOD_LABELS[period]}</strong>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="מיילים נשלחו" value={totalSent} color="#191265" />
          <StatCard label="% פתיחה" value={totalSent > 0 ? pct(totalOpened, totalSent) : "-"} sub={`${totalOpened} פתחו`} color="#10b981" />
          <StatCard label="% קליקים" value={totalSent > 0 ? pct(totalClicked, totalSent) : "-"} sub={`${totalClicked} לחצו`} color="#0ea5e9" />
          <StatCard label="לידים במסעות" value={totalLeads} color="#6366f1" />
          <StatCard label="המרות למאגר" value={totalConverted} sub={pct(totalConverted, totalLeads)} color="#e91e8c" />
          <StatCard label="רכישות" value={totalPurchases} sub={pct(totalPurchases, totalLeads)} color="#f59e0b" />
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-[#191265] text-sm">🔔 התראות בזמן אמת</h2>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#f8f6f0]">
                  <AlertBadge type={alert.type} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#191265] text-sm">{alert.title}</div>
                    <div className="text-[#727272] text-xs mt-0.5">{alert.message}</div>
                  </div>
                  {alert.action && (
                    <button className="text-xs text-[#191265] font-bold underline whitespace-nowrap">{alert.action}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#d9d3c9] overflow-x-auto">
          {[
            { id: "alerts" as const, label: "📬 מסעות מיילים" },
            { id: "sales" as const, label: "💰 מכירות ומקורות" },
            { id: "whatsapp" as const, label: "💬 וואטסאפ" },
            { id: "behavior" as const, label: "🔥 התנהגות גולשים" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEmail(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-[#191265] border-b-2 border-[#191265]"
                  : "text-[#727272] hover:text-[#191265]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Email Journeys ── */}
        {activeTab === "alerts" && !selectedEmail && (
          <div className="space-y-4">
            {journeyLoading ? (
              <div className="text-center py-10 text-[#727272]">טוען...</div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-10 text-[#727272]">אין נתונים לתקופה זו</div>
            ) : (
              journeys.filter((j: any) => {
                // Hide dormant journeys with 0 activity
                const hasActivity = Number(j.totalSent) > 0 || Number(j.totalLeads) > 0;
                return hasActivity;
              }).map((j: any) => {
                const meta = JOURNEY_LABELS[j.journeyKey] ?? { label: j.journeyKey, icon: "📧", color: "#191265" };
                const sent = Number(j.totalSent);
                const pending = Number(j.totalPending);
                const failed = Number(j.totalFailed);
                const leads = Number(j.totalLeads);
                const opened = Number(j.uniqueOpens);
                const clicked = Number(j.uniqueClicks);
                const converted = Number(j.convertedToMatchmaking ?? 0);
                const purchased = Number(j.convertedToPurchase ?? 0);
                const rows = (emailByJourney[j.journeyKey] ?? []).sort((a: any, b: any) => a.emailIndex - b.emailIndex);
                const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
                const bounceRate = (sent + failed) > 0 ? Math.round((failed / (sent + failed)) * 100) : 0;

                return (
                  <div key={j.journeyKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Journey Header */}
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderRight: `4px solid ${meta.color}` }}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <span className="font-black text-[#191265] text-base">{meta.label}</span>
                        </div>
                        <div className="text-[#727272] text-xs mt-0.5 flex gap-3">
                          <span>{leads} לידים</span>
                          <span>•</span>
                          <span>{sent} נשלחו</span>
                          {pending > 0 && <><span>•</span><span className="text-amber-600">{pending} ממתינים</span></>}
                          {failed > 0 && <><span>•</span><span className="text-red-600">{failed} נכשלו</span></>}
                        </div>
                      </div>
                      <div className="flex gap-4 text-center">
                        <div>
                          <div className="text-lg font-black text-green-600">{openRate}%</div>
                          <div className="text-[#727272] text-[10px]">פתיחה</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-blue-600">{clickRate}%</div>
                          <div className="text-[#727272] text-[10px]">קליק</div>
                        </div>
                        {bounceRate > 0 && (
                          <div>
                            <div className="text-lg font-black text-red-500">{bounceRate}%</div>
                            <div className="text-[#727272] text-[10px]">bounce</div>
                          </div>
                        )}
                        <div>
                          <div className="text-lg font-black text-pink-600">{converted}</div>
                          <div className="text-[#727272] text-[10px]">למאגר</div>
                        </div>
                        {purchased > 0 && (
                          <div>
                            <div className="text-lg font-black text-[#f59e0b]">{purchased}</div>
                            <div className="text-[#727272] text-[10px]">רכשו</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email breakdown table */}
                    {rows.length > 0 && (
                      <div className="px-5 pb-4">
                        <table className="w-full text-sm text-right">
                          <thead>
                            <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                              <th className="pb-2 font-medium text-right">מייל</th>
                              <th className="pb-2 font-medium text-center">נשלחו</th>
                              <th className="pb-2 font-medium text-center">נכשלו</th>
                              <th className="pb-2 font-medium text-center">% פתיחה</th>
                              <th className="pb-2 font-medium text-center">% קליק</th>
                              <th className="pb-2 font-medium text-center">פעולה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row: any) => {
                              const s = Number(row.sent);
                              const f = Number(row.failed ?? 0);
                              const o = Number(row.opened);
                              const c = Number(row.clicked);
                              const emailOpenRate = s > 0 ? Math.round((o / s) * 100) : 0;
                              const emailClickRate = s > 0 ? Math.round((c / s) * 100) : 0;
                              return (
                                <tr key={row.emailIndex} className="border-b border-[#f0eadc] last:border-0 hover:bg-[#f8f6f0]">
                                  <td className="py-2 font-medium text-[#191265]">
                                    <div className="text-sm">{row.subject || `מייל ${row.emailIndex + 1}`}</div>
                                    <div className="text-[10px] text-[#aaa]">מייל {row.emailIndex + 1}</div>
                                  </td>
                                  <td className="py-2 text-center font-bold">{s}</td>
                                  <td className="py-2 text-center text-red-500">{f > 0 ? f : "-"}</td>
                                  <td className="py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      emailOpenRate >= 30 ? 'bg-green-100 text-green-700' :
                                      emailOpenRate >= 15 ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{emailOpenRate}%</span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      emailClickRate >= 5 ? 'bg-green-100 text-green-700' :
                                      emailClickRate >= 2 ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{emailClickRate}%</span>
                                  </td>
                                  <td className="py-2 text-center">
                                    <button
                                      onClick={() => setSelectedEmail({ journeyKey: j.journeyKey, emailIndex: row.emailIndex })}
                                      className="text-xs text-[#191265] font-bold underline hover:text-[#e91e8c]"
                                    >
                                      פרטים →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Email Detail View ── */}
        {activeTab === "alerts" && selectedEmail && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-sm text-[#191265] font-bold hover:underline"
            >
              ← חזרה לכל המסעות
            </button>

            {emailDetailData ? (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-[#191265] text-lg">{emailDetailData.subject || `מייל ${selectedEmail.emailIndex + 1}`}</h2>
                    <p className="text-[#727272] text-xs mt-1">
                      {JOURNEY_LABELS[selectedEmail.journeyKey]?.label ?? selectedEmail.journeyKey} • מייל {selectedEmail.emailIndex + 1}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="נשלחו" value={emailDetailData.stats.sent} color="#191265" />
                  <StatCard label="% פתיחה" value={`${emailDetailData.openRate}%`} sub={`${emailDetailData.stats.opened} פתחו (${emailDetailData.stats.totalOpens} סה״כ)`} color="#10b981" />
                  <StatCard label="% קליק" value={`${emailDetailData.clickRate}%`} sub={`${emailDetailData.stats.clicked} לחצו (${emailDetailData.stats.totalClicks} סה״כ)`} color="#0ea5e9" />
                  <StatCard
                    label="נכשלו / Bounce"
                    value={emailDetailData.stats.failed}
                    sub={emailDetailData.stats.sent > 0 ? `${Math.round(emailDetailData.stats.failed / (emailDetailData.stats.sent + emailDetailData.stats.failed) * 100)}% bounce rate` : ''}
                    color="#ef4444"
                  />
                </div>

                {/* Conversions */}
                {emailDetailData.conversions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-[#191265] text-sm mb-2">🎯 המרות מנמענים של מייל זה</h3>
                    <div className="bg-[#f8f6f0] rounded-xl p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#727272]">נרשמו למאגר:</span>{" "}
                          <strong className="text-pink-600">{emailDetailData.conversions.filter((c: any) => c.singleId).length}</strong>
                        </div>
                        <div>
                          <span className="text-[#727272]">רכשו:</span>{" "}
                          <strong className="text-[#f59e0b]">{emailDetailData.conversions.filter((c: any) => c.paymentRef).length}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recipients table */}
                <h3 className="font-bold text-[#191265] text-sm mb-2">📋 נמענים (50 אחרונים)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="text-[#727272] border-b border-[#f0eadc]">
                        <th className="pb-2 font-medium">שם</th>
                        <th className="pb-2 font-medium">מייל</th>
                        <th className="pb-2 font-medium text-center">סטטוס</th>
                        <th className="pb-2 font-medium text-center">פתיחות</th>
                        <th className="pb-2 font-medium text-center">קליקים</th>
                        <th className="pb-2 font-medium text-center">נשלח</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailDetailData.recipients.map((r: any, i: number) => (
                        <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                          <td className="py-1.5 font-medium text-[#191265]">{r.name || '-'}</td>
                          <td className="py-1.5 text-[#727272]">{r.email}</td>
                          <td className="py-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'sent' ? 'bg-green-100 text-green-700' :
                              r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>{r.status}</span>
                          </td>
                          <td className="py-1.5 text-center">{r.openCount ?? 0}</td>
                          <td className="py-1.5 text-center">{r.clickCount ?? 0}</td>
                          <td className="py-1.5 text-center text-[#aaa]">
                            {r.sentAt ? new Date(r.sentAt).toLocaleDateString('he-IL') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-[#727272]">טוען פרטי מייל...</div>
            )}
          </div>
        )}

        {/* ── Tab: Sales & Sources ── */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            {salesLoading ? (
              <div className="text-center py-10 text-[#727272]">טוען...</div>
            ) : !salesData || salesData.length === 0 ? (
              <div className="text-center py-10 text-[#727272]">
                <div className="text-4xl mb-2">📊</div>
                <p>אין נתוני מכירות לתקופה זו</p>
              </div>
            ) : (() => {
              const PRODUCT_LABELS: Record<string, string> = {
                'מאגר': '💛 מאגר שידוכים',
                'database': '💛 מאגר שידוכים',
                'session': '🗓️ פגישת ייעוץ',
                'coaching': '🎯 קואצ׳ינג',
                'coaching_mas': '🎯 קואצ׳ינג מס׳',
                'course': '📚 קורס',
                'guide': '📖 מדריך',
              };
              const SOURCE_ICONS: Record<string, string> = {
                'facebook': '📘 פייסבוק',
                'instagram': '📸 אינסטגרם',
                'google': '🔍 גוגל',
                'tiktok': '🎵 טיקטוק',
                'organic': '🌱 אורגני',
                'direct': '🔗 ישיר',
                'email': '📧 מייל',
                'whatsapp': '💬 וואטסאפ',
                'meta': '📱 Meta',
              };
              // Group by product
              type SalesRow = { product: string; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; count: number };
              const byProduct: Record<string, SalesRow[]> = {};
              for (const row of salesData) {
                if (!byProduct[row.product]) byProduct[row.product] = [];
                byProduct[row.product].push(row);
              }
              const totalSalesCount = (salesData as any[]).reduce((s: number, r: any) => s + r.count, 0);
              return (
                <>
                  <div className="bg-[#191265] rounded-2xl p-5 text-white">
                    <h2 className="font-black text-xl mb-1">💰 מכירות לפי מקור ({PERIOD_LABELS[period]})</h2>
                    <p className="text-white/70 text-sm">סה״כ {totalSalesCount} רכישות</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      {Object.entries(byProduct).map(([prod, rows]) => {
                        const total = rows.reduce((s, r) => s + r.count, 0);
                        return (
                          <div key={prod} className="bg-white/10 rounded-xl p-3 text-center">
                            <div className="text-2xl font-black">{total}</div>
                            <div className="text-white/80 text-xs mt-1">{PRODUCT_LABELS[prod] ?? prod}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {Object.entries(byProduct).map(([prod, rows]) => {
                    const prodTotal = rows.reduce((s, r) => s + r.count, 0);
                    return (
                      <div key={prod} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#f0eadc] flex items-center justify-between">
                          <h3 className="font-black text-[#191265]">{PRODUCT_LABELS[prod] ?? prod}</h3>
                          <span className="text-xl font-black text-[#191265]">{prodTotal}</span>
                        </div>
                        <div className="px-5 py-4">
                          <table className="w-full text-sm text-right">
                            <thead>
                              <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                                <th className="pb-2 font-medium">מקור (UTM)</th>
                                <th className="pb-2 font-medium text-center">קמפיין</th>
                                <th className="pb-2 font-medium text-center">רכישות</th>
                                <th className="pb-2 font-medium text-center">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.sort((a, b) => b.count - a.count).map((row, i) => (
                                <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                                  <td className="py-2 font-medium text-[#191265]">
                                    {SOURCE_ICONS[row.utmSource ?? ''] ?? row.utmSource ?? '🔗 ישיר'}
                                    {row.utmMedium && <span className="text-[#727272] text-xs mr-1">/ {row.utmMedium}</span>}
                                  </td>
                                  <td className="py-2 text-center text-xs text-[#727272]">{row.utmCampaign ?? '-'}</td>
                                  <td className="py-2 text-center font-black text-[#191265]">{row.count}</td>
                                  <td className="py-2 text-center font-bold text-pink-600">{pct(row.count, prodTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* ── Tab: WhatsApp ── */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-[#191265] text-lg">💬 הצטרפות לקבוצת וואטסאפ</h2>
                <div className="text-2xl font-black text-green-600">{waData?.total ?? 0}</div>
              </div>

              {waData?.bySource && waData.bySource.length > 0 ? (
                <>
                  <h3 className="font-bold text-[#191265] text-sm mb-3">מאיפה הגיעו?</h3>
                  <div className="space-y-2">
                    {waData.bySource.map((row: any, i: number) => {
                      const maxCount = waData.bySource[0]?.count ?? 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-28 text-right text-sm font-medium text-[#191265] truncate">
                            {SOURCE_LABELS[row.source] ?? row.source ?? 'ישיר'}
                          </div>
                          <div className="flex-1 bg-[#f0eadc] rounded-full h-6 relative overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all"
                              style={{ width: `${Math.round((row.count / maxCount) * 100)}%` }}
                            />
                          </div>
                          <div className="w-12 text-left text-sm font-bold text-[#191265]">{row.count}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Daily trend */}
                  {waData.daily && waData.daily.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-bold text-[#191265] text-sm mb-3">מגמה יומית</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right">
                          <thead>
                            <tr className="text-[#727272] border-b border-[#f0eadc]">
                              <th className="pb-2 font-medium">תאריך</th>
                              <th className="pb-2 font-medium text-center">מקור</th>
                              <th className="pb-2 font-medium text-center">הצטרפויות</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waData.daily.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                                <td className="py-1.5 font-medium text-[#191265]">{row.day}</td>
                                <td className="py-1.5 text-center text-[#727272]">{SOURCE_LABELS[row.source] ?? row.source}</td>
                                <td className="py-1.5 text-center font-bold text-green-600">{row.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-[#727272]">אין נתוני הצטרפות לתקופה זו</div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Behavior (Hotjar-style) ── */}
        {activeTab === "behavior" && (
          <div className="space-y-4">
            {/* Page Views */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-black text-[#191265] text-lg mb-4">👁 צפיות בדפים</h2>
              {behaviorData?.pageViews && behaviorData.pageViews.length > 0 ? (
                <div className="space-y-2">
                  {behaviorData.pageViews.map((row: any, i: number) => {
                    const maxViews = behaviorData.pageViews[0]?.views ?? 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-32 text-right text-xs font-medium text-[#191265] truncate" title={row.page}>
                          {row.page || '/'}
                        </div>
                        <div className="flex-1 bg-[#f0eadc] rounded-full h-5 relative overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#191265] transition-all"
                            style={{ width: `${Math.round((row.views / maxViews) * 100)}%` }}
                          />
                        </div>
                        <div className="w-12 text-left text-xs font-bold text-[#191265]">{row.views}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-[#727272] text-sm">אין נתונים</div>
              )}
            </div>

            {/* CTA Clicks */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-black text-[#191265] text-lg mb-4">🖱 לחיצות על CTA</h2>
              {behaviorData?.ctaClicks && behaviorData.ctaClicks.length > 0 ? (
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                      <th className="pb-2 font-medium">דף</th>
                      <th className="pb-2 font-medium text-center">סוג CTA</th>
                      <th className="pb-2 font-medium text-center">לחיצות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorData.ctaClicks.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                        <td className="py-2 font-medium text-[#191265] text-xs">{row.page || '/'}</td>
                        <td className="py-2 text-center text-xs">
                          <span className="bg-[#f0eadc] px-2 py-0.5 rounded-full">{row.eventType.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-2 text-center font-bold text-[#191265]">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-[#727272] text-sm">אין נתונים</div>
              )}
            </div>

            {/* Button Clicks */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-black text-[#191265] text-lg mb-4">🔘 לחיצות על כפתורים</h2>
              {behaviorData?.buttonClicks && behaviorData.buttonClicks.length > 0 ? (
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                      <th className="pb-2 font-medium">דף</th>
                      <th className="pb-2 font-medium text-center">כפתור</th>
                      <th className="pb-2 font-medium text-center">לחיצות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorData.buttonClicks.slice(0, 15).map((row: any, i: number) => {
                      let btnLabel = row.metadata;
                      try { const m = JSON.parse(row.metadata); btnLabel = m.label || m.text || m.id || row.metadata; } catch {}
                      return (
                        <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                          <td className="py-2 font-medium text-[#191265] text-xs">{row.page || '/'}</td>
                          <td className="py-2 text-center text-xs text-[#727272]">{btnLabel || '-'}</td>
                          <td className="py-2 text-center font-bold text-[#191265]">{row.clicks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-[#727272] text-sm">אין נתונים</div>
              )}
            </div>

            {/* Form Conversion */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-black text-[#191265] text-lg mb-4">📝 המרות טפסים</h2>
              {behaviorData?.formConversion && behaviorData.formConversion.length > 0 ? (() => {
                // Group by page
                const byPage: Record<string, { starts: number; submits: number }> = {};
                for (const row of behaviorData.formConversion) {
                  if (!byPage[row.page]) byPage[row.page] = { starts: 0, submits: 0 };
                  if (row.eventType === 'form_start') byPage[row.page].starts += row.count;
                  if (row.eventType === 'form_submit') byPage[row.page].submits += row.count;
                }
                return (
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                        <th className="pb-2 font-medium">דף</th>
                        <th className="pb-2 font-medium text-center">התחילו טופס</th>
                        <th className="pb-2 font-medium text-center">שלחו</th>
                        <th className="pb-2 font-medium text-center">% המרה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byPage).map(([page, data], i) => (
                        <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                          <td className="py-2 font-medium text-[#191265] text-xs">{page || '/'}</td>
                          <td className="py-2 text-center">{data.starts}</td>
                          <td className="py-2 text-center font-bold text-green-600">{data.submits}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              data.starts > 0 && Math.round(data.submits / data.starts * 100) >= 50
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {data.starts > 0 ? Math.round(data.submits / data.starts * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })() : (
                <div className="text-center py-4 text-[#727272] text-sm">אין נתונים</div>
              )}
            </div>

            {/* Scroll Depth */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-black text-[#191265] text-lg mb-4">📏 עומק גלילה</h2>
              {behaviorData?.scrollDepth && behaviorData.scrollDepth.length > 0 ? (() => {
                const byPage: Record<string, Record<string, number>> = {};
                for (const row of behaviorData.scrollDepth) {
                  if (!byPage[row.page]) byPage[row.page] = {};
                  let depth = row.metadata;
                  try { const m = JSON.parse(row.metadata); depth = m.depth || m.percent || row.metadata; } catch {}
                  byPage[row.page][depth] = (byPage[row.page][depth] ?? 0) + row.count;
                }
                return (
                  <div className="space-y-4">
                    {Object.entries(byPage).slice(0, 5).map(([page, depths]) => (
                      <div key={page}>
                        <div className="text-xs font-bold text-[#191265] mb-1">{page || '/'}</div>
                        <div className="flex gap-1">
                          {Object.entries(depths).sort().map(([depth, count]) => (
                            <div key={depth} className="text-center">
                              <div className="text-[10px] text-[#727272]">{depth}</div>
                              <div className="text-xs font-bold text-[#191265]">{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="text-center py-4 text-[#727272] text-sm">אין נתונים - יש להוסיף מעקב scroll_depth בדפים</div>
              )}
            </div>

            {/* Info box about behavior tracking */}
            <div className="bg-[#191265] text-white rounded-2xl p-5">
              <h3 className="font-black text-[#ffe27c] mb-3">💡 מעקב התנהגות גולשים</h3>
              <div className="space-y-2 text-sm text-white/80">
                <p>• <strong className="text-white">לחיצות על כפתורים</strong> - מזהה אילו כפתורים עובדים ואילו לא</p>
                <p>• <strong className="text-white">המרות טפסים</strong> - כמה מתחילים טופס לעומת כמה מסיימים</p>
                <p>• <strong className="text-white">עומק גלילה</strong> - עד איפה אנשים גוללים בכל דף</p>
                <p>• <strong className="text-white">CTA clicks</strong> - אילו קריאות לפעולה מושכות הכי הרבה תשומת לב</p>
                <p className="mt-3 text-[#ffe27c]">💡 טיפ: אם אחוז ההמרה בטופס נמוך, שקלי לקצר אותו או לשנות את הכותרת</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
