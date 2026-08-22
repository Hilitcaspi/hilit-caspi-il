import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ExpenseCategory = "processing" | "refund" | "payroll" | "contractor" | "software" | "office" | "content" | "event" | "tax" | "other";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  processing: "סליקה ועמלות",
  refund: "החזרים וזיכויים",
  payroll: "שכר",
  contractor: "ספקים ופרילנסרים",
  software: "תוכנות ומערכות",
  office: "משרד ותפעול",
  content: "תוכן והפקה",
  event: "אירועים",
  tax: "מסים ואגרות",
  other: "אחר",
};

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר",
  guide: "מדריך",
  course: "קורס",
  session: "פגישה",
  coaching: "ליווי",
  coaching_mas: "ליווי מאסטר",
  bundle_tubav: "חבילה",
};

function categoryLabel(value: string) {
  return CATEGORY_LABELS[value as ExpenseCategory] || value;
}

function money(value: number) {
  return `₪${Math.round(value || 0).toLocaleString("he-IL")}`;
}

function change(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function ProfitAndLossSection({ startDate, endDate }: { startDate: number; endDate: number }) {
  const utils = trpc.useUtils();
  const pnl = trpc.dashboard.profitAndLoss.useQuery({ startDate, endDate });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "processing" as ExpenseCategory,
    description: "",
    vendor: "",
    amount: "",
    notes: "",
  });

  const addExpense = trpc.dashboard.addBusinessExpense.useMutation({
    onSuccess: async () => {
      await utils.dashboard.profitAndLoss.invalidate();
      setForm({ expenseDate: new Date().toISOString().slice(0, 10), category: "processing", description: "", vendor: "", amount: "", notes: "" });
      setShowForm(false);
      toast.success("ההוצאה נשמרה ב־P&L");
    },
    onError: error => toast.error(error.message || "לא הצלחנו לשמור את ההוצאה"),
  });
  const deleteExpense = trpc.dashboard.deleteBusinessExpense.useMutation({
    onSuccess: async () => {
      await utils.dashboard.profitAndLoss.invalidate();
      toast.success("ההוצאה נמחקה");
    },
    onError: error => toast.error(error.message || "לא הצלחנו למחוק"),
  });

  if (pnl.isLoading) {
    return <section className="rounded-2xl bg-white p-6 shadow-sm"><div className="h-48 animate-pulse rounded-xl bg-gray-100" /></section>;
  }
  if (!pnl.data) return null;

  const current = pnl.data.current;
  const previous = pnl.data.previous;
  const revenueChange = change(current.netRevenue, previous.netRevenue);
  const profitChange = change(current.operatingProfit, previous.operatingProfit);

  const submitExpense = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !amount || amount <= 0) {
      toast.error("יש להזין תיאור וסכום תקינים");
      return;
    }
    addExpense.mutate({
      expenseDate: new Date(`${form.expenseDate}T12:00:00`).getTime(),
      category: form.category,
      description: form.description.trim(),
      vendor: form.vendor.trim() || null,
      amountShekels: amount,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <section className="rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-[#191265] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#ffe27c] p-2 text-[#191265]"><Calculator size={20} /></span>
          <div>
            <h2 className="font-black">רווח והפסד אמיתי</h2>
            <p className="text-[11px] text-white/65">הכנסה מסכומי העסקאות · Meta בזמן אמת · הוצאות שהוזנו</p>
          </div>
        </div>
        <button onClick={() => setShowForm(value => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffe27c] px-3 py-2 text-xs font-black text-[#191265]">
          <Plus size={14} /> הוספת הוצאה {showForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </header>

      <div className="p-5 space-y-5">
        <div className={`rounded-xl border p-3 text-sm leading-6 ${current.dataQuality.isComplete ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          <strong>איכות הנתונים:</strong> {current.dataQuality.warning}
        </div>

        {showForm && (
          <form onSubmit={submitExpense} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#e4e0d5] bg-[#faf9f6] p-4 md:grid-cols-3">
            <label className="text-xs font-bold text-gray-700">תאריך
              <input type="date" value={form.expenseDate} onChange={event => setForm({ ...form, expenseDate: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
            </label>
            <label className="text-xs font-bold text-gray-700">קטגוריה
              <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as ExpenseCategory })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-700">סכום בש״ח
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
            </label>
            <label className="text-xs font-bold text-gray-700 md:col-span-2">תיאור
              <input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="למשל: חשבונית Brevo אוגוסט" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" required />
            </label>
            <label className="text-xs font-bold text-gray-700">ספק
              <input value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} placeholder="רשות" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-gray-700 md:col-span-3">הערה
              <textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={addExpense.isPending} className="rounded-lg bg-[#191265] px-4 py-2.5 text-sm font-black text-[#ffe27c] disabled:opacity-50 md:col-start-3">{addExpense.isPending ? "שומר..." : "שמירת הוצאה"}</button>
          </form>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "הכנסה נטו", value: current.netRevenue, sub: revenueChange == null ? "אין תקופת השוואה" : `${revenueChange >= 0 ? "+" : ""}${revenueChange}% מול הקודמת`, color: "text-emerald-700" },
            { label: "הוצאות Meta", value: current.metaSpend, sub: "שני חשבונות הפרסום", color: "text-red-600" },
            { label: "הוצאות נוספות", value: current.manualExpenses, sub: `${current.expenses.length} רשומות`, color: "text-orange-600" },
            { label: "רווח תפעולי", value: current.operatingProfit, sub: profitChange == null ? "לפני הוצאות חסרות" : `${profitChange >= 0 ? "+" : ""}${profitChange}% מול הקודמת`, color: current.operatingProfit >= 0 ? "text-[#191265]" : "text-red-700" },
            { label: "שיעור רווח", value: current.margin, percent: true, sub: "על הכנסה נטו", color: current.margin >= 0 ? "text-[#191265]" : "text-red-700" },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold text-gray-500">{item.label}</p>
              <p className={`mt-1 text-xl font-black ${item.color}`}>{item.percent ? `${item.value.toFixed(1)}%` : money(item.value)}</p>
              <p className="mt-1 text-[9px] text-gray-400">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#191265]"><WalletCards size={16} /> יחידת כלכלה</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-gray-500">הכנסה ממוצעת לרכישה</dt><dd className="font-black">{money(current.unitEconomics.averageRevenuePerPurchase)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">CAC שיווקי</dt><dd className="font-black">{money(current.unitEconomics.marketingCac)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">תרומה לרכישה</dt><dd className="font-black">{money(current.unitEconomics.contributionPerPurchase)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">ROAS הכנסה בפועל</dt><dd className="font-black">{current.unitEconomics.returnOnAdSpend.toFixed(2)}x</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-black text-[#191265]">הכנסה לפי מוצר</h3>
            <div className="mt-3 space-y-2 text-xs">
              {current.products.length ? current.products.map((product: any) => (
                <div key={product.product} className="flex items-center justify-between gap-3"><span className="text-gray-600">{PRODUCT_LABELS[product.product] || product.product} · {product.purchases}</span><strong>{money(product.revenue)}</strong></div>
              )) : <p className="text-gray-400">אין עסקאות בתקופה</p>}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-black text-[#191265]">הוצאות לפי קטגוריה</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-600">פרסום Meta</span><strong>{money(current.metaSpend)}</strong></div>
              {Object.entries(current.categoryTotals).filter(([, amount]) => Number(amount) > 0).map(([category, amount]) => (
                <div key={category} className="flex justify-between"><span className="text-gray-600">{categoryLabel(category)}</span><strong>{money(Number(amount))}</strong></div>
              ))}
            </div>
          </div>
        </div>

        {current.expenses.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full min-w-[700px] text-right text-xs">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="p-3">תאריך</th><th className="p-3">קטגוריה</th><th className="p-3">תיאור</th><th className="p-3">ספק</th><th className="p-3">סכום</th><th className="p-3"></th></tr></thead>
              <tbody>
                {current.expenses.map((expense: any) => (
                  <tr key={expense.id} className="border-t border-gray-100"><td className="p-3">{new Date(expense.expenseDate).toLocaleDateString("he-IL")}</td><td className="p-3">{categoryLabel(expense.category)}</td><td className="p-3 font-medium">{expense.description}</td><td className="p-3 text-gray-500">{expense.vendor || "—"}</td><td className="p-3 font-black">{money(expense.amountAgorot / 100)}</td><td className="p-3"><button aria-label="מחיקת הוצאה" onClick={() => window.confirm("למחוק את ההוצאה?") && deleteExpense.mutate({ id: expense.id })} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
