import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesIntelligence } from "../../../server/salesIntelligence";

const money = (agorot: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(agorot / 100);
const when = (at: number) => new Date(at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const channel = (value: string) => value === "Email" ? "מייל" : value;
const hasOriginal = (sale: SalesIntelligence["sales"][number]) => sale.acquisition.campaign !== sale.closing.campaign && sale.acquisition.channel !== "ישיר / לא ידוע" && !sale.acquisition.confidence.includes("לא נמצא מקור קודם");

export function SalesSourcesTable({ data, loading, error }: { data?: SalesIntelligence; loading: boolean; error: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => [...(data?.sales || [])].reverse().filter(sale =>
    (status === "all" || sale.status === status) && [sale.buyerName, sale.productLabel, sale.closing.channel, sale.closing.campaign, sale.acquisition.campaign, sale.creative].filter(Boolean).join(" ").toLocaleLowerCase("he-IL").includes(search.trim().toLocaleLowerCase("he-IL"))
  ), [data?.sales, search, status]);
  return <Card id="sales-sources" className="border-0 shadow-sm">
    <CardHeader className="pb-3">
      <h3 className="font-bold text-gray-900">מאיפה הגיעה כל רכישה</h3>
      <p className="text-xs leading-5 text-gray-500">כל מכירה, המוצר שנרכש והקישור האחרון שתועד לפני התשלום. קמפיין מקורי יוצג בנוסף כשיש מקור מוקדם מתועד. שם הרוכש מוצג לצוות מורשה בלבד.</p>
      <div className="flex flex-wrap gap-2">
        <input aria-label="חיפוש ברכישות" placeholder="חיפוש לפי רוכש, מוצר או קמפיין" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs" />
        <select aria-label="סינון מצב רכישה" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"><option value="all">כל הרשומות</option><option value="included">נכללו בהכנסה</option><option value="review">לבדיקה מול Grow</option></select>
      </div>
    </CardHeader>
    <CardContent>
      {loading && <Skeleton className="h-48 rounded-lg" />}
      {error && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">נתוני הרכישות אינם זמינים כרגע. אפשר לרענן, ולא מוצגים אפסים במקום נתונים חסרים.</p>}
      {data && <>
        <p className="mb-3 text-xs text-gray-600">{data.summary.includedCount} מכירות שנכללו בסך {money(data.summary.includedRevenueAgorot)}{data.summary.reviewCount > 0 && ` · ${data.summary.reviewCount} רשומות בסך ${money(data.summary.reviewRevenueAgorot)} לבדיקה, לא בסכום הראשי`}</p>
        <div className="space-y-3 md:hidden">
          {rows.map(sale => <article key={sale.order} className="rounded-lg border border-gray-100 bg-white p-3 text-xs">
            <div className="flex justify-between gap-2"><strong>{sale.buyerName || "שם לא זמין"}</strong><strong className="whitespace-nowrap text-emerald-700">{money(sale.amountAgorot)}</strong></div>
            <p className="mt-1 text-gray-500">{when(sale.paidAt)} · {sale.productLabel}</p>
            <div className="mt-2 leading-5"><strong>{channel(sale.closing.channel)}</strong> · {sale.closing.campaign}</div>
            {hasOriginal(sale) && <p className="mt-1 leading-5 text-gray-500">הגיע במקור: {channel(sale.acquisition.channel)} · {sale.acquisition.campaign}</p>}
            <p className="mt-1 text-gray-500">מודעה / תוכן: {sale.creative || "לא תועד"}</p>
            {sale.coupon && <p className="mt-1 text-gray-500">קוד: {sale.coupon}</p>}
            <p className={`mt-2 ${sale.status === "review" ? "text-amber-800" : "text-green-700"}`}>{sale.status === "review" ? "לבדיקה מול Grow" : "נכללה"}</p>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-right text-xs">
            <thead><tr className="border-b text-gray-500"><th className="py-2">מועד</th><th className="py-2">רוכש</th><th className="py-2">מוצר</th><th className="py-2">סכום</th><th className="py-2">מאיפה הגיעה הרכישה</th><th className="py-2">מודעה / תוכן מתויג</th><th className="py-2">מצב</th></tr></thead>
            <tbody>{rows.map(sale => <tr key={sale.order} className="border-b border-gray-100 align-top hover:bg-gray-50">
              <td className="py-3 pl-3 whitespace-nowrap">{when(sale.paidAt)}</td>
              <td className="py-3 pl-3 font-semibold">{sale.buyerName || "שם לא זמין"}</td>
              <td className="py-3 pl-3">{sale.productLabel}{sale.coupon && <div className="mt-1 text-gray-400">קוד: {sale.coupon}</div>}</td>
              <td className="py-3 pl-3 font-bold text-emerald-700 whitespace-nowrap">{money(sale.amountAgorot)}</td>
              <td className="max-w-[300px] py-3 pl-3 leading-5"><strong>{channel(sale.closing.channel)}</strong><div>{sale.closing.campaign}</div>{hasOriginal(sale) && <div className="mt-1 text-gray-500">הגיע במקור: {channel(sale.acquisition.channel)} · {sale.acquisition.campaign}</div>}<div className="mt-1 text-[10px] text-gray-400">{sale.closing.confidence}</div></td>
              <td className="max-w-[180px] py-3 pl-3 break-words">{sale.creative || "לא תועד"}</td>
              <td className="py-3"><span className={`rounded-md px-2 py-1 ${sale.status === "review" ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>{sale.status === "review" ? "לבדיקה מול Grow" : "נכללה"}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <p className="py-6 text-center text-sm text-gray-500">אין רכישות להצגה לפי הסינון שנבחר.</p>}
        <p className="mt-3 text-[10px] leading-5 text-gray-500">דיווחי תשלום שהתקבלו באתר. ההתאמה העצמאית ל־Grow עדיין אינה מאושרת. כשלא נשמר מקור או תג מודעה, מוצג לא ידוע ולא מנחשים. תג תוכן אינו בהכרח שם המודעה ב־Meta; מודל האתר אינו זהה לייחוס ב־Ads Manager.</p>
      </>}
    </CardContent>
  </Card>;
}
