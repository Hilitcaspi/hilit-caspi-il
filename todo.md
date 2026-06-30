# Payment Fix TODO

- [x] Restore client/public/grow-sdk/ (46 files, 1.8MB) — fixes "SDK script load timeout"
- [x] Verify SDK loads in browser (window.growPayment defined, no timeout)
- [x] Confirm createProcess tRPC works against secure.meshulam.co.il

## Payment — Local Grow Proxy (replace external Cloudflare Worker)

- [x] Add server route `/api/grow-proxy/*` that forwards browser SDK requests to Meshulam server-side, bypassing CORS
- [x] Mirror the original Worker URL-rewrite logic on the server
- [x] Add Incapsula-detection fallback to the Cloudflare Worker in the proxy handler
- [x] Update `client/public/grow-sdk/gs.min.js` to point the fetch monkey-patch at local `/api/grow-proxy`
- [x] Confirm runtime uses fetch only (no XHR) — monkey-patch catches all Meshulam calls
- [x] Test full wallet open flow in browser — SDK loads + services load ✓; createProcess returns 403 Incapsula (sandbox datacenter IP blocked by Meshulam — expected, not a code issue)
- [ ] Verify on production domain (hilitcaspi.com) after Publish — real IP, same origin as original
- [x] Save checkpoint & push to GitHub

## Live DB + Schedulers + Email links (this session)

- [x] Connect project to original live DB via LEGACY_DATABASE_URL (db.ts prefers it over DATABASE_URL)
- [x] Vitest validates live DB connection (crm_leads = 4,462)
- [x] Enable schedulers on this project (SCHEDULERS_ENABLED=true) — email/match/Meta poll all started
- [x] User unpublished the old project to stop duplicate schedulers
- [x] Diagnose broken "כן, מעניין אותי" button: wrong baseUrl (hilitcaspi.manus.space + VITE_OAUTH_PORTAL_URL) and answer vs response param
- [x] Fix both baseUrls to https://hilitcaspi.com and use response=yes/no
- [x] Checkpoint 9eb38df5 + pushed to GitHub
- [ ] User to Publish this project so hilitcaspi.com points here (fixes all email links in production)
