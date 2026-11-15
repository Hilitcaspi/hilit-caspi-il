import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import fs from "node:fs";
import { once } from "node:events";
import type { Server } from "node:http";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("../vite.config", () => ({ default: {} }));
vi.mock("vite", () => ({ createServer: vi.fn() }));
import { getDb } from "./db";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "node:http";
import { serveStatic, setupVite } from "./_core/vite";
import {
  applySeoPageHeaders,
  buildSitemap,
  composeSeoHtml,
  escapeXml,
  isPageRequest,
  isPrivatePage,
  prepareSeoPage,
  publicBlogReader,
  PUBLIC_SITEMAP_PATHS,
  registerSeoRoutes,
  ROBOTS_TXT,
  SEO_ORIGIN,
  type SeoBlogReader,
} from "./seoRoutes";

const template =
  '<!doctype html><html lang="he"><head><title>old</title><meta content="old" name="description"><meta property="og:title" content="old"><meta name="twitter:title" content="old"><link href="/old" rel="canonical"><LINK REL=canonical HREF=/old2><meta name="robots" content="noindex"><meta charset="UTF-8"><link rel="icon" href="/favicon.ico"><script>window.kept=true;</script></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';
const post = {
  id: 1,
  title: 'אהבה & "בחירה"',
  slug: "אהבה-ובחירה",
  excerpt: "תובנה <אמיתית> & זוגיות",
  content:
    '<h2>כותרת פנימית</h2><p>אותו תוכן פומבי $& $$</p><script>alert(1)</script><a href="javascript:alert(1)">קישור</a><img src="/safe.jpg" onerror="alert(1)">',
  coverImage: null,
  metaDescription: null,
  tags: null,
  isPublished: true,
  publishedAt: 1780000000000,
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};
function reader(overrides: Partial<SeoBlogReader> = {}): SeoBlogReader {
  return {
    list: vi.fn().mockResolvedValue([post]),
    article: vi.fn().mockResolvedValue(post),
    sitemap: vi.fn().mockResolvedValue([post]),
    ...overrides,
  };
}
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function listen(app: express.Express) {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  return `http://127.0.0.1:${address.port}`;
}

describe("SEO privacy and page boundaries", () => {
  it.each([
    "/admin",
    "/admin/users",
    "/crm/blog",
    "/crm?token=secret",
    "/join/token",
    "/join/complete",
    "/my-profile",
    "/match/respond?token=secret",
    "/match/outcome",
    "/match/owner-approve",
    "/thank-you/session",
    "/thanks/next",
    "/guide/access",
    "/guide/view/record",
    "/course/view",
    "/access/token",
    "/live/thank-you",
    "/en/my-profile",
    "/%63rm/blog",
    "/admin/",
    "/team/login",
    "/testimonial/feedback",
    "/__preview/test",
    "/november",
    "/compass",
    "/lead",
    "/ld",
    "/ll",
    "/lp",
    "/join/token.with.periods",
  ])("marks explicit private route %s", path =>
    expect(isPrivatePage(path)).toBe(true)
  );
  it.each([
    "/administrator",
    "/crm-public",
    "/joinery",
    "/matches-guide",
    "/guide",
    "/guide/accessibility",
    "/match-boost",
    "/match/responding",
    "/thank-you-guide",
    "/user-story",
    "/blog",
    "/database",
    "/urology",
    "/november-love",
    "/leadership",
  ])("does not overmatch public path %s", path =>
    expect(isPrivatePage(path)).toBe(false)
  );
  it.each([
    "/api/trpc/auth.me",
    "/api/unknown",
    "/assets/app.js",
    "/assets",
    "/src/main.tsx",
    "/@vite/client",
    "/manus-storage/photo",
    "/missing.png",
    "/robots.txt",
    "/sitemap.xml",
  ])("does not handle API or asset %s", originalUrl =>
    expect(isPageRequest({ method: "GET", originalUrl })).toBe(false)
  );
  it("does not handle POST or payment payloads", () => {
    expect(
      isPageRequest({ method: "POST", originalUrl: "/single-session" })
    ).toBe(false);
    expect(
      isPageRequest({ method: "GET", originalUrl: "/blog/slug.with.dot" })
    ).toBe(true);
  });
});

describe("safe request-local head and public pre-render", () => {
  it("removes all old SEO tags before adding one escaped canonical and preserves unrelated tags", () => {
    const html = composeSeoHtml(
      template,
      {
        title: '</title><script>evil</script> $& " &',
        description: '\"/><img onerror=evil> & $&',
      },
      "/blog/choice?a=1&b=2"
    );
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/name="twitter:title"/g)).toHaveLength(1);
    expect(html).toContain(
      'href="https://hilitcaspi.com/blog/choice?a=1&amp;b=2"'
    );
    expect(html).toContain(
      "&lt;/title&gt;&lt;script&gt;evil&lt;/script&gt; $&amp; &quot; &amp;"
    );
    expect(html).not.toContain("<script>evil");
    expect(html).not.toContain('content="old"');
    expect(html).not.toContain('content="noindex"');
    expect(html).toContain('rel="icon"');
    expect(html).toContain("window.kept=true");
    expect(html).toContain('src="/src/main.tsx"');
  });
  it("escapes single-quoted/reordered metadata and injects replacement values literally", () => {
    const html = composeSeoHtml(
      "<head><meta content=old name=description><link href=old rel='alternate canonical'><meta content=old property=og:title></head><div id=\"root\"></div>",
      { title: "$` $' $$ $&", description: "safe \" ' < > &" },
      "/blog",
      "<p>$& $$ $`</p>"
    );
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain("<title>$` $&#39; $$ $&amp;</title>");
    expect(html).toContain('<div id="root"><p>$& $$ $`</p></div>');
    expect(html).toContain("safe &quot; &#39; &lt; &gt; &amp;");
  });
  it("renders the same published article with shared allowlist sanitation and unicode canonical", async () => {
    const page = await prepareSeoPage(
      template,
      `/blog/${encodeURIComponent(post.slug)}?utm_source=google`,
      reader()
    );
    expect(page.status).toBe(200);
    expect(page.noindex).toBe(false);
    expect(page.html).toContain("<h2>כותרת פנימית</h2>");
    expect(page.html).toContain("אותו תוכן פומבי $&amp; $$");
    expect(page.html).toContain(
      'href="https://hilitcaspi.com/blog/' + encodeURIComponent(post.slug) + '"'
    );
    expect(page.html).not.toContain("javascript:");
    expect(page.html).not.toContain("onerror=");
    expect(page.html).not.toContain("alert(1)");
    expect(page.html).toContain("תובנה &lt;אמיתית&gt; &amp; זוגיות");
  });
  it("pre-renders only the public list fields and links static guides once", async () => {
    const page = await prepareSeoPage(template, "/blog", reader());
    expect(page.html).toContain(
      'href="/blog/' + encodeURIComponent(post.slug) + '"'
    );
    expect(page.html.match(/href="\/signs"/g)).toHaveLength(1);
    expect(page.html.match(/href="\/attraction"/g)).toHaveLength(1);
    expect(page.html).not.toContain("כותרת פנימית");
  });
  it("keeps the shared story CTA and all three pathways in the styled article body", async () => {
    const story = { ...post, slug: "hilit-shahar-story-relationship-criteria" };
    const page = await prepareSeoPage(
      template,
      `/blog/${story.slug}`,
      reader({ article: vi.fn().mockResolvedValue(story) }),
      Date.parse("2026-11-15T12:00:00+02:00")
    );
    expect(page.html).toContain('data-seo-prerender="true"');
    expect(page.html).toContain(
      'class="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]"'
    );
    expect(page.html).toContain("מהסיפור שלי לבחירה שלך");
    expect(page.html).toContain('href="/single-session"');
    expect(page.html).toContain('href="/database"');
    expect(page.html).toContain('href="/dna-quiz"');
    expect(page.html).toContain('href="/november-love"');
  });
  it("marks the November article as archival after expiry, without an active bundle CTA", async () => {
    const offer = { ...post, slug: "november-2026-database-course-offer" };
    const page = await prepareSeoPage(
      template,
      `/blog/${offer.slug}`,
      reader({ article: vi.fn().mockResolvedValue(offer) }),
      Date.parse("2026-12-01T00:00:00+02:00")
    );
    expect(page.html).toContain("הטבת נובמבר 2026 הסתיימה.");
    expect(page.html).toContain("המחיר וההטבה המתוארים אינם הצעה פעילה.");
    expect(page.html).not.toContain('href="/november-love"');
    expect(page.status).toBe(200);
  });
  it("returns a genuine 404 and noindex only when published query has no match", async () => {
    const page = await prepareSeoPage(
      template,
      "/blog/missing",
      reader({ article: vi.fn().mockResolvedValue(null) })
    );
    expect(page.status).toBe(404);
    expect(page.noindex).toBe(true);
    expect(page.html).toContain("מאמר לא נמצא");
    expect(page.html).not.toContain('rel="canonical"');
  });
  it.each(["/blog/known", "/blog"])(
    "does not turn transient error into missing page at %s",
    async url => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const failing = vi.fn().mockRejectedValue(new Error("temporary outage"));
      const page = await prepareSeoPage(
        template,
        url,
        reader({ article: failing, list: failing })
      );
      expect(page.status).toBe(200);
      expect(page.noindex).toBe(false);
      expect(page.transientError).toBe(true);
      expect(page.html).not.toContain("מאמר לא נמצא");
      expect(page.html).not.toContain('name="robots"');
      expect(page.html).toContain(`href="${SEO_ORIGIN}${url}"`);
    }
  );
  it("does not read a blog or private data for protected pages or English pages", async () => {
    const data = reader();
    const privatePage = await prepareSeoPage(
      template,
      "/crm/blog?token=private",
      data
    );
    expect(privatePage.status).toBe(200);
    expect(privatePage.noindex).toBe(true);
    expect(privatePage.html).not.toContain('rel="canonical"');
    const english = await prepareSeoPage(template, "/en/blog/test", data);
    expect(english.html).toBe(template);
    expect(data.article).not.toHaveBeenCalled();
    expect(data.list).not.toHaveBeenCalled();
  });
  it("has distinct metadata for every approved route, no nonexistent about", async () => {
    expect(PUBLIC_SITEMAP_PATHS).not.toContain("/about");
    const titles = new Set<string>();
    for (const path of PUBLIC_SITEMAP_PATHS) {
      const page = await prepareSeoPage(template, path, reader());
      expect(page.status).toBe(200);
      expect(page.html.match(/rel="canonical"/g)).toHaveLength(1);
      expect(page.html).not.toContain('name="robots"');
      titles.add(page.html.match(/<title>(.*?)<\/title>/)![1]);
    }
    expect(titles.size).toBe(PUBLIC_SITEMAP_PATHS.length);
  });
});

describe("published-only reader and XML", () => {
  it("uses isPublished=true in list, article and sitemap query predicates", async () => {
    const where = vi.fn();
    const result: unknown[] = [];
    const query: any = {
      from: vi.fn().mockReturnThis(),
      where: where.mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown[]) => unknown) =>
        Promise.resolve(resolve(result)),
    };
    vi.mocked(getDb).mockResolvedValue({
      select: vi.fn().mockReturnValue(query),
    } as any);
    await publicBlogReader.list();
    await publicBlogReader.article("synthetic-slug");
    await publicBlogReader.sitemap();
    const dialect = new MySqlDialect();
    expect(where).toHaveBeenCalledTimes(3);
    for (const [predicate] of where.mock.calls) {
      const sql = dialect.sqlToQuery(predicate);
      expect(sql.sql).toContain("`blog_posts`.`isPublished` = ?");
      expect(sql.params).toContain(true);
    }
    const articleQuery = dialect.sqlToQuery(where.mock.calls[1][0]);
    expect(articleQuery.params).toContain("synthetic-slug");
    expect(query.limit).toHaveBeenCalledWith(50);
    expect(query.limit).toHaveBeenCalledWith(1);
  });
  it("throws DB unavailability instead of returning an empty list or fake missing article", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    await expect(publicBlogReader.list()).rejects.toThrow("unavailable");
    await expect(publicBlogReader.article("real-page")).rejects.toThrow(
      "unavailable"
    );
    await expect(publicBlogReader.sitemap()).rejects.toThrow("unavailable");
  });
  it("escapes XML, encodes slug components, excludes unsafe slugs and duplicates", () => {
    expect(escapeXml("A&B<\"'>")).toBe("A&amp;B&lt;&quot;&apos;&gt;");
    const xml = buildSitemap([
      { slug: "אהבה&בחירה", publishedAt: 1780000000000, updatedAt: 0 },
      { slug: "אהבה&בחירה", publishedAt: 1780000000000, updatedAt: 0 },
      { slug: "../private", publishedAt: 1780000000000, updatedAt: 0 },
      { slug: "bad?token=private", publishedAt: 1780000000000, updatedAt: 0 },
      { slug: '"<slug>', publishedAt: 1780000000000, updatedAt: 0 },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml.match(/<url>/g)).toHaveLength(PUBLIC_SITEMAP_PATHS.length + 2);
    expect(xml).toContain(encodeURIComponent("אהבה&בחירה"));
    expect(xml).not.toContain("private");
    expect(xml).not.toContain("token");
    expect(xml).not.toContain("<slug>");
    expect(xml).not.toContain("NaN");
  });
});

describe("HTTP middleware isolation and production wiring", () => {
  it("preserves Vite transform/runtime, main entry and adds blocking dev CSS for public pre-render", async () => {
    const transformIndexHtml = vi.fn(async (_url: string, html: string) =>
      html.replace("</head>", '<script src="/@vite/client"></script></head>')
    );
    vi.mocked(createViteServer).mockResolvedValue({
      middlewares: (_req: unknown, _res: unknown, next: () => void) => next(),
      transformIndexHtml,
      ssrFixStacktrace: vi.fn(),
    } as any);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({ orderBy: () => ({ limit: async () => [post] }) }),
        }),
      }),
    } as any);
    vi.spyOn(fs.promises, "readFile").mockResolvedValue(template);
    const app = express();
    await setupVite(app, createHttpServer(app));
    const base = await listen(app);
    const response = await fetch(base + "/blog");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(transformIndexHtml).toHaveBeenCalledOnce();
    expect(html).toContain('src="/@vite/client"');
    expect(html).toMatch(/src="\/src\/main.tsx\?v=[^"]+"/);
    expect(html).toContain('href="/src/index.css?direct"');
    expect(html).toContain('data-seo-prerender="true"');
  });
  it("serves actual plain-text robots and complete sitemap or temporary 503", async () => {
    const data = reader();
    const app = express();
    registerSeoRoutes(app, data);
    const base = await listen(app);
    const robots = await fetch(`${base}/robots.txt`);
    expect(robots.status).toBe(200);
    expect(robots.headers.get("content-type")).toContain("text/plain");
    expect(await robots.text()).toBe(ROBOTS_TXT);
    expect(ROBOTS_TXT).toContain(`Sitemap: ${SEO_ORIGIN}/sitemap.xml`);
    const sitemap = await fetch(`${base}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get("content-type")).toContain("application/xml");
    expect(await sitemap.text()).toContain("/blog/");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(data.sitemap).mockRejectedValue(new Error("outage"));
    const failed = await fetch(`${base}/sitemap.xml`);
    expect(failed.status).toBe(503);
    expect(failed.headers.get("cache-control")).toBe("no-store");
    expect(failed.headers.get("retry-after")).toBe("60");
    expect(await failed.text()).not.toContain("<urlset");
  });
  it("does not touch preceding API, payment redirects, assets or POST", async () => {
    const app = express();
    app.get("/payment-return", (_req, res) =>
      res.redirect(302, "/thank-you/session?token=synthetic")
    );
    app.get("/api/public", (_req, res) => res.json({ ok: true }));
    registerSeoRoutes(app, reader());
    app.use((_req, res) => res.status(200).send("unchanged"));
    const base = await listen(app);
    for (const path of [
      "/api/public",
      "/assets/app.js",
      "/api/crm",
      "/payment-return",
    ]) {
      const response = await fetch(base + path, { redirect: "manual" });
      expect(response.headers.get("x-robots-tag")).toBeNull();
      expect(response.headers.get("cache-control")).toBeNull();
      if (path === "/payment-return") {
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe(
          "/thank-you/session?token=synthetic"
        );
      }
    }
    const privatePage = await fetch(`${base}/crm/profile?token=synthetic`);
    expect(privatePage.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(privatePage.headers.get("cache-control")).toBe("no-store");
    const posted = await fetch(`${base}/crm`, { method: "POST" });
    expect(posted.headers.get("x-robots-tag")).toBeNull();
  });
  it("processes production root HTML, leaves English OG injection intact, and excludes missing assets/API", async () => {
    vi.stubEnv("NODE_ENV", "development"); // serveStatic's existing source-tree dist lookup.
    vi.spyOn(fs.promises, "readFile").mockResolvedValue(template);
    const app = express();
    serveStatic(app);
    const base = await listen(app);
    const root = await fetch(base + "/");
    expect(root.status).toBe(200);
    expect((await root.text()).match(/rel="canonical"/g)).toHaveLength(1);
    const page = await fetch(base + "/database");
    expect(await page.text()).toContain("מאגר רווקים ורווקות והתאמות לזוגיות");
    const english = await fetch(base + "/en/database");
    expect(await english.text()).toContain("Singles Database | Hilit Caspi");
    for (const path of [
      "/assets/missing-test-seo.js",
      "/api/missing-test-seo",
    ]) {
      const response = await fetch(base + path);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('id="root"');
    }
    const privatePage = await fetch(base + "/my-profile");
    expect(privatePage.headers.get("cache-control")).toBe("no-store");
    expect(privatePage.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const missing = await fetch(base + "/blog/missing");
    // Mock DB unavailable must retain a 200 indexable shell, never false 404.
    expect(missing.status).toBe(200);
    expect(missing.headers.get("x-robots-tag")).toBeNull();
  });
});
