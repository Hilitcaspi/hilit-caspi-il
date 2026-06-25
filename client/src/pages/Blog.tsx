/**
 * Blog - articles by Hilit Caspi for SEO and content marketing
 */

import { motion } from "framer-motion";
import { track } from "@/lib/track";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

const WHATSAPP_URL = "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%A7%D7%A8%D7%90%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%94%D7%9B%D7%AA%D7%91%D7%95%D7%AA%20%D7%95%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94";
const CALENDLY_URL = "https://calendly.com/hilitcaspi/meet-with-me";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export default function Blog() {
  const { data: posts, isLoading } = trpc.blog.list.useQuery();

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── HEADER ── */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-xl">הילית כספי</a>
          <div className="hidden md:flex items-center gap-6 text-white/80 text-sm">
            <a href="/#about" className="hover:text-[#ffe27c] transition-colors">אודות</a>
            <a href="/#services" className="hover:text-[#ffe27c] transition-colors">שירותים</a>
            <Link href="/blog" className="text-[#ffe27c] font-semibold">מאמרים</Link>
            <a href="/#podcast" className="hover:text-[#ffe27c] transition-colors">פודקאסט</a>
          </div>
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => track({ eventType: "calendly_click", page: "/blog" })}
            className="bg-[#ffe27c] text-[#191265] font-bold px-4 py-2 rounded-full text-sm hover:bg-white transition-all">
            קביעת פגישה
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-black text-white mb-4">
          מאמרים ותובנות
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="text-white/70 text-xl max-w-xl mx-auto">
          כל מה שצריך לדעת על אהבה, דייטינג, וזוגיות - מהניסיון האמיתי
        </motion.p>
      </section>

      {/* ── ARTICLES ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {posts.map((post, i) => (
                <motion.article key={post.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <Link href={`/blog/${post.slug}`}
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-right">
                    {post.coverImage && (
                      <img src={post.coverImage} alt={post.title}
                        className="w-full h-48 object-cover" />
                    )}
                    {!post.coverImage && (
                      <div className="w-full h-48 bg-gradient-to-br from-[#191265] to-[#1800ad] flex items-center justify-center">
                        <span className="text-[#ffe27c] text-5xl">💛</span>
                      </div>
                    )}
                    <div className="p-6">
                      {post.tags && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.split(",").slice(0, 3).map(tag => (
                            <span key={tag} className="bg-[#ffe27c]/30 text-[#191265] text-xs px-2 py-1 rounded-full">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      <h2 className="font-black text-[#191265] text-xl mb-2 leading-tight">{post.title}</h2>
                      <p className="text-[#727272] text-sm leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[#727272] text-xs">{formatDate(post.publishedAt)}</span>
                        <span className="text-[#191265] font-semibold text-sm">קראי עוד ←</span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">✍️</div>
              <h2 className="text-2xl font-black text-[#191265] mb-3">מאמרים בדרך!</h2>
              <p className="text-[#727272] mb-6">בקרוב יפורסמו כאן מאמרים ותובנות על אהבה, דייטינג, וזוגיות.</p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#191265] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-all">
                כתבי לי בוואטסאפ
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── SUBSTACK CTA ── */}
      <section className="py-16 px-6 bg-[#191265] text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="max-w-xl mx-auto">
            <div className="text-4xl mb-4">📩</div>
            <h2 className="text-2xl font-black text-white mb-3">תוכן שלא תמצאו בשום מקום אחר</h2>
            <p className="text-white/70 mb-6 leading-relaxed">
              תובנות על זוגיות, אהבה ומה שבאמת עובד. ישירות למייל, בלי רעש.
            </p>
            <a href="https://substack.com/@hilitcaspi" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-xl">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
              הצטרפו לניוזלטר
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 px-6 bg-[#f0eadc] text-center">
        <h2 className="text-xl font-black text-[#191265] mb-3">רוצה לדעת מה מתאים לך?</h2>
        <p className="text-[#727272] mb-5">שיחת היכרות חינמית של 15 דקות. בלי מחויבות.</p>
        <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => track({ eventType: "calendly_click", page: "/blog" })}
          className="inline-block bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105">
          ♡ לקביעת שיחה חינמית
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#191265] border-t border-white/10 py-8 px-6 text-center">
        <p className="text-white/50 text-sm">© 2025 הילית כספי. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
