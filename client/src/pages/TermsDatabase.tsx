/**
 * TermsDatabase - תקנון מאגר הרווקים הבלעדי
 * Route: /terms/database
 * Updated: June 2026 — Full comprehensive terms
 */
import { motion } from "framer-motion";
import { Link } from "wouter";

const BUSINESS_ADDRESS = "ארלוזרוב 82, תל אביב";
const BUSINESS_EMAIL = "hilitcaspi@gmail.com";
const BUSINESS_PHONE = "055-244-2334";
const WHATSAPP = "https://wa.me/972552442334";

export default function TermsDatabase() {
  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#191265]/95 px-4 py-2.5 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-[#ffe27c]">
          ← לדף הבית
        </a>
        <span className="text-sm font-bold text-white">הילית כספי</span>
        <div className="w-20" />
      </div>
      <nav className="bg-[#191265] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/"><span className="cursor-pointer text-lg font-bold text-white transition-colors hover:text-[#ffe27c]">הילית כספי</span></Link>
          <Link href="/database"><span className="cursor-pointer text-sm font-semibold text-[#ffe27c] transition-colors hover:text-white">← חזרה לדף המאגר</span></Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="mb-2 text-3xl font-black text-[#191265]">תקנון הצטרפות למאגר הרווקים הבלעדי</h1>
          <p className="mb-10 text-sm text-[#727272]">הילית כספי | עודכן: יוני 2026</p>

          <div className="space-y-8 rounded-3xl bg-white p-8 text-right shadow-sm">
            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">1. פרטי בית העסק</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                <strong>שם בית העסק:</strong> הילית כספי — ייעוץ ואימון זוגי<br />
                <strong>כתובת:</strong> {BUSINESS_ADDRESS}<br />
                <strong>דוא"ל:</strong> <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                <strong>טלפון / וואטסאפ:</strong> <a href={`tel:${BUSINESS_PHONE}`} className="text-[#1800ad] underline">{BUSINESS_PHONE}</a>
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">2. השירות</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                בתשלום דמי הרצינות והרישום בסך <strong>₪299 (חד-פעמי)</strong> במקום ₪499, המשתתף/ת מצטרפ/ת למאגר הרווקים הבלעדי של הילית כספי ומאשר/ת את תנאי תקנון זה במלואו. ביצוע התשלום מהווה הסכמה מלאה ובלתי חוזרת לכל האמור בתקנון זה.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">3. הגבלת גיל</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                השירות מיועד לבני/בנות <strong>18 ומעלה בלבד</strong>. ביצוע הרכישה מהווה הצהרה כי הרוכש/ת הינו/ה בגיר/ה בן/בת 18 שנה ומעלה.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">4. תקופת הפעילות</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                הפרופיל יישאר פעיל במאגר למשך <strong>12 חודשים</strong> ממועד ההצטרפות. במהלך 6 החודשים הראשונים, הילית כספי תעשה מאמץ לבצע התאמות פעילות. לאחר 6 חודשים ועד תום שנה, הפרופיל נשאר במאגר אך ההתאמות הפעילות אינן מובטחות.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">5. אין ערובה להתאמות או לתוצאה</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                הצטרפות למאגר <strong>אינה מהווה ערובה</strong> לקבלת הצעות שידוך כלשהן. הצעות ישלחו אך ורק אם וכאשר תימצא התאמה מתאימה לפי שיקול דעתה המקצועי של הילית כספי, ובכפוף לאישור שני הצדדים מראש. אין כל התחייבות למספר ההתאמות, לתדירותן, לתוצאות הזוגיות, או לכך שיימצא שידוך שיצליח.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">6. אי-ביצוע בדיקות רקע</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                יובהר כי <strong>לא מבוצעת כל בדיקת רקע</strong> על המשתתפים במאגר, לרבות בדיקה פלילית, אימות זהות, או בדיקת מצב משפחתי. הילית כספי אינה נושאת באחריות לכל מידע שגוי שמסר משתתף/ת, ולרבות במקרה של אדם בעל עבר פלילי, נשוי/אה, או בעל/ת מצג שווא. האחריות על בחינת ההתאמה ועל ההתנהלות מול הצד השני מוטלת על המשתתף/ת בלבד.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">7. פרטיות וסודיות</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                פרטי המשתתף/ת ישמרו בסודיות מלאה ולא יועברו לצד שלישי כלשהו, למעט לצורך ביצוע ההתאמה עצמה ובהסכמת המשתתף/ת. פרטי הצד השני יועברו רק לאחר קבלת אישור מפורש משני הצדדים.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">8. התנהגות ראויה</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                המשתתף/ת מתחייב/ת לנהוג בכבוד, בתום לב ובאחריות כלפי כל מי שיוצג/ת בפניו/ה כהתאמה פוטנציאלית. התנהגות פוגענית, הטרדה, או מסירת מידע כוזב עלולים להביא ל<strong>הסרת הפרופיל מהמאגר ללא החזר כספי</strong>.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">9. מדיניות ביטול והחזר כספי</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                <strong>דמי הרישום אינם ניתנים להחזר בשום מקרה</strong> לאחר ביצוע התשלום, מאחר והפרופיל נכנס למאגר מיד עם אישור העסקה. לא יינתן החזר כספי חלקי או מלא בגין כל סיבה שהיא, לרבות: אי-קבלת התאמות, שינוי דעה, מציאת זוגיות בדרך אחרת, או כל סיבה אחרת. בהצטרפות למאגר מאשר/ת המשתתף/ת כי הבין/ה והסכים/ה למדיניות זו במלואה.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">10. תהליך ההצטרפות</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                לאחר הרכישה, יישלח קישור למילוי שאלון ה-DNA הזוגי ויצירת פרופיל. הפרופיל יעבור סינון ואישור על ידי הילית כספי לפני הכניסה למאגר. הילית שומרת לעצמה את הזכות לסרב לפרופיל שאינו עומד בקריטריונים, ובמקרה כזה יינתן החזר מלא של דמי הרישום.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">11. אחריות הספק</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                הילית כספי מתחייבת לספק את השירות כמתואר. במקרה של תקלה טכנית המונעת גישה לפרופיל, יינתן פתרון בתוך 3 ימי עסקים. האחריות מוגבלת לשווי הרכישה בלבד. הילית כספי אינה אחראית לנזקים עקיפים, תוצאתיים או מיוחדים. המאגר מיועד להכרויות בלבד; ההחלטה להתקדם עם כל הצעה היא של החבר בלבד.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">12. שינויים בתנאים</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                הילית כספי שומרת לעצמה את הזכות לעדכן תקנון זה מעת לעת. שינויים מהותיים יפורסמו מראש באתר.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">13. יצירת קשר</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                לכל שאלה או פנייה:<br />
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-[#1800ad] underline">וואטסאפ: {BUSINESS_PHONE}</a><br />
                דוא"ל: <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                כתובת: {BUSINESS_ADDRESS}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-black text-[#191265]">14. דין וסמכות שיפוט</h2>
              <p className="text-sm leading-relaxed text-[#727272]">
                תקנון זה נכנס לתוקף עם ביצוע התשלום ומהווה הסכם מחייב בין המשתתף/ת לבין הילית כספי. תקנון זה כפוף לדיני מדינת ישראל. סמכות השיפוט לבתי המשפט המוסמכים במחוז תל אביב.
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-[#191265]/10 pt-8">
            <Link href="/database">
              <span className="inline-block cursor-pointer rounded-xl bg-[#191265] px-6 py-3 font-bold text-white transition-colors hover:bg-[#1800ad]">
                ← חזרה לדף המאגר
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
