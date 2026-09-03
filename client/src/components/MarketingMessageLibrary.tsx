import { useMemo, useState } from "react";

type Props = {
  totalActive: number;
  femaleRate: number;
  maleRate: number;
  profileCompletenessRate: number;
  scientificRate: number;
  coverageRate: number;
  medianDaysToFirstMatch: number;
  updatedAt?: number;
};

export default function MarketingMessageLibrary(props: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const asOf = new Date(props.updatedAt || Date.now()).toLocaleDateString("he-IL");
  const messages = useMemo(() => [
    {
      id: "service_waiting",
      channel: "שירות לקוחות",
      title: "למה קיבלתי רק התאמה אחת?",
      text: `היי, אני מבינה את הציפייה לקבל עוד הצעות. ההצטרפות למאגר היא כניסה למערכת התאמה מקצועית, ולא רכישה של מכסת התאמות או שירות אישי צמוד. אנחנו לא שולחים אדם רק כדי לייצר כמות. הצעה נשלחת כאשר יש התאמה הדדית ורלוונטית שעברה בדיקה. המטרה שלנו היא להגדיל כל הזמן את מספר ההזדמנויות המתאימות במאגר, תוך שמירה על האיכות ועל הפרטיות של שני הצדדים. נכון ליום ${asOf}, ${props.coverageRate}% מחברי המאגר הפעילים קיבלו לפחות הצעה אחת, וחציון הזמן להצעה ראשונה הוא ${props.medianDaysToFirstMatch} ימים. הנתונים משתנים לפי גיל, אזור, אורח חיים והעדפות.`,
    },
    {
      id: "social_transparency",
      channel: "סושיאל",
      title: "מה קורה כשלא שולחים התאמה כל שבוע",
      text: `שאלה שחוזרת אליי: אם הצטרפתי למאגר, למה לא מגיעה התאמה בכל כמה ימים? כי מאגר איכותי לא עובד כמו פיד של אפליקציה. אני לא שולחת אדם רק כדי לסמן וי. כל הצעה נבדקת משני הכיוונים, לפי פרופיל, שאלון, העדפות והתאמה אנושית. נכון ליום ${asOf}, במאגר יש ${props.totalActive.toLocaleString("he-IL")} חברים פעילים, ${props.femaleRate}% נשים ו-${props.maleRate}% גברים. ${props.profileCompletenessRate}% מהפרופילים מלאים. המטרה שלנו ברורה: להרחיב את המאגר ולהגדיל את מספר ההזדמנויות הרלוונטיות, בלי להחליף איכות בכמות.`,
    },
    {
      id: "campaign_quality",
      channel: "קמפיין",
      title: "לא עוד אפליקציה. מאגר עם שיטה ובדיקה אנושית",
      text: `לא עוד גלילה בין מאות פרופילים. מאגר רווקים ורווקות עם ${props.totalActive.toLocaleString("he-IL")} חברים פעילים, איזון של ${props.femaleRate}% נשים ו-${props.maleRate}% גברים, ו-${props.profileCompletenessRate}% פרופילים מלאים. ההצעות נשלחות רק לאחר בדיקה מקצועית והדדית. ההצטרפות היא למאגר ולתהליך ההתאמה, ללא התחייבות לכמות או לתדירות קבועה. הנתונים נכונים ליום ${asOf}.`,
    },
    {
      id: "newsletter_growth",
      channel: "ניוזלטר",
      title: "יותר הזדמנויות, בלי להוריד את הרף",
      text: `המטרה שלנו אינה להציף אתכם בהצעות. המטרה היא לייצר יותר הזדמנויות שמתאימות באמת. לכן אנחנו עובדים בשני כיוונים במקביל: מרחיבים את המאגר ושומרים על איכות הנתונים. נכון ליום ${asOf}, ${props.profileCompletenessRate}% מהפרופילים במאגר מלאים ו-${props.scientificRate}% השלימו את השאלון המדעי. הנתונים האלה מאפשרים לבדוק התאמה לעומק. לפעמים התהליך דורש סבלנות, אבל אנחנו מעדיפים התאמה שנבדקה על פני הצעה אקראית.`,
    },
    {
      id: "pre_purchase",
      channel: "לפני רכישה",
      title: "מה בדיוק מקבלים בהצטרפות",
      text: `התשלום הוא דמי הצטרפות חד פעמיים למאגר ולתהליך ההתאמה המקצועי. הוא אינו קונה שירות אישי של הילית, מכסת התאמות או התחייבות להצעה בכל כמה ימים. הפרופיל נכנס למאגר פעיל, נבדק מול מועמדים רלוונטיים, והצעה נשלחת כאשר יש התאמה הדדית שעברה בדיקה.`,
    },
    {
      id: "results_update",
      channel: "פוסט תוצאות",
      title: "המספרים שמאחורי המאגר",
      text: `נכון ליום ${asOf}: ${props.totalActive.toLocaleString("he-IL")} חברים פעילים במאגר, ${props.femaleRate}% נשים ו-${props.maleRate}% גברים, ${props.profileCompletenessRate}% פרופילים מלאים, ו-${props.coverageRate}% מחברי המאגר קיבלו לפחות הצעת התאמה אחת. אלה נתוני מערכת חיים, לא הבטחה אישית לתוצאה. אנחנו מפרסמים תוצאות זוגיות וסיפורים רק לאחר אימות וקבלת הסכמה מפורשת.`,
    },
  ], [props, asOf]);

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="rounded-2xl border border-[#d9d5ed] bg-white p-5 shadow-sm">
      <div>
        <p className="text-[11px] font-bold text-[#7568a8]">נתונים חיים, ניסוח שקוף, ללא עדויות מומצאות</p>
        <h3 className="mt-1 text-lg font-black text-[#191265]">ספריית מסרים לפרסום ולשירות</h3>
        <p className="mt-1 text-xs leading-6 text-[#666]">כל מסר נבנה מחדש מהנתונים הנוכחיים. לפני פרסום יש להשאיר את תאריך המדידה ולא לשנות מספרים ידנית.</p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {messages.map(message => (
          <article key={message.id} className="rounded-xl border border-[#eceaf4] bg-[#fbfafc] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#eeeafd] px-2 py-1 text-[9px] font-black text-[#594a99]">{message.channel}</span>
                <h4 className="mt-2 text-sm font-black text-[#191265]">{message.title}</h4>
              </div>
              <button onClick={() => copy(message.id, message.text)} className="shrink-0 rounded-lg bg-[#191265] px-3 py-2 text-[10px] font-black text-white">
                {copied === message.id ? "הועתק" : "העתק"}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-line text-xs leading-6 text-[#555]">{message.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
