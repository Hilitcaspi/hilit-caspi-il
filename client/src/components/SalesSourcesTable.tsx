import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesIntelligence } from "../../../server/salesIntelligence";
import { presentSalesSource, salesSourceJourney, summarizeSalesSources, explainSalesSourceEvidence, type SalesSourceGroup } from "../../../shared/salesSourcePresentation";

import { DEFAULT_SALES_PRODUCT, SALES_PRODUCT_CHOICES, filterSalesByProduct, summarizeProductSales, additionalSalesProducts, type SalesProductFilter } from "../../../shared/salesProductPresentation";

const money = (agorot: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(agorot / 100);
const when = (at: number) => new Date(at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const palettes: Record<SalesSourceGroup, { card: string; badge: string; dot: string }> = {
  meta: { card: "border-blue-200 bg-blue-50 text-blue-950", badge: "bg-blue-100 text-blue-900", dot: "bg-blue-500" },
  instagram: { card: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950", badge: "bg-fuchsia-100 text-fuchsia-900", dot: "bg-fuchsia-500" },
  facebook: { card: "border-cyan-200 bg-cyan-50 text-cyan-950", badge: "bg-cyan-100 text-cyan-900", dot: "bg-cyan-500" },
  google_ads: { card: "border-amber-200 bg-amber-50 text-amber-950", badge: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  google: { card: "border-yellow-200 bg-yellow-50 text-yellow-950", badge: "bg-yellow-100 text-yellow-900", dot: "bg-yellow-500" },
  whatsapp: { card: "border-emerald-200 bg-emerald-50 text-emerald-950", badge: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500" },
  sms: { card: "border-teal-200 bg-teal-50 text-teal-950", badge: "bg-teal-100 text-teal-900", dot: "bg-teal-500" },
  email: { card: "border-violet-200 bg-violet-50 text-violet-950", badge: "bg-violet-100 text-violet-900", dot: "bg-violet-500" },
  onsite: { card: "border-orange-200 bg-orange-50 text-orange-950", badge: "bg-orange-100 text-orange-900", dot: "bg-orange-500" },
  renewal: { card: "border-indigo-200 bg-indigo-50 text-indigo-950", badge: "bg-indigo-100 text-indigo-900", dot: "bg-indigo-500" },
  referral: { card: "border-lime-200 bg-lime-50 text-lime-950", badge: "bg-lime-100 text-lime-900", dot: "bg-lime-500" },
  other: { card: "border-stone-200 bg-stone-50 text-stone-950", badge: "bg-stone-100 text-stone-900", dot: "bg-stone-500" },
  unknown: { card: "border-slate-200 bg-slate-50 text-slate-900", badge: "bg-slate-100 text-slate-800", dot: "bg-slate-500" },
};
type Sale = SalesIntelligence["sales"][number];
function SourceDetails({ sale }: { sale: Sale }) {
  const journey = salesSourceJourney(sale);
  const display = presentSalesSource(sale);
  return <details className="group mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
    <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"><ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />מסלול הרכישה</summary>
    <div className="mt-3 space-y-2 border-r-2 border-gray-200 pr-3 leading-5">
      <p><span className="text-gray-500">הקישור שממנו הושלמה הרכישה: </span><strong>{journey.closingLabel}</strong></p>
      {journey.closingDetail && <p className="text-gray-600">{journey.closingDetail}</p>}
      {journey.acquisitionRecorded ? <>
        <p><span className="text-gray-500">איך הגיעו אלינו קודם: </span><strong>{journey.acquisitionLabel}</strong></p>
        {journey.acquisitionCampaign && <p>קמפיין מקור: {journey.acquisitionCampaign}</p>}
        {sale.acquisition.creative && <p>מודעת מקור: {sale.acquisition.creative}</p>}
      </> : <p className="text-gray-600">לא תועד איך נחשפו אלינו לראשונה. זה לא ערוץ נוסף ולא אומר שהגיעו בלי פרסום.</p>}
      {sale.emailAssist?.clicked && !journey.emailClosed && <p className="text-gray-600">תועד גם קליק במייל לפני התשלום: {sale.emailAssist.campaign}. הרכישה לא נספרה פעמיים.</p>}
      <p className="text-gray-600">{explainSalesSourceEvidence(sale)}</p>
      <details className="rounded-md bg-white p-2 text-[11px] text-gray-500">
        <summary className="cursor-pointer focus-visible:outline focus-visible:outline-indigo-400">פרטי המדידה (לפי הצורך)</summary>
        <p className="mt-2">תיעוד הקישור: {journey.evidence}</p>
        {display.creative && <p>תג קישור או שם מודעה: <bdi>{display.creative}</bdi></p>}
        {display.creative && sale.closing.channel !== "Meta Ads (ממומן)" && <p>תג קישור לבדו אינו מזהה מודעה ולא מוכיח שזה קמפיין ממומן.</p>}
      </details>
    </div>
  </details>;
}
function SourceBadge({ sale }: { sale: Sale }) {
  const journey = salesSourceJourney(sale);
  return <div className="flex flex-wrap items-center gap-2 leading-5">
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${palettes[journey.group].badge}`}><span className={`h-1.5 w-1.5 rounded-full ${palettes[journey.group].dot}`} aria-hidden="true" />{journey.label}</span>
    {journey.emailClosed && <span className="text-violet-700">(נסגר במייל)</span>}
  </div>;
}
export function SalesSourcesTable({ data, loading, error }: { data?: SalesIntelligence; loading: boolean; error: boolean }) {
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<SalesProductFilter>(DEFAULT_SALES_PRODUCT);
  const [status, setStatus] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState<SalesSourceGroup | null>(null);
  const productSales = useMemo(() => filterSalesByProduct(data?.sales || [], product), [data?.sales, product]);
  const productSummary = useMemo(() => summarizeProductSales(productSales), [productSales]);
  const extraProducts = useMemo(() => additionalSalesProducts(data?.sales || []), [data?.sales]);
  const productLabel = SALES_PRODUCT_CHOICES.find(choice => choice.value === product)?.label || extraProducts.find(choice => choice.value === product)?.label || "מוצר";
  const totals = useMemo(() => summarizeSalesSources(productSales), [productSales]);
  const effectiveGroup = totals.some(total => total.group === selectedGroup) ? selectedGroup : null;
  const rows = useMemo(() => [...productSales].reverse().filter(sale => {
    const source = presentSalesSource(sale);
    const journey = salesSourceJourney(sale);
    return (status === "all" || sale.status === status) && (!effectiveGroup || journey.group === effectiveGroup)
      && [sale.buyerName, sale.productLabel, sale.closing.channel, sale.closing.campaign, sale.acquisition.campaign, sale.acquisition.creative, sale.creative, source.title, source.detail, journey.label].filter(Boolean).join(" ").toLocaleLowerCase("he-IL").includes(search.trim().toLocaleLowerCase("he-IL"));
  }), [productSales, search, status, effectiveGroup]);
  return <Card id="sales-sources" className="border-0 shadow-sm">
    <CardHeader className="pb-3">
      <h3 className="font-bold text-gray-900">מאיפה הגיעה כל רכישה</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-gray-500">הרכישות והערוצים כאן מוצגים לפי המוצר שנבחר. מאגר הוא ברירת המחדל.</p>
        <div className="min-w-0 w-full sm:w-auto">
          <label htmlFor="sales-product" className="mb-1 block text-xs font-semibold text-gray-700">איזה מוצר להציג?</label>
          <select id="sales-product" aria-label="בחירת מוצר ברכישות" value={product} onChange={event => { setProduct(event.target.value as SalesProductFilter); setSelectedGroup(null); }} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-950 sm:min-w-[220px]">
            {SALES_PRODUCT_CHOICES.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            {extraProducts.length > 0 && <optgroup label="מוצר נוסף בנפרד">{extraProducts.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</optgroup>}
          </select>
        </div>
      </div>
      <p className="text-xs leading-5 text-gray-500">כל רכישה נספרת פעם אחת. רכישה שהחלה במודעה והסתיימה במייל מופיעה תחת מקור המודעה, אם הוא מתועד, עם סימון ״נסגר במייל״.</p>
      {data && totals.length > 0 && <section aria-label="סיכום רכישות לפי מקור" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {totals.map(total => <button key={total.group} type="button" aria-pressed={effectiveGroup === total.group} onClick={() => setSelectedGroup(effectiveGroup === total.group ? null : total.group)} className={`min-w-0 rounded-xl border p-3 text-right transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${palettes[total.group].card} ${effectiveGroup === total.group ? "ring-2 ring-indigo-400" : "hover:shadow-sm"}`}>
          <span className="flex items-center gap-2 text-xs font-semibold"><span className={`h-2 w-2 shrink-0 rounded-full ${palettes[total.group].dot}`} aria-hidden="true" />{total.label}</span>
          <span className="mt-2 block text-xl font-bold">{total.count} <span className="text-xs font-normal">{total.count === 1 ? "רכישה" : "רכישות"}</span></span>
          <span className="mt-1 block text-xs">{money(total.revenueAgorot)}</span>
          <span className="mt-1 block text-[11px]">({total.emailClosedCount} {total.emailClosedCount === 1 ? "נסגרה" : "נסגרו"} במייל)</span>
          {total.closingOnlyCount > 0 && <span className="mt-1 block text-[10px] opacity-75">{total.group === "unknown" ? "לא נשמר מאיזה ערוץ הגיעו" : `ב־${total.closingOnlyCount} ידוע ערוץ הסגירה בלבד`}</span>}
        </button>)}
      </section>}
      {effectiveGroup && <button type="button" onClick={() => setSelectedGroup(null)} className="self-start text-xs font-medium text-indigo-700 underline">הצגת כל המקורות</button>}
      <p className="text-[10px] leading-5 text-gray-500">לחיצה על ערוץ מסננת את הרשימה. הסיכום מתייחס רק למוצר שנבחר ולתקופה שנבחרה, ואינו משתנה בזמן חיפוש. רשומות שבבירור אינן נכללות בסיכום.</p>
      <div className="flex flex-wrap gap-2">
        <input aria-label="חיפוש ברכישות" placeholder="חיפוש לפי רוכש, מוצר או קמפיין" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs" />
        <select aria-label="סינון מצב רכישה" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"><option value="all">כל הרשומות</option><option value="included">נכללו בהכנסה</option><option value="review">לבדיקה מול Grow</option></select>
      </div>
    </CardHeader>
    <CardContent>
      {loading && <Skeleton className="h-48 rounded-lg" />}
      {error && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">נתוני הרכישות אינם זמינים כרגע. אפשר לרענן, ולא מוצגים אפסים במקום נתונים חסרים.</p>}
      {data && <>
        <p aria-live="polite" className="mb-3 text-xs text-gray-600">{productLabel}: {productSummary.includedCount} רכישות שנכללו בסך {money(productSummary.includedRevenueAgorot)}{productSummary.reviewCount > 0 && ` · ${productSummary.reviewCount} רשומות בסך ${money(productSummary.reviewRevenueAgorot)} לבדיקה, לא בסכום הראשי`}</p>
        {(product === "boost" || product === "plus") && <p className="mb-3 rounded-lg bg-indigo-50 p-2 text-xs leading-5 text-indigo-900">{product === "boost" ? "רכישות Boost מוצגות בנפרד ממכירות המאגר. אזור אישי מסומן רק כשנשמר תיעוד כניסה מתאים, ולא לפי סוג המוצר." : "רכישות פלוס וחידושי מנוי מוצגים בנפרד ממכירות המאגר. חידוש מסומן רק כשזוהה בתיעוד."}</p>}
        {totals.some(total => total.group === "unknown") && <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-700">״ערוץ ההגעה לא תועד״: התשלום מופיע באתר, אבל לא נשמר מידע שמזהה אם הגיעו ממודעה, ממייל או מקישור אחר. לא משייכים אותו לקמפיין על סמך ניחוש.</p>}
        <div className="space-y-3 md:hidden">
          {rows.map(sale => <article key={sale.order} className={`rounded-xl border bg-white p-3 text-xs ${palettes[salesSourceJourney(sale).group].card.split(" ")[0]}`}>
            <div className="flex justify-between gap-2"><strong>{sale.buyerName || "שם לא זמין"}</strong><strong className="whitespace-nowrap text-emerald-700">{money(sale.amountAgorot)}</strong></div>
            <p className="mt-1 text-gray-500">{when(sale.paidAt)} · {sale.productLabel}</p>
            <div className="mt-2"><SourceBadge sale={sale} /></div>
            <SourceDetails sale={sale} />
            {sale.coupon && <p className="mt-1 text-gray-500">קוד: {sale.coupon}</p>}
            <p className={`mt-2 ${sale.status === "review" ? "text-amber-800" : "text-green-700"}`}>{sale.status === "review" ? "לבדיקה מול Grow" : "נכללה בהכנסה באתר"}</p>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-right text-xs">
            <thead><tr className="border-b text-gray-500"><th className="py-2">מועד</th><th className="py-2">רוכש</th><th className="py-2">מוצר</th><th className="py-2">סכום</th><th className="py-2">מאיפה הגיעו לרכישה</th><th className="py-2">מצב</th></tr></thead>
            <tbody>{rows.map(sale => <tr key={sale.order} className="border-b border-gray-100 align-top hover:bg-gray-50">
              <td className="py-3 pl-3 whitespace-nowrap">{when(sale.paidAt)}</td>
              <td className="py-3 pl-3 font-semibold">{sale.buyerName || "שם לא זמין"}</td>
              <td className="py-3 pl-3">{sale.productLabel}{sale.coupon && <div className="mt-1 text-gray-400">קוד: {sale.coupon}</div>}</td>
              <td className="py-3 pl-3 font-bold text-emerald-700 whitespace-nowrap">{money(sale.amountAgorot)}</td>
              <td className="max-w-[400px] py-3 pl-3 leading-5"><SourceBadge sale={sale} /><SourceDetails sale={sale} /></td>
              <td className="py-3"><span className={`rounded-md px-2 py-1 ${sale.status === "review" ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>{sale.status === "review" ? "לבדיקה מול Grow" : "נכללה בהכנסה באתר"}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <p className="py-6 text-center text-sm text-gray-500">אין רכישות להצגה לפי הסינון שנבחר.</p>}
        <p className="mt-3 text-[10px] leading-5 text-gray-500">הסינון כאן משנה רק את רשימת הרכישות וסיכום הערוצים שלה. יתר מדדי הדאשבורד מתייחסים לכל המוצרים. בדיקת התשלום מול Grow נפרדת מזיהוי מקור ההגעה; מודל האתר אינו זהה לייחוס ב־Ads Manager.</p>
      </>}
    </CardContent>
  </Card>;
}
