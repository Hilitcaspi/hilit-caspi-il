import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildNonResponseFollowupMessage, type MatchResponseSummary } from "@shared/matchResponseSummary";
import { matchesProfileName } from "@shared/profileNameSearch";
import { ProfilePhoto, type MatchProfile } from "./MatchProfileCard";
import ProfileStaffMarkers, { profileStaffSurface } from "./ProfileStaffMarkers";

type Profile = MatchProfile & { phone?: string | null; isActive?: boolean; isSeed?: boolean };
function whatsappUrl(phone?: string | null, message = "") {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00972")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  return digits.startsWith("972") && digits.length >= 11 && digits.length <= 13 ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
export default function ResponseFollowupSection({ profiles, summaries, loading, error, refresh, onPhoto, searchQuery = "" }: {
  profiles: Profile[]; summaries: Record<number, MatchResponseSummary>; loading: boolean; error: boolean;
  refresh: () => void; onPhoto: (url: string) => void; searchQuery?: string;
}) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [draft, setDraft] = useState("");
  const qualifiedRows = profiles.filter(p => p.isActive !== false && !p.isSeed && summaries[p.id]?.needsFollowup);
  const rows = qualifiedRows.filter(profile => matchesProfileName(profile, searchQuery))
    .sort((a,b) => summaries[b.id].consecutiveUnanswered - summaries[a.id].consecutiveUnanswered);
  const url = selected ? whatsappUrl(selected.phone, draft) : null;
  return <section className="rounded-2xl bg-white border border-rose-200 p-4 shadow-sm space-y-3" aria-label="מעקב אי־מענה להצעות">
    <div className="flex justify-between items-start gap-3">
      <div><h3 className="font-bold text-[#191265]">מעקב תגובות להצעות התאמה {loading || error ? "" : `(${rows.length})`}</h3>
        <p className="text-xs text-[#727272] mt-1">3 הצעות רצופות לפחות שנמסרו ולא התקבלה עליהן תגובה בזמן. ״לא״ נחשב תגובה. הצעה פתוחה או שנסגרה מוקדם אינה נספרת כאי־מענה.</p>
      </div>
      <button type="button" onClick={refresh} className="text-xs rounded-lg bg-[#f0eadc] px-3 py-2 text-[#191265]">רענון תגובות</button>
    </div>
    {error ? <p className="text-sm text-red-700">נתוני התגובות לא נטענו. אין להסיק שאין צורך במעקב; אפשר לרענן.</p> : loading ? <p className="text-sm text-[#727272]">בודק תגובות ומסירות...</p> : rows.length === 0 ? <p className="text-sm text-[#727272]">{searchQuery.trim() ? "לא נמצאו ממתינים בשם הזה" : "אין כרגע רצף אי־מענה שמצריך פנייה."}</p> : <div className="grid gap-3 md:grid-cols-2">
      {rows.map(profile => {
        const summary = summaries[profile.id];
        return <article key={profile.id} className={`rounded-xl p-3 ${profileStaffSurface(profile, "bg-rose-50/60 border border-rose-100")}`}>
          <div className="flex gap-3 items-start"><ProfilePhoto profile={profile} onPhoto={onPhoto} size="small" />
            <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-1"><h4 className="font-bold text-sm text-[#191265]">{profile.firstName} {profile.lastName}</h4><ProfileStaffMarkers profile={profile} compact /></div><p className="text-xs text-[#727272]">{profile.age} · {profile.city}</p>
              <p className="text-xs font-semibold text-rose-800 mt-1">{summary.consecutiveUnanswered} הצעות אחרונות ללא תגובה</p>
              <p className="text-xs text-[#727272] mt-1">בסך הכול: {summary.respondedCount} תגובות · {summary.unansweredCount} ללא תגובה · {summary.waitingCount} עדיין פתוחות</p>
              {summary.lastRespondedAt ? <p className="text-[11px] text-[#727272]">תגובה אחרונה: {new Date(summary.lastRespondedAt).toLocaleDateString("he-IL")}</p> : null}
            </div>
          </div>
          <button type="button" onClick={() => { setSelected(profile); setDraft(buildNonResponseFollowupMessage(profile.firstName || "")); }} className="mt-3 rounded-full bg-[#191265] text-white px-4 py-2 text-xs font-bold">הכנת הודעת מעקב</button>
        </article>;
      })}
    </div>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogTitle>הודעת מעקב ל־{selected?.firstName}</DialogTitle>
        <p className="text-xs text-[#727272]">אפשר לערוך לפני הפתיחה. ההודעה אינה נשלחת מהמערכת; השליחה מתבצעת רק אחרי לחיצה על שליחה ב־WhatsApp.</p>
        <textarea aria-label="נוסח הודעת המעקב" value={draft} onChange={event => setDraft(event.target.value)} className="w-full min-h-48 rounded-xl border p-3 text-sm leading-6" />
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(draft); toast.success("הנוסח הועתק"); } catch { toast.error("אפשר לסמן ולהעתיק את הנוסח ידנית"); } }} className="rounded-full border px-4 py-2 text-xs">העתקת הנוסח</button>
          {url && draft.trim() ? <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-600 text-white px-4 py-2 font-bold text-xs">פתיחת ההודעה ב־WhatsApp</a> : <p className="text-xs text-[#727272]">אין מספר תקין לפתיחת WhatsApp. אפשר להעתיק את הנוסח.</p>}
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
