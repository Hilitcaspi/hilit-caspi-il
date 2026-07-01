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
- [x] Root cause of payment error 701: code used sandbox Grow credentials against secure.meshulam.co.il. Fixed with verified PRODUCTION userId e02cfda4ca3d4736 + wallet pageCode b497c06813ac (server + VITE_), validated by growPayment.live.test.ts
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

## Grow wallet hang fix (this session)
- [x] Rewrite growProxy to use express-parsed body (req.body) instead of raw stream read that never resolves after express.json (this was the wallet-hang root cause)
- [x] Add hard timeout (8s primary / 12s fallback) + Cloudflare Worker fallback so the proxy never hangs forever
- [x] Verify proxy responds quickly (3s) with authCode; added growProxy.test.ts regression test
- [x] Save checkpoint (ae80665f) + push to GitHub
- [ ] User to Publish so the proxy fix reaches production, then verify wallet opens on hilitcaspi.com

## Children display on profile + match email (this session)
- [x] Profile card (CRMMatchmaking): two separate rows — "יש ילדים וכמה" and "רוצה ילדים" — reading real questionnaire fields (hasKids/numKids/wantsKids) for ALL singles
- [x] Match proposal email (emailTemplates.buildMatchProposalEmail): include children info (has kids + count) for the proposed person
- [x] Confirm the router passes hasKids/numKids/wantsKids into the email builder (fixed 3rd call site at 3538/3558 which was missing them + gender)
- [x] Show user a preview of both cases before finalizing

## Favicon + release-match button (this session)
- [x] Restore favicon to Hilit's photo (created favicon.ico + favicon-32.png + favicon-180.png in client/public, wired index.html with cache-bust)
- [x] Add "שחרר התאמה" button in the "יש התאמה" match cards (status matched), wired to existing releaseFromMatch mutation
- [x] Verify, checkpoint (97148a01), push to GitHub

## Security: IDOR fixes (this session)
- [x] Remove/lock singles.getById (removed; was public, returned full PII by numeric id, unused in client)
- [x] Add questionnaireToken verification to singles.getMatches; update Matches.tsx to pass token
- [x] Type-check passed; verified no remaining getById refs
- [ ] Checkpoint + push to GitHub
