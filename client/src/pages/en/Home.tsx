/**
 * Hilit Caspi — US English Landing Page (matchbyhilit.com)
 * Market: American singles, 30-50, dating-app-fatigued, busy professionals
 * Framing: Science of Love methodology, strategic roadmap to love
 * No em-dashes. No negative "you're broken" framing.
 */

import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const ABOUT_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const CASUAL_IMG  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";

const LINKS = {
  whatsapp:  "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20your%20services.",
  instagram: "https://www.instagram.com/match.by.hilit/",
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

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

const TESTIMONIALS = [
  {
    name: "Sarah M., 34",
    text: "I had been on every app imaginable. Within 3 months in the database, I met someone who actually fits who I am, not just my photos.",
    location: "New York, NY",
  },
  {
    name: "David K., 41",
    text: "As a physician I never had time for endless swiping. The curated approach here is completely different. I am now in a serious relationship with someone I would never have met otherwise.",
    location: "Chicago, IL",
  },
  {
    name: "Rachel T., 38",
    text: "After my divorce I was terrified to start over. The course gave me the clarity I needed. The database gave me real options. This system works.",
    location: "Los Angeles, CA",
  },
];

const PRODUCTS = [
  {
    step: "Step 1",
    icon: "🧬",
    title: "Free DNA Quiz",
    subtitle: "Know your relationship blueprint",
    desc: "Discover the hidden patterns shaping who you attract and why. Takes 5 minutes. Changes everything.",
    href: "/dna",
    cta: "Take the Quiz Free",
    accent: false,
  },
  {
    step: "Step 2",
    icon: "📖",
    title: "The Guide",
    subtitle: "Rewire the 4 thinking traps",
    desc: "A science-backed guide that reveals the 4 cognitive biases keeping smart people single. Most readers call it a turning point.",
    href: "/guide",
    cta: "Get the Guide",
    accent: false,
  },
  {
    step: "Step 3",
    icon: "🎓",
    title: "The Course",
    subtitle: "Build your complete roadmap",
    desc: "A self-paced program that takes you from confusion to clarity. You will understand exactly what you need, what to look for, and how to create a lasting connection.",
    href: "/course",
    cta: "Explore the Course",
    accent: true,
  },
  {
    step: "Step 4",
    icon: "💼",
    title: "Coaching Program",
    subtitle: "Personalized guidance over time",
    desc: "A structured coaching journey tailored to your specific situation. For those who want expert support at every stage.",
    href: "/coaching",
    cta: "See Coaching",
    accent: false,
  },
  {
    step: "Step 5",
    icon: "💛",
    title: "Singles Database",
    subtitle: "Meet real, vetted people",
    desc: "Join a curated network of serious singles across the US. Matches are made by hand, based on deep compatibility, not algorithms.",
    href: "/database",
    cta: "Join the Database",
    accent: false,
  },
];

export default function EnHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
    <Helmet>
      <title>Match by Hilit | Hilit Caspi | Relationship Coach & Matchmaker</title>
      <meta name="description" content="I cracked the secret code to finding love. Discover your Relationship DNA, join a curated singles database, and finally meet someone who truly fits you. Hundreds of couples found love. Now it's your turn." />
      <link rel="canonical" href="https://matchbyhilit.com" />
      <meta property="og:title" content="Match by Hilit | Hilit Caspi | Relationship Coach & Matchmaker" />
      <meta property="og:description" content="I cracked the secret code to finding love. Discover your Relationship DNA and get matched with someone who truly fits you. Hundreds of couples. Now it's your turn." />
      <meta property="og:url" content="https://matchbyhilit.com" />
      <meta property="og:locale" content="en_US" />
    </Helmet>
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-wide">Match by Hilit</Link>
          <div className="hidden md:flex items-center gap-8 text-white/90 text-sm font-medium">
            <button onClick={() => scrollTo("about")} className="hover:text-[#ffe27c] transition-colors">About</button>
            <button onClick={() => scrollTo("roadmap")} className="hover:text-[#ffe27c] transition-colors">How It Works</button>
            <Link href="/database" className="hover:text-[#ffe27c] transition-colors">Singles Database</Link>
            <Link href="/guide" className="hover:text-[#ffe27c] transition-colors">Free Guide</Link>
          </div>
          <Link href="/dna"
            className="hidden md:block bg-[#ffe27c] text-[#191265] font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
            Take the Free Quiz
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-2xl">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#191265] border-t border-white/10">
              <div className="flex flex-col px-6 py-4 gap-4 text-white text-base">
                <button onClick={() => scrollTo("about")} className="text-left hover:text-[#ffe27c] transition-colors py-1">About</button>
                <button onClick={() => scrollTo("roadmap")} className="text-left hover:text-[#ffe27c] transition-colors py-1">How It Works</button>
                <Link href="/database" className="hover:text-[#ffe27c] transition-colors py-1">Singles Database</Link>
                <Link href="/guide" className="hover:text-[#ffe27c] transition-colors py-1">Free Guide</Link>
                <Link href="/dna"
                  className="bg-[#ffe27c] text-[#191265] font-bold px-5 py-3 rounded-full text-center mt-2">
                  Take the Free Quiz
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen bg-[#191265] overflow-hidden flex items-center">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16 grid md:grid-cols-2 gap-12 items-center w-full">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              Relationship Scientist + Matchmaker
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              You are not bad at dating.
              <br />
              <span className="text-[#ffe27c]">You just need the right map.</span>
            </h1>

            <p className="text-white/75 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
              The apps are not broken. Your taste is not broken. What is missing is a science-based system that shows you exactly what you need, who fits you, and how to build something real.
              <br /><br />
              <span className="text-white font-semibold">That is what I built. And it works.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dna"
                className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center">
                🧬 Take the Free DNA Quiz
              </Link>
              <Link href="/database"
                className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                Join the Database
              </Link>
            </div>

            <div className="flex gap-4 mt-10 pt-8 border-t border-white/10 flex-wrap">
              {[
                { n: 4000, s: "+", label: "Singles in the network" },
                { n: 500, s: "+", label: "Guided to lasting love" },
                { n: 12, s: "+", label: "Years of research" },
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

          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="Hilit Caspi" className="relative w-72 md:w-96 h-auto rounded-3xl object-cover shadow-2xl" />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-2xl">💛</div>
                <div className="text-[#191265] font-black text-sm">Real Success</div>
                <div className="text-[#727272] text-xs">Stories</div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-2xl">↓</motion.div>
      </section>

      {/* PAIN POINTS */}
      <section className="bg-white py-20 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Sound familiar?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-12">
              You have tried everything.<br />
              <span className="text-[#727272] font-normal text-2xl">The problem is not effort. It is direction.</span>
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: "📱",
                  title: "App exhaustion is real",
                  text: "You have swiped thousands of profiles, had dozens of first dates that went nowhere, and spent hours on conversations that fizzled. The apps are designed to keep you searching, not to help you find.",
                },
                {
                  icon: "⏰",
                  title: "Your time is not infinite",
                  text: "You are building a career, managing a full life, and trying to date on top of it. The trial-and-error approach costs years. A strategic approach costs weeks.",
                },
                {
                  icon: "🔁",
                  title: "The same patterns keep showing up",
                  text: "Different person, same story. Research in positive psychology shows that without understanding your own relationship blueprint, you will keep attracting the same dynamic. Awareness changes everything.",
                },
              ].map(({ icon, title, text }) => (
                <motion.div key={title} variants={fadeUp} className="text-left p-6 rounded-2xl bg-[#f0eadc]">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-xl font-bold text-[#191265] mb-2">{title}</h3>
                  <p className="text-[#727272] leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-[#f0eadc] py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/20 to-[#191265]/10 rounded-3xl blur-xl" />
              <img src={ABOUT_IMG} alt="Hilit Caspi" className="relative w-full max-w-sm mx-auto rounded-3xl object-cover shadow-2xl" />
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">The Science of Love</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265] mb-6">
                I spent years studying why smart, wonderful people stay single.
              </h2>
              <p className="text-[#727272] leading-relaxed mb-4">
                I am Hilit Caspi, a relationship expert and matchmaker based on the science of happiness and long-term relationship research. For over a decade I have worked with hundreds of singles across the US and Israel, helping them understand the hidden patterns that drive their choices.
              </p>
              <p className="text-[#727272] leading-relaxed mb-4">
                What I found is that most people are not bad at relationships. They are operating without a map. They are choosing based on gut feelings and checklists that research shows have almost no connection to long-term happiness.
              </p>
              <p className="text-[#727272] leading-relaxed mb-8">
                My methodology combines positive psychology, compatibility science, and 12 years of hands-on matchmaking experience. The result is a clear, practical roadmap that takes you from where you are to where you want to be.
              </p>
              <Link href="/about"
                className="inline-block bg-[#191265] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#ffe27c] hover:text-[#191265] transition-all duration-300">
                Read My Story
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* STRATEGIC ROADMAP */}
      <section id="roadmap" className="bg-[#191265] py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #ffe27c 0%, transparent 60%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
                Your Complete Roadmap
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Every product builds on the last.
              </h2>
              <p className="text-white/70 text-xl max-w-3xl mx-auto leading-relaxed">
                This is not a collection of random services. Each step is designed to take you deeper into self-knowledge, clearer on what you need, and closer to a real relationship. Together, they form a complete strategic roadmap to love.
              </p>
            </motion.div>

            <div className="space-y-6">
              {PRODUCTS.map((p, i) => (
                <motion.div key={p.title} variants={fadeUp}
                  className={`rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${p.accent ? "bg-[#ffe27c]" : "bg-white/10 border border-white/15"}`}>
                  <div className={`text-4xl w-12 shrink-0 text-center`}>{p.icon}</div>
                  <div className="flex-1">
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${p.accent ? "text-[#191265]/60" : "text-[#ffe27c]/70"}`}>{p.step}</div>
                    <h3 className={`text-xl font-black mb-1 ${p.accent ? "text-[#191265]" : "text-white"}`}>{p.title}</h3>
                    <p className={`text-sm font-semibold mb-2 ${p.accent ? "text-[#191265]/70" : "text-white/60"}`}>{p.subtitle}</p>
                    <p className={`text-sm leading-relaxed ${p.accent ? "text-[#191265]/80" : "text-white/65"}`}>{p.desc}</p>
                  </div>
                  <Link href={p.href}
                    className={`shrink-0 font-bold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 text-sm whitespace-nowrap ${p.accent ? "bg-[#191265] text-white hover:bg-[#0d0a3a]" : "bg-[#ffe27c] text-[#191265] hover:bg-white"}`}>
                    {p.cta}
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-12 text-center">
              <p className="text-white/50 text-sm mb-4">Not sure where to start?</p>
              <Link href="/dna"
                className="inline-block bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all duration-300">
                Take the free DNA quiz and I will tell you exactly where to begin
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-white py-24 px-6">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Success Stories</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-12">
              Real people. Real results.
            </motion.h2>

            <motion.div variants={fadeUp} className="relative bg-[#f0eadc] rounded-3xl p-8 md:p-12 min-h-[200px]">
              <AnimatePresence mode="wait">
                <motion.div key={activeTestimonial}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}>
                  <p className="text-[#191265] text-xl md:text-2xl font-medium leading-relaxed mb-6 italic">
                    "{TESTIMONIALS[activeTestimonial].text}"
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#191265] flex items-center justify-center text-white font-bold text-sm">
                      {TESTIMONIALS[activeTestimonial].name[0]}
                    </div>
                    <div className="text-left">
                      <div className="text-[#191265] font-bold text-sm">{TESTIMONIALS[activeTestimonial].name}</div>
                      <div className="text-[#727272] text-xs">{TESTIMONIALS[activeTestimonial].location}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-6">
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setActiveTestimonial(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeTestimonial ? "bg-[#191265] w-6" : "bg-[#191265]/20"}`} />
                ))}
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* DATABASE HIGHLIGHT */}
      <section id="database" className="bg-[#191265] py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #ffe27c 0%, transparent 60%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <span className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
                The Flagship Product
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                The Singles Database
              </h2>
              <p className="text-white/75 text-lg leading-relaxed mb-6">
                A curated network of serious, vetted singles across New York, Miami, Los Angeles, and beyond. No swiping. No algorithms. Real introductions made by hand, based on deep compatibility.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Every member is personally reviewed",
                  "Matches based on values, personality, and life stage, not just photos",
                  "Zoom-friendly for long-distance connections across the US",
                  "Active in New York, Miami, Los Angeles, Chicago, and DC",
                ].map(item => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="text-[#ffe27c] mt-1">✓</span>
                    <span className="text-white/80">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/database"
                className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl">
                Join the Database
              </Link>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={fadeUp} className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/20 to-[#1800ad]/20 rounded-3xl blur-2xl" />
                <img src={CASUAL_IMG} alt="Hilit Caspi" className="relative w-full max-w-sm rounded-3xl object-cover shadow-2xl" />
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* FREE GUIDE CTA */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} className="bg-white rounded-3xl p-10 shadow-xl">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">Start Here for Free</p>
              <h2 className="text-3xl font-black text-[#191265] mb-4">
                The 4 Thinking Traps Keeping You Single
              </h2>
              <p className="text-[#727272] leading-relaxed mb-8 max-w-xl mx-auto">
                A free science-backed guide that reveals the 4 cognitive biases that cause smart, successful people to miss real connections. Most readers say it is the most honest thing they have ever read about dating.
              </p>
              <Link href="/guide"
                className="inline-block bg-[#191265] text-white font-black text-lg px-10 py-4 rounded-2xl hover:bg-[#ffe27c] hover:text-[#191265] transition-all duration-300 hover:scale-105 shadow-lg">
                Get the Free Guide
              </Link>
              <p className="text-[#727272] text-xs mt-4">No spam. Unsubscribe anytime.</p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0d0a3a] py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-3">Match by Hilit</h3>
              <p className="text-white/50 text-sm leading-relaxed">Science-based matchmaking and relationship coaching for serious singles across the US.</p>
              <div className="flex gap-4 mt-4">
                <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors text-sm">Instagram</a>
                <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors text-sm">WhatsApp</a>
              </div>
            </div>
            <div>
              <h4 className="text-white/70 font-semibold text-sm uppercase tracking-widest mb-3">Services</h4>
              <div className="flex flex-col gap-2">
                <Link href="/database" className="text-white/50 hover:text-white transition-colors text-sm">Singles Database</Link>
                <Link href="/course" className="text-white/50 hover:text-white transition-colors text-sm">The Course</Link>
                <Link href="/coaching" className="text-white/50 hover:text-white transition-colors text-sm">Coaching Program</Link>
                <Link href="/guide" className="text-white/50 hover:text-white transition-colors text-sm">Free Guide</Link>
                <Link href="/dna" className="text-white/50 hover:text-white transition-colors text-sm">DNA Quiz</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white/70 font-semibold text-sm uppercase tracking-widest mb-3">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href="/terms" className="text-white/50 hover:text-white transition-colors text-sm">Terms of Service</Link>
                <Link href="/privacy" className="text-white/50 hover:text-white transition-colors text-sm">Privacy Policy</Link>
                <Link href="/refunds" className="text-white/50 hover:text-white transition-colors text-sm">Refund Policy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-white/30 text-xs">
            © {new Date().getFullYear()} Hilit Caspi. All rights reserved. | matchbyhilit.com
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
