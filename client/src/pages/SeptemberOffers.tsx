import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, Clock3, HeartHandshake, Sparkles, Video } from "lucide-react";
import GrowWallet from "@/components/GrowWallet";

type OfferKey = "session" | "course" | "guide";

const offers = {
  session: {
    label: "פגישת היכרות",
    eyebrow: "להכיר אותך באמת",
    title: "פגישת היכרות אישית",
    description: "פגישה ממוקדת עם הילית או עם איש מקצוע מצוותה, כדי להבין מה מעכב אותך, לדייק את הדרך ולבחור את הצעד הנכון עבורך.",
    originalPrice: 500,
    price: 450,
    coupon: "LOVE10",
    product: "session" as const,
    termsPath: "/terms/single-session",
    icon: HeartHandshake,
    features: ["היכרות מעמיקה עם הסיפור שלך", "דיוק אישי של הצעד הבא", "אפשרות להמשך למאגר או לליווי"],
  },
  course: {
    label: "הקורס הדיגיטלי",
    eyebrow: "לעבוד בקצב שלך",
    title: "קורס המסע למציאת זוגיות",
    description: "תהליך דיגיטלי מעשי לזיהוי דפוסים, דיוק בחירה ובניית דרך בריאה ומדויקת יותר לזוגיות.",
    originalPrice: 249,
    price: 125,
    coupon: "SEPTEMBER50",
    product: "course" as const,
    termsPath: "/terms/course",
    icon: Video,
    features: ["לימוד עצמאי ונגיש", "כלים מעשיים ליישום", "50% הנחה במבצע ספטמבר"],
  },
  guide: {
    label: "המדריך לבחור נכון",
    eyebrow: "להתחיל בצעד אחד",
    title: "המדריך לבחור נכון",
    description: "מדריך ממוקד שיעזור לך להבין מה באמת נכון עבורך, לזהות דפוסים ולבחור ממקום בהיר ובטוח יותר.",
    originalPrice: 149,
    price: 75,
    coupon: "SEPTEMBER50",
    product: "guide" as const,
    termsPath: "/terms/guide",
    icon: BookOpen,
    features: ["קריאה פשוטה ומעשית", "תרגילים לדיוק הבחירה", "50% הנחה במבצע ספטמבר"],
  },
} satisfies Record<OfferKey, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  originalPrice: number;
  price: number;
  coupon: string;
  product: "session" | "course" | "guide";
  termsPath: string;
  icon: typeof HeartHandshake;
  features: string[];
}>;

export default function SeptemberOffers() {
  const [selected, setSelected] = useState<OfferKey>("session");
  const offer = useMemo(() => offers[selected], [selected]);
  const Icon = offer.icon;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f3e8] text-[#191265]">
      <section className="relative isolate overflow-hidden bg-[#191265] text-white">
        <img
          src="/manus-storage/september-romantic-couple_e2ee3421.jpg"
          alt="זוג בשקיעה"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#191265] via-[#191265]/90 to-[#191265]/45" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.15fr_.85fr] md:px-10 md:py-24">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/60 bg-white/10 px-4 py-2 text-sm font-bold text-[#ffe27c]">
              <Sparkles className="h-4 w-4" /> מבצע ספטמבר עד 30.9.2026
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">השנה החדשה יכולה להתחיל בצעד חדש לזוגיות</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">שלוש דרכים שונות להתקדם, במחירים מיוחדים לספטמבר. בוחרים את מה שמתאים לך ורוכשים כאן, בלי לעבור בין עמודים.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full bg-[#ffe27c] px-4 py-2 text-[#191265]">פגישה ב־450 ש״ח</span>
              <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2">50% על הקורס והמדריך</span>
            </div>
          </div>
          <div className="self-end rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <Clock3 className="mb-4 h-8 w-8 text-[#ffe27c]" />
            <p className="text-sm font-bold text-[#ffe27c]">חשוב לדעת</p>
            <p className="mt-2 leading-7 text-white/85">המבצע אינו כולל את מאגר הרווקים או תהליכי הליווי. פלואו ההצטרפות למאגר נשאר נפרד וללא הצעות נוספות.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
        <div className="mb-8 text-center">
          <p className="text-sm font-black text-[#9b7a17]">מה הצעד הנכון עבורך עכשיו?</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">בחרו הצעה ורכשו באותו עמוד</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(Object.entries(offers) as Array<[OfferKey, typeof offers[OfferKey]]>).map(([key, item]) => {
            const OfferIcon = item.icon;
            const active = selected === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`rounded-2xl border p-5 text-right transition ${active ? "border-[#191265] bg-[#191265] text-white shadow-xl" : "border-[#dfd7c7] bg-white hover:border-[#b7a04c]"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <OfferIcon className={`h-7 w-7 ${active ? "text-[#ffe27c]" : "text-[#a88718]"}`} />
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-[#ffe27c] text-[#191265]" : "bg-[#f6edca] text-[#715b12]"}`}>{item.price} ש״ח</span>
                </div>
                <p className="mt-4 text-lg font-black">{item.label}</p>
                <p className={`mt-1 text-sm ${active ? "text-white/70" : "text-[#746f66]"}`}>{item.eyebrow}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-7 grid overflow-hidden rounded-3xl border border-[#ded5c3] bg-white shadow-[0_24px_70px_rgba(25,18,101,0.12)] md:grid-cols-[1fr_.9fr]">
          <div className="p-6 md:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#191265] text-[#ffe27c]"><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-xs font-black text-[#9b7a17]">{offer.eyebrow}</p>
                <h3 className="text-2xl font-black">{offer.title}</h3>
              </div>
            </div>
            <p className="mt-5 leading-7 text-[#5f5a52]">{offer.description}</p>
            <div className="mt-6 space-y-3">
              {offer.features.map(feature => (
                <div key={feature} className="flex items-center gap-3 text-sm font-bold text-[#34304f]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5f7e9] text-[#15803d]"><Check className="h-4 w-4" /></span>{feature}</div>
              ))}
            </div>
            <div className="mt-8 flex items-end gap-3">
              <span className="text-4xl font-black">{offer.price} ש״ח</span>
              <span className="pb-1 text-lg text-[#8b877f] line-through">{offer.originalPrice} ש״ח</span>
            </div>
            <p className="mt-2 text-xs text-[#777168]">קוד ההטבה {offer.coupon} מוזן ונבדק אוטומטית לאחר הזנת המייל.</p>
          </div>

          <div className="border-t border-[#e8e1d5] bg-[#fbf8f1] p-6 md:border-r md:border-t-0 md:p-8">
            <h4 className="text-xl font-black">להשלמת הרכישה</h4>
            <p className="mb-5 mt-1 text-sm leading-6 text-[#6f6a62]">ממלאים פרטים, מאשרים את התקנון ומשלמים באופן מאובטח דרך Grow.</p>
            <GrowWallet
              key={selected}
              product={offer.product}
              prefillCoupon={offer.coupon}
              termsPath={offer.termsPath}
              buttonLabel={`לרכישה ב־${offer.price} ש״ח`}
              buttonClassName="w-full rounded-xl bg-[#191265] px-5 py-3.5 font-black text-white transition hover:bg-[#2c2387]"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#e1d7c2] bg-white px-6 py-5 text-center md:flex-row md:text-right">
          <div>
            <p className="font-black">כבר הצטרפת למאגר?</p>
            <p className="mt-1 text-sm text-[#6c675f]">העמוד הזה אינו משנה את החברות שלך ואינו חלק מתהליך ההרשמה למאגר.</p>
          </div>
          <a href="/my-profile" className="inline-flex items-center gap-2 font-black text-[#191265]">לאזור האישי <ArrowLeft className="h-4 w-4" /></a>
        </div>
      </section>
    </main>
  );
}
