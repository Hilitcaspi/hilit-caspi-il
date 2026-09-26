export const COURSE_COMPASS_VERSION = "2026-09-v2";

export const CORE_COMPASS_RESULTS = [
  "future_projection",
  "uncertainty_loop",
  "approval_chase",
  "chemistry_confusion",
  "novelty_pull",
] as const;

export type CoreCompassResultKey = (typeof CORE_COMPASS_RESULTS)[number];
export type CompassResultKey = CoreCompassResultKey | "safety";
export type CompassResponses = Record<string, string>;

type ScoreVector = Partial<Record<CoreCompassResultKey, number>>;

export type CompassAnswer = {
  id: string;
  label: string;
  weights?: ScoreVector;
  actionKey?: string;
  safetyFlag?: "safe" | "uncertain" | "unsafe" | "skipped";
};

export type CompassQuestion = {
  id: string;
  eyebrow: string;
  prompt: string;
  hint?: string;
  answers: CompassAnswer[];
  adaptive?: boolean;
  prediction?: boolean;
};

export type CompassResultContent = {
  label: string;
  title: string;
  summary: string;
  rationale: string;
  counterSign: string;
  magicLine: string;
  science: string;
  actions: Array<{ id: string; label: string }>;
  accent: string;
};

export type CompassResult = {
  primary: CompassResultKey;
  secondary: CoreCompassResultKey | null;
  clarity: "clear" | "close" | "safety";
  scores: Record<CoreCompassResultKey, number>;
  evidence: string[];
  content: CompassResultContent;
};

const RESULT_CONTENT: Record<CompassResultKey, CompassResultContent> = {
  future_projection: {
    label: "השלמת העתיד",
    title: "לא רק האדם מחזיק אתכם. גם העתיד שכבר התחלתם לבנות סביב האפשרות הזאת.",
    summary: "כשיש מעט עובדות והרבה פוטנציאל, המוח יודע להשלים את החסר בתמונה של מה שעוד יכול לקרות. לפעמים קשה לשחרר לא את מה שהיה, אלא את מה שכבר דמיינתם שיהיה.",
    rationale: "חזרתם שוב ושוב לאפשרות, לפוטנציאל ולסיפור שמאחורי הסימנים — גם כשהמציאות עצמה עדיין לא סיפקה מספיק נתונים.",
    counterSign: "תקווה אינה טעות. אבל לפני שנותנים לעתיד משקל, כדאי לבדוק אם ההווה באמת נושא אותו.",
    magicLine: "ניחשתי שהמוח שלכם כבר רץ כמה צעדים קדימה, עוד לפני שהקשר הספיק להגיע לשם.",
    science: "המוח משלים מידע חסר באמצעות ציפיות וסיפור. ככל שהתמונה חלקית יותר, קל יותר לפוטנציאל להרגיש ממשי כמעט כמו עובדה.",
    actions: [
      { id: "separate_fact_future", label: "להפריד בין מה שקרה בפועל לבין מה שקיוויתי שיקרה" },
      { id: "one_present_fact", label: "לבחור עובדה אחת מההווה לפני שמחליטים על העתיד" },
    ],
    accent: "#f1cf86",
  },
  uncertainty_loop: {
    label: "לולאת אי־הוודאות",
    title: "לא הבהירות מחזיקה אתכם. דווקא חוסר הבהירות.",
    summary: "קרבה וריחוק לסירוגין גורמים למוח לחזור שוב ושוב אל האדם, לבדוק הודעות ולחפש את הסימן שיסגור את התמונה. המתח מרגיש כמו חשיבות, גם כשהוא בעיקר חוסר ודאות.",
    rationale: "הבחירות שלכם חזרו לסימנים מעורבים, לפענוח ולהמתנה לאות הבא — יותר מאשר לקשר יציב שכבר ברור מה קורה בו.",
    counterSign: "אם תשובה ישירה מורידה את עוצמת המשיכה, ייתכן שהמסתורין היה חלק גדול יותר מהחיבור ממה שנדמה.",
    magicLine: "ניחשתי שאתם לא חושבים על האדם כל הזמן כי הכול ברור — אלא כי שום דבר עדיין לא נסגר.",
    science: "תגמול שמגיע באופן לא צפוי מחזק ציפייה ובדיקה חוזרת. לכן סימן קטן אחרי שקט יכול להרגיש חזק יותר מנוכחות עקבית.",
    actions: [
      { id: "ask_one_clear_question", label: "להפסיק לאסוף רמזים ולבקש תשובה ברורה אחת" },
      { id: "observe_without_checking", label: "להפסיק לבדוק ולראות אם מגיעה יוזמה עקבית מעצמה" },
    ],
    accent: "#f0a6c8",
  },
  approval_chase: {
    label: "מרדף האישור",
    title: "יכול להיות שאתם רוצים את הבחירה שלהם כמעט כמו שאתם רוצים אותם.",
    summary: "לפעמים אדם מסוים הופך חשוב במיוחד מפני שהבחירה שלו מרגישה כמו הוכחה לערך שלנו. אז ההשקעה גדלה, הסירוב נהיה אישי, והקשר הופך למבחן שצריך לעבור.",
    rationale: "הבחירות שלכם נתנו משקל חזק לרצון להרשים, להוכיח ולחוות את הרגע שבו דווקא האדם הזה בוחר בכם.",
    counterSign: "שאלו שאלה אחת לא נוחה: אם כבר הייתם בטוחים בערך שלכם, האם עדיין הייתם בוחרים באדם הזה באותה עוצמה?",
    magicLine: "ניחשתי שחלק מהמשיכה התערבב עם צורך עמוק יותר: להרגיש שנבחרתם דווקא כאן.",
    science: "דחייה או אישור חברתי יכולים להפעיל מערכות של ערך עצמי ותגמול. כשזה קורה, הרצון להשיג את הבחירה עלול להיראות כמו התאמה.",
    actions: [
      { id: "reverse_choice", label: "להחליף את השאלה: לא האם יבחרו בי, אלא האם אני בוחר כאן" },
      { id: "stop_proving", label: "לעצור פעולה אחת שנועדה להרשים ולבדוק מה נשאר" },
    ],
    accent: "#ffb38f",
  },
  chemistry_confusion: {
    label: "בלבול הכימיה",
    title: "העוצמה אמיתית. אבל עוצמה והתאמה אינן אותו הדבר.",
    summary: "משיכה חזקה יכולה להרגיש כמו ידיעה עמוקה, גם כשעדיין אין מספיק מידע על זמינות, יציבות או התאמה לחיים. הגוף אומר “חשוב”, והמוח מתרגם לפעמים “נכון”.",
    rationale: "הבחירות שלכם נתנו לעוצמה, למתח ולכימיה משקל גדול יותר מן העקביות ומהעובדות שכבר אפשר לראות.",
    counterSign: "כימיה אינה דגל אדום. היא פשוט לא יכולה לשמש לבדה כהוכחה שהקשר מתאים או שהאדם פנוי לקשר.",
    magicLine: "ניחשתי שהעוצמה בגוף קיבלה אצלכם משמעות של התאמה, עוד לפני שהיו מספיק ראיות.",
    science: "עוררות, חידוש וחוסר ודאות יכולים להעצים קשב ומשיכה. המוח מרגיש את העוצמה היטב, אך אינו תמיד מפריד מיד בין ריגוש לבין יציבות.",
    actions: [
      { id: "chemistry_plus_consistency", label: "לתת לעקביות משקל זהה לכימיה בשלוש האינטראקציות הבאות" },
      { id: "name_three_facts", label: "לבדוק שלוש עובדות על התאמה לפני פירוש נוסף של התחושה" },
    ],
    accent: "#c8b5ff",
  },
  novelty_pull: {
    label: "משיכת החדש והלא מושג",
    title: "ייתכן שהמוח שלכם נדלק על המרדף — ונרגע כשהקשר נעשה אפשרי.",
    summary: "חדש, מפתיע או מעט לא מושג יכול לייצר קשב עוצמתי. לפעמים דווקא כשמגיע שקט, זמינות וביטחון, המתח יורד והמוח מפרש את הירידה כאילו המשיכה נעלמה.",
    rationale: "הבחירות שלכם חזרו לחידוש, למסתורין ולירידת עניין כשהצד השני נעשה ברור וזמין יותר.",
    counterSign: "שקט אינו בהכרח שעמום. לפעמים הוא פשוט היעדר המתח שהתרגלנו לקרוא לו כימיה.",
    magicLine: "ניחשתי שהחלק הכי ממכר הוא לא רק האדם — אלא הרגע שבו האדם עדיין אינו מושג.",
    science: "מערכת התגמול רגישה לחידוש ולציפייה. כשהגירוי נעשה מוכר ובטוח, העוצמה יכולה לרדת בלי שההתאמה עצמה ירדה.",
    actions: [
      { id: "three_calm_meetings", label: "לא לפסול שקט לפני שנותנים לו שלושה מפגשים אמיתיים" },
      { id: "notice_chase", label: "לבדוק אם החשק עולה דווקא כשהצד השני מתרחק" },
    ],
    accent: "#b9e6d0",
  },
  safety: {
    label: "בטיחות",
    title: "בטיחות וגבול קודמים לכל פיצוח של משיכה.",
    summary: "כאשר יש לחץ, איום, השפלה או תחושת חוסר ביטחון, לא צריך לנתח עוד את הדינמיקה כדי להתרחק מן הלחץ ולפנות לעזרה מתאימה.",
    rationale: "סימנתם שאין כרגע ודאות שהסיטואציה בטוחה. החוויה עוצרת כאן בכוונה.",
    counterSign: "החוויה אינה קובעת מי האדם שמולכם ואינה מחליפה עזרה מקצועית או שירותי חירום.",
    magicLine: "במקום לנחש את הדפוס, המצפן בוחר קודם לשמור עליכם.",
    science: "כשאין תחושת ביטחון, ניתוח של משיכה או תקשורת אינו הצעד הראשון. בטיחות, תמיכה וגבול קודמים לתרגיל.",
    actions: [
      { id: "contact_safe_person", label: "לפנות עכשיו לאדם בטוח" },
      { id: "leave_pressure", label: "להתרחק מן הלחץ ולבקש עזרה מתאימה" },
    ],
    accent: "#ffd4c7",
  },
};

const BASE_QUESTIONS: CompassQuestion[] = [
  {
    id: "scene",
    eyebrow: "חשבו על אדם אחד",
    prompt: "איזו תמונה הכי קרובה למה שקורה ביניכם?",
    hint: "אין צורך בשם או בפרטים. רק החזיקו אדם אחד בראש.",
    answers: [
      { id: "after_date_replay", label: "היה דייט או מפגש, ומאז אני מריץ אותו שוב בראש", weights: { future_projection: 1, chemistry_confusion: 1 } },
      { id: "mixed_messages", label: "יש קרבה ואז ריחוק, ואני לא מבין איפה זה עומד", weights: { uncertainty_loop: 2 } },
      { id: "strong_attraction_little_ground", label: "יש משיכה חזקה, אבל עדיין מעט מאוד בסיס יציב", weights: { chemistry_confusion: 2 } },
      { id: "different_person_same_story", label: "זה אדם אחר, אבל הסיפור מרגיש מוכר מדי", weights: { novelty_pull: 1, approval_chase: 1 } },
    ],
  },
  {
    id: "fast_hook",
    eyebrow: "מה קורה מהר",
    prompt: "כשיש עניין, מה המוח שלכם עושה כמעט בלי לבקש רשות?",
    answers: [
      { id: "build_future", label: "מתחיל לבנות תמונה של מה שיכול להיות", weights: { future_projection: 3 } },
      { id: "decode_everything", label: "מנתח הודעות, זמנים ושינויים קטנים", weights: { uncertainty_loop: 3 } },
      { id: "want_to_win", label: "רוצה לגרום לאדם הזה לראות כמה אני שווה", weights: { approval_chase: 3 } },
      { id: "feel_intensity", label: "מרגיש את הכימיה בעוצמה וקשה לחשוב מעבר לה", weights: { chemistry_confusion: 3 } },
      { id: "need_mystery", label: "נדלק במיוחד כשהכול חדש, מפתיע ולא מושג", weights: { novelty_pull: 3 } },
    ],
  },
  {
    id: "value_signal",
    eyebrow: "הסימן שמגדיל ערך",
    prompt: "מה גורם לאדם הזה להרגיש פתאום חשוב יותר בראש שלכם?",
    answers: [
      { id: "unavailable", label: "כשיש פחות זמינות וקשה יותר לקרוא את המצב", weights: { uncertainty_loop: 2, chemistry_confusion: 1 } },
      { id: "chooses_me", label: "כשנדמה שהצד השני עומד לבחור בי ואז נסוג מהקשר", weights: { approval_chase: 2, uncertainty_loop: 1 } },
      { id: "potential", label: "כשאני רואה בו פוטנציאל נדיר לעתיד", weights: { future_projection: 3 } },
      { id: "intense_moment", label: "כשיש רגע אחד חזק שקשה לשכוח", weights: { chemistry_confusion: 2, future_projection: 1 } },
      { id: "new_unknown", label: "כשעוד יש מסתורין והרבה לא ידוע", weights: { novelty_pull: 2, uncertainty_loop: 1 } },
    ],
  },
  {
    id: "silence_response",
    eyebrow: "כשאין סימן ברור",
    prompt: "מה קורה אצלכם אחרי שקט או התרחקות קטנה?",
    answers: [
      { id: "check_phone", label: "בודק שוב ושוב אם הגיע משהו", weights: { uncertainty_loop: 3 } },
      { id: "invest_more", label: "משקיע יותר כדי להחזיר את העניין", weights: { approval_chase: 3 } },
      { id: "fill_blanks", label: "מסביר לעצמי מה כנראה קורה בצד השני", weights: { future_projection: 2, uncertainty_loop: 1 } },
      { id: "want_more", label: "מרגיש שהמשיכה דווקא מתחזקת", weights: { chemistry_confusion: 2, novelty_pull: 1 } },
      { id: "switch_target", label: "מאבד עניין ומחפש את הריגוש הבא", weights: { novelty_pull: 3 } },
    ],
  },
];

const DEEP_QUESTIONS: CompassQuestion[] = [
  {
    id: "hard_truth",
    eyebrow: "האמת שקצת קשה להודות בה",
    prompt: "איזה משפט הכי קרוב למה שכבר קרה לכם בעבר?",
    answers: [
      { id: "calm_boring", label: "כשיש מולי אדם יציב וברור, משהו בי מתחיל להשתעמם", weights: { novelty_pull: 3 } },
      { id: "kind_not_enough", label: "יחס טוב לא תמיד מספיק אם אין תחושה שצריך לזכות בו", weights: { approval_chase: 2, chemistry_confusion: 1 } },
      { id: "knew_but_stayed", label: "ידעתי מוקדם שמשהו לא מתאים, אבל נשארתי עם הפוטנציאל", weights: { future_projection: 3 } },
      { id: "clarity_scary", label: "לפעמים אני מעדיף את הסימנים על תשובה שעלולה לאכזב", weights: { uncertainty_loop: 3 } },
      { id: "intensity_wins", label: "גם כשאני רואה חוסר יציבות, העוצמה מנצחת", weights: { chemistry_confusion: 3 } },
    ],
  },
  {
    id: "facts_only",
    eyebrow: "בלי הסיפור מסביב",
    prompt: "אם מסירים לרגע תקווה ופרשנות, מה נשאר בעובדות?",
    answers: [
      { id: "words_more_actions", label: "יש יותר מילים או הבטחות ממעשים", weights: { future_projection: 2, uncertainty_loop: 1 } },
      { id: "close_far_pattern", label: "יש דפוס שחוזר של קרבה ואז ריחוק", weights: { uncertainty_loop: 3 } },
      { id: "i_carry_contact", label: "רוב התנועה בקשר מגיעה ממני", weights: { approval_chase: 3 } },
      { id: "intensity_few_facts", label: "יש עוצמה גדולה, אבל מעט מידע אמיתי על התאמה", weights: { chemistry_confusion: 3 } },
      { id: "interest_drops_available", label: "העניין שלי יורד כשהצד השני נעשה זמין", weights: { novelty_pull: 3 } },
    ],
  },
  {
    id: "old_solution",
    eyebrow: "מה כבר ניסיתם",
    prompt: "מה אתם עושים בדרך כלל כדי לפתור את הסיפור הזה?",
    answers: [
      { id: "wait_for_potential", label: "מחכה בסבלנות שהפוטנציאל יתממש", weights: { future_projection: 2 } },
      { id: "look_for_sign", label: "מחפש עוד סימן קטן שיסגור לי את התמונה", weights: { uncertainty_loop: 2 } },
      { id: "be_more", label: "מנסה להיות מעניין, נכון או מרשים יותר", weights: { approval_chase: 2 } },
      { id: "rules_then_break", label: "מחליט להציב גבולות ואז נשאב שוב לכימיה", weights: { chemistry_confusion: 2 } },
      { id: "move_fast", label: "עובר הלאה מהר כדי להרגיש שוב התחלה חדשה", weights: { novelty_pull: 2 } },
    ],
  },
];

const SAFETY_QUESTION: CompassQuestion = {
  id: "safety",
  eyebrow: "בדיקת גבול חשובה",
  prompt: "האם יש כאן לחץ, איום, השפלה או חוסר כבוד שגורמים לכם להרגיש לא בטוחים?",
  hint: "החוויה אינה מעריכה את האדם שמולכם. השאלה נועדה רק לשמור על גבול בטוח.",
  answers: [
    { id: "no", label: "לא", safetyFlag: "safe" },
    { id: "uncertain", label: "אין לי ודאות", safetyFlag: "uncertain" },
    { id: "yes", label: "כן", safetyFlag: "unsafe" },
    { id: "skip", label: "עדיף לדלג", safetyFlag: "skipped" },
  ],
};

function pairKey(a: CoreCompassResultKey, b: CoreCompassResultKey) {
  return [a, b].sort().join("__");
}

function resultAnswer(key: CoreCompassResultKey, label: string): CompassAnswer {
  return { id: key, label, weights: { [key]: 3 } };
}

const DISCRIMINATORS: Record<string, Omit<CompassQuestion, "id">> = {
  [pairKey("future_projection", "uncertainty_loop")]: {
    eyebrow: "אני בין שני ניחושים",
    prompt: "מה מחזיק את המחשבה על האדם הזה יותר?",
    answers: [
      resultAnswer("future_projection", "העתיד שאני כבר רואה בדמיון"),
      resultAnswer("uncertainty_loop", "הצורך להבין סוף סוף מה באמת קורה"),
    ], adaptive: true,
  },
  [pairKey("future_projection", "approval_chase")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה יכאב יותר לאבד?",
    answers: [
      resultAnswer("future_projection", "את האפשרות של העתיד שדמיינתי"),
      resultAnswer("approval_chase", "את התחושה שהצלחתי לגרום לאדם הזה לבחור בי"),
    ], adaptive: true,
  },
  [pairKey("future_projection", "chemistry_confusion")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה מרגיש לכם משכנע יותר כרגע?",
    answers: [
      resultAnswer("future_projection", "כמה טוב זה עוד יכול להיות"),
      resultAnswer("chemistry_confusion", "כמה חזק הגוף מגיב כבר עכשיו"),
    ], adaptive: true,
  },
  [pairKey("future_projection", "novelty_pull")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה מושך אתכם קדימה יותר?",
    answers: [
      resultAnswer("future_projection", "הסיפור שיכול להיבנות מכאן"),
      resultAnswer("novelty_pull", "התחושה שמשהו חדש ולא צפוי קורה"),
    ], adaptive: true,
  },
  [pairKey("uncertainty_loop", "approval_chase")]: {
    eyebrow: "אני בין שני ניחושים",
    prompt: "איזו תשובה אתם באמת מחפשים?",
    answers: [
      resultAnswer("uncertainty_loop", "לדעת איפה אני עומד"),
      resultAnswer("approval_chase", "לדעת שהאדם הזה בוחר בי"),
    ], adaptive: true,
  },
  [pairKey("uncertainty_loop", "chemistry_confusion")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה חזק יותר כשאתם חושבים על האדם הזה?",
    answers: [
      resultAnswer("uncertainty_loop", "הצורך לפענח את הסימנים"),
      resultAnswer("chemistry_confusion", "התחושה הפיזית והכימיה"),
    ], adaptive: true,
  },
  [pairKey("uncertainty_loop", "novelty_pull")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה יקרה אם הכול יהפוך מחר לברור וצפוי?",
    answers: [
      resultAnswer("uncertainty_loop", "ארגיש הקלה גדולה"),
      resultAnswer("novelty_pull", "יכול להיות שחלק מהעניין יירד"),
    ], adaptive: true,
  },
  [pairKey("approval_chase", "chemistry_confusion")]: {
    eyebrow: "אני בין שני ניחושים",
    prompt: "מה אתם רוצים יותר ברגע הכי טעון?",
    answers: [
      resultAnswer("approval_chase", "להרגיש שנבחרתי"),
      resultAnswer("chemistry_confusion", "להרגיש שוב את העוצמה בינינו"),
    ], adaptive: true,
  },
  [pairKey("approval_chase", "novelty_pull")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה מחזיר את החשק כשהוא יורד?",
    answers: [
      resultAnswer("approval_chase", "כשהאדם שוב נותן לי אישור"),
      resultAnswer("novelty_pull", "כשמופיע אתגר חדש או אדם חדש"),
    ], adaptive: true,
  },
  [pairKey("chemistry_confusion", "novelty_pull")]: {
    eyebrow: "השאלה שמפרידה ביניהם",
    prompt: "מה הכי קשה לשחרר?",
    answers: [
      resultAnswer("chemistry_confusion", "את העוצמה שכבר הרגשתי"),
      resultAnswer("novelty_pull", "את המרדף ואת האפשרות שעוד לא הושגה"),
    ], adaptive: true,
  },
};

function emptyScores(): Record<CoreCompassResultKey, number> {
  return {
    future_projection: 0,
    uncertainty_loop: 0,
    approval_chase: 0,
    chemistry_confusion: 0,
    novelty_pull: 0,
  };
}

function sortScores(scores: Record<CoreCompassResultKey, number>) {
  return CORE_COMPASS_RESULTS
    .map(key => ({ key, value: scores[key] }))
    .sort((a, b) => b.value - a.value || CORE_COMPASS_RESULTS.indexOf(a.key) - CORE_COMPASS_RESULTS.indexOf(b.key));
}

function addAnswerWeights(scores: Record<CoreCompassResultKey, number>, question: CompassQuestion | null, answerId: string) {
  const answer = question?.answers.find(item => item.id === answerId);
  if (!answer?.weights) return;
  for (const [key, value] of Object.entries(answer.weights)) scores[key as CoreCompassResultKey] += value || 0;
}

function scoreBaseResponses(responses: CompassResponses) {
  const scores = emptyScores();
  for (const question of BASE_QUESTIONS) {
    if (responses[question.id]) addAnswerWeights(scores, question, responses[question.id]);
  }
  return scores;
}

export function getInterimPrediction(responses: CompassResponses) {
  const ranked = sortScores(scoreBaseResponses(responses));
  const primary = ranked[0].key;
  const secondary = ranked[1].key;
  return {
    primary,
    secondary,
    label: RESULT_CONTENT[primary].label,
    text: RESULT_CONTENT[primary].magicLine,
  };
}

function getPredictionQuestion(responses: CompassResponses): CompassQuestion {
  const prediction = getInterimPrediction(responses);
  return {
    id: "prediction_check",
    eyebrow: "הניחוש הראשון שלי",
    prompt: prediction.text,
    hint: "ארבע לחיצות הספיקו כדי לזהות כיוון. כמה זה קרוב?",
    adaptive: true,
    prediction: true,
    answers: [
      { id: "close", label: "קרוב מאוד. זה קצת מפחיד", weights: { [prediction.primary]: 2 } },
      { id: "partial", label: "יש בזה משהו, אבל זה לא הכול", weights: { [prediction.primary]: 1, [prediction.secondary]: 1 } },
      { id: "miss", label: "לא. זה לא הסיפור שלי", weights: { [prediction.primary]: -2, [prediction.secondary]: 2 } },
    ],
  };
}

function allStaticQuestions() {
  return [...BASE_QUESTIONS, ...DEEP_QUESTIONS, SAFETY_QUESTION];
}

export function scoreCompassResponses(responses: CompassResponses) {
  const scores = emptyScores();
  for (const [questionId, answerId] of Object.entries(responses)) {
    if (questionId === "tie_break") {
      if ((CORE_COMPASS_RESULTS as readonly string[]).includes(answerId)) scores[answerId as CoreCompassResultKey] += 3;
      continue;
    }
    if (questionId === "prediction_check") {
      addAnswerWeights(scores, getPredictionQuestion(responses), answerId);
      continue;
    }
    const staticQuestion = allStaticQuestions().find(question => question.id === questionId);
    if (staticQuestion) {
      addAnswerWeights(scores, staticQuestion, answerId);
      continue;
    }
    if (questionId.startsWith("discriminate_")) {
      const key = questionId.slice("discriminate_".length);
      const discriminator = DISCRIMINATORS[key];
      addAnswerWeights(scores, discriminator ? { id: questionId, ...discriminator } : null, answerId);
    }
  }
  return scores;
}

function getDiscriminator(responses: CompassResponses) {
  const [first, second] = sortScores(scoreCompassResponses(responses));
  const key = pairKey(first.key, second.key);
  return { id: `discriminate_${key}`, ...DISCRIMINATORS[key] } as CompassQuestion;
}

export function getCompassQuestionById(id: string, responses: CompassResponses = {}) {
  if (id === "prediction_check") return getPredictionQuestion(responses);
  if (id.startsWith("discriminate_")) {
    const key = id.slice("discriminate_".length);
    const discriminator = DISCRIMINATORS[key];
    return discriminator ? { id, ...discriminator } : null;
  }
  if (id === "tie_break") {
    const scores = sortScores(scoreCompassResponses(responses));
    return {
      id: "tie_break",
      eyebrow: "הניחוש האחרון",
      prompt: "נשארו לי שתי אפשרויות. איזה משפט קשה יותר להודות בו?",
      hint: "התשובה הזאת מכריעה בין שני המנגנונים שהופיעו כמעט באותה עוצמה.",
      adaptive: true,
      answers: [scores[0], scores[1]].map(item => resultAnswer(item.key, RESULT_CONTENT[item.key].magicLine)),
    };
  }
  return allStaticQuestions().find(question => question.id === id) || null;
}

export function getNextCompassQuestion(responses: CompassResponses): CompassQuestion | null {
  for (const question of BASE_QUESTIONS) if (!responses[question.id]) return question;
  if (!responses.prediction_check) return getPredictionQuestion(responses);

  const answeredDiscriminator = Object.keys(responses).find(questionId => questionId.startsWith("discriminate_"));
  if (!answeredDiscriminator) return getDiscriminator(responses);
  for (const question of DEEP_QUESTIONS) if (!responses[question.id]) return question;
  if (!responses.safety) return SAFETY_QUESTION;

  if (responses.safety === "yes" || responses.safety === "uncertain") return null;
  const ranked = sortScores(scoreCompassResponses(responses));
  if (ranked[0].value - ranked[1].value < 2 && !responses.tie_break) {
    return getCompassQuestionById("tie_break", responses);
  }
  return null;
}

export function getCompassAnswer(questionId: string, answerId: string, responses: CompassResponses = {}) {
  return getCompassQuestionById(questionId, responses)?.answers.find(answer => answer.id === answerId) || null;
}

export function getCompassResult(responses: CompassResponses): CompassResult {
  const scores = scoreCompassResponses(responses);
  const safetyAnswer = responses.safety;
  if (safetyAnswer === "yes" || safetyAnswer === "uncertain") {
    return {
      primary: "safety",
      secondary: null,
      clarity: "safety",
      scores,
      evidence: [safetyAnswer === "yes" ? "סימנתם שיש תחושת חוסר ביטחון" : "סימנתם שאין ודאות שהסיטואציה בטוחה"],
      content: RESULT_CONTENT.safety,
    };
  }

  const ranked = sortScores(scores);
  const primary = ranked[0].key;
  const secondary = ranked[1].key;
  const evidence: string[] = [];
  for (const [questionId, answerId] of Object.entries(responses)) {
    if (["safety", "scene", "prediction_check", "tie_break"].includes(questionId)) continue;
    const question = getCompassQuestionById(questionId, responses);
    const answer = question?.answers.find(item => item.id === answerId);
    if (answer && (answer.weights?.[primary] || 0) > 0) evidence.push(answer.label);
  }

  return {
    primary,
    secondary,
    clarity: ranked[0].value - ranked[1].value >= 3 ? "clear" : "close",
    scores,
    evidence: evidence.slice(0, 3),
    content: RESULT_CONTENT[primary],
  };
}

export function getCompassResultContent(key: CompassResultKey) {
  return RESULT_CONTENT[key];
}

export function getCompassProgress(responses: CompassResponses) {
  const answered = Object.keys(responses).length;
  const next = getNextCompassQuestion(responses);
  const expected = next?.id === "tie_break" || responses.tie_break ? 11 : 10;
  return Math.min(100, Math.round((answered / expected) * 100));
}
