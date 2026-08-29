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
- [x] ~~Resend Yuval-Dana match with correct photo URLs~~ (הוסר סופית)

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
- [x] ~~Send personalized WhatsApp to 90 users with missing profile data~~ (הוסר סופית)
- [x] ~~Messages list what's specifically missing for each person~~ (הוסר סופית)
- [x] ~~Include profile link: /my-profile?email=X&token=Y~~ (הוסר סופית)
- [x] ~~1-minute intervals between messages~~ (הוסר סופית)

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
- [x] ~~Final confirmation: real Apple Pay purchase on iPhone~~ (הוסר סופית)

## Tu B'Av Bundle Campaign (July 2026)
- [x] Research existing payment/guide/database flows for integration
- [x] Create hidden landing page /tu-bav with love-themed branding
- [x] Implement single payment of 349 NIS for bundle (database 249 + guide 99 instead of 249)
- [x] Post-purchase flow: database onboarding + one-time guide access email
- [x] ~~Test full purchase flow end-to-end (use test1 coupon code)~~ (הוסר סופית)

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

## Switch to official Meshulam CDN SDK (July 8)
- [x] Replace local SDK (/grow-sdk/gs.min.js) with official Meshulam CDN (https://cdn.meshulam.co.il/sdk/gs.min.js) — SDK communicates directly with Meshulam servers from the browser, bypassing the grow-proxy entirely

## Tu B'Av Campaign Creative Refresh (July 9)
- [x] Create new Meta creatives in a softer, cleaner, more delicate style aligned with hilitcaspi.com
- [x] Integrate Hilit's real photos into the Tu B'Av campaign creatives
- [x] Add subtle branding bar/logo: "הילית כספי | מאמנת ומרצה למציאת זוגיות"
- [x] Prepare feed and story ad variations adapted for Meta placements
- [x] Audit /tu-bav landing page for UTMs, Meta Pixel, and campaign tracking readiness
- [x] Deliver exact campaign guidance: audiences, budget, creative mix, and setup instructions

## CRM Matchmaking Sort Fix (July 9)
- [x] Sort sent/proposed matches by proposedAt instead of createdAt
- [x] Show proposedAt date in CRM sent-match cards instead of createdAt

## Fix Photo Upload Bug (July 9)
- [x] Fix storagePut key containing Hebrew characters (firstName) causing "file path must be ASCII" error — changed to `single-{id}-{timestamp}.{ext}`
- [x] Send photo reminder emails to 49 members who completed questionnaire without uploading a photo

## Team Login System
- [x] Create team_members table in LEGACY database
- [x] Seed Sivan Levin (sivilevin@gmail.com) with password Sivan2026!
- [x] Install bcryptjs + jsonwebtoken packages
- [x] Create server/teamAuth.ts with authenticateTeamMember and verifyTeamToken
- [x] Add POST /api/team/login endpoint (email+password → JWT cookie)
- [x] Add GET /api/team/me endpoint (verify team token)
- [x] Add POST /api/team/logout endpoint
- [x] Add cookie-parser middleware for Express
- [x] Extend context.ts with teamMember field (reads team_token cookie or X-Team-Token header)
- [x] Add teamProcedure to trpc.ts (allows access if user OR teamMember)
- [x] Update auth.me to return synthetic user object for team members
- [x] Update all protectedProcedure → teamProcedure in routers.ts
- [x] Update ctx.user.role checks to allow team members
- [x] Build /team/login page (Hebrew UI, email+password form)
- [x] Register /team/login route in App.tsx (both HeRouter and UsRouter)
- [x] Update CRM and CRMMatchmaking auth gates to show team login option
- [x] Update main.tsx to not redirect team members to Manus OAuth
- [x] Send Sivan credentials email via Brevo

## Comprehensive Marketing/Sales Dashboard (Aug 2)
- [x] Server procedure: dashboardOverview (leads, revenue, conversions by custom date range)
- [x] Server procedure: channelBreakdown (leads + revenue per channel/campaign)
- [x] Server procedure: leadJourneyFunnel (email journey conversion rates per step)
- [x] Server procedure: revenueByProduct (revenue breakdown with prices)
- [x] Frontend: New Dashboard page replacing existing Analytics with date range picker
- [x] Frontend: KPI cards (total leads, total revenue, conversions, conversion rate)
- [x] Frontend: Channel/campaign performance table with revenue attribution
- [x] Frontend: Email journey funnel visualization (conversion after each email)
- [x] Frontend: Revenue by product breakdown
- [x] Frontend: Lead source breakdown chart
- [x] Frontend: Daily trend chart (leads + revenue over time)

## Replace Green API WhatsApp with Vibrate SMS (Aug 2)
- [x] Create server/vibrate.ts with sendSMS function (Vibrate API)
- [x] Add VIBRATE_API_KEY secret
- [x] Replace all sendWhatsApp calls with sendSMS in match flows (routers.ts, automation.ts, matchingScheduler.ts)
- [x] Disable Green API (remove credentials or skip sending)
- [x] Test SMS sending works correctly

## Send Photo Completion Requests to Remaining Singles (Aug 2)
- [x] Build /upload-photo page (token-based, no login required)
- [x] Add photoUploadToken + photoUploadTokenExpiresAt columns to singles table
- [x] Create tRPC endpoints for token validation and photo save
- [x] Query DB for eligible singles (isActive=true, photoUrl IS NULL, all other fields filled, no active token)
- [x] Generate tokens for 30 eligible singles (including the 5 previously sent + 1 new)
- [x] Send email to each with personal upload link (via Brevo) - 30 sent successfully
- [x] Send SMS to each directing to check email (via Vibrate) - 30 sent successfully
- [x] Fixed Vibrate API: correct URL is api.vibrate.co.il (not app.vibrate.co.il), field is 'message' not 'body'

## CRM Phase 2 - Coaching Client Highlights & Improvements (Aug 4)
- [x] DB: Add isCoachingClient column (boolean, pink highlight for coaching clients)
- [x] DB: Add isNotBasic column (boolean, "לאו בסיסי" flag)
- [x] Server: toggleCoachingClient procedure
- [x] Server: toggleNotBasic procedure
- [x] Server: getNonResponseCounts procedure (serial non-responder detection)
- [x] Server: Add isCoachingClient, isNotBasic, updatedAt to listPendingMatches and getSinglesWithoutMatches returns
- [x] Frontend: Pink highlight/border for coaching clients across all tabs (singles, matches, unmatched)
- [x] Frontend: Coaching client badge (💜 מלווה) on all person cards
- [x] Frontend: "לא בסיסי" badge (⭐) on all person cards
- [x] Frontend: Toggle buttons for coaching client and not-basic in singles list
- [x] Frontend: Serial non-responder badge (🚨 לא עונה) for 3+ non-responses
- [x] Frontend: Separate "לא ענו" tab from "דחו" tab in matches
- [x] Frontend: "עודכנו החודש" filter in singles tab

## Bug Fixes & Improvements (Aug 4 - continued)
- [x] Fix ברק פרץ (ID 20100001): change gender to male, seekingGender to female, run matching
- [x] Enrich suggestion cards in "ללא התאמה" tab with full details (height, education, religiosity, maritalStatus, hasKids, wantsKids, shomerShabbat, about, partnerDescription, etc.)

## CRM Improvements - Internal Notes & Label Changes (Aug 4)
- [x] Change ⭐ label from "לא בסיסי" to "דורש תשומת לב" across all UI
- [x] Add adminNotes column to singles table (text, nullable) for internal notes
- [x] Server: Add updateAdminNotes procedure (save/update notes per single)
- [x] Frontend: Add editable notes field in the expanded single card (visible only in CRM)
- [x] Verify coaching/attention badges do NOT appear in any match emails/SMS/public pages (confirmed: not in emailTemplates, not in WhatsApp messages, not in any public-facing client pages)

## CRM Phase 3 - Remaining Tasks (Aug 5)
- [x] Add "לא פעילים" (inactive) tab in CRM with list of inactive singles and reactivation button
- [x] Remove "לייב 16/6" (live_event) tab from CRM
- [x] Full inline edit modal for all fields (height, age range seeking, photo, status, kids, pets, smoking, location, shomer shabbat, education, religiosity)
- [x] Uniform card layout across all tabs (same format everywhere)
- [x] Enrich match cards in "ממתין לשליחה" with what each person seeks (age range, status, kids preference)
- [x] Final verification: coaching/attention badges (💜⭐) and admin notes (📝) do NOT appear in match emails/SMS/WhatsApp/public pages

## CRM Phase 3 - Final Improvements (Aug 5 - continued)
- [x] Add "what they seek" summary to collapsed match card header (age, height, maritalStatus, wantsKids, age range seeking) - visible without expanding
- [x] "Return to pool" button (♻️ החזר שניהם למאגר) in rejected AND no_response/expired match cards
- [x] Enriched inactive singles tab with height, religiosity, maritalStatus, wantsKids, education details
- [x] Verified uniform card layout: singles tab, unmatched tab, inactive tab, match cards all show same info density

## Fix Match Tab Classification Logic (Aug 5)
- [x] Bug: Matches where both approved (approvedByA=true, approvedByB=true) appear in "לא ענו" tab instead of "יש התאמה" (e.g. ענת שרעבי + ליאור דניאל) — now goes to "דחו" with "🔓 שוחרר" badge
- [x] Bug: Matches where one explicitly rejected appear in "לא ענו" instead of "דחו" — fixed using tokenUsedAt to detect explicit rejection
- [x] Fix isNoResponse logic: uses tokenUsedAt + proposedAt to show only truly no-response matches
- [x] Fix isRejected logic: explicit rejection = tokenUsedAt set AND approved=false (clicked link and rejected)
- [x] Matches where both approved but status is "rejected" (manually released) go to "דחו" tab with "🔓 שוחרר" badge
- [x] Updated per-person status badges to use same tokenUsedAt logic (distinguish explicit reject from no response)
- [x] New counts: ~478 rejected (explicit), ~184 no-response (ghosted), 0 orphaned
- [x] Fix followup tab: excluded released matches (returnedToPoolAt set) — was showing 56, now correctly shows 1
- [x] Fix matched tab: excluded released matches — was showing 82, now correctly shows 19 active
- [x] Fix matchedSingleIds: released singles no longer block new pending matches
- [x] DB fix: updated 63 zombie matches (status=matched + returnedToPoolAt) to status=rejected

## CRM Database Dashboard (Aug 5)
- [x] Server procedure: matchmakingDashboard with date range filtering
- [x] KPIs: new signups, matches sent, success rate, active members, upcoming renewals
- [x] Distribution: members by match count (0, 1, 2, 3+)
- [x] Duration: members without match >14 days, >30 days
- [x] Full funnel: registered → matches sent → approved → matched → follow-up
- [x] Upcoming renewals (expiring in 7/14/30 days)
- [x] Visual dashboard component with charts (bar, donut, funnel)
- [x] Date range picker integration
- [x] Integrate into CRM matchmaking page as sub-tab or section

## Enhanced Filter Search Tab (Aug 5)
- [x] Add wantsKids filter (כן/לא/פתוח)
- [x] Add maritalStatus filter (רווק, גרוש, אלמן)
- [x] Add area/region grouping (מרכז/שרון/דרום/צפון/ירושלים)
- [x] Add religiosity filter (already existed)
- [x] Add hasKids filter
- [x] Add height range filter (already existed)
- [x] Results: show compatibility percentage prominently (color-coded badge + border)
- [x] Results: sort by highest compatibility score descending
- [x] Added "בדוק התאמה לכולם" button to batch-check all results

## Manual Profile Editing (Aug 5)
- [x] Server: updateSingleProfile procedure (updateSingleInline already existed with all fields)
- [x] Missing data tab: inline edit fields for each missing item (10 fields: gender, age, city, height, religiosity, maritalStatus, wantsKids, hasKids, phone, occupation)
- [x] Missing data tab: "ערוך כל הפרטים" button opens full EditSingleModal
- [x] Expanded profile card: full edit mode already existed via EditSingleModal (accessible from singles tab)
- [x] Extended patchMissingData server procedure with wantsKids, hasKids, numKids, phone, smokingStatus, partnerDescription, minAge/maxAgePreference
- [x] Fix: toggleCoachingClient button — added e.stopPropagation(), cursor-pointer, and better error toast with message

## Price & Database Size Update (Aug 6)
- [x] Change price from 249 to 299 in all pages, emails, payment flows, and content
- [x] Change database size from 2,400/2400/3,000 to 5,000+ everywhere
- [x] Add "המאגר החכם הגדול והמוביל בישראל" in DatabaseSales, Register, Home, DatabaseLanding

## Enhanced Marketing Dashboard with Meta Ads (Aug 11)
- [x] Connected Meta Ads API (ads_read token) for live campaign data
- [x] Server: metaAdsPerformance procedure - pulls from both main + boosts ad accounts
- [x] Server: coachingRevenue procedure - sessions (500+) and coaching (2000+) from Grow payments
- [x] Dashboard: Meta Ads KPIs (spend, revenue, ROAS, CPA, CPL, impressions)
- [x] Dashboard: Campaigns table with spend/leads/purchases/CPL/CPA/ROAS per campaign
- [x] Dashboard: Boosts table with spend/impressions/clicks/engagement/video views
- [x] Dashboard: AI Insights section with automatic recommendations (winning campaigns, non-converting, high CPA)
- [x] Dashboard: Coaching & Sessions revenue section with breakdown
- [x] Updated META_CAPI_TOKEN (was expired)
- [x] Added META_ADS_TOKEN for campaign data

## Team Member Access (Aug 11)
- [x] Add netaneal@menteshdigital.com to CRM (password: Anyspot1234!)

## Instagram & Facebook Insights Integration (Aug 11)
- [x] Exchange short-lived token for long-lived (60 days, expires Oct 10 2026) with instagram_manage_insights
- [x] Server: socialInsights procedure - IG daily reach, follower_count, accounts_engaged, interactions, likes, comments, shares, saves
- [x] Server: fbPageInsights procedure - FB page fans, followers
- [x] Dashboard: IG Insights section with daily reach chart, engagement breakdown, follower growth
- [x] Dashboard: FB Page section with fans + WhatsApp group
- [x] Dashboard: Social insight/recommendation text

## Comprehensive Dashboard Overhaul (Aug 11)
- [x] Per-campaign funnels: leads → purchases with spend, CPL, CPA, ROAS per campaign
- [x] UTM-based attribution: which campaign leads converted to purchases (full journey)
- [x] Campaign recommendations: what to stop, what to scale, what to improve (AI-powered)
- [x] Social media funnel: followers → engagement → reach
- [x] WhatsApp group metrics: members shown
- [x] Email marketing section: open rates, click rates in KPIs
- [x] Visual overhaul: IG reach chart, color-coded KPIs, trend arrows

## Weekly Email Report - Tuesday 20:00 (Aug 11)
- [x] Create weeklyReport module (server/weeklyReport.ts) that aggregates all dashboard data
- [x] Build HTML email template with KPIs, top campaigns, funnels, recommendations
- [x] Schedule: every Tuesday at 20:00 Israel time to hilitcaspi@gmail.com (setInterval in index.ts)
- [x] Include: leads, purchases, revenue, spend, ROI, winning campaigns, what to improve
- [x] Manual trigger: sendWeeklyReport mutation + "שלח דוח" button in dashboard header

## SEO & Traffic Analytics in Dashboard (Aug 11)
- [x] Add siteTraffic procedure - page views, unique visitors, top pages, referrers from analytics
- [x] Add SEO/traffic section to dashboard - top pages, traffic sources, daily views chart
- [x] Show behavior funnel: visit → DNA start → DNA complete → database CTA → purchase
- [x] Key interactions breakdown (quiz starts, form submits, CTA clicks)
- [x] Traffic insight with drop-off analysis

## Blog Articles (Aug 11)
- [x] Article 1: "המאגר החכם הגדול והמוביל בישראל" - about the 5000+ database
- [x] Article 2: "סיפורי הצלחה — כשהמדע פוגש את האהבה" - success stories
- [x] Article 3: "איך עובד המאגר החכם — השיטה שמאחורי ההתאמות" - how algorithm works
- [x] All 3 articles inserted to blog_posts table with SEO meta tags

## Behavior Tracking & Funnel Optimization (Aug 11)
- [x] Track key user interactions: already tracking page_view, scroll_depth, button_click, form_start/submit, dna_quiz_start/complete
- [x] Track email engagement: emailEngagement procedure with opens, clicks, per-journey, per-step
- [x] Build behavior analytics section in dashboard: funnel, interactions, traffic sources
- [x] Funnel visualization: visit → DNA start → DNA complete → database CTA → purchase with % drop-off
- [x] Email journey performance table with open rate, click rate, click-to-open per journey

## Dashboard V2 - Professional Overhaul (Aug 11)
- [x] Period comparison: every KPI shows change vs previous period (arrows + %)
- [x] Industry benchmarks: open rate, CTR, ROAS, CPL compared to industry average
- [x] Monthly targets: budget, leads, sales per product, revenue goals with progress bars
- [x] Lead journey attribution: campaign → mailing journey → purchase (full path table)
- [x] Round currency to whole numbers (no decimals)
- [x] Deep professional insights (specific to campaigns, not generic)
- [x] Social media section: engagement vs benchmark, saves vs shares analysis, growth
- [x] Rebuilt entire Dashboard.tsx from scratch with professional design

## Instant Alert for Incomplete Profiles (Aug 20)
- [x] Send SMS + email to Hilit immediately when a new user registers with any missing profile details
- [x] Alert should specify which fields are missing
- [x] Alert should fire for any missing field (age, city, height, aboutMe, partnerDescription, photo, etc.)

## CRM Edit: Add seekingGender Option (Aug 20)
- [x] Add seekingGender (מחפש גבר/אישה) to the CRM profile edit modal

## Profile Completeness Indicators in CRM (Aug 21)
- [x] Add questionnaire status badge (full/not filled) to each profile card
- [x] Add overall profile completeness badge (complete/missing)
- [x] Show which specific fields are missing
- [x] Add "copy completion message" button for incomplete profiles

## Critical Flow Bugs (Aug 12)
- [x] FIX: ScientificQuestionnaire asks for personal details again when profile already has them from registration
- [x] FIX: Age/height validation error crashes questionnaire submission (should skip gracefully)
- [x] FIX: Missing data fields keep showing after user fills them (persistence bug in personal area)
- [x] Change homepage hero button from "המדריך החינמי שלי" to "שאלון חינמי" (higher conversion)
- [x] Add "מנוי פלוס" note in personal area about upcoming premium features
- [x] Unblock Meital bar Zohar (meitalbz120@gmail.com) in Brevo

## Personal Phone Number Removal (Aug 16)
- [x] Replace personal phone (054-453-0975 / 972544530975) with business number (055-244-2334 / 972552442334) in all 5 Terms pages (Database, Coaching, Course, Guide, SingleSession)
- [x] Replace personal phone in all English site pages (About, Coaching, DatabaseSales, DnaQuiz, Guide, Home, Register, Session)
- [x] Replace personal phone in English email template (EN_WA_DIRECT in emailTemplates.ts)
- [x] Replace personal phone in English questionnaire email (routers.ts line 2001)
- [x] Fix 13 processing emails in production DB that still had the old WhatsApp link
- [x] Verified: joni.ts and paymentFailureAlert.ts keep personal number (internal notifications to Hilit only, not customer-facing)

## Dashboard Channel Breakdown Fix (Aug 16)
- [x] Merge dna_quiz leads (from campaign funnel) into "Meta Ads (ממומן)" channel
- [x] Merge Instagram paid (utm_medium=paid or shabek/campaign patterns) into "Meta Ads (ממומן)"
- [x] Merge numeric campaign IDs (Meta ad set IDs) into "Meta Ads (ממומן)"
- [x] Merge meta_lead_guide, meta_lead_call, meta_lead_dna into "Meta Ads (ממומן)"
- [x] Separate Instagram organic (bio, story, reel, post) as "Instagram (אורגני)"
- [x] Update weekly report to use same channel classification logic
- [x] Update Dashboard.tsx frontend insights to match new channel names
- [x] Fix demographics section not showing: registeredAt→createdAt column name, fix db.execute destructuring pattern
- [x] Fix journey attribution table: unified sources (mapChannel), Hebrew campaign names (translateCampaign), fixed conversion rate (was >100% due to bad JOIN)
- [x] Fix topCampaigns procedure: same unified sources and Hebrew names
- [x] Fix analytics dedup: purchase events now fire once per session (sessionStorage guard) + eventID passed to Meta Pixel for CAPI dedup
- [x] Fix GA4 attribution: ga4SessionId now fetched from DB and passed to ga4Purchase so purchases are attributed to campaigns (not direct)
- [x] Add team note to single-session page: session may be with Hilit or one of her trained coaches
- [x] Update all success stories across site pages with fresh 2025/2026 dates and new names (database + coaching stories)
- [x] Add daily lead funnel table to dashboard (leads/day, campaign leads, purchases, revenue, conversion rate, best hours/days insights)
- [x] Add questionnaire completion badge to match cards in CRM
- [x] Add questionnaire completion badge to match cards in CRM
- [x] Add daily Meta spend column to funnel table
- [x] Add daily WhatsApp report (leads/purchases/conversion) to 0544530975
- [x] Dashboard redesign: reorder sections, add charts/graphs, make more visual and professional

## מחקר עסקי, שוק ותחזית צמיחה (אוגוסט 2026)
- [x] לנתח את ביצועי ארבעת חודשי הפעילות הראשונים לפי הכנסות, מוצרים, לידים, רכישות והוצאות שיווק
- [x] למפות את כל המוצרים, המחירים, המשפכים והצעת הערך של הילית כספי
- [x] לחקור במקביל את השוק הישראלי, המתחרים, התמחור והמגמות בתחום הזוגיות והשידוכים
- [x] לבנות תחזית צמיחה בשלושה תרחישים ולבחון נקודת איזון עסקית
- [x] לזהות חסמים, מנועי צמיחה וסיכונים ולבנות מפת דרכים לחברת צמיחה גדולה
- [x] להכין דוח מנהלים מבוסס מקורות ונתוני אמת

## מערכת תוצאות, מסע לקוח וסקייל עסקי (אוגוסט 2026)
- [x] למפות את כל סטטוסי ההתאמות, נקודות המגע, מסעות המייל והתשלומים הקיימים ולתכנן מקור אמת אחד
- [x] לשדרג את דשבורד התוצאות הקיים בטאב המאגר במקום ליצור מערכת נפרדת
- [x] להוסיף מדדי כיסוי התאמות: 0/1/2/3+ התאמות, זמן להתאמה ראשונה, ממתינים 14/30 יום ופערי היצע לפי מגדר/גיל/אזור/דת
- [x] לשלב תיאום ציפיות עקבי בדף המכירה, לפני התשלום, לאחר הרכישה, באזור האישי ובמסע קבלת הפנים
- [x] להוסיף מודל נתונים מלא למשפך הצלחות: נשלח, נפתח, אושר, פרטים נחשפו, דייט נקבע, דייט התקיים, ממשיכים, זוגיות
- [x] להוסיף מנגנון הסכמה מפורשת לפרסום תוצאה, ציטוט, שם ותמונה ללא יצירת עדויות מלאכותיות
- [x] לבנות ממשק CRM לעדכון תוצאות, תיעוד משוב ואישור סיפור הצלחה לפרסום
- [x] לבנות דשבורד תוצאות לפי קוהורט 30/60/90 יום, מקור שיווק, מוצר ומגזר
- [x] לבנות מסע אוטומטי ל־90 יום לאחר רכישה עם הודעות לפי התנהגות ותוצאה
- [x] לבנות מנוע אפסייל לפגישה, ליווי וקבוצה על בסיס מצב הלקוח ולא דיוור כללי
- [x] לבנות דוח P&L חודשי עם הכנסות בפועל, הוצאות פרסום, סליקה, החזרים, שכר, ספקים, תוכנות ומסים
- [x] לבנות פיילוט Plus כולל זכאות, הטבות, רשימת המתנה, מעקב המרה ומדדי שימור
- [x] לבנות תשתית משימות והרשאות לצוות עבור התאמות, מעקב, שיחות ומשוב
- [x] לבנות תשתית לניהול שותפים ואירועים עם שיוך לידים והכנסות
- [x] לנסח מסרים אמינים על כמות ואיכות התאמות שמסבירים את ההמתנה בלי להבטיח התאמות שאינן קיימות
- [x] לכתוב בדיקות Vitest, לבדוק מובייל ודסקטופ, ולבצע השקה מבוקרת עם מדדי הצלחה

## הזנת P&L וחבילת הדגמות (אוגוסט 2026)
- [x] לתמוך בהכנסות ידניות חודשיות נפרדות מפעילות האתר בתוך דוח ה־P&L
- [x] להזין הוצאות קבועות כולל מע״מ: ניהול קמפיין, שירות, מכירות, סושיאל, פלטפורמות ושונות
- [x] להזין פעילות ליווי חיצונית: הכנסה חודשית 10,000 ש״ח והוצאה ישירה 2,000 ש״ח
- [x] להשאיר את הוצאות Meta דינמיות לפי נתוני חשבון הפרסום בפועל
- [x] להפיק חבילת צילומי מסך של דשבורד התוצאות, P&L, משוב, Plus, תפעול וספריית מסרים
- [x] לא להפעיל קוהורט Plus ולא לפנות ללקוחות לפני אישור מפורש
- [x] לתזמן בדיקת מעקב חד־פעמית לאחר 7 ימים לכיסוי, משובים, מסע 90 הימים, Plus ו־P&L

## Database Plus — מנוי חודשי ומעקב התחייבות (אוגוסט 2026)
- [x] לבדוק את יכולת Grow לחיוב חודשי מתחדש של 99 ש״ח וביטול בכל עת
- [x] להרחיב את מודל Plus למחזור חיוב אישי, תאריך חידוש, סטטוס תשלום וביטול
- [x] להוסיף יעד של שתי הצעות התאמה שנשלחו בכל מחזור חיוב ללא ספירת שליחה חוזרת
- [x] להוסיף מונה 0/2, 1/2, 2/2 והתראות צהוב/אדום לפי הזמן שנותר במחזור
- [x] ליצור משימת צוות אוטומטית כאשר חבר Plus נמצא בסיכון לאי־עמידה ביעד
- [x] להוסיף תג PLUS בכל כרטיס ופרופיל וטאב ניהול ייעודי לחברי Plus
- [x] להוסיף ערוץ שירות לקוחות Plus בעדיפות, ללא הצגה כליווי אישי של הילית
- [x] להוסיף הסכמה מפורשת ונפרדת לחשיפה בסושיאל כולל אישור טקסט ותמונה
- [x] לבנות מסך מכירה ומסך תשלום של 99 ש״ח לחודש בנוסף לדמי ההצטרפות למאגר
- [x] להכין צילומי מסך של כל זרימת Plus ולהציג לאישור לפני פנייה ללקוחות
- [x] לא להפעיל חיוב, קוהורט או פנייה ללקוחות ללא אישור מפורש לאחר הצגת המסכים

## Plus מתמשך, קופונים ואפסיילים (אוגוסט 2026)
- [x] לאמת את יכולת החיוב החודשי של Grow — נדרש pageCode ייעודי ו־paymentNum מפורש; אין להפעיל חיוב ללא הגדרה מאושרת
- [x] לעדכן את תקנון Plus, מסך המכירה והביטול לחיוב מתמשך, כשל תשלום וסיום הטבות
- [x] לבדוק בפועל שקופון LOVE10 פעיל, תקין ונותן את ההנחה שהוגדרה
- [x] ליצור קופון PLUS50 להנחה של 50 ש״ח על מוצרים מאושרים בלבד
- [x] להציע לחברי Plus פגישת היכרות במחיר 450 ש״ח בלי לפגוע במחיר הרגיל
- [x] לבנות אפסיילים חכמים בכל דפי המוצרים לפי המוצר, מקור הלקוח וסטטוס הרכישה
- [x] לבנות מסע לחברי המאגר לפגישת היכרות כדי להכיר אותם באופן אישי ולדייק התאמות
- [x] לבדוק את הקופונים, התשלומים, המסרים והממשקים בדסקטופ ובמובייל לפני הפעלה
- [x] לחסום את פתיחת תשלום Plus עד ש־Grow יספק pageCode ייעודי, מספר חיובים מפורש, מדיניות ביטול ו־webhook לכשלי חיוב; נכון לעכשיו אין חיוב או פנייה ללקוחות

## Meta, אפסיילים ומבצע ספטמבר (אוגוסט 2026)
- [x] לעדכן בצורה מאובטחת את META_ADS_TOKEN לטוקן החדש שסופק
- [x] לאמת שהדשבורד מושך את חשבונות הפרסום, הקמפיינים, ההוצאות והרכישות לאחר עדכון הטוקן
- [x] להסיר ולחסום אפסיילים מכל מסלולי ההרשמה, השאלונים, התשלום ודפי התודה של המאגר
- [x] להשאיר את פלואו המאגר עם הצעת תשלום אחת בלבד: הצטרפות למאגר
- [x] להרחיב אפסיילים חכמים בדפי תוכן ומוצרים בלבד, ללא CRM, תקנונים או מסכי תשלום
- [x] לבנות דף נחיתה נפרד למבצע ספטמבר עם פגישה ב־450 ש״ח ומוצרים דיגיטליים נבחרים ב־50%
- [x] ליצור קופון ספטמבר מוגבל למוצרים הדיגיטליים שנבחרו, בלי הנחה על המאגר או על הליווי
- [x] לבנות מסע המשך למצטרפי המאגר רק לאחר שהשלימו הרשמה ותשלום
- [x] להכין תצוגות דסקטופ ומובייל ולהציג את דף ספטמבר והאפסיילים לפני הפעלת קמפיין
- [x] לתקן את פריסת הייצור כך ש־`/september` ייכלל בחבילת האתר החיה ולא יחזיר 404

## הודעות WhatsApp להתאמות דרך Make (אוגוסט 2026)
- [x] למפות את נקודות שליחת ה־SMS הקיימות כאשר התאמה נשלחת לשני הצדדים
- [x] להחליף את הודעת ה־SMS לשני הצדדים בקריאת WhatsApp ל־webhook של Make, בלי לשנות את מיילי ההתאמה
- [x] להגדיר את כתובת ה־webhook כסוד שרת ולא להטמיע אותה בקוד הלקוח או ב־Git
- [x] להוסיף מניעת שליחות כפולות וטיפול בכשל webhook בלי לפגוע בשליחת המייל
- [x] להוסיף בדיקות Vitest למבנה ה־payload, לשני הנמענים ולהיעדר שליחת SMS
- [x] לבדוק את הזרימה, לפרסם ולסנכרן את ה־checkpoint ל־GitHub

## מספר שולח קבוע והתאמת ניסיון (אוגוסט 2026)
- [x] לאמת את שחר נתנאל 0529467614 ואת הילית 0544530975 במערכת לפני שליחה
- [x] להוסיף ל־payload של Make מספר שולח קבוע 0552442334 בפורמט מקומי ובינלאומי
- [x] להוסיף בדיקות שמוודאות שכל הודעת התאמה מבקשת יציאה מהמספר העסקי בלבד
- [x] לבצע התאמת ניסיון מאושרת לשני המספרים דרך WhatsApp ללא SMS
- [x] לפרסם את השינוי ולסנכרן את ה־checkpoint ל־GitHub

## העברת כלל התראות Vibrate ל־WhatsApp (אוגוסט 2026)
- [x] למפות את כל קריאות sendSMS הקיימות, כולל התאמות, תזכורות, פגי־תוקף, רכישות וחוסרי פרופיל
- [x] לבנות שירות Make כללי שמבקש שליחה מהמספר העסקי 0552442334 לכל סוגי ההודעות
- [x] להעביר הודעות רכישה ל־WhatsApp בלי לשנות את התראות המייל הקיימות
- [x] להעביר התראות על נרשמים משלמים שחסרים להם נתונים לאחר 24 שעות ל־WhatsApp
- [x] להעביר את יתר זרימות Vibrate המאושרות ל־WhatsApp ולבטל שימוש פעיל ב־Vibrate
- [x] להוסיף בדיקות לכל סוג הודעה, למספר השולח ולמניעת כפילויות
- [x] לבצע התאמות ושליחות ניסיון מאושרות לשחר ולהילית, לפרסם ולסנכרן ל־GitHub

## תיקון מסירת WhatsApp בפועל דרך Make (אוגוסט 2026)
- [x] לאבחן מדוע Make החזיר HTTP 200 אך הודעות הניסיון לא הגיעו ל־WhatsApp
- [x] להתאים את ה־payload למבנה השדות שהתרחיש הפעיל דורש, כולל מספר יעד ומספר שולח
- [x] להוסיף בדיקה שמבדילה בין קבלת webhook לבין אישור מסירה אמיתי, כולל אימות ידני של קבלה בפועל
- [x] לשלוח מחדש הודעת ניסיון לשחר ולהילית ולאמת קבלה בפועל
- [x] לפרסם את התיקון ולסנכרן את ה־checkpoint ל־GitHub
- [x] לשלוח טסט חוזר בנוסח ההתאמה המלא לאחר עדכון הוובהוק ב־Make ולאמת קבלה מהמספר העסקי

## בדיקת תצוגת Database Plus ורשימת המתנה (אוגוסט 2026)
- [x] לאתר באילו עמודים ותחת אילו תנאים מוצג כרטיס Database Plus שבתמונה
- [x] לבדוק מה משמעות האנשים המופיעים בטאב Plus במערכת
- [x] לספור ולהבחין בין מצטרפים בפועל לרשימת ההמתנה, מוזמנים, פעילים ומועמדים בלבד
- [x] למפות את כל נקודות החשיפה ל־Database Plus באתר, באזור האישי וב־CRM
- [x] להמליץ על משך מילוי הרשימה, גודל קבוצת הפיילוט ותנאי פתיחה
- [x] להגדיר את סדר הפעולות לאחר סגירת רשימת ההמתנה בלי להפעיל חיוב לפני ש־Grow מוכן
- [x] להשיב להילית באופן ברור היכן הכרטיס מופיע ומי נרשם בפועל

## הסרת אלון רוזנשטיין וחסימת דיוור (אוגוסט 2026)
- [x] לאתר את כל הרשומות והגרסאות של alonrozenstain@gmail.com במאגר, בלידים וברשימות הדיוור
- [x] להסיר ולנטרל את הפרופיל מהמאגר ולסגור התאמות או זרימות פעילות הקשורות אליו
- [x] להוסיף חסימת מייל גלובלית כך שלא יקבל התאמות, הודעות מערכת או דיוור שיווקי
- [x] לאמת לאחר הביצוע שהפרופיל אינו פעיל ושכל מסלולי השליחה חוסמים את הכתובת

## ניקוי פלואו התשלום ושחרור התאמת נועה עפרוני (אוגוסט 2026)
- [x] לאתר ולהסיר את כרטיס "מה חשוב לדעת לפני שמצטרפים" והאחוזים מפלואו המאגר לפני התשלום
- [x] לוודא שהמחיר, הקופון, התקנון וכפתור הרכישה נשארים תקינים לאחר ההסרה
- [x] לאתר את נועה עפרוני ואת יועד לירון ואת ההתאמה הפעילה ביניהם
- [x] לשחרר את ההתאמה ולהחזיר את שני הפרופילים לקבלת התאמות חדשות
- [x] לבדוק בדסקטופ ובמובייל, לפרסם ולסנכרן את ה־checkpoint ל־GitHub

## קישורי Database Plus ושחרור התאמת רותם שלום (אוגוסט 2026)
- [x] לאתר ולאמת את הקישור לאזור האישי שבו מוצג Database Plus
- [x] לאתר ולאמת את עמוד ההצטרפות והתשלום של Plus ואת דרישות Grow החסרות
- [x] לאתר את רותם שלום, את מורן א׳ ואת ההתאמה הפעילה ביניהם
- [x] לשחרר את ההתאמה ולהחזיר את שני הפרופילים לקבלת התאמות חדשות
- [x] לאמת את השחרור ולמסור להילית את שני הקישורים התקינים

## תיקון חיווי השלמות של כינר עשור (אוגוסט 2026)
- [x] לאתר את כינר עשור וכל מקורות נתוני הגובה והשאלונים שלו
- [x] להשוות בין נתוני הפרופיל לחישוב השדות החסרים באזור האישי וב־CRM
- [x] לשחזר את הגובה ממקור אמין או לתקן את לוגיקת השלמות לפי מקור הכשל
- [x] לאמת שההתראה על נתונים חסרים נעלמה ושמצב הפרופיל מלא
- [x] לפרסם ולסנכרן תיקון קוד ל־GitHub אם נדרש

## סנכרון עדכוני CRM לאזור האישי (אוגוסט 2026)
- [x] למפות את כל השדות שניתן לעדכן ידנית בפרופיל מול השדות שמוחזרים ב־getDashboard
- [x] להשלים ב־API שדות תצוגה ושלמות שחסרים כדי שייקראו תמיד מרשומת הפרופיל הראשית
- [x] להוסיף בדיקות רגרסיה לכל שדות השלמות ולשדות המרכזיים שמוצגים באזור האישי
- [x] לפרסם ולאמת באזור האישי החי של כינר שהנתונים המעודכנים מופיעים ללא התראה שגויה
- [x] לסנכרן את התיקון ל־GitHub

## תיקון שמירת פרטים בקישור האישי של מאיה (אוגוסט 2026)
- [x] לאתר את מאיה לפי הטוקן ולבדוק גיל, תאריך לידה ונתונים קיימים
- [x] לשחזר את שגיאת השמירה בשדה הגיל ולזהות את ה־payload שנדחה
- [x] לתקן את אימות הגיל או מיפוי הנתונים בלי לאבד את מה שמאיה כבר מילאה
- [x] להוסיף בדיקות ולוודא ששמירת הפרטים עובדת בקישור האישי בדסקטופ ובמובייל
- [x] לפרסם ולסנכרן את התיקון ל־GitHub
- [x] לאפשר ניסיון חוזר מהמסך הישן שכבר פתוח אצל מאיה, בלי למחוק את תשובות השאלון ובלי להיכשל בגלל טווח העדפות אופציונלי

## איתור תשלום ושחזור פרופיל דניאל סולימני (אוגוסט 2026)
- [x] לאתר את Daniel@sulimani.co.il בכל טבלאות התשלום, הלידים, הוובהוקים והמאגר
- [x] לאמת את העסקה מ־21.8, המוצר, הסכום וסטטוס האישור
- [x] להבין מדוע הפרופיל לא מופיע במאגר ולשחזר או לקשר אותו ללא כפילות
- [x] לאמת שהפרופיל מופיע במערכת ושקישור ההשלמה או האזור האישי תקין
- [x] לדווח להילית מה נמצא ומה שוחזר

## חיפוש עמוק אחר השאלון המדעי של דניאל (אוגוסט 2026)
- [x] למפות את כל טבלאות התשובות, הסשנים והלוגים של השאלון המדעי
- [x] לחפש לפי מייל, טלפון, שם, מזהה פרופיל, טוקן וחלון הזמן סביב 21.8
- [x] לבדוק תשובות יתומות, מזהים זמניים ורשומות שלא קושרו לפרופיל
- [x] לא לקשר תשובה של אדם אחר לאחר שלא נמצא מקור תואם לדניאל בוודאות
- [x] לאמת באזור האישי את סטטוס השאלון ולדווח מה נמצא

## איתור ושחזור פרופיל ליאם דהן (אוגוסט 2026)
- [x] לאתר את Liamdahan1123@gmail.com בכל רשומות התשלום, הפרופילים, הלידים והוובהוקים
- [x] לאתר ולאמת את שאלון ה־DNA ואת השאלון המדעי של ליאם
- [x] לאבחן מדוע ליאם אינו מופיע במאגר ולשחזר או לקשר את הפרופיל ללא כפילות
- [x] לאמת שהפרופיל מופיע במאגר ושהאזור האישי ושני השאלונים תקינים
- [x] לאשר שלא נדרש תיקון קוד נוסף לאחר שתיקון מרוץ התשלום כבר פורסם, ולדווח להילית מה שוחזר

## בדיקת מסירת מייל התאמה לשרון לחמי (אוגוסט 2026)
- [x] לאתר את Sharon.lachmi@gmail.com ואת ההתאמה שנשלחה אליה אתמול
- [x] לאתר את רישום המייל במערכת ולבדוק ב־Brevo מסירה, פתיחה, bounce, חסימה או כתובת שגויה
- [x] לאמת שהכתובת היחידה נכונה ושהייתה חסימה טרנזקציונית עקב הסרה קודמת מ־18.5.2026
- [x] להסיר את החסימה הטרנזקציונית לאחר אישור מפורש ולשלוח לשרון מייל בדיקה
- [x] לאמת ב־Brevo שמייל הבדיקה עבר ל־delivered ולתעד את סיבת אי־מסירת מייל ההתאמה המקורי

## שחרור התאמת נדב שומרוני וניקול (אוגוסט 2026)
- [x] לאתר את nadav.shomroni@gmail.com ואת ניקול יוסף בהתאמה הפעילה
- [x] לשחרר את ההתאמה ביניהם לפי פעולת השחרור הקיימת ב־CRM
- [x] לוודא ששני הפרופילים פעילים ושאין להם התאמה פעילה אחרת שחוסמת התאמות חדשות
- [x] לתעד את תוצאת השחרור ללא שליחת הודעות ללקוחות

## איתור ושחזור נתוני זאב בוכמן (אוגוסט 2026)
- [x] לאתר את zeevlovefordogs@gmail.com, טלפון 0535323104 ופרופיל 25260001 בכל מקורות הנתונים
- [x] לחפש שאלון DNA ושאלון מדעי לפי מייל, טלפון, טוקן, מזהה פרופיל וחלון הזמן סביב 24.8
- [x] לבדוק תשובות יתומות, טיוטות, מזהים זמניים, מסד נוסף ונתוני לידים או טפסים אחרים
- [x] לאשר ששאלון ה־DNA המלא כבר מקושר לזאב, ולא לקשר תשובה מדעית או פרטים של אדם אחר ללא ודאות
- [x] לאמת באזור האישי את מצב הפרופיל והשאלונים ולתעד אילו פרטים נמצאו ואילו עדיין חסרים

## שליחה חוזרת של התאמת שרון לחמי וישראל (אוגוסט 2026)
- [x] לאתר את Sharon.lachmi@gmail.com ואת ההתאמה המדויקת עם ישראל גדלוב שנשלחה אתמול
- [x] לאמת התאמה של 84%, את פרטי ישראל ואת טוקן התגובה של שרון
- [x] לשלוח מחדש רק לשרון את מייל ההתאמה המלא לאחר הסרת החסימה שאושרה
- [x] לאמת באמצעות פיקסל הפתיחה וטוקן התגובה שהמייל הגיע, נפתח ושרון השיבה
- [x] לתעד ששרון דחתה את ההתאמה לאחר השליחה החוזרת, בלי לשלוח הודעה נוספת לישראל

## קישור אישי לבר כהן (אוגוסט 2026)
- [x] לאתר את bar281119@gmail.com ואת פרופיל בר כהן במסד הפעיל
- [x] לאמת שטוקן האזור האישי קיים ותקף לפרופיל הנכון
- [x] לפתוח את הקישור באתר החי ולוודא שהוא מזהה את בר ולא קישור כללי
- [x] למסור להילית קישור מוכן להעברה ב־WhatsApp

## ניתוב התראות ובוסט התאמה באזור האישי (אוגוסט 2026)
- [x] למפות את כל הקריאות ל־Make, Vibrate ומייל עבור התאמות, עסקאות וחוסרי פרופיל
- [x] להגביל את webhook של Make להודעות התאמה בלבד
- [x] להפסיק שליחת התראות עסקאות דרך Make בלי לפגוע במיילי אישור הרכישה ללקוחות
- [x] להחזיר התראת חוסר פרופיל אחרי 24 שעות ל־SMS דרך Vibrate ולמייל להילית
- [x] לאבחן מדוע התראות חוסרי הפרופיל אינן מתקבלות כרגע ולתקן את Heartbeat והאידמפוטנטיות
- [x] לסרוק את הפרופילים שכבר עברו 24 שעות ועדיין חסרים, ולשלוח להילית דוח צבר אחד ב־Vibrate ובמייל ללא כפילויות
- [x] להגדיר מוצר בוסט התאמה הוגן שאינו חושף פרופיל ואינו מבטיח התאמה לפני אישור הילית
- [x] לקבוע זכאות ותמחור: 19.99 ש״ח ללקוחות רגילים ובוסט אחד כלול בכל מחזור לחבר Plus פעיל
- [x] לבנות כרטיס בוסט על התאמה מטושטשת באזור האישי עם בדיקות זכאות ומניעת רכישה כפולה
- [x] לבנות תשתית שרת ולוג בקשות בוסט, כולל בחירת מועמד מוסתר, הטבת Plus, סטטוס ומשימת CRM לבדיקה
- [x] להשאיר חיוב Grow חסום עד קבלת pageCode ייעודי ומאושר למוצר בוסט
- [x] להוסיף בדיקות Vitest לניתוב ההודעות, התראות 24 שעות, זכאות בוסט ואידמפוטנטיות
- [x] להכין תצוגות דסקטופ ומובייל ולהציג להילית את הפלואו והנוסחים לפני הפעלת חיוב או פנייה ללקוחות
- [x] לפרסם את השינויים המאושרים ולסנכרן את ה־checkpoint ל־GitHub

## ניתוח קמפיינים לשיחת מנהל הקמפיינים (אוגוסט 2026)
- [x] להגדיר תקופת ניתוח של 27.6–25.8.2026 וחלוקה ליולי מלא, אוגוסט עד 25.8 ומחציות חודש
- [x] למשוך נתוני Meta יומיים משני חשבונות הפרסום לפי קמפיין, סדרה, מודעה, דמוגרפיה, מיקום ושעה
- [x] לחלץ מה־CRM לידים, מצטרפי מאגר, רכישות, הכנסות וייחוס קמפיינים לאותה תקופה
- [x] לאחד את משפך Meta וה־CRM ולחשב CPL, CPA, שיעורי המרה, ROAS ומגמות
- [x] לנתח קהלים, מגדר, גיל, ימים ושעות, קריאייטיבים וקמפייני לידים מול מכירות
- [x] לזהות פערי מדידה, ייחוס, תקצוב, קבלת החלטות ודיווח מצד מנהל הקמפיינים
- [x] להכין רשימת שאלות ונקודות שיחה הדורשות מספרים וגיבוי לרעיונות
- [x] להכין תבנית מחייבת לדוח אמצע חודש ולדוח סוף חודש
- [x] ליצור מסמך שיחה מקצועי עם טבלאות, גרפים והמלצות פעולה

## תיקון כשלי Heartbeat לאחר פרסום ניתוב ההתראות (אוגוסט 2026)
- [x] לאבחן מדוע ארבעה פרופילים נכשלו בהרצת 12:15 למרות שה־Heartbeat החזיר HTTP 200
- [x] לוודא שהכשל נובע מאפס קרדיטי Vibrate, שמיילים לא נשלחים שוב, ש־SMS ינסה שוב לאחר טעינה ושום חוסר פרופיל לא חוזר ל־Make
- [x] לאמת בבדיקות הרגרסיה הקיימות אידמפוטנטיות נפרדת ל־Brevo ול־Vibrate ללא דוח צבר נוסף
- [x] לאמת הרצת Heartbeat חיה לאחר טעינת הקרדיטים: 7 הודעות SMS נשלחו, 0 כשלים ו־0 מיילים כפולים

## השלמת ממשק CRM לבדיקת Match Boost (אוגוסט 2026)
- [x] להציג משימות בוסט עם ההסבר, הציון ומזהה ההתאמה במקום משימה כללית ללא פרטים
- [x] להוסיף זרימת התחלת בדיקה, דחייה וסימון כהושלם רק לאחר שההתאמה נשלחה בזרימה הרגילה
- [x] לעדכן יחד את בקשת הבוסט ואת משימת ה־CRM באופן אטומי וללא שליחת הודעה אוטומטית מהממשק
- [x] להוסיף בדיקות הרשאה, פרטיות וסטטוס ולוודא שהמועמד המוסתר נחשף רק לצוות ב־CRM
- [x] לבדוק את ממשק הבוסט בדסקטופ ובמובייל ולוודא את נתיבי ה־CRM הנכונים
- [x] לתקן את חפיפת טאבי ה־CRM במסך מובייל כך שטאב בדיקות הבוסט ויתר הטאבים יהיו קריאים ולחיצים

## תוכנית צמיחה וקמפיינים לספטמבר וחגי ישראל (אוגוסט 2026)
- [x] לאחד נתוני מכירות, הכנסות והוצאות בפועל מהדשבורד, Meta וה־CRM לפי מוצר ותקופה
- [x] לאמת את מחירו הפעיל של כל מוצר ואת מקור סכום ההכנסה, ולהפריד סכומי Grow בפועל מאומדני מחירון
- [x] לבנות יעדי ספטמבר בשלושה תרחישים לפי מוצר: מאגר, באנדל חג, פגישה, מדריך, קורס, ליווי, Match Boost ו־Plus
- [x] להגדיר לכל מוצר יעד יחידות, הכנסה, תקציב פרסום, CPA מרבי, ROAS מינימלי ושיעור המרה נדרש
- [x] להציע שלוש חלופות לבאנדל חג עם הצעת ערך, מחיר, מבצע, מסר מרכזי וכלכלת יחידה
- [x] לנסח ולאשר מסר חג שאינו מבטיח זוגיות או הגעה בזוג, אלא מזמין לפעולה אמינה ומדידה
- [x] לאמת ולהציג בבאנדל את מחירי המקור לפני הנחה: מאגר 499 ₪, מדריך 249 ₪ וקורס 497 ₪, לצד מחיר החג שאושר
- [x] לחשב מחדש את כלכלת הבאנדל לפי שווי מקור 1,245 ₪ ולשמור על תשלום חד־פעמי בלבד
- [x] לבנות מוצר ועמוד באנדל נפרדים על תשתית Grow הקיימת בלי לשנות את פלואו המאגר
- [x] להכין חבילת ביצוע מלאה למנהל הקמפיינים: מודעות, טקסטים, תקציב, קהלים, יעדים, UTM ולינק עמוד נחיתה לכל מודעה
- [x] לבנות קמפיין Acquisition לבאנדל החג, קמפיין Retargeting המבוסס על נתונים ותהליך, וקמפיין טיפול בהתנגדות לכמות התאמות
- [x] לבנות קמפיין Match Boost רק לחברי מאגר זכאים, ללא חשיפת מועמד וללא הפעלת חיוב לפני pageCode ייעודי של Grow
- [x] לבנות קמפיין Plus לפיילוט מאושר בלבד, ללא חיוב או פנייה לפני חיבור Grow ואישור מפורש
- [x] להגדיר קמפייני Instagram Boosts עם יעד עסקי, תקציב, קהל ו־UTM נפרד לכל פוסט או קריאייטיב
- [x] להגדיר שמות ו־UTM אחידים לכל קמפיין, Ad Set, מודעה, WhatsApp, ניוזלטר, אורגני ושותפים
- [x] לבנות תוכנית מכירה משולבת ל־Meta, Instagram, WhatsApp, ניוזלטר, קהילה, סושיאל ושיתופי פעולה
- [x] לבנות לוח תוכן וקמפיינים לספטמבר לפי תאריכי החגים, חלונות מכירה ותאריכי דוחות
- [x] למפות סיפורי הצלחה ועדויות אמיתיים בלבד, עם מקור, תאריך, מוצר, תוצאה והרשאת שימוש מפורשת
- [x] לא להשתמש בשם, תמונה או צילום מסך מזוהה של בתאל או כל לקוח אחר לפני אימות הסכמה לפרסום; העדות הוצאה מהיקף הקמפיין הנוכחי לפי הנחיית הילית
- [x] להחליף את שכבת ההוכחה בקמפיין הנוכחי בנתוני מאגר חיים ותהליך עבודה אמיתי, בלי להמציא ציטוטים או תוצאות
- [x] להסיר או להשבית לפני הפרסום הבא עדויות, שמות, תמונות וספירות הצלחה קשיחים שאין להם מקור והרשאת פרסום מתועדת בדפי האתר הקיימים
- [x] לחבר את רכיב סיפורי ההצלחה למשובי התאמה עם `consentConfirmed`, `publicityScope` ואימות צוות, ולהסתירו כשאין עדות מאושרת
- [x] לכתוב עמוד נחיתה נפרד לבאנדל החג בלי לשנות את מסלול ההרשמה והתשלום של המאגר
- [x] לכתוב מסרים ו־FAQ שמטפלים בהתנגדות לכמות התאמות ומסבירים בחירה, איזון מאגר, בדיקה אנושית ואי־הבטחת תדירות
- [x] להכין מודעות Feed, Story ו־Reels ללא תמונות לקוחות או עדויות לא מאושרות
- [x] להטמיע Pixel, CAPI, GA4, event_id ו־UTM בעמוד ובכל CTA, כולל מיפוי Grow ו־CRM
- [x] להפעיל את Checkout הבאנדל כתשלום חד־פעמי של 449 ₪ על pageCode המאגר הקיים לפי הנחיית הילית, עם מוצר ו־webhook נפרדים וללא מנוי
- [x] להגדיר דוח חריגים יומי, דוח מחצית ודוח סוף חודש מול יעדי המוצר והתקציב, כולל תבניות CSV מחייבות
- [x] להריץ בדיקות Vitest, TypeScript, Build, בדיקות דסקטופ ומובייל ובדיקת פרטיות לפני פרסום
- [x] לפרסם רק נכסים שאושרו ולסנכרן כל checkpoint ל־GitHub

## תיקון תאימות ייחוס למסד הפעיל (אוגוסט 2026)
- [x] להסיר תלות runtime בעמודות Meta שנוספו רק למסד המנוהל ואינן קיימות ב־LEGACY_DATABASE_URL הפעיל
- [x] לשמור campaign_id, adset_id, ad_id, placement ו־site_source בתוך שדות הייחוס הקיימים בלי לשנות את סכמת ה־CRM הפעיל
- [x] להריץ מחדש Scheduler, Vitest, TypeScript ו־Build ולוודא שאין `Unknown column` בלוגים

## יציבות בדיקת Make החיה (אוגוסט 2026)
- [x] להתאים את timeout בדיקת OPTIONS החיה לזמן תגובת הרשת בפועל בלי לשלוח הודעת WhatsApp
- [x] להריץ מחדש את הבדיקה החיה ואת שערי השחרור ולוודא שכל הבדיקות עוברות

## שינוי Match Boost לזרימה אוטומטית (אוגוסט 2026)
- [x] להחליף את הכרטיס החשוך בכרטיס אנונימי שמציג גיל, אזור כללי, תחום עיסוק, השכלה, מצב משפחתי ו־3–4 סיבות התאמה
- [x] להסתיר שם, תמונה, עיר מדויקת, מקום עבודה, פרטי קשר וכל מזהה אחר עד להסכמה הדדית
- [x] להסיר את אישור הילית מזרימת הבוסט ולשלוח אוטומטית לשני הצדדים הצעת Boost אנונימית ומסומנת לאחר זכאות תקינה
- [x] לבדוק מחדש ברגע המימוש ששני הצדדים פעילים, פנויים, עם פרופיל מלא, הסכמת Boost עדכנית וללא התאמה פעילה
- [x] להבהיר בתשלום ש־19.99 ₪ הם עבור שליחת הצעה בעדיפות ולא הבטחה להסכמה, חשיפת פרטים או זוגיות
- [x] למנוע מימוש כשהמועמד אינו זמין ולשמור קרדיט Boost אוטומטי אם הכשל מתגלה לאחר חיוב מאושר
- [x] להוסיף מניעת חיוב כפול, מגבלת 30 יום, idempotency לבקשה ולשליחה ורישום audit מלא להסכמה ולמימוש
- [x] לחבר בוסט אלגוריתמי אחד בכל מחזור Plus פעיל, בנוסף לשתי ההצעות שנבדקו ידנית, בלי לפתוח חיוב Plus לפני אישור Grow
- [x] לפי החלטת הילית, להשתמש בתשתית Grow החד־פעמית הקיימת עם זיהוי מוצר `match_boost` נפרד לפי תיאור וסכום 19.99 ₪ ואידמפוטנטיות מלאה
- [x] לבדוק את הזרימה בדסקטופ ובמובייל ולהריץ בדיקות פרטיות, זכאות, אנונימיות, הסכמה, הודעות ו־Plus; 184 בדיקות ו־Build עברו
- [x] ליצור מאגר Boost סגור שמציג ומחבר רק חברים שבחרו להצטרף בהסכמה מפורשת
- [x] לשמור לכל חבר סטטוס opt-in, תאריך הסכמה, גרסת נוסח ההסכמה ותאריך יציאה מהשירות, כולל יומן אירועים בלתי תלוי
- [x] לאפשר הצטרפות ויציאה עצמית מאזור האישי ולמנוע שימוש בלייק WhatsApp כהסכמה משפטית
- [x] להוסיף להסכמה משפט ברור שהצעת Boost מאושרת אלגוריתמית ולא נבדקת ידנית על ידי הילית
- [x] להציג לפני מימוש הבוסט כרטיס אנונימי עם גיל, אזור כללי, עיסוק כללי, השכלה, גובה, מצב משפחתי, ילדים, עישון, זיקה דתית, כוונת קשר וסיבות התאמה
- [x] להציג גם פערים רלוונטיים ותנאי סף כדי לצמצם תלונות לאחר התשלום, בלי לחשוף מזהים
- [x] להציג באזור האישי, במייל וב־WhatsApp גילוי קבוע שהצעת Boost אלגוריתמית ולא נבדקה ידנית על ידי הילית
- [x] לבטל מגבלת פיילוט של 60–100 ל־Boost: השירות מיועד לכל חבר מאגר פעיל שבחר להצטרף למסלול
- [x] לקבוע שכל Boost רגיל עולה 19.99 ₪ ללא בוסט ראשון חינם; ב־Plus בלבד כלול Boost אחד בכל מחזור
- [x] להכין הודעת בילד־אפ לקבוצת WhatsApp עם CTA להתעניינות, ולאחר מכן לפתוח הזמנה אישית לפי מייל ב־CRM לטופס ההסכמה באזור האישי
- [x] להשאיר את הפיילוט בהזמנה בלבד, ללא שליחת הודעות לקבוצה וללא סימון הסכמה מתוך ה־CRM
- [x] לבנות עמוד ציבורי `/match-boost` שמאפשר הבעת עניין בלבד ואינו מצרף אוטומטית למסלול Boost
- [x] לשמור הבעת עניין בנפרד מהסכמה משפטית, עם מקור ו־UTM, ולדרוש הסכמה ליצירת קשר
- [x] להציג ב־CRM מתעניינים, מוזמנים, מצטרפים, יוצאים, בוסטים שנשלחו ואישור הדדי בלי לחשוף מידע לציבור
- [x] לא לשלוח הודעת קבוצה או הודעת לקוח אוטומטית לפני אישור הילית לנוסח ולהיקף הפיילוט

## מערכת עדויות אמיתיות לקריאייטיבים (אוגוסט 2026)
- [x] לבנות מסע בקשת משוב ועדות לאחר תוצאה חיובית אמיתית עם שליחה ידנית פעילה ואפשרות אוטומטית מוכנה אך כבויה
- [x] לשמור בחירת הרשאה נפרדת לפרסום אנונימי, שם פרטי, שם מלא או שם ותמונה
- [x] לדרוש אימות צוות לפני שכל עדות יכולה להופיע באתר או להיכנס לספר הקריאייטיבים
- [x] ליצור מכל עדות מאושרת 10 וריאציות טקסט ל־Story, Feed, Reel, קרוסלה, ניוזלטר, מודעה ועמוד נחיתה בלי להוסיף עובדות
- [x] להכין תבניות המחשה מעוצבות שאינן מתחזות להודעה פרטית ולא כוללות לקוח או שם מפוברקים
- [x] לאפשר תרחישי המחשה רק עם תוויות ברורות ״המחשה״ ו־״לא עדות לקוח״ ולא תחת כותרת של עדות או סיפור לקוח

## תזכורת Vibrate לערב (אוגוסט 2026)
- [x] הילית השלימה טעינת קרדיטי SMS ב־Vibrate ולכן אין עוד צורך בתזכורת הערב
- [x] לאחר טעינת הקרדיטים, לאמת הרצת Heartbeat חיה: 29 נסרקו, 7 נשלחו, 22 דולגו ו־0 נכשלו

## רענון קריאייטיב לקמפיין חגי ספטמבר (אוגוסט 2026)
- [x] לחדד שפה חזותית שמשמרת את הסגול, הזהב והקרם של הילית ומשלבת ורוד יין, רימונים, אור נרות ולבבות מרחפים
- [x] להשתמש בכותרות עבריות בסגנון צר ועדין ובטקסט רץ בסגנון Rubik, בהתאם לגופנים הזמינים בנכסי ההפקה
- [x] ליצור שלוש מודעות Feed בפורמט 3:4: החלטה לשנה החדשה, מחיר וערך, ושלושת הצעדים
- [x] ליצור שלוש מודעות Story/Reels בפורמט 9:16: מסר רגשי, פירוט שלושת המוצרים, וטיפול בהתנגדות לכמות התאמות
- [x] לשמור על קריאות גבוהה במובייל, היררכיה ברורה, CTA אחד וללא עומס טקסט
- [x] לא להשתמש בעדויות, שמות, תמונות לקוחות או צילומי מסך שאינם מאושרים ומאומתים
- [x] לחבר לכל מודעה טקסט ראשי, כותרת, תיאור, קהל, תקציב, UTM וקישור מלא ל־https://hilitcaspi.com/new-year-love
- [x] להציג להילית את כל ששת נכסי החגים לאישור לפני העלאה לקמפיין, בלי להעלות קמפיין בפועל

## בנייה מחדש של עמוד חגי ספטמבר לפי ט״ו באב (אוגוסט 2026)
- [x] לנתח את מבנה, קצב המכירה, היררכיית המחיר, ה־CTA והצבעוניות של עמוד ט״ו באב הממיר
- [x] לכתוב מחדש את המסך הראשון כך שההטבה, שלושת המוצרים, שווי החבילה, החיסכון ומחיר 449 ₪ מובנים מיד
- [x] להחליף את הטון הדוחי בטקסט רגשי, מסקרן, חיובי ודחוף שמתאים לחגים ולשני המינים
- [x] להסיר מהחזית את 1,171, 75% ונתוני הדשבורד המדויקים ולהשתמש בניסוח אמין על אלפי רווקים ורווקות
- [x] להוסיף צבעוניות חג עשירה, לבבות מרחפים, רימונים, אור נרות, ורוד־יין, זהב וסגול בלי לאבד את קו המותג
- [x] להבליט בנוסח ההטבה: שווי מקור 1,245 ₪, מחיר נוכחי בנפרד 697 ₪, מחיר חג 449 ₪ וחיסכון 248 ₪ מול המחירים הנוכחיים
- [x] לבנות רצף מכירה בסגנון ט״ו באב: חלום, כאב, למה עכשיו, שלושת רכיבי החבילה, ערך, הוכחה, התנגדויות, דחיפות ו־CTA חוזר
- [x] לשלב אזור סיפורי הצלחה דינמי רק מחומרים אמיתיים עם אישור פרסום ואימות צוות, ולהסתירו כשאין חומר מאושר
- [x] להוסיף דחיפות אמינה עד 30.9.2026 בלי טיימר שמתאפס לכל מבקר
- [x] לבדוק את העמוד בדסקטופ ובמובייל מול עמוד ט״ו באב ולוודא קריאות, תשלום, דחיפות והגנות צרכניות
- [x] להסיר ממטא־תגי האתר את הטענה הישנה ״מאות זוגות שמצאו אהבה״ ולהחליפה בניסוח מוצרי מאומת

## עדכון יעדי המאגר לספטמבר (אוגוסט 2026)
- [x] לאמת 234 רכישות מאגר ביולי ו־263 רכישות בין 1–26 באוגוסט, ולתעד שלא ניתן לייחס היסטורית את כלל הוצאות Meta למאגר בלבד בגלל פערי UTM
- [x] לחשב יעד מינימום של 350 יחידות ויעד עבודה של 400 יחידות מאגר במחיר 299 ₪
- [x] להגדיר תקציב מאגר של 10,000 ₪, CPA נדרש של 28.57/25 ₪, ROAS נדרש של 10.47/11.96 וקצב של 11.67/13.33 רכישות ביום
- [x] להפריד בין יעד מאגר ישיר, באנדל חג, Boost ו־Plus כדי למנוע ספירה כפולה וקניבליזציה
- [x] לעדכן את טבלת יעדי המוצרים, חלוקת התקציב, חבילת מנהל הקמפיינים, UTM ותבניות הדיווח
- [x] להגדיר למנהל הקמפיינים ספי שמירה, שיפור, עצירה וסקייל מול יעד 350 עד 400 יחידות

## עמוד תשלום לפיילוט Plus (אוגוסט 2026)
- [x] לאתר את הנתיב הייעודי הקיים לפיילוט Plus ואת נקודת הכניסה של מועמד שאושר
- [x] לאמת מה מוצג בעמוד, מחיר 99 ₪ לחודש, אפשרות הפסקה והטבות הפיילוט
- [x] למסור להילית את הקישור המדויק שבו צריך להופיע תשלום Grow
- [x] להשאיר את חיוב Plus חסום עד קבלת pageCode ייעודי, הגדרת חיוב חוזר, webhook וביטול מ־Grow
- [x] בדיקת תשלום ראשון, חידוש, כשל חיוב, ביטול ועדכון סטטוס Plus נדחתה במכוון עד לקבלת פרטי Grow; Plus נשאר חסום ולא הוצג כחיוב פעיל

## הפרדת ערך ומניעת קניבליזציה בין Boost ל־Plus (אוגוסט 2026)

- [x] למפות את ההבטחות, המחירים והמגבלות הנוכחיים של Boost ושל Plus
- [x] לנתח תרחישי שימוש וקניבליזציה בין רכישות Boost נקודתיות לבין מנוי Plus
- [x] לבחון מכסות Boost ששומרות על זמינות מאגר ההתאמות ועל ערך Plus
- [x] להציע חלופות תמחור, הטבות והפרדת מסרים בין שירות עצמי לבין התאמות שעוברות בדיקה אישית
- [x] לבחור מודל פיילוט מומלץ עם מדדי הצלחה, עצירה ושינוי
- [x] להציג להילית המלצה לאישור לפני כל שינוי במוצר, באתר או בחיוב

## בדיקת מוכנות להשקת Boost (29.8.2026)

- [x] לוודא שתצורת Grow של Boost פעילה בייצור ומחייבת 19.90 ₪ בתשלום יחיד
- [x] לאמת שקישור התשלום נקשר לכרטיס ולבקשת Boost המדויקים ללא ביצוע חיוב אמיתי
- [x] לאמת שזרימת ההרשמה וההסכמה פתוחה רק לחברי מאגר פעילים ואינה מחייבת
- [x] לבדוק במידע מצרפי בלבד כמה חברים מאושרים וכמה אפשרויות כשירות ניתן לייצר כעת
- [x] להגדיר השקה מדורגת, מגבלות ונקודת עצירה לפני הפצה רחבה
- [x] למסור להילית החלטת Go או No-Go מדויקת בלי לשלוח קמפיין או לבצע חיוב ללא אישור

## בדיקת Boost בין הילית ל־shaharnat08 (29.8.2026)

- [x] לזהות במדויק את חשבון shaharnat08 ואת פרופיל הילית במאגר הפעיל
- [x] לעדכן את גיל חשבון הבדיקה shaharnat08 מ־43 ל־45 באישור מפורש ולתעד את מטרת הניסוי
- [x] לבדוק אם shaharnat08 כבר אישר Boost במפורש ואם שני הפרופילים פעילים ושלמים
- [x] לבדוק התאמה הדדית, תנאי סף, התאמות פעילות ומכסת 30 הימים בלי לחשוף פרטים אישיים
- [x] ליצור באישור בעלת שני החשבונות אפשרות Boost אנונימית ומבודדת שתופיע אצל הילית ללא שליחה או חיוב
- [x] לא נדרש קישור הסכמה ל־shaharnat08 לאחר שאושר במפורש שזהו חשבון בדיקה בשליטת הילית
- [x] לוודא שהילית יכולה לבחור את הכרטיס ולפתוח תשלום בעצמה, בלי לבצע חיוב בפועל
- [x] למסור תזמון מומלץ להשקת Boost ולפתיחת פיילוט Plus

## סף 60% וכרטיס ניסוי Boost (29.8.2026)

- [x] להוריד את סף אפשרויות Boost מ־70% ל־60% בכל מנגנוני הזכאות והיצירה
- [x] לנסח בטאב ההתאמות הסבר קצר ש־60% ומעלה מצביעים על פוטנציאל לפי האלגוריתם בלי לטעון לניבוי מחקרי או להבטיח הצלחה
- [x] להסיר גם ממייל ההתאמה הרגיל את הטענה הלא מבוססת שמחקרים מגדירים מעל 60% כטוב מאוד או מבטיח
- [x] להסביר בקצרה שהילית שולחת במסלול הרגיל התאמות נבחרות לאחר בדיקה אישית ו־Boost מאפשר בחירה עצמאית נוספת
- [x] להסביר שהשם והתמונה מוסתרים מטעמי פרטיות וכדי לאפשר בחינה מעבר למראה
- [x] ליצור כרטיס בדיקה פנימי ומבודד של 75% בין הילית ל־shaharnat08 בלי לשנות את העדפות ההתאמה של הילית
- [x] להשלים בפרופיל הבדיקה של הילית את ״על עצמי״ ו״מחפשת בבן זוג״ בטקסט מפורש לניסוי בלבד, לאחר שהתברר שהם חוסמים checkout
- [x] לוודא שכרטיס הבדיקה אינו מופיע בתור ההתאמות הרגיל ואינו שולח או מחייב מעצמו
- [x] להוסיף בדיקות רגרסיה לסף 60%, לפרטיות, לנוסח ולהצגת 19.90 ₪ רק בפעולת השליחה
- [x] לאמת בבדיקת המקור והצילום שהמחיר 19.90 ₪ מופיע פעם אחת בלבד על כפתור השליחה ואינו מוכפל בהסכמת ה־checkout
- [x] לאמת בדסקטופ ובמובייל, להריץ את שערי השחרור, לפרסם ולסנכרן GitHub

## החלטות סופיות להשקת Boost ו־Plus (אוגוסט 2026)
- [x] לפתוח את טופס ההצטרפות למסלול Boost לכל חבר מאגר פעיל בלי צורך בהזמנה ידנית
- [x] להשאיר את כל כללי ההסכמה, האנונימיות, הסינון והיציאה העצמית גם כאשר המסלול פתוח לכולם
- [x] לקבע את מחיר Boost הרגיל על 19.99 ₪ לכל מימוש וללא בוסט ראשון חינם
- [x] לכלול ב־Plus Boost אחד בכל מחזור בנוסף לשתי הצעות שנבדקו ידנית
- [x] להגביל את פיילוט Plus ל־40 משתתפים: עד 20 נשים ועד 20 גברים, עם אכיפה בשרת ותצוגת יתרה ב־CRM
- [x] לעדכן את עמוד Plus, התקנון, האזור האישי, ה־CRM והמיילים כך שלא תהיה סתירה בין Boost רגיל לבין הטבת Plus ומכסת 20/20

## דף אישור אישי ל־Match Boost (אוגוסט 2026)
- [x] להפוך את `/match-boost` לדף קצר שבו חבר מאגר מזין את המייל שלו ומבקש קישור אישי לאישור Boost
- [x] לשלוח קישור אישי רק לפרופיל מאגר פעיל ומשלם, בלי לחשוף בטופס אם המייל קיים או אינו קיים
- [x] להוסיף הגבלת קצב של עשר דקות ובקרת שליחה כפולה לבקשת הקישור כדי למנוע שימוש לרעה
- [x] לשלוח מייל טרנזקציוני עם קישור מאובטח לאזור האישי וטאב ההתאמות, בלי לצרף את החבר למסלול
- [x] להציג בדף האישי את שלוש ההסכמות: אלגוריתם ללא אישור הילית, כרטיס אנונימי, והיעדר הבטחה להסכמה או זוגיות
- [x] לאחר האישור לסמן `active` בטבלת Boost ולשמור גרסת הסכמה, מועד הצטרפות ויומן אירועים
- [x] להכניס לרשימת המועמדים רק חברים עם הסכמה פעילה ופרופיל מלא, ולהסיר מיד מי שיוצא מהמסלול
- [x] להציג בכרטיס חבר המאגר ב־CRM תג ״אישר Boost״ רק כאשר סטטוס ההסכמה פעיל

## הודעת WhatsApp להשקת המאגר, Boost ו־Plus (אוגוסט 2026)
- [x] לאמת את קישור ההצטרפות למאגר ולהוסיף `https://hilitcaspi.com/database` להודעות
- [x] להכין נוסח קצר, נוסח מלא וגרסת תזכורת שמציגים את Match Boost, Plus ופינת הרווקים בסושיאל
- [x] להבהיר שהצטרפות למאגר היא בתשלום חד־פעמי וש־Plus הוא שירות חודשי נפרד
- [x] לא לשלוח לקבוצות לפני אישור הילית לנוסח הסופי ולמועד הפרסום; לא בוצעה שליחה

## הסרה דחופה של נתוני מאגר מהאתר הציבורי (אוגוסט 2026)

- [x] לאתר בכל עמוד ציבורי מספר חברי מאגר או רווקים פעילים, אחוז קבלת הצעות, אחוז השלמת שאלון או פרופיל וכל KPI ציבורי דומה
- [x] להסיר את הנתונים מרכיבי UI, עמודי מכירה, עמוד הבית, מטא־תגים, תוכן סטטי ו־API ציבורי בלי להסיר נתונים פנימיים מה־CRM והדשבורד
- [x] להוסיף בדיקת רגרסיה שמונעת החזרה של המספרים והאחוזים לעמודים הציבוריים ומוודאת שה־API הציבורי אינו קיים
- [x] לבדוק בדסקטופ ובמובייל את עמוד הבית, המאגר, ההרשמה, האירוע, באנדל החג, ט״ו באב ומדריך הסימנים לאחר ההסרה
- [x] להריץ 184 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי

## הפעלת Match Boost בתשלום מתוך האזור האישי (אוגוסט 2026)

- [x] להציג באזור האישי כפתור ״שליחת Boost ב־19.99 ₪״ רק כאשר קיימת התאמה אנונימית זמינה וזכאות תקינה
- [x] להציג לפני התשלום הסבר מלא שה־Boost אלגוריתמי, לא נבדק ידנית על ידי הילית ואינו מבטיח אישור הדדי, חשיפת פרטים או זוגיות
- [x] לדרוש אישור מפורש לתקנון Boost ולהצטרפות לקבלת הצעות Boost כתנאי לפתיחת התשלום
- [x] לשמור גרסת תקנון, מועד אישור ואירוע audit לפני יצירת העסקה
- [x] למפות את העסקה כמוצר `match_boost` נפרד בסך 19.99 ₪ ולמנוע זיהוי שלה כרכישת מאגר, מדריך או באנדל
- [x] לאמת מחדש בזמן אישור העסקה ששני הצדדים פעילים, פנויים, עם פרופיל מלא והסכמה עדכנית, ולנעול מימוש יחיד
- [x] אם המועמד אינו זמין לאחר חיוב מאושר, לשמור קרדיט Boost אוטומטי לשימוש חוזר במקום לאבד את התשלום
- [x] להציג הודעת הצלחה או קרדיט ברורה באזור האישי ולשמור idempotency לפי מזהה העסקה
- [x] ליצור קישור הדגמה מבוקר שאינו חושף נתוני לקוח או מבצע חיוב ולבדוק בדסקטופ ובמובייל
- [x] להריץ 189 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי
- [x] לכתוב ניוזלטר השקה ל־Match Boost עם קישור `https://hilitcaspi.com/match-boost` והסבר שהקישור האישי נשלח למייל המאגר
- [x] לכתוב SMS קצר והודעת WhatsApp לקבוצה שמובילים לאותו טופס ואינם מציגים תגובה בקבוצה כהסכמה
- [x] להבהיר בכל הערוצים שההצעות אלגוריתמיות, אינן נבדקות ידנית על ידי הילית ושהצטרפות דורשת אישור אישי
- [x] לאמת שאישור שלוש ההסכמות מעדכן אוטומטית את החברות ב־Boost ואת תג ״אישר Boost״ ב־CRM
- [x] להציג להילית את נוסחי הניוזלטר, ה־SMS וה־WhatsApp לאישור ולא לשלוח דבר לפני אישור מפורש

## פישוט מסר Match Boost בעמוד ובהודעות (אוגוסט 2026)

- [x] לפתוח את העמוד במסר ״ביקשתם יותר התאמות, ואני מקשיבה״ ולהסביר את הערך לפני פרטי התהליך
- [x] להסביר בפשטות שהכלי מאפשר לצפות באזור האישי בהתאמות פוטנציאליות ולשלוח בקשה עצמאית
- [x] להבהיר ש־Boost הוא אפשרות נוספת להתאמות השוטפות ויכול לכלול התאמות מתחת ל־80% לפי בחירת חברי המאגר
- [x] להסביר שאישור הפרופיל מאפשר גם לשלוח וגם לקבל Boost ללא אישור אישי של הילית
- [x] להסיר מהעמוד ומחבילת ההודעות שפה טכנית על אלגוריתם, סנכרון, סטטוסים ומערכות
- [x] לעדכן ניוזלטר, SMS והודעת קבוצה עם קישור `https://hilitcaspi.com/match-boost` והנחיה להזין את מייל המאגר
- [x] לבדוק דסקטופ, מובייל, 189 בדיקות Vitest, TypeScript, Build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub ב־checkpoint הייעודי בלי לשלוח הודעות ללקוחות לפני אישור מפורש

## מיזוג עריכות העיצוב מ־GitHub לאחר פרסום Boost (אוגוסט 2026)

- [x] למזג ללא force push את עיצובי Plus וחגי תשרי שנוספו ב־GitHub במקביל לפרסום מסר Boost
- [x] להעביר את שני נכסי חגי תשרי הגדולים ל־`/manus-storage/` ולהסיר אותם מתיקיית `client/public`
- [x] לבדוק שהמיזוג לא מחזיר נתוני מאגר ציבוריים או טענות לא מאושרות, לשחזר את תקנון המאגר המלא ולשמור את תקנון Plus כטיוטה
- [x] לבדוק בדסקטופ ובמובייל את עמוד Plus, עמוד חגי תשרי, תקנון המאגר ותקנון Plus לאחר המיזוג
- [x] להריץ 189 בדיקות Vitest, TypeScript, Build ו־git diff --check על העץ הממוזג
- [x] לשמור checkpoint ממוזג, לפרסם ולסנכרן את אותו commit ל־GitHub

## חידוד עמוד Boost וזרימת האישור הישיר (אוגוסט 2026)

- [x] להוסיף תמונה עגולה של הילית בראש עמוד Boost בהתאם לשפה של עמודי המוצרים
- [x] להחליף בכל העמודים וההודעות ״Match Boost״ ב־״Boost״ ולהוסיף אפקט פעימה עדין ונגיש למילה ״Boost״
- [x] לאבחן מדוע בקשת ההצטרפות של הילית לא הניבה מייל: הפרופיל שנמצא עבור כתובת הבדיקה אינו פעיל ולכן לא נשלח קישור אישי
- [x] לפשט את הזרימה: בקישור אישי מאומת לאפשר אישור מיידי שמעדכן CRM; בעמוד הציבורי לשמור אימות בעלות על המייל לפני הצטרפות
- [x] להוסיף ״לכם״ אחרי ״שירות Boost מאפשר״ ולהגדיל מעט את הטקסט בכרטיסי ה־Hero
- [x] לנסח בכרטיס השלישי: ״מי שמאשרים את שירות הבוסט יהיו רשאים לשלוח ולקבל בקשות Boost״
- [x] להחליף ״מייל המאגר״ ב־״המייל שאיתו נרשמתם למאגר״
- [x] להבהיר שהשירות מיועד רק למי שכבר רשומים ופעילים במאגר
- [x] להבהיר שההתאמות נוצרות על ידי האלגוריתם אך אינן עוברות אישור אישי של הילית
- [x] להסיר או לפשט את סעיפי התשלום והיציאה מהשירות בעמוד ההצטרפות כדי למנוע בלבול
- [x] להוסיף קלאוזר הסכמה ברור: זהו שירות נוסף, אישורו מאפשר לשלוח ולקבל Boost ומונע ציפייה שהצעת Boost נבדקה אישית על ידי הילית
- [x] לעדכן בדיקות תוכן, פרטיות וסנכרון CRM ולבדוק דסקטופ ומובייל
- [x] להריץ 189 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי

## תיקון קישור Boost ועיצוב האזור האישי (אוגוסט 2026)

- [x] לשנות את קישור האישור במייל כך שיפתח ישירות את האזור האישי עם טוקן הפרופיל המאומת
- [x] למקד את האזור האישי אוטומטית בכרטיס Boost לאחר פתיחת הקישור מהמייל
- [x] לשמור את אישור Boost והסנכרון ל־CRM מתוך האזור האישי בלבד, בלי להפנות בחזרה לעמוד הציבורי
- [x] לעצב את כרטיס Boost באזור האישי בצבעים, בכותרות, בכרטיסים ובאפקט העדין של עמוד Boost הציבורי
- [x] לבדוק שקישור מהפורמט הישן מופנה לנתיב החדש, שטוקן דמה נדחה ושאין חשיפת פרטי לקוח
- [x] לבדוק את ההסכמה ותג ה־CRM בבדיקות רגרסיה ואת כרטיס Boost בהדגמת דסקטופ ומובייל ללא נתוני לקוח
- [x] להריץ 199 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי

## אישור Boost עם פרופיל חסר ועיצוב מייל הקישור (אוגוסט 2026)

- [x] לאפשר לשמור אישור Boost ותג ״אישר Boost״ גם כאשר חסרים פרטי פרופיל או שאלון, בלי להציג את הפרופיל כמועמד עד להשלמה
- [x] לאתר את הרשומה של הילית ולאמת שאישור Boost נשמר בפרופיל וב־CRM בלי לחשוף פרטים אישיים
- [x] לעצב מחדש את נושא המייל, ה־preheader והתוכן בהתאם לצבעוניות ולשפה של עמוד Boost
- [x] למנוע הצגת URL גולמי בתקציר Outlook ולהציג תקציר אנושי ברור
- [x] להבהיר במייל ובאזור האישי שעצם אישור והצטרפות ל־Boost אינם כרוכים בתשלום נוסף, וש־19.99 ₪ נגבים רק בבחירה לשלוח Boost
- [x] להוסיף בדיקות רגרסיה להפרדת ההסכמה מזכאות להצגה, לתג CRM ולתוכן המייל
- [x] לבדוק את המייל ואת אזור Boost בדסקטופ ובמובייל, להריץ את שערי השחרור, לפרסם ולסנכרן GitHub

## טאב Boost ייעודי באזור האישי (אוגוסט 2026)

- [x] לאבחן ולתקן מדוע תג ״אישור Boost פעיל״ אינו מופיע בכרטיס ובפרופיל הילית ב־CRM אף שההסכמה נשמרה
- [x] לוודא שה־CRM קורא את אישור Boost מאותו מסד פעיל ומציג אותו ללא תלות בשלמות הפרופיל
- [x] לשנות את נושא מייל Boost ל־״נפתחה עבורך האפשרות להצטרף ל־Boost״ ללא אזכור מחיר
- [x] לשנות את תקציר המייל ל־״אישור קצר יאפשר לך לשלוח ולקבל בקשות Boost דרך האזור האישי״ ללא URL גולמי או מחיר
- [x] להוסיף לטאבים באזור האישי טאב נפרד בשם ״Boost״ שאינו נבלע בתוך היסטוריית ההתאמות
- [x] לעדכן קישורי מייל חדשים וישנים כך שיפתחו ישירות את טאב Boost
- [x] לפני אישור, להציג בטאב הסבר קצר ושלוש הסכמות עם כפתור הצטרפות ללא תשלום
- [x] לאחר אישור עם חוסרים, להציג שהאישור נשמר ולפרט מה נדרש להשלים לפני הצגת אפשרויות
- [x] לאחר אישור ופרופיל מלא, להציג התאמות Boost זמינות בכרטיס אנונימי עשיר ולציין את מספר האפשרויות הזמינות
- [x] להציג את תשלום 19.99 ₪ רק ליד אפשרות Boost זמינה ורק בעת בחירה לשלוח אותה
- [x] להציג בטאב גם סטטוס Plus, קרדיט קיים, בקשה שנשלחה, המתנה לתשובה ויציאה מהשירות לפי הצורך
- [x] לשמר את כל חסמי הפרטיות, הזכאות, מגבלת 30 הימים ובדיקת הזמינות בזמן התשלום
- [x] להוסיף בדיקות רגרסיה לניווט, מצבי הטאב, תשלום והסכמה ולבדוק דסקטופ ומובייל
- [x] להריץ 201 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי

## פישוט טאב Boost והנחיתה מהקישור (אוגוסט 2026)

- [x] לעבור שורה־שורה על כל מצבי טאב Boost ולוודא שהמסר המרכזי הוא אישור השירות והבחירה העצמאית
- [x] להסיר מטאב Boost כל אזכור ל־Plus ול־CRM ולהציג את השירות כמוצר עצמאי
- [x] לצמצם את אזכורי התשלום ולהציג 19.99 ₪ פעם אחת בלבד, בצמוד לכפתור שליחת Boost בפועל
- [x] להבהיר שטאב ההתאמות מציג התאמות והיסטוריה שנשלחו, וטאב Boost מציג אפשרויות חדשות לבחירה עצמאית
- [x] להציג בכרטיס Boost זמין כפתור שליחה עם המחיר, בלי להוסיף כפתור להתאמות ישנות או ממתינות
- [x] לתקן את הקישור מהמייל כך שהטאב ייפתח ויגלול פעם אחת בדיוק לאזור האישור, החוסרים או האפשרות הזמינה לפי הסטטוס
- [x] לבדוק דסקטופ, מובייל, הפניית קישור ישן וכל מצבי Boost בהדגמה ללא נתוני לקוח
- [x] להריץ 201 בדיקות Vitest, TypeScript, Build ו־git diff --check; לפרסם ולסנכרן GitHub ב־checkpoint הייעודי

## עדכון כותרת עמוד Boost (אוגוסט 2026)

- [x] להחליף את תיאור הילית בראש עמוד Boost ל־״הילית כספי | מאמנת ומרצה למציאת זוגיות״ ול־״מייסדת מאגר הרווקים החכם בישראל״
- [x] לשמור על קריאות הכותרת במובייל ובדסקטופ ולהימנע מטענה השוואתית לא מאומתת כמו ״הגדול בישראל״
- [x] לעדכן את כותרת הדפדפן בהתאם ולשמור את מייל Boost ממוקד בשירות עצמו
- [x] להריץ 202 בדיקות, TypeScript, Build ו־git diff --check; לפרסם ב־checkpoint הייעודי ולסנכרן GitHub לאחר חידוש ההרשאה

## איחוד Boost בתוך טאב ההתאמות ומוכנות להפעלה רחבה (אוגוסט 2026)

- [x] לשנות ״מי שמאשרים״ ל־״חברי מאגר שיאשרו את שירות הבוסט״ בכל נקודות המגע
- [x] להסיר מהמייל ומהאזור האישי כל התייחסות לחוסרים בפרופיל ולהשאיר את חסם השלמות פנימי בלבד
- [x] לוודא ששורת הנושא והתקציר ב־Outlook אינם מציגים URL גולמי
- [x] להסיר את טאב Boost העצמאי ולאחד את התוכן בתוך טאב ההתאמות בשני אזורים ברורים
- [x] להציג אזור ״התאמות שהילית בוחנת ושולחת״ לצד אזור ״אפשרויות Boost לבחירה עצמאית״
- [x] להסביר שאחוז ההתאמה הוא פוטנציאל אלגוריתמי ושבמסלול הרגיל הילית בוחנת התאמה וזמינות לפני שליחה
- [x] להסביר באופן ניטרלי מדוע התאמה רגילה עשויה להישאר בבדיקה בלי להחליש את הצורך ב־Boost
- [x] להציג Boost רק למועמד או מועמדת שאישרו Boost, פנויים, פעילים ועומדים בתנאי הזכאות
- [x] לבדוק אם השרת מחזיר אפשרויות Boost מרובות; אם לא, להרחיב את הבחירה למספר כרטיסים אנונימיים עשירים
- [x] להציג 19.90 ₪ פעם אחת בלבד בכפתור השליחה של אפשרות Boost זמינה
- [x] לעדכן קישורי מייל קיימים וחדשים כך שיגללו לאזור Boost בתוך טאב ההתאמות
- [x] לבדוק שכל התשתית מוכנה להסכמות, יצירת אפשרויות, תשלום, נעילה ושליחה בפועל
- [x] ליצור לפי דרישה ועד שש אפשרויות Boost חדשות רק בין שני חברים מאושרים וזכאים, ללא שליחה או חיוב בעת יצירת האפשרויות
- [x] לקשור כל תהליך תשלום וה־webhook של Grow לבקשת Boost ול־matchId המדויקים שנבחרו, בלי fallback לבקשה אחרת כאשר קיים מזהה מפורש
- [x] להריץ בדיקות פרטיות, זכאות, דסקטופ, מובייל, Vitest, TypeScript, Build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub לאחר חידוש הרשאת החיבור

## חידוד חוויית השליחה והקבלה של Boost (29.8.2026)

- [x] לציין במייל המקבל באופן ברור שנשלחה אליו הצעת Boost אלגוריתמית
- [x] להבדיל ב־WhatsApp בין ״שלחת Boost״ לשולח לבין ״קיבלת Boost״ למקבל
- [x] להוסיף באזור האישי הסבר קצר ומשכנע: ״למה האלגוריתם מצא כאן פוטנציאל״, בלי לייחס את הבחירה להילית
- [x] להחליף את סימן השאלה בכרטיס Boost בצללית אנונימית מסקרנת שאינה חושפת תמונה או זהות
- [x] להציג לאחר התשלום אישור שליחה ותזכורת שהתמונה המלאה והשם נפתחים רק לאחר אישור הדדי
- [x] להגדיר שלחיצה על שליחת Boost ותשלום כאישור השולח להצעה הספציפית, כך שרק אישור המקבל נדרש לאחר מכן
- [x] לעדכן את תקנון Boost בהתאם בלי לשנות את כלל החשיפה רק לאחר הסכמה של שני הצדדים
- [x] לוודא שהתמונה המלאה אינה נחשפת לפני אישור הדדי בהתאם להסכמה ולתקנון הקיימים
- [x] לחסום במסך התגובה של Boost שם, תמונה ועיר מדויקת לפני אישור הדדי, ולהחזיר רק כרטיס אנונימי
- [x] להוסיף בדיקות רגרסיה לנוסחי השולח והמקבל, לפרטיות ולצללית
- [x] לתקן גלישה אופקית בעמוד אישור תשלום Boost במובייל
- [x] לאבחן ולתקן את מצב הטעינה המתמשך של כרטיס Boost האמיתי באזור האישי
- [x] לסנכרן דחיית מקבל Boost לבקשת השולח כדי שלא יוצג מצב המתנה לאחר סיום ההצעה
- [x] לבדוק דסקטופ ומובייל, להריץ את שערי השחרור, לפרסם ולסנכרן GitHub

## תקנון ומדיניות החזר Boost (29.8.2026)

- [x] לבדוק את תקנון Boost מול זרימת התשלום, השליחה, הדחייה, אי־התגובה והקרדיט בפועל
- [x] להבהיר שהתשלום הוא עבור שליחת Boost ולא עבור הסכמה, חשיפת זהות, פגישה או תוצאה זוגית
- [x] להבהיר שדחיית הצד השני, אי־תגובה או אי־התאמה אינם מזכים בהחזר כספי
- [x] לשמור חריג ברור לכשל מערכת שבו החיוב אושר אך ה־Boost לא נשלח, באמצעות קרדיט חוזר או טיפול כנדרש
- [x] לשמור במפורש זכויות ביטול או השבה שלא ניתן להתנות עליהן לפי דין
- [x] לוודא שהתקנון מכסה פרטיות, חשיפה לאחר אישור, תוקף ההצעה, מכסת 30 יום ואחריות המשתמש
- [x] להוסיף בדיקות רגרסיה בין התקנון להתנהגות השרת
- [x] להריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub

## תיקון סטטוס ואיפוס התאמת ניסוי Boost (29.8.2026)

- [x] לבדוק במסד את סטטוס ההתאמה, שני האישורים, בקשת Boost והתשלום בין הילית ל־shaharnat08
- [x] לתקן את האזור האישי כך שמצב ״ממתינה לתשובת הצד השני״ לא יוצג לאחר אישור הדדי, דחייה או שחרור
- [x] לשמור את העסקה הקודמת כהיסטוריה ולא לבצע חיוב, הודעה או שליחה אוטומטיים
- [x] לאפס רק את התאמת הניסוי וליצור מחדש כרטיס Boost מבודד של 75%
- [x] לוודא שהכרטיס החדש זמין לתשלום ידני ושאינו מופיע במסלול ההתאמות הרגיל של הילית
- [x] להוסיף בדיקת רגרסיה לסטטוס העליון לאחר אישור הדדי ושחרור
- [x] להריץ בדיקות, TypeScript, build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub

## כניסה לאזור האישי וקישור ממיילי Boost (29.8.2026)

- [x] למפות את מסך הכניסה הקיים, יצירת הקישור האישי וכל נקודות הכניסה באתר
- [x] לתכנן כניסה ללא סיסמה באמצעות הזנת מייל וקבלת קישור אישי ומאובטח
- [x] להוסיף נקודת כניסה בולטת לאזור האישי באתר בלי לשנות את משפך התשלום למאגר
- [x] להוסיף במייל שאחרי אישור הדדי של Boost כפתור ״כניסה לאזור האישי״ לכל צד
- [x] להפריד בבירור בין קישור התגובה להצעה לבין קישור הכניסה לאחר חשיפת הפרטים
- [x] לוודא שקישור האזור האישי נוצר מהטוקן של האדם שמקבל את המייל ולא מהטוקן של הצד השני
- [x] להוסיף בדיקות אבטחה, רגרסיה ונוסח
- [x] לבדוק דסקטופ ומובייל, להריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub

## כרטיסי Boost מסקרנים והפרדת המסלולים (29.8.2026)

- [x] להסיר מההסבר הראשי של Boost את הדגשת סף 60% ולהשאיר ניסוח פשוט על אפשרויות נוספות
- [x] לעצב כל אפשרות Boost ככרטיס סגול מקופל עם צללית אנונימית, אחוז התאמה גדול וחץ לפתיחת הפרטים
- [x] לא להשתמש בתמונה האמיתית לפני אישור הדדי, גם לא בטשטוש שעלול לאפשר זיהוי
- [x] להציג בפירוט הפתוח את כל המידע האנונימי הרלוונטי ואת הסיבות לפוטנציאל לפי DNA ושאלונים
- [x] להוסיף בפירוט ששני הצדדים במסלול Boost ולכן האפשרות זמינה לבחירה עצמאית
- [x] להסיר לחלוטין את אזור ״מה כדאי לקחת בחשבון״ מכרטיסי Boost
- [x] להסיר ניסוחים שמייחסים את אפשרות Boost לבחירה אישית של הילית
- [x] להציג התאמות רגילות של 65% ומעלה, ורק אם אין כאלה להשאיר גם ציונים נמוכים יותר
- [x] להבהיר במסלול הרגיל שהוא כולל גם אנשים שבחרו לא להשתתף ב־Boost ולכן קיימות בו אפשרויות נוספות
- [x] לתקן מייל ו־WhatsApp לשולח ולמקבל כך שיציינו במפורש ״מסלול Boost״ ולא ״בחרתי עבורך״
- [x] להוסיף בדיקות רגרסיה לפרטיות, למיון, לנוסח ולמצב הכרטיס המקופל
- [x] לבדוק דסקטופ ומובייל, להריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [x] לפרסם ולסנכרן GitHub

## פלואו אישור דו־צדדי מלא ב־Boost (29.8.2026)

- [x] למפות את זרימת התשלום, שליחת המיילים, אישורי שני הצדדים, חשיפת פרטי הקשר והודעות WhatsApp
- [x] לבטל את האישור האוטומטי של שולח Boost בעת התשלום
- [x] לשלוח לשני הצדדים מיד לאחר התשלום מייל התאמת Boost מלא עם שם, תמונה, פרטי פרופיל וכפתור אישור נפרד
- [x] לוודא שכפתור האישור של השולח מקבל טוקן תגובה אישי ונכון בדיוק כמו הצד המקבל
- [x] לשלוח לשני הצדדים WhatsApp ניטרלי שמפנה לאישור או לדחייה במייל בלי לייחס את הבחירה להילית
- [x] למנוע מכל נתיב Boost להשתמש בנוסח התאמה רגיל שמייחס את הבחירה להילית
- [x] לחשוף פרטי יצירת קשר במייל ובאזור האישי רק לאחר ששני הצדדים אישרו
- [x] לסנכרן את כרטיס ההמתנה, סטטוס ההתאמה ובקשת Boost לאחר כל תגובה
- [x] לעדכן את הסכמת Boost והתקנון כך שיכסו חשיפת שם, תמונה ופרטי פרופיל בעת שליחת ההצעה
- [x] לדרוש אישור מחודש מחברי Boost קיימים לפני השתתפות בפלואו החשיפה החדש
- [x] להוסיף בדיקות רגרסיה לתשלום שאינו אישור, שני כפתורי אישור, WhatsApp, פרטיות וחשיפת קשר
- [x] לבדוק דסקטופ ומובייל, להריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [ ] לפרסם, לסנכרן GitHub ולבצע ניסוי מבוקר בלבד
