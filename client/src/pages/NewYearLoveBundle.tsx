import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  BookOpenCheck,
  Check,
  Clock3,
  Compass,
  HeartHandshake,
  Lightbulb,
  Map,
  Network,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import GrowWallet from "@/components/GrowWallet";
import { gaBeginCheckout, gaViewItem } from "@/lib/ga";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { trpc } from "@/lib/trpc";

const HERO_VISUAL = "/manus-storage/tishrei-hero-editorial_96a95f24.jpg";
const RITUAL_VISUAL = "/manus-storage/tishrei-ritual-detail_bb81f812.jpg";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const ABOUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, ראיתי את חבילת חגי תשרי ויש לי שאלה");
const OFFER_END = new Date("2026-09-30T23:59:59+03:00").getTime();

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.64, ease: [0.22, 1, 0.36, 1] as const } },
};

const productCards = [
  {
    number: "01",
    eyebrow: "הזדמנויות להיכרות",
    title: "מאגר הרווקים והרווקות",
    subtitle: "להכיר מעבר לאלגוריתם",
    icon: Network,
    original: "499 ₪",
    current: "299 ₪",
    includes: ["פרופיל אישי ושאלון DNA זוגי", "שאלון עומק ובחינת התאמה", "תהליך שנועד לחבר בין אנשים שמחפשים קשר רציני"],
    why: "כי היכרות טובה צריכה לקחת בחשבון הרבה יותר מרושם של כמה שניות. ערכים, סגנון חיים, שלב בחיים ומה שרוצים לבנות, הם חלק מהתמונה.",
    outcome: "פרופיל מדויק יותר ותהליך שמאפשר הצעות רק כשיש בסיס רלוונטי לשני הצדדים ובכפוף להסכמה הדדית.",
  },
  {
    number: "02",
    eyebrow: "בהירות בבחירה",
    title: "המדריך ״לבחור נכון״",
    subtitle: "לזהות מה באמת מתאים לך",
    icon: BookOpenCheck,
    original: "249 ₪",
    current: "149 ₪",
    includes: ["שאלון לזיהוי הדפוס הדומיננטי", "שלושה תרגילים מעמיקים", "תרגיל ״אפס נקודת הייחוס״, 12 שאלות ומפת פחדים אישית"],
    why: "כי לפעמים אנחנו יודעים היטב מה אנחנו רוצים, ועדיין לא יודעים מה באמת מיטיב איתנו. המדריך הופך שאלות גדולות לכלים שאפשר לעבוד איתם.",
    outcome: "ניסוח חד יותר של הצרכים, זיהוי דפוס אישי ותרגילים שאפשר לחזור אליהם לפני דייט, בתוך קשר או בצומת בחירה.",
  },
  {
    number: "03",
    eyebrow: "תרגול ותנועה",
    title: "הקורס ״המסע״",
    subtitle: "להפוך הבנה לתנועה",
    icon: Compass,
    original: "497 ₪",
    current: "249 ₪",
    includes: ["חמישה מודולים על פחדים, דפוסים, בחירה ודייטינג", "חוברת עבודה עם שאלות ותרגילים", "מפה זוגית אישית שנבנית לאורך הקורס"],
    why: "כי תובנה אחת טובה היא התחלה, אך שינוי קורה כשיש מרחב ללמוד, לתרגל, לחזור ולבחור פעולה חדשה.",
    outcome: "סדר אישי של דפוסים, צרכים וכיוונים להמשך, לצד תרגול שמתרגם את ההבנה לצעדים שאפשר לבחור בהם.",
  },
];

const journeySteps = [
  { number: "01", icon: Lightbulb, title: "מזהים", copy: "איזה דפוס, פחד או כלל ישן משתתף בבחירה שלך." },
  { number: "02", icon: HeartHandshake, title: "מבררים", copy: "מה חשוב בקשר מעבר לרושם הראשון ולרשימת הדרישות." },
  { number: "03", icon: Sprout, title: "מתרגלים", copy: "איך להיכנס לשיחה, דייט או היכרות עם יותר נוכחות ובדיקה אמיתית." },
];

const faqs = [
  { q: "מה קורה אחרי התשלום?", a: "מתקבלים מיילים עם קישור אישי למדריך ולקורס, וקישור להתחלת תהליך ההצטרפות למאגר ולמילוי השאלונים." },
  { q: "האם זו התחייבות או מנוי?", a: "לא. התשלום הוא חד־פעמי בסך 449 ₪. אין חיוב מתחדש, ו־Plus אינו מופעל אוטומטית." },
  { q: "כבר הצטרפתי למאגר. האם הבאנדל מתאים לי?", a: "אין צורך לשלם שוב על רכיב שכבר נרכש. אפשר לרכוש את המדריך או את הקורס בנפרד. Match Boost ו־Plus הם שירותים נפרדים." },
  { q: "כמה התאמות מקבלים?", a: "אין מכסה קבועה. מספר ההצעות תלוי בהתאמה בין שני הצדדים, בהעדפות ובהיצע הפעיל. לא שולחים אדם רק כדי לייצר כמות." },
  { q: "האם מובטחת זוגיות?", a: "לא. החבילה מרחיבה הזדמנויות ומציעה כלים ותהליך, אך אינה מבטיחה התאמה, הסכמה של הצד השני או תוצאה זוגית." },
  { q: "עד מתי ההטבה?", a: "מחיר החג תקף עד 30.9.2026. לאחר מכן המחיר עשוי להשתנות או שהחבילה תרד מהאתר." },
];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HeartIcon({ size = 18, color = "currentColor", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={`inline-block ${className}`} aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function FloatingHearts({ muted = false }: { muted?: boolean }) {
  const particles = [
    { left: "5%", delay: 0, size: 15, color: "#f5c76a" },
    { left: "15%", delay: 2.2, size: 21, color: "#f46b92" },
    { left: "30%", delay: 1.1, size: 13, color: "#ef9cab" },
    { left: "55%", delay: 3.6, size: 20, color: "#f5c76a" },
    { left: "72%", delay: 0.6, size: 16, color: "#f46b92" },
    { left: "91%", delay: 2.8, size: 24, color: "#ef9cab" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((particle, index) => (
        <motion.div
          key={`${particle.left}-${index}`}
          className="absolute bottom-[-8vh]"
          style={{ left: particle.left }}
          animate={{ y: [0, -740], opacity: [0, muted ? 0.2 : 0.38, 0], rotate: [0, 16, -8] }}
          transition={{ duration: 13 + index * 1.5, repeat: Infinity, ease: "linear", delay: particle.delay }}
        >
          <HeartIcon size={particle.size} color={particle.color} />
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
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units = [
    { value: days, label: "ימים" },
    { value: hours, label: "שעות" },
    { value: minutes, label: "דקות" },
    { value: seconds, label: "שניות" },
  ];

  if (remaining === 0) {
    return <p className="text-center text-sm font-bold text-[#fae7bd]">הטבת החג הסתיימה. פרטי המחיר המעודכנים מופיעים בעמוד.</p>;
  }

  return (
    <div className="flex items-center justify-center gap-2.5" aria-label="זמן נותר עד לסיום ההטבה">
      {units.map((unit) => (
        <div key={unit.label} className="min-w-13 rounded-xl border border-[#f6d890]/25 bg-black/15 px-2 py-2 text-center backdrop-blur-sm">
          <div className="font-mono text-xl font-black tracking-tight text-[#fff2cc] tabular-nums md:text-2xl">{String(unit.value).padStart(2, "0")}</div>
          <div className="mt-0.5 text-[9px] font-bold text-white/55">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

function PricePanel({ condensed = false }: { condensed?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border border-[#f5d27f]/35 bg-[#240e2d]/72 shadow-[0_28px_70px_rgba(26,5,24,0.38)] backdrop-blur-xl ${condensed ? "p-5" : "p-6 md:p-7"}`}>
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#f7c76c]/15 blur-2xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#e14f75] px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-[#e14f75]/25">חיסכון של 248 ₪</span>
          <span className="text-xs font-medium text-white/60">תשלום חד־פעמי · ללא מנוי</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center md:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-1 py-3"><div className="text-[10px] font-bold text-white/48">שווי מקורי</div><div className="mt-1 text-base font-black text-white/70 line-through decoration-[#e58e9f]/70 md:text-lg">1,245 ₪</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-1 py-3"><div className="text-[10px] font-bold text-white/48">כיום בנפרד</div><div className="mt-1 text-base font-black text-white/70 line-through decoration-[#e58e9f]/70 md:text-lg">697 ₪</div></div>
          <div className="rounded-2xl bg-[linear-gradient(135deg,#fff0bd_0%,#f5c76a_55%,#dfa451_100%)] px-1 py-3 text-[#351330] shadow-[0_12px_28px_rgba(245,199,106,0.28)]"><div className="text-[10px] font-black">מחיר החג</div><div className="mt-1 text-2xl font-black md:text-3xl">449 ₪</div></div>
        </div>
        {!condensed ? <p className="mt-4 text-center text-xs leading-5 text-white/60">מאגר הרווקים והרווקות · המדריך ״לבחור נכון״ · הקורס ״המסע״</p> : null}
      </div>
    </div>
  );
}

export default function NewYearLoveBundle() {
  const paymentRef = useRef<HTMLDivElement>(null);
  const { data: approvedTestimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  useEffect(() => {
    document.title = "חבילת חגי תשרי לזוגיות | הילית כספי";
    const description = "חבילת חגי תשרי של הילית כספי: מאגר הרווקים והרווקות, המדריך לבחור נכון והקורס המסע ב־449 ₪ בתשלום חד־פעמי.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
    trackViewContent({ content_name: "new_year_love_bundle", content_category: "holiday_bundle" });
    gaViewItem("bundle_new_year");
    track({ eventType: "page_view", page: "/new-year-love", metadata: { product: "bundle_new_year", value: 449 } });
  }, []);

  const openPayment = (placement: string) => {
    gaBeginCheckout("bundle_new_year");
    trackInitiateCheckout({ value: 449, currency: "ILS", content_name: "חבילת חגי תשרי" });
    track({ eventType: "button_click", page: "/new-year-love", metadata: { action: "scroll_to_payment", placement } });
    paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#fbf4ed] font-['Rubik',sans-serif] text-[#2d1830]">
      <nav className="absolute inset-x-0 top-0 z-30 px-4 py-4 md:px-7 md:py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5 text-white">
            <img src={PROFILE_IMG} alt="הילית כספי" className="h-10 w-10 rounded-full border border-white/35 object-cover shadow-lg" />
            <span className="leading-tight"><strong className="block text-sm">הילית כספי</strong><span className="block text-[10px] text-white/65 md:text-[11px]">מאמנת למציאת זוגיות ושדכנית</span></span>
          </a>
          <button type="button" onClick={() => openPayment("nav")} className="rounded-full border border-white/25 bg-white/[0.11] px-4 py-2.5 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/[0.18] active:scale-[0.97] md:px-5 md:text-sm">לחבילת החג</button>
        </div>
      </nav>

      <header className="relative isolate min-h-[920px] overflow-hidden bg-[#250d30] px-5 pb-20 pt-28 text-white md:min-h-[780px] md:px-8 md:pb-24 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_88%,rgba(218,63,104,0.38),transparent_31%),radial-gradient(circle_at_86%_16%,rgba(244,198,101,0.22),transparent_27%),radial-gradient(circle_at_49%_45%,rgba(125,49,109,0.45),transparent_56%),linear-gradient(128deg,#18081f_0%,#42163d_46%,#791f48_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full border-[44px] border-[#f5c76a]/10" />
        <div className="absolute -left-30 bottom-[-7rem] h-96 w-96 rounded-full border-[48px] border-[#e7567a]/10" />
        <FloatingHearts />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72 }} className="order-1 lg:order-1">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f5d27f]/30 bg-[#f5c76a]/10 px-4 py-2 text-xs font-black text-[#ffecc2] backdrop-blur-sm"><Sparkles className="h-3.5 w-3.5" /> הטבת חגי תשרי · עד 30.9.2026</div>
            <h1 className="max-w-3xl text-[2.85rem] font-black leading-[0.98] tracking-[-0.045em] text-white md:text-6xl lg:text-7xl">
              בחגים האלה לא
              <span className="mt-2 block bg-gradient-to-l from-[#fff0b4] via-[#f5c76a] to-[#f49ab0] bg-clip-text text-transparent">רק מאחלים אהבה.</span>
              <span className="mt-2 block">מתחילים לפעול בשבילה.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-bold leading-8 text-[#fff1ef]/92 md:text-2xl md:leading-9">לא כדי להבטיח תוצאה. כדי לתת להזדמנות, לבהירות ולתנועה מקום אמיתי בתוך השנה החדשה.</p>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/67 md:text-lg">מאגר הרווקים והרווקות, המדריך ״לבחור נכון״ והקורס ״המסע״. שלושה כלים משלימים במסלול אחד, במחיר חג אחד.</p>

            <div className="mt-8 max-w-xl"><PricePanel /></div>
            <button type="button" onClick={() => openPayment("hero")} className="mt-7 inline-flex min-h-15 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#ea537c_0%,#d23c69_46%,#b9225d_100%)] px-7 py-4 text-base font-black text-white shadow-[0_18px_44px_rgba(231,78,117,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(231,78,117,0.55)] active:scale-[0.98] sm:w-auto sm:text-lg">
              אני רוצה להתחיל את השנה אחרת <ArrowDown className="h-5 w-5" />
            </button>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/55"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#f5c76a]" /> תשלום מאובטח</span><span className="inline-flex items-center gap-1.5"><BookOpenCheck className="h-4 w-4 text-[#f5c76a]" /> גישה דיגיטלית מיידית</span><span className="inline-flex items-center gap-1.5"><HeartIcon size={13} color="#f5c76a" /> ללא חיוב מתחדש</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.82, delay: 0.14 }} className="relative order-2 mx-auto w-full max-w-md lg:order-2 lg:max-w-[34rem]">
            <div className="absolute -inset-5 rounded-[2.8rem] bg-[radial-gradient(circle_at_50%_65%,rgba(240,173,90,0.32),transparent_58%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-[#1f0c27] p-2 shadow-[0_34px_90px_rgba(13,3,18,0.56)]">
              <img src={HERO_VISUAL} alt="שולחן חג מעוצב לשניים עם רימונים ונרות" className="aspect-[4/5] w-full rounded-[2rem] object-cover" />
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/20 bg-[#27102f]/82 px-5 py-4 text-center shadow-2xl backdrop-blur-lg">
                <p className="text-xs font-bold text-[#f8d88d]">שלושה מוצרים. מחיר חג אחד.</p>
                <p className="mt-1 text-base font-black text-white">להכיר. לבחור. לעבור בדרך חדשה.</p>
              </div>
            </div>
            <div className="absolute -right-4 top-[17%] rounded-2xl border border-[#f5d27f]/30 bg-[#321132]/85 px-4 py-3 text-center shadow-2xl backdrop-blur-md"><div className="text-xl font-black text-[#ffe2a1]">3</div><div className="text-[10px] font-bold text-white/70">צעדים בחבילה</div></div>
          </motion.div>
        </div>
      </header>

      <main className="pb-24 md:pb-0">
        <section className="relative overflow-hidden bg-[#f8ede3] px-5 py-16 md:px-8 md:py-24">
          <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#d78a91_0.8px,transparent_0.8px)] [background-size:17px_17px]" />
          <Reveal className="relative mx-auto grid max-w-6xl items-center gap-9 md:grid-cols-[0.78fr_1.22fr] md:gap-16">
            <motion.div variants={fadeUp} className="relative order-2 overflow-hidden rounded-[2rem] shadow-[0_22px_56px_rgba(94,37,53,0.17)] md:order-1"><img src={RITUAL_VISUAL} alt="רימונים, דבש ונרות באווירת חגי תשרי" className="h-64 w-full object-cover md:h-82" /><div className="absolute inset-0 bg-gradient-to-t from-[#3a142e]/28 to-transparent" /></motion.div>
            <motion.div variants={fadeUp} className="order-1 md:order-2"><p className="text-sm font-black text-[#b4305d]">שנה חדשה. הזדמנות חדשה.</p><h2 className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] tracking-[-0.03em] text-[#351631] md:text-5xl">השנה לא משתנה רק כי החלפנו תאריך.</h2><p className="mt-6 max-w-2xl text-lg leading-9 text-[#624759]">היא משתנה כשאנחנו מפסיקים לחכות שהדבר הנכון יקרה לנו, ומתחילים לבנות את התנאים שיאפשרו לו לקרות. להרחיב את מעגל ההיכרות, להבין מה באמת חשוב, ולהגיע לשיחה או לדייט עם פחות רעש ויותר נוכחות.</p><p className="mt-5 max-w-2xl rounded-2xl border-r-4 border-[#cf446d] bg-white/75 p-5 text-lg font-black leading-8 text-[#4a1a3b] shadow-sm">לא עוד החלטה שנדחית לאחרי החגים. שלושה צעדים ברורים, במקום אחד.</p></motion.div>
          </Reveal>
        </section>

        <section className="relative bg-[#fffaf5] px-5 py-20 md:px-8 md:py-28">
          <Reveal className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center"><p className="text-sm font-black text-[#b4305d]">מה בדיוק מקבלים</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#351631] md:text-5xl">לא עוד מוצר אחד על זוגיות. מסלול שלם שאפשר להתחיל בו עכשיו.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#765c69]">כל חלק בחבילה נותן משהו אחר. יחד, הם יוצרים מעבר מהיכרות אקראית לבחירה עם הרבה יותר מודעות ופעולה.</p></motion.div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {productCards.map((product, index) => {
                const Icon = product.icon;
                return (
                  <motion.article key={product.title} variants={fadeUp} className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6 shadow-[0_18px_50px_rgba(86,26,56,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_65px_rgba(86,26,56,0.16)] md:p-7 ${index === 1 ? "border-[#d95a80]/35 bg-[#fff0f1]" : "border-[#4c173f]/10 bg-white"}`}>
                    <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-[#f3c86e]/18 blur-xl" />
                    <div className="relative flex items-start justify-between gap-4"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#4c173f,#87264e)] text-[#ffe5a1] shadow-lg"><Icon className="h-6 w-6" /></div><span className="text-5xl font-black tracking-[-0.07em] text-[#4c173f]/8">{product.number}</span></div>
                    <p className="relative mt-7 text-xs font-black text-[#b4305d]">{product.eyebrow}</p><h3 className="relative mt-2 text-2xl font-black leading-tight text-[#351631]">{product.title}</h3><p className="relative mt-2 text-base font-bold text-[#7c2851]">{product.subtitle}</p>
                    <div className="relative mt-6 border-t border-[#4c173f]/10 pt-5"><p className="text-xs font-black uppercase tracking-wide text-[#846a77]">מה יש בפנים</p><ul className="mt-3 space-y-2.5 text-sm leading-6 text-[#654d5a]">{product.includes.map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-[#c33d67]" />{item}</li>)}</ul></div>
                    <div className="relative mt-6 rounded-2xl bg-[#f8eee7] p-4"><p className="text-xs font-black text-[#7b2850]">למה בניתי אותו</p><p className="mt-2 text-sm leading-7 text-[#5e4855]">{product.why}</p></div>
                    <div className="relative mt-4 border-r-2 border-[#e2ad55] pr-3"><p className="text-xs font-black text-[#7b2850]">מה יוצא איתך</p><p className="mt-1 text-sm leading-6 text-[#5e4855]">{product.outcome}</p></div>
                    <div className="relative mt-auto pt-6"><div className="flex items-end justify-between rounded-2xl bg-[#381632] px-4 py-3 text-white"><div><p className="text-[10px] font-bold text-white/48">מחיר המוצר</p><p className="mt-1 text-sm font-bold text-white/50 line-through decoration-[#e57991]">{product.original}</p></div><div className="text-left"><p className="text-[10px] font-bold text-[#f7d98e]">כיום בנפרד</p><p className="mt-1 text-xl font-black text-[#fff0bd]">{product.current}</p></div></div></div>
                  </motion.article>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="relative isolate overflow-hidden bg-[#2a0e30] px-5 py-20 text-white md:px-8 md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_83%_26%,rgba(246,198,107,0.19),transparent_25%),radial-gradient(circle_at_16%_78%,rgba(227,70,111,0.26),transparent_34%)]" /><FloatingHearts muted />
          <Reveal className="relative mx-auto max-w-6xl"><motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center"><p className="text-sm font-black text-[#f7d98e]">למה דווקא שלושתם יחד</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">היכרות, בחירה ותנועה. שלוש שכבות של אותו סיפור.</h2><p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/75">המאגר יוצר עוד הזדמנויות להכיר. המדריך נותן שפה להבין מה קורה כשנפתחת הזדמנות. הקורס מאפשר להעמיק ולתרגל שינוי בדרך שבה ניגשים אליה.</p></motion.div><div className="mt-12 grid gap-5 md:grid-cols-3">{journeySteps.map((step) => { const Icon = step.icon; return <motion.div key={step.number} variants={fadeUp} className="rounded-[1.65rem] border border-white/12 bg-white/[0.07] p-6 text-center backdrop-blur-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#f7d98e]/30 bg-[#f7d98e]/10 text-[#ffe5a1]"><Icon className="h-5 w-5" /></div><p className="mt-5 text-xs font-black text-[#f7d98e]">{step.number}</p><h3 className="mt-1 text-xl font-black">{step.title}</h3><p className="mt-3 text-sm leading-7 text-white/68">{step.copy}</p></motion.div>; })}</div><motion.div variants={fadeUp} className="mx-auto mt-9 max-w-3xl rounded-2xl border border-[#f7d98e]/20 bg-[#f7d98e]/9 px-6 py-5 text-center text-base font-bold leading-8 text-[#fff0c2]">החבילה אינה מבטיחה התאמה או זוגיות. היא נועדה לתת לך יותר אפשרויות, יותר בהירות וכלים מעשיים להתקדם.</motion.div><motion.div variants={fadeUp} className="text-center"><button type="button" onClick={() => openPayment("method")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f1c466] px-7 py-4 font-black text-[#31112d] shadow-[0_15px_38px_rgba(245,199,106,0.24)] transition hover:-translate-y-0.5 active:scale-[0.98]">אני רוצה את שלושת הצעדים <ArrowLeft className="h-5 w-5" /></button></motion.div></Reveal>
        </section>

        <section className="relative overflow-hidden bg-[#f4e7dc] px-5 py-20 md:px-8 md:py-28">
          <div className="absolute right-0 top-0 h-full w-[46%] bg-[#ead7c7]/60" />
          <Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.84fr_1.16fr] md:gap-16"><motion.div variants={fadeUp} className="relative mx-auto max-w-sm"><div className="absolute -inset-4 rounded-[2.25rem] border border-[#c0456e]/20" /><img src={ABOUT_IMG} alt="הילית כספי" className="relative w-full rounded-[2rem] object-cover shadow-[0_24px_58px_rgba(72,27,51,0.23)]" /><div className="absolute -bottom-5 -right-4 rounded-2xl bg-[#3b1635] px-5 py-3 text-sm font-black text-[#ffe1a0] shadow-xl">שיטת ״מדע האהבה״</div></motion.div><motion.div variants={fadeUp}><p className="text-sm font-black text-[#b4305d]">מי עומדת מאחורי החבילה</p><h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#351631] md:text-5xl">הילית כספי</h2><p className="mt-3 text-xl font-bold text-[#7c2851]">מאמנת למציאת זוגיות, שדכנית ומפתחת שיטת ״מדע האהבה״.</p><p className="mt-6 text-lg leading-9 text-[#624759]">את הבאנדל בניתי למי שלא רוצה עוד מוצר על זוגיות, אלא סט כלים שמחבר בין העולם הפנימי לבין הזדמנות אמיתית להכיר. אני והצוות המקצועי בוחנים התאמות ושומרים על הסכמה הדדית לפני חשיפת הפרטים.</p><div className="mt-7 flex flex-wrap gap-2.5">{["פסיכולוגיה חיובית", "כלים מעשיים", "בדיקה אנושית", "הסכמה הדדית"].map((tag) => <span key={tag} className="rounded-full border border-[#7c2851]/14 bg-white/70 px-4 py-2 text-xs font-bold text-[#52203f]">{tag}</span>)}</div></motion.div></Reveal>
        </section>

        {approvedTestimonials.length > 0 ? (
          <section className="bg-[#fffaf5] px-5 py-20 md:px-8 md:py-28" aria-labelledby="approved-stories-title"><Reveal className="mx-auto max-w-6xl"><motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-[#b4305d]">סיפורים אמיתיים, באישור מפורש</p><h2 id="approved-stories-title" className="mt-3 text-3xl font-black text-[#351631] md:text-5xl">לפעמים הכול מתחיל מהסכמה לתת הזדמנות.</h2></motion.div><div className="mt-10 grid gap-5 md:grid-cols-2">{approvedTestimonials.map((testimonial) => <motion.blockquote key={testimonial.id} variants={fadeUp} className="relative overflow-hidden rounded-[1.75rem] border border-[#cf5478]/20 bg-[#fff1f0] p-7 shadow-[0_15px_40px_rgba(94,27,53,0.08)]"><HeartIcon size={46} color="#d86382" className="absolute -left-1 -top-1 opacity-15" /><p className="relative text-base leading-8 text-[#5f4052]">״{testimonial.text}״</p><footer className="relative mt-6 flex items-center gap-3 border-t border-[#cf5478]/18 pt-5">{testimonial.photoUrl ? <img src={testimonial.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4b193c] text-[#f8d98f]"><HeartIcon size={17} color="#f8d98f" /></div>}<span className="text-sm font-black text-[#4b193c]">{testimonial.displayName}</span></footer></motion.blockquote>)}</div></Reveal></section>
        ) : null}

        <section className="relative overflow-hidden bg-[#fff3ea] px-5 py-20 md:px-8 md:py-28"><Reveal className="relative mx-auto max-w-4xl"><motion.div variants={fadeUp} className="rounded-[2rem] border border-[#bc426b]/20 bg-white p-7 shadow-[0_20px_55px_rgba(93,28,53,0.1)] md:p-12"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3a1535] text-[#f7d98e]"><Network className="h-6 w-6" /></div><p className="mt-7 text-sm font-black text-[#b4305d]">השאלה שחוזרת שוב ושוב</p><h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] text-[#351631] md:text-5xl">מאגר איכותי הוא לא פיד.</h2><p className="mt-6 text-lg leading-9 text-[#624759]">המטרה אינה לשלוח אדם רק כדי לייצר תחושת כמות. כל הצעה נבחנת לפי האישיות, הערכים, שלב החיים, אורח החיים, ההעדפות והבסיס הרלוונטי לשני הצדדים.</p><div className="mt-7 rounded-2xl bg-[#3b1635] p-6 text-base font-bold leading-8 text-[#fff3dd]">כל היכרות צריכה להרגיש כמו היכרות. בלי להפוך אנשים לכרטיסים שמחליקים הצידה.</div></motion.div></Reveal></section>

        <section ref={paymentRef} id="payment" className="relative isolate overflow-hidden bg-[linear-gradient(130deg,#210a29_0%,#4a173e_52%,#7a1e49_100%)] px-5 py-20 text-white md:px-8 md:py-28"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_16%,rgba(246,201,105,0.22),transparent_25%),radial-gradient(circle_at_10%_76%,rgba(226,68,111,0.24),transparent_35%)]" /><FloatingHearts /><Reveal className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16"><motion.div variants={fadeUp} className="text-center lg:text-right"><div className="inline-flex items-center gap-2 rounded-full border border-[#f5d27f]/25 bg-[#f5c76a]/10 px-4 py-2 text-xs font-black text-[#ffe7a9]"><Clock3 className="h-4 w-4" /> הטבת חגי תשרי מסתיימת בעוד</div><div className="mt-5"><Countdown /></div><h2 className="mt-8 text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl">לא לחכות שהשנה תרגיש אחרת. להתחיל אחרת.</h2><p className="mt-5 text-lg leading-8 text-white/72">כל מה שצריך כדי להכיר, לחדד בחירה ולבנות תנועה חדשה. שלושה מוצרים יחד, במחיר חג אחד.</p><div className="mt-7"><PricePanel condensed /></div></motion.div><motion.div variants={fadeUp} className="rounded-[2rem] border border-white/13 bg-white p-6 text-[#351631] shadow-[0_30px_85px_rgba(16,3,20,0.4)] md:p-9"><p className="text-sm font-black text-[#b4305d]">הצטרפות לחבילת החג</p><h3 className="mt-2 text-3xl font-black tracking-[-0.03em]">449 ₪ בתשלום חד־פעמי</h3><p className="mt-3 text-sm leading-6 text-[#745966]">לאחר אישור Grow יישלחו קישורי הגישה למוצרים הדיגיטליים ויתחיל תהליך ההצטרפות למאגר.</p><div className="mt-6"><GrowWallet product="bundle_new_year" buttonLabel="אני מצטרפ/ת לחבילת החג" buttonClassName="!bg-[linear-gradient(135deg,#ea537c_0%,#d23c69_46%,#b9225d_100%)] !text-white !font-black !text-lg !rounded-full hover:!shadow-xl hover:!shadow-[#d23c69]/30 !py-4" termsPath="/terms/new-year-love" onSuccess={() => { window.location.href = "/thank-you/new-year-love"; }} /></div><div className="mt-5 flex items-center justify-center gap-4 text-center text-[11px] font-medium text-[#765a68]"><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-[#b4305d]" /> תשלום מאובטח</span><span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#b4305d]" /> ללא חיוב מתחדש</span></div><p className="mt-4 text-center text-[11px] leading-5 text-[#8b7380]">תנאי הביטול והגישה מפורטים בתקנון החבילה.</p></motion.div></Reveal></section>

        <section className="bg-[#fffaf5] px-5 py-20 md:px-8 md:py-28"><Reveal className="mx-auto max-w-4xl"><motion.div variants={fadeUp} className="text-center"><p className="text-sm font-black text-[#b4305d]">לפני שמתחילים</p><h2 className="mt-3 text-3xl font-black text-[#351631] md:text-5xl">שאלות נפוצות</h2></motion.div><div className="mt-10 space-y-3">{faqs.map(({ q, a }) => <motion.details key={q} variants={fadeUp} className="group rounded-2xl border border-[#4c173f]/10 bg-white p-5 shadow-[0_8px_24px_rgba(83,25,52,0.04)] md:p-6"><summary className="cursor-pointer list-none pr-1 text-base font-black text-[#42203d] marker:hidden md:text-lg">{q}<span className="float-left text-2xl font-medium leading-5 text-[#bc426b] transition-transform group-open:rotate-45">+</span></summary><p className="mt-4 border-t border-[#4c173f]/10 pt-4 text-sm leading-7 text-[#684f5d]">{a}</p></motion.details>)}</div></Reveal></section>

        <section className="relative overflow-hidden bg-[#29102d] px-5 py-20 text-center text-white md:px-8 md:py-24"><FloatingHearts muted /><Reveal className="relative mx-auto max-w-3xl"><motion.div variants={fadeUp} className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl border border-[#f5d27f]/28 bg-[#f5c76a]/10 text-[#fbe3a1]"><HeartIcon size={25} color="#fbe3a1" /></motion.div><motion.h2 variants={fadeUp} className="mt-6 text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">לפני שעוד שנה מתחילה, אפשר לבחור לעשות מקום לאהבה.</motion.h2><motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">לא עוד איחול. לא עוד החלטה שנדחית. שלושה צעדים שיש להם מקום בחיים שלך כבר עכשיו.</motion.p><motion.div variants={fadeUp}><button type="button" onClick={() => openPayment("footer")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ea537c_0%,#d23c69_46%,#b9225d_100%)] px-8 py-5 text-lg font-black shadow-[0_18px_46px_rgba(226,68,111,0.36)] transition hover:-translate-y-0.5 active:scale-[0.98]">מצטרפים לחבילת החג ב־449 ₪ <ArrowLeft className="h-5 w-5" /></button></motion.div><motion.div variants={fadeUp} className="mt-10 flex flex-col justify-center gap-3 border-t border-white/10 pt-8 sm:flex-row"><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#d9b36a]/35 bg-[#d9b36a]/12 px-6 py-3 text-sm font-bold text-[#ffe6a7] transition hover:bg-[#d9b36a]/18">שאלות? כתבו לנו בוואטסאפ</a><a href="/terms/new-year-love" className="rounded-xl border border-white/12 bg-white/5 px-6 py-3 text-sm font-bold text-white/72 transition hover:bg-white/10">לתקנון החבילה</a></motion.div></Reveal></section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f7d98e]/20 bg-[#2b1030]/95 px-3 py-2.5 shadow-[0_-12px_30px_rgba(23,5,24,0.25)] backdrop-blur-lg md:hidden"><div className="mx-auto flex max-w-md items-center gap-3"><div className="shrink-0"><p className="text-[10px] font-bold text-white/58">מחיר החג</p><p className="text-lg font-black text-[#ffe7a6]">449 ₪</p></div><button type="button" onClick={() => openPayment("mobile_sticky")} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#e24d76] px-3 text-sm font-black text-white active:scale-[0.98]">אני רוצה את החבילה</button></div></div>
    </div>
  );
}
