import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
const productLabels: Record<string, string> = {
  database: "מאגר", plus: "דאטה פלוס", match_boost: "Boost", live_october: "לייב אוקטובר",
  guide: "מדריך", course: "קורס", coaching: "ליווי אישי", coaching_mas: "ליווי המסע",
  session: "פגישה", bundle_tubav: "חבילת טו באב", bundle_new_year: "חבילת שנה חדשה", live_event: "אירוע לייב",
};
const stateLabels: Record<string, string> = {
  accepted: "Meta אישרה קבלה", pending: "ממתין למסירה", failed: "דורש בדיקה", expired: "חלון מסירה הסתיים",
};
export function MetaPurchaseDeliveryStatus({ startDate, endDate }: { startDate: number; endDate: number }) {
  const query = trpc.payment.measurementStatus.useQuery({ startDate, endDate }, {
    enabled: endDate > startDate && endDate - startDate <= 93 * 86_400_000, retry: false,
  });
  return <Card className="border-0 shadow-sm" id="meta-purchase-delivery">
    <CardHeader className="pb-2"><h3 className="font-bold text-gray-900">מסירת אירועי רכישה ל־Meta · האתר הישראלי</h3></CardHeader>
    <CardContent>
      <p className="mb-3 text-xs leading-5 text-gray-600">המדידה כאן מתחילה מהפעלת המנגנון החדש ואינה משלימה היסטוריה. אישור קבלה מ־Meta אינו מכירה נוספת ואינו ייחוס לקמפיין. טסטים וכרטיסי מתנה ללא חיוב אינם נספרים.</p>
      {endDate - startDate > 93 * 86_400_000 ? <p className="text-xs">לבדיקת המסירה יש לבחור טווח של עד 93 ימים.</p>
        : query.isLoading ? <p className="text-xs">טוען מצב מסירה...</p>
        : query.error || !query.data?.available ? <p className="text-xs text-amber-800">תיעוד המסירה אינו זמין כרגע. אין להסיק מכך שלא היו מכירות.</p>
        : query.data.rows.length === 0 ? <p className="text-xs text-gray-500">אין עדיין אירועים מתועדים בטווח הנבחר. אין שחזור של עסקאות מלפני ההפעלה.</p>
        : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{query.data.rows.map(row => <div key={`${row.product}-${row.state}`} className="rounded-lg bg-indigo-50 p-3 text-xs">
          <strong>{productLabels[row.product] || "מוצר נוסף"}</strong><div className="mt-1">{stateLabels[row.state]}: {Number(row.count)}</div>
        </div>)}</div>}
    </CardContent>
  </Card>;
}
