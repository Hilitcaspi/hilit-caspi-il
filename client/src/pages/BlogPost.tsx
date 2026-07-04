/**
 * BlogPost - single article page with SEO meta tags
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { track } from "@/lib/track";

const WHATSAPP_URL = "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%A7%D7%A8%D7%90%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%94%D7%9B%D7%AA%D7%91%D7%94%20%D7%95%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94";
// Calendly removed - using /single-session for intro meetings

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: post, isLoading, error } = trpc.blog.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Update page title and meta description for SEO
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | הילית כספי`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", post.metaDescription ?? post.excerpt);
      } else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = post.metaDescription ?? post.excerpt;
        document.head.appendChild(meta);
      }
    }
    return () => {
      document.title = "הילית כספי | מאמנת ומשדכת";
    };
  }, [post]);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── HEADER ── */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-xl">הילית כספי</a>
          <Link href="/blog" className="text-white/80 hover:text-[#ffe27c] text-sm transition-colors">
            ← כל המאמרים
          </Link>
        </div>
      </nav>

      {isLoading && (
        <div className="max-w-3xl mx-auto px-6 py-20 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-3/4" />
          <div className="h-4 bg-gray-100 rounded mb-2" />
          <div className="h-4 bg-gray-100 rounded mb-2 w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-black text-[#191265] mb-3">מאמר לא נמצא</h1>
          <Link href="/blog" className="text-[#1800ad] font-semibold hover:underline">
            ← חזרה לכל המאמרים
          </Link>
        </div>
      )}

      {post && (
        <>
          {/* ── HERO ── */}
          {post.coverImage && (
            <div className="w-full h-64 md:h-96 overflow-hidden">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          {!post.coverImage && (
            <div className="w-full h-48 bg-gradient-to-br from-[#191265] to-[#1800ad]" />
          )}

          {/* ── ARTICLE ── */}
          <article className="max-w-3xl mx-auto px-6 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* Tags */}
              {post.tags && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.split(",").map(tag => (
                    <span key={tag} className="bg-[#ffe27c]/40 text-[#191265] text-xs px-3 py-1 rounded-full font-medium">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-black text-[#191265] leading-tight mb-4">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-4 text-[#727272] text-sm mb-8 pb-8 border-b border-[#e9e8e8]">
                <span>הילית כספי</span>
                <span>·</span>
                <span>{formatDate(post.publishedAt)}</span>
              </div>

              {/* Content */}
              <div
                className="prose prose-lg max-w-none text-[#191265] leading-relaxed"
                style={{ direction: "rtl" }}
                dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br />") }}
              />
            </motion.div>

            {/* ── CTA ── */}
            <div className="mt-16 bg-[#191265] rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-black text-white mb-3">רוצה לדעת מה מתאים לך?</h2>
              <p className="text-white/70 mb-6">פגישת היכרות אישית. 60 דקות שישנו לך את הכיוון.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/single-session"
                  className="bg-[#ffe27c] text-[#191265] font-black px-6 py-3 rounded-xl hover:bg-white transition-all">
                  ♡ לפרטים ולקביעת פגישה
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                  className="border-2 border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:border-[#ffe27c] hover:text-[#ffe27c] transition-all">
                  💬 כתבי לי בוואטסאפ
                </a>
              </div>
            </div>

            {/* ── BACK ── */}
            <div className="mt-8 text-center">
              <Link href="/blog" className="text-[#1800ad] font-semibold hover:underline">
                ← כל המאמרים
              </Link>
            </div>
          </article>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-[#191265] py-8 px-6 text-center mt-8">
        <p className="text-white/50 text-sm">© 2025 הילית כספי. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
