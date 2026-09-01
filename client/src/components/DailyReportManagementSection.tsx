import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Database, MessageSquareText, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

function shekels(agorot: number | null | undefined) {
  if (agorot === null || agorot === undefined) return "לא זמין";
  return `₪${Math.round(agorot / 100).toLocaleString("he-IL")}`;
}

function numericOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

export default function DailyReportManagementSection() {
  const utils = trpc.useUtils();
  const overview = trpc.dailyReport.overview.useQuery(undefined, { refetchOnWindowFocus: false });
  const [recipientPhone, setRecipientPhone] = useState("");
  const [databaseMin, setDatabaseMin] = useState("350");
  const [databaseStretch, setDatabaseStretch] = useState("400");
  const [databaseBudget, setDatabaseBudget] = useState("10000");
  const [boostTarget, setBoostTarget] = useState("");
  const [bundleTarget, setBundleTarget] = useState("");
  const [leadTarget, setLeadTarget] = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");

  useEffect(() => {
    const settings = overview.data?.settings;
    if (!settings) return;
    setDatabaseMin(String(settings.databaseMonthlyMinTarget));
    setDatabaseStretch(String(settings.databaseMonthlyStretchTarget));
    setDatabaseBudget(String(Math.round(settings.databaseMonthlyBudgetAgorot / 100)));
    setBoostTarget(settings.boostMonthlyTarget === null ? "" : String(settings.boostMonthlyTarget));
    setBundleTarget(settings.bundleMonthlyTarget === null ? "" : String(settings.bundleMonthlyTarget));
    setLeadTarget(settings.leadMonthlyTarget === null ? "" : String(settings.leadMonthlyTarget));
    setRevenueTarget(settings.revenueMonthlyTargetAgorot === null ? "" : String(Math.round(settings.revenueMonthlyTargetAgorot / 100)));
  }, [overview.data?.settings]);

  const updateSettings = trpc.dailyReport.updateSettings.useMutation({
    onSuccess: async () => {
      toast.success("ההגדרות נשמרו. השליחה נשארה כבויה.");
      setRecipientPhone("");
      await utils.dailyReport.overview.invalidate();
    },
    onError: error => toast.error(error.message || "לא ניתן לשמור את ההגדרות"),
  });
  const saveDryRun = trpc.dailyReport.saveDryRun.useMutation({
    onSuccess: async () => {
      toast.success("ריצת הדגמה נשמרה. לא נשלח SMS.");
      await utils.dailyReport.overview.invalidate();
    },
    onError: error => toast.error(error.message || "לא ניתן לשמור ריצת הדגמה"),
  });

  const data = overview.data;
  const metrics = data?.preview.metrics;
  const sourceRows = useMemo(() => data ? Object.entries(data.preview.sources) : [], [data]);

  if (overview.isLoading) {
    return <div className="rounded-2xl bg-white p-10 text-center text-[#727272]">טוען דוח ומקורות מאומתים…</div>;
  }
  if (overview.error || !data || !metrics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-bold">לא ניתן לטעון את הדוח</p>
        <p className="mt-1 text-sm">{overview.error?.message || "מקור הנתונים אינו זמין כרגע"}</p>
        <Button className="mt-4" variant="outline" onClick={() => overview.refetch()}><RefreshCw size={15} /> ניסיון נוסף</Button>
      </div>
    );
  }

  const cards = [
    { label: "הכנסה ששולמה", value: shekels(metrics.revenueTodayAgorot), detail: `${shekels(metrics.revenueMonthAgorot)} החודש` },
    { label: "רכישות מאגר", value: metrics.databasePurchasesToday, detail: `${metrics.databasePurchasesMonth} החודש` },
    { label: "רכישות Boost", value: metrics.boostPurchasesToday, detail: `${metrics.boostPurchasesMonth} החודש` },
    { label: "באנדל חג", value: metrics.bundlePurchasesToday, detail: `${metrics.bundlePurchasesMonth} החודש` },
    { label: "לידים", value: metrics.leadsToday, detail: `${metrics.leadsMonth} החודש` },
    { label: "התאמות שנשלחו", value: metrics.matchesSentToday, detail: "כל זוג נספר פעם אחת" },
    { label: "שני הצדדים אמרו כן", value: metrics.matchesMutualYesToday, detail: "לפי מועד האישור ההדדי" },
    { label: "מעל 14 יום ללא התאמה", value: metrics.activeSinglesNoMatch14Days, detail: "חברי מאגר פעילים ומשלמים" },
    { label: "פרטים חסרים", value: metrics.activeSinglesMissingDetails, detail: "לפי הגדרת השלמות המחמירה" },
  ];

  return (
    <section dir="rtl" className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-[#191265] text-white shadow-lg">
        <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ffe27c] px-3 py-1 text-xs font-black text-[#191265]">SMS כבוי</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">מצב הדגמה בלבד</span>
            </div>
            <h2 className="text-2xl font-black">דוח חצות יומי</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">מסכם את היום שהסתיים לפי שעון ישראל. המספרים מבוססים על Grow, ה־CRM ו־Meta; מקור חסר מסומן ולא מוערך.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center">
            <Clock3 className="mx-auto mb-1 text-[#ffe27c]" size={22} />
            <p className="text-lg font-black">00:00</p>
            <p className="text-xs text-white/60">Asia/Jerusalem</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-[#ebe8df] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-[#727272]">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#191265]">{card.value}</p>
            <p className="mt-1 text-xs text-[#727272]">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
        <div className="rounded-3xl border border-[#e8e5dc] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-[#191265]"><MessageSquareText size={19} /> הודעת ה־SMS המדויקת</h3>
              <p className="mt-1 text-xs text-[#727272]">זה הנוסח שיישלח רק לאחר אישור מפורש והפעלת התזמון.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{data.preview.message.length} תווים</span>
          </div>
          <pre className="whitespace-pre-wrap rounded-2xl bg-[#f5f2ea] p-4 font-sans text-sm leading-7 text-[#191265]">{data.preview.message}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => saveDryRun.mutate()} disabled={saveDryRun.isPending} className="bg-[#191265] text-white hover:bg-[#2a2177]">
              <ShieldCheck size={16} /> {saveDryRun.isPending ? "שומר…" : "שמור ריצת הדגמה ללא שליחה"}
            </Button>
            <Button variant="outline" onClick={() => overview.refetch()}><RefreshCw size={15} /> רענון נתונים</Button>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e8e5dc] bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-black text-[#191265]"><Database size={19} /> מקורות וטריות</h3>
          <div className="mt-4 space-y-2">
            {sourceRows.map(([key, source]) => (
              <div key={key} className="rounded-xl border border-[#efede6] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-[#191265]">{source.label}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${source.available ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {source.available ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}{source.available ? "מחובר" : "לא זמין"}
                  </span>
                </div>
                {source.note && <p className="mt-1 text-xs leading-5 text-[#727272]">{source.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#e8e5dc] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={19} className="text-[#191265]" />
          <div><h3 className="text-lg font-black text-[#191265]">יעדים והגדרות</h3><p className="text-xs text-[#727272]">שמירה אינה מפעילה SMS. יעדים שלא הוגדרו נשארים ריקים ומסומנים כך בדוח.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["יעד מאגר מינימום", databaseMin, setDatabaseMin, "רכישות"],
            ["יעד מאגר עבודה", databaseStretch, setDatabaseStretch, "רכישות"],
            ["תקציב מאגר", databaseBudget, setDatabaseBudget, "₪"],
            ["יעד Boost", boostTarget, setBoostTarget, "אופציונלי"],
            ["יעד באנדל", bundleTarget, setBundleTarget, "אופציונלי"],
            ["יעד לידים", leadTarget, setLeadTarget, "אופציונלי"],
            ["יעד הכנסה", revenueTarget, setRevenueTarget, "₪, אופציונלי"],
          ].map(([label, value, setter, hint]) => (
            <label key={label as string} className="text-xs font-bold text-[#191265]">
              {label as string}
              <input value={value as string} onChange={event => (setter as (value: string) => void)(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-xl border border-[#dedbd2] bg-[#fbfaf7] px-3 py-2 text-sm outline-none focus:border-[#191265]" placeholder={hint as string} />
            </label>
          ))}
          <label className="text-xs font-bold text-[#191265]">
            מספר מנהל לקבלת SMS
            <input value={recipientPhone} onChange={event => setRecipientPhone(event.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border border-[#dedbd2] bg-[#fbfaf7] px-3 py-2 text-sm outline-none focus:border-[#191265]" placeholder={data.settings.recipientMasked || "לא הוגדר"} />
          </label>
        </div>
        <Button
          className="mt-4 bg-[#ffe27c] font-black text-[#191265] hover:bg-[#ffd94f]"
          disabled={updateSettings.isPending}
          onClick={() => updateSettings.mutate({
            recipientPhone: recipientPhone.trim() || undefined,
            databaseMonthlyMinTarget: numericOrNull(databaseMin) || 350,
            databaseMonthlyStretchTarget: numericOrNull(databaseStretch) || 400,
            databaseMonthlyBudgetAgorot: (numericOrNull(databaseBudget) || 0) * 100,
            boostMonthlyTarget: numericOrNull(boostTarget),
            bundleMonthlyTarget: numericOrNull(bundleTarget),
            leadMonthlyTarget: numericOrNull(leadTarget),
            revenueMonthlyTargetAgorot: revenueTarget.trim() ? (numericOrNull(revenueTarget) || 0) * 100 : null,
          })}
        >
          <Save size={16} /> {updateSettings.isPending ? "שומר…" : "שמור במצב כבוי"}
        </Button>
      </div>

      <div className="rounded-3xl border border-[#e8e5dc] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-[#191265]">היסטוריית ריצות</h3>
        {data.runs.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[#f5f2ea] p-4 text-sm text-[#727272]">עדיין לא נשמרה ריצת הדגמה ולא נשלח SMS.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.runs.map(run => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efede6] p-3 text-sm">
                <div><strong className="text-[#191265]">{run.reportDate}</strong><span className="mr-2 text-xs text-[#727272]">{run.trigger === "preview" ? "הדגמה" : run.trigger === "scheduled" ? "מתוזמן" : "ידני"}</span></div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${run.status === "sent" ? "bg-emerald-50 text-emerald-700" : run.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{run.status === "sent" ? "נשלח" : run.status === "failed" ? "נכשל" : run.status === "dry_run" ? "ללא שליחה" : "דולג"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
