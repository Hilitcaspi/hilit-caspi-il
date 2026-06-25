/**
 * US English Free Guide Page — matchbyhilit.com/guide
 * Lead magnet: free relationship guide download
 * No em-dashes. American market framing.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20your%20services.";

// Countdown timer component
function CountdownTimer() {
  const [time, setTime] = useState(() => {
    const stored = localStorage.getItem("guide_timer_end");
    if (stored) {
      const remaining = parseInt(stored) - Date.now();
      if (remaining > 0) return Math.floor(remaining / 1000);
    }
    const end = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("guide_timer_end", String(end));
    return 24 * 60 * 60;
  });

  useEffect(() => {
    const t = setInterval(() => setTime(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 justify-center">
      {[{ v: h, l: "hrs" }, { v: m, l: "min" }, { v: s, l: "sec" }].map(({ v, l }, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-[#ffe27c] font-black text-lg">:</span>}
          <span className="bg-[#ffe27c] text-[#191265] font-black text-xl px-3 py-1 rounded-lg min-w-[3rem] text-center">
            {pad(v)}
            <span className="block text-[9px] font-semibold">{l}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function EnGuide() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitLead = trpc.leads.submit.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await submitLead.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        lang: "en",
        utmSource: "en_guide_page",
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

      {/* HERO */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              Free Guide - No Credit Card Required
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              The 4 Thinking Traps
              <br />
              <span className="text-[#ffe27c]">Keeping You Single</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-4">
              A free science-backed guide from relationship expert Hilit Caspi. Based on positive psychology research and over a decade of real matchmaking experience.
            </p>
            <p className="text-white/60 text-base">
              Most readers say this is the most honest thing they have ever read about dating. It is not about trying harder. It is about thinking differently.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FORM */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                <div className="bg-white rounded-3xl p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-[#191265] mb-2 text-center">Get your free guide</h2>
                  <p className="text-[#727272] text-sm text-center mb-6">Enter your details and I will send it straight to your inbox.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#191265] mb-1">Your name</label>
                      <input value={name} onChange={e => setName(e.target.value)} required
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                        placeholder="First name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#191265] mb-1">Email address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e0d8cc] bg-white text-[#191265] focus:outline-none focus:border-[#191265] transition-all"
                        placeholder="your@email.com" />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] shadow-lg disabled:opacity-60">
                      {loading ? "Sending..." : "Send Me the Free Guide"}
                    </button>
                    <p className="text-center text-xs text-[#727272]">
                      No spam. Unsubscribe anytime.
                    </p>
                  </form>
                </div>

                {/* What's inside */}
                <div className="mt-10">
                  <h3 className="text-xl font-black text-[#191265] mb-6 text-center">What is inside the guide</h3>
                  <div className="space-y-3">
                    {[
                      "The 4 cognitive biases that cause smart, successful people to miss real connections (and how to override them)",
                      "Why your gut feeling about a first date is often completely wrong, and what to pay attention to instead",
                      "The science of miswanting: how your brain tricks you into wanting the wrong things in a partner",
                      "A simple framework for evaluating compatibility that actually predicts long-term happiness",
                      "The first step to take today that will change how you approach every future date",
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start bg-white rounded-xl p-4">
                        <span className="text-[#ffe27c] text-xl mt-0.5 font-black shrink-0">{i + 1}</span>
                        <p className="text-[#191265] font-medium text-sm">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic roadmap note */}
                <div className="mt-8 bg-[#191265] rounded-2xl p-6 text-center">
                  <p className="text-[#ffe27c] text-sm font-bold uppercase tracking-widest mb-2">Part of a complete roadmap</p>
                  <p className="text-white/75 text-sm leading-relaxed">
                    This guide is Step 2 of the Match by Hilit roadmap. It builds on the DNA quiz and prepares you for the full course. Every product is designed to take you one step closer to a real relationship.
                  </p>
                  <Link href="/dna" className="inline-block mt-4 text-[#ffe27c] text-sm font-semibold hover:underline">
                    Start with the free DNA quiz first
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="py-10">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">📖</div>
                  <h2 className="text-3xl font-black text-[#191265] mb-3">Check your inbox!</h2>
                  <p className="text-[#727272] text-lg">
                    The guide is on its way to <strong>{email}</strong>. It should arrive within a few minutes.
                  </p>
                </div>

                {/* Upsell to paid course */}
                <div className="bg-[#191265] rounded-3xl p-8 mb-6 text-center">
                  <p className="text-[#ffe27c] text-sm font-bold uppercase tracking-widest mb-3">Ready to go deeper?</p>
                  <h3 className="text-2xl font-black text-white mb-3">The Complete Course: Your Roadmap to Love</h3>
                  <p className="text-white/75 mb-4 max-w-md mx-auto">
                    The free guide shows you the 4 traps. The course gives you the complete system: 6 modules, personal exercises, and the exact framework I use with my private clients.
                  </p>
                  <p className="text-white/50 text-sm mb-2">Price going up in:</p>
                  <div className="mb-4">
                    <CountdownTimer />
                  </div>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <span className="text-white/40 text-xl line-through">$297</span>
                    <span className="text-[#ffe27c] text-4xl font-black">$197</span>
                  </div>
                  <Link href="/course"
                    className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-10 py-4 rounded-2xl hover:bg-white transition-all duration-300">
                    Get the Course for $197
                  </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dna"
                    className="bg-white border-2 border-[#191265] text-[#191265] font-bold px-6 py-3 rounded-2xl hover:bg-[#f0eadc] transition-all duration-300 text-center">
                    Take the Free DNA Quiz
                  </Link>
                  <Link href="/database"
                    className="bg-white border-2 border-[#191265] text-[#191265] font-bold px-6 py-3 rounded-2xl hover:bg-[#f0eadc] transition-all duration-300 text-center">
                    Join the Singles Database
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          </div>
          <div className="text-white/30 text-xs">© {new Date().getFullYear()} Hilit Caspi. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
