# Fix Notes - Homepage & Product Pages Round 2

## Files to fix:

### 1. Home.tsx (lines 694-706) - Intro Meeting card
- Currently says "חינם" badge and "שיחה אישית איתי...בלי התחייבות"
- SHOULD BE: ₪500 paid meeting, link to /single-session page (not WhatsApp)
- Remove "חינם" badge, change to "פגישה אישית"

### 2. Home.tsx (lines 540-618) - "בחרי את הדרך שלך" section
- Currently order: מאגר (highlighted), ליווי, חינמי
- User says מאגר should be first (most popular) - ALREADY DONE ✓

### 3. App.tsx (lines 117-148) - ScrollToTop
- Back button requires multiple clicks
- Returning to homepage goes to top instead of previous position
- Need to fix scroll position restoration logic

### 4. SingleSessionSales.tsx 
- No back/home link in navbar (lines 80-89)
- Still says "לאחר הפגישה תקבל/י גישה מלאה למאגר" in FAQ (lines 275-281)
- Need to remove free database access mention
- This IS the ₪500 paid meeting page

### 5. Blog.tsx (lines 23-39, 136-145)
- Still has Calendly links and "שיחת היכרות חינמית" CTA
- Need to replace with WhatsApp/intro meeting

### 6. CoachingSales.tsx
- Already mostly correct
- Has back link, clinic locations, 8/12 sessions
- Still says free database access included - user wants to KEEP this for coaching

### 7. GuideSales.tsx - Already has "שווה ערך ל-2 פגישות" ✓
### 8. CourseSales.tsx - Already has "שווה ערך ל-5 פגישות" ✓

## Key changes needed:
- Home.tsx: Change intro meeting from free to ₪500 paid (link to /single-session)
- SingleSessionSales.tsx: Add back button, remove free database mention
- Blog.tsx: Remove Calendly, replace with WhatsApp/intro meeting
- App.tsx: Fix ScrollToTop for proper back navigation
- Home.tsx "guide" section: Check scroll behavior (user says it stops at half)
- Home.tsx "מוכנה לשנות" section: Check for remaining Calendly link
