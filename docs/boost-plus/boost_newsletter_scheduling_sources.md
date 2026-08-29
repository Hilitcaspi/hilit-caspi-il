# מקורות לתזמון ניוזלטר Boost

נבדק ב־29.8.2026:

- Brevo תומכת בשליחה של עד 1,000 גרסאות מייל מותאמות אישית בבקשת Batch אחת, ועד 6,000 בקשות בשעה: https://developers.brevo.com/docs/batch-send-transactional-emails
- נקודת השליחה תומכת ב־`messageVersions` וב־HTML מותאם לכל גרסה: https://developers.brevo.com/reference/send-transac-email
- מנגנון האידמפוטנטיות של Batch משתמש ב־`idempotencyKey` מסוג UUID ומונע עיבוד כפול של אותה בקשה במשך 30 דקות: https://developers.brevo.com/docs/heterogenous-versions-batch-emails

היישום משתמש בבקשת Batch אחת לכל גל, מזהה אידמפוטנטיות דטרמיניסטי לכל גל ואצווה, ורשומות `email_log` קיימות למדידת מסירה, פתיחה והקלקה.
