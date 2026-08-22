import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HeartHandshake, Loader2, ShieldCheck, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "עוד לא נוצר קשר" },
  { value: "talking", label: "אנחנו מדברים" },
  { value: "date_scheduled", label: "קבענו פגישה" },
  { value: "met", label: "נפגשנו" },
  { value: "continuing", label: "אנחנו ממשיכים להכיר" },
  { value: "ended", label: "זה לא המשיך" },
  { value: "relationship", label: "אנחנו בזוגיות" },
] as const;

const PUBLICITY_OPTIONS = [
  { value: "none", label: "לא לפרסם" },
  { value: "anonymous", label: "בעילום שם בלבד" },
  { value: "first_name", label: "עם שם פרטי בלבד" },
  { value: "full_name", label: "עם שם מלא" },
  { value: "photo", label: "עם שם ותמונה, לאחר אישור החומרים הסופיים" },
] as const;

export default function MatchOutcomeFeedback() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const feedbackQuery = trpc.matchmaking.getOutcomeFeedback.useQuery(
    { token },
    { enabled: token.length >= 16, retry: false },
  );
  const submit = trpc.matchmaking.submitOutcomeFeedback.useMutation();

  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("talking");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [testimonialText, setTestimonialText] = useState("");
  const [publicityScope, setPublicityScope] = useState<(typeof PUBLICITY_OPTIONS)[number]["value"]>("none");
  const [consentToFollowUp, setConsentToFollowUp] = useState(true);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const existing = feedbackQuery.data?.existingFeedback;
    if (!existing) return;
    setStatus(existing.status);
    setRating(existing.rating ?? null);
    setComment(existing.comment || "");
    setTestimonialText(existing.testimonialText || "");
    setPublicityScope(existing.publicityScope || "none");
    setConsentToFollowUp(existing.consentToFollowUp ?? true);
    setConsentConfirmed(existing.consentConfirmed ?? false);
  }, [feedbackQuery.data]);

  const needsPublicityConsent = publicityScope !== "none";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (needsPublicityConsent && !consentConfirmed) return;
    await submit.mutateAsync({
      token,
      status,
      rating,
      comment: comment.trim() || null,
      testimonialText: testimonialText.trim() || null,
      publicityScope,
      consentToFollowUp,
      consentConfirmed,
    });
    setSubmitted(true);
  };

  if (!token || token.length < 16 || feedbackQuery.error) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f0eadc] px-4 py-16 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl border border-[#e9e8e8]">
          <ShieldCheck className="w-12 h-12 text-[#191265] mx-auto mb-4" />
          <h1 className="text-2xl font-black text-[#191265]">הקישור אינו תקין</h1>
          <p className="mt-3 text-[#727272]">השתמשו בקישור האישי שנשלח אליכם במייל.</p>
        </section>
      </main>
    );
  }

  if (feedbackQuery.isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#191265] animate-spin" />
      </main>
    );
  }

  if (submitted) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f0eadc] px-4 py-16 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl border border-[#e9e8e8]">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-[#191265]">תודה על העדכון</h1>
          <p className="mt-3 text-[#727272] leading-7">המשוב נשמר ויעזור לנו לשפר את ההתאמות ואת המעקב.</p>
        </section>
      </main>
    );
  }

  const data = feedbackQuery.data!;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f0eadc] px-4 py-10 text-[#191265]">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-5">
        <header className="rounded-3xl bg-[#191265] p-7 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#ffe27c] p-3 text-[#191265]"><HeartHandshake className="w-7 h-7" /></div>
            <div>
              <p className="text-sm text-white/70">מעקב אישי וקצר</p>
              <h1 className="text-2xl md:text-3xl font-black">{data.firstName}, מה קרה מאז החיבור עם {data.partnerFirstName}?</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/75">העדכון נשמר במערכת הפנימית. שום דבר לא יתפרסם ללא בחירה ואישור מפורשים שלך.</p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e9e8e8]">
          <h2 className="font-black text-lg mb-4">איפה הדברים עומדים עכשיו?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-xl border-2 px-4 py-3 text-right font-bold transition-colors ${status === option.value ? "border-[#191265] bg-[#191265] text-white" : "border-[#e9e8e8] bg-white hover:border-[#ffe27c]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e9e8e8]">
          <h2 className="font-black text-lg">עד כמה ההתאמה הרגישה מתאימה?</h2>
          <div className="mt-4 flex gap-2" aria-label="דירוג ההתאמה">
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} type="button" onClick={() => setRating(value)} className="p-1" aria-label={`דירוג ${value}`}>
                <Star className={`w-9 h-9 ${rating && value <= rating ? "fill-[#ffe27c] text-[#d7b52a]" : "text-[#d8d6d0]"}`} />
              </button>
            ))}
          </div>
          <label className="block mt-5 text-sm font-bold" htmlFor="comment">מה עבד או לא עבד עבורך?</label>
          <textarea id="comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-[#d9d6cf] p-3 focus:outline-none focus:ring-2 focus:ring-[#191265]" placeholder="כל פרט יעזור לנו לדייק התאמות עתידיות" />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#e9e8e8]">
          <h2 className="font-black text-lg">האם מותר לנו לשתף את החוויה?</h2>
          <p className="mt-2 text-sm leading-6 text-[#727272]">ברירת המחדל היא לא לפרסם. אפשר לבחור היקף שימוש מדויק, ואפשר לחזור מההסכמה בפנייה לשירות.</p>
          <select value={publicityScope} onChange={event => { setPublicityScope(event.target.value as typeof publicityScope); setConsentConfirmed(false); }} className="mt-4 w-full rounded-xl border border-[#d9d6cf] bg-white p-3 font-bold">
            {PUBLICITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          {needsPublicityConsent && (
            <div className="mt-4 space-y-3 rounded-2xl bg-[#fff9dc] p-4 border border-[#f0d86d]">
              <label className="block text-sm font-bold" htmlFor="testimonialText">הטקסט שמותר לפרסם</label>
              <textarea id="testimonialText" value={testimonialText} onChange={event => setTestimonialText(event.target.value)} maxLength={1500} rows={4} className="w-full rounded-xl border border-[#d9d6cf] bg-white p-3" placeholder="כתבו כאן רק את מה שנוח לכם שיופיע בפרסום" />
              <label className="flex items-start gap-3 text-sm leading-6 cursor-pointer">
                <input type="checkbox" checked={consentConfirmed} onChange={event => setConsentConfirmed(event.target.checked)} className="mt-1 h-5 w-5 accent-[#191265]" />
                <span>אני מאשר/ת להילית כספי להשתמש בטקסט שכתבתי בהיקף שבחרתי, באתר, במיילים, ברשתות החברתיות ובמודעות. ידוע לי שאפשר לבטל את ההסכמה בפנייה לשירות.</span>
              </label>
            </div>
          )}

          <label className="mt-4 flex items-start gap-3 text-sm leading-6 cursor-pointer">
            <input type="checkbox" checked={consentToFollowUp} onChange={event => setConsentToFollowUp(event.target.checked)} className="mt-1 h-5 w-5 accent-[#191265]" />
            <span>אפשר ליצור איתי קשר להשלמת המעקב על ההתאמה.</span>
          </label>
        </section>

        {submit.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">לא הצלחנו לשמור כרגע. נסו שוב בעוד רגע.</p>}
        <button type="submit" disabled={submit.isPending || (needsPublicityConsent && !consentConfirmed)} className="w-full rounded-2xl bg-[#191265] px-6 py-4 text-lg font-black text-[#ffe27c] shadow-lg disabled:opacity-50">
          {submit.isPending ? "שומר..." : "שמירת העדכון"}
        </button>
        <p className="text-center text-xs leading-5 text-[#727272]">המשוב אינו משפיע על הזכאות לקבל התאמות עתידיות.</p>
      </form>
    </main>
  );
}
