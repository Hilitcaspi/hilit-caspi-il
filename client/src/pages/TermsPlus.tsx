import { Link } from "wouter";

export default function TermsPlus() {
  return (
    <main className="min-h-screen bg-[#f0eadc] px-5 py-10 font-rubik text-[#191265]" dir="rtl">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm md:p-10">
        <Link href="/database-plus"><span className="cursor-pointer text-sm font-bold underline">חזרה ל־Database Plus</span></Link>
        <h1 className="mt-5 text-3xl font-black">תקנון Database Plus ומדיניות ביטול</h1>
        <p className="mt-3 text-sm leading-7 text-[#666]">מסמך זה הוא נוסח תפעולי להצגה ואישור לפני פתיחת הפיילוט. הוא אינו מפעיל חיוב או מנוי.</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#444]">
          <section><h2 className="text-lg font-black text-[#191265]">1. השירות</h2><p>Plus הוא שירות אופציונלי לחברים פעילים במאגר. השירות כולל קדימות בבדיקה האנושית, שירות לקוחות בעדיפות ולפחות שתי הצעות התאמה חדשות שנבדקו ונשלחו בכל מחזור חיוב אישי.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">2. מהי הצעת התאמה</h2><p>הצעה נספרת כאשר נוצרה התאמה חדשה ונשלחה ללקוח/ה בפועל. שליחה חוזרת אינה נספרת. ההצעה יכולה להישלח גם בציון נמוך מ־80% לאחר בדיקה אנושית, כל עוד היא עומדת בתנאי הסף החשובים של שני הצדדים. דחייה של אחד הצדדים אינה מבטלת את עצם ההצעה. אין התחייבות לאישור הדדי, לדייט או לזוגיות.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">3. מחיר וחידוש</h2><p>המחיר הוא 99 ש״ח לחודש, כולל מע״מ, בנוסף לדמי ההצטרפות למאגר. המנוי מתחדש מדי חודש עד לביטול. החיוב הבא ותאריכי המחזור יוצגו באזור האישי.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">4. ביטול</h2><p>ניתן לבטל בכל עת באזור האישי או דרך שירות הלקוחות העסקי. הביטול מפסיק חידושים עתידיים; השירות ממשיך עד סוף התקופה ששולמה. ביטול Plus אינו מבטל את החברות הרגילה במאגר.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">5. חשיפה בסושיאל</h2><p>חשיפה היא אופציונלית ונפרדת מהמנוי. פרסום יבוצע רק לאחר הסכמה מפורשת לתמונה ולטקסט הסופי. לא יפורסמו פרטי קשר. ניתן לחזור מההסכמה לפני הפרסום.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">6. שירות Plus</h2><p>הערוץ מיועד לשאלות, בקשות ועדכון העדפות בשעות הפעילות. הוא אינו ליווי אישי של הילית ואינו שירות חירום או מענה 24/7.</p></section>
          <section><h2 className="text-lg font-black text-[#191265]">7. יצירת קשר</h2><p>שירות לקוחות: 055-244-2334. לפני פתיחת השירות יפורסמו שעות הפעילות ודרך הביטול המדויקת.</p></section>
        </div>
      </article>
    </main>
  );
}
