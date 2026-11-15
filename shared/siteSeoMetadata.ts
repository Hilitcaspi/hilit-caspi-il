// Fixed first-party origin: never trust Host or forwarded headers for canonicals.
export const SEO_ORIGIN = "https://hilitcaspi.com";

export type SeoMeta = {
  title: string;
  description: string;
  image?: string | null;
  type?: "article" | "website";
  noindex?: boolean;
};
export const PUBLIC_ROUTE_META: Readonly<Record<string, SeoMeta>> = {
  "/": {
    title: "הילית כספי | אימון זוגיות ומאגר רווקים ורווקות | פסיכולוגיה חיובית",
    description:
      "גלו את ה-DNA הזוגי שלכם עם שאלון ייחודי, מאגר רווקים ורווקות, התאמות מבוססות שאלונים ובדיקה אנושית, וכלים מעשיים למציאת זוגיות.",
  },
  "/blog": {
    title: "מאמרים על זוגיות, היכרויות ובחירה | הילית כספי",
    description:
      "מאמרים ותובנות של הילית כספי על אהבה, דייטינג וזוגיות, בחירת בן או בת זוג והיכרות דרך מאגר רווקים ורווקות.",
  },
  "/privacy": {
    title: "מדיניות פרטיות | הילית כספי",
    description: "מידע על איסוף ושימוש בנתונים באתר הישראלי, הצגת פרופילים בהתאמות, ספקי שירות ומדידה, וזכויות עיון ותיקון. דרכי קשר בנוגע למידע שלכם.",
  },
  "/database": {
    title: "מאגר רווקים ורווקות והתאמות לזוגיות | הילית כספי",
    description:
      "מאגר ההיכרויות של הילית כספי: פרופיל אישי, העדפות ושאלונים זוגיים לזיהוי חיבורים אפשריים, עם בדיקה אנושית של ההתאמות.",
  },
  "/dna-quiz": {
    title: "שאלון DNA זוגי | להכיר את דפוסי הזוגיות שלכם | הילית כספי",
    description:
      "שאלון DNA זוגי להיכרות עם דפוסי הזוגיות וההעדפות שלכם. נקודת התחלה להבנת הבחירות שלכם ולדיוק מה שחשוב לכם בקשר.",
  },
  "/single-session": {
    title: "פגישת היכרות ואימון זוגיות אישי | הילית כספי",
    description:
      "פגישה אישית על הבחירות והכיוון בדרך לזוגיות. אפשרויות התיאום עם הילית ומלוות הצוות בעמוד הפגישה.",
  },
  "/november-love": {
    title: "NOVEMBER SALE | מאגר זוגיות וקורס ב־349 ₪ | הילית כספי",
    description:
      "חבילת NOVEMBER SALE של הילית כספי: הצטרפות למאגר רווקים ורווקות והקורס הדיגיטלי לזוגיות. פרטי ההצעה והתנאים בעמוד.",
  },
  "/signs": {
    title: "סימנים לעניין בתחילת קשר | הילית כספי",
    description:
      "על הקשבה, יוזמה ועקביות בתחילת קשר, ומה כדאי לברר מעבר לסימן בודד. כלים להתבוננות בחיזור ובבחירות בדרך לזוגיות.",
  },
  "/attraction": {
    title: "על משיכה, חיזור והחיים שביניהם | הילית כספי",
    description:
      "אין גבר שרציתי ולא השגתי. מאמר אישי של הילית כספי על חיזור, קלילות וביטחון: עניין בדייט, מקום ליוזמה שלו, חיים מלאים ודרך לבחור נכון.",
  },
};
// Explicit, reviewed public whitelist, not every route in App.tsx. /about is
// currently only an English route; Hebrew author information lives at /#about.
export const PUBLIC_SITEMAP_PATHS = Object.freeze(
  Object.keys(PUBLIC_ROUTE_META)
);
export const PRIVATE_ROUTE_PREFIXES = Object.freeze([
  "/admin",
  "/crm",
  "/team",
  "/private",
  "/profile",
  "/my-profile",
  "/join",
  "/matches",
  "/upload-photo",
  "/thank-you",
  "/thanks",
  "/access",
  "/match/respond",
  "/match/outcome",
  "/match/return-to-pool",
  "/match/owner-approve",
  "/guide/view",
  "/guide/access",
  "/course/view",
  "/compass",
  "/november",
  "/lead",
  "/ld",
  "/ll",
  "/lp",
  "/live/thank-you",
  "/live/question",
  "/testimonial/feedback",
  "/testimonial/reward",
  "/__preview",
  "/unsubscribe",
  "/u",
]);
