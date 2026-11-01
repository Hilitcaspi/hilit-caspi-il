import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CircleCheck,
  Clock3,
  HeartHandshake,
  Layers3,
  LockKeyhole,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import GrowWallet from "@/components/GrowWallet";
import { gaViewItem } from "@/lib/ga";
import { trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { trpc } from "@/lib/trpc";
import { NOVEMBER_APPROVED_TESTIMONIALS } from "@shared/novemberApprovedTestimonials";
import {
  NOVEMBER_BUNDLE_PRICE,
  NOVEMBER_BUNDLE_PRODUCT,
  isNovemberBundleOfferActive,
} from "@shared/novemberBundleOffer";

const HERO_IMAGE = "/manus-storage/hilit-smiling-portrait_cddd0dfc.jpg";
const ABOUT_IMAGE = "/manus-storage/hilit-bundle-close-portrait_85abe6c9.jpeg";
const PROFILE_FALLBACK =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const PLUS_EXCLUSION = "Plus לא כלול ולא מופעל אוטומטית";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const courseModules = [
  {
    title: "מפת הפחדים שלך",
    description:
      "מזהים פחד מדחייה, מנטישה ומאובדן עצמי, ומבינים איך להפוך אותו למידע במקום לתת לו לנהל את הבחירה.",
  },
  {
    title: "שורשי הדפוסים שלך",
    description:
      "מתבוננים בדפוסים רגשיים ובסגנון ההתקשרות שנבנו לאורך הדרך, כדי לזהות מה חוזר על עצמו בתוך קשרים.",
  },
  {
    title: "לבחור נכון",
    description:
      "מבהירים צרכים אמיתיים ומבדילים בינם לבין בחירות אוטומטיות, כדי לבחור אדם וקשר בצורה מדויקת יותר.",
  },
  {
    title: "לצאת לדייט נכון",
    description:
      "לומדים להגיע לדייט כדי להכיר וליצור חיבור אמיתי, לא כדי להציג גרסה מושלמת של עצמכם.",
  },
  {
    title: "תוכנית הפעולה שלך",
    description:
      "מסכמים במפה זוגית אישית ובצעדים מעשיים את הפחדים, הדפוסים, הצרכים וסגנון ההתקשרות שלכם.",
  },
];

const faqs = [
  {
    question: "מה כלול בהטבת נובמבר?",
    answer:
      "המאגר ב־349 ₪ במקום 499 ₪, עם הקורס המלא ״המסע לזוגיות״ במתנה. Plus לא כלול.",
  },
  {
    question: "מתי מתקבלת הצעת ההתאמה הראשונה?",
    answer:
      "בתוך 3 ימים מאישור התשלום והשלמת הפרופיל, התמונה, השאלונים וההעדפות. ההטבה היא להצעת התאמה, לא הבטחה לדייט או לזוגיות.",
  },
  {
    question: "איך נראית התאמה במאגר?",
    answer:
      "המערכת מציעה על בסיס הפרופיל, התמונה, שאלון ה־DNA, השאלון המדעי וההעדפות. הילית בוחנת אישית, ופרטים נחשפים רק לאחר אישור של שני הצדדים.",
  },
  {
    question: "האם יש מספר קבוע של התאמות?",
    answer:
      "לא. הצעות נשלחות כשיש בסיס אמיתי לשני הצדדים, לא כדי לייצר כמות.",
  },
  {
    question: "מהו הקורס שמתקבל במתנה?",
    answer:
      "זהו הקורס הדיגיטלי המלא ״המסע לזוגיות״: טקסטים, שאלות ותרגילים, חוברת עבודה ומפה זוגית אישית.",
  },
];

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-70px", amount: 0.08 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Portrait({
  src,
  alt,
  hero = false,
}: {
  src: string;
  alt: string;
  hero?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      {...(hero
        ? { fetchPriority: "high" as const }
        : { loading: "lazy" as const, decoding: "async" as const })}
      onError={event => {
        event.currentTarget.src = PROFILE_FALLBACK;
      }}
      className={
        hero
          ? "absolute inset-0 h-full w-full object-cover object-[50%_24%]"
          : "h-full min-h-[420px] w-full object-cover object-top"
      }
    />
  );
}

function OfferPrice({
  compact = false,
  showValueDetails = compact,
}: {
  compact?: boolean;
  showValueDetails?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.6rem] border border-[#171519]/10 bg-[#fffdf9]/88 shadow-[0_18px_55px_rgba(50,39,48,.11)] backdrop-blur-sm ${compact ? "p-5" : "p-6 md:p-7"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.08em] text-[#6e5868]">
            הטבה חד־פעמית
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-[#423842]">
            המאגר ב־349 ₪ והקורס המלא במתנה
          </p>
        </div>
        <span className="rounded-full bg-[#171519] px-3 py-1.5 text-xs font-black text-[#fffdf9]">
          חד־פעמי
        </span>
      </div>
      <div className="mt-5 flex items-end gap-3" dir="rtl">
        <span className="text-5xl font-black tracking-[-0.06em] text-[#171519] md:text-6xl">
          {NOVEMBER_BUNDLE_PRICE} ₪
        </span>
        <span className="pb-2 text-lg font-bold text-[#847783] line-through">
          499 ₪
        </span>
      </div>
      <div className="mt-5 rounded-2xl border border-[#765d70]/20 bg-[#ede4e9] px-4 py-3">
        <p className="text-lg font-black tracking-[-.02em] text-[#171519]">
          שווי ההטבה: 647 ₪
        </p>
        {showValueDetails ? (
          <details className="mt-2 text-xs leading-5 text-[#5e4d5b]">
            <summary className="cursor-pointer font-black underline decoration-[#765d70]/45 underline-offset-2">
              פירוט השווי
            </summary>
            <p className="mt-2">
              150 ₪ הנחה על המאגר + קורס בערך מקורי של 497 ₪. הקורס מוצע כיום
              בנפרד ב־249 ₪.
            </p>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function getDnaOfferHref() {
  const destination = new URLSearchParams({ offer: "november" });
  if (typeof window !== "undefined") {
    const source = new URLSearchParams(window.location.search);
    source.forEach((value, key) => {
      if (key.startsWith("utm_") && value) destination.set(key, value);
    });
  }
  return `/dna?${destination.toString()}`;
}

export default function NovemberLoveBundle() {
  const checkoutRef = useRef<HTMLElement>(null);
  const checkoutFormRef = useRef<HTMLDivElement>(null);
  const [offerActive] = useState(() => isNovemberBundleOfferActive());
  const { data: approvedTestimonials = [] } =
    trpc.publicProof.approvedTestimonials.useQuery(undefined, {
      staleTime: 10 * 60 * 1000,
    });
  const testimonials = [
    ...NOVEMBER_APPROVED_TESTIMONIALS,
    ...(Array.isArray(approvedTestimonials) ? approvedTestimonials : []),
  ];
  const dnaOfferHref = getDnaOfferHref();

  useEffect(() => {
    document.title = "הטבת נובמבר לזוגיות | הילית כספי";
    const description = "הטבה חד־פעמית: מאגר הרווקים והרווקות ב־349 ₪ במקום 499 ₪, עם הקורס המלא במתנה. מצטרפים עכשיו ומתחילים להכיר אחרת.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    // The campaign catalogue entry is maintained beside the Grow product by the payment integration.
    try {
      gaViewItem("bundle_november");
    } catch {
      // Analytics must never block the campaign page while a deployment is converging.
    }
    trackViewContent({
      content_name: "bundle_november",
      content_category: "bundle",
    });
    track({
      eventType: "page_view",
      page: "/november-love",
      metadata: { product: "bundle_november", value: NOVEMBER_BUNDLE_PRICE },
    });
  }, []);

  const openCheckout = (placement: string) => {
    track({
      eventType: "product_click",
      page: "/november-love",
      metadata: {
        product: "bundle_november",
        action: "scroll_to_checkout",
        placement,
      },
    });
    const target = checkoutFormRef.current ?? checkoutRef.current;
    target?.scrollIntoView({
      behavior: "instant",
      block: "start",
    });
    checkoutFormRef.current?.focus({ preventScroll: true });
  };

  const trackDnaClick = (placement: string) => {
    track({
      eventType: "product_click",
      page: "/november-love",
      metadata: {
        product: "bundle_november",
        action: "open_dna_quiz",
        placement,
      },
    });
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[#fffdf9] font-['Rubik',sans-serif] text-[#171519]"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .november-love-motion { opacity: 1 !important; transform: none !important; }
          .november-live-glow::before, .november-live-glow::after { animation: none !important; transform: none !important; opacity: .32 !important; }
        }
        .november-live-glow { isolation: isolate; overflow: hidden; }
        .november-live-glow::before, .november-live-glow::after { content: ""; pointer-events: none; position: absolute; z-index: -1; }
        .november-live-glow::before { inset: -55%; background: radial-gradient(circle, rgba(255,253,249,.52) 0%, rgba(210,195,205,.23) 30%, transparent 64%); opacity: .36; transform: translate3d(-8%, 5%, 0) scale(.94); }
        .november-live-glow::after { inset: -60% -15%; background: linear-gradient(110deg, transparent 38%, rgba(255,253,249,.45) 50%, transparent 62%); opacity: .18; transform: translate3d(-18%, 0, 0) rotate(-8deg); }
        @media (prefers-reduced-motion: no-preference) {
          .november-live-glow::before { animation: november-live-glow 4.8s cubic-bezier(.23,1,.32,1) infinite alternate; }
          .november-live-glow::after { animation: november-live-shimmer 5.8s cubic-bezier(.23,1,.32,1) infinite alternate; }
        }
        @keyframes november-live-glow { from { opacity: .25; transform: translate3d(-8%, 5%, 0) scale(.94); } to { opacity: .48; transform: translate3d(8%, -5%, 0) scale(1.06); } }
        @keyframes november-live-shimmer { from { opacity: .08; transform: translate3d(-18%, 0, 0) rotate(-8deg); } to { opacity: .28; transform: translate3d(18%, 0, 0) rotate(-8deg); } }
        .november-love-wallet .grow-wallet-container {
          background: #fffdf9 !important;
          border: 1px solid rgba(23, 21, 25, .12);
          border-radius: 1.35rem !important;
          box-shadow: none !important;
          padding: 1.25rem !important;
        }
        .november-love-wallet input {
          border-color: #c6b5c0 !important;
          background: #fffdf9 !important;
          border-radius: .8rem !important;
        }
        .november-love-wallet input:focus {
          border-color: #6f5969 !important;
          box-shadow: 0 0 0 3px rgba(198,181,192,.38) !important;
        }
        .november-love-wallet button:not([role="checkbox"]) {
          border-radius: 9999px !important;
        }
      `}</style>

      <nav className="absolute inset-x-0 top-0 z-30 px-5 py-5 md:px-9 md:py-7">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a
            href="/"
            className="text-sm font-black tracking-[-0.02em] text-[#171519] transition-opacity hover:opacity-70"
          >
            הילית כספי
          </a>
          <div className="flex items-center gap-2">
            <a
              href={dnaOfferHref}
              onClick={() => trackDnaClick("navigation_secondary")}
              className="rounded-full px-2 py-2.5 text-xs font-black text-[#4d3848] underline underline-offset-4 transition hover:text-[#171519] md:text-sm"
            >
              DNA חינמי
            </a>
            <button
              type="button"
              onClick={() => openCheckout("navigation")}
              className="rounded-full border border-[#171519]/15 bg-[#fffdf9]/75 px-4 py-2.5 text-xs font-black text-[#171519] backdrop-blur transition hover:bg-white md:px-5 md:text-sm"
            >
              להצטרפות עכשיו
            </button>
          </div>
        </div>
      </nav>

      <header className="relative isolate overflow-hidden bg-[#eee5ee] px-5 pb-10 pt-24 md:px-9 md:pb-12 md:pt-28" data-testid="november-hero">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,253,249,.78),transparent_60%),radial-gradient(circle_at_85%_90%,rgba(160,132,158,.22),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-8 lg:grid-cols-[.98fr_1.02fr] lg:gap-12 xl:gap-16">
          <div className="order-1 py-2 lg:py-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="november-love-motion mx-auto max-w-[610px] lg:mx-0"
            >
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#76516d]">
                <Sparkles className="h-4 w-4" /> הטבת נובמבר. חד־פעמית.
              </p>
              <h1 className="mt-5 text-[2.55rem] font-black leading-[1.08] tracking-[-0.045em] text-[#171519] sm:text-[3.2rem] lg:text-[clamp(2.5rem,3.9vw,3.65rem)]">
                בנובמבר אני נותנת
                <span className="mt-1 block text-[#68465e]">גז על ההתאמות.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-7 text-[#4b3d49] md:text-lg md:leading-8">
                זו ההזדמנות להצטרף למאגר הרווקים והרווקות שלי: אנשים
                שמחפשים זוגיות רצינית, עם התאמות שאני בודקת אישית.
              </p>
              <div className="mt-6 rounded-[1.4rem] border border-white/80 bg-[#fffdf9]/85 p-5 shadow-[0_12px_40px_rgba(77,46,69,.06)]" data-testid="november-hero-offer">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <div>
                    <p className="text-sm font-bold text-[#65515f]">מצטרפים למאגר</p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="text-[2.65rem] font-black leading-none tracking-[-.04em] text-[#171519]">{NOVEMBER_BUNDLE_PRICE} ₪</span>
                      <span className="text-base text-[#877983] line-through">499 ₪</span>
                    </div>
                  </div>
                  <div className="border-r-2 border-[#c7b0c1] pr-5">
                    <p className="text-sm font-bold text-[#785469]">ובמתנה עם ההצטרפות</p>
                    <p className="mt-1 text-lg font-black leading-7">הקורס המלא ״המסע לזוגיות״</p>
                  </div>
                </div>
                <p className="mt-3 border-t border-[#c7b0c1]/35 pt-3 text-xs text-[#785469] lg:hidden">שווי ההטבה: 647 ₪, לפי הערך המקורי</p>
              </div>
              <div className="mt-5 flex items-start gap-3 text-[#68465e]">
                <span className="november-live-glow relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#68465e] text-white shadow-[0_0_22px_rgba(138,85,128,.28)]">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black leading-6 md:text-lg">הצעת התאמה ראשונה בתוך 3 ימים!</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#6b5a67]">מאישור התשלום והשלמת הפרופיל והשאלונים.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col items-stretch gap-3 sm:items-start">
                <button
                  type="button"
                  onClick={() => openCheckout("hero")}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#171519] px-7 py-4 text-base font-black text-[#fffdf9] shadow-[0_12px_30px_rgba(23,21,25,.15)] transition hover:-translate-y-0.5 hover:bg-[#332d31] active:scale-[.98] sm:text-lg"
                >
                  להצטרפות למאגר ב־349 ₪ <ArrowDown className="h-5 w-5" />
                </button>
                <a
                  href={dnaOfferHref}
                  onClick={() => trackDnaClick("hero_secondary")}
                  className="inline-flex min-h-10 items-center justify-center px-2 text-sm font-bold text-[#624558] underline decoration-[#624558]/40 underline-offset-4 transition hover:text-[#171519] sm:self-center"
                >
                  מעדיפים להתחיל בשאלון DNA חינמי? מתחילים כאן
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6a5864]">
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5" /> תשלום חד־פעמי, ללא מנוי
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> {PLUS_EXCLUSION}
                </span>
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, delay: 0.04 }}
            className="november-love-motion relative order-2 mx-auto aspect-square w-full max-w-[610px] overflow-hidden rounded-[1.8rem] bg-[#c8b9c2] shadow-[0_24px_65px_rgba(74,46,66,.14)] lg:aspect-[4/5] lg:max-h-[740px] lg:rounded-[2rem]"
            data-testid="november-hero-photo"
          >
            <Portrait src={HERO_IMAGE} alt="הילית כספי" hero />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(23,21,25,.35)_100%)]" />
            <div className="absolute left-6 top-6 hidden rounded-[1.25rem] border border-white/75 bg-[#fffdf9]/92 px-5 py-4 text-center shadow-[0_8px_28px_rgba(23,21,25,.10)] backdrop-blur-md lg:block">
              <p className="text-xs font-bold text-[#785469]">שווי ההטבה</p>
              <p className="mt-1 text-3xl font-black tracking-[-.04em]">647 ₪</p>
              <p className="mt-1 text-[10px] text-[#73616d]">לפי הערך המקורי</p>
            </div>
            <div className="absolute inset-x-5 bottom-5 text-white md:inset-x-7 md:bottom-7">
              <p className="text-xl font-black">הילית כספי</p>
              <p className="mt-1 text-sm text-white/90">מאמנת לזוגיות ושדכנית. אני כאן, מאחורי כל התאמה.</p>
            </div>
          </motion.div>
        </div>
      </header>

      <section
        className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="offer-title"
      >
        <Reveal className="mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-sm font-black text-[#765d70]">
              מה באמת מקבלים כאן
            </p>
            <h2
              id="offer-title"
              className="mt-3 text-3xl font-black leading-tight tracking-[-.045em] text-[#171519] md:text-5xl"
            >
              המאגר פותח את ההיכרות.
              <br />
              הקורס מחדד את הבחירה.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#625563] md:text-lg">
              אנשים חדשים להכיר, וכלים להבין עם מי באמת נכון לך להתקדם.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-[1.07fr_.93fr]">
            <motion.article
              variants={fadeUp}
              className="relative overflow-hidden rounded-[2rem] bg-[#171519] p-7 text-[#fffdf9] shadow-[0_24px_60px_rgba(23,21,25,.18)] md:p-9"
            >
              <div className="absolute -left-12 -top-10 h-42 w-42 rounded-full bg-[#d2c3cd]/20 blur-2xl" />
              <div className="relative">
                <span className="rounded-full border border-white/18 bg-white/[.08] px-3 py-1.5 text-xs font-black text-[#f1e7ed]">
                  מאגר הרווקים והרווקות
                </span>
                <h3 className="mt-6 text-3xl font-black tracking-[-.04em] md:text-4xl">
                  349 ₪{" "}
                  <span className="mr-2 text-lg text-white/45 line-through">
                    499 ₪
                  </span>
                </h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/76">
                  יותר מ־5,000 רווקים ורווקות כבר הצטרפו למאגר שלי. אנשים
                  שמחפשים זוגיות רצינית, לא עוד שיחה שנעלמת. אני עוברת על כל
                  פרופיל, והמערכת בוחנת התאמה לפי ה־DNA הזוגי, השאלון המדעי,
                  ההעדפות ואורח החיים.
                </p>
                <ul className="mt-7 grid gap-3 text-sm font-bold leading-6 text-white/88">
                  {[
                    "לא צריך לגלול בין פרופילים. הצעות ההתאמה מגיעות במייל",
                    "אני בודקת כל פרופיל וכל הצעה לפני השליחה",
                    "פרטי קשר נחשפים רק אחרי אישור במייל של שני הצדדים",
                  ].map(item => (
                    <li key={item} className="flex gap-3">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d2c3cd]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
            <motion.article
              variants={fadeUp}
              className="relative overflow-hidden rounded-[2rem] border border-[#171519]/10 bg-[#c6b5c0] p-7 shadow-[0_24px_60px_rgba(71,49,65,.12)] md:p-9"
            >
              <div className="absolute -right-10 -bottom-12 h-42 w-42 rounded-full bg-[#fffdf9]/48 blur-2xl" />
              <div className="relative">
                <span className="rounded-full bg-[#fffdf9]/80 px-3 py-1.5 text-xs font-black text-[#493b46]">
                  במתנה עם ההצטרפות
                </span>
                <h3 className="mt-6 text-3xl font-black leading-[1.08] tracking-[-.04em] text-[#171519] md:text-4xl">
                  הקורס הדיגיטלי המלא
                  <br />
                  ״המסע לזוגיות״
                </h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-[#443842]">
                  למה אותו סוג קשר חוזר שוב? איך מבדילים בין משיכה להתאמה?
                  חמישה מודולים עם טקסטים ותרגילים, חוברת עבודה ומפה זוגית
                  אישית שיעזרו לזהות דפוסים, להבין מה חשוב לך ולבחור אחרת.
                </p>
                <div className="mt-7 rounded-2xl border border-[#171519]/10 bg-[#fffdf9]/55 p-4">
                  <p className="text-xs font-black text-[#655260]">
                    הקורס המלא במתנה
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#665965]">
                    כל התוכן פתוח אחרי אישור התשלום, בקצב שלך.
                  </p>
                </div>
              </div>
            </motion.article>
          </div>
        </Reveal>
      </section>

      <section
        className="bg-[#f4eef1] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="course-title"
      >
        <Reveal className="mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            className="grid gap-7 md:grid-cols-[.76fr_1.24fr] md:items-end"
          >
            <div className="flex h-18 w-18 items-center justify-center rounded-[1.6rem] bg-[#171519] text-[#fffdf9]">
              <Layers3 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-black text-[#765d70]">
                מה כולל הקורס שמקבלים במתנה
              </p>
              <h2
                id="course-title"
                className="mt-3 text-3xl font-black leading-tight tracking-[-.045em] text-[#171519] md:text-5xl"
              >
                חמישה מודולים שיעזרו לך לבחור אחרת.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#625563] md:text-lg">
                הקורס הדיגיטלי בנוי מטקסטים, שאלות ותרגילים. לאורך הדרך משתמשים
                בחוברת העבודה, ובסיום נוצרת מפה זוגית אישית, מסמך שמרכז תובנות
                וצעדים להמשך.
              </p>
            </div>
          </motion.div>
          <div className="mt-11 grid gap-4 md:grid-cols-5">
            {courseModules.map((module, index) => (
              <motion.article
                key={module.title}
                variants={fadeUp}
                className="rounded-[1.4rem] border border-[#171519]/10 bg-[#fffdf9] p-5 shadow-[0_10px_26px_rgba(72,54,67,.05)]"
              >
                <span className="text-xs font-black text-[#826979]">
                  מודול 0{index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black leading-6 text-[#171519]">
                  {module.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#625563]">
                  {module.description}
                </p>
              </motion.article>
            ))}
          </div>
          <motion.div
            variants={fadeUp}
            className="mt-7 rounded-[1.5rem] border border-[#171519]/10 bg-[#171519] p-6 text-[#fffdf9] md:flex md:items-center md:justify-between md:gap-8"
          >
            <div>
              <p className="text-sm font-black text-[#d8c8d1]">בסוף הקורס</p>
              <p className="mt-2 text-xl font-black">
                מפה זוגית אישית שמחברת פחדים, דפוסים, צרכים וסגנון התקשרות.
              </p>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70 md:mt-0">
              מסמך מסכם שאפשר לחזור אליו בדרך, ולתרגם ממנו את התובנות לצעדים
              הבאים.
            </p>
          </motion.div>
        </Reveal>
      </section>

      {testimonials.length > 0 ? (
        <section
          className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-24"
          aria-labelledby="stories-title"
        >
          <Reveal className="mx-auto max-w-6xl">
            <motion.div
              variants={fadeUp}
              className="mx-auto max-w-3xl text-center"
            >
              <p className="text-sm font-black text-[#765d70]">
                מילים מאנשים שכבר עשו את הצעד
              </p>
              <h2
                id="stories-title"
                className="mt-3 text-3xl font-black leading-tight text-[#171519] md:text-5xl"
              >
                לא רק מה שאני אומרת. מה שאנשים מספרים על הדרך שלי.
              </h2>
            </motion.div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {testimonials.map(testimonial => (
                <motion.blockquote
                  key={testimonial.id}
                  variants={fadeUp}
                  className="rounded-[1.6rem] border border-[#171519]/10 bg-[#f4eef1] p-7 shadow-[0_14px_36px_rgba(71,49,65,.07)]"
                >
                  <p className="text-base leading-8 text-[#514451]">
                    ״{testimonial.text}״
                  </p>
                  <footer className="mt-6 border-t border-[#171519]/10 pt-4 text-sm font-black text-[#171519]">
                    {testimonial.displayName.trim().split(/\s+/)[0]}
                    {"topic" in testimonial ? <span className="mt-1 block text-xs font-normal text-[#655866]">{testimonial.topic}</span> : null}
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      <section
        className="relative isolate overflow-hidden bg-[#ede4e9] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="method-title"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_87%_14%,rgba(255,253,249,.9),transparent_25%),radial-gradient(circle_at_12%_90%,rgba(104,77,96,.16),transparent_27%)]" />
        <Reveal className="relative mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            className="grid items-end gap-8 md:grid-cols-[.8fr_1.2fr]"
          >
            <div>
              <p className="text-sm font-black text-[#765d70]">
                איך זה עובד בפועל
              </p>
              <h2
                id="method-title"
                className="mt-3 text-4xl font-black leading-[1.05] tracking-[-.05em] text-[#171519] md:text-6xl"
              >
                המערכת מציעה.
                <br />
                אני בודקת אישית.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-9 text-[#554854]">
              נתוני הפרופיל, התמונה, ה־DNA הזוגי, השאלון המדעי וההעדפות יוצרים
              תמונה רחבה. שאלונים שמבוססים על מחקר מוסיפים עומק; המערכת מציעה;
              הילית בוחנת אישית את הפרופילים ואת ההתאמות המוצעות; ושני הצדדים
              מחליטים לפני שנחשפים פרטי קשר.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: ScanSearch,
                number: "01",
                title: "בונים פרופיל מלא",
                copy: "פרופיל, תמונה, שאלון DNA, שאלון מדעי והעדפות. רק כשהכול הושלם אפשר להתחיל לבחון התאמה.",
              },
              {
                icon: HeartHandshake,
                number: "02",
                title: "המערכת מציעה, הילית בוחנת",
                copy: "השאלונים נותנים שכבת עומק; הילית בוחנת אישית את הפרופילים ואת ההתאמות המוצעות, כדי לא להשאיר את הבחירה רק לנתונים.",
              },
              {
                icon: LockKeyhole,
                number: "03",
                title: "מאשרים לפני שמחברים",
                copy: "במאגר הרגיל נשלחות הצעות עם ציון התאמה מעל 80%: קודם הצעה, אחר כך אישור נפרד של שני הצדדים לפני חשיפת פרטים במייל, ורק אז פרטי קשר.",
              },
            ].map(({ icon: Icon, number, title, copy }) => (
              <motion.article
                key={number}
                variants={fadeUp}
                className="rounded-[1.7rem] border border-[#171519]/10 bg-[#fffdf9]/76 p-6 shadow-[0_14px_40px_rgba(71,49,65,.07)] backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171519] text-[#fffdf9]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-black text-[#826a7a]/35">
                    {number}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-black text-[#171519]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#625563]">{copy}</p>
              </motion.article>
            ))}
          </div>
        </Reveal>
      </section>

      <section
        className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="three-days-title"
      >
        <Reveal className="mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            className="november-live-glow relative grid overflow-hidden rounded-[2.25rem] border border-[#171519]/10 bg-[#171519] text-[#fffdf9] shadow-[0_28px_75px_rgba(23,21,25,.2)] md:grid-cols-[.84fr_1.16fr]"
          >
            <div className="relative z-10 bg-[#c6b5c0] p-8 text-[#171519] md:p-11">
              <Clock3 className="h-9 w-9" />
              <p className="mt-8 text-sm font-black text-[#564452]">
                אחרי שהפרופיל מוכן
              </p>
              <h2
                id="three-days-title"
                className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] md:text-5xl"
              >
                מצטרפים עכשיו.
                <br />
                ההצעה הראשונה בתוך 3 ימים.
              </h2>
            </div>
            <div className="relative z-10 p-8 md:p-11">
              <p className="max-w-2xl text-lg font-bold leading-8 text-white/85">
                לכבוד נובמבר אני נותנת גז על ההתאמות. מתחילים אחרי אישור
                התשלום והשלמת הפרופיל, התמונה, השאלונים וההעדפות, והצעת ההתאמה
                הראשונה מגיעה בתוך 3 ימים.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  "אישור תשלום",
                  "פרופיל, תמונה, שאלונים והעדפות",
                  "הצעת התאמה ראשונה במייל",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/12 bg-white/[.06] p-4"
                  >
                    <span className="text-xs font-black text-[#d8c8d1]">
                      0{index + 1}
                    </span>
                    <p className="mt-3 text-sm font-black leading-6">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section
        className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="about-title"
      >
        <Reveal className="mx-auto grid max-w-6xl items-stretch gap-9 md:grid-cols-[.86fr_1.14fr] md:gap-14">
          <motion.div
            variants={fadeUp}
            className="overflow-hidden rounded-[2rem] bg-[#c6b5c0] shadow-[0_26px_65px_rgba(71,49,65,.16)]"
          >
            <Portrait src={ABOUT_IMAGE} alt="הילית כספי" />
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-center py-2"
          >
            <p className="text-sm font-black text-[#765d70]">
              מי מחזיקה את תהליך ההתאמה
            </p>
            <h2
              id="about-title"
              className="mt-3 text-4xl font-black leading-[1.06] tracking-[-.05em] text-[#171519] md:text-5xl"
            >
              הילית כספי,
              <br />
              עם עין על כל הצעה.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-[#554854]">
              אני מאמנת לזוגיות ושדכנית. פיתחתי את השאלונים והקורס כדי לתת שפה
              ברורה יותר לבחירה, אבל במאגר אני לא מוותרת על המבט האנושי: קוראת
              את הפרופילים, בוחנת את ההצעות ומחזיקה את שני הצדדים בכבוד.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#655866]">
              המטרה אינה לייצר רצף של הצעות. המטרה היא לפתוח היכרות שאפשר באמת
              לשקול.
            </p>
          </motion.div>
        </Reveal>
      </section>

      <section
        ref={checkoutRef}
        id="payment"
        className="scroll-mt-8 bg-[#d2c3cd] px-5 py-20 md:px-8 md:py-28"
        aria-labelledby="checkout-title"
      >
        <Reveal className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <motion.div variants={fadeUp}>
            <p className="text-sm font-black text-[#614d5d]">
              הצטרפות להטבת נובמבר
            </p>
            <h2
              id="checkout-title"
              className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] text-[#171519] md:text-5xl"
            >
              מתחילים מכאן.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-9 text-[#514451]">
              מאגר ב־349 ₪, עם הקורס המלא במתנה. אחרי אישור התשלום יישלחו למייל
              הגישה לקורס והשלב הבא להשלמת ההצטרפות למאגר.
            </p>
            <div className="mt-7 max-w-md">
              <OfferPrice compact showValueDetails />
            </div>
            <a
              href={dnaOfferHref}
              onClick={() => trackDnaClick("checkout_secondary")}
              className="mt-5 inline-flex text-sm font-black text-[#4e404d] underline decoration-[#765d70]/45 underline-offset-4 transition hover:text-[#171519]"
            >
              רוצים קודם את שאלון ה־DNA החינמי? אפשר להתחיל כאן
            </a>
          </motion.div>
          <div
            ref={checkoutFormRef}
            tabIndex={-1}
            data-testid="november-checkout-form"
            className="scroll-mt-6 rounded-[2rem] border border-[#171519]/12 bg-[#fffdf9]/78 p-5 shadow-[0_26px_72px_rgba(71,49,65,.16)] backdrop-blur-sm outline-none md:p-8"
          >
            {offerActive ? (
              <>
                <p className="text-sm font-black text-[#5e4b5a]">
                  פרטי ההצטרפות
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#171519]">
                  מאגר וקורס ב־{NOVEMBER_BUNDLE_PRICE} ₪
                </h3>
                <div className="november-love-wallet mt-6">
                  <GrowWallet
                    product={NOVEMBER_BUNDLE_PRODUCT}
                    buttonLabel={`להמשך לתשלום מאובטח, ${NOVEMBER_BUNDLE_PRICE} ₪`}
                    buttonClassName="!bg-[#171519] !py-4 !text-base !font-black !text-[#fffdf9] hover:!bg-[#342d32]"
                    termsPath="/terms/november-love"
                    showCoupon={false}
                    keepDetailsVisible
                    onSuccess={() => {
                      window.location.assign("/thank-you/november-love");
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="py-5 text-center">
                <Clock3 className="mx-auto h-9 w-9 text-[#6e5868]" />
                <h3 className="mt-5 text-2xl font-black text-[#171519]">
                  הטבת נובמבר הסתיימה
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#5f5160]">
                  הקופה של ההטבה אינה זמינה עוד.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-full bg-[#171519]/20 px-6 py-4 text-base font-black text-[#171519]/50"
                >
                  ההצטרפות בהטבה אינה זמינה
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <section
        className="bg-[#fffdf9] px-5 py-20 pb-32 md:px-8 md:py-28"
        aria-labelledby="faq-title"
      >
        <Reveal className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-sm font-black text-[#765d70]">לפני שמחליטים</p>
            <h2
              id="faq-title"
              className="mt-3 text-3xl font-black text-[#171519] md:text-5xl"
            >
              שאלות נפוצות
            </h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map(({ question, answer }) => (
              <motion.details
                key={question}
                variants={fadeUp}
                className="group rounded-2xl border border-[#171519]/10 bg-white p-5 shadow-[0_8px_24px_rgba(71,49,65,.04)] md:p-6"
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#171519] marker:hidden md:text-lg">
                  {question}
                  <span
                    aria-hidden="true"
                    className="float-left text-2xl font-medium leading-5 text-[#765d70] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 border-t border-[#171519]/10 pt-4 text-sm leading-7 text-[#5f5160]">
                  {answer}
                </p>
              </motion.details>
            ))}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[#171519]/10 bg-[#fffdf9] px-5 py-8 text-center">
        <details className="mx-auto mb-6 max-w-2xl rounded-2xl border border-[#171519]/10 bg-[#f4eef1] px-5 py-4 text-right">
          <summary className="cursor-pointer text-sm font-black text-[#171519]">
            תנאי ההטבה
          </summary>
          <p className="mt-3 text-xs leading-6 text-[#5f5160]">
            בתוקף בישראל מ־1.11.2026 עד 30.11.2026. מחיר ההטבה 349 ₪ במקום 499
            ₪. הצעת התאמה ראשונה עד 3 ימים קלנדריים לאחר אישור התשלום והשלמת
            הפרופיל, התמונה, השאלונים וההעדפות. אין התחייבות לדייט, להסכמה
            הדדית או לזוגיות. Plus לא כלול ולא מופעל אוטומטית.
          </p>
        </details>
        <nav
          aria-label="קישורים"
          className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-bold text-[#625563]"
        >
          <a href="/" className="transition hover:text-[#171519]">
            דף הבית
          </a>
          <a
            href="/terms/november-love"
            className="transition hover:text-[#171519]"
          >
            תקנון ההטבה
          </a>
          <a href="/terms/database" className="transition hover:text-[#171519]">
            תקנון המאגר
          </a>
          <a href="/terms/course" className="transition hover:text-[#171519]">
            תקנון הקורס
          </a>
          <a href="/privacy" className="transition hover:text-[#171519]">
            מדיניות פרטיות
          </a>
        </nav>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#171519]/10 bg-[#fffdf9]/94 px-4 py-3 shadow-[0_-8px_28px_rgba(23,21,25,.08)] backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => openCheckout("mobile_sticky")}
          disabled={!offerActive}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#171519] px-5 py-3.5 text-base font-black text-[#fffdf9] shadow-[0_12px_24px_rgba(23,21,25,.18)] disabled:cursor-not-allowed disabled:bg-[#171519]/35"
        >
          {offerActive ? (
            <>
              להצטרפות ב־{NOVEMBER_BUNDLE_PRICE} ₪{" "}
              <ArrowLeft className="h-4 w-4" />
            </>
          ) : (
            "ההטבה הסתיימה"
          )}
        </button>
      </div>
    </main>
  );
}
