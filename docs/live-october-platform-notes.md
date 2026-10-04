# אירוע 31.10 — תשתית כניסה ותשלומים (הערות מימוש)

**סטטוס:** עמודים ושוברים מוכנים; סליקת המסלולים החדשים כבויה כברירת מחדל (`LIVE_OCTOBER_SALES_OPEN=false`) עד להגדרת אירוע אמיתי, כלי כניסה וקישורים אישיים. אין תזמון או שליחה אוטומטית של קישורי כניסה.

## Grow

- התיעוד הרשמי של Grow על `ApproveTransaction` קובע שזה אישור **קבלת הודעת webhook**, לא בירור עצמאי של מצב התשלום: https://developers.grow.business/docs/grow-app-for-make
- בתיעוד הרשמי של callback ל־Payment Link מופיע `data.statusCode=2`, `status=שולם`, סכום, `transactionToken`, `transactionId` ו־`processToken`: https://developers.grow.business/reference/payment-request-callback
- ל־GetTransactionInfo תשובה עם `statusCode`, סכום ו־processToken: https://developers.grow.business/reference/response-get-transaction-info ; בקשה דורשת `pageCode`, `transactionToken`, `transactionId`: https://developers.grow.business/reference/get-transaction-info
- בדיקת נגישות של endpoint זה בסביבת הפרויקט החזירה 403 HTML גם ישירות וגם דרך Cloudflare Worker של Grow. לכן המימוש אינו מסתמך עליו: נבנה endpoint ייעודי בעל `live_ref` חתום ב־HMAC, תוקף 48 שעות, קישור למייל בהזמנה, התאמה ל־provider process token של קופה מקומית, `statusCode=2`, `status=שולם`, transaction tokens תקינים, סכום תואם ותווית קופון תואמת. אם Grow אינו שולח שדות אלה, השרת מחזיר 503 לניסיון חוזר ואינו מנפיק כרטיס. לפני פתיחת מכירה יש לבדוק callback אמיתי ב־Grow sandbox/בהרשאה הרלוונטית ולוודא שכל שדות האימות זמינים.

## Zoom

- Zoom Meeting או Webinar עם **registration required** יכולים להנפיק קישור join ייחודי לנרשם. אימות זהות בחשבון Zoom עם מייל מאומת מחזק זיהוי; קוד שובר פנימי באתר **אינו** passcode של Zoom ואינו מגביל בפני עצמו שיתוף או השתתפות חוזרת.
- תיעוד הרשמה רשמי: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061631
- תיעוד אימות משתתפים רשמי: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0063837
- לפני מכירה יש לפתוח את האירוע בחשבון Zoom, לבדוק את מגבלת הקיבולת והתוכנית, להגדיר registration + authentication אם מתאימים לקהל, לקבוע מנגנון לשליחת לינק אישי בסמוך לאירוע, ולבדוק כניסה מעשית ממייל של נרשם. אין כרגע חיבור Zoom מחובר בפרויקט; אין לחשוף או להפיץ קישור ציבורי כללי.

## עדויות

לא נמצאו במאגר רשומות `testimonial_records` מסוג success עם אישור צוות, הסכמה לטקסט, והרשאה לפרסום באתר (ספירה מצרפית: 0). אין להמציא סיפורי הצלחה אישיים או לפרסם פידבק ללא אישור נפרד. ניתן להוסיף ציטוטים רק לאחר תהליך הרשאה ואימות.
