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
- [x] Checkpoint (044a7a1e) + push to GitHub

## Server-error email alerts (this session)
- [x] Create server/_core/errorAlert.ts: sendErrorAlert() via Brevo to hilit@hilitcaspi.com, with dedupe/throttle
- [x] Wire tRPC onError (server/_core/index.ts) to sendErrorAlert (skips expected client errors)
- [x] Add Express error-handling middleware
- [x] Add process-level uncaughtException / unhandledRejection handlers
- [x] Wire sendErrorAlert into meaningful REST catch blocks (upload-photo, guide-download, daily-matching, update-ages)
- [x] Add vitest (4 tests pass) for throttling/dedupe/never-throws; tsc clean
- [x] Checkpoint (261dede4); push to GitHub

## Hidden UTM fields on thank-you page events (this session)
- [x] Enrich Meta Pixel events (all: trackPurchase, trackLead, trackViewContent, trackCompleteRegistration, trackInitiateCheckout) with hidden utm_source/utm_medium/utm_campaign from captured UTM
- [x] Enrich GA/GTM events (every dataLayer push, incl. gaPurchase/gaGenerateLead) with the same three hidden UTM fields
- [x] Verify all product thank-you pages (course, database, coaching, digital guide, session) + lead pages fire enriched events via shared helpers
- [x] Type-check (tsc --noEmit clean), checkpoint, push to GitHub

## DNA auto-linkage systemic fix (this session)
- [x] Systemic DNA auto-linkage: at registration time, if dnaType is missing, look up dna_quiz_results by phone/email to auto-fill
- [x] Reverse linkage: when DNA quiz is completed and singleId is set (markConverted), update singles.dnaType if null
- [x] Vitest tests for DNA auto-linkage logic
- [x] Fix EmbeddedDnaQuiz to pass sessionId back to Register.tsx (was lost before)
- [x] Add DNA auto-link to skeleton update branch in registerBasicProfile
- [x] Use useRef instead of useState for sessionId propagation (avoids stale closure race)
- [x] One-time backfill: 76 existing singles updated with DNA type from CRM lead → dna_quiz_results

## Homepage & Product Pages Improvements (July 4)
- [x] Remove "שיחת היכרות" button from top navigation
- [x] Replace "קביעת שיחה חינמית" button in hero section with "אשמח לקבוע פגישת היכרות" that links to WhatsApp
- [x] Add new section on homepage: "השיטה שלי" explaining the methodology (מדע האהבה) and how products were born from it
- [x] Fix free guide scroll - should scroll all the way down to the free guide section (added scroll-margin-top)
- [x] Check analytics: 639 guide_view, 35 guide_download, 51 CRM leads from guide_form. Guide IS generating leads.
- [x] In "בחרי את הדרך שלך לזוגיות מאושרת" section - swapped order: מאגר first (highlighted), then ליווי, then חינמי
- [x] Fix back button behavior: ScrollToTop now preserves scroll position on back/forward navigation
- [x] Fix: all product pages now have "חזרה לאתר →" button in nav (Guide, Course, Database, Coaching)
- [x] Remove "כניסה חינם למאגר" from single-session page (kept in coaching as it's part of the process)
- [x] Add "פגישת היכרות אישית" to homepage products grid
- [x] Add value proposition to guide page: "שווה ערך ל-2 פגישות אישיות איתי (שווי ₪1,000)"
- [x] Add value proposition to course page: "שווה ערך ל-5 פגישות אישיות איתי (שווי ₪2,500)"
- [x] Fix WhatsApp button in מאגר אישי section - now sends message about מאגר
- [x] Change "8 פגישות אישיות" to "8 או 12 פגישות" in coaching product description
- [x] In "מוכנה לשנות את הסיפור שלך" section - replaced Calendly with WhatsApp פגישת היכרות
- [x] Add user behavior analytics tracking (section_view, scroll_depth, button_click, product_click, intro_meeting_click, free_guide_cta)
- [x] Add purchase tracking to all ThankYou pages (coaching, course, database, guide, session)
- [x] Add form_submit tracking to free guide download and database registration
- [x] CoachingSales: Add "עדיין לא בטוחים? קבעו פגישת היכרות" option
- [x] CoachingSales: Add "מיד לאחר התשלום ניצור קשר בתוך 1-2 ימי עסקים כדי לקבוע תאריך הפגישה" to each package
- [x] CoachingSales: Add clinic locations (תל אביב, רמת השרון, זום)
- [x] SingleSessionSales: Remove free database entry mention
- [x] Verify coupons work correctly (BRAIN99=99₪ guide, LOVE10=10% any, HC500=500₪ off coaching)

## Questionnaire Improvements (July 4)
- [x] Replace age number input with birthDate date picker only, auto-calculate age from birthDate
- [x] Ensure age is always dynamically calculated from birthDate (not stored as static number)
- [x] Show calculated age to user in questionnaire for confirmation
- [x] Add religiosity sub-question: if דתי/מסורתי/דתל"ש → ask if שומר/ת שבת
- [x] Add דתל"ש (datlash) option to religiosity choices
- [x] Add religiosity preference sub-options including דתל"ש
- [x] Update server-side to calculate age from birthDate dynamically

## Email Journeys & CRM Analytics Overhaul (July 4)
- [x] Audit all email journeys/automations and document flows
- [x] Present email journey documentation to user for review
- [x] Fix CRM analytics: show real-time accurate email data (opens, clicks, conversions)
- [x] Add real-time alerts/recommendations to analytics dashboard
- [x] Implement user behavior tracking (session replay/heatmaps) integrated into CRM
- [x] Overhaul analytics page parameters and layout
- [x] Fix Brevo webhook bug (updates only last email instead of correct one)
- [x] Add time period filtering to analytics (week/month/all)
- [x] Fix conversion metrics to show accurate attribution
- [x] Show bounce/delivery rates in analytics
- [x] Add per-email detail page with UTM attribution
- [x] Track and display conversion source (which campaign/email/page led to purchase)
- [x] Track and display WhatsApp group join sources
- [x] Add real-time alerts and recommendations engine
- [x] Implement Hotjar-style behavior tracking (heatmaps, session recording, click maps)

## Cart Abandonment & Journey Cleanup (July 4)
- [x] Build cart abandonment trigger: detect purchase intent click → wait 1hr → check if paid → start abandoned journey
- [x] Hide unused journeys from analytics display (kept in code for future reactivation)
- [x] Test abandonment flow end-to-end (TS clean, all 41 tests pass)

## Paid Users Visibility Fix (July 4)
- [x] Change logic: isPaid=true → isActive=true immediately (show in database even without full profile)
- [x] Add "incomplete profile" indicator for admin view (already exists: getMissingData procedure)
- [x] Fix existing 35 paid-but-inactive users to be active (UPDATE executed, 35 rows fixed)
- [x] Fix Grow webhook to set isActive=true on payment (both new-record and existing-record branches)

## Homepage & Product Pages Fixes Round 2 (July 4 - evening)
- [x] Remove ALL Calendly links from entire site - replace "שיחת היכרות חינמית" with contact form/WhatsApp for "פגישת היכרות" (paid ₪500)
- [x] Hero section: replace with "אשמח לקבוע פגישת היכרות" linking to /single-session
- [x] Expand "השיטה שלי" section - already has methodology section with מדע האהבה explanation
- [x] Free guide section: fixed scroll-margin-top to 0px so it scrolls all the way down
- [x] Check if anyone clicks the free guide button - only 1 test lead from guide_form, 18 page views on guide pages. Low engagement.
- [x] "בחרי את הדרך שלך" section: already reordered in Round 1 - מאגר first
- [x] Fix back button: rewrote ScrollToTop with popstate listener for proper back navigation
- [x] Fix scroll position: ScrollToTop now saves/restores scroll position via sessionStorage
- [x] Ensure ALL product pages have "חזרה לעמוד הבית" button - already done in Round 1
- [x] "פגישת היכרות אישית" product: updated FAQ to remove free database mention
- [x] Guide page: already added in Round 1
- [x] Course page: already added in Round 1
- [x] Fix WhatsApp button in מאגר אישי section - message already says "מאגר האישי" (verified)
- [x] Change coaching "8 פגישות" to "8-12 פגישות"
- [x] "מוכנה לשנות את הסיפור שלך" section: replaced with /single-session link
- [x] Behavior tracking: confirmed working - behaviorTracker.ts tracks section_view, scroll_depth, button_click, product_click events

## CRM Matchmaking Bugs (July 4)
- [x] Fix: Algorithm IS running daily (718 new pending since June 24). Matches show in 'ממתין לשליחה' tab
- [x] Fix: "נשלחו הצעות" tab now shows ALL matches ever sent (proposedAt != null) - was only showing status=proposed (1 active)
- [x] Fix: "יש התאמה" tab now shows ALL 43 matched pairs (removed 14-day split that hid older matches)
- [x] Sort pending matches by date (newest first) instead of by score
- [x] Bug: Match proposal emails show broken photo - photoUrl was relative (/manus-storage/...) instead of absolute (https://hilitcaspi.com/manus-storage/...). Fixed all 6 occurrences.

## Resend Match Emails (July 4)
- [ ] Resend Yuval-Dana match with correct photo URLs (was sent before photo URL fix)

## Active Match Blocking Indicator (July 4)
- [x] When a match is sent (proposed), mark all other pending matches for that person as "blocked" with red dot
- [x] Disable "שלח התאמה" button on blocked matches (greyed out, not clickable)
- [x] Show "⏳ בהתאמה פעילה (עוד X שעות)" text on blocked match cards
- [x] Blocking applies to BOTH people in the sent match (both directions)
- [x] Blocking auto-expires after 48 hours or when the active match is resolved (declined/expired/matched)

## Add Details to "No Match" Tab (July 4)
- [ ] Add wantsKids, hasKids, maritalStatus, height, education fields to singles without matches in "ללא התאמה" tab
- [ ] Add same fields to recommended matches section below each single

## Add Details to "No Match" Tab (July 4)
- [x] Add wantsKids, hasKids, maritalStatus, height, education fields to singles in "ללא התאמה" tab
- [x] Add same fields to recommended matches section below each single

## Hide Blocked Matches Instead of Red Indicator (July 4)
- [x] Instead of showing blocked matches with red dot/disabled button, completely HIDE pending matches where either person is in an active proposal (for 48h or until resolved)
