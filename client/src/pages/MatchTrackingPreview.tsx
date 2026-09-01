const cards = [
  { title: "זוג לדוגמה א׳ + זוג לדוגמה ב׳", score: "84%", status: "עדיין בהתאמה · 12 ימים", tone: "bg-emerald-100 text-emerald-800" },
  { title: "זוג לדוגמה ג׳ + זוג לדוגמה ד׳", score: "79%", status: "חזרו למאגר אחרי 9 ימים", tone: "bg-slate-100 text-slate-700" },
];

export default function MatchTrackingPreview() {
  return <main dir="rtl" className="min-h-screen bg-[#f3efe4] p-4 text-[#191265] md:p-8"><div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>תצוגת מבנה בלבד:</strong> ללא שמות או נתוני לקוחות. המספרים הם צילום מצרפי מבדיקת 1.9.2026.</div>
    <section className="rounded-3xl bg-[#191265] p-6 text-white"><h1 className="text-3xl font-black">מעקב התאמות</h1><p className="mt-2 text-white/70">173 זוגות אמרו כן · 14 עדיין בהתאמה · 159 חזרו למאגר</p></section>
    <nav className="grid gap-2 rounded-2xl bg-white p-2 shadow-sm sm:grid-cols-5">{[["ממתין לשליחה","⏳"],["קיבלו התאמה","📨"],["אין התאמה","✕"],["שניהם אמרו כן","💛"],["מעקב אחרי התאמה","🔔"]].map(([label,icon],index) => <div key={label} className={`rounded-xl px-3 py-3 text-center text-sm font-bold ${index === 4 ? "bg-[#191265] text-white" : "bg-[#f8f6f0]"}`}>{icon} {label}</div>)}</nav>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-purple-200 bg-purple-50 p-4"><strong className="text-2xl">173</strong><p className="text-xs">זוגות אמרו כן</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><strong className="text-2xl">14</strong><p className="text-xs">עדיין בהתאמה</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><strong className="text-2xl">159</strong><p className="text-xs">חזרו למאגר</p></div></section>
    <section className="space-y-3">{cards.map(card => <article key={card.title} className="rounded-2xl border border-[#e6e1d6] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-full bg-[#ffe27c] px-3 py-1 font-black">{card.score}</span><strong>{card.title}</strong></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${card.tone}`}>{card.status}</span></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">צד א׳: אישר/ה</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">צד ב׳: אישר/ה</span></div></article>)}</section>
    <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-[#555]"><strong className="text-[#191265]">מה השתנה:</strong> זוג שאמר כן נשאר תמיד בטאב „שניהם אמרו כן”. בטאב המעקב רואים אם הוא עדיין בהתאמה וכמה ימים, או אחרי כמה ימים חזר למאגר.</div>
  </div></main>;
}
