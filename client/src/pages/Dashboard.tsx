import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProfitAndLossSection } from "@/components/ProfitAndLossSection";
import { MetaPurchaseDeliveryStatus } from "@/components/MetaPurchaseDeliveryStatus";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addCalendarDays,
  endOfIsraelCalendarDate,
  formatIsraelCalendarDate,
  formatIsraelDateRange,
  getCurrentIsraelMonthStart,
  parseIsraelCalendarDate,
} from "@/lib/dashboardDateRange";

type Preset =
  | "today"
  | "yesterday"
  | "threeFullDays"
  | "sevenFullDays"
  | "month"
  | "custom";
type SaleStatusFilter = "all" | "included" | "review";
type Confidence = string;

type SalesIntelligence = {
  startDate: number;
  endDate: number;
  generatedAt: number;
  partialToday: boolean;
  summary: {
    recordedCount: number;
    recordedRevenueAgorot: number;
    includedCount: number;
    includedRevenueAgorot: number;
    reviewCount: number;
    reviewRevenueAgorot: number;
    excludedTests: number;
    excludedEstimated: number;
    knownClosingCount: number;
    knownAcquisitionCount: number;
    metaSpendAgorot: number | null;
    otherExpenseAgorot: number | null;
    totalExpenseAgorot: number | null;
    balanceAgorot: number | null;
    expenseComplete: boolean;
  };
  sales: Sale[];
  channels: Channel[];
  products: Product[];
  campaigns: Campaign[];
  daily: Daily[];
  insights: Insight[];
  quality: Quality;
};
type Sale = {
  order: number;
  paidAt: number;
  day: string;
  product: string;
  productLabel: string;
  amountAgorot: number;
  coupon: string | null;
  status: "included" | "review";
  paymentEvidence: string;
  acquisition: {
    channel: string;
    campaign: string | null;
    confidence: Confidence;
  };
  closing: { channel: string; campaign: string | null; confidence: Confidence };
  emailAssist: { campaign: string; clicked: boolean; sameDay: boolean } | null;
  lagDays: number | null;
};
type Channel = { channel: string; count: number; revenueAgorot: number };
type Product = {
  product: string;
  label: string;
  count: number;
  revenueAgorot: number;
};
type Campaign = {
  campaign: string;
  channel: string;
  count: number;
  revenueAgorot: number;
  emailClosedCount: number;
  products: string[];
  mapping: string;
  spendAgorot: number | null;
  metaPurchases: number | null;
};
type Daily = {
  day: string;
  count: number;
  revenueAgorot: number;
  reviewCount: number;
};
type Insight = {
  title: string;
  detail: string;
  tone: "positive" | "warning" | "neutral";
};
type Quality = {
  providerReconciled: false;
  attributionNote: string;
  expenseNote: string;
  metaTimezone: string | null;
  notes: string[];
};

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "today", label: "היום" },
  { id: "yesterday", label: "אתמול" },
  { id: "threeFullDays", label: "3 ימים מלאים" },
  { id: "sevenFullDays", label: "7 ימים" },
  { id: "month", label: "החודש" },
];
const ISRAEL_TIMEZONE = "Asia/Jerusalem";

function money(valueAgorot: number | null | undefined) {
  if (valueAgorot == null) return "לא זמין";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valueAgorot / 100);
}
function count(value: number) {
  return new Intl.NumberFormat("he-IL").format(value);
}
function dateTime(value: number) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: ISRAEL_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function calendarDay(value: string) {
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseIsraelCalendarDate(value)
    : new Date(value).getTime();
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: ISRAEL_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}
function calendarDayCount(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  return (
    Math.floor(
      (Date.UTC(endYear, endMonth - 1, endDay) -
        Date.UTC(startYear, startMonth - 1, startDay)) /
        86_400_000
    ) + 1
  );
}
function fullDaysRange(days: number, today: string) {
  const end = addCalendarDays(today, -1);
  return {
    startDate: parseIsraelCalendarDate(addCalendarDays(today, -days)),
    endDate: endOfIsraelCalendarDate(end),
  };
}
function toneClass(tone: Insight["tone"]) {
  return tone === "positive"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-indigo-100 bg-indigo-50 text-indigo-950";
}
function ToneIcon({ tone }: { tone: Insight["tone"] }) {
  return tone === "positive" ? (
    <CircleCheck className="h-4 w-4 shrink-0" />
  ) : tone === "warning" ? (
    <CircleAlert className="h-4 w-4 shrink-0" />
  ) : (
    <CircleHelp className="h-4 w-4 shrink-0" />
  );
}

function MetricCard({
  label,
  value,
  detail,
  highlight = "indigo",
}: {
  label: string;
  value: string;
  detail: ReactNode;
  highlight?: "indigo" | "champagne" | "emerald";
}) {
  const accent = {
    indigo: "border-indigo-200 bg-white",
    champagne: "border-[#ead9ad] bg-[#fffdf8]",
    emerald: "border-emerald-200 bg-white",
  }[highlight];
  return (
    <section
      className={`rounded-2xl border p-4 shadow-[0_10px_30px_rgba(25,18,101,0.06)] ${accent}`}
    >
      <p className="text-xs font-bold tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-[#191265] sm:text-3xl">
        {value}
      </p>
      <div className="mt-2 min-h-5 text-xs leading-5 text-slate-500">
        {detail}
      </div>
    </section>
  );
}
function SectionTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-black tracking-tight text-[#191265]">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
function ChannelName({
  channel,
  campaign,
}: {
  channel: string;
  campaign: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-900">
        {channel || "ללא שיוך"}
      </p>
      {campaign && (
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{campaign}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState<Preset>("threeFullDays");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [saleFilter, setSaleFilter] = useState<SaleStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  const range = useMemo(() => {
    const today = formatIsraelCalendarDate(refreshedAt);
    if (preset === "today")
      return {
        startDate: parseIsraelCalendarDate(today),
        endDate: refreshedAt,
      };
    if (preset === "yesterday") {
      const yesterday = addCalendarDays(today, -1);
      return {
        startDate: parseIsraelCalendarDate(yesterday),
        endDate: endOfIsraelCalendarDate(yesterday),
      };
    }
    if (preset === "threeFullDays") return fullDaysRange(3, today);
    if (preset === "sevenFullDays") return fullDaysRange(7, today);
    if (preset === "month")
      return {
        startDate: getCurrentIsraelMonthStart(refreshedAt),
        endDate: refreshedAt,
      };
    const safeStart = customStart || addCalendarDays(today, -2);
    const safeEnd = customEnd || today;
    return {
      startDate: parseIsraelCalendarDate(safeStart),
      endDate: endOfIsraelCalendarDate(safeEnd),
    };
  }, [customEnd, customStart, preset, refreshedAt]);
  const dateInput = useMemo(() => range, [range]);
  const rangeLabel = useMemo(
    () => formatIsraelDateRange(range.startDate, range.endDate),
    [range]
  );
  const selectedStart = useMemo(
    () => formatIsraelCalendarDate(range.startDate),
    [range.startDate]
  );
  const selectedEnd = useMemo(
    () => formatIsraelCalendarDate(range.endDate),
    [range.endDate]
  );
  const selectedDays = useMemo(
    () => calendarDayCount(selectedStart, selectedEnd),
    [selectedEnd, selectedStart]
  );
  const rangeIsValid = selectedDays >= 1 && selectedDays <= 93;
  const intelligence = trpc.dashboard.salesIntelligence.useQuery(dateInput, {
    enabled: rangeIsValid,
  });
  const data: SalesIntelligence | undefined = intelligence.data;
  const filteredSales = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("he-IL");
    return [...(data?.sales ?? [])]
      .sort((left, right) => right.paidAt - left.paidAt)
      .filter(sale => saleFilter === "all" || sale.status === saleFilter)
      .filter(
        sale =>
          !needle ||
          [
            sale.productLabel,
            sale.product,
            sale.acquisition.channel,
            sale.acquisition.campaign,
            sale.closing.channel,
            sale.closing.campaign,
            sale.emailAssist?.campaign,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("he-IL")
            .includes(needle)
      );
  }, [data?.sales, saleFilter, search]);
  const setCustomDate = (field: "start" | "end", value: string) => {
    setPreset("custom");
    if (field === "start") setCustomStart(value);
    else setCustomEnd(value);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-indigo-950/15 bg-[#191265] text-white shadow-lg shadow-indigo-950/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#f6df9a]">
                HILIT CASPI
              </p>
              <h1 className="text-lg font-black tracking-tight">
                מרכז המכירות
              </h1>
            </div>
            <a
              href="/crm"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6df9a]"
            >
              <ArrowLeft className="h-4 w-4" /> חזרה ל־CRM
            </a>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPreset(item.id);
                    setCustomStart("");
                    setCustomEnd("");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6df9a] ${preset === item.id ? "bg-[#fffaf0] text-[#191265]" : "bg-white/10 text-white/85 hover:bg-white/20"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <CalendarRange className="h-4 w-4 text-[#f6df9a]" />
              <input
                aria-label="תחילת טווח מותאם"
                type="date"
                value={customStart || selectedStart}
                onChange={event => setCustomDate("start", event.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-white [color-scheme:dark]"
              />
              <span className="text-white/60">עד</span>
              <input
                aria-label="סיום טווח מותאם"
                type="date"
                value={customEnd || selectedEnd}
                onChange={event => setCustomDate("end", event.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-white [color-scheme:dark]"
              />
              <button
                type="button"
                aria-label="רענון נתוני מכירות"
                onClick={() => {
                  setRefreshedAt(Date.now());
                  void intelligence.refetch();
                }}
                disabled={intelligence.isFetching || !rangeIsValid}
                className="rounded-lg p-2 text-[#f6df9a] transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${intelligence.isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
        {!rangeIsValid && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            ניתן לבחור טווח של יום אחד ועד 93 ימים. הטווח הנוכחי כולל{" "}
            {count(Math.max(selectedDays, 0))} ימים, ולכן הנתונים לא נטענו.
          </section>
        )}
        <section className="rounded-2xl border border-[#e5d7ae] bg-[#fffaf0] px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#191265]">{rangeLabel}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {data
                  ? `עודכן ${dateTime(data.generatedAt)}`
                  : "הנתונים מוצגים לפי שעון ישראל"}
              </p>
            </div>
            {data?.partialToday && (
              <p className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950">
                היום עדיין חלקי
              </p>
            )}
          </div>
        </section>
        {intelligence.isLoading && <DashboardSkeleton />}
        {intelligence.error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">
            לא ניתן לטעון כרגע את נתוני המכירות. לא מוצגים אפסים במקום נתונים
            חסרים. אפשר לנסות לרענן את הדף או לבחור טווח אחר.
          </section>
        )}
        {data && (
          <SalesCommandCenter
            data={data}
            filteredSales={filteredSales}
            saleFilter={saleFilter}
            setSaleFilter={setSaleFilter}
            search={search}
            setSearch={setSearch}
            expandedOrder={expandedOrder}
            setExpandedOrder={setExpandedOrder}
          />
        )}
        <CollapsibleSection
          title="ניהול הוצאות"
          description="הוספת הוצאות מתבצעת כאן בלבד, לפי ההרשאות הקיימות. נתוני ההוצאות במרכז המכירות הם קריאה בלבד."
          open={expensesOpen}
          onToggle={() => setExpensesOpen(value => !value)}
        >
          <ProfitAndLossSection
            startDate={range.startDate}
            endDate={range.endDate}
            expensesOnly
          />
        </CollapsibleSection>
        <CollapsibleSection
          title="מצב מדידה"
          description="בדיקה טכנית של מסירת אירועי רכישה. היא אינה קובעת אם הייתה מכירה ואינה ייחוס לקמפיין."
          open={measurementOpen}
          onToggle={() => setMeasurementOpen(value => !value)}
        >
          <MetaPurchaseDeliveryStatus
            startDate={range.startDate}
            endDate={range.endDate}
          />
        </CollapsibleSection>
        {data && (
          <CollapsibleSection
            title="הערות איכות נתונים"
            description="פירוט מקור הנתונים והסתייגויות לתקופה הנבחרת."
            open={qualityOpen}
            onToggle={() => setQualityOpen(value => !value)}
          >
            <DataQuality data={data} />
          </CollapsibleSection>
        )}
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map(item => (
          <Skeleton key={item} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
function CollapsibleSection({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(25,18,101,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
      >
        <span>
          <span className="block font-black text-[#191265]">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">
            {description}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-[#191265]" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-[#191265]" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
      )}
    </section>
  );
}

function SalesCommandCenter({
  data,
  filteredSales,
  saleFilter,
  setSaleFilter,
  search,
  setSearch,
  expandedOrder,
  setExpandedOrder,
}: {
  data: SalesIntelligence;
  filteredSales: Sale[];
  saleFilter: SaleStatusFilter;
  setSaleFilter: (value: SaleStatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  expandedOrder: number | null;
  setExpandedOrder: (value: number | null) => void;
}) {
  const summary = data.summary;
  const rawOnlyAmount = Math.max(
    0,
    summary.recordedRevenueAgorot -
      summary.includedRevenueAgorot -
      summary.reviewRevenueAgorot
  );
  return (
    <>
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="הכנסה ללא רשומות חשודות"
          value={money(summary.includedRevenueAgorot)}
          highlight="emerald"
          detail={
            <>
              {count(summary.includedCount)} מכירות שנכללו
              {data.products.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  {data.products
                    .slice(0, 2)
                    .map(item => `${item.label} ${count(item.count)}`)
                    .join(" · ")}
                </>
              )}
            </>
          }
        />
        <MetricCard
          label="הוצאות מתועדות"
          value={
            summary.totalExpenseAgorot == null
              ? "לא זמין"
              : money(summary.totalExpenseAgorot)
          }
          highlight="champagne"
          detail={
            summary.expenseComplete
              ? "הסכום כולל את כל ההוצאות שזמינות לתקופה"
              : "חסרים נתוני הוצאות, לכן אין להניח שהסכום מלא"
          }
        />
        <MetricCard
          label="יתרה לפי הנתונים הקיימים"
          value={
            summary.balanceAgorot == null
              ? "לא זמין"
              : money(summary.balanceAgorot)
          }
          detail="אינדיקציה חשבונאית לפי הנתונים הזמינים; לא רווח סופי."
        />
      </section>
      <section className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-black text-[#191265]">תמונת מצב קצרה</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              דיווחי תשלום שהתקבלו באתר: {count(summary.recordedCount)} בסך{" "}
              {money(summary.recordedRevenueAgorot)}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
            <div className="rounded-xl bg-white px-3 py-2 text-slate-700">
              <strong className="block text-[#191265]">
                {money(summary.reviewRevenueAgorot)}
              </strong>
              רשומות לבדיקה
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-slate-700">
              <strong className="block text-[#191265]">
                {count(summary.excludedTests + summary.excludedEstimated)}
              </strong>
              טסטים או הערכות שהוחרגו
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-amber-100 pt-3 text-xs leading-5 text-amber-950">
          סכום הגלם הוא {money(summary.recordedRevenueAgorot)}.{" "}
          {summary.reviewCount > 0
            ? `מתוכו ${count(summary.reviewCount)} רשומות בסך ${money(summary.reviewRevenueAgorot)} מסומנות לבדיקה ואינן בהכנסה המרכזית.`
            : "אין כרגע רשומות שסומנו לבדיקה."}{" "}
          {rawOnlyAmount > 0
            ? `פער נוסף של ${money(rawOnlyAmount)} אינו מסווג כהכנסה שנכללה.`
            : ""}{" "}
          ההתאמה העצמאית ל־Grow עדיין אינה מאושרת.
        </p>
      </section>
      {data.insights.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-3">
          {data.insights.map((insight, index) => (
            <article
              key={`${insight.title}-${index}`}
              className={`rounded-2xl border p-4 shadow-sm ${toneClass(insight.tone)}`}
            >
              <div className="flex gap-2">
                <ToneIcon tone={insight.tone} />
                <div>
                  <h2 className="text-sm font-black">{insight.title}</h2>
                  <p className="mt-1 text-xs leading-5 opacity-90">
                    {insight.detail}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(25,18,101,0.04)] sm:p-5">
        <SectionTitle
          title="מכירות לאורך זמן"
          description="עסקאות מדווחות לפי יום בישראל. הסכום אינו כולל רשומות לבדיקה."
        />
        {data.daily.length === 0 ? (
          <EmptyState text="אין מכירות להצגה בטווח שנבחר." />
        ) : (
          <DailyChart daily={data.daily} />
        )}
      </section>
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(25,18,101,0.04)] sm:p-5">
          <SectionTitle
            title="מוצרים שנמכרו"
            description="פירוט ההכנסה שנכללה לפי מוצר."
          />
          {data.products.length === 0 ? (
            <EmptyState text="אין מוצרים שנמכרו בטווח שנבחר." />
          ) : (
            <div className="space-y-2">
              {data.products.map(product => (
                <div
                  key={product.product}
                  className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {product.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {count(product.count)} מכירות
                    </p>
                  </div>
                  <strong className="whitespace-nowrap text-sm text-[#191265]">
                    {money(product.revenueAgorot)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(25,18,101,0.04)] sm:p-5">
          <SectionTitle
            title="שתי עדשות שיוך"
            description="מציגים מקור גיוס וסגירה בנפרד — לא מחברים ביניהם לסך הכנסה נוסף."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SalesAttributionList sales={data.sales} lens="acquisition" />
            <SalesAttributionList sales={data.sales} lens="closing" />
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            אותה מכירה עשויה לקבל קרדיט בכל עדשה, אך ההכנסה נספרת פעם אחת בלבד.
            מודל האתר אינו זהה לייחוס ב־Ads Manager.
          </p>
        </section>
      </section>
      <Campaigns campaigns={data.campaigns} />
      <AllSales
        sales={filteredSales}
        allSalesCount={data.sales.length}
        saleFilter={saleFilter}
        setSaleFilter={setSaleFilter}
        search={search}
        setSearch={setSearch}
        expandedOrder={expandedOrder}
        setExpandedOrder={setExpandedOrder}
      />
    </>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}
function DailyChart({ daily }: { daily: Daily[] }) {
  const chartData = daily.map(day => ({
    ...day,
    label: calendarDay(day.day),
    revenueShekels: day.revenueAgorot / 100,
  }));
  return (
    <div className="h-64" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="amount"
            orientation="right"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<DailyTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar
            yAxisId="amount"
            dataKey="revenueShekels"
            name="הכנסה שנכללה"
            fill="#312e81"
            radius={[5, 5, 0, 0]}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="count"
            name="מכירות"
            stroke="#c59b3c"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: Daily }[];
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  const day = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg"
    >
      <strong>{label}</strong>
      <p className="mt-1">הכנסה שנכללה: {money(day.revenueAgorot)}</p>
      <p>מכירות: {count(day.count)}</p>
      {day.reviewCount > 0 && (
        <p className="text-amber-800">לבדיקה: {count(day.reviewCount)}</p>
      )}
    </div>
  );
}
function AttributionList({ title, rows }: { title: string; rows: Channel[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black text-[#191265]">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">אין שיוך מקור בטווח.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div
              key={row.channel}
              className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50/60 p-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {row.channel}
                </p>
                <p className="text-[11px] text-slate-500">
                  {count(row.count)} מכירות
                </p>
              </div>
              <strong className="text-sm text-[#191265]">
                {money(row.revenueAgorot)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function SalesAttributionList({ sales, lens }: { sales: Sale[]; lens: "acquisition" | "closing" }) {
  const rows = useMemo(() => {
    const grouped = new Map<string, { count: number; revenueAgorot: number }>();
    sales
      .filter(sale => sale.status === "included")
      .forEach(sale => {
        const key = sale[lens].channel || "ללא שיוך";
        const prior = grouped.get(key) ?? { count: 0, revenueAgorot: 0 };
        grouped.set(key, {
          count: prior.count + 1,
          revenueAgorot: prior.revenueAgorot + sale.amountAgorot,
        });
      });
    return Array.from(grouped, ([channel, value]) => ({
      channel,
      ...value,
    })).sort((a, b) => b.revenueAgorot - a.revenueAgorot);
  }, [sales, lens]);
  return <AttributionList title={lens === "acquisition" ? "מקור הגיוס" : "ערוץ הסגירה"} rows={rows} />;
}

function Campaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(25,18,101,0.04)] sm:p-5">
      <SectionTitle
        title="קמפיין הגיוס → הרכישה"
        description="הקמפיין והערוץ משקפים את שיוך האתר. ההמרות של Meta מוצגות בנפרד, ואין להסיק מהן שהן אותן מכירות."
      />
      {campaigns.length === 0 ? (
        <EmptyState text="אין קמפיינים משויכים בטווח שנבחר." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {campaigns.map((campaign, index) => (
              <CampaignCard
                key={`${campaign.campaign}-${index}`}
                campaign={campaign}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[970px] text-right text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="p-3 font-bold">קמפיין</th>
                  <th className="p-3 font-bold">ערוץ</th>
                  <th className="p-3 text-center font-bold">רכישות</th>
                  <th className="p-3 font-bold">מוצרים</th>
                  <th className="p-3 text-center font-bold">הכנסה</th>
                  <th className="p-3 text-center font-bold">
                    סגירות לאחר מייל
                  </th>
                  <th className="p-3 text-center font-bold">
                    המרות ש־Meta ייחסה
                  </th>
                  <th className="p-3 text-center font-bold">הוצאה</th>
                  <th className="p-3 font-bold">אופן מיפוי</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, index) => (
                  <tr
                    key={`${campaign.campaign}-${index}`}
                    className="border-b border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="max-w-48 p-3 font-bold text-slate-900">
                      {campaign.campaign}
                    </td>
                    <td className="p-3">{campaign.channel}</td>
                    <td className="p-3 text-center font-bold">
                      {count(campaign.count)}
                    </td>
                    <td className="max-w-48 p-3 leading-5">
                      {campaign.products.length
                        ? campaign.products.join(" · ")
                        : "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-[#191265]">
                      {money(campaign.revenueAgorot)}
                    </td>
                    <td className="p-3 text-center">
                      {count(campaign.emailClosedCount)}
                    </td>
                    <td className="p-3 text-center">
                      {campaign.metaPurchases == null
                        ? "לא זמין"
                        : count(campaign.metaPurchases)}
                    </td>
                    <td className="p-3 text-center">
                      {campaign.spendAgorot == null
                        ? "לא זמין"
                        : money(campaign.spendAgorot)}
                    </td>
                    <td className="max-w-52 p-3 leading-5 text-slate-600">
                      {campaign.mapping}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <article className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">{campaign.campaign}</h3>
          <p className="mt-1 text-xs text-slate-500">{campaign.channel}</p>
        </div>
        <strong className="whitespace-nowrap text-[#191265]">
          {money(campaign.revenueAgorot)}
        </strong>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <strong>{count(campaign.count)}</strong>
          <span className="block mt-0.5 text-slate-500">רכישות</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <strong>{count(campaign.emailClosedCount)}</strong>
          <span className="block mt-0.5 text-slate-500">סגירות לאחר מייל</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <strong>
            {campaign.metaPurchases == null
              ? "לא זמין"
              : count(campaign.metaPurchases)}
          </strong>
          <span className="block mt-0.5 text-slate-500">
            המרות ש־Meta ייחסה
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <strong>
            {campaign.spendAgorot == null
              ? "לא זמין"
              : money(campaign.spendAgorot)}
          </strong>
          <span className="block mt-0.5 text-slate-500">הוצאה</span>
        </div>
      </div>
      {campaign.products.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-slate-600">
          <strong>מוצרים:</strong> {campaign.products.join(" · ")}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        {campaign.mapping}
      </p>
    </article>
  );
}

function AllSales({
  sales,
  allSalesCount,
  saleFilter,
  setSaleFilter,
  search,
  setSearch,
  expandedOrder,
  setExpandedOrder,
}: {
  sales: Sale[];
  allSalesCount: number;
  saleFilter: SaleStatusFilter;
  setSaleFilter: (value: SaleStatusFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  expandedOrder: number | null;
  setExpandedOrder: (value: number | null) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(25,18,101,0.04)] sm:p-5">
      <SectionTitle
        title="כל המכירות"
        description={`מוצגות ${count(sales.length)} מתוך ${count(allSalesCount)} מכירות. ללא שמות, כתובות דוא״ל או מזהי לקוחות.`}
      >
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <WalletCards className="h-4 w-4" /> לפי סדר כרונולוגי
        </div>
      </SectionTitle>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" aria-label="סינון סטטוס מכירות">
          {(
            [
              ["all", "הכול"],
              ["included", "נכללו"],
              ["review", "לבדיקה"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSaleFilter(value)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${saleFilter === value ? "bg-[#191265] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:w-80">
          <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="חיפוש מוצר, ערוץ או קמפיין"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
      {sales.length === 0 ? (
        <EmptyState text="אין מכירות התואמות לסינון שבחרת." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sales.map((sale, index) => (
              <SaleCard
                key={`${sale.order}-${index}`}
                sale={sale}
                number={index + 1}
                expanded={expandedOrder === sale.order}
                onToggle={() =>
                  setExpandedOrder(
                    expandedOrder === sale.order ? null : sale.order
                  )
                }
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1010px] text-right text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">תאריך ושעה</th>
                  <th className="p-3">מוצר</th>
                  <th className="p-3">סכום</th>
                  <th className="p-3">מקור גיוס</th>
                  <th className="p-3">ערוץ סגירה</th>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, index) => (
                  <SaleRow
                    key={`${sale.order}-${index}`}
                    sale={sale}
                    number={index + 1}
                    expanded={expandedOrder === sale.order}
                    onToggle={() =>
                      setExpandedOrder(
                        expandedOrder === sale.order ? null : sale.order
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
function SaleStatus({ status }: { status: Sale["status"] }) {
  return status === "included" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
      נכללה
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900">
      לבדיקה
    </span>
  );
}
function SaleCard({
  sale,
  number,
  expanded,
  onToggle,
}: {
  sale: Sale;
  number: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      className={`rounded-xl border p-3 ${sale.status === "review" ? "border-amber-200 bg-amber-50/45 opacity-75" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-slate-500">
            #{number} · {dateTime(sale.paidAt)}
          </p>
          <h3 className="mt-1 font-bold text-slate-900">{sale.productLabel}</h3>
        </div>
        <div className="text-left">
          <strong className="block text-[#191265]">
            {money(sale.amountAgorot)}
          </strong>
          <span className="mt-1 inline-block">
            <SaleStatus status={sale.status} />
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] text-slate-500">גיוס</p>
          <ChannelName
            channel={sale.acquisition.channel}
            campaign={sale.acquisition.campaign}
          />
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] text-slate-500">סגירה</p>
          <ChannelName
            channel={sale.closing.channel}
            campaign={sale.closing.campaign}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="mt-3 flex w-full items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-[#191265]"
      >
        פרטי שיוך ותשלום{" "}
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded && <SaleDetails sale={sale} />}
    </article>
  );
}
function SaleRow({
  sale,
  number,
  expanded,
  onToggle,
}: {
  sale: Sale;
  number: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-slate-100 align-top ${sale.status === "review" ? "bg-amber-50/50 opacity-75" : "hover:bg-slate-50"}`}
      >
        <td className="p-3 text-slate-500">{number}</td>
        <td className="whitespace-nowrap p-3">{dateTime(sale.paidAt)}</td>
        <td className="p-3 font-bold">{sale.productLabel}</td>
        <td className="whitespace-nowrap p-3 font-bold text-[#191265]">
          {money(sale.amountAgorot)}
        </td>
        <td className="p-3">
          <ChannelName
            channel={sale.acquisition.channel}
            campaign={sale.acquisition.campaign}
          />
        </td>
        <td className="p-3">
          <ChannelName
            channel={sale.closing.channel}
            campaign={sale.closing.campaign}
          />
        </td>
        <td className="p-3">
          <SaleStatus status={sale.status} />
        </td>
        <td className="p-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={`פרטי מכירה ${number}`}
            className="rounded-lg p-1.5 text-[#191265] hover:bg-indigo-100"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={8} className="p-3">
            <SaleDetails sale={sale} />
          </td>
        </tr>
      )}
    </>
  );
}
function SaleDetails({ sale }: { sale: Sale }) {
  return (
    <dl className="mt-3 grid gap-2 rounded-lg bg-white/80 p-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
      <Detail label="אסמכתת תשלום" value={sale.paymentEvidence} />
      <Detail label="ביטחון מקור" value={sale.acquisition.confidence} />
      <Detail label="ביטחון סגירה" value={sale.closing.confidence} />
      <Detail
        label="סיוע מייל"
        value={
          sale.emailAssist
            ? `${sale.emailAssist.campaign}${sale.emailAssist.clicked ? " · נלחץ" : ""}${sale.emailAssist.sameDay ? " · באותו יום" : ""}`
            : "לא תועד"
        }
      />
      {sale.lagDays != null && (
        <Detail
          label="הפרש מגיוס לרכישה"
          value={`${count(sale.lagDays)} ימים`}
        />
      )}
    </dl>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
    </div>
  );
}
function DataQuality({ data }: { data: SalesIntelligence }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
      <p>
        <strong>התאמת ספק תשלומים:</strong>{" "}
        {data.quality.providerReconciled ? "בוצעה" : "טרם אושרה"}
      </p>
      <p>
        <strong>שיוך:</strong> {data.quality.attributionNote}
      </p>
      <p>
        <strong>הוצאות:</strong> {data.quality.expenseNote}
      </p>
      {data.quality.metaTimezone && (
        <p>
          <strong>אזור זמן Meta:</strong> {data.quality.metaTimezone}
        </p>
      )}
      {data.quality.notes.length > 0 && (
        <ul className="list-disc space-y-1 pr-5">
          {data.quality.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
