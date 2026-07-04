/**
 * Hilit Caspi - Landing Page
 * Design: Intimate Authority - Deep navy #191265, warm cream #f0eadc, gold #ffe27c, slate #727272
 * Typography: Rubik (body/Hebrew), serif for display moments
 * Philosophy: World-class authority copy meets warm Israeli intimacy
 * Real photos: CDN-hosted, no local assets
 */

import { getUtmParams } from "@/lib/utils";
import { track } from "@/lib/track";
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
// ─── CDN Image URLs ─────────────────────────────────────────────────────────
const HERO_IMG     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const ABOUT_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const CASUAL_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const PROFILE_IMG  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const PODCAST_IMG  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-podcast_32b046c8.png";

// ─── External Links ───────────────────────────────────────────────────────────
const LINKS = {
  calendly:   "https://calendly.com/hilitcaspi/meet-with-me",
  whatsapp:   "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%99%D7%95%D7%AA%D7%A8",
  // Context-specific WhatsApp messages
  waCoaching: "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%A0%D7%AA%20%D7%91%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%97%D7%91%D7%99%D7%9C%D7%AA%20%D7%94%D7%9C%D7%99%D7%95%D7%95%D7%99%20%D7%94%D7%90%D7%99%D7%A9%D7%99",
  waDatabase: "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%A0%D7%AA%20%D7%91%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%9E%D7%90%D7%92%D7%A8%20%D7%94%D7%90%D7%99%D7%A9%D7%99",
  waIntro:    "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A7%D7%91%D7%95%D7%A2%20%D7%A4%D7%92%D7%99%D7%A9%D7%AA%20%D7%94%D7%99%D7%9B%D7%A8%D7%95%D7%AA",
  waGuide:    "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%A0%D7%AA%20%D7%91%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A",
  waMeeting:  "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A7%D7%91%D7%95%D7%A2%20%D7%A4%D7%92%D7%99%D7%A9%D7%AA%20%D7%94%D7%99%D7%9B%D7%A8%D7%95%D7%AA",
  waSpeaking: "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%A0%D7%AA%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%96%D7%9E%D7%A0%D7%AA%20%D7%94%D7%A8%D7%A6%D7%90%D7%94",
  waGroup:    "https://hilitcaspi.com/api/wa/site",
  instagram:  "https://www.instagram.com/hilitcaspi_relationship",
  facebook:   "https://www.facebook.com/share/1B28xCy726/",
  tiktok:     "https://www.tiktok.com/@hilitcaspi_relationship",
  spotify:    "https://open.spotify.com/episode/7l1SSASi2TCDGs09gixcKc",
  apple:      "https://podcasts.apple.com/il/podcast/%D7%9C%D7%9E%D7%94-%D7%90%D7%AA%D7%9D-%D7%A2%D7%93%D7%99%D7%99%D7%9F-%D7%A8%D7%95%D7%95%D7%A7%D7%99%D7%9D-%D7%9B%D7%9C-%D7%94%D7%90%D7%9E%D7%AA-%D7%94%D7%9C%D7%90-%D7%9E%D7%A1%D7%95%D7%A0%D7%A0%D7%AA-%D7%A2%D7%9C-%D7%90%D7%94%D7%91%D7%94-%D7%95%D7%93%D7%99%D7%99%D7%98%D7%99%D7%A0%D7%92/id1853852800",
};

// ─── Animation helpers ────────────────────────────────────────────────────────
// Detect mobile for lighter animations
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const fadeUp = {
  hidden: { opacity: 0, y: isMobile ? 20 : 40 },
  visible: { opacity: 1, y: 0, transition: { duration: isMobile ? 0.4 : 0.7, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = {
  visible: { transition: { staggerChildren: isMobile ? 0.08 : 0.15 } },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: isMobile ? "-40px" : "-80px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Counter animation ────────────────────────────────────────────────────────
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 25);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Lead form ────────────────────────────────────────────────────────────────
// CDN URLs for guides
const FREE_GUIDE_PDF_RAW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit_guide_v3_13e3caa9.pdf";
const FREE_GUIDE_PDF = `https://docs.google.com/viewer?url=${encodeURIComponent(FREE_GUIDE_PDF_RAW)}&embedded=true`;
const PAID_GUIDE_PDF = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/Hilit_Caspi_Paid_Guide_6518dc09.pdf";

function FreeGuideForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const submitLead = trpc.leads.submit.useMutation();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !consent) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return;
    submitLead.mutate({ name, email, ...getUtmParams() });
  };
  if (submitLead.isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
        <div className="text-5xl mb-4">📬</div>
        <h3 className="text-xl font-bold text-[#191265] mb-3">המדריך בדרך אלייך!</h3>
        <p className="text-[#727272] text-sm leading-relaxed">
          שלחנו לך את המדריך למייל: כדאי לבדוק את תיבת הדואר הנכנסת.
        </p>
        <p className="text-[#727272] text-xs mt-3">לא רואים? בדקו גם בתיקיית הספאם והעבירו לתיבה הראשית.</p>
      </motion.div>
    );
  }
  if (submitLead.isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
        <p className="text-red-600 text-sm">אירעה שגיאה טכנית. אנא נסו שוב או פנו אלינו בוואטסאפ.</p>
      </motion.div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="text" value={name} onChange={e => setName(e.target.value)} required
        placeholder="השם שלך"
        className="px-4 py-3 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="כתובת המייל שלך"
        className="px-4 py-3 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all" />
      <label className="flex items-start gap-2 cursor-pointer text-right">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#191265] flex-shrink-0" />
        <span className="text-xs text-[#727272] leading-relaxed">
          אני מסכימ/ה לקבל עדכונים ותוכן מהילית כספי. אפשר להסיר בכל עת.
        </span>
      </label>
      <button type="submit" disabled={submitLead.isPending || !consent}
        className="bg-[#ffe27c] text-[#191265] font-bold text-base py-3.5 rounded-xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60">
        {submitLead.isPending ? "שולחים..." : "שלחו לי את המדריך החינמי ←"}
      </button>
    </form>
  );
}

function PaidGuideForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const submitPaidGuide = trpc.leads.submitPaidGuide.useMutation();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !consent) return;
    submitPaidGuide.mutate({ name, email, origin: window.location.origin, ...getUtmParams() });
  };
  if (submitPaidGuide.isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-bold text-[#191265] mb-2">תודה! המדריך נשלח למייל</h3>
        <p className="text-[#727272] text-sm mb-4">בדקי את תיבת המייל - שלחנו לך את המדריך.</p>
        <a href={PAID_GUIDE_PDF} target="_blank" rel="noopener noreferrer"
          className="inline-block bg-[#ffe27c] text-[#191265] font-black text-base px-6 py-3 rounded-xl hover:bg-[#ffd84a] transition-all shadow-lg">
          פתיחה מיידית ←
        </a>
      </motion.div>
    );
  }
  if (submitPaidGuide.isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
        <p className="text-red-600 text-sm mb-3">אירעה שגיאה טכנית. אפשר לפתוח את המדריך ישיר:</p>
        <a href={PAID_GUIDE_PDF} target="_blank" rel="noopener noreferrer"
          className="inline-block bg-[#ffe27c] text-[#191265] font-black text-base px-6 py-3 rounded-xl hover:bg-[#ffd84a] transition-all shadow-lg">
          פתיחת המדריך ←
        </a>
      </motion.div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="text" value={name} onChange={e => setName(e.target.value)} required
        placeholder="השם שלך"
        className="px-4 py-3 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="כתובת המייל שלך"
        className="px-4 py-3 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all" />
      <label className="flex items-start gap-2 cursor-pointer text-right">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#191265] flex-shrink-0" />
        <span className="text-xs text-[#727272] leading-relaxed">
          אני מסכימה לקבל עדכונים, תוכן ומבצעים מהילית כספי. אפשר להסיר בכל עת.
        </span>
      </label>
      <button type="submit" disabled={submitPaidGuide.isPending || !consent}
        className="bg-[#ffe27c] text-[#191265] font-bold text-base py-3.5 rounded-xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60">
        {submitPaidGuide.isPending ? "שולחת..." : "רכישה ב-149 ←"} 
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Section visibility tracking
  useEffect(() => {
    const tracked = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !tracked.has(entry.target.id)) {
          tracked.add(entry.target.id);
          track({ eventType: "section_view", page: "/", metadata: { section: entry.target.id } });
        }
      });
    }, { threshold: 0.3 });
    const sections = document.querySelectorAll("section[id]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Scroll depth tracking
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    const reached = new Set<number>();
    const onScroll = () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      milestones.forEach((m) => {
        if (pct >= m && !reached.has(m)) {
          reached.add(m);
          track({ eventType: "scroll_depth", page: "/", metadata: { depth: m } });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Use scrollIntoView which respects scroll-margin-top CSS property
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuOpen(false);
  };

  return (
    <LazyMotion features={domAnimation}>
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="text-white font-bold text-xl tracking-wide">
            הילית כספי
          </button>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 text-white/90 text-sm font-medium">
            <button onClick={() => scrollTo("about")} className="hover:text-[#ffe27c] transition-colors">אודות</button>
            <button onClick={() => scrollTo("products")} className="hover:text-[#ffe27c] transition-colors">שירותים ומוצרים</button>
            <a href="/database" className="hover:text-[#ffe27c] transition-colors">מאגר רווקים</a>
            <button onClick={() => scrollTo("podcast")} className="hover:text-[#ffe27c] transition-colors">פודקאסט</button>
            <a href="/guide-free" className="hover:text-[#ffe27c] transition-colors">המדריך החינמי</a>
            <a href="/blog" className="hover:text-[#ffe27c] transition-colors">מאמרים</a>
            <a href="/speaking" className="hover:text-[#ffe27c] transition-colors">הרצאות</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user?.role === "admin" && (
              <a href="/crm"
                className="bg-white/20 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-all duration-300 border border-white/30">
                📊 CRM
              </a>
            )}
            <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer"
              onClick={() => track({ eventType: "whatsapp_click", page: "/" })}
              className="bg-[#ffe27c] text-[#191265] font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
           ♡ פגישת היכרות
            </a>
          </div>
          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-2xl">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#191265] border-t border-white/10">
              <div className="flex flex-col px-6 py-4 gap-4 text-white text-base">
                {["about","products","podcast"].map(id => (
                  <button key={id} onClick={() => scrollTo(id)} className="text-right hover:text-[#ffe27c] transition-colors py-1">
                    {id === "about" ? "אודות" : id === "products" ? "שירותים ומוצרים" : "פודקאסט"}
                  </button>
                ))}
                <a href="/guide-free" className="text-right hover:text-[#ffe27c] transition-colors py-1">המדריך החינמי</a>
                <a href="/database" className="text-right hover:text-[#ffe27c] transition-colors py-1">מאגר רווקים</a>
                <a href="/blog" className="text-right hover:text-[#ffe27c] transition-colors py-1">מאמרים</a>
                <a href="/speaking" className="text-right hover:text-[#ffe27c] transition-colors py-1">הזמנת הרצאה</a>
                {user?.role === "admin" && (
                  <a href="/crm" className="text-[#ffe27c] font-semibold py-1 text-right">
                    📊 ניהול CRM
                  </a>
                )}
                <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer"
                  onClick={() => track({ eventType: "whatsapp_click", page: "/" })}
                  className="bg-[#ffe27c] text-[#191265] font-bold px-5 py-3 rounded-full text-center mt-2">
                  ♡ פגישת היכרות
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen bg-[#191265] overflow-hidden flex items-center">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16 grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Text side */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }} className="order-2 md:order-1 text-right">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              Relationship Expert &amp; Matchmaker ✦
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              פיצחתי את{" "}
              <span className="text-[#ffe27c]">הקוד הסודי</span>
              <br />
              למציאת האהבה.
              <br />
              <span className="text-white/80 text-3xl md:text-4xl font-bold">עכשיו תורך.</span>
            </h1>

            <p className="text-white/75 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
              מאות נשים ישבו מולי מיואשות מדייטים, מותשות מהאפליקציות, בטוחות שמשהו בהן שבור.
              <br /><br />
              <span className="text-white font-semibold">היום הן בזוגיות מאושרת.</span> לא בגלל מזל - בגלל שיטה.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer"
                onClick={() => track({ eventType: "whatsapp_click", page: "/" })}
                className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center">
                ♡ אשמח לקבוע פגישת היכרות
              </a>
              <button onClick={() => scrollTo("guide")}
                className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                המדריך החינמי שלי
              </button>
            </div>

            {/* Social proof strip */}
            <div className="flex gap-4 mt-10 pt-8 border-t border-white/10 flex-wrap">
              {[
                { n: 2400, s: "+", label: "רווקים במאגר" },
                { n: 200, s: "K+", label: "האזנות לפודקאסט" },
                { n: 500, s: "+", label: "נשים שליוויתי" },
              ].map(({ n, s, label }) => (
                <div key={label} className="text-center flex-1 min-w-[80px]">
                  <div className="text-2xl md:text-3xl font-black text-[#ffe27c]">
                    <CountUp target={n} suffix={s} />
                  </div>
                  <div className="text-white/60 text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Image side */}
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="הילית כספי" className="relative w-72 md:w-96 h-auto rounded-3xl object-cover shadow-2xl" />
              {/* Floating badge */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-2xl">💛</div>
                <div className="text-[#191265] font-black text-sm">סיפורי הצלחה</div>
                <div className="text-[#727272] text-xs">אמיתיים</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-2xl">↓</motion.div>
      </section>

      {/* ── PAIN POINTS - "את מכירה את התחושה הזו?" ── */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">את מכירה את התחושה הזו?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-12 leading-tight">
              כולן סביבך בזוגיות.<br />
              <span className="text-[#727272] font-normal">ואת עדיין לבד.</span>
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "📱",
                  title: "עייפה מהאפליקציות",
                  text: "שעות של swipe, שיחות שנגמרות בשום מקום, דייטים שמאכזבים שוב ושוב - ותחושה שמשהו בך שבור.",
                },
                {
                  icon: "💔",
                  title: "הדפוסים חוזרים",
                  text: "שוב ושוב אותו סוג גברים. שוב ושוב אותה תחושה. את יודעת שמשהו צריך להשתנות - אבל לא יודעת מה.",
                },
                {
                  icon: "⏰",
                  title: "הזמן עובר",
                  text: "חברות מתחתנות, ילדים נולדים, ואת מרגישה שהרכבת עוזבת. הפחד הזה מכרסם בך כל לילה.",
                },
              ].map(({ icon, title, text }) => (
                <motion.div key={title} variants={fadeUp}
                  className="bg-[#f0eadc] rounded-2xl p-6 text-right border border-[#e9e8e8] hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-[#191265] font-bold text-lg mb-3">{title}</h3>
                  <p className="text-[#727272] leading-relaxed text-sm">{text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-12 bg-[#191265] rounded-3xl p-8 text-white text-center">
              <p className="text-xl md:text-2xl font-bold leading-relaxed">
                זה לא בגלל שאת לא מספיק טובה.<br />
                זה בגלל שאף אחד לא לימד אותך את{" "}
                <span className="text-[#ffe27c]">הכללים האמיתיים של האהבה.</span>
              </p>
              <p className="text-white/70 mt-4 text-lg">אני כאן כדי לשנות את זה.</p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="bg-[#f0eadc] py-20 px-6" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="relative">
              <img src={ABOUT_IMG} alt="הילית כספי" loading="lazy" decoding="async" className="w-full max-w-md mx-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -bottom-6 -left-6 bg-[#191265] text-white rounded-2xl p-5 shadow-xl max-w-[200px]">
                <div className="text-[#ffe27c] font-black text-2xl">300+</div>
                <div className="text-white/80 text-sm">נשים שמצאו אהבה</div>
              </div>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">הסיפור שלי</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6 leading-tight">
              פיצחתי את הקוד.<br />
              <span className="text-[#1800ad]">ועכשיו אני מלמדת אותו.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-4 text-[#727272] leading-relaxed text-base">
              <p>
                שנים עסקתי בשאלה אחת: <strong className="text-[#191265]">למה אנשים טובים, חכמים ואוהבים - לא מצליחים למצוא אהבה?</strong>
              </p>
              <p>
                ליוויתי מאות נשים - מרצות, עורכות דין, רופאות, יזמיות - שהצליחו בכל תחום בחיים, אבל הרגישו אבודות לגמרי בעולם הדייטינג.
              </p>
              <p>
                גיליתי שהבעיה אף פעם לא הייתה "שאין גברים טובים" או "שהן לא מספיק יפות". הבעיה הייתה תמיד <strong className="text-[#191265]">דפוסים עמוקים שפועלים מתחת לפני השטח</strong> - ומשכפלים את אותה תוצאה שוב ושוב.
              </p>
              <p>
                פיתחתי שיטה ייחודית שמשלבת פסיכולוגיה, אינטואיציה, וניסיון מעשי של שנים - ועם השיטה הזו, <strong className="text-[#191265]">מאות נשים מצאו את הזוגיות שחלמו עליה.</strong>
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              {["פסיכולוגיה חיובית וNLP", "מרצה", "Matchmaker", "בעלת פודקאסט", "מומחית לדפוסים זוגיים"].map(tag => (
                <span key={tag} className="bg-[#191265] text-white text-sm px-4 py-2 rounded-full font-medium">{tag}</span>
              ))}
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── THE METHOD ── */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto text-center">
             <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">השיטה שלי</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
              מדע האהבה וקסם החיבור
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/60 text-lg mb-14 max-w-2xl mx-auto">
              אני מאמינה שאהבה אמיתית היא גם מדע וגם קסם. אני לא רק עושה התאמות, אני מלווה אנשים לבחור נכון, להפסיק לפחוד ולהיכנס לאהבה בעזרת כלים מדעיים אמיתיים.
            </motion.p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  title: "מה באמת יוצר זוגיות טובה",
                  text: "המחקר מוכיח שוב ושוב שהכימיה לבדה לא מספיקה. מה שבאמת נשאר הוא תחושת הבית, הערכים המשותפים, והיכולת לראות אחד את השני באור אמתי.",
                  color: "#ffe27c",
                },
                {
                  num: "02",
                  title: "ליווי, הכוונה וכלים אמיתיים",
                  text: "אני מלמדת איך לזהות את האדם הנכון לך, איך להפסיק לתת לפחדים לשלוט ואיך להיכנס לאהבה מתוך בחירה ולא מתוך פחד. כל זה בעזרת הסברים מדעיים שנותנים שפה למה שקורה בפנים.",
                  color: "#1800ad",
                },
                {
                  num: "03",
                  title: "מכאן נולדות ההתאמות",
                  text: "כל התאמה שאני עושה בנויה על הבנה עמוקה של שני הצדדים. לא רק מה הם רוצים, אלא מה יגרום להם להרגיש שהם בית אצל האחר.",
                  color: "#ffe27c",
                },
              ].map(({ num, title, text, color }) => (
                <motion.div key={num} variants={fadeUp}
                  className="bg-white/5 border border-white/10 rounded-2xl p-8 text-right hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="text-5xl font-black mb-4" style={{ color: '#ffe27c' }}>{num}</div>
                  <h3 className="text-white font-bold text-xl mb-3">{title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">איך אני יכולה לעזור לך</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] leading-tight">
                בחרי את הדרך שלך<br />
                <span className="text-[#1800ad]">לזוגיות מאושרת</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "💛",
                  badge: "הכי פופולרי",
                  badgeColor: "bg-[#ffe27c] text-[#191265]",
                  title: "מאגר הרווקים",
                  subtitle: "Matchmaking אישי מדויק",
                  text: "גישה למאגר הרווקים הבלעדי שלי - אנשים רציניים שעברו סינון קפדני. אני עושה את ה-matching בשבילך, בצורה אישית ומדויקת.",
                  cta: "לפרטים ולהצטרפות",
                  ctaLink: "/database",
                  highlight: true,
                },
                {
                  icon: "💫",
                  badge: "💎 ליווי אישי",
                  badgeColor: "bg-[#191265] text-white",
                  title: "ליווי אישי",
                  subtitle: "תהליך עומק אישי",
                  text: "תהליך ליווי אישי מעמיק שבו עובדים יחד על הדפוסים, בונים את הפרופיל הנכון, ומוצאים את הדרך לזוגיות.",
                  cta: "לפרטים ולרכישה",
                  ctaLink: "/coaching",
                  highlight: false,
                },
                {
                  icon: "📖",
                  badge: "חינם",
                  badgeColor: "bg-green-100 text-green-700",
                  title: "המדריך החינמי",
                  subtitle: "4 דפוסים שהמוח שלך עושה ומעכבים אותך",
                  text: "המדע הפסיכולוגי שישנה את הדרך שבה מחפשים אהבה. מרוכז, ישיר, ומלא בכלים שאפשר ליישם עוד הלילה.",
                  cta: "הורידו חינם",
                  ctaAction: () => scrollTo("guide"),
                  highlight: false,
                },
              ].map(({ icon, badge, badgeColor, title, subtitle, text, cta, ctaLink, ctaAction, highlight }) => (
                <motion.div key={title} variants={fadeUp}
                  className={`rounded-3xl p-8 text-right flex flex-col border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    highlight ? "bg-[#191265] border-[#191265] text-white shadow-2xl scale-105" : "bg-[#f0eadc] border-[#e9e8e8]"
                  }`}>
                  <div className="flex items-start justify-between mb-6">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeColor}`}>{badge}</span>
                    <span className="text-4xl">{icon}</span>
                  </div>
                  <h3 className={`font-black text-xl mb-1 ${highlight ? "text-white" : "text-[#191265]"}`}>{title}</h3>
                  <p className={`text-sm font-medium mb-4 ${highlight ? "text-[#ffe27c]" : "text-[#1800ad]"}`}>{subtitle}</p>
                  <p className={`text-sm leading-relaxed flex-1 mb-8 ${highlight ? "text-white/75" : "text-[#727272]"}`}>{text}</p>
                  {ctaLink ? (
                    <a href={ctaLink}
                      className={`text-center font-bold py-3 rounded-xl transition-all duration-300 ${
                        highlight ? "bg-[#ffe27c] text-[#191265] hover:bg-white" : "bg-[#191265] text-white hover:bg-[#1800ad]"
                      }`}>
                      {cta}
                    </a>
                  ) : (
                    <button onClick={ctaAction}
                      className={`text-center font-bold py-3 rounded-xl transition-all duration-300 ${
                        highlight ? "bg-[#ffe27c] text-[#191265] hover:bg-white" : "bg-[#191265] text-white hover:bg-[#1800ad]"
                      }`}>
                      {cta}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" className="bg-[#191265] py-20 px-6" style={{ scrollMarginTop: '80px' }}>
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">כל המוצרים שלי</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white leading-tight">
                בחרי את הצעד הנכון<br />
                <span className="text-[#ffe27c]">עבורך עכשיו</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              {/* 1 - DNA Quiz (free) */}
              <motion.div variants={fadeUp} className="bg-white/10 border border-white/20 rounded-3xl p-6 text-right flex flex-col hover:bg-white/15 transition-all duration-300">
                <div className="text-3xl mb-3">🧬</div>
                <span className="inline-block bg-green-400/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">חינם לגמרי</span>
                <h3 className="text-white font-black text-base mb-2">אבחון DNA זוגי</h3>
                <p className="text-white/60 text-sm leading-relaxed flex-1 mb-5">
                  20 משפטים שחושפים את הטיפוס הזוגי שלך - ואיזה אדם מתאים לך בדיוק.
                </p>
                <a href="/dna-quiz" className="block bg-[#ffe27c] text-[#191265] font-black text-sm py-3 rounded-xl text-center hover:bg-white transition-colors">
                  לאבחון החינמי ←
                </a>
              </motion.div>

              {/* 2 - Digital Guide ₪149 */}
              <motion.div variants={fadeUp} className="bg-white/10 border border-white/20 rounded-3xl p-6 text-right flex flex-col hover:bg-white/15 transition-all duration-300">
                <div className="text-3xl mb-3">📖</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block bg-[#ffe27c]/20 text-[#ffe27c] text-xs font-bold px-3 py-1 rounded-full">הטבה מיוחדת</span>
                </div>
                <h3 className="text-white font-black text-base mb-1">לבחור נכון - המדריך המעשי</h3>
                <p className="text-[#ffe27c] font-black text-lg mb-1">₪149 <span className="text-white/40 line-through text-sm font-normal">₪249</span></p>
                <p className="text-white/60 text-sm leading-relaxed flex-1 mb-3">
                  שאלון אישי, 3 תרגילים מעמיקים לכל דפוס, וכלים מעשיים לבחירה מתוך חופש.
                </p>
                <p className="text-[#ffe27c]/70 text-xs mb-4">📖 שאלון אישי + תרגילים מעמיקים + כלים מעשיים</p>
                <a href="/guide" className="block bg-[#ffe27c] text-[#191265] font-black text-sm py-3 rounded-xl text-center hover:bg-white transition-colors">
                  לפרטים ורכישה
                </a>
              </motion.div>

              {/* 2.5 - Digital Course ₪249 */}
              <motion.div variants={fadeUp} className="bg-white/10 border border-[#ffe27c]/30 rounded-3xl p-6 text-right flex flex-col hover:bg-white/15 transition-all duration-300">
                <div className="text-3xl mb-3">🎓</div>
                <span className="inline-block bg-[#ffe27c]/20 text-[#ffe27c] text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">חדש!</span>
                <h3 className="text-white font-black text-base mb-1">המסע</h3>
                <p className="text-[#ffe27c] font-black text-lg mb-1">₪249 <span className="text-white/40 line-through text-sm font-normal">₪497</span></p>
                <p className="text-white/60 text-sm leading-relaxed flex-1 mb-3">
                  5 מודולים, מסע שלם מהכרת עצמך עד בניית זוגיות שנמשכת.
                </p>
                <p className="text-[#ffe27c]/70 text-xs mb-4">📚 קורס טקסטואלי + תרגילים מעשיים</p>
                <a href="/course" className="block bg-[#ffe27c] text-[#191265] font-black text-sm py-3 rounded-xl text-center hover:bg-white transition-colors">
                  לקורס המלא
                </a>
              </motion.div>

              {/* 3 - Database ₪149 */}
              <motion.div variants={fadeUp} className="bg-[#ffe27c] rounded-3xl p-6 text-right flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#191265] to-[#1800ad]" />
                <div className="text-3xl mb-3">💛</div>
                <span className="inline-block bg-[#191265]/15 text-[#191265] text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">הכי פופולרי</span>
                <h3 className="text-[#191265] font-black text-base mb-1">כניסה למאגר הרווקים</h3>
                <p className="text-[#191265] font-black text-lg mb-1">₪249 <span className="text-[#191265]/40 line-through text-sm font-normal">₪499</span></p>
                <p className="text-[#191265]/70 text-sm leading-relaxed flex-1 mb-3">
                  הפרופיל שלך נכנס למאגר הבלעדי. ההתאמות מבוססות על חישובים מתקדמים ועוברות אישור אישי של הילית לפני כל הצעה.
                </p>
                <p className="text-[#191265]/60 text-xs mb-4">כל שאלון עובר בעיניי אישית</p>
                <a href="/database" className="block bg-[#191265] text-white font-black text-sm py-3 rounded-xl text-center hover:bg-[#1800ad] transition-colors">
                  ♡ פרטים והצטרפות
                </a>
              </motion.div>

              {/* 4 - Intro Meeting */}
              <motion.div variants={fadeUp} className="bg-white/10 border border-white/20 rounded-3xl p-6 text-right flex flex-col hover:bg-white/15 transition-all duration-300">
                <div className="text-3xl mb-3">♡</div>
                <span className="inline-block bg-green-400/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">חינם</span>
                <h3 className="text-white font-black text-base mb-1">פגישת היכרות</h3>
                <p className="text-white/60 text-sm leading-relaxed flex-1 mb-5">
                  שיחה אישית איתי להבין איפה אני יכולה לעזור לך, בלי התחייבות.
                </p>
                <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer" className="block bg-[#ffe27c] text-[#191265] font-black text-sm py-3 rounded-xl text-center hover:bg-white transition-colors">
                  לתיאום פגישה ←
                </a>
              </motion.div>

              {/* 5 - Coaching ₪2,900 */}
              <motion.div variants={fadeUp} className="bg-white/10 border border-[#ffe27c]/40 rounded-3xl p-6 text-right flex flex-col hover:bg-white/15 transition-all duration-300">
                <div className="text-3xl mb-3">🤝</div>
                <span className="inline-block bg-[#ffe27c]/20 text-[#ffe27c] text-xs font-bold px-3 py-1 rounded-full mb-3 w-fit">💎 ליווי אישי</span>
                <h3 className="text-white font-black text-base mb-1">ליווי אישי - 8 או 12 פגישות</h3>
                <p className="text-[#ffe27c] font-black text-lg mb-1">מ-₪2,960</p>
                <p className="text-white/60 text-sm leading-relaxed flex-1 mb-3">
                  תהליך אישי עמוק - DNA זוגי, פרופיל, דפוסים, וליווי עד הזוגיות.
                </p>
                <p className="text-[#ffe27c]/70 text-xs mb-4">🎁 כניסה למאגר הרווקים כלולה בתהליך</p>
                <a href="/coaching" className="block bg-[#ffe27c] text-[#191265] font-black text-sm py-3 rounded-xl text-center hover:bg-white transition-colors">
                  לפרטים ולרכישה
                </a>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── MATCHMAKING ── */}
      <section id="matchmaking" className="bg-[#f0eadc] py-20 px-6" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">מאגר הרווקים הבלעדי</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6 leading-tight">
              לא אפליקציה.<br />
              <span className="text-[#1800ad]">Matchmaking אמיתי.</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-4 text-[#727272] leading-relaxed">
              <p>
                בניתי מאגר בלעדי של רווקים ורווקות שעברו סינון קפדני - אנשים רציניים שמחפשים זוגיות אמיתית, לא בילוי.
              </p>
              <p>
                אני לא מחברת אנשים בצורה אקראית. <strong className="text-[#191265]">כל חיבור עובר דרכי אישית</strong> - אני מכירה את שני הצדדים, מבינה מה כל אחד צריך, ורק אז מחברת.
              </p>
              <p>
                זה לא שידוך. זה <strong className="text-[#191265]">מדע של התאמה</strong> - עם לב.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: "✓", text: "סינון קפדני של כל המועמדים" },
                { icon: "✓", text: "היכרות אישית עם כל אחד" },
                { icon: "✓", text: "חיבורים מדויקים ומכוונים" },
                { icon: "✓", text: "ליווי לאורך כל התהליך" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm">
                  <span className="text-[#1800ad] font-black text-lg">{icon}</span>
                  <span className="text-[#191265] text-sm font-medium">{text}</span>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex gap-4">
              <a href="/database"
                className="bg-[#191265] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105">
                מלאו שאלון חינמי והצטרפו למאגר
              </a>
              <a href={LINKS.waDatabase} target="_blank" rel="noopener noreferrer"
                className="border-2 border-[#191265] text-[#191265] font-bold px-8 py-4 rounded-2xl hover:bg-[#191265] hover:text-white transition-all duration-300">
                שאלות? פנו אלינו בוואטסאפ
              </a>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={fadeUp} className="relative">
              <img src={CASUAL_IMG} alt="הילית כספי - מאגר רווקים" loading="lazy" decoding="async" className="w-full max-w-md mx-auto rounded-3xl object-cover shadow-2xl" />
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-[#191265] text-white rounded-2xl p-4 shadow-xl text-center">
                <div className="text-[#ffe27c] font-black text-xl">💎</div>
                <div className="text-white font-bold text-sm">מאגר בלעדי</div>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── TESTIMONIALS with couple photos ── */}
      <section className="bg-[#191265] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <motion.p variants={fadeUp} className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">סיפורי הצלחה אמיתיים</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white leading-tight">
                הם הכירו. הם בחרו. הם בנו.<br />
                <span className="text-[#ffe27c]">אחרי תהליך עם הילית.</span>
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp",
                  names: "מיכל ואורי",
                  when: "הכירו דרך המאגר, מרץ 2024",
                  text: "הגעתי להילית אחרי 5 שנים של דייטינג מתיש. תוך 3 חודשים הבנתי לגמרי מה עצר אותי. אנחנו ביחד כבר שנה.",
                  who: "מיכל, 34",
                },
                {
                  photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp",
                  names: "שירה ודניאל",
                  when: "הכירו בתהליך ליווי, ינואר 2024",
                  text: "חשבתי שאני יודעת מה אני מחפשת. הילית הראתה לי שחיפשתי בדיוק את מה שמזיק לי. השינוי היה מידי. היום אני בזוגיות הבריאה הראשונה שלי בחיים.",
                  who: "שירה, 29",
                },
                {
                  photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp",
                  names: "נועה ואיתי",
                  when: "הכירו דרך המאגר, נובמבר 2023",
                  text: "הייתי בטוחה שהגיל שלי הוא מכשול. הילית הוכיחה לי שזה בדיוק ההפך. המאגר שלה חיבר אותי לגבר שמעולם לא הייתי פוגשת לבד. אנחנו מאורסים.",
                  who: "נועה, 38",
                },
              ].map((t) => (
                <motion.div key={t.names} variants={fadeUp} className="bg-white rounded-2xl overflow-hidden shadow-xl">
                  <div className="relative h-56 overflow-hidden">
                    <img src={t.photo} alt={t.names} loading="lazy" decoding="async" className="w-full h-full object-cover object-[center_20%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191265]/80 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="text-white font-black text-base">{t.names}</div>
                      <div className="text-[#ffe27c] text-xs">{t.when}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-[#ffe27c] text-sm mb-2">★★★★★</div>
                    <p className="text-[#727272] text-sm leading-relaxed mb-3">"{t.text}"</p>
                    <p className="text-[#191265] text-xs font-semibold">{t.who}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── LEAD MAGNET ── */}
      <section id="guide" className="bg-white py-20 px-6" style={{ scrollMarginTop: '60px' }}>
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            {/* Free Guide CTA - top banner */}
            <motion.div variants={fadeUp} className="bg-[#f0eadc] border-2 border-[#ffe27c] rounded-3xl p-8 text-center mb-8">
              <div className="text-4xl mb-3">🎁</div>
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-2">חינם לגמרי</p>
              <h2 className="text-2xl md:text-3xl font-black text-[#191265] mb-3 leading-tight">
                4 מלכודות חשיבה שמעכבות אותך במציאת זוגיות
              </h2>
              <p className="text-[#727272] text-base mb-6 max-w-xl mx-auto">
                המדע הפסיכולוגי שישנה את הדרך שבה את מחפשת אהבה. שלחי את המייל ותקבלי את המדריך מייד.
              </p>
              <div className="max-w-md mx-auto">
                <FreeGuideForm />
              </div>
            </motion.div>

            {/* Two offers grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Offer 1 - Digital Guide ₪149 */}
              <motion.div variants={fadeUp} className="bg-white rounded-3xl p-8 shadow-sm border-2 border-[#e9e8e8] relative">
                <div className="mb-3">
                  <span className="bg-[#ffe27c] text-[#191265] text-xs font-black px-4 py-1.5 rounded-full">הטבה מיוחדת</span>
                </div>
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-xl font-black text-[#191265] mb-2">לבחור נכון - המדריך המעשי לזוגיות</h3>
                <p className="text-[#727272] text-sm leading-relaxed mb-4">
                  שאלון אישי, 3 תרגילים מעמיקים לכל דפוס, וכלים מעשיים לבחירה מתוך חופש. אחרי שקראת את המדריך החינמי - זה הצעד הבא.
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-black text-[#191265]">₪149</span>
                  <span className="text-[#727272] line-through text-lg">₪249</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">חסכת ₪100</span>
                </div>
                <div className="bg-[#f0eadc] rounded-xl p-4 mb-5 text-sm text-[#191265]/80 text-right">
                  <strong className="block mb-1">📖 מה כלול:</strong>
                  שאלון אישי, 3 תרגילים מעמיקים לכל דפוס, וכלים מעשיים לבחירה מתוך חופש
                </div>
                <a href="/guide"
                  className="block w-full bg-[#191265] text-white font-black text-base py-4 rounded-xl text-center hover:bg-[#1800ad] transition-all duration-300 hover:scale-[1.02] shadow-lg">
                  לפרטים ורכישה ←
                </a>
                <p className="text-center text-[#727272] text-xs mt-2">הטבה מיוחדת ₪149 (במקום ₪249)</p>
              </motion.div>

              {/* Offer 2 - Coaching Package with dual CTAs */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#191265] to-[#1800ad] rounded-3xl p-8 text-white relative">
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-white text-[#191265] text-xs font-black px-4 py-1.5 rounded-full">💎 ליווי אישי</span>
                  <span className="bg-[#ffe27c] text-[#191265] text-xs font-black px-3 py-1.5 rounded-full">⭐ הכי משתלם</span>
                </div>
                <h3 className="text-xl font-black mb-2">ליווי אישי - שתי תוכניות</h3>
                <p className="text-white/75 text-sm leading-relaxed mb-4">
                  תהליך "הבנה" (8 פגישות) או תהליך "המסע" (12 פגישות). שניהם כוללים כניסה למאגר הרווקים.
                </p>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl font-black">מ-₪2,960</span>
                </div>
                <div className="space-y-2 mb-6">
                  {["8-12 פגישות אישיות עם הילית","ניתוח DNA זוגי מעמיק","בניית פרופיל אמיתי ומושך","כלים לשינוי דפוסים"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <span className="text-[#ffe27c]">✓</span>
                      <span className="text-white/80">{item}</span>
                    </div>
                  ))}
                </div>
                {/* PRIMARY CTA */}
                <a href="/coaching"
                  className="block w-full bg-[#ffe27c] text-[#191265] font-black text-base py-4 rounded-2xl hover:bg-white transition-all duration-300 text-center shadow-xl mb-3">
                  ♡ פרטים ורכישה
                </a>
                <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer"
                  onClick={() => track({ eventType: "whatsapp_click", page: "/" })}
                  className="block w-full border-2 border-white/40 text-white font-semibold text-sm py-3 rounded-2xl hover:border-white/70 transition-all duration-300 text-center">
                  ♡ קודם רוצה לדבר? פגישת היכרות
                </a>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── PODCAST ── */}
      <section id="podcast" className="bg-[#f0eadc] py-20 px-6" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="relative">
              <img src={PODCAST_IMG} alt="פודקאסט למה אתם עדיין רווקים" loading="lazy" decoding="async" className="w-full max-w-md mx-auto rounded-3xl object-cover shadow-2xl" />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">הפודקאסט</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6 leading-tight">
              "למה אתם עדיין רווקים"
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] leading-relaxed mb-8 text-base">
              הפודקאסט שמדבר את מה שכולם חושבים אבל אף אחד לא אומר. שיחות אמיתיות, תובנות חדות, ואמת שמשנה נקודת מבט.
              <br /><br />
              כי לפעמים כל מה שצריך זה מישהי שתגיד לך את האמת - בלי לעטוף אותה בכותנה.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              <a href={LINKS.spotify} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#1DB954] text-white font-bold px-6 py-4 rounded-2xl hover:bg-[#1aa34a] transition-all duration-300 hover:scale-105">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                Spotify
              </a>
              <a href={LINKS.apple} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#191265] text-white font-bold px-6 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/></svg>
                Apple Podcasts
              </a>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHATSAPP COMMUNITY ── */}
      <section className="bg-[#191265] py-16 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} className="text-5xl mb-4">💬</motion.div>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-black text-white mb-4">
              הצטרפי לקהילה שלי
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              קבוצת וואטסאפ שקטה - תוכן בלעדי, תובנות שבועיות, ועדכונים ראשונים על כל מה שקורה. ללא ספאם.
            </motion.p>
            <motion.div variants={fadeUp}>
              <a href={LINKS.waGroup} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#25D366] text-white font-black text-lg px-10 py-5 rounded-2xl hover:bg-[#20ba57] transition-all duration-300 hover:scale-105 shadow-2xl">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                הצטרפי לקבוצה
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeUp} className="relative">
              <img src={PROFILE_IMG} alt="הילית כספי" loading="lazy" decoding="async" className="w-32 h-32 rounded-full object-cover mx-auto mb-8 shadow-xl border-4 border-[#191265]" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-6 leading-tight">
              מוכנה לשנות את הסיפור שלך?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              כל אחת מהנשים שליוויתי חשבה שהמצב שלה שונה. שהיא המקרה הקשה. שזה לא יעבוד בשבילה.
              <br /><br />
              <strong className="text-[#191265]">כולן טעו.</strong> ואני מאמינה שגם את תופתעי.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer"
                onClick={() => track({ eventType: "whatsapp_click", page: "/" })}
                className="bg-[#191265] text-white font-black text-lg px-10 py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105 shadow-xl">
                ♡ פגישת היכרות
              </a>
              <a href={LINKS.waCoaching} target="_blank" rel="noopener noreferrer"
                className="border-2 border-[#191265] text-[#191265] font-bold text-lg px-10 py-5 rounded-2xl hover:bg-[#191265] hover:text-white transition-all duration-300">
                שלחי הודעה בוואטסאפ
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>




      {/* ── PRESS / MEDIA ── */}
      <section className="bg-white py-16 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">כפי שסוקר בתקשורת</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-10">מדברים עליי</motion.h2>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6">
              <a href="https://www.atmag.co.il/ppost/%D7%94%D7%90%D7%99%D7%A9%D7%94-%D7%A9%D7%A4%D7%99%D7%A6%D7%97%D7%94-%D7%90%D7%AA-%D7%A7%D7%95%D7%93-%D7%94%D7%94%D7%AA%D7%90%D7%9E%D7%94-%D7%94%D7%96%D7%95%D7%92%D7%99%D7%AA/" target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 bg-[#f0eadc] rounded-2xl px-8 py-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 max-w-xs">
                <div className="text-2xl font-black text-[#191265] tracking-tight">את</div>
                <p className="text-[#191265] font-bold text-sm text-center leading-relaxed">
                  "האישה שפיצחה את קוד ההתאמה הזוגית"
                </p>
                <span className="text-[#1800ad] text-xs font-medium group-hover:underline">קריאת הכתבה המלאה ←</span>
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>
      {/* ── FOOTER ── */}
      <footer className="bg-[#191265] py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-10 text-right">
            <div>
              <h3 className="text-white font-black text-xl mb-4">♡ הילית כספי</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                מאמנת ומרצה למציאת זוגיות ואהבה.<br />
                Relationship Expert &amp; Matchmaker.
              </p>
            </div>
            <div>
              <h4 className="text-[#ffe27c] font-bold mb-4">קישורים מהירים</h4>
              <div className="flex flex-col gap-2 text-white/70 text-sm">
                <a href={LINKS.waIntro} target="_blank" rel="noopener noreferrer" onClick={() => track({ eventType: "whatsapp_click", page: "/" })} className="hover:text-[#ffe27c] transition-colors">פגישת היכרות</a>
                <a href={LINKS.waGroup} target="_blank" rel="noopener noreferrer" className="hover:text-[#ffe27c] transition-colors">קבוצת וואטסאפ</a>
                <a href={LINKS.spotify} target="_blank" rel="noopener noreferrer" className="hover:text-[#ffe27c] transition-colors">פודקאסט - Spotify</a>
                <a href={LINKS.apple} target="_blank" rel="noopener noreferrer" className="hover:text-[#ffe27c] transition-colors">פודקאסט - Apple</a>
                <a href="https://substack.com/@hilitcaspi" target="_blank" rel="noopener noreferrer" className="hover:text-[#ffe27c] transition-colors">ניוזלטר - Substack</a>
              </div>
            </div>
            <div>
              <h4 className="text-[#ffe27c] font-bold mb-4">עקבי אחרי</h4>
              <div className="flex gap-4">
                {[
                  { href: LINKS.instagram, label: "IG", icon: "📸" },
                  { href: LINKS.facebook, label: "Facebook", icon: "👥" },
                  { href: LINKS.tiktok, label: "Tiktok", icon: "🎵" },
                  { href: "https://substack.com/@hilitcaspi", label: "Substack", icon: "📩" },
                ].map(({ href, label, icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-[#ffe27c]/20 transition-all duration-300 hover:scale-110" style={{ color: '#f8f7f7', fontSize: '16px' }}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 mb-4">
            <h4 className="text-[#ffe27c] font-bold mb-3 text-sm text-right">תקנונים ומדיניות</h4>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-white/55 text-xs justify-end">
              <a href="/terms/guide" className="hover:text-[#ffe27c] transition-colors">תקנון מדריך</a>
              <a href="/terms/database" className="hover:text-[#ffe27c] transition-colors">תקנון מאגר רווקים</a>
              <a href="/terms/single-session" className="hover:text-[#ffe27c] transition-colors">תקנון פגישה בודדת</a>
              <a href="/terms/course" className="hover:text-[#ffe27c] transition-colors">תקנון קורס</a>
              <a href="/terms/coaching" className="hover:text-[#ffe27c] transition-colors">תקנון ליווי אישי</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 space-y-2">
            <div className="flex items-center justify-between text-white/40 text-sm">
              <span>© 2024–2025 הילית כספי. כל הזכויות שמורות.</span>
              <a href="/crm" className="hover:text-white/70 transition-colors text-xs">ניהול CRM</a>
            </div>
            <p className="text-white/25 text-xs text-right leading-relaxed">
              שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים. אין להעתיק, לשכפל או להשתמש בכל חלק מהם ללא אישור בכתב.
            </p>
          </div>
        </div>
      </footer>


      {/* ── FLOATING WHATSAPP ── */}
      <motion.a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: isMobile ? 2.5 : 1.5, type: "spring" }}
        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-[#ffe27c] rounded-full" />
      </motion.a>

    </div>
    </LazyMotion>
  );
}
