import { useState } from "react";
import { Link } from "wouter";

const details = [
  ["גיל", "38"],
  ["אזור", "מרכז והשפלה"],
  ["תחום עיסוק", "ניהול ועסקים"],
  ["השכלה", "תואר ראשון"],
  ["מצב משפחתי", "רווקות"],
  ["כיוון משפחתי", "קשר רציני"],
];

export default function MatchBoostDemo() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <main className="min-h-screen bg-[#f0eadc] px-4 py-8 font-rubik text-white" dir="rtl">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] shadow-xl shadow-fuchsia-950/20">
        <div className="border-b border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-black text-[#ffe27c]">המחשה בלבד: אין פרטי לקוח ולא מתבצע חיוב</div>
        <div className="p-5 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="mx-auto flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#191265] shadow-md sm:mx-0">
              <div className="flex h-16 w-14 items-center justify-center rounded-full bg-white/15 text-3xl blur-[1px]">?</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black text-[#ffe27c]">כרטיס Boost אנונימי</p>
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black text-white">82% התאמה</span>
              </div>
              <h1 className="mt-2 text-2xl font-black">לפני תמונה, מכירים את האדם</h1>
              <p className="mt-2 text-sm leading-6 text-white/80">הכרטיס מציג מידע כללי וסיבות התאמה, בלי שם, תמונה, עיר מדויקת, מקום עבודה או פרטי קשר.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-[#ffe27c]">{label}</p>
                <p className="mt-1 text-xs font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#eef9f1] p-4 text-xs leading-6 text-[#315d3f]"><strong className="block text-[#24613a]">למה האלגוריתם סימן התאמה</strong>✓ עברתם את תנאי הסף ההדדיים<br />✓ שלב חיים דומה<br />✓ התאמה בדפוסי זוגיות</div>
            <div className="rounded-xl bg-[#fff3e8] p-4 text-xs leading-6 text-[#75431e]"><strong className="block text-[#8a4b17]">מה כדאי לקחת בחשבון</strong>הכרטיס הוא בסיס להחלטה ראשונית. פרטים מזהים נחשפים רק לאחר אישור הדדי.</div>
          </div>

          <div className="mt-4 rounded-xl border border-white/25 bg-white/10 p-3 text-center text-xs font-black text-white">הצעת Boost אלגוריתמית, לא נבדקה ידנית על ידי הילית</div>

          <div className="mt-5 rounded-2xl bg-white p-4 text-[#20113e] shadow-lg">
            <p className="text-sm font-black">לפני התשלום</p>
            <p className="mt-2 text-xs leading-5 text-[#555]">שליחת Boost כוללת גם הצטרפות לקבלת הצעות Boost אלגוריתמיות ולהופעה בכרטיס אנונימי לחברים אחרים במסלול. אין הבטחה לאישור הדדי, לחשיפת פרטים, לדייט או לזוגיות.</p>
            <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-[#444]">
              <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#191265]" />
              <span>קראתי, הבנתי ואישרתי את <Link href="/terms/match-boost"><span className="font-bold underline">תקנון Boost</span></Link>, כולל קבלת הצעות אלגוריתמיות שלא נבדקו ידנית על ידי הילית.</span>
            </label>
            <button
              type="button"
              disabled={!termsAccepted}
              onClick={() => setNotice("בעמוד האישי האמיתי נפתח כאן תשלום Grow מאובטח. בהדגמה לא מתבצע חיוב.")}
              className="mt-4 w-full rounded-2xl bg-gradient-to-l from-[#a52178] to-[#5d176d] py-4 text-lg font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              שליחת Boost ב־19.99 ₪
            </button>
            {notice && <p className="mt-3 rounded-xl bg-[#e8f5e9] p-3 text-center text-xs font-bold text-[#2e7d32]">{notice}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
