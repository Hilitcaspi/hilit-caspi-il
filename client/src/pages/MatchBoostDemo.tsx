import { useState } from "react";
import { Link } from "wouter";

const options = [
  {
    score: 82,
    details: [
      ["גיל", "38"], ["אזור", "מרכז והשפלה"], ["תחום עיסוק", "ניהול ועסקים"],
      ["השכלה", "תואר ראשון"], ["מצב משפחתי", "רווקות"], ["כיוון משפחתי", "קשר רציני"],
    ],
    reasons: ["ערכים דומים בנושא קשר", "שלב חיים דומה", "התאמה בדפוסי זוגיות"],
    consideration: "יש פער מסוים בהעדפת המרחק, ולכן כדאי להישאר פתוחים לפני שמחליטים.",
  },
  {
    score: 78,
    details: [
      ["גיל", "40"], ["אזור", "השרון"], ["תחום עיסוק", "טכנולוגיה והנדסה"],
      ["השכלה", "תואר שני"], ["מצב משפחתי", "גרושות"], ["כיוון משפחתי", "קשר רציני"],
    ],
    reasons: ["עברתם את תנאי הסף ההדדיים", "כיוון משפחתי דומה", "התאמה טובה באורח החיים"],
    consideration: "הכרטיס הוא בסיס להחלטה ראשונית. פרטים מזהים נחשפים רק לאחר אישור הדדי.",
  },
];

export default function MatchBoostDemo() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <main className="min-h-screen bg-[#f0eadc] px-4 py-8 font-rubik" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-[#e9e8e8] bg-white p-1 text-center shadow-sm">
          {[["👤", "הפרופיל שלי"], ["💌", "התאמות"], ["🧬", "הDNA שלי"]].map(([icon, label]) => (
            <div key={label} className={`rounded-lg px-1 py-2.5 text-[11px] font-bold ${label === "התאמות" ? "bg-[#191265] text-white shadow-sm" : "text-[#727272]"}`}>
              <span className="mb-0.5 block text-base">{icon}</span>{label}
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-2xl border border-[#ded8ef] bg-white p-4 text-right text-[#20113e] shadow-sm">
          <h1 className="font-black text-[#191265]">כל ההזדמנויות להיכרות במקום אחד</h1>
          <p className="mt-1 text-xs leading-5 text-[#666]">כאן מופיעות בנפרד ההתאמות שהילית בוחנת ושולחת ואפשרויות Boost שאפשר לבחור ולשלוח באופן עצמאי.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
            <a href="#regular-demo" className="rounded-xl bg-[#f0eadc] px-3 py-2.5 text-[#191265]">ההתאמות של הילית</a>
            <a href="#boost-demo" className="rounded-xl bg-[#f7e7f1] px-3 py-2.5 text-[#8c1763]">אפשרויות Boost</a>
          </div>
        </div>

        <section id="boost-demo" className="scroll-mt-6 overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_18%_8%,#fd73bd_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_58%,#a52178_100%)] text-white shadow-xl shadow-fuchsia-950/20">
          <div className="border-b border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-black text-[#ffe27c]">המחשה בלבד: אין פרטי לקוח ולא מתבצע חיוב</div>
          <div className="p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#ffe27c]">אפשרויות Boost לבחירה עצמאית</p>
                <h2 className="mt-1 text-2xl font-black">בוחרים אפשרות אחת לפני השליחה</h2>
              </div>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black">2 אפשרויות זמינות</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/80">שני הכרטיסים אנונימיים. אפשר להשוות ביניהם, לבחור ורק אז להמשיך לשליחה.</p>

            <div className="mt-5 space-y-4">
              {options.map((option, index) => {
                const selected = selectedIndex === index;
                return (
                  <article key={option.score} className={`rounded-[1.6rem] border p-4 transition-colors sm:p-5 ${selected ? "border-[#ffe27c] bg-white/15" : "border-white/25 bg-white/10"}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#191265] shadow-md"><span className="text-3xl blur-[1px]">?</span></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-black text-[#ffe27c]">אפשרות Boost {index + 1}</p>
                          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black">{option.score}% התאמה</span>
                        </div>
                        <h3 className="mt-2 text-xl font-black">לפני תמונה, מכירים את האדם</h3>
                        <button type="button" onClick={() => { setSelectedIndex(index); setNotice(""); }} className={`mt-3 rounded-xl px-4 py-2 text-xs font-black transition-transform active:scale-[0.97] ${selected ? "bg-[#ffe27c] text-[#191265]" : "border border-white/30 bg-white/10 text-white"}`}>
                          {selected ? "✓ האפשרות נבחרה" : "בחירה באפשרות זו"}
                        </button>
                      </div>
                    </div>

                    {selected && (
                      <div className="mt-5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {option.details.map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-3">
                              <p className="text-[10px] font-bold text-[#ffe27c]">{label}</p>
                              <p className="mt-1 text-xs font-black text-white">{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-[#eef9f1] p-4 text-xs leading-6 text-[#315d3f]"><strong className="block text-[#24613a]">למה האלגוריתם סימן התאמה</strong>{option.reasons.map(reason => <span key={reason} className="block">✓ {reason}</span>)}</div>
                          <div className="rounded-xl bg-[#fff3e8] p-4 text-xs leading-6 text-[#75431e]"><strong className="block text-[#8a4b17]">מה כדאי לקחת בחשבון</strong>{option.consideration}</div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-white/25 bg-white/10 p-3 text-center text-xs font-black">הצעת Boost אלגוריתמית, לא נבדקה ידנית על ידי הילית</div>
            <div className="mt-5 rounded-2xl bg-white p-4 text-[#20113e] shadow-lg">
              <p className="text-sm font-black">לפני השליחה</p>
              <p className="mt-2 text-xs leading-5 text-[#555]">שליחת Boost אינה מבטיחה אישור הדדי, חשיפת פרטים, דייט או זוגיות. הפרטים ייחשפו רק אם שני הצדדים יאשרו.</p>
              <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-[#444]">
                <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#191265]" />
                <span>קראתי ואישרתי את <Link href="/terms/match-boost"><span className="font-bold underline">תקנון Boost</span></Link>, כולל קבלת הצעות אלגוריתמיות שלא נבדקו ידנית על ידי הילית.</span>
              </label>
              <button type="button" disabled={!termsAccepted} onClick={() => setNotice("בעמוד האישי האמיתי נפתח כאן תשלום Grow מאובטח. בהדגמה לא מתבצע חיוב.")} className="mt-4 w-full rounded-2xl bg-gradient-to-l from-[#a52178] to-[#5d176d] py-4 text-lg font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50">
                שליחת Boost | 19.90 ₪
              </button>
              {notice && <p className="mt-3 rounded-xl bg-[#e8f5e9] p-3 text-center text-xs font-bold text-[#2e7d32]">{notice}</p>}
            </div>
          </div>
        </section>

        <section id="regular-demo" className="mt-5 scroll-mt-6 rounded-2xl border border-[#ded8ef] bg-white p-5 text-right shadow-sm">
          <p className="text-xs font-black text-[#191265]">התאמות שהילית בוחנת ושולחת</p>
          <h2 className="mt-1 text-lg font-black text-[#20113e]">מסלול ההתאמות הרגיל ממשיך בנפרד</h2>
          <p className="mt-2 text-xs leading-5 text-[#666]">אחוז ההתאמה הוא נקודת פתיחה. הילית בוחנת גם את מצב שני הצדדים, הזמינות וההתאמה האנושית לפני שליחת הצעה.</p>
          <div className="mt-4 rounded-xl border border-[#e9e8e8] bg-[#faf8f2] p-4">
            <div className="flex items-center justify-between gap-3"><strong className="text-sm text-[#191265]">התאמה פוטנציאלית בבדיקה</strong><span className="rounded-full bg-[#eee9ff] px-3 py-1 text-xs font-black text-[#51448c]">86%</span></div>
            <p className="mt-2 text-xs leading-5 text-[#727272]">עדיין לא נשלחה הצעה. הילית בוחנת התאמה וזמינות לפני המשך.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
