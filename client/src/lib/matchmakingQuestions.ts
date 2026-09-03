/**
 * Matchmaking Compatibility Questions: OkCupid-style
 * Based on psychological research: Attachment Theory (Bowlby/Ainsworth),
 * Gottman's Sound Relationship House, Big Five Personality Model,
 * and Sternberg's Triangular Theory of Love.
 *
 * Each question has:
 *   - id: unique key
 *   - category: thematic group
 *   - text_f / text_m: gendered Hebrew text
 *   - options: 4-5 answer choices (indexed 0-4)
 *   - weight: base importance in compatibility score (1-3)
 *   - type: 'single' (default) | 'rankTop3' (rank top 3 from list)
 *
 * Scoring: OkCupid formula
 *   For each question, if person A's answer matches what person B wants (and vice versa),
 *   points are added proportional to importance.
 *
 * rankTop3 scoring: overlap between top-3 lists (partial credit by rank position)
 */

export type QuestionType = "single" | "rankTop3";

export type MatchQuestion = {
  id: string;
  category: "relationship_values" | "lifestyle" | "family" | "personality" | "practical";
  categoryLabel: string;
  categoryIcon: string;
  text_f: string;
  text_m: string;
  explanation: string; // Why this question matters
  options: string[];
  weight: 1 | 2 | 3; // 1=nice to have, 2=important, 3=critical
  type?: QuestionType; // default: 'single'
  chapter2Only?: boolean; // Only shown to divorced/widowed
  forParentsOnly?: boolean; // Only shown to those with kids
  conditionalAge?: number; // Only shown if person's age >= this value
};

export const MATCH_QUESTIONS: MatchQuestion[] = [
  // ── RELATIONSHIP VALUES ──────────────────────────────────────────────────
  {
    id: "q_commitment",
    category: "relationship_values",
    categoryLabel: "ערכי זוגיות",
    categoryIcon: "💛",
    text_f: "דרגי את 3 הדברים החשובים לך ביותר בזוגיות (מהחשוב ביותר לפחות):",
    text_m: "דרג את 3 הדברים החשובים לך ביותר בזוגיות (מהחשוב ביותר לפחות):",
    explanation: "מחקרי גוטמן הראו שזוגות שחולקים את אותה 'מפת אהבה': ההגדרה של מה זוגיות אמיתית: נשארים יחד פי 3 יותר.",
    options: [
      "תחושת ביטחון ויציבות",
      "תשוקה ורגש עמוק",
      "שותפות ועשייה משותפת",
      "חופש וצמיחה אישית",
      "חברות ואינטימיות רגשית",
    ],
    type: "rankTop3",
    weight: 3,
  },
  {
    id: "q_conflict_style",
    category: "relationship_values",
    categoryLabel: "ערכי זוגיות",
    categoryIcon: "💛",
    text_f: "כשיש ריב: מה הדרך הטבעית שלך?",
    text_m: "כשיש ריב: מה הדרך הטבעית שלך?",
    explanation: "סגנון ניהול קונפליקטים הוא אחד הנבאים החזקים ביותר לאושר זוגי. זוגות שמנהלים קונפליקטים בסגנון דומה חווים פחות פגיעה.",
    options: [
      "מדבר/ת על זה מיד, גם אם קשה",
      "צריכ/ה קצת זמן לעצמי/ה ואז מדבר/ת",
      "מנסה לפתור בשקט ובלי עימות",
      "מחכה שהצד השני יפתח",
    ],
    weight: 3,
  },
  {
    id: "q_love_language",
    category: "relationship_values",
    categoryLabel: "ערכי זוגיות",
    categoryIcon: "💛",
    text_f: "דרגי את 3 שפות האהבה החשובות לך ביותר (מהחשובה ביותר לפחות חשובה):",
    text_m: "דרג את 3 שפות האהבה החשובות לך ביותר (מהחשובה ביותר לפחות חשובה):",
    explanation: "תיאוריית 5 שפות האהבה של גארי צ'פמן: כשאנשים 'מדברים' שפות אהבה שונות, שניהם מרגישים שהם נותנים ולא מקבלים.",
    options: [
      "מילים ומחמאות (\"אתה/את מדהים/ה\")",
      "מגע פיזי וחיבוקים",
      "זמן איכות ביחד",
      "מתנות ומחוות קטנות",
      "עזרה מעשית ומעשים",
    ],
    type: "rankTop3",
    weight: 2,
  },
  {
    id: "q_attachment",
    category: "relationship_values",
    categoryLabel: "ערכי זוגיות",
    categoryIcon: "💛",
    text_f: "מה מתאר אותך יותר בזוגיות?",
    text_m: "מה מתאר אותך יותר בזוגיות?",
    explanation: "תיאוריית ההתקשרות (Attachment Theory) מסבירה שדפוסי הקשר שלנו נוצרים בילדות ומשפיעים על כל קשר אינטימי.",
    options: [
      "אני זקוק/ה לאישורים ומרגיש/ה חרדה כשהצד השני מתרחק",
      "אני נוח/ה עם קרבה ומרגיש/ה בטוח/ה בקשר",
      "אני מעדיפ/ה מרחב ומתקשה עם תלות",
      "לפעמים רוצה קרבה ולפעמים מרחק: תלוי במצב",
    ],
    weight: 3,
  },

  // ── FAMILY ──────────────────────────────────────────────────────────────
  {
    id: "q_kids_future",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "ילדים: מה הרצון שלך?",
    text_m: "ילדים: מה הרצון שלך?",
    explanation: "אחד הנושאים הקריטיים ביותר לתאימות. חוסר הסכמה על ילדים הוא אחד הגורמים הנפוצים לפרידה.",
    options: [
      "רוצה ילדים בהחלט",
      "פתוח/ה לרעיון אם הצד השני רוצה",
      "לא בטוח/ה עדיין",
      "לא רוצה ילדים",
    ],
    weight: 3,
  },
  {
    id: "q_kids_flexibility",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "בנוגע לילדים, כמה את גמישה בנושא?",
    text_m: "בנוגע לילדים, כמה אתה גמיש בנושא?",
    explanation: "בגיל 38+ הגמישות בנושא ילדים משפיעה מאוד על מגוון ההתאמות האפשריות.",
    options: [
      "חייב/ת ילדים, זה קו אדום עבורי",
      "מאוד רוצה אבל אפשר לדון",
      "פתוח/ה, תלוי בבן/בת הזוג הנכון/ה",
      "לא חשוב לי כבר, אני בשלום עם כל אפשרות",
    ],
    weight: 3,
    conditionalAge: 38,
  },
  {
    id: "q_marriage",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "נישואין: מה עמדתך?",
    text_m: "נישואין: מה עמדתך?",
    explanation: "ציפיות שונות לגבי נישואין יוצרות מתח שמצטבר עם הזמן.",
    options: [
      "חשוב לי מאוד להתחתן",
      "פתוח/ה לנישואין אם זה מגיע",
      "מעדיפ/ה זוגיות מחויבת ללא נישואין",
      "עדיין לא יודע/ת",
    ],
    weight: 3,
  },
  {
    id: "q_living_together",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "מתי נכון לגור יחד לדעתך?",
    text_m: "מתי נכון לגור יחד לדעתך?",
    explanation: "ציר הזמן של הקשר: כמה מהר רוצים להתקדם: הוא מקור נפוץ לחיכוך.",
    options: [
      "אחרי כמה חודשים של קשר",
      "אחרי שנה בערך",
      "רק אחרי אירוסין/נישואין",
      "כל זוג לפי הקצב שלו",
    ],
    weight: 2,
  },

  // ── LIFESTYLE ────────────────────────────────────────────────────────────
  {
    id: "q_friday_night",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "שישי בלילה האידיאלי שלך הוא...",
    text_m: "שישי בלילה האידיאלי שלך הוא...",
    explanation: "אורח חיים חברתי משפיע ישירות על כמות הזמן שהזוג מבלה יחד ועל רמת האנרגיה שכל אחד מביא לקשר.",
    options: [
      "ערב שקט בבית, סרט וספה",
      "ארוחת ערב עם חברים קרובים",
      "יציאה לבר, מסעדה, אירוע",
      "תלוי במצב הרוח: גמיש/ה",
    ],
    weight: 2,
  },
  {
    id: "q_religion",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "רמת הדתיות שלך בחיי היומיום:",
    text_m: "רמת הדתיות שלך בחיי היומיום:",
    explanation: "אורח חיים דתי משפיע על שבת, כשרות, חגים, ועוד: ולכן חשוב שיהיה תואם.",
    options: [
      "חילוני/ת לגמרי",
      "מסורתי/ת: שומר/ת קצת",
      "דתי/ה לייט",
      "דתי/ה",
    ],
    weight: 3,
  },
  {
    id: "q_travel",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "חופשה אידיאלית עבורך:",
    text_m: "חופשה אידיאלית עבורך:",
    explanation: "שאלה קלה שחושפת ערכים עמוקים: הרפתקנות מול נוחות, ספונטניות מול תכנון.",
    options: [
      "חוף ים, מנוחה מוחלטת",
      "טיול בטבע, הרים, טרקים",
      "ערים ותרבות: מוזיאונים, מסעדות",
      "הרפתקה ספונטנית: לאן שמוביל",
    ],
    weight: 1,
  },
  {
    id: "q_travel_frequency",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "כמה פעמים בשנה את נוסעת לחו\"ל (בממוצע)?",
    text_m: "כמה פעמים בשנה אתה נוסע לחו\"ל (בממוצע)?",
    explanation: "תדירות נסיעות לחו\"ל משקפת גם ערכים (הרפתקנות, פנאי) וגם יכולת כלכלית ועדיפויות.",
    options: [
      "לא נוסע/ת בכלל או לעיתים נדירות",
      "פעם בשנה בערך",
      "פעמיים-שלוש בשנה",
      "ארבע פעמים ויותר: אני אוהב/ת לנסוע",
    ],
    weight: 1,
  },
  {
    id: "q_money",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "הגישה שלך לכסף בזוגיות:",
    text_m: "הגישה שלך לכסף בזוגיות:",
    explanation: "כסף הוא אחד הנושאים השכיחים ביותר לריבים בזוגות. גישה דומה מפחיתה חיכוך.",
    options: [
      "הכל משותף: חשבון אחד",
      "חשבון משותף לדברים משותפים + חשבון אישי",
      "כל אחד שומר על חשבון נפרד",
      "תלוי בשלב הקשר",
    ],
    weight: 2,
  },
  {
    id: "q_lifestyle_economic",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "מה מתאר את אורח החיים שאת מחפשת בזוגיות?",
    text_m: "מה מתאר את אורח החיים שאתה מחפש בזוגיות?",
    explanation: "אורח חיים משותף, רמת ההוצאות, הפנאי, והסגנון, משפיע מאוד על ההרמוניה הזוגית לאורך זמן.",
    options: [
      "חיים פשוטים ומינימליסטיים: הדברים הקטנים הם מה שחשוב",
      "חיים נוחים: לא מותרות אבל לא להתאמץ",
      "חיים טובים: מסעדות, נסיעות, חוויות",
      "חיים ברמה גבוהה: אני מאמין/ה שמגיע לנו הכי טוב",
    ],
    weight: 2,
  },
  {
    id: "q_financial_independence",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "עצמאות כלכלית בזוגיות, מה חשוב לך?",
    text_m: "עצמאות כלכלית בזוגיות, מה חשוב לך?",
    explanation: "ציפיות לגבי עצמאות כלכלית ותרומה הדדית הן מקור שכיח לחיכוך. חשוב שהשקפות יהיו תואמות.",
    options: [
      "חשוב לי שכל אחד יהיה עצמאי כלכלית",
      "חשוב לי שנהיה שווים בתרומה הכלכלית",
      "אני פתוח/ה לחלוקה גמישה לפי יכולות",
      "אני מוכן/ה לתמוך כלכלית אם הצד השני צריך",
    ],
    weight: 2,
  },

  // ── PERSONALITY ──────────────────────────────────────────────────────────
  {
    id: "q_energy",
    category: "personality",
    categoryLabel: "אישיות",
    categoryIcon: "✨",
    text_f: "איך את נטענת אחרי שבוע עמוס?",
    text_m: "איך אתה נטען אחרי שבוע עמוס?",
    explanation: "אינטרוברסיה/אקסטרוברסיה (Big Five) משפיעה על כמות הזמן שכל אחד צריך לעצמו: ועל כמה הוא רוצה להיות עם בן/ת הזוג.",
    options: [
      "זמן לבד, שקט, ספר/סרט",
      "עם אנשים: חברים, משפחה",
      "שילוב: קצת לבד, קצת עם אנשים",
    ],
    weight: 2,
  },
  {
    id: "q_communication",
    category: "personality",
    categoryLabel: "אישיות",
    categoryIcon: "✨",
    text_f: "בתקשורת יומיומית עם בן זוג, את מעדיפה:",
    text_m: "בתקשורת יומיומית עם בת זוג, אתה מעדיף:",
    explanation: "ציפיות שונות לתדירות תקשורת הן מקור שכיח לאי-הבנות: אחד מרגיש מחנק, השני מרגיש מרוחק.",
    options: [
      "הרבה הודעות לאורך היום: אני אוהב/ת להרגיש מחובר/ת",
      "כמה הודעות ביום: לא יותר מדי",
      "בעיקר שיחות טלפון/וידאו",
      "מינימום הודעות: לפגוש ולדבר פנים אל פנים",
    ],
    weight: 2,
  },
  {
    id: "q_ambition",
    category: "personality",
    categoryLabel: "אישיות",
    categoryIcon: "✨",
    text_f: "הקריירה והשאיפות המקצועיות שלך:",
    text_m: "הקריירה והשאיפות המקצועיות שלך:",
    explanation: "שאיפות קריירה משפיעות על זמינות, אנרגיה, ועדיפויות: ועל מה הזוג מצפה אחד מהשני.",
    options: [
      "הקריירה היא מרכזית בחיי: אני שאפתן/ית מאוד",
      "עבודה חשובה אבל לא על חשבון הזוגיות",
      "מעדיפ/פ שיווי משקל: עבודה, חיים, זוגיות",
      "הזוגיות והמשפחה הן העדיפות הראשונה שלי",
    ],
    weight: 2,
  },
  {
    id: "q_humor",
    category: "personality",
    categoryLabel: "אישיות",
    categoryIcon: "✨",
    text_f: "הומור: כמה הוא חשוב לך בזוגיות?",
    text_m: "הומור: כמה הוא חשוב לך בזוגיות?",
    explanation: "גוטמן מצא שזוגות שצוחקים יחד ב-5 פעמים לכל ויכוח: נשארים יחד. הומור הוא מנגנון הגנה זוגי.",
    options: [
      "קריטי: אני חייב/ת שותף/ה שמצחיק/ה אותי",
      "חשוב מאוד: אבל לא הכרחי",
      "נחמד אבל לא עיקרי",
      "לא ממש חשוב לי",
    ],
    weight: 2, // הועלה מ-1 ל-2
  },

  // ── PRACTICAL ────────────────────────────────────────────────────────────
  {
    id: "q_location",
    category: "practical",
    categoryLabel: "פרקטי",
    categoryIcon: "📍",
    text_f: "מרחק גיאוגרפי: כמה אוכל להתפשר?",
    text_m: "מרחק גיאוגרפי: כמה אוכל להתפשר?",
    explanation: "מרחק פיזי יוצר אתגרים לוגיסטיים שמצטברים לאורך זמן.",
    options: [
      "רק מישהו/י מאותה עיר או סביבה קרובה",
      "עד שעה נסיעה: בסדר גמור",
      "כל הארץ: מוכן/ה לעבור",
    ],
    weight: 2,
  },
  {
    id: "q_kids_existing",
    category: "practical",
    categoryLabel: "פרקטי",
    categoryIcon: "📍",
    text_f: "האם תוכלי לקבל בן זוג עם ילדים מקשר קודם?",
    text_m: "האם תוכל לקבל בת זוג עם ילדים מקשר קודם?",
    explanation: "שאלה מעשית שמשפיעה על הדינמיקה המשפחתית.",
    options: [
      "כן, בהחלט: זה לא מפריע לי",
      "כן, אם הילדים גדולים יחסית",
      "מוכן/ה לשקול: תלוי בנסיבות",
      "מעדיפ/ה שלא",
    ],
    weight: 2,
  },
  {
    id: "q_age_gap",
    category: "practical",
    categoryLabel: "פרקטי",
    categoryIcon: "📍",
    text_f: "הפרש גילאים: מה מקובל עלייך?",
    text_m: "הפרש גילאים: מה מקובל עליך?",
    explanation: "הפרשי גילאים גדולים יוצרים לפעמים פערים בשלב החיים ובציפיות.",
    options: [
      "עד 3 שנים הפרש",
      "עד 5 שנים הפרש",
      "עד 10 שנים הפרש",
      "גיל לא חשוב לי בכלל",
    ],
    weight: 2,
  },
  {
    id: "q_past_relationship",
    category: "practical",
    categoryLabel: "פרקטי",
    categoryIcon: "📍",
    text_f: "מה הסטטוס שלך מהקשר הקודם?",
    text_m: "מה הסטטוס שלך מהקשר הקודם?",
    explanation: "שאלה שמסייעת להבין את מוכנות הלב לקשר חדש.",
    options: [
      "עיבדתי את זה לגמרי: מוכן/ה לגמרי",
      "בתהליך: אבל פתוח/ה לקשר חדש",
      "עדיין בתחילת הדרך: לוקח/ת את הזמן",
    ],
    weight: 1,
  },

  // ── PETS ─────────────────────────────────────────────────────────────────
  {
    id: "q_pets",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "בעלי חיים: מה הגישה שלך?",
    text_m: "בעלי חיים: מה הגישה שלך?",
    explanation: "בעלי חיים משפיעים על אורח החיים, הזמן, ולפעמים גם על אלרגיות: חשוב לדעת מראש.",
    options: [
      "יש לי בעל חיים ואני מצפה שבן/ת הזוג יאהב/תאהב אותו",
      "אין לי אבל אני אוהב/ת בעלי חיים ומקבל/ת",
      "אין לי ואני מעדיפ/ה שגם לבן/ת הזוג לא יהיה",
      "אלרגי/ה: לא יכול/ה לחיות עם בעלי חיים",
    ],
    weight: 2,
  },

  // ── CHAPTER 2 (shown only for divorced/widowed with kids) ─────────────────
  {
    id: "q_step_parent",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "כמה את פתוחה לתפקיד הורה חורג?",
    text_m: "כמה אתה פתוח לתפקיד הורה חורג?",
    explanation: "תפקיד הורה חורג הוא אחד האתגרים הגדולים בפרק ב'. חשוב שהציפיות יהיו תואמות.",
    options: [
      "מוכן/ה לגמרי: אני רואה את זה כחלק טבעי",
      "פתוח/ה: אבל צריך/ה זמן להכיר",
      "מעדיפ/ה תפקיד מינימלי: ההורה הביולוגי מוביל",
      "מתקשה עם הרעיון: צריך/ה לחשוב על זה",
    ],
    weight: 3,
    chapter2Only: true,
  },
  {
    id: "q_kids_involvement",
    category: "family",
    categoryLabel: "משפחה",
    categoryIcon: "👨‍👩‍👧",
    text_f: "הילדים שלך: כמה הם נוכחים בחיי היומיום?",
    text_m: "הילדים שלך: כמה הם נוכחים בחיי היומיום?",
    explanation: "הבנת הדינמיקה המשפחתית עוזרת להתאים ציפיות מציאותיות.",
    options: [
      "אצלי כל הזמן: משמורת מלאה",
      "חצי-חצי: שבועות לסירוגין",
      "סופי שבוע בלבד",
      "כבר גדולים ועצמאיים",
    ],
    weight: 2,
    chapter2Only: true,
    forParentsOnly: true,
  },
  {
    id: "q_relationship_pace",
    category: "relationship_values",
    categoryLabel: "ערכי זוגיות",
    categoryIcon: "💛",
    text_f: "בפרק ב': מה הקצב שנוח לך?",
    text_m: "בפרק ב': מה הקצב שנוח לך?",
    explanation: "אחרי קשר קודם, אנשים מגיעים עם ניסיון ולפעמים גם עם זהירות. חשוב שהקצב יתאים לשני הצדדים.",
    options: [
      "אני רוצה לבנות לאט ובטוח: אין מה למהר",
      "אני פתוח/ה להתקדם כשמרגיש נכון",
      "אני יודע/ת מה אני רוצה: אני מוכן/ה להתקדם מהר",
    ],
    weight: 2,
    chapter2Only: true,
  },
  {
    id: "q_smoking_status",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "האם את מעשנת?",
    text_m: "האם אתה מעשן?",
    explanation: "עישון הוא גורם שיכול להשפיע על הכימיה היומיומית בזוגיות. חשוב שנדע כדי להתאים נכון.",
    options: [
      "לא מעשן/ת",
      "מעשן/ת לעיתים (חברתי/ת)",
      "מעשן/ת",
    ],
    weight: 1,
  },
  {
    id: "q_smoking_pref",
    category: "lifestyle",
    categoryLabel: "אורח חיים",
    categoryIcon: "🌙",
    text_f: "עישון אצל בן הזוג, מה חשוב לך?",
    text_m: "עישון אצל בת הזוג, מה חשוב לך?",
    explanation: "ההעדפה שלך תשפיע על ההתאמה, אם זה קו אדום, לא נציע לך מישהו שמעשן.",
    options: [
      "לא מפריע לי",
      "מעדיפ/ה שלא יעשן/ת, אבל זה לא קו אדום",
      "חיוני לי שלא יעשן/ת (קו אדום)",
    ],
    weight: 1,
  },
];

// Chapter 2 question IDs (shown only for divorced/widowed)
export const CHAPTER2_QUESTION_IDS = ["q_step_parent", "q_kids_involvement", "q_relationship_pace"];
// Questions shown only to those with kids
export const PARENTS_ONLY_QUESTION_IDS = ["q_kids_involvement"];
// Questions shown only for age >= threshold
export const CONDITIONAL_AGE_QUESTION_IDS = ["q_kids_flexibility"];

export type MatchAnswer = {
  qId: string;
  myAnswer: number | number[]; // index in options array, or array of ranked indices for rankTop3
  importance: 0 | 1 | 2; // 0=not important, 1=somewhat important, 2=very important
};

export const IMPORTANCE_LABELS = [
  "לא חשוב לי",
  "חשוב לי",
  "חיוני לי",
];

export const IMPORTANCE_COLORS = [
  "bg-gray-100 text-gray-600",
  "bg-blue-100 text-blue-700",
  "bg-[#191265] text-white",
];

export const CATEGORIES = [
  { key: "relationship_values", label: "ערכי זוגיות", icon: "💛" },
  { key: "family", label: "משפחה", icon: "👨‍👩‍👧" },
  { key: "lifestyle", label: "אורח חיים", icon: "🌙" },
  { key: "personality", label: "אישיות", icon: "✨" },
  { key: "practical", label: "פרקטי", icon: "📍" },
] as const;
