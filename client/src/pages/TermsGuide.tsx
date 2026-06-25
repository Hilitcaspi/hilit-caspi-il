/**
 * TermsGuide - תקנון רכישת המדריך הדיגיטלי
 * Route: /terms/guide
 * Updated: June 2026 — Grow compliance: address, age limit, provider liability
 */
import { motion } from "framer-motion";
import { Link } from "wouter";

const BUSINESS_ADDRESS = "ארלוזרוב 82, תל אביב";
const BUSINESS_EMAIL = "hilitcaspi@gmail.com";
const BUSINESS_PHONE = "054-453-0975";

export default function TermsGuide() {
  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      <div className="bg-[#191265]/95 backdrop-blur-sm sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between border-b border-white/10">
        <a href="/" className="text-white/80 hover:text-[#ffe27c] transition-colors text-sm font-medium flex items-center gap-1.5">
          ← לדף הבית
        </a>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-20" />
      </div>
      <nav className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <Link href="/guide" className="text-white/70 hover:text-white text-sm transition-colors">
          ← חזרה לדף המדריך
        </Link>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-24" />
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-3xl font-black text-[#191265] mb-2">תקנון רכישת המדריך המעשי</h1>
          <p className="text-[#727272] text-sm mb-10">
            "לבחור נכון - המדריך המעשי לזוגיות" | עודכן לאחרונה: יוני 2026
          </p>

          <div className="bg-white rounded-3xl p-8 shadow-sm space-y-8 text-right">

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">1. פרטי בית העסק</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                <strong>שם בית העסק:</strong> הילית כספי — ייעוץ ואימון זוגי<br />
                <strong>כתובת:</strong> {BUSINESS_ADDRESS}<br />
                <strong>דוא"ל:</strong> <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                <strong>טלפון:</strong> <a href={`tel:${BUSINESS_PHONE}`} className="text-[#1800ad] underline">{BUSINESS_PHONE}</a>
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">2. כללי</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                תקנון זה מסדיר את תנאי הרכישה של המדריך המעשי "לבחור נכון - המדריך המעשי לזוגיות" (להלן: "המדריך"), המופץ על ידי הילית כספי (להלן: "המוכרת"). ביצוע הרכישה מהווה הסכמה מלאה לתנאים המפורטים להלן.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">3. הגבלת גיל</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                השירות מיועד לבני/בנות 18 ומעלה בלבד. ביצוע הרכישה מהווה הצהרה כי הרוכש/ת הינו/ה בגיר/ה בן/בת 18 שנה ומעלה.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">4. המוצר</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>המדריך הוא מוצר דיגיטלי בפורמט PDF להורדה מיידית.</li>
                <li>לאחר השלמת התשלום יישלח קישור להורדה לכתובת המייל שסופקה בעת הרכישה.</li>
                <li>הגישה למדריך היא אישית ואינה ניתנת להעברה לאחרים.</li>
                <li>המחיר הנוכחי הוא ₪149.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">5. מדיניות ביטול</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>בהתאם לחוק הגנת הצרכן (תיקון מס' 4), התשע"א-2010, תוכן דיגיטלי שהורד ונצרך אינו ניתן לביטול.</li>
                <li>לשאלות בנוגע להזמנה או בעיות טכניות בהורדה, פנו בדוא"ל: <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">6. אחריות הספק</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                המוכרת מתחייבת לספק את המדריך כמתואר. במקרה של תקלה טכנית המונעת גישה למוצר, יינתן פתרון בתוך 3 ימי עסקים. האחריות מוגבלת לשווי הרכישה בלבד. המוכרת אינה אחראית לנזקים עקיפים, תוצאתיים או מיוחדים הנובעים מהשימוש במדריך. התוצאות עשויות להשתנות בין אדם לאדם ואינן מובטחות.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">7. קניין רוחני</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>כל הזכויות במדריך, לרבות זכויות יוצרים, שמורות למוכרת.</li>
                <li>אין להעתיק, להפיץ, לשתף, למכור או לפרסם את תוכן המדריך, כולו או חלקו, ללא אישור בכתב מהמוכרת.</li>
                <li>שימוש מסחרי בתכני המדריך אסור בהחלט.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">8. הגבלת אחריות</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                המדריך מיועד למטרות מידע והעשרה בלבד ואינו מהווה ייעוץ מקצועי, פסיכולוגי, רפואי או משפטי. המוכרת אינה אחראית לתוצאות שינבעו משימוש במדריך.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">9. פרטיות</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                פרטי הרוכש ישמשו לצורך עיבוד הרכישה ומשלוח המדריך בלבד. לא יועברו פרטים לצד שלישי ללא הסכמה מפורשת. הרוכש רשאי לבטל את הסכמתו לקבלת תכנים שיווקיים בכל עת.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">10. שינויים בתקנון</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                המוכרת שומרת לעצמה את הזכות לעדכן תקנון זה בכל עת. הגרסה המעודכנת תפורסם בדף זה. המשך השימוש לאחר פרסום שינויים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">11. יצירת קשר</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                לכל שאלה או פנייה בנוגע לרכישה:<br />
                דוא"ל: <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                טלפון: <a href={`tel:${BUSINESS_PHONE}`} className="text-[#1800ad] underline">{BUSINESS_PHONE}</a><br />
                כתובת: {BUSINESS_ADDRESS}
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">12. דין וסמכות שיפוט</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                תקנון זה כפוף לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב.
              </p>
            </section>

          </div>

          <div className="text-center mt-10">
            <Link href="/guide" className="inline-block bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105">
              ← חזרה לדף המדריך
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
