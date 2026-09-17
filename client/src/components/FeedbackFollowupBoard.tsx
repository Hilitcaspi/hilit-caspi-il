import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, HeartHandshake, Loader2, MessageCircle, RefreshCw, Sparkles, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

type Queue = "all" | "positive" | "service_recovery" | "matchmaking" | "personal" | "publishing";
type FollowupStatus = "all" | "open" | "in_progress" | "waiting_customer" | "resolved" | "dismissed";
type ContactChannel = "email" | "sms" | "phone" | "whatsapp" | "other";

const queueLabels: Record<Queue, string> = {
  all: "כל המעקב",
  positive: "הגיבו בחיוב",
  service_recovery: "דורשים טיפול",
  matchmaking: "דורשים התאמות",
  personal: "יחס אישי",
  publishing: "המלצות לפרסום",
};

const statusLabels: Record<FollowupStatus, string> = {
  all: "כל המצבים",
  open: "חדש",
  in_progress: "בטיפול",
  waiting_customer: "ממתין לתשובה",
  resolved: "טופל",
  dismissed: "לא נדרש טיפול",
};

const channelLabels: Record<ContactChannel, string> = {
  email: "מייל",
  sms: "SMS",
  phone: "טלפון",
  whatsapp: "WhatsApp",
  other: "אחר",
};

function localDateInput(timestamp?: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function FeedbackFollowupBoard() {
  const utils = trpc.useUtils();
  const [queue, setQueue] = useState<Queue>("all");
  const [status, setStatus] = useState<FollowupStatus>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ownerNotes, setOwnerNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("phone");
  const [contactNote, setContactNote] = useState("");

  const overview = trpc.testimonial.team.followupOverview.useQuery();
  const list = trpc.testimonial.team.followups.useQuery({ queue, status, limit: 200 });
  const sync = trpc.testimonial.team.syncFollowups.useMutation();
  const update = trpc.testimonial.team.updateFollowup.useMutation();
  const rows = list.data || [];
  const selected = useMemo(() => rows.find(row => row.followup.id === selectedId) || null, [rows, selectedId]);

  async function refresh() {
    await Promise.all([
      utils.testimonial.team.followupOverview.invalidate(),
      utils.testimonial.team.followups.invalidate(),
    ]);
  }

  async function apply(changes: Parameters<typeof update.mutateAsync>[0], success: string) {
    try {
      await update.mutateAsync(changes);
      toast.success(success);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העדכון נכשל");
    }
  }

  function selectRow(row: typeof rows[number]) {
    setSelectedId(row.followup.id);
    setOwnerNotes(row.followup.ownerNotes || "");
    setOutcome(row.followup.outcome || "");
    setNextActionAt(localDateInput(row.followup.nextActionAt));
    setContactNote("");
  }

  const summary = overview.data;
  const queueButtons: Array<{ key: Queue; count: number; icon: typeof Sparkles }> = [
    { key: "all", count: summary?.open || 0, icon: Clock3 },
    { key: "positive", count: summary?.positive || 0, icon: Sparkles },
    { key: "service_recovery", count: summary?.serviceRecovery || 0, icon: HeartHandshake },
    { key: "matchmaking", count: summary?.matchmakingAttention || 0, icon: UserRoundSearch },
    { key: "personal", count: summary?.personalAttention || 0, icon: MessageCircle },
    { key: "publishing", count: summary?.publishingReview || 0, icon: CheckCircle2 },
  ];

  return <div dir="rtl" className="mt-6 space-y-5">
    <div className="rounded-2xl border border-[#e6d7ce] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[.12em] text-[#9b6d55]">שירות ושימור · מקור אמת אחד</p>
          <h3 className="mt-1 text-xl font-bold text-[#2a1712]">תור מעקב אחרי כל פידבק</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f5d55]">כל תשובה נכנסת אוטומטית לכאן. אותה רשומה יכולה להופיע בכמה תורים, אבל הטיפול, הפנייה והתוצאה נשמרים פעם אחת כדי שלא יהיו כפילויות.</p>
        </div>
        <Button variant="outline" disabled={sync.isPending} onClick={async () => {
          try {
            const result = await sync.mutateAsync();
            toast.success(`סונכרנו ${result.synced} פידבקים קיימים וחדשים`);
            await refresh();
          } catch (error) { toast.error(error instanceof Error ? error.message : "הסנכרון נכשל"); }
        }} className="gap-2">{sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}סנכרון עכשיו</Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric label="פתוחים" value={summary?.open || 0} />
        <Metric label="דחופים" value={summary?.urgent || 0} tone="red" />
        <Metric label="בעדיפות גבוהה" value={summary?.high || 0} tone="amber" />
        <Metric label="ממתינים לתשובה" value={summary?.waitingCustomer || 0} />
        <Metric label="עבר מועד טיפול" value={summary?.overdue || 0} tone="amber" />
        <Metric label="טופלו" value={summary?.resolved || 0} tone="green" />
        <Metric label="סה״כ מתועדים" value={summary?.total || 0} />
      </div>
    </div>

    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e6d7ce] bg-white p-3 shadow-sm">
      {queueButtons.map(item => {
        const Icon = item.icon;
        return <Button key={item.key} size="sm" variant={queue === item.key ? "default" : "outline"} onClick={() => { setQueue(item.key); setSelectedId(null); }} className="gap-2 rounded-full"><Icon className="h-4 w-4" />{queueLabels[item.key]} ({item.count})</Button>;
      })}
      <select value={status} onChange={event => { setStatus(event.target.value as FollowupStatus); setSelectedId(null); }} className="h-9 rounded-full border bg-white px-3 text-sm">
        {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(330px,.9fr)_minmax(0,1.35fr)]">
      <div className="max-h-[760px] space-y-3 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm">
        {list.isLoading ? <div className="flex min-h-44 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : rows.length === 0 ? <div className="px-5 py-14 text-center text-sm text-[#806c62]">אין כרגע רשומות בתור הזה.</div> : rows.map(row => <button key={row.followup.id} onClick={() => selectRow(row)} className={`w-full rounded-xl border p-4 text-right transition ${selectedId === row.followup.id ? "border-[#6f3f52] bg-[#fbf5f7]" : "border-[#eadfd7] hover:border-[#c7ad9d]"}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#2a1712]">{row.record.contactName}</p><p className="mt-1 text-xs text-[#8a766d]">{row.record.sourceType === "match" ? "פידבק על התאמה" : row.record.sourceType === "database" ? "פידבק על המאגר" : "פידבק שירות"}</p></div><StatusBadge status={row.followup.status} priority={row.followup.priority} /></div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {row.followup.isPositive && <Badge className="bg-emerald-100 text-emerald-800">חיובי</Badge>}
            {row.followup.needsServiceRecovery && <Badge className="bg-rose-100 text-rose-800">טיפול</Badge>}
            {row.followup.needsMatchmakingAttention && <Badge className="bg-amber-100 text-amber-900">התאמות</Badge>}
            {row.followup.needsPersonalAttention && <Badge className="bg-violet-100 text-violet-800">יחס אישי</Badge>}
            {row.followup.needsPublishingReview && <Badge className="bg-blue-100 text-blue-800">פרסום</Badge>}
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#66534a]">{row.record.feedbackText || row.record.testimonialTextOriginal || "לא נכתב טקסט"}</p>
          {row.followup.contactedAt && <p className="mt-2 text-xs font-medium text-emerald-700">פנייה תועדה ב־{new Date(row.followup.contactedAt).toLocaleDateString("he-IL")}</p>}
        </button>)}
      </div>

      <div className="min-h-[520px] rounded-2xl bg-white p-5 shadow-sm md:p-6">
        {!selected ? <div className="flex min-h-[460px] flex-col items-center justify-center text-center"><HeartHandshake className="h-11 w-11 text-[#b09484]" /><p className="mt-4 text-lg font-semibold">בחרי פידבק לטיפול</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#806c62]">כאן מתעדים בעלות, פנייה, מועד המשך ותוצאה. עצם פתיחת הרשומה לא שולחת ללקוח דבר.</p></div> : <div className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h4 className="text-2xl font-bold text-[#2a1712]">{selected.record.contactName}</h4><p className="mt-1 text-sm text-[#806c62]">התקבל ב־{new Date(selected.record.lastResponseAt || selected.followup.createdAt).toLocaleString("he-IL")}</p></div><StatusBadge status={selected.followup.status} priority={selected.followup.priority} /></div>
          <div className="rounded-xl bg-[#f6f1ed] p-4 text-sm leading-7 text-[#59463d] whitespace-pre-wrap">{selected.record.feedbackText || "לא נכתב משוב ראשי"}</div>
          {selected.record.improvementText && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">מה ביקשו לשפר</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">{selected.record.improvementText}</p></div>}
          <div className="rounded-xl border border-[#eadfd7] p-4"><p className="text-sm font-semibold text-[#2a1712]">הפעולה המומלצת</p><p className="mt-2 text-sm leading-6 text-[#66534a]">{selected.followup.recommendedAction}</p><p className="mt-2 text-xs text-[#8a766d]">המלצה זו אינה שולחת Boost או הטבה אוטומטית. קודם בודקים את החשבון והבעיה.</p></div>

          <div className="grid gap-3 md:grid-cols-2"><label><span className="mb-1 block text-xs text-[#806c62]">עדיפות</span><select value={selected.followup.priority} onChange={event => void apply({ id: selected.followup.id, priority: event.target.value as "normal" | "high" | "urgent" }, "העדיפות עודכנה")} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="normal">רגילה</option><option value="high">גבוהה</option><option value="urgent">דחופה</option></select></label><label><span className="mb-1 block text-xs text-[#806c62]">פעולה הבאה</span><Input type="datetime-local" value={nextActionAt} onChange={event => setNextActionAt(event.target.value)} onBlur={() => void apply({ id: selected.followup.id, nextActionAt: nextActionAt ? new Date(nextActionAt).getTime() : null }, "מועד המעקב נשמר")} /></label></div>
          <div><p className="mb-1 text-xs text-[#806c62]">הערות פנימיות</p><Textarea value={ownerNotes} onChange={event => setOwnerNotes(event.target.value)} className="min-h-24" /><Button variant="outline" className="mt-2" onClick={() => void apply({ id: selected.followup.id, ownerNotes: ownerNotes || null }, "ההערות נשמרו")}>שמירת הערות</Button></div>

          <div className="rounded-xl border border-[#d9e8df] bg-[#f5fbf7] p-4"><p className="font-semibold text-[#234b35]">תיעוד פנייה שכבר ביצעת</p><div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]"><select value={contactChannel} onChange={event => setContactChannel(event.target.value as ContactChannel)} className="h-10 rounded-md border bg-white px-3 text-sm">{Object.entries(channelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input value={contactNote} onChange={event => setContactNote(event.target.value)} placeholder="מה נשלח או מה נאמר?" /></div><Button className="mt-3 bg-[#356747] text-white hover:bg-[#285339]" disabled={!contactNote.trim()} onClick={() => void apply({ id: selected.followup.id, contactChannel, contactNote }, "הפנייה תועדה והועברה לממתין לתשובה")}>תיעוד פנייה</Button></div>

          <div className="rounded-xl border border-[#eadfd7] p-4"><p className="font-semibold text-[#2a1712]">היסטוריית פניות</p>{selected.contacts.length === 0 ? <p className="mt-2 text-sm text-[#806c62]">עדיין לא תועדה פנייה.</p> : <div className="mt-3 space-y-3">{selected.contacts.map(contact => <div key={contact.id} className="border-r-2 border-[#d8c3b6] pr-3"><div className="flex flex-wrap items-center gap-2 text-xs text-[#806c62]"><Badge variant="outline">{channelLabels[contact.channel as ContactChannel]}</Badge><span>{new Date(contact.contactedAt).toLocaleString("he-IL")}</span></div>{contact.note && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#59463d]">{contact.note}</p>}</div>)}</div>}</div>

          <div><p className="mb-1 text-xs text-[#806c62]">תוצאה וסיכום טיפול</p><Textarea value={outcome} onChange={event => setOutcome(event.target.value)} placeholder="מה תוקן, מה הוצע ומה הלקוח/ה השיב/ה?" className="min-h-24" /><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void apply({ id: selected.followup.id, status: "in_progress", outcome: outcome || null }, "הטיפול התחיל")}>התחלתי טיפול</Button><Button variant="outline" onClick={() => void apply({ id: selected.followup.id, status: "waiting_customer", outcome: outcome || null }, "סומן כממתין לתשובה")}>ממתין לתשובה</Button><Button className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={!outcome.trim()} onClick={() => void apply({ id: selected.followup.id, status: "resolved", outcome }, "הטיפול הושלם")}>סיום טיפול</Button><Button variant="outline" onClick={() => void apply({ id: selected.followup.id, status: "dismissed", outcome: outcome || "נבדק ולא נדרש טיפול נוסף" }, "סומן כלא דורש טיפול")}>לא נדרש טיפול</Button></div></div>
        </div>}
      </div>
    </div>
  </div>;
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "red" | "amber" | "green" }) {
  const colors = tone === "red" ? "bg-red-50 text-red-800" : tone === "amber" ? "bg-amber-50 text-amber-900" : tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-[#f7f3ef] text-[#2a1712]";
  return <div className={`rounded-xl p-3 ${colors}`}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs">{label}</p></div>;
}

function StatusBadge({ status, priority }: { status: string; priority: string }) {
  const statusLabel = statusLabels[status as FollowupStatus] || status;
  const classes = priority === "urgent" ? "bg-red-600 text-white" : priority === "high" ? "bg-amber-100 text-amber-900" : status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";
  return <Badge className={classes}>{priority === "urgent" ? "דחוף · " : priority === "high" ? "גבוה · " : ""}{statusLabel}</Badge>;
}
