import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  ArrowDown,
  BookOpenCheck,
  Check,
  Compass,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GrowWallet from "@/components/GrowWallet";
import { gaBeginCheckout, gaViewItem } from "@/lib/ga";
import { trackInitiateCheckout, trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { trpc } from "@/lib/trpc";

const HERO_VISUAL = "/manus-storage/new-year-love-hero-v2_2dc23735.png";
const JOURNEY_VISUAL = "/manus-storage/new-year-love-journey-v2_188713da.png";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const ABOUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, ראיתי את חבילת חגי תשרי ויש לי שאלה");

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.23, 1, 0.32, 1] as const } },
};

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
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

function FloatingHearts({ soft = false }: { soft?: boolean }) {
  const colors = soft
    ? ["#ff799f", "#f7c96c", "#c05a82", "#ff9db8", "#f0b850", "#ff799f", "#c05a82", "#f7c96c"]
    : ["#ff4f7d", "#ff759e", "#f2bd57", "#d84270", "#ff8cab", "#f8d37f", "#ff4f7d", "#ff759e", "#f2bd57", "#d84270", "#ff8cab", "#f8d37f"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {colors.map((color, index) => (
        <motion.div
          key={`${color}-${index}`}
          className="absolute"
          style={{ left: `${4 + ((index * 11) % 92)}%` }}
          initial={{ y: "105vh", opacity: 0.12, rotate: -12 + index * 3 }}
          animate={{ y: "-12vh", opacity: [0.12, soft ? 0.32 : 0.5, 0.12], rotate: 18 + index * 5 }}
          transition={{ duration: 12 + index * 1.4, repeat: Infinity, ease: "linear", delay: index * 0.85 }}
        >
          <HeartIcon size={soft ? 14 + (index % 3) * 4 : 16 + (index % 4) * 4} color={color} />
        </motion.div>
      ))}
    </div>
  );
}

const products = [
  {
    icon: Network,
    number: "01",
    title: "מאגר הרווקים",
    promise: "לפתוח יותר דלתות",
    description: "קהילה לרווקים ולרווקות שמחפשים קשר רציני, פרופיל אישי, שאלון DNA זוגי, שאלון מדעי, חישוב התאמה ובדיקה אנושית של שני הצדדים.",
    original: "499 ₪",
    current: "299 ₪",
  },
  {
    icon: BookOpenCheck,
    number: "02",
    title: "לבחור נכון",
    promise: "לזהות מה באמת מתאים",
    description: "המדריך המעשי לזוגיות, עם כלים להבנת דפוסים, זיהוי התאמה ובחירה שלא נשענת רק על כימיה רגעית או רשימת דרישות.",
    original: "249 ₪",
    current: "149 ₪",
  },
  {
    icon: Compass,
    number: "03",
    title: "המסע",
    promise: "לעבור להזדמנות אחרת",
    description: "קורס דיגיטלי בן חמישה מודולים שעוזר לזהות פחדים והרגלים, לחזק ביטחון ולהגיע להיכרות ממקום חופשי ומדויק יותר.",
    original: "497 ₪",
    current: "249 ₪",
  },
];

const faqs = [
  {
    q: "מה קורה אחרי התשלום?",
    a: "מתקבלים מיילים עם הגישה למדריך ולקורס, וקישור להתחלת תהליך ההצטרפות למאגר ולמילוי השאלונים.",
  },
  {
    q: "האם זה מנוי?",
    a: "לא. התשלום הוא חד־פעמי בסך 449 ₪. אין חיוב מתחדש ו־Plus אינו מופעל אוטומטית.",
  },
  {
    q: "כבר הצטרפתי למאגר. האם החבילה מתאימה לי?",
    a: "אין צורך לשלם שוב על רכיב שכבר נרכש. אפשר לרכוש את המדריך או את הקורס בנפרד. Match Boost ו־Plus הם שירותים נפרדים.",
  },
  {
    q: "כמה התאמות מקבלים?",
    a: "אין מכסה קבועה. מספר ההצעות תלוי בהתאמה בין שני הצדדים, בהעדפות ובהיצע הפעיל. לא שולחים אדם רק כדי לייצר כמות.",
  },
  {
    q: "האם מובטחת זוגיות?",
    a: "לא. החבילה מרחיבה הזדמנויות ומספקת כלים ותהליך, אך אינה מבטיחה התאמה, הסכמה של הצד השני או תוצאה זוגית.",
  },
  {
    q: "עד מתי ההטבה?",
    a: "מחיר החג תקף עד 30.9.2026. לאחר מכן המחיר עשוי להשתנות או שהחבילה תרד מהאתר.",
  },
];

export default function NewYearLoveBundle() {
  const paymentRef = useRef<HTMLDivElement>(null);
  const { data: approvedTestimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    document.title = "חבילת שנה חדשה לזוגיות | הילית כספי";
    const description = "מאגר הרווקים, לבחור נכון וקורס המסע בחבילת חג חד־פעמית ב־449 ₪.";
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
    trackInitiateCheckout({ value: 449, currency: "ILS", content_name: "חבילת שנה חדשה" });
    track({ eventType: "button_click", page: "/new-year-love", metadata: { action: "scroll_to_payment", placement } });
    paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#fff7f2] font-['Rubik',sans-serif] text-[#24103f]">
      <nav className="absolute inset-x-0 top-0 z-30 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="flex items-center gap-3 text-white">
            <img src={PROFILE_IMG} alt="" className="h-10 w-10 rounded-full border border-white/30 object-cover" />
            <span><strong className="block text-sm">הילית כספי</strong><span className="text-[11px] text-white/60">מאמנת למציאת זוגיות ושדכנית</span></span>
          </a>
          <button type="button" onClick={() => openPayment("nav")} className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-black text-white backdrop-blur-md transition duration-150 active:scale-[0.97]">
            לחבילת החג
          </button>
        </div>
      </nav>

      <header className="relative min-h-[94vh] overflow-hidden px-5 pb-20 pt-28 text-white md:pb-24">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1b082e_0%,#3b0f52_32%,#6a173f_66%,#8f2543_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(255,74,124,0.32),transparent_36%),radial-gradient(circle_at_82%_18%,rgba(245,190,82,0.22),transparent_34%),radial-gradient(circle_at_52%_45%,rgba(255,138,177,0.12),transparent_50%)]" />
        <FloatingHearts />
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full border-[42px] border-[#cf315e]/15" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.06fr_0.94fr]">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff759e]/50 bg-[#ff4f7d]/20 px-5 py-2.5 text-sm font-black text-white backdrop-blur-sm">
              <HeartIcon size={14} color="#ff8cab" /> הטבת חגי תשרי עד 30.9.2026 <HeartIcon size={14} color="#f7c96c" />
            </motion.div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] md:text-6xl lg:text-7xl">
              השנה החדשה לא צריכה להתחיל בעוד איחול.
              <span className="mt-3 block bg-gradient-to-l from-[#ffe39a] via-[#f7c96c] to-[#ff91b2] bg-clip-text text-transparent">היא יכולה להתחיל בהחלטה.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-bold leading-8 text-white/90 md:text-2xl">לפתוח יותר דלתות לאהבה. ולבחור נכון כשהן נפתחות.</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/70 md:text-lg">מאגר הרווקים, המדריך ״לבחור נכון״ וקורס ״המסע״. שלושה צעדים שמחברים הזדמנויות, בהירות ותהליך חדש.</p>

            <div className="mt-8 max-w-xl rounded-[1.75rem] border-2 border-[#ff759e]/35 bg-white/[0.09] p-5 shadow-[0_24px_70px_rgba(20,0,35,0.35)] backdrop-blur-md">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#ff4f7d] px-4 py-1.5 text-xs font-black text-white">חיסכון של 248 ₪</span>
                <span className="text-xs text-white/55">תשלום חד־פעמי · ללא מנוי</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-[11px] text-white/50">שווי מקור</div><div className="mt-1 text-lg font-black line-through decoration-white/35">1,245 ₪</div></div>
                <div><div className="text-[11px] text-white/50">כיום בנפרד</div><div className="mt-1 text-lg font-black line-through decoration-[#ff8cab]">697 ₪</div></div>
                <div className="rounded-2xl bg-gradient-to-br from-[#ffe39a] to-[#f2bd57] p-3 text-[#3b0f52] shadow-lg"><div className="text-[11px] font-bold">מחיר החג</div><div className="mt-1 text-2xl font-black">449 ₪</div></div>
              </div>
            </div>

            <button type="button" onClick={() => openPayment("hero")} className="mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-l from-[#ff4f7d] to-[#ff759e] px-9 py-5 text-lg font-black text-white shadow-[0_18px_50px_rgba(255,79,125,0.36)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              אני רוצה להתחיל את השנה אחרת <ArrowDown className="h-5 w-5" />
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -34 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.16 }} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#ff759e]/35 to-[#f2bd57]/25 blur-2xl" />
            <img src={HERO_VISUAL} alt="שולחן חג מואר לשניים" className="relative aspect-[4/5] w-full rounded-[2.2rem] border border-white/20 object-cover shadow-2xl" />
            <div className="absolute -bottom-6 right-5 left-5 rounded-2xl border border-white/15 bg-[#24103f]/88 p-4 text-center shadow-2xl backdrop-blur-md">
              <p className="text-xs font-bold text-[#f7c96c]">שלושה מוצרים. מחיר חג אחד.</p>
              <p className="mt-1 text-lg font-black">יותר הזדמנויות · יותר בהירות · דרך חדשה</p>
            </div>
          </motion.div>
        </div>
      </header>

      <main>
        <section ref={paymentRef} id="payment" className="relative overflow-hidden bg-[#66173f] px-5 py-14 text-white">
          <FloatingHearts soft />
          <Reveal className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div variants={fadeUp} className="text-center lg:text-right">
              <p className="inline-flex rounded-full bg-[#ff4f7d] px-4 py-1.5 text-xs font-black">מחיר חג עד 30.9.2026</p>
              <h2 className="mt-4 text-3xl font-black md:text-4xl">שלושה מוצרים. מחיר חג אחד.</h2>
              <p className="mt-3 text-white/70">מאגר הרווקים + לבחור נכון + המסע</p>
              <p className="mt-4 text-4xl font-black text-[#ffe39a]">449 ₪</p>
              <p className="mt-2 text-sm text-white/50"><span className="line-through">697 ₪ כיום בנפרד</span> · חיסכון 248 ₪</p>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-3xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm">
              <GrowWallet
                product="bundle_new_year"
                buttonLabel="מצטרפים לחבילת החג"
                buttonClassName="!bg-gradient-to-l !from-[#ff4f7d] !to-[#ff759e] !text-white !font-black !text-lg !rounded-full hover:!shadow-xl hover:!shadow-[#ff4f7d]/30 !py-4"
                termsPath="/terms/new-year-love"
                onSuccess={() => { window.location.href = "/thank-you/new-year-love"; }}
              />
            </motion.div>
          </Reveal>
        </section>

        <section className="relative overflow-hidden bg-[#fff1ed] px-5 py-20 md:py-28">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#ff759e]/14 blur-3xl" />
          <Reveal className="relative mx-auto max-w-4xl text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-[#ff4f7d]/10 px-4 py-2 text-sm font-black text-[#b82d59]"><Sparkles className="h-4 w-4" /> שנה חדשה. אפשרות חדשה.</motion.div>
            <motion.h2 variants={fadeUp} className="mx-auto mt-5 max-w-3xl text-3xl font-black leading-tight md:text-5xl">החגים מזכירים לכולנו מה אנחנו באמת רוצים לידנו.</motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-[#5f4356]">אפשר להיכנס לעוד שנה עם אותן מחשבות, אותן אפליקציות ואותם דפוסים. ואפשר לבחור לעשות הפעם משהו אחר: לפתוח יותר הזדמנויות להיכרות, להבין טוב יותר מה באמת נכון, ולהגיע לכל היכרות ממקום יציב וברור יותר.</motion.p>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#72556a]">החבילה הזו לא מבטיחה מי יישב לידכם בשולחן החג. היא כן נותנת שלושה כלים אמיתיים להתחיל לזוז לשם.</motion.p>
            <motion.div variants={fadeUp} className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#ff4f7d]/20 bg-white p-6 text-xl font-black text-[#50143c] shadow-[0_16px_45px_rgba(148,37,74,0.1)]">לא עוד איחול לשנה החדשה. צעד ממשי בתוך השנה החדשה.</motion.div>
          </Reveal>
        </section>

        <section className="bg-white px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-6xl">
            <motion.p variants={fadeUp} className="text-center text-sm font-black text-[#c73567]">מה מקבלים בחבילה</motion.p>
            <motion.h2 variants={fadeUp} className="mx-auto mt-3 max-w-4xl text-center text-3xl font-black leading-tight md:text-5xl">לפתוח דלת. לזהות מה נכון. ולעבור בה אחרת.</motion.h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {products.map((product, index) => {
                const Icon = product.icon;
                return (
                  <motion.article key={product.title} variants={fadeUp} className={`relative overflow-hidden rounded-[2rem] border p-7 shadow-[0_20px_55px_rgba(61,15,82,0.09)] ${index === 1 ? "border-[#ff759e]/30 bg-[#fff0f4]" : "border-[#4b185c]/10 bg-[#fffaf6]"}`}>
                    <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#ff759e]/12" />
                    <div className="relative flex items-center justify-between"><span className="text-5xl font-black text-[#4b185c]/8">{product.number}</span><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4b185c] to-[#7a2454] p-3 text-[#ffe39a]"><Icon className="h-6 w-6" /></div></div>
                    <p className="mt-6 text-xs font-black text-[#c73567]">{product.promise}</p>
                    <h3 className="mt-2 text-2xl font-black">{product.title}</h3>
                    <p className="mt-4 min-h-32 text-sm leading-7 text-[#625367]">{product.description}</p>
                    <div className="mt-5 border-t border-[#4b185c]/10 pt-4 text-sm"><span className="line-through text-[#8a7a8c]">{product.original}</span><span className="mr-3 font-black text-[#4b185c]">כיום {product.current}</span></div>
                  </motion.article>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="relative overflow-hidden bg-[#250b3c] px-5 py-20 text-white md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,79,125,0.2),transparent_38%),radial-gradient(circle_at_80%_16%,rgba(242,189,87,0.16),transparent_34%)]" />
          <FloatingHearts soft />
          <Reveal className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <p className="text-sm font-black text-[#ff91b2]">למה שלושתם יחד?</p>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">המאגר פותח דלת. המדריך עוזר לזהות מה נכון. הקורס עוזר לעבור בדלת אחרת.</h2>
              <p className="mt-6 text-lg leading-9 text-white/72">יותר אנשים להכיר לא תמיד מספיקים. גם לדעת מה לחפש לא תמיד מספיק. לפעמים צריך לזהות מה אנחנו עושים כשכבר מגיעה הזדמנות טובה.</p>
              <p className="mt-4 text-lg font-bold leading-9 text-[#ffe39a]">לכן החבילה מחברת בין הזדמנויות, בחירה ותהליך. לא עוד מוצר בודד, אלא מערכת שלמה לזוז קדימה.</p>
              <button type="button" onClick={() => openPayment("journey")} className="mt-8 rounded-full bg-gradient-to-l from-[#ff4f7d] to-[#ff759e] px-8 py-4 font-black shadow-lg transition active:scale-[0.97]">אני רוצה את שלושת הצעדים</button>
            </motion.div>
            <motion.div variants={fadeUp} className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#ff759e]/18 blur-2xl" />
              <img src={JOURNEY_VISUAL} alt="שלושה שלבים במסע לזוגיות" className="relative w-full rounded-[2rem] border border-white/15 object-cover shadow-2xl" />
            </motion.div>
          </Reveal>
        </section>

        <section className="bg-[#fff7f2] px-5 py-20 md:py-28">
          <Reveal className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
            <motion.div variants={fadeUp} className="relative mx-auto max-w-sm">
              <img src={ABOUT_IMG} alt="הילית כספי" className="w-full rounded-[2rem] object-cover shadow-2xl" />
            </motion.div>
            <motion.div variants={fadeUp}>
              <p className="text-sm font-black text-[#c73567]">מי עומדת מאחורי החבילה?</p>
              <h2 className="mt-3 text-4xl font-black">הילית כספי</h2>
              <p className="mt-2 text-xl font-bold text-[#7a2454]">מאמנת למציאת זוגיות, שדכנית ומפתחת שיטת ״מדע האהבה״.</p>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#625367]">
                <p>בניתי קהילה ותהליך עבור רווקים ורווקות שמחפשים קשר רציני. אני והצוות המקצועי שהוכשר על ידי בודקים את שני הצדדים ושומרים על הסכמה הדדית לפני חשיפת הפרטים.</p>
                <p>אני לא מאמינה בעוד גלילה אינסופית. אני מאמינה בהיכרות שמתחילה בהבנה עמוקה יותר של האדם ושל החיים שרוצים לבנות.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">{["פסיכולוגיה חיובית", "מודלים מדעיים", "בדיקה אנושית", "הסכמה הדדית"].map((tag) => <span key={tag} className="rounded-full bg-[#250b3c] px-3 py-1.5 text-xs font-bold text-white">{tag}</span>)}</div>
            </motion.div>
          </Reveal>
        </section>

        {approvedTestimonials.length > 0 ? (
          <section className="bg-white px-5 py-20 md:py-28" aria-labelledby="approved-stories-title">
            <Reveal className="mx-auto max-w-5xl">
              <motion.p variants={fadeUp} className="text-center text-sm font-black text-[#c73567]">סיפורים אמיתיים שקיבלנו אישור לשתף</motion.p>
              <motion.h2 id="approved-stories-title" variants={fadeUp} className="mx-auto mt-3 max-w-3xl text-center text-3xl font-black md:text-5xl">לפעמים הכול מתחיל מהסכמה לתת הזדמנות.</motion.h2>
              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {approvedTestimonials.map((testimonial) => (
                  <motion.blockquote key={testimonial.id} variants={fadeUp} className="relative overflow-hidden rounded-3xl border border-[#ff759e]/20 bg-[#fff4f6] p-7 shadow-[0_18px_45px_rgba(128,31,73,0.08)]">
                    <HeartIcon size={44} color="#ff759e" className="absolute -left-2 -top-2 opacity-15" />
                    <p className="relative text-base leading-8 text-[#5f4356]">״{testimonial.text}״</p>
                    <footer className="mt-6 flex items-center gap-3 border-t border-[#ff759e]/20 pt-5">
                      {testimonial.photoUrl ? <img src={testimonial.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4b185c] text-[#ffe39a]"><HeartIcon size={18} color="#ffe39a" /></div>}
                      <span className="text-sm font-black text-[#4b185c]">{testimonial.displayName}</span>
                    </footer>
                  </motion.blockquote>
                ))}
              </div>
            </Reveal>
          </section>
        ) : null}

        <section className="bg-[#fff1ed] px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-4xl">
            <motion.div variants={fadeUp} className="rounded-[2rem] border border-[#ff759e]/25 bg-white p-7 shadow-[0_22px_60px_rgba(128,31,73,0.1)] md:p-12">
              <p className="text-sm font-black text-[#c73567]">השאלה שחוזרת שוב ושוב</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">ולמה לא שולחים התאמה חדשה בכל שבוע?</h2>
              <p className="mt-6 text-lg leading-9 text-[#625367]">כי מאגר איכותי הוא לא פיד. המטרה אינה לשלוח עוד אדם רק כדי לייצר תחושת כמות. כל הצעה נבדקת לפי האישיות, הערכים, שלב החיים, אורח החיים, ההעדפות וההתאמה של שני הצדדים.</p>
              <div className="mt-6 rounded-2xl bg-[#250b3c] p-6 text-lg font-bold leading-8 text-white">המטרה ברורה: להרחיב כל הזמן את הקהילה ולייצר יותר הזדמנויות רלוונטיות, בלי לוותר על איכות ובלי להפוך אנשים לכרטיסים שמחליקים הצידה.</div>
            </motion.div>
          </Reveal>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#1b082e_0%,#4b185c_48%,#861f48_100%)] px-5 py-20 text-white md:py-28">
          <FloatingHearts />
          <Reveal className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <motion.div variants={fadeUp} className="self-center">
              <p className="inline-flex rounded-full bg-[#ff4f7d] px-4 py-2 text-xs font-black">הטבת חגי תשרי עד 30.9.2026</p>
              <h2 className="mt-5 text-4xl font-black leading-tight md:text-5xl">השנה החדשה יכולה להתחיל כאן.</h2>
              <p className="mt-4 text-lg text-white/72">מאגר הרווקים + לבחור נכון + המסע</p>
              <div className="mt-7 rounded-3xl border border-white/15 bg-white/[0.08] p-6 backdrop-blur-sm">
                <div className="flex items-end justify-center gap-4"><span className="text-2xl text-white/35 line-through">697 ₪</span><span className="text-5xl font-black text-[#ffe39a]">449 ₪</span></div>
                <p className="mt-2 text-center text-sm text-white/55">חיסכון של 248 ₪ · תשלום חד־פעמי · ללא מנוי</p>
                <ul className="mt-6 space-y-3 text-sm text-white/82">{["הצטרפות למאגר הרווקים", "גישה למדריך לבחור נכון", "גישה לקורס המסע", "תשלום מאובטח ללא חיוב מתחדש"].map((item) => <li key={item} className="flex items-start gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff4f7d]"><Check className="h-3 w-3" /></span>{item}</li>)}</ul>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-[2rem] bg-white p-6 text-[#24103f] shadow-[0_26px_70px_rgba(12,0,25,0.35)] md:p-9">
              <h3 className="text-2xl font-black">פרטי רכישה</h3>
              <p className="mt-2 text-sm leading-6 text-[#6d5b71]">לאחר אישור Grow יישלחו קישורי הגישה למוצרים הדיגיטליים ויתחיל תהליך ההצטרפות למאגר.</p>
              <div className="mt-6">
                <GrowWallet
                  product="bundle_new_year"
                  buttonLabel="אני רוצה את חבילת החג"
                  buttonClassName="!bg-gradient-to-l !from-[#ff4f7d] !to-[#ff759e] !text-white !font-black !text-lg !rounded-full hover:!shadow-xl hover:!shadow-[#ff4f7d]/30 !py-4"
                  termsPath="/terms/new-year-love"
                  onSuccess={() => { window.location.href = "/thank-you/new-year-love"; }}
                />
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-[#796b7c]">התשלום מאובטח. אין חיוב מתחדש. תנאי הביטול והגישה מפורטים בתקנון החבילה.</p>
            </motion.div>
          </Reveal>
        </section>

        <section className="bg-white px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-4xl">
            <motion.h2 variants={fadeUp} className="text-center text-3xl font-black md:text-5xl">שאלות לפני שמתחילים</motion.h2>
            <div className="mt-10 space-y-4">
              {faqs.map(({ q, a }) => (
                <motion.details key={q} variants={fadeUp} className="group rounded-2xl border border-[#4b185c]/10 bg-[#fffaf6] p-6 shadow-sm">
                  <summary className="cursor-pointer list-none text-lg font-black marker:hidden">{q}<span className="float-left text-[#c73567] transition group-open:rotate-45">+</span></summary>
                  <p className="mt-4 border-t border-[#4b185c]/10 pt-4 text-sm leading-7 text-[#625367]">{a}</p>
                </motion.details>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="relative overflow-hidden bg-[#1b082e] px-5 py-20 text-center text-white">
          <FloatingHearts soft />
          <div className="relative mx-auto max-w-3xl">
            <ShieldCheck className="mx-auto h-8 w-8 text-[#ffe39a]" />
            <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">בעוד שנה אפשר להסתכל אחורה ולדעת שהפעם באמת התחלתם.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/68">לא בעוד איחול. לא בעוד החלטה שנדחית לאחרי החגים. צעד אחד שמחבר יותר הזדמנויות, יותר בהירות ותהליך חדש.</p>
            <button type="button" onClick={() => openPayment("footer")} className="mt-8 rounded-full bg-gradient-to-l from-[#ff4f7d] to-[#ff759e] px-10 py-5 text-lg font-black shadow-[0_18px_50px_rgba(255,79,125,0.32)] transition active:scale-[0.97]">מצטרפים לחבילת החג ב־449 ₪</button>
            <div className="mt-10 flex flex-col justify-center gap-3 border-t border-white/10 pt-8 sm:flex-row">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#25D366]/35 bg-[#25D366]/15 px-6 py-3 text-sm font-bold text-[#71e99b]">שאלות? כתבו לנו בוואטסאפ</a>
              <a href="/terms/new-year-love" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/70">לתקנון החבילה</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
