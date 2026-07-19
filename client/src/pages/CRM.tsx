import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, formatDistanceToNow, isValid } from "date-fns";

// Safe date helpers — prevent RangeError: Invalid time value
const safeDate = (v: any): Date | null => {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(typeof v === 'bigint' ? Number(v) : v);
  return isValid(d) ? d : null;
};
const safeFormat = (v: any, fmt: string, fallback = '—'): string => {
  const d = safeDate(v);
  return d ? format(d, fmt) : fallback;
};
const safeDistanceToNow = (v: any, opts?: Parameters<typeof formatDistanceToNow>[1]): string => {
  const d = safeDate(v);
  return d ? formatDistanceToNow(d, opts) : '—';
};
import { he } from "date-fns/locale";
import {
  Phone, Mail, Calendar, MessageCircle, ChevronDown, ChevronUp,
  Bell, Users, RefreshCw, Dna, BookOpen, Database, Key, Send,
  CheckCircle, Clock, XCircle, User, Edit2, Check, X
} from "lucide-react";

// Status config
const STATUS_CONFIG = {
  new_lead:         { label: "ליד חדש",         color: "bg-blue-100 text-blue-800",    icon: "🆕", order: 0 },
  needs_followup:   { label: "לתשומת לב",        color: "bg-amber-100 text-amber-800",  icon: "📞", order: 1 },
  call_scheduled:   { label: "שיחה נקבעה",       color: "bg-purple-100 text-purple-800",icon: "🗓️", order: 2 },
  call_done:        { label: "שיחה הייתה",       color: "bg-indigo-100 text-indigo-800",icon: "✅", order: 3 },
  client_database:  { label: "לקוח/ה - מאגר",    color: "bg-green-100 text-green-800",  icon: "💛", order: 4 },
  client_guide:     { label: "לקוח/ה - מדריך",   color: "bg-teal-100 text-teal-800",    icon: "📖", order: 5 },
  client_course:    { label: "לקוח/ה - קורס",    color: "bg-violet-100 text-violet-800", icon: "🎓", order: 6 },
  client_coaching:  { label: "לקוח/ה - ליווי",   color: "bg-rose-100 text-rose-800",    icon: "👑", order: 7 },
  not_relevant:     { label: "לא רלוונטי",       color: "bg-gray-100 text-gray-500",    icon: "❌", order: 8 },
} as const;

type LeadStatus = keyof typeof STATUS_CONFIG;

type CrmLead = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dnaType?: string | null;
  source?: string | null;
  status: LeadStatus;
  notes?: string | null;
  meetingAt?: Date | null;
  product?: string | null;
  followupFlaggedAt?: Date | null;
  createdAt: number | Date;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational:  "הכשרה מקצועית",
  technician:  "הנדסאי",
  student:     "סטודנט/ית",
  bachelor:    "תואר ראשון",
  master:      "תואר שני",
  phd:         "דוקטורט",
  other:       "אחר",
};
const MARITAL_LABELS: Record<string, string> = {
  single:   "רווק/ה",
  divorced: "גרוש/ה",
  widowed:  "אלמן/ה",
};
const RELIGIOSITY_LABELS_CRM: Record<string, string> = {
  secular:        "חילוני/ת",
  traditional:    "מסורתי/ת",
  religious:      "דתי/ה",
  ultra_orthodox: "חרדי/ת",
};
const DNA_LABELS: Record<string, string> = {
  leader:      "המנהיג/ה הממגנט/ת",
  romantic:    "הרומנטיקן/ית העמוק/ה",
  free_spirit: "הרוח החופשית",
  anchor:      "העוגן היציב",
};

const SOURCE_LABELS: Record<string, string> = {
  dna_quiz:        "שאלון DNA",
  guide_form:      "מדריך חינמי",
  direct:          "ישיר",
  referral:        "המלצה",
  instagram:       "אינסטגרם",
  podcast:         "פודקאסט",
  press_article:   "כתבה במגזין",
  meta_lead_guide: "Meta - מדריך",
  meta_lead_dna:   "Meta - שאלון DNA",
  meta_lead_call:  "Meta - שיחת היכרות",
};

const JOURNEY_LABELS: Record<string, string> = {
  women_first_step:          "צעד ראשון - נשים",
  men_first_step:            "צעד ראשון - גברים",
  women_first_step_v2:       "צעד ראשון V2 - נשים",
  men_first_step_v2:         "צעד ראשון V2 - גברים",
  free_guide_nurture:        "מדריך חינמי - נורטור",
  sales_call_lead:           "Meta Lead - שיחת היכרות",
  meta_lead_dna:             "Meta Lead - שאלון DNA",
  women_guide:               "מדריך 'לבחור נכון' - נשים",
  men_guide:                 "מדריך 'לבחור נכון' - גברים",
  women_course:              "קורס 'המסע' - נשים",
  men_course:                "קורס 'המסע' - גברים",
  women_matchmaking:         "מאגר רווקים - נשים",
  men_matchmaking:           "מאגר רווקים - גברים",
  women_matchmaking_welcome: "מאגר - קבלת פנים - נשים",
  men_matchmaking_welcome:   "מאגר - קבלת פנים - גברים",
  women_transformation:      "ליווי אישי - נשים",
  men_transformation:        "ליווי אישי - גברים",
  abandoned_guide:           "נטישת עגלה - מדריך",
  abandoned_database:        "נטישת עגלה - מאגר",
  abandoned_course:          "נטישת עגלה - קורס",
  abandoned_coaching:        "נטישת עגלה - ליווי",
};

// Inline editable field component
function InlineEdit({ value, onSave, type = "text", placeholder = "" }: {
  value: string;
  onSave: (v: string) => Promise<void>;
  type?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (draft.trim() !== value) {
      await onSave(draft.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          className="text-sm border border-[#191265] rounded px-1.5 py-0.5 text-right w-40 focus:outline-none"
          dir="rtl"
          placeholder={placeholder}
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-700"><Check size={13} /></button>
        <button onClick={handleCancel} className="text-red-400 hover:text-red-500"><X size={13} /></button>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 cursor-pointer group"
      onClick={() => setEditing(true)}
    >
      <span className="group-hover:underline">{value || placeholder}</span>
      <Edit2 size={11} className="text-[#aaa] opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}

// Journey Panel - shows full customer journey for a lead
function JourneyPanel({ leadId }: { leadId: number }) {
  const { data, isLoading } = trpc.crm.getLeadJourney.useQuery({ leadId });

  if (isLoading) {
    return <div className="text-xs text-[#727272] py-3 text-center">טוען מסע לקוח...</div>;
  }
  if (!data) return null;

  const { emails: _emails, dnaResult, singleProfile, freeTokens: _freeTokens, scientificAnswers, purchasedProducts: _purchasedProducts, activeJourneys: _activeJourneys } = data as any;
  const emails = _emails ?? [];
  const freeTokens = _freeTokens ?? [];
  const purchasedProducts = _purchasedProducts ?? [];
  const activeJourneys = _activeJourneys ?? [];

  return (
    <div className="space-y-3 mt-3 border-t pt-3">
      <p className="text-xs font-bold text-[#191265]">מסע הלקוח</p>

      {/* DNA Quiz */}
      <div className="flex items-start gap-2">
        <Dna size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#191265]">שאלון DNA</p>
          {dnaResult ? (
            <div className="text-xs text-[#727272] mt-0.5">
              <span className="text-purple-700 font-medium">{DNA_LABELS[dnaResult.dnaType ?? ""] ?? dnaResult.dnaType}</span>
              <span className="mr-2">{safeFormat(dnaResult.createdAt, "dd/MM/yyyy HH:mm")}</span>
            </div>
          ) : (
            <p className="text-xs text-[#727272]">לא מילא/ה שאלון</p>
          )}
        </div>
      </div>

      {/* Singles Profile */}
      <div className="flex items-start gap-2">
        <Database size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#191265]">פרופיל במאגר</p>
          {singleProfile ? (
            <div className="text-xs text-[#727272] mt-0.5 space-y-0.5">
              <div className="flex flex-wrap gap-x-3">
                <span>{singleProfile.firstName} {singleProfile.lastName}</span>
                <span>גיל: {singleProfile.age && singleProfile.age > 0 ? singleProfile.age : '?'}</span>
                <span>{singleProfile.city}</span>
                {singleProfile.height && <span>{singleProfile.height} ס"מ</span>}
              </div>
              <div className="flex flex-wrap gap-x-3">
                {singleProfile.education && <span>השכלה: {EDUCATION_LABELS[singleProfile.education] ?? singleProfile.education}</span>}
                {singleProfile.religiosity && <span>דת: {RELIGIOSITY_LABELS_CRM[singleProfile.religiosity] ?? singleProfile.religiosity}</span>}
                {(singleProfile as any).maritalStatus && <span>מצב משפחתי: {MARITAL_LABELS[(singleProfile as any).maritalStatus] ?? (singleProfile as any).maritalStatus}</span>}
                {singleProfile.occupation && <span>עיסוק: {singleProfile.occupation}</span>}
              </div>
              {singleProfile.about && (
                <p className="text-[#555] italic mt-1 line-clamp-2">"{singleProfile.about}"</p>
              )}
              <div className="flex gap-2 mt-1">
                <Badge className={`text-xs ${singleProfile.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {singleProfile.isActive ? "פעיל/ה" : "לא פעיל/ה"}
                </Badge>
                {singleProfile.isPaid && <Badge className="text-xs bg-yellow-100 text-yellow-700">שילם/ה</Badge>}
                {singleProfile.dnaType && (
                  <Badge className="text-xs bg-purple-100 text-purple-700">{DNA_LABELS[singleProfile.dnaType] ?? singleProfile.dnaType}</Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#727272]">לא נרשם/ה למאגר</p>
          )}
        </div>
      </div>

      {/* Scientific Questionnaire */}
      <div className="flex items-start gap-2">
        <span className="text-blue-500 mt-0.5 flex-shrink-0 text-sm leading-none">&#x1F52C;</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#191265]">שאלון מדעי</p>
          {scientificAnswers ? (
            <div className="text-xs text-[#727272] mt-0.5 flex items-center gap-2 flex-wrap">
              <Badge className="text-xs bg-blue-100 text-blue-700">הושלם</Badge>
              <span>{safeFormat(scientificAnswers.completedAt, "dd/MM/yyyy HH:mm")}</span>
              {singleProfile?.isActive && (
                <Badge className="text-xs bg-green-100 text-green-700">פרופיל פעיל במאגר</Badge>
              )}
            </div>
          ) : singleProfile ? (
            <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
              <Badge className="text-xs bg-orange-100 text-orange-700">ממתין למילוי</Badge>
              {singleProfile.questionnaireToken && (
                <span className="text-orange-600">קישור נשלח במייל</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#727272]">לא רלוונטי</p>
          )}
        </div>
      </div>

      {/* Free Access Tokens */}
      {freeTokens.length > 0 && (
        <div className="flex items-start gap-2">
          <Key size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#191265]">טוקנים לגישה חינמית</p>
            {freeTokens.map((t: any) => (
              <div key={t.id} className="text-xs text-[#727272] mt-0.5 flex gap-2 flex-wrap">
                <span className={t.usedAt ? "line-through" : "text-green-600 font-medium"}>
                  {t.source} - {t.usedAt ? "מומש" : "לא מומש"}
                </span>
                <span>פג תוקף: {safeFormat(t.expiresAt, "dd/MM/yyyy")}</span>
                {t.usedAt && <span>מומש: {safeFormat(t.usedAt, "dd/MM/yyyy")}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Journeys */}
      {activeJourneys && activeJourneys.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-sm leading-none">🗺️</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#191265]">מסעות ({activeJourneys.length})</p>
            <div className="space-y-1.5 mt-1">
              {activeJourneys.map((j: any) => (
                <div key={j.journeyKey} className="bg-[#f8f6f0] rounded-lg px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#191265]">{JOURNEY_LABELS[j.journeyKey] ?? j.journeyKey}</span>
                    {j.nextEmailAt ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0">פעיל</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0">הסתיים</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#727272]">
                    <span>נשלחו: {j.emailsSent}/{j.totalEmails}</span>
                    {j.nextEmailAt && <span className="text-amber-600">הבא: {safeFormat(j.nextEmailAt, "dd/MM HH:mm")}</span>}
                    <span>התחיל: {safeFormat(j.startedAt, "dd/MM/yy")}</span>
                  </div>
                  {j.lastEmailSubject && <p className="text-[10px] text-[#999] mt-0.5 truncate">אחרון: {j.lastEmailSubject}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Purchased Products */}
      {purchasedProducts && purchasedProducts.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0 text-sm leading-none">🛍️</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#191265]">מוצרים שנרכשו</p>
            <div className="space-y-1 mt-1">
              {purchasedProducts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                  <span className="font-medium text-green-700">
                    {p.product === 'guide_149' ? 'מדריך בתשלום ₪149' : p.product === 'course_249' ? 'קורס ₪249' : p.product}
                  </span>
                  <span className="text-[#aaa] text-[10px]">{safeFormat(p.createdAt, "dd/MM/yyyy")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Emails sent */}
      <div className="flex items-start gap-2">
        <Send size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#191265]">מיילים שנשלחו ({emails.length})</p>
          {emails.length === 0 ? (
            <p className="text-xs text-[#727272]">לא נשלחו מיילים</p>
          ) : (
            <div className="space-y-1 mt-1">
              {emails.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  {e.status === "sent" ? (
                    <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                  ) : e.status === "failed" ? (
                    <XCircle size={11} className="text-red-500 flex-shrink-0" />
                  ) : (
                    <Clock size={11} className="text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-[#555] truncate flex-1">{e.subject}</span>
                  <span className="text-[#aaa] flex-shrink-0 text-[10px]">
                    {JOURNEY_LABELS[e.journeyKey] ?? e.journeyKey} #{e.emailIndex}
                  </span>
                  {e.openCount > 0 && <span title={`נפתח ${e.openCount}ופעמים`} className="text-blue-500 text-[10px] flex-shrink-0">👁{e.openCount}</span>}
                  {e.clickCount > 0 && <span title={`נלחץ ${e.clickCount}פעמים`} className="text-green-600 text-[10px] flex-shrink-0">🔗{e.clickCount}</span>}
                  <span className="text-[#aaa] flex-shrink-0">
                    {e.sentAt ? safeFormat(e.sentAt, "dd/MM HH:mm") : "ממתין"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Lead Card
function LeadCard({ lead, onStatusChange, onNotesChange, onLeadUpdate }: {
  lead: CrmLead;
  onStatusChange: (id: number, status: LeadStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
  onLeadUpdate: (id: number, fields: Partial<Pick<CrmLead, "name" | "email" | "phone" | "gender">>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "bg-gray-100 text-gray-500", icon: "❓", order: 99 };
  const isUrgent = lead.status === "needs_followup";
  const hasMeeting = lead.status === "call_scheduled" && lead.meetingAt;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onNotesChange(lead.id, notes);
    setSavingNotes(false);
    toast.success("הערות נשמרו");
  };

  const getWhatsappUrl = (msgType: "followup" | "meeting" | "welcome") => {
    if (!lead.phone) return null;
    const phone = `972${lead.phone.replace(/^0/, "").replace(/\D/g, "")}`;
    const firstName = lead.name.split(" ")[0];
    const messages = {
      followup: `שלום ${firstName}, אני הילית כספי\n\nראיתי שעשית את שאלון ה-DNA שלי - רציתי לבדוק איך הולך\n\nיש שאלה קצרה שאני רוצה לשאול - אפשר לקבוע פגישה אישית?\nhttps://hilitcaspi.com/single-session`,
      meeting: `שלום ${firstName}\n\nמזכירה שיש לנו פגישה מחר - מחכה לדבר איתך!\n\nאם צריך לשנות את המועד אפשר לעשות זאת כאן:\nhttps://hilitcaspi.com/single-session`,
      welcome: `שלום ${firstName}\n\nשמחתי לקבל אותך! אני הילית כספי\n\nבקרוב אשלח לך את כל הפרטים. בינתיים אם יש שאלות אפשר לפנות אלי בכל עת`,
    };
    return `https://wa.me/${phone}?text=${encodeURIComponent(messages[msgType])}`;
  };

  const whatsappUrl = lead.phone
    ? `https://wa.me/972${lead.phone.replace(/^0/, "").replace(/\D/g, "")}`
    : null;

  // Quick status buttons — most common transitions shown inline
  const QUICK_STATUS_TRANSITIONS: Array<{ from: LeadStatus[]; to: LeadStatus; label: string; color: string }> = [
    { from: ["new_lead"], to: "needs_followup", label: "סמן לפולואפ", color: "bg-amber-100 text-amber-800 border-amber-300" },
    { from: ["new_lead", "needs_followup"], to: "call_scheduled", label: "שיחה נקבעה", color: "bg-purple-100 text-purple-800 border-purple-300" },
    { from: ["call_scheduled"], to: "call_done", label: "שיחה הייתה", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
    { from: ["call_done", "call_scheduled", "needs_followup", "new_lead"], to: "client_coaching", label: "ליווי", color: "bg-rose-100 text-rose-800 border-rose-300" },
    { from: ["call_done", "call_scheduled", "needs_followup", "new_lead"], to: "client_database", label: "מאגר", color: "bg-green-100 text-green-800 border-green-300" },
    { from: ["call_done", "call_scheduled", "needs_followup", "new_lead"], to: "not_relevant", label: "לא רלוונטי", color: "bg-gray-100 text-gray-500 border-gray-200" },
  ];

  const quickButtons = QUICK_STATUS_TRANSITIONS.filter(t => t.from.includes(lead.status) && t.to !== lead.status);

  return (
    <Card className={`mb-3 border-r-4 transition-all ${isUrgent ? "border-r-amber-400 bg-amber-50/30" : "border-r-[#191265]/20"}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Name — inline editable */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#191265] text-sm">
                <InlineEdit
                  value={lead.name}
                  placeholder="שם"
                  onSave={async (v) => {
                    await onLeadUpdate(lead.id, { name: v });
                    toast.success("שם עודכן");
                  }}
                />
              </span>
              <Badge className={`text-xs ${statusCfg.color}`}>
                {statusCfg.icon} {statusCfg.label}
              </Badge>
              {lead.dnaType && (
                <span className="text-xs text-purple-600 font-medium">{DNA_LABELS[lead.dnaType] ?? lead.dnaType}</span>
              )}
              {isUrgent && <span className="text-xs text-amber-600 font-semibold animate-pulse">ממתין לפולואפ</span>}
            </div>
            {/* Source + time */}
            <div className="flex items-center gap-3 mt-1 text-xs text-[#727272] flex-wrap">
              <span>{SOURCE_LABELS[lead.source ?? ""] ?? lead.source}</span>
              {lead.utmSource && <span className="text-[#1800ad]">UTM: {lead.utmSource}{lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}</span>}
              <span>·</span>
              <span>{safeDistanceToNow(lead.createdAt, { locale: he, addSuffix: true })}</span>
              {hasMeeting && lead.meetingAt && (
                <>
                  <span>·</span>
                  <span className="text-purple-600 font-medium">
                    {safeFormat(lead.meetingAt, "dd/MM HH:mm")}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[#727272] hover:text-[#191265] transition-colors p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quick action buttons row */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {lead.phone && (
            <>
              {(lead.status === "new_lead" || lead.status === "needs_followup") && (
                <a href={getWhatsappUrl("followup") ?? "#"} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50">
                    <MessageCircle size={12} /> וואטסאפ פולואפ
                  </Button>
                </a>
              )}
              {lead.status === "call_scheduled" && (
                <a href={getWhatsappUrl("meeting") ?? "#"} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-purple-700 border-purple-300 hover:bg-purple-50">
                    <MessageCircle size={12} /> תזכורת פגישה
                  </Button>
                </a>
              )}
              {(lead.status === "client_database" || lead.status === "client_guide" || lead.status === "client_course" || lead.status === "client_coaching") && (
                <a href={getWhatsappUrl("welcome") ?? "#"} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50">
                    <MessageCircle size={12} /> ברוכה הבאה
                  </Button>
                </a>
              )}
              {(lead.status === "call_done" || lead.status === "not_relevant") && whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50">
                    <MessageCircle size={12} /> וואטסאפ
                  </Button>
                </a>
              )}
            </>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Phone size={12} /> {lead.phone}
              </Button>
            </a>
          )}
          <a href={`mailto:${lead.email}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              <Mail size={12} /> מייל
            </Button>
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowJourney(!showJourney)}
            className={`h-7 text-xs gap-1 ${showJourney ? "bg-[#191265] text-white border-[#191265]" : "text-[#191265] border-[#191265]/30"}`}
          >
            <User size={12} /> מסע לקוח
          </Button>
        </div>

        {/* Quick status transition buttons */}
        {quickButtons.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-[#aaa] self-center ml-1">מהיר:</span>
            {quickButtons.map(btn => (
              <button
                key={btn.to}
                onClick={() => onStatusChange(lead.id, btn.to)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all hover:opacity-80 ${btn.color}`}
              >
                {STATUS_CONFIG[btn.to].icon} {btn.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      {/* Journey Panel */}
      {showJourney && (
        <CardContent className="pt-0 px-4 pb-3">
          <JourneyPanel leadId={lead.id} />
        </CardContent>
      )}

      {expanded && (
        <CardContent className="pt-0 px-4 pb-3 space-y-3">
          {/* Inline editable contact fields */}
          <div className="bg-[#f8f6f0] rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-[#191265] mb-2">פרטי קשר</p>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-[#444]">
              <div className="flex items-center gap-2">
                <span className="text-[#aaa] w-12 flex-shrink-0">שם:</span>
                <InlineEdit
                  value={lead.name}
                  placeholder="שם מלא"
                  onSave={async (v) => { await onLeadUpdate(lead.id, { name: v }); toast.success("שם עודכן"); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#aaa] w-12 flex-shrink-0">מייל:</span>
                <InlineEdit
                  value={lead.email}
                  type="email"
                  placeholder="כתובת מייל"
                  onSave={async (v) => { await onLeadUpdate(lead.id, { email: v }); toast.success("מייל עודכן"); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#aaa] w-12 flex-shrink-0">טלפון:</span>
                <InlineEdit
                  value={lead.phone ?? ""}
                  type="tel"
                  placeholder="מספר טלפון"
                  onSave={async (v) => { await onLeadUpdate(lead.id, { phone: v }); toast.success("טלפון עודכן"); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#aaa] w-12 flex-shrink-0">מגדר:</span>
                <select
                  value={lead.gender ?? ""}
                  onChange={async (e) => {
                    const val = e.target.value as "female" | "male" | "";
                    await onLeadUpdate(lead.id, { gender: val || null });
                    toast.success("מגדר עודכן");
                  }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-right focus:outline-none focus:border-[#191265]"
                  dir="rtl"
                >
                  <option value="">לא ידוע</option>
                  <option value="female">אישה</option>
                  <option value="male">גבר</option>
                </select>
              </div>
              {lead.dnaType && (
                <div className="flex items-center gap-2">
                  <span className="text-[#aaa] w-12 flex-shrink-0">DNA:</span>
                  <span className="text-purple-700 font-medium">{DNA_LABELS[lead.dnaType] ?? lead.dnaType}</span>
                </div>
              )}
              {lead.utmSource && (
                <div className="flex items-center gap-2">
                  <span className="text-[#aaa] w-12 flex-shrink-0">UTM:</span>
                  <span className="text-[#1800ad]">{lead.utmSource}{lead.utmMedium ? ` / ${lead.utmMedium}` : ""}{lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[#aaa] w-12 flex-shrink-0">נרשם:</span>
                <span>{safeFormat(lead.createdAt, "dd/MM/yyyy HH:mm")}</span>
              </div>
            </div>
          </div>

          {/* Full status selector */}
          <div>
            <p className="text-xs text-[#727272] mb-1 font-medium">שינוי סטטוס:</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(lead.id, s)}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    lead.status === s
                      ? "border-[#191265] bg-[#191265] text-white"
                      : "border-gray-200 hover:border-[#191265] text-[#727272]"
                  }`}
                >
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-[#727272] mb-1 font-medium">הערות:</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הוסיפי הערות על הליד..."
              className="text-sm min-h-[60px] resize-none text-right"
              dir="rtl"
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-1.5 h-7 text-xs bg-[#191265] hover:bg-[#1800ad]"
            >
              {savingNotes ? "שומר..." : "שמור הערות"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Main CRM Page
export default function CRM() {
  const { user, loading } = useAuth();

  const [activeColumn, setActiveColumn] = useState<LeadStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leads = [], refetch, isLoading } = trpc.crm.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 60_000,
  });

  const { data: upcomingMeetings = [] } = trpc.crm.getUpcomingMeetings.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: crmStats = {} } = trpc.crm.getStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const updateStatus = trpc.crm.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("סטטוס עודכן"); },
  });

  const updateNotes = trpc.crm.updateNotes.useMutation({
    onSuccess: () => refetch(),
  });

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => refetch(),
  });

  const flagFollowup = trpc.crm.flagForFollowup.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`${(data as { flagged: number }).flagged} לידים סומנו לפולואפ`);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl">
        <div className="text-[#191265]">טוענת...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center" dir="rtl">
        <div className="text-center bg-white rounded-3xl p-10 shadow-2xl max-w-sm mx-4">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black text-[#191265] mb-2">CRM - הילית כספי</h1>
          <p className="text-[#727272] mb-6 text-sm">ניהול לידים ולקוחות<br/>גישה מוגבלת לצוות בלבד</p>
          <a
            href="/team/login"
            className="block bg-[#191265] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-lg text-center"
          >
            כניסת צוות
          </a>
          <a href={getLoginUrl()} className="block text-[#727272] text-sm mt-3 underline">כניסה עם Manus</a>
        </div>
      </div>
    );
  }

  const typedLeads = leads as CrmLead[];

  const filtered = typedLeads.filter(lead => {
    const matchesStatus = activeColumn === "all" || lead.status === activeColumn;
    const matchesSearch = !searchQuery || [lead.name, lead.email, lead.phone ?? ""].some(
      f => f.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const needsFollowupCount = typedLeads.filter(l => l.status === "needs_followup").length;
  const newLeadCount = typedLeads.filter(l => l.status === "new_lead").length;

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold">CRM - ניהול לידים</h1>
            <p className="text-white/60 text-xs">{typedLeads.length} לידים סה"כ</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {needsFollowupCount > 0 && (
              <div className="flex items-center gap-1 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
                <Bell size={12} /> {needsFollowupCount} ממתינים לפולואפ
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => flagFollowup.mutate()}
              disabled={flagFollowup.isPending}
              className="h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RefreshCw size={12} className="ml-1" />
              {flagFollowup.isPending ? "בודק..." : "בדוק פולואפים"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RefreshCw size={12} />
            </Button>
            <a href="/crm/matchmaking">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-green-500 border-green-500 text-white hover:bg-green-600 font-bold"
              >
                💛 ניהול מאגר
              </Button>
            </a>
            <a href="/crm/emails">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-[#ffe27c] border-[#ffe27c] text-[#191265] hover:bg-[#ffd84a] font-bold"
              >
                📧 תצוגת מיילים
              </Button>
            </a>
            <a href="/crm/blog">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                ✍️ ניהול מאמרים
              </Button>
            </a>
            <a href="/crm/analytics">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-purple-600 border-purple-600 text-white hover:bg-purple-700 font-bold"
              >
                📊 אנליטיקס
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Upcoming meetings banner */}
        {(upcomingMeetings as CrmLead[]).length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
            <p className="text-purple-800 font-semibold text-sm mb-2">פגישות קרובות ({(upcomingMeetings as CrmLead[]).length})</p>
            <div className="space-y-1">
              {(upcomingMeetings as CrmLead[]).map(m => (
                <div key={m.id} className="flex items-center justify-between text-xs text-purple-700">
                  <span className="font-medium">{m.name}</span>
                  <span>{m.meetingAt ? safeFormat(m.meetingAt, "dd/MM HH:mm") : ""}</span>
                  {m.phone && (
                    <a
                      href={`https://wa.me/972${m.phone.replace(/^0/, "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 underline"
                    >
                      וואטסאפ
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { label: "לידים חדשים", value: newLeadCount, color: "text-blue-600", icon: "🆕" },
            { label: "לפולואפ", value: needsFollowupCount, color: "text-amber-600", icon: "📞" },
            { label: "לקוחות מאגר", value: (crmStats as Record<string, number>)["client_database"] ?? 0, color: "text-green-600", icon: "💛" },
            { label: "לקוחות מדריך", value: (crmStats as Record<string, number>)["client_guide"] ?? 0, color: "text-teal-600", icon: "📖" },
            { label: "לקוחות קורס", value: (crmStats as Record<string, number>)["client_course"] ?? 0, color: "text-violet-600", icon: "🎓" },
            { label: "לקוחות ליווי", value: (crmStats as Record<string, number>)["client_coaching"] ?? 0, color: "text-rose-600", icon: "👑" },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-lg">{stat.icon}</div>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[#727272]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* WhatsApp Group Click Stats */}
        {(() => {
          const waStats = (crmStats as any)?.waStats as Record<string, number> | undefined;
          if (!waStats) return null;
          const total = Object.values(waStats).reduce((a, b) => a + b, 0);
          if (total === 0) return null;
          const sources = [
            { key: "site",      label: "מהאתר",       icon: "🌐" },
            { key: "email",     label: "ממיילים",      icon: "📧" },
            { key: "thankyou",  label: "מעמוד תודה",   icon: "🎉" },
            { key: "bio",       label: "מהביו",        icon: "🔗" },
            { key: "instagram", label: "מאינסטגרם",    icon: "📸" },
          ];
          return (
            <div className="bg-white rounded-xl p-3 shadow-sm mb-4">
              <div className="text-xs font-bold text-[#191265] mb-2 text-right">📊 הצטרפויות לקבוצת הוואטסאפ — {total} סה"כ</div>
              <div className="grid grid-cols-5 gap-2">
                {sources.map(s => (
                  <div key={s.key} className="text-center">
                    <div className="text-base">{s.icon}</div>
                    <div className="text-lg font-black text-[#191265]">{waStats[s.key] ?? 0}</div>
                    <div className="text-xs text-[#727272]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Purchase Attribution Stats */}
        {(() => {
          const purchaseStats = (crmStats as any)?.purchaseStats as Array<{ product: string; utmSource: string | null; utmCampaign: string | null; count: number }> | undefined;

          const PRODUCT_LABELS: Record<string, { label: string; icon: string }> = {
            database: { label: "מאגר רווקים", icon: "💛" },
            guide: { label: "מדריך", icon: "📖" },
            course: { label: "קורס", icon: "🎓" },
            coaching: { label: "ליווי אישי", icon: "👑" },
            single_session: { label: "פגישה בודדת", icon: "🗓" },
            live_event: { label: "לייב", icon: "🎤" },
          };

          const ALL_PRODUCTS = Object.keys(PRODUCT_LABELS);

          const SOURCE_ICON: Record<string, string> = {
            instagram: "📸",
            facebook: "📘",
            tiktok: "🎵",
            email: "📧",
            whatsapp: "💬",
            organic: "🌿",
            direct: "🔗",
          };

          // Group by product
          const byProduct: Record<string, Array<{ utmSource: string | null; utmCampaign: string | null; count: number }>> = {};
          if (purchaseStats) {
            for (const row of purchaseStats) {
              if (!byProduct[row.product]) byProduct[row.product] = [];
              byProduct[row.product].push({ utmSource: row.utmSource, utmCampaign: row.utmCampaign, count: row.count });
            }
          }

          const totalPurchases = purchaseStats ? purchaseStats.reduce((a, b) => a + b.count, 0) : 0;

          return (
            <div className="bg-white rounded-xl p-3 shadow-sm mb-4">
              <div className="text-xs font-bold text-[#191265] mb-3 text-right">🛒 רכישות לפי מוצר ומקור — {totalPurchases} סה"כ</div>
              {totalPurchases === 0 ? (
                <div className="text-xs text-[#727272] text-right py-2">נתונים יופיעו כאן לאחר הרכישה הראשונה עם UTM</div>
              ) : (
                <div className="space-y-3">
                  {ALL_PRODUCTS.filter(p => byProduct[p]).map((product) => {
                    const rows = byProduct[product];
                    const meta = PRODUCT_LABELS[product];
                    const total = rows.reduce((a, b) => a + b.count, 0);
                    return (
                      <div key={product}>
                        <div className="text-xs font-bold text-[#191265] mb-1.5 text-right">{meta.icon} {meta.label} ({total})</div>
                        <div className="flex flex-wrap gap-2">
                          {rows.map((r, i) => (
                            <div key={i} className="bg-[#f0eadc] rounded-lg px-2 py-1 text-center min-w-[60px]">
                              <div className="text-base">{SOURCE_ICON[r.utmSource || ""] || "🌐"}</div>
                              <div className="text-sm font-black text-[#191265]">{r.count}</div>
                              <div className="text-[10px] text-[#727272] leading-tight">{r.utmSource || "ישיר"}</div>
                              {r.utmCampaign && <div className="text-[9px] text-[#1800ad] leading-tight truncate max-w-[70px]">{r.utmCampaign}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Calendly Click Stats */}
        {(() => {
          const calendlyStats = (crmStats as any)?.calendlyStats as Array<{ utmSource: string | null; utmCampaign: string | null; page: string | null; count: number }> | undefined;
          const total = calendlyStats ? calendlyStats.reduce((a, b) => a + b.count, 0) : 0;

          const SOURCE_ICON: Record<string, string> = {
            instagram: "📸",
            facebook: "📘",
            tiktok: "🎵",
            email: "📧",
            whatsapp: "💬",
            organic: "🌿",
          };

          const PAGE_LABELS: Record<string, string> = {
            "/": "דף הבית",
            "/coaching": "ליווי",
            "/single-session": "פגישה",
            "/blog": "בלוג",
            "/matches": "התאמות",
            "/join": "מאגר",
          };

          return (
            <div className="bg-white rounded-xl p-3 shadow-sm mb-4">
              <div className="text-xs font-bold text-[#191265] mb-2 text-right">📅 קליקים על קאלנדלי — {total} סה"כ</div>
              {total === 0 ? (
                <div className="text-xs text-[#727272] text-right py-2">נתונים יופיעו כאן לאחר הקליק הראשון על קאלנדלי</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(calendlyStats || []).slice(0, 10).map((r, i) => (
                    <div key={i} className="bg-[#f0eadc] rounded-lg px-2 py-1 text-center min-w-[60px]">
                      <div className="text-base">{SOURCE_ICON[r.utmSource || ""] || "🌐"}</div>
                      <div className="text-sm font-black text-[#191265]">{r.count}</div>
                      <div className="text-[10px] text-[#727272] leading-tight">{r.utmSource || "ישיר"}</div>
                      {r.page && <div className="text-[9px] text-[#1800ad] leading-tight">{PAGE_LABELS[r.page] || r.page}</div>}
                      {r.utmCampaign && <div className="text-[9px] text-[#1800ad] leading-tight truncate max-w-[70px]">{r.utmCampaign}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל, טלפון..."
            className="w-full px-4 py-2 rounded-xl border border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-sm"
            dir="rtl"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setActiveColumn("all")}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
              activeColumn === "all"
                ? "bg-[#191265] text-white border-[#191265]"
                : "bg-white text-[#727272] border-gray-200 hover:border-[#191265]"
            }`}
          >
            הכל ({typedLeads.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => {
            const count = typedLeads.filter(l => l.status === s).length;
            if (count === 0 && activeColumn !== s) return null;
            return (
              <button
                key={s}
                onClick={() => setActiveColumn(s)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  activeColumn === s
                    ? "bg-[#191265] text-white border-[#191265]"
                    : "bg-white text-[#727272] border-gray-200 hover:border-[#191265]"
                }`}
              >
                {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label} ({count})
              </button>
            );
          })}
        </div>

        {/* Lead list */}
        {isLoading ? (
          <div className="text-center py-12 text-[#727272]">טוענת לידים...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#727272]">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>אין לידים בקטגוריה זו</p>
          </div>
        ) : (
          <div>
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                onNotesChange={(id, notes) => updateNotes.mutate({ id, notes })}
                onLeadUpdate={async (id, fields) => {
                  const safeFields: Parameters<typeof updateLead.mutateAsync>[0] = {
                    id,
                    ...(fields.name !== undefined ? { name: fields.name } : {}),
                    ...(fields.email !== undefined ? { email: fields.email } : {}),
                    ...(fields.phone !== undefined ? { phone: fields.phone ?? undefined } : {}),
                    ...(fields.gender !== undefined ? { gender: fields.gender as "female" | "male" | null | undefined } : {}),
                  };
                  await updateLead.mutateAsync(safeFields);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
