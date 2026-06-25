/**
 * US English Coaching Page — matchbyhilit.com/coaching
 * Personal coaching: currently fully booked, redirect to products
 * American market framing, no em-dashes
 */

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const CASUAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20your%20coaching%20waitlist.";

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

function useCountdown(hours = 72) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem("en_coaching_countdown");
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem("en_coaching_countdown", String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem("en_coaching_countdown");
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

export default function EnCoaching() {
  const countdown = useCountdown(72);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* NAVBAR */}
      <nav className="bg-[#191265] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl">Match by Hilit</Link>
          <div className="flex items-center gap-6 text-white/80 text-sm">
            <Link href="/database" className="hover:text-[#ffe27c] transition-colors">Database</Link>
            <Link href="/course" className="hover:text-[#ffe27c] transition-colors">Course</Link>
            <Link href="/dna"
              className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full hover:bg-white transition-all">
              Free Quiz
            </Link>
          </div>
        </div>
      </nav>

      {/* FULLY BOOKED HERO */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            {/* Fully booked badge */}
            <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/40 text-red-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              Personal Coaching: Currently Fully Booked
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              My coaching calendar
              <br />
              <span className="text-[#ffe27c]">is completely full.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              I take on a very limited number of personal coaching clients at a time. Right now, every spot is taken. This is not a sales tactic. It is just the reality of doing this work with full attention and care.
            </p>
            <p className="text-white/60 text-base mb-8">
              While you wait for a spot to open, the smartest thing you can do is arrive prepared. My course and database will give you everything you need to hit the ground running when coaching becomes available.
            </p>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-block border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300">
              Join the Waitlist
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="Hilit Caspi" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              {/* Booked overlay badge */}
              <div className="absolute -top-3 -right-3 bg-red-500 text-white font-black text-xs px-3 py-2 rounded-xl shadow-lg">
                FULLY BOOKED
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ARRIVE PREPARED - PRODUCT RECOMMENDATIONS */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">While You Wait</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                Arrive to coaching already transformed
              </h2>
              <p className="text-[#727272] text-lg mt-4 max-w-2xl mx-auto">
                Clients who come to me having already done the course and joined the database get dramatically better results. They know themselves. They have a framework. They are ready to go deep immediately.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Course card */}
              <motion.div variants={fadeUp} className="bg-[#191265] rounded-3xl p-8">
                <div className="text-[#ffe27c] text-xs font-bold uppercase tracking-widest mb-3">Step 1 While You Wait</div>
                <h3 className="text-2xl font-black text-white mb-3">The Journey Course</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  6 modules built on the same methodology I use in personal coaching. Understand your patterns, learn the science of compatibility, and build a real strategy. By the time a coaching spot opens, you will already be a different person.
                </p>

                {/* Countdown */}
                <div className="bg-white/10 rounded-xl p-3 mb-4">
                  <p className="text-white/50 text-xs mb-2">Introductory price ends in:</p>
                  <div className="flex gap-2 text-white font-black text-lg">
                    <span>{pad(countdown.h)}<span className="text-white/40 text-xs font-normal">h</span></span>
                    <span className="text-white/40">:</span>
                    <span>{pad(countdown.m)}<span className="text-white/40 text-xs font-normal">m</span></span>
                    <span className="text-white/40">:</span>
                    <span>{pad(countdown.s)}<span className="text-white/40 text-xs font-normal">s</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <span className="text-white/40 text-lg line-through">$297</span>
                  <span className="text-3xl font-black text-[#ffe27c]">$197</span>
                  <span className="bg-[#ffe27c]/20 text-[#ffe27c] text-xs font-bold px-2 py-1 rounded-full">Save $100</span>
                </div>
                <Link href="/course"
                  className="block w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 text-center">
                  Get The Journey Course
                </Link>
              </motion.div>

              {/* Database card */}
              <motion.div variants={fadeUp} className="bg-[#f0eadc] rounded-3xl p-8 border-2 border-[#191265]/20">
                <div className="text-[#1800ad] text-xs font-bold uppercase tracking-widest mb-3">Step 2 While You Wait</div>
                <h3 className="text-2xl font-black text-[#191265] mb-3">The Singles Database</h3>
                <p className="text-[#727272] text-sm leading-relaxed mb-4">
                  Join the curated network of 4,000+ serious singles and start receiving personal match proposals. You do not have to wait for coaching to start meeting real people. I will personally propose matches that align with your profile.
                </p>

                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[#727272] text-lg line-through">$149</span>
                  <span className="text-3xl font-black text-[#191265]">$99</span>
                  <span className="bg-[#191265]/10 text-[#191265] text-xs font-bold px-2 py-1 rounded-full">Save $50</span>
                </div>
                <Link href="/database"
                  className="block w-full bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 text-center">
                  Join the Database
                </Link>
              </motion.div>
            </div>

            {/* Bundle */}
            <motion.div variants={fadeUp} className="mt-8 bg-gradient-to-r from-[#191265] to-[#1800ad] rounded-3xl p-8 text-center">
              <p className="text-[#ffe27c] text-sm font-bold uppercase tracking-widest mb-3">Best Value</p>
              <h3 className="text-2xl font-black text-white mb-3">Course + Database Bundle</h3>
              <p className="text-white/70 mb-4">
                Get both and arrive to coaching fully prepared. Learn the system, meet real matches, and be ready to go deep the moment a spot opens.
              </p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="text-white/40 text-xl line-through">$446</span>
                <span className="text-4xl font-black text-white">$249</span>
                <span className="bg-[#ffe27c] text-[#191265] text-xs font-bold px-3 py-1 rounded-full">Save $197</span>
              </div>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#ffe27c] text-[#191265] font-black px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300">
                Get the Bundle
              </a>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* WHAT COACHING LOOKS LIKE */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">When a Spot Opens</p>
              <h2 className="text-3xl font-black text-[#191265]">What personal coaching includes</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: "🎯",
                  title: "Personal 1:1 sessions",
                  text: "Deep coaching sessions focused on your specific patterns, blocks, and goals. Tailored work based on your DNA profile and life history.",
                },
                {
                  icon: "💎",
                  title: "Database access included",
                  text: "Your coaching package includes full access to the singles database. I will personally propose matches that align with your coaching work.",
                },
                {
                  icon: "🧬",
                  title: "DNA personality deep dive",
                  text: "A thorough exploration of your relationship personality type, how you attach, what you need, and what kind of partner will truly complement you.",
                },
                {
                  icon: "📱",
                  title: "WhatsApp support",
                  text: "Direct access between sessions for questions, reflections, and real-time guidance when you need it most.",
                },
                {
                  icon: "🗺️",
                  title: "Personalized roadmap",
                  text: "By the end of the process, you will have a clear, actionable roadmap for finding and building the relationship you want.",
                },
                {
                  icon: "🔄",
                  title: "Ongoing matching",
                  text: "As you progress through coaching, I continue to propose matches from the database, aligning inner work with real-world opportunities.",
                },
              ].map(({ icon, title, text }) => (
                <motion.div key={title} variants={fadeUp} className="flex gap-5 items-start p-6 rounded-2xl bg-white">
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

      {/* WAITLIST CTA */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl font-black text-white mb-4">Join the waitlist</h2>
              <p className="text-white/70 text-lg mb-8">
                When a coaching spot opens, I reach out to the waitlist first. In the meantime, get started with the course and database so you are ready to go deep from day one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="bg-[#ffe27c] text-[#191265] font-black px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 text-center">
                  Join the Waitlist
                </a>
                <Link href="/course"
                  className="border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                  Start with the Course
                </Link>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0d0a3a] py-10 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-white font-bold text-lg mb-3 block">Match by Hilit</Link>
          <div className="flex justify-center gap-6 text-white/50 text-sm flex-wrap mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/database" className="hover:text-white transition-colors">Database</Link>
            <Link href="/course" className="hover:text-white transition-colors">Course</Link>
            <Link href="/guide" className="hover:text-white transition-colors">Free Guide</Link>
          </div>
          <div className="text-white/30 text-xs">© {new Date().getFullYear()} Hilit Caspi. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
