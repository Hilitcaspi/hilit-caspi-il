import { SEO_ORIGIN } from "./siteSeoMetadata";

export type PublicArticleData = {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription?: string | null;
  coverImage?: string | null;
  publishedAt: number;
  updatedAt: number;
};

function isoDate(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  try { return new Date(value).toISOString(); } catch { return undefined; }
}

export function blogStructuredData(post: PublicArticleData) {
  const url = `${SEO_ORIGIN}/blog/${encodeURIComponent(post.slug)}`;
  let image: string | undefined;
  if (post.coverImage && /^(https?:\/\/|\/manus-storage\/)/i.test(post.coverImage)) {
    try { const candidate = new URL(post.coverImage, SEO_ORIGIN); if (!candidate.username && !candidate.password) image = candidate.href; } catch { /* Invalid legacy image is omitted. */ }
  }
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription?.trim() || post.excerpt,
    author: { "@type": "Person", name: "הילית כספי", url: SEO_ORIGIN + "/#about" },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished: isoDate(post.publishedAt),
    dateModified: post.updatedAt >= post.publishedAt ? isoDate(post.updatedAt) : undefined,
    ...(image ? { image: [image] } : {}),
  };
}

export function serializeStructuredData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
