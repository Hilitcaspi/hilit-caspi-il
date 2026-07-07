# Tu B'Av Bundle Implementation Plan

## Research Findings

### Current System Architecture:
1. **Products defined in**: `server/growPayment.ts` PRODUCT_CONFIGS
   - database: 249₪, guide: 149₪, course: 249₪, coaching: 2960₪, session: 500₪
2. **Payment flow**: GrowWallet component → tRPC `payment.createProcess` → Grow API → webhook → handle product
3. **GrowWallet props**: product (enum), prefillName/Email/Phone, onSuccess, termsPath, buttonLabel
4. **Webhook** (`server/growWebhook.ts`): detects product from description/sum/token, calls handler
5. **Guide delivery**: `handleGuide()` creates token in `productAccessTokens`, sends email with link
6. **Database onboarding**: `handleDatabase()` creates singles record, sends questionnaire link email
7. **Coupon system**: discount_codes table, validated server-side in `payment.createProcess`

### Bundle Design Decision:
**Best approach: Single product "bundle_tubav" at 349₪**

Reasons:
- Single payment = no confusion, no split transactions
- Webhook detects it by sum (349) or description
- Bundle handler calls BOTH handleDatabase() AND handleGuide() 
- User gets both emails: questionnaire link + guide access link
- No coupon needed (fixed price product)
- Clean thank-you page specific to the bundle

### Implementation Steps:

1. **Add product to PRODUCT_CONFIGS**: `bundle_tubav: { description: "חבילת ט״ו באב - מאגר + מדריך", sum: 349, paymentNum: 1 }`
2. **Add PAGE_CODE**: Use same GROW_PAGE_CODE_DATABASE (or create new one)
3. **Add to GrowWallet type**: extend product enum with "bundle_tubav"
4. **Add webhook handler**: `handleBundleTuBav()` that calls both handleDatabase + handleGuide
5. **Add product detection**: sum=349 → "bundle_tubav", or description contains "חבילת ט״ו באב"
6. **Create landing page**: `/tu-bav` - hidden, love-themed, shows the bundle offer
7. **Thank-you page**: `/thank-you/bundle` - confirms both products
8. **Success URL**: `/thank-you/bundle`

### Pricing Display:
- מאגר הרווקים: ~~249₪~~ (included)
- המדריך "לבחור נכון": ~~249₪~~ → 99₪ (bundle price)
- **Total: 349₪ instead of 498₪** (save 149₪!)

### Marketing Angle:
- Tu B'Av = Israeli Valentine's Day (August 12, 2026)
- "דייט ביום האהבה הישראלי" - goal is to get a date by Tu B'Av
- Guide helps prepare for database entry (choose right, understand matches)
- Hilit is "giving gas" on matches, sending lower-score matches too
- Great opportunity to join now

### Files to Create/Modify:
- `client/src/pages/TuBavBundle.tsx` - Landing page
- `client/src/pages/ThankYouBundle.tsx` - Thank you page  
- `client/src/App.tsx` - Add routes
- `server/growPayment.ts` - Add product config
- `server/growWebhook.ts` - Add bundle handler
- `client/src/components/GrowWallet.tsx` - Add product type
