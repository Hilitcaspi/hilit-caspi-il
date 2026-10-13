import { useState } from "react";

export type MatchProfile = {
  id: number; firstName?: string | null; lastName?: string | null; name?: string | null;
  gender?: string | null; age?: number | null; city?: string | null; photoUrl?: string | null;
  dnaType?: string | null; occupation?: string | null; education?: string | null;
  religiosity?: string | null; religiosityPreference?: string | null;
  maritalStatus?: string | null; height?: number | null; shomerShabbat?: boolean | null;
  locationPreference?: string | null; minAgePreference?: number | null; maxAgePreference?: number | null;
  minHeightPreference?: number | null; maxHeightPreference?: number | null;
  hasKids?: boolean | null; numKids?: number | null; wantsKids?: string | null;
  seekingGender?: string | null; acceptsKids?: boolean | null; openToPartnerWithKids?: string | null;
  smokingPreference?: string | null; interests?: string | null; relationshipPace?: string | null;
  hasPets?: boolean | null; petType?: string | null; acceptsPets?: boolean | null;
  smokingStatus?: string | null; about?: string | null; partnerDescription?: string | null;
  createdAt?: Date | number | string | null; subscriptionStartedAt?: number | null; subscriptionRenewsAt?: number | null;
  plusStatus?: string | null; plusBillingStatus?: string | null; boostStatus?: string | null;
  isCoachingClient?: boolean; isNotBasic?: boolean;
};
const EDUCATION: Record<string, string> = { high_school: "תיכון", vocational: "הכשרה מקצועית", technician: "הנדסאי", student: "לימודים אקדמיים בתהליך", bachelor: "תואר ראשון", master: "תואר שני", phd: "דוקטורט", other: "אחר" };
const RELIGION: Record<string, string> = { secular: "חילוניות", traditional: "מסורתיות", religious: "דתיות", orthodox: "חרדיות", datlash: "דתל״ש" };
const DNA: Record<string, string> = { leader: "מנהיגות", romantic: "רומנטיות", free_spirit: "רוח חופשית", anchor: "עוגן" };
const MARITAL: Record<string, string> = { single: "רווקות", divorced: "לאחר גירושים", widowed: "לאחר התאלמנות" };
export function preferenceRange(min?: number | null, max?: number | null) {
  return min && max ? `${min}–${max}` : min ? `מ־${min}` : max ? `עד ${max}` : "לא צוין";
}
export function locationPreferenceLabel(value?: string | null) {
  return value === "close" || value === "local" ? "העדפה לקרוב" : value === "anywhere" || value === "flexible" ? "פתיחות למרחק" : "לא צוין";
}
export function ProfilePhoto({ profile, onPhoto, size = "large" }: { profile: MatchProfile; onPhoto?: (url: string) => void; size?: "small" | "large" }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const name = profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const cls = size === "small" ? "h-10 w-10 rounded-lg" : "h-24 w-24 sm:h-28 sm:w-28 rounded-xl";
  return profile.photoUrl && failedUrl !== profile.photoUrl ? (
    <button type="button" onClick={(event) => { event.stopPropagation(); onPhoto?.(profile.photoUrl!); }} aria-label={`הגדלת תמונה של ${name}`} className={`shrink-0 overflow-hidden border-2 border-[#191265]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265] cursor-zoom-in ${cls}`}>
      <img src={profile.photoUrl} alt={name} loading="lazy" onError={() => setFailedUrl(profile.photoUrl!)} className="h-full w-full object-cover object-[center_20%]" />
    </button>
  ) : <div aria-label="אין תמונת פרופיל" className={`shrink-0 border border-dashed border-[#191265]/20 bg-[#191265]/5 text-[#191265]/50 flex items-center justify-center text-xs ${cls}`}>אין תמונה</div>;
}
export function MatchPreferenceFacts({ profile }: { profile: MatchProfile }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
    <span><b>מרחק:</b> {locationPreferenceLabel(profile.locationPreference)}</span>
    <span><b>שמירת שבת:</b> {profile.shomerShabbat == null ? "לא צוין" : profile.shomerShabbat ? "כן" : "לא"}</span>
    <span><b>שמירת נגיעה:</b> לא מתועד במערכת</span>
  </div>;
}
export function MatchProfileFacts({ profile, sentCount }: { profile: MatchProfile; sentCount?: number }) {
  const joined = profile.subscriptionStartedAt || profile.createdAt;
  const date = joined ? new Date(joined) : null;
  return <div className="space-y-2 text-xs text-[#555]">
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span><b>השכלה:</b> {profile.education ? EDUCATION[profile.education] || profile.education : "לא צוין"}</span>
      <span><b>רמה דתית:</b> {profile.religiosity ? RELIGION[profile.religiosity] || profile.religiosity : "לא צוין"}</span>
      <span><b>גיל רצוי:</b> {preferenceRange(profile.minAgePreference, profile.maxAgePreference)}</span>
      {profile.height ? <span><b>גובה:</b> {profile.height} ס״מ</span> : null}
    </div>
    <MatchPreferenceFacts profile={profile} />
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {date && Number.isFinite(date.getTime()) && <span><b>במאגר מ־</b>{date.toLocaleDateString("he-IL")}</span>}
      {sentCount != null && <span><b>התאמות שנשלחו:</b> {sentCount}</span>}
      {profile.boostStatus === "active" && <span className="font-bold text-fuchsia-800">מאושר Boost</span>}
      {profile.plusStatus === "active" && profile.plusBillingStatus === "active" && <span className="font-bold text-[#8b7420]">מנוי Plus פעיל</span>}
    </div>
    {profile.subscriptionRenewsAt ? <p className={Date.now() > profile.subscriptionRenewsAt ? "text-red-700 font-bold" : ""}>מנוי עד: {new Date(profile.subscriptionRenewsAt).toLocaleDateString("he-IL")}{Date.now() > profile.subscriptionRenewsAt ? " (פג תוקף)" : ""}</p> : null}
  </div>;
}
export default function MatchProfileCard({ profile, onPhoto, sentCount, horizontal = false }: { profile: MatchProfile; onPhoto?: (url: string) => void; sentCount?: number; horizontal?: boolean }) {
  const name = profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  return <article className={`min-w-0 rounded-xl p-3 ${profile.isCoachingClient ? "bg-pink-50 ring-1 ring-pink-200" : "bg-[#f8f6f0]"}`}>
    <div className={`flex gap-3 items-start ${horizontal ? "flex-row" : "flex-col sm:flex-row"}`}>
      <ProfilePhoto profile={profile} onPhoto={onPhoto} />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm sm:text-base font-bold text-[#191265] break-words">{name}</h4>
        <p className="text-xs text-[#727272] mt-1">{profile.gender === "female" ? "אישה" : profile.gender === "male" ? "גבר" : ""} · {profile.age || "גיל לא צוין"} · {profile.city || "עיר לא צוינה"}</p>
        <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-bold">
          {profile.dnaType && <span className="text-[#1800ad]">{DNA[profile.dnaType] || profile.dnaType}</span>}
          {profile.isCoachingClient && <span className="rounded-full bg-pink-200 px-2 text-pink-800">מלווה</span>}
          {profile.isNotBasic && <span className="rounded-full bg-amber-100 px-2 text-amber-800">דורש תשומת לב</span>}
        </div>
        {horizontal && <div className="hidden sm:block mt-2"><MatchProfileFacts profile={profile} sentCount={sentCount} /></div>}
      </div>
    </div>
    <div className={`mt-3 ${horizontal ? "sm:hidden" : ""}`}><MatchProfileFacts profile={profile} sentCount={sentCount} /></div>
    <div className={`mt-3 grid gap-3 text-xs text-[#555] ${horizontal ? "md:grid-cols-3" : ""}`}>
      <div className="space-y-1">
        {profile.occupation && <p><b>עיסוק:</b> {profile.occupation}</p>}
        {profile.maritalStatus && <p><b>מצב משפחתי:</b> {MARITAL[profile.maritalStatus] || profile.maritalStatus}</p>}
        {profile.hasKids != null && <p><b>ילדים:</b> {profile.hasKids ? `יש${profile.numKids ? ` (${profile.numKids})` : ""}` : "אין"}{profile.wantsKids ? ` · ${profile.wantsKids === "yes" ? "רוצה ילדים" : profile.wantsKids === "no" ? "לא רוצה ילדים" : "פתיחות לנושא"}` : ""}</p>}
        {profile.hasPets != null && <p><b>חיות:</b> {profile.hasPets ? profile.petType || "יש חיית מחמד" : "אין חיית מחמד"}{profile.acceptsPets != null ? profile.acceptsPets ? " · פתיחות לחיות" : " · ללא חיות" : ""}</p>}
        {profile.smokingStatus && <p><b>עישון:</b> {profile.smokingStatus === "no" ? "לא" : profile.smokingStatus === "yes" ? "כן" : "לפעמים"}</p>}
        {profile.interests && <p><b>תחומי עניין:</b> {profile.interests}</p>}
      </div>
      <div><b className="text-[#191265]">על עצמי</b><p className="mt-1 whitespace-pre-wrap break-words">{profile.about || "לא נמסר תיאור"}</p></div>
      <div className="space-y-1"><b className="text-[#191265]">מה חשוב בזוגיות</b>
        {profile.seekingGender && <p><b>היכרות עם:</b> {profile.seekingGender === "female" ? "אישה" : profile.seekingGender === "male" ? "גבר" : "כל מגדר"}</p>}
        <p><b>גיל:</b> {preferenceRange(profile.minAgePreference, profile.maxAgePreference)}</p>
        <p><b>גובה:</b> {preferenceRange(profile.minHeightPreference, profile.maxHeightPreference)}</p>
        <p><b>רמה דתית רצויה:</b> {profile.religiosityPreference ? profile.religiosityPreference.split(",").map(v => RELIGION[v.trim()] || v.trim()).join(", ") : "לא צוינה"}</p>
        {profile.openToPartnerWithKids ? <p><b>פתיחות לילדים בקשר:</b> {profile.openToPartnerWithKids === "yes" ? "כן" : profile.openToPartnerWithKids === "no" ? "לא" : "תלוי בגיל הילדים"}</p> : profile.acceptsKids != null ? <p><b>פתיחות לילדים בקשר:</b> {profile.acceptsKids ? "כן" : "לא"}</p> : null}
        {profile.smokingPreference && <p><b>העדפת עישון:</b> {profile.smokingPreference === "no_smokers" ? "ללא עישון" : profile.smokingPreference === "occasionally_ok" ? "עישון מדי פעם אפשרי" : "לא משנה"}</p>}
        <p className="whitespace-pre-wrap break-words">{profile.partnerDescription || "לא נמסר תיאור"}</p>
      </div>
    </div>
  </article>;
}
