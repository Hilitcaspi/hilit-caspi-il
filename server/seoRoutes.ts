import type { Express, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { blogPosts } from "../drizzle/schema";
import { getDb } from "./db";
import { sanitizeBlogContent } from "./blogContent";
import { blogStructuredData, serializeStructuredData } from "../shared/blogStructuredData";
import {
  editorialNextStep,
  FEATURED_EDITORIAL,
  parseEditorialTags,
} from "../shared/editorialPaths";
import { isNovemberBundleOfferActive } from "../shared/novemberBundleOffer";

import {
  PUBLIC_ROUTE_META,
  PUBLIC_SITEMAP_PATHS,
  PRIVATE_ROUTE_PREFIXES,
  SEO_ORIGIN,
  type SeoMeta,
} from "../shared/siteSeoMetadata";
export {
  PUBLIC_ROUTE_META,
  PUBLIC_SITEMAP_PATHS,
  PRIVATE_ROUTE_PREFIXES,
  SEO_ORIGIN,
  type SeoMeta,
} from "../shared/siteSeoMetadata";
const SITE_NAME = "הילית כספי";
const DEFAULT_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";

const NON_PAGE_PREFIXES = [
  "/api",
  "/assets",
  "/src",
  "/node_modules",
  "/manus-storage",
  "/@vite",
  "/@id",
  "/@fs",
  "/grow-proxy",
];
const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function normalizedPath(url: string): string {
  // Do not parse as an absolute URL: a path beginning // must remain local.
  const raw = url.split(/[?#]/, 1)[0] || "/";
  try {
    return decodeURIComponent(raw).replace(/\/+$/, "") || "/";
  } catch {
    return raw.replace(/\/+$/, "") || "/";
  }
}
export function isPrivatePage(url: string): boolean {
  const path = normalizedPath(url);
  const localPath = path.startsWith("/en/") ? path.slice(3) : path;
  return PRIVATE_ROUTE_PREFIXES.some(prefix =>
    matchesPrefix(localPath, prefix)
  );
}
export function isPageRequest(
  req: Pick<Request, "method" | "originalUrl">
): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const path = normalizedPath(req.originalUrl);
  if (NON_PAGE_PREFIXES.some(prefix => matchesPrefix(path, prefix)))
    return false;
  if (path === "/robots.txt" || path === "/sitemap.xml") return false;
  // Blog slugs may contain a dot; all other file requests stay with Vite/static.
  return (
    isPrivatePage(path) ||
    path === "/index.html" ||
    /^\/blog\/[^/]+$/.test(path) ||
    !/\.[^/]+$/.test(path)
  );
}
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export function escapeXml(value: string): string {
  return escapeHtml(value).replace(/&#39;/g, "&apos;");
}
function encodedSlug(slug: string): string | null {
  if (
    !slug ||
    /[\u0000-\u001f\u007f/\\?#]/.test(slug) ||
    slug === "." ||
    slug === ".."
  )
    return null;
  try {
    return encodeURIComponent(slug);
  } catch {
    return null;
  }
}
function safeImage(value: string | null | undefined): string {
  if (!value) return DEFAULT_IMAGE;
  try {
    const url = new URL(value, SEO_ORIGIN);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : DEFAULT_IMAGE;
  } catch {
    return DEFAULT_IMAGE;
  }
}
function htmlAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

export function composeSeoHtml(
  template: string,
  meta: SeoMeta,
  canonicalPath: string | null,
  body = ""
): string {
  // Strip SEO tags from this request's local template, never edit index.html.
  // Restrict replacements to <head>, preserving analytics, favicon, fonts etc.
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(safeImage(meta.image));
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="${meta.type === "article" ? "article" : "website"}" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (canonicalPath && !meta.noindex) {
    const canonical = escapeHtml(SEO_ORIGIN + canonicalPath);
    tags.push(
      `<link rel="canonical" href="${canonical}" />`,
      `<meta property="og:url" content="${canonical}" />`
    );
  }
  if (meta.noindex)
    tags.push('<meta name="robots" content="noindex, nofollow" />');
  const html = template.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => {
    const clean = head
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<(?:meta|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, tag => {
        const name = (htmlAttribute(tag, "name") || "").toLowerCase();
        const property = (htmlAttribute(tag, "property") || "").toLowerCase();
        const rel = (htmlAttribute(tag, "rel") || "")
          .toLowerCase()
          .split(/\s+/);
        return ["description", "keywords", "robots", "googlebot"].includes(
          name
        ) ||
          name.startsWith("twitter:") ||
          property.startsWith("og:") ||
          property.startsWith("article:") ||
          rel.includes("canonical")
          ? ""
          : tag;
      });
    return clean.replace(/<\/head>/i, () => `${tags.join("\n")}\n</head>`);
  });
  // createRoot remains unchanged: visible public HTML is replaced by React.
  // No bot/user-agent discrimination, hidden content, hydration or private state.
  return body
    ? html.replace(
        /(<div\b[^>]*\bid=["']root["'][^>]*>)\s*<\/div>/i,
        (_match, opening: string) => `${opening}${body}</div>`
      )
    : html;
}

type BlogListRow = Pick<
  typeof blogPosts.$inferSelect,
  "id" | "title" | "slug" | "excerpt" | "coverImage" | "tags" | "publishedAt"
>;
type BlogArticle = typeof blogPosts.$inferSelect;
type SitemapPost = Pick<BlogArticle, "slug" | "updatedAt" | "publishedAt">;
export interface SeoBlogReader {
  list(): Promise<BlogListRow[]>;
  article(slug: string): Promise<BlogArticle | null>;
  sitemap(): Promise<SitemapPost[]>;
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Public blog database unavailable");
  return db;
}
export const publicBlogReader: SeoBlogReader = {
  async list() {
    const db = await requireDb();
    // Same fields, order and explicit limit as the public Blog page; no private table.
    return db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        coverImage: blogPosts.coverImage,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(50);
  },
  async article(slug) {
    const db = await requireDb();
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
      .limit(1);
    return post ?? null;
  },
  async sitemap() {
    const db = await requireDb();
    return db
      .select({
        slug: blogPosts.slug,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt));
  },
};
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}
function renderEditorialNextStep(slug: string, now: number): string {
  const step = editorialNextStep(slug, now);
  const destinations = [
    { href: "/database", label: "למאגר ההיכרויות" },
    { href: "/dna-quiz", label: "לשאלון DNA החינמי" },
    { href: "/single-session", label: "לפגישה אישית" },
  ].filter(item => item.href !== step.primaryHref);
  const november =
    isNovemberBundleOfferActive(now) && step.primaryHref !== "/november-love"
      ? '<p>בנובמבר אפשר להצטרף למאגר עם הקורס המלא שלי במתנה. <a href="/november-love">לפרטי הטבת נובמבר</a>. עד סוף 30.11.2026.</p>'
      : "";
  return `<section aria-label="המשך מהכתבה" class="mt-10 rounded-3xl bg-[#191265] p-6 text-white"><h2 class="text-2xl font-bold leading-snug">${escapeHtml(step.title)}</h2><p class="mt-3 leading-8 text-white/85">${escapeHtml(step.text)}</p><a class="mt-5 inline-flex rounded-xl bg-[#ffe27c] px-6 py-3 font-bold text-[#191265]" href="${escapeHtml(step.primaryHref)}">${escapeHtml(step.primaryLabel)}</a><div class="mt-5 flex flex-wrap gap-6 text-sm underline">${destinations.map(item => `<a href="${item.href}">${item.label}</a>`).join(" · ")}</div>${november}</section>`;
}
function renderBlogList(posts: BlogListRow[], now: number): string {
  const featured = FEATURED_EDITORIAL.map(
    item =>
      `<article class="rounded-2xl border border-[#191265]/15 bg-[#f6eef8] p-6"><p class="text-xs font-medium text-[#94265b]">${escapeHtml(item.tag)}</p><h3 class="mb-3 mt-2 text-xl font-bold"><a href="${item.href}">${escapeHtml(item.title)}</a></h3><p class="text-sm leading-7 text-[#514d5c]">${escapeHtml(item.excerpt)}</p></article>`
  ).join("\n");
  const articles = posts
    .map(post => {
      const slug = encodedSlug(post.slug);
      if (!slug) return "";
      const tags = parseEditorialTags(post.tags)
        .slice(0, 3)
        .map(
          tag =>
            `<span class="rounded-full bg-[#ffe27c]/30 px-2 py-1 text-xs">${escapeHtml(tag)}</span>`
        )
        .join(" ");
      return `<article class="rounded-2xl bg-white p-6 shadow-sm"><div class="mb-3 flex flex-wrap gap-2">${tags}</div><h3 class="mb-3 text-xl font-bold leading-snug"><a href="/blog/${escapeHtml(slug)}">${escapeHtml(post.title)}</a></h3><p class="text-sm leading-7 text-[#605b6a]">${escapeHtml(post.excerpt)}</p></article>`;
    })
    .join("\n");
  return `<div data-seo-prerender="true" dir="rtl" class="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]"><nav class="bg-[#191265] px-6 py-4 text-white"><div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><a href="/" class="text-xl font-bold">הילית כספי</a><div class="flex flex-wrap gap-5 text-sm"><a href="/database">מאגר ההיכרויות</a><a href="/dna-quiz">שאלון DNA חינמי</a><a href="/single-session">פגישה אישית</a></div></div></nav><header class="bg-[#191265] px-6 py-12 text-white"><div class="mx-auto max-w-5xl"><p class="mb-3 text-sm text-[#ffe27c]">הסיפור שלי, הגישה שלי והבחירה שלך</p><h1 class="text-4xl font-bold leading-tight md:text-5xl">על זוגיות, היכרויות<br />ומה שבאמת חשוב בקשר</h1><p class="mt-5 max-w-2xl text-lg leading-8 text-white/85">מאמרים וכלים להתבוננות, מהדייט הראשון ועד הבחירה להמשיך. לקרוא, להבין מה מתאים לך ולבחור צעד להיכרות חדשה.</p></div></header><main class="mx-auto max-w-5xl px-6 py-10"><section aria-label="תוכן מהפודקאסט ומהשטח"><h2 class="mb-5 text-2xl font-bold">מהפודקאסט אל החיים</h2><div class="grid gap-5 md:grid-cols-2">${featured}</div></section><section class="mt-10" aria-label="כל מאמרי הבלוג"><h2 class="mb-5 text-2xl font-bold">לקרוא ולהעמיק</h2><div class="grid gap-5 md:grid-cols-2">${articles || "<p>מאמרים נוספים בדרך. אפשר להתחיל מהתכנים שלמעלה.</p>"}</div></section>${renderEditorialNextStep("blog", now)}</main></div>`;
}
function renderBlogArticle(post: BlogArticle, now: number): string {
  const expired =
    post.slug === "november-2026-database-course-offer" &&
    !isNovemberBundleOfferActive(now);
  const notice = expired
    ? '<aside><strong>הטבת נובמבר 2026 הסתיימה.</strong><p>הכתבה נשמרת כתיעוד של ההצעה שהייתה. המחיר וההטבה המתוארים אינם הצעה פעילה. <a href="/database">לפרטי המאגר כיום</a>.</p></aside>'
    : "";
  const tags = parseEditorialTags(post.tags)
    .map(
      tag =>
        `<span class="rounded-full bg-[#ffe27c]/30 px-2 py-1 text-xs">${escapeHtml(tag)}</span>`
    )
    .join(" ");
  const cover = post.coverImage
    ? `<img src="${escapeHtml(safeImage(post.coverImage))}" alt="${escapeHtml(post.title)}" class="mx-auto max-h-96 w-full object-cover" width="1200" height="500" decoding="async" />`
    : "";
  return `<div data-seo-prerender="true" dir="rtl" class="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]"><nav class="bg-[#191265] px-6 py-4 text-white"><div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><a href="/" class="text-xl font-bold">הילית כספי</a><div class="flex flex-wrap gap-5 text-sm"><a href="/database">המאגר</a><a href="/single-session">פגישה אישית</a><a href="/blog">כל המאמרים</a></div></div></nav>${cover}<main class="mx-auto max-w-3xl px-6 py-10"><article><div class="mb-4 flex flex-wrap gap-2">${tags}</div><h1 class="mb-4 text-3xl font-bold leading-tight md:text-4xl">${escapeHtml(post.title)}</h1><p class="mb-8 border-b border-[#191265]/15 pb-6 text-sm text-[#605b6a]">הילית כספי · ${escapeHtml(formatDate(post.publishedAt))}</p>${notice}<div class="editorial-body max-w-none text-[#191265]">${sanitizeBlogContent(post.content)}</div>${renderEditorialNextStep(post.slug, now)}<section class="mt-8 border-t border-[#191265]/15 pt-6" aria-label="עוד לקריאה"><h2 class="mb-3 text-lg font-bold">להמשיך לקרוא</h2><div class="flex flex-wrap gap-6 text-sm underline"><a href="/signs">סימנים לעניין בתחילת קשר</a><a href="/attraction">על משיכה וחיזור</a><a href="/blog">כל המאמרים</a></div></section></article></main></div>`;
}
export type SeoPage = {
  html: string;
  status: number;
  noindex: boolean;
  transientError?: boolean;
};
export async function prepareSeoPage(
  template: string,
  url: string,
  reader: SeoBlogReader = publicBlogReader,
  now = Date.now()
): Promise<SeoPage> {
  const path = normalizedPath(url);
  // Keep the existing English injection and US site behavior unchanged.
  if (path === "/en" || path.startsWith("/en/"))
    return { html: template, status: 200, noindex: isPrivatePage(path) };
  if (isPrivatePage(path))
    return {
      html: composeSeoHtml(
        template,
        { ...PUBLIC_ROUTE_META["/"], noindex: true },
        null
      ),
      status: 200,
      noindex: true,
    };
  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  const meta =
    PUBLIC_ROUTE_META[path] ??
    (blogMatch ? PUBLIC_ROUTE_META["/blog"] : undefined);
  if (!meta) return { html: template, status: 200, noindex: false };
  try {
    if (path === "/blog")
      return {
        html: composeSeoHtml(
          template,
          meta,
          path,
          renderBlogList(await reader.list(), now)
        ),
        status: 200,
        noindex: false,
      };
    if (blogMatch) {
      const slug = encodedSlug(blogMatch[1]);
      const post = slug ? await reader.article(blogMatch[1]) : null;
      if (!post)
        return {
          html: composeSeoHtml(
            template,
            {
              title: "מאמר לא נמצא | הילית כספי",
              description:
                "המאמר המבוקש אינו זמין. אפשר לעיין במאמרים נוספים על זוגיות ואהבה.",
              noindex: true,
            },
            null,
            '<main dir="rtl"><h1>מאמר לא נמצא</h1><a href="/blog">חזרה לכל המאמרים</a></main>'
          ),
          status: 404,
          noindex: true,
        };
      const expired =
        post.slug === "november-2026-database-course-offer" &&
        !isNovemberBundleOfferActive(now);
      const description = expired
        ? "הטבת נובמבר 2026 הסתיימה. אפשר לקרוא על מאגר ההיכרויות והשירותים הזמינים באתר."
        : post.metaDescription?.trim() || post.excerpt;
      return {
        html: composeSeoHtml(
          template,
          {
            title: `${post.title} | הילית כספי`,
            description,
            image: post.coverImage,
            type: "article",
          },
          `/blog/${slug}`,
          renderBlogArticle(post, now)
        ).replace(/<\/head>/i, () => `<script id="blog-structured-data" type="application/ld+json">${serializeStructuredData(blogStructuredData(post))}</script></head>`),
        status: 200,
        noindex: false,
      };
    }
    return {
      html: composeSeoHtml(template, meta, path),
      status: 200,
      noindex: false,
    };
  } catch {
    // Transient database/sanitizer errors are NOT evidence that a post is absent.
    // Keep an indexable 200 SPA shell and route canonical; don't log slug/records.
    console.warn("[SEO] public blog pre-render unavailable; serving SPA shell");
    return {
      html: composeSeoHtml(
        template,
        meta,
        blogMatch ? `/blog/${encodedSlug(blogMatch[1])}` : path
      ),
      status: 200,
      noindex: false,
      transientError: true,
    };
  }
}
export function applySeoPageHeaders(res: Response, page: SeoPage): void {
  res.setHeader(
    "Cache-Control",
    page.noindex || page.transientError ? "no-store" : "no-cache"
  );
  if (page.noindex) res.setHeader("X-Robots-Tag", "noindex, nofollow");
}
export function buildSitemap(posts: SitemapPost[]): string {
  const urls = PUBLIC_SITEMAP_PATHS.map(
    path => `<url><loc>${escapeXml(SEO_ORIGIN + path)}</loc></url>`
  );
  const seen = new Set<string>();
  for (const post of posts) {
    const slug = encodedSlug(post.slug);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const date = new Date(
      post.updatedAt > 0 ? post.updatedAt : post.publishedAt
    );
    const lastmod = Number.isFinite(date.getTime())
      ? `<lastmod>${date.toISOString()}</lastmod>`
      : "";
    urls.push(
      `<url><loc>${escapeXml(`${SEO_ORIGIN}/blog/${slug}`)}</loc>${lastmod}</url>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
const robotsPrivateRules = PRIVATE_ROUTE_PREFIXES.flatMap(prefix => [
  prefix,
  `/en${prefix}`,
]).flatMap(prefix => [
  `Disallow: ${prefix}$`,
  `Disallow: ${prefix}?`,
  `Disallow: ${prefix}/`,
]);
export const ROBOTS_TXT = `User-agent: *\nAllow: /\n${robotsPrivateRules.join("\n")}\nDisallow: /api/\nSitemap: ${SEO_ORIGIN}/sitemap.xml\n`;
export function registerSeoRoutes(
  app: Express,
  reader: SeoBlogReader = publicBlogReader
): void {
  app.get("/robots.txt", (_req, res) =>
    res
      .status(200)
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(ROBOTS_TXT)
  );
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      res
        .status(200)
        .type("application/xml")
        .set("Cache-Control", "no-cache")
        .send(buildSitemap(await reader.sitemap()));
    } catch {
      // No partial static-only sitemap on outage: it would remove published URLs.
      console.warn("[SEO] sitemap unavailable");
      res
        .status(503)
        .type("text/plain")
        .set({ "Cache-Control": "no-store", "Retry-After": "60" })
        .send("Sitemap temporarily unavailable");
    }
  });
  app.use((req, res, next) => {
    if (isPageRequest(req) && isPrivatePage(req.originalUrl)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
}
