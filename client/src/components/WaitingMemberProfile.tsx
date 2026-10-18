import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Mail,
  MessageCircle,
  Pencil,
  PauseCircle,
} from "lucide-react";
import { getWaitingProfileCompleteness } from "@shared/waitingProfileCompleteness";
import { LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL, UNMATCHED_QUEUE_HISTORY_DISCLAIMER } from "@shared/unmatchedQueuePresentation";
import MatchProfileCard, { type MatchProfile } from "./MatchProfileCard";
import ProfileClosureDialog from "./ProfileClosureDialog";

type WaitingProfile = MatchProfile & {
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  questionnaireCompletedAt?: number | null;
  questionnaireToken?: string | null;
  aboutMe?: string | null;
  adminNotes?: string | null;
  membershipStartedAt?: number | null;
};

type MatchHistoryItem = {
  matchId: number;
  opponentName: string;
  opponentPhotoUrl?: string | null;
  sentAt?: number | null;
  status: string;
  score?: number | null;
  sourceLabel: string;
};

export type WaitingMemberProfileProps = {
  profile: WaitingProfile;
  history: MatchHistoryItem[];
  databasePurchasedAt?: number | null;
  onPhoto: (url: string) => void;
  onEdit: () => void;
  onDeactivate: () => void;
  deactivatePending?: boolean;
  onClosed: () => void;
  children?: ReactNode;
};

const HISTORY_STATUS_LABELS: Record<string, string> = {
  pending: "ממתינה להחלטה",
  proposed: "נשלחה",
  sent: "נשלחה",
  viewed: "נצפתה",
  accepted: "אושרה",
  matched: "התאמה הדדית",
  rejected: "לא המשיכה",
  declined: "לא המשיכה",
  expired: "פגה",
  cancelled: "בוטלה",
  closed: "נסגרה",
};

/** Kept local because the CRM's current helper is not exported outside its page. */
function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00972")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  if (!digits.startsWith("972") || digits.length < 11 || digits.length > 13) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatDateTime(value?: number | string | Date | null): string | null {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })
    : null;
}

function formatDate(value?: number | string | Date | null): string | null {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("he-IL", { dateStyle: "medium" })
    : null;
}

function friendlyHistoryStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  return HISTORY_STATUS_LABELS[normalized] || (status.trim() ? `סטטוס: ${status}` : "סטטוס לא ידוע");
}

function HistoryItemCard({ item }: { item: MatchHistoryItem }) {
  const sentAt = formatDateTime(item.sentAt);
  const score = typeof item.score === "number" && Number.isFinite(item.score) ? Math.round(item.score) : null;
  const legacyEvidence = item.sourceLabel === LEGACY_PERSONAL_EVIDENCE_SOURCE_LABEL;

  return (
    <li className="rounded-xl border border-[#191265]/10 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        {item.opponentPhotoUrl ? (
          <img
            src={item.opponentPhotoUrl}
            alt=""
            className="size-11 shrink-0 rounded-lg border border-[#191265]/10 object-cover"
            loading="lazy"
          />
        ) : (
          <div aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#191265]/5 text-xs text-[#191265]/55">
            אין תמונה
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold text-[#191265]">{item.opponentName || "פרופיל ללא שם"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#59556a]">
            <span>{friendlyHistoryStatus(item.status)}</span>
            {item.sourceLabel && <span>ראיה: {item.sourceLabel}</span>}
            {score != null && <span>ציון: {score}</span>}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#77718b]">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {sentAt ? `${legacyEvidence ? "תועדה חשיפה או תגובה" : "נשלחה"}: ${sentAt}` : "מועד שליחה לא ידוע"}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * Read-only expanded profile for members waiting to be matched. It has no data
 * fetching or mutations: its callbacks intentionally leave profile actions to the parent.
 */
export default function WaitingMemberProfile({
  profile,
  history,
  databasePurchasedAt,
  onPhoto,
  onEdit,
  onDeactivate,
  deactivatePending = false,
  onClosed,
  children,
}: WaitingMemberProfileProps) {
  const displayName = profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "פרופיל";
  const active = profile.isActive !== false;
  const completeness = getWaitingProfileCompleteness(profile);
  const profileForCard = useMemo(
    () => ({ ...profile, about: profile.about || profile.aboutMe || null }),
    [profile],
  );
  const historicalMatches = useMemo(() => {
    const latestByMatch = new Map<number, MatchHistoryItem>();
    for (const item of history) {
      const existing = latestByMatch.get(item.matchId);
      if (!existing || Number(item.sentAt || 0) > Number(existing.sentAt || 0)) {
        latestByMatch.set(item.matchId, item);
      }
    }
    return Array.from(latestByMatch.values()).sort((a, b) => Number(b.sentAt || 0) - Number(a.sentAt || 0));
  }, [history]);

  const emailHref = profile.email ? `mailto:${encodeURIComponent(profile.email)}` : null;
  const directWhatsAppHref = buildWhatsAppUrl(profile.phone, `היי ${displayName},`);
  const profileUpdateWhatsAppHref = profile.phone && profile.questionnaireToken
    ? buildWhatsAppUrl(
      profile.phone,
      `היי ${displayName}, נשמח לעדכון פרטי הפרופיל שלך כדי שנוכל לדייק את ההתאמות: https://hilitcaspi.com/my-profile?email=${encodeURIComponent(profile.email || "")}&token=${encodeURIComponent(profile.questionnaireToken)}&tab=profile`,
    )
    : null;
  const membershipStartedAt = profile.membershipStartedAt ?? profile.subscriptionStartedAt;
  const createdAt = formatDate(profile.createdAt);

  return (
    <article dir="rtl" className="overflow-hidden rounded-2xl border border-[#191265]/15 bg-[#fffdf7] shadow-[0_12px_30px_rgba(25,18,101,0.08)]">
      <header className="border-b border-[#191265]/10 bg-[#191265] px-4 py-4 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-black">{displayName}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                {active ? "פעיל במאגר" : "לא פעיל במאגר"}
              </span>
              {profile.plusStatus === "active" && profile.plusBillingStatus === "active" && (
                <span className="rounded-full bg-[#ffe27c] px-2.5 py-1 text-xs font-black text-[#191265]">Plus פעיל</span>
              )}
              {profile.boostStatus === "active" && (
                <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-black text-fuchsia-900">אישור Boost פעיל</span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/80">פרופיל מורחב לממתינים להתאמה</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {emailHref && (
              <a href={emailHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe27c]">
                <Mail className="size-3.5" aria-hidden="true" />
                מייל ידני
              </a>
            )}
            {directWhatsAppHref && (
              <a href={directWhatsAppHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-[#123c24] transition hover:bg-[#41df7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <MessageCircle className="size-3.5" aria-hidden="true" />
                WhatsApp ידני
              </a>
            )}
            <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#ffe27c] px-3 py-2 text-xs font-black text-[#191265] transition hover:bg-[#ffec9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Pencil className="size-3.5" aria-hidden="true" />
              עריכת פרופיל
            </button>
            {active && (
              <button type="button" onClick={onDeactivate} disabled={deactivatePending} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe27c] disabled:cursor-not-allowed disabled:opacity-60">
                <PauseCircle className="size-3.5" aria-hidden="true" />
                {deactivatePending ? "משהה…" : "השהיית פרופיל"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-5 p-3 sm:p-5">
        <section aria-label="פרטי פרופיל מלאים">
          <MatchProfileCard profile={profileForCard} onPhoto={onPhoto} sentCount={historicalMatches.length} horizontal />
        </section>

        <section className="grid gap-3 rounded-xl border border-[#191265]/10 bg-[#faf6e9] p-4 text-sm sm:grid-cols-3" aria-label="תאריכי חברות">
          <DateFact label="רכישת מאגר" value={formatDate(databasePurchasedAt)} unknownLabel="לא ידוע" />
          <DateFact label="תחילת חברות" value={formatDate(membershipStartedAt)} unknownLabel="לא צוין" />
          <DateFact label="יצירת פרופיל" value={createdAt} unknownLabel="לא צוין" />
        </section>

        <section className={`rounded-xl border p-4 ${completeness.isComplete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`} aria-labelledby={`completeness-${profile.id}`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 id={`completeness-${profile.id}`} className="flex items-center gap-2 font-black text-[#191265]">
                {completeness.isComplete ? <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" /> : <CircleAlert className="size-5 text-amber-700" aria-hidden="true" />}
                {completeness.isComplete ? "פרופיל מלא" : "פרופיל דורש השלמה"}
              </h3>
              <p className="mt-1 text-sm text-[#514b63]">
                {completeness.questionnaireCompleted ? "השאלון המדעי הושלם." : "השאלון המדעי טרם הושלם."}
              </p>
              {!completeness.isComplete && (
                <p className="mt-2 break-words text-sm font-semibold text-amber-950">חסרים: {completeness.missingFields.join(" • ")}</p>
              )}
            </div>
            {!completeness.isComplete && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#191265]/20 bg-white px-3 py-2 text-xs font-bold text-[#191265] transition hover:bg-[#f4f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265]">
                  <Pencil className="size-3.5" aria-hidden="true" />
                  השלמה בעריכה
                </button>
                {profileUpdateWhatsAppHref && (
                  <a href={profileUpdateWhatsAppHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-[#123c24] transition hover:bg-[#41df7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265]">
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    בקשת עדכון ב־WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#191265]/10 bg-[#fcfbff] p-4" aria-labelledby={`history-${profile.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`history-${profile.id}`} className="flex items-center gap-2 font-black text-[#191265]">
              <CalendarDays className="size-5" aria-hidden="true" />
              היסטוריית התאמות
            </h3>
            <span className="rounded-full bg-[#191265]/8 px-2.5 py-1 text-xs font-bold text-[#191265]">{historicalMatches.length} התאמות</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#655f73]">{UNMATCHED_QUEUE_HISTORY_DISCLAIMER}</p>
          {historicalMatches.length === 0 ? (
            <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#5f5970]">אין היסטוריית התאמות להצגה.</p>
          ) : (
            <details className="mt-3 group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#191265] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265]">
                <span>פתיחת הרשימה המלאה</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="mt-3 space-y-2" aria-label="רשימת היסטוריית התאמות">
                {historicalMatches.map(item => <HistoryItemCard key={item.matchId} item={item} />)}
              </ul>
            </details>
          )}
        </section>

        {profile.adminNotes && (
          <section className="rounded-xl border border-[#191265]/10 bg-[#f8f6f0] p-4" aria-labelledby={`notes-${profile.id}`}>
            <h3 id={`notes-${profile.id}`} className="font-black text-[#191265]">הערות פנימיות</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#514b63]">{profile.adminNotes}</p>
          </section>
        )}

        {children && (
          <section className="min-w-0 rounded-xl bg-white" aria-label="חיפוש התאמות מתקדם">
            {children}
          </section>
        )}

        <footer className="flex flex-col gap-3 border-t border-[#191265]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#655f73]">השהיה וסגירה מתבצעות רק לאחר אישור שלך. פתיחת מייל או WhatsApp אינה שולחת הודעה אוטומטית.</p>
          <div className="flex flex-wrap gap-2">
            <ProfileClosureDialog
              profile={{
                id: profile.id,
                firstName: profile.firstName || profile.name || "פרופיל",
                lastName: profile.lastName,
                isActive: active,
              }}
              onClosed={onClosed}
            />
          </div>
        </footer>
      </div>
    </article>
  );
}

function DateFact({ label, value, unknownLabel }: { label: string; value: string | null; unknownLabel: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-[#655f73]">{label}</p>
      <p className="mt-1 break-words font-bold text-[#191265]">{value || unknownLabel}</p>
    </div>
  );
}

export { buildWhatsAppUrl };
