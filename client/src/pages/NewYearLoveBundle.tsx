import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  BookOpenCheck,
  Check,
  Clock3,
  Compass,
  Flower2,
  HeartHandshake,
  Lightbulb,
  Map,
  Network,
  NotebookPen,
  Route,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import GrowWallet from "@/components/GrowWallet";
import { gaViewItem } from "@/lib/ga";
import { trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { trpc } from "@/lib/trpc";

const HERO_IMG = "/manus-storage/hilit-bundle-standing_b180bb60.jpeg";
const CLOSE_PORTRAIT = "/manus-storage/hilit-bundle-close-portrait_85abe6c9.jpeg";
const WHATSAPP_URL =
  "https://wa.me/972552442334?text=" +
  encodeURIComponent("היי הילית, ראיתי את חבילת חגי תשרי ויש לי שאלה");
const OFFER_END = new Date("2026-09-30T23:59:59+03:00").getTime();

export function getHolidayBundleCouponFromSearch(search: string) {
  const requested = new URLSearchParams(search).get("coupon")?.trim().toUpperCase();
  return requested === "HOLIDAY10" ? requested : undefined;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const productCards = [
  {
    number: "01",
    eyebrow: "לפתוח הזדמנויות",
    title: "מאגר הרווקים והרווקות",
    subtitle: "לחבר את ההבנה להזדמנות אמיתית להכיר",
    icon: Network,
    original: "499 ₪",
    current: "299 ₪",
    includes: [
      "פרופיל אישי ושאלון DNA זוגי",
      "שאלון עומק על ערכים, אורח חיים והעדפות",
      "בחינת התאמות והסכמה הדדית לפני חשיפת פרטים",
    ],
    why:
      "כי עבודה פנימית צריכה לפגוש גם אנשים חדשים. המאגר מחבר בין מה שלמדתם על עצמכם לבין הזדמנות להכיר אדם שמחפש קשר רציני.",
    outcome:
      "פרופיל מדויק יותר ותהליך שמאפשר לבחון הצעות כשנמצא בסיס רלוונטי לשני הצדדים.",
  },
  {
    number: "02",
    eyebrow: "לדייק את הבחירה",
    title: "המדריך ״לבחור נכון״",
    subtitle: "לא מדריך שקוראים ומניחים בצד",
    icon: BookOpenCheck,
    original: "249 ₪",
    current: "149 ₪",
    includes: [
      "שאלון לזיהוי הדפוס הדומיננטי",
      "שלושה תרגילי עומק ומפת פחדים אישית",
      "תרגיל ״אפס נקודת הייחוס״ ו־12 שאלות לבדיקת הבחירות",
    ],
    why:
      "כדי להבין את הפער בין מי שאנחנו רגילים לחפש לבין מה שבאמת יכול להיות טוב עבורנו, ולזהות מתי רשימת הדרישות גורמת לנו לפספס אדם נכון.",
    outcome:
      "ניסוח ברור יותר של הצרכים, זיהוי הדפוס האישי וכלים שאפשר לחזור אליהם לפני דייט או בצומת בחירה.",
  },
  {
    number: "03",
    eyebrow: "להפוך הבנה לתנועה",
    title: "הקורס ״המסע לזוגיות״",
    subtitle: "לא קורס צפייה פסיבי",
    icon: Compass,
    original: "497 ₪",
    current: "249 ₪",
    includes: [
      "חמישה מודולים על פחדים, דפוסים, בחירה ודייטינג",
      "חוברת עבודה עם שאלות ותרגילים לכל מודול",
      "מפה זוגית אישית שנבנית מהתשובות לאורך התהליך",
    ],
    why:
      "כי תובנה יכולה לפתוח דלת, אבל שינוי נוצר כשעובדים איתה, מתרגלים ומתרגמים אותה לפעולה חדשה בחיים עצמם.",
    outcome:
      "מפה שמרכזת דפוסים, צרכים, פחדים וסגנון התקשרות, לצד כלים מעשיים להיכרות ולבניית קשר.",
  },
];

const journeySteps = [
  {
    icon: Lightbulb,
    title: "מבינים",
    copy: "מה מנהל את הבחירות, מה חוזר שוב ושוב ומה אולי חוסם את הדרך.",
  },
  {
    icon: Map,
    title: "ממפים",
    copy: "מה חשוב באמת בקשר ואיזו זוגיות רוצים לבנות מעבר לרשימת הדרישות.",
  },
  {
    icon: Sprout,
    title: "מתקדמים",
    copy: "מתרגמים את ההבנה לבחירה אחרת, לדייט מדויק יותר ולהזדמנויות חדשות.",
  },
];

const faqs = [
  {
    q: "מה קורה אחרי התשלום?",
    a: "מתקבלים מיילים עם קישורי גישה למדריך ולקורס, וקישור להתחלת תהליך ההצטרפות למאגר ולמילוי השאלונים.",
  },
  {
    q: "האם הכלים מחליפים פגישה אישית עם הילית?",
    a: "לא. הם נולדו מתוך השאלות, התרגילים והמיפוי שמלווים את הפגישות, ומאפשרים לעשות באופן עצמאי חלק משמעותי מעבודת ההכנה והבירור. הם אינם תחליף לפגישה או לליווי אישי.",
  },
  {
    q: "כבר מילאתי את שאלון ה־DNA הזוגי. מה עוד אקבל כאן?",
    a: "שאלון ה־DNA הוא נקודת פתיחה. המדריך והקורס עוזרים להפוך את התובנות לשאלות, לתרגול ולמפה שאפשר לעבוד איתה בחיים עצמם.",
  },
  {
    q: "האם זו התחייבות או מנוי?",
    a: "לא. התשלום הוא חד־פעמי בסך 399 ₪. אין חיוב מתחדש, ו־Plus אינו מופעל אוטומטית.",
  },
  {
    q: "כבר הצטרפתי למאגר. האם הבאנדל מתאים לי?",
    a: "אין צורך לשלם שוב על רכיב שכבר נרכש. אפשר לרכוש את המדריך או את הקורס בנפרד. Boost ו־Plus הם שירותים נפרדים.",
  },
  {
    q: "כמה התאמות מקבלים?",
    a: "אין מכסה קבועה. מספר ההצעות תלוי בהתאמה בין שני הצדדים, בהעדפות ובהיצע הפעיל. לא נשלח אדם רק כדי לייצר כמות.",
  },
  {
    q: "האם החבילה מבטיחה זוגיות?",
    a: "לא. החבילה נותנת כלים, תהליך והזדמנויות להיכרות, אך אינה מבטיחה התאמה, הסכמה של הצד השני או תוצאה זוגית.",
  },
  {
    q: "עד מתי ההטבה?",
    a: "מחיר החג תקף עד 30.9.2026. לאחר מכן המחיר עשוי להשתנות או שהחבילה תרד מהאתר.",
  },
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function WhiteFlower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="rgba(255,255,255,0.92)" stroke="rgba(99,79,63,0.22)" strokeWidth="1.2">
        <ellipse cx="32" cy="15" rx="9" ry="14" />
        <ellipse cx="49" cy="28" rx="9" ry="14" transform="rotate(72 49 28)" />
        <ellipse cx="42" cy="48" rx="9" ry="14" transform="rotate(144 42 48)" />
        <ellipse cx="22" cy="48" rx="9" ry="14" transform="rotate(216 22 48)" />
        <ellipse cx="15" cy="28" rx="9" ry="14" transform="rotate(288 15 28)" />
      </g>
      <circle cx="32" cy="32" r="7" fill="#d9c2a9" />
    </svg>
  );
}

function FlowerField({ subtle = false }: { subtle?: boolean }) {
  const flowers = [
    { left: "4%", top: "13%", size: 24, rotate: -12 },
    { left: "15%", top: "79%", size: 17, rotate: 18 },
    { left: "42%", top: "7%", size: 14, rotate: 30 },
    { left: "72%", top: "83%", size: 23, rotate: -25 },
    { left: "91%", top: "24%", size: 19, rotate: 8 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {flowers.map((flower, index) => (
        <motion.div
          key={`${flower.left}-${flower.top}`}
          className="absolute"
          style={{ left: flower.left, top: flower.top, width: flower.size }}
          animate={{ y: [0, -8, 0], rotate: [flower.rotate, flower.rotate + 7, flower.rotate] }}
          transition={{ duration: 5.5 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.45 }}
        >
          <WhiteFlower className={`h-auto w-full ${subtle ? "opacity-35" : "opacity-75"}`} />
        </motion.div>
      ))}
    </div>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, OFFER_END - now);
  const units = [
    { value: Math.floor(remaining / 86_400_000), label: "ימים" },
    { value: Math.floor((remaining % 86_400_000) / 3_600_000), label: "שעות" },
    { value: Math.floor((remaining % 3_600_000) / 60_000), label: "דקות" },
    { value: Math.floor((remaining % 60_000) / 1000), label: "שניות" },
  ];

  if (remaining === 0) {
    return <p className="text-center text-sm font-bold text-[#f4ece4]">הטבת החג הסתיימה. פרטי המחיר המעודכנים מופיעים בעמוד.</p>;
  }

  return (
    <div className="flex items-center justify-center gap-2" aria-label="זמן נותר עד לסיום ההטבה">
      {units.map((unit) => (
        <div key={unit.label} className="min-w-13 rounded-xl border border-white/15 bg-white/[0.06] px-2 py-2 text-center backdrop-blur-sm">
          <div className="font-mono text-xl font-black text-white tabular-nums md:text-2xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="mt-0.5 text-[9px] font-bold text-white/55">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

function PricePanel({ condensed = false }: { condensed?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#181412]/88 shadow-[0_30px_70px_rgba(20,15,12,0.3)] backdrop-blur-xl ${condensed ? "p-5" : "p-6 md:p-7"}`}>
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#c8ad92]/18 blur-2xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#f2eee8] px-3 py-1.5 text-xs font-black text-[#33271f]">חיסכון של 298 ₪</span>
          <span className="text-xs font-medium text-white/60">תשלום חד־פעמי · ללא מנוי</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 text-center md:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-1 py-3"><div className="text-[10px] font-bold text-white/45">שווי מקורי</div><div className="mt-1 text-base font-black text-white/65 line-through md:text-lg">1,245 ₪</div></div>
          <div className="rounded-2xl bg-[#f4efe8] px-1 py-3 text-[#2c211a] shadow-[0_12px_28px_rgba(220,205,190,0.18)]"><div className="text-[10px] font-black">מחיר החג</div><div className="mt-1 text-2xl font-black md:text-3xl">399 ₪</div></div>
        </div>
        {!condensed ? <p className="mt-4 text-center text-xs leading-5 text-white/58">מאגר הרווקים והרווקות · המדריך ״לבחור נכון״ · הקורס ״המסע לזוגיות״</p> : null}
      </div>
    </div>
  );
}

export default function NewYearLoveBundle() {
  const paymentRef = useRef<HTMLDivElement>(null);
  const newsletterCoupon = useMemo(() => getHolidayBundleCouponFromSearch(window.location.search), []);
  const { data: approvedTestimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  useEffect(() => {
    document.title = "חבילת חגי תשרי לזוגיות | הילית כספי";
    const description = "חבילת חגי תשרי של הילית כספי: מאגר הרווקים והרווקות, המדריך לבחור נכון והקורס המסע לזוגיות ב־399 ₪ בתשלום חד־פעמי.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
    trackViewContent({ content_name: "new_year_love_bundle", content_category: "holiday_bundle" });
    gaViewItem("bundle_new_year");
    track({ eventType: "page_view", page: "/new-year-love", metadata: { product: "bundle_new_year", value: 399, ...(newsletterCoupon ? { coupon: newsletterCoupon } : {}) } });
    if (window.location.hash === "#payment") {
      window.setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }
  }, [newsletterCoupon]);

  const openPayment = (placement: string) => {
    track({ eventType: "product_click", page: "/new-year-love", metadata: { product: "bundle_new_year", action: "scroll_to_payment", placement } });
    paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7f3ed] font-['Rubik',sans-serif] text-[#29221e]">
      <nav className="absolute inset-x-0 top-0 z-30 px-4 py-4 md:px-7 md:py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5 text-[#f8f4ef]">
            <img src={CLOSE_PORTRAIT} alt="הילית כספי" className="h-10 w-10 rounded-full border border-white/35 object-cover shadow-lg" />
            <span className="leading-tight"><strong className="block text-sm">הילית כספי</strong><span className="block text-[10px] text-white/65 md:text-[11px]">מאמנת למציאת זוגיות ושדכנית</span></span>
          </a>
          <button type="button" onClick={() => openPayment("nav")} className="rounded-full border border-white/25 bg-white/[0.1] px-4 py-2.5 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/[0.17] active:scale-[0.97] md:px-5 md:text-sm">לחבילת החג</button>
        </div>
      </nav>

      <header className="relative isolate min-h-[900px] overflow-hidden bg-[#1d1916] px-5 pb-20 pt-28 text-white md:min-h-[790px] md:px-8 md:pb-24 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_88%,rgba(154,126,101,0.42),transparent_31%),radial-gradient(circle_at_84%_18%,rgba(239,231,220,0.14),transparent_28%),linear-gradient(128deg,#151210_0%,#33271f_48%,#7b6654_100%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:42px_42px]" />
        <FlowerField />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.68 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-xs font-black text-[#f4eee7] backdrop-blur-sm"><Flower2 className="h-3.5 w-3.5" /> הטבת חגי תשרי · עד 30.9.2026</div>
            <h1 className="max-w-3xl text-[2.8rem] font-black leading-[1.02] tracking-[-0.045em] text-white md:text-6xl lg:text-7xl">
              בחגים האלה לא רק
              <span className="mt-2 block text-[#e3d2c1]">מאחלים לאהבה.</span>
              <span className="mt-2 block">פותחים לה מקום.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-bold leading-8 text-[#f6f0ea]/92 md:text-2xl md:leading-9">שלושה כלים שנבנו כדי לעזור לכם להבין מה מנהל את הבחירות, לזהות מה חוסם, לדייק את הזוגיות שאתם מחפשים ולפתוח הזדמנויות חדשות להכיר.</p>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/67 md:text-lg">לא עוד מדריך לקריאה ולא עוד קורס צפייה. שאלות, תרגילים, ניתוח ומפה שאפשר באמת לעבוד איתם.</p>
            <div className="mt-8 max-w-xl"><PricePanel /></div>
            <button type="button" onClick={() => openPayment("hero")} className="mt-7 inline-flex min-h-15 w-full items-center justify-center gap-3 rounded-full bg-[#f3eee8] px-7 py-4 text-base font-black text-[#2b211b] shadow-[0_18px_44px_rgba(13,10,8,0.32)] transition hover:-translate-y-0.5 hover:bg-white active:scale-[0.98] sm:w-auto sm:text-lg">לפתוח מקום לאהבה <ArrowDown className="h-5 w-5" /></button>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/58"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> תשלום מאובטח</span><span className="inline-flex items-center gap-1.5"><BookOpenCheck className="h-4 w-4" /> גישה דיגיטלית מיידית</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" /> ללא חיוב מתחדש</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.78, delay: 0.12 }} className="relative mx-auto w-full max-w-[31rem]">
            <div className="absolute -inset-5 rounded-[3rem] border border-white/12" />
            <div className="relative overflow-hidden rounded-[2.6rem] border border-white/20 bg-[#151210] p-2 shadow-[0_36px_90px_rgba(10,7,5,0.55)]">
              <img src={HERO_IMG} alt="הילית כספי בחלל בהיר" className="aspect-[4/5] w-full rounded-[2.15rem] object-cover object-top" />
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/18 bg-[#1b1714]/84 px-5 py-4 text-center shadow-2xl backdrop-blur-lg"><p className="text-xs font-bold text-[#d7c0aa]">להבין. לבחור. להכיר.</p><p className="mt-1 text-base font-black text-white">שלושה כלים. דרך אחת ברורה יותר.</p></div>
            </div>
            <WhiteFlower className="absolute -left-5 -top-7 w-20 drop-shadow-xl" />
          </motion.div>
        </div>
      </header>

      <main className="pb-24 md:pb-0">
        <section className="relative overflow-hidden bg-[#eee7df] px-5 py-18 md:px-8 md:py-26">
          <FlowerField subtle />
          <Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.86fr_1.14fr] md:gap-16">
            <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2rem] border border-[#806650]/15 bg-[linear-gradient(150deg,#fbf8f2_0%,#e5d9cc_55%,#c8b39e_100%)] p-7 shadow-[0_24px_60px_rgba(60,45,35,0.13)] md:p-9">
              <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/55 blur-2xl" />
              <WhiteFlower className="absolute -left-4 bottom-5 w-20 opacity-80" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[#2b241f] px-4 py-2 text-xs font-black text-white">נולד מתוך הפגישות</span><Sparkles className="h-5 w-5 text-[#7e6957]" /></div>
                <p className="mt-8 text-3xl font-black leading-tight tracking-[-0.03em] text-[#2d241e]">יצרתי עבורכם דרך לעבוד גם בלעדיי.</p>
                <div className="mt-7 grid gap-3">
                  {[{ icon: NotebookPen, label: "שאלות שמגיעות לעומק" }, { icon: Route, label: "תרגילים שמזהים דפוסים" }, { icon: Map, label: "מפה שמחברת הכול לדרך" }].map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm font-black text-[#46382f] shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#69715d] text-white"><Icon className="h-4 w-4" /></span>{label}</div>)}
                </div>
                <p className="mt-7 border-t border-[#6c5848]/15 pt-5 text-sm font-bold leading-7 text-[#5d4c40]">אותה חשיבה שמלווה את הפגישות, בתוך תהליך שאפשר לעבור באופן עצמאי ובקצב שלכם.</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp}><p className="text-sm font-black text-[#806650]">למה יצרתי את הבאנדל</p><h2 className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.03em] text-[#29211c] md:text-5xl">ידעתי שלא אוכל לפגוש את כולם באופן אישי.</h2><p className="mt-6 max-w-2xl text-lg leading-9 text-[#5f5148]">באלפי פגישות ליווי ראיתי אנשים מדהימים שבאמת רוצים אהבה. לפעמים לא חסר רצון ולא חסרות הזדמנויות. חסרה מפה. דרך להבין למה חוזרים לאותם דפוסים, למי נותנים הזדמנות, ומהי הזוגיות שבאמת נכונה לנו.</p><p className="mt-5 max-w-2xl text-lg leading-9 text-[#5f5148]">לכן לקחתי את השאלות, התרגילים, המיפוי והעבודה שאני מביאה לפגישות, ובניתי מהם כלים שאפשר לעבור גם באופן עצמאי ובקצב שלכם.</p><div className="mt-6 rounded-2xl border-r-4 border-[#92745c] bg-white/75 p-5 text-base font-black leading-8 text-[#3d3028] shadow-sm">הכלים אינם מחליפים פגישה אישית. הם מאפשרים לעשות לבד חלק משמעותי מעבודת ההכנה והבירור, ולהגיע הרבה יותר ממוקדים להיכרות או לפגישה עתידית.</div></motion.div>
          </Reveal>
        </section>

        <section className="relative bg-[#f9f6f1] px-5 py-20 md:px-8 md:py-28">
          <Reveal className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center"><p className="text-sm font-black text-[#806650]">מה בדיוק מקבלים</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#29211c] md:text-5xl">שלושה כלים. בכל אחד עובדים באמת.</h2><p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#68594f]">כל כלי נותן שכבה אחרת: היכרות, בחירה ותנועה. יחד הם מחברים בין הבנה על עצמכם לבין דרך מעשית להתקדם.</p></motion.div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {productCards.map((product, index) => {
                const Icon = product.icon;
                const cardBg = index === 0 ? "bg-[#eee7df]" : index === 1 ? "bg-white" : "bg-[#e7ddd3]";
                return (
                  <motion.article key={product.title} variants={fadeUp} className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-[#715b49]/14 p-6 shadow-[0_18px_50px_rgba(55,42,33,0.08)] transition duration-300 hover:-translate-y-1 md:p-7 ${cardBg}`}>
                    <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-white/45 blur-xl" />
                    <div className="relative flex items-start justify-between gap-4"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#2a221d] text-white shadow-lg"><Icon className="h-6 w-6" /></div><span className="text-5xl font-black tracking-[-0.07em] text-[#3e3027]/9">{product.number}</span></div>
                    <p className="relative mt-7 text-xs font-black text-[#806650]">{product.eyebrow}</p><h3 className="relative mt-2 text-2xl font-black leading-tight text-[#29211c]">{product.title}</h3><p className="relative mt-2 text-base font-bold text-[#705745]">{product.subtitle}</p>
                    <div className="relative mt-6 border-t border-[#5c4738]/12 pt-5"><p className="text-xs font-black text-[#5f4a3b]">מה יש בפנים</p><ul className="mt-3 space-y-2.5 text-sm leading-6 text-[#5f5148]">{product.includes.map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-[#806650]" />{item}</li>)}</ul></div>
                    <div className="relative mt-6 rounded-2xl bg-[#fbf8f4]/85 p-4"><p className="text-xs font-black text-[#705745]">למה בניתי אותו</p><p className="mt-2 text-sm leading-7 text-[#5b4d44]">{product.why}</p></div>
                    <div className="relative mt-4 border-r-2 border-[#b79a80] pr-3"><p className="text-xs font-black text-[#705745]">מה יוצא איתכם</p><p className="mt-1 text-sm leading-6 text-[#5b4d44]">{product.outcome}</p></div>
                    <div className="relative mt-auto pt-6"><div className="flex items-end justify-between rounded-2xl bg-[#211b17] px-4 py-3 text-white"><div><p className="text-[10px] font-bold text-white/45">מחיר המוצר</p><p className="mt-1 text-sm font-bold text-white/45 line-through">{product.original}</p></div><div className="text-left"><p className="text-[10px] font-bold text-[#d7c0aa]">כיום בנפרד</p><p className="mt-1 text-xl font-black text-white">{product.current}</p></div></div></div>
                  </motion.article>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="relative isolate overflow-hidden bg-[#211b17] px-5 py-20 text-white md:px-8 md:py-28">
          <FlowerField subtle />
          <Reveal className="relative mx-auto max-w-6xl"><motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center"><p className="text-sm font-black text-[#d9c5b2]">מה נוצר כשמחברים את שלושתם</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">לא רק לדעת יותר. להגיע מוכנים יותר.</h2><p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/72">אני מאמינה שהכלים יחד יכולים לעזור לצאת מהקיבעון של מי אמור להתאים, להבין מהי הזוגיות שאנחנו באמת מחפשים, ולפתוח יותר מקום לפגוש אותה.</p></motion.div><div className="mt-12 grid gap-5 md:grid-cols-3">{journeySteps.map((step) => { const Icon = step.icon; return <motion.div key={step.title} variants={fadeUp} className="rounded-[1.65rem] border border-white/12 bg-white/[0.06] p-6 text-center backdrop-blur-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-[#e3d2c1]"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-black">{step.title}</h3><p className="mt-3 text-sm leading-7 text-white/68">{step.copy}</p></motion.div>; })}</div><motion.div variants={fadeUp} className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/13 bg-white/[0.06] px-6 py-5 text-center text-base font-bold leading-8 text-[#eee3d8]">אין כאן הבטחה לתוצאה. יש כאן הזדמנות לעשות עבודה עמוקה, בקצב שלכם, עם יותר סדר, בהירות וכלים מעשיים.</motion.div><motion.div variants={fadeUp} className="text-center"><button type="button" onClick={() => openPayment("method")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f2eee8] px-7 py-4 font-black text-[#2a211b] transition hover:-translate-y-0.5 active:scale-[0.98]">אני רוצה להתחיל את התהליך <ArrowLeft className="h-5 w-5" /></button></motion.div></Reveal>
        </section>

        <section className="relative overflow-hidden bg-[#eee7df] px-5 py-20 md:px-8 md:py-28">
          <Reveal className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.92fr_1.08fr] md:gap-16">
            <motion.div variants={fadeUp} className="relative order-2 overflow-hidden rounded-[2rem] border border-[#715b49]/14 bg-[#25231d] p-7 text-white shadow-[0_26px_60px_rgba(54,42,33,0.16)] md:order-1 md:p-9">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,.14),transparent_28%),linear-gradient(145deg,transparent_0%,rgba(105,113,93,.58)_100%)]" />
              <WhiteFlower className="absolute -bottom-7 -right-6 w-24 opacity-90 drop-shadow-lg" />
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/18 bg-white/10"><HeartHandshake className="h-7 w-7 text-[#efe4d7]" /></div>
                <p className="mt-8 text-xs font-black text-[#d7c4b0]">מהתוצאה אל החיים עצמם</p>
                <p className="mt-3 text-3xl font-black leading-tight">ה־DNA הוא נקודת הפתיחה.</p>
                <div className="mt-7 grid grid-cols-3 gap-2 text-center text-xs font-black"><span className="rounded-xl bg-white/10 px-2 py-3">להבין</span><span className="rounded-xl bg-white/10 px-2 py-3">למפות</span><span className="rounded-xl bg-white/10 px-2 py-3">להתקדם</span></div>
                <p className="mt-7 border-t border-white/12 pt-5 text-sm leading-7 text-white/72">המדריך והקורס לוקחים את התובנות ומתרגמים אותן לשאלות, תרגול ומפה שאפשר לעבוד איתה.</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="order-1 md:order-2"><p className="text-sm font-black text-[#806650]">למי שהתחברו לשאלון ה־DNA הזוגי</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#29211c] md:text-5xl">השאלון הוא נקודת פתיחה. כאן התובנות מתחילות לעבוד.</h2><p className="mt-6 text-lg leading-9 text-[#5f5148]">המדריך והקורס נותנים שכבה נוספת של הבנה על עצמכם, על הבחירות שלכם ועל מה שחסר בדרך למציאת זוגיות. לא רק לקרוא את התוצאה, אלא לבדוק, לכתוב, לתרגל ולבנות מפה שאפשר לקחת לחיים.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["שאלות שמחברות בין התוצאה לחיים", "תרגילים שחושפים דפוסים חוזרים", "מפה אישית שאפשר לחזור אליה", "הכנה ממוקדת יותר להיכרות ולפגישה"].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/75 p-4 text-sm font-bold leading-6 text-[#473930]"><NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-[#806650]" />{item}</div>)}</div></motion.div>
          </Reveal>
        </section>

        <section className="bg-[#f9f6f1] px-5 py-20 md:px-8 md:py-28">
          <Reveal className="mx-auto max-w-6xl"><motion.div variants={fadeUp} className="grid overflow-hidden rounded-[2.25rem] border border-[#735c49]/14 bg-white shadow-[0_28px_75px_rgba(58,45,35,0.11)] md:grid-cols-[0.84fr_1.16fr]"><img src={CLOSE_PORTRAIT} alt="הילית כספי" className="h-full min-h-80 w-full object-cover" /><div className="p-7 md:p-12"><p className="text-sm font-black text-[#806650]">הערך מהפגישות, בדרך שאפשר לעבור לבד</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#29211c] md:text-5xl">לעשות את עבודת ההכנה בקצב שלכם.</h2><p className="mt-6 text-lg leading-9 text-[#5f5148]">בפגישות איתי אנחנו שואלים, ממפים, מזהים דפוסים ומנסחים מחדש את הדרך. את הליבה הזאת תרגמתי לשאלות, תרגילים ותהליך שאפשר לעבור באופן עצמאי.</p><div className="mt-7 space-y-3">{["להגיע ממוקדים יותר לכל היכרות", "להפיק יותר מפגישה עתידית אם תבחרו בה", "לחסוך ניסוי וטעייה בעזרת מסגרת עבודה ברורה"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#eee7df] px-4 py-3 text-sm font-bold text-[#473930]"><Check className="h-4 w-4 text-[#806650]" />{item}</div>)}</div><p className="mt-6 text-xs leading-6 text-[#7a6a60]">הבאנדל אינו טיפול, ייעוץ אישי או תחליף לפגישה. הערך הוא בעבודת ההכנה והבירור שאפשר לבצע באופן עצמאי.</p></div></motion.div></Reveal>
        </section>

        {approvedTestimonials.length > 0 ? (
          <section className="bg-[#eee7df] px-5 py-20 md:px-8 md:py-28" aria-labelledby="approved-stories-title"><Reveal className="mx-auto max-w-6xl"><motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-[#806650]">סיפורים אמיתיים, באישור מפורש</p><h2 id="approved-stories-title" className="mt-3 text-3xl font-black text-[#29211c] md:text-5xl">לפעמים הכול מתחיל מהסכמה לתת הזדמנות.</h2></motion.div><div className="mt-10 grid gap-5 md:grid-cols-2">{approvedTestimonials.map((testimonial) => <motion.blockquote key={testimonial.id} variants={fadeUp} className="relative overflow-hidden rounded-[1.75rem] border border-[#735c49]/14 bg-white p-7 shadow-[0_15px_40px_rgba(55,42,33,0.07)]"><Flower2 className="absolute -left-2 -top-2 h-14 w-14 text-[#bca58f]/20" /><p className="relative text-base leading-8 text-[#5b4d44]">״{testimonial.text}״</p><footer className="relative mt-6 flex items-center gap-3 border-t border-[#735c49]/12 pt-5">{testimonial.photoUrl ? <img src={testimonial.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#29211c] text-white"><Flower2 className="h-4 w-4" /></div>}<span className="text-sm font-black text-[#29211c]">{testimonial.displayName}</span></footer></motion.blockquote>)}</div></Reveal></section>
        ) : null}

        <section ref={paymentRef} id="payment" className="relative isolate overflow-hidden bg-[#1c1815] px-5 py-20 text-white md:px-8 md:py-28"><FlowerField /><Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16"><motion.div variants={fadeUp} className="text-center lg:text-right"><div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.07] px-4 py-2 text-xs font-black text-[#eee3d8]"><Clock3 className="h-4 w-4" /> הטבת חגי תשרי מסתיימת בעוד</div><div className="mt-5"><Countdown /></div><h2 className="mt-8 text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">השנה לא רק מאחלים. פותחים מקום.</h2><p className="mt-5 text-lg leading-8 text-white/72">שלושה כלים עם שאלות, תרגילים, מפה והזדמנות אמיתית להכיר, במחיר חג אחד.</p><div className="mt-7"><PricePanel condensed /></div></motion.div><motion.div variants={fadeUp} className="rounded-[2rem] border border-white/13 bg-[#f9f6f1] p-6 text-[#29211c] shadow-[0_30px_85px_rgba(10,7,5,0.44)] md:p-9"><p className="text-sm font-black text-[#806650]">הצטרפות לחבילת החג</p><h3 className="mt-2 text-3xl font-black tracking-[-0.03em]">399 ₪ בתשלום חד־פעמי</h3>{newsletterCoupon ? <div className="mt-3 rounded-2xl border border-[#d9bea2] bg-[#efe1d2] px-4 py-3 text-sm font-bold text-[#5c3824]">קוד HOLIDAY10 מהניוזלטר יחכה כאן ויופעל לאחר הזנת המייל.</div> : null}<p className="mt-3 text-sm leading-6 text-[#6a5a50]">לאחר אישור Grow יישלחו קישורי הגישה למוצרים הדיגיטליים ויתחיל תהליך ההצטרפות למאגר.</p><div className="mt-6"><GrowWallet product="bundle_new_year" prefillCoupon={newsletterCoupon} buttonLabel="להצטרפות לחבילת החג" buttonClassName="!bg-[#29211c] !text-white !font-black !text-lg !rounded-full hover:!bg-[#3a2e27] !py-4" termsPath="/terms/new-year-love" onSuccess={() => { window.location.href = "/thank-you/new-year-love"; }} /></div><div className="mt-5 flex items-center justify-center gap-4 text-center text-[11px] font-medium text-[#6f6056]"><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> תשלום מאובטח</span><span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> ללא חיוב מתחדש</span></div><p className="mt-4 text-center text-[11px] leading-5 text-[#82736a]">תנאי הביטול והגישה מפורטים בתקנון החבילה.</p></motion.div></Reveal></section>

        <section className="bg-[#f9f6f1] px-5 py-20 md:px-8 md:py-28"><Reveal className="mx-auto max-w-4xl"><motion.div variants={fadeUp} className="text-center"><p className="text-sm font-black text-[#806650]">לפני שמתחילים</p><h2 className="mt-3 text-3xl font-black text-[#29211c] md:text-5xl">שאלות נפוצות</h2></motion.div><div className="mt-10 space-y-3">{faqs.map(({ q, a }) => <motion.details key={q} variants={fadeUp} className="group rounded-2xl border border-[#735c49]/12 bg-white p-5 shadow-[0_8px_24px_rgba(55,42,33,0.04)] md:p-6"><summary className="cursor-pointer list-none pr-1 text-base font-black text-[#342922] marker:hidden md:text-lg">{q}<span className="float-left text-2xl font-medium leading-5 text-[#806650] transition-transform group-open:rotate-45">+</span></summary><p className="mt-4 border-t border-[#735c49]/10 pt-4 text-sm leading-7 text-[#5f5148]">{a}</p></motion.details>)}</div></Reveal></section>

        <section className="relative overflow-hidden bg-[#211b17] px-5 py-20 text-center text-white md:px-8 md:py-24"><FlowerField subtle /><Reveal className="relative mx-auto max-w-3xl"><motion.div variants={fadeUp} className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl border border-white/18 bg-white/[0.07] text-white"><Flower2 className="h-6 w-6" /></motion.div><motion.h2 variants={fadeUp} className="mt-6 text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">לפני שעוד שנה מתחילה, אפשר להגיע אליה מוכנים יותר.</motion.h2><motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">להבין את עצמכם. לדייק את הבחירה. לפתוח הזדמנויות חדשות להכיר.</motion.p><motion.div variants={fadeUp}><button type="button" onClick={() => openPayment("footer")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f2eee8] px-8 py-5 text-lg font-black text-[#2a211b] transition hover:-translate-y-0.5 active:scale-[0.98]">להצטרפות לחבילת החג ב־399 ₪ <ArrowLeft className="h-5 w-5" /></button></motion.div><motion.div variants={fadeUp} className="mt-10 flex flex-col justify-center gap-3 border-t border-white/10 pt-8 sm:flex-row"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 bg-white/[0.07] px-6 py-3 text-sm font-bold text-[#f3ece5] transition hover:bg-white/[0.12]">שאלות? כתבו לנו בוואטסאפ</a><a href="/terms/new-year-love" className="rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/70 transition hover:bg-white/[0.09]">לתקנון החבילה</a></motion.div></Reveal></section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-[#211b17]/96 px-3 py-2.5 shadow-[0_-12px_30px_rgba(20,15,12,0.25)] backdrop-blur-lg md:hidden"><div className="mx-auto flex max-w-md items-center gap-3"><div className="shrink-0"><p className="text-[10px] font-bold text-white/55">מחיר החג</p><p className="text-lg font-black text-white">399 ₪</p></div><button type="button" onClick={() => openPayment("mobile_sticky")} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#f2eee8] px-3 text-sm font-black text-[#2b211b] active:scale-[0.98]">אני רוצה את החבילה</button></div></div>
    </div>
  );
}
