import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Check, FileVideo, Image as ImageIcon, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  disableQuickTextConsent,
  enableQuickTextConsent,
  QUICK_TEXT_CHANNELS,
  type TestimonialConsentChannel,
} from "@shared/testimonialConsent";

type IdentityScope = "anonymous" | "first_name" | "full_name" | "full_name_photo";
type Channel = TestimonialConsentChannel;

const channelOptions: Array<{ value: Channel; label: string }> = [
  { value: "website", label: "באתר" },
  { value: "organic_social", label: "בסושיאל האורגני" },
  { value: "email", label: "במיילים" },
  { value: "paid_ads", label: "במודעות בתשלום" },
  { value: "pr", label: "ביחסי ציבור" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function TestimonialFeedback() {
  const [, setLocation] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token")?.trim() || "", []);
  const isPreview = import.meta.env.DEV && (token === "preview" || window.location.pathname === "/__preview/testimonial-form");
  const utils = trpc.useUtils();
  const formQuery = trpc.testimonial.public.form.useQuery({ token }, { enabled: /^[a-f0-9]{64}$/.test(token), retry: false });
  const trackOpen = trpc.testimonial.public.trackOpen.useMutation();
  const submitFeedback = trpc.testimonial.public.submit.useMutation();
  const revokeConsent = trpc.testimonial.public.revoke.useMutation();
  const tracked = useRef(false);

  const [rating, setRating] = useState<number | undefined>();
  const [npsScore, setNpsScore] = useState<number | undefined>();
  const [feedbackText, setFeedbackText] = useState("");
  const [secondaryText, setSecondaryText] = useState("");
  const [outcomeText, setOutcomeText] = useState("");
  const [improvementText, setImprovementText] = useState("");
  const [testimonialText, setTestimonialText] = useState("");
  const [identityScope, setIdentityScope] = useState<IdentityScope>("anonymous");
  const [consentText, setConsentText] = useState(false);
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [consentVideo, setConsentVideo] = useState(false);
  const [allowedChannels, setAllowedChannels] = useState<Channel[]>([]);
  const [allowSpellingEdits, setAllowSpellingEdits] = useState(false);
  const [allowMaterialEdits, setAllowMaterialEdits] = useState(false);
  const [showAdvancedConsent, setShowAdvancedConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rewardPath, setRewardPath] = useState<string | null>(null);
  const previewData = useMemo(() => ({
    displayName: undefined,
    proofType: "product",
    sourceType: "course",
    surveyKind: "positive_experience",
    touchpoint: "course_complete",
    productLabel: "המסע לזוגיות",
    status: "draft",
    canSubmit: true,
    hasActiveConsent: false,
    consentVersion: "2026-09-02-v3",
    rewardType: "date_map",
    rewardGranted: false,
    rewardPath: null,
    questions: {
      heading: "אשמח לשמוע על החוויה שלך",
      intro: "כמה מילים ממך יעזרו לנו לספר על הדרך כפי שהיא באמת. בסיום מחכה לך מתנה אישית מהילית.",
      primaryQuestion: "איזה חלק בקורס היה משמעותי עבורך, ומה הצלחת להבין או ליישם בזכותו?",
      secondaryQuestion: "מה בדרך, בשיטה או בליווי של הילית הרגיש לך מדויק ובעל ערך?",
      testimonialPrompt: "אם אדם שמחפש אהבה היה מתלבט אם להצטרף למסע לזוגיות, מה היית רוצה לומר לו?",
      outcomeQuestion: "איזה שינוי, תובנה או צעד ימשיכו איתך גם אחרי סיום הקורס?",
      showRatings: false,
      showImprovement: false,
      rewardLabel: "מפת הדייט הבא",
    },
    media: [] as Array<{ id: number; mediaType: string; originalFileName: string; byteSize: number; status: string }>,
  }), []);
  const formData = isPreview ? previewData : formQuery.data;

  useEffect(() => {
    if (isPreview || !formQuery.data || tracked.current) return;
    tracked.current = true;
    trackOpen.mutate({ token });
  }, [formQuery.data, token]);

  const uploadedImage = formData?.media.some(item => item.mediaType === "image" && item.status !== "rejected") ?? false;
  const uploadedVideo = formData?.media.some(item => item.mediaType === "video" && item.status !== "rejected") ?? false;
  const anyConsent = consentText || consentPhoto || consentVideo;
  const quickConsentActive = consentText
    && identityScope === "first_name"
    && allowSpellingEdits
    && QUICK_TEXT_CHANNELS.every(channel => allowedChannels.includes(channel));

  function toggleQuickConsent() {
    if (quickConsentActive) {
      const next = disableQuickTextConsent(allowedChannels, consentPhoto || consentVideo);
      setConsentText(next.consentText);
      setIdentityScope(next.identityScope);
      setAllowedChannels(next.allowedChannels);
      setAllowSpellingEdits(next.allowSpellingEdits);
      return;
    }
    const next = enableQuickTextConsent(allowedChannels);
    setConsentText(next.consentText);
    setIdentityScope(next.identityScope);
    setAllowedChannels(next.allowedChannels);
    setAllowSpellingEdits(next.allowSpellingEdits);
  }

  function toggleMediaConsent(kind: "photo" | "video", checked: boolean) {
    if (kind === "photo") setConsentPhoto(checked);
    else setConsentVideo(checked);
    if (checked) setAllowedChannels(current => Array.from(new Set([...current, ...QUICK_TEXT_CHANNELS])));
    if (!checked && !consentText && (kind === "photo" ? !consentVideo : !consentPhoto)) {
      setAllowedChannels(current => current.filter(channel => !QUICK_TEXT_CHANNELS.includes(channel)));
    }
  }

  function toggleChannel(channel: Channel, checked: boolean) {
    setAllowedChannels(current => checked ? Array.from(new Set([...current, channel])) : current.filter(item => item !== channel));
  }

  async function uploadFile(file: File) {
    if (isPreview) {
      toast.info("מצב תצוגה מקדימה. לא נשמר קובץ.");
      return;
    }
    const image = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const video = ["video/mp4", "video/quicktime", "video/webm"].includes(file.type);
    if (!image && !video) {
      toast.error("אפשר להעלות JPEG, PNG, WebP, MP4, MOV או WebM");
      return;
    }
    const limit = image ? 10 * 1024 * 1024 : 80 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(image ? "התמונה גדולה מ־10MB" : "הסרטון גדול מ־80MB");
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(`/api/testimonials/media-upload?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "לא הצלחנו להעלות את הקובץ");
      toast.success("הקובץ הועלה. העלאה אינה אישור לפרסום.");
      await utils.testimonial.public.form.invalidate({ token });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "לא הצלחנו להעלות את הקובץ");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (isPreview) {
      setRewardPath("/__preview/testimonial-reward");
      setSubmitted(true);
      return;
    }
    if (feedbackText.trim().length < 2) {
      toast.error("נשמח לכמה מילים על החוויה");
      return;
    }
    if (anyConsent && allowedChannels.length === 0) {
      toast.error("אם בחרת לאפשר שימוש, צריך לבחור היכן מותר להשתמש");
      return;
    }
    if (consentText && !testimonialText.trim()) {
      toast.error("יש לכתוב את הטקסט שמותר לנו לשתף");
      return;
    }
    try {
      const result = await submitFeedback.mutateAsync({
        token,
        rating,
        npsScore,
        feedbackText,
        secondaryText: secondaryText || undefined,
        outcomeText: outcomeText || undefined,
        improvementText: improvementText || undefined,
        testimonialText: testimonialText || undefined,
        identityScope,
        consentText,
        consentPhoto,
        consentVideo,
        allowedChannels,
        allowSpellingEdits,
        allowMaterialEdits,
      });
      setRewardPath(result.rewardPath || null);
      setSubmitted(true);
      await utils.testimonial.public.form.invalidate({ token });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "לא הצלחנו לשמור את המשוב");
    }
  }

  if (!isPreview && (!token || formQuery.error)) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#fff6f8] px-5 py-20 text-[#4c2634]">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(47,25,18,.12)]">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#a75f78]" />
          <h1 className="text-2xl font-bold">הקישור אינו פעיל</h1>
          <p className="mt-3 text-[#715e55]">אפשר לפנות לצוות כדי לקבל קישור חדש.</p>
        </div>
      </main>
    );
  }

  if (!isPreview && formQuery.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#fff6f8]"><Loader2 className="h-8 w-8 animate-spin text-[#a75f78]" /></main>;
  }

  if (submitted) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#fff6f8] px-5 py-16 text-[#4c2634]">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-9 text-center shadow-[0_24px_70px_rgba(47,25,18,.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e6efe7]"><Check className="h-7 w-7 text-[#376346]" /></div>
          <h1 className="mt-5 text-3xl font-semibold">תודה ששיתפת</h1>
          <p className="mt-4 leading-7 text-[#715e55]">המשוב נשמר. אם ניתנה הרשאת שימוש, שום דבר לא יפורסם לפני בדיקה ואישור של הצוות.</p>
          {rewardPath ? <Button onClick={() => setLocation(rewardPath)} className="mt-7 rounded-full bg-[#a75f78] px-8 text-white hover:bg-[#8e4963]">למתנה האישית שלך</Button> : <Button onClick={() => setLocation("/")} className="mt-7 rounded-full bg-[#a75f78] px-8 text-white hover:bg-[#8e4963]">חזרה לאתר</Button>}
        </div>
      </main>
    );
  }

  const data = formData!;
  return (
    <main dir="rtl" className="min-h-screen bg-[#fff6f8] text-[#4c2634]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#6f3f52] via-[#a75f78] to-[#d89bb0] px-5 py-12 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,231,239,.32),transparent_34%),radial-gradient(circle_at_90%_90%,rgba(255,255,255,.14),transparent_38%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-sm tracking-[.18em] text-[#ffe3ec]">הילית כספי</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">{data.questions.heading}{data.questions.rewardLabel ? ", ובסיום מחכה לך מתנה אישית ממני" : ""}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff3f7]">{data.displayName ? `${data.displayName}, ` : ""}{data.questions.intro}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-0 md:py-12">
        {data.surveyKind === "positive_experience" && <section className="rounded-[2rem] border border-[#efcad7] bg-gradient-to-br from-[#fff8fb] to-[#fbe8ef] p-6 shadow-[0_18px_55px_rgba(117,63,84,.07)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9b6d55]">כמה מילים שיכולות לפתוח עוד אפשרויות</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#5f3042]">החוויה שלך יכולה לעזור לקהילה הזאת לגדול</h2>
          <p className="mt-3 leading-7 text-[#725866]">הפלטפורמה הזו נולדה כדי לעזור לאנשים למצוא אהבה בדרך אנושית ומדויקת יותר. כשמשתפים חוויה אמיתית ומאפשרים לנו לפרסם אותה, עוד אנשים יכולים להכיר את הדרך, להצטרף לקהילה ולהוסיף עוד הזדמנויות להיכרות ולהתאמות עבור כולם.</p>
          <p className="mt-3 font-semibold leading-7 text-[#7b4258]">גם כמה מילים שלך יכולות לעזור לאדם נוסף לעשות את הצעד הראשון.</p>
        </section>}
        {!data.canSubmit ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-10 w-10 text-[#6f3f2f]" />
            <h2 className="mt-4 text-2xl font-semibold">המשוב כבר נשמר</h2>
            <p className="mt-3 text-[#715e55]">אם תרצו לשנות או לבטל הסכמה לפרסום, אפשר להשתמש בכפתור הביטול למטה.</p>
          </section>
        ) : (
          <>
            <section className="rounded-[2rem] border border-[#f0d6df] bg-white p-6 shadow-[0_18px_55px_rgba(117,63,84,.08)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9b6d55]">חלק 1 · המשוב שלך</p>
              <h2 className="mt-3 text-2xl font-semibold">כמה שאלות קצרות שיעזרו לי להבין מה היה משמעותי עבורך</h2>
              <div className="mt-6">
                <Label htmlFor="feedback" className="text-base font-semibold leading-7">{data.questions.primaryQuestion}</Label>
                <Textarea id="feedback" value={feedbackText} onChange={event => setFeedbackText(event.target.value)} className="mt-3 min-h-32 rounded-2xl border-[#e7c4d1] bg-[#fffafd] text-base" placeholder="אפשר לכתוב בכנות ובמילים שלך" />
              </div>
              <div className="mt-6">
                <Label htmlFor="secondary" className="text-base font-semibold leading-7">{data.questions.secondaryQuestion}</Label>
                <Textarea id="secondary" value={secondaryText} onChange={event => setSecondaryText(event.target.value)} className="mt-3 min-h-28 rounded-2xl border-[#e7c4d1] bg-[#fffafd] text-base" placeholder="אפשר לשתף גם במשפט אחד" />
              </div>
              {data.surveyKind === "positive_experience" && <div className="mt-6 rounded-2xl border border-[#efcad7] bg-[#fff4f8] p-5">
                <Label htmlFor="testimonial" className="text-base font-semibold leading-7">{data.questions.testimonialPrompt}</Label>
                <p className="mt-2 text-sm leading-6 text-[#795e69]">כאן אפשר לכתוב את המשפט שהיית רוצה שיגיע לעוד אנשים שמחפשים אהבה ויעזור להם להכיר את הדרך.</p>
                <Textarea id="testimonial" value={testimonialText} onChange={event => setTestimonialText(event.target.value)} className="mt-3 min-h-32 rounded-2xl border-[#dfb7c6] bg-white text-base" placeholder="אפשר לכתוב את ההמלצה בדיוק במילים שלך" />
              </div>}
              {data.questions.outcomeQuestion && <div className="mt-6">
                <Label htmlFor="outcome" className="text-base font-semibold leading-7">{data.questions.outcomeQuestion}</Label>
                <Textarea id="outcome" value={outcomeText} onChange={event => setOutcomeText(event.target.value)} className="mt-3 min-h-28 rounded-2xl border-[#e7c4d1] bg-[#fffafd] text-base" placeholder="לא חובה, רק אם מתאים לשתף" />
              </div>}
              {data.questions.showRatings && <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <Label className="text-base">דירוג החוויה</Label>
                  <div className="mt-3 flex gap-2" dir="ltr">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} onClick={() => setRating(value)} className={`h-11 w-11 rounded-full border text-sm font-semibold transition ${rating === value ? "border-[#2b1712] bg-[#2b1712] text-white" : "border-[#d8c8bc] bg-white hover:border-[#8b563f]"}`}>{value}</button>)}</div>
                </div>
                <div>
                  <Label htmlFor="improvement" className="text-base">מה אפשר לשפר? <span className="text-[#9d8b82]">לא חובה</span></Label>
                  <Input id="improvement" value={improvementText} onChange={event => setImprovementText(event.target.value)} className="mt-3 rounded-xl border-[#d8c8bc]" />
                </div>
              </div>}
              {data.questions.showRatings && <div className="mt-6">
                <Label className="text-base">עד כמה הייתם ממליצים לאחרים? <span className="text-[#9d8b82]">לא חובה</span></Label>
                <div className="mt-3 grid grid-cols-11 gap-1" dir="ltr">{Array.from({ length: 11 }, (_, value) => <button type="button" key={value} onClick={() => setNpsScore(value)} className={`aspect-square rounded-lg border text-xs font-semibold md:text-sm ${npsScore === value ? "border-[#7a4937] bg-[#7a4937] text-white" : "border-[#d8c8bc] bg-white"}`}>{value}</button>)}</div>
                <div className="mt-2 flex justify-between text-xs text-[#8a766d]"><span>לא סביר</span><span>סביר מאוד</span></div>
              </div>}
              {data.questions.rewardLabel && <div className="mt-7 rounded-2xl border border-[#efcad7] bg-[#fff1f5] p-5">
                <p className="font-semibold text-[#7b4258]">מתנת תודה בסיום: {data.questions.rewardLabel}</p>
                <p className="mt-2 text-sm leading-6 text-[#795e69]">המתנה ניתנת על עצם השיתוף ואינה תלויה בתוכן התשובה או באישור לפרסום.</p>
              </div>}
            </section>

            {data.surveyKind === "positive_experience" && <section className="rounded-[2rem] border border-[#edccd8] bg-[#fbe8ef] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#8b563f]">חלק 2 · רשות בלבד</p>
              <h2 className="mt-3 text-2xl font-semibold">רוצים לשתף גם תמונה או סרטון?</h2>
              <p className="mt-3 leading-7 text-[#66534a]">אפשר לצרף חומר אישי. <strong>עצם ההעלאה אינה אישור לפרסום.</strong> ההרשאה נקבעת בנפרד בחלק הבא.</p>
              <label className="mt-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#b79d8a] bg-white/70 px-5 py-7 text-center transition hover:border-[#7a4937]">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                <span>{uploading ? "מעלה את הקובץ..." : "בחירת תמונה או סרטון"}</span>
                <input type="file" className="hidden" disabled={uploading} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadFile(file); event.currentTarget.value = ""; }} />
              </label>
              <p className="mt-3 text-xs text-[#7d685e]">תמונה עד 10MB · סרטון עד 80MB · JPEG, PNG, WebP, MP4, MOV או WebM</p>
              {data.media.length > 0 && <div className="mt-5 space-y-2">{data.media.map(media => <div key={media.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm">{media.mediaType === "image" ? <ImageIcon className="h-5 w-5" /> : <FileVideo className="h-5 w-5" />}<span className="min-w-0 flex-1 truncate">{media.originalFileName}</span><span className="text-[#8a766d]">{formatBytes(media.byteSize)}</span></div>)}</div>}
            </section>}

            {data.surveyKind === "positive_experience" && <section className="rounded-[2rem] border border-[#f0d6df] bg-white p-6 shadow-[0_18px_55px_rgba(117,63,84,.08)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9b6d55]">חלק 3 · הצהרת שימוש</p>
              <h2 className="mt-3 text-2xl font-semibold">רק אם תרצו לאפשר לנו לשתף</h2>
              <p className="mt-3 leading-7 text-[#66534a]">המשוב נשמר גם בלי הסכמה לפרסום. אם מתאים לך שהמילים שלך יגיעו לעוד אנשים שמחפשים אהבה, אפשר לאשר זאת בלחיצה אחת.</p>
              <button type="button" onClick={toggleQuickConsent} className={`mt-6 w-full rounded-2xl border-2 p-5 text-right transition ${quickConsentActive ? "border-[#9d4f6c] bg-[#f9e3eb] shadow-[0_12px_35px_rgba(157,79,108,.14)]" : "border-[#dfb7c6] bg-white hover:border-[#b76b87]"}`}>
                <span className="flex items-start gap-4">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${quickConsentActive ? "border-[#9d4f6c] bg-[#9d4f6c] text-white" : "border-[#c58ba0] text-transparent"}`}><Check className="h-4 w-4" /></span>
                  <span>
                    <strong className="block text-lg">כן, אפשר לשתף את ההמלצה שכתבתי</strong>
                    <span className="mt-2 block text-sm leading-6 text-[#725866]">עם השם הפרטי שלי, באתר, בסושיאל ובמייל. אפשר לבצע תיקוני כתיב ופיסוק בלבד, ואפשר לבטל את האישור בעתיד.</span>
                  </span>
                </span>
              </button>
              <p className="mt-3 text-sm leading-6 text-[#795e69]">המתנה ניתנת גם בלי אישור לפרסום. שום דבר לא מתפרסם לפני בדיקה של הצוות.</p>

              <button type="button" onClick={() => setShowAdvancedConsent(current => !current)} className="mt-6 text-sm font-semibold text-[#8e4963] underline underline-offset-4">{showAdvancedConsent ? "סגירת אפשרויות נוספות" : "אפשרויות נוספות: תמונה, סרטון, שם מלא או פרסום ממומן"}</button>

              {showAdvancedConsent && <div className="mt-5 rounded-2xl border border-[#edd1dc] bg-[#fff8fa] p-5">
                <div className="space-y-3">
                  <ConsentRow id="consent-photo" checked={consentPhoto} onChange={checked => toggleMediaConsent("photo", checked)} label="אישור לשימוש בתמונה שצירפתי באתר, בסושיאל ובמייל" disabled={!uploadedImage} hint={!uploadedImage ? "אפשר לבחור לאחר העלאת תמונה" : undefined} />
                  <ConsentRow id="consent-video" checked={consentVideo} onChange={checked => toggleMediaConsent("video", checked)} label="אישור לשימוש בסרטון שצירפתי באתר, בסושיאל ובמייל" disabled={!uploadedVideo} hint={!uploadedVideo ? "אפשר לבחור לאחר העלאת סרטון" : undefined} />
                </div>

                {anyConsent && <>
                  <h3 className="mt-7 font-semibold">כיצד אפשר לזהות אותך?</h3>
                  <RadioGroup value={identityScope} onValueChange={value => setIdentityScope(value as IdentityScope)} className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[{ value: "anonymous", label: "בעילום שם" }, { value: "first_name", label: "שם פרטי בלבד" }, { value: "full_name", label: "שם מלא" }, { value: "full_name_photo", label: "שם מלא ותמונה", disabled: !consentPhoto }].map(option => <label key={option.value} className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${option.disabled ? "opacity-50" : "cursor-pointer"}`}><RadioGroupItem value={option.value} disabled={option.disabled} /><span>{option.label}</span></label>)}
                  </RadioGroup>

                  <div className="mt-7 space-y-3">
                    <ConsentRow id="channel-paid" checked={allowedChannels.includes("paid_ads")} onChange={checked => toggleChannel("paid_ads", checked)} label="אישור נוסף לשימוש במודעות ממומנות" />
                    <ConsentRow id="channel-pr" checked={allowedChannels.includes("pr")} onChange={checked => toggleChannel("pr", checked)} label="אישור נוסף לשימוש בכתבות וביחסי ציבור" />
                    <ConsentRow id="material" checked={allowMaterialEdits} onChange={setAllowMaterialEdits} label="אפשר להציע עריכה מהותית, רק לאחר שאאשר את הנוסח הסופי" />
                  </div>
                </>}
              </div>}
              <p className="mt-5 rounded-xl bg-[#f6f1ec] p-4 text-sm leading-6 text-[#6f5d54]">גרסת הצהרה: {data.consentVersion}. אפשר לבטל את ההסכמה בעתיד באמצעות אותו קישור או בפנייה לצוות.</p>
            </section>}

            <Button onClick={() => void submit()} disabled={submitFeedback.isPending} className="h-14 w-full rounded-full bg-[#a75f78] text-base text-white hover:bg-[#8e4963]">{submitFeedback.isPending ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" />שומרים...</> : data.surveyKind === "positive_experience" ? "שליחה וקבלת המתנה" : "שליחת הסקר"}</Button>
          </>
        )}

        {data.hasActiveConsent && <button type="button" onClick={async () => { if (!confirm("לבטל את כל הרשאות השימוש הציבורי?")) return; await revokeConsent.mutateAsync({ token }); await utils.testimonial.public.form.invalidate({ token }); toast.success("הסכמת השימוש בוטלה"); }} className="mx-auto block text-sm text-[#815e4e] underline underline-offset-4">ביטול הסכמה לפרסום</button>}
      </div>
    </main>
  );
}

function ConsentRow(props: { id: string; checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; hint?: string }) {
  return <div className={`flex items-start gap-3 rounded-xl border border-[#e0d2c8] p-4 ${props.disabled ? "bg-[#f7f4f1] opacity-60" : "bg-white"}`}><Checkbox id={props.id} checked={props.checked} disabled={props.disabled} onCheckedChange={value => props.onChange(value === true)} /><div><Label htmlFor={props.id} className={props.disabled ? "cursor-not-allowed" : "cursor-pointer"}>{props.label}</Label>{props.hint && <p className="mt-1 text-xs text-[#8a766d]">{props.hint}</p>}</div></div>;
}
