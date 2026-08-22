import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const TASK_LABELS: Record<string, string> = {
  match_review: "בדיקת התאמה",
  followup: "מעקב",
  call: "שיחה",
  feedback: "משוב",
  profile: "השלמת פרופיל",
  plus: "Plus",
  partner: "שותף",
  event: "אירוע",
  other: "אחר",
};
const STATUS_LABELS: Record<string, string> = { todo: "לביצוע", in_progress: "בטיפול", done: "הושלם", cancelled: "בוטל" };

export default function OperationsSection() {
  const [tab, setTab] = useState<"tasks" | "partners">("tasks");
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("followup");
  const [priority, setPriority] = useState("normal");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerType, setPartnerType] = useState("partner");
  const [partnerCode, setPartnerCode] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const tasksQuery = trpc.operations.listTasks.useQuery(undefined, { refetchInterval: 30000 });
  const teamQuery = trpc.operations.teamMembers.useQuery();
  const partnerQuery = trpc.operations.partnerOverview.useQuery(undefined, { refetchInterval: 60000 });
  const createTask = trpc.operations.createTask.useMutation({ onSuccess: () => { setTitle(""); tasksQuery.refetch(); } });
  const updateTask = trpc.operations.updateTask.useMutation({ onSuccess: () => tasksQuery.refetch() });
  const createPartner = trpc.operations.createPartnerSource.useMutation({ onSuccess: () => {
    setPartnerName(""); setPartnerCode(""); setEventDate(""); setContactEmail(""); partnerQuery.refetch();
  } });
  const updatePartner = trpc.operations.updatePartnerStatus.useMutation({ onSuccess: () => partnerQuery.refetch() });

  const tasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return (tasksQuery.data || []).filter((row: any) => {
      const haystack = `${row.task.title} ${row.task.description || ""} ${row.single?.firstName || ""} ${row.single?.lastName || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [tasksQuery.data, taskSearch]);
  const teamById = Object.fromEntries((teamQuery.data || []).map((member: any) => [member.id, member.name]));

  const submitTask = () => {
    if (title.trim().length < 2) return;
    createTask.mutate({
      title: title.trim(),
      taskType: taskType as any,
      priority: priority as any,
      assignedTeamMemberId: assignee ? Number(assignee) : undefined,
      dueAt: dueDate ? new Date(`${dueDate}T12:00:00`).getTime() : undefined,
    });
  };

  const submitPartner = () => {
    if (partnerName.trim().length < 2 || partnerCode.trim().length < 2) return;
    createPartner.mutate({
      name: partnerName.trim(),
      type: partnerType as any,
      code: partnerCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
      contactEmail: contactEmail || undefined,
      eventDate: eventDate ? new Date(`${eventDate}T12:00:00`).getTime() : undefined,
      commissionType: "none",
      commissionValue: 0,
    });
  };

  return (
    <section className="rounded-2xl border border-[#ddd9ef] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-[#7568a8]">תפעול, אחריות ומדידה</p>
          <h3 className="mt-1 text-lg font-black text-[#191265]">צוות, שותפים ואירועים</h3>
        </div>
        <div className="flex rounded-xl bg-[#f4f2fb] p-1">
          <button onClick={() => setTab("tasks")} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === "tasks" ? "bg-[#191265] text-white" : "text-[#666]"}`}>משימות צוות</button>
          <button onClick={() => setTab("partners")} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === "partners" ? "bg-[#191265] text-white" : "text-[#666]"}`}>שותפים ואירועים</button>
        </div>
      </div>

      {tab === "tasks" ? (
        <div className="mt-5">
          <div className="grid gap-2 rounded-xl border border-[#ebe9f4] bg-[#faf9fd] p-3 md:grid-cols-6">
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="משימה חדשה" className="md:col-span-2 rounded-lg border bg-white px-3 py-2 text-xs" />
            <select value={taskType} onChange={event => setTaskType(event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-xs">
              {Object.entries(TASK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={priority} onChange={event => setPriority(event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-xs">
              <option value="normal">רגילה</option><option value="high">גבוהה</option><option value="urgent">דחופה</option><option value="low">נמוכה</option>
            </select>
            <select value={assignee} onChange={event => setAssignee(event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-xs">
              <option value="">לא מוקצה</option>{(teamQuery.data || []).map((member: any) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <div className="flex gap-1">
              <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-2 text-[10px]" />
              <button onClick={submitTask} disabled={createTask.isPending} className="rounded-lg bg-[#191265] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">הוסף</button>
            </div>
          </div>

          <input value={taskSearch} onChange={event => setTaskSearch(event.target.value)} placeholder="חיפוש משימה או אדם" className="mt-3 w-full rounded-xl border px-3 py-2.5 text-xs" />
          <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto">
            {tasks.map((row: any) => (
              <article key={row.task.id} className={`rounded-xl border p-3 ${row.task.priority === "urgent" ? "border-red-200 bg-red-50/40" : "border-[#ecebf3]"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-xs text-[#191265]">{row.task.title}</strong>
                      <span className="rounded-full bg-[#f2f0fa] px-2 py-0.5 text-[9px] font-bold text-[#574b89]">{TASK_LABELS[row.task.taskType]}</span>
                      <span className="text-[9px] text-[#888]">{STATUS_LABELS[row.task.status]}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#777]">
                      {row.single ? `${row.single.firstName} ${row.single.lastName || ""} · ` : ""}
                      {row.task.assignedTeamMemberId ? `אחראי/ת: ${teamById[row.task.assignedTeamMemberId] || row.task.assignedTeamMemberId}` : "לא מוקצה"}
                      {row.task.dueAt ? ` · יעד ${new Date(row.task.dueAt).toLocaleDateString("he-IL")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {row.task.status === "todo" && <button onClick={() => updateTask.mutate({ id: row.task.id, status: "in_progress" })} className="rounded-lg border px-2.5 py-1.5 text-[9px] font-bold">התחל/י</button>}
                    {row.task.status !== "done" && <button onClick={() => updateTask.mutate({ id: row.task.id, status: "done" })} className="rounded-lg bg-green-600 px-2.5 py-1.5 text-[9px] font-bold text-white">הושלם</button>}
                    {!row.task.assignedTeamMemberId && (teamQuery.data || []).map((member: any) => (
                      <button key={member.id} onClick={() => updateTask.mutate({ id: row.task.id, assignedTeamMemberId: member.id })} className="rounded-lg border border-[#d9d5eb] px-2 py-1 text-[8px] text-[#574b89]">הקצה ל־{member.name}</button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {tasks.length === 0 && <div className="py-8 text-center text-xs text-[#888]">אין משימות לפי החיפוש הנוכחי</div>}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#f7f6fb] p-3"><strong className="block text-xl text-[#191265]">{partnerQuery.data?.totals.leads || 0}</strong><span className="text-[10px] text-[#777]">לידים</span></div>
            <div className="rounded-xl bg-[#f7f6fb] p-3"><strong className="block text-xl text-[#191265]">{partnerQuery.data?.totals.purchases || 0}</strong><span className="text-[10px] text-[#777]">רכישות</span></div>
            <div className="rounded-xl bg-[#f7f6fb] p-3"><strong className="block text-xl text-[#191265]">₪{Math.round(partnerQuery.data?.totals.revenue || 0).toLocaleString("he-IL")}</strong><span className="text-[10px] text-[#777]">הכנסה</span></div>
          </div>

          {partnerQuery.data?.canManage && (
            <div className="mt-3 grid gap-2 rounded-xl border border-[#ebe9f4] bg-[#faf9fd] p-3 md:grid-cols-5">
              <input value={partnerName} onChange={event => setPartnerName(event.target.value)} placeholder="שם שותף/אירוע" className="rounded-lg border bg-white px-3 py-2 text-xs" />
              <select value={partnerType} onChange={event => setPartnerType(event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-xs"><option value="partner">שותף</option><option value="event">אירוע</option><option value="organization">ארגון</option><option value="referrer">מפנה</option></select>
              <input value={partnerCode} onChange={event => setPartnerCode(event.target.value)} placeholder="קוד באנגלית" className="rounded-lg border bg-white px-3 py-2 text-xs" />
              <input type={partnerType === "event" ? "date" : "email"} value={partnerType === "event" ? eventDate : contactEmail} onChange={event => partnerType === "event" ? setEventDate(event.target.value) : setContactEmail(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs" placeholder="מייל" />
              <button onClick={submitPartner} disabled={createPartner.isPending} className="rounded-lg bg-[#191265] px-3 py-2 text-xs font-black text-white">צור מקור מדיד</button>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {(partnerQuery.data?.rows || []).map((row: any) => (
              <article key={row.source.id} className="rounded-xl border border-[#ecebf3] p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><strong className="text-xs text-[#191265]">{row.source.name}</strong><span className="text-[9px] text-[#777]">{row.source.type} · {row.source.code}</span></div>
                    <p className="mt-1 text-[10px] text-[#777]">{row.leads} לידים · {row.purchases} רכישות · ₪{Math.round(row.revenue).toLocaleString("he-IL")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => navigator.clipboard.writeText(row.trackingUrl)} className="rounded-lg border px-2.5 py-1.5 text-[9px] font-bold">העתק קישור מדיד</button>
                    {partnerQuery.data?.canManage && <button onClick={() => updatePartner.mutate({ id: row.source.id, status: row.source.status === "active" ? "inactive" : "active" })} className="rounded-lg bg-[#f3f1fb] px-2.5 py-1.5 text-[9px] font-bold text-[#574b89]">{row.source.status === "active" ? "השבת" : "הפעל"}</button>}
                  </div>
                </div>
              </article>
            ))}
            {(partnerQuery.data?.rows || []).length === 0 && <div className="py-8 text-center text-xs text-[#888]">עדיין לא נוצרו מקורות שותפים או אירועים</div>}
          </div>
        </div>
      )}
    </section>
  );
}
