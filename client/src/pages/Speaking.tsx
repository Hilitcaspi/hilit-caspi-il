/**
 * Speaking - page for booking Hilit Caspi as a speaker
 */

import { motion } from "framer-motion";

const WHATSAPP_URL = "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%A0%D7%AA%20%D7%9C%D7%94%D7%96%D7%9E%D7%99%D7%9F%20%D7%90%D7%95%D7%AA%D7%9A%20%D7%9C%D7%94%D7%A8%D7%A6%D7%90%D7%94";
const CALENDLY_URL = "https://calendly.com/hilitcaspi/meet-with-me";

const TOPICS = [
  {
    icon: "💛",
    title: "למה אנחנו עדיין רווקות?",
    desc: "הרצאה מרגשת ומעשית על הדפוסים הנסתרים שמונעים מנשים חזקות למצוא אהבה - ואיך לשנות אותם.",
    audience: "ערבי בנות, קהילות נשים, ריטריטים",
    duration: "60 90 דקות",
  },
  {
    icon: "🔑",
    title: "הקוד הסודי לזוגיות מאושרת",
    desc: "מה מבדיל זוגות מאושרים מאלה שנפרדים? תובנות מהשטח על תקשורת, גבולות, ואינטימיות.",
    audience: "ריטריטים זוגיים, חברות, ארגוני נשים",
    duration: "45 90 דקות",
  },
  {
    icon: "📱",
    title: "דייטינג בעידן הדיגיטלי",
    desc: "איך לנווט בעולם האפליקציות, לכתוב פרופיל שמושך, ולא לאבד את עצמך בתהליך.",
    audience: "ערבי בנות, קהילות צעירות",
    duration: "45 60 דקות",
  },
  {
    icon: "🌱",
    title: "מי אני בזוגיות?",
    desc: "סדנה אינטראקטיבית לגילוי דפוסי הקשר האישיים ובניית מערכת יחסים בריאה עם עצמך ועם הסביבה.",
    audience: "ריטריטים, סדנאות, קבוצות קטנות",
    duration: "2 3 שעות (סדנה)",
  },
  {
    icon: "💼",
    title: "Balance - אהבה, קריירה, ועצמי",
    desc: "לנשים שמצליחות בכל - חוץ מבזוגיות. על הקשר בין הצלחה מקצועית לאהבה אמיתית.",
    audience: "חברות היי-טק, ארגוני נשים, כנסים",
    duration: "45 60 דקות",
  },
];

const FORMATS = [
  { icon: "🎤", title: "הרצאה", desc: "הרצאה מרתקת עם שאלות ותשובות - לכנסים, ימי גיבוש, וערבי השראה" },
  { icon: "🌿", title: "ריטריט", desc: "תכנית מלאה לריטריט - מהרצאות לסדנאות עמוקות ועד חוויה טרנספורמטיבית" },
  { icon: "👥", title: "סדנה", desc: "סדנה אינטראקטיבית לקבוצה קטנה - עמוקה, אישית, ומשנה חיים" },
  { icon: "🏢", title: "ארגונים", desc: "תכנים מותאמים לחברות וארגונים - רווחה, גיוון, ואיזון בית-עבודה" },
];

export default function Speaking() {
  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── HEADER ── */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-xl">הילית כספי</a>
          <div className="hidden md:flex items-center gap-6 text-white/80 text-sm">
            <a href="/#about" className="hover:text-[#ffe27c] transition-colors">אודות</a>
            <a href="/#services" className="hover:text-[#ffe27c] transition-colors">שירותים</a>
            <a href="/blog" className="hover:text-[#ffe27c] transition-colors">מאמרים</a>
            <a href="/speaking" className="text-[#ffe27c] font-semibold">הרצאות</a>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full text-sm hover:bg-white transition-all">
            💬 לפרטים ותיאום
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] py-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
          הרצאות · סדנאות · ריטריטים
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
          className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
          הזמינו את הילית<br />
          <span className="text-[#ffe27c]">לאירוע שלכם</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="text-white/75 text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
          הרצאות שמשנות נקודת מבט, סדנאות שמשנות חיים -
          לערבי בנות, ריטריטים, כנסים, וארגונים
        </motion.p>
        <motion.a initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
          className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl">
          💬 כתבו לי לפרטים ותיאום
        </motion.a>
      </section>

      {/* ── FORMATS ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[#191265] text-center mb-10">פורמטים</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORMATS.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-[#f0eadc] rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-[#191265] text-lg mb-2">{f.title}</h3>
                <p className="text-[#727272] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOPICS ── */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[#191265] text-center mb-4">נושאי הרצאות</h2>
          <p className="text-[#727272] text-center mb-12 text-lg">כל הרצאה מותאמת לקהל ולמטרה שלכם</p>
          <div className="flex flex-col gap-4">
            {TOPICS.map((topic, i) => (
              <motion.div key={topic.title}
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 text-right border border-[#e9e8e8]">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{topic.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-black text-[#191265] text-xl mb-2">{topic.title}</h3>
                    <p className="text-[#727272] leading-relaxed mb-3">{topic.desc}</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                        👥 {topic.audience}
                      </span>
                      <span className="bg-[#ffe27c]/40 text-[#191265] text-xs px-3 py-1 rounded-full">
                        ⏱ {topic.duration}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="py-16 px-6 bg-[#191265]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-6">למה הילית?</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { n: "500+", label: "נשים שליוותי" },
              { n: "200K+", label: "האזנות לפודקאסט" },
              { n: "2,400+", label: "רווקים במאגר" },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-2xl p-6">
                <div className="text-3xl font-black text-[#ffe27c] mb-1">{item.n}</div>
                <div className="text-white/70 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
          <p className="text-white/75 text-lg leading-relaxed">
            הילית כספי היא מאמנת ומשדכת עם ניסיון של שנים בליווי נשים למציאת אהבה.
            הרצאותיה משלבות תובנות פסיכולוגיות עמוקות עם הומור, חמלה, ודוגמאות מהחיים האמיתיים -
            ומשאירות קהל עם כלים מעשיים שאפשר ליישם מחר בבוקר.
          </p>
        </div>
      </section>

      {/* ── CONTACT CTA ── */}
      <section className="py-20 px-6 bg-white text-center">
        <h2 className="text-3xl font-black text-[#191265] mb-4">מעוניינים להזמין?</h2>
        <p className="text-[#727272] text-lg mb-8 max-w-xl mx-auto">
          כתבו לי בוואטסאפ עם פרטי האירוע - תאריך, מיקום, גודל קהל, ונושא מועדף.
          אחזור אליכם תוך 24 שעות.
        </p>
        <div className="flex justify-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#191265] text-white font-black text-lg px-10 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-xl">
            💬 כתבו לי בוואטסאפ
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#191265] py-8 px-6 text-center">
        <p className="text-white/50 text-sm">© 2025 הילית כספי. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
