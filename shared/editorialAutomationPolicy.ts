import { z } from "zod";

/** Publication remains disabled until deployment and explicit cadence confirmation. */
export const EDITORIAL_AUTOMATION_POLICY = Object.freeze({
  timezone: "Asia/Jerusalem",
  model: "gpt-6.1-sol",
  cadenceLabel: "ימי שני וחמישי בשעה 10:00, לפי שעון ישראל",
  callbackPath: "/api/scheduled/editorial-article",
  recommendedHeartbeatCron: "0 0 7,8 * * 1,4",
  publicLookback: 100,
  writerTimeoutMs: 55_000,
  reviewerTimeoutMs: 30_000,
  catalogueTimeoutMs: 4_000,
  deadlineMs: 100_000,
});

/** These are business facts, not instructions obtained from blog posts or customer data. */
export const EDITORIAL_BUSINESS_FACTS = Object.freeze([
  "האתר של הילית כספי עוסק בהיכרות ובבחירה זוגית. מאגר ההיכרויות הוא מסלול השירות המרכזי; פרטי חבילות ותנאים עדכניים קוראים בעמוד המאגר בלבד.",
  "במסלול המאגר הרגיל, פרופילים, שאלונים והעדפות משמשים לבחינת היכרויות אפשריות, לצד בדיקה אנושית לפני שליחת הצעה. אין להחיל תיאור זה באופן גורף על Boost או על כל מסלול אחר.",
  "מידע פרופיל ציבורי עשוי להיות מוצג לפני אישור הדדי. פרטי הקשר נחשפים רק לאחר אישור של שני הצדדים. אין לטעון שכל הפרופיל מוסתר עד להסכמה.",
  "שאלון ה־DNA הזוגי הוא כלי להתבוננות בנטיות ובדפוסי בחירה בלבד, לא בדיקה גנטית, אבחון, כלי רפואי או חיזוי של הצלחת קשר.",
  "פגישה אישית יכולה להתקיים עם הילית או עם מלווה בצוות, לפי האפשרויות העדכניות בעמוד הפגישה. אין להבטיח שכל פגישה היא עם הילית או לציין מחיר.",
  "הבחירה אם להתקדם בהיכרות נשארת בידי האנשים. אין הבטחה להצעות בתדירות מסוימת, לדייט, לזוגיות או לתוצאה.",
] as const);

/** Interleaved service intent, choice patterns and first-date angles; no seasonal claims. */
export const EDITORIAL_TOPICS = Object.freeze([
  { key: "profile-clarity", angle: "איך לכתוב פרופיל שמבטא את היומיום ואת הרצון בקשר, בלי לנסות לרצות את כולם", primaryHref: "/database", primaryLabel: "לפרטי המאגר והמסלולים" },
  { key: "needs-and-preferences", angle: "להבחין בין צורך חשוב לבין העדפה גמישה כשקוראים הצעת היכרות", primaryHref: "/database", primaryLabel: "לבחינת מסלולי ההיכרות במאגר" },
  { key: "first-date-boundaries", angle: "להגיע לדייט עם גבולות נעימים: בחירת מקום, נוחות והקשבה לרצון שלך", primaryHref: "/database", primaryLabel: "לפרטי מאגר ההיכרויות" },
  { key: "meeting-preparation", angle: "איך להתכונן לשיחה אישית על הבחירות שלך: שאלות פתוחות במקום ציפייה לפתרון מיידי", primaryHref: "/single-session", primaryLabel: "לפרטי פגישה עם הילית או עם מלווה בצוות" },
  { key: "preferences-in-context", angle: "לבדוק אם העדפות ההיכרות שלך מתאימות לחיים שאת או אתה רוצים כעת", primaryHref: "/database", primaryLabel: "לפרטי המאגר והמסלולים" },
  { key: "curious-conversation", angle: "שיחה סקרנית בדייט בלי להפוך את המפגש לראיון או להופעה", primaryHref: "/database", primaryLabel: "לפתיחת אפשרות להיכרות במאגר" },
  { key: "mutual-choice-and-privacy", angle: "להתקדם בהצעת היכרות תוך שמירה על בחירה הדדית, פרטיות וקצב אישי", primaryHref: "/database", primaryLabel: "לפרטי המאגר והמסלולים" },
  { key: "recognising-choice-habits", angle: "להתבונן בהרגלי בחירה שחוזרים אצלך בלי לתייג את עצמך או את האחר", primaryHref: "/dna-quiz", primaryLabel: "לשאלון DNA הזוגי, כלי להתבוננות בלבד" },
  { key: "respectful-follow-up", angle: "לנסח רצון להמשך או סיום אחרי דייט באופן ברור ומכבד, בלי לנחש מה האחר חושב", primaryHref: "/database", primaryLabel: "לפרטי מאגר ההיכרויות" },
] as const);

export const EDITORIAL_QUALITY_CODES = [
  "SCHEMA_INVALID", "LENGTH", "LANGUAGE", "NUMBER_OR_PRICE", "CLAIM",
  "TESTIMONIAL", "PERSONAL_STORY", "PII", "LINK_OR_MARKUP", "DUPLICATE_TITLE",
  "DUPLICATE_CONTENT", "REVIEW_REJECTED", "REVIEW_INVALID", "MODEL_UNAVAILABLE",
  "MODEL_LIST_TIMEOUT", "WRITER_TIMEOUT", "REVIEW_TIMEOUT", "GENERATION_FAILED",
  "STORAGE_FAILED", "PAUSED_BEFORE_PUBLISH", "WINDOW_EXPIRED", "SANITIZER_FAILED",
] as const;
export type EditorialQualityCode = (typeof EDITORIAL_QUALITY_CODES)[number];

export const editorialArticleSchema = z.object({
  title: z.string().trim().min(12).max(140),
  excerpt: z.string().trim().min(40).max(350),
  metaDescription: z.string().trim().min(40).max(160),
  paragraphs: z.array(z.object({
    heading: z.string().trim().min(4).max(120),
    text: z.string().trim().min(80).max(3_000),
  }).strict()).min(4).max(8),
}).strict();
export type EditorialArticle = z.infer<typeof editorialArticleSchema>;
export type EditorialPublicPost = { title: string; content: string; slug: string };
export type EditorialSlot = { slotKey: string; weekday: "Mon" | "Thu" };

/** The server clock, never a payload or client clock, determines the sole current slot. */
export function getEditorialSlot(now: Date): EditorialSlot | null {
  if (!Number.isFinite(now.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EDITORIAL_AUTOMATION_POLICY.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  const weekday = part("weekday");
  if (part("hour") !== "10" || (weekday !== "Mon" && weekday !== "Thu")) return null;
  return { slotKey: `${part("year")}-${part("month")}-${part("day")}`, weekday };
}

const normalise = (value: string) => value.normalize("NFKC")
  .replace(/<[^>]*>/g, " ").replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, " ")
  .replace(/[\u0591-\u05c7]/g, "").toLowerCase().replace(/[^a-z0-9\u05d0-\u05ea]+/g, " ").trim();
const shingles = (value: string) => {
  const words = normalise(value).split(/\s+/).slice(0, 8_000);
  return new Set(words.slice(0, Math.max(0, words.length - 11))
    .map((_, index) => words.slice(index, index + 12).join(" ")));
};

/** Conservative gate: doubtful content is private draft material, never automatically public. */
export function inspectEditorialCandidate(raw: unknown, recent: readonly EditorialPublicPost[] = []): {
  article: EditorialArticle | null; codes: EditorialQualityCode[];
} {
  const parsed = editorialArticleSchema.safeParse(raw);
  if (!parsed.success) return { article: null, codes: ["SCHEMA_INVALID"] };
  const article = parsed.data;
  const body = article.paragraphs.map(p => `${p.heading} ${p.text}`).join(" ");
  const all = `${article.title} ${article.excerpt} ${article.metaDescription} ${body}`;
  const codes = new Set<EditorialQualityCode>();
  const hebrewWords = body.match(/[\u05d0-\u05ea]+(?:[׳״'-][\u05d0-\u05ea]+)*/g) ?? [];
  if (hebrewWords.length < 500 || hebrewWords.length > 800) codes.add("LENGTH");
  const letters = all.match(/[a-zA-Z\u05d0-\u05ea]/g) ?? [];
  const hebrew = all.match(/[\u05d0-\u05ea]/g) ?? [];
  if (!letters.length || hebrew.length / letters.length < 0.85) codes.add("LANGUAGE");
  if (/[0-9٠-٩۰-۹%٪₪$€£]|אחוז|סטטיסטי|מחיר|מחירים|הנחה|מבצע|הטבה|חינם|ללא עלות|שיעור הצלחה/i.test(all)
    || /(?:^|[^\u05d0-\u05ea])(?:[בכלמהו]{0,2})?(?:מאות|אלפים|מיליונים|מיליארד|נובמבר|דצמבר|ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר)(?=$|[^\u05d0-\u05ea])/i.test(all)
    || /(?:שתי|שני|שלוש|שלושה|ארבע|ארבעה|חמש|חמישה|עשר|עשרה)\s+(?:פגישות|מפגשים|ימים|שבועות|שנים|הצעות|לקוחות|אחוזים|שלבים|טיפים)/.test(all)) codes.add("NUMBER_OR_PRICE");
  if (/מוכח|מחקר|מדעי|מדעית|פטנט|אבחון|מאבחנ|גנטי|קליני|רפואי|דיאגנוז|הפרעת|נרקיסיסט|טראומה|תחזית|נבא|מנבא|הטוב ביותר|הכי טוב|המוביל|המובילה|מובילים בתחום|מובילה בתחום|הצלחה מובטחת|מבטיח|מובטח|תמצאו זוגיות|תמצאי זוגיות|תמצא זוגיות|יבטיח|בוודאות|תמיד מצליח|יגרום לכם|תוצאה בטוחה|ימצאו אהבה|תמצאו אהבה|תמצאי אהבה|תמצא אהבה|זוגיות בטוחה/i.test(all)) codes.add("CLAIM");
  if (/לקוחות מספר|לקוחה מספר|לקוח מספר|מטופל|סיפור הצלחה|עדות של|עדויות|המליצה|ממליצה|ממליץ|הכירו אצל|הכירו דרך|התחתנו|סיפר(?:ה|ו)? (?:לי|לנו)|לדברי [\u05d0-\u05ea]+|[\u05d0-\u05ea]+ (?:מספרת|מספר|סיפרה|סיפר|העידה|העיד) (?:ש|כי|על)|(?:נועה|דנה|יוסי|שרה|רונית|משה|אורית|אבי) (?:סיפר|כתב|הכיר|מצא)/.test(all)) codes.add("TESTIMONIAL");
  if (/שחר|Shahar|Tinder|טינדר|בן זוגי|בת זוגי|בעלי|אשתי|הסיפור שלי|כשאני הכרתי|מניסיוני האישי|אני הילית|אני מבטיחה/i.test(all)) codes.add("PERSONAL_STORY");
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?972|0[2-9])(?:[\s().-]*\d){7,}|תעודת זהות|מספר זהות|כתובת מגורים|רחוב .+\d/i.test(all)) codes.add("PII");
  // Models never choose links, markup, media, source citations or tracking parameters.
  if (/https?:|www\.|mailto:|tel:|javascript:|data:|utm_|[<>]|\]\(|(?:^|\s)\/(?:[\w\u05d0-\u05ea-]+)|\b[a-z0-9-]+\.(?:com|org|net|co\.il|il|io|app|dev)\b|&#?\w+;/i.test(all)) codes.add("LINK_OR_MARKUP");
  const candidateShingles = shingles(body);
  for (const post of recent.slice(0, EDITORIAL_AUTOMATION_POLICY.publicLookback)) {
    if (normalise(post.title) === normalise(article.title)) codes.add("DUPLICATE_TITLE");
    const oldShingles = shingles(post.content);
    let shared = 0;
    for (const shingle of Array.from(candidateShingles)) if (oldShingles.has(shingle)) shared++;
    // Both a large share and a large absolute copied passage independently fail.
    if (candidateShingles.size && (shared / candidateShingles.size >= 0.25 || shared >= 60)) codes.add("DUPLICATE_CONTENT");
  }
  return { article, codes: Array.from(codes) };
}
