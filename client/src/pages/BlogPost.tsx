import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { parseEditorialTags } from "@shared/editorialPaths";
import { isNovemberBundleOfferActive } from "@shared/novemberBundleOffer";
import EditorialNextStep from "@/components/EditorialNextStep";
import { blogStructuredData, serializeStructuredData } from "@shared/blogStructuredData";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Jerusalem" });
}

export default function BlogPost() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: post, isLoading, error, refetch } = trpc.blog.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const notFound = error?.data?.code === "NOT_FOUND";
  const novemberExpired = slug === "november-2026-database-course-offer" && !isNovemberBundleOfferActive();

  useEffect(() => {
    if (!post && !notFound) return;
    const previousTitle = document.title;
    const saved: Array<() => void> = [];
    const setMeta = (key: string, value: string, property = false) => {
      const attribute = property ? "property" : "name";
      const existing = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      const element = existing ?? document.createElement("meta");
      const previous = element.content;
      element.setAttribute(attribute, key); element.content = value;
      if (!existing) document.head.appendChild(element);
      saved.push(() => { if (existing) element.content = previous; else element.remove(); });
    };
    const existingSchema = document.getElementById("blog-structured-data");
    if (existingSchema) existingSchema.remove();
    if (post) {
      const schema = document.createElement("script"); schema.id = "blog-structured-data"; schema.type = "application/ld+json";
      schema.textContent = serializeStructuredData(blogStructuredData(post)); document.head.appendChild(schema);
      saved.push(() => schema.remove());
    }
    document.title = post ? `${post.title} | הילית כספי` : "מאמר לא נמצא | הילית כספי";
    const description = novemberExpired ? "הטבת נובמבר 2026 הסתיימה. אפשר לקרוא על מאגר ההיכרויות והשירותים הזמינים באתר." : post?.metaDescription?.trim() || post?.excerpt || "המאמר המבוקש לא נמצא.";
    setMeta("description", description);
    setMeta("og:title", document.title, true); setMeta("og:description", description, true);
    setMeta("og:type", "article", true); setMeta("og:url", `https://hilitcaspi.com/blog/${encodeURIComponent(slug)}`, true);
    setMeta("twitter:title", document.title); setMeta("twitter:description", description);
    if (notFound) setMeta("robots", "noindex,nofollow");
    const canonicalTags = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    const canonical = canonicalTags[0] ?? document.createElement("link");
    const oldHref = canonical.href; canonical.rel = "canonical";
    canonical.href = `https://hilitcaspi.com/blog/${encodeURIComponent(slug)}`;
    if (!canonicalTags.length) document.head.appendChild(canonical);
    canonicalTags.slice(1).forEach(tag => tag.remove());
    saved.push(() => { if (canonicalTags.length) canonical.href = oldHref; else canonical.remove(); });
    return () => { document.title = previousTitle; saved.reverse().forEach(restore => restore()); };
  }, [post, notFound, slug, novemberExpired]);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      <nav className="bg-[#191265] px-6 py-4 text-white" aria-label="ניווט המאמר">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold">הילית כספי</Link>
          <div className="flex flex-wrap gap-5 text-sm"><Link href="/database">המאגר</Link><Link href="/single-session">פגישה אישית</Link><Link href="/blog">כל המאמרים</Link></div>
        </div>
      </nav>
      {isLoading && <div className="mx-auto max-w-3xl animate-pulse px-6 py-16" aria-label="טעינת המאמר"><div className="mb-4 h-8 rounded bg-[#191265]/10" /><div className="h-40 rounded bg-[#191265]/5" /></div>}
      {error && <div className="mx-auto max-w-3xl px-6 py-16 text-center"><h1 className="mb-3 text-2xl font-bold text-[#191265]">{notFound ? "מאמר לא נמצא" : "לא הצלחנו לטעון את המאמר כרגע"}</h1>{!notFound && <button type="button" onClick={() => void refetch()} className="mb-5 rounded-xl bg-[#191265] px-6 py-3 text-white">לנסות שוב</button>}<p><Link href="/blog" className="font-semibold text-[#1800ad] underline">חזרה לכל המאמרים</Link></p></div>}
      {post && <>
        {post.coverImage && <div className="w-full overflow-hidden bg-[#191265]"><img src={post.coverImage} alt={post.title} className="mx-auto max-h-96 w-full object-cover" width={1200} height={500} decoding="async" /></div>}
        <article className="mx-auto max-w-3xl px-6 py-10 text-[#191265]">
          <div className="mb-4 flex flex-wrap gap-2">{parseEditorialTags(post.tags).map(tag => <span key={tag} className="rounded-full bg-[#ffe27c]/40 px-3 py-1 text-xs font-medium">{tag}</span>)}</div>
          <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
          <div className="mb-8 flex items-center gap-4 border-b border-[#191265]/15 pb-6 text-sm text-[#605b6a]"><span>הילית כספי</span><time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt)}</time></div>
          {novemberExpired && <aside className="mb-6 rounded-xl border border-[#191265]/20 bg-white p-5 leading-7"><strong>הטבת נובמבר 2026 הסתיימה.</strong><p>הכתבה נשמרת כתיעוד של ההצעה שהייתה. המחיר וההטבה המתוארים אינם הצעה פעילה. <Link href="/database" className="font-bold underline">לפרטי המאגר כיום</Link>.</p></aside>}
          <div className="editorial-body max-w-none text-[#191265]" dangerouslySetInnerHTML={{ __html: post.content }} />
          <EditorialNextStep slug={slug} />
          <section className="mt-8 border-t border-[#191265]/15 pt-6" aria-label="עוד לקריאה"><h2 className="mb-3 text-lg font-bold">להמשיך לקרוא</h2><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm"><Link href="/signs" className="underline">סימנים לעניין בתחילת קשר</Link><Link href="/attraction" className="underline">על משיכה וחיזור</Link><Link href="/blog" className="underline">כל המאמרים</Link></div></section>
        </article>
      </>}
      <footer className="mt-8 bg-[#191265] px-6 py-6 text-center text-sm text-white/75"><p>© {new Date().getFullYear()} הילית כספי. כל הזכויות שמורות.</p><Link href="/terms/database" className="mt-3 inline-block underline">תקנון המאגר</Link></footer>
    </div>
  );
}
