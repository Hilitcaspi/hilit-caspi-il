import { motion } from "framer-motion";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("Hi Hilit, I am interested in booking you as a speaker for an event.");
const INTRO_MEETING_URL = "/single-session";

const TOPICS = [
  {
    icon: "💛",
    title: "Why Are We Still Single?",
    desc: "An honest, practical talk about the hidden patterns that keep high-achieving people from finding love, and how to change them.",
    audience: "Women's events, community groups, retreats",
    duration: "60-90 minutes",
  },
  {
    icon: "🔑",
    title: "The Secret Code to a Happy Relationship",
    desc: "What separates couples who thrive from those who fall apart? Insights from the field on communication, boundaries, and intimacy.",
    audience: "Couples retreats, corporate wellness, women's organizations",
    duration: "45-90 minutes",
  },
  {
    icon: "📱",
    title: "Dating in the Digital Age",
    desc: "How to navigate apps, write a profile that attracts the right people, and not lose yourself in the process.",
    audience: "Singles events, young professional groups",
    duration: "45-60 minutes",
  },
  {
    icon: "🌱",
    title: "Who Am I in a Relationship?",
    desc: "An interactive workshop for discovering your personal relationship patterns and building a healthier dynamic with yourself and others.",
    audience: "Retreats, workshops, small groups",
    duration: "2-3 hours (workshop format)",
  },
  {
    icon: "💼",
    title: "Love, Career, and Self",
    desc: "For people who succeed at everything except relationships. On the connection between professional achievement and real love.",
    audience: "Tech companies, women's organizations, conferences",
    duration: "45-60 minutes",
  },
];

const FORMATS = [
  { icon: "🎤", title: "Keynote", desc: "An engaging talk with Q&A, perfect for conferences, team days, and inspiration evenings" },
  { icon: "🌿", title: "Retreat", desc: "A full retreat program, from keynotes to deep workshops and transformative experiences" },
  { icon: "👥", title: "Workshop", desc: "An interactive workshop for small groups, personal, deep, and life-changing" },
  { icon: "🏢", title: "Corporate", desc: "Tailored content for companies and organizations, wellbeing, diversity, and work-life balance" },
];

export default function EnSpeaking() {
  return (
    <div className="min-h-screen bg-[#f0eadc]">
      {/* NAV */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/en" className="text-white font-bold text-xl">Match by Hilit</a>
          <div className="hidden md:flex items-center gap-6 text-white/80 text-sm">
            <a href="/about" className="hover:text-[#ffe27c] transition-colors">About</a>
            <a href="/database" className="hover:text-[#ffe27c] transition-colors">Singles Database</a>
            <a href="/blog" className="hover:text-[#ffe27c] transition-colors">Articles</a>
            <a href="/speaking" className="text-[#ffe27c] font-semibold">Speaking</a>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full text-sm hover:bg-white transition-all">
            Book Hilit
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#191265] py-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
          Keynotes · Workshops · Retreats
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-white mb-6">
          Bring Hilit to Your Event
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="text-white/75 text-xl max-w-2xl mx-auto mb-10">
          Relationship expert, matchmaker, and speaker. Talks that move people, shift perspectives, and spark real change.
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all">
            Inquire about booking
          </a>
          <a href={INTRO_MEETING_URL}
            className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all">
            Schedule a meeting
          </a>
        </div>
      </section>

      {/* FORMATS */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[#191265] text-center mb-12">Talk Formats</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FORMATS.map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 bg-[#f0eadc] rounded-2xl">
                <div className="text-3xl">{icon}</div>
                <div>
                  <h3 className="font-bold text-[#191265] mb-1">{title}</h3>
                  <p className="text-[#555] text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className="py-16 px-6 bg-[#f0eadc]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[#191265] text-center mb-4">Talk Topics</h2>
          <p className="text-[#555] text-center mb-12">All topics can be customized to your audience and event goals.</p>
          <div className="space-y-6">
            {TOPICS.map(({ icon, title, desc, audience, duration }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{icon}</div>
                  <div className="flex-1">
                    <h3 className="font-black text-[#191265] text-xl mb-2">{title}</h3>
                    <p className="text-[#555] mb-4">{desc}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-[#727272]">
                      <span>Audience: {audience}</span>
                      <span>Duration: {duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <h2 className="text-3xl font-black text-white mb-4">Ready to book?</h2>
        <p className="text-white/75 text-lg mb-8 max-w-xl mx-auto">
          Reach out to discuss your event, audience, and goals. Every talk is tailored.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all">
            Send a WhatsApp message
          </a>
          <a href={INTRO_MEETING_URL}
            className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all">
            Book a discovery meeting
          </a>
        </div>
      </section>
    </div>
  );
}
