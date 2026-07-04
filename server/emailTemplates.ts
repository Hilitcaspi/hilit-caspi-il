/**
 * Email templates for all 8 customer journeys
 * Women: הצעד הראשון, 5 הסודות (מדריך), המאגר הבלעדי, מסע הטרנספורמציה
 * Men: הצעד הראשון, 5 הסודות (מדריך), המאגר הבלעדי, מסע הטרנספורמציה
 */

export type EmailTemplate = {
  subject: string;
  htmlBody: string;
  textBody: string;
};

const CALENDLY_15MIN = "https://hilitcaspi.com/single-session";

// DNA profile descriptions for email personalization
export const DNA_PROFILES: Record<string, { label_f: string; label_m: string; subtitle: string; superpower: string; challenge: string; match_f: string; match_m: string }> = {
  leader: {
    label_f: "המנהיגה הממגנטת",
    label_m: "המנהיג הממגנט",
    subtitle: "עוצמה, כריזמה, עצמאות",
    superpower: "הכריזמה והביטחון שלך הם הנכס הזוגי הגדול ביותר שלך. אתה מביא לקשר עוצמה, בהירות ומנהיגות טבעית. מי שזוכה בך כשותף - מקבל מישהו שאוהב ללא משחקים ומחפש שותף שירוץ לצידו, לא מאחוריו.",
    challenge: "בגלל שאתה כל כך עוצמתי, הרבה אנשים מרגישים מאוימים. אתה לפעמים מוצא את עצמך 'מנהל' את הקשר ואת בן הזוג - למרות שכל מה שאתה רוצה זה פשוט להישען על מישהו אחר.",
    match_f: "את צריכה 'סלע בטוח' - גבר עם ביטחון עצמי ורוגע פנימי שלא נכנס לקרבות אגו, לא מבוהל מהצלחתך, ונשאר נוכח ורגוע.",
    match_m: "אתה צריך 'סלע בטוח' - אישה עם ביטחון עצמי ורוגע פנימי שלא נכנסת לקרבות אגו, לא מבוהלת מהצלחתך, ונשארת נוכחת ורגועה.",
  },
  romantic: {
    label_f: "הרומנטיקנית העמוקה",
    label_m: "הרומנטיקן העמוק",
    subtitle: "עומק, רגש, חיבור נשמתי",
    superpower: "הלב שלך הוא הנכס הזוגי הגדול ביותר שלך. יש לך יכולת נדירה לאהוב, להכיל ולהעניק. אתה מביא לקשר אינטימיות אמיתית, עומק רגשי ורצון לבנות חיבור נשמתי.",
    challenge: "הנתינה האינסופית שלך לפעמים גורמת לך לשכוח את הצרכים שלך. הנטייה שלך לנתח כל מילה נובעת מפחד להיפגע ולפעמים גורמת לך להיאחז חזק מדי.",
    match_f: "ההתאמה המושלמת שלך היא 'האביר התקשורתי' - גבר שלא מפחד לדבר על רגשות, יוזם שיחות עומק, נותן לך חיזוקים קבועים ויוצר שקיפות מלאה.",
    match_m: "ההתאמה המושלמת שלך היא 'האביר התקשורתי' - אישה שלא מפחדת לדבר על רגשות, יוזמת שיחות עומק ויוצרת שקיפות מלאה.",
  },
  free_spirit: {
    label_f: "הרוח החופשית",
    label_m: "הרוח החופשית",
    subtitle: "ספונטניות, חיות, אנרגיה",
    superpower: "אתה מכניס לכל חדר שנכנסים אליו אנרגיה, חיות וריגוש. הנכס הזוגי הגדול ביותר שלך הוא הספונטניות ושמחת החיים. הזוגיות איתך היא הרפתקה.",
    challenge: "הפחד משגרה כובלת לפעמים גורם לך לברוח כשדברים הופכים יציבים. אתה עלול לבלבל בין יציבות בריאה לשעמום.",
    match_f: "ההתאמה המושלמת שלך היא 'העוגן הגמיש' - גבר יציב עם ראש פתוח שיש לו חיים מלאים משלו. הוא ייתן לך את המרחב שאת צריכה ויזרום עם הרעיונות שלך.",
    match_m: "ההתאמה המושלמת שלך היא 'העוגן הגמיש' - אישה יציבה עם ראש פתוח שיש לה חיים מלאים משלה. היא תיתן לך מרחב ותזרום עם הרעיונות שלך.",
  },
  anchor: {
    label_f: "העוגן היציב",
    label_m: "העוגן היציב",
    subtitle: "יציבות, נאמנות, ביטחון",
    superpower: "אתה ה'בית' - ההגדרה של בית. הנכס הזוגי הגדול ביותר שלך הוא היכולת ליצור שקט, ביטחון ומרחב מוגן למי שאיתך. אתה נאמן, מעשי ויודע לקחת אחריות.",
    challenge: "מרוב שאתה דואג לכולם ולכל דבר, לפעמים הופך ל'מטפל' של הקשר ומושך אליך אנשים שמחפשים מי שידאג להם.",
    match_f: "את צריכה גבר אלפא חיובי - 'היוזם המעריך'. הוא יודע לקחת פיקוד, מזמין תוכניות, ובעיקר שואל: 'מה אני יכול לעשות היום כדי להקל עליך?'",
    match_m: "אתה צריך 'היוזמת המעריכה' - אישה שרואה ומעריכה את כל הנתינה שלך, יוזמת ביחד, ויודעת לפנק אותך בדיוק כמו שאתה מפנק אחרים.",
  },
};
const WHATSAPP_LINK = "https://wa.me/972552442334";
const WA_GROUP = "https://hilitcaspi.com/api/wa/email";
const GUIDE_PURCHASE = "https://hilitcaspi.com/guide?utm_source=email&utm_medium=brevo&utm_campaign=guide";
const MATCHMAKING_JOIN = "https://hilitcaspi.com/join?utm_source=email&utm_medium=brevo&utm_campaign=database&dna={{dnaType}}&gender={{gender}}&name={{firstName}}";
const COACHING_PAGE = "https://hilitcaspi.com/coaching?utm_source=email&utm_medium=brevo&utm_campaign=coaching";
const COURSE_PAGE = "https://hilitcaspi.com/course?utm_source=email&utm_medium=brevo&utm_campaign=course";
const DATABASE_PAGE = "https://hilitcaspi.com/database?utm_source=email&utm_medium=brevo&utm_campaign=database";
const GROW_GUIDE = "https://pay.grow.link/60e9eca1047ef4a2d619c1ed0bca68a2-MzI2MDI4OQ?utm_source=email&utm_medium=brevo&utm_campaign=guide";
const GROW_DATABASE = "https://pay.grow.link/60e9eca1047ef4a2d619c1ed0bca68a2-MzI2MDI4OQ?utm_source=email&utm_medium=brevo&utm_campaign=database";
const GROW_COURSE = "https://pay.grow.link/0428cfc2217c8ce98a6897cc1629416f-MzI2MjUxMQ?utm_source=email&utm_medium=brevo&utm_campaign=course";
const GROW_COACHING = "https://pay.grow.link/7e95519ddda0960adcffa9674ae563a5-MzI2MjUxOQ?utm_source=email&utm_medium=brevo&utm_campaign=coaching";
const HILIT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const PAID_GUIDE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/Hilit_Caspi_Paid_Guide_6518dc09.pdf";
const UNSUBSCRIBE_BASE = "https://hilitcaspi.com/unsubscribe";

// Standard email signature block used in all emails
function emailSignature(): string {
  return `<hr class="divider" />
  <p style="font-size:14px; color:#444;">באהבה,<br><strong>הילית כספי</strong><br>מאמנת ומשדכת | Relationship Expert &amp; Matchmaker<br>
  <a href="https://www.instagram.com/hilitcaspi_relationship" style="color:#191265;">אינסטגרם</a> ·
  <a href="https://www.facebook.com/share/1B28xCy726/" style="color:#191265;">פייסבוק</a> ·
  <a href="https://www.tiktok.com/@hilitcaspi_relationship" style="color:#191265;">טיקטוק</a> ·
  <a href="${WHATSAPP_LINK}" style="color:#191265;">וואטסאפ</a></p>`;
}

// Urgency banner for database price increase - shown in all emails mentioning the database
function urgencyBanner(): string {
  return `<div style="background:linear-gradient(135deg,#7b0000 0%,#c0392b 100%); border-radius:12px; padding:16px 20px; margin:20px 0; text-align:center; border:2px solid #ff6b6b;">
    <p style="color:#ffe27c; font-size:13px; font-weight:700; margin:0 0 6px; letter-spacing:1px;">⏳ התראת מחיר</p>
    <p style="color:#fff; font-size:15px; font-weight:700; margin:0 0 6px;">ההטבה שלך: ₪249 במקום ₪499</p>
    <p style="color:rgba(255,255,255,0.8); font-size:13px; margin:0;">הצטרפו עכשיו ותיהנו ממחיר מועדף - לא יהיה מחיר כזה שוב</p>
  </div>`;
}

function baseTemplate(content: string, recipientEmail?: string, leadId?: number): string {
  let unsubLink: string;
  if (leadId && recipientEmail) {
    const token = Buffer.from(`${leadId}:${recipientEmail}`).toString("base64");
    unsubLink = `${UNSUBSCRIBE_BASE}?token=${encodeURIComponent(token)}`;
  } else if (recipientEmail) {
    unsubLink = `${UNSUBSCRIBE_BASE}?email=${encodeURIComponent(recipientEmail)}`;
  } else {
    unsubLink = UNSUBSCRIBE_BASE;
  }
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background-color: #f0eadc; font-family: 'Rubik', Arial, sans-serif; direction: rtl; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #191265; padding: 32px 40px; text-align: center; }
  .header img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #ffe27c; }
  .header h1 { color: #ffe27c; font-size: 22px; margin: 12px 0 4px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin: 0; }
  .body { padding: 40px; color: #191265; line-height: 1.8; font-size: 16px; text-align: right; direction: rtl; }
  .body h2 { color: #191265; font-size: 22px; margin-bottom: 16px; text-align: right; }
  .body p { margin: 0 0 16px; text-align: right; }
  .cta { display: block; background: #ffe27c; color: #191265 !important; font-weight: 700; font-size: 17px; text-align: center; padding: 16px 32px; border-radius: 12px; text-decoration: none; margin: 28px 0; }
  .secondary-cta { display: block; border: 2px solid #191265; color: #191265 !important; font-weight: 600; font-size: 15px; text-align: center; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin: 12px 0; }
  .quote { background: #f0eadc; border-right: 4px solid #ffe27c; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #444; }
  .stats { display: flex; gap: 20px; justify-content: center; padding: 20px 0; }
  .stat { text-align: center; }
  .stat strong { display: block; font-size: 24px; color: #191265; }
  .stat span { font-size: 12px; color: #727272; }
  .footer { background: #191265; padding: 24px 40px; text-align: center; }
  .footer p { color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0; }
  .footer a { color: #ffe27c; text-decoration: none; }
  .divider { border: none; border-top: 1px solid #f0eadc; margin: 24px 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="${HILIT_IMG}" alt="הילית כספי" />
    <h1>הילית כספי</h1>
    <p>Relationship Expert &amp; Matchmaker</p>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>הילית כספי | Relationship Expert &amp; Matchmaker</p>
    <p><a href="${WHATSAPP_LINK}">וואטסאפ</a> · <a href="https://www.instagram.com/hilitcaspi_relationship">אינסטגרם</a> · <a href="https://www.facebook.com/share/1B28xCy726/">פייסבוק</a> · <a href="https://www.tiktok.com/@hilitcaspi_relationship">טיקטוק</a></p>
    <p style="margin-top:12px; font-size:12px; color:rgba(255,255,255,0.5);">קיבלת מייל זה כי נרשמת לרשימת התפוצה של הילית כספי.</p>
    <p style="font-size:12px; color:rgba(255,255,255,0.6);">📬 כדי להמשיך לקבל ממני תכנים   העבירו את המייל הזה לתיקייה הראשית (גררו מ"קידומים" לתיבה הראשית), או לחצו "לא ספאם".</p>
    <p style="font-size:11px;"><a href="${unsubLink}" style="color:rgba(255,255,255,0.4);">הסרה מרשימת התפוצה</a></p>
    <p style="font-size:10px; color:rgba(255,255,255,0.2); margin-top:12px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">© 2024-2025 Hilit Caspi. All rights reserved. | כל הזכויות שמורות.<br/>שיטת ההתאמה, האלגוריתם והתכנים מוגנים בזכויות יוצרים. אין להעתיק, לשכפל או להשתמש בכל חלק מהם ללא אישור מפורש בכתב.
    </p>
  </div>
</div>
</body>
</html>`;
}

// ─── JOURNEY 1: Women - הצעד הראשון ─────────────────────────────────────────

export const WOMEN_FIRST_STEP_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הנה מה שה-DNA הזוגי שלך חשף</h2>
    <p>קיבלתי את תוצאות האבחון שלך - ורציתי לשתף אותך לא רק בתוצאות, אלא גם בסיפור שמאחוריהן.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 4px; letter-spacing:1px;">הפרופיל הזוגי שלך</p>
      <h3 style="color:#ffffff; font-size:24px; margin:0 0 4px;">{{dnaTypeLabel}}</h3>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">{{dnaTypeSubtitle}}</p>
    </div>
    <div style="background:#f9f6f0; border-radius:12px; padding:20px 24px; margin:16px 0;">
      <p style="font-size:13px; color:#ffe27c; font-weight:700; margin:0 0 6px; background:#191265; display:inline-block; padding:3px 10px; border-radius:20px;">✨ הכוח הזוגי שלך</p>
      <p style="font-size:15px; color:#333; line-height:1.8; margin:8px 0 0;">{{dnaTypeSuperpower}}</p>
    </div>
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">⚡ האתגר שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeChallenge}}</p>
    </div>
    <div style="background:#f0f4ff; border-right:4px solid #191265; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">💛 ההתאמה שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeMatch}}</p>
    </div>
    <p>לפני כמה שנים עזבתי קריירה מפוארת בהייטק. לא בגלל שלא הצלחתי - אלא בגלל שהבנתי שמשהו אחר קורא לי.</p>
    <p>ראיתי מסביבי אנשים מוצלחים, חכמים, יפים - שנשארים לבד. רופאות שמצילות חיים בעבודה ובוכות לבד בלילה. לוחמים שמנהיגים אנשים בשטח ולא יודעים איך להיות פגיעים עם אישה. מנהלות בכירות שיש להן הכל על הנייר - חוץ ממי שיראה אותן.</p>
    <p>הבנתי שזו לא בעיה של "מזל" או "שוק". זו בעיה של כלים. <strong>וזו הפכה למשימת החיים שלי.</strong></p>
    <div class="quote">
      "הפרופיל שלך, {{dnaTypeLabel}}, אומר לי הרבה על מה שאת מחפשת ועל מה שמאתגר אותך. בימים הקרובים אשתף אותך בתובנות שיכולות לשנות את הדרך שבה את ניגשת לזוגיות."
    </div>
    <p>ובינתיים - הצטרפי לקבוצה השקטה שלי. שם אני משתפת תובנות שבועיות שלא מפרסמת בשום מקום אחר:</p>
    <a href="${WA_GROUP}" class="cta">הצטרפי לקבוצה השקטה שלי ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">2,400+ אנשים כבר שם. תוכן איכותי, ללא ספאם.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הפרופיל הזוגי שלך מוכן!\n\nהטיפוס שלך: {{dnaTypeLabel}}\n\nלפני כמה שנים עזבתי קריירה בהייטק כדי לעזור לאנשים למצוא אהבה. מאז ליוויתי מאות נשים - רופאות, לוחמים, מנהלות. בימים הקרובים אשתף אותך בתובנות שיכולות לשנות הכל.\n\nהצטרפי לקבוצה השקטה שלי: ${WA_GROUP}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_FIRST_STEP_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, השאלה שאני שואלת כל מי שיושבת מולי",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שאלה אחת שאני שואלת תמיד</h2>
    <p>"מה היה טוב בזוגיות האחרונה שלך?"</p>
    <p>כמעט אף אחת לא מזכירה גובה, מראה, או הכנסה. כולן מדברות על תחושות: "הוא ראה אותי", "הוא גרם לי להרגיש בטוחה".</p>
    <p>אז למה אנחנו ממשיכות לחפש לפי קריטריונים שלא קשורים לאושר?</p>
    <p>המדע קורא לזה <strong>Miswanting</strong> - אנחנו חושבים שאנחנו יודעים מה ישמח אותנו, אבל המוח שלנו מטעה אותנו. שוב ושוב.</p>
    <p>הפרופיל שלך, <strong>{{dnaTypeLabel}}</strong>, נוטה ל:</p>
    <p>{{dnaTypeChallenge}}</p>
    <p>זה לא חולשה. זה דפוס. ודפוסים אפשר לשנות - כשיודעים לזהות אותם.</p>
    <div class="quote">
      "שירה הגיעה אלי אחרי 4 שנים של דייטינג מתיש. בפגישה הראשונה הבנו יחד שהיא חוזרת על אותו דפוס בדיוק - רק עם שמות שונים. 3 חודשים אחרי שהבינה את הדפוס, היא פגשה את הבן זוג שלה."
    </div>
    <p>במדריך "לבחור נכון" אני מסבירה בדיוק איך לזהות את הדפוס שלך ולשנות אותו:</p>
    <a href="${GUIDE_PURCHASE}" class="cta">לרכישת המדריך - ₪249 בלבד ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;"></p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שאלה אחת: "מה היה טוב בזוגיות האחרונה שלך?" כמעט אף אחת לא מזכירה גובה או מראה. זה המדע שקורא Miswanting. במדריך אני מסבירה איך לשנות את הדפוס.\n\nלרכישת המדריך ב-₪249: ${GUIDE_PURCHASE}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_FIRST_STEP_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, המדריך שהייתי רוצה שמישהי יתן לי לפני שנים",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל שחיכית לו</h2>
    <p>שלחתי לך שני מיילים בשבוע האחרון. אם הם דיברו אלייך - המדריך הזה יהיה המשך טבעי.</p>
    <p>כתבתי את "לבחור נכון - המדריך המעשי לזוגיות" אחרי שנים של ליווי מאות נשים. זה לא עוד ספר עצה. זה המדריך שהייתי רוצה שמישהי תיתן לי לפני שנים.</p>
    <p><strong>מה תמצאו בפנים:</strong></p>
      ✦ מלכודת 1: Miswanting, לרצות את מה שלא מאושר אותך<br>
    ✦ מלכודת 2: הסתגלות הדוניסטית, למה גם הגבר המושלם מתחיל להרגיש רגיל<br>
    ✦ מלכודת 3: השוואה חברתית, למה הסביבה שלך עיוורת אותך<br>
    ✦ מלכודת 4: נקודת ייחוס, למה את תמיד מרגישה שמגיע לך יותר<br>
    ✦ כלים פרקטיים לשבור כל דפוס ולבחור נכון</p>
    <a href="${GUIDE_PURCHASE}" class="cta">♡ לרכישת המדריך - ₪249 בלבד ←</a>
    <div class="quote">
      "קראתי את המדריך בישיבה אחת. בכיתי פעמיים. הבנתי דברים שלא הבנתי אחרי שנים של טיפול." - נועה, 34
    </div>
    <p style="color:#727272; font-size:13px; text-align:center;"> · ערבות שביעות רצון מלאה</p>
    ${urgencyBanner()}
    <div style="background:#f0eadc; border-radius:12px; padding:20px; margin:20px 0; text-align:center;">
      <p style="font-weight:700; color:#191265; font-size:16px; margin:0 0 8px;">✨ מבצע מיוחד - חבילת ליווי מוקדמת</p>
      <p style="color:#444; font-size:14px; margin:0 0 12px;">8 פגישות ליווי אישי + כניסה למאגר הרווקים - הכל ב-<strong>₪2,960</strong> בלבד</p>
      <a href="${COACHING_PAGE}" style="background:#191265; color:#ffe27c; font-weight:700; padding:12px 24px; border-radius:8px; text-decoration:none; font-size:14px;">לפרטים על חבילת הליווי ←</a>
    </div>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, המדריך "לבחור נכון - המדריך המעשי לזוגיות" מחכה לך.\n\n₪249 בלבד, עם ערבות שביעות רצון מלאה.\n\nלרכישה: ${GUIDE_PURCHASE}\n\nמבצע מיוחד: חבילת ליווי 8 פגישות + מאגר רווקים ב-₪2,960 בלבד: ${COACHING_PAGE}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

// ─── JOURNEY 1: Men - הצעד הראשון ───────────────────────────────────────────

export const MEN_FIRST_STEP_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הנה מה שה-DNA הזוגי שלך חשף</h2>
    <p>קיבלתי את תוצאות האבחון שלך - ורציתי לשתף אותך לא רק בתוצאות, אלא גם בסיפור שמאחוריהן.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 4px; letter-spacing:1px;">הפרופיל הזוגי שלך</p>
      <h3 style="color:#ffffff; font-size:24px; margin:0 0 4px;">{{dnaTypeLabel}}</h3>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">{{dnaTypeSubtitle}}</p>
    </div>
    <div style="background:#f9f6f0; border-radius:12px; padding:20px 24px; margin:16px 0;">
      <p style="font-size:13px; color:#ffe27c; font-weight:700; margin:0 0 6px; background:#191265; display:inline-block; padding:3px 10px; border-radius:20px;">✨ הכוח הזוגי שלך</p>
      <p style="font-size:15px; color:#333; line-height:1.8; margin:8px 0 0;">{{dnaTypeSuperpower}}</p>
    </div>
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">⚡ האתגר שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeChallenge}}</p>
    </div>
    <div style="background:#f0f4ff; border-right:4px solid #191265; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">💛 ההתאמה שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeMatch}}</p>
    </div>
    <p>לפני כמה שנים עזבתי קריירה מפוארת בהייטק. לא בגלל שלא הצלחתי - אלא בגלל שראיתי מסביבי אנשים מוצלחים שנשארים לבד. לוחמים שמנהיגים אנשים בשטח ולא יודעים איך להיות פגיעים עם אישה. מנהלים בכירים שיש להם הכל על הנייר - חוץ ממי שיראה אותם.</p>
    <p>הבנתי שזו לא בעיה של "מזל" או "שוק". זו בעיה של כלים. <strong>וזו הפכה למשימת החיים שלי.</strong></p>
    <div class="quote">
      "הפרופיל שלך, {{dnaTypeLabel}}, אומר לי הרבה על מה שאתה מחפש ועל מה שמאתגר אותך. בימים הקרובים אשתף אותך בתובנות שיכולות לשנות את הדרך."
    </div>
    <p>ובינתיים - הצטרף לקבוצה שלי לתוכן בלעדי ופרקטי:</p>
    <a href="${WA_GROUP}" class="cta">הצטרף לקבוצה ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">2,400+ אנשים כבר שם. תוכן איכותי, ללא ספאם.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הפרופיל הזוגי שלך מוכן!\n\nהטיפוס שלך: {{dnaTypeLabel}}\n\nלפני כמה שנים עזבתי קריירה בהייטק כדי לעזור לאנשים למצוא אהבה. מאז ליוויתי מאות אנשים - רופאים, לוחמים, מנהלים. בימים הקרובים אשתף אותך בתובנות שיכולות לשנות הכל.\n\nהצטרף לקבוצה: ${WA_GROUP}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const MEN_FIRST_STEP_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, השאלה שאני שואל כל גבר שיושב מולי",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שאלה אחת שאני שואל תמיד</h2>
    <p>"מה היה טוב בזוגיות האחרונה שלך?"</p>
    <p>כמעט אף אחד לא מזכיר גובה, מראה, או הכנסה. כולם מדברים על תחושות: "היא ראתה אותי", "היא גרמה לי להרגיש בטוח".</p>
    <p>אז למה אנחנו ממשיכים לחפש לפי קריטריונים שלא קשורים לאושר?</p>
    <p>המדע קורא לזה <strong>Miswanting</strong> - אנחנו חושבים שאנחנו יודעים מה ישמח אותנו, אבל המוח שלנו מטעה אותנו.</p>
    <p>הפרופיל שלך, <strong>{{dnaTypeLabel}}</strong>, נוטה ל:</p>
    <p>{{dnaTypeChallenge}}</p>
    <p>זה לא חולשה. זה דפוס. ודפוסים אפשר לשנות.</p>
    <div class="quote">
      "דניאל הגיע אלי אחרי 3 שנים של דייטינג. עשה הכל 'נכון' - ארוחות יפות, מתנות, מסרים מושלמים. אבל הוא לא הראה מי הוא באמת. 4 חודשים אחרי שעבדנו יחד - הוא בזוגיות."
    </div>
    <p>במדריך "לבחור נכון" אני מסבירה בדיוק איך לזהות את הדפוס ולשנות אותו:</p>
    <a href="${GUIDE_PURCHASE}" class="cta">לרכישת המדריך - ₪249 בלבד ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;"></p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שאלה אחת: "מה היה טוב בזוגיות האחרונה שלך?" כמעט אף אחד לא מזכיר גובה או מראה. זה המדע שקורא Miswanting. במדריך אני מסבירה איך לשנות את הדפוס.\n\nלרכישת המדריך ב-₪249: ${GUIDE_PURCHASE}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const MEN_FIRST_STEP_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, המדריך שהייתי רוצה שמישהו יתן לי לפני שנים",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הכלים שאף אחד לא לימד אותך</h2>
    <p>כתבתי את המדריך הזה אחרי שנים בשטח - עם גברים ונשים. אני יודעת בדיוק מה עובד ומה לא.</p>
    <p><strong>מה תמצא בפנים:</strong></p>
    <p>✦ Miswanting: למה אתה רוצה מה שלא יאשר אותך<br>
    ✦ הסתגלות הדוניסטית: למה גם האשה המושלמת מתחילה להרגיש רגיל<br>
    ✦ השוואה חברתית: למה הסביבה שלך מעוורת אותך<br>
    ✦ כלים פרקטיים לשבור כל דפוס ולבחור נכון</p>
    <a href="${GUIDE_PURCHASE}" class="cta">לרכישת המדריך - ₪249 ←</a>
    <div class="quote">
      "קראתי את המדריך ויישמתי את הסוד השלישי בדייט הבא שלי. היא שלחה לי הודעה למחרת. אנחנו ביחד כבר 8 חודשים." - אורי, 36
    </div>
    <p style="color:#727272; font-size:13px; text-align:center;">ערבות שביעות רצון מלאה</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, המדריך "לבחור נכון" מחכה לך.\n\n₪249, ערבות שביעות רצון.\n\nלרכישה: ${GUIDE_PURCHASE}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

// ─── JOURNEY 2: Women - מדריך (אחרי רכישה) ──────────────────────────────────

export const WOMEN_GUIDE_PURCHASE_EMAIL_1: EmailTemplate = {
  subject: "ברוכה הבאה לצד השני ♡ המדריך שלך מוכן",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוכה הבאה!</h2>
    <p>קיבלתי את הרכישה שלך - ואני כל כך שמחה שהחלטת לעשות את הצעד הזה לעצמך.</p>
    <p>המדריך "לבחור נכון - המדריך המעשי לזוגיות" מחכה לך בקישור:</p>
    <a href="{{guideLink}}" class="cta">♡ לקריאת המדריך ←</a>
    <p>טיפ אחד לפני שמתחילים: קראי אותו בשקט, בלי הסחות דעת. יש שם דברים שיגרמו לך לעצור ולחשוב.</p>
    <hr class="divider" />
    <p>ואם אתם רוצים ללכת עמוק יותר - אני כאן. שיחת היכרות של 15 דקות, חינם לגמרי:</p>
    <a href="${CALENDLY_15MIN}" class="secondary-cta">♡ קביעת שיחת היכרות (15 דקות, חינם)</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוכה הבאה!\n\nהמדריך שלך מוכן: {{guideLink}}\n\nאם תרצי שיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_GUIDE_PURCHASE_EMAIL_REMINDER: EmailTemplate = {
  subject: "{{firstName}}, שלחתי לך משהו חשוב - ראית?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי לוודא שהמדריך הגיע</h2>
    <p>לפני כ-48 שעות שלחתי לך את המדריך "לבחור נכון" - אבל לפעמים מיילים נופלים לספאם או פשוט הולכים לאיבוד.</p>
    <p>אז הנה שוב, ישירות:</p>
    <a href="{{guideLink}}" class="cta">♡ לקריאת המדריך ←</a>
    <p>טיפ: קראי אותו בשקט, בלי הסחות דעת. יש שם דברים שיגרמו לך לעצור ולחשוב.</p>
    <div class="quote">
      "קראתי את הסוד הרביעי ופתאום הבנתי למה כל הגברים הטובים 'נעלמו' אחרי כמה פגישות. זה היה כמו מראה."
    </div>
    <p>ואם יש לך שאלה, תובנה, או סתם רצית לשתף - אני כאן. פשוט כתבי לי בוואטסאפ:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">♡ כתבי לי בוואטסאפ</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, רציתי לוודא שהמדריך הגיע.\n\nהנה הקישור שוב: {{guideLink}}\n\nשאלות? כתבי לי בוואטסאפ: ${WHATSAPP_LINK}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_GUIDE_PURCHASE_EMAIL_2: EmailTemplate = {
  subject: "יומיים אחרי - מה הרגשת?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סקרנית לדעת</h2>
    <p>עברו יומיים מאז שקיבלת את המדריך. מה הרגשת?</p>
    <p>אני שואלת כי אני רואה שוב ושוב: הנשים שמגיבות למדריך הכי חזק הן בדרך כלל אלו שהכי מוכנות לשינוי.</p>
    <div class="quote">
      "קראתי את הסוד הרביעי ופתאום הבנתי למה כל הגברים הטובים 'נעלמו' אחרי כמה פגישות. זה היה כמו מראה."
    </div>
    <p>אם יש לך שאלה, תובנה, או סתם רצית לשתף - אני כאן. פשוט כתבו לי בוואטסאפ.</p>
    <p>ואם את מרגישה שאת רוצה ליווי אישי - הצעד הבא הוא שיחת היכרות קצרה:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, עברו יומיים - מה הרגשת?\n\nאם את רוצה ליווי אישי, קבעי שיחה: ${CALENDLY_15MIN}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_GUIDE_PURCHASE_EMAIL_3: EmailTemplate = {
  subject: "הצעד הבא - אם את מוכנה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש צעד אחד שיכול לשנות הכל</h2>
    <p>שבוע עבר מאז שרכשת את המדריך. אני מקווה שהוא נתן לך כלים שאפשר ליישם.</p>
    <p>אבל יש משהו שמדריך לא יכול לתת - ליווי אישי שמותאם בדיוק לך.</p>
    <p>הליווי האישי שלי הוא 8 פגישות שבהן אנחנו:</p>
    <p>✦ מנתחות את ה-DNA הזוגי שלך לעומק<br>
    ✦ מזהות את הדפוסים שחוזרים ושוברות אותם<br>
    ✦ בניית פרופיל שמושך את הצד השני<br>
    ✦ מלוות אותך עד שאת בזוגיות שמגיעה לך</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <div class="quote">
      "הגעתי לשיחת ההיכרות בספקנות. יצאתי עם תוכנית. 6 חודשים אחרי - אני בזוגיות." - שירה, 32
    </div>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות. רק שיחה.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הצעד הבא - ליווי אישי.\n\nקביעת שיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

// ─── JOURNEY 2: Men - מדריך (אחרי רכישה) ────────────────────────────────────

export const MEN_GUIDE_PURCHASE_EMAIL_1: EmailTemplate = {
  subject: "המדריך שלך מוכן - כל הכבוד על ההחלטה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, כל הכבוד!</h2>
    <p>ההחלטה לקחת אחריות על הסיטואציה - זה כבר הצעד הראשון.</p>
    <p>המדריך "לבחור נכון - המדריך המעשי לזוגיות" מחכה לך:</p>
    <a href="{{guideLink}}" class="cta">לקריאת המדריך ←</a>
    <p>טיפ: קרא את הסוד השלישי פעמיים. זה הסוד שהכי משנה תוצאות בשטח.</p>
    <hr class="divider" />
    <p>ואם תרצה שיחה קצרה על הסיטואציה שלך - אני זמינה:</p>
    <a href="${CALENDLY_15MIN}" class="secondary-cta">קביעת שיחת היכרות (15 דקות, חינם)</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, המדריך שלך מוכן: {{guideLink}}\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nהילית`,
};

export const MEN_GUIDE_PURCHASE_EMAIL_REMINDER: EmailTemplate = {
  subject: "{{firstName}}, שלחתי לך משהו חשוב - ראית?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי לוודא שהמדריך הגיע</h2>
    <p>לפני כ-48 שעות שלחתי לך את המדריך "לבחור נכון" - אבל לפעמים מיילים נופלים לספאם או פשוט הולכים לאיבוד.</p>
    <p>אז הנה שוב, ישירות:</p>
    <a href="{{guideLink}}" class="cta">לקריאת המדריך ←</a>
    <p>טיפ: קרא את הסוד השלישי פעמיים. זה הסוד שהכי משנה תוצאות בשטח.</p>
    <div class="quote">
      "יישמתי את הסוד השלישי בדייט הבא שלי. היא שלחה לי הודעה למחרת. אנחנו ביחד כבר 8 חודשים." - אורי, 36
    </div>
    <p>שאלות? כתוב לי בוואטסאפ - אני קוראת ועונה אישית:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">כתוב לי בוואטסאפ</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, רציתי לוודא שהמדריך הגיע.\n\nהנה הקישור שוב: {{guideLink}}\n\nשאלות? כתוב לי בוואטסאפ: ${WHATSAPP_LINK}\n\nהילית`,
};

export const MEN_GUIDE_PURCHASE_EMAIL_2: EmailTemplate = {
  subject: "יומיים אחרי - יישמת משהו?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שאלה ישירה</h2>
    <p>יישמת משהו מהמדריך? גם תובנה קטנה שווה הרבה.</p>
    <div class="quote">
      "יישמתי את הסוד השלישי בדייט הבא שלי. היא שלחה לי הודעה למחרת. אנחנו ביחד כבר 8 חודשים." - אורי, 36
    </div>
    <p>אם יש לך שאלה - כתבו לי בוואטסאפ. אני קוראת ועונה אישית.</p>
    <p>ואם אתה מרגיש שאתה רוצה ליווי אישי - שיחה קצרה של 15 דקות יכולה לתת לך מפת דרכים:</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, יישמת משהו מהמדריך?\n\nשיחת היכרות: ${CALENDLY_15MIN}\n\nהילית`,
};

export const MEN_GUIDE_PURCHASE_EMAIL_3: EmailTemplate = {
  subject: "הצעד הבא - אם אתה מוכן",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש צעד אחד שיכול לשנות הכל</h2>
    <p>שבוע עבר. אני מקווה שהמדריך נתן לך כלים שאפשר ליישם.</p>
    <p>אבל יש משהו שמדריך לא יכול לתת - ליווי אישי שמותאם לסיטואציה שלך.</p>
    <p>בשיחת ההיכרות של 15 דקות נבין יחד:</p>
    <p>✦ מה עוצר אותך עכשיו<br>
    ✦ מה הצעד הנכון הבא<br>
    ✦ האם הליווי האישי שלי מתאים לך</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הצעד הבא - שיחת היכרות חינמית.\n\nקביעה: ${CALENDLY_15MIN}\n\nהילית`,
};

// ─── JOURNEY 3: Women - מאגר (אחרי הצטרפות) ─────────────────────────────────

export const WOMEN_MATCHMAKING_EMAIL_1: EmailTemplate = {
  subject: "ברוכה הבאה למאגר הבלעדי ♡ הנה איך התהליך עובד",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוכה הבאה למאגר! ♡</h2>
    <p>קיבלתי את השאלון שלך ואני כל כך שמחה שהחלטת לתת לי לעזור לך. אני רוצה לספר לך בדיוק איך התהליך עובד.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0;">
      <h3 style="color:#ffe27c; font-size:18px; margin:0 0 16px; text-align:center;">איך מתבצעות ההתאמות?</h3>
      <div style="color:#fff; font-size:15px; line-height:2;">
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">1. בדיקה אישית</span> - אני עוברת על הפרופיל שלך אישית ומחפשת התאמה שמרגישה נכון - לא רק על הנייר.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">2. הצעת התאמה</span> - כשאמצא התאמה פוטנציאלית, אשלח לשניכם הצעה בנפרד בלי לחשוף פרטים של הצד השני.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">3. אישור שני הצדדים</span> - רק אם שניכם אישרו את ההתאמה, הפרטים ייחשפו ותוכלו ליצור קשר.</p>
        <p style="margin:0;"><span style="color:#ffe27c; font-weight:700;">4. הפגישה בינכם</span> - השאר בידיכם. אני לא נמצאת בדייט ולא רואה את מה קורה ביניכם.</p>
      </div>
    </div>
    <div class="quote">
      "לא אפליקציה. לא שידוך. מדע של התאמה - עם לב. כל חיבור עובר דרכי אישית."
    </div>
    <p>זמן ממוצע עד לחיבור הראשון: 2-4 שבועות. תהיי סבלנית - הדברים הטובים לוקחים זמן.</p>
    <p>ובינתיים - עקבי אחרי באינסטגרם לתוכן שיעזור לך להיות מוכנה:</p>
    <a href="https://www.instagram.com/hilitcaspi_relationship" class="cta">לעקוב באינסטגרם ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוכה הבאה למאגר!\n\nאיך התהליך עובד:\n1. בדיקה אישית של הפרופיל\n2. הצעת התאמה לשני הצדדים\n3. רק אם שניכם אישרו - הפרטים ייחשפו\n4. הפגישה ביניכם\n\nזמן ממוצע: 2-4 שבועות.\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_MATCHMAKING_EMAIL_2: EmailTemplate = {
  subject: "שבוע במאגר - עדכון קטן",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדכון מהמאגר</h2>
    <p>עבר שבוע מאז שהצטרפת. אני רוצה לעדכן אותך שהשאלון שלך אצלי ואני עובדת עליו.</p>
    <p>בינתיים - יש משהו שיכול להגדיל משמעותית את הסיכויים שלך למצוא התאמה טובה:</p>
    <p>✦ ודאי שהפרופיל שלך מלא ומפורט<br>
    ✦ הוסיפי תמונה עדכונית ואמיתית<br>
    <p>ספרו לי על ערך אחד שחשוב לכם מאוד בבן/בת זוג</p>    <p>פשוט ענה למייל הזה עם הפרטים - אני קוראת הכל.</p>
    <hr class="divider" />
    <p>ואם יש לך שאלה על התהליך - אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, עדכון מהמאגר - השאלון שלך אצלי.\n\nשאלות? ${WHATSAPP_LINK}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_MATCHMAKING_EMAIL_3: EmailTemplate = {
  subject: "רוצה להגדיל את הסיכויים שלך?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש דרך להאיץ את התהליך</h2>
    <p>אחרי שבועיים במאגר, אני רוצה להציע לך משהו.</p>
    <p>האנשים שמוצאים התאמה הכי מהר הם אלו שמגיעים עם הבנה עמוקה של עצמם - מה הם מחפשים, מה הדפוסים שלהם, ואיך להציג את עצמם בצורה שמושכת את הצד הנכון.</p>
    <p>זה בדיוק מה שהליווי האישי שלי עושה. ואם את רוצה לדעת אם זה מתאים לך - שיחה קצרה של 15 דקות תספיק:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, רוצה להאיץ את התהליך?\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

// ─── JOURNEY 3: Men - מאגר (אחרי הצטרפות) ───────────────────────────────────

export const MEN_MATCHMAKING_EMAIL_1: EmailTemplate = {
  subject: "ברוך הבא למאגר הבלעדי ♡ הנה איך התהליך עובד",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוך הבא למאגר! ♡</h2>
    <p>קיבלתי את השאלון שלך ואני שמחה שהחלטת להצטרף. אני רוצה לספר לך בדיוק איך התהליך עובד.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0;">
      <h3 style="color:#ffe27c; font-size:18px; margin:0 0 16px; text-align:center;">איך מתבצעות ההתאמות?</h3>
      <div style="color:#fff; font-size:15px; line-height:2;">
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">1. בדיקה אישית</span> - אני עוברת על הפרופיל שלך אישית ומחפשת התאמה שמרגישה נכון - לא רק על הנייר.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">2. הצעת התאמה</span> - כשאמצא התאמה פוטנציאלית, אשלח לשניכם הצעה בנפרד בלי לחשוף פרטים של הצד השני.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">3. אישור שני הצדדים</span> - רק אם שניכם אישרו את ההתאמה, הפרטים ייחשפו ותוכלו ליצור קשר.</p>
        <p style="margin:0;"><span style="color:#ffe27c; font-weight:700;">4. הפגישה ביניכם</span> - השאר בידיכם. אני לא נמצאת בדייט ולא רואה את מה קורה ביניכם.</p>
      </div>
    </div>
    <div class="quote">
      "לא אפליקציה. לא swipe. Matchmaking אמיתי - כל חיבור עובר דרכי אישית."
    </div>
    <p>זמן ממוצע עד לחיבור הראשון: 2-4 שבועות. הדברים הטובים לוקחים זמן.</p>
    <a href="https://www.instagram.com/hilitcaspi_relationship" class="cta">לעקוב באינסטגרם ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוך הבא למאגר!\n\nאיך התהליך עובד:\n1. בדיקה אישית של הפרופיל\n2. הצעת התאמה לשני הצדדים\n3. רק אם שניכם אישרו - הפרטים ייחשפו\n4. הפגישה ביניכם\n\nזמן ממוצע: 2-4 שבועות.\n\nהילית`,
};

export const MEN_MATCHMAKING_EMAIL_2: EmailTemplate = {
  subject: "שבוע במאגר - עדכון",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדכון קצר</h2>
    <p>עבר שבוע. השאלון שלך אצלי ואני עובדת עליו.</p>
    <p>טיפ שיגדיל את הסיכויים שלך: ספרו לי על ערך אחד שחשוב לכם מאוד בבן/בת זוג - פשוט כתבו לי בוואטסאפ.</p>
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלח לי וואטסאפ ←</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, השאלון שלך אצלי.\n\nשאלות? ${WHATSAPP_LINK}\n\nהילית`,
};

export const MEN_MATCHMAKING_EMAIL_3: EmailTemplate = {
  subject: "רוצה להאיץ את התהליך?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש דרך להגדיל את הסיכויים</h2>
    <p>אחרי שבועיים במאגר - הגברים שמוצאים התאמה הכי מהר הם אלו שמגיעים עם הבנה ברורה של מה הם מחפשים.</p>
    <p>שיחה קצרה של 15 דקות יכולה לתת לך את הכלים האלה:</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nהילית`,
};

// ─── JOURNEY 4: Women - טרנספורמציה (אחרי שיחת היכרות) ─────────────────────

export const WOMEN_TRANSFORMATION_EMAIL_1: EmailTemplate = {
  subject: "אחרי השיחה שלנו - הנה הצעד הבא",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שמחתי לדבר איתך</h2>
    <p>תודה על הפתיחות ועל הכנות בשיחה שלנו. זה לא קל לשתף - ואני מעריכה את זה מאוד.</p>
    <p>כפי שדיברנו - הליווי האישי שלי הוא 8 פגישות שבהן נעבוד יחד על:</p>
    <p>✦ ה-DNA הזוגי שלך לעומק<br>
    ✦ הדפוסים שחוזרים ושוברים אותם<br>
    ✦ בניית פרופיל שמושך את הגבר הנכון<br>
    ✦ ליווי עד שאת בזוגיות שמגיעה לך</p>
    <p><strong>₪2,960</strong> (אפשרות ל-3 תשלומים) · כניסה למאגר ב-₪499 במתנה</p>
    <a href="${COACHING_PAGE}" class="cta">♡ אני רוצה להתחיל ←</a>
    <p>יש שאלות? כתבו לי בוואטסאפ - אני כאן:</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שמחתי לדבר איתך!\n\nלפרטים על הליווי האישי: ${COACHING_PAGE}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_TRANSFORMATION_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, חשבת על מה שדיברנו?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רק רציתי לבדוק</h2>
    <p>עברו כמה ימים מהשיחה שלנו. חשבת על מה שדיברנו?</p>
    <div class="quote">
      "ישבתי עם ההצעה שלה שלושה ימים. הייתי בספק. בסוף אמרתי לעצמי: אני משקיעה בעצמי. זו ההחלטה הכי טובה שעשיתי." - מיכל, 38
    </div>
    <p>אני מבינה שזו החלטה לא קטנה. ואני רוצה שתדעו - אני לא עובדת עם כולם. אני עובדת עם מי שמוכן לשינוי אמיתי.</p>
    <p>אם אתם מרגישים שזה הזמן - אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="cta">שלחו לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, חשבת על מה שדיברנו?\n\nאני כאן: ${WHATSAPP_LINK}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

export const WOMEN_TRANSFORMATION_EMAIL_3: EmailTemplate = {
  subject: "ההצעה הזו נסגרת בקרוב",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, מייל אחרון</h2>
    <p>זה המייל האחרון שאני שולחת על הנושא הזה - אני לא רוצה להציק.</p>
    <p>אבל לפני שאסגור את ההצעה - אני רוצה שתדעי:</p>
    <p>האנשים שמגיעים לליווי שלי מגיעים בדרך כלל אחרי שניסו הכל. אחרי שנים של דייטינג, אחרי ספרים ופודקאסטים ועצות מחברים. ואז הם מבינים שצריך מישהי שתלווה אותם אישית.</p>
    <p>אם אתם מרגישים שזה הזמן - קבעו שיחה נוספת:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחה נוספת ←</a>
    <p>ואם לא - אני מאחלת לכם את כל הטוב. הדרך שלכם לאהבה קיימת - גם בלי הליווי שלי.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון.\n\nאם את רוצה לקבוע שיחה נוספת: ${CALENDLY_15MIN}\n\nבאהבה,
הילית כספי
מאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

// ─── JOURNEY 4: Men - טרנספורמציה (אחרי שיחת היכרות) ───────────────────────

export const MEN_TRANSFORMATION_EMAIL_1: EmailTemplate = {
  subject: "אחרי השיחה שלנו - הנה הצעד הבא",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שמחתי לדבר איתך</h2>
    <p>תודה על הפתיחות. כפי שדיברנו - הליווי האישי שלי הוא 8 פגישות שבהן נעבוד על:</p>
    <p>✦ ה-DNA הזוגי שלך לעומק<br>
    ✦ מה עוצר אותך ואיך לשנות את זה<br>
    ✦ כלים פרקטיים שמשנים תוצאות בשטח<br>
    ✦ ליווי עד שאתה בזוגיות שמגיעה לך</p>
    <p><strong>₪2,960</strong> (אפשרות ל-3 תשלומים) · כניסה למאגר ב-₪499 במתנה</p>
    <a href="${COACHING_PAGE}" class="cta">אני רוצה להתחיל ←</a>
    <p>שאלות? <a href="https://wa.me/972552442334" class="secondary-cta">כתבו לי בוואטסאפ ←</a></p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שמחתי לדבר איתך!\n\nלפרטים על הליווי: ${COACHING_PAGE}\n\nהילית`,
};

export const MEN_TRANSFORMATION_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, חשבת על מה שדיברנו?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רק רציתי לבדוק</h2>
    <p>עברו כמה ימים. חשבת על מה שדיברנו?</p>
    <div class="quote">
      "ישבתי עם ההצעה שלה שלושה ימים. בסוף אמרתי לעצמי: אני משקיע בעצמי. זו ההחלטה הכי טובה שעשיתי." - דניאל, 41
    </div>
    <p>אם יש שאלות - אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="cta">שלח לי וואטסאפ ←</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, חשבת על מה שדיברנו?\n\nאני כאן: ${WHATSAPP_LINK}\n\nהילית`,
};

export const MEN_TRANSFORMATION_EMAIL_3: EmailTemplate = {
  subject: "מייל אחרון - ההצעה נסגרת",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, מייל אחרון</h2>
    <p>זה המייל האחרון על הנושא הזה.</p>
    <p>הגברים שמגיעים לליווי שלי מגיעים בדרך כלל אחרי שניסו הכל. ואז הם מבינים שצריך מישהי שתלווה אותם אישית - מישהי שמבינה גם את הצד הנשי.</p>
    <p>אם אתם מרגישים שזה הזמן:</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחה נוספת ←</a>
    <p>ואם לא - מאחלת לכם את כל הטוב.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון.\n\nשיחה נוספת: ${CALENDLY_15MIN}\n\nהילית`,
};

// ─── JOURNEY 5: נטישת עגלה - מדריך ─────────────────────────────────────────

export const ABANDONED_GUIDE_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, שכחת משהו...",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ראיתי שעמדת לקחת את הצעד הזה</h2>
    <p>לפני כמה דקות ביקרת בדף המדריך שלי - ועצרת.</p>
    <p>אני מבינה. לפעמים צריך רגע לחשוב. אבל רציתי לשאול אותך ישירות:</p>
    <div class="quote">
      "מה עוצר אותך? לפעמים ההתנגדות הקטנה הזו היא בדיוק הסימן שאת מוכנה לשינוי."
    </div>
    <p>המדריך "לבחור נכון - המדריך המעשי לזוגיות" נכתב בדיוק בשביל הרגע הזה - כשאת יודעת שמשהו צריך להשתנות, אבל לא בטוחה מאיפה להתחיל.</p>
    <p>ועכשיו, כי אני רוצה שתתחילו - יש לכם קופון מיוחד:</p>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:13px; color:#727272; margin:0 0 8px;">קוד הקופון שלכם:</p>
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#727272; margin:0;">10% הנחה - תקף ל-48 שעות בלבד</p>
    </div>
    <a href="${GROW_GUIDE}" class="cta">♡ לרכישת המדריך עם ההנחה ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">₪134 במקום ₪249 · תוכן דיגיטלי מיידי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שכחת משהו...\n\nיש לך קופון 10% הנחה: HILIT10\n\nלרכישת המדריך: ${GROW_GUIDE}\n\nבאהבה,\nהילית`,
};

export const ABANDONED_GUIDE_EMAIL_2: EmailTemplate = {
  subject: "הקופון שלך פג בעוד 24 שעות",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הקופון שלך עדיין מחכה</h2>
    <p>שלחתי לך אתמול קוד הנחה של 10% - ועדיין לא ניצלת אותו.</p>
    <p>אני לא רוצה להציק, אבל כן רוצה שתדעי: הקופון פג בעוד 24 שעות.</p>
    <div class="quote">
      "נועה חיכתה שבועיים לפני שרכשה. אחרי שקראה את הסוד הרביעי, היא כתבה לי: 'הייתי צריכה את זה לפני שנים.' אל תחכי."
    </div>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:13px; color:#727272; margin:0 0 8px;">קוד הקופון שלך:</p>
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#e53e3e; margin:0;">פג בעוד 24 שעות</p>
    </div>
    <a href="${GROW_GUIDE}" class="cta">♡ לרכישת המדריך עכשיו ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הקופון HILIT10 פג בעוד 24 שעות.\n\nלרכישה: ${GROW_GUIDE}\n\nהילית`,
};

export const ABANDONED_GUIDE_EMAIL_3: EmailTemplate = {
  subject: "מייל אחרון - הקופון פג הלילה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון</h2>
    <p>הקופון שלך פג הלילה בחצות. לא אשלח יותר תזכורות על זה.</p>
    <p>אבל לפני שאסגור - רציתי לשאול: מה עוצר אותך?</p>
    <p>אם יש שאלה, ספק, או סתם רציתם לדבר - אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    <p>ואם אתם מוכנים - הקופון עדיין פעיל עד חצות:</p>
    <a href="${GROW_GUIDE}" class="cta">♡ לרכישה עם קוד HILIT10 ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון - קוד HILIT10 פג הלילה.\n\nשאלות? ${WHATSAPP_LINK}\nלרכישה: ${GROW_GUIDE}\n\nהילית`,
};

// ─── JOURNEY 5: נטישת עגלה - מאגר ───────────────────────────────────────────

export const ABANDONED_DATABASE_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, המקום שלך במאגר עדיין פנוי",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ראיתי שעמדת להצטרף</h2>
    <p>ביקרת בדף המאגר הבלעדי שלי - ועצרת.</p>
    <p>אני מבינה שיש ספקות. אבל רציתי לשתף אותך במשהו:</p>
    <div class="quote">
      "רוב הנשים שמצאו זוגיות דרך המאגר שלי היססו בדיוק כמוך. הן לא היו בטוחות אם זה 'בשבילן'. ואז הן ניסו."
    </div>
    <p>המאגר שלי שונה מאפליקציות - כל חיבור עובר דרכי אישית. אני מכירה את האנשים משני הצדדים.</p>
    <p>ועכשיו, כי אני רוצה שתצטרפו - יש לכם קופון מיוחד:</p>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:13px; color:#727272; margin:0 0 8px;">קוד הקופון שלך:</p>
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#727272; margin:0;">10% הנחה - תקף ל-48 שעות בלבד</p>
    </div>
    ${urgencyBanner()}
    <a href="${GROW_DATABASE}" class="cta">♡ הצטרפו למאגר עם ההנחה ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">₪224 במקום ₪249 · כניסה מיידית</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, המקום שלך במאגר עדיין פנוי.\n\nקופון 10%: HILIT10\n\nלהצטרפות: ${GROW_DATABASE}\n\nהילית`,
};

export const ABANDONED_DATABASE_EMAIL_2: EmailTemplate = {
  subject: "הקופון שלך פג בעוד 24 שעות - המאגר מחכה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדיין יש לך מקום</h2>
    <p>הקופון שלך פג בעוד 24 שעות. רציתי לוודא שראית.</p>
    <div class="quote">
      "מיכל הצטרפה למאגר בספקנות. 6 שבועות אחרי, היא פגשה את בן הזוג שלה. היום הם מאורסים."
    </div>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#e53e3e; margin:0;">פג בעוד 24 שעות</p>
    </div>
    ${urgencyBanner()}
    <a href="${GROW_DATABASE}" class="cta">♡ להצטרפות למאגר עכשיו ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, קוד HILIT10 פג בעוד 24 שעות.\n\nלהצטרפות: ${GROW_DATABASE}\n\nהילית`,
};

export const ABANDONED_DATABASE_EMAIL_3: EmailTemplate = {
  subject: "מייל אחרון - הקופון פג הלילה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון</h2>
    <p>הקופון פג הלילה. לא אשלח יותר תזכורות.</p>
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    ${urgencyBanner()}
    <a href="${GROW_DATABASE}" class="cta">להצטרפות עם קוד HILIT10 ←</a>   <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון - קוד HILIT10 פג הלילה.\n\nלהצטרפות: ${GROW_DATABASE}\n\nהילית`,
};

// ─── JOURNEY 5: נטישת עגלה - קורס ───────────────────────────────────────────

export const ABANDONED_COURSE_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הקורס עדיין מחכה לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עמדת לעשות משהו גדול</h2>
    <p>ביקרת בדף הקורס שלי - ועצרת. אני מבינה.</p>
    <p>הקורס הזה הוא לא עוד תוכן שמצטבר בלי לפתוח. זה תהליך מובנה שמלווה אותך צעד אחר צעד - מהבנת הדפוסים שלך ועד לפגישה עם האדם הנכון.</p>
    <div class="quote">
      "עשיתי את המודול הראשון בפיג'מה, בשעה 11 בלילה. בכיתי. הבנתי דברים שלא הבנתי אחרי שנים." - שירה, 34
    </div>
    <p>ועכשיו, כי אני רוצה שתתחילו - יש לכם קופון מיוחד:</p>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:13px; color:#727272; margin:0 0 8px;">קוד הקופון שלכם:</p>
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#727272; margin:0;">10% הנחה - תקף ל-48 שעות בלבד</p>
    </div>
    <a href="${GROW_COURSE}" class="cta">♡ לרכישת הקורס עם ההנחה ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הקורס עדיין מחכה לך.\n\nקופון 10%: HILIT10\n\nלרכישה: ${GROW_COURSE}\n\nהילית`,
};

export const ABANDONED_COURSE_EMAIL_2: EmailTemplate = {
  subject: "הקופון שלך פג בעוד 24 שעות",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדיין יש לך הנחה</h2>
    <p>הקופון שלך פג בעוד 24 שעות.</p>
    <div class="quote">
      "ישבתי עם ההחלטה שלושה ימים. בסוף אמרתי לעצמי: אני משקיעה בעצמי. זו ההחלטה הכי טובה שעשיתי." - מיכל, 38
    </div>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#e53e3e; margin:0;">פג בעוד 24 שעות</p>
    </div>
    <a href="${GROW_COURSE}" class="cta">♡ לרכישת הקורס עכשיו ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, קוד HILIT10 פג בעוד 24 שעות.\n\nלרכישה: ${GROW_COURSE}\n\nהילית`,
};

export const ABANDONED_COURSE_EMAIL_3: EmailTemplate = {
  subject: "מייל אחרון - הקופון פג הלילה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון</h2>
    <p>הקופון פג הלילה. לא אשלח יותר תזכורות.</p>
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    <a href="${GROW_COURSE}" class="cta">♡ לרכישה עם קוד HILIT10 ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון - קוד HILIT10 פג הלילה.\n\nלרכישה: ${GROW_COURSE}\n\nהילית`,
};

// ─── JOURNEY 5: נטישת עגלה - ליווי ──────────────────────────────────────────

export const ABANDONED_COACHING_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, ראיתי שעמדת לעשות את הצעד הגדול",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עמדת לשנות את החיים שלך</h2>
    <p>ביקרת בדף הליווי האישי שלי - ועצרת. ואני מבינה למה.</p>
    <p>זו לא החלטה קטנה. ₪2,960 זה השקעה. ואני רוצה שתדעי - אני לא עובדת עם כולן. אני עובדת עם מי שמוכנה לשינוי אמיתי.</p>
    <p>אם יש שאלה, ספק, או סתם רציתם לדבר - שיחה קצרה של 15 דקות יכולה לתת את כל התשובות:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות חינמית ←</a>
    <p>ואם אתם מוכנים - יש לכם קופון מיוחד:</p>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:13px; color:#727272; margin:0 0 8px;">קוד הקופון שלך:</p>
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#727272; margin:0;">10% הנחה - ₪2,664 במקום ₪2,960 · תקף ל-48 שעות</p>
    </div>
    <a href="${GROW_COACHING}" class="secondary-cta">לרכישת חבילת הליווי עם ההנחה ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, עמדת לעשות את הצעד הגדול.\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\nקופון 10%: HILIT10 (₪2,664 במקום ₪2,960)\nלרכישה: ${GROW_COACHING}\n\nהילית`,
};

export const ABANDONED_COACHING_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, הקופון שלך פג בעוד 24 שעות",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדיין יש לך הנחה</h2>
    <p>הקופון שלך פג בעוד 24 שעות.</p>
    <div class="quote">
      "ישבתי עם ההצעה שלה שלושה ימים. הייתי בספק. בסוף אמרתי לעצמי: אני משקיעה בעצמי. זו ההחלטה הכי טובה שעשיתי." - מיכל, 38
    </div>
    <p>ואם יש שאלה - שיחה קצרה של 15 דקות, חינם לגמרי:</p>
    <a href="${CALENDLY_15MIN}" class="secondary-cta">♡ קביעת שיחת היכרות ←</a>
    <div style="background:#f0eadc; border-radius:12px; padding:20px; text-align:center; margin:20px 0;">
      <p style="font-size:28px; font-weight:900; color:#191265; letter-spacing:4px; margin:0 0 8px;">HILIT10</p>
      <p style="font-size:13px; color:#e53e3e; margin:0;">₪2,664 במקום ₪2,960 · פג בעוד 24 שעות</p>
    </div>
    <a href="${GROW_COACHING}" class="cta">♡ לרכישת הליווי עכשיו ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, קוד HILIT10 פג בעוד 24 שעות.\n\nשיחה: ${CALENDLY_15MIN}\nלרכישה: ${GROW_COACHING}\n\nהילית`,
};

export const ABANDONED_COACHING_EMAIL_3: EmailTemplate = {
  subject: "מייל אחרון - הקופון פג הלילה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון</h2>
    <p>הקופון פג הלילה. לא אשלח יותר תזכורות.</p>
    <p>אבל אם יש לך שאלה - אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    <a href="${GROW_COACHING}" class="cta">♡ לרכישה עם קוד HILIT10 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">₪2,664 במקום ₪2,960 - עד חצות הלילה</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מייל אחרון - קוד HILIT10 פג הלילה.\n\nלרכישה: ${GROW_COACHING}\n\nהילית`,
};

// ─── JOURNEY 6: רכישת קורס דיגיטלי ──────────────────────────────────────────

export const WOMEN_COURSE_PURCHASE_EMAIL_1: EmailTemplate = {
  subject: "ברוכה הבאה לקורס! ♡ הכל מוכן לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוכה הבאה!</h2>
    <p>כל הכבוד על ההחלט    <p>זה לא קל לעצור ולהגיד: "אני משקיע/ה בעצמי." ועשיתם את זה.</p>
    <p>הקורס "המסע" מחכה לך. הכניסה שלך פעילה:</p>
    <a href="{{courseLink}}" class="cta">♡ כניסה לקורס ←</a>
    <p><strong>טיפ לפני שמתחילים:</strong> עשו את המודול הראשון עוד היום - אפילו 20 דקות. מי שמתחיל ביום הראשון מסיים פי 3 יותר.</p>
    <div class="quote">
      "עשיתי את המודול הראשון בפיג'מה, בשעה 11 בלילה. בכיתי. הבנתי דברים שלא הבנתי אחרי שנים." - שירה, 34
    </div>
    <hr class="divider" />
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחו לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוכים הבאים לקורס!\n\nהכניסה שלך: {{courseLink}}\n\nשאלות? ${WHATSAPP_LINK}\n\nבאהבה,\nהילית`,
};

export const WOMEN_COURSE_PURCHASE_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, איך הולך עם הקורס?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סקרנית לדעת</h2>
    <p>עברו יומיים מאז שהתחלת. הגעת למודול השני?</p>
    <p>אני שואלת כי אני יודעת: המודול השני הוא המקום שבו הכי הרבה אנשים עוצרים - ובדיוק שם נמצאת הפריצה הגדולה.</p>
    <div class="quote">
      "המודול השני שבר לי את הראש. הבנתי למה אני מושכת שוב ושוב את אותו טיפוס. מאז - הכל השתנה." - נועה, 31
    </div>
    <p>אם תקועים - כתבו לי. אני קוראת ועונה אישית:</p>
    <a href="${WHATSAPP_LINK}" class="cta">שלחו לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, איך הולך עם הקורס?\n\nתקועה? ${WHATSAPP_LINK}\n\nבאהבה,\nהילית`,
};

export const WOMEN_COURSE_PURCHASE_EMAIL_3: EmailTemplate = {
  subject: "הצעד הבא אחרי הקורס",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שבוע לקורס - הצעד הבא</h2>
    <p>שבוע עבר מאז שהתחלת. אני מקווה שהקורס נתן לך כלים שאפשר ליישם.</p>
    <p>מי שמשלב את הקורס עם ליווי אישי מגיע לתוצאות הכי מהירות - כי הקורס נותן את הידע, והליווי מתרגם אותו לסיטואציה הספציפית שלכם.</p>
    <p>אם אתם רוצים ללכת עמוק יותר - שיחה קצרה של 15 דקות, חינם לגמרי:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <div class="quote">
      "עשיתי את הקורס ואחרי שבוע קבעתי שיחה עם הילית. 4 חודשים אחרי - אני בזוגיות." - ליאת, 36
    </div>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות. רק שיחה.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הצעד הבא אחרי הקורס.\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nבאהבה,\nהילית`,
};

export const MEN_COURSE_PURCHASE_EMAIL_1: EmailTemplate = {
  subject: "כל הכבוד! הקורס מוכן לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, כל הכבוד על ההחלטה!</h2>
    <p>הקורס "המסע" מחכה לך. הכניסה שלך פעילה:</p>
    <a href="{{courseLink}}" class="cta">כניסה לקורס ←</a>
    <p><strong>טיפ:</strong> עשה את המודול הראשון עוד היום - אפילו 20 דקות. זה יגדיר את כל מה שבא אחריו.</p>
    <hr class="divider" />
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלח לי וואטסאפ ←</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הקורס מוכן לך!\n\nכניסה: {{courseLink}}\n\nשאלות? ${WHATSAPP_LINK}\n\nהילית`,
};

export const MEN_COURSE_PURCHASE_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, הגעת למודול השני?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, עדכון קצר</h2>
    <p>עברו יומיים. הגעת למודול השני?</p>
    <p>המודול השני הוא המקום שבו הכי הרבה אנשים עוצרים - ובדיוק שם נמצאת הפריצה.</p>
    <p>תקועים? כתבו לי:</p>
    <a href="${WHATSAPP_LINK}" class="cta">שלח לי וואטסאפ ←</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הגעת למודול השני?\n\nתקוע? ${WHATSAPP_LINK}\n\nהילית`,
};

export const MEN_COURSE_PURCHASE_EMAIL_3: EmailTemplate = {
  subject: "הצעד הבא אחרי הקורס",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שבוע לקורס - הצעד הבא</h2>
    <p>שבוע עבר. אני מקווה שהקורס נתן לך כלים שאפשר ליישם.</p>    <p>אם אתם רוצים ללכת עמוק יותר - שיחה קצרה של 15 דקות, חינם לגמרי:</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחת היכרות (15 דקות, חינם) ←</a>yle="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הצעד הבא - שיחת היכרות חינמית.\n\nקביעה: ${CALENDLY_15MIN}\n\nהילית`,
};

// ─── Export map for easy lookup ───────────────────────────────────────────────

export type JourneyKey =
  | "women_first_step"
  | "men_first_step"
  | "women_first_step_v2"
  | "men_first_step_v2"
  | "women_guide"
  | "men_guide"
  | "women_matchmaking"
  | "men_matchmaking"
  | "women_transformation"
  | "men_transformation"
  | "abandoned_guide"
  | "abandoned_database"
  | "abandoned_course"
  | "abandoned_coaching"
  | "women_course"
  | "men_course"
  | "free_guide_nurture"
  | "sales_call_lead"
  | "meta_lead_dna"
  | "women_matchmaking_welcome"
  | "men_matchmaking_welcome"
  | "en_free_guide_nurture";

// ─── JOURNEY: Free Guide Nurture ─────────────────────────────────────────────
const WA_GROUP_LINK = "https://hilitcaspi.com/api/wa/email";
const WHATSAPP_DIRECT = "https://wa.me/972552442334";
const CALENDLY_15 = "https://hilitcaspi.com/single-session";
const GUIDE_BUY = "https://hilitcaspi.com/guide";
const DB_JOIN = "https://hilitcaspi.com/join";

const FREE_GUIDE_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, המדריך שלך מוכן - ומשהו שרציתי לספר לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, המדריך שלך כאן</h2>
    <p>שמחתי שבחרת להוריד אותו. זה לא מקרי שהגעת לכאן.</p>
    <p>לפני כמה שנים עזבתי קריירה מפוארת בהייטק. לא כי נאלצתי - כי הבנתי שמשימת חיי היא להוביל אנשים לאהבה. ראיתי יותר מדי אנשים מוכשרים, מצליחים, שלמים - שנשארים לבד לא בגלל שמשהו בהם שבור, אלא כי אף אחד לא לימד אותם את השפה הנכונה של זוגיות.</p>
    <p>את המדריך הזה כתבתי אחרי מאות שיחות עם לקוחות - סלבריטאים, רופאות, לוחמים, אנשי עסקים. כולם עם אותה תחושה: "ניסיתי הכל. כלום לא עובד."</p>
    <p>במדריך הזה תמצא/י 4 דפוסים שהמוח עושה בלי שאנחנו שמים לב, ושמעכבים אנשים ממציאת אהבה.</p>
    <a href="https://hilitcaspi.com/api/guide/download" class="cta">פתיחת המדריך החינמי ←</a>
    <div class="quote">"הדבר הכי מפתיע שגיליתי? שרוב האנשים לא חסרים אהבה. הם חסרים את הכלים לזהות אותה כשהיא עומדת מולם."</div>
    <p>ובינתיים, אפשר להצטרף לקבוצת הוואטסאפ השקטה שלי:</p>
    <a href="https://hilitcaspi.com/api/wa/email" class="secondary-cta">הצטרפות לקבוצה השקטה ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">2,400+ אנשים כבר שם. תוכן איכותי, ללא ספאם.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, המדריך שלך מוכן!\n\nפתיחה: https://hilitcaspi.com/api/guide/download\nקבוצת וואטסאפ: https://hilitcaspi.com/api/wa/email\n\nבאהבה,\nהילית`,
};

const FREE_GUIDE_EMAIL_PLACEHOLDER_REMOVE: EmailTemplate = {
  subject: "PLACEHOLDER",
  htmlBody: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#191265;padding:32px 40px;text-align:center}.header h1{color:#ffe27c;font-size:22px;margin:12px 0 4px}.body{padding:40px;color:#191265;line-height:1.8;font-size:16px;text-align:right;direction:rtl}.body h2{text-align:right}.body p{text-align:right}.cta{display:block;background:#ffe27c;color:#191265!important;font-weight:700;font-size:17px;text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;margin:28px 0}.secondary-cta{display:block;border:2px solid #191265;color:#191265!important;font-weight:600;font-size:15px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none;margin:12px 0}.quote{background:#f0eadc;border-right:4px solid #ffe27c;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;color:#444}.footer{background:#191265;padding:24px 40px;text-align:center}.footer p{color:rgba(255,255,255,.5);font-size:12px;margin:4px 0}.footer a{color:#ffe27c;text-decoration:none}</style></head><body><div class="container"><div class="header"><h1>הילית כספי</h1><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">Relationship Expert &amp; Matchmaker</p></div><div class="body"><h2>{{firstName}}, המדריך שלך כאן</h2><p>שמח/ה שבחרת להוריד אותו. זה לא מקרי שהגעת לכאן.</p><p>המדריך מכיל 4 דפוסים שהמוח עושה בלי שאנחנו שמים לב, ושמעכבים אנשים ממציאת זוגיות.</p><div style="text-align:center;margin:28px 0"><a href="https://hilitcaspi.com/api/guide/download" class="cta">פתיחת המדריך החינמי</a></div><div class="quote">"הדבר הכי מפתיע שגיליתי? שרוב האנשים לא חסרים אהבה. הם חסרים את הכלים לזהות אותה כשהיא עומדת מולם."</div><p>בימים הקרובים אשלח תובנות נוספות. ובינתיים, אפשר להצטרף לקבוצת הוואטסאפ השקטה שלי:</p><a href="https://hilitcaspi.com/api/wa/email" class="secondary-cta">הצטרפות לקבוצה השקטה שלי</a><p style="color:#727272;font-size:13px;text-align:center">2,400+ אנשים כבר שם. תוכן איכותי, ללא ספאם.</p><p>ואם רוצים לדבר, אפשר לכתוב לי ישירות:</p><a href="https://wa.me/972552442334" class="secondary-cta">וואטסאפ עם הילית</a><hr style="border:none;border-top:1px solid #f0eadc;margin:24px 0"/><p style="font-size:14px;color:#444">באהבה,<br><strong>הילית כספי</strong><br>מאמנת ומשדכת</p></div><div class="footer"><p>הילית כספי | Relationship Expert &amp; Matchmaker</p><p><a href="https://wa.me/972552442334">וואטסאפ</a> · <a href="https://www.instagram.com/hilitcaspi_relationship">אינסטגרם</a></p><p style="font-size:11px"><a href="https://hilitcaspi.com/unsubscribe?email={{recipientEmail}}" style="color:rgba(255,255,255,.4)">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  textBody: `{{firstName}}, המדריך שלך מוכן!\n\nפתיחה: https://hilitcaspi.com/api/guide/download\nקבוצת וואטסאפ: https://hilitcaspi.com/api/wa/email\n\nבאהבה,\nהילית`,
};

const FREE_GUIDE_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, תובנה ששינתה את הדרך שאני עובדת",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, תובנה ששינתה את הכל</h2>
    <p>פרופסור דניאל קאנמן מאוניברסיטת הרווארד גילה משהו שנשמע מוזר: אנשים לא יודעים מה ישמח אותם. המוח שלנו מותאם לרדוף אחר גירוי ודרישות - אבל לא אחרי אושר ועניין אמיתי.</p>
    <p>זה מה שאני רואה שוב ושוב אצל אנשים שמגיעים אלי: הם מחפשים את הדבר הלא נכון. הגובה, המשכורתה, המראה - ואחרי שנים בזוגיות שהשיגו את הכל זה - הם עדיין לא מאושרים.</p>
    <div class="quote">
      "מה שאנשים באמת צריכים זה לא גובה וקריירה. זה מישהו שירגיש אותם, שיראה אותם, שיבין אותם בלי שיצטרך להסביר."
    </div>
    <p>המדריך שהורדת מסביר את אחד מארבעת הדפוסים האלה. אם עדיין לא קראת/קראתם:</p>
    <a href="https://hilitcaspi.com/api/guide/download" class="cta">קריאת המדריך החינמי ←</a>
    <p>ואם רוצים לדעת מה הפרופיל הזוגי שלך, יש שאלון DNA קצר שלוקח 3 דקות:</p>
    <a href="https://www.hilitcaspi.com/dna-quiz" class="secondary-cta">שאלון DNA חינמי (3 דקות) ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, תובנה ששינתה את הכל.\n\nמדריך: https://hilitcaspi.com/api/guide/download\nשאלון DNA: https://www.hilitcaspi.com/dna-quiz\n\nהילית`,
};

const FREE_GUIDE_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, סיפור שחשבתי עליך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סיפור שחשבתי עליך כשקראתי אותו</h2>
    <p>ישבה מולי אישה בשם נועה. 36, עורכת דין, חכמה, יפה. אמרה לי: "הילית, אני מצליחה בכל תחום. רק באהבה אני לא מצליחה."</p>
    <p>שאלתי אותה שאלה אחת: "מה קורה כשמישהו מתעניין בך?"</p>
    <p>חשבה ואמרה: "אני מתחילה מרגישה שהוא צריך אותי יותר מאשר אני צריכה אותו. אז אני מרחיקה."</p>
    <p>זה לא בעיה שלה. זה דפוס. אחד מארבעת הדפוסים שמוסברים במדריך. שלושה חודשים אחרי שעבדנו על הדפוס הזה, נועה בזוגיות.</p>
    <div class="quote">
      "היא שלחה לי הודעה בשעה שלוש בלילה: 'הילית, הוא ראה אותי. לא את הדמות שאני מציגה - את מי שאני באמת.'"
    </div>
    <p>אם הסיפור הזה מוכר, המדריך המלא יכול לעשות את ההבדל:</p>
    <a href="https://hilitcaspi.com/guide" class="cta">מדריך 'לבחור נכון' - ₪149 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">כלים מעשיים. תרגילים. שיטה שעובדת.</p>
    <div style="background:#f0eadc; border:2px dashed #ffe27c; border-radius:12px; padding:18px 24px; margin:20px 0; text-align:center;">
      <p style="margin:0 0 6px; font-size:13px; color:#727272;">יש לך קוד מיוחד לקוראי המדריך החינמי:</p>
      <p style="margin:0 0 8px; font-size:24px; font-weight:900; color:#191265; letter-spacing:3px;">BRAIN99</p>
      <p style="margin:0; font-size:13px; color:#191265;">המחיר יירד ל-₪99 בקופה. בלעדי ולזמן מוגבל.</p>
    </div>
    <p>או אם רוצים לדבר ישירות, אפשר לקבוע שיחת היכרות חינמית:</p>
    <a href="${CALENDLY_15MIN}" class="secondary-cta">שיחת היכרות חינמית (15 דקות) ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, סיפור שחשבתי עליך.\n\nמדריך לבחור נכון: https://hilitcaspi.com/guide\nקוד קופון מיוחד: BRAIN99 (מחיר ₪99)\nאו שיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nהילית`,
};

// ─── JOURNEY: Sales Call Lead ─────────────────────────────────────────────────
// מייל 1 (מיידי): אישי, קצר, מרגיש כאילו הילית עצמה כתבה
const SALES_CALL_EMAIL_1: EmailTemplate = {
  subject: "קיבלתי את הפנייה שלך, {{firstName}}",
  htmlBody: baseTemplate(`
    <h2>{{firstName}},</h2>
    <p>קיבלתי את הפנייה שלך ושמחתי לראות אותה.</p>
    <p>אני קוראת כל פנייה בעצמי, ולכן אני רוצה לשאול אותך שאלה אחת לפני שנדבר:</p>
    <div class="quote" style="font-size:18px; font-weight:600; color:#191265; border-right:4px solid #ffe27c; padding:20px 24px;">
      מה לדעתך הכי מאתגר אצלך בדייטינג עכשיו?
    </div>
    <p>אין תשובה נכונה או לא נכונה. אני שואלת כי זה עוזר לי להגיע לשיחה שלנו מוכנה, ולתת לך את הכי הרבה ערך בזמן הקצר שיש לנו.</p>
    <p>אפשר לענות על המייל הזה ישירות, או לשלוח לי וואטסאפ:</p>
    <a href="${WHATSAPP_LINK}?text=שלום+הילית,+הכי+מאתגר+אצלי+כרגע+זה..." class="secondary-cta">שלחי לי וואטסאפ עם התשובה</a>
    <p style="color:#727272; font-size:14px;">אחזור אלייך בקרוב לתיאום השיחה.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}},\n\nקיבלתי את הפנייה שלך ושמחתי.\n\nלפני שנדבר, שאלה אחת: מה לדעתך הכי מאתגר אצלך בדייטינג עכשיו?\n\nאפשר לענות על המייל הזה, או לשלוח וואטסאפ: ${WHATSAPP_LINK}\n\nאחזור אלייך בקרוב.\nהילית`,
};

// מייל 2 (24 שעות): סיפור הצלחה של לקוחה דומה - בונה אמון
const SALES_CALL_EMAIL_2: EmailTemplate = {
  subject: "סיפור שחשבתי עלייך כשקראתי אותו",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי לשתף אותך במשהו</h2>
    <p>לפני כמה חודשים הגיעה אלי רחל. 41, עורכת דין מצליחה, חכמה, יפה. אחרי 3 שנים של תאריכים שלא הובילו לשום מקום.</p>
    <p>היא אמרה לי: "ניסיתי הכל. אפליקציות, שדכנים, חברים שמכירים. אני מתחילה לחשוב שאולי אני פשוט לא בשבילה."</p>
    <p>שאלתי אותה שאלה אחת: "מה קורה אחרי 3-4 פגישות עם מישהו שמוצא חן בעינייך?"</p>
    <p>חשבה ואמרה: "בדרך כלל אחרי כמה דייטים אני מרגישה שמשהו חסר. שאין מספיק ניצוץ."</p>
    <p>זה לא בעיה של רחל. זה דפוס. ואני ראיתי אותו מאות פעמים.</p>
    <div class="quote">
      "3 חודשים אחרי שהתחלנו לעבוד ביחד, רחל בזוגיות. לא בגלל שמצאה מישהו 'מרגש יותר'. בגלל שהבינה מה היא באמת מחפשת ואיך לזהות את זה."
    </div>
    <p>בשיחה שלנו נדבר בדיוק על הדפוס שלך. ואני אגיד לך בכנות מה אני רואה.</p>
    <a href="${CALENDLY_15MIN}&utm_campaign=sales_call_lead" class="cta">קביעת שיחת ההיכרות (15 דקות, חינם)</a>
    <p style="color:#727272; font-size:13px; text-align:center;">השיחה חינמית לגמרי. בלי מחויבות.</p>
    ${emailSignature()}
  `),
  textBody: `{{firstName}},\n\nרציתי לשתף אותך בסיפור של רחל - לקוחה שהגיעה אלי אחרי 3 שנים של תאריכים שלא הובילו לשום מקום.\n\n3 חודשים אחרי שהתחלנו לעבוד ביחד, היא בזוגיות.\n\nבשיחה שלנו נדבר על הדפוס שלך.\n\nקביעת שיחה (חינם): ${CALENDLY_15MIN}&utm_campaign=sales_call_lead\n\nהילית`,
};

// מייל 3 (48 שעות): "שמרתי לך מקום" + Calendly CTA
const SALES_CALL_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, שמרתי לך מקום לשיחה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}},</h2>
    <p>שמרתי לך מקום בלוח הזמנים שלי לשיחת היכרות.</p>
    <p>אני לא עובדת עם כולם. אני עובדת עם מי שמוכן/ה לשינוי אמיתי, ומי שמוכן/ה להשקיע בעצמו/ה.</p>
    <p>הפנייה שלך אמרה לי שאת/ה אחד/ת מהאנשים האלה.</p>
    <div style="background:#f0eadc; border-radius:16px; padding:28px 32px; margin:24px 0; text-align:center;">
      <p style="font-size:15px; color:#191265; font-weight:700; margin:0 0 8px;">שיחת היכרות אישית עם הילית</p>
      <p style="font-size:14px; color:#555; margin:0 0 20px;">15 דקות. חינמי לגמרי. ללא מחויבות.</p>
      <p style="font-size:13px; color:#727272; margin:0 0 20px;">בשיחה נבין יחד מה עוצר אותך ומה הצעד הנכון עבורך.</p>
      <a href="${CALENDLY_15MIN}&utm_campaign=sales_call_lead" style="display:inline-block; background:#ffe27c; color:#191265; font-weight:700; font-size:16px; padding:14px 32px; border-radius:12px; text-decoration:none;">קביעת השיחה עכשיו</a>
    </div>
    <p>אם המקום הזה לא יתפס, אני אצטרך לתת אותו למישהו/ת אחר/ת.</p>
    <p>אם יש שאלה לפני השיחה, אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחי לי וואטסאפ</a>
    ${emailSignature()}
  `),
  textBody: `{{firstName}},\n\nשמרתי לך מקום לשיחת היכרות.\n\nקביעת שיחה (15 דקות, חינם): ${CALENDLY_15MIN}&utm_campaign=sales_call_lead\n\nשאלות? וואטסאפ: ${WHATSAPP_LINK}\n\nהילית`,
};

// ─── JOURNEY: Meta Lead DNA ───────────────────────────────────────────────────
const META_LEAD_DNA_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הנה שאלון ה-DNA שביקשת 💛",
  htmlBody: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#191265;padding:32px 40px;text-align:center}.header h1{color:#ffe27c;font-size:22px;margin:12px 0 4px}.body{padding:40px;color:#191265;line-height:1.8;font-size:16px;text-align:right;direction:rtl}.body h2{text-align:right}.body p{text-align:right}.cta{display:block;background:#ffe27c;color:#191265!important;font-weight:700;font-size:17px;text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;margin:28px 0}.secondary-cta{display:block;border:2px solid #191265;color:#191265!important;font-weight:600;font-size:15px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none;margin:12px 0}.quote{background:#f0eadc;border-right:4px solid #ffe27c;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;color:#444}.footer{background:#191265;padding:24px 40px;text-align:center}.footer p{color:rgba(255,255,255,.5);font-size:12px;margin:4px 0}.footer a{color:#ffe27c;text-decoration:none}</style></head><body><div class="container"><div class="header"><h1>הילית כספי</h1><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">Relationship Expert &amp; Matchmaker</p></div><div class="body"><h2>{{firstName}}, הנה שאלון ה-DNA שלך</h2><p>שמחתי שהתעניינת! שאלון ה-DNA הזוגי שלי לוקח 3 דקות ומגלה את הפרופיל הזוגי שלך.</p><p>אחרי שתסיים, תקבל:</p><p>✦ הפרופיל הזוגי שלך<br>✦ הכוח הזוגי הגדול ביותר שלך<br>✦ האתגר שחוזר ואיך לשבור אותו<br>✦ מי ההתאמה המושלמת עבורך</p><a href="https://www.hilitcaspi.com/dna-quiz" class="cta">התחלת שאלון ה-DNA (3 דקות)</a><div class="quote">"אחרי שאלון ה-DNA הבנתי בדיוק למה כל הקשרים שלי נגמרו אותו דבר. זה שינה הכל." - נועה, 34</div><p>ובינתיים, מוזמנים להצטרף לקבוצת הוואטסאפ השקטה שלי:</p><a href="https://hilitcaspi.com/api/wa/email" class="secondary-cta">הצטרפות לקבוצה השקטה שלי</a><hr style="border:none;border-top:1px solid #f0eadc;margin:24px 0"/><p style="font-size:14px;color:#444">באהבה,<br><strong>הילית כספי</strong></p></div><div class="footer"><p>הילית כספי | Relationship Expert &amp; Matchmaker</p><p style="font-size:11px"><a href="https://hilitcaspi.com/unsubscribe?email={{recipientEmail}}" style="color:rgba(255,255,255,.4)">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  textBody: `{{firstName}}, הנה שאלון ה-DNA שביקשת!\n\nשאלון: https://www.hilitcaspi.com/dna-quiz\nקבוצת וואטסאפ: https://hilitcaspi.com/api/wa/email\n\nהילית`,
};

const META_LEAD_DNA_EMAIL_2: EmailTemplate = {
  subject: "השלמת את השאלון? הנה מה שמחכה לך",
  htmlBody: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#191265;padding:32px 40px;text-align:center}.header h1{color:#ffe27c;font-size:22px;margin:12px 0 4px}.body{padding:40px;color:#191265;line-height:1.8;font-size:16px;text-align:right;direction:rtl}.body h2{text-align:right}.body p{text-align:right}.cta{display:block;background:#ffe27c;color:#191265!important;font-weight:700;font-size:17px;text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;margin:28px 0}.secondary-cta{display:block;border:2px solid #191265;color:#191265!important;font-weight:600;font-size:15px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none;margin:12px 0}.quote{background:#f0eadc;border-right:4px solid #ffe27c;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;color:#444}.footer{background:#191265;padding:24px 40px;text-align:center}.footer p{color:rgba(255,255,255,.5);font-size:12px;margin:4px 0}.footer a{color:#ffe27c;text-decoration:none}</style></head><body><div class="container"><div class="header"><h1>הילית כספי</h1><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">Relationship Expert &amp; Matchmaker</p></div><div class="body"><h2>{{firstName}}, הצעד הבא</h2><p>אם כבר עשית את שאלון ה-DNA, כל הכבוד! אם עוד לא, זה לוקח 3 דקות:</p><a href="https://www.hilitcaspi.com/dna-quiz" class="cta">שאלון ה-DNA (3 דקות)</a><p>אחרי שתסיים את השאלון, הצעד הטבעי הבא הוא להיכנס למאגר הרווקים. שם יש 3,000+ רווקים, כולם עברו אבחון DNA, וההתאמות מבוססות על האלגוריתם שלי.</p><div style="background:#f9f6f0;border-radius:12px;padding:20px 24px;margin:20px 0"><p style="font-size:15px;color:#191265;font-weight:700;margin:0 0 8px">כניסה למאגר הרווקים</p><p style="font-size:14px;color:#555;margin:0 0 12px">249 ש"ח. התאמות מבוססות אלגוריתם + אישור אישי שלי.</p><a href="https://hilitcaspi.com/join" style="display:inline-block;background:#191265;color:white;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">כניסה למאגר</a></div><hr style="border:none;border-top:1px solid #f0eadc;margin:24px 0"/><p style="font-size:14px;color:#444">באהבה,<br><strong>הילית כספי</strong></p></div><div class="footer"><p>הילית כספי | Relationship Expert &amp; Matchmaker</p><p style="font-size:11px"><a href="https://hilitcaspi.com/unsubscribe?email={{recipientEmail}}" style="color:rgba(255,255,255,.4)">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  textBody: `{{firstName}}, השלמת את השאלון?\n\nשאלון: https://www.hilitcaspi.com/dna-quiz\nמאגר רווקים: https://hilitcaspi.com/join\n\nהילית`,
};

const META_LEAD_DNA_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, קוד קופון מיוחד בשבילך",
  htmlBody: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><style>body{margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif;direction:rtl}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#191265;padding:32px 40px;text-align:center}.header h1{color:#ffe27c;font-size:22px;margin:12px 0 4px}.body{padding:40px;color:#191265;line-height:1.8;font-size:16px;text-align:right;direction:rtl}.body h2{text-align:right}.body p{text-align:right}.cta{display:block;background:#ffe27c;color:#191265!important;font-weight:700;font-size:17px;text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;margin:28px 0}.secondary-cta{display:block;border:2px solid #191265;color:#191265!important;font-weight:600;font-size:15px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none;margin:12px 0}.quote{background:#f0eadc;border-right:4px solid #ffe27c;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;color:#444}.footer{background:#191265;padding:24px 40px;text-align:center}.footer p{color:rgba(255,255,255,.5);font-size:12px;margin:4px 0}.footer a{color:#ffe27c;text-decoration:none}</style></head><body><div class="container"><div class="header"><h1>הילית כספי</h1><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">Relationship Expert &amp; Matchmaker</p></div><div class="body"><h2>{{firstName}}, מתנה קטנה ממני</h2><p>עברו כמה ימים מאז שנרשמת. רציתי לוודא שלא מפסידים:</p><div style="background:#191265;border-radius:12px;padding:24px;margin:24px 0;text-align:center"><p style="color:#ffe27c;font-size:14px;font-weight:700;margin:0 0 8px;letter-spacing:1px">קוד הקופון שלך</p><p style="color:#fff;font-size:32px;font-weight:900;margin:0 0 8px;letter-spacing:3px">HILIT10</p><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">10% הנחה על כל המוצרים</p></div><p>הקוד תקף לכל המוצרים:</p><a href="https://hilitcaspi.com/api/guide/download" class="secondary-cta">המדריך החינמי (0 ש"ח)</a><a href="https://hilitcaspi.com/guide" class="secondary-cta">המדריך "לבחור נכון" (249 ש"ח)</a>${urgencyBanner()}
<a href="https://hilitcaspi.com/join" class="cta">כניסה למאגר הרווקים (499 ש"ח)</a><a href="https://hilitcaspi.com/single-session" class="secondary-cta">שיחת התאמה חינמית</a><hr style="border:none;border-top:1px solid #f0eadc;margin:24px 0"/><p style="font-size:14px;color:#444">באהבה,<br><strong>הילית כספי</strong></p></div><div class="footer"><p>הילית כספי | Relationship Expert &amp; Matchmaker</p><p style="font-size:11px"><a href="https://hilitcaspi.com/unsubscribe?email={{recipientEmail}}" style="color:rgba(255,255,255,.4)">הסרה מרשימת התפוצה</a></p></div></div></body></html>`,
  textBody: `{{firstName}}, קוד קופון מיוחד: HILIT10 (10% הנחה)\n\nמאגר: https://hilitcaspi.com/join\nמדריך: https://hilitcaspi.com/guide\nשיחה: https://hilitcaspi.com/single-session\n\nהילית`,
};

export const EMAIL_SEQUENCES: Record<JourneyKey, EmailTemplate[]> = {
  women_first_step: [WOMEN_FIRST_STEP_EMAIL_1, WOMEN_FIRST_STEP_EMAIL_2, WOMEN_FIRST_STEP_EMAIL_3],
  men_first_step: [MEN_FIRST_STEP_EMAIL_1, MEN_FIRST_STEP_EMAIL_2, MEN_FIRST_STEP_EMAIL_3],
  // v2 sequences defined below (after template declarations)
  women_first_step_v2: [] as EmailTemplate[],
  men_first_step_v2: [] as EmailTemplate[],
  women_guide: [WOMEN_GUIDE_PURCHASE_EMAIL_1, WOMEN_GUIDE_PURCHASE_EMAIL_REMINDER, WOMEN_GUIDE_PURCHASE_EMAIL_2, WOMEN_GUIDE_PURCHASE_EMAIL_3],
  men_guide: [MEN_GUIDE_PURCHASE_EMAIL_1, MEN_GUIDE_PURCHASE_EMAIL_REMINDER, MEN_GUIDE_PURCHASE_EMAIL_2, MEN_GUIDE_PURCHASE_EMAIL_3],
  women_matchmaking: [WOMEN_MATCHMAKING_EMAIL_1, WOMEN_MATCHMAKING_EMAIL_2, WOMEN_MATCHMAKING_EMAIL_3],
  men_matchmaking: [MEN_MATCHMAKING_EMAIL_1, MEN_MATCHMAKING_EMAIL_2, MEN_MATCHMAKING_EMAIL_3],
  women_transformation: [WOMEN_TRANSFORMATION_EMAIL_1, WOMEN_TRANSFORMATION_EMAIL_2, WOMEN_TRANSFORMATION_EMAIL_3],
  men_transformation: [MEN_TRANSFORMATION_EMAIL_1, MEN_TRANSFORMATION_EMAIL_2, MEN_TRANSFORMATION_EMAIL_3],
  // Abandoned cart sequences (with 10% coupon HILIT10)
  abandoned_guide: [ABANDONED_GUIDE_EMAIL_1, ABANDONED_GUIDE_EMAIL_2, ABANDONED_GUIDE_EMAIL_3],
  abandoned_database: [ABANDONED_DATABASE_EMAIL_1, ABANDONED_DATABASE_EMAIL_2, ABANDONED_DATABASE_EMAIL_3],
  abandoned_course: [ABANDONED_COURSE_EMAIL_1, ABANDONED_COURSE_EMAIL_2, ABANDONED_COURSE_EMAIL_3],
  abandoned_coaching: [ABANDONED_COACHING_EMAIL_1, ABANDONED_COACHING_EMAIL_2, ABANDONED_COACHING_EMAIL_3],
  // Course purchase sequences
  women_course: [WOMEN_COURSE_PURCHASE_EMAIL_1, WOMEN_COURSE_PURCHASE_EMAIL_2, WOMEN_COURSE_PURCHASE_EMAIL_3],
  men_course: [MEN_COURSE_PURCHASE_EMAIL_1, MEN_COURSE_PURCHASE_EMAIL_2, MEN_COURSE_PURCHASE_EMAIL_3],
  // New Meta / free guide journeys
  free_guide_nurture: [FREE_GUIDE_EMAIL_1, FREE_GUIDE_EMAIL_2, FREE_GUIDE_EMAIL_3],
  sales_call_lead: [SALES_CALL_EMAIL_1, SALES_CALL_EMAIL_2, SALES_CALL_EMAIL_3],
  meta_lead_dna: [META_LEAD_DNA_EMAIL_1, META_LEAD_DNA_EMAIL_2, META_LEAD_DNA_EMAIL_3],
  // Matchmaking welcome sequences (populated after template declarations)
  women_matchmaking_welcome: [] as EmailTemplate[],
  men_matchmaking_welcome: [] as EmailTemplate[],
  // English sequences for US market (populated after template declarations)
  en_free_guide_nurture: [] as EmailTemplate[],
};

/**
 * Replace template variables in email content.
 * Optionally injects a personalized unsubscribe link when email + leadId are provided.
 */
export function renderTemplate(
  template: EmailTemplate,
  vars: Record<string, string>,
  recipientEmail?: string,
  leadId?: number
): EmailTemplate {
  let html = template.htmlBody;
  let text = template.textBody;
  let subject = template.subject;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    html = html.replaceAll(placeholder, value);
    text = text.replaceAll(placeholder, value);
    subject = subject.replaceAll(placeholder, value);
  }
  // Inject personalized unsubscribe token
  if (recipientEmail && leadId) {
    const token = Buffer.from(`${leadId}:${recipientEmail}`).toString("base64");
    const personalizedLink = `${UNSUBSCRIBE_BASE}?token=${encodeURIComponent(token)}`;
    const genericLink = `${UNSUBSCRIBE_BASE}?email=${encodeURIComponent(recipientEmail)}`;
    html = html.replace(genericLink, personalizedLink);
    html = html.replace(UNSUBSCRIBE_BASE, personalizedLink);
  }
  return { subject, htmlBody: html, textBody: text };
}

// ─── MATCHMAKING EMAILS ───────────────────────────────────────────────────────

/**
 * Match proposal email   sent to both parties when Hilit approves a match
 * Variables: {{firstName}}, {{matchFirstName}}, {{matchAge}}, {{matchCity}},
 *            {{matchOccupation}}, {{compatibilityScore}}, {{hilitsNote}},
 *            {{yesUrl}}, {{noUrl}}, {{matchId}}
 */
export function buildMatchProposalEmail(params: {
  firstName: string;
  recipientGender?: "male" | "female" | "other";
  matchFirstName: string;
  matchAge: number;
  matchCity: string;
  matchOccupation?: string;
  matchDnaType?: string;
  matchPhotoUrl?: string;
  matchEducation?: string | null;
  matchHasKids?: boolean | null;
  matchNumKids?: number | null;
  matchWantsKids?: string | null;
  matchReligiosity?: string | null;
  compatibilityScore: number;
  hilitsNote: string;
  yesUrl: string;
  noUrl: string;
  recipientEmail: string;
  singleId: number;
  trackingPixelUrl?: string;
}): EmailTemplate {
  const isFemale = params.recipientGender === "female";
  const isMale = params.recipientGender === "male";
  const dnaLabel = params.matchDnaType
    ? (isFemale ? DNA_PROFILES[params.matchDnaType]?.label_m ?? "" : DNA_PROFILES[params.matchDnaType]?.label_f ?? DNA_PROFILES[params.matchDnaType]?.label_m ?? "")
    : "";
  const occupationLine = params.matchOccupation
    ? `<p style="margin:4px 0; color:rgba(255,255,255,0.8); font-size:14px;">💼 ${params.matchOccupation}</p>`
    : "";
  const dnaLine = dnaLabel
    ? `<p style="margin:4px 0; color:#ffe27c; font-size:13px; font-weight:600;">🧬 ${dnaLabel}</p>`
    : "";
  const educationLine = params.matchEducation
    ? `<p style="margin:4px 0; color:rgba(255,255,255,0.8); font-size:14px;">🎓 ${params.matchEducation}</p>`
    : "";
  const kidsStatus = params.matchHasKids != null
    ? (params.matchHasKids ? `יש ילדים${params.matchNumKids ? ` (${params.matchNumKids})` : ""}` : "אין ילדים")
    : null;
  const wantsKidsLabel: Record<string, string> = { yes: "רוצה ילדים", no: "לא רוצה ילדים", open: "פתוח לנושא" };
  const kidsLine = kidsStatus
    ? `<p style="margin:4px 0; color:rgba(255,255,255,0.8); font-size:14px;">👶 ${kidsStatus}${params.matchWantsKids ? ` · ${wantsKidsLabel[params.matchWantsKids] || params.matchWantsKids}` : ""}</p>`
    : "";
  const religiosityLabels: Record<string, string> = { secular: "חילוני/ת", traditional: "מסורתי/ת", religious: "דתי/ה", orthodox: "חרדי/ת" };
  const religiosityLine = params.matchReligiosity
    ? `<p style="margin:4px 0; color:rgba(255,255,255,0.8); font-size:14px;">✡️ ${religiosityLabels[params.matchReligiosity] || params.matchReligiosity}</p>`
    : "";

  const content = `
    <!-- Instruction note at top -->
    <div style="background:#fff3cd; border:1.5px solid #ffe27c; border-radius:10px; padding:12px 18px; margin-bottom:20px; text-align:center;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0;">📌 את התגובה יש להזין בתחתית המייל</p>
    </div>

    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">יש לך הצעה, ${params.firstName} 💛</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      מצאתי עבורך התאמה שחשבתי עליה הרבה לפני שהחלטתי לשלוח אותה ${isFemale ? "אלייך" : "אליך"}.
      לא כל ההצעות מגיעות ${isFemale ? "אלייך" : "אליך"}, רק אלו שאני מאמינה בהן.
    </p>

    <!-- Compatibility score badge -->
    <div style="background:#191265; border-radius:16px; padding:28px 32px; margin:24px 0; text-align:center;">
      <p style="color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 6px; letter-spacing:1px;">אחוז ההתאמה שלכם</p>
      <div style="font-size:52px; font-weight:900; color:#ffe27c; line-height:1;">${params.compatibilityScore}%</div>
      <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:8px 0 0;">מבוסס על שאלון פסיכולוגי + ניתוח DNA זוגי</p>
    </div>

    <!-- Match profile (no last name, no phone) -->
    <div style="background:#f9f6f0; border-radius:14px; padding:24px 28px; margin:20px 0;">
      <p style="color:#191265; font-size:13px; font-weight:700; margin:0 0 12px; letter-spacing:0.5px;">✨ ההתאמה שלך</p>
      <div style="background:#191265; border-radius:12px; padding:20px 24px; text-align:center;">
        ${params.matchPhotoUrl ? `<a href="${params.matchPhotoUrl}" target="_blank" rel="noopener noreferrer" style="display:block; margin-bottom:16px; text-decoration:none;"><img src="${params.matchPhotoUrl}" alt="${params.matchFirstName}" style="width:200px; height:200px; border-radius:16px; object-fit:cover; object-position:center 20%; border:3px solid #ffe27c; display:block; margin-left:auto; margin-right:auto;" /></a>` : ""}
        <p style="color:#ffffff; font-size:22px; font-weight:800; margin:0 0 4px;">${params.matchFirstName}</p>
        <p style="margin:4px 0; color:rgba(255,255,255,0.8); font-size:14px;">🎂 ${params.matchAge} · 📍 ${params.matchCity}</p>
        ${occupationLine}
        ${educationLine}
        ${religiosityLine}
        ${kidsLine}
        ${dnaLine}
      </div>
    </div>

        <!-- Below 80% personal note from Hilit -->
    ${params.compatibilityScore < 80 ? `
    <div style="background:#fff3cd; border-right:4px solid #ffe27c; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 8px;">✨ הערה אישית מהילית</p>
      <p style="font-size:14px; color:#333; line-height:1.8; margin:0;">
        אני יודעת שההתאמה הזו מתחת לרף ה-80% שאני בדרך כלל שומרת עליו — אבל היא קפצה לי, ואני מאמינה בה.
        לפעמים יש ירידה קלה באחוזים בגלל דברים פחות מהותיים בעיני, ואני בוחרת לשחרר אותה כי אני מוצאת בה קסם ופוטנציאל אמיתי.
        <br><br>
        <strong>לפי המחקרים, התאמות מעל 60% נחשבות טובות מאוד</strong> — וגם ההתאמה שלכם גבוהה ומבטיחה. 💛
      </p>
      <p style="font-size:12px; color:#727272; margin:10px 0 0; text-align:left;">הילית כספי</p>
    </div>` : ""}
    <!-- Hilit's personal note -->
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:20px 24px; margin:20px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 8px;">💬 המלצה אישית שלי</p>
      <p style="font-size:15px; color:#333; line-height:1.9; margin:0; font-style:italic;">"${params.hilitsNote}"</p>
      <p style="font-size:13px; color:#727272; margin:12px 0 0; text-align:left;">הילית כספי</p>
    </div>

    <p style="color:#444; font-size:15px; line-height:1.8; margin:20px 0;">
      אם ההצעה מעניינת ${isFemale ? "אותך" : "אותך"}, ${isFemale ? "לחצי" : "לחץ"} על "כן, מעניין אותי".
      אם גם הצד השני יגיד כן, אשלח לכם את הפרטים המלאים של אחד על השני.
      <br><br>
      <strong>אין מחויבות. אין לחץ. רק הזדמנות.</strong>
    </p>

    <!-- CTA buttons -->
    <a href="${params.yesUrl}" style="display:block; background:#ffe27c; color:#191265 !important; font-weight:800; font-size:18px; text-align:center; padding:18px 32px; border-radius:14px; text-decoration:none; margin:16px 0;">
      💛 כן, מעניין אותי
    </a>
    <a href="${params.noUrl}" style="display:block; border:2px solid #ddd; color:#727272 !important; font-weight:500; font-size:15px; text-align:center; padding:12px 24px; border-radius:12px; text-decoration:none; margin:8px 0;">
      לא בשלב הזה
    </a>

    <p style="color:#aaa; font-size:12px; text-align:center; margin-top:16px;">
      ההצעה תקפה ל-48 שעות. הפרטים האישיים נחשפים רק אחרי אישור הדדי.
    </p>

    ${emailSignature()}
    ${params.trackingPixelUrl ? `<img src="${params.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />` : ""}
  `;

  return {
    subject: `💛 יש לך התאמה שמחכה לך! ${params.compatibilityScore}%`,
    htmlBody: baseTemplate(content, params.recipientEmail, params.singleId),
    textBody: `שלום ${params.firstName},\n\nיש לך הצעת התאמה חדשה!\n\nאחוז התאמה: ${params.compatibilityScore}%\nהתאמה: ${params.matchFirstName}, ${params.matchAge}, ${params.matchCity}\n\nלאישור: ${params.yesUrl}\nלדחייה: ${params.noUrl}\n\nהילית כספי`,
  };
}

/**
 * Contact reveal email   sent to both parties after mutual approval
 * Variables: firstName, matchFirstName, matchLastName, matchPhone, matchEmail,
 *            matchAge, matchCity, matchOccupation, matchDnaType, preDateTip, gender
 */
export function buildContactRevealEmail(params: {
  firstName: string;
  gender: "male" | "female" | "other";
  matchFirstName: string;
  matchLastName?: string;
  matchPhone: string;
  matchEmail: string;
  matchAge: number;
  matchCity: string;
  matchOccupation?: string;
  matchDnaType?: string;
  compatibilityScore: number;
  preDateTip: string;
  recipientEmail: string;
  singleId: number;
}): EmailTemplate {
  const dnaProfile = params.matchDnaType ? DNA_PROFILES[params.matchDnaType] : null;
  const dnaSection = dnaProfile ? `
    <div style="background:#f0f4ff; border-right:4px solid #191265; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">🧬 הפרופיל הזוגי של ${params.matchFirstName}</p>
      <p style="font-size:15px; color:#333; line-height:1.8; margin:0;">${params.gender === "female" ? dnaProfile.label_m : dnaProfile.label_f}   ${dnaProfile.subtitle}</p>
    </div>` : "";

  const content = `
    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">זה קרה! שניכם אמרתם כן 💛</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      ${params.firstName}, אני שמחה לשתף אותך   גם הצד השני מעוניין.
      הנה הפרטים המלאים של ההתאמה שלך:
    </p>

    <!-- Match full details -->
    <div style="background:#191265; border-radius:16px; padding:28px 32px; margin:24px 0;">
      <p style="color:#ffe27c; font-size:13px; font-weight:700; margin:0 0 16px; letter-spacing:1px; text-align:center;">✨ ההתאמה שלך   ${params.compatibilityScore}%</p>
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.6); font-size:14px; width:40%;">שם מלא</td>
          <td style="padding:8px 0; color:#ffffff; font-size:16px; font-weight:700;">${params.matchFirstName}${params.matchLastName ? " " + params.matchLastName : ""}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.6); font-size:14px;">טלפון</td>
          <td style="padding:8px 0; color:#ffe27c; font-size:16px; font-weight:700;"><a href="tel:${params.matchPhone}" style="color:#ffe27c; text-decoration:none;">${params.matchPhone}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.6); font-size:14px;">מייל</td>
          <td style="padding:8px 0; color:rgba(255,255,255,0.8); font-size:14px;">${params.matchEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:rgba(255,255,255,0.6); font-size:14px;">גיל ועיר</td>
          <td style="padding:8px 0; color:rgba(255,255,255,0.8); font-size:14px;">${params.matchAge} · ${params.matchCity}</td>
        </tr>
        ${params.matchOccupation ? `<tr><td style="padding:8px 0; color:rgba(255,255,255,0.6); font-size:14px;">עיסוק</td><td style="padding:8px 0; color:rgba(255,255,255,0.8); font-size:14px;">${params.matchOccupation}</td></tr>` : ""}
      </table>
    </div>

    ${dnaSection}

    <!-- Pre-date tip -->
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:20px 24px; margin:20px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 8px;">💡 טיפ שלי לפני הפגישה הראשונה</p>
      <p style="font-size:15px; color:#333; line-height:1.9; margin:0; font-style:italic;">"${params.preDateTip}"</p>
      <p style="font-size:13px; color:#727272; margin:12px 0 0; text-align:left;">  הילית כספי</p>
    </div>

    <p style="color:#444; font-size:15px; line-height:1.8; margin:20px 0;">
      אני מאחלת לכם פגישה נפלאה! 🤍<br>
      אם יש שאלות, תמיד אפשר לפנות אלי.
    </p>

    <a href="${WHATSAPP_LINK}" style="display:block; background:#25D366; color:#fff !important; font-weight:700; font-size:16px; text-align:center; padding:14px 28px; border-radius:12px; text-decoration:none; margin:16px 0;">
      💬 שלחי לי הודעה בוואטסאפ
    </a>

    ${emailSignature()}
  `;

  return {
    subject: `שניכם אמרתם כן! הנה הפרטים של ${params.matchFirstName} 💛`,
    htmlBody: baseTemplate(content, params.recipientEmail, params.singleId),
    textBody: `שלום ${params.firstName},\n\nשניכם אמרתם כן!\n\nשם: ${params.matchFirstName}${params.matchLastName ? " " + params.matchLastName : ""}\nטלפון: ${params.matchPhone}\nמייל: ${params.matchEmail}\n\nטיפ לפני הפגישה: ${params.preDateTip}\n\nהילית כספי`,
  };
}

/**
 * Match rejection response   sent when someone clicks "not at this stage"
 */
export function buildMatchRejectionAckEmail(params: {
  firstName: string;
  recipientEmail: string;
  singleId: number;
}): EmailTemplate {
  const content = `
    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">קיבלתי, ${params.firstName} 🤍</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      תודה שענית   זה עוזר לי להבין מה מתאים לך יותר.
    </p>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      אני ממשיכה לחפש עבורך. כשתהיה התאמה שאני מאמינה בה, אשלח אלייך.
    </p>
    <div class="quote">
      "ההתאמה הנכונה לא תמיד מגיעה ראשונה   אבל כשהיא מגיעה, תרגישי את זה."
    </div>
    ${emailSignature()}
  `;

  return {
    subject: "קיבלתי את תגובתך 🤍",
    htmlBody: baseTemplate(content, params.recipientEmail, params.singleId),
    textBody: `שלום ${params.firstName},\n\nקיבלתי את תגובתך. אני ממשיכה לחפש עבורך.\n\nהילית כספי`,
  };
}

/**
 * Email to Hilit (owner) when she clicks "Approve" in CRM.
 * She sees the match details and can click "Send to both" to trigger the proposal emails.
 */
export function buildOwnerMatchApprovalEmail(params: {
  singleAFirstName: string;
  singleAAge: number;
  singleACity: string;
  singleAOccupation?: string;
  singleADna?: string;
  singleAPhotoUrl?: string;
  singleBFirstName: string;
  singleBAge: number;
  singleBCity: string;
  singleBOccupation?: string;
  singleBDna?: string;
  singleBPhotoUrl?: string;
  score: number;
  approveUrl: string;
  rejectUrl: string;
  matchId: number;
}): { subject: string; htmlBody: string; textBody: string } {
  const dnaLabelA = params.singleADna ? (DNA_PROFILES[params.singleADna]?.label_f ?? params.singleADna) : "";
  const dnaLabelB = params.singleBDna ? (DNA_PROFILES[params.singleBDna]?.label_f ?? params.singleBDna) : "";
  const content = `
    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">💛 התאמה חדשה ממתינה לאישורך</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      מצאתי התאמה פוטנציאלית עם ציון <strong>${params.score}%</strong>. הנה הפרטים:
    </p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr style="background:#f0eadc;">
        <th style="padding:12px; text-align:right; color:#191265; border:1px solid #e0d8cc;">צד א׳</th>
        <th style="padding:12px; text-align:right; color:#191265; border:1px solid #e0d8cc;">צד ב׳</th>
      </tr>
      <tr>
        <td style="padding:12px; border:1px solid #e0d8cc; vertical-align:top; text-align:center;">
          ${params.singleAPhotoUrl ? `<a href="${params.singleAPhotoUrl}" target="_blank" rel="noopener noreferrer"><img src="${params.singleAPhotoUrl}" alt="${params.singleAFirstName}" style="width:140px; height:140px; border-radius:12px; object-fit:cover; object-position:center 20%; border:2px solid #191265; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;" /></a>` : ""}
          <strong>${params.singleAFirstName}</strong><br/>
          גיל: ${params.singleAAge}<br/>
          עיר: ${params.singleACity}<br/>
          ${params.singleAOccupation ? `עיסוק: ${params.singleAOccupation}<br/>` : ""}
          ${dnaLabelA ? `DNA: ${dnaLabelA}` : ""}
        </td>
        <td style="padding:12px; border:1px solid #e0d8cc; vertical-align:top; text-align:center;">
          ${params.singleBPhotoUrl ? `<a href="${params.singleBPhotoUrl}" target="_blank" rel="noopener noreferrer"><img src="${params.singleBPhotoUrl}" alt="${params.singleBFirstName}" style="width:140px; height:140px; border-radius:12px; object-fit:cover; object-position:center 20%; border:2px solid #191265; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;" /></a>` : ""}
          <strong>${params.singleBFirstName}</strong><br/>
          גיל: ${params.singleBAge}<br/>
          עיר: ${params.singleBCity}<br/>
          ${params.singleBOccupation ? `עיסוק: ${params.singleBOccupation}<br/>` : ""}
          ${dnaLabelB ? `DNA: ${dnaLabelB}` : ""}
        </td>
      </tr>
    </table>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      האם לשלוח את ההצעה לשני הצדדים?
    </p>
    <div style="text-align:center; margin:30px 0;">
      <a href="${params.approveUrl}" style="display:inline-block; background:#191265; color:#ffe27c; font-weight:bold; font-size:18px; padding:16px 40px; border-radius:12px; text-decoration:none; margin-left:16px;">
        ✅ כן, שלחי לשניהם
      </a>
      <a href="${params.rejectUrl}" style="display:inline-block; background:#f5f5f5; color:#666; font-weight:bold; font-size:16px; padding:16px 32px; border-radius:12px; text-decoration:none;">
        ❌ לא, בטלי
      </a>
    </div>
    <p style="color:#999; font-size:13px; text-align:center;">התאמה מס׳ ${params.matchId}</p>
  `;
  return {
    subject: `💛 התאמה חדשה: ${params.singleAFirstName} + ${params.singleBFirstName} (${params.score}%)`,
    htmlBody: baseTemplate(content, "hilitpe@hotmail.com", 0),
    textBody: `התאמה חדשה: ${params.singleAFirstName} + ${params.singleBFirstName} (${params.score}%)\n\nלאישור: ${params.approveUrl}\nלביטול: ${params.rejectUrl}`,
  };
}

/**
 * Consolation email to the person who said "yes" but the other party declined.
 */
export function buildConsolationEmail(params: {
  firstName: string;
  matchFirstName?: string;
  recipientEmail: string;
  singleId: number;
}): { subject: string; htmlBody: string; textBody: string } {
  const content = `
    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">הילית כאן 🤍</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      ${params.firstName} היקר/ה,
    </p>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      הפעם ההתאמה עם ${params.matchFirstName ? `<strong>${params.matchFirstName}</strong>` : 'הצד השני'} לא המשיכה הלאה — וזה בסדר גמור. זה חלק מהתהליך.
    </p>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      העובדה שפתחת את הלב ואמרת "כן" מראה שאת/ה מוכנ/ה לאהבה. זה הדבר הכי חשוב.
    </p>
    <div style="background:#f0eadc; border-right:4px solid #ffe27c; padding:16px 20px; border-radius:8px; margin:20px 0; font-style:italic; color:#444;">
      "כל 'לא' מקרב אותך ל'כן' הנכון. אני כאן, ממשיכה לחפש עבורך."
    </div>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      אני ממשיכה לעבוד עבורך: כשתהיה התאמה שאני מאמינה בה, תשמעו ממני.
    </p>
    <hr style="border:none; border-top:1px solid #f0eadc; margin:24px 0;" />
    <p style="font-size:14px; color:#444;">באהבה,<br><strong>הילית כספי</strong><br>מאמנת ומשדכת | Relationship Expert &amp; Matchmaker</p>
  `;
  return {
    subject: "הילית כאן: ממשיכה לחפש עבורך 🤍",
    htmlBody: baseTemplate(content, params.recipientEmail, params.singleId),
    textBody: `שלום ${params.firstName},\n\nהפעם ההתאמה עם ${params.matchFirstName ?? 'הצד השני'} לא המשיכה הלאה, אבל אני ממשיכה לחפש עבורך.\n\nהילית כספי`,
  };
}

// ─── JOURNEY V2: Women - DNA -> מאגר (6 מיילים) ──────────────────────────────

// מייל 1: פרופיל DNA + סיפור הילית (מיידי)
export const WOMEN_V2_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הנה מה שה-DNA הזוגי שלך חשף</h2>
    <p>קיבלתי את תוצאות השאלון שלך - ורציתי לשתף אותך לא רק בתוצאות, אלא גם בסיפור שמאחוריהן.</p>
    <p>לפני כמה שנים עזבתי קריירה מפוארת בהייטק. לא כי נאלצתי - כי הבנתי שמשימת חיי היא אחרת לגמרי. ראיתי יותר מדי אנשים מוכשרים, מצליחים, שלמים - שנשארים לבד לא בגלל שמשהו בהם שבור, אלא כי אף אחד לא לימד אותם את השפה הנכונה של זוגיות.</p>
    <p>אז בניתי שיטה. שיטה שמשלבת מחקר פסיכולוגי, DNA זוגי, ואינטואיציה שצברתי מאות שיחות עם לקוחות - סלבריטאים, רופאות, לוחמים, אנשי עסקים. כולם עם אותה תחושה: "ניסיתי הכל. כלום לא עובד."</p>
    <p>ואז גיליתי שהבעיה לא הייתה בהם. הבעיה הייתה שאף אחד לא ראה את הפרופיל האמיתי שלהם.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 4px; letter-spacing:1px;">הפרופיל הזוגי שלך</p>
      <h3 style="color:#ffffff; font-size:24px; margin:0 0 4px;">{{dnaTypeLabel}}</h3>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">{{dnaTypeSubtitle}}</p>
    </div>
    <div style="background:#f9f6f0; border-radius:12px; padding:20px 24px; margin:16px 0;">
      <p style="font-size:13px; color:#ffe27c; font-weight:700; margin:0 0 6px; background:#191265; display:inline-block; padding:3px 10px; border-radius:20px;">✨ הכוח הזוגי שלך</p>
      <p style="font-size:15px; color:#333; line-height:1.8; margin:8px 0 0;">{{dnaTypeSuperpower}}</p>
    </div>
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">⚡ האתגר שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeChallenge}}</p>
    </div>
    <div style="background:#f0f4ff; border-right:4px solid #191265; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">💛 ההתאמה שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeMatch}}</p>
    </div>
    <p>{{firstName}}, הפרופיל שלך הוא בדיוק מה שמאפשר לי לחפש עבורך התאמה אמיתית. במאגר שלי יש מאות גברים שעברו אבחון DNA זהה, ואני מחפשת את מי שמתאים לפרופיל שלך ספציפית.</p>
    <p>אין כאן אלגוריתם. אין כאן "סוויפ ימינה". יש כאן עיניים אנושיות שמסתכלות על שני פרופילים ואומרות: "כן, זה יכול לעבוד."</p>
    ${urgencyBanner()}
    <a href="${MATCHMAKING_JOIN}" class="cta">כניסה למאגר הרווקים - ₪249 בלבד ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">₪499 המחיר המקורי | ₪249 מחיר מועדף | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הפרופיל הזוגי שלך מוכן!\n\nהטיפוס שלך: {{dnaTypeLabel}}\n\nהצטרפי למאגר הרווקים ב-₪499: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית כספי`,
};

// מייל 2: תובנה מהמחקר + שאלון DNA (יום 1)
export const WOMEN_V2_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, משהו שהמחקר גילה שמשנה את הדרך שאני עובדת",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, תובנה ששינתה את הכל</h2>
    <p>פרופסור דניאל קאנמן מאוניברסיטת הרווארד גילה משהו שנשמע מוזר: אנשים לא יודעים מה ישמח אותם. המוח שלנו מותאם לרדוף אחר גירוי ודרישות - אבל לא אחרי אושר ועניין אמיתי.</p>
    <p>זה מה שאני רואה שוב ושוב אצל אנשים שמגיעים אלי: הם מחפשים את הדבר הלא נכון. הגובה, המשכורתה, המראה - ואחרי שנים בזוגיות שהשיגו את הכל זה - הם עדיין לא מאושרים.</p>
    <div class="quote">
      "מה שאנשים באמת צריכים זה לא גובה וקריירה. זה מישהו שירגיש אותם, שיראה אותם, שיבין אותם. הפרופיל הזוגי הוא המפתח לזה."
    </div>
    <p>הפרופיל שלך, <strong>{{dnaTypeLabel}}</strong>, אומר לי משהו מאוד ספציפי על מה את צריכה - ואיפה כדאי לחפש. אם את עדיין לא עשית את שאלון ה-DNA המלא, זה הזמן:</p>
    <a href="https://hilitcaspi.com/dna-quiz" class="secondary-cta">שאלון DNA מלא (5 דקות) ←</a>
    <p>ואם את מוכנה לצעד הבא - להיכנס למאגר ולהתחיל:</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 8px; letter-spacing:1px;">קוד קופון מיוחד</p>
      <p style="color:#ffffff; font-size:32px; font-weight:900; margin:0 0 6px; letter-spacing:4px;">LOVE10</p>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">10% הנחה נוספת על ₪249 = <strong style="color:#ffe27c;">₪224 בלבד</strong></p>
    </div>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר עם קוד LOVE10 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | מחיר מועדף ₪249 | עם קוד LOVE10 רק ₪224</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, תובנה ששינתה את הכל.\n\nשאלון DNA: https://hilitcaspi.com/dna-quiz\nהצטרפי למאגר עם קוד LOVE10 (10% הנחה): ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 3: סיפור הצלחה אמיתי (יום 4)
export const WOMEN_V2_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, סיפור שחשבתי עליך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סיפור שחשבתי עליך כשקראתי אותו</h2>
    <p>ישבה מולי אישה שעבדה בחברת הייטק גדולה. מנהלת, חדה, יפה. אמרה לי: "הילית, אני מצליחה בכל תחום. רק באהבה אני לא מצליחה."</p>
    <p>שאלתי אותה שאלה אחת: "מה קורה כשמישהו מתעניין בך?"</p>
    <p>חשבה ואמרה: "אני מתחילה מרגישה שהוא צריך אותי יותר מאשר אני צריכה אותו. אז אני מרחיקה."</p>
    <p>זה לא בעיה שלה. זה דפוס. הסתגלות הדוניסטית: הניצוץ הראשוני תמיד דועך, ואנחנו מפרשים את זה כשהיא לא הנכונה. אבל הבעיה היא לא בהירות הפרופיל. שלושה חודשים אחרי שעבדנו על הדפוס הזה, היא בזוגיות.</p>
    <div class="quote">
      "היא שלחה לי הודעה בשעה שלוש בלילה: 'הילית, הוא ראה אותי. לא את הדמות שאני מציגה - את מי שאני באמת.' ארבעה חודשים אחרי, הם ביחד."
    </div>
    <p>{{firstName}}, אני רוצה לעשות את זה בשבילך.</p>
    ${urgencyBanner()}
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | ₪249 מחיר מועדף | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, סיפור שחשבתי עליך.\n\nהצטרפי למאגר: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 4: שיחת ייעוץ או מאגר (יום 7)
export const WOMEN_V2_EMAIL_4: EmailTemplate = {
  subject: "{{firstName}}, שתי דרכים לקדימה",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי לשאול אותך משהו</h2>
    <p>אנשים שמגיעים אלי נחלקים לשתי קבוצות:</p>
    <p>הראשונה - אלו שרוצים להבין את עצמן לפני שמתחילים. הם שואלים: "מה בי שגורם לזה לא לעבוד?" או "איך אני יודעת מה אני מחפשת?" עבוריהן, שיחת ייעוץ איתי יכולה לשנות הכל.</p>
    <p>השנייה - אלו שיודעים מה הם רוצים ומוכנים לצעד הבא. עבוריהן, המאגר הוא המקום הנכון.</p>
    <div class="quote">
      "עזבתי קריירה מפוארת בהייטק כי הבנתי שהעבודה האמיתית שלי היא להוביל אנשים לאהבה. זו לא קריירה - זו משימת חיים."
    </div>
    <p>איזו מהשתיים אליך עכשיו?</p>
    <a href="${CALENDLY_15MIN}" class="secondary-cta">שיחת ייעוץ אישית עם הילית ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">שיחה של 60 דקות | ניתוח הפרופיל שלך | תוכנית פעולה אישית</p>
    <p>או אם את מוכנה להצטרף למאגר ישיר:</p>
    ${urgencyBanner()}
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שתי דרכים לקדימה.\n\nשיחת ייעוץ: ${CALENDLY_15MIN}\nאו הצטרפי למאגר: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 5: מדריך לבחור נכון + מאגר (יום 10)
export const WOMEN_V2_EMAIL_5: EmailTemplate = {
  subject: "{{firstName}}, שאלה שאני שואלת כל מי שיושב מולי",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, שאלה שאני שואלת כולם</h2>
    <p>בשנים שאני עושה את העבודה הזו, שאלתי אלפי אנשים שאלה אחת: "מה אתם באמת מחפשים בזוגיות?"</p>
    <p>התשובות תמיד נחלקות לשתי קטגוריות:</p>
    <p><strong>הראשונה</strong> - גובה, מראה, משכורת, דת, אזור. התשובה הלוגיסטית.</p>
    <p><strong>השנייה</strong> - "מישהו שיראה אותי", "שיגרום לי להרגיש בטוחה", "שיבין אותי בלי שאצטרך להסביר". התשובה האמיתית.</p>
    <p>הבעיה? רוב האנשים בוחרים לפי הקטגוריה הראשונה, ואז תוהים למה הקשר לא עובד.</p>
    <div class="quote">
      "המדריך 'לבחור נכון' שכתבתי עוסק בדיוק בזה: איך מפסיקים לבחור לפי מה שהמוח חושב שהוא רוצה, ומתחילים לבחור לפי מה שבאמת ישמח אותנו."
    </div>
    <p>{{firstName}}, אם זה מדבר אליך, המדריך מחכה לך:</p>
    <a href="https://hilitcaspi.com/guide" class="secondary-cta">מדריך 'לבחור נכון' - ₪149 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">כלים מעשיים. תרגילים. שיטה שעובדת.</p>
    <p>ואם כבר יודעים מה מחפשים ומוכנים לצעד הבא, המאגר פתוח:</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | מחיר מועדף ₪249 | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, שאלה שאני שואלת כולם.\n\nמדריך 'לבחור נכון': https://hilitcaspi.com/guide\nאו הצטרפות למאגר: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית כספי`,
};

// מייל 6: מייל סיום + קופון + אלטרנטיבות (יום 14)
export const WOMEN_V2_EMAIL_6: EmailTemplate = {
  subject: "{{firstName}}, המייל האחרון - ומתנה קטנה לדרך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון שלי על המאגר</h2>
    <p>לא אמשיך לשלוח מיילים על זה אחרי היום. אם תחליטי שזה הזמן, אני כאן.</p>
    <p>ורציתי לתת לך קוד קופון לדרך:</p>
    <div style="background:#191265; border-radius:14px; padding:28px; margin:24px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 8px; letter-spacing:1px;">קוד הקופון שלך</p>
      <p style="color:#ffffff; font-size:36px; font-weight:900; margin:0 0 8px; letter-spacing:4px;">LOVE10</p>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">10% הנחה נוספת על ₪249</p>
    </div>
    <p>זה אומר שתצטרפי ב-<strong>₪224 בלבד</strong> (במקום ₪499 המחיר המקורי).</p>
    <p>או אם את מעדיפה לקבל כלים לפני שמחליטים - המדריך שלי בדיוק בשבילך:</p>
    <a href="https://hilitcaspi.com/guide" class="secondary-cta">מדריך 'לבחור נכון' - ₪249 ←</a>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר עם קוד LOVE10 ←</a>
    <p>ואם יש שאלות, את מוזמנת לכתוב לי ישירות:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שאלה בוואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, קוד קופון LOVE10 (10% הנחה נוספת).\n\nמדריך: https://hilitcaspi.com/guide\nאו הצטרפי למאגר: ${MATCHMAKING_JOIN}\nשאלות בוואטסאפ: ${WHATSAPP_LINK}\n\nבאהבה,\nהילית`,
};

// ─── JOURNEY V2: Men - DNA -> מאגר (6 מיילים) ────────────────────────────────

// מייל 1: פרופיל DNA + סיפור הילית (מיידי)
export const MEN_V2_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, הפרופיל הזוגי שלך - ומשהו שרציתי לספר לך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, הנה מה שה-DNA הזוגי שלך חשף</h2>
    <p>קיבלתי את תוצאות השאלון שלך - ורציתי לשתף אותך לא רק בתוצאות, אלא גם בסיפור שמאחוריהן.</p>
    <p>לפני כמה שנים עזבתי קריירה מפוארת בהייטק. לא כי נאלצתי - כי הבנתי שמשימת חיי היא אחרת לגמרי. ראיתי יותר מדי אנשים מוכשרים, מצליחים, שלמים - שנשארים לבד לא בגלל שמשהו בהם שבור, אלא כי אף אחד לא לימד אותם את השפה הנכונה של זוגיות.</p>
    <p>אז בניתי שיטה. שיטה שמשלבת מחקר פסיכולוגי, DNA זוגי, ואינטואיציה שצברתי מאות שיחות עם לקוחות - סלבריטאים, רופאים, לוחמים, אנשי עסקים. כולם עם אותה תחושה: "ניסיתי הכל. כלום לא עובד."</p>
    <p>ואז גיליתי שהבעיה לא הייתה בהם. הבעיה הייתה שאף אחד לא ראה את הפרופיל האמיתי שלהם.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 4px; letter-spacing:1px;">הפרופיל הזוגי שלך</p>
      <h3 style="color:#ffffff; font-size:24px; margin:0 0 4px;">{{dnaTypeLabel}}</h3>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">{{dnaTypeSubtitle}}</p>
    </div>
    <div style="background:#f9f6f0; border-radius:12px; padding:20px 24px; margin:16px 0;">
      <p style="font-size:13px; color:#ffe27c; font-weight:700; margin:0 0 6px; background:#191265; display:inline-block; padding:3px 10px; border-radius:20px;">✨ הכוח הזוגי שלך</p>
      <p style="font-size:15px; color:#333; line-height:1.8; margin:8px 0 0;">{{dnaTypeSuperpower}}</p>
    </div>
    <div style="background:#fff8e1; border-right:4px solid #ffe27c; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">⚡ האתגר שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeChallenge}}</p>
    </div>
    <div style="background:#f0f4ff; border-right:4px solid #191265; border-radius:8px; padding:16px 20px; margin:16px 0;">
      <p style="font-size:13px; color:#191265; font-weight:700; margin:0 0 6px;">💛 ההתאמה שלך</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0;">{{dnaTypeMatch}}</p>
    </div>
    <p>{{firstName}}, הפרופיל שלך הוא בדיוק מה שמאפשר לי לחפש עבורך התאמה אמיתית. במאגר שלי יש מאות נשים שעברו אבחון DNA זהה, ואני מחפשת את מי שמתאים לפרופיל שלך ספציפית.</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">כניסה למאגר הרווקים - ₪249 בלבד ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">₪499 המחיר המקורי | ₪249 מחיר מועדף | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, הפרופיל הזוגי שלך מוכן!\n\nהטיפוס שלך: {{dnaTypeLabel}}\n\nהצטרף למאגר הרווקים ב-₪499: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית כספי`,
};

// מייל 2: "יש נשים שמחפשות בדיוק את הפרופיל שלך" (יום 1)
export const MEN_V2_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, יש נשים שמחפשות את הפרופיל שלך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, משהו שרציתי לספר לך</h2>
    <p>אחרי שראיתי את הפרופיל שלך, בדקתי במאגר.</p>
    <p>יש שם נשים שהפרופיל שלהן תואם ל-<strong>{{dnaTypeLabel}}</strong> שלך. הן עברו את אותו שאלון, הן יודעות מה הן מחפשות, והן מחכות להתאמה.</p>
    <div class="quote">
      "כשאני מחפשת התאמה, אני לא מסתכלת רק על גיל ומיקום. אני מסתכלת על הדינמיקה הזוגית. על מה שקורה כששני פרופילים נפגשים."
    </div>
    <p>הדבר שמייחד את המאגר שלי הוא שאני עוברת על כל פרופיל בעצמי. אני לא אלגוריתם. אני מכירה את שני הצדדים.</p>
    <p>אם תצטרף עכשיו, אוכל להתחיל לחפש עבורך.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 8px; letter-spacing:1px;">קוד קופון מיוחד</p>
      <p style="color:#ffffff; font-size:32px; font-weight:900; margin:0 0 6px; letter-spacing:4px;">LOVE10</p>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">10% הנחה נוספת על ₪249 = <strong style="color:#ffe27c;">₪224 בלבד</strong></p>
    </div>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר עם קוד LOVE10 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | מחיר מועדף ₪249 | עם קוד LOVE10 רק ₪224</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, יש נשים שמחפשות את הפרופיל שלך.\n\nהצטרף למאגר עם קוד LOVE10 (10% הנחה): ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 3: סיפור הצלחה (יום 4)
export const MEN_V2_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, סיפור שרציתי לשתף איתך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סיפור שחשבתי עליך כשקראתי אותו</h2>
    <p>לפני כמה חודשים הצטרף למאגר שלי גבר בשם דן. 38, מצליח, עם לב. אמר לי: "ניסיתי הכל. אפליקציות, שדכניות. כלום לא עובד."</p>
    <p>הפרופיל שלו היה דומה לשלך, <strong>{{dnaTypeLabel}}</strong>.</p>
    <p>שלחתי לו התאמה אחת. רק אחת. אחרי שבדקתי את הפרופיל שלה לעומק.</p>
    <div class="quote">
      "הם נפגשו לקפה. שלח לי הודעה למחרת: 'הילית, היא הבינה אותי. ממש הבינה אותי.' ארבעה חודשים אחרי, הם ביחד."
    </div>
    <p>זה לא קסם. זה שיטה. כשמתאימים שני פרופילים שמבינים מה הם מחפשים, הדברים קורים אחרת.</p>
    <p>{{firstName}}, אני רוצה לעשות את זה בשבילך.</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | ₪249 מחיר מועדף | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, סיפור שרציתי לשתף.\n\nהצטרף למאגר: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 4: "איך האלגוריתם עובד" (יום 7)
export const MEN_V2_EMAIL_4: EmailTemplate = {
  subject: "{{firstName}}, למה המאגר שלי שונה מכל דבר אחר",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי להסביר לך איך זה עובד</h2>
    <p>אפליקציות עובדות על תמונות ומשפטים קצרים. שדכניות מסורתיות עובדות על "מה אתה מחפש" בגובה ומשכורת.</p>
    <p>אני עובדת אחרת.</p>
    <p><strong>כך נראה התהליך:</strong></p>
    <p>1. אתה ממלא שאלון DNA מלא (כבר עשית את הצעד הראשון)<br>
    2. אני עוברת על הפרופיל שלך בעצמי<br>
    3. כשיש התאמה מעל 80% בפרמטרים שחשובים לשניכם, אני שולחת לשניכם הצעה<br>
    4. רק אם שניכם מאשרים, אני מחברת ביניכם</p>
    <div class="quote">
      "אני לא שולחת התאמות סתם. כל התאמה שאני שולחת, אני יכולה לעמוד מאחוריה ולהסביר למה."
    </div>
    <p>{{firstName}}, הפרופיל שלך כבר מוכן. כל מה שנשאר זה להצטרף.</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">מחיר מקורי ₪499 | ₪249 מחיר מועדף | ללא דמי מנוי</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, למה המאגר שלי שונה.\n\nהצטרף: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 5: CTA ישיר + מחיר (יום 10)
export const MEN_V2_EMAIL_5: EmailTemplate = {
  subject: "{{firstName}}, ₪249 במקום ₪499 - עד מתי?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, רציתי להיות ישיר איתך</h2>
    <p>שלחתי לך כמה מיילים בשבועות האחרונים. ראיתי שאתה פותח אותם.</p>
    <p>אז אני מניחה שמשהו מדבר אליך, אבל עדיין לא עשית את הצעד.</p>
    <p>אני מבינה. זה לא קל להאמין שמשהו יעבוד אחרי שניסית כבר הרבה דברים.</p>
    <p>אז הנה מה שאני מציעה:</p>
    <div style="background:#191265; border-radius:14px; padding:28px; margin:24px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 8px; letter-spacing:1px;">הטבה מיוחדת עבורך</p>
      <p style="color:rgba(255,255,255,0.5); font-size:16px; text-decoration:line-through; margin:0 0 4px;">₪499</p>
      <p style="color:#ffffff; font-size:42px; font-weight:900; margin:0 0 8px;">₪249</p>
      <p style="color:rgba(255,255,255,0.7); font-size:13px; margin:0;">ללא דמי מנוי. פעם אחת.</p>
    </div>
    <p>אם לא תצטרף, לא יקרה כלום. אבל אם כן, אני מתחילה לחפש עבורך.</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר - ₪249 עכשיו ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, מחיר מועדף ₪249 במקום ₪499.\n\nהצטרף: ${MATCHMAKING_JOIN}\n\nבאהבה,\nהילית`,
};

// מייל 6: קוד קופון LOVE10 + "המייל האחרון" (יום 14)
export const MEN_V2_EMAIL_6: EmailTemplate = {
  subject: "{{firstName}}, מתנה קטנה - ומייל אחרון ממני",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, זה המייל האחרון שאני שולחת לך על המאגר</h2>
    <p>לא אמשיך לשלוח מיילים על זה אחרי היום. אם תחליט שזה הזמן, אני כאן.</p>
    <p>ורציתי לתת לך משהו קטן לדרך:</p>
    <div style="background:#191265; border-radius:14px; padding:28px; margin:24px 0; text-align:center;">
      <p style="color:#ffe27c; font-size:13px; font-weight:600; margin:0 0 8px; letter-spacing:1px;">קוד הקופון שלך</p>
      <p style="color:#ffffff; font-size:36px; font-weight:900; margin:0 0 8px; letter-spacing:4px;">LOVE10</p>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin:0;">10% הנחה נוספת על ₪249</p>
    </div>
    <p>זה אומר שתצטרף ב-<strong>₪224 בלבד</strong> (במקום ₪499 המחיר המקורי).</p>
    <a href="${MATCHMAKING_JOIN}" class="cta">הצטרפות למאגר עם קוד LOVE10 ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">הקוד תקף ל-48 שעות</p>
    <p>ואם יש לך שאלות לפני שמחליט, אתה מוזמן לכתוב לי ישירות בוואטסאפ:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שאלה בוואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, קוד קופון LOVE10 (10% הנחה נוספת).\n\nהצטרף למאגר: ${MATCHMAKING_JOIN}\nשאלות בוואטסאפ: ${WHATSAPP_LINK}\n\nבאהבה,\nהילית`,
};

// Populate v2 sequences after template declarations (avoids "used before declaration" TS error)
EMAIL_SEQUENCES.women_first_step_v2 = [WOMEN_V2_EMAIL_1, WOMEN_V2_EMAIL_2, WOMEN_V2_EMAIL_3, WOMEN_V2_EMAIL_4, WOMEN_V2_EMAIL_5, WOMEN_V2_EMAIL_6];
EMAIL_SEQUENCES.men_first_step_v2 = [MEN_V2_EMAIL_1, MEN_V2_EMAIL_2, MEN_V2_EMAIL_3, MEN_V2_EMAIL_4, MEN_V2_EMAIL_5, MEN_V2_EMAIL_6];

// ─── JOURNEY: Matchmaking Welcome (after purchase) ────────────────────────────
// 4 emails: immediate, day 3, day 7, day 14

const WOMEN_MATCHMAKING_WELCOME_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, ברוכה הבאה למאגר הבלעדי ♡ הנה איך התהליך עובד",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוכה הבאה למאגר! ♡</h2>
    <p>קיבלתי את הרישום שלך ואני כל כך שמחה שהחלטת להצטרף. אני רוצה לספר לך בדיוק איך התהליך עובד.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0;">
      <h3 style="color:#ffe27c; font-size:18px; margin:0 0 16px; text-align:center;">איך מתבצעות ההתאמות?</h3>
      <div style="color:#fff; font-size:15px; line-height:2;">
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">1. בדיקה אישית</span> אני עוברת על הפרופיל שלך אישית ומחפשת התאמה שמרגישה נכון, לא רק על הנייר.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">2. הצעת התאמה</span> כשאמצא התאמה פוטנציאלית, אשלח לשניכם הצעה בנפרד בלי לחשוף פרטים של הצד השני.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">3. אישור שני הצדדים</span> רק אם שניכם אישרו את ההתאמה, הפרטים ייחשפו ותוכלו ליצור קשר.</p>
        <p style="margin:0;"><span style="color:#ffe27c; font-weight:700;">4. הפגישה ביניכם</span> השאר בידיכם. אני לא נמצאת בדייט ולא רואה את מה קורה ביניכם.</p>
      </div>
    </div>
    <div class="quote">
      "לא אפליקציה. לא שידוך. מדע של התאמה עם לב. כל חיבור עובר דרכי אישית."
    </div>
    <p>זמן ממוצע עד לחיבור הראשון: 2-4 שבועות. תהיי סבלנית, הדברים הטובים לוקחים זמן.</p>
    <p>ואם את רוצה להבין לעומק מה עוצר אותך בדרך לזוגיות ולשמוע על תהליך הליווי האישי, אפשר לקבוע שיחת היכרות קצרה:</p>
    <a href="${CALENDLY_15MIN}" class="cta">לשיחת היכרות ופרטים על תהליך הליווי (15 דקות) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוכה הבאה למאגר!\n\nאיך התהליך עובד:\n1. בדיקה אישית של הפרופיל\n2. הצעת התאמה לשני הצדדים\n3. רק אם שניכם אישרו - הפרטים ייחשפו\n4. הפגישה ביניכם\n\nזמן ממוצע: 2-4 שבועות.\n\nרוצה לשמוע על תהליך הליווי? קביעת שיחת היכרות (15 דקות, ללא עלות): ${CALENDLY_15MIN}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

const WOMEN_MATCHMAKING_WELCOME_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, מה לעשות בינתיים - 3 טיפים שמגדילים סיכויים",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, כמה ימים עברו - ורציתי לשתף אותך</h2>
    <p>עברו כמה ימים מאז שהצטרפת. אני עובדת על הפרופיל שלך - ובינתיים, יש 3 דברים שאני רואה שמגדילים משמעותית את הסיכויים למצוא התאמה טובה:</p>
    <div style="background:#f9f6f0; border-radius:12px; padding:24px 28px; margin:20px 0;">
      <p style="margin:0 0 16px;"><span style="color:#191265; font-weight:700; font-size:17px;">1. תהיי ספציפית בתיאור שלך</span><br/>
      <span style="color:#555; font-size:15px;">"אני אוהבת לטייל" זה פחות מדויק מ"אני אוהבת טיולי שטח בגליל ושבתות בים". ככל שהפרופיל יותר ספציפי - ההתאמה יותר מדויקת.</span></p>
      <p style="margin:0 0 16px;"><span style="color:#191265; font-weight:700; font-size:17px;">2. תמונה אמיתית ועדכונית</span><br/>
      <span style="color:#555; font-size:15px;">לא צריך תמונת סטודיו. תמונה טבעית שמראה את האנרגיה שלך - שווה יותר מכל תמונה מושלמת.</span></p>
      <p style="margin:0;"><span style="color:#191265; font-weight:700; font-size:17px;">3. ספרי לי ערך אחד שחשוב לך</span><br/>
      <span style="color:#555; font-size:15px;">פשוט ענה למייל הזה עם ערך אחד שחשוב לך בבן זוג. זה עוזר לי לחפש עבורך בצורה מדויקת יותר.</span></p>
    </div>
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלחי לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, 3 טיפים שמגדילים סיכויים:\n\n1. תהיי ספציפית בתיאור שלך\n2. תמונה אמיתית ועדכונית\n3. ספרי לי ערך אחד שחשוב לך (ענה למייל הזה)\n\nשאלות? ${WHATSAPP_LINK}\n\nבאהבה,\nהילית כספי`,
};

const WOMEN_MATCHMAKING_WELCOME_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, סיפור שחשבתי עליך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סיפור שחשבתי עליך כשקראתי אותו</h2>
    <p>לפני כמה חודשים הצטרפה למאגר שלי אישה בשם מיכל. 36, יפה, מצליחה. אמרה לי: "הילית, ניסיתי הכל. אפליקציות, חברים שמכירים. אני מתחילה לחשוב שאולי אני פשוט לא בשבילה."</p>
    <p>שאלתי אותה שאלה אחת: "מה קורה אחרי 3-4 פגישות עם מישהו שמוצא חן בעינייך?"</p>
    <p>חשבה ואמרה: "בדרך כלל אחרי כמה דייטים אני מרגישה שמשהו חסר. שאין מספיק ניצוץ."</p>
    <p>זה לא בעיה של מיכל. זה דפוס. ואני ראיתי אותו מאות פעמים.</p>
    <div class="quote">
      "שלחתי למיכל התאמה אחת - גבר שהפרופיל שלו תאם את שלה ברמה עמוקה. שלחה לי הודעה שבוע אחרי: 'הילית, הוא ראה אותי. ממש ראה אותי.' ארבעה חודשים אחרי, הם ביחד."
    </div>
    <p>{{firstName}}, אני עובדת על הפרופיל שלך. כשתהיה התאמה שאני מאמינה בה - תשמעי ממני.</p>
    <p>ואם יש משהו שרצית לעדכן בפרופיל שלך - פשוט כתבי לי:</p>
    <a href="${WHATSAPP_LINK}" class="cta">עדכון פרופיל בוואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, סיפור שחשבתי עליך.\n\nאני עובדת על הפרופיל שלך. כשתהיה התאמה - תשמעי ממני.\n\nלעדכון פרופיל: ${WHATSAPP_LINK}\n\nבאהבה,\nהילית כספי`,
};

const WOMEN_MATCHMAKING_WELCOME_EMAIL_4: EmailTemplate = {
  subject: "{{firstName}}, רוצה להגדיל את הסיכויים שלך?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש דרך להאיץ את התהליך</h2>
    <p>עברו כשבועיים מאז שהצטרפת. אני רוצה להציע לך משהו.</p>
    <p>האנשים שמוצאים התאמה הכי מהר הם אלו שמגיעים עם הבנה עמוקה של עצמם - מה הם מחפשים, מה הדפוסים שלהם, ואיך להציג את עצמם בצורה שמושכת את הצד הנכון.</p>
    <p>זה בדיוק מה שהליווי האישי שלי עושה. ואם את רוצה לדעת אם זה מתאים לך - שיחה קצרה של 15 דקות תספיק:</p>
    <a href="${CALENDLY_15MIN}" class="cta">♡ קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <div class="quote">
      "הגעתי לשיחת ההיכרות בספקנות. יצאתי עם תוכנית. 6 חודשים אחרי - אני בזוגיות." - שירה, 32
    </div>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, רוצה להאיץ את התהליך?\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nבאהבה,\nהילית כספי`,
};

const MEN_MATCHMAKING_WELCOME_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, ברוך הבא למאגר הבלעדי ♡ הנה איך התהליך עובד",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, ברוך הבא למאגר! ♡</h2>
    <p>קיבלתי את הרישום שלך ואני שמחה שהחלטת להצטרף. אני רוצה לספר לך בדיוק איך התהליך עובד.</p>
    <div style="background:#191265; border-radius:14px; padding:24px 28px; margin:20px 0;">
      <h3 style="color:#ffe27c; font-size:18px; margin:0 0 16px; text-align:center;">איך מתבצעות ההתאמות?</h3>
      <div style="color:#fff; font-size:15px; line-height:2;">
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">1. בדיקה אישית</span> אני עוברת על הפרופיל שלך אישית ומחפשת התאמה שמרגישה נכון, לא רק על הנייר.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">2. הצעת התאמה</span> כשאמצא התאמה פוטנציאלית, אשלח לשניכם הצעה בנפרד בלי לחשוף פרטים של הצד השני.</p>
        <p style="margin:0 0 10px;"><span style="color:#ffe27c; font-weight:700;">3. אישור שני הצדדים</span> רק אם שניכם אישרו את ההתאמה, הפרטים ייחשפו ותוכלו ליצור קשר.</p>
        <p style="margin:0;"><span style="color:#ffe27c; font-weight:700;">4. הפגישה ביניכם</span> השאר בידיכם. אני לא נמצאת בדייט ולא רואה את מה קורה ביניכם.</p>
      </div>
    </div>
    <div class="quote">
      "לא אפליקציה. לא swipe. Matchmaking אמיתי, כל חיבור עובר דרכי אישית."
    </div>
    <p>זמן ממוצע עד לחיבור הראשון: 2-4 שבועות. הדברים הטובים לוקחים זמן.</p>
    <p>ואם אתה רוצה להבין לעומק מה עוצר אותך בדרך לזוגיות ולשמוע על תהליך הליווי האישי, אפשר לקבוע שיחת היכרות קצרה:</p>
    <a href="${CALENDLY_15MIN}" class="cta">לשיחת היכרות ופרטים על תהליך הליווי (15 דקות) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, ברוך הבא למאגר!\n\nאיך התהליך עובד:\n1. בדיקה אישית של הפרופיל\n2. הצעת התאמה לשני הצדדים\n3. רק אם שניכם אישרו - הפרטים ייחשפו\n4. הפגישה ביניכם\n\nזמן ממוצע: 2-4 שבועות.\n\nרוצה לשמוע על תהליך הליווי? קביעת שיחת היכרות (15 דקות, ללא עלות): ${CALENDLY_15MIN}\n\nבאהבה,\nהילית כספי\nמאמנת ומשדכת | Relationship Expert & Matchmaker`,
};

const MEN_MATCHMAKING_WELCOME_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, מה לעשות בינתיים - 3 טיפים שמגדילים סיכויים",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, כמה ימים עברו - ורציתי לשתף אותך</h2>
    <p>עברו כמה ימים מאז שהצטרפת. אני עובדת על הפרופיל שלך - ובינתיים, יש 3 דברים שאני רואה שמגדילים משמעותית את הסיכויים למצוא התאמה טובה:</p>
    <div style="background:#f9f6f0; border-radius:12px; padding:24px 28px; margin:20px 0;">
      <p style="margin:0 0 16px;"><span style="color:#191265; font-weight:700; font-size:17px;">1. היה ספציפי בתיאור שלך</span><br/>
      <span style="color:#555; font-size:15px;">"אני אוהב לטייל" זה פחות מדויק מ"אני אוהב טיולי שטח בגליל ושבתות בים". ככל שהפרופיל יותר ספציפי - ההתאמה יותר מדויקת.</span></p>
      <p style="margin:0 0 16px;"><span style="color:#191265; font-weight:700; font-size:17px;">2. תמונה אמיתית ועדכונית</span><br/>
      <span style="color:#555; font-size:15px;">לא צריך תמונת סטודיו. תמונה טבעית שמראה את האנרגיה שלך - שווה יותר מכל תמונה מושלמת.</span></p>
      <p style="margin:0;"><span style="color:#191265; font-weight:700; font-size:17px;">3. ספר לי ערך אחד שחשוב לך</span><br/>
      <span style="color:#555; font-size:15px;">פשוט ענה למייל הזה עם ערך אחד שחשוב לך בבת זוג. זה עוזר לי לחפש עבורך בצורה מדויקת יותר.</span></p>
    </div>
    <p>שאלות? אני כאן:</p>
    <a href="${WHATSAPP_LINK}" class="secondary-cta">שלח לי וואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, 3 טיפים שמגדילים סיכויים:\n\n1. היה ספציפי בתיאור שלך\n2. תמונה אמיתית ועדכונית\n3. ספר לי ערך אחד שחשוב לך (ענה למייל הזה)\n\nשאלות? ${WHATSAPP_LINK}\n\nהילית`,
};

const MEN_MATCHMAKING_WELCOME_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, סיפור שחשבתי עליך",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, סיפור שחשבתי עליך כשקראתי אותו</h2>
    <p>לפני כמה חודשים הצטרף למאגר שלי גבר בשם דן. 38, מצליח, עם לב. אמר לי: "ניסיתי הכל. אפליקציות, שדכניות. כלום לא עובד."</p>
    <p>שאלתי אותו שאלה אחת: "מה קורה כשמישהי מתעניינת בך?"</p>
    <p>חשב ואמר: "בדרך כלל אחרי כמה דייטים אני מרגיש שמשהו חסר. שאין מספיק ניצוץ."</p>
    <p>זה לא בעיה של דן. זה דפוס. ואני ראיתי אותו מאות פעמים.</p>
    <div class="quote">
      "שלחתי לדן התאמה אחת - אישה שהפרופיל שלה תאם את שלו ברמה עמוקה. שלח לי הודעה שבוע אחרי: 'הילית, היא הבינה אותי. ממש הבינה אותי.' ארבעה חודשים אחרי, הם ביחד."
    </div>
    <p>{{firstName}}, אני עובדת על הפרופיל שלך. כשתהיה התאמה שאני מאמינה בה - תשמע ממני.</p>
    <p>ואם יש משהו שרצית לעדכן בפרופיל שלך - פשוט כתוב לי:</p>
    <a href="${WHATSAPP_LINK}" class="cta">עדכון פרופיל בוואטסאפ ←</a>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, סיפור שחשבתי עליך.\n\nאני עובדת על הפרופיל שלך. כשתהיה התאמה - תשמע ממני.\n\nלעדכון פרופיל: ${WHATSAPP_LINK}\n\nהילית`,
};

const MEN_MATCHMAKING_WELCOME_EMAIL_4: EmailTemplate = {
  subject: "{{firstName}}, רוצה להגדיל את הסיכויים שלך?",
  htmlBody: baseTemplate(`
    <h2>{{firstName}}, יש דרך להאיץ את התהליך</h2>
    <p>עברו כשבועיים מאז שהצטרפת. אני רוצה להציע לך משהו.</p>
    <p>האנשים שמוצאים התאמה הכי מהר הם אלו שמגיעים עם הבנה עמוקה של עצמם - מה הם מחפשים, מה הדפוסים שלהם, ואיך להציג את עצמם בצורה שמושכת את הצד הנכון.</p>
    <p>זה בדיוק מה שהליווי האישי שלי עושה. ואם אתה רוצה לדעת אם זה מתאים לך - שיחה קצרה של 15 דקות תספיק:</p>
    <a href="${CALENDLY_15MIN}" class="cta">קביעת שיחת היכרות (15 דקות, חינם) ←</a>
    <p style="color:#727272; font-size:13px; text-align:center;">ללא עלות, ללא התחייבות.</p>
    <div class="quote">
      "הגעתי לשיחת ההיכרות בספקנות. יצאתי עם תוכנית. 6 חודשים אחרי - אני בזוגיות." - דניאל, 41
    </div>
    <hr class="divider" />
    ${emailSignature()}
  `),
  textBody: `{{firstName}}, רוצה להאיץ את התהליך?\n\nשיחת היכרות חינמית: ${CALENDLY_15MIN}\n\nהילית`,
};

EMAIL_SEQUENCES.women_matchmaking_welcome = [WOMEN_MATCHMAKING_WELCOME_EMAIL_1, WOMEN_MATCHMAKING_WELCOME_EMAIL_2, WOMEN_MATCHMAKING_WELCOME_EMAIL_3, WOMEN_MATCHMAKING_WELCOME_EMAIL_4];
EMAIL_SEQUENCES.men_matchmaking_welcome = [MEN_MATCHMAKING_WELCOME_EMAIL_1, MEN_MATCHMAKING_WELCOME_EMAIL_2, MEN_MATCHMAKING_WELCOME_EMAIL_3, MEN_MATCHMAKING_WELCOME_EMAIL_4];

/**
 * Match follow-up email - sent 7 days after proposal if no response
 * Tone: warm, curious, not pushy. Collects data without negative feedback.
 */
export function buildMatchFollowUpEmail(params: {
  firstName: string;
  matchFirstName: string;
  matchAge: number;
  matchCity: string;
  yesUrl: string;
  noUrl: string;
  recipientEmail: string;
  singleId: number;
  feedbackUrl: string;
  gender?: string;
}): EmailTemplate {
  const isMale = params.gender === 'male';
  // Gender-specific text
  const feelText = isMale ? 'מרגיש לגביה' : 'מרגישה לגביו';
  const sawText = isMale ? 'לא ראית את המייל' : 'לא ראית את המייל';
  const spokeText = isMale ? 'לא דיבר אליך' : 'לא דיבר אליך';
  const respondedText = isMale ? 'שלא הגבת עדיין' : 'שלא הגבת עדיין';
  const content = `
    <h2 style="color:#191265; font-size:22px; margin-bottom:8px;">שבוע עבר, ${params.firstName} 💛</h2>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      לפני שבוע שלחתי לך הצעה: ${params.matchFirstName}, ${params.matchAge}, ${params.matchCity}.
    </p>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      רציתי לבדוק איך אתה ${feelText}.
      לפעמים הצעה מגיעה ברגע לא נכון, לפעמים משהו בפרופיל ${spokeText}, ולפעמים פשוט ${sawText}.
    </p>
    <p style="color:#444; font-size:16px; line-height:1.8;">
      <strong>הכפתורים עדיין פעילים:</strong>
    </p>
    <a href="${params.yesUrl}" style="display:block; background:#ffe27c; color:#191265 !important; font-weight:800; font-size:18px; text-align:center; padding:18px 32px; border-radius:14px; text-decoration:none; margin:16px 0;">
      💛 כן, מעניין אותי
    </a>
    <a href="${params.noUrl}" style="display:block; border:2px solid #ddd; color:#727272 !important; font-weight:500; font-size:15px; text-align:center; padding:12px 24px; border-radius:12px; text-decoration:none; margin:8px 0;">
      לא בשלב הזה
    </a>
    <div style="background:#f9f6f0; border-radius:14px; padding:24px 28px; margin:28px 0;">
      <p style="font-size:14px; color:#191265; font-weight:700; margin:0 0 12px;">שאלה אחת קצרה (לא חובה)</p>
      <p style="font-size:15px; color:#444; line-height:1.8; margin:0 0 16px;">
        מה הסיבה העיקרית ${respondedText}?
        התשובה שלך עוזרת לי להציע לך התאמות טובות יותר בעתיד.
      </p>
      <a href="${params.feedbackUrl}&reason=timing" style="display:block; border:1.5px solid #ddd; color:#444 !important; font-size:14px; text-align:center; padding:10px 20px; border-radius:10px; text-decoration:none; background:#fff; margin-bottom:8px;">
        ⏰ הרגע לא מתאים לי עכשיו
      </a>
      <a href="${params.feedbackUrl}&reason=profile" style="display:block; border:1.5px solid #ddd; color:#444 !important; font-size:14px; text-align:center; padding:10px 20px; border-radius:10px; text-decoration:none; background:#fff; margin-bottom:8px;">
        🤔 משהו בפרופיל לא דיבר אלי
      </a>
      <a href="${params.feedbackUrl}&reason=missed" style="display:block; border:1.5px solid #ddd; color:#444 !important; font-size:14px; text-align:center; padding:10px 20px; border-radius:10px; text-decoration:none; background:#fff; margin-bottom:8px;">
        📬 לא ראיתי את המייל הראשון
      </a>
      <a href="${params.feedbackUrl}&reason=other" style="display:block; border:1.5px solid #ddd; color:#444 !important; font-size:14px; text-align:center; padding:10px 20px; border-radius:10px; text-decoration:none; background:#fff;">
        💬 סיבה אחרת
      </a>
    </div>
    <p style="color:#aaa; font-size:13px; text-align:center; margin-top:8px;">
      הפרטים האישיים נחשפים רק אחרי אישור הדדי. אין מחויבות.
    </p>
    ${emailSignature()}
  `;
  return {
    subject: `${params.firstName}, ההצעה עדיין ממתינה לך 💛`,
    htmlBody: baseTemplate(content, params.recipientEmail, params.singleId),
    textBody: `שלום ${params.firstName},\n\nלפני שבוע שלחתי לך הצעה: ${params.matchFirstName}, ${params.matchAge}, ${params.matchCity}.\n\nהכפתורים עדיין פעילים:\nכן: ${params.yesUrl}\nלא: ${params.noUrl}\n\nהילית כספי`,
  };
}

// ─── JOURNEY: English Free Guide Nurture (US Market) ─────────────────────────
// 3-email sequence for US leads who download the free guide from matchbyhilit.com
const EN_GUIDE_DOWNLOAD_URL = "https://matchbyhilit.com/api/guide/download";
const EN_COURSE_URL = "https://matchbyhilit.com/course";
const EN_DATABASE_URL = "https://matchbyhilit.com/database";
const EN_DNA_URL = "https://matchbyhilit.com/dna-quiz";
const EN_WA_DIRECT = "https://wa.me/972544530975?text=Hi%20Hilit%2C%20I%20downloaded%20your%20guide";

function enBaseTemplate(body: string, recipientEmail?: string, leadId?: number): string {
  const unsubUrl = recipientEmail
    ? `https://matchbyhilit.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}${leadId ? `&leadId=${leadId}` : ""}`
    : "https://matchbyhilit.com/unsubscribe";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;padding:0;background:#f0eadc;font-family:Arial,sans-serif}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:#191265;padding:32px 40px;text-align:center}.header h1{color:#ffe27c;font-size:22px;margin:12px 0 4px}.body{padding:40px;color:#191265;line-height:1.8;font-size:16px}.body h2{color:#191265;font-size:22px;margin-bottom:12px}.cta{display:block;background:#ffe27c;color:#191265!important;font-weight:700;font-size:17px;text-align:center;padding:16px 32px;border-radius:12px;text-decoration:none;margin:28px 0}.secondary-cta{display:block;border:2px solid #191265;color:#191265!important;font-weight:600;font-size:15px;text-align:center;padding:12px 24px;border-radius:12px;text-decoration:none;margin:12px 0}.quote{background:#f0eadc;border-left:4px solid #ffe27c;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;color:#444}.divider{border:none;border-top:1px solid #f0eadc;margin:24px 0}.footer{background:#191265;padding:24px 40px;text-align:center}.footer p{color:rgba(255,255,255,.5);font-size:12px;margin:4px 0}.footer a{color:#ffe27c;text-decoration:none}</style></head><body><div class="container"><div class="header"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg" alt="Hilit Caspi" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid #ffe27c;" /><h1>Match by Hilit</h1><p style="color:rgba(255,255,255,.7);font-size:13px;margin:0">Relationship Expert &amp; Matchmaker</p></div><div class="body">${body}</div><div class="footer"><p>Match by Hilit | Relationship Expert &amp; Matchmaker</p><p><a href="https://www.instagram.com/hilitcaspi_relationship">Instagram</a> &middot; <a href="${EN_WA_DIRECT}">WhatsApp</a></p><p style="font-size:11px;margin-top:8px"><a href="${unsubUrl}" style="color:rgba(255,255,255,.4)">Unsubscribe</a></p></div></div></body></html>`;
}

// Email 1 (immediate): Guide delivery + warm personal intro
const EN_FREE_GUIDE_EMAIL_1: EmailTemplate = {
  subject: "{{firstName}}, your free guide is ready",
  htmlBody: enBaseTemplate(`
    <h2>{{firstName}}, your guide is here</h2>
    <p>I am so glad you found your way here. It is not a coincidence.</p>
    <p>A few years ago I walked away from a successful tech career. Not because I had to, but because I realized my life's work was guiding people to love. I have sat across from hundreds of brilliant, successful, wonderful people who were still alone, not because something was broken in them, but because nobody ever taught them the real language of relationships.</p>
    <p>This guide is the result of those hundreds of conversations. Inside you will find 4 patterns the brain runs on autopilot that quietly block people from finding lasting love.</p>
    <a href="${EN_GUIDE_DOWNLOAD_URL}" class="cta">Open Your Free Guide</a>
    <div class="quote">"The most surprising thing I discovered? Most people are not missing love. They are missing the tools to recognize it when it is standing right in front of them."</div>
    <p>Over the next few days I will share more insights. In the meantime, feel free to reach out directly on WhatsApp:</p>
    <a href="${EN_WA_DIRECT}" class="secondary-cta">Message Hilit on WhatsApp</a>
    <hr class="divider" />
    <p style="font-size:14px;color:#444">With love,<br><strong>Hilit Caspi</strong><br>Relationship Expert &amp; Matchmaker</p>
  `),
  textBody: `{{firstName}}, your free guide is ready!\n\nOpen it here: ${EN_GUIDE_DOWNLOAD_URL}\n\nWith love,\nHilit`,
};

// Email 2 (3 days later): Science insight + DNA quiz CTA
const EN_FREE_GUIDE_EMAIL_2: EmailTemplate = {
  subject: "{{firstName}}, the insight that changed how I work",
  htmlBody: enBaseTemplate(`
    <h2>{{firstName}}, the insight that changed everything</h2>
    <p>Professor Daniel Kahneman at Princeton discovered something that sounds strange at first: people are surprisingly bad at predicting what will make them happy. Our brains are wired to chase stimulation and surface-level signals, not genuine connection and real fulfillment.</p>
    <p>This is exactly what I see over and over with the people who come to me. They are chasing the wrong things. The height, the salary, the Instagram-worthy lifestyle. And after years of dating people who checked every box, they are still not happy.</p>
    <div class="quote">
      "What people truly need is not a checklist. It is someone who feels them, sees them, and understands them without needing an explanation."
    </div>
    <p>The guide you downloaded explains one of these four patterns. If you have not read it yet:</p>
    <a href="${EN_GUIDE_DOWNLOAD_URL}" class="cta">Read the Free Guide</a>
    <p>And if you want to discover your own relationship personality type, take the 3-minute DNA quiz:</p>
    <a href="${EN_DNA_URL}" class="secondary-cta">Free DNA Quiz (3 minutes)</a>
    <hr class="divider" />
    <p style="font-size:14px;color:#444">With love,<br><strong>Hilit Caspi</strong><br>Relationship Expert &amp; Matchmaker</p>
  `),
  textBody: `{{firstName}}, the insight that changed everything.\n\nGuide: ${EN_GUIDE_DOWNLOAD_URL}\nDNA Quiz: ${EN_DNA_URL}\n\nHilit`,
};

// Email 3 (7 days later): Story + product roadmap + discount CTA
const EN_FREE_GUIDE_EMAIL_3: EmailTemplate = {
  subject: "{{firstName}}, a story I thought of when I read yours",
  htmlBody: enBaseTemplate(`
    <h2>{{firstName}}, a story I want to share with you</h2>
    <p>Sarah sat across from me. 38, attorney, sharp, beautiful. Three years of first dates that went nowhere. She said: "Hilit, I succeed at everything. Love is the one place I keep failing."</p>
    <p>I asked her one question: "What happens when someone you actually like starts getting close?"</p>
    <p>She thought for a moment. "I start feeling like they need me more than I need them. So I pull back."</p>
    <p>That is not a flaw. That is a pattern. One of the four patterns in the guide. Three months after we worked on it together, Sarah was in a relationship. Not because she found someone more exciting. Because she finally understood what she was actually looking for, and how to recognize it.</p>
    <div class="quote">
      "She sent me a message at 3am: 'Hilit, he sees me. Not the version I perform. The real me.'"
    </div>
    <p>If this story sounds familiar, the full guide can make the difference:</p>
    <a href="${EN_COURSE_URL}" class="cta">The Love Journey Course</a>
    <p style="color:#727272; font-size:13px; text-align:center;">5 science-backed modules. Real tools. A method that works.</p>
    <div style="background:#f0eadc; border:2px dashed #ffe27c; border-radius:12px; padding:18px 24px; margin:20px 0; text-align:center;">
      <p style="margin:0 0 6px; font-size:13px; color:#727272;">Special code for free guide readers:</p>
      <p style="margin:0 0 8px; font-size:24px; font-weight:900; color:#191265; letter-spacing:3px;">LOVE20</p>
      <p style="margin:0; font-size:13px; color:#191265;">Save 20% at checkout. Limited time only.</p>
    </div>
    <p>Or if you want to start with the matchmaking database and meet real, vetted singles:</p>
    <a href="${EN_DATABASE_URL}" class="secondary-cta">Join the Matchmaking Database</a>
    <hr class="divider" />
    <p style="font-size:14px;color:#444">With love,<br><strong>Hilit Caspi</strong><br>Relationship Expert &amp; Matchmaker</p>
  `),
  textBody: `{{firstName}}, a story I thought of when I read yours.\n\nCourse: ${EN_COURSE_URL}\nDiscount code: LOVE20 (20% off)\nMatchmaking Database: ${EN_DATABASE_URL}\n\nHilit`,
};

// Populate English sequences
EMAIL_SEQUENCES.en_free_guide_nurture = [EN_FREE_GUIDE_EMAIL_1, EN_FREE_GUIDE_EMAIL_2, EN_FREE_GUIDE_EMAIL_3];
