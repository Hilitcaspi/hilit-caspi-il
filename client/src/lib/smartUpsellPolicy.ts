export type PurchaseFlags = {
  database?: boolean;
  guide?: boolean;
  course?: boolean;
  session?: boolean;
  coaching?: boolean;
};

export type UpsellOffer = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

const SESSION: UpsellOffer = {
  id: "intro_session",
  eyebrow: "רוצה שנכיר אותך מעבר לטופס?",
  title: "פגישת היכרות אישית",
  text: "פגישה ממוקדת עם הילית או עם איש מקצוע מהצוות, כדי להכיר אותך לעומק ולדייק את הצעד הבא.",
  primaryLabel: "לפרטי הפגישה",
  primaryHref: "/single-session",
  secondaryLabel: "למאגר הרווקים",
  secondaryHref: "/database",
};

const COURSE: UpsellOffer = {
  id: "relationship_course",
  eyebrow: "רוצה להפוך ידע לתהליך?",
  title: "הקורס הדיגיטלי למציאת זוגיות",
  text: "תהליך מעשי ומסודר שעוזר לזהות דפוסים, לדייק בחירה ולהגיע לדייטים מוכנים יותר.",
  primaryLabel: "לפרטי הקורס",
  primaryHref: "/course",
  secondaryLabel: "פגישת היכרות",
  secondaryHref: "/single-session",
};

const DATABASE: UpsellOffer = {
  id: "singles_database",
  eyebrow: "מוכן/ה לעבור מהבנה להזדמנויות?",
  title: "מאגר הרווקים והרווקות",
  text: "פרופיל מפורט, שאלון מדעי ובדיקת התאמה הדדית מול חברים פעילים במאגר.",
  primaryLabel: "להצטרפות למאגר",
  primaryHref: "/database",
  secondaryLabel: "פגישת היכרות",
  secondaryHref: "/single-session",
};

const COACHING: UpsellOffer = {
  id: "personal_coaching",
  eyebrow: "רוצה להעמיק מעבר לפגישה אחת?",
  title: "תהליך ליווי אישי",
  text: "תהליך מובנה עם הצוות של הילית לזיהוי דפוסים, בניית אסטרטגיה וליווי בדרך לזוגיות.",
  primaryLabel: "לפרטי הליווי",
  primaryHref: "/coaching",
  secondaryLabel: "למאגר הרווקים",
  secondaryHref: "/database",
};

const EXCLUDED_PREFIXES = [
  "/crm", "/admin", "/team", "/terms", "/match", "/my-profile", "/unsubscribe",
  "/join/questionnaire", "/join/complete", "/upload-photo", "/course/view", "/guide/view", "/guide/access",
  "/database-plus", "/thank-you/plus",
];

export function selectSmartUpsell(path: string, purchases: PurchaseFlags): UpsellOffer | null {
  if (EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix))) return null;

  if (path.startsWith("/thank-you/session")) return purchases.coaching ? DATABASE : COACHING;
  if (path.startsWith("/thank-you/database")) return SESSION;
  if (path.startsWith("/thank-you/course")) return purchases.session ? DATABASE : SESSION;
  if (path.startsWith("/thank-you/digital") || path.startsWith("/thank-you/bundle")) return purchases.course ? SESSION : COURSE;
  if (path.startsWith("/thank-you/coaching")) return purchases.database ? null : DATABASE;

  if (path.startsWith("/single-session")) return purchases.coaching ? DATABASE : COACHING;
  if (path.startsWith("/coaching")) return purchases.database ? null : DATABASE;
  if (path.startsWith("/course")) return purchases.session ? DATABASE : SESSION;
  if (path.startsWith("/guide")) return purchases.course ? SESSION : COURSE;
  if (path.startsWith("/database") || path.startsWith("/maagar") || path === "/join") return SESSION;

  if (path === "/" || path.startsWith("/dna-quiz") || path.startsWith("/blog") || path.startsWith("/signs") || path.startsWith("/brain") || path.startsWith("/lamekabel")) {
    if (!purchases.database) return DATABASE;
    if (!purchases.session) return SESSION;
    if (!purchases.course) return COURSE;
    return null;
  }

  return null;
}

export function purchaseFromThankYouPath(path: string): keyof PurchaseFlags | null {
  if (path.startsWith("/thank-you/database")) return "database";
  if (path.startsWith("/thank-you/course")) return "course";
  if (path.startsWith("/thank-you/session")) return "session";
  if (path.startsWith("/thank-you/coaching")) return "coaching";
  if (path.startsWith("/thank-you/digital")) return "guide";
  return null;
}
