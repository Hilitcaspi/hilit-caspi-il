import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Clipboard, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { purchaseRecoveryOfferUrl, recoveryOfferCode, type PurchaseRecoveryProduct } from "@shared/purchaseRecoveryLinks";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PRODUCT_OPTIONS: Array<{ value: PurchaseRecoveryProduct; label: string }> = [
  { value: "database", label: "מאגר" },
  { value: "session", label: "פגישה" },
  { value: "plus", label: "Plus" },
];

const EVIDENCE_OPTIONS = [
  { value: "all", label: "כל העדויות" },
  { value: "product_link_clicked", label: "נלחץ קישור למוצר" },
  { value: "product_marketing_email_opened", label: "נפתח מייל שיווקי" },
  { value: "saved_checkout_failure_alert", label: "נשמרה התראת כשל בתשלום" },
  { value: "saved_checkout_attempt", label: "נשמר ניסיון תשלום" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "held", label: "מוחזק" },
  { value: "queued", label: "בתור" },
  { value: "accepted", label: "התקבל לשליחה" },
  { value: "failed", label: "נכשל" },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  held: { label: "מייל ו־SMS מוחזקים", className: "bg-amber-100 text-amber-800" },
  email_held: { label: "מייל מוחזק", className: "bg-amber-100 text-amber-800" },
  sms_held: { label: "SMS מוחזק", className: "bg-amber-100 text-amber-800" },
  scheduled_19: { label: "מתוזמן ל־19:00", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "התקבל לשליחה", className: "bg-emerald-100 text-emerald-800" },
  failed: { label: "נכשל", className: "bg-rose-100 text-rose-800" },
  redeemed: { label: "ההטבה מומשה", className: "bg-violet-100 text-violet-800" },
  purchased: { label: "נרכש", className: "bg-green-100 text-green-800" },
  not_scheduled: { label: "טרם תוזמן", className: "bg-slate-100 text-slate-700" },
};

function formatDate(value: number | null | undefined) {
  if (!value) return "לא צוין";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "לא צוין";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("לא ניתן להעתיק כרגע. אפשר לנסות שוב.");
  }
}

function channelStateLabel(emailState: string, smsState: string) {
  const readable = (state: string) => {
    if (state === "accepted") return "התקבל";
    if (state === "held") return "מוחזק";
    if (state === "queued") return "בתור";
    if (state === "processing") return "בעיבוד";
    if (state === "failed") return "נכשל";
    if (state === "skipped") return "דולג";
    return "טיוטה";
  };
  return <><span>מייל: {readable(emailState)}</span><span>SMS: {readable(smsState)}</span></>;
}

export default function PurchaseRecoveryPanel() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<PurchaseRecoveryProduct>("database");
  const [evidence, setEvidence] = useState<(typeof EVIDENCE_OPTIONS)[number]["value"]>("all");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [cursor, setCursor] = useState<{ evidenceAt: number; id: number } | undefined>();
  const [items, setItems] = useState<any[]>([]);

  const summary = trpc.purchaseRecovery.summary.useQuery(undefined, { enabled: open, staleTime: 30_000 });
  const list = trpc.purchaseRecovery.list.useQuery({
    product,
    evidence: evidence === "all" ? undefined : evidence,
    status: status === "all" ? undefined : status,
    limit: 20,
    cursor,
  }, { enabled: open, staleTime: 15_000 });

  useEffect(() => {
    setCursor(undefined);
    setItems([]);
  }, [product, evidence, status]);

  useEffect(() => {
    if (!list.data) return;
    setItems(previous => cursor ? [...previous, ...list.data.items] : list.data.items);
  }, [cursor, list.data]);

  const activeSummary = (summary.data as any)?.products?.[product];
  const offerCode = recoveryOfferCode(product);
  const offerUrl = purchaseRecoveryOfferUrl(product, "email");

  const refresh = async () => {
    setCursor(undefined);
    setItems([]);
    await Promise.all([summary.refetch(), list.refetch()]);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <Card className="border-[#191265]/20 bg-white py-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right hover:bg-[#f8f6f0]">
            <span>
              <span className="block text-sm font-bold text-[#191265]">התעניינות ונטישות רכישה</span>
              <span className="mt-1 block text-xs text-[#727272]">רשימת צוות בלבד של עניין והשלמת תשלום. פתיחת מייל אינה מעידה על כשל בתשלום.</span>
            </span>
            {open ? <ChevronUp className="h-5 w-5 shrink-0 text-[#191265]" /> : <ChevronDown className="h-5 w-5 shrink-0 text-[#191265]" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t border-[#ede8dd] px-4 pb-4 pt-4">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
              הפרטים מוצגים לצוות מורשה בלבד. סטטוס "התקבל לשליחה" מאשר קליטה אצל ספק ההודעות, ולא מסירה לתיבה. העתקת קישור או קוד אינה שולחת או מפיצה הטבה לאף אחד.
            </div>

            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {PRODUCT_OPTIONS.map(option => (
                  <Button key={option.value} size="sm" variant="outline" onClick={() => setProduct(option.value)} className={product === option.value ? "border-[#191265] bg-[#191265] text-white hover:bg-[#191265] hover:text-white" : "text-[#191265]"}>
                    {option.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={summary.isFetching || list.isFetching} className="text-[#191265]">
                {summary.isFetching || list.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                רענון
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["ברשימה", activeSummary?.total ?? 0],
                ["הסכמת מייל", activeSummary?.emailConsented ?? 0],
                ["מיילים מוחזקים", activeSummary?.emailHeld ?? 0],
                ["SMS מוחזקים", activeSummary?.smsHeld ?? 0],
                ["נרכשו", activeSummary?.purchased ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-[#ede8dd] bg-[#fdfcf9] p-2 text-center">
                  <div className="text-lg font-black text-[#191265]">{value}</div>
                  <div className="text-[11px] text-[#727272]">{label}</div>
                </div>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-[#f8f6f0] p-3">
              <Button size="sm" onClick={() => void copyText(offerUrl, "קישור ההטבה הועתק") } className="bg-[#191265] text-white hover:bg-[#1800ad]">
                <Clipboard className="h-3.5 w-3.5" /> העתקת קישור הטבה
              </Button>
              <Button size="sm" variant="outline" onClick={() => void copyText(offerCode, "קוד ההטבה הועתק") } className="border-[#191265]/30 text-[#191265]">
                <Copy className="h-3.5 w-3.5" /> העתקת קוד
              </Button>
              <span className="self-center text-xs text-[#727272]">{offerCode} · בתוקף עד 26.10.2026 בשעה 23:59, שעון ישראל</span>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-[#727272]">
                עדות עניין
                <select value={evidence} onChange={event => setEvidence(event.target.value as typeof evidence)} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-xs text-[#191265]">
                  {EVIDENCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-[#727272]">
                סטטוס שליחה
                <select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-xs text-[#191265]">
                  {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {list.isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#727272]"><Loader2 className="h-4 w-4 animate-spin" />טוען רשימה מורשית</div>
            ) : list.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">לא ניתן לטעון את הרשימה כרגע. אפשר לרענן ולנסות שוב.</div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">אין כרגע רשומות התואמות לסינון.</div>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const statusConfig = STATUS_LABELS[item.status] ?? STATUS_LABELS.not_scheduled;
                  return (
                    <article key={item.id} className="rounded-xl border border-[#ede8dd] bg-white p-3 text-right">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#191265]">{item.name || "ללא שם"}</div>
                          <div className="mt-1 break-all text-xs text-[#555]" dir="ltr">{item.email}</div>
                          {item.phone && <div className="mt-1 text-xs text-[#555]" dir="ltr">{item.phone}</div>}
                        </div>
                        <Badge className={`border-0 text-[11px] ${statusConfig.className}`}>{statusConfig.label}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#727272]">
                        <span>{item.evidenceLabel}</span>
                        <span>{formatDate(item.evidenceAt)}</span>
                        {channelStateLabel(item.emailState, item.smsState)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.emailConsent && <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">הסכמת מייל מאומתת</Badge>}
                        {item.smsConsent && <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">הסכמת SMS מאומתת</Badge>}
                        {item.consentSource && <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">מקור הסכמה: {item.consentSource}</Badge>}
                        {item.suppressionReason && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">מוחזק: {item.suppressionReason}</Badge>}
                        {item.offerRedeemedAt && <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">מימוש: {formatDate(item.offerRedeemedAt)}</Badge>}
                        {item.giftGrantedAt && <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100"><Check className="ml-1 h-3 w-3" />המתנה ניתנה</Badge>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {list.data?.nextCursor && (
              <div className="mt-3 text-center">
                <Button size="sm" variant="outline" disabled={list.isFetching} onClick={() => setCursor(list.data?.nextCursor ?? undefined)}>
                  {list.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} טען עוד
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
