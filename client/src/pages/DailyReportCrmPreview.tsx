import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Database, MessageSquareText, ShieldCheck } from "lucide-react";

const SAMPLE_MESSAGE = `סיכום האתר הישראלי | 1.9.2026
הכנסה: ₪1,566 היום | ₪1,566 החודש | יעד הכנסה טרם הוגדר
מאגר: 5 היום, חסר 7 ליעד 11.7 | 5/350 בחודש, חסר 345
Boost: 5 היום | 5 בחודש | יעד טרם הוגדר | הכנסה ₪100
באנדל חג: 1 היום | 1 בחודש | יעד טרם הוגדר | הכנסה ₪1
לידים: 70 היום | 70 בחודש | יעד טרם הוגדר
עוקבים חדשים באינסטגרם: 0
Meta מכירות: ₪139 היום | ₪139 החודש, נותר ₪9,861 | CPA ₪23 | ROAS כללי 10.55x
Meta Boost: ₪78 היום | ₪78 החודש | CPA ₪16 | ROAS 1.28x
התאמות: 53 נשלחו | זוג אחד אמר כן
מאגר: 406 מעל 14 יום בלי התאמה | 238 עם פרטים חסרים
אזהרות: מאגר מתחת ליעד היומי ב־7 רכישות; מאגר בפער קצב של 7 רכישות
הערה: CPA ו־ROAS מבוססים על הוצאה והכנסה מאומתות, ללא ייחוס מלא ברמת עסקה.`;

export default function DailyReportCrmPreview() {
  const cards = [
    ["הכנסה ששולמה", "₪1,566", "₪1,566 החודש"],
    ["רכישות מאגר", "5", "5 החודש"],
    ["רכישות Boost", "5", "5 החודש"],
    ["באנדל חג", "1", "1 החודש"],
    ["התאמות שנשלחו", "53", "כל זוג נספר פעם אחת"],
    ["שני הצדדים אמרו כן", "1", "לפי מועד האישור ההדדי"],
    ["מעל 14 יום ללא התאמה", "406", "פעילים ומשלמים"],
    ["פרטים חסרים", "238", "הגדרה מחמירה"],
  ];
  const sources = ["Grow תשלומים מאומתים", "CRM לידים", "CRM התאמות", "מאגר פעיל", "Meta חשבון ראשי", "Meta חשבון Boost", "Instagram עוקבים"];
  return (
    <main dir="rtl" className="min-h-screen bg-[#f3efe4] p-4 text-[#191265] md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>תצוגת אישור בטוחה:</strong> נתונים מצרפיים שנשלפו עבור 1.9.2026, ללא שמות, מספרי טלפון או פרטי לקוחות. אין בדף הזה יכולת שליחה או שמירה.
        </div>
        <section className="overflow-hidden rounded-3xl bg-[#191265] p-6 text-white shadow-lg">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div><div className="mb-2 flex gap-2"><span className="rounded-full bg-[#ffe27c] px-3 py-1 text-xs font-black text-[#191265]">SMS כבוי</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">הדגמה בלבד</span></div><h1 className="text-3xl font-black">דוח חצות יומי</h1><p className="mt-2 text-sm leading-6 text-white/75">מסכם את היום שהסתיים. מקור חסר מסומן ולא מוערך.</p></div>
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center"><Clock3 className="mx-auto text-[#ffe27c]"/><p className="mt-1 text-xl font-black">00:00</p><p className="text-xs text-white/60">שעון ישראל</p></div>
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value,detail]) => <div key={label} className="rounded-2xl border border-[#e6e1d6] bg-white p-4 shadow-sm"><p className="text-xs font-bold text-[#727272]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-[#727272]">{detail}</p></div>)}</section>
        <section className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
          <div className="rounded-3xl border border-[#e6e1d6] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black"><MessageSquareText size={20}/> הודעת ה־SMS המדויקת</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">הדגמה</span></div><pre className="whitespace-pre-wrap rounded-2xl bg-[#f5f2ea] p-4 font-sans text-sm leading-7">{SAMPLE_MESSAGE}</pre><div className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><ShieldCheck size={15}/> לא נשלח SMS</div></div>
          <div className="rounded-3xl border border-[#e6e1d6] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Database size={20}/> מקורות וטריות</h2><div className="mt-4 space-y-2">{sources.map(source => <div key={source} className="flex items-center justify-between rounded-xl border border-[#efede6] p-3"><span className="text-sm font-bold">{source}</span><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12}/>מחובר</span></div>)}</div><div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0"/>אם מקור חיצוני לא מגיב בזמן, הדוח מציג „לא זמין” במקום מספר משוער.</div></div>
        </section>
        <section className="rounded-3xl border border-[#e6e1d6] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><BarChart3 size={20}/> יעדים שניתנים לעריכה</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["מאגר מינימום","350"],["מאגר עבודה","400"],["תקציב מאגר","₪10,000"],["Boost","טרם הוגדר"],["באנדל","טרם הוגדר"],["לידים","טרם הוגדר"],["הכנסה","טרם הוגדר"],["נמען","לא הוגדר"]].map(([label,value]) => <div key={label} className="rounded-xl bg-[#f8f6f0] p-3"><p className="text-xs text-[#727272]">{label}</p><p className="mt-1 font-black">{value}</p></div>)}</div></section>
      </div>
    </main>
  );
}
