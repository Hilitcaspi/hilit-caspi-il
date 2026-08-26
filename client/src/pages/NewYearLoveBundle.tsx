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

const HERO_VISUAL = "/manus-storage/sep26-holiday-feed-hero_d85b4394.png";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const } },
};

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const products = [
  {
    icon: Network,
    eyebrow: "הזדמנויות",
    title: "מאגר הרווקים",
    description: "פרופיל אישי, שאלון DNA זוגי ושאלון מדעי. כל הצעה עוברת חישוב התאמה ובדיקה אנושית והדדית.",
    original: "499 ₪",
    current: "299 ₪",
  },
  {
    icon: BookOpenCheck,
    eyebrow: "בהירות",
    title: "לבחור נכון",
    description: "מדריך מעשי לזיהוי הדפוס הדומיננטי, עם תרגילים וכלים לבחירה שמתאימה לחיים שרוצים לבנות.",
    original: "249 ₪",
    current: "149 ₪",
  },
  {
    icon: Compass,
    eyebrow: "תנועה",
    title: "המסע",
    description: "קורס דיגיטלי בן חמישה מודולים שעוזר לזהות פחדים והרגלים, ולעבור לבחירה חופשית ומדויקת יותר.",
    original: "497 ₪",
    current: "249 ₪",
  },
];

const metrics = [
  { value: "1,171", label: "חברים פעילים ומשלמים" },
  { value: "96%", label: "השלימו שאלון מדעי" },
  { value: "98%", label: "קיבלו לפחות הצעה אחת" },
  { value: "75%", label: "קיבלו הצעה ראשונה בתוך 30 יום בקרב הזכאים למדידה" },
];

const faqs = [
  {
    q: "האם מובטחת לי התאמה?",
    a: "לא. ההצטרפות מכניסה את הפרופיל למאגר ולמערכת הבדיקה. הצעה נשלחת כאשר נמצאת התאמה רלוונטית שעברה בדיקה מקצועית והדדית. אין הבטחה לכמות, לזמן או לתוצאה זוגית.",
  },
  {
    q: "כמה התאמות אקבל?",
    a: "אין מכסה קבועה. כמות ההצעות תלויה בגיל, באזור, באורח החיים, בהעדפות, בהיצע הפעיל ובהסכמה ההדדית. המערכת אינה שולחת אדם רק כדי לייצר נפח.",
  },
  {
    q: "תוך כמה זמן מתקבלת הצעה ראשונה?",
    a: "לפי נתוני המערכת נכון ל־26.8.2026, 75% מהחברים שהיו זכאים למדידה קיבלו הצעה ראשונה בתוך 30 יום, 90% בתוך 60 יום ו־95% בתוך 90 יום. זהו נתון מערכתי ולא התחייבות אישית.",
  },
  {
    q: "האם זה מנוי?",
    a: "לא. מחיר החג הוא 449 ₪ בתשלום חד־פעמי. Plus אינו כלול ולא מופעל אוטומטית.",
  },
  {
    q: "כבר הצטרפתי למאגר. האם החבילה מתאימה לי?",
    a: "לא מומלץ לשלם שוב על רכיב שכבר נרכש. חברי מאגר יכולים לרכוש את המדריך או הקורס בנפרד. Match Boost ו־Plus הם שירותים נפרדים ואינם כלולים בחבילה.",
  },
  {
    q: "מי בודק את ההתאמות?",
    a: "המערכת משלבת חישוב התאמה עם בדיקה אנושית של הילית והצוות המקצועי שהוכשר על ידה. הילית מפקחת על התהליך ועל המדיניות המקצועית.",
  },
];

export default function NewYearLoveBundle() {
  const paymentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "חבילת שנה חדשה לזוגיות | הילית כספי";
    const description = "מאגר הרווקים, המדריך לבחור נכון וקורס המסע בחבילת חג חד־פעמית ב־449 ₪.";
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
    <div dir="rtl" className="min-h-screen bg-[#fbf7ef] font-['Rubik',sans-serif] text-[#191265]">
      <nav className="absolute inset-x-0 top-0 z-30 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-sm font-black text-white">הילית כספי</a>
          <button
            type="button"
            onClick={() => openPayment("nav")}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-md transition duration-150 active:scale-[0.97]"
          >
            לחבילת החג
          </button>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-[#191265] px-5 pb-20 pt-28 text-white md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(212,174,63,0.22),transparent_34%),radial-gradient(circle_at_82%_76%,rgba(201,107,135,0.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d4ae3f]/40 bg-[#d4ae3f]/10 px-4 py-2 text-sm font-bold text-[#f5d978]">
              <Sparkles className="h-4 w-4" /> חבילת חגי תשרי, לזמן מוגבל
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.12] md:text-6xl">
              בחגים האלה לא רק מאחלים אהבה.
              <span className="mt-2 block text-[#f5d978]">מתחילים לפעול בשבילה.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
              מאגר הרווקים, המדריך ״לבחור נכון״ וקורס ״המסע״. שלושה צעדים שמחברים בין יותר הזדמנויות, יותר בהירות ודרך בחירה חדשה.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 rounded-3xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm">
              <div><div className="text-xs text-white/55">שווי מקור</div><div className="mt-1 text-xl font-black line-through decoration-white/35">1,245 ₪</div></div>
              <div><div className="text-xs text-white/55">בנפרד כיום</div><div className="mt-1 text-xl font-black">697 ₪</div></div>
              <div className="rounded-2xl bg-[#d4ae3f] px-3 py-2 text-[#191265]"><div className="text-xs font-bold">מחיר החג</div><div className="mt-1 text-2xl font-black">449 ₪</div></div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => openPayment("hero")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4ae3f] px-8 py-4 text-base font-black text-[#191265] shadow-[0_18px_50px_rgba(212,174,63,0.25)] transition duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                מתחילים את השנה עם מקום לזוגיות <ArrowDown className="h-4 w-4" />
              </button>
              <span className="text-sm text-white/60">תשלום חד־פעמי. ללא מנוי.</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className="relative">
            <div className="absolute -inset-5 rounded-[2.25rem] bg-[#d4ae3f]/15 blur-2xl" />
            <img src={HERO_VISUAL} alt="חבילת שנה חדשה לזוגיות" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl" />
            <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-2xl bg-white p-3 text-[#191265] shadow-xl">
              <img src={PROFILE_IMG} alt="הילית כספי" className="h-12 w-12 rounded-full object-cover" />
              <div><div className="text-sm font-black">הילית כספי</div><div className="text-xs text-[#191265]/60">מאמנת למציאת זוגיות ושדכנית</div></div>
            </div>
          </motion.div>
        </div>
      </header>

      <main>
        <section className="px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-5xl text-center">
            <motion.p variants={fadeUp} className="text-sm font-bold text-[#c96b87]">יותר מהצעה. מערכת שלמה.</motion.p>
            <motion.h2 variants={fadeUp} className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">גם להרחיב הזדמנויות וגם להגיע אליהן מוכנים יותר</motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#4f4a62]">המאגר מייצר אפשרות להיכרות. המדריך עוזר לזהות דפוסים. הקורס יוצר תהליך עמוק יותר של מעבר מפחד לבחירה.</motion.p>

            <div className="mt-12 grid gap-5 text-right md:grid-cols-3">
              {products.map((product) => {
                const Icon = product.icon;
                return (
                  <motion.article key={product.title} variants={fadeUp} className="rounded-3xl border border-[#191265]/10 bg-white p-7 shadow-[0_18px_45px_rgba(25,18,101,0.07)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#191265] text-[#f5d978]"><Icon className="h-6 w-6" /></div>
                    <p className="mt-6 text-xs font-bold text-[#c96b87]">{product.eyebrow}</p>
                    <h3 className="mt-1 text-2xl font-black">{product.title}</h3>
                    <p className="mt-4 min-h-28 text-sm leading-7 text-[#59536a]">{product.description}</p>
                    <div className="mt-5 border-t border-[#191265]/10 pt-4 text-sm"><span className="line-through text-[#777186]">{product.original}</span><span className="mr-3 font-black">כיום {product.current}</span></div>
                  </motion.article>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section id="how-it-works" className="bg-[#191265] px-5 py-20 text-white md:py-28">
          <Reveal className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 text-sm font-bold text-[#f5d978]"><ShieldCheck className="h-5 w-5" /> לא עוד אפליקציה</div>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">נתונים, התאמה ובדיקה אנושית של שני הצדדים</h2>
              <p className="mt-6 text-base leading-8 text-white/70">המערכת בוחנת ערכים, אישיות, שלב חיים, אורח חיים והעדפות. הילית והצוות בודקים את שני הצדדים לפני שליחת הצעה. פרטים מלאים נחשפים רק לאחר הסכמה הדדית ובהתאם לזרימת ההתאמה.</p>
              <div className="mt-8 rounded-2xl border border-[#d4ae3f]/30 bg-[#d4ae3f]/10 p-5 text-sm leading-7 text-[#f8e8b1]">אין הבטחה למספר התאמות או לתדירות קבועה. המטרה היא לייצר יותר הזדמנויות רלוונטיות בלי לשלוח אדם רק כדי לייצר כמות.</div>
            </motion.div>
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-white/12 bg-white/[0.06] p-6">
                  <div className="text-3xl font-black text-[#f5d978] md:text-4xl">{metric.value}</div>
                  <div className="mt-2 text-sm leading-6 text-white/68">{metric.label}</div>
                </div>
              ))}
              <div className="col-span-2 text-xs leading-6 text-white/45">נתוני מערכת חיים נכון ל־26.8.2026. הנתונים אינם הבטחה אישית לתוצאה, לזמן או לכמות.</div>
            </motion.div>
          </Reveal>
        </section>

        <section className="px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-4xl">
            <motion.div variants={fadeUp} className="rounded-[2rem] border border-[#c96b87]/25 bg-white p-7 shadow-[0_22px_60px_rgba(25,18,101,0.08)] md:p-12">
              <p className="text-sm font-bold text-[#c96b87]">השאלה שחוזרת</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">למה לא שולחים התאמה כל שבוע?</h2>
              <p className="mt-6 text-base leading-8 text-[#514b63]">כי מאגר איכותי אינו פיד. כל הצעה נבדקת משני הצדדים לפי פרופיל, שאלונים, העדפות והתאמה אנושית. ההצטרפות היא למאגר ולתהליך ההתאמה. היא אינה רכישה של מכסת התאמות או התחייבות להצעה בכל מספר ימים.</p>
              <p className="mt-4 text-base font-bold leading-8">המטרה ברורה: להרחיב את המאגר ולייצר יותר הזדמנויות רלוונטיות, בלי להוריד את הרף.</p>
            </motion.div>
          </Reveal>
        </section>

        <section ref={paymentRef} id="payment" className="bg-[#efe6d2] px-5 py-20 md:py-28">
          <Reveal className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <motion.div variants={fadeUp} className="self-center">
              <p className="text-sm font-bold text-[#c96b87]">שלושה צעדים. מחיר חג אחד.</p>
              <h2 className="mt-3 text-4xl font-black md:text-5xl">449 ₪</h2>
              <p className="mt-3 text-lg text-[#514b63]"><span className="line-through">1,245 ₪ שווי מקור</span><span className="mr-3 font-bold">697 ₪ כיום בנפרד</span></p>
              <ul className="mt-8 space-y-4 text-sm leading-7 text-[#474159]">
                {["הצטרפות למאגר הרווקים", "גישה למדריך לבחור נכון", "גישה לקורס המסע", "תשלום חד־פעמי ללא מנוי", "Plus ו־Match Boost אינם מופעלים אוטומטית"].map((item) => (
                  <li key={item} className="flex items-start gap-3"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#191265] text-[#f5d978]"><Check className="h-3.5 w-3.5" /></span>{item}</li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeUp} className="rounded-[2rem] bg-white p-6 shadow-[0_26px_70px_rgba(25,18,101,0.12)] md:p-9">
              <h3 className="text-2xl font-black">פרטי רכישה</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b6577]">לאחר אישור Grow יישלחו קישורי הגישה למוצרים הדיגיטליים ויתחיל תהליך ההצטרפות למאגר.</p>
              <div className="mt-6">
                <GrowWallet
                  product="bundle_new_year"
                  buttonLabel="לרכישת חבילת החג ב־449 ₪"
                  buttonClassName="!bg-[#191265] !text-white !font-black !rounded-full hover:!bg-[#2c2184] !py-4"
                  termsPath="/terms/new-year-love"
                  onSuccess={() => { window.location.href = "/thank-you/new-year-love"; }}
                />
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-[#746f7e]">התשלום מאובטח. אין חיוב מתחדש. תנאי הביטול והגישה מפורטים בתקנון החבילה.</p>
            </motion.div>
          </Reveal>
        </section>

        <section className="px-5 py-20 md:py-28">
          <Reveal className="mx-auto max-w-4xl">
            <motion.h2 variants={fadeUp} className="text-center text-3xl font-black md:text-5xl">שאלות לפני שמתחילים</motion.h2>
            <div className="mt-10 space-y-4">
              {faqs.map(({ q, a }) => (
                <motion.details key={q} variants={fadeUp} className="group rounded-2xl border border-[#191265]/10 bg-white p-6 shadow-sm">
                  <summary className="cursor-pointer list-none text-lg font-black marker:hidden">{q}<span className="float-left text-[#c96b87] transition group-open:rotate-45">+</span></summary>
                  <p className="mt-4 border-t border-[#191265]/10 pt-4 text-sm leading-7 text-[#59536a]">{a}</p>
                </motion.details>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="bg-[#191265] px-5 py-16 text-center text-white">
          <div className="mx-auto max-w-3xl">
            <Sparkles className="mx-auto h-7 w-7 text-[#f5d978]" />
            <h2 className="mt-5 text-3xl font-black md:text-5xl">השנה החדשה יכולה להתחיל בצעד אמיתי</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/70">לא בהבטחה להגיע בזוג לשולחן החג. בהחלטה ליצור יותר הזדמנויות ולהגיע אליהן עם יותר בהירות.</p>
            <button type="button" onClick={() => openPayment("footer")} className="mt-8 rounded-full bg-[#d4ae3f] px-9 py-4 font-black text-[#191265] transition duration-150 active:scale-[0.97]">מצטרפים לחבילת החג ב־449 ₪</button>
            <p className="mt-7 text-xs leading-6 text-white/42">נתוני המאגר נכונים ל־26.8.2026 ומתעדכנים לאורך זמן. החבילה אינה מבטיחה התאמה, זמן, כמות הצעות או תוצאה זוגית.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
