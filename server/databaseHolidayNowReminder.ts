import { DATABASE_NOW_COUPON, DATABASE_NOW_MAX_USES, databaseNowOfferUrl } from "../shared/databaseHolidayNow";
import { buildDatabaseHolidayNowNewsletter } from "./databaseHolidayNowNewsletter";

// Dated campaign copy: use for the 30 September 2026 reminder only.
export const DATABASE_NOW_REMINDER_SUBJECT = "⏳ מחר זה נגמר: הצעת התאמה ראשונה בתוך 3 ימים ב־299 ₪";
export const DATABASE_NOW_REMINDER_PREHEADER = "בגלל הביקוש הרחבתי את הטבת NOW בעוד 100 מקומות. תשלום חד־פעמי, ההטבה מסתיימת מחר או עם גמר המכסה.";

export function buildDatabaseHolidayNowReminder(input: {
  firstName?: string | null;
  offerUrl?: string;
  unsubscribeUrl: string;
}) {
  const base = buildDatabaseHolidayNowNewsletter({
    firstName: input.firstName,
    offerUrl: input.offerUrl ?? databaseNowOfferUrl("email"),
    unsubscribeUrl: input.unsubscribeUrl,
  });
  // Preserve the approved Rubik/beauty design, images, benefits and testimonial layout.
  const replaceExact = (html: string, from: string, to: string) => {
    if (!html.includes(from)) throw new Error(`NOW reminder template changed: ${from.slice(0, 35)}`);
    return html.replace(from, to);
  };
  let htmlContent = base.htmlContent;
  htmlContent = replaceExact(htmlContent, base.subject, DATABASE_NOW_REMINDER_SUBJECT);
  htmlContent = replaceExact(htmlContent, base.preheader, DATABASE_NOW_REMINDER_PREHEADER);
  htmlContent = replaceExact(htmlContent, "הבשורה הגדולה לחג", "ההטבה שהרחבתי בשבילכם");
  htmlContent = replaceExact(htmlContent, "ההתאמה הראשונה שלך<br />בתוך 3 ימים", "הצעת התאמה ראשונה<br />בתוך 3 ימים");
  htmlContent = replaceExact(
    htmlContent,
    `לעד ${DATABASE_NOW_MAX_USES} מימושים בסך הכול אני מתחייבת להצעת התאמה ראשונה בתוך 3 ימים מסיום הפרופיל והשאלון. בנוסף מחכה לך הטבת הצטרפות מיוחדת ותשלום חד־פעמי.`,
    "בגלל הביקוש החלטתי להרחיב את הטבת NOW בעוד 100 מקומות. אחרי השלמת הפרופיל ושאלון ה־DNA, אני מתחייבת לשלוח הצעת התאמה ראשונה בתוך 3 ימים. ההטבה מסתיימת מחר.",
  );
  htmlContent = replaceExact(
    htmlContent,
    "אם מילאת את שאלון ה־DNA, השארת פרטים או כמעט הצטרפת ואז עצרת, אני רוצה להגיד לך משהו פשוט: לא צריך לחזור לאפליקציות ולעשות הכול לבד.",
    "אם שאלון ה־DNA כבר עורר אצלך מחשבה, או שהיית בדרך להצטרף ועצרת, רציתי להזכיר לך שיש דרך אחרת להכיר. לא צריך להמשיך לחפש לבד ולעבור בין עוד ועוד פרופילים.",
  );
  htmlContent = replaceExact(htmlContent, `ההבטחה שלי ל־${DATABASE_NOW_MAX_USES} הראשונים`, "ההבטחה שלי למצטרפים עם NOW");
  htmlContent = replaceExact(htmlContent, "הטבת חג · עד 1.10", "ההטבה מסתיימת מחר");
  htmlContent = replaceExact(
    htmlContent,
    `ל־${DATABASE_NOW_MAX_USES} המימושים הראשונים או עד 1.10, המוקדם מביניהם.`,
    `ההטבה מסתיימת מחר או עם גמר המכסה המצטברת של ${DATABASE_NOW_MAX_USES} מימושים, המוקדם מביניהם.`,
  );
  htmlContent = replaceExact(
    htmlContent,
    "כי החגים מזכירים לנו מה אנחנו באמת רוצים לידנו. אני מגבילה את ההטבה כדי שאוכל לתת לכל מצטרף ומצטרפת את הדחיפה האישית שהבטחתי, ולא להפוך את זה לעוד קמפיין המוני.",
    "בימים האחרונים קיבלתי כל כך הרבה פניות שהחלטתי לפתוח עוד 100 מקומות בהטבת NOW. אם זה מרגיש נכון, אני אשמח להכיר את הפרופיל שלך ולחפש חיבור עם כוונה אמיתית.",
  );
  const firstName = String(input.firstName || "").trim();
  const greeting = firstName ? `היי ${firstName},` : "היי,";
  const textContent = `${greeting}

בימים האחרונים קיבלתי הרבה פניות על המאגר, ובגלל הביקוש החלטתי להרחיב את הטבת NOW בעוד 100 מקומות. ההטבה מסתיימת מחר או עם גמר המכסה, המוקדם מביניהם.

אם שאלון ה־DNA עורר אצלך מחשבה, או שהיית בדרך להצטרף ועצרת, רציתי להזכיר לך שיש דרך אחרת להכיר.

במאגר שלי יש יותר מאלף חברים פעילים, שאלון DNA זוגי, בדיקה אנושית שלי, פרטיות ואישור הדדי. חברי המאגר יכולים לראות ולקבל הצעות Boost בחינם ולבחור אם לשלוח הצעה ב־19.90 ₪. אפשר גם להשתתף בפינת רווק השבוע.

ההתחייבות שלי למצטרפים עם קוד ${DATABASE_NOW_COUPON}: אני שולחת הצעת התאמה ראשונה בתוך 3 ימים מרגע שהפרופיל והשאלון הושלמו במלואם.

מחיר ההצטרפות הוא 299 ₪ במקום 499 ₪, בתשלום חד־פעמי וללא מנוי. הקוד כבר מחכה בקישור: ${input.offerUrl ?? databaseNowOfferUrl("email")}

ההטבה מסתיימת מחר או עם גמר המכסה המצטברת של ${DATABASE_NOW_MAX_USES} מימושים, המוקדם מביניהם.

ההבטחה היא להצעת התאמה שנבדקה ונשלחה; אישור הדדי, פגישה או זוגיות אינם מובטחים.

באהבה,
הילית

להסרה: ${input.unsubscribeUrl}`;
  return { subject: DATABASE_NOW_REMINDER_SUBJECT, preheader: DATABASE_NOW_REMINDER_PREHEADER, htmlContent, textContent };
}
