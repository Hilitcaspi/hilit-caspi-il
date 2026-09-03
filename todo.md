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
- [x] לפרסם ולסנכרן GitHub, ולהכין ניסוי מבוקר עם כרטיס 75% וקרדיט התשלום הקודם ללא שליחה עד לפעולה ידנית של הילית

## איפוס ניסוי Boost וטאב מאושרים ב־CRM (29.8.2026)

- [x] לבדוק את סטטוס התאמת הניסוי, בקשת Boost והקרדיט בין הילית לשחר בלי לחשוף פרטים אישיים
- [x] לאפס רק את התאמת הניסוי ולהכין מחדש כרטיס 75% ללא חיוב או שליחה אוטומטיים
- [x] לשמר את היסטוריית התשלום ולהעמיד את התשלום הקודם כקרדיט זמין לניסוי החוזר
- [x] למפות את מסכי CRM ונתוני חברות Boost הקיימים
- [x] להוסיף ל־CRM טאב מאושרי Boost עם מספר כולל, חיפוש וסטטוסים שימושיים
- [x] להציג ספירות מצרפיות של פעילים, ממתינים לאישור מחודש, מושהים ויצאו מהשירות
- [x] להוסיף בדיקות רגרסיה לנתוני הטאב, הרשאות וסינון
- [x] לבדוק דסקטופ ומובייל ולהריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [x] לתקן גלישה אופקית של מסך ה־CRM במובייל כך שטאב מאושרי Boost והמדדים נשארים בתוך רוחב המסך
- [x] לפרסם, לסנכרן GitHub ולדווח להילית כמה חברים אישרו Boost עד כה

## בדיקת 81 אישורי Boost ישנים (29.8.2026)

- [x] למפות את גרסאות הסכמת Boost ואת הנוסח המדויק שאושר בכל גרסה
- [x] לבדוק במידע מצרפי בלבד כמה חברים אישרו כל גרסה ואילו סעיפי פרטיות נשמרו באירועי הביקורת
- [x] לקבל מהילית אישור מפורש שההסכמה הישנה כבר כיסתה את חשיפת שם, תמונה ופרופיל במייל לפני אישור התאמה
- [x] להעביר לגרסה החדשה רק חברות פעילות שבהן שלוש ההסכמות קיימות במלואן
- [x] לשמור את מועד ההסכמה המקורי ולהוסיף לכל מעבר אירוע ביקורת על אישור שוויון הגרסאות בידי בעלת העסק
- [x] לא לשנות מושהים, יוצאים מהשירות או רשומות שחסרה בהן אחת ההסכמות
- [x] לאמת מחדש את ספירות טאב מאושרי Boost ב־CRM
- [x] לדווח להילית את התוצאה המדויקת בלי לשלוח הודעות

## איפוס נוסף להתאמת הניסוי הילית–שחר (29.8.2026)

- [x] לבדוק את סטטוס ההתאמה, בקשת Boost והקרדיט הנוכחיים בין שני חשבונות הבדיקה
- [x] לשחרר או לאפס רק את רשומת התאמת הניסוי בלי למחוק את היסטוריית התשלום
- [x] להעמיד מחדש את התשלום הקודם כקרדיט זמין לניסוי החוזר
- [x] ליצור מחדש כרטיס Boost מבודד של 75% באזור האישי של הילית
- [x] לאמת שאין בקשת Boost פתוחה, חיוב חדש או שליחה אוטומטית
- [x] למסור להילית קישור ישיר לבדיקה נוספת

## הוצאת חשבונות הבדיקה מ־Boost (29.8.2026)

- [x] לבדוק את חברות Boost של הילית כספי ושחר נתנאל ואת כל ההתאמות והבקשות הפתוחות שלהם
- [x] להעביר את שני חשבונות הבדיקה לסטטוס יציאה מ־Boost עם אירוע ביקורת
- [x] לנטרל את כרטיס הניסוי וכל בקשת Boost פתוחה בלי למחוק את היסטוריית התשלום
- [x] לוודא ששני החשבונות אינם מופיעים כאפשרויות Boost לאף חבר מאגר
- [x] לוודא שלא נוצרו חיוב, מייל או WhatsApp במהלך ההסרה
- [x] לאמת את ספירות טאב מאושרי Boost ב־CRM לאחר ההסרה
- [x] לשמור checkpoint ולסנכרן GitHub

## ניוזלטר הרשמה לשירות Boost (29.8.2026)

- [x] למפות את תבניות המייל, נכסי המותג וקישור ההרשמה הקיים ל־Boost
- [x] לנסח נושא מסקרן ו־preheader ללא מחיר, URL גולמי או הבטחה לתוצאה
- [x] להבהיר שההצטרפות מיועדת רק לחברי המאגר ושאישור השירות עצמו אינו כרוך בתשלום
- [x] להסביר בקצרה שהשירות מאפשר לראות אפשרויות נוספות ולשלוח בקשת Boost לפי בחירה
- [x] להבהיר ששני הצדדים מקבלים את פרטי ההצעה ושניהם נדרשים לאשר לפני חשיפת פרטי קשר
- [x] לבנות תבנית HTML ממותגת בסגול, ורוד וזהב עם תמונת הילית וכפתור הרשמה ברור
- [x] לוודא שהקישור מוביל לעמוד /match-boost ושאינו חושף טוקן או מידע אישי
- [x] להוסיף תצוגה מקדימה בטוחה שלא שולחת מייל בפועל
- [x] להוסיף בדיקות לנוסח, פרטיות, קישור, subject ו־preheader
- [x] לבדוק דסקטופ ומובייל, להריץ TypeScript, כל הבדיקות, build ו־git diff --check
- [x] לפרסם תצוגה לאישור ולסנכרן GitHub בלי לשלוח את הניוזלטר

## תזמון ניוזלטר Boost בשלוש קבוצות (29.8.2026)

- [x] למפות את תשתית הדיוור הקיימת, הרשאות השיווק, ההסרות והמעקב
- [x] להגדיר קהל של חברי מאגר פעילים בלבד ולהחריג מוסרים, חסומים וחשבונות בדיקה
- [x] לחלק את הקהל אקראית לשלוש קבוצות שוות ולא חופפות כך שכל חבר יקבל פעם אחת בלבד
- [x] לשמור נושא, preheader ותוכן זהים ולשנות רק את שעת השליחה כדי למדוד זמן שליחה נקי
- [x] להוסיף UTM וקוד קבוצה נפרדים לשעות 07:00, 08:00 ו־09:00
- [x] לבנות שליחת גל אידמפוטנטית שמונעת כפילות גם במקרה של retry
- [x] לשמור תוצאות מסירה, פתיחה, הקלקה והרשמה ל־Boost לפי קבוצה
- [x] להוסיף בדיקות לקהל, הסרות, חלוקה, כפילויות וכשלי משלוח
- [x] לפרסם את מנגנון השליחה לפני יצירת התזמונים
- [x] ליצור שלושה תזמוני שליחה חד־פעמיים בפועל ל־30.8.2026 בשעות 07:00, 08:00 ו־09:00 לפי שעון ישראל
- [x] לאמת את שלושת התזמונים ואת הקבוצות בגודל 334, 333 ו־333 בלי לשלוח לפני הזמן
- [x] לסנכרן GitHub לאחר ה־checkpoint

## SMS ומודעות Meta לשירות Boost (29.8.2026)

- [x] למפות את תמונות הילית ואת שפת ט״ו באב ו־Boost הקיימת
- [x] להגדיר SMS משלים שלא יפגע בניסוי שעות הניוזלטר
- [x] להגדיר קהל SMS מורשה בלבד ולהציע קבוצת ביקורת למדידת התרומה
- [x] לבנות מטריצת מסרים נפרדת לחברי מאגר, רימרקטינג, קהל קר וסטורי
- [x] לנסח כותרות, טקסטים וקריאות לפעולה ללא הבטחת התאמה או תוצאה
- [x] להכין קונספטים חזותיים בסגול, ורוד וזהב עם תמונות הילית וברוח ט״ו באב
- [x] ליצור מודעות Meta בפורמטים 1:1 ו־4:5 לרימרקטינג ולבדיקת קהל קר
- [x] ליצור סדרת סטוריז 9:16 עם טקסט קצר, קריא ומזמין
- [x] לבדוק נראות, קריאות, שוליים בטוחים והתאמה למדיניות Meta
- [x] למסור חבילת קריאייטיב ותוכנית הפעלה לאישור בלבד
- [x] לא לשלוח SMS ולא להפעיל קמפיין Meta ללא אישור מפורש

## קריאייטיב מכירתי לרכישות Boost חוזרות (30.8.2026)

- [x] להפריד בין קמפיין אישור השירות למי שטרם אישרו לבין קמפיין מכירה לחברי מאגר שכבר אישרו Boost
- [x] לנסח מסרי סקרנות שמובילים לאזור האישי ולבחינת אפשרויות Boost אנונימיות, בלי לחשוף זהות או להבטיח תוצאה
- [x] ליצור מודעות Feed ו־Story שמדגישות „מי מחכה לי שם?”, בחירה עצמאית ושליחת Boost בתשלום חד־פעמי של 19.90 ₪
- [x] ליצור קריאות לפעולה מכירתיות כמו „לראות מי מחכה לי”, „לפתוח את אפשרויות ה־Boost” ו„לשלוח Boost עכשיו”
- [x] לשמור מודעת אישור שירות נפרדת בלבד למי שעדיין לא הצטרפו למסלול
- [x] לבדוק עברית, זהות הילית, פרטיות, סקרנות, קריאות ושוליים בטוחים בכל נכס
- [x] למסור את חבילת המכירה החדשה לאישור בלי להפעיל מודעות, לשלוח SMS או לבצע רכישה
- [x] להשתמש בתמונות הילית החדשות ובנראות הדוגמאות שסופקו: רקע סגול־שחור דרמטי, ורוד חם, לבבות זוהרים, כותרת גדולה וכרטיסי התראה אנונימיים
- [x] להימנע משמות, ציוני התאמה, התראות, עדויות או תוצאות מומצאים; כרטיסי הסקרנות יהיו המחשה אנונימית בלבד
- [x] להחליף את תמונת הסוודר הסגול בקריאייטיבים המכירתייים בתמונה החדשה שסופקה, להסיר את סימן המים ולשמור את העיצוב והטקסטים ללא שינוי

## אימות ביצוע ניוזלטר Boost (30.8.2026)

- [x] לבדוק את היסטוריית ההרצות של גלי 07:00, 08:00 ו־09:00 בלי להפעיל Run Now או retry
- [x] לאמת בספירות מצרפיות כמה נמענים הוקצו, נשלחו, נכשלו או נשארו בתור בכל גל
- [x] לוודא שאין נמענים כפולים בין הגלים ולדווח להילית רק נתונים מצרפיים

## קמפיין מכירות Boost ועמוד נחיתה ייעודי (30.8.2026)

- [x] לבחור שתי תמונות מקור חדות בלבד ולהשתמש בהן בכל הקריאייטיבים בלי מתיחה, מריחה או תחושת הדבקה
- [x] לבסס את המודעות על אלמנטי עמוד Boost האמיתיים באתר: סגול עמוק, ורוד, זהב, צללית אנונימית, אחוז התאמה וכרטיס מתקפל
- [x] לחדד את המסרים כך שיעוררו סקרנות ורצון לרכוש ולשלוח Boost ב־19.90 ₪ בלי להבטיח תוצאה
- [x] ליצור מודעות Feed ‏4:5 ו־1:1 וסטוריז 9:16 עם עברית מדויקת ושוליים בטוחים
- [x] לבנות עמוד נחיתה ייעודי לחברי מאגר מאושרי Boost שמוביל לאפשרויות האישיות באזור האישי ולא עוקף את התשלום הכרטיסי
- [x] להוסיף לעמוד הנחיתה UTM ומדידה קיימת בלי לשנות את פלואו ההרשמה למאגר
- [x] להכין תוכנית קמפיין מלאה: תקציב, קהלים, החרגות, מטרות, אופטימיזציה, כותרות, תיאורים וטקסטים בלי מקפים ארוכים
- [x] להריץ בדיקות Vitest, TypeScript, build ו־git diff --check
- [x] לבדוק דסקטופ ומובייל ולתקן רק כשלים קריטיים
- [x] לפרסם checkpoint ולסנכרן את אותו קוד ל־GitHub לפני מסירה
- [x] לא להפעיל קמפיין Meta, לא לשלוח SMS ולא לבצע רכישת ניסיון ללא אישור מפורש

## תיקון מסרי קמפיין Boost למסר הקשבה והשקה (30.8.2026)

- [x] להחזיר לראש כל הקריאייטיב את המסר ״אתם ביקשתם יותר אפשרויות ואני מקשיבה לכם״
- [x] להסביר בפשטות ששירות Boost החדש מאפשר לראות אפשרויות באזור האישי ולבחור בעצמכם למי לשלוח בקשת התאמה
- [x] להסיר את המחיר ממודעות הסקרנות וההשקה ולהשאיר אותו רק במודעת פעולה אחת ובשלב השליחה
- [x] לשמור על שתי תמונות הילית החדות, על עיצוב Boost הנקי ועל כרטיסים אנונימיים ללא נתונים מומצאים
- [x] לעדכן את כותרת עמוד הנחיתה כך שתתחיל בהקשבה לקהילה ולא במסר מכירה אגרסיבי
- [x] לעדכן את טקסטי הקמפיין, הכותרות והתיאורים ללא מקפים ארוכים וללא הבטחת תוצאה
- [x] לבדוק את כל הנכסים, דסקטופ, מובייל, Vitest, TypeScript ו־build לפני פרסום
- [x] לפרסם ולסנכרן GitHub, בלי להפעיל את קמפיין Meta ללא אישור מפורש

## בדיקת מייל התאמה שלא התקבל ושליחה מחדש (30.8.2026)

- [ ] לאתר את הלקוח לפי כתובת המייל שסופקה ואת ההתאמה הפעילה עם סמדר
- [ ] לבדוק את אירוע השליחה המקורי, הכתובת, סטטוס ספק הדיוור, דיכויים, הסרות והחזרות
- [ ] לא לשנות הסרה יזומה או העדפת דיוור ללא ראיה שהחסימה שגויה
- [ ] לשלוח מחדש את אותו מייל התאמה דרך ערוץ מיילי ההתאמה, ללא יצירת התאמה חדשה וללא WhatsApp נוסף
- [ ] לאמת את תגובת ספק הדיוור ואת סטטוס המסירה ולדווח להילית

## בדיקת קבלת מיילים ומייל בדיקה דרך ערוץ ההתאמות (30.8.2026)

- [ ] לאתר את רשומת הלקוח לפי הכתובת שסופקה ולבדוק סטטוס פעיל וכתובת מנורמלת
- [ ] לבדוק ביומן המיילים, ברשימות ההסרה, בדיכויים ובהחזרות מדוע מיילים אינם מתקבלים
- [ ] לא לשנות הסרה יזומה או העדפת דיוור ללא ראיה שהחסימה שגויה
- [ ] לשלוח מייל בדיקה בלבד דרך אותו ערוץ טכני של מיילי ההתאמה, ללא פרטי התאמה אמיתיים
- [ ] לאמת את תגובת ספק הדיוור ואת סטטוס המסירה ולדווח להילית

## ביקורת שבעה ימים למערכת התוצאות (30.8.2026)

- [x] לעגן את תאריך ההשקה ואת הגדרות כיסוי ההתאמות, ממתינים 14/30 יום והבסיס להשוואה
- [x] לחשב ממסד הייצור נתוני כיסוי התאמות פעילים ומספרי ממתינים 14 ו־30 יום ללא חשיפת פרטים אישיים
- [x] לסכם משובים שנאספו, סטטוסים חיוביים ושליליים וחוסרי תגובה, ללא פרסום עדויות לא מאושרות
- [x] לבדוק את ריצות מסע 90 הימים, מספר הנבדקים, הנשלחים, המדולגים והכשלים ואת הגנת הכפילויות
- [x] לסכם את רשימת ההמתנה של Plus לפי סטטוס ומגדר, בלי להזמין, להפעיל או לפנות ללקוחות
- [x] לחשב P&L לשבעת הימים האחרונים ולהשוות לשבעת הימים שקדמו להם לפי נתוני התשלומים, Meta וההוצאות הפעילות
- [x] לסמן מגבלות איכות נתונים, פערים בין מקורות וכל הנחה שנדרשה
- [x] להכין דוח מנהלים עם מה השתנה, בעיות שנמצאו ותוכנית פעולה מעשית לשבוע הבא
- [x] לא להפעיל את פיילוט Plus, לא לשלוח מיילים או הודעות ולא לפנות ללקוחות במהלך הבדיקה

## תיקון תמונות במיילי התאמה (30.8.2026)

- [x] לאתר את כל תבניות מיילי ההתאמה הרגילות ו־Boost ואת מקור שדה התמונה שמוזן אליהן
- [x] לבדוק אילו כתובות תמונה אינן ציבוריות, פגות, חסרות פרוטוקול או אינן נתמכות בפרוקסי התמונות של Gmail
- [x] לתקן את יצירת כתובת התמונה כך שתהיה מוחלטת, ציבורית ויציבה בכל מייל התאמה
- [x] להוסיף חלופה חזותית בטוחה כאשר תמונת פרופיל חסרה או לא ניתנת להצגה
- [x] להוסיף בדיקות רגרסיה לתבניות הרגילות ול־Boost ולוודא שאין חשיפת תמונה לפני השלב המותר
- [x] לבדוק תצוגת מייל במובייל ובדסקטופ בלי לשלוח ללקוח אמיתי
- [x] להריץ Vitest, TypeScript, build ו־git diff --check
- [x] לפרסם checkpoint ולסנכרן את הקוד ל־GitHub בהתאם לכלל הפרויקט

## בדיקת הצטרפות בתאל ל־Boost (30.8.2026)

- [x] לאתר את פרופיל בתאל לפי המייל שסופק ואת כל רשומות ההסכמה, היציאה ואירועי Boost הקשורים אליו
- [x] לבדוק אם ההצטרפות מאתמול נשמרה בגרסת ההסכמה הפעילה ואם קיימת סיבה שאינה מוצגת בטאב מאושרי Boost
- [x] לבדוק אם נוצר מייל אישור, לאיזו כתובת נשלח ומה סטטוס המסירה או הדיכוי אצל ספק הדיוור
- [x] לא לשנות הסכמה, סטטוס או דיוור ללא ראיה שהפעולה המקורית הושלמה כדין
- [ ] לתקן את הרשומה רק אם קיימת הסכמה תקפה ולוודא שבתאל מופיעה ב־CRM
- [ ] לדווח להילית אם נדרש אישור נפרד לשליחת מייל אישור מחדש

## בדיקת קופון HILIT10 (30.8.2026)

- [x] לאתר את HILIT10 בקוד, בטבלת הקופונים ובתבניות המייל ללא שינוי נתונים
- [x] לבדוק אם הקופון פעיל, מה סוג וגובה ההנחה, תאריכי התוקף ומגבלות השימוש
- [x] לבדוק באילו מוצרים או עמודי תשלום הקופון מתקבל בפועל
- [x] לזהות איזה מייל הציע את HILIT10 והאם המסר תואם לתנאים הפעילים
- [x] לדווח להילית אם הקופון קיים ופעיל ומה נדרש במקרה של פער, בלי להפעיל או לשנות אותו
- [x] ליצור או לעדכן את HILIT10 כקופון פעיל של 10% למוצרים guide, course, coaching, session ו־database בלבד
- [x] להגדיר את HILIT10 ללא תאריך תפוגה וללא מגבלת שימוש, בלי לאפס שימושים קיימים אם נוצר במקביל
- [x] לאמת שהקופון תקף לחמשת המוצרים המאושרים ונדחה עבור Plus ו־Boost בלי לבצע עסקה
- [x] לדווח להילית לאחר אימות שהקופון פעיל והתנאים תואמים למיילים

## הסרת נוי לינביץ מהמאגר ומכל הדיוור (30.8.2026)

- [x] לאתר את הפרופיל לפי המייל שסופק ואת כל ההתאמות, החברויות והתהליכים הפתוחים
- [x] לבטל את פעילות הפרופיל, תשלום פעיל, הסכמת התאמות וזכאות להופיע במאגר
- [x] לנטרל התאמות פעילות ולהחזיר את הצדדים האחרים למאגר כאשר נדרש
- [x] לבטל חברות Boost או Plus ותורים פעילים אם קיימים
- [x] להוסיף חסימת דיוור גורפת ולהסיר את הכתובת ממסעות שיווקיים ותפעוליים עתידיים
- [x] לבטל מיילים והודעות ממתינים בלי לשלוח הודעת אישור הסרה
- [x] לאמת שהפרופיל אינו פעיל, אינו מופיע במאגר ואין לו תקשורת ממתינה או עתידית

## איתור שאלונים והשלמת פרופיל ליאת ברקוביץ (30.8.2026)

- [x] לאתר את פרופיל ליאת וכל הרשומות הכפולות או המקבילות לפי מזהים תואמים
- [x] לחפש טופס הרשמה מלא, שאלון DNA ושאלון מדעי לפי כל המזהים והתאריכים האפשריים
- [x] לבדוק אם תשובות נשמרו בטבלאות ישנות, בטבלאות מפורטות, בסשנים זמניים או במקור החיצוני המחובר
- [x] להשוות בין מקורות ולייחס לליאת רק תשובות שניתנות לאימות חד משמעי
- [x] להשלים בפרופיל גיל, גובה, תמונה, טקסטים, עיסוק, דת, עיר, העדפות ושאלונים רק כאשר נמצא מקור מאומת
- [x] לאחד או לקשר רשומות כפולות בלי למחוק היסטוריית שאלונים
- [x] לאמת מחדש את אינדיקציות השלמות ב־CRM ובאזור האישי
- [x] לדווח להילית מה נמצא, מה הושלם ומה עדיין חסר בלי לפנות ללקוחה

## חסימת דיוור מלאה ל־pazitvardi@walla.co.il (30.8.2026)

- [x] לאתר את הכתובת המנורמלת בכל רשומות הלקוחות, הלידים, המיילים והתורים
- [x] לסמן הסרה וחסימת מייל במסד בלי להסיר את הפרופיל הפעיל אם קיים
- [x] לבטל כל מייל שיווקי או תפעולי במצב pending או processing
- [x] להוסיף את הכתובת לחסימה הקבועה של כל מיילי האתר
- [x] להפעיל חסימת קמפיינים וטרנזקציות אצל ספק הדיוור בלי לשלוח הודעת אישור
- [x] לאמת שאין דיוור עתידי או תורים פעילים לכתובת
- [x] להריץ בדיקות, לפרסם checkpoint ולסנכרן את הקוד ל־GitHub

## שחרור ההתאמה של גל כרמי עם שי (31.8.2026)

- [ ] לאתר את גל כרמי לפי המייל ואת רשומת ההתאמה המדויקת עם שי
- [ ] לבדוק את סטטוס ההתאמה, אישורים, בקשות Boost וחסימות פעילות לפני השחרור
- [ ] לשחרר את ההתאמה בלי למחוק היסטוריה ובלי לשלוח הודעה
- [ ] להחזיר את גל ואת שי למצב פעיל וזמין לקבלת התאמות חדשות
- [ ] לאמת שאין התאמה או בקשה פתוחה שממשיכה לחסום אחד מהם

## תוכנית צמיחה וקמפיינים לספטמבר 2026 (31.8.2026)

- [x] לקרוא את מסמך מנהל הקמפיינים ולרכז את כל ההחלטות, היעדים והפערים שכבר זוהו
- [x] למפות את כל מוצרי האתר, המחירים, ההנחות, עמודי התשלום והכנסות ההמשך
- [x] לשלוף מהדשבורד ומ־Meta את המכירות, ההכנסות, ההוצאות, CPA, ROAS וקצב המכירות בחודשיים האחרונים
- [x] להפריד בין מכירות אורגניות, ממומנות, רכישות חוזרות והכנסות ליווי שאינן במערכת
- [x] לבנות יעד בסיס, יעד מרכזי ויעד מתיחה לכל מוצר לפי כמות, הכנסה, CPA ותקציב
- [x] לבנות תקציב ספטמבר לפי קמפיין, מוצר, קהל, שלב במשפך ורזרבת ניסויים
- [x] לגבש באנדל חג רווחי ומובן בלי לפגוע בפלואו התשלום הרגיל של המאגר
- [x] לבחור מסר חג מרכזי מזמין שאינו מבטיח הגעה לזוגיות או לשולחן החג
- [x] להגדיר מחיר, ערך נתפס, קופון, תוקף, זכאות ושולי רווח לבאנדל
- [x] לבנות קמפיין נפרד למאגר, למוצרים הדיגיטליים, לפגישות וליווי, ל־Boost ול־Plus
- [x] להגדיר לקמפיין Boost קהל חברי מאגר בלבד, החרגות, יעד, תדירות ותקציב לפי נתוני ההשקה השבועית
- [x] להגדיר ל־Plus יעד הכנסות ופיילוט מאוזן של 20 נשים ו־20 גברים בלי להפעיל גבייה או לפנות ללקוחות
- [x] לבנות שמות קמפיין, ad set, מודעות ו־UTM ייעודיים לכל מוצר, קהל וערוץ
- [x] לוודא שמדידת ViewContent, Lead, InitiateCheckout, Purchase ו־Boost נרשמת נכון
- [x] לנסח מסרי חג, Boost, Plus והתנגדות לכמות ההתאמות בלי להבטיח כמות שאינה חלק מהמוצר
- [x] להסביר באופן עקבי שהמאגר מרחיב הזדמנויות וש־Boost מאפשר בחירה נוספת, בלי ליצור ציפייה להתאמות קבועות
- [x] לאתר רק סיפורי הצלחה, תוצאות ועדויות אמיתיים עם הסכמה מתועדת לפרסום
- [x] להכין צילומי מסך או כרטיסי עדות רק מחומרים מאומתים, ולהשתמש ב״המחשה״ כאשר אין אישור פרסום
- [x] ליצור מודעות חג בפורמטים 4:5, 1:1 ו־9:16 בנראות המותג ובשפה חזותית חגיגית
- [x] ליצור סט מודעות Boost נפרד לחברי המאגר לפי המסרים שאושרו
- [x] לבנות עמוד נחיתה ייעודי לבאנדל החג עם UTM ומדידת המרות
- [x] להכין נוסחי WhatsApp, ניוזלטר, SMS וסטוריז לאישור בלבד בלי לשלוח או לתזמן
- [x] להכין לוח השקה שבועי לספטמבר עם סדר ניסויים, נקודות החלטה וכללי עצירה
- [x] להריץ בדיקות כלכליות, Vitest, TypeScript, build, נראות דסקטופ ומובייל ובדיקת מדידה
- [x] לפרסם את עמוד החג, לסנכרן GitHub ולמסור חבילת מנהל קמפיינים מלאה
- [x] לא להפעיל Plus, מודעות, WhatsApp, SMS, ניוזלטר או חיוב ללא אישור מפורש נוסף

## אימות הצטרפות Boost ועדכון באנדל חג ל־399 ₪ (31.8.2026)

- [x] לאמת בקוד ובמסד שנרשם חדש למאגר אינו הופך אוטומטית לחבר Boost ללא הסכמה נפרדת
- [x] לאתר את כל מופעי 449 ₪ של `bundle_new_year` בתשלום, בעמוד, במדידה, ביעדים ובקריאייטיב
- [x] לעדכן את מחיר Grow, עמוד החג, GA4, Meta והאירועים ל־399 ₪
- [x] לחשב מחדש את הכנסות היעד, CPA ו־ROAS של באנדל החג וליישר את מסמכי מנהל הקמפיינים
- [x] לתקן רק את מודעת החג שמציגה 449 ₪ ולהשאיר נכסים ללא מחיר ללא שינוי
- [x] להוסיף ולעדכן בדיקות רגרסיה למחיר ולכלל ההסכמה הנפרדת של Boost
- [x] לבדוק את עמוד החג בדסקטופ ובמובייל, לפרסם ולסנכרן GitHub

## בחינת הצטרפות נרשמים חדשים ל־Boost (31.8.2026)

- [x] למפות את זרימת ההרשמה, התשלום, ההסכמות, האזור האישי ומסע 90 הימים הקיימים
- [x] להשוות בין הפעלה אוטומטית מכוח התקנון, אישור Boost נפרד בהרשמה והצטרפות מאוחרת בתזכורות
- [x] להציג חלופות לפי המרה, אמון, פרטיות, עלות ומורכבות תפעולית
- [x] לנסח מודל מומלץ, נוסח אישור בהרשמה, סעיף תקנון, תצוגת אזור אישי ומקטעי יום 7 ויום 30
- [ ] לקבל אישור מפורש למודל ההצטרפות המומלץ לפני שינוי ההסכמה או שליחת תזכורות
- [ ] לאחר אישור: להוסיף Opt-in נפרד בהרשמה ולהפעיל Boost אוטומטית אחרי תשלום רק למי שבחר
- [ ] לאחר אישור: להציג לכל חבר מאגר את אזור Boost עם מצב פעיל או כפתור הצטרפות בהתאם להסכמתו
- [ ] לאחר אישור: לשלב תזכורות מותנות ביום 7 וביום 30 במסע הקיים עם מניעת כפילויות והסרה מדיוור

## תסריטי רילס והעמקת קמפיין באנדל החג (31.8.2026)

- [x] לכתוב ריל קצר לבאנדל החג עם הוק חזק, מסר אישי והסבר שאינו מכירתי מדי
- [x] לכתוב ריל ארוך לבאנדל החג שמסביר את שלושת הכלים, הערך מהפגישות והחיסכון
- [x] לכתוב ריל נפרד ל־Boost שמבהיר שההתאמות הרגילות נמשכות ו־Boost הוא אפשרות נוספת לבחירה עצמאית
- [x] להציג את שלושת התסריטים לאישור לפני שינוי עמוד הבאנדל והקמפיינים
- [x] למפות את התוכן המעשי בכל אחד משלושת מוצרי הבאנדל ואת הקשר ל־DNA הזוגי
- [x] להסביר בעמוד שהכלים נולדו מתוך ההבנה שלא ניתן לפגוש את כולם, אך מבוססים על הערך והשאלות מהפגישות
- [x] להציג את החיסכון הכספי מול רכישה בנפרד ומול פגישות אישיות בלי לטעון שהמוצרים מחליפים פגישה מלאה
- [x] לעצב מחדש את עמוד הבאנדל בצבעי חום בהיר, שמנת, שחור ולבן עם פרחים לבנים עדינים במקום לבבות
- [x] לשלב בעמוד ובקמפיינים את תמונות הילית החדשות שצורפו בלי למתוח או להדביק את הדמות
- [x] ליצור מודעות חג 4:5, 1:1 ו־9:16 עם מסר ראשי ומידע מעניין בהיררכיה חזותית חזקה
- [x] לכתוב למנהל הקמפיינים טקסט ראשי, כותרת, תיאור וקריאות לפעולה לכל מודעה
- [x] לא להשתמש בנתוני הצלחה, שמות או צילומי מסך מומצאים ולא להבטיח מציאת זוגיות
- [x] לא לגעת בפלואו התשלום למאגר במסגרת משימת הבאנדל
- [x] לתעד להמשך ש־Boost יוצע באזור האישי רק לאחר השלמת כל השאלונים, עם אישור חינם ונפרד

## עידון עמוד ומודעות באנדל החג לפי המשוב החדש (31.8.2026)

- [x] לבחון אילו תמונות הילית בעמוד חוזרות על עצמן או אינן מוסיפות ערך ולהגדיר אילו יישארו
- [x] לצמצם את מספר תמונות הילית בעמוד בלי לפגוע בהיררכיה, בתוכן או בכפתורי התשלום
- [x] לשמור על מיתוג הילית כספי והטיפוגרפיה הקיימים, אך להפוך את רקעי המודעות לבהירים וחגיגיים יותר
- [x] לבנות פלטת קרם, חום חם וירוק מרווה עדין עם פרחים לבנים ואווירת חג מאופקת
- [x] להוציא מתוך העמוד נקודות תוכן קצרות למודעות: יצרתי עבורכם, מבוסס על אלפי פגישות, אפשר לעבוד בלעדיי ומחיר אחיד וחד־פעמי
- [x] לנסח את הטענה על הפגישות באופן מדויק ולא מוגזם, בהתאם לנוסח המאומת של העסק
- [x] ליצור מחדש מודעות 4:5, 1:1 ו־9:16 עם תוכן עשיר יותר והיררכיה קריאה
- [x] לשמור את מחיר 399 ₪ מול 697 ₪ רק בנכסים המתאימים וללא הבטחת תוצאה
- [x] לבדוק את העמוד והמודעות בדסקטופ ובמובייל, כולל עברית, תמונות, מחיר ואזורים בטוחים
- [x] להריץ Vitest, TypeScript, build ו־git diff --check לפני פרסום
- [x] לפרסם checkpoint ולסנכרן את אותו קוד ל־GitHub
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## עיצוב מודעות באנדל חג עוצמתי בסגנון ט״ו באב (31.8.2026)

- [x] לתרגם את רפרנסי עמוד החג לשפה חזותית חזקה למודעות: ריבועים, מסגרות, גדלים והיררכיה דרמטית
- [x] לשמור על צבעוניות עמוד החג: אספרסו ושחור, קרם, חום חם, פרחים לבנים ונגיעה חגיגית
- [x] לשמור את טקסטי V3 שאושרו ולהציג אותם בעוצמה בלי להעמיס
- [x] להפיק מודעת דגל 4:5 אחת ולבדוק אותה לפני הרחבת הסדרה
- [x] להפיק מודעת שיטה 4:5, מודעת DNA מרובעת וסטורי 9:16 באותה מערכת חזותית
- [x] להשתמש רק בתמונות הילית שסופקו ולשמור על זהות, חדות ופרופורציות טבעיות
- [x] לבדוק עברית, מחיר 399 ₪ מול 697 ₪, היררכיה ואזורי בטיחות
- [x] לתעד את נכסי V4 ולסנכרן את מעקב הפרויקט ל־GitHub
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## שחזור נוסחת מודעות ט״ו באב לקמפיין חג לקהל קר (31.8.2026)

- [x] לנתח את 15 מודעות ט״ו באב המצורפות ולזהות את מבנה הכותרת, הכתב, המספרים, הריבועים והתמונה
- [x] להגדיר היררכיית מסרים לקהל קר שמציגה תחילה את הילית כספי ואת סמכות המותג
- [x] לשלב את הניסוח ״הילית כספי, מומחית לזוגיות ומייסדת מאגר הרווקים החכם המוביל בישראל״ בלי מספרי חברים
- [x] לשמור על הטקסטים שאושרו: נולד מתוך אלפי פגישות, שלושה כלים, אפשר לעבוד גם בלעדיי, 399 ₪ חד־פעמי
- [x] להחליף את צבעוניות ט״ו באב בקרם, חום בהיר, חום שוקולד ופרחים חגיגיים קטנים בלבד
- [x] להשתמש בכתב כותרת צר ודומיננטי בסגנון מודעות ט״ו באב וב־Rubik לטקסטים המשניים
- [x] להפיק מודעת דגל 4:5 אחת ולבחון אותה לפני הרחבת הסדרה
- [x] להפיק סדרת Feed ו־Story משלימה באותה נוסחה חזותית
- [x] להשתמש רק בתמונות הילית שסופקו ולשמור על זהות, חדות ופרופורציות טבעיות
- [x] לבדוק עברית, מחיר 399 ₪ מול 697 ₪, קריאות לקהל קר ואזורי בטיחות
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## עידון V6: כתב מאוזן, תמונות מגוונות ובהילות אמיתית (31.8.2026)

- [x] לבחור תמונה שונה של הילית לכל מודעה ולא לחזור על אותו פורטרט
- [x] להפחית את משקל הכותרת מ־Extra Bold לכתב בינוני־חזק עם יותר אוויר
- [x] לשמור על משחק בין כתב גאומטרי, מספרים סריפיים וכרטיסים כמו בט״ו באב
- [x] לנסח תחושת החמצה עונתית סביב החגים בלי דדליין או ספירה לאחור מומצאים
- [x] להפיק מודעת דגל חדשה עם תמונה אחרת, כתב מעודן והוק של החמצה
- [x] להפיק מודעת שיטה, מודעת DNA וסטורי עם תמונות שונות ומסרי החמצה מגוונים
- [x] לבדוק שכל ארבע התמונות שונות, שהעברית והמחיר מדויקים ושהבהילות אמינה
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## V6 חג: החלפת התמונות הסגולות בסט שחור־לבן־בז׳ (31.8.2026)

- [x] להקצות תמונת נראות חג שונה למודעת הדגל, השיטה, ה־DNA והסטורי
- [x] לשמור את מודעת הדגל עם תמונת הגוף המלאה השחורה־בז׳ שכבר תואמת לחג
- [x] להחליף את תמונת השיטה בתמונת הישיבה על הספה מהסט החדש
- [x] להחליף את תמונת ה־DNA בתקריב הספה מהסט החדש
- [x] להחליף את תמונת הסטורי בתמונת הישיבה המלאה מהסט החדש
- [x] לשמור במדויק על הטקסטים, הכתב, המחיר והבהילות שכבר אושרו ב־V6
- [x] לבדוק שכל ארבע התמונות שונות, שהבגדים שחור־לבן־בז׳ ושאין סגול באף נכס
- [x] לשמור checkpoint ולסנכרן GitHub לאחר השלמת הסדרה
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## V7 דרמטי: כאב, פתרון, פירוט מוצרים ומחיר מלא (31.8.2026)

- [x] לנתח את הרפרנסים החדשים ולזקק קומפוזיציה דרמטית שבה הילית חופשית ללא מסגרת
- [x] להשתמש בהצללות, עומק וגרדיאנט סביב דמות הילית בלי להקטין אותה בתוך כרטיס
- [x] לפתוח בהוק ״נמאס לכם להגיע לעוד חג רווקים?״ ככאב מרכזי לקהל קר
- [x] להציג פתרון ברור בלי להבטיח שמי שרוכש יגיע בזוגיות
- [x] להסביר במודעה את שלושת המוצרים ולא להסתפק בשמותיהם
- [x] להציג מחיר מאגר 299 ₪, מדריך ״לבחור נכון״ 149 ₪ וקורס ״המסע לזוגיות״ 249 ₪
- [x] להציג סך 697 ₪ בנפרד מול 399 ₪ בחבילת החג בתשלום חד־פעמי
- [x] להפיק מודעת דגל 4:5 אחת עם תמונת חג של הילית כחלק חופשי מהקומפוזיציה
- [x] לבדוק את מודעת הדגל מול עברית, מחירים, כאב, פתרון, נראות וזהות לפני הרחבת הסדרה
- [x] להפיק מודעות המשך וסטורי רק לאחר שמודעת הדגל עוברת את הבדיקה
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## תיקוני V7: מחירים מלאים, כתיב ומיקום הספרה 3 (31.8.2026)

- [x] לאמת בקוד את המחיר המלא לפני מבצע של המאגר, המדריך והקורס
- [x] לחשב את השווי המלא האמיתי של שלושת המוצרים ולא להשתמש במחירי המבצע הנפרדים
- [x] למפות ולתקן את כל שגיאות הכתיב בארבעת נכסי V7
- [x] לאזן את הספרה 3 כך שלא תעלה או תתנגש בטקסט
- [x] לשמור על הילית כדמות חופשית ללא מסגרת ועל הכיוון הדרמטי שאושר
- [x] לתקן את מודעת הדגל לפני תיקון יתר הסדרה
- [x] לתקן את מודעת השיטה, מודעת המוצרים והסטורי עם המחירים המלאים
- [x] לבדוק עברית, מחירים, היררכיה ואזורי בטיחות בכל ארבעת הנכסים
- [x] לשמור checkpoint ולסנכרן GitHub לאחר השלמת התיקונים
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## חקירת הנחת 10% ברכישות היום (31.8.2026)

- [x] למפות את מנגנון הקופונים ואת שדות הקופון שנשמרים בעסקאות Grow
- [x] לבדוק באופן מצרפי כמה עסקאות בוצעו היום וכמה קיבלו הנחה של 10%
- [x] לוודא שקוד הקופון אינו נשמר ישירות בעסקה ולזהות את הקוד בהצלבת סכום ומסע, בלי לחשוף פרטי לקוחות
- [x] לבדוק אם HILIT10 פעיל ולאילו מוצרים הוא חל
- [x] לאתר היכן HILIT10 או קוד אחר מוצגים באתר, בעמודי תודה, במיילים או בפאנל
- [x] לבדוק אם קוד קופון מוזן אוטומטית דרך URL, localStorage, קמפיין או GrowWallet
- [x] להצליב את העסקאות עם מקור העמוד וה־UTM אם הנתונים נשמרו
- [x] לדווח מה קרה, היכן הופיע הקוד ומה היקף ההשפעה
- [x] לא לשנות, לבטל או להשבית קופון או עסקה ללא אישור מפורש

## עדכון V7 וטיזרים לקהל חם (31.8.2026)

- [x] למקם מחדש את הספרה 3 כך שלא תעלה, תתנגש או תחליש את ההיררכיה
- [x] לחדד בקטן שהחבילה מיועדת לרווקים ורווקות שרוצים להתקדם למציאת זוגיות
- [x] לשמור על המסרים, המחירים המלאים והכיוון הדרמטי שכבר אושרו
- [x] להחליף את תמונת הילית על הכרית או הרצפה בתמונת ספה חדשה מהסט שסופק
- [x] להשתמש רק בתמונות החג החדשות ולשמור על זהות, חדות ופרופורציות טבעיות
- [x] לנסח שתי מודעות טיזר קצרות לקהל חם עם מעט מלל ובלי פירוט מלא של ההצעה
- [x] להפיק שתי מודעות טיזר בצבעוניות ובטיפוגרפיה של קמפיין החג
- [x] לבדוק עברית, היררכיה, מחיר, תמונות ואזורים בטוחים בכל הנכסים
- [x] לשמור checkpoint ולסנכרן GitHub לאחר השלמת העדכון
- [x] לא להפעיל קמפיין, לשלוח הודעה או לבצע חיוב ללא אישור מפורש

## תיקון מסירת מיילים לבאנדל החג (1.9.2026)

- [x] למפות את כל טריגרי Grow והאוטומציות ששלחו שלושה מיילים לאחר רכישת באנדל החג
- [x] לוודא שהבאנדל מעניק גישה למאגר, לקורס ״המסע לזוגיות״ ולמדריך ״לבחור נכון״
- [x] להגדיר פלואו עתידי של שני מיילים בלבד: כניסה למאגר ומייל חבילה משולב לקורס ולמדריך
- [x] למנוע מייל קורס כפול לבאנדל בלי לשנות מסירה של רכישת קורס עצמאי
- [x] לעצב מייל ״חבילת החג שלך מוכנה״ עם שני כפתורים נפרדים וברורים
- [x] לשמור על idempotency כדי שעיבוד webhook חוזר לא ישלח מייל נוסף
- [x] להוסיף בדיקות רגרסיה למסירת שלושת המוצרים בשני מיילים בלבד
- [x] להריץ pnpm test, pnpm check, pnpm build ו־git diff --check
- [x] לוודא שלא נשלח מייל בדיקה או מייל חוזר ללקוחה במהלך הפיתוח
- [x] לשמור checkpoint ולסנכרן GitHub לאחר השלמת התיקון

## בדיקת הצטרפות סיגל אביטן ל־Boost (1.9.2026)

- [x] למפות את תנאי ההצטרפות והודעות השגיאה הפעילות ב־Boost
- [x] לבדוק את פרופיל סיגל במסד הפעיל לפי הכתובת המורשית
- [x] לבדוק הסכמת מאגר רגילה, חברות Boost, גרסת הסכמה וסטטוס יציאה
- [x] לבדוק אירועי הסכמה, מיילים ולוגי שגיאה רלוונטיים
- [x] לזהות את הסיבה המדויקת לכשל ואת הפעולה הבטוחה הנדרשת
- [x] לא לשנות סטטוס, להפעיל הסכמה או לשלוח מייל או קישור ללא אישור מפורש

## תיקון נרמול מייל Boost ושליחת קישור לסיגל (1.9.2026)

- [x] לתקן את submitInterest כך שיאתר חברי מאגר לפי מייל מנורמל בלי תלות באותיות גדולות או ברווחים
- [x] לתקן את אימות הקישור האישי כך שאותו מייל מנורמל יעבוד גם ב־joinPool ובאזור האישי
- [x] להוסיף בדיקות רגרסיה למייל עם אות גדולה ולרווחים מסביב
- [x] לנרמל את כתובת סיגל במסד הפעיל לאחר בדיקת כפילויות
- [x] להריץ pnpm test, pnpm check, pnpm build ו־git diff --check
- [x] לפרסם checkpoint ולסנכרן את התיקון ל־GitHub
- [x] לשלוח לסיגל קישור אישי אחד ל־Boost לאחר הפרסום בלבד
- [x] לאמת שהמייל התקבל אצל ספק המשלוח ולא לטעון שנפתח או נקרא

## כשל במסירת מייל הקורס והמדריך בבאנדל החג (1.9.2026)

- [x] לאתר את רכישת באנדל החג האחרונה ולוודא כיצד המוצר זוהה ב־webhook
- [x] לבדוק אם נוצרו טוקני קורס ומדריך בעסקה האחרונה
- [x] לבדוק את לוגי הייצור ואת אירועי Brevo של מייל החבילה המשולב
- [x] לזהות את שורש הכשל שגרם לשליחת מייל המאגר בלבד
- [x] לתקן את הפלואו בלי לשנות רכישות קורס עצמאיות או לשלוח כפילויות
- [x] להוסיף בדיקות רגרסיה לתרחיש רכישה חוזרת או טוקן קיים בבאנדל
- [x] להריץ pnpm test, pnpm check, pnpm build ו־git diff --check
- [x] לפרסם checkpoint ולסנכרן GitHub לפני השלמת המייל החסר
- [x] לשלוח להילית רק את מייל הקורס והמדריך החסר לאחר התיקון
- [x] לאמת מסירה אצל Brevo בלי לטעון שהמייל נפתח או נקרא

## מיפוי ותכנון משפך המלצות ועדויות ב־CRM (1.9.2026)

- [x] למפות את הטבלאות, הראוטרים והמסכים הקיימים לאיסוף וניהול המלצות
- [x] לבדוק אילו סטטוסים, הרשאות וגרסאות הסכמה כבר נשמרים ב־CRM
- [x] לבדוק אילו טריגרים קיימים לפנייה בעקבות התאמה, רכישה, שימוש או הצלחה
- [x] להפריד בין עדות הצלחה זוגית, חוויית שימוש, שירות, מוצר ותוצאת ביניים
- [x] להגדיר למי נכון לפנות, מתי, באיזה ערוץ ובאילו תנאים
- [x] לנסח סט שאלות קצר לכל סוג עדות בלי להוביל או להמציא תשובה
- [x] להגדיר הסכמה נפרדת לשימוש באתר, בסושיאל, בקמפיין, בשם, בתמונה ובאנונימיות
- [x] להגדיר תהליך אימות, אישור צוות, עריכה, תוקף וביטול הסכמה
- [x] להציע מבנה CRM ומדדים לפול המלצות אמיתי ומדיד
- [x] להציג תוכנית יישום מדורגת לפני שינוי קוד או פנייה ללקוחות
- [x] לא לשלוח בקשת המלצה או לפרסם עדות ללא אישור מפורש

## בניית מערכת מלאה למשובים, המלצות ומדיה (1.9.2026)

- [x] לרענן את הנחיות הפיתוח, האחסון והאוטומציות לפני היישום
- [x] למפות רכיבי CRM, טפסים, ראוטרים וטבלאות קיימים לשימוש חוזר
- [x] להגדיר מודל נתונים נפרד למשוב, עדות, מועמד לפנייה, מדיה, הסכמה והיסטוריית שימוש
- [x] להגדיר סוגי עדות: הצלחה זוגית, התקדמות, מאגר, DNA, מדריך, קורס, Boost ושירות
- [x] להגדיר סטטוסים מלאים מטיוטה ועד פרסום, ביטול או פקיעת הסכמה
- [x] להגדיר הצהרת שימוש גרסתית שמפרידה טקסט, תמונה ווידאו וערוצי פרסום
- [x] ליצור ולהחיל מיגרציית מסד נתונים בטוחה ללא נתוני דמה או עדויות מומצאות
- [x] לבנות API צוותי ליצירה, עריכה, אישור, אימות, ביטול והיסטוריית שימוש
- [x] לבנות API ציבורי מאובטח באמצעות טוקן אישי לצפייה ושליחת משוב
- [x] לבנות העלאת תמונה ל־S3 עם בדיקת סוג, גודל ובעלות
- [x] לבנות העלאת סרטון ל־S3 עם בדיקת סוג, גודל ובעלות
- [x] להבהיר שהעלאת תמונה או סרטון אינה אישור לפרסום ללא הצהרת שימוש מפורשת
- [x] לבנות טופסי משוב מותאמים להצלחה, מוצר, מאגר, DNA, Boost ושירות
- [x] לבנות בחירת זהות: אנונימי, שם פרטי, שם מלא, שם ותמונה
- [x] לבנות בחירת ערוצי שימוש: אתר, סושיאל אורגני, מיילים, מודעות בתשלום ויחסי ציבור
- [x] לבנות אישור נפרד לטקסט, תמונה, וידאו ועריכה מהותית
- [x] לבנות טאב CRM „משובים והמלצות” עם משפך, סינון, חיפוש ומדדים
- [x] לבנות תצוגת מדיה מאובטחת, הורדה לצוות והצגת היקף ההרשאה
- [x] לבנות פעולות אימות, אישור טקסט סופי, סימון פרסום וביטול הסכמה
- [x] לחבר מועמדים קיימים מתוצאות התאמה ולהשאיר את כל הפניות במצב טיוטה
- [x] להוסיף טיוטות פנייה לפי סוג העדות בלי לשלוח אותן
- [x] להוסיף מדידה לאירועי פתיחת טופס, שליחה, הסכמה, אישור, פרסום וביטול
- [x] להוסיף בדיקות Vitest לפרטיות, הרשאות, מדיה, הסכמה, סטטוסים וזרימות CRM
- [x] לבדוק דסקטופ ומובייל של הטופס הציבורי ושל טאב ה־CRM
- [x] לוודא שלא נשלחה בקשת המלצה ולא פורסמה עדות במהלך היישום
- [x] לשמור checkpoint ולסנכרן GitHub לאחר שכל הבדיקות עברו
- [x] לתקן ולאמת את מצב התצוגה המקדימה המקומי ללא נתוני לקוחות
- [x] לצלם את הטופס ואת טאב ה־CRM בדסקטופ ובמובייל
- [x] להריץ מחדש את כל הבדיקות, TypeScript, build ו־git diff --check לאחר תיקוני התצוגה
- [x] לפרסם ולסנכרן את מערכת ההמלצות לפני פתיחת משימת הדוח היומי

## דוח ביצועים יומי אוטומטי — 01.09.2026

- [x] לרענן את הנחיות האוטומציה, התזמון, המדדים והבטיחות לפני תכנון המערכת
- [x] למפות את כל מקורות הנתונים הקיימים לרכישות, הכנסות, לידים, עוקבים והוצאות קמפיינים
- [x] למפות את חיבור Vibrate הקיים בלי לחשוף מפתחות או כתובות פרטיות
- [x] למפות יעדים יומיים וחודשיים קיימים לפי מוצר ולזהות נתונים שדורשים אישור
- [x] להציג להילית לפחות שתי חלופות אמיתיות להפעלה, לרבות חלופה קלה יותר
- [ ] לקבל החלטות ארכיטקטורה חיוניות: שעה, נמען, זמינות נתוני Meta ויעדים
- [x] להגדיר מילון מדדים מאומת: הכנסה ששולמה, רכישות מאגר, Boost, באנדל, לידים, הוצאה, CPA ו־ROAS
- [x] להגדיר טיפול ברור במקור חסר, נתון לא טרי וייחוס חלקי בלי להמציא מספרים
- [x] ליצור מודל נתונים לתצורה, יעדים, ריצות, מקורות, הודעות ושגיאות עם task UID עמיד
- [x] ליצור מיגרציה בטוחה ולהחיל אותה ללא נתוני דמה וללא הפעלת שליחה
- [x] לבנות חישוב יומי וחודשי לפי שעון ישראל וגבולות תאריך נכונים
- [x] לבנות מחולל הודעת SMS קצרה בעברית, שורה לכל מדד או אזהרה
- [x] לבנות שכבת Vibrate עם מצב dry-run שלא שולח בפועל
- [x] לבנות handler מתוזמן מאומת, idempotent וממופה לפי task UID
- [x] לבנות מסך ניהול מוגן עם נתונים, טריות מקורות, יעדים, אזהרות, תצוגה מקדימה והיסטוריית ריצות
- [x] להוסיף בדיקות Vitest לחישובים, תאריכים, מקור חסר, retry, מצב כבוי, dry-run ואורך ההודעה
- [x] לבדוק דסקטופ ומובייל של מסך הניהול ללא חשיפת PII
- [x] להריץ pnpm test, pnpm check, pnpm build ו־git diff --check
- [x] לפרסם את המערכת במצב כבוי ולסנכרן GitHub
- [ ] להציג להילית הודעת דוגמה ולקבל אישור מפורש לנמען, שעה, נוסח והפעלה
- [ ] ליצור ולהפעיל תזמון יומי רק לאחר אישור מפורש

## אישור מסלול המלצות, מעקב התאמות והרחבת דוח חצות — 01.09.2026

- [x] למפות ולהסביר במדויק מתי מועמד להמלצה נוצר, היכן הוא מופיע ומי יכול לפנות
- [x] להציג לאישור את נוסח בקשת ההמלצה, ערוץ הקבלה, הקישור האישי וכל שלבי המילוי
- [x] להציג לאישור את הטופס הציבורי בדסקטופ ובמובייל ללא נתוני לקוחות וללא שליחה
- [x] לבדוק מדוע טאבי ההתאמות מאבדים זוגות לאחר תשובה ולהגדיר מקור אמת היסטורי
- [x] להשאיר זוג שקיבל הצעה במעקב גם לאחר לא, כן הדדי, הצלחה או שחרור
- [x] להציג סטטוסים ברורים: ממתינים, צד אחד אישר, שני הצדדים אישרו, עדיין בהתאמה, ביקשו לשחרר ושוחררו
- [x] להציג כמה ימים הזוג נמצא בהתאמה וכמה ימים חלפו עד בקשת שחרור
- [x] להוסיף מדד זוגות ייחודיים שאמרו כן, כאשר שני אנשים נספרים כהתאמה אחת
- [x] להוסיף לדוח החצות מספר התאמות שנשלחו ביום ומספר התאמות שבהן שני הצדדים אמרו כן
- [x] להוסיף לדוח החצות מספר פעילים שלא קיבלו התאמה מעל 14 יום
- [x] להוסיף לדוח החצות מספר חברי מאגר עם פרטים חסרים לפי הגדרה מחמירה ושקופה במסך הדוח
- [x] להסיר את דוח ה־WhatsApp הישן ואת התזמון שלו כדי למנוע כפילות
- [x] להגדיר את הדוח החדש ל־00:00 לפי שעון ישראל ולסכם את היום שהסתיים
- [x] להגן על תזמון 00:00 מפני מעבר שעון קיץ וחורף באמצעות בדיקת חצות מקומית ב־Asia/Jerusalem
- [x] להוסיף בדיקות שמוודאות שליחה פעם אחת בחצות ישראל ודילוג בקריאת ה־UTC הנוספת
- [x] להשאיר את שליחת Vibrate כבויה עד להצגת נוסח ומסכים וקבלת אישור מפורש
- [x] להוסיף בדיקות רגרסיה לטאבים, לספירת זוגות, ל־14 ימים, לחוסרים ולגבול חצות ישראל
- [x] להשלים בדיקות מלאות, תצוגות, checkpoint, פרסום וסנכרון GitHub

## משוב חיובי ומתנת תודה לאחר מילוי — 01.09.2026

- [x] למפות את שאלות המשוב הקיימות ולזהות ניסוחים שמחפשים ביקורת או שיפור
- [x] למפות את המדריכים והמוצרים הדיגיטליים שניתן להעניק כמתנת תודה ואת מנגנון הגישה הקיים
- [x] לבחור מתנה בעלת ערך שאינה פוגעת במכירת המוצרים המרכזיים
- [x] להגדיר שהמתנה ניתנת על עצם השלמת המשוב ואינה תלויה בתוכן חיובי או באישור פרסום
- [x] להוסיף גילוי ברור אם משוב שנאסף עם מתנה מאושר בהמשך לשימוש שיווקי
- [x] לנסח פנייה קצרה וחמה שמזמינה לספר איך הייתה ההתאמה ומה הרגישו בתהליך
- [x] להסיר מהטופס שאלות שמחפשות מה לשפר ולהחליף אותן בשאלות פתוחות על החוויה החיובית
- [x] לשמור על הסכמה נפרדת לטקסט, תמונה, וידאו, זהות וערוצי שימוש
- [x] לבנות הענקת מתנה מאובטחת וחד־פעמית לאחר שליחת משוב מלאה
- [x] לתעד ב־CRM איזו מתנה הוצעה ואיזו מתנה נמסרה בלי לחשוף פרטים לציבור
- [x] להוסיף בדיקות רגרסיה למתנה חד־פעמית, אי־תלות בתוכן ואי־תלות בהסכמת פרסום
- [x] להציג להילית את המתנה, נוסח הפנייה, הטופס ומסך הסיום לאישור לפני פרסום או שליחה
- [x] לא לשלוח בקשת משוב ולא להעניק מתנה בפועל לפני קבלת האישור המפורש שניתן
- [x] למפות את הרגע המדויק שבו שני הצדדים מאשרים ואת מועד חשיפת הפרטים האישיים
- [x] לבטל את הצעת שלושת הימים ולעבור לבקשה מיידית באישור הדדי ולמעקב שבועי לפי ההחלטה החדשה
- [x] ליצור קישור אישי נפרד לכל אדם כך שכל תשובה תיכנס אוטומטית לרשומת CRM משלה
- [x] למנוע שליחה כפולה במקרה של retry, שינוי סטטוס או שחרור מאוחר יותר
- [x] לסנן מהאוטומציה ומהגל ההיסטורי חסומי דיוור, כתובות לא תקינות ומי שכבר מילאו משוב
- [x] לאמת באופן מצרפי את מספר הזוגות והאנשים ההיסטוריים הזכאים במקום להסתמך על 187 ללא בדיקה
- [x] להכין את הגל ההיסטורי כטיוטה בלבד ולהציג מספר נמענים סופי לפני שליחה
- [x] לא להפעיל את האוטומציה החיה ולא לשלוח את הגל ההיסטורי לפני אישור הנוסחים, המסכים והכמות
- [x] להשלים ולאמת את טבלאות מערכת ההמלצות במסד הייצור התפעולי לפני יצירת טיוטות או קישורים

## מערכת משובים רב־שלבית וסקר שביעות רצון — 02.09.2026

- [x] למפות טריגרים קיימים מיד לאחר אישור הדדי, שבוע לאחר התאמה פעילה, השלמת DNA, מילוי המאגר, קורס, מדריך ופגישה אישית
- [x] להפריד ב־CRM בין בקשת חוויה חיובית שנועדה למאגר המלצות לבין סקר שביעות רצון ניטרלי שנועד לשיפור
- [x] להגדיר בקשת חוויה מיד לאחר אישור הדדי ובקשה נוספת לאחר שבוע רק למי שעדיין בהתאמה
- [x] למנוע מאותו אדם לקבל בקשות קרובות מדי ממספר מוצרים או נקודות מגע
- [x] להוסיף תקופת צינון, מניעת כפילויות, סינון חסומי דיוור והיסטוריית מסירה מלאה
- [x] לנסח כותרת בסגנון „אשמח לשמוע על החוויה שלך, ובסיום מחכה לך מתנה אישית ממני”
- [x] להכין שאלות חיוביות מותאמות להתאמה, DNA, מאגר, מדריך, קורס ופגישה אישית
- [x] להכין סקר שביעות רצון נפרד עם שאלות ניטרליות, דירוגים ושדה לשיפור
- [x] לבנות מדגם מייצג לפי שלב, ותק ופעילות בלי להציגו כהמלצה שיווקית
- [x] לבדוק חלופות מתנה: מפת הדייט הבא, מתנה דיגיטלית, Boost חינם או Boost סמלי בלי לפגוע בפלואו התשלום
- [x] לשלב הזמנות משוב במסעות מייל קיימים רק במקומות שאינם מעמיסים או פוגעים בהמרה
- [x] לבדוק שילוב עדין בעמודי תוצאה, אזור אישי ועמודי תודה, ולא בעמוד תשלום פעיל
- [x] להזין כל משוב, הסכמה, מדיה, מתנה ומקור פנייה אוטומטית ל־CRM
- [x] להכין גלים היסטוריים וסקר מייצג כטיוטות בלבד ללא שליחה
- [x] להציג להילית את כל הנוסחים, נקודות השליחה, המתנות, המדגמים והמסכים לפני הפעלה
- [x] לא להפעיל אוטומציה, לשלוח גל או להעניק Boost בפועל ללא אישור מפורש
- [x] להשלים בדיקות רגרסיה, TypeScript, build ובקרת דסקטופ ומובייל למערכת הרב־שלבית
- [x] לאמת מצרפית שכל 304 הרשומות החדשות הן טיוטות ושלא נשלח מייל או נמסרה מתנה

## הרחבת והפעלת איסוף החוויות — 02.09.2026

- [x] למפות עמודי תודה ומיילי המשך של DNA, מאגר, מדריך, קורס, פגישה, Boost ובאנדל החג
- [x] לנסח מסר גנרי שמסביר שהשיתוף יכול לעזור לעוד אנשים שמחפשים אהבה להכיר את הדרך והמוצרים
- [x] להבהיר שהשיתוף עוזר לאחרים אך המתנה אינה תלויה בתוכן חיובי או באישור פרסום
- [x] לעצב את טופס החוויה ואת מסך המתנה בוורוד פסטלי עדין תוך שמירה על נגישות וניגודיות
- [x] להוסיף נקודת משוב לבאנדל החג ולעמודי תודה מתאימים בלי להפריע לתשלום או למסירה
- [x] להוסיף נקודת משוב ל־Boost ולפגישה אישית במקום שבו קיים אירוע סיום אמין
- [x] לוודא שכל נקודות המגע משתמשות באותו טופס גנרי עם שאלות מותאמות למקור
- [x] להשלים בדיקות מלאות וצילומי דסקטופ ומובייל לאחר ההרחבה
- [x] לפרסם את מערכת ההמלצות במצב כבוי ולסנכרן ל־GitHub
- [x] להפעיל את האוטומציה לפניות חוויה חדשות לאחר הפרסום
- [x] לשלוח את גל 244 בקשות החוויה ההיסטוריות שאושר, ללא 60 סקרי שביעות הרצון
- [x] להכין פילוח סקר לפי מגדר, אזור, גיל, ותק ושלב בתהליך ולהציג את השאלות לפני שליחה
- [x] להשאיר את 60 טיוטות הסקר ללא שליחה עד אישור נפרד
- [x] להשהות את התזמון לאחר האצווה הראשונה, להוסיף קישור הסרה אישי לכל מייל משוב ולבדוק אותו לפני המשך הגל

## טופס המלצה ממוקד ואישור שימוש מהיר — 02.09.2026

- [x] למפות את השאלות וההרשאות בטופס הפעיל לפני שינויו
- [x] להחליף את השאלה הכללית בשאלות נפרדות על השיטה, התהליך, השירות, הערך וההתאמה
- [x] להוסיף מקום כתיבה ברור מתחת לכל שאלה ולא להסתפק בבחירת תשובות
- [x] לנסח שאלה שמזמינה המלצה שימושית למי שמחפשים אהבה בלי לייצר או להכתיב עדות
- [x] לבנות כפתור אישור מרכזי אחד לשימוש בטקסט עם שם פרטי באתר, בסושיאל ובמייל
- [x] להציג ליד הכפתור ניסוח קצר וברור של השימושים המאושרים ושל מתנת התודה
- [x] להשאיר תמונה, וידאו, שם מלא, עריכה מהותית ומודעות ממומנות כאישורים אופציונליים ונפרדים
- [x] לעדכן את חוזה השרת וה־CRM כך שברירת המחדל המהירה תישמר במדויק
- [x] להוסיף בדיקות רגרסיה לאישור מהיר, ביטול אישור והרשאות מדיה נפרדות
- [x] לבדוק את הטופס בדסקטופ ובמובייל לאחר הפישוט
- [x] לפרסם את הטופס המעודכן ולסנכרן GitHub

## התאמת מודעות החג לפיד ולסטורי — 02.09.2026

- [x] למפות את שש המודעות המצורפות ואת הפורמט הקיים של כל אחת
- [x] להגדיר לכל מודעה קומפוזיציית פיד 1:1 וסטורי 9:16 עם היררכיה מותאמת
- [x] לשמור את נוסחי העברית, מחירי 499, 249 ו־497 ₪, השווי 1,245 ₪ ומחיר החג 399 ₪
- [x] לשמור על תמונת הילית, הזהות, הפרחים והצבעוניות של כל מודעה בלי מתיחה או עיוות
- [x] ליצור שש גרסאות פיד 1:1 ברזולוציה 1080×1080
- [x] ליצור שש גרסאות סטורי 9:16 ברזולוציה 1080×1920
- [x] לבדוק עברית, מספרים, ניגודיות, חדות ואזורי בטיחות בכל 12 הקבצים
- [x] לארגן שמות קבצים עקביים ולהכין חבילת ZIP מסודרת למסירה

## אימות כפתורי משוב ושליחת סקר שביעות רצון — 02.09.2026

- [x] למפות בקוד ובגרסה החיה את כפתורי המשוב במייל אישור הדדי ובמייל המעקב השבועי
- [x] לאמת כפתור משוב בסיום שאלון DNA ובסיום שאלון המאגר
- [x] לאמת כפתור משוב בסיום המדריך ובסיום הקורס
- [x] לאמת את חיבור המשוב למעקב Boost ולבאנדל החג לאחר שימוש
- [x] לבדוק שכל נקודה יוצרת קישור אישי בלבד ואינה מציגה טופס אנונימי או משותף
- [x] לבדוק שהקישורים מכבדים חסימת דיוור, צינון ומניעת כפילויות
- [x] להפריד את מייל הסקר ממייל ההמלצה כך שלא יבטיח מתנה ולא יבקש הרשאת פרסום
- [x] להחליף בעמודי התודה של המדריך, הקורס ושני הבאנדלים את הודעת הציפייה בכפתור משוב אישי המבוסס על transactionId מאומת
- [x] להוסיף בדיקות שמונעות קישור משוב משותף, חשיפת מייל או יצירת טופס ללא רכישה מאומתת
- [x] לאמת מחדש את 60 טיוטות סקר שביעות הרצון לפי מגדר, גיל, אזור ושלב
- [x] לארכב 60 טיוטות סקר ישנות שנוצרו בכפילות ולהשאיר רק את מדגם v3 האחרון ללא שליחה
- [x] לאשר לשליחה רק את גל הסקר המאושר ולהשאיר טיוטות אחרות ללא שינוי
- [x] לשלוח את 60 סקרי שביעות הרצון באצווה מבוקרת עם קישור הסרה אישי
- [x] לאמת מצרפית מסירה, כשלים, כפילויות ואפס הרשאות פרסום אוטומטיות: 58 נמסרו, 1 נחסם ו־1 soft bounce
- [x] לדווח להילית היכן מופיע כל כפתור וכמה סקרים נמסרו בפועל

## מסר קהילה וניסוי שלושת דפי הכניסה — 02.09.2026

- [x] לנסח מסר עדין שמסביר ששיתוף חוויה אמיתית מסייע לעוד אנשים להכיר את הפלטפורמה
- [x] להסביר שצמיחת הקהילה יוצרת יותר הזדמנויות התאמה לכולם בלי להבטיח הצלחה או זוגיות
- [x] להטמיע את המסר בטופס החוויה ובמיילי בקשת ההמלצה בלי להתנות מתנה בפרסום
- [x] לבדוק את המסר בדסקטופ ובמובייל ואת ניגודיות העיצוב הפסטלי
- [x] למפות את מדידת ה־UTM והאירועים ב־dna-quiz, database ו־join
- [x] לשמר את כל פרמטרי ה־UTM במעבר מכפתורי דף המאגר אל join
- [x] לתעד אירוע database_cta רק בלחיצה אמיתית בדף המאגר
- [x] להפסיק להשתמש באירוע database_cta שנשלח בטעינת join כמדד לחיצה
- [x] לשמור את מנגנון התשלום, Grow, הסכומים ומסכי התודה ללא שינוי
- [x] להוסיף בדיקות Vitest לקישורי שלושת ה־CTA ולשימור UTM
- [x] לבדוק בדפדפן את שלושת קישורי הניסוי ואת רצף האירועים ללא רכישה או חיוב
- [x] לבנות תוכנית נפרדת לקהל קר המשווה DNA, database ו־join באותו קריאייטיב ותקציב
- [x] לבנות תוכנית לקהל חם המשווה database מול join בלבד ולא מחזירה לידים ל־DNA
- [x] להגדיר משך מינימלי, תקציב לכל תא, מדד ראשי, מדדים משניים וכללי עצירה
- [x] להגדיר הכרעה לפי רכישה מאומתת ו־CPA, ולא לפי לידים בלבד
- [x] להציג להילית דיפ, צילומי מסך ותוכנית ניסוי לפני checkpoint או פרסום
- [x] לקבל אישור מפורש לפרסום שינוי המדידה ומסר המשוב בלי להפעיל קמפיין

## ניסוי קטן ומודעת המשך DNA לבאנדל החג — 02.09.2026

- [x] להריץ מחדש את כל שערי השחרור לאחר אישור תיקוני המדידה ומסר המשוב
- [x] לפרסם את תיקוני המדידה ומסר המשוב המאושרים ולסנכרן GitHub
- [x] לצמצם את ניסוי דפי היעד לתקציב ומשך שמתאימים לפיילוט קטן
- [x] להגדיר בבירור אם יעד הניסוי הוא Purchase או Lead ולמה
- [x] להפריד בין קהל קר, קהל חם וריטרגטינג בלי לערבב אוכלוסיות
- [x] לשנות בכל תא רק את דף היעד ולשמור קריאייטיב, טקסט, קהל ותקציב זהים
- [x] להגדיר מגבלת תקציב, משך, מדד הצלחה וכלל עצירה לפיילוט הקטן
- [x] לנסח מודעת חג חדשה: ה־DNA היה נקודת הפתיחה ועכשיו עוברים לעבודה אמיתית ולמציאת אהבה
- [x] ליצור גרסת פיד 1:1 למודעת ההמשך אחרי DNA
- [x] ליצור גרסת סטורי 9:16 למודעת ההמשך אחרי DNA
- [x] לשמור על מחירי 499, 249 ו־497 ₪, שווי 1,245 ₪ ומחיר חג 399 ₪ אם המחירים מוצגים
- [x] לבדוק את העברית, הזהות, הקריאות ואזורי הבטיחות בשתי המודעות
- [x] להכין טקסט ראשי, כותרת, תיאור, CTA, קהל ומטרת קמפיין למודעת ה־DNA
- [x] למסור את תוכנית הניסוי והמודעות בלי להפעיל קמפיין

## תיקון הסרת דיוור, פרופילים לא פעילים וניסוי DNA ברור — 02.09.2026

- [x] לאבחן מדוע קישורי unsubscribe עם פרמטר email מגיעים למסך „לינק לא תקין”
- [x] למפות את כל קישורי ההסרה החדשים והישנים במיילי המסעות, ההמלצות והסקר
- [x] להוסיף תמיכה מאובטחת לאחור בקישורי הסרה קיימים בלי לחשוף כתובת או לאפשר שינוי שרירותי
- [x] להבטיח שכל קישור הסרה חדש במסעות שיווק ומשוב משתמש בטוקן אישי ותקין ולא בכתובת חשופה בלבד
- [x] לבדוק מצרפית את חלון התקלה: 50 מיילים ישנים כללו לחיצה כלשהי אך יומן הקליקים אינו שומר יעד, ולכן לא בוצעה הסרה ספקולטיבית; 9 הסרות מפורשות מאז 1.9 כבר מסומנות כחסומות
- [x] להוציא פרופילים לא פעילים מכל מסעות השיווק והמשוב העתידיים ולבטל 8 מסרים שיווקיים שהמתינו ל־5 פרופילים חסומים
- [x] לשמור מיילים תפעוליים חיוניים כמו גישה למוצר או התאמה מאושרת מחוץ לחסימת שיווק בלבד
- [x] למנוע כניסה מחדש למסע שיווק לאחר כיבוי פרופיל או בקשת הסרה
- [x] להוסיף בדיקות רגרסיה לקישור ישן, טוקן חדש, לחיצה חוזרת, פרופיל לא פעיל וחסימת דיוור
- [x] לבדוק את עמוד ההסרה בדסקטופ ובמובייל ואת נוסח האישור הסופי
- [x] להריץ pnpm test, pnpm check, pnpm build ו־git diff --check
- [x] לפרסם את תיקון ההסרה והסינון ולסנכרן GitHub
- [x] לפשט את ניסוי הקהל הקר כך ששאלון DNA נשאר דף הכניסה המרכזי
- [x] להכריע בין ה־Objectives: Leads לקהל קר שמגיע ל־DNA, ו־Sales/Purchase לבדיקת דפי המכירה החמה; לא לערבב אותם באותו מבחן
- [x] להסביר מדוע לא מערבבים בניסוי הראשי עמודי נחיתה שונים, קהלים שונים ומטרות שונות יחד
- [x] להגדיר ריטרגטינג נפרד רק לאחר מילוי DNA, עם יעד מכירה למאגר בשני דפי יעד בלבד
- [x] להגדיר תקציב קטן, משך קצר, UTM ומדדי הכרעה לכל ניסוי בלי להפעיל קמפיין

## הרחבת והפעלת דוח החצות בשלוש הודעות SMS — 02.09.2026

- [x] לאתר את חומרי היעדים והתקציבים הזמינים ולמפות את יעדי המאגר, Boost, הבאנדל והלידים; יעד הכנסה ותקציבים שלא אושרו נשארים מסומנים כטרם הוגדרו
- [x] לאמת שמחירי המוצרים והיעדים הזמינים תואמים לקוד, לעמודי התשלום ולנתוני ספטמבר הפעילים
- [x] לבנות חלוקה יומית דינמית לפי ימי השבוע, סופי שבוע, חגי ישראל וימים חזקים, בלי לשנות את היעד החודשי הכולל
- [x] להציג לכל מוצר יעד יומי בכמות, הכנסה, תקציב, CPA, CTA, ROAS והתקדמות שבועית וחודשית; נתון יעד חסר אינו מומצא
- [x] להרחיב את הגדרות הדוח לשני נמענים מאושרים בלי לחשוף את המספרים בממשק או בתשובת API, ועם מסוך בלוגי הספק
- [x] לפצל את דוח החצות לשלוש הודעות: יעדים ומכירות, תקציבים וקמפיינים, ומדדי המאגר
- [x] לכלול בהודעת היעדים מכירות בפועל מול יעד לפי מוצר, מחיר, הכנסה, לידים והתקדמות שבועית וחודשית
- [x] לכלול בהודעת הקמפיינים תקציב מתוכנן ובפועל, הוצאות Meta מכירות ו־Boost, CTR, CPL, CPA, ROAS ותמרורי אזהרה
- [x] לכלול בהודעת המאגר נרשמים חדשים מול יעד, התאמות שנשלחו, התאמות שהצליחו, חוסרי פרטים, מעל 14 יום ללא התאמה, לידים חדשים ו־Boost מול יעד
- [x] לשמור מקור, טריות ומצב חסר לכל מדד ולא להציג אפס כאשר נתון אינו זמין
- [x] לעדכן את מסך הניהול כך שיציג תצוגה מקדימה של שלוש ההודעות ומצב שני הנמענים
- [x] להוסיף בדיקות לחישובי חלוקה יומית, חגים, סופי שבוע, שני נמענים, שלוש הודעות, כשל חלקי ו־idempotency
- [x] להריץ dry-run עם נתוני אמת ללא שליחת SMS ולאמת את שלוש הודעות 2.9, היעדים והתקציבים
- [x] לאחר אישור סופי: לבצע שליחת ניסיון מבוקרת לשני הנמענים ולאמת תגובת ספק
- [x] לפרסם, לסנכרן GitHub וליצור תזמון חצות לפי שעון ישראל עם הגנת DST וכפילויות
- [x] לאמת את ריצת ההשלמה הראשונה: כל שלוש ההודעות התקבלו אצל כל אחד משני הנמענים לפי תשובת הספק

## בדיקת מוכנות שלושת ניסויי מסלולי הרכישה — 02.09.2026

- [x] לתרגם את המסמך שהועלה לשלושה ניסויים, קהלים, דפי יעד ואירועי הכרעה מדויקים
- [x] לבדוק את מסלולי `/dna-quiz`, `/database` ו־`/join` ואת שימור ה־UTM ביניהם
- [x] לבדוק את אירועי Meta Pixel ו־CAPI עבור ViewContent, Lead, database_cta, InitiateCheckout ו־Purchase
- [x] לוודא ש־Purchase נשלח רק לאחר רכישה מאומתת: מאגר מדווח כעת Purchase בצד השרת בלבד לאחר Grow webhook, עם event_id המבוסס transactionId וללא אירוע דפדפן כפול
- [x] לוודא שניתן להפריד בדוחות בין קהל קר, קהל חם ומשלימי DNA לפי UTM ואירועים שמורים
- [x] לבדוק שאין אירוע CTA או רכישה מדומה בטעינת עמוד, שאין כפילות InitiateCheckout ושאין אובדן UTM במעבר לתשלום
- [x] לתקן חסמי מדידה קריטיים ולהוסיף בדיקות רגרסיה: הוסר Purchase מדומה, הוסרה כפילות InitiateCheckout ונוסף שיוך UTM ומזהי Meta לליד DNA
- [x] לכתוב חוות דעת מסכמת: מה מוכן, מה אינו מוכן ומה נדרש לפני העלאת תקציב
- [x] להכין תמצית קצרה של שלושת הניסויים והקהלים להעתקה לוואטסאפ
- [x] לא להפעיל קמפיין או לשנות את Ads Manager ללא הוראה מפורשת

## שליחת השלמה לדוח 2.9 והפעלת דוח חצות — 03.09.2026

- [x] לאמת את תצורת דוח החצות הקיימת, מקורות הנתונים והיעדים השמורים
- [x] להגדיר שני נמעני SMS מאושרים בלי לחשוף אותם במסך הניהול או בתשובת API ועם מסוך בלוגי הספק
- [x] לפצל את הדוח לשלוש הודעות נפרדות: מכירות ויעדים, קמפיינים ותקציבים, מדדי המאגר
- [x] להוסיף ריצת השלמה ידנית לתאריך 2.9 שאינה מושפעת מחצות שכבר עבר ואינה מתנגשת בריצה עתידית
- [x] להפיק dry-run של שלוש הודעות 2.9 מנתוני אמת ולסמן נתונים חסרים במקום להמציא אפסים
- [x] לבדוק את אורך כל SMS, סדר ההודעות והתאמת הנוסח לשני הנמענים
- [x] לשלוח שש הודעות בסך הכול: שלוש הודעות לכל אחד משני הנמענים המאושרים
- [x] לאמת תשובת ספק לכל הודעה: 6 מתוך 6 התקבלו, ללא שגיאה וללא הצגת מספרים בתיעוד המסכם
- [x] להריץ בדיקות מלאות, TypeScript, build ו־git diff --check: 69 קובצי בדיקה ו־331 בדיקות עברו
- [x] לפרסם את הרחבת הדוח ולסנכרן GitHub
- [x] ליצור ולהפעיל את תזמון החצות העתידי עם הגנת שעון ישראל, DST ו־idempotency
- [x] לאמת בבדיקות ובהגדרת המשימה שהריצה העתידית תפיק שלוש הודעות לכל נמען פעם אחת בלבד לכל יום

## בדיקת הרשמת בתאל זיידמן ל־Boost ומייל חסר — 03.09.2026

- [x] לאמת לפי הכתובת שסופקה אם קיים פרופיל מאגר ומה סטטוס אישור Boost שלו: פרופיל פעיל ומשלם, אך ללא חברות Boost שנוצרה
- [x] לבדוק אם פעולת ההרשמה ל־Boost נשמרה, באיזה מועד ומאיזה מסלול: לא נוצרה רשומת התעניינות או הסכמה משום שהבקשה נעצרה בשער זכאות ישן
- [x] לאתר ביומן המיילים את מייל אישור ה־Boost ולבדוק אם נוצר, נשלח, נחסם, חזר או לא נוצר כלל: המייל לא נוצר ולא נשלח
- [x] לבדוק מול Brevo את סטטוס המסירה בלי לחשוף פרטים אישיים בתוצאה: לא הייתה בקשת שליחה לספק; מיילים קודמים לאותה כתובת נמסרו ונפתחו
- [x] לבדוק שאין הבדל אותיות, רווח או כתובת אחרת בין טופס Boost, פרופיל המאגר וה־CRM: ההתאמה תקינה לאחר normalize; קיימות שתי רשומות CRM אך אין פער בכתובת
- [x] לאתר את שורש התקלה בזרימת האישור, יצירת הקישור או השליחה: הפרופיל נחסם בשקט בגלל `consentMatchmaking=false`, אף שהסכמת Boost המפורשת נאספת רק בהמשך באזור האישי
- [x] לתקן את שורש התקלה ולהוסיף בדיקת רגרסיה: קישור אישור נשלח לכל חבר מאגר פעיל ומשלם עם טוקן, והשתתפות ב־Boost נשענת על שלושת אישורי Boost המפורשים
- [x] לוודא שהפרופיל של בתאל מסומן נכון ושקישור האזור האישי ניתן להפקה: הפרופיל פעיל ומשלם ובעל טוקן; Boost יישאר לא פעיל עד אישור מפורש שלה
- [x] לא לשלוח מייל נוסף לבתאל בלי אישור מפורש לאחר מסירת האבחנה
- [x] אם בוצע תיקון קוד: להריץ שערי שחרור, לפרסם ולסנכרן GitHub — 69 קובצי בדיקה ו־333 בדיקות עברו; גרסה 4f11c500 פורסמה וסונכרנה
