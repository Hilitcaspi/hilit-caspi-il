/**
 * US English Database Sales Page — /en/database
 * $149 one-time fee, Stripe payment (placeholder until Stripe is configured)
 * Features: curated matching, DNA quiz, geographic + Zoom flexibility
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const CASUAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const PODCAST_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-podcast_32b046c8.png";
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20learning%20more%20about%20your%20services.";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

function useCountdown(hours = 48) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem("en_database_countdown");
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem("en_database_countdown", String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem("en_database_countdown");
        if (stored) {
          const diff = parseInt(stored) - Date.now();
          return diff > 0 ? diff : 0;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  return { h, m, s };
}

export default function EnDatabaseSales() {
  const countdown = useCountdown(48);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToPayment = () => {
    document.getElementById("payment")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-wide">
            Match by Hilit
          </Link>
          <button onClick={scrollToPayment}
            className="bg-[#ffe27c] text-[#191265] font-bold px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
            Join Now for $99
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-[#191265] overflow-hidden pt-28 pb-20 px-6">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 70% 30%, #1800ad 0%, transparent 50%)" }} />

        <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              4,000+ Serious Singles ✦ Human-Curated Matching
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              The Singles Database
              <br />
              <span className="text-[#ffe27c]">built for people who are ready.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              Not another app. Not another algorithm. A private, curated community of serious singles, matched by a relationship expert using science, psychology, and personal intuition.
            </p>

            {/* Countdown */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-8 inline-block">
              <div className="text-[#ffe27c] text-xs font-semibold uppercase tracking-widest mb-2">Price going up in</div>
              <div className="flex gap-3 text-white font-black text-2xl">
                <span>{String(countdown.h).padStart(2, "0")}<span className="text-white/40 text-sm font-normal">h</span></span>
                <span className="text-white/40">:</span>
                <span>{String(countdown.m).padStart(2, "0")}<span className="text-white/40 text-sm font-normal">m</span></span>
                <span className="text-white/40">:</span>
                <span>{String(countdown.s).padStart(2, "0")}<span className="text-white/40 text-sm font-normal">s</span></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={scrollToPayment}
                className="bg-[#ffe27c] text-[#191265] font-black text-xl px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center">
                Join the Database for $99
              </button>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                Questions? Chat on WhatsApp
              </a>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="Hilit Caspi" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              {/* Podcast credibility badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl overflow-hidden w-36">
                <img src={PODCAST_IMG} alt="" className="w-full h-16 object-cover" />
                <div className="px-3 py-2">
                  <div className="text-[#191265] font-black text-xs">200K+ listeners</div>
                  <div className="text-[#727272] text-[10px]">Relationship podcast</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT MAKES IT DIFFERENT ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Not what you've tried before</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                Why the database works when apps don't
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: "🔬",
                  title: "Science-based compatibility",
                  text: "Every match is evaluated using psychological models that actually predict relationship success, not just shared interests or physical attraction.",
                },
                {
                  icon: "👁️",
                  title: "Human eyes on every match",
                  text: "I personally review and propose each match. There's no algorithm deciding your future. A real expert is involved at every step.",
                },
                {
                  icon: "🔒",
                  title: "Fully private and discreet",
                  text: "Your profile is never publicly searchable. Contact details are only shared when both people explicitly consent to the introduction.",
                },
                {
                  icon: "🌍",
                  title: "Geographic flexibility",
                  text: "Matches are weighted by proximity. If you're open to Zoom-first connections, you can opt in and access a much larger pool.",
                },
                {
                  icon: "🧬",
                  title: "DNA personality quiz included",
                  text: "Before you even register, you'll discover your relationship personality type. This shapes how I match you and what you learn about yourself.",
                },
                {
                  icon: "📋",
                  title: "Deep scientific questionnaire",
                  text: "After joining, you'll complete a deeper questionnaire that helps me understand your values, patterns, and what you truly need in a partner.",
                },
              ].map(({ icon, title, text }) => (
                <motion.div key={title} variants={fadeUp} className="flex gap-5 items-start p-6 rounded-2xl bg-[#f0eadc]">
                  <span className="text-3xl mt-1">{icon}</span>
                  <div>
                    <h3 className="text-[#191265] font-bold text-lg mb-2">{title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">Who joins the database?</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "Professionals who are too busy for endless swiping but serious about finding a partner",
                "People who've tried every app and are ready for a completely different approach",
                "Those who want to be matched by a human expert, not an algorithm",
                "Singles who are emotionally ready for a real, lasting relationship",
                "Anyone who values depth, compatibility, and genuine connection over superficial attraction",
                "People open to both in-person and Zoom-first introductions",
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-3 items-start bg-white rounded-xl p-4">
                  <span className="text-[#ffe27c] text-xl mt-0.5">✓</span>
                  <p className="text-[#191265] font-medium">{item}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">The Process</p>
              <h2 className="text-3xl md:text-4xl font-black text-white">How it works, step by step</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { step: "01", title: "Take the free DNA Quiz", text: "Discover your relationship personality type. It takes 5 minutes and gives you real insight about yourself." },
                { step: "02", title: "Complete your profile", text: "Fill in your details, preferences, and what you're looking for. The more honest you are, the better your matches." },
                { step: "03", title: "Pay the one-time fee", text: "A single $99 payment (introductory price) gives you full access to the database and all matching services. No monthly fees." },
                { step: "04", title: "Complete the questionnaire", text: "A deeper scientific questionnaire (sent by email) helps me understand exactly who you need in a partner." },
                { step: "05", title: "Receive personal match proposals", text: "I review the database and propose matches. You'll get a message with details about the proposed match." },
                { step: "06", title: "Double opt-in introductions", text: "Both people must approve before contact details are shared. You're always in control." },
              ].map(({ step, title, text }) => (
                <motion.div key={step} variants={fadeUp} className="flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-full bg-[#ffe27c] text-[#191265] font-black text-sm flex items-center justify-center flex-shrink-0">
                    {step}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
                    <p className="text-white/65 text-sm leading-relaxed">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl font-black text-[#191265]">What members say</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  text: "After two years on apps with nothing real to show for it, I joined the database. Within 6 weeks I had my first match. We've been together for 8 months.",
                  name: "Jennifer R., 36",
                  city: "Boston",
                },
                {
                  text: "The questionnaire process alone was worth it. I understood things about what I actually need in a partner that I'd never been able to articulate before.",
                  name: "Michael T., 43",
                  city: "San Francisco",
                },
                {
                  text: "I was skeptical about the Zoom option, but my first match was someone two states away. We've been doing long-distance for 4 months and it's the most real connection I've ever had.",
                  name: "Amanda K., 39",
                  city: "Austin",
                },
              ].map(({ text, name, city }) => (
                <motion.div key={name} variants={fadeUp} className="bg-[#f0eadc] rounded-2xl p-6">
                  <div className="text-3xl text-[#191265] mb-4">"</div>
                  <p className="text-[#727272] text-sm leading-relaxed italic mb-6">{text}</p>
                  <div>
                    <div className="text-[#191265] font-bold text-sm">{name}</div>
                    <div className="text-[#727272] text-xs">{city}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── GEOGRAPHIC DISTANCE SECTION ── */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">Love Knows No Zip Code</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                Your perfect match may be in a different city. That's okay.
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
                Over 65% of US singles are open to long-distance dating. 84% say they'd relocate for the right person.
                Post-COVID, Zoom-first introductions have become the norm, not the exception.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                { stat: "65%", label: "of US singles open to long-distance", icon: "🗺️" },
                { stat: "84%", label: "willing to relocate for the right person", icon: "✈️" },
                { stat: "125mi", label: "average distance between matched couples", icon: "📍" },
              ].map(({ stat, label, icon }) => (
                <motion.div key={stat} variants={fadeUp} className="text-center bg-white/10 rounded-2xl p-6">
                  <div className="text-4xl mb-3">{icon}</div>
                  <div className="text-3xl font-black text-[#ffe27c] mb-2">{stat}</div>
                  <p className="text-white/70 text-sm">{label}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="bg-white/10 border border-white/20 rounded-2xl p-8">
              <h3 className="text-white font-black text-xl mb-4">How geographic matching works</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[#ffe27c] text-lg mt-0.5">✓</span>
                    <p className="text-white/80 text-sm">When you register, you choose your geographic comfort zone: local only, open to your state, open to neighboring states, or nationwide.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-[#ffe27c] text-lg mt-0.5">✓</span>
                    <p className="text-white/80 text-sm">Zoom-first introductions are standard for cross-city matches. You connect, build chemistry, and decide together when to meet in person.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-[#ffe27c] text-lg mt-0.5">✓</span>
                    <p className="text-white/80 text-sm">Matches are weighted by compatibility first, proximity second. A highly compatible person two states away may be a better fit than someone nearby.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-[#ffe27c] text-lg mt-0.5">✓</span>
                    <p className="text-white/80 text-sm">You always approve before any contact details are shared. Distance is never a surprise.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── PAYMENT SECTION ── */}
      <section id="payment" className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Join Today</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
                Ready to stop leaving love to chance?
              </h2>
              <p className="text-[#727272] text-lg">One payment. Lifetime access to the database and personal matching.</p>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-[#191265] rounded-3xl p-8 text-center">
              <div className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-2">One-time entry fee</div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-white/40 text-3xl line-through">$149</span>
                <span className="text-7xl font-black text-white">$99</span>
              </div>
              <div className="text-[#ffe27c] text-sm font-semibold mb-1">Save $50 · Introductory Price</div>
              <div className="text-white/60 text-sm mb-8">Full access · Personal matching · No monthly fees</div>

              <div className="space-y-3 text-left mb-8">
                {[
                  "Access to 4,000+ curated singles profiles",
                  "Personal match proposals from Hilit",
                  "DNA personality quiz (free, included)",
                  "Scientific questionnaire for deeper matching",
                  "Double opt-in introductions. You control what is shared.",
                  "Geographic + Zoom-flexible matching",
                ].map((item) => (
                  <div key={item} className="flex gap-3 items-center">
                    <span className="text-[#ffe27c] text-lg">✓</span>
                    <span className="text-white/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/join"
                className="block w-full bg-[#ffe27c] text-[#191265] font-black text-xl py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-2xl text-center">
                Join the Database for $99
              </Link>
              <p className="text-white/40 text-xs mt-4">Secure payment · Instant confirmation · No subscription</p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 text-center">
              <p className="text-[#727272] text-sm mb-4">Have a question before joining? We're happy to help.</p>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="inline-block border-2 border-[#191265] text-[#191265] font-bold px-8 py-3 rounded-xl hover:bg-[#191265] hover:text-white transition-all duration-300">
                Chat on WhatsApp
              </a>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl font-black text-[#191265]">Frequently asked questions</h2>
            </motion.div>
            <div className="space-y-4">
              {[
                {
                  q: "How long does it take to receive my first match?",
                  a: "Most members receive their first match proposal within 2-6 weeks of completing the scientific questionnaire. The timeline depends on your preferences and the current database composition.",
                },
                {
                  q: "What if I'm open to Zoom-first connections?",
                  a: "When you register, you can indicate that you're open to Zoom introductions. This significantly expands your potential match pool beyond your immediate geographic area.",
                },
                {
                  q: "Is my profile visible to everyone in the database?",
                  a: "No. Your profile is completely private. Only when Hilit proposes a specific match will that person see a brief description of you. Contact details are only exchanged after both people approve the introduction.",
                },
                {
                  q: "What happens after both people approve a match?",
                  a: "Once both parties give their consent, contact details are revealed and you can connect directly. Hilit is available for guidance throughout the process.",
                },
                {
                  q: "Is there a refund policy?",
                  a: "Due to the nature of the service and the immediate access to the database, payments are non-refundable. If you have questions before registering, reach out via WhatsApp and we'll be happy to help.",
                },
                {
                  q: "Can men join the database?",
                  a: "Yes. The database includes both men and women looking for serious relationships.",
                },
              ].map(({ q, a }) => (
                <FaqItem key={q} question={q} answer={a} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d0a3a] py-10 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-white font-bold text-lg mb-3 block">Match by Hilit</Link>
          <div className="flex justify-center gap-6 text-white/50 text-sm flex-wrap mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/coaching" className="hover:text-white transition-colors">Coaching</Link>
            <Link href="/course" className="hover:text-white transition-colors">Course</Link>
            <Link href="/guide" className="hover:text-white transition-colors">Free Guide</Link>
          </div>
          <div className="text-white/30 text-xs">© {new Date().getFullYear()} Hilit Caspi. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#e0d8cc] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-4 flex justify-between items-center bg-[#f0eadc] hover:bg-[#e8e0d0] transition-colors">
        <span className="font-bold text-[#191265]">{question}</span>
        <span className={`text-[#191265] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-6 py-4 bg-white text-[#727272] text-sm leading-relaxed">{answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
