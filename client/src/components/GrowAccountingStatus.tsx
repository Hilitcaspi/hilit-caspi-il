import { trpc } from "@/lib/trpc";
const labels: Record<string,string> = {verified:"אומתו בקריאת Grow",notification_only:"דיווח התקבל; טרם אומת ואינו בהכנסות",review:"ממתינים לבדיקה; לא נוצרה הכנסה חדשה",duplicate_existing:"כבר רשומים בספר העסקאות; לא נספרו שוב"};
export function GrowAccountingStatus({startDate,endDate}:{startDate:number;endDate:number}) {
  const query=trpc.payment.growAccountingStatus.useQuery({startDate,endDate},{enabled:endDate>startDate&&endDate-startDate<=93*86400000,retry:false});
  const rows=query.data?.rows||[];
  const groups: Record<string,{count:number;amount:number}>=rows.reduce((out:Record<string,{count:number;amount:number}>,r:{state:string;count:number;amountAgorot:number})=>{
    const g=out[r.state]||{count:0,amount:0};g.count+=r.count;g.amount+=r.amountAgorot;out[r.state]=g;return out;
  },{});
  return <section className="px-4 pb-4 text-sm" dir="rtl">
    <h3 className="font-bold text-gray-900">רישום תשלומי Grow קדימה</h3>
    <p className="my-2 text-xs leading-5 text-gray-600">כל עסקת ספק מזוהה נרשמת פעם אחת, גם אם מתקבלים דיווחים חוזרים. זהו תיעוד מהמנגנון החדש בלבד, לא הצלבה של כל ההיסטוריה ולא אישור שהתקבלו כל עסקאות Grow.</p>
    {query.isLoading?<p className="text-xs">טוען מצב Grow...</p>:query.error||!query.data?.available?<p className="text-xs text-amber-800">מצב הבירור אינו זמין כרגע.</p>:!rows.length?<p className="text-xs text-gray-500">אין עדיין דיווחים במנגנון החדש בטווח הנבחר.</p>:<div className="grid gap-2 sm:grid-cols-2">{Object.entries(groups).map(([state,g])=><div key={state} className={`rounded-lg p-3 text-xs ${state==="verified"?"bg-emerald-50":state==="review"?"bg-rose-50":"bg-amber-50"}`}><strong>{labels[state]||"מצב נוסף"}</strong><p className="mt-1">{g.count} דיווחים · {(g.amount/100).toLocaleString("he-IL",{style:"currency",currency:"ILS"})}</p></div>)}</div>}
  </section>;
}
