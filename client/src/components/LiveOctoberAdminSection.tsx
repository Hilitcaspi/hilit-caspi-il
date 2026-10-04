import { useState } from "react";
import { trpc } from "@/lib/trpc";

const sources: Record<string, string> = {
  database_live: "מאגר עם LIVE", plus: "Plus פעיל", friends: "FRIENDS 49 ₪", standalone: "כרטיס רגיל 149 ₪",
};

export default function LiveOctoberAdminSection() {
  const [view, setView] = useState<"tickets" | "questions">("tickets");
  const { data, isLoading, isError, refetch } = trpc.liveOctober.adminOverview.useQuery(undefined, { refetchInterval: 60_000 });
  if (isLoading) return <div className="rounded-2xl bg-white p-6 text-[#191265]">טוענים את הרשמות הלייב…</div>;
  if (isError || !data) return <div className="rounded-2xl bg-white p-6 text-[#191265]">לא ניתן לטעון כרגע את נתוני הלייב. <button type="button" onClick={() => void refetch()} className="font-bold underline">לנסות שוב</button></div>;
  const stats = [
    ["סה״כ כרטיסים", data.totals.total], ["מאגר LIVE", data.totals.database], ["חברי Plus", data.totals.plus],
    ["FRIENDS", data.totals.friends], ["כרטיס רגיל", data.totals.standalone], ["שאלות", data.totals.questions],
  ] as const;
  const time = (value: number) => new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  return <section className="space-y-5 text-right" dir="rtl">
    <div className="rounded-2xl bg-[#191265] p-6 text-white"><p className="text-sm font-black text-[#ffe27c]">שבת · 31.10 · 20:30</p><h2 className="mt-1 text-2xl font-black">סודות ההתאמה המושלמת</h2><p className="mt-2 text-sm text-white/70">כרטיסים מאומתים ושאלות שהתקבלו. הקישור לאירוע אינו מוצג לציבור ואינו נשלח מכאן.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#191265]/10 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-[#191265]">{value}</div><div className="mt-1 text-xs text-[#625d78]">{label}</div></div>)}</div>
    <div className="flex gap-2"><button type="button" onClick={() => setView("tickets")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "tickets" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>נרשמים ({data.totals.total})</button><button type="button" onClick={() => setView("questions")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "questions" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>שאלות ({data.totals.questions})</button></div>
    {view === "tickets" ? <div className="overflow-x-auto rounded-2xl border border-[#191265]/10 bg-white"><table className="w-full min-w-[620px] text-right text-sm"><thead className="bg-[#f0eadc] text-[#191265]"><tr><th className="p-3">שם</th><th className="p-3">מייל</th><th className="p-3">מקור</th><th className="p-3">שובר</th><th className="p-3">נרשם</th></tr></thead><tbody>{data.tickets.map(ticket => <tr key={ticket.id} className="border-t border-[#191265]/10"><td className="p-3">{ticket.name}</td><td className="p-3" dir="ltr">{ticket.email}</td><td className="p-3">{sources[ticket.source] || ticket.source}</td><td className="p-3 font-mono text-xs">{ticket.voucherCode}</td><td className="p-3 whitespace-nowrap">{time(ticket.issuedAt)}</td></tr>)}{!data.tickets.length && <tr><td colSpan={5} className="p-8 text-center text-[#625d78]">אין כרטיסים עדיין</td></tr>}</tbody></table>{data.totals.total > data.tickets.length && <p className="p-3 text-xs text-[#625d78]">מוצגים 300 נרשמים אחרונים מתוך {data.totals.total}.</p>}</div> : <div className="space-y-3">{data.questions.map(item => <article key={item.id} className="rounded-2xl border border-[#191265]/10 bg-white p-5 text-sm"><p className="font-black text-[#191265]">{item.name} · <span dir="ltr">{item.email}</span></p><p className="mt-1 text-xs text-[#625d78]">{time(item.createdAt)}</p><p className="mt-3 whitespace-pre-wrap leading-7 text-[#343050]">{item.body}</p></article>)}{!data.questions.length && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">עוד לא התקבלו שאלות.</p>}{data.totals.questions > data.questions.length && <p className="text-xs text-[#625d78]">מוצגות 300 שאלות אחרונות מתוך {data.totals.questions}.</p>}</div>}
  </section>;
}
