/**
 * English Blog Index — /en/blog
 * SEO-optimized relationship coaching articles for US market
 */

import { Link } from "wouter";

const POSTS = [
  {
    slug: "how-to-find-love-after-30",
    title: "How to Find Love After 30: The Science-Backed Approach That Actually Works",
    excerpt: "Most dating advice is built for your twenties. Here is what actually changes after 30 and how to use it to your advantage.",
    keyword: "how to find love after 30",
    readTime: "7 min read",
    category: "Dating Strategy",
  },
  {
    slug: "matchmaking-services-cost",
    title: "What Does a Matchmaking Service Actually Cost? A Transparent Breakdown",
    excerpt: "From $149 database memberships to $300,000 elite searches: here is everything you need to know before you invest.",
    keyword: "matchmaking services cost",
    readTime: "6 min read",
    category: "Matchmaking",
  },
  {
    slug: "relationship-coach-vs-therapist",
    title: "Relationship Coach vs. Therapist: Which One Do You Actually Need?",
    excerpt: "They're not the same thing. Understanding the difference could save you months of frustration and thousands of dollars.",
    keyword: "relationship coach vs therapist",
    readTime: "5 min read",
    category: "Coaching",
  },
  {
    slug: "why-am-i-still-single",
    title: "The Real Reason You're Still Single (It's Not What You Think)",
    excerpt: "It is not your looks, your schedule, or your city. The patterns that keep you single are almost always invisible, until you see them.",
    keyword: "why am I still single",
    readTime: "8 min read",
    category: "Self-Awareness",
  },
  {
    slug: "how-to-attract-the-right-partner",
    title: "How to Attract the Right Partner: 5 Patterns That Predict Lasting Love",
    excerpt: "Research on long-term relationship success points to five consistent patterns. Most people focus on none of them.",
    keyword: "how to attract the right partner",
    readTime: "7 min read",
    category: "Relationship Science",
  },
  {
    slug: "curated-singles-database",
    title: "What Is a Curated Singles Database and Why It Beats Dating Apps",
    excerpt: "Dating apps have a 12% success rate. Curated matchmaking has 80%. Here's why the difference is not about luck.",
    keyword: "curated matchmaking",
    readTime: "6 min read",
    category: "Matchmaking",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Dating Strategy": "bg-[#191265] text-white",
  "Matchmaking": "bg-[#ffe27c] text-[#191265]",
  "Coaching": "bg-[#1800ad] text-white",
  "Self-Awareness": "bg-[#f0eadc] text-[#191265]",
  "Relationship Science": "bg-[#191265] text-[#ffe27c]",
};

export default function EnBlogIndex() {
  return (
    <div className="min-h-screen bg-[#f0eadc] font-sans" dir="ltr">

      {/* Navbar */}
      <nav className="bg-[#191265] py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/en" className="text-white font-bold text-xl">Hilit Caspi</Link>
          <Link href="/database" className="bg-[#ffe27c] text-[#191265] font-bold px-5 py-2 rounded-full text-sm">
            Join the Database
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-[#191265] py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#ffe27c] font-semibold text-sm uppercase tracking-widest mb-4">Relationship Insights</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6">
            The Blog
          </h1>
          <p className="text-white/70 text-xl leading-relaxed">
            Science-backed insights on finding love, building lasting relationships, and understanding what actually works.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-[#f0eadc] text-[#191265]"}`}>
                      {post.category}
                    </span>
                    <span className="text-[#727272] text-xs">{post.readTime}</span>
                  </div>
                  <h2 className="text-[#191265] font-black text-lg leading-tight mb-3 group-hover:text-[#1800ad] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[#727272] text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 text-[#1800ad] font-semibold text-sm">
                    Read article →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">Ready to go beyond reading?</h2>
          <p className="text-white/70 mb-8">Take the free DNA quiz and discover your relationship personality type.</p>
          <Link href="/dna"
            className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300">
            Take the Free DNA Quiz
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0a3a] py-10 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <Link href="/en" className="text-white font-bold text-lg mb-3 block">Hilit Caspi</Link>
          <div className="flex justify-center gap-6 text-white/50 text-sm flex-wrap">
            <Link href="/en" className="hover:text-white transition-colors">Home</Link>
            <Link href="/database" className="hover:text-white transition-colors">Database</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 text-white/30 text-xs">
            © {new Date().getFullYear()} Hilit Caspi. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
