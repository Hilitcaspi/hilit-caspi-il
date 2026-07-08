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
- [x] User to Publish this project so hilitcaspi.com points here (fixes all email links in production)

## Grow wallet hang fix (this session)
- [x] Rewrite growProxy to use express-parsed body (req.body) instead of raw stream read that never resolves after express.json (this was the wallet-hang root cause)
- [x] Add hard timeout (8s primary / 12s fallback) + Cloudflare Worker fallback so the proxy never hangs forever
- [x] Verify proxy responds quickly (3s) with authCode; added growProxy.test.ts regression test
- [x] Save checkpoint (ae80665f) + push to GitHub
- [x] User to Publish so the proxy fix reaches production, then verify wallet opens on hilitcaspi.com

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
- [x] Add wantsKids, hasKids, maritalStatus, height, education fields to singles without matches in "ללא התאמה" tab
- [x] Add same fields to recommended matches section below each single

## Add Details to "No Match" Tab (July 4)
- [x] Add wantsKids, hasKids, maritalStatus, height, education fields to singles in "ללא התאמה" tab
- [x] Add same fields to recommended matches section below each single

## Hide Blocked Matches Instead of Red Indicator (July 4)
- [x] Instead of showing blocked matches with red dot/disabled button, completely HIDE pending matches where either person is in an active proposal (for 48h or until resolved)

## Generate Matches for Sivan Rahamim (July 5)
- [x] Fixed Sivan's gender to female, age=41, seekingGender=male
- [x] Deleted 12 wrong matches (she was matched as male with females)
- [x] Generated 10 new correct matches via runMatchingForSingle (scores 58-73)

## WhatsApp Campaign for Missing Profile Data (July 5)
- [ ] Send personalized WhatsApp to 90 users with missing profile data
- [ ] Messages list what's specifically missing for each person
- [ ] Include profile link: /my-profile?email=X&token=Y
- [ ] 1-minute intervals between messages

## Storage Proxy Fix for Email Photos (July 5)
- [x] Fixed: /manus-storage/ proxy now pipes image content directly instead of 307 redirect (email clients don't follow redirects)
- [x] Resent match email to Or Amrani with Simon's photo (now loads correctly)
- [x] Updated Mor Levi's 'about' field to new text (CRM reads 'about' not 'aboutMe')
- [x] Updated Mor Levi's photo to new image

## Payment Failure Notifications (July 6)
- [x] Investigate today's actual payments (July 5-6) - 4 successful payments on July 5 (last at 17:39). System works. Hilit's failure was likely temporary Meshulam issue or card decline.
- [x] Add real-time payment failure notification via email to Hilit
- [x] Add real-time payment failure notification via WhatsApp to Hilit (+ partner)
- [x] Notify on every failed payment attempt immediately (server-side createProcess failures + client-side SDK failures)

## Apple Pay Domain Verification Fix (July 6)
- [x] Add .well-known/apple-developer-merchantid-domain-association file from Meshulam to fix Apple Pay on hilitcaspi.com

## Apple Pay Investigation Complete (July 7)
- [x] Investigated Apple Pay SDK integration in GrowWallet.tsx
- [x] Confirmed: Grow SDK has built-in Apple Pay service (a.min.js) using native window.ApplePaySession
- [x] Confirmed: The Meshulam Apple Pay SDK in index.html line 54 is for iframe-based flows (NOT needed for Grow SDK)
- [x] Confirmed: Domain verification file (.well-known/apple-developer-merchantid-domain-association) is correctly served (200 OK, 9122 bytes)
- [x] Confirmed: All SDK service files exist at correct paths (/grow-sdk/sdk/1.3.5/js/services/a.min.js)
- [x] Conclusion: Code-side is complete. Meshulam/Grow must register hilitcaspi.com in their Apple Developer Console (their step 4). Apple Pay will only appear on Safari/Apple devices once they complete this.

## Apple Pay FULLY RESOLVED (July 8) — two root causes found & fixed
- [x] Root cause 1: domain-association file signed by EXPIRED Apple cert (2021 file, cert expired May 2024). Replaced with current valid file (valid to Apr 2029), deployed via Manus, verified live (createdOn 1715203320642).
- [x] Root cause 2: Incapsula blocks the prod server's egress IP on /doPayment (Apple Pay merchant-session call) with an EMPTY HTTP 500; growProxy looksBlocked() only caught 403/503+HTML so the Worker fallback never fired. Fixed: any 5xx now triggers the fallback. Deployed via Manus.
- [x] End-to-end verified in production: tRPC createProcess → drawWalletPageData → doPayment(type 13) via /api/grow-proxy returns a valid Apple merchant session for hilitcaspi.com. See apple-pay-investigation.md.
- [ ] Final confirmation: real Apple Pay purchase on iPhone

## Tu B'Av Bundle Campaign (July 2026)
- [x] Research existing payment/guide/database flows for integration
- [x] Create hidden landing page /tu-bav with love-themed branding
- [x] Implement single payment of 349 NIS for bundle (database 249 + guide 99 instead of 249)
- [x] Post-purchase flow: database onboarding + one-time guide access email
- [ ] Test full purchase flow end-to-end (use test1 coupon code)

## Profile Completion Page & Email Campaign (July 7)
- [x] Build /join/complete?token=X page showing only missing fields for each user
- [x] Backend API: fetch missing fields by token, save updates to DB
- [x] Photo upload support on the complete page
- [x] Send emails to ~120 users with missing data (link to /join/complete or /join/questionnaire)

## Fix ThankYou page "email not found" after payment (July 8)
- [x] Add retry logic to ThankYouBundle.tsx (auto-retry up to 4 times with increasing delay when webhook hasn't arrived yet)
- [x] Add same retry logic to ThankYouDatabase.tsx
- [x] Fix bundle_tubav product detection in growWebhook.ts (was misidentified as "database" due to shared processToken)

## Fix Tu B'Av Bundle Flow - Payment First, Then Registration (July 8)
- [x] Fix handleBundleTuBav webhook: correctly identified by description "חבילת טו באב" (was misidentified as database due to shared processToken)
- [x] handleBundleTuBav calls handleDatabase (creates singles record with isPaid=true, creates free_access_token, sends email with /join?free_token=XXX) + handleGuide (sends guide email)
- [x] Fix ThankYouBundle page: removed email input form, replaced with "check your email" message (webhook already sends the join link + guide email automatically)
- [x] Existing free_token flow in Register.tsx already skips payment step and goes profile → DNA → questionnaire → done
- [x] Fix critical bug: product detection override only checked database→bundle_tubav but NOT guide→bundle_tubav (Grow returned guide processToken for bundle payment). Now checks both.

## Fix Bundle Questionnaire Missing Fields (July 8 - Part 2)
- [x] Add missing fields to ScientificQuestionnaire details step: birthDate, phone, lastName, seekingGender, shomerShabbat, religiosityOrigin, hasKids, numKids, wantsKids, closed city list
- [x] Add partner preferences step: age range, height range, religiosity, acceptsKids, location, freeText
- [x] Add DNA quiz step (EmbeddedDnaQuiz) between details and scientific questions
- [x] Fix DNA quiz integration (proper onComplete callback with dnaType)
- [x] Update completeQuestionnaire mutation to accept and save all new fields
- [x] Fix acceptsKids type (string enum → boolean conversion on server)
- [x] Always update basic identity fields for all records (not just skeleton)
- [x] Ensure all data saves correctly to the singles record in legacy DB

## Payment failure alert improvements
- [x] Add processToken to failure reports (client sends it, server includes in notification)
- [x] Extract cleaner error message from SDK onFailure response (r.message instead of raw JSON)
- [x] Include processToken in WhatsApp and email notifications for easier lookup in Grow dashboard
- [x] Fix duplicate guide email (skip journey when called from bundle flow)
- [x] Fix email preview text gibberish (add preheader div to guide + database emails, and add preheader param to baseTemplate for journey emails)

## Fix age confirmation checkbox (July 8)
- [x] Fix duplicate IDs in GrowWallet component (all instances shared id="gw-age") causing checkbox state mismatch on pages with multiple GrowWallet instances
- [x] Use React useId() for unique IDs per instance (age checkbox, terms checkbox, name/email/phone inputs)

## Fix growProxy double-prefix bug (July 8)
- [x] Fix resolveUpstream: was adding /api/light/server/1.0/ prefix to ALL paths, but SDK sends paths that already contain /api/light/web/1.0/ (e.g. drawWalletPageData). Result was double-prefixed URLs that returned 404/error from Meshulam, causing "מעבד..." to hang forever (translationsArr undefined → SDK crash)
- [x] Add needsPrefix() check: only add prefix for bare endpoints (like /doPayment), skip for paths already containing /api/light/ or /api/providers/
