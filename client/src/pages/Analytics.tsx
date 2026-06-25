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
};

const MATCHMAKING_EMAIL_NAMES: Record<number, string> = {
  0: "מייל 1 - ברוך הבא (מיד)",
  1: "מייל 2 - מה לעשות בינתיים (יום 3)",
  2: "מייל 3 - סיפור הצלחה (שבוע)",
  3: "מייל 4 - עדכון מהמאגר (שבועיים)",
};

const DNA_TYPE_LABELS: Record<string, string> = {
  leader: "מנהיג/ה",
  romantic: "רומנטי/ת",
  free_spirit: "רוח חופשית",
  anchor: "עוגן",
};

const MARITAL_LABELS: Record<string, string> = {
  single: "רווק/ה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
};

const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני/ת",
  traditional: "מסורתי/ת",
  religious: "דתי/ה",
  orthodox: "חרדי/ת",
};

function BarChart({ data, colorFn }: { data: { label: string; value: number; total: number }[]; colorFn?: (i: number) => string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className="w-24 text-right text-[#191265] font-medium truncate">{d.label}</div>
          <div className="flex-1 bg-[#f0eadc] rounded-full h-5 relative overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round((d.value / max) * 100)}%`,
                backgroundColor: colorFn ? colorFn(i) : "#191265",
              }}
            />
          </div>
          <div className="w-16 text-left text-[#727272] text-xs">
            {d.value} <span className="text-[#aaa]">({pct(d.value, d.total)})</span>
          </div>
        </div>
      ))}
    </div>
  );
}

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

const EMAIL_NAMES: Record<number, string> = {
  0: "מייל 1 - ברוכים הבאים",
  1: "מייל 2 - יום 1",
  2: "מייל 3 - יום 4",
  3: "מייל 4 - יום 7",
  4: "מייל 5 - יום 10",
  5: "מייל 6 - יום 14",
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

export default function Analytics() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"matchmaking" | "journeys" | "sources" | "nojourney" | "quiz" | "sales">("matchmaking");

  const { data: funnelData, isLoading: funnelLoading } = trpc.analytics.journeyFunnel.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: statsData, isLoading: statsLoading } = trpc.analytics.getStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: quizData, isLoading: quizLoading } = trpc.analytics.quizFunnel.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: matchData, isLoading: matchLoading } = trpc.analytics.matchmakingFunnel.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: salesData, isLoading: salesLoading } = (trpc.analytics as any).salesByChannel.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  if (loading) return null;
  if (!user) { window.location.href = getLoginUrl(); return null; }
  if (user.role !== "admin") return <div className="p-8 text-center text-[#727272]">אין הרשאה</div>;

  const isLoading = funnelLoading || statsLoading || quizLoading || matchLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl">
        <div className="text-[#191265] text-lg">טוען נתונים...</div>
      </div>
    );
  }

  const journeys = (funnelData?.journeys ?? []) as any[];
  const emailIndex = (funnelData?.emailIndex ?? []) as any[];
  const noJourney = (funnelData?.noJourney ?? []) as any[];
  const sources = (funnelData?.sources ?? []) as any[];

  // Matchmaking data
  const md = matchData;
  const genderBreakdown = (md?.genderBreakdown ?? []) as any[];
  const ageDistribution = (md?.ageDistribution ?? []) as any[];
  const cityDistribution = (md?.cityDistribution ?? []) as any[];
  const maritalStatus = (md?.maritalStatus ?? []) as any[];
  const religiosity = (md?.religiosity ?? []) as any[];
  const dnaTypes = (md?.dnaTypes ?? []) as any[];
  const welcomeJourney = (md?.welcomeJourney ?? []) as any[];
  const registrationTrend = (md?.registrationTrend ?? []) as any[];
  const welcomeByJourney: Record<string, any[]> = {};
  for (const row of welcomeJourney) {
    if (!welcomeByJourney[row.journeyKey]) welcomeByJourney[row.journeyKey] = [];
    welcomeByJourney[row.journeyKey].push(row);
  }
  const totalInDb = md?.total ?? 0;
  const COLORS = ["#e91e8c", "#1800ad", "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#f97316", "#84cc16", "#0ea5e9", "#7c3aed"];

  // Total summary
  const totalLeads = sources.reduce((s: number, r: any) => s + Number(r.cnt), 0);
  const totalWithJourney = sources.reduce((s: number, r: any) => s + Number(r.withJourney), 0);
  const totalInMatchmaking = sources.reduce((s: number, r: any) => s + Number(r.inMatchmaking), 0);
  const totalSent = journeys.reduce((s: number, j: any) => s + Number(j.totalSent), 0);
  const totalOpened = journeys.reduce((s: number, j: any) => s + Number(j.uniqueOpens), 0);
  const totalClicked = journeys.reduce((s: number, j: any) => s + Number(j.uniqueClicks), 0);

  // Group emailIndex by journeyKey
  const emailByJourney: Record<string, any[]> = {};
  for (const row of emailIndex) {
    if (!emailByJourney[row.journeyKey]) emailByJourney[row.journeyKey] = [];
    emailByJourney[row.journeyKey].push(row);
  }

  // Source summary
  const sourceMap: Record<string, { total: number; withJourney: number; inMatchmaking: number }> = {};
  for (const row of sources) {
    const src = row.source ?? "unknown";
    if (!sourceMap[src]) sourceMap[src] = { total: 0, withJourney: 0, inMatchmaking: 0 };
    sourceMap[src].total += Number(row.cnt);
    sourceMap[src].withJourney += Number(row.withJourney);
    sourceMap[src].inMatchmaking += Number(row.inMatchmaking);
  }

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">📊 אנליטיקס מסעות</h1>
          <p className="text-white/60 text-sm">מעקב מלא - לידים, מיילים, פתיחות, המרות</p>
        </div>
        <Link href="/crm" className="text-white/70 hover:text-white text-sm border border-white/30 px-3 py-1.5 rounded-lg">
          ← חזרה ל-CRM
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="סה״כ לידים" value={totalLeads} color="#191265" />
          <StatCard label="קיבלו מיילים" value={totalWithJourney} sub={pct(totalWithJourney, totalLeads) + " מהלידים"} color="#1800ad" />
          <StatCard label="נרשמו למאגר" value={totalInMatchmaking} sub={pct(totalInMatchmaking, totalLeads) + " המרה"} color="#e91e8c" />
          <StatCard label="מיילים נשלחו" value={totalSent} sub={`${totalOpened} פתחו | ${totalClicked} לחצו`} color="#f59e0b" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-[#d9d3c9] overflow-x-auto">
          {[
            { id: "matchmaking" as const, label: "💛 מאגר רווקים" },
            { id: "quiz" as const, label: "🔬 פאנל שאלון" },
            { id: "journeys" as const, label: "📬 מסעות מיילים" },
            { id: "sources" as const, label: "📥 מקורות לידים" },
            { id: "nojourney" as const, label: `⚠️ ללא מסע (${noJourney.length})` },
            { id: "sales" as const, label: "💰 מכירות" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* ── Tab: Matchmaking Database ── */}
        {activeTab === "matchmaking" && (
          <div className="space-y-5">
            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="סה״כ במאגר" value={md?.total ?? 0} color="#191265" />
              <StatCard label="פעילים" value={md?.active ?? 0} sub={pct(md?.active ?? 0, md?.total ?? 0)} color="#10b981" />
              <StatCard label="שילמו" value={md?.paid ?? 0} sub={pct(md?.paid ?? 0, md?.total ?? 0)} color="#e91e8c" />
              <StatCard label="השלימו שאלון" value={md?.questionnaireCompleted ?? 0} sub={pct(md?.questionnaireCompleted ?? 0, md?.total ?? 0)} color="#6366f1" />
              <StatCard label="עם תמונה" value={md?.hasPhoto ?? 0} sub={pct(md?.hasPhoto ?? 0, md?.total ?? 0)} color="#f59e0b" />
            </div>

            {/* Matches stats */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-black text-[#191265] mb-4">💞 סטטיסטיקות התאמות</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><div className="text-3xl font-black text-[#191265]">{md?.matches?.total ?? 0}</div><div className="text-[#727272] text-xs mt-1">סה״כ הצעות</div></div>
                <div><div className="text-3xl font-black text-amber-500">{md?.matches?.proposed ?? 0}</div><div className="text-[#727272] text-xs mt-1">ממתינות לאישור</div></div>
                <div><div className="text-3xl font-black text-green-600">{md?.matches?.bothApproved ?? 0}</div><div className="text-[#727272] text-xs mt-1">אושרו משני הצדדים</div></div>
                <div><div className="text-3xl font-black text-[#e91e8c]">{md?.matches?.matched ?? 0}</div><div className="text-[#727272] text-xs mt-1">הותאמו בהצלחה</div></div>
              </div>
            </div>

            {/* Welcome journey stats */}
            {(welcomeByJourney['women_matchmaking_welcome']?.length > 0 || welcomeByJourney['men_matchmaking_welcome']?.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f0eadc]">
                  <h3 className="font-black text-[#191265]">💌 מסע ברוך הבא למאגר</h3>
                  <p className="text-[#727272] text-xs mt-1">4 מיילים לרוכשים חדשים - מעקב פתיחות וקליקים</p>
                </div>
                {['women_matchmaking_welcome', 'men_matchmaking_welcome'].map(jk => {
                  const rows = (welcomeByJourney[jk] ?? []).sort((a: any, b: any) => a.emailIndex - b.emailIndex);
                  if (!rows.length) return null;
                  const meta = JOURNEY_LABELS[jk];
                  const totalEnrolled = rows[0] ? Number(rows[0].enrolled) : 0;
                  return (
                    <div key={jk} className="px-5 py-4 border-b border-[#f0eadc] last:border-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{meta?.icon}</span>
                        <span className="font-bold text-[#191265]">{meta?.label}</span>
                        <span className="bg-[#f0eadc] text-[#727272] text-xs px-2 py-0.5 rounded-full">{totalEnrolled} נרשמו</span>
                      </div>
                      <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                            <th className="pb-2 font-medium">מייל</th>
                            <th className="pb-2 font-medium text-center">נשלחו</th>
                            <th className="pb-2 font-medium text-center">ממתינים</th>
                            <th className="pb-2 font-medium text-center">פתחו</th>
                            <th className="pb-2 font-medium text-center">% פתיחה</th>
                            <th className="pb-2 font-medium text-center">לחצו</th>
                            <th className="pb-2 font-medium text-center">% קליק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any) => {
                            const s = Number(row.sent);
                            const p = Number(row.pending);
                            const o = Number(row.opened);
                            const c = Number(row.clicked);
                            return (
                              <tr key={row.emailIndex} className="border-b border-[#f0eadc] last:border-0">
                                <td className="py-2 font-medium text-[#191265]">{MATCHMAKING_EMAIL_NAMES[row.emailIndex] ?? `מייל ${row.emailIndex + 1}`}</td>
                                <td className="py-2 text-center font-bold">{s}</td>
                                <td className="py-2 text-center text-amber-600">{p > 0 ? p : "-"}</td>
                                <td className="py-2 text-center">{o > 0 ? o : "-"}</td>
                                <td className="py-2 text-center font-bold text-green-600">{pct(o, s)}</td>
                                <td className="py-2 text-center">{c > 0 ? c : "-"}</td>
                                <td className="py-2 text-center font-bold text-blue-600">{pct(c, s)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gender breakdown + DNA types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">👥 פילוח מגדרי</h3>
                <div className="space-y-3">
                  {genderBreakdown.map((row: any) => (
                    <div key={row.gender} className="border-b border-[#f0eadc] pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#191265]">{row.gender === 'female' ? '♀ נשים' : '♂ גברים'}</span>
                        <span className="text-2xl font-black" style={{ color: row.gender === 'female' ? '#e91e8c' : '#1800ad' }}>{Number(row.cnt)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div><div className="font-bold text-[#e91e8c]">{Number(row.paid)}</div><div className="text-[#727272]">שילמו ({pct(Number(row.paid), Number(row.cnt))})</div></div>
                        <div><div className="font-bold text-[#6366f1]">{Number(row.questionnaire)}</div><div className="text-[#727272]">שאלון ({pct(Number(row.questionnaire), Number(row.cnt))})</div></div>
                        <div><div className="font-bold text-[#f59e0b]">{Number(row.photo)}</div><div className="text-[#727272]">תמונה ({pct(Number(row.photo), Number(row.cnt))})</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">🧬 סוגי DNA</h3>
                <BarChart data={dnaTypes.map((r: any) => ({ label: DNA_TYPE_LABELS[r.dnaType] ?? r.dnaType, value: Number(r.cnt), total: totalInDb }))} colorFn={i => COLORS[i % COLORS.length]} />
              </div>
            </div>

            {/* Age + City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">📅 פילוח גיל</h3>
                <BarChart data={ageDistribution.map((r: any) => ({ label: r.ageGroup, value: Number(r.cnt), total: totalInDb }))} colorFn={i => COLORS[i % COLORS.length]} />
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">📍 ערים (Top 10)</h3>
                <BarChart data={cityDistribution.map((r: any) => ({ label: r.city, value: Number(r.cnt), total: totalInDb }))} colorFn={i => COLORS[i % COLORS.length]} />
              </div>
            </div>

            {/* Marital + Religiosity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">💍 סטטוס משפחתי</h3>
                <BarChart data={maritalStatus.map((r: any) => ({ label: MARITAL_LABELS[r.maritalStatus] ?? r.maritalStatus ?? "לא ידוע", value: Number(r.cnt), total: totalInDb }))} colorFn={i => COLORS[i % COLORS.length]} />
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">✡️ רמת דתיות</h3>
                <BarChart data={religiosity.map((r: any) => ({ label: RELIGIOSITY_LABELS[r.religiosity] ?? r.religiosity ?? "לא ידוע", value: Number(r.cnt), total: totalInDb }))} colorFn={i => COLORS[i % COLORS.length]} />
              </div>
            </div>

            {/* Registration trend */}
            {registrationTrend.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-black text-[#191265] mb-4">📈 הרשמות - 30 ימים אחרונים</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                        <th className="pb-2 font-medium">תאריך</th>
                        <th className="pb-2 font-medium text-center">הרשמות</th>
                        <th className="pb-2 font-medium text-center">גרף</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxCnt = Math.max(...registrationTrend.map((r: any) => Number(r.cnt)), 1);
                        return registrationTrend.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                            <td className="py-2 font-medium text-[#191265]">{row.day}</td>
                            <td className="py-2 text-center font-bold text-[#e91e8c]">{Number(row.cnt)}</td>
                            <td className="py-2">
                              <div className="bg-[#f0eadc] rounded-full h-3 w-full">
                                <div className="h-full rounded-full bg-[#e91e8c]" style={{ width: `${Math.round((Number(row.cnt) / maxCnt) * 100)}%` }} />
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Quiz Funnel ── */}
        {activeTab === "quiz" && (() => {
          const q = quizData;
          if (!q) return <div className="text-center py-10 text-[#727272]">אין נתונים</div>;
          const steps = [
            { label: "הגיעו לדף השאלון", value: q.quizStarts, color: "#191265", icon: "👁" },
            { label: "השלימו את השאלון", value: q.quizCompletes, color: "#1800ad", icon: "✅" },
            { label: "השאירו פרטים (ליד)", value: q.becameLeads, color: "#6366f1", icon: "📋" },
            { label: "נכנסו למסע מיילים", value: q.inJourney, color: "#f59e0b", icon: "📬" },
            { label: "נרשמו למאגר", value: q.inMatchmaking, color: "#e91e8c", icon: "💛" },
          ];
          const maxVal = steps[0].value || 1;
          return (
            <div className="space-y-4">
              {/* Funnel bars */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-black text-[#191265] text-lg mb-5">פאנל שאלון DNA - מהקמפיין עד המאגר</h2>
                <div className="space-y-3">
                  {steps.map((step, i) => {
                    const pctOfTop = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0;
                    const pctOfPrev = i > 0 && steps[i-1].value > 0 ? Math.round((step.value / steps[i-1].value) * 100) : null;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{step.icon}</span>
                            <span className="font-semibold text-[#191265] text-sm">{step.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {pctOfPrev !== null && (
                              <span className="text-xs text-[#727272]">↓ {pctOfPrev}% מהשלב הקודם</span>
                            )}
                            <span className="font-black text-[#191265] text-lg">{step.value.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-8 bg-[#f0eadc] rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center pr-3 transition-all"
                            style={{ width: `${pctOfTop}%`, backgroundColor: step.color, minWidth: step.value > 0 ? '2rem' : '0' }}
                          >
                            <span className="text-white text-xs font-bold">{pctOfTop}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 pt-4 border-t border-[#f0eadc] grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-[#727272]">% השלמת שאלון</div>
                    <div className="font-black text-[#191265] text-xl">{q.quizStarts > 0 ? Math.round(q.quizCompletes/q.quizStarts*100) : 0}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#727272]">% השארת פרטים</div>
                    <div className="font-black text-[#191265] text-xl">{q.quizCompletes > 0 ? Math.round(q.becameLeads/q.quizCompletes*100) : 0}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#727272]">% המרה למאגר</div>
                    <div className="font-black text-pink-600 text-xl">{q.becameLeads > 0 ? Math.round(q.inMatchmaking/q.becameLeads*100) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* Daily chart */}
              {q.daily && q.daily.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-black text-[#191265] mb-4">פעילות יומית - 14 ימים אחרונים</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                          <th className="pb-2 font-medium">תאריך</th>
                          <th className="pb-2 font-medium text-center">התחילו שאלון</th>
                          <th className="pb-2 font-medium text-center">השלימו</th>
                          <th className="pb-2 font-medium text-center">לידים חדשים</th>
                          <th className="pb-2 font-medium text-center">% השלמה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.daily.map((row: any, i: number) => {
                          const starts = Number(row.starts);
                          const completes = Number(row.completes);
                          const leadsRow = q.dailyLeads?.find((l: any) => l.day === row.day);
                          const leadsCount = leadsRow ? Number(leadsRow.leads) : 0;
                          return (
                            <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                              <td className="py-2 font-medium text-[#191265]">{row.day}</td>
                              <td className="py-2 text-center">{starts}</td>
                              <td className="py-2 text-center">{completes}</td>
                              <td className="py-2 text-center text-[#6366f1] font-bold">{leadsCount}</td>
                              <td className="py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  starts > 0 && Math.round(completes/starts*100) >= 50
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {starts > 0 ? Math.round(completes/starts*100) : 0}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Insight box */}
              <div className="bg-[#191265] text-white rounded-2xl p-5">
                <h3 className="font-black text-[#ffe27c] mb-3">💡 מה המספרים אומרים</h3>
                <div className="space-y-2 text-sm text-white/80">
                  <p>• <strong className="text-white">{q.quizStarts} אנשים</strong> לחצו על הקמפיין והגיעו לשאלון</p>
                  <p>• <strong className="text-white">{q.quizCompletes > 0 ? Math.round(q.quizCompletes/q.quizStarts*100) : 0}%</strong> מהם השלימו את השאלון עד הסוף</p>
                  <p>• <strong className="text-white">{q.becameLeads > 0 ? Math.round(q.becameLeads/q.quizCompletes*100) : 0}%</strong> מהמשלימים השאירו פרטים ונכנסו למערכת</p>
                  <p>• <strong className="text-[#ffe27c]">{q.inMatchmaking} אנשים</strong> הגיעו עד שלב הרישום למאגר - {q.becameLeads > 0 ? Math.round(q.inMatchmaking/q.becameLeads*100) : 0}% המרה סופית</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Tab: Journeys ── */}
        {activeTab === "journeys" && (
          <div className="space-y-4">
            {journeys.map((j: any) => {
              const meta = JOURNEY_LABELS[j.journeyKey] ?? { label: j.journeyKey, icon: "📧", color: "#191265" };
              const sent = Number(j.totalSent);
              const pending = Number(j.totalPending);
              const failed = Number(j.totalFailed);
              const leads = Number(j.totalLeads);
              const opened = Number(j.uniqueOpens);
              const clicked = Number(j.uniqueClicks);
              const converted = Number(j.convertedToMatchmaking);
              const rows = (emailByJourney[j.journeyKey] ?? []).sort((a: any, b: any) => a.emailIndex - b.emailIndex);

              return (
                <div key={j.journeyKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Journey Header */}
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderRight: `4px solid ${meta.color}` }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meta.icon}</span>
                        <span className="font-black text-[#191265] text-base">{meta.label}</span>
                      </div>
                      <div className="text-[#727272] text-xs mt-0.5">{j.journeyKey}</div>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className="text-xl font-black text-[#191265]">{leads}</div>
                        <div className="text-[#727272] text-xs">לידים</div>
                      </div>
                      <div>
                        <div className="text-xl font-black" style={{ color: meta.color }}>{sent}</div>
                        <div className="text-[#727272] text-xs">נשלחו</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-amber-500">{pending}</div>
                        <div className="text-[#727272] text-xs">ממתינים</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-green-600">{pct(opened, sent)}</div>
                        <div className="text-[#727272] text-xs">פתיחות</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-blue-600">{pct(clicked, sent)}</div>
                        <div className="text-[#727272] text-xs">קליקים</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-pink-600">{converted}</div>
                        <div className="text-[#727272] text-xs">למאגר</div>
                      </div>
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
                            <th className="pb-2 font-medium text-center">ממתינים</th>
                            <th className="pb-2 font-medium text-center">פתחו</th>
                            <th className="pb-2 font-medium text-center">% פתיחה</th>
                            <th className="pb-2 font-medium text-center">לחצו</th>
                            <th className="pb-2 font-medium text-center">% קליק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any) => {
                            const s = Number(row.sent);
                            const p = Number(row.pending);
                            const o = Number(row.opened);
                            const c = Number(row.clicked);
                            return (
                              <tr key={row.emailIndex} className="border-b border-[#f0eadc] last:border-0">
                                <td className="py-2 font-medium text-[#191265]">
                                  {EMAIL_NAMES[row.emailIndex] ?? `מייל ${row.emailIndex + 1}`}
                                </td>
                                <td className="py-2 text-center font-bold">{s}</td>
                                <td className="py-2 text-center text-amber-600">{p > 0 ? p : "-"}</td>
                                <td className="py-2 text-center">{o > 0 ? o : "-"}</td>
                                <td className="py-2 text-center font-bold text-green-600">{pct(o, s)}</td>
                                <td className="py-2 text-center">{c > 0 ? c : "-"}</td>
                                <td className="py-2 text-center font-bold text-blue-600">{pct(c, s)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {failed > 0 && (
                        <div className="mt-2 text-xs text-red-500">{failed} מיילים נכשלו</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab: Sources ── */}
        {activeTab === "sources" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f0eadc]">
                <h2 className="font-black text-[#191265]">מאיפה מגיעים הלידים</h2>
                <p className="text-[#727272] text-xs mt-1">פירוט לפי מקור - כמה קיבלו מיילים, כמה נרשמו למאגר</p>
              </div>
              <div className="px-5 pb-4">
                <table className="w-full text-sm text-right mt-3">
                  <thead>
                    <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                      <th className="pb-2 font-medium">מקור</th>
                      <th className="pb-2 font-medium text-center">לידים</th>
                      <th className="pb-2 font-medium text-center">קיבלו מיילים</th>
                      <th className="pb-2 font-medium text-center">% כיסוי</th>
                      <th className="pb-2 font-medium text-center">נרשמו למאגר</th>
                      <th className="pb-2 font-medium text-center">% המרה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sourceMap)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([src, s]) => (
                        <tr key={src} className="border-b border-[#f0eadc] last:border-0">
                          <td className="py-2.5 font-medium text-[#191265]">
                            {SOURCE_LABELS[src] ?? src}
                          </td>
                          <td className="py-2.5 text-center font-black text-[#191265]">{s.total}</td>
                          <td className="py-2.5 text-center">{s.withJourney}</td>
                          <td className="py-2.5 text-center font-bold text-amber-600">{pct(s.withJourney, s.total)}</td>
                          <td className="py-2.5 text-center">{s.inMatchmaking}</td>
                          <td className="py-2.5 text-center font-bold text-pink-600">{pct(s.inMatchmaking, s.total)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#191265]">
                      <td className="pt-2 font-black text-[#191265]">סה״כ</td>
                      <td className="pt-2 text-center font-black text-[#191265]">{totalLeads}</td>
                      <td className="pt-2 text-center font-bold">{totalWithJourney}</td>
                      <td className="pt-2 text-center font-bold text-amber-600">{pct(totalWithJourney, totalLeads)}</td>
                      <td className="pt-2 text-center font-bold">{totalInMatchmaking}</td>
                      <td className="pt-2 text-center font-bold text-pink-600">{pct(totalInMatchmaking, totalLeads)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Gender breakdown */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-black text-[#191265] mb-3">פירוט לפי מגדר ומקור</h3>
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                    <th className="pb-2 font-medium">מקור</th>
                    <th className="pb-2 font-medium text-center">מגדר</th>
                    <th className="pb-2 font-medium text-center">לידים</th>
                    <th className="pb-2 font-medium text-center">קיבלו מיילים</th>
                    <th className="pb-2 font-medium text-center">נרשמו למאגר</th>
                  </tr>
                </thead>
                <tbody>
                  {sources
                    .sort((a: any, b: any) => Number(b.cnt) - Number(a.cnt))
                    .map((row: any, i: number) => (
                      <tr key={i} className="border-b border-[#f0eadc] last:border-0">
                        <td className="py-2 text-[#727272]">{SOURCE_LABELS[row.source] ?? row.source ?? "לא ידוע"}</td>
                        <td className="py-2 text-center">
                          {row.gender === "female" ? "♀ נשים" : row.gender === "male" ? "♂ גברים" : "לא ידוע"}
                        </td>
                        <td className="py-2 text-center font-bold">{Number(row.cnt)}</td>
                        <td className="py-2 text-center">{Number(row.withJourney)}</td>
                        <td className="py-2 text-center text-pink-600 font-bold">{Number(row.inMatchmaking)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Sales by Channel ── */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            {salesLoading ? (
              <div className="text-center py-10 text-[#727272]">טוענת...</div>
            ) : !salesData || salesData.length === 0 ? (
              <div className="text-center py-10 text-[#727272]">
                <div className="text-4xl mb-2">📊</div>
                <p>אין נתוני מכירות עדיין</p>
              </div>
            ) : (() => {
              const PRODUCT_LABELS: Record<string, string> = {
                'מאגר': '💛 מאגר שידוכים',
                'session': '🗓️ פגישת ייעוץ',
                'coaching': '🎯 קואצ׳ינג',
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
                  {/* Summary */}
                  <div className="bg-[#191265] rounded-2xl p-5 text-white">
                    <h2 className="font-black text-xl mb-1">💰 סיכום מכירות</h2>
                    <p className="text-white/70 text-sm">סה״כ {totalSalesCount} רכישות מכל הערוצים</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
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
                  {/* Per product breakdown */}
                  {Object.entries(byProduct).map(([prod, rows]) => {
                    const prodTotal = rows.reduce((s, r) => s + r.count, 0);
                    return (
                      <div key={prod} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#f0eadc] flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-[#191265]">{PRODUCT_LABELS[prod] ?? prod}</h3>
                            <p className="text-[#727272] text-xs mt-0.5">סה״כ {prodTotal} רכישות</p>
                          </div>
                          <span className="text-2xl font-black text-[#191265]">{prodTotal}</span>
                        </div>
                        <div className="px-5 py-4">
                          <table className="w-full text-sm text-right">
                            <thead>
                              <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                                <th className="pb-2 font-medium">מקור</th>
                                <th className="pb-2 font-medium text-center">קמפיין</th>
                                <th className="pb-2 font-medium text-center">רכישות</th>
                                <th className="pb-2 font-medium text-center">% מהסך</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows
                                .sort((a, b) => b.count - a.count)
                                .map((row, i) => (
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
                            <tfoot>
                              <tr className="border-t-2 border-[#191265]">
                                <td className="pt-2 font-black text-[#191265]" colSpan={2}>סה״כ</td>
                                <td className="pt-2 text-center font-black text-[#191265]">{prodTotal}</td>
                                <td className="pt-2 text-center font-bold text-pink-600">100%</td>
                              </tr>
                            </tfoot>
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

        {/* ── Tab: No Journey ── */}
        {activeTab === "nojourney" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0eadc] flex items-center justify-between">
              <div>
                <h2 className="font-black text-[#191265]">⚠️ לידים ללא מסע מיילים</h2>
                <p className="text-[#727272] text-xs mt-1">
                  {noJourney.length} לידים שלא קיבלו אף מייל - בדוק מדוע
                </p>
              </div>
              <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
                {noJourney.length} לידים
              </span>
            </div>
            {noJourney.length === 0 ? (
              <div className="p-8 text-center text-green-600 font-bold">✅ כל הלידים נמצאים במסע מיילים</div>
            ) : (
              <div className="px-5 pb-4">
                <table className="w-full text-sm text-right mt-3">
                  <thead>
                    <tr className="text-[#727272] text-xs border-b border-[#f0eadc]">
                      <th className="pb-2 font-medium">שם</th>
                      <th className="pb-2 font-medium">מייל</th>
                      <th className="pb-2 font-medium text-center">מגדר</th>
                      <th className="pb-2 font-medium text-center">מקור</th>
                      <th className="pb-2 font-medium text-center">תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noJourney.map((lead: any) => (
                      <tr key={lead.id} className="border-b border-[#f0eadc] last:border-0">
                        <td className="py-2 font-medium text-[#191265]">{lead.name}</td>
                        <td className="py-2 text-[#727272] text-xs">{lead.email}</td>
                        <td className="py-2 text-center">
                          {lead.gender === "female" ? "♀" : lead.gender === "male" ? "♂" : "-"}
                        </td>
                        <td className="py-2 text-center text-xs">
                          <span className="bg-[#f0eadc] px-2 py-0.5 rounded-full">
                            {SOURCE_LABELS[lead.source] ?? lead.source ?? "לא ידוע"}
                          </span>
                        </td>
                        <td className="py-2 text-center text-[#727272] text-xs">{lead.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
                  <strong>למה זה קורה?</strong> לידים ישירים (direct) נכנסים ידנית ולא מקבלים מסע אוטומטי. לידים ממטא ללא מגדר לא יכולים להיכנס למסע מגדרי. ניתן להפעיל מסע ידנית מה-CRM.
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
