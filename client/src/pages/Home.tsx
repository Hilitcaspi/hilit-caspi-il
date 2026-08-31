import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, Heart, ImagePlus, Instagram, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

const instagramUrl = "https://www.instagram.com/hilitcaspi_relationship/";
const brandPortraitUrl = "/manus-storage/hilit-caspi-portrait_83d09f02.jpeg";
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

function BrandPortrait({ size = "regular" }: { size?: "regular" | "small" }) {
  return (
    <div className={size === "small" ? "brand-portrait brand-portrait-small" : "brand-portrait"}>
      <img src={brandPortraitUrl} alt="הילית כספי" />
    </div>
  );
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
    if (form.selfDescription.trim().length < 10) nextErrors.selfDescription = "כתבו לפחות 10 תווים בכמה מילים על עצמכם.";
    if (!/^[A-Za-z0-9._]{1,30}$/.test(normalizedInstagramUsername)) nextErrors.instagramUsername = "אפשר לכתוב שם משתמש באנגלית, מספרים, נקודה או קו תחתון בלבד.";
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
      <main dir="rtl" className="brand-page min-h-screen px-5 py-12 sm:py-20">
        <section className="mx-auto flex min-h-[72vh] max-w-xl items-center justify-center">
          <div className="success-card rise-in w-full text-center">
            <div className="success-check"><Check className="h-7 w-7" strokeWidth={2.7} /></div>
            <p className="brand-kicker">הפרטים התקבלו</p>
            <h1 className="brand-display mt-2 text-4xl leading-tight text-brand-navy sm:text-5xl">תודה שבחרת להכיר<br />את עצמך קצת יותר</h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-brand-ink/75">ההגשה נשמרה באופן פרטי ותיבחן אישית בהתאם לשיקולי העריכה של פינת רווק/ת השבוע.</p>
            <p className="mt-6 text-sm leading-6 text-brand-ink/60">הפרטים, התמונה והתיוג ישמשו אך ורק במסגרת הפינה ולפי ההסכמה שנתת.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="brand-page min-h-screen overflow-hidden text-brand-ink">
      <header className="brand-topbar px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-white/90"><Heart className="h-3.5 w-3.5 fill-current text-brand-gold" /> הילית כספי</div>
          <span className="text-xs tracking-[0.08em] text-brand-white/65">Relationship Expert &amp; Matchmaker</span>
        </div>
      </header>

      <section className="brand-hero relative overflow-hidden px-5 pb-14 pt-9 sm:pb-20 sm:pt-14">
        <div className="hero-orb hero-orb-right" aria-hidden="true" />
        <div className="hero-orb hero-orb-left" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.72fr_1.35fr_0.7fr] lg:gap-14">
          <div className="order-2 flex justify-center lg:order-1">
            <div className="portrait-orbit"><BrandPortrait /><span className="portrait-caption">הילית כספי</span></div>
          </div>
          <div className="order-1 text-center lg:order-2 lg:text-right">
            <p className="brand-kicker text-brand-gold"><Sparkles className="h-4 w-4" /> פינת רווק/ת השבוע</p>
            <h1 className="brand-display mt-4 max-w-3xl text-5xl leading-[1.02] text-brand-white sm:text-6xl lg:text-7xl">יש מקום לסיפור<br /><span className="text-brand-gold">שלכם להיפגש.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-white/80 lg:text-xl">פעם בשבוע אני בוחרת סיפור אחד ששווה להכיר. אם זה מרגיש נכון, זה המקום לספר מי אתם ומה אתם מחפשים.</p>
          </div>
          <aside className="order-3 hero-note">
            <LockKeyhole className="h-5 w-5 text-brand-gold" />
            <div><h2>פרטיות לפני הכול</h2><p>ההגשה נשמרת לצפייה פרטית שלי בלבד. פרסום ייעשה רק לפי ההסכמה המפורשת שלכם.</p></div>
          </aside>
        </div>
      </section>

      <section className="form-backdrop px-5 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <div className="form-brand-intro">
            <div className="gold-line" />
            <div><p className="brand-kicker">הצעד הראשון מתחיל כאן</p><h2 className="brand-display mt-2 text-3xl text-brand-navy sm:text-4xl">הפרטים שחשוב לי להכיר</h2></div>
            <span className="required-note"><b>*</b> שדה חובה</span>
          </div>

          <form onSubmit={handleSubmit} className="brand-form rise-in-delayed">
            <section className="form-chapter">
              <div className="chapter-heading"><span className="chapter-number">01</span><div><h3>קצת עליכם</h3><p>פרטים קצרים שיעזרו לי להכיר את התמונה המלאה.</p></div></div>
              <div className="mt-7 grid gap-x-6 gap-y-5 md:grid-cols-2">
                <label><span className="field-label">שם מלא <span>*</span></span><input className="field-control" required autoComplete="name" value={form.fullName} onChange={e => setText("fullName", e.target.value)} placeholder="איך נעים לכם שנכיר אתכם?" /></label>
                <label><span className="field-label">גיל <span>*</span></span><input className="field-control" required type="number" min="18" max="99" inputMode="numeric" value={form.age} onChange={e => setText("age", e.target.value)} placeholder="18 ומעלה" /></label>
                <label><span className="field-label">עיר או אזור מגורים <span>*</span></span><input className="field-control" required autoComplete="address-level2" value={form.city} onChange={e => setText("city", e.target.value)} placeholder="למשל: תל אביב והסביבה" /></label>
                <label><span className="field-label">טלפון <span>*</span></span><input className="field-control" required type="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={e => setText("phone", e.target.value)} placeholder="050-0000000" /></label>
                <label><span className="field-label">סטטוס זוגי <span>*</span></span><select className="field-control" value={form.relationshipStatus} onChange={e => setText("relationshipStatus", e.target.value)}>{relationshipStatuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label><span className="field-label">האם יש ילדים? <span>*</span></span><select className="field-control" value={form.hasChildren} onChange={e => setText("hasChildren", e.target.value)}><option value="no">לא</option><option value="yes">כן</option></select></label>
              </div>
              <div className="mt-5 grid gap-5">
                <label><span className="field-label">כמה מילים עליי <span>*</span></span><textarea className="field-control min-h-32 resize-y" required maxLength={800} aria-invalid={Boolean(fieldErrors.selfDescription)} aria-describedby={fieldErrors.selfDescription ? "self-description-error" : undefined} value={form.selfDescription} onChange={e => setText("selfDescription", e.target.value)} placeholder="מה חשוב שנדע עליכם? מה מעורר בכם סקרנות, שמחה או תשוקה?" />{fieldErrors.selfDescription && <p id="self-description-error" className="field-error">{fieldErrors.selfDescription}</p>}</label>
                <label><span className="field-label">מי מתאים לי להכיר? <span>*</span></span><textarea className="field-control min-h-32 resize-y" required maxLength={800} value={form.desiredPartner} onChange={e => setText("desiredPartner", e.target.value)} placeholder="ספרו בקצרה מה חשוב לכם בקשר ובאדם שמולכם." /></label>
              </div>
            </section>

            <section className="form-chapter">
              <div className="chapter-heading"><span className="chapter-number">02</span><div><h3>פנים, תמונה ותיוג</h3><p>כדי שנוכל לזהות ולתייג אתכם בצורה מדויקת.</p></div></div>
              <div className="mt-7 grid gap-6 md:grid-cols-2">
                <div>
                  <span className="field-label">תמונת פנים <span>*</span></span>
                  <label className="upload-panel group">
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(event.target.files?.[0])} />
                    {photoPreview ? <img src={photoPreview} alt="תצוגה מקדימה של התמונה שנבחרה" className="h-52 w-full rounded-xl object-cover" /> : <span><ImagePlus className="mx-auto h-9 w-9 text-brand-indigo" /><span className="mt-3 block font-bold text-brand-navy">העלאת תמונת פנים</span><span className="mt-1 block text-sm text-brand-ink/60">JPG, PNG או WEBP · עד 4MB</span></span>}
                  </label>
                  {photo && <p className="mt-2 truncate text-xs font-medium text-brand-ink/60">{photo.name}</p>}
                </div>
                <div className="instagram-panel">
                  <div className="flex items-center gap-2 text-brand-indigo"><Instagram className="h-5 w-5" /><span className="font-bold">החשבון שלכם באינסטגרם</span></div>
                  <p className="mt-3 text-sm leading-7 text-brand-ink/75">לפני שמגישים, חשוב לעקוב אחרי <a href={instagramUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-indigo underline decoration-brand-gold decoration-2 underline-offset-4">@hilitcaspi_relationship</a>.</p>
                  <label className="mt-6 block"><span className="field-label">שם משתמש לצורך תיוג <span>*</span></span><div className="relative"><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold text-brand-indigo">@</span><input className="field-control pr-8" required dir="ltr" aria-invalid={Boolean(fieldErrors.instagramUsername)} aria-describedby={fieldErrors.instagramUsername ? "instagram-error" : undefined} value={form.instagramUsername} onChange={e => setText("instagramUsername", e.target.value)} placeholder="your_username" /></div>{fieldErrors.instagramUsername && <p id="instagram-error" className="field-error">{fieldErrors.instagramUsername}</p>}</label>
                </div>
              </div>
            </section>

            <section className="form-chapter last-chapter">
              <div className="chapter-heading"><span className="chapter-number">03</span><div><h3>אישור והסכמה</h3><p>כל האישורים נדרשים לתהליך ברור, מדויק ומכבד.</p></div></div>
              <div className="mt-7 space-y-3">
                <label className="consent-row"><input required type="checkbox" checked={form.databaseMembershipConsent} onChange={e => setText("databaseMembershipConsent", e.target.checked)} /><span>אני מאשר/ת שאני חבר/ה במאגר הרווקים והרווקות של הילית כספי.</span></label>
                <label className="consent-row"><input required type="checkbox" checked={form.instagramFollowConsent} onChange={e => setText("instagramFollowConsent", e.target.checked)} /><span>אני מאשר/ת שאני עוקב/ת אחרי <a href={instagramUrl} target="_blank" rel="noreferrer">@hilitcaspi_relationship</a>.</span></label>
                <label className="consent-row consent-row-highlight"><input required type="checkbox" checked={form.publicationConsent} onChange={e => setText("publicationConsent", e.target.checked)} /><span>אני נותן/ת הסכמה מפורשת לפרסום הפרטים שמסרתי, תמונת הפנים ושם המשתמש באינסטגרם <strong>אך ורק במסגרת פינת ״רווק/ת השבוע״</strong>, לרבות תיוג באינסטגרם.</span></label>
              </div>
            </section>

            {formError && <div role="alert" className="form-error-box">{formError}</div>}
            <footer className="form-footer">
              <p>בלחיצה על שליחה, הפרטים נשמרים לצפייה פרטית של הילית כספי. אין בהגשה הבטחה לפרסום בפינה.</p>
              <button type="submit" disabled={submitApplication.isPending} className="brand-submit-button">
                {submitApplication.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><span>שליחת מועמדות</span><ChevronLeft className="h-5 w-5" /></>}
              </button>
            </footer>
          </form>
        </div>
      </section>
    </main>
  );
}
