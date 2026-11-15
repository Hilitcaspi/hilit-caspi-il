import { isNovemberBundleOfferActive } from "./novemberBundleOffer";

export const FEATURED_EDITORIAL = [
  { href: "/signs", title: "איך לזהות עניין ורצון להתקרב", excerpt: "על הקשבה, יוזמה ועקביות בתחילת קשר, ומה כדאי לברר מעבר לסימן בודד.", tag: "בחירה זוגית" },
  { href: "/attraction", title: "על משיכה, חיזור והחיים שביניהם", excerpt: "הזווית האישית שלי על חיזור, ביטחון והיכולת ליהנות מהיכרות בלי לאבד את עצמנו.", tag: "הסיפור והגישה שלי" },
] as const;

export function parseEditorialTags(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((tag): tag is string => typeof tag === "string").map(tag => tag.trim()).filter(Boolean);
  } catch { /* Older records store comma-separated tags. */ }
  return value.split(",").map(tag => tag.trim()).filter(Boolean);
}

export function editorialNextStep(slug: string, now = Date.now()) {
  if (slug === "november-2026-database-course-offer" && isNovemberBundleOfferActive(now)) {
    return { title: "להכיר וגם להעמיק בבחירה", text: "הטבת נובמבר משלבת הצטרפות למאגר והקורס המלא שלי, המסע לזוגיות, במתנה. ההצעה בתוקף עד סוף 30.11.2026, לפי התנאים בעמוד ההטבה.", primaryHref: "/november-love", primaryLabel: "לפרטי ההטבה ולהצטרפות" };
  }
  if (/chemistry|dna|psychology|signs/.test(slug)) {
    return { title: "מה חשוב לך בקשר הבא?", text: "אפשר להתחיל בהתבוננות דרך שאלון DNA הזוגי החינמי, ולהמשיך להיכרות דרך המאגר או לשיחה אישית על הבחירות והדפוסים שלך.", primaryHref: "/dna-quiz", primaryLabel: "לשאלון DNA החינמי" };
  }
  if (/attraction|coaching/.test(slug)) {
    return { title: "לבחון את הבחירות שלך בזוגיות", text: "פגישה אישית היא מקום לעצור, להבין מה חשוב לך בזוגיות ולחשוב על הצעד הבא. לתיאום עם הילית יש לבדוק את האפשרויות בעמוד הפגישה.", primaryHref: "/single-session", primaryLabel: "לפרטים ולתיאום פגישה אישית" };
  }
  return { title: "לפתוח אפשרות להיכרות חדשה", text: "במאגר ההיכרויות מתחילים מהפרופיל, ההעדפות והשאלונים. במסלול הרגיל הצעות עוברות גם בחינה אנושית, והבחירה אם להתקדם נשארת של שני הצדדים.", primaryHref: "/database", primaryLabel: "לפרטי המאגר ולהצטרפות" };
}
