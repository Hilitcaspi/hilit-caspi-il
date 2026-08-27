# ארכיטקטורת קמפיינים, קהלים ו־UTM לספטמבר 2026

## עקרון מדידה

כל קמפיין, סדרת מודעות ומודעה יקבלו זהות קבועה לפני הפרסום. שמות נכתבים באנגלית, באותיות קטנות וב־snake_case. אין לשנות שם לאחר פרסום, משום ש־Meta מציינת שפרמטרים דינמיים מבוססי שם ממשיכים לשקף את השם בזמן הפרסום הראשון. מזהי Meta נשמרים במקביל כדי שהייחוס לא יהיה תלוי בשם.[1]

כתובות היעד הפעילות הן:

`https://hilitcaspi.com/database` למאגר הישיר, ו־`https://hilitcaspi.com/new-year-love` לבאנדל החג.

## תבנית URL מחייבת לכל מודעת Meta

```text
utm_source=meta&utm_medium=paid_social&utm_campaign=<campaign_code>&utm_term={{adset.name}}&utm_content={{ad.name}}&meta_campaign_id={{campaign.id}}&meta_adset_id={{adset.id}}&meta_ad_id={{ad.id}}&placement={{placement}}&site_source_name={{site_source_name}}
```

Meta תומכת רשמית ב־`{{campaign.id}}`, `{{adset.id}}`, `{{ad.id}}`, `{{campaign.name}}`, `{{adset.name}}`, `{{ad.name}}`, `{{placement}}` ו־`{{site_source_name}}`.[1] הפרמטרים מוזנים בשדה URL Parameters ברמת המודעה, לא בתוך כתובת עמוד הנחיתה, כדי למנוע כפילויות ודריסה.[2]

## מפת הקמפיינים

| קוד קמפיין | יעד | קהל | תקציב בסיס | עמוד יעד | אירוע אופטימיזציה |
|---|---|---|---:|---|---|
| `sep26_database_cold` | מכירת מאגר ישירה | קהל קר מפולח וקהל רחב | 7,000 ₪ | `/database` | Purchase |
| `sep26_database_retarget` | השלמת רכישת מאגר | מבקרי מאגר, DNA, Checkout ו־engagers | 3,000 ₪ | `/database` | Purchase |
| `sep26_holiday_bundle_cold` | מכירת באנדל | קהל קר מפולח | 6,500 ₪ | `/new-year-love` | Purchase |
| `sep26_holiday_retarget` | השלמת רכישת באנדל | מבקרי עמוד באנדל ו־Checkout | 1,500 ₪ | `/new-year-love` | Purchase |
| `sep26_success_stories` | אמון ורכישה | נכסים מאושרים בלבד | 0 ₪ בשלב זה | עמוד המוצר המתאים | Purchase |
| `sep26_match_quantity_truth` | הסרת התנגדות | קהל מאגר חם ומתלבטים | מתוך 3,000 ₪ רימרקטינג מאגר | `/database` | ViewContent ואז Purchase |
| `sep26_ig_boost_holiday` | קידום פוסט Instagram מדיד | עוקבים, engagers והרחבה מבוקרת | עד 500 ₪ מתוך Acquisition באנדל | `/new-year-love` | Landing Page View ואז Purchase |
| `sep26_dna_quality_test` | ניסוי לידים איכותיים | קהל קר מצומצם | 500 ₪ | שאלון DNA | Lead, עם קוהורט Purchase |
| `sep26_session_coaching` | פגישה וליווי | חברי מאגר, לידים חמים ורוכשי דיגיטל | 1,000 ₪ | `/single-session` | Purchase |
| `sep26_match_boost_members` | מכירת Boost | חברי מאגר שהסכימו ל־Boost | 200 ₪ רזרבה | `/match-boost` ואז אזור אישי | Purchase, מותנה ב־Grow |
| `sep26_plus_pilot` | הפעלת Plus | מועמדים מאושרים בלבד | 300 ₪ רזרבה | `/database-plus` בקישור אישי | SubscriptionStart, מותנה ב־Grow |

תקציב מסרי ההתנגדות מגיע מתוך 3,000 ₪ רימרקטינג המאגר. קמפיין סיפורי הצלחה לא מקבל תקציב עד שקיימים חומרים אמיתיים עם הסכמה ואימות צוות. אין להוסיף אף תת־קמפיין מעל התקציב החודשי.

קידומי Instagram אינם מסומנים אוטומטית כהצלחה לפי לייקים או צפיות. לכל קידום מוגדר יעד אתר, קישור עם UTM ייחודי ותקציב התחלתי של 100 ₪. הוא גדל עד 500 ₪ רק אם מתקבלים Landing Page Views בעלות סבירה ולפחות Begin Checkout או Purchase שניתן לייחס. ללא אירוע תחתון הוא נשאר ניסוי תוכן ואינו מקבל תקציב נוסף.

## קהלי קמפיין הבאנדל הקר

| שם Ad Set | קהל | הנמקה | כלל תקציב |
|---|---|---|---|
| `cold_f_35_54_broad` | נשים 35–54 | נשים 35–44 היו הקבוצה הנשית החזקה ביותר בדיווח Meta | 25% מתקציב הקמפיין |
| `cold_m_25_44_broad` | גברים 25–44 | גברים 25–34 הציגו אות יעילות משמעותי | 25% |
| `cold_m_45_54_broad` | גברים 45–54 | אות ROAS מדווח גבוה, דורש אימות | 15% |
| `cold_all_25_54_broad` | נשים וגברים 25–54 ללא תחומי עניין | קבוצת ביקורת רחבה ושמירה על איזון המאגר | 25% |
| `cold_lookalike_buyers_1p` | דומה לרוכשים, אם הרשימה תקינה | בדיקת יכולת Meta לאתר רוכשים דומים | 10% |

נשים 18–24 אינן מקבלות Ad Set מכירה ייעודי בתחילת החודש בגלל CPA מדווח חלש. אין להחריג אותן מכל המותג; הן נשארות בניסוי תוכן אורגני או בקהל רחב קטן עד שיש ראיה חדשה.

## קהלי רימרקטינג

| שם Ad Set | חלון | החרגות |
|---|---:|---|
| `rt_checkout_7d_no_purchase` | 7 ימים | רוכשי באנדל ומאגר |
| `rt_holiday_page_30d_no_purchase` | 30 ימים | רוכשי באנדל ומאגר |
| `rt_dna_complete_30d_no_purchase` | 30 ימים | כל מי שכבר שילם |
| `rt_site_30d_no_purchase` | 30 ימים | כל הרוכשים |
| `rt_ig_fb_engagers_365d` | 365 ימים | רוכשים ב־30 ימים האחרונים |
| `rt_email_clickers_30d` | 30 ימים | רוכשי באנדל |

יש להפריד Checkout מיתר הרימרקטינג כדי לדעת אם הבעיה היא אמון, מחיר או תקלה טכנית. תדירות שבועית ברימרקטינג לא תעלה מעל 4 ללא אישור, וקהל קטן אינו מקבל תקציב שמאלץ תדירות גבוהה.

## שמות מודעות ו־utm_content

שם המודעה הוא גם `utm_content`. המבנה המחייב:

```text
<format>_<angle>_<concept>_<version>
```

דוגמאות:

| שם מודעה | שימוש |
|---|---|
| `feed_holiday_action_bundle_v1` | Feed, מסר ״לא רק מאחלים אהבה״ |
| `story_holiday_table_future_v1` | Story, שולחן חג ועתיד זוגי בלי הבטחה |
| `reel_holiday_hilit_explains_v1` | Reels, הילית מסבירה את החבילה |
| `feed_value_stack_1245_to_449_v1` | Feed, פירוט ערך ומחיר |
| `story_success_anonymous_match85_v1` | Story, סיפור הצלחה אנונימי אם יש הרשאה לטקסט |
| `reel_quantity_vs_quality_data_v1` | Reels, מענה להתנגדות לכמות |
| `feed_database_science_human_v1` | Feed, אלגוריתם ובדיקה אנושית |
| `ig_boost_holiday_action_v1` | קידום פוסט Instagram עם יעד אתר ו־UTM ייעודי |

כל וריאציה חדשה מקבלת מספר גרסה חדש. אסור להעלות שתי מודעות שונות עם אותו שם.

## UTM לערוצים בבעלות

| ערוץ | `utm_source` | `utm_medium` | `utm_campaign` | דוגמת `utm_content` |
|---|---|---|---|---|
| ניוזלטר Brevo | `brevo` | `email` | `sep26_holiday_bundle` | `launch_email_01` |
| מייל רימרקטינג | `brevo` | `email` | `sep26_holiday_retarget` | `cart_email_01` |
| קבוצת WhatsApp | `whatsapp` | `owned_social` | `sep26_holiday_bundle` | `group_launch_01` |
| WhatsApp אישי שאושר | `whatsapp` | `direct_message` | `sep26_holiday_bundle` | `personal_followup_01` |
| Instagram אורגני | `instagram` | `organic_social` | `sep26_holiday_bundle` | `story_link_01` |
| Facebook אורגני | `facebook` | `organic_social` | `sep26_holiday_bundle` | `post_link_01` |
| שותף | `partner_<slug>` | `referral` | `sep26_holiday_bundle` | `<placement>_<date>` |

אין לשלוח הודעת WhatsApp שיווקית למי שלא נתן הסכמה מתאימה. webhook של Make נשאר מיועד רק להודעות התאמה ואינו משמש למסעות המכירה.

## אירועי המדידה

| שלב | GA4 | Meta | CRM | מזהה מניעת כפילות |
|---|---|---|---|---|
| טעינת עמוד | `view_item` | `ViewContent` | analytics event | `event_id` ייחודי לביקור |
| לחיצה על CTA | `select_item` | אירוע מותאם `HolidayCtaClick` | analytics event | `event_id` ייחודי ללחיצה |
| התחלת תשלום | `begin_checkout` | `InitiateCheckout` | lead/process token | אותו `event_id` בדפדפן ובשרת |
| תשלום מאושר | `purchase` | `Purchase` | completed payment | transaction ID כבסיס ל־`event_id` |
| הפעלת Plus | `purchase` + subscription metadata | `Subscribe` | plus payment event | provider transaction ID |
| רכישת Boost | `purchase` | `Purchase` | match boost request | provider transaction ID |

Purchase נחשב רק לאחר webhook מאושר מ־Grow. אירוע דפדפן ואירוע שרת חייבים להשתמש באותו `event_id` כדי למנוע ספירה כפולה. סכום ההכנסה נלקח מ־Grow ולא ממחיר מחירון כאשר הוא זמין.

## פערי הטמעה שייסגרו בעמוד החדש

כיום רכיב התשלום שומר `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` ו־`utm_term` בדפדפן, אך שולח לשרת רק את ארבעת השדות הראשונים. הוא גם אינו שומר מזהי Meta, placement או site source. בעמוד הבאנדל יורחבו הקלט, ה־CRM וה־webhook כך שיישמרו:

`utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `metaCampaignId`, `metaAdsetId`, `metaAdId`, `placement`, `siteSourceName`, `ga4ClientId`, `ga4SessionId`, `eventId`.

הדשבורד יציג את הנתונים לפי מוצר, קמפיין, Ad Set, מודעה, מיקום וערוץ. אם מזהי Meta חסרים, העסקה תסומן ״ייחוס חלקי״ ולא תשויך בכוח לקמפיין.

## חוזה דיווח למנהל הקמפיינים

כל דוח כולל Spend, Impressions, Reach, Frequency, CPM, Link CTR, Landing Page Views, Leads, CPL, Begin Checkout, Purchases, CPA, Grow Revenue, CRM Revenue, ROAS, שיעור המרה מ־LPV לרכישה ושיעורי קוהורט 7/14/30 ימים. הנתונים יוצגו ברמות Campaign, Ad Set ו־Ad ולפי מין, גיל, placement ומכשיר.

הדוח היומי הוא דוח חריגים בלבד. דוח מחצית מוגש ב־15.9 ודוח סוף חודש ב־1.10. כל דוח כולל יומן שינויי תקציב, מה נעצר, מה הוגדל, מדוע ומהו הניסוי הבא.

## מקורות

[1]: https://www.facebook.com/business/help/2360940870872492 "Meta, Specifications for dynamic URL parameters"
[2]: https://www.facebook.com/business/help/1016122818401732 "Meta, Add URL parameters to ads"
