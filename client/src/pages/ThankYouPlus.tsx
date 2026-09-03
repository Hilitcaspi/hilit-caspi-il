import { CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function ThankYouPlus() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const profileUrl = email && token ? `/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}` : "/";
  return (
    <main className="min-h-screen bg-[#f0eadc] px-5 py-16 font-rubik text-[#191265]" dir="rtl">
      <section className="mx-auto max-w-xl rounded-[30px] bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-black">ברוכים הבאים ל־Plus</h1>
        <p className="mt-3 text-sm leading-7 text-[#666]">המנוי הופעל. באזור האישי יוצגו מחזור החיוב, מונה ההצעות ותאריך החיוב הבא.</p>
        <div className="mt-6 rounded-2xl bg-[#f8f6ff] p-5 text-right text-sm leading-7">
          <strong>מה קורה עכשיו?</strong><br />הצוות בודק את הפרופיל וההעדפות. ערוץ השירות בעדיפות יופיע באזור האישי. חשיפה בסושיאל לא תתבצע ללא אישור נפרד.
        </div>
        <Link href={profileUrl}><span className="mt-6 block cursor-pointer rounded-2xl bg-[#191265] py-4 font-black text-white">לאזור האישי</span></Link>
        <a href="https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%2C%20%D7%94%D7%A6%D7%98%D7%A8%D7%A4%D7%AA%D7%99%20%D7%9C%D6%BEDatabase%20Plus" className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[#191265] py-3 text-sm font-bold"><MessageCircle className="h-4 w-4" />שירות Plus</a>
      </section>
    </main>
  );
}
