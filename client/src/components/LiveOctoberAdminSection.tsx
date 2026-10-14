import { useState } from "react";
import { trpc } from "@/lib/trpc";

const sources: Record<string, string> = {
  database_live: "מאגר עם LIVE", plus: "Plus פעיל", friends: "FRIENDS 49 ₪", standalone: "כרטיס רגיל 149 ₪",
};

const queueFilters = [
  ["all", "הכול"],
  ["awaiting_profile", "ממתינים לפרופיל"],
  ["ready", "מוכנים"],
  ["fulfilled", "קוימו"],
  ["overdue", "באיחור"],
  ["needs_review", "טעון טיפול"],
] as const;

type QueueFilter = (typeof queueFilters)[number][0];

const queueState: Record<string, { label: string; className: string }> = {
  awaiting_profile: { label: "ממתינים להשלמת פרופיל", className: "bg-amber-100 text-amber-900" },
  ready: { label: "אפשר להכין הצעה", className: "bg-sky-100 text-sky-900" },
  fulfilled: { label: "הצעה נשלחה", className: "bg-emerald-100 text-emerald-900" },
  overdue: { label: "באיחור", className: "bg-rose-100 text-rose-900" },
  needs_review: { label: "טעון טיפול", className: "bg-violet-100 text-violet-900" },
};

function QueueDetails({ row, time }: { row: any; time: (value: number) => string }) {
  const notes: string[] = [
    row.profileRequirementsMissing?.length ? `חסר: ${row.profileRequirementsMissing.map((item: string) => ({ profile: "פרופיל", photo: "תמונה", questionnaire: "שאלון" }[item] || item)).join(" · ")}` : null,
    row.completedAfterLive ? "השאלון הושלם לאחר הלייב — הדדליין המקורי לא הוארך" : null,
    row.eligibilityIssues?.length ? `בדיקת זכאות: ${row.eligibilityIssues.map((item: string) => ({ unpaid: "לא משולם", inactive: "לא פעיל", seed: "פרופיל בדיקה" }[item] || item)).join(" · ")}` : null,
    row.activeMatchHold ? "יש התאמה פעילה עם ראיית שליחה — נדרשת בדיקה ידנית" : null,
    row.firstProposalDeliveredAt ? `נשלחה הצעה עם אישור קבלת ספק: ${time(row.firstProposalDeliveredAt)}` : null,
  ].filter((note): note is string => Boolean(note));
  return <div className="space-y-1 text-xs text-[#625d78]">{notes.length ? notes.map(note => <p key={note}>{note}</p>) : <p>פרופיל עומד בתנאי התור.</p>}<p>התחייבות מקורית: {time(row.originalPromiseDeadline)}</p></div>;
}

export default function LiveOctoberAdminSection() {
  const [view, setView] = useState<"tickets" | "questions" | "matches">("tickets");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const overview = trpc.liveOctober.adminOverview.useQuery(undefined, { refetchInterval: 60_000 });
  const queue = trpc.liveOctober.adminFirstMatchQueue.useQuery(undefined, {
    enabled: view === "matches",
    refetchInterval: view === "matches" ? 60_000 : false,
  });
  const { data, isLoading, isError, refetch } = overview;
  if (isLoading) return <div className="rounded-2xl bg-white p-6 text-[#191265]">טוענים את הרשמות הלייב…</div>;
  if (isError || !data) return <div className="rounded-2xl bg-white p-6 text-[#191265]">לא ניתן לטעון כרגע את נתוני הלייב. <button type="button" onClick={() => void refetch()} className="font-bold underline">לנסות שוב</button></div>;
  const stats = [
    ["סה״כ כרטיסים", data.totals.total], ["מאגר LIVE", data.totals.database], ["חברי Plus", data.totals.plus],
    ["Plus אישרו הגעה", data.totals.confirmedPlus], ["FRIENDS", data.totals.friends], ["כרטיס רגיל", data.totals.standalone], ["שאלות", data.totals.questions],
  ] as const;
  const time = (value: number) => new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const filteredQueue = (queue.data?.rows || []).filter(row => queueFilter === "all" || row.state === queueFilter);
  return <section className="space-y-5 text-right" dir="rtl">
    <div className="rounded-2xl bg-[#191265] p-6 text-white">
      <p className="text-sm font-black text-[#ffe27c]">שבת · 31.10 · 20:30</p>
      <h2 className="mt-1 text-2xl font-black">סודות ההתאמה המושלמת</h2>
      <p className="mt-2 text-sm text-white/70">כרטיסים מאומתים, שאלות ותור הצעה ראשונה. קישורי Zoom אישיים אינם מוצגים כאן.</p>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#191265]/10 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-[#191265]">{value}</div><div className="mt-1 text-xs text-[#625d78]">{label}</div></div>)}</div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setView("tickets")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "tickets" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>נרשמים ({data.totals.total})</button><button type="button" onClick={() => setView("questions")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "questions" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>שאלות ({data.totals.questions})</button><button type="button" onClick={() => setView("matches")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "matches" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>תור התאמות{queue.data ? ` (${queue.data.summary.total})` : ""}</button></div>
    {view === "tickets" ? <div className="overflow-x-auto rounded-2xl border border-[#191265]/10 bg-white">
      <table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-[#f0eadc] text-[#191265]"><tr><th className="p-3">שם</th><th className="p-3">מייל</th><th className="p-3">מקור</th><th className="p-3">אישור הגעה</th><th className="p-3">שובר</th><th className="p-3">כרטיס Zoom</th><th className="p-3">נרשם</th></tr></thead>
        <tbody>{data.tickets.map(ticket => <tr key={ticket.id} className="border-t border-[#191265]/10"><td className="p-3">{ticket.name}</td><td className="p-3" dir="ltr">{ticket.email}</td><td className="p-3">{sources[ticket.source] || ticket.source}</td><td className="p-3">{ticket.source === "plus" ? ticket.attendanceConfirmedAt ? <span className="font-bold text-emerald-700">אישור התקבל<div className="text-xs font-normal text-[#625d78]">{time(ticket.attendanceConfirmedAt)}</div></span> : <span className="text-[#625d78]">לא אושר</span> : <span className="text-[#625d78]">לא רלוונטי</span>}</td><td className="p-3 font-mono text-xs">{ticket.voucherCode}</td><td className="p-3"><span className={`font-bold ${ticket.zoomDeliveryState === "sent" ? "text-emerald-700" : ticket.zoomLastError ? "text-amber-700" : "text-[#625d78]"}`}>{ticket.zoomDeliveryState === "sent" ? "נשלח במייל" : ticket.zoomLastError ? "ממתין לטיפול" : ticket.zoomDeliveryState === "registered" ? "נרשם ב־Zoom" : "ממתין לרישום"}</span>{ticket.zoomEmailSentAt && <div className="text-xs text-[#625d78]">{time(ticket.zoomEmailSentAt)}</div>}</td><td className="p-3 whitespace-nowrap">{time(ticket.issuedAt)}</td></tr>)}{!data.tickets.length && <tr><td colSpan={7} className="p-8 text-center text-[#625d78]">אין כרטיסים עדיין</td></tr>}</tbody>
      </table>{data.totals.total > data.tickets.length && <p className="p-3 text-xs text-[#625d78]">מוצגים 300 נרשמים אחרונים מתוך {data.totals.total}.</p>}
    </div> : view === "questions" ? <div className="space-y-3">{data.questions.map(item => <article key={item.id} className="rounded-2xl border border-[#191265]/10 bg-white p-5 text-sm"><p className="font-black text-[#191265]">{item.name} · <span dir="ltr">{item.email}</span></p><p className="mt-1 text-xs text-[#625d78]">{time(item.createdAt)}</p><p className="mt-3 whitespace-pre-wrap leading-7 text-[#343050]">{item.body}</p></article>)}{!data.questions.length && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">עוד לא התקבלו שאלות.</p>}{data.totals.questions > data.questions.length && <p className="text-xs text-[#625d78]">מוצגות 300 שאלות אחרונות מתוך {data.totals.questions}.</p>}</div> : <div className="space-y-4">
      {queue.isLoading && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">טוענים את תור ההתאמות…</p>}
      {queue.isError && <p className="rounded-2xl bg-white p-6 text-center text-[#8d2020]">לא ניתן לטעון את תור ההתאמות. <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">לנסות שוב</button></p>}
      {queue.data && <><div className="rounded-2xl border border-[#191265]/10 bg-white p-4"><p className="text-sm font-bold text-[#191265]">יעד ההצעה החדשה: הצעה ראשונה עד סוף יום ב׳ 2.11, בכפוף לפרופיל מלא, תמונה ושאלון עד מועד הלייב. אין דרישת נוכחות. אין שליחה אוטומטית מהתור.</p>{String(queue.data.policyStatus) === "draft" && <p className="mt-2 text-xs font-bold text-amber-800">טיוטת מדיניות בלבד — נדרש אישור השקה לפני כל פרסום או שליחה.</p>}<div className="mt-3 flex flex-wrap gap-2">{queueFilters.map(([value, label]) => <button key={value} type="button" onClick={() => setQueueFilter(value)} className={`rounded-full px-3 py-1 text-xs font-bold ${queueFilter === value ? "bg-[#191265] text-white" : "bg-[#f0eadc] text-[#191265]"}`}>{label}{value !== "all" ? ` (${({ awaiting_profile: queue.data.summary.awaitingProfile, ready: queue.data.summary.ready, fulfilled: queue.data.summary.fulfilled, overdue: queue.data.summary.overdue, needs_review: queue.data.summary.needsReview } as Record<string, number>)[value] || 0})` : ` (${queue.data.summary.total})`}</button>)}</div></div>
      <div className="space-y-3">{filteredQueue.map(row => { const state = queueState[row.state]; return <article key={row.ticketId} className="rounded-2xl border border-[#191265]/10 bg-white p-4 shadow-sm"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#191265]">{row.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.label}</span></div><p className="mt-1 text-xs text-[#625d78]">מועד רכישה: {time(row.paidRegistrationAt)}</p><div className="mt-3"><QueueDetails row={row} time={time} /></div></div>{row.singleId ? <a href={`/crm/matchmaking?tab=singles&singleId=${row.singleId}`} className="shrink-0 rounded-xl border border-[#191265]/20 px-3 py-2 text-sm font-bold text-[#191265] hover:bg-[#191265]/5">פתיחת הפרופיל</a> : <span className="text-xs text-[#625d78]">לא נמצא פרופיל מקושר</span>}</div></article>; })}{!filteredQueue.length && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">אין רשומות במסנן זה.</p>}</div></>}
    </div>}
  </section>;
}
