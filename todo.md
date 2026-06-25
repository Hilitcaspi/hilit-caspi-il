# hilitcaspi.com — Full Port TODO

## Database
- [x] Port full Drizzle schema (21 tables) from source
- [x] Apply schema to new TiDB/MySQL database (all tables created)
- [x] Adjust unsupported TEXT DEFAULT expressions for TiDB (course_progress, matchmaking_answers)
- [x] Keep drizzle migration metadata in sync with applied schema

## Server
- [x] Port db.ts query helpers
- [x] Port routers.ts (all tRPC procedures)
- [x] Port matchmaking algorithm (matchmaking.ts) — 17 tests pass
- [x] Port automation sequences (automation.ts)
- [x] Port scheduling logic (email/meeting/match schedulers, Meta Lead poller)
- [x] Port integration modules: brevo, joni/WhatsApp (Green API), metaCapi, growPayment, growWebhook, ga4
- [x] Merge full _core/index.ts (Express routes, webhooks, redirects) + storageProxy registration
- [x] Keep new-scaffold infra files (llm, sdk, storage, storageProxy)
- [x] Install missing deps (multer, express-rate-limit, form-data, node-fetch, react-helmet-async + types)

## Client
- [x] Port all 50 Hebrew pages + 21 English pages (en/, en/blog)
- [x] Port all components, contexts, hooks, lib
- [x] Port index.html (RTL, Hebrew meta, GA4, Meta Pixel)
- [x] Port index.css (RTL, Tailwind theming, fonts)
- [x] Preserve framer-motion animations and wouter routing
- [x] Keep new-scaffold useAuth.ts + main.tsx (preview auto-login) + add HelmetProvider

## Integrations / Secrets
- [x] Configure BREVO_API_KEY — verified live (account: hilitcaspi@gmail.com)
- [x] Configure GREEN_API_INSTANCE_ID + GREEN_API_TOKEN — verified live (state: authorized)
- [x] Configure META_PAGE_ACCESS_TOKEN + META_PIXEL_ID + META_CAPI_TOKEN + META_FORM_ID_* — verified live (Hilit Caspi Relationship)
- [x] Configure META_WEBHOOK_VERIFY_TOKEN
- [x] Configure GROW_USER_ID + GROW_WEBHOOK_KEY + GROW_PAGE_CODE_* (server + VITE_ frontend)
- [x] Configure JONI_FIREBASE_URL

## Verification
- [x] TypeScript check passes (0 errors)
- [x] Full vitest suite passes (26 tests)
- [x] Live integration credential tests pass (Brevo, Green API, Meta)
- [x] Visual verification: Home, DNA Quiz, Database, English, Blog render correctly (RTL + LTR)
- [x] Production build succeeds (client + server bundle)

## Notes
- META_PIXEL_ID uses the pixel already hardcoded in index.html (1993907891537316). A second pixel (1404692968091892) is also initialized in index.html as in the source.
- META_CAPI_TOKEN currently reuses the Page Access Token; replace with a dedicated CAPI token if available.
- GROW_PAGE_CODE_* all share the same code (d9ee228fd53b) as provided.
- wrangler (Cloudflare Worker tooling) intentionally not installed — not needed for Manus hosting. GuideTest.tsx references VITE_GROW_PROXY_URL only for an optional Worker-based flow.
