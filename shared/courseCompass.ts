export const COURSE_COMPASS_VERSION = "2026-09-v4";

export const CORE_COMPASS_RESULTS = [
  "future_projection",
  "uncertainty_loop",
  "approval_chase",
  "chemistry_confusion",
  "novelty_pull",
] as const;

export type CompassGender = "female" | "male";
export type CoreCompassResultKey = (typeof CORE_COMPASS_RESULTS)[number];
export type CompassResultKey = CoreCompassResultKey | "safety";
export type CompassResponses = Record<string, string>;

type ScoreVector = Partial<Record<CoreCompassResultKey, number>>;
type GenderedText = { female: string; male: string };

type GenderedAnswer = {
  id: string;
  label: GenderedText;
  weights: ScoreVector;
};

type GenderedQuestion = {
  id: string;
  eyebrow: GenderedText;
  prompt: GenderedText;
  answers: GenderedAnswer[];
};

export type CompassAnswer = {
  id: string;
  label: string;
  weights?: ScoreVector;
};

export type CompassQuestion = {
  id: string;
  eyebrow: string;
  prompt: string;
  answers: CompassAnswer[];
};

export type CompassResultContent = {
  label: string;
  title: string;
  summary: string;
  rationale: string;
  deeperInsight: string;
  relationshipCost: string;
  courseBridge: string;
  counterSign: string;
  magicLine: string;
  science: string;
  actions: Array<{ id: string; label: string }>;
  accent: string;
};

export type CompassResult = {
  primary: CoreCompassResultKey;
  secondary: CoreCompassResultKey | null;
  clarity: "clear" | "close";
  scores: Record<CoreCompassResultKey, number>;
  evidence: string[];
  content: CompassResultContent;
};

const t = (female: string, male: string): GenderedText => ({ female, male });
const a = (id: string, female: string, male: string, weights: ScoreVector): GenderedAnswer => ({ id, label: t(female, male), weights });

const QUESTIONS: GenderedQuestion[] = [
  {
    id: "want_now",
    eyebrow: t("שאלה 1", "שאלה 1"),
    prompt: t("מה את הכי רוצה לדעת עליו עכשיו?", "מה אתה הכי רוצה לדעת עליה עכשיו?"),
    answers: [
      a("is_interested", "אם הוא באמת בעניין שלי", "אם היא באמת בעניין שלי", { uncertainty_loop: 3 }),
      a("make_want", "איך לגרום לו לרצות אותי יותר", "איך לגרום לה לרצות אותי יותר", { approval_chase: 3 }),
      a("is_real", "אם המשיכה הזאת אומרת שהוא מתאים לי", "אם המשיכה הזאת אומרת שהיא מתאימה לי", { chemistry_confusion: 3 }),
      a("has_future", "אם יש לנו סיכוי לזוגיות", "אם יש לנו סיכוי לזוגיות", { future_projection: 3 }),
      a("why_hard", "למה אני רוצה דווקא את מי שקשה להשיג", "למה אני רוצה דווקא את מי שקשה להשיג", { novelty_pull: 3 }),
    ],
  },
  {
    id: "no_message",
    eyebrow: t("כשהודעה לא מגיעה", "כשהודעה לא מגיעה"),
    prompt: t("מה את עושה כשהוא לא שולח הודעה?", "מה אתה עושה כשהיא לא שולחת הודעה?"),
    answers: [
      a("check_phone", "בודקת שוב ושוב אם הוא כתב", "בודק שוב ושוב אם היא כתבה", { uncertainty_loop: 3 }),
      a("send_more", "שולחת משהו כדי להחזיר את העניין", "שולח משהו כדי להחזיר את העניין", { approval_chase: 3 }),
      a("explain", "מסבירה לעצמי למה הוא כנראה עסוק", "מסביר לעצמי למה היא כנראה עסוקה", { future_projection: 2, uncertainty_loop: 1 }),
      a("want_more", "רוצה אותו אפילו יותר", "רוצה אותה אפילו יותר", { chemistry_confusion: 2, novelty_pull: 1 }),
      a("move_on", "מאבדת עניין ועוברת לאתגר הבא", "מאבד עניין ועובר לאתגר הבא", { novelty_pull: 3 }),
    ],
  },
  {
    id: "most_attractive",
    eyebrow: t("מה מושך אותך", "מה מושך אותך"),
    prompt: t("מה הכי מושך אותך בו?", "מה הכי מושך אותך בה?"),
    answers: [
      a("potential", "מה שיכול להיות בינינו", "מה שיכול להיות בינינו", { future_projection: 3 }),
      a("unknown", "שאני לא בטוחה מה הוא רוצה", "שאני לא בטוח מה היא רוצה", { uncertainty_loop: 3 }),
      a("chemistry", "הכימיה והמשיכה המטורפת", "הכימיה והמשיכה המטורפת", { chemistry_confusion: 3 }),
      a("winning", "הרצון לגרום לו לבחור בי", "הרצון לגרום לה לבחור בי", { approval_chase: 3 }),
      a("challenge", "האתגר והמסתורין", "האתגר והמסתורין", { novelty_pull: 3 }),
    ],
  },
  {
    id: "clear_tomorrow",
    eyebrow: t("אם הכול יהיה ברור", "אם הכול יהיה ברור"),
    prompt: t("אם מחר הוא יגיד שהוא רוצה קשר רציני וברור, מה תרגישי?", "אם מחר היא תגיד שהיא רוצה קשר רציני וברור, מה תרגיש?"),
    answers: [
      a("relief", "סוף סוף ארגיש הקלה", "סוף סוף ארגיש הקלה", { uncertainty_loop: 3 }),
      a("future", "מיד אתחיל לדמיין את העתיד שלנו", "מיד אתחיל לדמיין את העתיד שלנו", { future_projection: 3 }),
      a("won", "ארגיש שסוף סוף הצלחתי להשיג אותו", "ארגיש שסוף סוף הצלחתי להשיג אותה", { approval_chase: 3 }),
      a("stronger", "המשיכה שלי רק תתחזק", "המשיכה שלי רק תתחזק", { chemistry_confusion: 3 }),
      a("less_interest", "יכול להיות שחלק מהעניין שלי יירד", "יכול להיות שחלק מהעניין שלי יירד", { novelty_pull: 3 }),
    ],
  },
  {
    id: "familiar_pattern",
    eyebrow: t("הדפוס שחוזר", "הדפוס שחוזר"),
    prompt: t("איזה משפט הכי קרוב אלייך?", "איזה משפט הכי קרוב אליך?"),
    answers: [
      a("love_potential", "אני מתאהבת בפוטנציאל", "אני מתאהב בפוטנציאל", { future_projection: 3 }),
      a("attach_unclear", "אני נקשרת יותר כשלא ברור מה הוא רוצה", "אני נקשר יותר כשלא ברור מה היא רוצה", { uncertainty_loop: 3 }),
      a("need_convince", "אני רוצה במיוחד את מי שאני צריכה לשכנע", "אני רוצה במיוחד את מי שאני צריך לשכנע", { approval_chase: 3 }),
      a("trust_chemistry", "אני סומכת על הכימיה גם כשיש סימני שאלה", "אני סומך על הכימיה גם כשיש סימני שאלה", { chemistry_confusion: 3 }),
      a("easy_boring", "אני משתעממת כשזה קל מדי", "אני משתעמם כשזה קל מדי", { novelty_pull: 3 }),
    ],
  },
  {
    id: "distance",
    eyebrow: t("כשהוא מתרחק", "כשהיא מתרחקת"),
    prompt: t("מה קורה לך כשהוא מתרחק קצת?", "מה קורה לך כשהיא מתרחקת קצת?"),
    answers: [
      a("wait_potential", "אני מחכה כי אני יודעת מה עוד יכול להיות", "אני מחכה כי אני יודע מה עוד יכול להיות", { future_projection: 3 }),
      a("read_signs", "אני מחפשת סימנים שהוא עדיין רוצה", "אני מחפש סימנים שהיא עדיין רוצה", { uncertainty_loop: 3 }),
      a("try_harder", "אני מנסה יותר כדי שיבחר בי", "אני מנסה יותר כדי שתבחר בי", { approval_chase: 3 }),
      a("pulled_more", "המשיכה שלי אליו מתחזקת", "המשיכה שלי אליה מתחזקת", { chemistry_confusion: 3 }),
      a("chase", "דווקא אז מתחשק לי להשיג אותו", "דווקא אז מתחשק לי להשיג אותה", { novelty_pull: 3 }),
    ],
  },
  {
    id: "hard_to_release",
    eyebrow: t("מה קשה לשחרר", "מה קשה לשחרר"),
    prompt: t("מה הכי קשה לך לשחרר בסיפור הזה?", "מה הכי קשה לך לשחרר בסיפור הזה?"),
    answers: [
      a("imagined_future", "את העתיד שכבר דמיינתי איתו", "את העתיד שכבר דמיינתי איתה", { future_projection: 3 }),
      a("missing_answer", "את התשובה שעדיין לא קיבלתי", "את התשובה שעדיין לא קיבלתי", { uncertainty_loop: 3 }),
      a("not_chosen", "את התחושה שהוא לא בחר בי", "את התחושה שהיא לא בחרה בי", { approval_chase: 3 }),
      a("strong_feeling", "את התחושה המטורפת שהייתה בינינו", "את התחושה המטורפת שהייתה בינינו", { chemistry_confusion: 3 }),
      a("unfinished_chase", "את המרדף שעוד לא הסתיים", "את המרדף שעוד לא הסתיים", { novelty_pull: 3 }),
    ],
  },
  {
    id: "wish_now",
    eyebrow: t("האמת הפשוטה", "האמת הפשוטה"),
    prompt: t("מה את באמת רוצה שיקרה עכשיו?", "מה אתה באמת רוצה שיקרה עכשיו?"),
    answers: [
      a("clear_answer", "לקבל ממנו תשובה ברורה", "לקבל ממנה תשובה ברורה", { uncertainty_loop: 3 }),
      a("choose_me", "שהוא יבחר בי", "שהיא תבחר בי", { approval_chase: 3 }),
      a("feel_again", "להרגיש שוב את הכימיה שהייתה", "להרגיש שוב את הכימיה שהייתה", { chemistry_confusion: 3 }),
      a("relationship", "שהקשר יהפוך לזוגיות שדמיינתי", "שהקשר יהפוך לזוגיות שדמיינתי", { future_projection: 3 }),
      a("turnaround", "להצליח להשיג את מה שכמעט ברח", "להצליח להשיג את מה שכמעט ברח", { novelty_pull: 3 }),
    ],
  },
];

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
    .sort((left, right) => right.value - left.value || CORE_COMPASS_RESULTS.indexOf(left.key) - CORE_COMPASS_RESULTS.indexOf(right.key));
}

function localizeQuestion(question: GenderedQuestion, gender: CompassGender): CompassQuestion {
  return {
    id: question.id,
    eyebrow: question.eyebrow[gender],
    prompt: question.prompt[gender],
    answers: question.answers.map(answer => ({ id: answer.id, label: answer.label[gender], weights: answer.weights })),
  };
}

function resultContent(key: CoreCompassResultKey, gender: CompassGender): CompassResultContent {
  const female = gender === "female";
  const content: Record<CoreCompassResultKey, CompassResultContent> = {
    future_projection: {
      label: "העתיד שכבר דמיינת",
      title: female ? "את לא תקועה רק בו. את תקועה בעתיד שכבר דמיינת איתו." : "אתה לא תקוע רק בה. אתה תקוע בעתיד שכבר דמיינת איתה.",
      summary: female ? "ראית מהר מאוד מה יכול להיות ביניכם. עכשיו קשה לך לשחרר לא רק אותו, אלא גם את הזוגיות שכבר התחילה לחיות לך בראש." : "ראית מהר מאוד מה יכול להיות ביניכם. עכשיו קשה לך לשחרר לא רק אותה, אלא גם את הזוגיות שכבר התחילה לחיות לך בראש.",
      rationale: female ? "בחרת שוב ושוב בעתיד, בפוטנציאל ובמה שעוד יכול לקרות." : "בחרת שוב ושוב בעתיד, בפוטנציאל ובמה שעוד יכול לקרות.",
      deeperInsight: female ? "את קולטת מהר אפשרויות וחיבורים. זו יכולת נהדרת, אבל כשהלב מקדים את המציאות, את עלולה להיקשר לגרסה עתידית של הקשר עוד לפני שהאדם שמולך באמת בחר להיות שם." : "אתה קולט מהר אפשרויות וחיבורים. זו יכולת נהדרת, אבל כשהלב מקדים את המציאות, אתה עלול להיקשר לגרסה עתידית של הקשר עוד לפני שהאדם שמולך באמת בחר להיות שם.",
      relationshipCost: female ? "במקום לבדוק אם הקשר מתקדם היום, את ממשיכה להשקיע במה שהוא עשוי להפוך להיות." : "במקום לבדוק אם הקשר מתקדם היום, אתה ממשיך להשקיע במה שהוא עשוי להפוך להיות.",
      courseBridge: female ? "בקורס תלמדי להפריד בין פוטנציאל לבין בחירה הדדית, ולבנות מצפן שמחזיר אותך לעובדות בלי לוותר על התקווה." : "בקורס תלמד להפריד בין פוטנציאל לבין בחירה הדדית, ולבנות מצפן שמחזיר אותך לעובדות בלי לוותר על התקווה.",
      counterSign: "פוטנציאל הוא אפשרות. זוגיות נבנית ממה שקורה בפועל.",
      magicLine: female ? "המצפן שלך לא צריך עוד דמיון. הוא צריך עובדות מההווה." : "המצפן שלך לא צריך עוד דמיון. הוא צריך עובדות מההווה.",
      science: "כשהמידע חלקי, המוח משלים את החסר בסיפור. לפעמים הסיפור מרגיש אמיתי כמעט כמו הקשר עצמו.",
      actions: [{ id: "present_facts", label: female ? "בדקי מה הוא עושה היום, לא מה הוא עשוי לעשות בעתיד" : "בדוק מה היא עושה היום, לא מה היא עשויה לעשות בעתיד" }],
      accent: "#f1cf86",
    },
    uncertainty_loop: {
      label: "חוסר הוודאות",
      title: female ? "את לא מחפשת רק אותו. את מחפשת ודאות שהוא רוצה אותך." : "אתה לא מחפש רק אותה. אתה מחפש ודאות שהיא רוצה אותך.",
      summary: female ? "כל עוד לא ברור מה הוא מרגיש, המוח שלך ממשיך לבדוק, לפרש ולחפש את הסימן הבא." : "כל עוד לא ברור מה היא מרגישה, המוח שלך ממשיך לבדוק, לפרש ולחפש את הסימן הבא.",
      rationale: female ? "בחרת שוב ושוב בהודעות, בסימנים ובצורך להבין אם הוא בעניין." : "בחרת שוב ושוב בהודעות, בסימנים ובצורך להבין אם היא בעניין.",
      deeperInsight: female ? "הקושי אינו רק שאין תשובה. חוסר הוודאות משאיר אותך דרוכה, וכל הודעה קטנה מרגישה כמו רמז שצריך לפענח. כך האדם מקבל יותר מקום בראש דווקא כשהקשר נותן פחות ביטחון." : "הקושי אינו רק שאין תשובה. חוסר הוודאות משאיר אותך דרוך, וכל הודעה קטנה מרגישה כמו רמז שצריך לפענח. כך האדם מקבל יותר מקום בראש דווקא כשהקשר נותן פחות ביטחון.",
      relationshipCost: female ? "את משקיעה אנרגיה בניתוח סימנים במקום לקבל תמונה ברורה של כוונה, זמינות ומעשים." : "אתה משקיע אנרגיה בניתוח סימנים במקום לקבל תמונה ברורה של כוונה, זמינות ומעשים.",
      courseBridge: female ? "בקורס תלמדי לזהות מתי חוסר ודאות מפעיל אותך, איך לבקש בהירות ואיך לבחון את התשובה דרך התנהגות עקבית." : "בקורס תלמד לזהות מתי חוסר ודאות מפעיל אותך, איך לבקש בהירות ואיך לבחון את התשובה דרך התנהגות עקבית.",
      counterSign: "חוסר ודאות יכול להרגיש כמו משיכה חזקה, גם כשהקשר עצמו אינו מתקדם.",
      magicLine: female ? "המצפן שלך צריך תשובה ברורה, לא עוד סימן ממנו." : "המצפן שלך צריך תשובה ברורה, לא עוד סימן ממנה.",
      science: "כשהתשובה מגיעה לפעמים ונעלמת לפעמים, המוח נשאר דרוך ומחפש אותה שוב. לכן חוסר ודאות יכול להפוך לממכר.",
      actions: [{ id: "clear_answer", label: female ? "בקשי תשובה ברורה ובדקי אם המעשים שלו תואמים אותה" : "בקש תשובה ברורה ובדוק אם המעשים שלה תואמים אותה" }],
      accent: "#f0a6c8",
    },
    approval_chase: {
      label: "הרצון שיבחרו בך",
      title: female ? "ככל שקשה יותר להשיג אותו, כך חשוב לך יותר שהוא יבחר בך." : "ככל שקשה יותר להשיג אותה, כך חשוב לך יותר שהיא תבחר בך.",
      summary: female ? "הבחירה שלו הפכה להוכחה שאת מספיק טובה. לכן את משקיעה יותר דווקא כשהוא נותן פחות." : "הבחירה שלה הפכה להוכחה שאתה מספיק טוב. לכן אתה משקיע יותר דווקא כשהיא נותנת פחות.",
      rationale: female ? "בחרת שוב ושוב בלהשיג אותו, להרשים אותו ולגרום לו לבחור בך." : "בחרת שוב ושוב בלהשיג אותה, להרשים אותה ולגרום לה לבחור בך.",
      deeperInsight: female ? "כשהבחירה שלו מרגישה כמו מבחן לערך שלך, קשה לעצור ולשאול אם הוא בכלל מתאים לך. המאמץ הופך למטרה, וההדדיות נדחקת הצידה." : "כשהבחירה שלה מרגישה כמו מבחן לערך שלך, קשה לעצור ולשאול אם היא בכלל מתאימה לך. המאמץ הופך למטרה, וההדדיות נדחקת הצידה.",
      relationshipCost: female ? "את עלולה לעבוד קשה כדי לזכות במישהו, במקום לבדוק אם הקשר מעניק לך את מה שאת צריכה." : "אתה עלול לעבוד קשה כדי לזכות במישהי, במקום לבדוק אם הקשר מעניק לך את מה שאתה צריך.",
      courseBridge: female ? "בקורס תלמדי להעביר את מרכז הכובד מהשאלה אם בחרו בך לשאלה במי את בוחרת, ולבנות סטנדרטים שאינם נעלמים ברגע שיש משיכה." : "בקורס תלמד להעביר את מרכז הכובד מהשאלה אם בחרו בך לשאלה במי אתה בוחר, ולבנות סטנדרטים שאינם נעלמים ברגע שיש משיכה.",
      counterSign: female ? "השאלה החשובה אינה רק אם הוא בוחר בך. האם את באמת בוחרת בו?" : "השאלה החשובה אינה רק אם היא בוחרת בך. האם אתה באמת בוחר בה?",
      magicLine: female ? "המצפן שלך צריך להחזיר את הבחירה לידיים שלך." : "המצפן שלך צריך להחזיר את הבחירה לידיים שלך.",
      science: "דחייה מפעילה צורך חזק להוכיח ערך. לפעמים הרצון לנצח את הדחייה מרגיש כמו אהבה.",
      actions: [{ id: "choose_back", label: female ? "שאלי אם את רוצה אותו, לא רק אם את יכולה להשיג אותו" : "שאל אם אתה רוצה אותה, לא רק אם אתה יכול להשיג אותה" }],
      accent: "#ffb38f",
    },
    chemistry_confusion: {
      label: "הכימיה החזקה",
      title: female ? "את מרגישה כימיה חזקה, והמוח שלך מתרגם אותה להתאמה." : "אתה מרגיש כימיה חזקה, והמוח שלך מתרגם אותה להתאמה.",
      summary: female ? "התחושה שלך אמיתית. אבל משיכה חזקה עדיין לא אומרת שהוא פנוי, יציב או מתאים לך." : "התחושה שלך אמיתית. אבל משיכה חזקה עדיין לא אומרת שהיא פנויה, יציבה או מתאימה לך.",
      rationale: female ? "בחרת שוב ושוב בעוצמה, בריגוש ובמה שהגוף מרגיש לידו." : "בחרת שוב ושוב בעוצמה, בריגוש ובמה שהגוף מרגיש לידה.",
      deeperInsight: female ? "הגוף יכול לזהות ריגוש מהר מאוד, אבל התאמה לחיים מתבררת לאט יותר. כששני הדברים מתערבבים, עוצמה רגשית מקבלת בטעות מעמד של הוכחה." : "הגוף יכול לזהות ריגוש מהר מאוד, אבל התאמה לחיים מתבררת לאט יותר. כששני הדברים מתערבבים, עוצמה רגשית מקבלת בטעות מעמד של הוכחה.",
      relationshipCost: female ? "את עלולה לתת לכימיה להסביר פערים בזמינות, בערכים או ביחס, ולגלות מאוחר שהלב והמציאות לא נעו יחד." : "אתה עלול לתת לכימיה להסביר פערים בזמינות, בערכים או ביחס, ולגלות מאוחר שהלב והמציאות לא נעו יחד.",
      courseBridge: female ? "בקורס תלמדי להחזיק את המשיכה בלי להתעלם מהנתונים, ולבדוק התאמה דרך ערכים, עקביות, זמינות ויכולת לבנות קשר." : "בקורס תלמד להחזיק את המשיכה בלי להתעלם מהנתונים, ולבדוק התאמה דרך ערכים, עקביות, זמינות ויכולת לבנות קשר.",
      counterSign: "כימיה היא התחלה נהדרת. התאמה נמדדת גם ביציבות, בכבוד ובמעשים.",
      magicLine: female ? "המצפן שלך צריך לבדוק אם הלב, הגוף והמציאות מצביעים לאותו כיוון." : "המצפן שלך צריך לבדוק אם הלב, הגוף והמציאות מצביעים לאותו כיוון.",
      science: "עוררות, חידוש ומתח מגבירים משיכה. המוח לא תמיד מפריד מיד בין ריגוש לבין קשר שמתאים לחיים.",
      actions: [{ id: "chemistry_and_facts", label: female ? "בדקי אם יש גם עקביות ומעשים, לא רק כימיה" : "בדוק אם יש גם עקביות ומעשים, לא רק כימיה" }],
      accent: "#c8b5ff",
    },
    novelty_pull: {
      label: "המרדף",
      title: female ? "דווקא מה שקשה להשיג מדליק אותך יותר." : "דווקא מה שקשה להשיג מדליק אותך יותר.",
      summary: female ? "כשהוא רחוק או לא ברור, את רוצה אותו יותר. כשהכול נעשה קל וזמין, חלק מהעניין עלול לרדת." : "כשהיא רחוקה או לא ברורה, אתה רוצה אותה יותר. כשהכול נעשה קל וזמין, חלק מהעניין עלול לרדת.",
      rationale: female ? "בחרת שוב ושוב באתגר, במסתורין וברצון להשיג אותו דווקא כשהוא מתרחק." : "בחרת שוב ושוב באתגר, במסתורין וברצון להשיג אותה דווקא כשהיא מתרחקת.",
      deeperInsight: female ? "המרדף יוצר תנועה, מתח וסיפור. כשהצד השני נוכח וברור, אין את אותה רכבת הרים, ולכן שקט עלול להרגיש בטעות כמו חוסר משיכה." : "המרדף יוצר תנועה, מתח וסיפור. כשהצד השני נוכח וברור, אין את אותה רכבת הרים, ולכן שקט עלול להרגיש בטעות כמו חוסר משיכה.",
      relationshipCost: female ? "את עלולה לפספס קשר יציב מפני שהוא אינו דורש ממך להילחם עליו, ולהישאב שוב למי שמחזיק אותך במאמץ." : "אתה עלול לפספס קשר יציב מפני שהוא אינו דורש ממך להילחם עליו, ולהישאב שוב למי שמחזיק אותך במאמץ.",
      courseBridge: female ? "בקורס תלמדי לזהות את ההבדל בין שעמום לבין ביטחון, ולתת מקום לחיבור שנבנה בלי משחק של התקרבות והתרחקות." : "בקורס תלמד לזהות את ההבדל בין שעמום לבין ביטחון, ולתת מקום לחיבור שנבנה בלי משחק של התקרבות והתרחקות.",
      counterSign: "שקט אינו בהכרח שעמום. לפעמים הוא פשוט קשר שלא דורש מרדף.",
      magicLine: female ? "המצפן שלך צריך ללמוד לזהות חיבור גם כשהוא לא בורח." : "המצפן שלך צריך ללמוד לזהות חיבור גם כשהיא לא בורחת.",
      science: "המוח אוהב חידוש ואתגר. כשהמרדף נגמר, העוצמה יכולה לרדת גם אם האדם דווקא מתאים.",
      actions: [{ id: "give_calm_chance", label: female ? "תני סיכוי גם למי שנוכח וברור, לפני שאת קוראת לזה שעמום" : "תן סיכוי גם למי שנוכחת וברורה, לפני שאתה קורא לזה שעמום" }],
      accent: "#b9e6d0",
    },
  };
  return content[key];
}

export function getCompassQuestionById(id: string, _responses: CompassResponses = {}, gender: CompassGender = "female") {
  const question = QUESTIONS.find(item => item.id === id);
  return question ? localizeQuestion(question, gender) : null;
}

export function getNextCompassQuestion(responses: CompassResponses, gender: CompassGender = "female"): CompassQuestion | null {
  const next = QUESTIONS.find(question => !responses[question.id]);
  return next ? localizeQuestion(next, gender) : null;
}

export function scoreCompassResponses(responses: CompassResponses) {
  const scores = emptyScores();
  for (const question of QUESTIONS) {
    const answerId = responses[question.id];
    if (!answerId) continue;
    const answer = question.answers.find(item => item.id === answerId);
    if (!answer) continue;
    for (const [key, value] of Object.entries(answer.weights)) scores[key as CoreCompassResultKey] += value || 0;
  }
  return scores;
}

export function getCompassResult(responses: CompassResponses, gender: CompassGender = "female"): CompassResult {
  const scores = scoreCompassResponses(responses);
  const ranked = sortScores(scores);
  const primary = ranked[0].key;
  const secondary = ranked[1].key;
  const evidence: string[] = [];
  for (const question of QUESTIONS) {
    const answerId = responses[question.id];
    const answer = question.answers.find(item => item.id === answerId);
    if (answer && (answer.weights[primary] || 0) > 0) evidence.push(answer.label[gender]);
  }
  return {
    primary,
    secondary,
    clarity: ranked[0].value - ranked[1].value >= 3 ? "clear" : "close",
    scores,
    evidence: evidence.slice(0, 3),
    content: resultContent(primary, gender),
  };
}

export function getCompassResultContent(key: CompassResultKey, gender: CompassGender = "female") {
  if (key === "safety") {
    return {
      label: "בטיחות",
      title: "בטיחות וגבול קודמים לכל ניתוח של קשר.",
      summary: "אם יש לחץ, איום או חוסר ביטחון, חשוב להתרחק מהלחץ ולפנות לעזרה מתאימה.",
      rationale: "הבטיחות קודמת לכל פיצוח.",
      deeperInsight: "אין צורך להבין את כל הדינמיקה לפני ששומרים על עצמכם.",
      relationshipCost: "כשאין ביטחון, ניסיון לפענח את הצד השני עלול לדחות פעולה חשובה.",
      courseBridge: "הקורס אינו תחליף לסיוע מקצועי או לשירותי חירום.",
      counterSign: "החוויה אינה מחליפה עזרה מקצועית או שירותי חירום.",
      magicLine: "המצפן שלך שומר קודם עליך.",
      science: "כשאין ביטחון, הצעד הראשון הוא תמיכה וגבול.",
      actions: [{ id: "seek_support", label: "לפנות לאדם בטוח" }],
      accent: "#ffd4c7",
    } satisfies CompassResultContent;
  }
  return resultContent(key, gender);
}

export function getCompassProgress(responses: CompassResponses) {
  return Math.min(100, Math.round((Object.keys(responses).length / QUESTIONS.length) * 100));
}
