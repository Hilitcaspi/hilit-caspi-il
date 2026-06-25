/**
 * US English About Page — matchbyhilit.com/about
 * Science of Love methodology, American market positioning
 * No em-dashes. Positive framing.
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";

const ABOUT_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const PODCAST_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-podcast_32b046c8.png";
const WA_LINK = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%27m%20interested%20in%20your%20services.";
const IG_LINK = "https://www.instagram.com/match.by.hilit/";

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

export default function EnAbout() {
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
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">About Hilit</p>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              I spent years studying
              <br />
              <span className="text-[#ffe27c]">the science of love.</span>
              <br />
              <span className="text-white/80 text-3xl">Here is what I found.</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed">
              I am Hilit Caspi, a relationship expert, matchmaker, and the creator of a methodology rooted in positive psychology and long-term relationship science. I have helped hundreds of people find lasting partnerships. Not through luck. Through a system that actually works.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={PROFILE_IMG} alt="Hilit Caspi" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
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

      {/* STORY */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <motion.div variants={fadeUp}>
                <img src={ABOUT_IMG} alt="Hilit working" className="w-full rounded-2xl object-cover shadow-xl" />
              </motion.div>
              <motion.div variants={fadeUp} className="space-y-5">
                <h2 className="text-3xl font-black text-[#191265]">Why I built this</h2>
                <p className="text-[#727272] leading-relaxed">
                  For years I sat across from people who were brilliant, successful, and genuinely ready for love. Doctors, lawyers, entrepreneurs, artists. People who had built extraordinary lives and still could not figure out why the relationship piece was not coming together.
                </p>
                <p className="text-[#727272] leading-relaxed">
                  They had tried the apps. They had been on hundreds of dates. They had done the therapy, read the books, taken the advice. And they were still single. Not because something was wrong with them. Because they were operating without a map.
                </p>
                <p className="text-[#727272] leading-relaxed">
                  Research in positive psychology shows that most people are remarkably poor at predicting what will make them happy in a relationship. We call this "miswanting." We chase the wrong signals, miss the right ones, and repeat the same patterns without realizing it.
                </p>
                <p className="text-[#191265] font-semibold leading-relaxed">
                  My methodology was built to solve exactly that. It combines the science of happiness, long-term relationship research, and over a decade of hands-on matchmaking experience. The result is a clear, practical roadmap that takes you from confusion to clarity to connection.
                </p>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">The Science of Love</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                What makes this approach different
              </h2>
              <p className="text-[#727272] text-lg mt-4 max-w-2xl mx-auto">
                This is not intuition dressed up as science. It is actual science, applied with genuine human care.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "🧬",
                  title: "Rooted in research",
                  text: "Every match is evaluated using psychological models that actually predict relationship success. Attachment theory, values alignment, life stage compatibility, personality dynamics. Not gut feelings. Evidence.",
                },
                {
                  icon: "🧠",
                  title: "Positive psychology first",
                  text: "I work from the principles of positive psychology. The goal is not to fix what is broken. It is to build on what is strong. Authentic connection, not a perfect checklist.",
                },
                {
                  icon: "🔁",
                  title: "Pattern awareness",
                  text: "Most people keep attracting the same dynamic with different people. I help you see the pattern clearly so you can choose differently. Awareness is the first step to real change.",
                },
                {
                  icon: "👁️",
                  title: "Human, not algorithmic",
                  text: "I personally review every profile. I know both sides of every match I propose. No algorithm can replicate the intuition that comes from thousands of hours of real human experience.",
                },
                {
                  icon: "🔒",
                  title: "Privacy and respect",
                  text: "Contact details are only shared when both people explicitly approve. You are always in control of what is revealed and when. No surprises.",
                },
                {
                  icon: "🗺️",
                  title: "A complete roadmap",
                  text: "Every product I offer builds on the last. The quiz, the guide, the course, the coaching, the database. Together they form a complete strategic path from where you are to where you want to be.",
                },
              ].map(({ icon, title, text }) => (
                <motion.div key={title} variants={fadeUp} className="bg-white rounded-2xl p-6">
                  <span className="text-3xl mb-4 block">{icon}</span>
                  <h3 className="text-[#191265] font-bold text-lg mb-2">{title}</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CREDENTIALS */}
      <section className="bg-[#191265] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-3xl font-black text-white">By the numbers</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { n: "4,000+", label: "Singles in the network" },
                { n: "200K+", label: "Podcast listeners" },
                { n: "500+", label: "People guided to love" },
                { n: "12+", label: "Years of research" },
              ].map(({ n, label }) => (
                <motion.div key={label} variants={fadeUp} className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-[#ffe27c] mb-2">{n}</div>
                  <div className="text-white/60 text-sm">{label}</div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* WHO I WORK WITH */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-12">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-4">Who I Work With</p>
              <h2 className="text-3xl font-black text-[#191265]">
                Serious people looking for serious love
              </h2>
              <p className="text-[#727272] text-lg mt-4 max-w-2xl mx-auto">
                My clients are not people who have given up. They are people who are done wasting time and ready to do this right.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Professionals in their 30s and 40s who are successful in every area of life except this one",
                "People who have tried the apps and are ready for a completely different approach",
                "Those who have been through a divorce or long relationship and want to start fresh with clarity",
                "Anyone who keeps attracting the same type and is ready to understand why",
                "People who want to arrive at a relationship prepared, not just hopeful",
                "Those who take their own growth seriously and want a partner who does too",
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

      {/* CTA */}
      <section className="bg-[#f0eadc] py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl font-black text-[#191265] mb-4">Ready to start?</h2>
              <p className="text-[#727272] text-lg mb-8">
                The best place to begin is the free DNA quiz. It takes 5 minutes and shows you exactly which step of the roadmap to focus on first.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dna"
                  className="bg-[#191265] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#ffe27c] hover:text-[#191265] transition-all duration-300 text-center">
                  Take the Free DNA Quiz
                </Link>
                <Link href="/database"
                  className="border-2 border-[#191265] text-[#191265] font-bold px-8 py-4 rounded-2xl hover:bg-[#191265] hover:text-white transition-all duration-300 text-center">
                  Join the Database
                </Link>
              </div>
              <div className="flex justify-center gap-6 mt-8">
                <a href={IG_LINK} target="_blank" rel="noopener noreferrer" className="text-[#727272] hover:text-[#191265] transition-colors text-sm">Instagram</a>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="text-[#727272] hover:text-[#191265] transition-colors text-sm">WhatsApp</a>
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
            <Link href="/database" className="hover:text-white transition-colors">Database</Link>
            <Link href="/course" className="hover:text-white transition-colors">Course</Link>
            <Link href="/coaching" className="hover:text-white transition-colors">Coaching</Link>
            <Link href="/guide" className="hover:text-white transition-colors">Free Guide</Link>
          </div>
          <div className="text-white/30 text-xs">© {new Date().getFullYear()} Hilit Caspi. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
