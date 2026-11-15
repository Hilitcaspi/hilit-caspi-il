import { useMemo, useState } from "react";
import { BarChart3, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatIsraelDateRange,
  getIsraelCalendarDaysStart,
} from "@/lib/dashboardDateRange";
import {
  MARKETING_PRODUCT_GROUPS,
  type MarketingProductGroup,
} from "@shared/marketingChannelClassification";
import type {
  AggregateMetric,
  MarketingChannelsReport,
} from "../../../server/marketingChannelsRouter";

/** Inject the registered tRPC hook, not a second client or untyped transport.
 * Integration: useSummary={trpc.marketingChannels.summary.useQuery}.
 * Optional controlled dates share the existing dashboard period; otherwise the
 * local 7/30/90 selector uses Israel calendar midnights through now (exclusive).
 */
type Props = {
  useSummary: (
    input: { startDate: number; endDate: number },
    options: { enabled: boolean; staleTime: number; retry: false }
  ) => {
    data?: MarketingChannelsReport;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  startDate?: number;
  endDate?: number;
};
const number = (value: number) => value.toLocaleString("he-IL");
const money = (value: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(value / 100);
const when = (at: number) =>
  new Date(at).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function valueOf(
  metric: AggregateMetric,
  kind: "number" | "money" | "percent" = "number"
) {
  if (metric.value === null)
    return metric.reason === "small_cell"
      ? "נתון מוסתר לקבוצה קטנה"
      : metric.reason === "complementary_suppression"
        ? "מוסתר להגנת קבוצות קטנות"
        : "לא זמין";
  return kind === "money"
    ? money(metric.value)
    : kind === "percent"
      ? `${(metric.value * 100).toFixed(1)}%`
      : number(metric.value);
}
function Metric({
  label,
  metric,
  kind = "number",
}: {
  label: string;
  metric: AggregateMetric;
  kind?: "number" | "money" | "percent";
}) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs text-slate-600">{label}</p>
      <p
        className={`text-lg font-bold ${metric.value === null ? "text-slate-600" : "text-[#191265]"}`}
      >
        {valueOf(metric, kind)}
      </p>
    </div>
  );
}
export function MarketingChannelsPanel({
  useSummary,
  startDate,
  endDate,
}: Props) {
  const [days, setDays] = useState(30);
  const [now, setNow] = useState(() => Date.now());
  const [productGroup, setProductGroup] =
    useState<MarketingProductGroup>("database");
  const [sourceView, setSourceView] = useState<"first" | "closing">("first");
  const controlled = startDate !== undefined && endDate !== undefined;
  const range = useMemo(
    () => ({
      startDate: controlled ? startDate : getIsraelCalendarDaysStart(days, now),
      endDate: controlled ? endDate : now,
    }),
    [controlled, startDate, endDate, days, now]
  );
  const valid =
    Number.isSafeInteger(range.startDate) &&
    Number.isSafeInteger(range.endDate) &&
    range.endDate > range.startDate &&
    range.endDate - range.startDate <= 93 * 86_400_000;
  const query = useSummary(range, {
    enabled: valid,
    staleTime: 0,
    retry: false,
  });
  const data = query.data;
  const group = data?.groups.find(item => item.group === productGroup);
  const view = data?.views
    .find(item => item.key === sourceView)
    ?.groups.find(item => item.group === productGroup);
  const refresh = () => {
    if (controlled) void query.refetch();
    else setNow(Date.now());
  };
  return (
    <Card
      dir="rtl"
      className="overflow-hidden rounded-2xl border border-violet-100 bg-white text-slate-900 shadow-sm"
    >
      <CardHeader className="gap-4 bg-gradient-to-l from-violet-50 via-[#f4f0ff] to-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#191265] p-2.5 text-white">
              <BarChart3 size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191265]">
                Google ו־YouTube · תמונת מכירות
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                רכישות עם קבלת ספק מאומתת שנשמרה באתר. שיוך מתועד, לא הוכחת
                השפעה של מודעה.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 bg-white text-[#191265]"
            onClick={refresh}
            disabled={query.isFetching || !valid}
          >
            <RefreshCw
              size={14}
              className={
                query.isFetching
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
              aria-hidden="true"
            />
            רענון
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!controlled && (
            <div aria-label="תקופת המדידה" className="flex gap-2">
              {[7, 30, 90].map(period => (
                <Button
                  type="button"
                  key={period}
                  size="sm"
                  variant={period === days ? "default" : "outline"}
                  aria-pressed={period === days}
                  className={
                    period === days
                      ? "bg-[#191265] text-white hover:bg-[#2d1f8a]"
                      : "bg-white text-[#191265]"
                  }
                  onClick={() => {
                    setDays(period);
                    setNow(Date.now());
                  }}
                >
                  {period} ימים
                </Button>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-600">
            {valid
              ? formatIsraelDateRange(range.startDate, range.endDate - 1)
              : "טווח תאריכים לא תקין"}{" "}
            · שעון ישראל · סוף הטווח לא כלול{controlled && " · תקופת הדשבורד"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {!valid && (
          <p
            role="alert"
            className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          >
            טווח המדידה חייב להיות חיובי ועד 93 ימים. לא נשלחה בקשת נתונים.
          </p>
        )}
        {valid && query.isLoading && (
          <div
            role="status"
            aria-label="טוען נתונים מצרפיים"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {[1, 2, 3].map(key => (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ))}
          </div>
        )}
        {valid && !!query.error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-900"
          >
            המדידה אינה זמינה כרגע או שאין הרשאה לצוות/מנהל. אין להציג מידע קודם
            כנתון מעודכן.
          </p>
        )}
        {valid && !query.isLoading && !query.error && !data && (
          <p role="status" className="text-sm text-slate-600">
            לא התקבל מקור מדידה. אין כאן אומדן חלופי.
          </p>
        )}
        {valid && data && !query.error && (
          <>
            <div className="grid gap-2 rounded-xl border border-violet-100 bg-violet-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  "payments",
                  "firstTouch",
                  "closingTouch",
                  "traffic",
                  "googleSpend",
                  "leads",
                  "ga4",
                  "searchConsole",
                  "youtubeAnalytics",
                ] as const
              ).map(key => {
                const labels = {
                  payments: "תשלומים מאומתים באתר",
                  firstTouch: "צילום מגע ראשון",
                  closingTouch: "מגע סגירה",
                  traffic: "אירועי אתר",
                  googleSpend: "הוצאות Google Ads",
                  leads: "קוהורט לידים",
                  ga4: "GA4",
                  searchConsole: "Search Console",
                  youtubeAnalytics: "YouTube Analytics",
                };
                const source = data.sources[key];
                return (
                  <div key={key} className="rounded-lg bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#191265]">{labels[key]}</strong>
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${source.status === "available" ? "bg-emerald-50 text-emerald-800" : source.status === "partial" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600"}`}
                      >
                        {source.status === "available"
                          ? "זמין"
                          : source.status === "partial"
                            ? "חלקי"
                            : "לא זמין"}
                      </span>
                    </div>
                    <p className="mt-2 leading-5 text-slate-600">
                      {source.note}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {source.updatedAt === null
                        ? "אין עדכון מאומת"
                        : `נקרא: ${when(source.updatedAt)}`}
                    </p>
                  </div>
                );
              })}
            </div>
            {data.period.partialToday && (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
                היום הנוכחי חלקי. הנתונים נקראו ב־{when(data.generatedAt)}; אין
                בכך הוכחה שכל אירועי היום נקלטו.
              </p>
            )}
            <Tabs
              value={productGroup}
              onValueChange={value =>
                setProductGroup(value as MarketingProductGroup)
              }
              dir="rtl"
            >
              <TabsList
                className="h-auto w-full flex-wrap justify-start gap-1 bg-violet-50 p-1"
                aria-label="קבוצת מוצר"
              >
                {MARKETING_PRODUCT_GROUPS.map(item => (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className="text-xs data-[state=active]:text-[#191265]"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs
              value={sourceView}
              onValueChange={value =>
                setSourceView(value as "first" | "closing")
              }
              dir="rtl"
            >
              <TabsList
                className="h-auto flex-wrap bg-slate-100"
                aria-label="מבט שיוך"
              >
                <TabsTrigger value="first">המגע הראשון שנשמר</TabsTrigger>
                <TabsTrigger value="closing">מגע הסגירה המתועד</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs leading-6 text-slate-600">
              שני המבטִים מציגים את אותן רכישות. אין לסכום אותם יחד. המגע הראשון
              כולל רק צילום מקור נפרד לפני התשלום; כשהצילום חסר הוא נשאר לא
              ידוע.
            </p>
            {group && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label={`רכישות · ${group.label}`}
                  metric={group.totals.purchases}
                />
                <Metric
                  label="רוכשים שונים עם תשלום מאומת"
                  metric={group.totals.confirmedBuyers}
                />
                <Metric
                  label="סכום ששולם בפועל · ברוטו"
                  metric={group.totals.revenueAgorot}
                  kind="money"
                />
              </div>
            )}
            {data.privacy.breakdownSuppressed && (
              <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-950">
                <ShieldCheck
                  size={18}
                  className="mt-1 shrink-0"
                  aria-hidden="true"
                />
                <p>{data.privacy.note}</p>
              </div>
            )}
            {view && (
              <>
                <div className="overflow-x-auto rounded-xl border border-violet-100">
                  <table className="w-full min-w-[620px] text-right text-sm">
                    <caption className="sr-only">
                      רכישות לפי ערוץ, קבוצת המוצר ומבט השיוך שנבחרו
                    </caption>
                    <thead className="bg-violet-50 text-[#191265]">
                      <tr>
                        <th scope="col" className="p-3">
                          ערוץ
                        </th>
                        <th scope="col" className="p-3">
                          רכישות
                        </th>
                        <th scope="col" className="p-3">
                          רוכשים שונים
                        </th>
                        <th scope="col" className="p-3">
                          הכנסה ברוטו
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.channels.map(row => (
                        <tr
                          key={row.channel}
                          className="border-t border-violet-50 hover:bg-violet-50/40"
                        >
                          <th scope="row" className="p-3 font-medium">
                            {row.label}
                          </th>
                          <td className="p-3">
                            {valueOf(row.totals.purchases)}
                          </td>
                          <td className="p-3">
                            {valueOf(row.totals.confirmedBuyers)}
                          </td>
                          <td className="p-3 font-semibold">
                            {valueOf(row.totals.revenueAgorot, "money")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric
                    label="שיעור רכישות ללא מקור · במבט הנבחר"
                    metric={view.unknownPurchaseShare}
                    kind="percent"
                  />
                  <Metric
                    label="כיסוי צילום מקור ראשון · מתוך רכישות הקבוצה"
                    metric={view.firstSnapshotShare}
                    kind="percent"
                  />
                </div>
                <details className="rounded-xl border border-violet-100">
                  <summary className="cursor-pointer p-4 text-sm font-semibold text-[#191265] focus-visible:outline focus-visible:outline-violet-500">
                    פירוט תת־מוצר · חיובים אמיתיים, לא פתיחת מאגר נוספת
                  </summary>
                  <div className="overflow-x-auto px-4 pb-4">
                    <table className="w-full min-w-[420px] text-right text-xs">
                      <thead>
                        <tr className="border-b text-slate-600">
                          <th className="py-2" scope="col">
                            תת־מוצר
                          </th>
                          <th scope="col">רכישות</th>
                          <th scope="col">ברוטו</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.products.map(product => (
                          <tr
                            key={product.product}
                            className="border-b border-slate-100"
                          >
                            <th className="py-3 font-medium" scope="row">
                              {product.label}
                            </th>
                            <td>{valueOf(product.totals.purchases)}</td>
                            <td>
                              {valueOf(product.totals.revenueAgorot, "money")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            <div className="flex gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4">
              <Unplug
                size={20}
                className="shrink-0 text-violet-700"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-[#191265]">
                  הוצאה, CPA, ROAS ומשפך · לא זמינים
                </h3>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  אין מקור הוצאה מאומת ל־Google/YouTube, ולכן לא מוצגים אפס,
                  תקציב משוער או יחסי יעילות. אין קוהורט לידים אמין לחישוב משפך.
                  Plus ראשון מול חידוש והחזרים אינם זמינים; ההכנסה אינה נטו לאחר
                  החזרים.
                </p>
              </div>
            </div>
            <details className="rounded-xl bg-slate-50">
              <summary className="cursor-pointer p-4 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-violet-500">
                אירועי ביקור באתר · כל המוצרים, לא משפך
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <p className="text-xs leading-6 text-slate-600">
                  {data.traffic.note}
                </p>
                <Metric
                  label="אירועי page_view · לא sessions או אנשים"
                  metric={data.traffic.totalPageViewEvents}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.traffic.channels.map(row => (
                    <p
                      key={row.channel}
                      className="flex justify-between gap-2 rounded-lg bg-white p-3 text-xs"
                    >
                      <span>{row.label}</span>
                      <strong>{valueOf(row.pageViewEvents)}</strong>
                    </p>
                  ))}
                </div>
              </div>
            </details>
            <div className="space-y-2 border-t border-violet-100 pt-4 text-xs leading-6 text-slate-600">
              <p>{data.quality.note}</p>
              <p>{data.quality.exclusions}</p>
              <p>
                אין שמות, מזהים, כתובות דוא״ל, קמפיינים חופשיים או רשומות לקוח
                בתשובת הנתיב הזה. סה״כ כל המוצרים:{" "}
                {valueOf(data.total.purchases)} רכישות;{" "}
                {valueOf(data.total.revenueAgorot, "money")} ברוטו. אין לסכום
                רוכשים שונים בין קבוצות.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
