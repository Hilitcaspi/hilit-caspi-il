/**
 * US English Single Session Page — matchbyhilit.com/session
 * Currently fully booked — redirect to products
 * No em-dashes. American market framing.
 */

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";

const CASUAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-casual_dac3228f.jpg";
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20a%20single%20session%20when%20you%20have%20availability.";

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
    const stored = localStorage.getItem("en_session_countdown");
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem("en_session_countdown", String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem("en_session_countdown");
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

export default function EnSession() {
  const countdown = useCountdown(48);
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
              Single Sessions: Currently Fully Booked
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              My session calendar
              <br />
              <span className="text-[#ffe27c]">is completely full.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              I am currently not taking new single session bookings. I keep my schedule intentionally limited so I can give full attention to every person I work with.
            </p>
            <p className="text-white/60 text-base mb-8">
              The good news: everything I cover in a single session is available in my course and guide, at a fraction of the price, and you can access it right now. Many people find they get more from the course than they would from one session.
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
              <img src={CASUAL_IMG} alt="Hilit Caspi" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -top-3 -right-3 bg-red-500 text-white font-black text-xs px-3 py-2 rounded-xl shadow-lg">
                FULLY BOOKED
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHAT YOU CAN DO INSTEAD */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Start Now, Not Later</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                Get the same insights. Right now.
              </h2>
              <p className="text-[#727272] text-lg mt-4 max-w-2xl mx-auto">
                My course covers everything I address in single sessions, plus much more. And the database means you can start meeting real matches while you wait.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Course card */}
              <motion.div variants={fadeUp} className="bg-[#191265] rounded-3xl p-8">
                <div className="text-[#ffe27c] text-xs font-bold uppercase tracking-widest mb-3">Best Alternative to a Session</div>
                <h3 className="text-2xl font-black text-white mb-3">The Journey Course</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  6 modules that cover everything a single session would touch, and much more. Your patterns, your attachment style, the science of compatibility, and a concrete action plan. Self-paced, lifetime access.
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

              {/* Guide + Database */}
              <motion.div variants={fadeUp} className="space-y-5">
                {/* Free guide */}
                <div className="bg-[#f0eadc] rounded-2xl p-6 border-2 border-[#191265]/10">
                  <div className="text-[#1800ad] text-xs font-bold uppercase tracking-widest mb-2">Free</div>
                  <h3 className="text-xl font-black text-[#191265] mb-2">The Free Guide</h3>
                  <p className="text-[#727272] text-sm leading-relaxed mb-4">
                    The 4 thinking traps keeping you single. A 5-minute read that will change how you approach every future date.
                  </p>
                  <Link href="/guide"
                    className="block w-full bg-[#191265] text-white font-bold py-3 rounded-xl hover:bg-[#1800ad] transition-all duration-300 text-center">
                    Get the Free Guide
                  </Link>
                </div>

                {/* Database */}
                <div className="bg-[#f0eadc] rounded-2xl p-6 border-2 border-[#191265]/10">
                  <div className="text-[#1800ad] text-xs font-bold uppercase tracking-widest mb-2">One-time fee</div>
                  <h3 className="text-xl font-black text-[#191265] mb-2">The Singles Database</h3>
                  <p className="text-[#727272] text-sm leading-relaxed mb-3">
                    Join the curated network and start receiving personal match proposals. 4,000+ serious singles, matched by a human expert.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[#727272] text-lg line-through">$149</span>
                    <span className="text-2xl font-black text-[#191265]">$99</span>
                  </div>
                  <Link href="/database"
                    className="block w-full bg-[#191265] text-white font-bold py-3 rounded-xl hover:bg-[#1800ad] transition-all duration-300 text-center">
                    Join the Database
                  </Link>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* WHAT A SESSION COVERS */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">When Availability Returns</p>
              <h2 className="text-3xl font-black text-[#191265]">What a single session covers</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Understanding why a recent relationship did not work",
                "Getting clarity on whether to continue or end a current situation",
                "Breaking a specific pattern you keep repeating",
                "Preparing for a first date or important conversation",
                "Understanding your attachment style and how it shapes your choices",
                "Getting an outside perspective on a confusing situation",
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-3 items-start bg-white rounded-xl p-4">
                  <span className="text-[#ffe27c] text-xl mt-0.5 shrink-0">✓</span>
                  <p className="text-[#191265] font-medium text-sm">{item}</p>
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
                When session availability opens up, I reach out to the waitlist first. In the meantime, the course is the fastest way to get the clarity you are looking for.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="bg-[#ffe27c] text-[#191265] font-black px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 text-center">
                  Join the Waitlist
                </a>
                <Link href="/course"
                  className="border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                  Get the Course Instead
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
