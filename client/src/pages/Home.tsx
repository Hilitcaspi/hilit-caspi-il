import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, Heart, ImagePlus, Instagram, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

const instagramUrl = "https://www.instagram.com/hilitcaspi_relationship/";
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

type FormValues = {
  fullName: string;
  age: string;
  city: string;
  phone: string;
  selfDescription: string;
  desiredPartner: string;
  relationshipStatus: "single" | "divorced" | "widowed" | "separated" | "other";
  hasChildren: "yes" | "no";
  instagramUsername: string;
  databaseMembershipConsent: boolean;
  instagramFollowConsent: boolean;
  publicationConsent: boolean;
};

type FieldErrors = Partial<Pick<FormValues, "selfDescription" | "instagramUsername">>;

const initialForm: FormValues = {
  fullName: "",
  age: "",
  city: "",
  phone: "",
  selfDescription: "",
  desiredPartner: "",
  relationshipStatus: "single",
  hasChildren: "no",
  instagramUsername: "",
  databaseMembershipConsent: false,
  instagramFollowConsent: false,
  publicationConsent: false,
};

const relationshipStatuses: Array<{ value: FormValues["relationshipStatus"]; label: string }> = [
  { value: "single", label: "רווק/ה" },
  { value: "divorced", label: "גרוש/ה" },
  { value: "widowed", label: "אלמן/ה" },
  { value: "separated", label: "פרוד/ה" },
  { value: "other", label: "אחר" },
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את קובץ התמונה"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const submitApplication = trpc.applications.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: error => setFormError(error.message),
  });

  const setText = (field: keyof FormValues, value: string | boolean) => {
    setForm(current => ({ ...current, [field]: value }) as FormValues);
    if (field === "selfDescription" || field === "instagramUsername") {
      setFieldErrors(current => ({ ...current, [field]: undefined }));
    }
  };

  const choosePhoto = (file: File | undefined) => {
    setFormError("");
    if (!file) return;
    if (!allowedImageTypes.includes(file.type) || file.size > 4 * 1024 * 1024) {
      setPhoto(null);
      setPhotoPreview("");
      setFormError("יש לבחור תמונת JPG, PNG או WEBP עד 4MB.");
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const normalizedInstagramUsername = form.instagramUsername.trim().replace(/^@+/, "");
    const nextErrors: FieldErrors = {};
    if (form.selfDescription.trim().length < 10) {
      nextErrors.selfDescription = "כתבו לפחות 10 תווים בכמה מילים על עצמכם.";
    }
    if (!/^[A-Za-z0-9._]{1,30}$/.test(normalizedInstagramUsername)) {
      nextErrors.instagramUsername = "אפשר לכתוב שם משתמש באנגלית, מספרים, נקודה או קו תחתון בלבד.";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    if (!photo) {
      setFormError("נא לצרף תמונת פנים לפני השליחה.");
      return;
    }

    try {
      const photoBase64 = await fileToBase64(photo);
      await submitApplication.mutateAsync({
        ...form,
        age: Number(form.age),
        hasChildren: form.hasChildren === "yes",
        instagramUsername: normalizedInstagramUsername,
        photoBase64,
        photoFilename: photo.name,
        photoMimeType: photo.type as "image/jpeg" | "image/png" | "image/webp",
        databaseMembershipConsent: form.databaseMembershipConsent as true,
        instagramFollowConsent: form.instagramFollowConsent as true,
        publicationConsent: form.publicationConsent as true,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "אירעה שגיאה בעת שליחת הטופס.");
    }
  };

  if (submitted) {
    return (
      <main dir="rtl" className="paper-grain min-h-screen px-5 py-12 sm:py-20">
        <section className="mx-auto flex min-h-[72vh] max-w-xl items-center justify-center">
          <div className="rise-in w-full rounded-[2rem] border border-[#eaded7] bg-[#fffdfb]/95 p-8 text-center shadow-[0_22px_65px_rgba(77,52,44,0.12)] sm:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4e3e6] text-[#914e60]">
              <Check className="h-8 w-8" strokeWidth={2.3} />
            </div>
            <p className="mb-3 text-sm font-bold tracking-[0.14em] text-[#a76072]">קיבלנו את הפרטים</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-[#3a2928] sm:text-5xl">תודה שבחרת להגיש מועמדות</h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-[#725f5a]">ההגשה שלך נשמרה באופן פרטי ותיבחן בהתאם לשיקולי העריכה של פינת רווק/ת השבוע.</p>
            <p className="mt-6 text-sm leading-6 text-[#8a7771]">הפרטים, התמונה והתיוג ישמשו אך ורק במסגרת הפינה ולפי ההסכמה שנתת.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#fcf8f5] text-[#302523]">
      <div className="relative border-b border-[#ebdfd9] bg-[#fffdfa]/80 px-5 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#865060]">
            <Heart className="h-4 w-4 fill-current" />
            הילית כספי · מערכות יחסים
          </div>
          <span className="rounded-full border border-[#ead9dc] bg-[#fdf4f5] px-3 py-1 text-xs font-bold text-[#8e5262]">הגשה פרטית</span>
        </div>
      </div>

      <section className="paper-grain relative px-5 pb-12 pt-12 sm:pb-16 sm:pt-20">
        <div className="absolute -right-28 top-6 h-64 w-64 rounded-full bg-[#efd9d8]/55 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-28 bottom-0 h-56 w-56 rounded-full bg-[#eee2d6]/65 blur-3xl" aria-hidden="true" />
        <div className="rise-in relative mx-auto max-w-5xl">
          <div className="grid items-end gap-8 lg:grid-cols-[1.18fr_0.82fr]">
            <div>
              <p className="mb-4 flex items-center gap-2 text-sm font-extrabold tracking-[0.15em] text-[#a85f70]"><Sparkles className="h-4 w-4" /> פינת רווק/ת השבוע</p>
              <h1 className="font-serif max-w-3xl text-5xl font-semibold leading-[1.05] text-[#3b2929] sm:text-6xl">יש לך סיפור ששווה להכיר?</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#695a55]">הגישו מועמדות לפינת רווק/ת השבוע. ספרו קצת על עצמכם, צרפו תמונת פנים, ואולי הסיפור שלכם יגיע לקהילה הנכונה.</p>
            </div>
            <aside className="rounded-[1.6rem] border border-[#eadbd4] bg-[#fffdfa]/85 p-5 shadow-[0_12px_35px_rgba(93,60,49,0.07)]">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#9c5969]" />
                <div>
                  <h2 className="font-bold text-[#473532]">פרטיות לפני הכול</h2>
                  <p className="mt-1 text-sm leading-6 text-[#76645e]">ההגשה נשמרת לצפייה פרטית של בעלת האתר. פרסום בפינה יתבצע רק במסגרת ההסכמה המפורשת שלך.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:pb-24">
        <div className="rise-in-delayed mx-auto max-w-5xl">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[#e9ded8] bg-[#fffdfb] p-5 shadow-[0_20px_55px_rgba(79,51,43,0.1)] sm:p-10">
            <div className="flex flex-col justify-between gap-3 border-b border-[#eee4de] pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-extrabold tracking-[0.13em] text-[#a55e6f]">שלב אחד קטן</p>
                <h2 className="font-serif mt-1 text-3xl font-semibold text-[#412d2b]">פרטי המועמדות שלך</h2>
              </div>
              <p className="text-sm text-[#87736d]"><span className="text-[#a55e6f]">*</span> שדה חובה</p>
            </div>

            <div className="mt-8 grid gap-x-6 gap-y-5 md:grid-cols-2">
              <label><span className="field-label">שם מלא <span className="text-[#a55e6f]">*</span></span><input className="field-control" required autoComplete="name" value={form.fullName} onChange={e => setText("fullName", e.target.value)} placeholder="איך נעים לך שנכיר אותך?" /></label>
              <label><span className="field-label">גיל <span className="text-[#a55e6f]">*</span></span><input className="field-control" required type="number" min="18" max="99" inputMode="numeric" value={form.age} onChange={e => setText("age", e.target.value)} placeholder="18 ומעלה" /></label>
              <label><span className="field-label">עיר או אזור מגורים <span className="text-[#a55e6f]">*</span></span><input className="field-control" required autoComplete="address-level2" value={form.city} onChange={e => setText("city", e.target.value)} placeholder="למשל: תל אביב והסביבה" /></label>
              <label><span className="field-label">טלפון <span className="text-[#a55e6f]">*</span></span><input className="field-control" required type="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={e => setText("phone", e.target.value)} placeholder="050-0000000" /></label>
              <label><span className="field-label">סטטוס זוגי <span className="text-[#a55e6f]">*</span></span><select className="field-control" value={form.relationshipStatus} onChange={e => setText("relationshipStatus", e.target.value)}>{relationshipStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span className="field-label">האם יש ילדים? <span className="text-[#a55e6f]">*</span></span><select className="field-control" value={form.hasChildren} onChange={e => setText("hasChildren", e.target.value)}><option value="no">לא</option><option value="yes">כן</option></select></label>
              <label className="md:col-span-2"><span className="field-label">כמה מילים עליי <span className="text-[#a55e6f]">*</span></span><textarea className="field-control min-h-32 resize-y" required maxLength={800} aria-invalid={Boolean(fieldErrors.selfDescription)} aria-describedby={fieldErrors.selfDescription ? "self-description-error" : undefined} value={form.selfDescription} onChange={e => setText("selfDescription", e.target.value)} placeholder="מה חשוב שנדע עליך? מה מעורר בך סקרנות, שמחה או תשוקה?" />{fieldErrors.selfDescription && <p id="self-description-error" className="mt-2 text-sm font-semibold text-[#a23d50]">{fieldErrors.selfDescription}</p>}</label>
              <label className="md:col-span-2"><span className="field-label">מי מתאים לי להכיר? <span className="text-[#a55e6f]">*</span></span><textarea className="field-control min-h-32 resize-y" required maxLength={800} value={form.desiredPartner} onChange={e => setText("desiredPartner", e.target.value)} placeholder="ספר/י בקצרה מה חשוב לך בקשר ובאדם שמולך." /></label>
            </div>

            <div className="mt-10 border-t border-[#eee4de] pt-8">
              <div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5e6e8] text-[#9f5768]"><ImagePlus className="h-5 w-5" /></span><div><h3 className="font-serif text-2xl font-semibold text-[#412d2b]">תמונה ואינסטגרם</h3><p className="text-sm text-[#7e6b65]">כדי שנוכל לזהות ולתייג אותך בצורה מדויקת.</p></div></div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <span className="field-label">תמונת פנים <span className="text-[#a55e6f]">*</span></span>
                  <label className="group flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d9b9bf] bg-[#fdf6f5] p-4 text-center transition hover:border-[#a45b6c] hover:bg-[#fcf1f2]">
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(event.target.files?.[0])} />
                    {photoPreview ? <img src={photoPreview} alt="תצוגה מקדימה של התמונה שנבחרה" className="h-48 w-full rounded-xl object-cover" /> : <span><ImagePlus className="mx-auto h-8 w-8 text-[#ad6877]" /><span className="mt-3 block font-bold text-[#6d4e52]">העלאת תמונת פנים</span><span className="mt-1 block text-sm text-[#927a74]">JPG, PNG או WEBP · עד 4MB</span></span>}
                  </label>
                  {photo && <p className="mt-2 truncate text-xs font-medium text-[#846e68]">{photo.name}</p>}
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-[#f7f0ec] p-5">
                  <div className="flex items-center gap-2 text-[#914e60]"><Instagram className="h-5 w-5" /><span className="font-bold">החשבון שלך באינסטגרם</span></div>
                  <p className="mt-2 text-sm leading-6 text-[#76635e]">לפני שמגישים, חשוב לעקוב אחרי <a href={instagramUrl} target="_blank" rel="noreferrer" className="font-bold text-[#914e60] underline decoration-[#c9909c] underline-offset-4">@hilitcaspi_relationship</a>.</p>
                  <label className="mt-5"><span className="field-label">שם משתמש לצורך תיוג <span className="text-[#a55e6f]">*</span></span><div className="relative"><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold text-[#a06b77]">@</span><input className="field-control pr-8" required dir="ltr" aria-invalid={Boolean(fieldErrors.instagramUsername)} aria-describedby={fieldErrors.instagramUsername ? "instagram-error" : undefined} value={form.instagramUsername} onChange={e => setText("instagramUsername", e.target.value)} placeholder="your_username" /></div>{fieldErrors.instagramUsername && <p id="instagram-error" className="mt-2 text-sm font-semibold text-[#a23d50]">{fieldErrors.instagramUsername}</p>}</label>
                </div>
              </div>
            </div>

            <fieldset className="mt-10 border-t border-[#eee4de] pt-8">
              <legend className="font-serif text-2xl font-semibold text-[#412d2b]">אישורים והסכמה</legend>
              <p className="mt-2 text-sm leading-6 text-[#7d6963]">כל האישורים נדרשים כדי לשמור על תהליך ברור ומכבד לכל הצדדים.</p>
              <div className="mt-5 space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-xl border border-[#eaded8] p-4 transition hover:bg-[#fdf9f7]"><input className="mt-1 h-4 w-4 accent-[#925062]" required type="checkbox" checked={form.databaseMembershipConsent} onChange={e => setText("databaseMembershipConsent", e.target.checked)} /><span className="text-sm leading-6 text-[#55433f]">אני מאשר/ת שאני חבר/ה במאגר הרווקים והרווקות של הילית כספי. <span className="font-bold text-[#925062]">*</span></span></label>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-[#eaded8] p-4 transition hover:bg-[#fdf9f7]"><input className="mt-1 h-4 w-4 accent-[#925062]" required type="checkbox" checked={form.instagramFollowConsent} onChange={e => setText("instagramFollowConsent", e.target.checked)} /><span className="text-sm leading-6 text-[#55433f]">אני מאשר/ת שאני עוקב/ת אחרי <a href={instagramUrl} target="_blank" rel="noreferrer" className="font-bold text-[#925062] underline underline-offset-2">@hilitcaspi_relationship</a>. <span className="font-bold text-[#925062]">*</span></span></label>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-[#e2c8ce] bg-[#fff9fa] p-4 transition hover:bg-[#fff4f6]"><input className="mt-1 h-4 w-4 accent-[#925062]" required type="checkbox" checked={form.publicationConsent} onChange={e => setText("publicationConsent", e.target.checked)} /><span className="text-sm leading-6 text-[#55433f]">אני נותן/ת הסכמה מפורשת לפרסום הפרטים שמסרתי, תמונת הפנים ושם המשתמש באינסטגרם <strong>אך ורק במסגרת פינת ״רווק/ת השבוע״</strong>, לרבות תיוג באינסטגרם. <span className="font-bold text-[#925062]">*</span></span></label>
              </div>
            </fieldset>

            {formError && <div role="alert" className="mt-6 rounded-xl border border-[#efbdc7] bg-[#fff1f3] px-4 py-3 text-sm font-semibold text-[#9e3146]">{formError}</div>}
            <div className="mt-8 flex flex-col-reverse items-start justify-between gap-5 border-t border-[#eee4de] pt-7 sm:flex-row sm:items-center">
              <p className="max-w-lg text-xs leading-5 text-[#8a7771]">בלחיצה על שליחה, הפרטים נשמרים לצפייה פרטית של בעלת האתר. אין בפרטי ההגשה הבטחה לפרסום בפינה.</p>
              <button type="submit" disabled={submitApplication.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8f4f5f] px-7 py-3.5 font-extrabold text-white shadow-[0_10px_24px_rgba(143,79,95,0.23)] transition duration-150 hover:bg-[#783d4d] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">
                {submitApplication.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><span>שלחו מועמדות</span><ChevronLeft className="h-5 w-5" /></>}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
