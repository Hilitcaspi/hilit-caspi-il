import { useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const HERO_IMAGE = "/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg";
const EVENT_DATE = "שבת, 31 באוקטובר 2026";
const EVENT_TIME = "20:30 לפי שעון ישראל";
const CONTACT_EMAIL = "hilitcaspi@gmail.com";

type RegistrationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isDatabaseMember: boolean;
  marketingConsent: boolean;
  website?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isDatabaseMember: boolean | null;
  marketingConsent: boolean;
  website: string;
};

type DeliveryOutcome = "sent" | "queued" | "unavailable";

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  isDatabaseMember: null,
  marketingConsent: false,
  website: "",
};

function readUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const optionalValue = (key: string) => params.get(key)?.trim() || undefined;

  return {
    utmSource: optionalValue("utm_source"),
    utmMedium: optionalValue("utm_medium"),
    utmCampaign: optionalValue("utm_campaign"),
    utmContent: optionalValue("utm_content"),
  };
}

function AvailabilityNote({
  loading,
  unavailable,
  onRetry,
}: {
  loading: boolean;
  unavailable: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#191265]/10 bg-[#f7f1e2] px-4 py-3 text-xs font-bold leading-5 text-[#5d587e]">
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#4e3eb4]" />
        בודקים את זמינות ההרשמה
      </div>
    );
  }

  if (unavailable) {
    return (
      <div
        className="mb-5 rounded-xl border border-[#c8a950]/50 bg-[#fff8e5] p-4 text-sm leading-6 text-[#514a39]"
        role="status"
      >
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6a17]" />
          <p>
            כרגע אי אפשר לאשר משלוח של קישור הכניסה. אפשר לנסות שוב בעוד כמה
            דקות, בלי למלא פרטים.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-black">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-[#191265] underline decoration-[#c8a950] decoration-2 underline-offset-4 transition hover:text-[#4e3eb4]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            בדיקה מחדש
          </button>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("עזרה בהרשמה ללייב")}`}
            className="inline-flex items-center gap-1.5 text-[#191265] underline decoration-[#c8a950] decoration-2 underline-offset-4 transition hover:text-[#4e3eb4]"
          >
            <Mail className="h-3.5 w-3.5" />
            ליצירת קשר
          </a>
        </div>
      </div>
    );
  }

  return null;
}

function RegistrationResult({
  outcome,
  retrying,
  error,
  onRetry,
}: {
  outcome: DeliveryOutcome;
  retrying: boolean;
  error: string;
  onRetry: () => void;
}) {
  const unavailable = outcome === "unavailable";
  const queued = outcome === "queued";

  return (
    <div className="rounded-[1.7rem] border border-[#191265]/10 bg-white p-6 text-right shadow-[0_20px_55px_rgba(25,18,101,.12)] sm:p-8">
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl ${unavailable ? "bg-[#fff0cf] text-[#88630c]" : "bg-[#191265] text-[#ffe27c]"}`}
      >
        {unavailable ? (
          <CircleAlert className="h-6 w-6" />
        ) : (
          <CheckCircle2 className="h-6 w-6" />
        )}
      </span>
      <p className="mt-6 text-xs font-black tracking-[.15em] text-[#4e3eb4]">
        הרשמה ללייב
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-[#191265]">
        {unavailable
          ? "ההרשמה התקבלה, אך הקישור עדיין לא נשלח"
          : "ההרשמה התקבלה"}
      </h2>
      <p className="mt-4 text-sm leading-7 text-[#625d78]">
        {unavailable
          ? "הפרטים התקבלו, אך כרגע לא הצלחנו לשלוח את קישור הכניסה האישי למייל. אין צורך למלא את הטופס מחדש."
          : queued
            ? "קישור הכניסה האישי נמצא בתור למשלוח למייל."
            : "קישור הכניסה האישי נשלח למייל."}
      </p>

      {unavailable ? (
        <div className="mt-6 rounded-2xl bg-[#faf7ef] p-4">
          <p className="text-xs leading-6 text-[#625d78]">
            אפשר לנסות לשלוח שוב עם אותם הפרטים, או לפנות אלינו לעזרה. לא צריך
            להירשם מחדש.
          </p>
          {error ? (
            <p
              role="alert"
              className="mt-3 text-xs font-bold leading-6 text-[#9a3412]"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#191265] px-4 py-3 text-sm font-black text-white transition duration-150 hover:bg-[#30247e] active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
            >
              {retrying ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {retrying ? "מנסים לשלוח" : "לנסות לשלוח שוב"}
            </button>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("עזרה בהרשמה ללייב")}`}
              className="inline-flex items-center gap-2 px-2 py-3 text-sm font-black text-[#191265] underline decoration-[#c8a950] decoration-2 underline-offset-4 transition hover:text-[#4e3eb4]"
            >
              <Mail className="h-4 w-4" />
              ליצירת קשר
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[#f4eedf] p-4 text-xs leading-6 text-[#625d78]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4e3eb4]" />
          <p>שמרו את המייל כדי למצוא את קישור הכניסה האישי לקראת המפגש.</p>
        </div>
      )}
    </div>
  );
}

export default function LiveOpenRegistration() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [deliveryOutcome, setDeliveryOutcome] =
    useState<DeliveryOutcome | null>(null);
  const [retryError, setRetryError] = useState("");
  const lastPayload = useRef<RegistrationPayload | null>(null);
  const utmParams = useMemo(readUtmParams, []);
  const registrationStatus = trpc.liveOctober.openRegistrationStatus.useQuery();
  const register = trpc.liveOctober.registerOpenLive.useMutation();

  const registrationOpen = registrationStatus.data?.open === true;
  const deliveryEnabled = registrationStatus.data?.deliveryEnabled === true;
  const formAvailable = registrationOpen && deliveryEnabled;
  const statusUnavailable =
    registrationStatus.isError ||
    (registrationStatus.isSuccess && !formAvailable);

  const submitPayload = (payload: RegistrationPayload) => {
    setFormError("");
    setRetryError("");
    register.mutate(payload, {
      onSuccess: result => {
        setDeliveryOutcome(result.delivery);
        if (result.delivery !== "unavailable") {
          lastPayload.current = null;
          setForm(initialForm);
        }
      },
      onError: () => {
        const genericError =
          "לא הצלחנו להשלים את ההרשמה כרגע. אפשר לנסות שוב בעוד רגע.";
        if (deliveryOutcome === "unavailable") {
          setRetryError(genericError);
        } else {
          setFormError(genericError);
        }
      },
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formAvailable || register.isPending) return;

    if (form.isDatabaseMember === null) {
      setFormError("יש לבחור אם אתם כבר במאגר.");
      return;
    }

    if (!form.marketingConsent) {
      setFormError("כדי להשלים את ההרשמה, יש לאשר קבלת מיילים ועדכונים.");
      return;
    }

    const payload: RegistrationPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      isDatabaseMember: form.isDatabaseMember,
      marketingConsent: form.marketingConsent,
      website: form.website.trim() || undefined,
      ...utmParams,
    };

    lastPayload.current = payload;
    submitPayload(payload);
  };

  const retryDelivery = () => {
    if (!lastPayload.current || register.isPending) return;
    submitPayload(lastPayload.current);
  };

  const updateField = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key]
  ) => {
    setForm(current => ({ ...current, [key]: value }));
    if (formError) setFormError("");
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#f0eadc] font-rubik text-[#191265]"
    >
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_20%,rgba(255,226,124,.23),transparent_0_25%),radial-gradient(circle_at_83%_72%,rgba(97,76,216,.36),transparent_0_30%),linear-gradient(135deg,#100a48_0%,#191265_48%,#241c77_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.08)_50%,transparent_50.3%)] [background-size:84px_84px]"
        />

        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="text-sm font-black text-white transition hover:text-[#ffe27c]"
          >
            הילית כספי
          </Link>
          <Link
            href="/live"
            className="inline-flex items-center gap-2 text-xs font-black text-white/80 transition hover:text-[#ffe27c]"
          >
            <ArrowLeft className="h-4 w-4" />
            פרטי הלייב
          </Link>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-24 pt-5 sm:px-8 md:pb-32 lg:grid-cols-[1.12fr_.88fr] lg:gap-16 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/45 bg-white/10 px-4 py-2 text-xs font-black text-[#ffe27c] backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              הזמנה אישית ממני לחברי הקהילה שלי
            </div>
            <p className="mt-7 text-sm font-bold tracking-wide text-white/70">
              {EVENT_DATE} · {EVENT_TIME} · אונליין בזום
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              הערב נפגשים בלייב.
              <span className="block text-[#ffe27c]">ולכם זה בחינם.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
              כחברי הקהילה שלי, החלטתי לפתוח לכולכם את ערב הלייב איתי בחינם.
              אני רוצה שתבינו באמת איך עובדות ההתאמות, תראו מה אני בודקת
              מאחורי הקלעים, ובעיקר שאוכל לפגוש אתכם, לראות אתכם ולשמוע
              את השאלות שלכם.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-2xl border border-[#ffe27c]/35 bg-white/10 px-5 py-4">
              <span className="text-sm text-white/65">עלות רגילה <s className="mr-1 text-xl font-bold">149 ₪</s></span>
              <span className="text-xl font-black text-[#ffe27c]">ולחברי הקהילה שלי: בחינם</span>
            </div>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#ffe27c]" />
                <div>
                  <p className="text-xs font-bold text-white/62">מתי נפגשים</p>
                  <p className="mt-1 text-sm font-black text-white">
                    31.10.2026 · 20:30
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur-sm">
                <Mail className="h-5 w-5 shrink-0 text-[#ffe27c]" />
                <div>
                  <p className="text-xs font-bold text-white/62">אחרי ההרשמה</p>
                  <p className="mt-1 text-sm font-black text-white">
                    קישור כניסה אישי יישלח למייל
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.75,
              delay: 0.1,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-[3rem] border border-[#ffe27c]/25"
            />
            <div
              aria-hidden="true"
              className="absolute -inset-2 rounded-[2.4rem] bg-[#ffe27c]/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_28px_80px_rgba(5,2,37,.5)]">
              <img
                src={HERO_IMAGE}
                alt="הילית כספי מחייכת"
                className="aspect-[4/5] w-full object-cover object-[center_18%]"
                fetchPriority="high"
              />
              <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/18 bg-[#171053]/85 p-4 shadow-xl backdrop-blur-md">
                <p className="text-xs font-black text-[#ffe27c]">
                  בשבת, 31.10 · 20:30
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-white">
                  מפגש חי אונליין בזום, עם מקום להקשיב ולשאול.
                </p>
              </figcaption>
            </div>
          </motion.figure>
        </div>
      </section>

      <section className="relative mx-auto -mt-12 max-w-7xl px-5 pb-16 sm:px-8 md:pb-24 lg:px-10">
        <div className="grid items-start gap-7 lg:grid-cols-[.78fr_1.22fr] lg:gap-12">
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.15,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="order-2 rounded-[1.8rem] border border-[#191265]/10 bg-[#e5dcc8] p-6 shadow-[0_16px_40px_rgba(25,18,101,.08)] lg:order-1 lg:mt-12 sm:p-7"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#191265] text-[#ffe27c]">
              <UsersRound className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-2xl font-black leading-tight text-[#191265]">
              הפעם, אני רוצה לפגוש אתכם.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#625d78]">
              הערב אפתח לכם את מאחורי הקלעים של ההתאמות שלי, ואשאיר מקום
              לשאלות ולשיחה. לא צריך להיות במאגר כדי להצטרף. ההזמנה הזו
              היא לכל הקהילה שלי, והכניסה עליי.
            </p>
            <div className="mt-7 space-y-4 border-t border-[#191265]/10 pt-6">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#191265] text-xs font-black text-[#ffe27c]">
                  1
                </span>
                <p className="pt-0.5 text-sm font-bold leading-6 text-[#4f4969]">
                  ההרשמה ללייב היא ללא עלות.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#191265] text-xs font-black text-[#ffe27c]">
                  2
                </span>
                <p className="pt-0.5 text-sm font-bold leading-6 text-[#4f4969]">
                  קישור הכניסה האישי יישלח למייל.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#191265] text-xs font-black text-[#ffe27c]">
                  3
                </span>
                <p className="pt-0.5 text-sm font-bold leading-6 text-[#4f4969]">
                  אין צורך להיות במאגר כדי להירשם.
                </p>
              </div>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.2,
              ease: [0.23, 1, 0.32, 1],
            }}
            aria-labelledby="open-live-registration-title"
            className="order-1 rounded-[1.9rem] border border-[#191265]/10 bg-[#fffdf8] p-6 shadow-[0_22px_58px_rgba(25,18,101,.14)] sm:p-9 lg:order-2"
          >
            {deliveryOutcome ? (
              <RegistrationResult
                outcome={deliveryOutcome}
                retrying={register.isPending}
                error={retryError}
                onRetry={retryDelivery}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#191265]/10 pb-6">
                  <div>
                    <p className="text-xs font-black tracking-[.16em] text-[#4e3eb4]">
                      לייב בזום · 31.10.2026
                    </p>
                    <h2
                      id="open-live-registration-title"
                      className="mt-2 text-3xl font-black leading-tight tracking-[-.035em] text-[#191265]"
                    >
                      שומרים מקום לערב שלנו
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff0bf] px-3 py-2 text-xs font-black text-[#191265]">
                    <Clock3 className="h-4 w-4" />
                    20:30
                  </span>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#625d78]">
                  אחרי ההרשמה יישלח למייל קישור כניסה אישי ללייב. כדי להירשם
                  ולקבל גם עדכונים והטבות, יש לאשר קבלת מיילים בתיבה למטה.
                </p>

                <div className="mt-6">
                  <AvailabilityNote
                    loading={registrationStatus.isLoading}
                    unavailable={statusUnavailable}
                    onRetry={() => {
                      void registrationStatus.refetch();
                    }}
                  />
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div
                    aria-hidden="true"
                    className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                  >
                    <label htmlFor="live-open-website">Website</label>
                    <input
                      id="live-open-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={event =>
                        updateField("website", event.target.value)
                      }
                    />
                  </div>

                  <fieldset
                    disabled={!formAvailable || register.isPending}
                    className="space-y-5 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="live-open-first-name"
                          className="mb-2 block text-sm font-black text-[#191265]"
                        >
                          שם פרטי
                        </label>
                        <input
                          id="live-open-first-name"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          required
                          value={form.firstName}
                          onChange={event =>
                            updateField("firstName", event.target.value)
                          }
                          className="w-full rounded-xl border border-[#191265]/18 bg-white px-4 py-3 text-sm text-[#191265] outline-none transition placeholder:text-[#847d98] focus:border-[#191265] focus:ring-2 focus:ring-[#ffe27c]"
                          placeholder="שם פרטי"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="live-open-last-name"
                          className="mb-2 block text-sm font-black text-[#191265]"
                        >
                          שם משפחה
                        </label>
                        <input
                          id="live-open-last-name"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          required
                          value={form.lastName}
                          onChange={event =>
                            updateField("lastName", event.target.value)
                          }
                          className="w-full rounded-xl border border-[#191265]/18 bg-white px-4 py-3 text-sm text-[#191265] outline-none transition placeholder:text-[#847d98] focus:border-[#191265] focus:ring-2 focus:ring-[#ffe27c]"
                          placeholder="שם משפחה"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="live-open-email"
                          className="mb-2 block text-sm font-black text-[#191265]"
                        >
                          כתובת אימייל
                        </label>
                        <input
                          id="live-open-email"
                          name="email"
                          dir="ltr"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          required
                          value={form.email}
                          onChange={event =>
                            updateField("email", event.target.value)
                          }
                          className="w-full rounded-xl border border-[#191265]/18 bg-white px-4 py-3 text-right text-sm text-[#191265] outline-none transition placeholder:text-[#847d98] focus:border-[#191265] focus:ring-2 focus:ring-[#ffe27c]"
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="live-open-phone"
                          className="mb-2 block text-sm font-black text-[#191265]"
                        >
                          טלפון
                        </label>
                        <input
                          id="live-open-phone"
                          name="phone"
                          dir="ltr"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          required
                          value={form.phone}
                          onChange={event =>
                            updateField("phone", event.target.value)
                          }
                          className="w-full rounded-xl border border-[#191265]/18 bg-white px-4 py-3 text-right text-sm text-[#191265] outline-none transition placeholder:text-[#847d98] focus:border-[#191265] focus:ring-2 focus:ring-[#ffe27c]"
                          placeholder="050 000 0000"
                        />
                      </div>
                    </div>

                    <fieldset>
                      <legend className="text-sm font-black text-[#191265]">
                        האם אתם כבר במאגר?
                      </legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${form.isDatabaseMember === true ? "border-[#191265] bg-[#f4eedf]" : "border-[#191265]/15 bg-white hover:border-[#191265]/40"}`}
                        >
                          <input
                            type="radio"
                            name="databaseMember"
                            value="yes"
                            required
                            checked={form.isDatabaseMember === true}
                            onChange={() =>
                              updateField("isDatabaseMember", true)
                            }
                            className="h-4 w-4 accent-[#191265]"
                          />
                          <span className="text-sm font-bold text-[#191265]">
                            כן, אני כבר במאגר
                          </span>
                        </label>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${form.isDatabaseMember === false ? "border-[#191265] bg-[#f4eedf]" : "border-[#191265]/15 bg-white hover:border-[#191265]/40"}`}
                        >
                          <input
                            type="radio"
                            name="databaseMember"
                            value="no"
                            checked={form.isDatabaseMember === false}
                            onChange={() =>
                              updateField("isDatabaseMember", false)
                            }
                            className="h-4 w-4 accent-[#191265]"
                          />
                          <span className="text-sm font-bold text-[#191265]">
                            לא, אני לא במאגר
                          </span>
                        </label>
                      </div>
                    </fieldset>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f8f4eb] p-4">
                      <input
                        type="checkbox"
                        name="marketingConsent"
                        required
                        aria-describedby="live-open-consent-help"
                        checked={form.marketingConsent}
                        onChange={event =>
                          updateField("marketingConsent", event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#191265]"
                      />
                      <span id="live-open-consent-help" className="text-xs leading-6 text-[#625d78]">
                        אני רוצה לקבל מהילית כספי מיילים עם עדכונים, תוכן
                        והטבות, כולל ההטבות לאחר הלייב. אפשר להסיר את ההרשמה
                        לדיוור בכל עת באמצעות קישור ההסרה במייל.
                      </span>
                    </label>
                  </fieldset>

                  {!form.marketingConsent ? (
                    <p className="text-xs leading-6 text-[#625d78]">
                      כדי להפעיל את כפתור ההרשמה, יש לסמן אישור קבלת מיילים.
                    </p>
                  ) : null}

                  {formError ? (
                    <p
                      role="alert"
                      className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-bold leading-6 text-[#9a3412]"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!formAvailable || register.isPending || !form.marketingConsent}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#191265] px-6 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(25,18,101,.22)] transition duration-150 hover:-translate-y-0.5 hover:bg-[#30247e] active:scale-[.98] disabled:cursor-not-allowed disabled:transform-none disabled:opacity-60"
                  >
                    {register.isPending ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowLeft className="h-5 w-5" />
                    )}
                    {register.isPending ? "שולחים הרשמה" : "להרשמה ללא עלות"}
                  </button>
                  <p className="text-center text-xs leading-6 text-[#77718a]">
                    אין תשלום בעמוד הזה. קישור הכניסה האישי יישלח למייל.
                  </p>
                </form>
              </>
            )}
          </motion.section>
        </div>
      </section>

      <footer className="border-t border-[#191265]/10 bg-[#e8dfcd] px-5 py-8 text-center sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-[#625d78]">
          <ShieldCheck className="h-5 w-5 text-[#4e3eb4]" />
          <p className="text-xs font-bold leading-6">
            סודות ההתאמה המושלמת · מפגש חי בזום עם הילית כספי · שבת 31.10.2026
            בשעה 20:30
          </p>
        </div>
      </footer>
    </main>
  );
}
