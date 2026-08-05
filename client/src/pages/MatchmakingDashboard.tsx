import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";

// Simple bar chart component
function BarChart({ data, height = 120 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 justify-between" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] font-bold text-[#191265]">{d.value || ""}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${Math.max((d.value / max) * (height - 30), 2)}px`,
              backgroundColor: d.color || "#191265",
              minWidth: "6px",
            }}
          />
          <span className="text-[8px] text-[#727272] truncate max-w-[30px]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Funnel visualization
function FunnelChart({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...steps.map(s => s.value), 1);
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const width = Math.max((step.value / max) * 100, 15);
        const pct = i > 0 ? Math.round((step.value / steps[i-1].value) * 100) : 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1">
              <div
                className="rounded-lg py-2 px-3 text-white text-xs font-bold transition-all duration-700 flex items-center justify-between"
                style={{ width: `${width}%`, backgroundColor: step.color, minWidth: "80px" }}
              >
                <span>{step.label}</span>
                <span className="font-black text-sm">{step.value}</span>
              </div>
            </div>
            {i > 0 && (
              <span className="text-xs font-bold text-[#727272] w-12 text-left">{pct}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Donut chart
function DonutChart({ segments, size = 140 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <div className="text-center text-[#727272] text-sm py-4">אין נתונים</div>;
  let cumulative = 0;
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const startAngle = (cumulative / total) * 360;
          const sliceAngle = (seg.value / total) * 360;
          cumulative += seg.value;
          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = (((startAngle + sliceAngle) - 90) * Math.PI) / 180;
          const x1 = cx + radius * Math.cos(startRad);
          const y1 = cy + radius * Math.sin(startRad);
          const x2 = cx + radius * Math.cos(endRad);
          const y2 = cy + radius * Math.sin(endRad);
          const largeArc = sliceAngle > 180 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return <path key={i} d={d} fill={seg.color} stroke="white" strokeWidth="2" />;
        })}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="white" />
        <text x={cx} y={cy - 5} textAnchor="middle" className="text-lg font-black fill-[#191265]">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-[#727272]">סה"כ</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-[#555]">{seg.label}</span>
            <span className="text-xs font-bold text-[#191265]">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Date range presets
const DATE_PRESETS = [
  { label: "7 ימים", days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
  { label: "הכל", days: 0 },
];

export default function MatchmakingDashboard() {
  const [selectedPreset, setSelectedPreset] = useState(4); // "הכל" by default
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const dateRange = useMemo(() => {
    if (customFrom && customTo) {
      return { from: new Date(customFrom).getTime(), to: new Date(customTo).getTime() + 86400000 };
    }
    const preset = DATE_PRESETS[selectedPreset];
    if (!preset || preset.days === 0) return { from: undefined, to: undefined };
    const now = Date.now();
    return { from: now - preset.days * 24 * 60 * 60 * 1000, to: now };
  }, [selectedPreset, customFrom, customTo]);

  const { data, isLoading } = (trpc.matchmaking as any).getDashboardData.useQuery(
    { from: dateRange.from, to: dateRange.to },
    { refetchInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-1/2" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, matchCountDist, noMatchDuration, funnel, renewals, dailySignups, dailyMatches } = data;

  return (
    <div className="space-y-5">
      {/* Date Range Picker */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e9e8e8]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-[#191265]">📅 תקופה:</span>
          {DATE_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => { setSelectedPreset(i); setCustomFrom(""); setCustomTo(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPreset === i && !customFrom
                  ? "bg-[#191265] text-white shadow-md"
                  : "bg-gray-100 text-[#555] hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 mr-4">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setSelectedPreset(-1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            />
            <span className="text-xs text-[#727272]">עד</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setSelectedPreset(-1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "חברי מאגר פעילים", value: kpis.totalActive, icon: "👥", color: "from-blue-500 to-indigo-600" },
          { label: "הצטרפו (בתקופה)", value: kpis.newSignups, icon: "🆕", color: "from-emerald-500 to-green-600" },
          { label: "התאמות נשלחו", value: kpis.matchesSent, icon: "📨", color: "from-purple-500 to-violet-600" },
          { label: "התאמות הצליחו", value: kpis.matchesSucceeded, icon: "💛", color: "from-amber-500 to-orange-500" },
          { label: "אחוז הצלחה", value: `${kpis.successRate}%`, icon: "🎯", color: "from-rose-500 to-pink-600" },
          { label: "זוגות פעילים עכשיו", value: kpis.activeMatchedNow, icon: "❤️", color: "from-red-500 to-rose-600" },
        ].map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-4 text-white shadow-lg`}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-black">{kpi.value}</div>
            <div className="text-[11px] opacity-90 font-medium">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Funnel + Match Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-4">🔻 משפך המאגר</h3>
          <FunnelChart steps={[
            { label: "נרשמו (שילמו)", value: funnel.registered, color: "#191265" },
            { label: "קיבלו לפחות התאמה 1", value: funnel.sentAtLeastOne, color: "#4338ca" },
            { label: "אישרו התאמה", value: funnel.approved, color: "#7c3aed" },
            { label: "נוצר זוג (שניהם אישרו)", value: funnel.matched, color: "#ec4899" },
          ]} />
        </div>

        {/* Match Count Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-4">📊 התפלגות התאמות לחבר</h3>
          <DonutChart segments={[
            { label: "0 התאמות", value: matchCountDist.zero, color: "#ef4444" },
            { label: "1 התאמה", value: matchCountDist.one, color: "#f59e0b" },
            { label: "2 התאמות", value: matchCountDist.two, color: "#10b981" },
            { label: "3+ התאמות", value: matchCountDist.three_plus, color: "#191265" },
          ]} />
        </div>
      </div>

      {/* Row 3: No-match duration + Renewals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Waiting too long */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">⏳ ממתינים להתאמה</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-orange-50 rounded-xl p-3">
              <span className="text-xs text-orange-800 font-semibold">14+ ימים ללא התאמה</span>
              <span className="text-lg font-black text-orange-600">{noMatchDuration.over14}</span>
            </div>
            <div className="flex items-center justify-between bg-red-50 rounded-xl p-3">
              <span className="text-xs text-red-800 font-semibold">30+ ימים ללא התאמה</span>
              <span className="text-lg font-black text-red-600">{noMatchDuration.over30}</span>
            </div>
          </div>
        </div>

        {/* Renewals */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">🔄 חידושי מנוי</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-red-50 rounded-xl p-2.5">
              <span className="text-xs text-red-800 font-semibold">פג תוקף!</span>
              <span className="text-lg font-black text-red-600">{renewals.expired}</span>
            </div>
            <div className="flex items-center justify-between bg-amber-50 rounded-xl p-2.5">
              <span className="text-xs text-amber-800 font-semibold">7 ימים הבאים</span>
              <span className="text-lg font-black text-amber-600">{renewals.in7}</span>
            </div>
            <div className="flex items-center justify-between bg-yellow-50 rounded-xl p-2.5">
              <span className="text-xs text-yellow-800 font-semibold">14 ימים הבאים</span>
              <span className="text-lg font-black text-yellow-600">{renewals.in14}</span>
            </div>
            <div className="flex items-center justify-between bg-blue-50 rounded-xl p-2.5">
              <span className="text-xs text-blue-800 font-semibold">30 ימים הבאים</span>
              <span className="text-lg font-black text-blue-600">{renewals.in30}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">⚡ מדדים מהירים</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-xl">
              <span className="text-xs text-indigo-800 font-semibold">ממוצע התאמות/חבר</span>
              <span className="text-lg font-black text-indigo-600">
                {kpis.totalActive > 0 ? (kpis.matchesSent / kpis.totalActive * 2).toFixed(1) : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl">
              <span className="text-xs text-green-800 font-semibold">% קיבלו התאמה</span>
              <span className="text-lg font-black text-green-600">
                {kpis.totalActive > 0 ? Math.round((funnel.sentAtLeastOne / kpis.totalActive) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-xl">
              <span className="text-xs text-purple-800 font-semibold">% אישרו מתוך שנשלח</span>
              <span className="text-lg font-black text-purple-600">
                {funnel.sentAtLeastOne > 0 ? Math.round((funnel.approved / funnel.sentAtLeastOne) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-pink-50 rounded-xl">
              <span className="text-xs text-pink-800 font-semibold">% זוגות מתוך אישורים</span>
              <span className="text-lg font-black text-pink-600">
                {funnel.approved > 0 ? Math.round((funnel.matched / funnel.approved) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Daily Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">📈 הרשמות יומיות (30 ימים)</h3>
          <BarChart
            data={dailySignups.map((d: any) => ({ label: d.date, value: d.count, color: "#10b981" }))}
            height={100}
          />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">💌 התאמות יומיות (30 ימים)</h3>
          <BarChart
            data={dailyMatches.map((d: any) => ({ label: d.date, value: d.sent, color: "#7c3aed" }))}
            height={100}
          />
          <div className="flex items-center gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> נשלחו</span>
          </div>
        </div>
      </div>
    </div>
  );
}
