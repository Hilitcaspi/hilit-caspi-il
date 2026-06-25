/**
 * TermsCoaching - תקנון חבילות ליווי אישי (הבנה / המסע)
 * Route: /terms/coaching
 * Updated: June 2026 — Grow compliance: address, age limit, provider liability
 */
import { motion } from "framer-motion";
import { Link } from "wouter";

const BUSINESS_ADDRESS = "ארלוזרוב 82, תל אביב";
const BUSINESS_EMAIL = "hilitcaspi@gmail.com";
const BUSINESS_PHONE = "054-453-0975";

export default function TermsCoaching() {
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
      {/* Nav */}
      <nav className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <Link href="/coaching" className="text-white/70 hover:text-white text-sm transition-colors">
          ← חזרה לדף הליווי
        </Link>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-24" />
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-black text-[#191265] mb-2">תקנון - חבילות ליווי אישי</h1>
          <p className="text-[#727272] text-sm mb-10">
            תהליך "הבנה" (8 פגישות) ותהליך "המסע" (12 פגישות) | עודכן לאחרונה: יוני 2026
          </p>

          <div className="bg-white rounded-3xl p-8 shadow-sm space-y-8 text-right">

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">0. פרטי בית העסק</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                <strong>שם בית העסק:</strong> הילית כספי — ייעוץ ואימון זוגי<br />
                <strong>כתובת:</strong> {BUSINESS_ADDRESS}<br />
                <strong>דוא"ל:</strong> <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                <strong>טלפון:</strong> <a href={`tel:${BUSINESS_PHONE}`} className="text-[#1800ad] underline">{BUSINESS_PHONE}</a>
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">1. כללי</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                תקנון זה מסדיר את תנאי רכישת חבילות הליווי האישי עם הילית כספי (להלן: "נותנת השירות"). ביצוע הרכישה מהווה הסכמה מלאה ובלתי מסויגת לכל התנאים המפורטים להלן. מומלץ לקרוא את התקנון במלואו לפני השלמת הרכישה.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">1א. הגבלת גיל</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                השירות מיועד לבני/בנות 18 ומעלה בלבד. ביצוע הרכישה מהווה הצהרה כי הרוכש/ת הינו/ה בגיר/ה בן/בת 18 שנה ומעלה.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">2. תיאור השירות</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>תהליך "הבנה"</strong> — 8 פגישות ליווי אישי 1:1 עם הילית כספי. מחיר: ₪2,960 (₪370 לפגישה).</li>
                <li><strong>תהליך "המסע"</strong> — 12 פגישות ליווי אישי 1:1 עם הילית כספי, כולל ליווי בוואטסאפ בין הפגישות. מחיר: ₪4,200 (₪350 לפגישה).</li>
                <li>הפגישות מתקיימות בקליניקה ברמת השרון, בקליניקה בתל אביב, או בזום - לבחירת הלקוח/ה.</li>
                <li>משך כל פגישה: 60 דקות.</li>
                <li>שתי החבילות כוללות גישה למאגר הרווקים הבלעדי (שווי ₪499) - ראו סעיף 6.</li>
                <li>ניתן לנכות את עלות פגישת ההיכרות (₪500) מהמחיר המלא של כל חבילה.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">3. תיאום ולוח זמנים</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>לאחר השלמת התשלום, ייצור צוות הילית כספי קשר ביום העסקים הבא לתיאום הפגישה הראשונה.</li>
                <li>הפגישות יתואמו בהסכמה הדדית בהתאם לזמינות הצדדים.</li>
                <li>ביטול פגישה בודדת אפשרי עד 24 שעות לפני המועד המתוכנן; ביטול מאוחר יותר ייחשב כפגישה שנוצלה.</li>
                <li>פגישות שלא נוצלו תוך 6 חודשים מיום הרכישה תפקענה.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">4. מדיניות ביטול</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>לאחר קיום הפגישה הראשונה, הרכישה סופית ואינה ניתנת לביטול.</li>
                <li>ביטול פגישה בודדת אפשרי עד 24 שעות לפני המועד המתוכנן; ביטול מאוחר ייחשב כפגישה שנוצלה.</li>
                <li>לשאלות יש לפנות בדוא״ל: <a href="mailto:hilitcaspi@gmail.com" className="text-[#1800ad] underline">hilitcaspi@gmail.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">5. סודיות ופרטיות</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>כל המידע האישי שיועבר במסגרת הליווי - לרבות פרטים אישיים ותכנים שיועלו בפגישות - יישמר בסודיות מוחלטת.</li>
                <li>הילית כספי מחויבת לדיסקרטיות מלאה ולא תעביר כל מידע לצד שלישי ללא הסכמה מפורשת בכתב.</li>
                <li>פרטי הרוכש ישמשו לצורך ניהול הליווי ושיווק תכנים רלוונטיים בלבד, בהתאם לחוק הגנת הפרטיות, תשמ"א-1981.</li>
                <li>הרוכש רשאי לבטל את הסכמתו לקבלת תכנים שיווקיים בכל עת.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">6. מאגר הרווקים הבלעדי - תנאי שימוש</h2>
              <ul className="text-[#727272] text-sm leading-relaxed space-y-2 list-disc list-inside">
                <li>כחלק מחבילת הליווי, הלקוח/ה מקבל/ת גישה חינמית למאגר הרווקים הבלעדי (שווי ₪499).</li>
                <li>הגישה תופעל לאחר קיום הפגישה הראשונה ומילוי שאלון ה-DNA הזוגי.</li>
                <li>פרטי הפרופיל גלויים אך ורק לאנשים שהילית בחרה לחשוף אותם בפניהם, בהתאם להתאמות שזיהתה.</li>
                <li>לא יועברו פרטי קשר ישירים ללא הסכמת שני הצדדים.</li>
                <li>הילית שומרת לעצמה את הזכות להסיר מהמאגר כל פרופיל שהתנהגות בעליו אינה הולמת.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">6א. אחריות הספק</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                הילית כספי מתחייבת לספק את השירות כמתואר. במקרה של אי-זמינות בלתי צפויה, יוצע מועד חלופי או החזר יחסי. האחריות מוגבלת לשווי הרכישה בלבד. הילית כספי אינה אחראית לנזקים עקיפים, תוצאתיים או מיוחדים.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">7. הגבלת אחריות</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                הליווי האישי מיועד לתמיכה, העצמה ופיתוח אישי בתחום הזוגיות, ואינו מהווה טיפול פסיכולוגי, ייעוץ נפשי, או תחליף לטיפול מקצועי. התוצאות עשויות להשתנות בין אדם לאדם ואינן מובטחות. הילית כספי אינה אחראית לתוצאות ההיכרויות שייווצרו דרך המאגר.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">8. קניין רוחני</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                כל החומרים, התרגילים, השאלונים והתכנים שיועברו במסגרת הליווי הם קניינה הרוחני הבלעדי של הילית כספי. אין להעתיק, להפיץ, לשתף או לפרסם תכנים אלו ללא אישור מפורש בכתב.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">9. שינויים בתקנון</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                הילית כספי שומרת לעצמה את הזכות לעדכן תקנון זה מעת לעת. שינויים מהותיים יפורסמו בדף זה ויכנסו לתוקף 14 ימים לאחר פרסומם.
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">10. יצירת קשר</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                לכל שאלה בנוגע לתקנון זה:
                <br />
                דוא"ל: <a href={`mailto:${BUSINESS_EMAIL}`} className="text-[#1800ad] underline">{BUSINESS_EMAIL}</a><br />
                טלפון: <a href={`tel:${BUSINESS_PHONE}`} className="text-[#1800ad] underline">{BUSINESS_PHONE}</a><br />
                כתובת: {BUSINESS_ADDRESS}
              </p>
            </section>

            <section>
              <h2 className="text-[#191265] font-black text-lg mb-3">11. דין וסמכות שיפוט</h2>
              <p className="text-[#727272] text-sm leading-relaxed">
                תקנון זה כפוף לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב.
              </p>
            </section>

          </div>

          <div className="text-center mt-10">
            <Link
              href="/coaching"
              className="inline-block bg-[#191265] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-105"
            >
              ← חזרה לדף הליווי
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
