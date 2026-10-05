# אירוע 31.10 — תשתית כניסה ותשלומים (הערות מימוש)

**סטטוס (5.10.2026):** רכישת מאגר חדשה ב־299 ₪ עם קוד LIVE דרך `/live/database` כוללת כרטיס אישי אחד במתנה לאחר אישור Grow. הקוד מוחל אוטומטית; בלי אימותו הקופה לא נפתחת. מסלול הכרטיס הנפרד ב־149 ₪ ומחיר FRIENDS ב־49 ₪ מופעלים רק כאשר `LIVE_OCTOBER_SALES_OPEN=true` בפריסת השרת. בעלת האתר ביקשה להפעיל ולבדוק אותם. קוד השובר לאחר תשלום הוא אסמכתת זכאות באתר, **לא** קוד כניסה ל־Zoom; לינק אישי יישלח בהמשך לאחר הגדרת האירוע. אין עדיין שליחה אוטומטית או Zoom מחובר.

**TEST1:** קוד בדיקת חיוב אמיתי ב־1 ₪ רק למייל הבדיקה המוגדר בשרת ושני כינוייו הקבועים (`+live-database`, `+live-ticket`). הוא עובד על מסלול מאגר או כרטיס עצמאי, עד 12.10 בשעה 00:00 בישראל; אינו עובד למוצר אחר או לנמען אחר. יש להשתמש בכינוי שונה לכל בדיקה כדי להימנע מכרטיס כפול. תשלום בדיקה מקבל שובר `TEST-` ומופיע כעסקת Grow אמיתית בסך 1 ₪, אך **לא** מפעיל חברות במאגר ואינו מקנה כניסה לאירוע, אינו נספר במספר הנרשמים בדאשבורד ולא משוגר כ־Purchase למערכות הפרסום. אין לפרסם את קוד TEST1 לקהל הרחב. אחרי בדיקת התשלום יש לוודא ש־webhook אישר את העסקה, השובר הופיע בדף תודה ונתון הבדיקה סומן בנפרד; רק אז להתייחס למסלול כתשלום שנבדק בפועל.

## Grow

- התיעוד הרשמי של Grow על `ApproveTransaction` קובע שזה אישור **קבלת הודעת webhook**, לא בירור עצמאי של מצב התשלום: https://developers.grow.business/docs/grow-app-for-make
- בתיעוד הרשמי של callback ל־Payment Link מופיע `data.statusCode=2`, `status=שולם`, סכום, `transactionToken`, `transactionId` ו־`processToken`: https://developers.grow.business/reference/payment-request-callback
- ל־GetTransactionInfo תשובה עם `statusCode`, סכום ו־processToken: https://developers.grow.business/reference/response-get-transaction-info ; בקשה דורשת `pageCode`, `transactionToken`, `transactionId`: https://developers.grow.business/reference/get-transaction-info
- בדיקת נגישות של endpoint זה בסביבת הפרויקט החזירה 403 HTML גם ישירות וגם דרך Cloudflare Worker של Grow. לכן המימוש אינו מסתמך עליו: נבנה endpoint ייעודי בעל `live_ref` חתום ב־HMAC, תוקף 48 שעות, קישור למייל בהזמנה, התאמה ל־provider process token של קופה מקומית, `statusCode=2`, `status=שולם`, transaction tokens תקינים, סכום תואם ותווית קופון תואמת. אם Grow אינו שולח שדות אלה, השרת מחזיר 503 לניסיון חוזר ואינו מנפיק כרטיס. לפני פתיחת מכירה יש לבדוק callback אמיתי ב־Grow sandbox/בהרשאה הרלוונטית ולוודא שכל שדות האימות זמינים.

## Zoom

- Zoom Meeting או Webinar עם **registration required** יכולים להנפיק קישור join ייחודי לנרשם. אימות זהות בחשבון Zoom עם מייל מאומת מחזק זיהוי; קוד שובר פנימי באתר **אינו** passcode של Zoom ואינו מגביל בפני עצמו שיתוף או השתתפות חוזרת.
- תיעוד הרשמה רשמי: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061631
- תיעוד אימות משתתפים רשמי: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0063837
- **משימת תפעול פתוחה לפני האירוע:** לפתוח את האירוע בחשבון Zoom, לבדוק מגבלת קיבולת ותוכנית, להגדיר registration + authentication אם מתאימים לקהל, לקבוע מנגנון לשליחת לינק אישי בסמוך לאירוע ולבדוק כניסה מעשית ממייל נרשם. חיבור Zoom עדיין ממתין לאישור; אין לחשוף או להפיץ קישור ציבורי כללי. ההבטחה למסירת לינק אישי מחייבת סגירה מסודרת של שלב זה טרם האירוע.

## עדויות

לא נמצאו במאגר רשומות `testimonial_records` מסוג success עם אישור צוות, הסכמה לטקסט, והרשאה לפרסום באתר (ספירה מצרפית: 0). אין להמציא סיפורי הצלחה אישיים או לפרסם פידבק ללא אישור נפרד. ניתן להוסיף ציטוטים רק לאחר תהליך הרשאה ואימות.
