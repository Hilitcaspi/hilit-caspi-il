# Make Custom Webhook reference

המקור הרשמי: https://apps.make.com/gateway

Make Custom Webhook מקבל בקשות JSON ב־POST עם `Content-Type: application/json`. ללא מודול תגובה מותאם, תגובת ברירת המחדל היא HTTP 200 עם הגוף `Accepted`. אפשר להגדיר data structure לאימות שדות; ללא מבנה מוגדר Make מקבל את נתוני הבקשה ומעביר אותם לתרחיש. גודל payload מרבי הוא 5MB.

מקור משלים: https://help.make.com/webhooks
