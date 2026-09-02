import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Archive, CheckCircle2, Clipboard, Eye, FileVideo, Filter, Image as ImageIcon, Loader2, Plus, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import TestimonialCreativeLibrarySection from "./TestimonialCreativeLibrarySection";

const statusLabels: Record<string, string> = {
  draft: "טיוטה",
  candidate: "מועמד/ת",
  approved_to_contact: "אושרה לפנייה",
  sent: "נשלחה",
  submitted: "התקבל משוב",
  awaiting_consent: "ממתין להסכמה",
  awaiting_verification: "ממתין לאימות",
  approved: "מאושר לפרסום",
  published: "פורסם",
  revoked: "הסכמה בוטלה",
  archived: "בארכיון",
};

const sourceLabels: Record<string, string> = {
  match: "התאמה",
  database: "מאגר",
  dna: "DNA",
  guide: "מדריך",
  course: "קורס",
  bundle: "חבילת חג",
  boost: "Boost",
  service: "שירות",
  manual: "ידני",
};

const proofLabels: Record<string, string> = {
  success: "הצלחה זוגית",
  progress: "התקדמות",
  product: "חוויית מוצר",
  database: "חוויית מאגר",
  service: "חוויית שירות",
  internal: "משוב פנימי",
};

const channelLabels: Record<string, string> = {
  website: "אתר",
  organic_social: "סושיאל אורגני",
  email: "מיילים",
  paid_ads: "מודעות בתשלום",
  pr: "יחסי ציבור",
};

const surveyKindLabels: Record<string, string> = {
  positive_experience: "חוויות והמלצות",
  satisfaction_survey: "שביעות רצון",
};

const touchpointLabels: Record<string, string> = {
  manual: "ידני",
  match_mutual: "מיד אחרי כן הדדי",
  match_week: "שבוע בהתאמה",
  dna_result: "תוצאת DNA",
  database_complete: "השלמת המאגר",
  guide_complete: "סיום מדריך",
  course_complete: "סיום קורס",
  product_followup: "מעקב מוצר",
  personal_session: "אחרי פגישה",
  representative_sample: "מדגם מייצג",
  historical_match: "גל היסטורי",
};

const rewardLabels: Record<string, string> = {
  none: "ללא מתנה",
  date_map: "מפת הדייט הבא",
};

const statusTone: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-emerald-700 text-white",
  revoked: "bg-red-100 text-red-800",
  archived: "bg-slate-100 text-slate-700",
  awaiting_verification: "bg-amber-100 text-amber-800",
  awaiting_consent: "bg-orange-100 text-orange-800",
  submitted: "bg-blue-100 text-blue-800",
  approved_to_contact: "bg-violet-100 text-violet-800",
};

type ProofType = "success" | "progress" | "product" | "database" | "service" | "internal";
type SourceType = "match" | "database" | "dna" | "guide" | "course" | "bundle" | "boost" | "service" | "manual";
type RecordStatus = "draft" | "candidate" | "approved_to_contact" | "sent" | "submitted" | "awaiting_consent" | "awaiting_verification" | "approved" | "published" | "revoked" | "archived";
type SurveyKind = "positive_experience" | "satisfaction_survey";
type Touchpoint = "manual" | "match_mutual" | "match_week" | "dna_result" | "database_complete" | "guide_complete" | "course_complete" | "product_followup" | "personal_session" | "representative_sample" | "historical_match";

export default function TestimonialManagementSection({ preview = false }: { preview?: boolean }) {
  const utils = trpc.useUtils();
  const [view, setView] = useState<"pipeline" | "library">("pipeline");
  const [status, setStatus] = useState<RecordStatus | "all">("all");
  const [sourceType, setSourceType] = useState<SourceType | "all">("all");
  const [proofType, setProofType] = useState<ProofType | "all">("all");
  const [surveyKind, setSurveyKind] = useState<SurveyKind | "all">("all");
  const [touchpoint, setTouchpoint] = useState<Touchpoint | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const listInput = useMemo(() => ({
    status: status === "all" ? undefined : status,
    sourceType: sourceType === "all" ? undefined : sourceType,
    proofType: proofType === "all" ? undefined : proofType,
    surveyKind: surveyKind === "all" ? undefined : surveyKind,
    touchpoint: touchpoint === "all" ? undefined : touchpoint,
    search: search.trim() || undefined,
    limit: 150,
  }), [status, sourceType, proofType, surveyKind, touchpoint, search]);

  const statsQuery = trpc.testimonial.team.stats.useQuery(undefined, { enabled: !preview });
  const listQuery = trpc.testimonial.team.list.useQuery(listInput, { enabled: !preview });
  const detailQuery = trpc.testimonial.team.getById.useQuery({ id: selectedId || 0 }, { enabled: !preview && Boolean(selectedId) });
  const automationQuery = trpc.testimonial.team.automationOverview.useQuery(undefined, { enabled: !preview });
  const sampleQuery = trpc.testimonial.team.satisfactionSamplePreview.useQuery({ sampleSize: 60 }, { enabled: !preview });
  const syncCandidates = trpc.testimonial.team.syncMatchCandidates.useMutation();
  const prepareHistorical = trpc.testimonial.team.prepareHistoricalDrafts.useMutation();
  const prepareSatisfaction = trpc.testimonial.team.prepareSatisfactionDrafts.useMutation();

  async function refreshAll() {
    await Promise.all([
      utils.testimonial.team.stats.invalidate(),
      utils.testimonial.team.list.invalidate(),
      utils.testimonial.team.automationOverview.invalidate(),
      selectedId ? utils.testimonial.team.getById.invalidate({ id: selectedId }) : Promise.resolve(),
    ]);
  }

  const stats = statsQuery.data;
  const records = listQuery.data || [];
  const automation = automationQuery.data;
  const sample = sampleQuery.data;

  return (
    <section dir="rtl" className="rounded-2xl bg-[#f7f3ef] p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[.15em] text-[#9b6d55]">CRM · הוכחה אמיתית ומאושרת</p>
          <h2 className="mt-1 text-2xl font-bold text-[#2a1712]">משובים והמלצות</h2>
          <p className="mt-1 text-sm text-[#77655d]">חוויות חיוביות וסקרי שביעות רצון נשמרים במסלולים נפרדים. העלאת מדיה אינה אישור לפרסום.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={view === "pipeline" ? "default" : "outline"} onClick={() => setView("pipeline")} className="rounded-full">המשפך</Button>
          <Button variant={view === "library" ? "default" : "outline"} onClick={() => setView("library")} className="rounded-full">ספר מאושרות</Button>
          {view === "pipeline" && !preview && <CreateDraftDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={async id => { setSelectedId(id); await refreshAll(); }} />}
          {view === "pipeline" && !preview && <Button variant="outline" disabled={syncCandidates.isPending} onClick={async () => {
            try {
              const result = await syncCandidates.mutateAsync();
              toast.success(`נוספו ${result.created} מועמדים. לא נשלחה אף פנייה.`);
              await refreshAll();
            } catch (error) { toast.error(error instanceof Error ? error.message : "סנכרון המועמדים נכשל"); }
          }} className="gap-2 rounded-full">{syncCandidates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}סנכרון מהתאמות</Button>}
        </div>
      </div>

      {view === "library" ? <div className="mt-6"><TestimonialCreativeLibrarySection /></div> : <>
        <div className={`mt-6 rounded-2xl border p-4 ${automation?.settings?.enabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-[#2a1712]">מצב האוטומציה: {automation?.settings?.enabled ? "פעילה" : "כבויה"}</p><p className="mt-1 text-sm text-[#6f5d55]">נקודות המגע מוכנות, אך לא יישלח מייל ולא ייווצר תזמון לפני אישור מפורש.</p></div><div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">ממתינות: {automation?.queued || 0}</Badge><Badge variant="outline">נשלחו: {automation?.sent || 0}</Badge><Badge variant="outline">צינון: {automation?.settings?.cooldownDays || 21} ימים</Badge></div></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {[
              ["כן הדדי", automation?.settings?.matchImmediateEnabled],
              ["שבוע בהתאמה", automation?.settings?.matchWeekReminderEnabled],
              ["תוצאת DNA", automation?.settings?.dnaResultEnabled],
              ["השלמת מאגר", automation?.settings?.databaseCompleteEnabled],
              ["סיום מדריך", automation?.settings?.guideCompleteEnabled],
              ["סיום קורס", automation?.settings?.courseCompleteEnabled],
              ["מעקב מוצרי חג", automation?.settings?.productFollowupEnabled],
            ].map(([label, enabled]) => <Badge key={String(label)} variant="outline" className={enabled ? "border-emerald-300 bg-white text-emerald-800" : "border-slate-200 bg-white/70 text-slate-500"}>{label}: {enabled ? "פעיל" : "כבוי"}</Badge>)}
          </div>
          {!preview && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={prepareHistorical.isPending} onClick={async () => { try { const result = await prepareHistorical.mutateAsync(); toast.success(`נוצרו ${result.created} טיוטות היסטוריות. לא נשלח דבר.`); await refreshAll(); } catch (error) { toast.error(error instanceof Error ? error.message : "הכנת הטיוטות נכשלה"); } }}>הכנת טיוטות לזוגות שאמרו כן</Button><Button variant="outline" disabled={prepareSatisfaction.isPending} onClick={async () => { try { const result = await prepareSatisfaction.mutateAsync({ sampleSize: 60 }); toast.success(`נוצרו ${result.created} טיוטות סקר. לא נשלח דבר.`); await refreshAll(); } catch (error) { toast.error(error instanceof Error ? error.message : "הכנת המדגם נכשלה"); } }}>הכנת מדגם סקר של 60</Button></div>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-8">
          <Metric label="סה״כ" value={stats?.total || 0} />
          <Metric label="חוויות" value={stats?.bySurveyKind.positive_experience || 0} />
          <Metric label="סקרי שביעות רצון" value={stats?.bySurveyKind.satisfaction_survey || 0} />
          <Metric label="טיוטות ומועמדים" value={(stats?.byStatus.draft || 0) + (stats?.byStatus.candidate || 0)} />
          <Metric label="התקבלו" value={(stats?.byStatus.submitted || 0) + (stats?.byStatus.awaiting_consent || 0) + (stats?.byStatus.awaiting_verification || 0)} />
          <Metric label="מאושרות" value={(stats?.byStatus.approved || 0) + (stats?.byStatus.published || 0)} />
          <Metric label="פניות שנשלחו" value={stats?.requestsSent || 0} />
          <Metric label="מתנות נמסרו" value={stats?.rewardsGranted || 0} />
        </div>

        <div className="mt-4 rounded-2xl bg-[#2b1712] p-4 text-white shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold">מדגם שביעות רצון נפרד</p><p className="mt-1 text-sm text-white/70">תצוגה מצרפית בלבד. לא נוצרה רשומה ולא נשלחה פנייה.</p></div><div className="flex flex-wrap gap-2 text-xs"><Badge className="bg-white/10 text-white">זכאים: {sample?.eligible || 0}</Badge>{sample?.breakdown.map(bucket => <Badge key={bucket.key} className="bg-white/10 text-white">{bucket.label}: {bucket.suggested}/{bucket.available}</Badge>)}</div></div></div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
          <label className="relative block"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e7b72]" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל או טקסט" className="pr-9" /></label>
          <FilterSelect value={status} onChange={value => setStatus(value as RecordStatus | "all")} options={statusLabels} placeholder="כל הסטטוסים" />
          <FilterSelect value={surveyKind} onChange={value => setSurveyKind(value as SurveyKind | "all")} options={surveyKindLabels} placeholder="כל המסלולים" />
          <FilterSelect value={touchpoint} onChange={value => setTouchpoint(value as Touchpoint | "all")} options={touchpointLabels} placeholder="כל נקודות המגע" />
          <FilterSelect value={sourceType} onChange={value => setSourceType(value as SourceType | "all")} options={sourceLabels} placeholder="כל המקורות" />
          <FilterSelect value={proofType} onChange={value => setProofType(value as ProofType | "all")} options={proofLabels} placeholder="כל סוגי ההוכחה" />
          <Button variant="outline" onClick={() => void refreshAll()} className="gap-2"><RefreshCw className="h-4 w-4" />רענון</Button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(330px,.9fr)_minmax(0,1.5fr)]">
          <div className="max-h-[760px] space-y-3 overflow-y-auto rounded-2xl bg-white p-3 shadow-sm">
            {!preview && listQuery.isLoading ? <LoadingCard /> : records.length === 0 ? <EmptyPipeline /> : records.map(record => <button key={record.id} onClick={() => setSelectedId(record.id)} className={`w-full rounded-xl border p-4 text-right transition ${selectedId === record.id ? "border-[#6f3f2f] bg-[#fbf5f0]" : "border-[#eadfd7] hover:border-[#c7ad9d]"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#2a1712]">{record.contactName}</p><p className="mt-1 text-xs text-[#8a766d]">{record.contactEmail}</p></div><Badge className={statusTone[record.status] || "bg-[#eee5df] text-[#62473a]"}>{statusLabels[record.status]}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#eee5df] px-2.5 py-1">{surveyKindLabels[record.surveyKind]}</span><span className="rounded-full bg-[#eee5df] px-2.5 py-1">{touchpointLabels[record.touchpoint]}</span><span className="rounded-full bg-[#eee5df] px-2.5 py-1">{sourceLabels[record.sourceType]}</span>{record.media.length > 0 && <span className="rounded-full bg-[#e5edf0] px-2.5 py-1">{record.media.length} קבצים</span>}</div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66534a]">{record.testimonialTextApproved || record.testimonialTextOriginal || record.feedbackText || record.draftBody || "טרם נכתב משוב"}</p>
            </button>)}
          </div>

          <div className="min-h-[460px] rounded-2xl bg-white p-5 shadow-sm md:p-6">
            {!selectedId ? <SelectRecord /> : detailQuery.isLoading ? <LoadingCard /> : detailQuery.data ? <RecordDetails data={detailQuery.data} onRefresh={refreshAll} /> : <SelectRecord />}
          </div>
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-bold text-[#2a1712]">{value}</p><p className="mt-1 text-xs text-[#7c6960]">{label}</p></div>;
}

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: Record<string, string>; placeholder: string }) {
  return <label className="relative"><Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e7b72]" /><select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm"><option value="all">{placeholder}</option>{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}

function CreateDraftDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: number) => Promise<void> }) {
  const create = trpc.testimonial.team.createDraft.useMutation();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [proofType, setProofType] = useState<ProofType>("product");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [surveyKind, setSurveyKind] = useState<SurveyKind>("positive_experience");
  const [touchpoint, setTouchpoint] = useState<Touchpoint>("manual");
  const [rewardType, setRewardType] = useState<"none" | "date_map">("date_map");
  async function submit() {
    try {
      const result = await create.mutateAsync({
        contactName,
        contactEmail,
        proofType: surveyKind === "satisfaction_survey" ? "internal" : proofType,
        sourceType,
        surveyKind,
        touchpoint,
        deliveryChannel: "manual",
        rewardType: surveyKind === "positive_experience" ? rewardType : "none",
      });
      toast.success("נוצרה טיוטה. לא נשלחה פנייה.");
      onOpenChange(false);
      setContactName(""); setContactEmail("");
      await onCreated(result.id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "לא הצלחנו ליצור טיוטה"); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button className="gap-2 rounded-full bg-[#2b1712] text-white"><Plus className="h-4 w-4" />טיוטה חדשה</Button></DialogTrigger><DialogContent dir="rtl" className="max-w-lg"><DialogHeader><DialogTitle>יצירת טיוטת משוב</DialogTitle></DialogHeader><div className="space-y-4"><Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="שם" /><Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="מייל" type="email" /><FilterSelect value={surveyKind} onChange={value => setSurveyKind(value as SurveyKind)} options={surveyKindLabels} placeholder="מסלול" /><FilterSelect value={touchpoint} onChange={value => setTouchpoint(value as Touchpoint)} options={touchpointLabels} placeholder="נקודת מגע" /><FilterSelect value={sourceType} onChange={value => setSourceType(value as SourceType)} options={sourceLabels} placeholder="מקור" />{surveyKind === "positive_experience" && <><FilterSelect value={proofType} onChange={value => setProofType(value as ProofType)} options={proofLabels} placeholder="סוג הוכחה" /><FilterSelect value={rewardType} onChange={value => setRewardType(value as "none" | "date_map")} options={rewardLabels} placeholder="מתנת תודה" /></>}<p className="rounded-xl bg-[#f4efe9] p-3 text-sm text-[#66534a]">יצירת הטיוטה אינה שולחת מייל או הודעה. סקר שביעות רצון נשמר בנפרד ולא הופך להמלצה.</p><Button onClick={() => void submit()} disabled={create.isPending || !contactName.trim() || !contactEmail.trim()} className="w-full">{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "יצירת טיוטה"}</Button></div></DialogContent></Dialog>;
}

function RecordDetails({ data, onRefresh }: { data: any; onRefresh: () => Promise<void> }) {
  const record = data.record;
  const structuredAnswers = parseStructuredAnswers(record.structuredAnswers);
  const update = trpc.testimonial.team.update.useMutation();
  const approveContact = trpc.testimonial.team.approveContact.useMutation();
  const verify = trpc.testimonial.team.verify.useMutation();
  const approve = trpc.testimonial.team.approve.useMutation();
  const revoke = trpc.testimonial.team.revoke.useMutation();
  const archive = trpc.testimonial.team.archive.useMutation();
  const mediaUrl = trpc.testimonial.team.mediaUrl.useMutation();
  const reviewMedia = trpc.testimonial.team.reviewMedia.useMutation();
  const recordUsage = trpc.testimonial.team.recordUsage.useMutation();
  const [draftSubject, setDraftSubject] = useState(record.draftSubject || "");
  const [draftBody, setDraftBody] = useState(record.draftBody || "");
  const [approvedText, setApprovedText] = useState(record.testimonialTextApproved || record.testimonialTextOriginal || "");
  const [usageChannel, setUsageChannel] = useState("website");
  const [usageUrl, setUsageUrl] = useState("");

  async function run(action: () => Promise<unknown>, success: string) {
    try { await action(); toast.success(success); await onRefresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "הפעולה נכשלה"); }
  }

  const formUrl = `${window.location.origin}${data.publicFormPath}`;
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-2xl font-bold text-[#2a1712]">{record.contactName}</h3><Badge className={statusTone[record.status] || "bg-[#eee5df] text-[#62473a]"}>{statusLabels[record.status]}</Badge></div><p className="mt-1 text-sm text-[#76645c]">{record.contactEmail} · {surveyKindLabels[record.surveyKind]} · {touchpointLabels[record.touchpoint]}</p></div><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(formUrl); toast.success("הקישור הועתק"); }} className="gap-2"><Clipboard className="h-4 w-4" />העתקת טופס</Button></div>

    <div className="rounded-xl bg-[#f6f1ed] p-4 text-sm leading-6 text-[#674f44]"><strong>מצב בטיחות:</strong> האוטומציה הכללית כבויה ואין תזמון פעיל. יצירת טיוטה או אישור לפנייה אינם שולחים דבר.</div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><InfoChip label="מקור" value={sourceLabels[record.sourceType]} /><InfoChip label="ערוץ" value={record.deliveryChannel === "email" ? "מייל" : record.deliveryChannel === "onsite" ? "באתר" : "ידני"} /><InfoChip label="מתנה" value={rewardLabels[record.rewardType]} /><InfoChip label="מסירה" value={record.requestSentAt ? new Date(record.requestSentAt).toLocaleDateString("he-IL") : "טרם נשלחה"} /></div>

    <div className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-sm font-semibold">נושא טיוטת הפנייה</p><Input value={draftSubject} onChange={e => setDraftSubject(e.target.value)} /></div><div><p className="mb-2 text-sm font-semibold">טקסט מאושר לעדות</p><Input value={approvedText} onChange={e => setApprovedText(e.target.value)} /></div></div>
    <div><p className="mb-2 text-sm font-semibold">גוף טיוטת הפנייה</p><Textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} className="min-h-28" /></div>
    <Button variant="outline" onClick={() => void run(() => update.mutateAsync({ id: record.id, draftSubject, draftBody, testimonialTextApproved: approvedText || null }), "הטיוטה נשמרה")}>שמירת טיוטה</Button>

    {(record.feedbackText || record.testimonialTextOriginal || structuredAnswers.secondaryText || structuredAnswers.outcomeText) && <div>
      <h4 className="font-semibold">תשובות המשוב הממוקדות</h4>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <TextPanel title={data.questions.primaryQuestion} text={record.feedbackText} />
        <TextPanel title={data.questions.secondaryQuestion} text={structuredAnswers.secondaryText} />
        <TextPanel title={data.questions.testimonialPrompt} text={record.testimonialTextOriginal} />
        {data.questions.outcomeQuestion && <TextPanel title={data.questions.outcomeQuestion} text={structuredAnswers.outcomeText} />}
      </div>
    </div>}

    <ConsentSummary record={record} />

    {data.media.length > 0 && <div><h4 className="font-semibold">תמונה וסרטון</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{data.media.map((media: any) => <div key={media.id} className="rounded-xl border border-[#eadfd7] p-4"><div className="flex items-center gap-2">{media.mediaType === "image" ? <ImageIcon className="h-5 w-5" /> : <FileVideo className="h-5 w-5" />}<span className="min-w-0 flex-1 truncate text-sm">{media.originalFileName}</span><Badge>{media.status}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void run(async () => { const result = await mediaUrl.mutateAsync({ id: record.id, mediaId: media.id }); window.open(result.url, "_blank", "noopener,noreferrer"); }, "קישור צפייה מאובטח נפתח")}><Eye className="ml-1 h-4 w-4" />צפייה</Button><Button size="sm" variant="outline" onClick={() => void run(() => reviewMedia.mutateAsync({ id: record.id, mediaId: media.id, decision: "approved" }), "המדיה אושרה")}><CheckCircle2 className="ml-1 h-4 w-4" />אישור</Button><Button size="sm" variant="outline" onClick={() => void run(() => reviewMedia.mutateAsync({ id: record.id, mediaId: media.id, decision: "rejected", reason: "לא אושר לשימוש" }), "המדיה נדחתה")}><XCircle className="ml-1 h-4 w-4" />דחייה</Button></div></div>)}</div></div>}

    <div className="flex flex-wrap gap-2">{["draft", "candidate"].includes(record.status) && <Button onClick={() => void run(() => approveContact.mutateAsync({ id: record.id }), "הפנייה אושרה. דבר לא נשלח.")} className="bg-[#654032] text-white">אישור להכנת פנייה</Button>}{["submitted", "awaiting_consent", "awaiting_verification"].includes(record.status) && !record.teamVerifiedAt && <Button onClick={() => void run(() => verify.mutateAsync({ id: record.id }), "המשוב אומת")}>אימות צוות</Button>}{record.teamVerifiedAt && record.status === "awaiting_verification" && <Button onClick={() => void run(() => approve.mutateAsync({ id: record.id, approvedText }), "העדות אושרה לפרסום")}>אישור לפרסום</Button>}{!["revoked", "archived"].includes(record.status) && <Button variant="outline" onClick={() => void run(() => revoke.mutateAsync({ id: record.id, reason: "בוטל ידנית ב־CRM" }), "הסכמת השימוש בוטלה")}><ShieldCheck className="ml-1 h-4 w-4" />ביטול הסכמה</Button>}<Button variant="outline" onClick={() => void run(() => archive.mutateAsync({ id: record.id }), "הרשומה הועברה לארכיון")}><Archive className="ml-1 h-4 w-4" />ארכיון</Button></div>

    {["approved", "published"].includes(record.status) && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h4 className="font-semibold text-emerald-900">תיעוד שימוש מאושר</h4><div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.5fr_auto]"><select value={usageChannel} onChange={e => setUsageChannel(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">{Object.entries(channelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input value={usageUrl} onChange={e => setUsageUrl(e.target.value)} placeholder="קישור למקום שבו פורסם, לא חובה" /><Button onClick={() => void run(() => recordUsage.mutateAsync({ id: record.id, channel: usageChannel as any, publicUrl: usageUrl || undefined }), "השימוש תועד")}>תיעוד שימוש</Button></div></div>}

    {data.usage.length > 0 && <div><h4 className="font-semibold">היסטוריית שימוש</h4><div className="mt-3 space-y-2">{data.usage.map((usage: any) => <div key={usage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f1ed] px-4 py-3 text-sm"><span>{channelLabels[usage.channel] || usage.channel}{usage.placement ? ` · ${usage.placement}` : ""}</span><span className="text-[#7d6a61]">{new Date(usage.publishedAt).toLocaleDateString("he-IL")}</span></div>)}</div></div>}
    {data.events.length > 0 && <div><h4 className="font-semibold">היסטוריית הרשומה והמסירה</h4><div className="mt-3 space-y-2">{data.events.map((event: any) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6f1ed] px-4 py-3 text-sm"><span>{event.eventType}</span><span className="text-[#7d6a61]">{new Date(event.createdAt).toLocaleString("he-IL")}</span></div>)}</div></div>}
  </div>;
}

function InfoChip({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#eadfd7] p-3"><p className="text-xs text-[#8a766d]">{label}</p><p className="mt-1 text-sm font-semibold text-[#2a1712]">{value}</p></div>; }

function ConsentSummary({ record }: { record: any }) {
  const channels = [["allowWebsite", "אתר"], ["allowOrganicSocial", "סושיאל"], ["allowEmail", "מייל"], ["allowPaidAds", "מודעות"], ["allowPr", "יחסי ציבור"]].filter(([key]) => record[key]).map(([, label]) => label);
  const quickTextConsent = record.consentText && record.identityScope === "first_name" && record.allowWebsite && record.allowOrganicSocial && record.allowEmail && !record.allowPaidAds && !record.allowPr;
  return <div className="rounded-xl border border-[#e1d5cc] p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#6f3f2f]" /><h4 className="font-semibold">הצהרת שימוש</h4></div>{quickTextConsent && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">אישור מהיר: טקסט עם שם פרטי באתר, בסושיאל ובמייל</p>}<div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline">זהות: {record.identityScope}</Badge><Badge variant="outline">טקסט: {record.consentText ? "מאושר" : "לא"}</Badge><Badge variant="outline">תמונה: {record.consentPhoto ? "מאושרת" : "לא"}</Badge><Badge variant="outline">וידאו: {record.consentVideo ? "מאושר" : "לא"}</Badge>{channels.map(label => <Badge key={label} variant="outline">{label}</Badge>)}</div>{record.consentRevokedAt && <p className="mt-3 text-sm font-semibold text-red-700">ההסכמה בוטלה. אין לעשות שימוש בחומר.</p>}</div>;
}

function parseStructuredAnswers(value: string | null | undefined): { secondaryText?: string | null; outcomeText?: string | null } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function TextPanel({ title, text }: { title: string; text?: string | null }) { return <div className="rounded-xl bg-[#f6f1ed] p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#66534a]">{text || "לא נכתב"}</p></div>; }
function LoadingCard() { return <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#6f3f2f]" /></div>; }
function EmptyPipeline() { return <div className="px-5 py-14 text-center"><p className="text-lg font-semibold text-[#2a1712]">המשפך עדיין ריק</p><p className="mt-2 text-sm leading-6 text-[#7c6960]">לא נוצרו עדויות דמה. אפשר ליצור טיוטה ידנית או להוסיף מועמדים קיימים בשלב הבא.</p></div>; }
function SelectRecord() { return <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><ShieldCheck className="h-10 w-10 text-[#b09484]" /><p className="mt-4 text-lg font-semibold">בחרו רשומה מהמשפך</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#806c62]">כאן אפשר לבדוק משוב, הסכמה, מדיה והיסטוריית שימוש בלי לשלוח פנייה.</p></div>; }
