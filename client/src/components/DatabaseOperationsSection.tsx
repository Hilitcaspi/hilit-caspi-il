import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDot, FileCheck2, HeartHandshake, KeyRound, ListFilter, Loader2, MailX, MessageSquareText, RefreshCw, Search, ShieldCheck, Sparkles, UserCheck, UserRoundCog, UserX, Users, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const operations = [
  { tab: "singles", label: "מאגר הפנויים והפנויות", description: "חיפוש, צפייה ועדכון פרופילים", icon: Users },
  { tab: "matches", label: "התאמות פעילות", description: "מעקב וניהול התאמות", icon: HeartHandshake },
  { tab: "unmatched", label: "התאמות לטיפול", description: "פרופילים שממתינים להצעה", icon: CircleDot },
  { tab: "inactive", label: "לא פעילים", description: "טיפול בפרופילים לא פעילים", icon: ListFilter },
  { tab: "update_requests", label: "בקשות עדכון", description: "אישור וטיוב פרטי פרופיל", icon: FileCheck2 },
  { tab: "compatibility", label: "תאימות", description: "כלי התאמה וסינון", icon: Search },
  { tab: "tokens", label: "קישורי כניסה", description: "ניהול טוקנים והרשאות", icon: KeyRound },
  { tab: "boost", label: "Match Boost", description: "ניהול חברי התכנית", icon: Zap },
  { tab: "plus", label: "Plus", description: "ניהול חברי הפיילוט", icon: Sparkles },
  { tab: "testimonials", label: "המלצות", description: "איסוף וניהול משובים", icon: MessageSquareText },
  { tab: "daily_report", label: "דוח יומי", description: "תמונת מצב לצוות", icon: RefreshCw },
] as const;
const actions = [
  { value: "close_profile", label: "סגירת פרופיל", icon: UserX, hint: "מוציא את הפרופיל ממאגר ההתאמות" },
  { value: "activate_profile", label: "הפעלת פרופיל", icon: UserCheck, hint: "מחזיר פרופיל לא פעיל למאגר" },
  { value: "correct_email", label: "תיקון כתובת מייל", icon: UserRoundCog, hint: "מעדכן את כתובת הכניסה בפרופיל" },
  { value: "unsubscribe_marketing", label: "הסרה מדיוור", icon: MailX, hint: "מסמן הסרה מדיוור שיווקי בלבד" },
] as const;
const selfServiceCapabilities = [
  "חיפוש, צפייה ועדכון פרופילים במאגר",
  "טיפול בהתאמות, חריגים ובקשות עדכון",
  "ניהול Match Boost ו-Plus מתוך ה-CRM",
  "ניהול קישורי כניסה, משובים ודוחות עבודה",
];

function navigateTo(tab: string) { window.location.assign(`/crm/matchmaking?tab=${encodeURIComponent(tab)}`); }
function createIdempotencyKey() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function fullName(profile: any) { return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "פרופיל ללא שם"; }

export default function DatabaseOperationsSection() {
  const api = trpc as any;
  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<(typeof actions)[number]["value"]>("close_profile");
  const [newEmail, setNewEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const searchQuery = api.controlCenter.searchProfiles.useQuery({ query: submittedSearch, limit: 12 }, { enabled: submittedSearch.length >= 2, refetchOnWindowFocus: false });
  const isEmailValid = /^\S+@\S+\.\S+$/.test(newEmail.trim());
  const previewEnabled = Boolean(selected && (action !== "correct_email" || isEmailValid));
  const previewQuery = api.controlCenter.profileActionPreview.useQuery({ singleId: selected?.id || 0, action, ...(action === "correct_email" ? { newEmail: newEmail.trim() } : {}) }, { enabled: previewEnabled, refetchOnWindowFocus: false });
  const apply = api.controlCenter.applyProfileAction.useMutation({
    onSuccess: () => {
      setConfirmation("");
      previewQuery.refetch();
      searchQuery.refetch();
    },
  });
  const selectedAction = actions.find(item => item.value === action)!;
  const preview = previewQuery.data;
  const results = useMemo(() => Array.isArray(searchQuery.data) ? searchQuery.data : [], [searchQuery.data]);

  const submitSearch = () => {
    const clean = searchText.trim();
    if (clean.length >= 2) { setSubmittedSearch(clean); setSelected(null); setConfirmation(""); }
  };
  const chooseProfile = (profile: any) => { setSelected(profile); setConfirmation(""); setNewEmail(""); };
  const applyAction = () => {
    if (!selected || !preview?.canApply || confirmation.trim() !== preview.confirmationPhrase || apply.isPending) return;
    apply.mutate({ singleId: selected.id, action, ...(action === "correct_email" ? { newEmail: newEmail.trim() } : {}), expectedUpdatedAt: preview.profile?.updatedAt, confirmation: confirmation.trim(), idempotencyKey: createIdempotencyKey() });
  };

  return <div dir="rtl" className="space-y-5">
    <Card className="border-[#191265]/10 shadow-sm">
      <CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-xl text-[#191265]">פעולה עצמאית בפרופיל</CardTitle><CardDescription className="mt-1 leading-6">מחפשים פרופיל, בודקים את ההשפעה ומאשרים במפורש לפני ביצוע.</CardDescription></div><Badge className="border border-[#ffe27c] bg-[#fff8d9] text-[#191265] hover:bg-[#fff8d9]">ללא מחיקה, חיוב או שליחה</Badge></div></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="profile-search" className="font-bold text-[#191265]">חיפוש אדם</Label><div className="flex gap-2"><Input id="profile-search" value={searchText} onChange={event => setSearchText(event.target.value)} onKeyDown={event => event.key === "Enter" && submitSearch()} placeholder="שם, מייל או טלפון" className="border-[#191265]/20 focus-visible:ring-[#ffe27c]" /><Button type="button" onClick={submitSearch} disabled={searchText.trim().length < 2 || searchQuery.isFetching} className="shrink-0 bg-[#191265] text-white hover:bg-[#191265]/90">{searchQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}<span className="sr-only">חיפוש</span></Button></div><p className="text-xs text-slate-500">לפחות שני תווים. תוצאות החיפוש מוגבלות לצוות המורשה.</p></div>
        {searchQuery.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{searchQuery.error.message || "החיפוש לא הושלם."}</p>}
        {submittedSearch && !searchQuery.isFetching && !searchQuery.error && <div className="grid gap-2 sm:grid-cols-2">{results.length ? results.map((profile: any) => <button type="button" key={profile.id} onClick={() => chooseProfile(profile)} className={`rounded-xl border p-3 text-right transition ${selected?.id === profile.id ? "border-[#191265] bg-[#191265]/[0.04]" : "border-[#191265]/10 hover:border-[#191265]/30"}`}><span className="block font-bold text-[#191265]">{fullName(profile)}</span><span className="mt-1 block truncate text-xs text-slate-500">{profile.email || profile.phone || "ללא פרטי קשר"}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${profile.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{profile.isActive ? "פעיל/ה" : "לא פעיל/ה"}</span></button>) : <p className="rounded-xl bg-[#191265]/[0.03] p-3 text-sm text-slate-500">לא נמצאו פרופילים תואמים.</p>}</div>}

        {selected && <div className="space-y-4 rounded-2xl border border-[#191265]/15 bg-[#fafaff] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-[#191265]">{fullName(selected)}</p><p className="mt-1 text-xs text-slate-500">{selected.email || "ללא מייל"} · {selected.phone || "ללא טלפון"}</p></div><Badge variant="outline" className="border-[#191265]/20 text-[#191265]">ID {selected.id}</Badge></div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="space-y-2"><Label>פעולה</Label><Select value={action} onValueChange={(value: any) => { setAction(value); setConfirmation(""); }}><SelectTrigger className="border-[#191265]/20"><SelectValue /></SelectTrigger><SelectContent>{actions.map(item => <SelectItem value={item.value} key={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-slate-500">{selectedAction.hint}</p></div>{action === "correct_email" && <div className="space-y-2"><Label htmlFor="correct-email">כתובת מייל חדשה</Label><Input id="correct-email" dir="ltr" type="email" value={newEmail} onChange={event => { setNewEmail(event.target.value); setConfirmation(""); }} placeholder="name@example.com" className="border-[#191265]/20" />{newEmail && !isEmailValid && <p className="text-xs text-red-700">יש להזין כתובת מייל תקינה כדי לבדוק את הפעולה.</p>}</div>}</div>
          {previewQuery.isFetching && <div className="flex items-center gap-2 text-sm text-[#191265]"><Loader2 className="size-4 animate-spin" />בודקים השפעה על הפרופיל…</div>}
          {previewQuery.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{previewQuery.error.message || "לא ניתן לבדוק את הפעולה."}</p>}
          {preview && <ActionPreview preview={preview} confirmation={confirmation} setConfirmation={setConfirmation} onApply={applyAction} applying={apply.isPending} actionLabel={selectedAction.label} />}
          {apply.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{apply.error.message || "הפעולה לא הושלמה."}</p>}
          {apply.isSuccess && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">הפעולה בוצעה ותועדה.</p>}
        </div>}
      </CardContent>
    </Card>

    <Card className="border-[#191265]/10 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-lg text-[#191265]">פעולות המאגר המלאות</CardTitle><CardDescription>כניסה ישירה לכלי ה-CRM הקיימים. פעולות נוספות נעשות שם ובהתאם להרשאות הקיימות.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{operations.map(({ tab, label, description, icon: Icon }) => <button type="button" key={tab} onClick={() => navigateTo(tab)} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-[#191265]/10 bg-white p-3 text-right transition hover:border-[#191265]/30 hover:bg-[#191265]/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe27c]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#191265] text-[#ffe27c]"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#191265]">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span><ArrowLeft className="size-4 shrink-0 text-[#191265]/50 transition group-hover:-translate-x-0.5" /></button>)}</div></CardContent></Card>

    <Card className="border-[#191265]/10 bg-gradient-to-bl from-white to-[#fffdf4] shadow-sm"><CardHeader className="pb-3"><div className="flex items-center gap-2 text-[#191265]"><ShieldCheck className="size-5" /><CardTitle className="text-lg">מה כבר עצמאי?</CardTitle></div><CardDescription>היכולות האלו זמינות לצוות בתוך המערכות הקיימות, ללא פנייה או אישור חיצוני.</CardDescription></CardHeader><CardContent><ul className="grid gap-3 sm:grid-cols-2">{selfServiceCapabilities.map(item => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#191265]" />{item}</li>)}</ul><div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={() => navigateTo("singles")} className="bg-[#191265] text-white hover:bg-[#191265]/90">למאגר הפרופילים <ArrowLeft className="mr-1 size-4" /></Button><Button type="button" variant="outline" onClick={() => navigateTo("daily_report")} className="border-[#191265]/20 text-[#191265] hover:bg-[#191265]/5">לדו״ח היומי</Button></div></CardContent></Card>
  </div>;
}

function ActionPreview({ preview, confirmation, setConfirmation, onApply, applying, actionLabel }: { preview: any; confirmation: string; setConfirmation: (value: string) => void; onApply: () => void; applying: boolean; actionLabel: string }) {
  const canConfirm = preview.canApply && confirmation.trim() === preview.confirmationPhrase;
  return <div className="space-y-3 rounded-xl border border-[#ffe27c] bg-[#fffdf5] p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#191265]" /><h3 className="font-bold text-[#191265]">בדיקה לפני {actionLabel}</h3></div>{preview.plannedChanges?.length > 0 && <section><p className="mb-1 text-xs font-bold text-[#191265]">מה ישתנה</p><ul className="space-y-1">{preview.plannedChanges.map((item: string) => <li key={item} className="text-sm leading-6 text-slate-700">• {item}</li>)}</ul></section>}{preview.warnings?.length > 0 && <section className="rounded-lg bg-amber-50 p-3"><p className="mb-1 flex items-center gap-1 text-xs font-bold text-amber-900"><AlertTriangle className="size-4" />לשים לב</p>{preview.warnings.map((item: string) => <p key={item} className="text-sm leading-6 text-amber-900">• {item}</p>)}</section>}{preview.blockers?.length > 0 && <section className="rounded-lg bg-red-50 p-3"><p className="mb-1 flex items-center gap-1 text-xs font-bold text-red-900"><AlertTriangle className="size-4" />לא ניתן לבצע כרגע</p>{preview.blockers.map((item: string) => <p key={item} className="text-sm leading-6 text-red-900">• {item}</p>)}</section>}{preview.canApply && <><div className="space-y-2"><Label htmlFor="profile-confirmation">להשלמה, הקלידי בדיוק: <strong dir="rtl">{preview.confirmationPhrase}</strong></Label><Input id="profile-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={preview.confirmationPhrase} className="border-[#191265]/20" /></div><Button type="button" onClick={onApply} disabled={!canConfirm || applying} className="bg-[#191265] text-white hover:bg-[#191265]/90">{applying && <Loader2 className="ml-1 size-4 animate-spin" />}אישור ביצוע</Button></>}</div>;
}

export { DatabaseOperationsSection };
