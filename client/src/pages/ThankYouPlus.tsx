import { CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function ThankYouPlus() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const profileUrl = email && token ? `/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}` : "/database-plus";
  return (
    <main className="min-h-screen bg-[#f0eadc] px-5 py-16 font-rubik text-[#191265]" dir="rtl">
      <section className="mx-auto max-w-xl rounded-[30px] bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-black">הצטרפות Plus התקבלה</h1>
        <p className="mt-3 text-sm leading-7 text-[#666]">לאחר ש־Grow יאשר את העסקה יישלח מייל אישי. אם כבר קיים פרופיל מלא, המנוי יופעל ויופיע באזור האישי. אם עדיין אין פרופיל, המייל יכלול קישור להשלמת הפרטים והשאלון.</p>
        <div className="mt-6 rounded-2xl bg-[#f8f6ff] p-5 text-right text-sm leading-7">
          <strong>מה קורה עכשיו?</strong><br />כדאי לבדוק את תיבת המייל. תהליך ההתאמות מתחיל לאחר השלמת הפרופיל והשאלון. ערוץ השירות בעדיפות יופיע באזור האישי, וחשיפה בסושיאל לא תתבצע ללא אישור נפרד.
        </div>
        <Link href={profileUrl}><span className="mt-6 block cursor-pointer rounded-2xl bg-[#191265] py-4 font-black text-white">{email && token ? "לאזור האישי" : "חזרה לעמוד Plus"}</span></Link>
        <a href="https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%2C%20%D7%94%D7%A6%D7%98%D7%A8%D7%A4%D7%AA%D7%99%20%D7%9C%D6%BEDatabase%20Plus" className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[#191265] py-3 text-sm font-bold"><MessageCircle className="h-4 w-4" />שירות Plus</a>
      </section>
    </main>
  );
}
