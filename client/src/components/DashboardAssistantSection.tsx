import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Loader2, Send, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Range = "7d" | "30d" | "month";
const rangeOptions: { value: Range; label: string }[] = [
  { value: "7d", label: "7 ימים" },
  { value: "30d", label: "30 ימים" },
  { value: "month", label: "החודש" },
];
const quickQuestions = ["מה השתנה בתקופה הזו?", "איפה כדאי להתמקד היום?", "אילו חריגים דורשים תשומת לב?", "תני לי סיכום ביצועים קצר"];
function rangeWindow(range: Range) {
  const now = Date.now();
  if (range === "month") {
    const date = new Date();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    return { startDate: startOfMonth, endDate: now };
  }
  const days = range === "7d" ? 7 : 30;
  return { startDate: now - (days - 1) * 24 * 60 * 60 * 1000, endDate: now };
}

function asTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => typeof item === "string" ? item : String((item as any)?.text || (item as any)?.title || "")).filter(Boolean);
  return typeof value === "string" ? [value] : [];
}

export default function DashboardAssistantSection() {
  const api = trpc as any;
  const [range, setRange] = useState<Range>("7d");
  const [question, setQuestion] = useState("");
  const dataWindow = useMemo(() => rangeWindow(range), [range]);
  const snapshot = api.dashboardAssistant.snapshot.useQuery(dataWindow, { refetchOnWindowFocus: false });
  const ask = api.dashboardAssistant.ask.useMutation();
  const answer = ask.data;
  const findings = useMemo(() => asTextList(answer?.keyFindings ?? answer?.findings ?? answer?.highlights), [answer]);
  const cautions = useMemo(() => asTextList(answer?.cautions ?? answer?.warnings), [answer]);

  const submit = () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || ask.isPending) return;
    ask.mutate({ question: cleanQuestion, ...dataWindow });
  };

  return (
    <div dir="rtl" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="border-[#191265]/10 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle className="flex items-center gap-2 text-xl text-[#191265]"><Sparkles className="size-5 text-[#191265]" aria-hidden="true" />שאלי את הדשבורד</CardTitle><CardDescription className="mt-1">סיכום מבוסס על נתוני הדשבורד בלבד. כדאי לאמת החלטות משמעותיות מול המאגר.</CardDescription></div>
            <div className="flex rounded-xl bg-[#f3f2f8] p-1" aria-label="בחירת טווח נתונים">
              {rangeOptions.map(option => <button key={option.value} type="button" onClick={() => setRange(option.value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${range === option.value ? "bg-[#191265] text-white shadow-sm" : "text-[#191265] hover:bg-white"}`}>{option.label}</button>)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[#191265]/10 bg-[#191265]/[0.025] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#191265]"><BarChart3 className="size-4" aria-hidden="true" />תמונת מצב</div>
            {snapshot.isLoading ? <div className="grid gap-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div> : snapshot.error ? <p className="text-sm text-slate-500">לא ניתן לטעון כרגע את תמונת המצב. אפשר עדיין לנסות לשאול שאלה.</p> : <Snapshot data={snapshot.data} />}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-[#191265]">שאלות מהירות</p>
            <div className="flex flex-wrap gap-2">{quickQuestions.map(item => <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full border border-[#191265]/15 bg-white px-3 py-1.5 text-xs text-[#191265] transition hover:border-[#191265]/35 hover:bg-[#fffdf4]">{item}</button>)}</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dashboard-question" className="text-sm font-bold text-[#191265]">מה תרצי לדעת?</label>
            <Textarea id="dashboard-question" value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submit(); }} placeholder="לדוגמה: אילו משימות דורשות טיפול קודם?" className="min-h-28 resize-y border-[#191265]/20 focus-visible:ring-[#ffe27c]" />
            <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Ctrl / ⌘ + Enter לשליחה</span><Button type="button" onClick={submit} disabled={!question.trim() || ask.isPending} className="bg-[#191265] text-white hover:bg-[#191265]/90">{ask.isPending ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Send className="ml-1 size-4" />}שאלי</Button></div>
          </div>

          {ask.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{ask.error.message || "לא התקבלה תשובה. נסי שוב בעוד רגע."}</div>}
          {answer && <Answer answer={answer} findings={findings} cautions={cautions} />}
        </CardContent>
      </Card>

      <Card className="h-fit border-[#191265]/10 bg-[#191265] text-white shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base text-[#ffe27c]">כך משתמשים נכון</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-white/85"><p>בחרי טווח, שאלי שאלה ממוקדת וקבלי תמונת מצב ראשונית.</p><p>התשובה אינה מבצעת פעולה במאגר, אינה שולחת הודעות ואינה מחליפה בדיקה אנושית.</p><Badge className="border-0 bg-white/15 text-white hover:bg-white/15">קריאה בלבד</Badge></CardContent>
      </Card>
    </div>
  );
}

function Snapshot({ data }: { data: any }) {
  const current = data?.overviewWithComparison?.current;
  const meta = data?.metaAdsPerformance?.totals;
  if (!current && !meta) return <p className="text-sm text-slate-500">תמונת המצב תהיה זמינה עם הצטברות נתונים.</p>;
  const money = (value: unknown) => `${Number(value || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪`;
  const stats = [
    { key: "leads", label: "לידים", value: Number(current?.leads || 0).toLocaleString("he-IL") },
    { key: "purchases", label: "רכישות Grow", value: Number(current?.purchases || 0).toLocaleString("he-IL") },
    { key: "revenue", label: "הכנסות Grow", value: money(current?.revenue) },
    { key: "spend", label: "הוצאות Meta", value: money(meta?.totalPaidMediaSpend) },
  ];
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map(stat => <div key={stat.key} className="rounded-xl bg-white p-2"><span className="block text-lg font-bold text-[#191265]">{stat.value}</span><span className="block text-[11px] text-slate-500">{stat.label}</span></div>)}</div>{data?.failedSections?.length > 0 && <p className="text-xs leading-5 text-amber-800">חלק ממקורות הנתונים לא היו זמינים כרגע; העוזר יסמן את רמת הביטחון בתשובה.</p>}</div>;
}

function Answer({ answer, findings, cautions }: { answer: any; findings: string[]; cautions: string[] }) {
  const main = typeof answer?.answer === "string" ? answer.answer : typeof answer?.text === "string" ? answer.text : "";
  return <div className="space-y-4 rounded-2xl border border-[#ffe27c] bg-[#fffdf5] p-4"><div className="flex items-center gap-2"><Sparkles className="size-4 text-[#191265]" aria-hidden="true" /><h3 className="font-bold text-[#191265]">התשובה</h3></div>{main && <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{main}</p>}{findings.length > 0 && <section><h4 className="mb-1 text-sm font-bold text-[#191265]">ממצאים</h4><ul className="space-y-1">{findings.map(item => <li key={item} className="text-sm leading-6 text-slate-700">• {item}</li>)}</ul></section>}{cautions.length > 0 && <section className="rounded-xl bg-amber-50 p-3"><h4 className="mb-1 flex items-center gap-1 text-sm font-bold text-amber-900"><AlertTriangle className="size-4" aria-hidden="true" />לשים לב</h4><ul className="space-y-1">{cautions.map(item => <li key={item} className="text-sm leading-6 text-amber-900">• {item}</li>)}</ul></section>}</div>;
}

export { DashboardAssistantSection };
