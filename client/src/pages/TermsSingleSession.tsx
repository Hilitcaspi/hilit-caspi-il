/**
 * TermsSingleSession - תקנון פגישה אישית חד-פעמית
 * Route: /terms/single-session
 * Updated: June 2026 — Grow compliance: address, age limit, provider liability
 */
import { motion } from "framer-motion";
import { Link } from "wouter";

const BUSINESS_ADDRESS = "ארלוזרוב 82, תל אביב";
const BUSINESS_EMAIL = "hilitcaspi@gmail.com";
const BUSINESS_PHONE = "054-453-0975";

export default function TermsSingleSession() {
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
        <Link href="/single-session" className="text-white/70 hover:text-white text-sm transition-colors">
          ← חזרה לדף הפגישה
        </Link>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-24" />
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-[#191265] font-black text-3xl mb-2">תקנון ומדיניות ביטול</h1>
          <h2 className="text-[#727272] text-lg mb-8">פגישה אישית חד-פעמית עם הילית כספי | עודכן: יוני 2026</h2>

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
                תקנון זה מסדיר את תנאי הרכישה, הביטול והשימוש בשירות הפגישה האישית החד-פעמית עם הילית כספי. הרכישה מהווה הסכמה לתנאים המפורטים להלן.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">3. הגבלת גיל</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                השירות מיועד לבני/בנות 18 ומעלה בלבד. ביצוע הרכישה מהווה הצהרה כי הרוכש/ת הינו/ה בגיר/ה בן/בת 18 שנה ומעלה.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">4. תיאור השירות</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>פגישה אישית חד-פעמית בת 60 דקות עם הילית כספי.</li>
                <li>הפגישה מתקיימת בקליניקה ברמת השרון, בתל אביב, או בזום — לפי בחירת הלקוח/ה.</li>
                <li>מחיר הפגישה: ₪500 (ניתן לקיזוז מחבילת ליווי מלאה בעתיד).</li>
                <li>תיאום מועד הפגישה יתבצע בתוך יום עסקים לאחר השלמת התשלום.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">5. אחריות הספק</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                הילית כספי מתחייבת לספק את הפגישה כמתואר. במקרה של אי-זמינות בלתי צפויה מצד הספקית, יוצע מועד חלופי או החזר כספי מלא. האחריות מוגבלת לשווי הרכישה בלבד. הילית כספי אינה אחראית לנזקים עקיפים, תוצאתיים או מיוחדים.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">6. מדיניות ביטול והחזר כספי</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>ביטול עד 48 שעות לפני מועד הפגישה:</strong> החזר כספי מלא.</li>
                <li><strong>ביטול בין 24–48 שעות לפני הפגישה:</strong> החזר של 50% ממחיר הפגישה.</li>
                <li><strong>ביטול פחות מ-24 שעות לפני הפגישה:</strong> לא יינתן החזר כספי.</li>
                <li><strong>אי-הגעה ללא הודעה:</strong> לא יינתן החזר כספי.</li>
                <li>ניתן לדחות את מועד הפגישה פעם אחת ללא עלות, בתנאי שהדחייה מתבקשת לפחות 24 שעות מראש.</li>
                <li>בקשות ביטול יש לשלוח בכתב לדוא"ל <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a> או בוואטסאפ.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">7. אופן ביצוע ההחזר</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>ההחזר יבוצע לאמצעי התשלום המקורי בתוך 14 ימי עסקים.</li>
                <li>לא יגבו דמי ביטול נוספים מעבר למפורט לעיל.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">8. סודיות ופרטיות</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>כל מידע שיועבר במסגרת הפגישה יישמר בסודיות מוחלטת.</li>
                <li>הילית כספי מחויבת לדיסקרטיות מלאה ולא תעביר כל מידע לצד שלישי ללא הסכמה מפורשת בכתב.</li>
                <li>פרטי הרוכש/ת ישמשו לצורך ניהול הפגישה ושיווק תכנים רלוונטיים בלבד.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">9. הגבלת אחריות</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                הפגישה האישית מיועדת לתמיכה, העצמה ופיתוח אישי בתחום הזוגיות, ואינה מהווה טיפול פסיכולוגי, ייעוץ נפשי, או תחליף לטיפול מקצועי. התוצאות עשויות להשתנות בין אדם לאדם ואינן מובטחות.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">10. קניין רוחני</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                כל החומרים, הכלים והתכנים שיועברו במסגרת הפגישה הם קניינה הרוחני הבלעדי של הילית כספי. אין להעתיק, להפיץ, לשתף או לפרסם תכנים אלו ללא אישור מפורש בכתב.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">11. יצירת קשר</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                לכל שאלה בנוגע לתקנון זה:<br />
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
            <Link href="/single-session" className="inline-block bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105">
              ← חזרה לדף הפגישה
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
