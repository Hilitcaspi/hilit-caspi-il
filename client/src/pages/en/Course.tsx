/**
 * US English Course Page — matchbyhilit.com/course
 * "The Journey" — Online self-paced course
 * American market framing, countdown timer, strikethrough pricing, no em-dashes
 */

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const PODCAST_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-podcast_32b046c8.png";
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20The%20Journey%20course.";

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
    const stored = localStorage.getItem("en_course_countdown");
    if (stored) {
      const diff = parseInt(stored) - Date.now();
      if (diff > 0) return diff;
    }
    const end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem("en_course_countdown", String(end));
    return hours * 60 * 60 * 1000;
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const stored = localStorage.getItem("en_course_countdown");
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

const MODULES = [
  {
    num: "01",
    title: "Your relationship DNA",
    text: "Discover your attachment style, your core relationship patterns, and the unconscious beliefs that have been quietly driving your choices. This is where clarity begins.",
  },
  {
    num: "02",
    title: "The miswanting trap",
    text: "Research in positive psychology shows we are often wrong about what will make us happy in a relationship. This module teaches you how to tell the difference between what you think you want and what you actually need.",
  },
  {
    num: "03",
    title: "What actually predicts relationship success",
    text: "The science of compatibility: which factors genuinely matter for long-term happiness, which ones do not, and how to evaluate a potential partner beyond surface-level attraction.",
  },
  {
    num: "04",
    title: "Breaking the pattern",
    text: "If you keep attracting the same dynamic with different people, this module is for you. You will identify the specific loop that has been keeping you stuck and learn the practical tools to interrupt it.",
  },
  {
    num: "05",
    title: "Building authentic connection",
    text: "How to show up fully in early dating, create genuine intimacy, and avoid the common mistakes that kill real connection before it has a chance to grow.",
  },
  {
    num: "06",
    title: "Your personal roadmap",
    text: "A concrete, personalized action plan for the next 90 days. Inner work combined with practical dating strategy. This is where everything comes together.",
  },
];

export default function EnCourse() {
  const countdown = useCountdown(48);
  const pad = (n: number) => String(n).padStart(2, "0");

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* NAVBAR */}
      <nav className="bg-[#191265] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl">Match by Hilit</Link>
          <div className="flex items-center gap-6 text-white/80 text-sm">
            <Link href="/database" className="hover:text-[#ffe27c] transition-colors">Database</Link>
            <Link href="/guide" className="hover:text-[#ffe27c] transition-colors">Free Guide</Link>
            <button onClick={scrollToPricing}
              className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full hover:bg-white transition-all">
              Enroll Now
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              Online Course · Self-Paced · Lifetime Access
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              The Journey
            </h1>
            <h2 className="text-2xl font-bold text-[#ffe27c] mb-6">
              Your Complete Roadmap to Lasting Love
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              You have been doing everything right and still ending up alone. The problem is not effort. It is strategy. This course gives you the exact framework I use with my private clients, built on the science of happiness and long-term relationship research.
            </p>

            {/* Countdown urgency */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-6 inline-block">
              <div className="text-[#ffe27c] text-xs font-semibold uppercase tracking-widest mb-2">Introductory price ends in</div>
              <div className="flex gap-3 text-white font-black text-2xl">
                <span>{pad(countdown.h)}<span className="text-white/40 text-sm font-normal">h</span></span>
                <span className="text-white/40">:</span>
                <span>{pad(countdown.m)}<span className="text-white/40 text-sm font-normal">m</span></span>
                <span className="text-white/40">:</span>
                <span>{pad(countdown.s)}<span className="text-white/40 text-sm font-normal">s</span></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={scrollToPricing}
                className="bg-[#ffe27c] text-[#191265] font-black text-xl px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center">
                Enroll for $197
              </button>
              <Link href="/guide"
                className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all duration-300 text-center">
                Get the Free Guide First
              </Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="Hilit Caspi" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
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

      {/* WHO THIS IS FOR */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Is this you?</p>
              <h2 className="text-3xl font-black text-[#191265]">
                This course is for people who are done guessing
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "You are smart, successful, and genuinely ready for a relationship but it keeps not working out",
                "You have been on hundreds of dates and still cannot figure out why nothing sticks",
                "You keep attracting the same type of person and ending up in the same dynamic",
                "You have done the therapy and the self-work but the relationship piece is still missing",
                "You want to understand the science behind compatibility, not just follow your gut",
                "You are ready to stop hoping and start building a real strategy",
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-3 items-start bg-[#f0eadc] rounded-xl p-4">
                  <span className="text-[#ffe27c] text-xl mt-0.5 shrink-0">✓</span>
                  <p className="text-[#191265] font-medium text-sm">{item}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">The Curriculum</p>
              <h2 className="text-3xl font-black text-[#191265]">6 modules. A complete transformation.</h2>
            </motion.div>
            <div className="space-y-4">
              {MODULES.map(({ num, title, text }) => (
                <motion.div key={num} variants={fadeUp} className="flex gap-5 items-start p-6 rounded-2xl bg-white">
                  <div className="w-12 h-12 rounded-full bg-[#191265] text-[#ffe27c] font-black text-sm flex items-center justify-center flex-shrink-0">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-[#191265] font-bold text-lg mb-1">{title}</h3>
                    <p className="text-[#727272] text-sm leading-relaxed">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* STRATEGIC ROADMAP */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">The Complete Roadmap</p>
              <h2 className="text-3xl font-black text-white">Every product builds on the last</h2>
              <p className="text-white/70 text-lg mt-4 max-w-2xl mx-auto">
                The Journey is Step 3 of the Match by Hilit roadmap. Each step prepares you for the next.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "DNA Quiz", desc: "Free", note: "Understand your type", active: false },
                { step: "2", title: "Free Guide", desc: "Free", note: "See the 4 traps", active: false },
                { step: "3", title: "The Journey", desc: "$197", note: "Build your strategy", active: true },
                { step: "4", title: "Database", desc: "$99", note: "Meet real matches", active: false },
              ].map(({ step, title, desc, note, active }) => (
                <motion.div key={step} variants={fadeUp}
                  className={`rounded-2xl p-5 text-center ${active ? "bg-[#ffe27c]" : "bg-white/10"}`}>
                  <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${active ? "text-[#191265]" : "text-white/50"}`}>Step {step}</div>
                  <div className={`text-lg font-black mb-1 ${active ? "text-[#191265]" : "text-white"}`}>{title}</div>
                  <div className={`text-sm font-semibold mb-1 ${active ? "text-[#191265]/70" : "text-[#ffe27c]"}`}>{desc}</div>
                  <div className={`text-xs ${active ? "text-[#191265]/60" : "text-white/50"}`}>{note}</div>
                  {active && <div className="mt-2 text-xs font-bold text-[#191265] bg-white/50 rounded-full px-2 py-0.5 inline-block">You are here</div>}
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Enroll Today</p>
              <h2 className="text-3xl font-black text-[#191265] mb-8">Ready to stop leaving love to chance?</h2>

              <div className="bg-[#191265] rounded-3xl p-8">
                <div className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-4">The Journey Course</div>

                {/* Countdown in pricing */}
                <div className="mb-4">
                  <p className="text-white/50 text-xs mb-2">Introductory price ends in:</p>
                  <div className="flex gap-2 justify-center text-white font-black text-xl">
                    <span className="bg-white/10 rounded-lg px-3 py-2">{pad(countdown.h)}<span className="block text-[10px] font-normal text-white/50">hrs</span></span>
                    <span className="text-white/40 self-center">:</span>
                    <span className="bg-white/10 rounded-lg px-3 py-2">{pad(countdown.m)}<span className="block text-[10px] font-normal text-white/50">min</span></span>
                    <span className="text-white/40 self-center">:</span>
                    <span className="bg-white/10 rounded-lg px-3 py-2">{pad(countdown.s)}<span className="block text-[10px] font-normal text-white/50">sec</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mb-2">
                  <span className="text-white/40 text-2xl line-through">$297</span>
                  <span className="text-6xl font-black text-white">$197</span>
                </div>
                <div className="text-[#ffe27c] text-sm font-semibold mb-6">Save $100 today</div>
                <div className="text-white/60 text-sm mb-8">Self-paced · Lifetime access · 6 modules</div>

                <div className="space-y-3 text-left mb-8">
                  {[
                    "6 in-depth modules with video and written content",
                    "Personal workbook and exercises for each module",
                    "DNA personality quiz included (free)",
                    "Lifetime access, revisit anytime",
                    "Strategic roadmap for the next 90 days",
                    "Option to upgrade to personal coaching",
                  ].map(item => (
                    <div key={item} className="flex gap-3 items-center">
                      <span className="text-[#ffe27c]">✓</span>
                      <span className="text-white/80 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-[#ffe27c] text-[#191265] font-black text-xl py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-2xl text-center">
                  Enroll for $197
                </a>
                <p className="text-white/40 text-xs mt-4">Secure payment · Instant access · No subscription</p>
              </div>

              <p className="text-[#727272] text-sm mt-8">
                Not sure yet?{" "}
                <Link href="/guide" className="text-[#191265] font-semibold underline">
                  Download the free guide first
                </Link>
              </p>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* BUNDLE OFFER */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="bg-[#f0eadc] rounded-3xl p-8 text-center">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">Best Value</p>
              <h3 className="text-2xl font-black text-[#191265] mb-3">Course + Database Bundle</h3>
              <p className="text-[#727272] mb-4">
                Get The Journey course AND join the singles database. Learn the system, then meet real matches. The complete path from clarity to connection.
              </p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="text-[#727272] text-xl line-through">$296</span>
                <span className="text-4xl font-black text-[#191265]">$249</span>
                <span className="bg-[#ffe27c] text-[#191265] text-xs font-bold px-3 py-1 rounded-full">Save $47</span>
              </div>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300">
                Get the Bundle
              </a>
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
            <Link href="/coaching" className="hover:text-white transition-colors">Coaching</Link>
            <Link href="/guide" className="hover:text-white transition-colors">Free Guide</Link>
          </div>
          <div className="text-white/30 text-xs">© {new Date().getFullYear()} Hilit Caspi. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
