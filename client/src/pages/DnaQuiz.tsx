/**
 * DNA Quiz - "פיצוח ה-DNA הזוגי"
 * 20 statements rated 1-5, grouped into 4 personality types:
 * Group A (1-5):  leader      - המנהיגה/המנהיג המגנטי
 * Group B (6-10): romantic    - הרומנטית/הרומנטיקן העמוק
 * Group C (11-15): free_spirit - רוח חופשית
 * Group D (16-20): anchor     - העוגן היציב
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { trackLead } from "@/lib/metaPixel";
import { gaGenerateLead, gaQuizComplete } from "@/lib/ga";
type DnaType = "leader" | "romantic" | "free_spirit" | "anchor";
type Gender = "female" | "male";

const STATEMENTS_FEMALE: string[] = [
  // Group A - leader (1-5)
  "בסביבה שלי (בעבודה או עם חברים) אני בדרך כלל זו שלוקחת פיקוד, מזמינה ומקבלת החלטות.",
  "קשה לי לשחרר שליטה ולתת לאדם אחר לנהל את הדברים, גם בתוך זוגיות.",
  "לפעמים גברים אומרים לי שאני משדרת עוצמה שעלולה להרתיע, או שאני נראית 'בלתי מושגת'.",
  "ברגעי משבר או ריב, אני פועלת בצורה רציונלית, מנתחת את המצב ומחפשת פתרון מעשי.",
  "חשוב לי מאוד להרגיש שאני שומרת על העצמאות שלי ולא תלויה באף אחד.",

  // Group B - romantic (6-10)
  "אני נותנת את כל עצמי בזוגיות ולפעמים מרגישה שאני משקיעה יותר מהצד השני.",
  "תגובות רומנטיות, מילים חמות ומגע פיזי תכוף הם אוויר לנשימה עבורי בקשר.",
  "כשאני פוגשת מישהו שמוצא חן בעיניי, אני יכולה לדמיין את העתיד המשותף שלנו מהר מאוד.",
  "לעתים קרובות אני מוצאת את עצמי מנתחת הודעות או התנהגויות של בן הזוג, ומחפשת סימנים שמשהו לא בסדר, מתוך חשש להיפגע.",
  "אני נוטה להימנע מעימותים קשים ומעדיפה לוותר לפעמים רק כדי לשמור על ההרמוניה בינינו.",

  // Group C - free_spirit (11-15)
  "שגרה קבועה ומצופה מדי בזוגיות גורמת לי להרגיש כלואה או להתשעמם.",
  "סוף שבוע מושלם עבורי חייב לכלול יציאות, חברים, הרפתקה ספונטנית או חוויות שעוד לא עשינו.",
  "אני זקוקה להרבה מאוד מרחב וזמן לעצמי כדי להיטען, גם כשאני מאוהבת עד הגג.",
  "אני פועלת לפי אינטואיציה ותחושות בטן יותר מאשר לפי תכנון מראש ורשימות.",
  "כשאני מרגישה שמישהו מנסה להגביל אותי או הופך תלותית, אני לוקחת צעד אחורה באינסטינקט.",

  // Group D - anchor (16-20)
  "הדבר הכי חשוב שלי למצוא בבן זוג הוא יציבות, עקביות ותחושת ביטחון מוחלטת.",
  "אני אוהבת לדאוג לבן הזוג שלי (לבשל, לארגן, לפנק) ומרגישה שזו הדרך המרכזית שלי להראות אהבה.",
  "אני מעדיפה ערב אינטימי ושקט בבית עם בן הזוג על פני יציאה למסיבה או בר רועש.",
  "אני אדם שמתכננת קדימה ולי חשוב לדעת שיש לנו מטרות משותפות וכיוון ברור לקשר.",
  "תקשורת יומיומית רציפה (הודעות בוקר טוב, עדכונים במהלך היום) היא קריטית עבורי כדי להרגיש מחוברת.",
];

const STATEMENTS_MALE: string[] = [
  // Group A - leader (1-5)
  "בסביבה שלי (בעבודה או עם חברים) אני בדרך כלל זה שלוקח פיקוד, מזמין ומקבל החלטות.",
  "קשה לי לשחרר שליטה ולתת לאדם אחר לנהל את הדברים, גם בתוך זוגיות.",
  "לפעמים נשים אומרות לי שאני משדר עוצמה שעלולה להרתיע, או שאני נראה 'בלתי מושג'.",
  "ברגעי משבר או ריב, אני פועל בצורה רציונלית, מנתח את המצב ומחפש פתרון מעשי.",
  "חשוב לי מאוד להרגיש שאני שומר על העצמאות שלי ולא תלוי באף אחד.",

  // Group B - romantic (6-10)
  "אני נותן את כל עצמי בזוגיות ולפעמים מרגיש שאני משקיע יותר מהצד השני.",
  "תגובות רומנטיות, מילים חמות ומגע פיזי תכוף הם אוויר לנשימה עבורי בקשר.",
  "כשאני פוגש מישהי שמוצאת חן בעיניי, אני יכול לדמיין את העתיד המשותף שלנו מהר מאוד.",
  "לעתים קרובות אני מוצא את עצמי מנתח הודעות או התנהגויות של בת הזוג, ומחפש סימנים שמשהו לא בסדר, מתוך חשש להיפגע.",
  "אני נוטה להימנע מעימותים קשים ומעדיף לוותר לפעמים רק כדי לשמור על ההרמוניה בינינו.",

  // Group C - free_spirit (11-15)
  "שגרה קבועה ומצופה מדי בזוגיות גורמת לי להרגיש כלוא או להתשעמם.",
  "סוף שבוע מושלם עבורי חייב לכלול יציאות, חברים, הרפתקה ספונטנית או חוויות שעוד לא עשינו.",
  "אני זקוק להרבה מאוד מרחב וזמן לעצמי כדי להיטען, גם כשאני מאוהב עד הגג.",
  "אני פועל לפי אינטואיציה ותחושות בטן יותר מאשר לפי תכנון מראש ורשימות.",
  "כשאני מרגיש שמישהי מנסה להגביל אותי או הופכת תלותית, אני לוקח צעד אחורה באינסטינקט.",

  // Group D - anchor (16-20)
  "הדבר הכי חשוב שלי למצוא בבת זוג הוא יציבות, עקביות ותחושת ביטחון מוחלטת.",
  "אני אוהב לדאוג לבת הזוג שלי (לבשל, לארגן, לפנק) ומרגיש שזו הדרך המרכזית שלי להראות אהבה.",
  "אני מעדיף ערב אינטימי ושקט בבית עם בת הזוג על פני יציאה למסיבה או בר רועש.",
  "אני אדם שמתכנן קדימה ולי חשוב לדעת שיש לנו מטרות משותפות וכיוון ברור לקשר.",
  "תקשורת יומיומית רציפה (הודעות בוקר טוב, עדכונים במהלך היום) היא קריטית עבורי כדי להרגיש מחובר.",
];

const SCALE_LABELS_FEMALE = ["לא מאפיינת אותי בכלל", "לא מאפיינת", "ניטרלית", "מאפיינת", "מאפיינת אותי מאוד"];
const SCALE_LABELS_MALE   = ["לא מאפיין אותי בכלל", "לא מאפיין", "ניטרלי", "מאפיין", "מאפיין אותי מאוד"];

const DNA_INFO: Record<DnaType, {
  label_f: string; label_m: string;
  subtitle: string;
  superpower: string;
  challenge: string;
  match_f: string; match_m: string;
  color: string; bg: string;
}> = {
  leader: {
    label_f: "המנהיגה הממגנטת",
    label_m: "המנהיג הממגנט",
    subtitle: "עוצמה, כריזמה, עצמאות",
    superpower: "הכריזמה והביטחון שלך הם הנכס הזוגי הגדול ביותר שלך. אתה מביא לקשר עוצמה, בהירות ומנהיגות טבעית. מי שזוכה בך כשותף - מקבל מישהו שאוהב ללא משחקים ומחפש שותף שירוץ לצידו, לא מאחוריו.",
    challenge: "בגלל שאתה כל כך עוצמתי, הרבה אנשים מרגישים מאוימים. אתה לפעמים מוצא את עצמך 'מנהל' את הקשר ואת בן הזוג - למרות שכל מה שאתה רוצה זה פשוט להישען על מישהו אחר.",
    match_f: "את צריכה 'סלע בטוח' - גבר עם ביטחון עצמי ורוגע פנימי שלא נכנס לקרבות אגו, לא מבוהל מהצלחתך, ונשאר נוכח ורגוע. נוכחותו היציבה כל כך תגרום לך מיד לרצות להניח את הנשק ולהיות רכה ונשית לצידו.",
    match_m: "אתה צריך 'סלע בטוח' - אישה עם ביטחון עצמי ורוגע פנימי שלא נכנסת לקרבות אגו, לא מבוהלת מהצלחתך, ונשארת נוכחת ורגועה. נוכחותה היציבה תגרום לך מיד לרצות להניח את הנשק.",
    color: "#191265", bg: "#ffe27c",
  },
  romantic: {
    label_f: "הרומנטיקנית העמוקה",
    label_m: "הרומנטיקן העמוק",
    subtitle: "עומק, רגש, חיבור נשמתי",
    superpower: "הלב שלך הוא הנכס הזוגי הגדול ביותר שלך. יש לך יכולת נדירה לאהוב, להכיל ולהעניק. אתה מביא לקשר אינטימיות אמיתית, עומק רגשי ורצון לבנות חיבור נשמתי. מי שזוכה בך - ירגיש שהוא הכי מיוחד בעולם.",
    challenge: "הנתינה האינסופית שלך לפעמים גורמת לך לשכוח את הצרכים שלך. הנטייה שלך לנתח כל מילה (Overthinking) נובעת מפחד להיפגע ולפעמים גורמת לך להיאחז חזק מדי, או להסכים לפירורי יחס כדי לא לאבד את הקשר.",
    match_f: "ההתאמה המושלמת שלך היא 'האביר התקשורתי' - גבר שלא מפחד לדבר על רגשות, יוזם שיחות עומק, נותן לך חיזוקים קבועים ומילוליים ויוצר שקיפות מלאה. הוא מתכנן דייטים מראש ויוצר בטיחות שמאפשרת ללב שלך להיפתח.",
    match_m: "ההתאמה המושלמת שלך היא 'האביר התקשורתי' - אישה שלא מפחדת לדבר על רגשות, יוזמת שיחות עומק ויוצרת שקיפות מלאה. היא מתכננת ביחד ויוצרת בטיחות שמאפשרת ללב שלך להיפתח.",
    color: "#191265", bg: "#f0eadc",
  },
  free_spirit: {
    label_f: "הרוח החופשית",
    label_m: "הרוח החופשית",
    subtitle: "ספונטניות, חיות, אנרגיה",
    superpower: "אתה מכניס לכל חדר שנכנסים אליו אנרגיה, חיות וריגוש. הנכס הזוגי הגדול ביותר שלך הוא הספונטניות ושמחת החיים. הזוגיות איתך היא הרפתקה. כשאתה בוחר במישהו - זו בחירה נקייה ואמיתית, לא מתוך תלות.",
    challenge: "הפחד משגרה כובלת לפעמים גורם לך לברוח כשדברים הופכים יציבים או 'רגילים מדי'. אתה עלול לבלבל בין יציבות בריאה לשעמום, ולהימשך לאנשים 'בלתי מושגים' שמשאירים אותך על הקצה במקום לבחור במי שיעשה לך טוב לטווח הארוך.",
    match_f: "ההתאמה המושלמת שלך היא 'העוגן הגמיש' - גבר יציב עם ראש פתוח שיש לו חיים מלאים משלו. הוא ייתן לך את המרחב שאת צריכה ולא יעלב. הוא יזרום עם הרעיונות המשוגעים שלך בחיוך, אבל גם ידע לעגן אותך באהבה כשתצטרכו פשוט לנוח ביחד.",
    match_m: "ההתאמה המושלמת שלך היא 'העוגן הגמיש' - אישה יציבה עם ראש פתוח שיש לה חיים מלאים משלה. היא תיתן לך את המרחב שאתה צריך ותזרום עם הרעיונות שלך, אבל גם תדע לעגן אותך באהבה.",
    color: "#191265", bg: "#e8f4f8",
  },
  anchor: {
    label_f: "העוגן היציב",
    label_m: "העוגן היציב",
    subtitle: "יציבות, נאמנות, ביטחון",
    superpower: "אתה ה'בית' - ההגדרה של בית. הנכס הזוגי הגדול ביותר שלך הוא היכולת ליצור שקט, ביטחון ומרחב מוגן למי שאיתך. אתה נאמן, מעשי ויודע לקחת אחריות. האנשים האיכותיים שחושבים על זוגיות ובניית עתיד - מסתכלים עליך ישר.",
    challenge: "מרוב שאתה דואג לכולם ולכל דבר, לפעמים הופך ל'מטפל' של הקשר ומושך אליך אנשים ילדותיים שמחפשים מי שידאג להם. אתה מתקשה לשחרר את המשיכות ולתת לבן הזוג להשקיע בך בחזרה.",
    match_f: "את צריכה גבר אלפא חיובי - 'היוזם המעריך'. הוא יודע לקחת פיקוד, מזמין תוכניות, פותח דלתות - ובעיקר שואל: 'מה אני יכול לעשות היום כדי להקל עליך?' הוא איש של מעשים שיודע לפנק אותך בדיוק כמו שאת מפנקת אחרים.",
    match_m: "אתה צריך 'היוזמת המעריכה' - אישה שרואה ומעריכה את כל הנתינה שלך, יוזמת ביחד, ויודעת לפנק אותך בדיוק כמו שאתה מפנק אחרים.",
    color: "#191265", bg: "#f5f0e8",
  },
};

// Tiebreaker questions: one per pair of types that might tie
// Each has answer_f/answer_m for the two button labels (instead of type names)
const TIEBREAKER_QUESTIONS: { types: [DnaType, DnaType]; question_f: string; question_m: string; answer_a_f: string; answer_a_m: string; answer_b_f: string; answer_b_m: string }[] = [
  {
    types: ["leader", "anchor"],
    question_f: "בסוף יום קשה, מה שמרגיש לך יותר טבעי?",
    question_m: "בסוף יום קשה, מה שמרגיש לך יותר טבעי?",
    answer_a_f: "לקחת פיקוד ולפתור את הבעיה",
    answer_a_m: "לקחת פיקוד ולפתור את הבעיה",
    answer_b_f: "לחפש שקט ולהיות עם אנשים שאוהבים אותי",
    answer_b_m: "לחפש שקט ולהיות עם אנשים שאוהבים אותי",
  },
  {
    types: ["leader", "romantic"],
    question_f: "כשאת מאוהבת, מה מנצח בך יותר?",
    question_m: "כשאתה מאוהב, מה מנצח בך יותר?",
    answer_a_f: "הראש. אני בוחנת אם זה הגיוני ומתאים",
    answer_a_m: "הראש. אני בוחן אם זה הגיוני ומתאים",
    answer_b_f: "הלב. אני מרגישה ומתמסרת",
    answer_b_m: "הלב. אני מרגיש ומתמסר",
  },
  {
    types: ["leader", "free_spirit"],
    question_f: "מה יותר מאפיין אותך בזוגיות?",
    question_m: "מה יותר מאפיין אותך בזוגיות?",
    answer_a_f: "אני אוהבת לדעת לאן הולכים ולתכנן קדימה",
    answer_a_m: "אני אוהב לדעת לאן הולכים ולתכנן קדימה",
    answer_b_f: "אני אוהבת לזרום ולהתפתיע",
    answer_b_m: "אני אוהב לזרום ולהתפתיע",
  },
  {
    types: ["romantic", "anchor"],
    question_f: "מה חשוב לך יותר בקשר?",
    question_m: "מה חשוב לך יותר בקשר?",
    answer_a_f: "עומק רגשי ואינטימיות אמיתית",
    answer_a_m: "עומק רגשי ואינטימיות אמיתית",
    answer_b_f: "יציבות, ביטחון ושגרה שמרגישה בית",
    answer_b_m: "יציבות, ביטחון ושגרה שמרגישה בית",
  },
  {
    types: ["romantic", "free_spirit"],
    question_f: "מה יותר מתאר אותך?",
    question_m: "מה יותר מתאר אותך?",
    answer_a_f: "אני נותנת הכל לאהבה ומחפשת חיבור עמוק",
    answer_a_m: "אני נותן הכל לאהבה ומחפש חיבור עמוק",
    answer_b_f: "אני צריכה מרחב ועצמאות גם כשאני מאוהבת",
    answer_b_m: "אני צריך מרחב ועצמאות גם כשאני מאוהב",
  },
  {
    types: ["anchor", "free_spirit"],
    question_f: "מה יותר קרוב אלייך?",
    question_m: "מה יותר קרוב אליך?",
    answer_a_f: "אני בית. אני אוהבת שגרה, יציבות ולדאוג לאחרים",
    answer_a_m: "אני בית. אני אוהב שגרה, יציבות ולדאוג לאחרים",
    answer_b_f: "אני הרפתקה. אני אוהבת ספונטניות וחדש",
    answer_b_m: "אני הרפתקה. אני אוהב ספונטניות וחדש",
  },
];

export default function DnaQuiz() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  // return_to=join: came from /join form, return with DNA result instead of showing payment CTA
  const returnTo = urlParams.get("return_to"); // "join" | null
  const returnFreeToken = urlParams.get("free_token"); // pass-through if present
  // UTM tracking: URL > sessionStorage > localStorage (localStorage survives cross-domain redirects)
  const utmSource = urlParams.get("utm_source") || sessionStorage.getItem("utm_source") || localStorage.getItem("utm_source") || undefined;
  const utmMedium = urlParams.get("utm_medium") || sessionStorage.getItem("utm_medium") || localStorage.getItem("utm_medium") || undefined;
  const utmCampaign = urlParams.get("utm_campaign") || sessionStorage.getItem("utm_campaign") || localStorage.getItem("utm_campaign") || undefined;
  const utmContent = urlParams.get("utm_content") || sessionStorage.getItem("utm_content") || localStorage.getItem("utm_content") || undefined;
  const utmTerm = urlParams.get("utm_term") || sessionStorage.getItem("utm_term") || localStorage.getItem("utm_term") || undefined;
  // Persist UTMs in both sessionStorage and localStorage so they survive page reloads and cross-domain redirects
  if (urlParams.get("utm_source")) { sessionStorage.setItem("utm_source", urlParams.get("utm_source") as string); localStorage.setItem("utm_source", urlParams.get("utm_source") as string); }
  if (urlParams.get("utm_medium")) { sessionStorage.setItem("utm_medium", urlParams.get("utm_medium") as string); localStorage.setItem("utm_medium", urlParams.get("utm_medium") as string); }
  if (urlParams.get("utm_campaign")) { sessionStorage.setItem("utm_campaign", urlParams.get("utm_campaign") as string); localStorage.setItem("utm_campaign", urlParams.get("utm_campaign") as string); }
  if (urlParams.get("utm_content")) { sessionStorage.setItem("utm_content", urlParams.get("utm_content") as string); localStorage.setItem("utm_content", urlParams.get("utm_content") as string); }
  if (urlParams.get("utm_term")) { sessionStorage.setItem("utm_term", urlParams.get("utm_term") as string); localStorage.setItem("utm_term", urlParams.get("utm_term") as string); }
  const [phase, setPhase] = useState<"gender" | "quiz" | "tiebreaker" | "capture" | "result">("gender");

  // Scroll to top on every phase change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [phase]);
  const [gender, setGender] = useState<Gender>("female");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [dnaType, setDnaType] = useState<DnaType | null>(null);
  const [scores, setScores] = useState<Record<DnaType, number> | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<number[]>([]);
  const [tiebreakerQuestion, setTiebreakerQuestion] = useState<typeof TIEBREAKER_QUESTIONS[0] | null>(null);
  const [tiebreakerAnswer, setTiebreakerAnswer] = useState<DnaType | null>(null);
  const [captureForm, setCaptureForm] = useState({ name: "", email: "", phone: "" });
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const sessionId = useRef(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  const trackMutation = trpc.analytics.track.useMutation();
  const submitMutation = trpc.dnaQuiz.submit.useMutation({
    onSuccess: (data) => {
      setDnaType(data.dnaType as DnaType);
      setScores(data.scores as Record<DnaType, number>);
      setPhase("result");
      // Track quiz complete
      trackMutation.mutate({ eventType: "dna_quiz_complete", page: "/dna-quiz" });
      // Fire Meta Pixel Lead event, marks completion of DNA quiz with contact details
      trackLead({ content_name: "שאלון DNA - תוצאות" });
      gaQuizComplete("dna_quiz");
    },
  });
  const createLeadMutation = trpc.crm.createLead.useMutation();

  const STATEMENTS = gender === "female" ? STATEMENTS_FEMALE : STATEMENTS_MALE;
  const SCALE_LABELS = gender === "female" ? SCALE_LABELS_FEMALE : SCALE_LABELS_MALE;

  // Compute group scores from an answers array
  const computeGroupScores = (ans: number[]) => ({
    leader:      ans.slice(0, 5).reduce((s, v) => s + v, 0),
    romantic:    ans.slice(5, 10).reduce((s, v) => s + v, 0),
    free_spirit: ans.slice(10, 15).reduce((s, v) => s + v, 0),
    anchor:      ans.slice(15, 20).reduce((s, v) => s + v, 0),
  });

  const handleRate = (value: number) => {
    // Replace answer at currentIdx (handles back-navigation correctly)
    const newAnswers = [...answers];
    newAnswers[currentIdx] = value;
    setAnswers(newAnswers);

    if (currentIdx < STATEMENTS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // All 20 answered - check for a tie before going to capture
      const finalAnswers: number[] = Array.from({ length: 20 }, (_, i) =>
        typeof newAnswers[i] === "number" ? newAnswers[i] : 3
      );
      setPendingAnswers(finalAnswers);

      const gs = computeGroupScores(finalAnswers);
      const maxScore = Math.max(...Object.values(gs));
      // Only exact ties trigger tiebreaker (same score)
      const topTypes = (Object.keys(gs) as DnaType[]).filter(k => gs[k] === maxScore);

      if (topTypes.length >= 2) {
        // Find a tiebreaker question for the top two types
        const [t1, t2] = topTypes.slice(0, 2);
        const tbq = TIEBREAKER_QUESTIONS.find(
          q => (q.types[0] === t1 && q.types[1] === t2) ||
               (q.types[0] === t2 && q.types[1] === t1)
        ) ?? TIEBREAKER_QUESTIONS.find(
          q => topTypes.includes(q.types[0]) && topTypes.includes(q.types[1])
        ) ?? null;
        if (tbq) {
          setTiebreakerQuestion(tbq);
          setPhase("tiebreaker");
          return;
        }
      }

      setPhase("capture");
    }
  };

  const progress = Math.round((currentIdx / STATEMENTS.length) * 100);
  const info = dnaType ? DNA_INFO[dnaType] : null;
  const label = info ? (gender === "female" ? info.label_f : info.label_m) : "";
  const matchText = info ? (gender === "female" ? info.match_f : info.match_m) : "";

  // ── Gender selection ────────────────────────────────────────────────────────
  if (phase === "gender") {
    const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
    const TESTIMONIALS = [
      {
        text: "הבנתי לגמרי מה עצר אותי. תוך 3 חודשים הייתי בזוגיות.",
        name: "מיכל, 34",
        avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp",
        gender: "female"
      },
      {
        text: "חיפשתי בדיוק את מה שמזיק לי. השינוי היה מידי.",
        name: "שירה, 29",
        avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp",
        gender: "female"
      },
      {
        text: "חשבתי שהגיל שלי הוא מכשול. הילית הוכיחה לי שהפך.",
        name: "נועה, 38",
        avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp",
        gender: "female"
      },
    ];
    return (
      <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
        {/* Back to home bar */}
        <div className="bg-[#191265]/95 backdrop-blur-sm sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between border-b border-white/10">
          <a href="/" className="text-white/80 hover:text-[#ffe27c] transition-colors text-sm font-medium flex items-center gap-1.5">
            ← לדף הבית
          </a>
          <span className="text-white font-bold text-sm">הילית כספי</span>
          <div className="w-20" />
        </div>
        <div className="bg-[#191265] pt-10 pb-16 px-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 50% 0%, #ffe27c 0%, transparent 60%)"}} />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
            {/* Free badge */}
            <div className="inline-block bg-[#ffe27c] text-[#191265] text-xs font-black px-4 py-1.5 rounded-full mb-5 tracking-wide">
              ✦ חינם לגמרי
            </div>
            <div className="flex justify-center mb-5">
              <div className="relative">
                <img
                  src={PROFILE_IMG}
                  alt="הילית כספי"
                  className="w-20 h-20 rounded-full object-cover object-[center_20%] shadow-xl"
                  style={{border: "3px solid #ffe27c"}}
                  loading="eager"
                />
                <div className="absolute -bottom-1 -left-1 bg-[#ffe27c] rounded-full w-6 h-6 flex items-center justify-center text-xs">🧬</div>
              </div>
            </div>
            <p className="text-[#ffe27c] text-sm font-semibold mb-0.5">הילית כספי</p>
            <p className="text-white/60 text-xs mb-6">מאמנת זוגיות ושדכנית מקצועית</p>
            <h1 className="text-white font-black text-2xl md:text-3xl leading-tight mb-4 max-w-sm mx-auto">
              3 דקות שיחסכו לך<br />
              <span className="text-[#ffe27c]">שנים של דייטים עם האדם הלא נכון</span>
            </h1>
            <p className="text-white/75 text-sm leading-relaxed max-w-xs mx-auto mb-7">
              פיתחתי שאלון המבוסס על מודלים מפסיכולוגיה זוגית. הוא חושף את ה-DNA הזוגי שלך ומסביר למה עד עכשיו זה לא עבד.
            </p>
            <div className="flex justify-center gap-3 mb-8 flex-wrap">
              {[
                { icon: "🧠", label: "פסיכולוגיה זוגית" },
                { icon: "⏱", label: "3 דקות בלבד" },
                { icon: "🎯", label: "תוצאה אישית מיידית" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-white text-xs font-medium">{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-white/80 text-sm font-bold mb-3">אני:</p>
            <div className="flex gap-3 justify-center max-w-xs mx-auto">
              <button
                onClick={() => { setGender("female"); setPhase("quiz"); trackMutation.mutate({ eventType: "dna_quiz_start", page: "/dna-quiz" }); }}
                className="flex-1 bg-[#ffe27c] text-[#191265] font-black py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform"
              >
                אישה
              </button>
              <button
                onClick={() => { setGender("male"); setPhase("quiz"); trackMutation.mutate({ eventType: "dna_quiz_start", page: "/dna-quiz" }); }}
                className="flex-1 bg-white text-[#191265] font-black py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform"
              >
                גבר
              </button>
            </div>
          </motion.div>
        </div>
        <div className="px-5 py-8 max-w-md mx-auto">
          <p className="text-center text-[#191265] font-bold text-xs mb-5 opacity-60 uppercase tracking-widest">מה אומרים אחרי השאלון</p>
          <div className="flex flex-col gap-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={`testimonial-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3"
              >
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover object-[center_20%] flex-shrink-0 mt-0.5"
                  style={{border: "2px solid #ffe27c"}}
                  loading="lazy"
                />
                <div>
                  <p className="text-[#191265] text-sm leading-relaxed">"{t.text}"</p>
                  <p className="text-[#727272] text-xs mt-1 font-semibold">{t.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-[#727272] text-xs mt-6">ללא ספאם. התוצאה שלך נשארת אצלך.</p>
        </div>
      </div>
    );
  }
  // ── Quiz ────────────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const groupNames = ["", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "C", "C", "C", "C", "C", "D", "D", "D", "D", "D"];
    const groupLabels: Record<string, string> = {
      A: "מדד העצמאות והשליטה",
      B: "מדד העומק והרגש",
      C: "מדד הספונטניות והמרחב",
      D: "מדד היציבות והביטחון",
    };
    const currentGroup = groupNames[currentIdx + 1];

    return (
      <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
        {/* Progress bar */}
        <div className="bg-[#191265] px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between text-white/70 text-sm mb-2">
              <span>שאלה {currentIdx + 1} מתוך {STATEMENTS.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#ffe27c] rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-white/50 text-xs mt-1">{groupLabels[currentGroup]}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-lg p-8"
            >
              <div className="text-center mb-8">
                <span className="bg-[#191265]/10 text-[#191265] text-xs font-bold px-3 py-1.5 rounded-full">
                  {groupLabels[currentGroup]}
                </span>
                <p className="text-[#191265] font-bold text-xl mt-6 leading-relaxed text-right">
                  {STATEMENTS[currentIdx]}
                </p>
              </div>

              <p className="text-center text-[#727272] text-sm mb-6">
                עד כמה המשפט מאפיין אותך? (1 = בכלל לא, 5 = מאוד)
              </p>

              <div className="flex gap-3 justify-center">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleRate(val)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl font-black text-xl transition-all duration-200 flex items-center justify-center
                      ${val <= 2 ? "bg-[#f0eadc] text-[#727272] group-hover:bg-[#e0d8ca]" :
                        val === 3 ? "bg-[#191265]/10 text-[#191265] group-hover:bg-[#191265]/20" :
                        "bg-[#191265] text-white group-hover:bg-[#1800ad]"}
                      group-hover:scale-110 shadow-sm group-hover:shadow-md`}
                    >
                      {val}
                    </div>
                    <span className="text-[10px] text-[#727272] text-center max-w-[60px] leading-tight hidden sm:block">
                      {SCALE_LABELS[val - 1]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Back button */}
              {currentIdx > 0 && (
                <button
                  onClick={() => {
                    setAnswers(answers.slice(0, -1));
                    setCurrentIdx(currentIdx - 1);
                  }}
                  className="mt-8 w-full text-center text-[#727272] text-sm hover:text-[#191265] transition-colors"
                >
                  ← חזרה לשאלה הקודמת
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {submitMutation.isPending && (
            <div className="text-center mt-8">
              <div className="text-4xl animate-bounce">🧬</div>
              <p className="text-[#191265] font-bold mt-2">מנתחים את ה-DNA שלך...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Tiebreaker ─────────────────────────────────────────────────────────────
  if (phase === "tiebreaker" && tiebreakerQuestion) {
    const question = gender === "female" ? tiebreakerQuestion.question_f : tiebreakerQuestion.question_m;
    const [typeA, typeB] = tiebreakerQuestion.types;
    const answerA = gender === "female" ? tiebreakerQuestion.answer_a_f : tiebreakerQuestion.answer_a_m;
    const answerB = gender === "female" ? tiebreakerQuestion.answer_b_f : tiebreakerQuestion.answer_b_m;

    const handleTiebreaker = (chosen: DnaType) => {
      setTiebreakerAnswer(chosen);
      setPhase("capture");
    };

    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center font-rubik px-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="text-5xl mb-4">🧬</div>
          <p className="text-[#1800ad] text-xs font-bold uppercase tracking-widest mb-3">שאלת הכרעה</p>
          <h2 className="text-xl font-black text-[#191265] mb-2 leading-relaxed">{question}</h2>
          <p className="text-[#727272] text-sm mb-8">בחרי את האפשרות שמרגישה לך הכי נכונה</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleTiebreaker(typeA)}
              className="w-full bg-[#191265] text-white font-bold py-4 px-6 rounded-2xl text-base hover:bg-[#1800ad] transition-colors text-right"
            >
              {answerA}
            </button>
            <button
              onClick={() => handleTiebreaker(typeB)}
              className="w-full border-2 border-[#191265] text-[#191265] font-bold py-4 px-6 rounded-2xl text-base hover:bg-[#f0eadc] transition-colors text-right"
            >
              {answerB}
            </button>
          </div>
          <button
            onClick={() => setPhase("capture")}
            className="mt-6 text-[#727272] text-sm hover:text-[#191265] transition-colors"
          >
            לא בטוחה? המשיכי בלי הכרעה
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Lead Capture ────────────────────────────────────────────────────────────
  if (phase === "capture") {
    const handleCapture = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!captureForm.name.trim() || !captureForm.email.trim() || !captureForm.phone.trim()) {
        setCaptureError("נא למלא את כל השדות");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(captureForm.email.trim())) {
        setCaptureError("כתובת המייל אינה תקינה");
        return;
      }
      if (!captureConsent) {
        setCaptureError("נא לאשר את קבלת המיילים");
        return;
      }
      setCaptureError("");
      // Create CRM lead
      try {
        await createLeadMutation.mutateAsync({
          name: captureForm.name,
          email: captureForm.email,
          phone: captureForm.phone,
          source: "dna_quiz",
          quizSessionId: sessionId.current,
          gender,
          dnaType: tiebreakerAnswer ?? (pendingAnswers.length === 20 ? (Object.entries({
            leader: pendingAnswers.slice(0,5).reduce((s,v)=>s+v,0),
            romantic: pendingAnswers.slice(5,10).reduce((s,v)=>s+v,0),
            free_spirit: pendingAnswers.slice(10,15).reduce((s,v)=>s+v,0),
            anchor: pendingAnswers.slice(15,20).reduce((s,v)=>s+v,0),
          } as Record<string,number>).sort((a,b)=>b[1]-a[1])[0][0] as "leader"|"romantic"|"free_spirit"|"anchor") : undefined),
        });
        gaGenerateLead("dna_quiz_capture");
      } catch {
        // Non-blocking - still show result even if lead creation fails
      }
      // Submit quiz answers (include tiebreaker if answered)
      submitMutation.mutate({
        sessionId: sessionId.current,
        gender,
        answers: pendingAnswers,
        ...(tiebreakerAnswer ? { tiebreaker: tiebreakerAnswer } : {}),
        ...(utmSource ? { utmSource } : {}),
        ...(utmMedium ? { utmMedium } : {}),
        ...(utmCampaign ? { utmCampaign } : {}),
        ...(utmContent ? { utmContent } : {}),
        ...(utmTerm ? { utmTerm } : {}),
      });
    };

    return (
      <div className="min-h-screen bg-[#191265] flex items-center justify-center font-rubik px-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🧬</div>
            <h2 className="text-2xl font-black text-[#191265] mb-2">התוצאה שלך מוכנה!</h2>
            <p className="text-[#727272] leading-relaxed text-sm">
              השאירי פרטים כדי לקבל את אבחון ה-DNA הזוגי שלך - ואני אשלח לך אותו גם למייל.
            </p>
          </div>

          <form onSubmit={handleCapture} className="space-y-4">
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1 text-right">שם מלא *</label>
              <input
                type="text"
                value={captureForm.name}
                onChange={e => setCaptureForm(f => ({ ...f, name: e.target.value }))}
                placeholder="השם שלך"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1 text-right">אימייל *</label>
              <input
                type="email"
                value={captureForm.email}
                onChange={e => setCaptureForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[#191265] font-bold text-sm mb-1 text-right">טלפון *</label>
              <input
                type="tel"
                value={captureForm.phone}
                onChange={e => setCaptureForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="050-0000000"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right transition-all"
                required
              />
            </div>

            {captureError && (
              <p className="text-red-500 text-sm text-right">{captureError}</p>
            )}

            <button
              type="submit"
              disabled={submitMutation.isPending || createLeadMutation.isPending}
              className="w-full bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? "מחשב/ת את ה-DNA שלך..." : "הצגת התוצאה שלי"}
            </button>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={captureConsent}
                onChange={e => setCaptureConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#191265] flex-shrink-0"
              />
              <span className="text-xs text-[#727272] leading-relaxed text-right">
                אני מסכימה/מסכים לקבל את תוצאות האבחון ועדכונים מהילית כספי בדואר אלקטרוני. אפשר להסיר מרשימת התפוצה בכל עת.
              </span>
            </label>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === "result" && info && dnaType) {
    return (
      <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
        {/* 2-Part Flow Progress Banner */}
        <div className="bg-[#ffe27c] py-3 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 text-[#191265]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#191265] text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</div>
                <span className="font-bold text-sm">אבחון DNA</span>
                <span className="text-green-700 text-sm font-bold">✓ הושלם</span>
              </div>
              <div className="w-8 h-0.5 bg-[#191265]/30 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#191265]/20 border-2 border-[#191265] text-[#191265] text-xs font-black flex items-center justify-center flex-shrink-0">2</div>
                <span className="font-semibold text-sm">שאלון מדעי</span>
                <span className="text-[#191265]/60 text-xs">(אחרי הרישום)</span>
              </div>
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="bg-[#191265] py-8 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-5xl mb-3">🧬</div>
            <p className="text-[#ffe27c] text-sm font-semibold uppercase tracking-widest mb-2">ה-DNA הזוגי שלך</p>
            <h1 className="text-white font-black text-3xl md:text-4xl">{label}</h1>
            <p className="text-white/60 mt-2">{info.subtitle}</p>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {/* Score breakdown */}
          {scores && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm"
            >
              <h3 className="font-black text-[#191265] mb-4 text-right">פירוט הציונים שלך:</h3>
              {(["leader", "romantic", "free_spirit", "anchor"] as DnaType[]).map((type) => {
                const typeInfo = DNA_INFO[type];
                const typeLabel = gender === "female" ? typeInfo.label_f : typeInfo.label_m;
                const score = scores[type];
                const maxScore = 25;
                const pct = Math.round((score / maxScore) * 100);
                return (
                  <div key={type} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-bold ${type === dnaType ? "text-[#191265]" : "text-[#727272]"}`}>
                        {typeLabel} {type === dnaType && "✓"}
                      </span>
                      <span className="text-[#727272]">{score}/25</span>
                    </div>
                    <div className="h-2 bg-[#f0eadc] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${type === dnaType ? "bg-[#191265]" : "bg-[#191265]/30"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Superpower */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-sm"
          >
            <h3 className="font-black text-[#191265] mb-3 text-right">💪 הנכס הזוגי שלך:</h3>
            <p className="text-[#191265]/80 leading-relaxed text-right">{info.superpower}</p>
          </motion.div>

          {/* Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#191265] rounded-3xl p-6 shadow-sm"
          >
            <h3 className="font-black text-white mb-3 text-right">⚡ האתגר שלך:</h3>
            <p className="text-white/80 leading-relaxed text-right">{info.challenge}</p>
          </motion.div>

          {/* Match */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl p-6 shadow-sm"
            style={{ background: info.bg }}
          >
            <h3 className="font-black text-[#191265] mb-3 text-right">
              💛 סוד ההתאמה - {gender === "female" ? "הגבר" : "האישה"} שלך:
            </h3>
            <p className="text-[#191265]/80 leading-relaxed text-right">{matchText}</p>
          </motion.div>

          {/* CTA - Join database */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-[#191265] to-[#1800ad] rounded-3xl p-8 text-center text-white"
          >
            <div className="text-4xl mb-4">💛</div>
            {returnTo === "join" ? (
              // Embedded mode: user came from /join form, return with DNA result
              <>
                <h3 className="font-black text-xl mb-3">
                  מעולה! ה-DNA הזוגי שלך זוהה
                </h3>
                <p className="text-white/75 text-sm leading-relaxed mb-6">
                  לחצו על הכפתור כדי לחזור לטופס ולהמשיך את הרישום למאגר עם התוצאה שלכם.
                </p>
                <button
                  onClick={() => {
                    const base = returnFreeToken
                      ? `/join?free_token=${returnFreeToken}`
                      : `/join`;
                    // If opened in a new tab from /join, send DNA result via postMessage and close this tab
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage({
                        type: "DNA_RESULT",
                        dnaType,
                        gender,
                        sessionId: sessionId.current,
                      }, window.location.origin);
                      window.close();
                    } else {
                      navigate(`${base}&dna=${dnaType}&gender=${gender}&session=${sessionId.current}`);
                    }
                  }}
                  className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-xl"
                >
                  הזן את התוצאה שלי וחזור לטופס
                </button>
              </>
            ) : (
              // Normal mode: show payment CTA
              <>
                <h3 className="font-black text-xl mb-3">
                  עכשיו שפיצחנו את ה-DNA שלך - בואו נמצא את {gender === "female" ? "הגבר" : "האישה"} שמתאים לך בדיוק
                </h3>
                <p className="text-white/75 text-sm leading-relaxed mb-4">
                  אחרי שליוויתי אלפי רווקים ורווקות, הקמתי מאגר שידוכים דיסקרטי ואקסקלוסיבי.
                  גברים ונשים איכותיים פונים אליי מדי יום. ברגע שמצטרפים למאגר - הפרופיל שלכם
                  (כולל תוצאות האבחון הזה) נשמר אצלי, ואני אצור איתכם קשר ברגע שתהיה התאמה מתאימת.
                  <br /><br />
                  <strong className="text-white">אין החלקות שמאלה וימינה. ההתאמות מבוססות על חישובים מתקדמים ופסיכולוגיה חיובית, ועוברות אישור אישי של הילית לפני כל הצעה.</strong>
                </p>
                {/* 2-step process explanation */}
                <div className="bg-white/10 rounded-2xl p-4 mb-5 text-right">
                  <p className="text-[#ffe27c] font-bold text-sm mb-3">📋 תהליך הרישום - 2 שלבים:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ffe27c] text-[#191265] text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                      <div>
                        <p className="text-white text-sm font-bold">אבחון DNA ✓ הושלם</p>
                        <p className="text-white/60 text-xs">מילאת את השאלון + תשלום דמי רישום</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                      <div>
                        <p className="text-white text-sm font-bold">שאלון מדעי ואישיות</p>
                        <p className="text-white/60 text-xs">אחרי הרישום תקבל/י קישור לשאלון מעמיק שמאפשר לי להתאים לך בדיוק. ממלאים בסביבה שקטה, לוקח כ-15 דקות.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[#ffe27c] font-black text-lg mb-1">דמי רצינות ורישום: ₪249 (חד-פעמי)</div>
                <p className="text-white/50 text-xs mb-6">כל שאלון עובר בעיניי אישית לפני שמוזן למאגר</p>
                <button
                  onClick={() => navigate(`/join?dna=${dnaType}&gender=${gender}&session=${sessionId.current}&name=${encodeURIComponent(captureForm.name)}&email=${encodeURIComponent(captureForm.email)}&phone=${encodeURIComponent(captureForm.phone)}`)}
                  className="w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.02] shadow-xl"
                >
                  כן! הילית, אני רוצה שתמצאי לי התאמה
                </button>
              </>
            )}
          </motion.div>
          {/* Personal message from Hilit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white rounded-3xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-4 mb-4" dir="rtl">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-thankyou_a6c21266.jpeg"
                alt="הילית כספי"
                className="w-20 h-20 rounded-full object-cover object-[center_20%] shadow-md flex-shrink-0"
              />
              <div className="text-right">
                <p className="font-black text-[#191265] text-lg">הילית כספי</p>
                <p className="text-[#1800ad] text-sm font-medium">Relationship Expert & Matchmaker</p>
              </div>
            </div>
            <p className="text-[#191265]/80 leading-relaxed text-right text-sm">
              שמחתי שעשיתם את השאלון! זה הצעד הראשון להבנה את עצמכם יותר טוב ולהתקדם לזוגיות אמיתית. ליוויתי מאות אנשים בתהליך הזה ואני מאמינה שגם אתם תמצאו את האהבה שאתם מחפשים. 💛
            </p>
            <a
              href="https://hilitcaspi.com/api/wa/site"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-all duration-300 text-sm"
            >
              <span className="text-lg">💬</span>
              הצטרפו לקבוצת הוואטסאפ השקטה שלי - תוכן וטיפים לזוגיות
            </a>
          </motion.div>

          {/* Upsell - coaching package */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#ffe27c] rounded-3xl p-6 text-right"
          >
            <span className="bg-[#191265] text-white text-xs font-bold px-3 py-1.5 rounded-full">💎 שדרוג מומלץ</span>
            <h3 className="text-[#191265] font-black text-lg mt-4 mb-2">רוצה ליווי אישי עמוק?</h3>
            <p className="text-[#191265]/80 text-sm leading-relaxed mb-4">
              מעבר למאגר, הילית מציעה תהליך ליווי אישי של 8 פגישות - שבו עובדים יחד על הדפוסים שלך,
              בונים את הפרופיל הנכון, ומוצאים את הדרך שלך לזוגיות.
              <br /><strong>הצטרפות לליווי אישי כוללת כניסה למאגר הרווקים (שווי ₪249).</strong>
            </p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#191265] font-black text-2xl">₪2,900</div>
                <div className="text-[#191265]/60 text-xs line-through">₪4,000</div>
              </div>
              <a
                href="/coaching"
                className="bg-[#191265] text-white font-black px-6 py-3 rounded-2xl hover:bg-[#1800ad] transition-colors text-sm"
              >
                ♡ פרטים על ליווי אישי
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
