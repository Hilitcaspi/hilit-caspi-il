import { Link } from "wouter";
import { Heart, ArrowLeft } from "lucide-react";

export default function TuBavBundle() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#fff5f5] font-rubik text-[#1a0a2e]">
      <header className="bg-[#21082d] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-bold">הילית כספי</Link>
          <Link href="/" className="text-sm text-white/80 underline underline-offset-4">חזרה לאתר</Link>
        </div>
      </header>
      <section className="mx-auto max-w-2xl px-6 py-20 text-center md:py-28">
        <Heart aria-hidden="true" className="mx-auto h-12 w-12 text-[#ff4466]" />
        <p className="mt-6 text-sm font-bold text-[#a32650]">חבילת ט״ו באב</p>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">הטבת ט״ו באב הסתיימה</h1>
        <p className="mt-6 text-lg leading-8 text-[#5d505c]">החבילה אינה פתוחה לרכישות חדשות. ההיכרות וההזדמנויות ממשיכות במאגר הרווקים והרווקות שלי.</p>
        <div className="mt-8 rounded-3xl border border-[#ffd6e0] bg-white p-6 text-right leading-8 shadow-sm">
          <h2 className="font-bold">כבר רכשת את החבילה?</h2>
          <p className="mt-2 text-[#5d505c]">הגישה למאגר ולמדריך שנרכשו נשמרת. סגירת ההטבה אינה משנה זכויות של רכישות קודמות, ואין צורך לרכוש שוב.</p>
          <Link href="/my-profile" className="mt-4 inline-block font-bold text-[#a32650] underline underline-offset-4">כניסה לאזור האישי</Link>
        </div>
        <Link href="/database" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#ff4466] px-8 py-4 font-bold text-white transition-transform hover:bg-[#df3359] active:scale-[.97]">לפרטי המאגר והמחיר הנוכחי<ArrowLeft aria-hidden="true" className="h-5 w-5" /></Link>
        <p className="mt-4 text-sm text-[#655761]">ההצעה הנוכחית מוצגת בעמוד המאגר, ואינה חבילת ט״ו באב.</p>
      </section>
    </main>
  );
}
