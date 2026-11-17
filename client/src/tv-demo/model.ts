export type DnaType = 'leader' | 'romantic' | 'free_spirit' | 'anchor';
export const TYPE_ORDER: DnaType[] = ['leader', 'anchor', 'romantic', 'free_spirit'];
export function scoreDna(answers: number[], tieChoice?: DnaType) {
  if (answers.length !== 20 || answers.some(a => !Number.isInteger(a) || a < 1 || a > 5)) throw new Error('יש להשלים את כל ההיגדים');
  const scores = { leader: 0, romantic: 0, free_spirit: 0, anchor: 0 };
  (['leader', 'romantic', 'free_spirit', 'anchor'] as DnaType[]).forEach((t, i) => { scores[t] = answers.slice(i * 5, i * 5 + 5).reduce((a, b) => a + b, 0); });
  const max = Math.max(...Object.values(scores));
  const top = TYPE_ORDER.filter(t => scores[t] === max);
  return { type: tieChoice && top.includes(tieChoice) ? tieChoice : top[0], scores, top };
}
export const RESULTS: Record<DnaType, { label: string; subtitle: string; strength: string; reflection: string; needs: string; count: number; candidateDna: string[] }> = {
  leader: { label: 'המנהיג הממגנט', subtitle: 'עצמאות · יוזמה · בהירות', strength: 'לפי תשובותיך, יוזמה ועצמאות בולטות אצלך. אלה יכולות להיות חוזקות בקשר, כשיש מקום גם לקצב ולבחירות של הצד השני.', reflection: 'האם קל לך לתת לצד השני להוביל לפעמים, ולבקש תמיכה במקום לפתור הכול לבד?', needs: 'לשיחה: שותפות, ביטחון ותקשורת שמאפשרת לשניכם להשפיע על הקשר.', count: 1248, candidateDna: ['עוגן יציב', 'רוח חופשית', 'רומנטיקנית עמוקה'] },
  romantic: { label: 'הרומנטיקן העמוק', subtitle: 'רגש · קרבה · נתינה', strength: 'לפי תשובותיך, קרבה רגשית ונתינה משמעותיות עבורך. הן יכולות לעזור ליצור חיבור עמוק כשהנתינה הדדית ויש מקום גם לצרכים שלך.', reflection: 'האם אתה מבטא את מה שאתה צריך, או מצפה שהצד השני יבין לבד?', needs: 'לשיחה: ביטוי רגשי, הדדיות ותקשורת ברורה על צרכים וציפיות.', count: 1386, candidateDna: ['עוגן יציב', 'מנהיגה ממגנטת', 'רוח חופשית'] },
  free_spirit: { label: 'הרוח החופשית', subtitle: 'סקרנות · מרחב · חוויות', strength: 'לפי תשובותיך, מרחב וסקרנות בולטים אצלך. בקשר אפשר לטפח אותם לצד קרבה, עקביות ואחריות משותפת.', reflection: 'איך אפשר לבקש מרחב בלי שהצד השני ירגיש שהתרחקת מהקשר?', needs: 'לשיחה: איזון בין עצמאות לקרבה, גמישות וקצב שמתאים לשניכם.', count: 1164, candidateDna: ['עוגן יציב', 'רומנטיקנית עמוקה', 'מנהיגה ממגנטת'] },
  anchor: { label: 'העוגן היציב', subtitle: 'עקביות · אכפתיות · ביטחון', strength: 'לפי תשובותיך, יציבות ואכפתיות משמעותיות עבורך. הן יכולות ליצור תחושת בית כשגם אתה מקבל תמיכה ומקום לעצמך.', reflection: 'האם האחריות והנתינה מתחלקות ביניכם, או שאתה נושא ברובן?', needs: 'לשיחה: הערכה הדדית, יוזמה משני הצדדים ומרחב להתפתחות.', count: 1428, candidateDna: ['מנהיגה ממגנטת', 'רוח חופשית', 'רומנטיקנית עמוקה'] },
};
export const DEMO_PROFILES = [
  { name: 'נועה', age: 38, city: 'תל אביב', job: 'מנהלת פרויקטים', image: '/manus-storage/tv-demo-fictional-noa_729c3436.webp', about: 'חברות, שיחה טובה והומור. אוהבת ים, מוזיקה וחיים שיש בהם מקום גם לשקט.', values: 'הדדיות · משפחה · סקרנות' },
  { name: 'מאיה', age: 42, city: 'רמת גן', job: 'עצמאית בתחום העיצוב', image: '/manus-storage/tv-demo-fictional-maya_d18c6c36.webp', about: 'אוהבת אנשים וסיפורים. מאמינה בקשר עם כנות, מרחב אישי ותוכניות משותפות.', values: 'תקשורת · עצמאות · חברות' },
  { name: 'תמר', age: 35, city: 'הרצליה', job: 'מנהלת בתחום החינוך', image: '/manus-storage/tv-demo-fictional-tamar_82047198.webp', about: 'רוצה קשר עם נוכחות, קלילות ועומק. אוהבת טבע, חברים וארוחות ביתיות.', values: 'ביטחון · נתינה · צמיחה' },
];
