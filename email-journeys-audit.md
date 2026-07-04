# Email Journeys Audit - Complete Documentation

## System Architecture

### How Journeys Work
- **startJourney()** in `server/automation.ts` handles all journey initiation
- Emails are scheduled in `email_log` table with `scheduledAt` timestamps
- Email 1 sent immediately, subsequent emails scheduled at delays
- `processPendingEmails()` runs every 5 minutes, sends due emails
- Tracking: open pixel injected before `</body>`, links wrapped with click tracker
- Endpoints: `/api/email/open/:id` (pixel), `/api/email/click/:id` (redirect)
- Brevo webhook at `/api/brevo/webhook` also updates openCount/clickCount
- Idempotency: won't restart same journey within 30 days
- Smart stopping: if lead converted to higher product, skips remaining promo emails
- Unsubscribe check: skips emails if lead marked emailUnsubscribed

### Email Delays
- 3-email sequences: 0h, 24h, 72h
- 6-email sequences (first_step_v2): 0h, 1d, 4d, 7d, 10d, 14d
- 4-email matchmaking welcome: 0h, 3d, 7d, 14d
- 4-email guide purchase: 0h, 48h, 4d, 7d

### Journey Exclusivity Rules
- V1 and V2 of first_step are mutually exclusive
- free_guide and first_step are mutually exclusive

---

## All Email Journeys

### 1. free_guide_nurture (מדריך חינמי - Meta)
**Trigger:** User downloads free guide from website or Meta lead form (guide)
**Emails:** 3 (0h, 24h, 72h)
**Goal:** Nurture free guide downloaders → paid guide or database
- Email 1: "המדריך שלך מוכן - ומשהו שרציתי לספר לך" (delivers guide + WA group)
- Email 2: "תובנה ששינתה את הדרך שאני עובדת" (value content)
- Email 3: "סיפור שחשבתי עליך" (story + CTA to paid products)

### 2. en_free_guide_nurture (English Free Guide)
**Trigger:** English user downloads free guide
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "your free guide is ready"
- Email 2: "the insight that changed how I work"
- Email 3: "a story I thought of when I read yours"

### 3. women_first_step_v2 (מסע DNA - נשים)
**Trigger:** Woman completes DNA quiz on website → registers with email
**Emails:** 6 (0h, 1d, 4d, 7d, 10d, 14d)
**Goal:** DNA quiz completers → paid guide/database/coaching
- Email 1: "הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך" (DNA results)
- Email 2: "משהו שהמחקר גילה שמשנה את הדרך שאני עובדת"
- Email 3: "סיפור שחשבתי עליך"
- Email 4: "שתי דרכים לקדימה"
- Email 5: "שאלה שאני שואלת כל מי שיושב מולי"
- Email 6: "המייל האחרון - ומתנה קטנה לדרך"

### 4. men_first_step_v2 (מסע DNA - גברים)
**Trigger:** Man completes DNA quiz on website → registers with email
**Emails:** 6 (0h, 1d, 4d, 7d, 10d, 14d)
- Email 1: "הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך" (DNA results)
- Email 2: "יש נשים שמחפשות את הפרופיל שלך"
- Email 3: "סיפור שרציתי לשתף איתך"
- Email 4: "למה המאגר שלי שונה מכל דבר אחר"
- Email 5: "₪249 במקום ₪499 - עד מתי?"
- Email 6: "מתנה קטנה - ומייל אחרון ממני"

### 5. meta_lead_dna (Meta ליד DNA)
**Trigger:** Lead from Meta Lead Ad for DNA quiz
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "הנה שאלון ה-DNA שביקשת 💛"
- Email 2: "השלמת את השאלון? הנה מה שמחכה לך"
- Email 3: "קוד קופון מיוחד בשבילך"

### 6. sales_call_lead (שיחת היכרות - Meta)
**Trigger:** Lead from Meta Lead Ad for sales call
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "קיבלתי את הפנייה שלך"
- Email 2: "סיפור שחשבתי עלייך כשקראתי אותו"
- Email 3: "שמרתי לך מקום לשיחה"

### 7. women_guide / men_guide (מדריך - רכישה)
**Trigger:** CRM status changed to client_guide (after purchase)
**Emails:** 4 (0h, 48h, 4d, 7d)
**Goal:** Guide buyers → database/coaching upsell
- Women:
  - Email 1: "ברוכה הבאה לצד השני ♡ המדריך שלך מוכן" (delivers guide link)
  - Email 2: "שלחתי לך משהו חשוב - ראית?" (48h reminder)
  - Email 3: "יומיים אחרי - מה הרגשת?" (engagement)
  - Email 4: "הצעד הבא - אם את מוכנה" (upsell)
- Men:
  - Email 1: "המדריך שלך מוכן - כל הכבוד על ההחלטה"
  - Email 2: "שלחתי לך משהו חשוב - ראית?"
  - Email 3: "יומיים אחרי - יישמת משהו?"
  - Email 4: "הצעד הבא - אם אתה מוכן"

### 8. women_matchmaking_welcome / men_matchmaking_welcome (ברוך הבא למאגר)
**Trigger:** User registers to singles database (completeQuestionnaire) OR CRM status → client_database
**Emails:** 4 (0h, 3d, 7d, 14d)
**Goal:** Onboard new database members, encourage profile completion, upsell coaching
- Women:
  - Email 1: "ברוכה הבאה למאגר הבלעדי ♡ הנה איך התהליך עובד"
  - Email 2: "מה לעשות בינתיים - 3 טיפים שמגדילים סיכויים"
  - Email 3: "סיפור שחשבתי עליך"
  - Email 4: "רוצה להגדיל את הסיכויים שלך?" (coaching upsell)
- Men:
  - Email 1: "ברוך הבא למאגר הבלעדי ♡ הנה איך התהליך עובד"
  - Email 2: "מה לעשות בינתיים - 3 טיפים שמגדילים סיכויים"
  - Email 3: "סיפור שחשבתי עליך"
  - Email 4: "רוצה להגדיל את הסיכויים שלך?"

### 9. women_matchmaking / men_matchmaking (מאגר - ישן)
**Trigger:** Old journey, replaced by matchmaking_welcome
**Emails:** 3 (0h, 24h, 72h)
- Women: "ברוכה הבאה למאגר הבלעדי", "שבוע במאגר - עדכון קטן", "רוצה להגדיל את הסיכויים שלך?"
- Men: "ברוך הבא למאגר הבלעדי", "שבוע במאגר - עדכון", "רוצה להאיץ את התהליך?"

### 10. women_course / men_course (קורס - רכישה)
**Trigger:** CRM status changed to client_course
**Emails:** 3 (0h, 24h, 72h)
- Women: "ברוכה הבאה לקורס! ♡ הכל מוכן לך", "איך הולך עם הקורס?", "הצעד הבא אחרי הקורס"
- Men: "כל הכבוד! הקורס מוכן לך", "הגעת למודול השני?", "הצעד הבא אחרי הקורס"

### 11. women_transformation / men_transformation (ליווי אישי)
**Trigger:** CRM status changed to client_coaching
**Emails:** 3 (0h, 24h, 72h)
- Women: "אחרי השיחה שלנו - הנה הצעד הבא", "חשבת על מה שדיברנו?", "ההצעה הזו נסגרת בקרוב"
- Men: "אחרי השיחה שלנו - הנה הצעד הבא", "חשבת על מה שדיברנו?", "מייל אחרון - ההצעה נסגרת"

### 12. abandoned_guide (נטישת עגלה - מדריך)
**Trigger:** User starts guide checkout but doesn't complete (abandoned cart)
**Emails:** 3 (0h, 24h, 72h) with HILIT10 coupon
- Email 1: "שכחת משהו..."
- Email 2: "הקופון שלך פג בעוד 24 שעות"
- Email 3: "מייל אחרון - הקופון פג הלילה"

### 13. abandoned_database (נטישת עגלה - מאגר)
**Trigger:** User starts database registration but doesn't complete
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "המקום שלך במאגר עדיין פנוי"
- Email 2: "הקופון שלך פג בעוד 24 שעות - המאגר מחכה"
- Email 3: "מייל אחרון - הקופון פג הלילה"

### 14. abandoned_course (נטישת עגלה - קורס)
**Trigger:** User starts course checkout but doesn't complete
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "הקורס עדיין מחכה לך"
- Email 2: "הקופון שלך פג בעוד 24 שעות"
- Email 3: "מייל אחרון - הקופון פג הלילה"

### 15. abandoned_coaching (נטישת עגלה - ליווי)
**Trigger:** User starts coaching checkout but doesn't complete
**Emails:** 3 (0h, 24h, 72h)
- Email 1: "ראיתי שעמדת לעשות את הצעד הגדול"
- Email 2: "הקופון שלך פג בעוד 24 שעות"
- Email 3: "מייל אחרון - הקופון פג הלילה"

### 16. women_first_step / men_first_step (מסע DNA - ישן)
**Trigger:** Old V1 journey, replaced by first_step_v2
**Emails:** 3 (0h, 24h, 72h)
- Women: "הפרופיל הזוגי שלך", "השאלה שאני שואלת כל מי שיושבת מולי", "המדריך שהייתי רוצה שמישהי יתן לי"
- Men: "הפרופיל הזוגי שלך", "השאלה שאני שואל כל גבר שיושב מולי", "המדריך שהייתי רוצה שמישהו יתן לי"

---

## Transactional Emails (Not Journey-Based)

### Match Proposal Email
**Trigger:** Admin approves a match in CRM
**Subject:** "💛 יש לך התאמה שמחכה לך! {score}%"
**Contains:** Match details, photo, compatibility score, yes/no buttons

### Contact Reveal Email
**Trigger:** Both parties approve a match
**Subject:** "שניכם אמרתם כן! הנה הפרטים של {name} 💛"

### Match Rejection Acknowledgment
**Trigger:** One party declines a match
**Subject:** "קיבלתי את תגובתך 🤍"

### Match Follow-Up Email
**Trigger:** 3 days after match proposal with no response
**Subject:** "ההצעה עדיין ממתינה לך 💛"

### Consolation Email
**Trigger:** After rejection, sent to the other party
**Subject:** "הילית כאן: ממשיכה לחפש עבורך 🤍"

### Owner Match Approval Email
**Trigger:** Both parties approve → notify Hilit
**Subject:** "💛 התאמה חדשה: {nameA} + {nameB} ({score}%)"

### Meeting Reminders
**Trigger:** Scheduled meeting approaching
- Reminder 1: 24h before - "תזכורת: הפגישה שלנו מחר"
- Reminder 2: 2h before - "נתראה בקרוב!"

---

## Journey Trigger Points Summary

| Journey | Trigger Location | When |
|---------|-----------------|------|
| free_guide_nurture | routers.ts:587 | Free guide download (website form) |
| en_free_guide_nurture | routers.ts:587 | English free guide download |
| women/men_first_step_v2 | routers.ts:898 | DNA quiz completion + registration |
| meta_lead_dna | _core/index.ts:467 | Meta Lead Ad (DNA form) |
| sales_call_lead | _core/index.ts:467 | Meta Lead Ad (call form) |
| free_guide_nurture (Meta) | _core/index.ts:467 | Meta Lead Ad (guide form) |
| women/men_guide | routers.ts:983 | CRM status → client_guide |
| women/men_matchmaking_welcome | routers.ts:1535 | completeQuestionnaire (database reg) |
| women/men_matchmaking_welcome | routers.ts:983 | CRM status → client_database |
| women/men_course | routers.ts:983 | CRM status → client_course |
| women/men_transformation | routers.ts:983 | CRM status → client_coaching |
| abandoned_* | Not found in code | May need manual trigger or webhook |

---

## Current Analytics Issues (Identified)

1. **Stale data**: Analytics queries have no time filtering - show ALL-TIME data, not recent
2. **Conversion metric is misleading**: `convertedToMatchmaking` joins email_log → crm_leads → singles by email. This counts ANY lead who EVER registered to database, regardless of whether the journey caused it
3. **Brevo webhook updates only LAST sent email**: `ORDER BY sentAt DESC LIMIT 1` means if user opens email 1 after email 2 is sent, the open is attributed to email 2
4. **No bounce/delivery rate shown**: Brevo sends bounce events but they're only stored as 'failed' status, not surfaced in analytics
5. **No time-based filtering**: Can't see "this week" vs "this month" performance
6. **No per-journey conversion tracking**: Can't tell which specific journey email led to conversion
7. **emailIndex is 1-based in DB but 0-based in UI display** (EMAIL_NAMES uses 0-based keys)
8. **Missing "processing" status handling**: Emails claimed but not yet sent show as neither pending nor sent
