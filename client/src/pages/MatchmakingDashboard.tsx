import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import PlusPilotAdminSection from "@/components/PlusPilotAdminSection";
import OperationsSection from "@/components/OperationsSection";
import MarketingMessageLibrary from "@/components/MarketingMessageLibrary";
import OutcomeSegmentsSection from "@/components/OutcomeSegmentsSection";

type ChartPoint = { label: string; value: number; color?: string };

function BarChart({ data, height = 120 }: { data: ChartPoint[]; height?: number }) {
  const max = Math.max(...data.map(item => item.value), 1);
  return (
    <div className="flex items-end gap-1 justify-between" style={{ height }}>
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] font-bold text-[#191265]">{item.value || ""}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${Math.max((item.value / max) * (height - 30), 2)}px`,
              backgroundColor: item.color || "#191265",
              minWidth: "6px",
            }}
          />
          <span className="text-[8px] text-[#727272] truncate max-w-[32px]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...steps.map(step => step.value), 1);
  return (
    <div className="space-y-2.5">
      {steps.map((step, index) => {
        const width = Math.max((step.value / max) * 100, 14);
        const previous = index > 0 ? steps[index - 1].value : step.value;
        const conversion = previous > 0 ? Math.round((step.value / previous) * 100) : 0;
        return (
          <div key={step.label} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div
                className="rounded-xl py-2.5 px-3 text-white text-xs font-bold transition-all duration-700 flex items-center justify-between gap-2"
                style={{ width: `${width}%`, backgroundColor: step.color, minWidth: "104px" }}
              >
                <span className="truncate">{step.label}</span>
                <span className="font-black text-sm shrink-0">{step.value}</span>
              </div>
            </div>
            {index > 0 && <span className="text-[11px] font-bold text-[#727272] w-10 text-left">{conversion}%</span>}
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments, size = 150 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <div className="text-center text-[#727272] text-sm py-6">אין נתונים</div>;
  let cumulative = 0;
  const radius = size / 2 - 10;
  const center = size / 2;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="התפלגות התאמות">
        {segments.map((segment, index) => {
          const startAngle = (cumulative / total) * 360;
          const sliceAngle = (segment.value / total) * 360;
          cumulative += segment.value;
          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = ((startAngle + sliceAngle - 90) * Math.PI) / 180;
          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);
          const largeArc = sliceAngle > 180 ? 1 : 0;
          const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return <path key={index} d={path} fill={segment.color} stroke="white" strokeWidth="2" />;
        })}
        <circle cx={center} cy={center} r={radius * 0.57} fill="white" />
        <text x={center} y={center - 5} textAnchor="middle" className="text-lg font-black fill-[#191265]">{total}</text>
        <text x={center} y={center + 13} textAnchor="middle" className="text-[10px] fill-[#727272]">פעילים</text>
      </svg>
      <div className="space-y-2 w-full sm:w-auto">
        {segments.map(segment => (
          <div key={segment.label} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-xs text-[#555]">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <strong className="text-xs text-[#191265]">{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[#313131]">{label}</span>
        <span className="font-black text-[#191265]">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#eeeef4] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
      <p className="text-[10px] text-[#727272]">{detail}</p>
    </div>
  );
}

const DATE_PRESETS = [
  { label: "7 ימים", days: 7 },
  { label: "14 ימים", days: 14 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
  { label: "הכל", days: 0 },
];

export default function MatchmakingDashboard() {
  const [selectedPreset, setSelectedPreset] = useState(4);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const dateRange = useMemo(() => {
    if (customFrom && customTo) {
      return { from: new Date(customFrom).getTime(), to: new Date(customTo).getTime() + 86400000 - 1 };
    }
    const preset = DATE_PRESETS[selectedPreset];
    if (!preset || preset.days === 0) return { from: undefined, to: undefined };
    const now = Date.now();
    return { from: now - preset.days * 86400000, to: now };
  }, [customFrom, customTo, selectedPreset]);

  const { data, isLoading, error } = (trpc.matchmaking as any).getDashboardData.useQuery(
    { from: dateRange.from, to: dateRange.to },
    { refetchInterval: 60000 },
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-white rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(item => <div key={item} className="h-28 bg-white rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-sm text-red-800">לא ניתן לטעון את נתוני הדשבורד כרגע. נסו לרענן.</div>;
  }
  if (!data) return null;

  const {
    kpis,
    balance,
    quality,
    pairFunnel,
    sideFunnel,
    cohortCoverage,
    matchCountDist,
    noMatchDuration,
    supplyGaps,
    attentionList,
    renewals,
    dailySignups,
    dailyMatches,
    meta,
    outcomeSegments,
  } = data;

  const kpiCards = [
    { label: "חברי מאגר פעילים", value: kpis.totalActive, sub: `${balance.femaleRate}% נשים · ${balance.maleRate}% גברים`, color: "from-[#191265] to-[#352a97]" },
    { label: "כיסוי התאמות", value: `${kpis.coverageRate}%`, sub: "קיבלו לפחות התאמה אחת", color: "from-[#5b36c9] to-[#8b5cf6]" },
    { label: "חציון להתאמה ראשונה", value: `${kpis.medianDaysToFirstMatch}`, sub: "ימים ממועד ההצטרפות", color: "from-[#077b68] to-[#0ea584]" },
    { label: "פרופילים מלאים", value: `${kpis.profileCompletenessRate}%`, sub: `${quality.complete} מתוך ${kpis.totalActive}`, color: "from-[#b06d00] to-[#e09a20]" },
    { label: "התאמות שנשלחו", value: kpis.matchesSent, sub: "בטווח התאריכים שנבחר", color: "from-[#6d28d9] to-[#9333ea]" },
    { label: "אישור הדדי", value: pairFunnel.mutuallyApproved, sub: `${kpis.successRate}% מההתאמות שנשלחו`, color: "from-[#be185d] to-[#ec4899]" },
    { label: "דייטים מתועדים", value: pairFunnel.met, sub: "לפי עדכון CRM קיים", color: "from-[#047857] to-[#10b981]" },
    { label: "זוגות פעילים", value: kpis.activeMatchedNow, sub: `${pairFunnel.together} מסומנים 'ביחד' בתקופה`, color: "from-[#b91c1c] to-[#f43f5e]" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <section className="rounded-3xl bg-gradient-to-l from-[#191265] via-[#251a82] to-[#3b2bb3] p-5 md:p-7 text-white shadow-xl overflow-hidden relative">
        <div className="absolute -left-16 -top-20 w-56 h-56 rounded-full bg-[#ffe27c]/10" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[#ffe27c] text-xs font-black tracking-wide mb-2">מקור אמת · מתעדכן בכל דקה</p>
            <h2 className="text-2xl md:text-3xl font-black">דשבורד תוצאות וכיסוי התאמות</h2>
            <p className="text-white/75 text-sm mt-2 max-w-2xl leading-6">
              לא רק כמה התאמות נשלחו — אלא מי קיבל הזדמנות, כמה זמן חיכה, מה קרה אחרי האישור ואיפה צריך להגדיל את ההיצע.
            </p>
          </div>
          <div className="text-[10px] text-white/60">עודכן {new Date(meta.calculatedAt).toLocaleString("he-IL")}</div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#e9e8e8]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm font-bold text-[#191265]">תקופה:</span>
          {DATE_PRESETS.map((preset, index) => (
            <button
              key={preset.label}
              onClick={() => { setSelectedPreset(index); setCustomFrom(""); setCustomTo(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${selectedPreset === index && !customFrom ? "bg-[#191265] text-white shadow-md" : "bg-gray-100 text-[#555] hover:bg-gray-200"}`}
            >
              {preset.label}
            </button>
          ))}
          <div className="flex items-center gap-2 md:mr-4">
            <input type="date" value={customFrom} onChange={event => { setCustomFrom(event.target.value); setSelectedPreset(-1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
            <span className="text-xs text-[#727272]">עד</span>
            <input type="date" value={customTo} onChange={event => { setCustomTo(event.target.value); setSelectedPreset(-1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(card => (
          <article key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white shadow-lg min-h-[116px]`}>
            <div className="text-2xl md:text-3xl font-black">{card.value}</div>
            <div className="text-xs md:text-sm font-bold mt-1">{card.label}</div>
            <div className="text-[10px] md:text-[11px] opacity-75 mt-2 leading-4">{card.sub}</div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#f1d478] bg-[#fff9e6] p-4 md:p-5">
        <h3 className="font-black text-[#191265] text-sm">הגדרת השירות שחשוב לשמור בכל המסרים</h3>
        <p className="text-xs md:text-sm text-[#5b532f] leading-6 mt-2">
          299 ש״ח הם דמי הצטרפות למאגר ולתהליך התאמה מקצועי. אין התחייבות למספר התאמות או לתדירות קבועה; התאמה נשלחת רק כאשר נמצאת התאמה הדדית ורלוונטית. מטרת המערכת היא להגדיל בהתמדה את מספר ההזדמנויות המתאימות — בלי להחליף איכות בכמות.
        </p>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-[#191265]">כיסוי התאמות לחברי המאגר</h3>
              <p className="text-[11px] text-[#727272] mt-1">כמה התאמות נשלחו לכל חבר פעיל מאז ההצטרפות</p>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${matchCountDist.zero > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {matchCountDist.zero} ללא התאמה
            </span>
          </div>
          <DonutChart segments={[
            { label: "0 התאמות", value: matchCountDist.zero, color: "#ef4444" },
            { label: "1 התאמה", value: matchCountDist.one, color: "#f59e0b" },
            { label: "2 התאמות", value: matchCountDist.two, color: "#10b981" },
            { label: "3+ התאמות", value: matchCountDist.three_plus, color: "#191265" },
          ]} />
        </article>

        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265]">כיסוי לפי 30 / 60 / 90 יום</h3>
          <p className="text-[11px] text-[#727272] mt-1 mb-5">מתוך מי שכבר השלים את חלון הזמן, כמה קיבלו התאמה ראשונה בזמן</p>
          <div className="space-y-5">
            {cohortCoverage.map((cohort: any) => (
              <ProgressMetric
                key={cohort.days}
                label={`עד ${cohort.days} יום`}
                value={cohort.coverageRate}
                detail={`${cohort.covered} מתוך ${cohort.eligible} חברים זכאים`}
                color={cohort.days === 30 ? "#7c3aed" : cohort.days === 60 ? "#0ea584" : "#191265"}
              />
            ))}
          </div>
        </article>
      </section>

      <OutcomeSegmentsSection
        bySource={outcomeSegments?.bySource || []}
        byProduct={outcomeSegments?.byProduct || []}
        bySegment={outcomeSegments?.bySegment || []}
      />

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-4">
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <div className="mb-4">
            <h3 className="text-sm font-black text-[#191265]">משפך תוצאות — יחידת המדידה היא התאמה</h3>
            <p className="text-[11px] text-[#727272] mt-1">הקוהורט נקבע לפי ההתאמות שנשלחו בתקופה שנבחרה; הסטטוס משקף את המצב הידוע היום</p>
          </div>
          <FunnelChart steps={[
            { label: "התאמות נשלחו", value: pairFunnel.proposed, color: "#191265" },
            { label: "לפחות צד אחד פתח", value: pairFunnel.opened, color: "#3b35a2" },
            { label: "לפחות צד אחד אישר", value: pairFunnel.oneApproved, color: "#6558c7" },
            { label: "אישור הדדי", value: pairFunnel.mutuallyApproved, color: "#8b5cf6" },
            { label: "פרטים נחשפו", value: pairFunnel.contactRevealed, color: "#c026d3" },
            { label: "דייט התקיים", value: pairFunnel.met, color: "#db2777" },
            { label: "ממשיכים", value: pairFunnel.continuing, color: "#e11d48" },
            { label: "בזוגיות", value: pairFunnel.together, color: "#b91c1c" },
          ]} />
          <div className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-[11px] text-indigo-800 leading-5">
            פתיחות ואישורים נמדדים גם ברמת כל צד: {sideFunnel.opened} פתיחות ו־{sideFunnel.approved} אישורים מתוך {sideFunnel.proposals} הצעות אישיות.
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265]">איכות והשלמת פרופילים</h3>
          <p className="text-[11px] text-[#727272] mt-1 mb-5">נתונים בזמן אמת מתוך החברים הפעילים</p>
          <div className="space-y-5">
            <ProgressMetric label="פרופיל מלא" value={quality.completeRate} detail={`${quality.complete} פרופילים עומדים בכל דרישות האיכות`} color="#191265" />
            <ProgressMetric label="שאלון מדעי מלא" value={quality.scientificRate} detail={`${quality.scientific} השלימו שאלון`} color="#7c3aed" />
            <ProgressMetric label="תמונה בפרופיל" value={quality.photoRate} detail={`${quality.photo} העלו תמונה`} color="#db2777" />
            <ProgressMetric label="תוצאת DNA" value={quality.dnaRate} detail={`${quality.dna} עם סיווג DNA`} color="#0ea584" />
          </div>
          <div className="mt-5 rounded-xl bg-[#f8f7fc] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#555]">נשים</span>
              <strong className="text-[#191265]">{balance.female} ({balance.femaleRate}%)</strong>
            </div>
            <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden my-2">
              <div className="h-full bg-[#e85c9b]" style={{ width: `${balance.femaleRate}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#555]">גברים</span>
              <strong className="text-[#191265]">{balance.male} ({balance.maleRate}%)</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black text-[#191265]">דורשים תשומת לב</h3>
              <p className="text-[11px] text-[#727272] mt-1">הוותיקים ביותר שלא קיבלו התאמה לאחרונה</p>
            </div>
            <div className="text-left">
              <div className="text-xs font-black text-orange-700">{noMatchDuration.over14} מעל 14 יום</div>
              <div className="text-xs font-black text-red-700">{noMatchDuration.over30} מעל 30 יום</div>
            </div>
          </div>
          <div className="max-h-[380px] overflow-y-auto space-y-2 pl-1">
            {attentionList.slice(0, 15).map((person: any) => (
              <div key={person.id} className="rounded-xl border border-[#ebeaf2] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs text-[#191265]">{person.name}</strong>
                    {person.neverReceivedMatch && <span className="text-[9px] font-black bg-red-50 text-red-700 px-2 py-0.5 rounded-full">טרם קיבל/ה התאמה</span>}
                    {person.missingFields.length > 0 && <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">פרופיל חסר</span>}
                  </div>
                  <p className="text-[10px] text-[#727272] mt-1">{person.age} · {person.city} · {person.matchCount} התאמות</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-black ${person.daysWaiting >= 30 ? "text-red-700" : "text-orange-700"}`}>{person.daysWaiting} ימים</span>
                  {person.phone && <a href={`tel:${person.phone}`} className="text-[10px] bg-[#191265] text-white px-2.5 py-1.5 rounded-lg">חיוג</a>}
                </div>
              </div>
            ))}
            {attentionList.length === 0 && <div className="py-10 text-center text-sm text-green-700">אין כרגע חברים שממתינים מעל 14 יום</div>}
          </div>
        </article>

        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265]">מוקדי פער בהיצע ההתאמות</h3>
          <p className="text-[11px] text-[#727272] mt-1 mb-4">קבוצות עם שיעור גבוה של ממתינים מעל 30 יום; לא הבטחה לזמינות התאמה</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#727272] border-b border-[#ecebf2]">
                  <th className="text-right py-2">חתך</th>
                  <th className="text-right py-2">קבוצה</th>
                  <th className="text-center py-2">פעילים</th>
                  <th className="text-center py-2">כיסוי</th>
                  <th className="text-center py-2">30+ יום</th>
                </tr>
              </thead>
              <tbody>
                {supplyGaps.map((gap: any) => (
                  <tr key={`${gap.segment}-${gap.label}`} className="border-b border-[#f2f1f6] last:border-0">
                    <td className="py-2.5 text-[#727272]">{gap.segment}</td>
                    <td className="py-2.5 font-bold text-[#191265]">{gap.label}</td>
                    <td className="py-2.5 text-center">{gap.active}</td>
                    <td className="py-2.5 text-center font-semibold text-green-700">{gap.coverageRate}%</td>
                    <td className="py-2.5 text-center font-black text-red-700">{gap.over30} ({gap.waitingRate}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <PlusPilotAdminSection />

      <OperationsSection />

      <MarketingMessageLibrary
        totalActive={kpis.totalActive}
        femaleRate={balance.femaleRate}
        maleRate={balance.maleRate}
        profileCompletenessRate={quality.completeRate}
        scientificRate={quality.scientificRate}
        coverageRate={kpis.coverageRate}
        medianDaysToFirstMatch={kpis.medianDaysToFirstMatch}
        updatedAt={meta.calculatedAt}
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">הרשמות יומיות — 30 ימים</h3>
          <BarChart data={dailySignups.map((item: any) => ({ label: item.date, value: item.count, color: "#10b981" }))} height={110} />
        </article>
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">התאמות שנשלחו — 30 ימים</h3>
          <BarChart data={dailyMatches.map((item: any) => ({ label: item.date, value: item.sent, color: "#7c3aed" }))} height={110} />
        </article>
      </section>

      {renewals.expired + renewals.in30 > 0 && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e9e8e8]">
          <h3 className="text-sm font-black text-[#191265] mb-3">תוקף חברות — בדיקה תפעולית</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            {[
              ["פג תוקף", renewals.expired, "bg-red-50 text-red-700"],
              ["7 ימים", renewals.in7, "bg-orange-50 text-orange-700"],
              ["14 ימים", renewals.in14, "bg-amber-50 text-amber-700"],
              ["30 ימים", renewals.in30, "bg-blue-50 text-blue-700"],
            ].map(([label, value, classes]) => (
              <div key={String(label)} className={`rounded-xl p-3 ${classes}`}>
                <div className="text-lg font-black">{value}</div>
                <div className="text-[10px] font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
