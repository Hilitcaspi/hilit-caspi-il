export const COURSE_COMPASS_VERSION = "2026-09-v1";

export const CORE_COMPASS_RESULTS = [
  "information",
  "consistency",
  "pace",
  "boundary",
  "self_choice",
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
};

export type CompassResultContent = {
  label: string;
  title: string;
  summary: string;
  rationale: string;
  counterSign: string;
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

const BASE_QUESTIONS: CompassQuestion[] = [
  {
    id: "moment",
    eyebrow: "הרגע",
    prompt: "באיזה רגע אתם נמצאים עכשיו?",
    hint: "בחרו מצב אחד שנמצא במחשבות שלכם היום.",
    answers: [
      { id: "new_connection", label: "בתחילת היכרות", weights: { information: 1, pace: 1 } },
      { id: "after_date", label: "אחרי דייט או שיחה", weights: { information: 1, consistency: 1 } },
      { id: "relationship_question", label: "בתוך קשר שיש בו סימן שאלה", weights: { consistency: 1, boundary: 1 } },
      { id: "repeating_pattern", label: "מול דפוס שחוזר בהיכרויות", weights: { self_choice: 2, boundary: 1 } },
    ],
  },
  {
    id: "decision",
    eyebrow: "הצעד",
    prompt: "מה הכי קרוב לצעד שעומד בפניכם?",
    answers: [
      { id: "approach", label: "להתקרב או להציע צעד", weights: { information: 1, pace: 1 } },
      { id: "ask", label: "לשאול משהו שלא שאלתי", weights: { information: 2 } },
      { id: "slow", label: "להאט ולראות עוד", weights: { pace: 2, consistency: 1 } },
      { id: "stop", label: "לעצור או להציב גבול", weights: { boundary: 2, self_choice: 1 } },
    ],
  },
  {
    id: "fog",
    eyebrow: "הערפל",
    prompt: "מה מבלבל יותר מכל כרגע?",
    answers: [
      { id: "words_actions", label: "יש מילים יפות, אבל המעשים אינם עקביים", weights: { consistency: 2 } },
      { id: "intent", label: "יש עניין, אבל הכוונה אינה ברורה", weights: { information: 2 } },
      { id: "speed", label: "הקצב מהיר או איטי מדי", weights: { pace: 2 } },
      { id: "lost_voice", label: "הקול שלי כמעט לא נשמע בתוך הסיטואציה", weights: { self_choice: 2, boundary: 1 } },
    ],
  },
  {
    id: "calm",
    eyebrow: "השקט",
    prompt: "מה היה נותן לכם יותר שקט?",
    answers: [
      { id: "direct_answer", label: "תשובה ישירה", weights: { information: 2 } },
      { id: "repeated_action", label: "מעשה שחוזר על עצמו", weights: { consistency: 2 } },
      { id: "time", label: "זמן בלי למהר להסיק", weights: { pace: 2 } },
      { id: "my_need", label: "הבנה של מה שחשוב לי", weights: { self_choice: 2, boundary: 1 } },
    ],
  },
];

const REACTION_QUESTION: CompassQuestion = {
  id: "reaction",
  eyebrow: "מה קורה בדרך",
  prompt: "כשיש פער, מה קורה קודם?",
  answers: [
    { id: "explain", label: "אני מסביר לעצמי למה זה כנראה בסדר", weights: { consistency: 1, boundary: 1 } },
    { id: "ask_directly", label: "אני שואל ישירות", weights: { information: 1 } },
    { id: "wait_sign", label: "אני מחכה לעוד סימן", weights: { pace: 1, consistency: 1 } },
    { id: "withdraw", label: "אני מתרחק בלי לומר", weights: { self_choice: 1, boundary: 1 } },
  ],
};

const ACTION_QUESTION: CompassQuestion = {
  id: "possible_action",
  eyebrow: "24 השעות הקרובות",
  prompt: "איזה צעד קטן באמת אפשרי עכשיו?",
  answers: [
    { id: "one_question", label: "לשאול שאלה אחת", weights: { information: 1 }, actionKey: "ask" },
    { id: "observe_action", label: "לצפות למעשה מוגדר", weights: { consistency: 1 }, actionKey: "observe" },
    { id: "name_pace", label: "לומר מה הקצב שמתאים לי", weights: { pace: 1 }, actionKey: "pace" },
    { id: "set_boundary", label: "להציב גבול ברור", weights: { boundary: 1 }, actionKey: "boundary" },
    { id: "name_priority", label: "לעצור ולבחור מה חשוב לי", weights: { self_choice: 1 }, actionKey: "choose" },
  ],
};

const SAFETY_QUESTION: CompassQuestion = {
  id: "safety",
  eyebrow: "בדיקת גבול",
  prompt: "האם יש כאן לחץ, איום, השפלה או חוסר כבוד שגורמים לכם להרגיש לא בטוחים?",
  hint: "החוויה אינה מעריכה את האדם שמולכם. השאלה נועדה רק לשמור על גבול בטוח.",
  answers: [
    { id: "no", label: "לא", safetyFlag: "safe" },
    { id: "uncertain", label: "אין לי ודאות", safetyFlag: "uncertain" },
    { id: "yes", label: "כן", safetyFlag: "unsafe" },
    { id: "skip", label: "עדיף לדלג", safetyFlag: "skipped" },
  ],
};

const RESULT_CONTENT: Record<CompassResultKey, CompassResultContent> = {
  information: {
    label: "מידע",
    title: "חסר כאן מידע ישיר",
    summary: "לפני שמפרשים עוד סימנים, כדאי לברר עובדה אחת שיכולה לשנות את התמונה.",
    rationale: "הבחירות שלכם חזרו לצורך בתשובה ברורה יותר מאשר בעוד ניתוח של רמזים.",
    counterSign: "תשובה יפה לבדה אינה הוכחה לעקביות. אחרי השיחה, בדקו גם מה קורה בפועל.",
    actions: [
      { id: "ask_intent", label: "לשאול שאלה אחת על הכוונה" },
      { id: "ask_expectation", label: "לברר מה כל אחד מצפה מהשלב הנוכחי" },
    ],
    accent: "#f6d08a",
  },
  consistency: {
    label: "עקביות",
    title: "בדקו עקביות, לא רק כוונה",
    summary: "כאן חסרה פחות פרשנות ויותר ראיה לכך שמילים הופכות למעשה שחוזר על עצמו.",
    rationale: "הבחירות שלכם העדיפו פעולה נצפית על פני הסבר נוסף או הבטחה חד פעמית.",
    counterSign: "אירוע אחד אינו דפוס. הגדירו מה בדיוק אתם רוצים לראות ובאיזה פרק זמן סביר.",
    actions: [
      { id: "observe_defined", label: "לבחור מעשה אחד ולבדוק אם הוא חוזר" },
      { id: "compare_words_actions", label: "להפריד בין מה שנאמר לבין מה שנעשה" },
    ],
    accent: "#f0a6c8",
  },
  pace: {
    label: "קצב",
    title: "הצעד הבא הוא לכוון את הקצב",
    summary: "לא חייבים להחליט על כל הקשר. אפשר קודם ליצור קצב שמאפשר לראות ולנשום.",
    rationale: "הבחירות שלכם הראו שזמן ותנועה מדויקת חשובים כרגע יותר מתשובה סופית.",
    counterSign: "האטה אינה היעלמות. אפשר לומר מה הקצב שמתאים ולשמור על תקשורת ברורה.",
    actions: [
      { id: "state_pace", label: "לומר מה הקצב שמתאים לי" },
      { id: "one_step", label: "לבחור רק את הצעד הבא, לא את כל העתיד" },
    ],
    accent: "#c8b5ff",
  },
  boundary: {
    label: "גבול",
    title: "הסימן הראשון הוא לשמור על גבול",
    summary: "לפני שמבררים את האדם האחר, כדאי להגדיר מה אינו מתאים לכם ומה יקרה אם יחזור.",
    rationale: "הבחירות שלכם חזרו לצורך להגן על משהו חשוב, ולא רק להבין עוד מידע.",
    counterSign: "גבול אינו איום ואינו ניסיון לשלוט. הוא משפט ברור על מה מתאים לכם ומה לא.",
    actions: [
      { id: "name_boundary", label: "לנסח גבול אחד במשפט קצר" },
      { id: "step_back", label: "לקחת צעד אחורה עד שיש יחס מכבד" },
    ],
    accent: "#ffb38f",
  },
  self_choice: {
    label: "בחירה",
    title: "הכיוון מתחיל בחזרה לבחירה שלכם",
    summary: "לפני השאלה אם יבחרו בכם, כדאי להחזיר למרכז את השאלה אם זה נכון גם עבורכם.",
    rationale: "הבחירות שלכם סימנו שהצורך שלכם כמעט נעלם מאחורי הניסיון להבין את הצד השני.",
    counterSign: "בחירה עצמית אינה ניתוק. אפשר להיות פתוחים לקשר ובו בזמן לבדוק מה באמת מתאים.",
    actions: [
      { id: "name_priority", label: "לכתוב לעצמי מה חשוב גם אם דבר לא ישתנה" },
      { id: "choose_standard", label: "לבחור אמת מידה אחת שלא אוותר עליה" },
    ],
    accent: "#b9e6d0",
  },
  safety: {
    label: "בטיחות",
    title: "בטיחות וגבול קודמים לכל החלטה",
    summary: "כאשר יש לחץ, איום, השפלה או תחושת חוסר ביטחון, לא צריך להשלים עוד ניתוח כדי להתרחק מן הלחץ.",
    rationale: "סימנתם שאין כרגע ודאות שהסיטואציה בטוחה. המצפן עוצר כאן בכוונה.",
    counterSign: "החוויה אינה קובעת מי האדם שמולכם ואינה מחליפה עזרה מקצועית או שירותי חירום.",
    actions: [
      { id: "contact_safe_person", label: "לפנות עכשיו לאדם בטוח" },
      { id: "leave_pressure", label: "להתרחק מן הלחץ ולבקש עזרה מתאימה" },
    ],
    accent: "#ffd4c7",
  },
};

function pairKey(a: CoreCompassResultKey, b: CoreCompassResultKey) {
  return [a, b].sort().join("__");
}

const DISCRIMINATORS: Record<string, Omit<CompassQuestion, "id">> = {
  [pairKey("information", "consistency")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה ישנה יותר את התמונה?",
    answers: [
      { id: "information", label: "לקבל תשובה ברורה", weights: { information: 3 } },
      { id: "consistency", label: "לראות שמה שנאמר באמת קורה", weights: { consistency: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("information", "pace")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה חסר קודם?",
    answers: [
      { id: "information", label: "לדעת איפה הדברים עומדים", weights: { information: 3 } },
      { id: "pace", label: "לתת לדברים זמן בלי למהר להחליט", weights: { pace: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("information", "boundary")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה דחוף יותר כרגע?",
    answers: [
      { id: "information", label: "לשאול ולשמוע תשובה ישירה", weights: { information: 3 } },
      { id: "boundary", label: "להבהיר מה אינו מתאים גם בלי תשובה", weights: { boundary: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("information", "self_choice")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה צריך להתבהר קודם?",
    answers: [
      { id: "information", label: "מה האדם האחר רוצה", weights: { information: 3 } },
      { id: "self_choice", label: "מה אני רוצה גם אם התשובה לא תשתנה", weights: { self_choice: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("consistency", "pace")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה ייתן תמונה אמינה יותר?",
    answers: [
      { id: "consistency", label: "לבדוק אם פעולה מסוימת חוזרת", weights: { consistency: 3 } },
      { id: "pace", label: "לתת לזמן לחשוף מה קורה", weights: { pace: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("consistency", "boundary")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה חשוב יותר לפני הצעד הבא?",
    answers: [
      { id: "consistency", label: "לראות אם יש שינוי אמיתי במעשים", weights: { consistency: 3 } },
      { id: "boundary", label: "לומר מה לא יוכל להמשיך כך", weights: { boundary: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("consistency", "self_choice")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה יחזיר יותר בהירות?",
    answers: [
      { id: "consistency", label: "להסתכל רק על המעשים", weights: { consistency: 3 } },
      { id: "self_choice", label: "לבדוק אם זה בכלל מתאים לי", weights: { self_choice: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("pace", "boundary")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה מכביד יותר כרגע?",
    answers: [
      { id: "pace", label: "מהירות שאינה מתאימה לי", weights: { pace: 3 } },
      { id: "boundary", label: "תחושה שצריך לוותר על משהו חשוב", weights: { boundary: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("pace", "self_choice")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה נכון להשיב למרכז?",
    answers: [
      { id: "pace", label: "את הזמן שנדרש לי", weights: { pace: 3 } },
      { id: "self_choice", label: "את מה שאני באמת רוצה", weights: { self_choice: 3 } },
    ],
    adaptive: true,
  },
  [pairKey("boundary", "self_choice")]: {
    eyebrow: "שאלת המצפן",
    prompt: "מה צריך לבוא קודם?",
    answers: [
      { id: "boundary", label: "להבהיר מה אינו מקובל", weights: { boundary: 3 } },
      { id: "self_choice", label: "להחליט מה נכון עבורי", weights: { self_choice: 3 } },
    ],
    adaptive: true,
  },
};

function allQuestionCandidates(responses: CompassResponses): CompassQuestion[] {
  const scores = scoreCompassResponses(responses);
  const [first, second] = sortScores(scores);
  const discriminator = DISCRIMINATORS[pairKey(first.key, second.key)];
  return [
    ...BASE_QUESTIONS,
    { id: `discriminate_${pairKey(first.key, second.key)}`, ...discriminator },
    REACTION_QUESTION,
    ACTION_QUESTION,
    SAFETY_QUESTION,
  ];
}

export function scoreCompassResponses(responses: CompassResponses) {
  const scores: Record<CoreCompassResultKey, number> = {
    information: 0,
    consistency: 0,
    pace: 0,
    boundary: 0,
    self_choice: 0,
  };

  const questions = [
    ...BASE_QUESTIONS,
    REACTION_QUESTION,
    ACTION_QUESTION,
    SAFETY_QUESTION,
    ...Object.entries(DISCRIMINATORS).map(([key, question]) => ({ id: `discriminate_${key}`, ...question })),
  ];

  for (const [questionId, answerId] of Object.entries(responses)) {
    if (questionId === "tie_break") {
      if ((CORE_COMPASS_RESULTS as readonly string[]).includes(answerId)) {
        scores[answerId as CoreCompassResultKey] += 3;
      }
      continue;
    }
    const question = questions.find(item => item.id === questionId);
    const answer = question?.answers.find(item => item.id === answerId);
    if (!answer?.weights) continue;
    for (const [key, value] of Object.entries(answer.weights)) {
      scores[key as CoreCompassResultKey] += value || 0;
    }
  }
  return scores;
}

function sortScores(scores: Record<CoreCompassResultKey, number>) {
  return CORE_COMPASS_RESULTS
    .map(key => ({ key, value: scores[key] }))
    .sort((a, b) => b.value - a.value || CORE_COMPASS_RESULTS.indexOf(a.key) - CORE_COMPASS_RESULTS.indexOf(b.key));
}

export function getCompassQuestionById(id: string, responses: CompassResponses = {}) {
  if (id.startsWith("discriminate_")) {
    const key = id.slice("discriminate_".length);
    const discriminator = DISCRIMINATORS[key];
    return discriminator ? { id, ...discriminator } : null;
  }
  if (id === "tie_break") {
    const scores = sortScores(scoreCompassResponses(responses));
    return {
      id: "tie_break",
      eyebrow: "עוד לחיצה אחת",
      prompt: "שני כיוונים עדיין קרובים. מה חסר קודם?",
      hint: "אין תשובה נכונה. בחרו את הדבר שאם ישתנה, יזיז את התמונה.",
      adaptive: true,
      answers: [scores[0], scores[1]].map(item => ({
        id: item.key,
        label: RESULT_CONTENT[item.key].label,
        weights: { [item.key]: 3 },
      })),
    };
  }
  return allQuestionCandidates(responses).find(question => question.id === id) || null;
}

export function getNextCompassQuestion(responses: CompassResponses): CompassQuestion | null {
  for (const question of BASE_QUESTIONS) {
    if (!responses[question.id]) return question;
  }

  const scoresAfterBase = scoreCompassResponses(responses);
  const [first, second] = sortScores(scoresAfterBase);
  const discriminatorId = `discriminate_${pairKey(first.key, second.key)}`;
  if (!responses[discriminatorId]) {
    return { id: discriminatorId, ...DISCRIMINATORS[pairKey(first.key, second.key)] };
  }
  if (!responses[REACTION_QUESTION.id]) return REACTION_QUESTION;
  if (!responses[ACTION_QUESTION.id]) return ACTION_QUESTION;
  if (!responses[SAFETY_QUESTION.id]) return SAFETY_QUESTION;

  const safety = responses[SAFETY_QUESTION.id];
  if (safety === "yes" || safety === "uncertain") return null;

  const ranked = sortScores(scoreCompassResponses(responses));
  if (ranked[0].value - ranked[1].value < 2 && !responses.tie_break) {
    return {
      id: "tie_break",
      eyebrow: "עוד לחיצה אחת",
      prompt: "שני כיוונים עדיין קרובים. מה חסר קודם?",
      hint: "אין תשובה נכונה. בחרו את הדבר שאם ישתנה, יזיז את התמונה.",
      adaptive: true,
      answers: [ranked[0], ranked[1]].map(item => ({
        id: item.key,
        label: RESULT_CONTENT[item.key].label,
        weights: { [item.key]: 3 },
      })),
    };
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
      evidence: [
        safetyAnswer === "yes"
          ? "סימנתם שיש תחושת חוסר ביטחון"
          : "סימנתם שאין ודאות שהסיטואציה בטוחה",
      ],
      content: RESULT_CONTENT.safety,
    };
  }

  const ranked = sortScores(scores);
  const primary = ranked[0].key;
  const secondary = ranked[1].key;
  const evidence: string[] = [];
  const candidates = allQuestionCandidates(responses);

  for (const [questionId, answerId] of Object.entries(responses)) {
    if (questionId === "safety" || questionId === "moment" || questionId === "tie_break") continue;
    const question = candidates.find(item => item.id === questionId);
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
  const expected = next?.id === "tie_break" || responses.tie_break ? 9 : 8;
  return Math.min(100, Math.round((answered / expected) * 100));
}
