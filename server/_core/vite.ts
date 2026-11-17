import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import {
  applySeoPageHeaders,
  isPageRequest,
  prepareSeoPage,
  registerSeoRoutes,
} from "../seoRoutes";

// ─── English OG meta tags for /en/* paths ─────────────────────────────────────
// WhatsApp and social crawlers read OG tags from the raw HTML served by the server.
// Since this is a SPA, we inject English OG tags server-side for /en/* routes.
const EN_OG_CONFIG: Record<string, { title: string; description: string }> = {
  "/en/join": {
    title: "Join the Singles Database | Hilit Caspi — Matchmaker",
    description: "Join a curated singles database with personal matchmaking. Science-based compatibility. Hundreds of couples found love.",
  },
  "/en/database": {
    title: "Singles Database | Hilit Caspi — Matchmaker",
    description: "A curated singles database with personal matchmaking by Hilit Caspi. Science-based compatibility matching.",
  },
  "/en/guide": {
    title: "Choose Right — Digital Guide | Hilit Caspi",
    description: "A digital guide to help you understand what you're really looking for in a partner. Based on positive psychology.",
  },
  "/en/course": {
    title: "The Journey — Online Course | Hilit Caspi",
    description: "5 modules that will take you from stuck to finding love. A practical online course by Hilit Caspi.",
  },
  "/en/coaching": {
    title: "Personal Coaching | Hilit Caspi — Relationship Coach",
    description: "1-on-1 relationship coaching to help you find and build a lasting relationship. By Hilit Caspi.",
  },
  "/en": {
    title: "Hilit Caspi | Relationship Coach & Matchmaker",
    description: "I cracked the secret code to finding love. Discover your Relationship DNA, join a curated singles database, and finally meet someone who truly fits you.",
  },
};

function injectEnglishOgTags(html: string, url: string): string {
  // Strip query params and hash for matching
  const cleanUrl = url.split("?")[0].split("#")[0].replace(/\/$/, "") || "/en";
  // Find the best matching config (exact match first, then fallback to /en)
  const config = EN_OG_CONFIG[cleanUrl] || EN_OG_CONFIG["/en"]!;

  // Replace Hebrew OG tags with English ones
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${config.title}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${config.description}" />`
  );
  html = html.replace(
    /<meta property="og:locale" content="he_IL" \/>/,
    `<meta property="og:locale" content="en_US" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="https://www.hilitcaspi.com${cleanUrl}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${config.title}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${config.description}" />`
  );
  // Also replace the page title and description meta
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${config.title}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${config.description}" />`
  );
  return html;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  registerSeoRoutes(app);
  // Isolated TV demonstration: no production app bootstrap or debug replay.
  app.get("/tv-demo.html", async (_req, res, next) => {
    try {
      const source = await fs.promises.readFile(path.resolve(import.meta.dirname, "../..", "client/tv-demo.html"), "utf-8");
      const transformed = await vite.transformIndexHtml("/tv-demo.html", source);
      const html = transformed.replace(/<script[^>]*src=["']\/__manus__\/debug-collector\.js["'][^>]*><\/script>/g, "");
      res.set({ "X-Robots-Tag": "noindex, nofollow, noarchive", "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).send(html);
    } catch (error) {
      next(error);
    }
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    if (!isPageRequest(req)) return next();
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      // Inject English OG meta tags for /en/* paths (WhatsApp/social crawlers read these)
      if (url.startsWith("/en")) {
        template = injectEnglishOgTags(template, url);
      }
      const seoPage = await prepareSeoPage(template, url);
      let page = await vite.transformIndexHtml(url, seoPage.html);
      // Vite's normal CSS is JS-injected. Block first paint of blog pre-render
      // until the same app stylesheet is available; keep runtime/HMR injection.
      if (seoPage.html.includes('data-seo-prerender="true"')) {
        page = page.replace(
          "</head>",
          () => '<link rel="stylesheet" href="/src/index.css?direct" /></head>'
        );
      }
      applySeoPageHeaders(res, seoPage);
      res
        .status(seoPage.status)
        .set({ "Content-Type": "text/html; charset=utf-8" })
        .end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  registerSeoRoutes(app);
  // The HTML handler must own /, not express.static's automatic index serving.
  app.use(express.static(distPath, { index: false, redirect: false }));

  // API and missing assets must never receive the SPA HTML/SEO fallback.
  app.use("*", async (req, res, next) => {
    if (!isPageRequest(req)) return next();
    const url = req.originalUrl;
    const htmlPath = path.resolve(distPath, "index.html");
    try {
      let template = await fs.promises.readFile(htmlPath, "utf-8");
      if (url.startsWith("/en")) {
        template = injectEnglishOgTags(template, url);
      }
      const page = await prepareSeoPage(template, url);
      applySeoPageHeaders(res, page);
      res
        .status(page.status)
        .set({ "Content-Type": "text/html; charset=utf-8" })
        .end(page.html);
    } catch (error) {
      next(error);
    }
  });
}
