import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { liveAttendancePresentation, liveZoomPresentation } from "@shared/liveTicketPresentation";
import ProfileStaffMarkers, { profileStaffSurface } from "@/components/ProfileStaffMarkers";

const sources: Record<string, string> = {
  database_live: "מאגר עם LIVE", plus: "Plus פעיל", friends: "FRIENDS 49 ₪", standalone: "כרטיס רגיל 149 ₪", open_registration: "הרשמה חינמית",
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
  const postQueue = trpc.liveOctober.adminPostEventFirstMatchQueue.useQuery(undefined, {
    enabled: view === "matches",
    refetchInterval: view === "matches" ? 60_000 : false,
  });
  const { data, isLoading, isError, refetch } = overview;
  if (isLoading) return <div className="rounded-2xl bg-white p-6 text-[#191265]">טוענים את הרשמות הלייב…</div>;
  if (isError || !data) return <div className="rounded-2xl bg-white p-6 text-[#191265]">לא ניתן לטעון כרגע את נתוני הלייב. <button type="button" onClick={() => void refetch()} className="font-bold underline">לנסות שוב</button></div>;
  const stats = [
    ["סה״כ בעלי כרטיסים", data.totals.total], ["מאגר LIVE", data.totals.database], ["כרטיסי מתנה ל־Plus", data.totals.plus],
    ["Plus אישרו הגעה", data.totals.confirmedPlus], ["FRIENDS", data.totals.friends], ["כרטיס רגיל", data.totals.standalone], ["כרטיסים חינמיים חדשים", data.totals.openRegistration], ["שאלות", data.totals.questions],
  ] as const;
  const time = (value: number) => new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const filteredQueue = (queue.data?.rows || []).filter(row => queueFilter === "all" || row.state === queueFilter);
  return <section className="space-y-5 text-right" dir="rtl">
    <div className="rounded-2xl bg-[#191265] p-6 text-white">
      <p className="text-sm font-black text-[#ffe27c]">שבת · 31.10 · 20:30</p>
      <h2 className="mt-1 text-2xl font-black">סודות ההתאמה המושלמת</h2>
      <p className="mt-2 text-sm text-white/70">כרטיסים מאומתים, הרשמות חינמיות, שאלות ותור הצעה ראשונה. קישורי Zoom אישיים אינם מוצגים כאן.</p>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#191265]/10 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-[#191265]">{value}</div><div className="mt-1 text-xs text-[#625d78]">{label}</div></div>)}</div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setView("tickets")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "tickets" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>בעלי כרטיסים ({data.totals.total})</button><button type="button" onClick={() => setView("questions")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "questions" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>שאלות ({data.totals.questions})</button><button type="button" onClick={() => setView("matches")} className={`rounded-xl px-5 py-2 text-sm font-bold ${view === "matches" ? "bg-[#191265] text-white" : "bg-white text-[#191265]"}`}>תור התאמות{queue.data ? ` (${queue.data.summary.total})` : ""}</button></div>
    {view === "tickets" ? <div className="space-y-3"><div className="rounded-2xl border border-[#191265]/10 bg-white p-4 text-sm leading-6 text-[#343050]">
      <p><strong>שובר, אישור הגעה וקישור Zoom הם שלושה דברים נפרדים.</strong> חברי Plus מקבלים כרטיס מתנה ומאשרים הגעה בנפרד. ברכישת מאגר LIVE או כרטיס ללייב לא נדרש אישור נוסף.</p>
      <p className="mt-2"><strong>הרשמה חינמית ללייב אינה רכישת מאגר ואינה יוצרת חברות במאגר.</strong> הצהרת המאגר בשורה היא הצהרה בלבד ואינה בדיקת זכאות.</p>
      <p className="mt-2">{data.zoomDelivery?.enabled ? "הפצת קישורי Zoom מופעלת. הסטטוס בכל שורה מציין אם הרישום והשליחה כבר תועדו." : data.zoomDelivery?.openRegistrationEnabled ? "קישורים נשלחים אוטומטית לנרשמים בטופס החדש בלבד. הפצת הכרטיסים הכללית הישנה לא הופעלה." : "הפצת קישורי Zoom אינה זמינה כרגע. ההרשמות נשמרות ונדרש טיפול בשליחת הקישור."}</p>
    </div><div className="overflow-x-auto rounded-2xl border border-[#191265]/10 bg-white">
      <table className="w-full min-w-[1250px] text-right text-sm"><thead className="bg-[#f0eadc] text-[#191265]"><tr><th className="p-3">שם</th><th className="p-3">מייל</th><th className="p-3">טלפון</th><th className="p-3">מקור</th><th className="p-3">הצהרת מאגר</th><th className="p-3">הסכמה שיווקית</th><th className="p-3">אישור הגעה</th><th className="p-3">שובר</th><th className="p-3">כרטיס Zoom</th><th className="p-3">נרשם</th></tr></thead>
        <tbody>{data.tickets.map(ticket => { const attendance = ticket.source === "open_registration" ? { label: "נרשם ללייב", detail: "הרשמה חינמית ללייב אינה דורשת אישור הגעה.", tone: "success" } : liveAttendancePresentation(ticket); const zoom = liveZoomPresentation(ticket, data.zoomDelivery?.enabled || Boolean(ticket.registrationPhone && data.zoomDelivery?.openRegistrationEnabled)); const linkedProfile = ticket.singleId ? ticket : null; const declaredMembership = ticket.declaredDatabaseMember === true ? "כן · הצהרה בלבד" : ticket.declaredDatabaseMember === false ? "לא · הצהרה בלבד" : "לא נמסרה · הצהרה בלבד"; const marketingConsent = ticket.registrationMarketingConsent === true ? "הסכמה ניתנה" : ticket.registrationMarketingConsent === false ? "לא ניתנה" : "לא נמסר"; return <tr key={ticket.id} className={`border-t border-[#191265]/10 ${profileStaffSurface(linkedProfile, "")}`}><td className="p-3">{ticket.name}{linkedProfile && <ProfileStaffMarkers profile={linkedProfile} compact />}</td><td className="p-3" dir="ltr">{ticket.email}</td><td className="p-3 whitespace-nowrap" dir="ltr">{ticket.registrationPhone || "—"}</td><td className="p-3">{sources[ticket.source] || ticket.source}</td><td className="p-3 text-xs leading-5 text-[#625d78]">{declaredMembership}</td><td className="p-3 text-xs leading-5 text-[#625d78]">{marketingConsent}</td><td className="p-3" title={attendance.detail}><span className={attendance.tone === "success" ? "font-bold text-emerald-700" : "text-[#625d78]"}>{attendance.label}</span>{ticket.attendanceConfirmedAt && <div className="text-xs text-[#625d78]">{time(ticket.attendanceConfirmedAt)}</div>}</td><td className="p-3 font-mono text-xs">{ticket.voucherCode}</td><td className="p-3"><span className={`font-bold ${zoom.tone === "success" ? "text-emerald-700" : zoom.tone === "attention" ? "text-amber-700" : "text-[#625d78]"}`}>{zoom.label}</span><div className="mt-1 max-w-[230px] text-xs leading-5 text-[#625d78]">{zoom.detail}</div>{ticket.zoomEmailSentAt && <div className="text-xs text-[#625d78]">{time(ticket.zoomEmailSentAt)}</div>}</td><td className="p-3 whitespace-nowrap">{time(ticket.issuedAt)}</td></tr>; })}{!data.tickets.length && <tr><td colSpan={10} className="p-8 text-center text-[#625d78]">אין כרטיסים עדיין</td></tr>}</tbody>
      </table>{data.totals.total > data.tickets.length && <p className="p-3 text-xs text-[#625d78]">מוצגים 300 נרשמים אחרונים מתוך {data.totals.total}.</p>}
    </div></div> : view === "questions" ? <div className="space-y-3">{data.questions.map(item => { const linkedProfile = item.singleId ? item : null; return <article key={item.id} className={`rounded-2xl border border-[#191265]/10 p-5 text-sm ${profileStaffSurface(linkedProfile, "bg-white")}`}><p className="font-black text-[#191265]">{item.name} · <span dir="ltr">{item.email}</span></p>{linkedProfile && <ProfileStaffMarkers profile={linkedProfile} compact />}<p className="mt-1 text-xs text-[#625d78]">{time(item.createdAt)}</p><p className="mt-3 whitespace-pre-wrap leading-7 text-[#343050]">{item.body}</p></article>; })}{!data.questions.length && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">עוד לא התקבלו שאלות.</p>}{data.totals.questions > data.questions.length && <p className="text-xs text-[#625d78]">מוצגות 300 שאלות אחרונות מתוך {data.totals.questions}.</p>}</div> : <div className="space-y-4">
      {queue.isLoading && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">טוענים את תור ההתאמות…</p>}
      {queue.isError && <p className="rounded-2xl bg-white p-6 text-center text-[#8d2020]">לא ניתן לטעון את תור ההתאמות. <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">לנסות שוב</button></p>}
      {queue.data && <><div className="rounded-2xl border border-[#191265]/10 bg-white p-4"><p className="text-sm font-bold text-[#191265]">יעד ההצעה החדשה: הצעה ראשונה עד סוף יום ב׳ 2.11, בכפוף לפרופיל מלא, תמונה ושאלון עד מועד הלייב. אין דרישת נוכחות. אין שליחה אוטומטית מהתור.</p>{String(queue.data.policyStatus) === "draft" && <p className="mt-2 text-xs font-bold text-amber-800">טיוטת מדיניות בלבד — נדרש אישור השקה לפני כל פרסום או שליחה.</p>}<div className="mt-3 flex flex-wrap gap-2">{queueFilters.map(([value, label]) => <button key={value} type="button" onClick={() => setQueueFilter(value)} className={`rounded-full px-3 py-1 text-xs font-bold ${queueFilter === value ? "bg-[#191265] text-white" : "bg-[#f0eadc] text-[#191265]"}`}>{label}{value !== "all" ? ` (${({ awaiting_profile: queue.data.summary.awaitingProfile, ready: queue.data.summary.ready, fulfilled: queue.data.summary.fulfilled, overdue: queue.data.summary.overdue, needs_review: queue.data.summary.needsReview } as Record<string, number>)[value] || 0})` : ` (${queue.data.summary.total})`}</button>)}</div></div>
      <div className="space-y-3">{filteredQueue.map(row => { const state = queueState[row.state]; const linkedProfile = row.singleId ? row : null; return <article key={row.ticketId} className={`rounded-2xl border border-[#191265]/10 p-4 shadow-sm ${profileStaffSurface(linkedProfile)}`}><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#191265]">{row.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.label}</span></div>{linkedProfile && <ProfileStaffMarkers profile={linkedProfile} compact />}<p className="mt-1 text-xs text-[#625d78]">מועד רכישה: {time(row.paidRegistrationAt)}</p><div className="mt-3"><QueueDetails row={row} time={time} /></div></div>{row.singleId ? <a href={`/crm/matchmaking?tab=singles&singleId=${row.singleId}`} className="shrink-0 rounded-xl border border-[#191265]/20 px-3 py-2 text-sm font-bold text-[#191265] hover:bg-[#191265]/5">פתיחת הפרופיל</a> : <span className="text-xs text-[#625d78]">לא נמצא פרופיל מקושר</span>}</div></article>; })}{!filteredQueue.length && <p className="rounded-2xl bg-white p-6 text-center text-[#625d78]">אין רשומות במסנן זה.</p>}</div></>}
    </div>}
    {view === "matches" && <div className="space-y-3 rounded-2xl border border-[#6d245b]/20 bg-[#fffaf3] p-5">
      <h3 className="text-lg font-black text-[#4e1b46]">מצטרפים דרך הטבת הלייב LIVE48</h3>
      <p className="text-sm leading-6 text-[#625d78]">רכישות מאומתות דרך הטבת הלייב, עם יעד להצעת התאמה ראשונה בתוך 48 שעות. פרופיל, תמונה ושאלונים חסרים נשארים גלויים לטיפול. התור אינו שולח התאמות אוטומטית.</p>
      {postQueue.isLoading && <p className="text-sm text-[#625d78]">טוענים את מצטרפי ההטבה…</p>}
      {postQueue.isError && <p className="text-sm text-rose-800">לא ניתן לטעון את תור ההטבה. <button type="button" onClick={() => void postQueue.refetch()} className="font-bold underline">לנסות שוב</button></p>}
      {postQueue.data && <>
        <div className="flex flex-wrap gap-2 text-xs font-bold text-[#4e1b46]">
          <span>סה״כ {postQueue.data.summary.total}</span><span>מוכנים {postQueue.data.summary.ready}</span><span>חסרים פרטים {postQueue.data.summary.awaitingProfile}</span><span>נשלחו {postQueue.data.summary.fulfilled}</span><span>באיחור {postQueue.data.summary.overdue}</span><span>טעונים טיפול {postQueue.data.summary.needsReview}</span>
        </div>
        {postQueue.data.rows.map(row => <article key={row.paymentId} className="rounded-xl border border-[#6d245b]/15 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-black text-[#4e1b46]">{row.name} <span className={`mr-2 rounded-full px-2 py-1 text-xs ${queueState[row.state].className}`}>{queueState[row.state].label}</span></p>
            {row.singleId && <a href={`/crm/matchmaking?tab=singles&singleId=${row.singleId}`} className="text-sm font-bold text-[#4e1b46] underline">פתיחת הפרופיל</a>}
          </div>
          <p className="mt-2 text-xs leading-6 text-[#625d78]">רכישה: {time(row.paidAt)} · יעד ההצעה: {time(row.dueAt)}</p>
          <QueueDetails row={{ ...row, originalPromiseDeadline: row.dueAt }} time={time} />
        </article>)}
        {!postQueue.data.rows.length && <p className="text-sm text-[#625d78]">עדיין אין רכישות מאומתות דרך LIVE48. המצטרפים יופיעו כאן אוטומטית לאחר הרכישה.</p>}
      </>}
    </div>}
  </section>;
}
