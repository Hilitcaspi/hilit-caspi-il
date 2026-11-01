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
import {
  NOVEMBER_BUNDLE_EXPIRES_AT,
  NOVEMBER_BUNDLE_PRICE,
  NOVEMBER_BUNDLE_PRODUCT,
  isNovemberBundleOfferActive,
} from "@shared/novemberBundleOffer";

const HERO_IMAGE = "/manus-storage/hilit-bundle-standing_b180bb60.jpeg";
const ABOUT_IMAGE = "/manus-storage/hilit-bundle-close-portrait_85abe6c9.jpeg";
const PROFILE_FALLBACK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const courseModules = [
  "מפת הפחדים שלך",
  "שורשי הדפוסים שלך",
  "לבחור נכון",
  "לצאת לדייט נכון",
  "תוכנית הפעולה שלך",
];

const faqs = [
  {
    question: "מה כלול בהטבת נובמבר?",
    answer: "הצטרפות למאגר הרווקים והרווקות במחיר 349 ₪ במקום 499 ₪, וגישה אישית לקורס המלא ״המסע לזוגיות״ במתנה. Plus אינו כלול ואינו מופעל אוטומטית.",
  },
  {
    question: "מתי מתקבלת הצעת ההתאמה הראשונה?",
    answer: "עד 3 ימים קלנדריים אחרי שהתשלום אושר וגם הושלמו הפרופיל, התמונה, השאלונים וההעדפות. זו הצעת התאמה ראשונה, לא התחייבות לדייט, לקשר או להסכמה של אדם אחר.",
  },
  {
    question: "איך נראית התאמה?",
    answer: "הילית בוחנת אישית את הפרופילים ואת ההצעות, לצד שאלונים שמבוססים על מחקר והעדפות החיים. פרטי קשר נחשפים רק אחרי אישור של שני האנשים.",
  },
  {
    question: "האם יש מספר קבוע של התאמות?",
    answer: "לא. אין תדירות קבועה או מכסה קבועה. ההצעות נשלחות כשיש בסיס אמיתי לשני הצדדים, ולא כדי לייצר כמות.",
  },
  {
    question: "מהו הקורס שמתקבל במתנה?",
    answer: "זהו הקורס המלא ״המסע לזוגיות״, עם חמישה מודולים, חוברת עבודה ומפה זוגית אישית. ערכו המקורי הוא 497 ₪; בעמוד הקורס הוא מוצע כיום במחיר נפרד של 249 ₪.",
  },
];

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
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
      {...(hero ? { fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const })}
      onError={(event) => {
        event.currentTarget.src = PROFILE_FALLBACK;
      }}
      className={hero ? "h-full min-h-[620px] w-full object-cover object-top" : "h-full min-h-[420px] w-full object-cover object-top"}
    />
  );
}

function OfferPrice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-[1.6rem] border border-[#171519]/10 bg-[#fffdf9]/84 shadow-[0_18px_55px_rgba(50,39,48,.11)] backdrop-blur-sm ${compact ? "p-5" : "p-6 md:p-7"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.08em] text-[#6e5868]">הטבת נובמבר</p>
          <p className="mt-2 text-sm font-bold leading-6 text-[#423842]">מאגר הרווקים והרווקות, עם הקורס המלא במתנה</p>
        </div>
        <span className="rounded-full bg-[#171519] px-3 py-1.5 text-xs font-black text-[#fffdf9]">חד פעמי</span>
      </div>
      <div className="mt-5 flex items-end gap-3" dir="rtl">
        <span className="text-5xl font-black tracking-[-0.06em] text-[#171519] md:text-6xl">{NOVEMBER_BUNDLE_PRICE} ₪</span>
        <span className="pb-2 text-lg font-bold text-[#847783] line-through">499 ₪</span>
      </div>
      <div className="mt-5 border-t border-[#171519]/10 pt-4">
        <p className="text-sm font-black text-[#3e313b]">הקורס ״המסע לזוגיות״ במתנה</p>
        <p className="mt-1 text-xs leading-6 text-[#655866]">ערך מקורי 497 ₪. בעמוד הקורס הוא מוצע כיום ב־249 ₪ כמחיר נפרד.</p>
      </div>
    </div>
  );
}

export default function NovemberLoveBundle() {
  const checkoutRef = useRef<HTMLElement>(null);
  const [offerActive] = useState(() => isNovemberBundleOfferActive());
  const { data: approvedTestimonials = [] } = trpc.publicProof.approvedTestimonials.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    document.title = "הטבת נובמבר לזוגיות | הילית כספי";
    const description = "מאגר הרווקים והרווקות ב־349 ₪ במקום 499 ₪, עם הקורס המלא המסע לזוגיות במתנה. בתוקף בישראל עד 30.11.2026.";
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
    trackViewContent({ content_name: "bundle_november", content_category: "bundle" });
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
      metadata: { product: "bundle_november", action: "scroll_to_checkout", placement },
    });
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deadline = new Date(NOVEMBER_BUNDLE_EXPIRES_AT - 1).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#fffdf9] font-['Rubik',sans-serif] text-[#171519]">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .november-love-motion { opacity: 1 !important; transform: none !important; }
        }
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
          <a href="/" className="text-sm font-black tracking-[-0.02em] text-[#171519] transition-opacity hover:opacity-70">הילית כספי</a>
          <button
            type="button"
            onClick={() => openCheckout("navigation")}
            className="rounded-full border border-[#171519]/15 bg-[#fffdf9]/75 px-4 py-2.5 text-xs font-black text-[#171519] backdrop-blur transition hover:bg-white md:px-5 md:text-sm"
          >
            להצטרפות בנובמבר
          </button>
        </div>
      </nav>

      <header className="relative isolate min-h-[100svh] overflow-hidden bg-[#d2c3cd] pt-22 md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,253,249,.83),transparent_31%),radial-gradient(circle_at_82%_88%,rgba(111,89,105,.20),transparent_35%)]" />
        <div className="relative mx-auto grid min-h-[100svh] max-w-[1440px] items-stretch lg:grid-cols-[1.02fr_.98fr]">
          <div className="order-1 flex items-center px-5 py-10 md:px-10 md:py-16 lg:px-16 xl:px-24">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="november-love-motion max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#171519]/12 bg-[#fffdf9]/64 px-4 py-2 text-xs font-black text-[#4e404d] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" /> בתוקף בישראל, 1.11.2026 עד 30.11.2026
              </p>
              <h1 className="mt-7 text-[2.75rem] font-black leading-[1.04] tracking-[-0.045em] text-[#171519] sm:text-6xl md:text-7xl lg:text-[4.8rem]">
                המאגר שלי.
                <span className="mt-3 block text-[#614a5d]">הקורס במתנה.</span>
                <span className="mt-3 block">מתחילים עכשיו.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg font-bold leading-8 text-[#3f3440] md:text-xl md:leading-9">
                בנובמבר אני פותחת את מאגר הרווקים והרווקות ב־349 ₪, ומצרפת במתנה את הקורס המלא ״המסע לזוגיות״ כדי שההיכרות תתחיל גם מבפנים.
              </p>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#5e4d5b] md:text-lg">
                ואני שמה עכשיו גז על ההתאמות, עם קריאה אישית של הפרופילים והצעות שמקבלות את הזמן והקשב שלהן.
              </p>
              <div className="mt-8 max-w-xl"><OfferPrice /></div>
              <button
                type="button"
                onClick={() => openCheckout("hero")}
                className="mt-7 inline-flex min-h-15 w-full items-center justify-center gap-3 rounded-full bg-[#171519] px-7 py-4 text-base font-black text-[#fffdf9] shadow-[0_18px_40px_rgba(23,21,25,.2)] transition hover:-translate-y-0.5 hover:bg-[#332d31] active:scale-[.98] sm:w-auto sm:text-lg"
              >
                להצטרפות ב־349 ₪ <ArrowDown className="h-5 w-5" />
              </button>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#594c57]">
                <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> תשלום חד פעמי מאובטח</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Plus לא כלול ולא מופעל אוטומטית</span>
              </div>
            </motion.div>
          </div>

            <motion.div initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.24, delay: 0.04 }} className="november-love-motion relative order-2 min-h-[540px] overflow-hidden lg:min-h-[100svh]">
            <Portrait src={HERO_IMAGE} alt="הילית כספי" hero />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,21,25,.04)_30%,rgba(23,21,25,.42)_100%)]" />
            <div className="absolute inset-x-5 bottom-6 rounded-[1.4rem] border border-white/25 bg-[#171519]/68 px-5 py-4 text-[#fffdf9] shadow-2xl backdrop-blur-md md:inset-x-8 md:bottom-9">
              <p className="text-xs font-bold text-[#e9dfe5]">מאגר עם מבט אנושי</p>
              <p className="mt-1 text-lg font-black">פרופיל, שאלונים, שיקול דעת, והסכמה של שני הצדדים.</p>
            </div>
          </motion.div>
        </div>
      </header>

      <section className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28" aria-labelledby="offer-title">
        <Reveal className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black text-[#765d70]">מה מקבלים בהטבה</p>
            <h2 id="offer-title" className="mt-3 text-3xl font-black leading-tight tracking-[-.045em] text-[#171519] md:text-5xl">מאגר פעיל, ותהליך שמחבר בין ההיכרות לבין הבחירה.</h2>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-[1.03fr_.97fr]">
            <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[2rem] bg-[#171519] p-7 text-[#fffdf9] shadow-[0_24px_60px_rgba(23,21,25,.18)] md:p-9">
              <div className="absolute -left-12 -top-10 h-42 w-42 rounded-full bg-[#d2c3cd]/20 blur-2xl" />
              <div className="relative">
                <span className="rounded-full border border-white/18 bg-white/[.08] px-3 py-1.5 text-xs font-black text-[#f1e7ed]">מאגר הרווקים והרווקות</span>
                <h3 className="mt-6 text-3xl font-black tracking-[-.04em] md:text-4xl">349 ₪ <span className="mr-2 text-lg text-white/45 line-through">499 ₪</span></h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/72">יצירת פרופיל אישי, תמונה, שאלונים והעדפות, ואז כניסה לתהליך שבו בוחנים היכרות אפשרית לפני שמישהו מקבל פרטי קשר.</p>
                <ul className="mt-7 grid gap-3 text-sm font-bold leading-6 text-white/88">
                  {["פרופיל שנקרא ונבדק אישית", "שאלונים והעדפות שמבוססים על ידע מחקרי", "אישור נפרד של שני הצדדים לפני חשיפת פרטים"].map((item) => (
                    <li key={item} className="flex gap-3"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d2c3cd]" />{item}</li>
                  ))}
                </ul>
              </div>
            </motion.article>
            <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[2rem] border border-[#171519]/10 bg-[#c6b5c0] p-7 shadow-[0_24px_60px_rgba(71,49,65,.12)] md:p-9">
              <div className="absolute -right-10 -bottom-12 h-42 w-42 rounded-full bg-[#fffdf9]/48 blur-2xl" />
              <div className="relative">
                <span className="rounded-full bg-[#fffdf9]/80 px-3 py-1.5 text-xs font-black text-[#493b46]">במתנה עם ההצטרפות</span>
                <h3 className="mt-6 text-3xl font-black tracking-[-.04em] text-[#171519] md:text-4xl">הקורס המלא<br />״המסע לזוגיות״</h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-[#443842]">חמישה מודולים, חוברת עבודה ומפה זוגית אישית. זהו הקורס המלא, לא מדריך מקוצר.</p>
                <div className="mt-7 rounded-2xl border border-[#171519]/10 bg-[#fffdf9]/55 p-4">
                  <p className="text-xs font-black text-[#655260]">ערך הקורס</p>
                  <p className="mt-1 text-xl font-black text-[#171519]">497 ₪</p>
                  <p className="mt-1 text-xs leading-5 text-[#665965]">בעמוד הקורס הוא מוצע כיום ב־249 ₪ כמחיר נפרד.</p>
                </div>
              </div>
            </motion.article>
          </div>
        </Reveal>
      </section>

      <section className="relative isolate overflow-hidden bg-[#ede4e9] px-5 py-20 md:px-8 md:py-28" aria-labelledby="method-title">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_87%_14%,rgba(255,253,249,.9),transparent_25%),radial-gradient(circle_at_12%_90%,rgba(104,77,96,.16),transparent_27%)]" />
        <Reveal className="relative mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="grid items-end gap-8 md:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black text-[#765d70]">איך זה עובד בפועל</p>
              <h2 id="method-title" className="mt-3 text-4xl font-black leading-[1.05] tracking-[-.05em] text-[#171519] md:text-6xl">לא אלגוריתם שמשאיר אותך לבד עם המסך.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-9 text-[#554854]">השאלונים נותנים שכבת עומק והעדפות ברורות. אחר כך נכנס שיקול הדעת האנושי: הילית בודקת אישית את הפרופילים ואת ההתאמות המוצעות, כי אדם הוא יותר מרשימת נתונים.</p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: ScanSearch, number: "01", title: "ממלאים תמונה מלאה", copy: "פרופיל, תמונה, שאלונים והעדפות. רק כשהכול הושלם אפשר להתחיל לבחון התאמה." },
              { icon: HeartHandshake, number: "02", title: "הילית בוחנת אישית", copy: "הפרופילים וההתאמות המוצעות נבדקים עם שאלונים שמבוססים על מחקר, לצד קריאה אנושית של התמונה המלאה." },
              { icon: LockKeyhole, number: "03", title: "מאשרים לפני שמחברים", copy: "במאגר הרגיל נשלחות הצעות עם ציון התאמה מעל 80%: קודם הצעה, אחר כך שני אישורים, ורק אז פרטי קשר." },
            ].map(({ icon: Icon, number, title, copy }) => (
              <motion.article key={number} variants={fadeUp} className="rounded-[1.7rem] border border-[#171519]/10 bg-[#fffdf9]/76 p-6 shadow-[0_14px_40px_rgba(71,49,65,.07)] backdrop-blur-sm">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171519] text-[#fffdf9]"><Icon className="h-5 w-5" /></span><span className="text-3xl font-black text-[#826a7a]/35">{number}</span></div>
                <h3 className="mt-7 text-xl font-black text-[#171519]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#625563]">{copy}</p>
              </motion.article>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28" aria-labelledby="three-days-title">
        <Reveal className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] border border-[#171519]/10 bg-[#171519] text-[#fffdf9] shadow-[0_28px_75px_rgba(23,21,25,.2)]">
          <motion.div variants={fadeUp} className="grid md:grid-cols-[.84fr_1.16fr]">
            <div className="bg-[#c6b5c0] p-8 text-[#171519] md:p-11">
              <Clock3 className="h-9 w-9" />
              <p className="mt-8 text-sm font-black text-[#564452]">התחייבות נובמבר</p>
              <h2 id="three-days-title" className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] md:text-5xl">הצעת התאמה ראשונה בתוך עד 3 ימים קלנדריים.</h2>
            </div>
            <div className="p-8 md:p-11">
              <p className="max-w-2xl text-lg font-bold leading-8 text-white/85">השעון מתחיל רק אחרי ששני הדברים קרו: התשלום אושר וכל פרטי ההצטרפות הושלמו.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {["אישור תשלום", "פרופיל, תמונה ושאלונים", "עד 3 ימים להצעה ראשונה"].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-white/12 bg-white/[.06] p-4"><span className="text-xs font-black text-[#d8c8d1]">0{index + 1}</span><p className="mt-3 text-sm font-black leading-6">{item}</p></div>
                ))}
              </div>
              <p className="mt-7 text-sm leading-7 text-white/60">ההתחייבות היא להצעת התאמה ראשונה. אין התחייבות לדייט, לקבלת ההצעה, להסכמה הדדית, לזוגיות או לקצב קבוע אחר כך.</p>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section className="bg-[#f4eef1] px-5 py-20 md:px-8 md:py-28" aria-labelledby="course-title">
        <Reveal className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="grid gap-7 md:grid-cols-[.78fr_1.22fr] md:items-end">
            <div className="flex h-18 w-18 items-center justify-center rounded-[1.6rem] bg-[#171519] text-[#fffdf9]"><Layers3 className="h-8 w-8" /></div>
            <div><p className="text-sm font-black text-[#765d70]">מתנה שיש בה דרך</p><h2 id="course-title" className="mt-3 text-3xl font-black leading-tight tracking-[-.045em] text-[#171519] md:text-5xl">חמישה מודולים שמתרגמים תובנה לעבודה אישית.</h2></div>
          </motion.div>
          <div className="mt-11 grid gap-3 md:grid-cols-5">
            {courseModules.map((module, index) => (
              <motion.article key={module} variants={fadeUp} className="rounded-[1.4rem] border border-[#171519]/10 bg-[#fffdf9] p-5 shadow-[0_10px_26px_rgba(72,54,67,.05)]">
                <span className="text-xs font-black text-[#826979]">מודול 0{index + 1}</span>
                <h3 className="mt-4 text-lg font-black leading-6 text-[#171519]">{module}</h3>
              </motion.article>
            ))}
          </div>
          <motion.p variants={fadeUp} className="mt-6 max-w-3xl text-sm leading-7 text-[#625563]">בכל מודול יש ידע, שאלות ותרגול. בסיום נבנית מפה זוגית אישית שמרכזת פחדים, דפוסים, צרכים וסגנון התקשרות.</motion.p>
        </Reveal>
      </section>

      <section className="bg-[#fffdf9] px-5 py-20 md:px-8 md:py-28" aria-labelledby="about-title">
        <Reveal className="mx-auto grid max-w-6xl items-stretch gap-9 md:grid-cols-[.86fr_1.14fr] md:gap-14">
          <motion.div variants={fadeUp} className="overflow-hidden rounded-[2rem] bg-[#c6b5c0] shadow-[0_26px_65px_rgba(71,49,65,.16)]"><Portrait src={ABOUT_IMAGE} alt="הילית כספי" /></motion.div>
          <motion.div variants={fadeUp} className="flex flex-col justify-center py-2">
            <p className="text-sm font-black text-[#765d70]">מי מלווה את תהליך ההתאמה</p>
            <h2 id="about-title" className="mt-3 text-4xl font-black leading-[1.06] tracking-[-.05em] text-[#171519] md:text-5xl">הילית כספי,<br />עם עין על כל הצעה.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-[#554854]">אני מאמנת לזוגיות ושדכנית. פיתחתי את השאלונים והקורס כדי לתת דרך ברורה יותר להבין בחירה, אבל במאגר אני לא מוותרת על המבט האנושי: קוראת את הפרופילים, בוחנת את ההצעות, ומחזיקה את שני הצדדים בכבוד.</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#655866]">המטרה אינה לייצר רשימה של התאמות. המטרה היא לפתוח היכרות שאפשר באמת לשקול.</p>
          </motion.div>
        </Reveal>
      </section>

      {approvedTestimonials.length > 0 ? (
        <section className="bg-[#ede4e9] px-5 py-20 md:px-8 md:py-24" aria-labelledby="stories-title">
          <Reveal className="mx-auto max-w-6xl">
            <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-[#765d70]">מילים שפורסמו באישור</p><h2 id="stories-title" className="mt-3 text-3xl font-black text-[#171519] md:text-5xl">סיפורים אמיתיים, בלי להבטיח את הסיפור הבא.</h2></motion.div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {approvedTestimonials.map((testimonial) => (
                <motion.blockquote key={testimonial.id} variants={fadeUp} className="rounded-[1.6rem] border border-[#171519]/10 bg-[#fffdf9] p-7 shadow-[0_14px_36px_rgba(71,49,65,.07)]">
                  <p className="text-base leading-8 text-[#514451]">״{testimonial.text}״</p>
                  <footer className="mt-6 border-t border-[#171519]/10 pt-4 text-sm font-black text-[#171519]">{testimonial.displayName}</footer>
                </motion.blockquote>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      <section ref={checkoutRef} id="payment" className="scroll-mt-8 bg-[#d2c3cd] px-5 py-20 md:px-8 md:py-28" aria-labelledby="checkout-title">
        <Reveal className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <motion.div variants={fadeUp}>
            <p className="text-sm font-black text-[#614d5d]">הצטרפות להטבת נובמבר</p>
            <h2 id="checkout-title" className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] text-[#171519] md:text-5xl">מתחילים מכאן.</h2>
            <p className="mt-5 max-w-md text-lg leading-9 text-[#514451]">מאגר ב־349 ₪, עם הקורס המלא במתנה. אחרי אישור התשלום יישלחו למייל הגישה לקורס והשלב הבא להשלמת ההצטרפות למאגר.</p>
            <div className="mt-7 max-w-md"><OfferPrice compact /></div>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-[2rem] border border-[#171519]/12 bg-[#fffdf9]/78 p-5 shadow-[0_26px_72px_rgba(71,49,65,.16)] backdrop-blur-sm md:p-8">
            {offerActive ? (
              <>
                <p className="text-sm font-black text-[#5e4b5a]">פרטי ההצטרפות</p>
                <h3 className="mt-2 text-2xl font-black text-[#171519]">מאגר וקורס ב־{NOVEMBER_BUNDLE_PRICE} ₪</h3>
                <div className="november-love-wallet mt-6">
                  <GrowWallet
                    product={NOVEMBER_BUNDLE_PRODUCT}
                    buttonLabel={`להמשך לתשלום מאובטח, ${NOVEMBER_BUNDLE_PRICE} ₪`}
                    buttonClassName="!bg-[#171519] !py-4 !text-base !font-black !text-[#fffdf9] hover:!bg-[#342d32]"
                    termsPath="/terms/november-love"
                    showCoupon={false}
                    onSuccess={() => {
                      window.location.assign("/thank-you/november-love");
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="py-5 text-center">
                <Clock3 className="mx-auto h-9 w-9 text-[#6e5868]" />
                <h3 className="mt-5 text-2xl font-black text-[#171519]">הטבת נובמבר הסתיימה</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#5f5160]">הקופה של ההטבה הייתה זמינה בישראל עד {deadline}. אי אפשר להצטרף במחיר הקמפיין אחרי מועד זה.</p>
                <button type="button" disabled className="mt-6 w-full cursor-not-allowed rounded-full bg-[#171519]/20 px-6 py-4 text-base font-black text-[#171519]/50">ההצטרפות בהטבה אינה זמינה</button>
              </div>
            )}
          </motion.div>
        </Reveal>
      </section>

      <section className="bg-[#fffdf9] px-5 py-20 pb-32 md:px-8 md:py-28" aria-labelledby="faq-title">
        <Reveal className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="text-center"><p className="text-sm font-black text-[#765d70]">לפני שמחליטים</p><h2 id="faq-title" className="mt-3 text-3xl font-black text-[#171519] md:text-5xl">שאלות נפוצות</h2></motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map(({ question, answer }) => (
              <motion.details key={question} variants={fadeUp} className="group rounded-2xl border border-[#171519]/10 bg-white p-5 shadow-[0_8px_24px_rgba(71,49,65,.04)] md:p-6">
                <summary className="cursor-pointer list-none text-base font-black text-[#171519] marker:hidden md:text-lg">{question}<span aria-hidden="true" className="float-left text-2xl font-medium leading-5 text-[#765d70] transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-4 border-t border-[#171519]/10 pt-4 text-sm leading-7 text-[#5f5160]">{answer}</p>
              </motion.details>
            ))}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[#171519]/10 bg-[#fffdf9] px-5 py-8 text-center">
        <nav aria-label="קישורים" className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-bold text-[#625563]">
          <a href="/" className="transition hover:text-[#171519]">דף הבית</a>
          <a href="/terms/november-love" className="transition hover:text-[#171519]">תנאי ההטבה</a>
          <a href="/terms/database" className="transition hover:text-[#171519]">תקנון המאגר</a>
          <a href="/terms/course" className="transition hover:text-[#171519]">תקנון הקורס</a>
          <a href="/privacy" className="transition hover:text-[#171519]">מדיניות פרטיות</a>
        </nav>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#171519]/10 bg-[#fffdf9]/94 px-4 py-3 shadow-[0_-8px_28px_rgba(23,21,25,.08)] backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => openCheckout("mobile_sticky")}
          disabled={!offerActive}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#171519] px-5 py-3.5 text-sm font-black text-[#fffdf9] disabled:cursor-not-allowed disabled:bg-[#171519]/35"
        >
          {offerActive ? <>להצטרפות ב־{NOVEMBER_BUNDLE_PRICE} ₪ <ArrowLeft className="h-4 w-4" /></> : "ההטבה הסתיימה"}
        </button>
      </div>
    </main>
  );
}
