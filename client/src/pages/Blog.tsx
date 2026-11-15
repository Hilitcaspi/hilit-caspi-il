import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { FEATURED_EDITORIAL, parseEditorialTags } from "@shared/editorialPaths";
import EditorialNextStep from "@/components/EditorialNextStep";

export default function Blog() {
  const { data: posts, isLoading, error, refetch } = trpc.blog.list.useQuery({ limit: 50 });
  useEffect(() => { const title = document.title; document.title = "מאמרים על זוגיות, היכרויות ובחירה | הילית כספי"; return () => { document.title = title; }; }, []);
  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]" dir="rtl">
      <nav className="bg-[#191265] px-6 py-4 text-white" aria-label="ניווט המאמרים"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><Link href="/" className="text-xl font-bold">הילית כספי</Link><div className="flex flex-wrap gap-5 text-sm"><Link href="/database">מאגר ההיכרויות</Link><Link href="/dna-quiz">שאלון DNA חינמי</Link><Link href="/single-session">פגישה אישית</Link></div></div></nav>
      <header className="bg-[#191265] px-6 py-12 text-white"><div className="mx-auto max-w-5xl"><p className="mb-3 text-sm text-[#ffe27c]">הסיפור שלי, הגישה שלי והבחירה שלך</p><h1 className="text-4xl font-bold leading-tight md:text-5xl">על זוגיות, היכרויות<br />ומה שבאמת חשוב בקשר</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">מאמרים וכלים להתבוננות, מהדייט הראשון ועד הבחירה להמשיך. לקרוא, להבין מה מתאים לך ולבחור צעד להיכרות חדשה.</p></div></header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <section aria-label="תוכן מהפודקאסט ומהשטח"><h2 className="mb-5 text-2xl font-bold">מהפודקאסט אל החיים</h2><div className="grid gap-5 md:grid-cols-2">{FEATURED_EDITORIAL.map(item => <Link key={item.href} href={item.href} className="rounded-2xl border border-[#191265]/15 bg-[#f6eef8] p-6 transition-colors hover:bg-white"><span className="text-xs font-medium text-[#94265b]">{item.tag}</span><h3 className="mb-3 mt-2 text-xl font-bold">{item.title}</h3><p className="text-sm leading-7 text-[#514d5c]">{item.excerpt}</p><span className="mt-4 inline-block text-sm font-bold">לקריאת הכתבה</span></Link>)}</div></section>
        <section className="mt-10" aria-label="כל מאמרי הבלוג"><h2 className="mb-5 text-2xl font-bold">לקרוא ולהעמיק</h2>
          {isLoading && <p role="status" className="py-8">טוענים את המאמרים...</p>}
          {error && <div className="rounded-xl bg-white p-6"><p>לא הצלחנו לטעון את רשימת המאמרים כרגע.</p><button type="button" onClick={() => void refetch()} className="mt-3 font-bold underline">לנסות שוב</button></div>}
          {posts && <div className="grid gap-5 md:grid-cols-2">{posts.map(post => <article key={post.id}><Link href={`/blog/${post.slug}`} className="block h-full overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">{post.coverImage && <img src={post.coverImage} alt={post.title} width={600} height={280} loading="lazy" decoding="async" className="h-48 w-full object-cover" />}<div className="p-6"><div className="mb-3 flex flex-wrap gap-2">{parseEditorialTags(post.tags).slice(0, 3).map(tag => <span key={tag} className="rounded-full bg-[#ffe27c]/30 px-2 py-1 text-xs">{tag}</span>)}</div><h3 className="mb-3 text-xl font-bold leading-snug">{post.title}</h3><p className="text-sm leading-7 text-[#605b6a]">{post.excerpt}</p><span className="mt-4 inline-block text-sm font-bold">לקריאת המאמר</span></div></Link></article>)}</div>}
          {posts?.length === 0 && <p className="py-8">מאמרים נוספים בדרך. אפשר להתחיל מהתכנים שלמעלה.</p>}
        </section>
        <EditorialNextStep slug="blog" />
      </main>
      <footer className="bg-[#191265] px-6 py-6 text-center text-sm text-white/75"><p>© {new Date().getFullYear()} הילית כספי. כל הזכויות שמורות.</p><Link href="/terms/database" className="mt-3 inline-block underline">תקנון המאגר</Link></footer>
    </div>
  );
}
