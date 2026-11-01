const OFFER_END = "30.11.2026";

export default function TermsNovemberBundle() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#fffdf9] px-5 py-10 font-['Rubik',sans-serif] text-[#171519] md:px-8 md:py-16">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-[#171519]/10 bg-white shadow-[0_20px_60px_rgba(72,54,67,.08)]">
        <header className="bg-[#d2c3cd] px-7 py-10 md:px-11 md:py-13">
          <p className="text-sm font-black text-[#5e4b5a]">הילית כספי</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em] md:text-4xl">תנאי הטבת נובמבר לזוגיות</h1>
          <p className="mt-4 text-sm leading-7 text-[#514451]">תקף בישראל בין 1.11.2026 ל־{OFFER_END}, או כל עוד ההטבה זמינה בעמוד.</p>
        </header>

        <div className="space-y-8 px-7 py-9 text-sm leading-7 text-[#564b55] md:px-11 md:py-12">
          <section>
            <h2 className="text-lg font-black text-[#171519]">1. ההטבה והמחיר</h2>
            <p className="mt-2">הטבת נובמבר כוללת הצטרפות למאגר הרווקים והרווקות במחיר חד פעמי של 349 ₪ במקום 499 ₪, וכן גישה אישית לקורס הדיגיטלי המלא ״המסע לזוגיות״ במתנה. ערכו המקורי של הקורס הוא 497 ₪; בעמוד הקורס הוא מוצע כיום במחיר נפרד של 249 ₪. ההטבה אינה כוללת Plus, ו־Plus אינו מופעל אוטומטית.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-[#171519]">2. הצטרפות למאגר והצעת התאמה ראשונה</h2>
            <p className="mt-2">הספירה להצעת התאמה ראשונה מתחילה רק לאחר אישור מלא של התשלום וגם לאחר שהושלמו הפרופיל, התמונה, השאלונים וההעדפות. מאותו מועד תיבחן ותישלח הצעת התאמה ראשונה בתוך עד 3 ימים קלנדריים. אין בכך התחייבות לדייט, לקשר, לקבלת ההצעה, להסכמה של האדם האחר או לזוגיות. אין התחייבות לתדירות קבועה או למספר קבוע של הצעות לאחר מכן.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-[#171519]">3. אופן בחינת התאמות ופרטיות</h2>
            <p className="mt-2">הילית בוחנת אישית את הפרופילים ואת הצעות ההתאמה, לצד השאלונים וההעדפות שנמסרו. פרטי קשר אינם מועברים לפני הסכמה של שני הצדדים. השימוש בפרטי ההצטרפות כפוף למדיניות הפרטיות ולתקנון המאגר.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-[#171519]">4. גישה לקורס</h2>
            <p className="mt-2">לאחר אישור התשלום יישלחו פרטי הגישה האישיים לקורס לכתובת המייל שנמסרה בעת ההצטרפות. הגישה היא אישית ואין להעביר את הקישורים או את תוכן הקורס לאדם אחר.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-[#171519]">5. תנאים קיימים</h2>
            <p className="mt-2">תנאי ההצטרפות למאגר, תנאי הקורס, מדיניות הביטול ומדיניות הפרטיות המפורטים בקישורים שלהלן ממשיכים לחול. מסמך זה מבהיר את היקף ההטבה ואת חלון השירות שלה ואינו מחליף אותם.</p>
            <nav className="mt-4 flex flex-wrap gap-3 font-black">
              <a href="/terms/database" className="rounded-full border border-[#171519]/14 px-4 py-2.5 transition hover:bg-[#f2eaf0]">תקנון המאגר</a>
              <a href="/terms/course" className="rounded-full border border-[#171519]/14 px-4 py-2.5 transition hover:bg-[#f2eaf0]">תקנון הקורס</a>
              <a href="/privacy" className="rounded-full border border-[#171519]/14 px-4 py-2.5 transition hover:bg-[#f2eaf0]">מדיניות פרטיות</a>
            </nav>
          </section>
        </div>

        <footer className="border-t border-[#171519]/10 bg-[#fffdf9] px-7 py-7 md:px-11">
          <a href="/november-love#payment" className="inline-flex rounded-full bg-[#171519] px-6 py-3.5 text-sm font-black text-[#fffdf9] transition hover:bg-[#352f33]">חזרה להטבת נובמבר</a>
        </footer>
      </article>
    </main>
  );
}
