import { Link } from "wouter";
import { Clock3, Mail, TicketCheck } from "lucide-react";
import LiveVoucherCard from "@/components/LiveVoucherCard";

export default function LiveEventThankYou() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]">
      <header className="bg-[#191265] px-6 py-5 text-center text-white"><Link href="/" className="font-black">הילית כספי</Link></header>
      <section className="relative overflow-hidden bg-[#191265] px-5 pb-20 pt-12 text-center text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,226,124,.2),transparent_42%)]" />
        <div className="relative mx-auto max-w-2xl">
          <TicketCheck className="mx-auto h-12 w-12 text-[#ffe27c]" />
          <p className="mt-5 text-xs font-black tracking-widest text-[#ffe27c]">סודות ההתאמה המושלמת</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">איזה כיף שנתראה בלייב.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/80">כרטיס אישי יוצג כאן לאחר ש־Grow יאשר את התשלום. אפשר להעתיק את מספר השובר ולשלוח שאלה להילית כבר עכשיו.</p>
        </div>
      </section>
      <div className="relative mx-auto -mt-10 max-w-2xl space-y-6 px-5 pb-16">
        <LiveVoucherCard receiptOnly showPending />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><Clock3 className="h-5 w-5 text-[#191265]" /><p className="mt-2 font-black">שבת, 31.10.2026 · 20:30</p><p className="mt-1 text-xs leading-6 text-[#625d78]">שעון ישראל. כדאי לשמור את הערב ביומן.</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><Mail className="h-5 w-5 text-[#191265]" /><p className="mt-2 font-black">קישור לאירוע בהמשך</p><p className="mt-1 text-xs leading-6 text-[#625d78]">לאחר הגדרת האירוע יישלח קישור אישי לכתובת ההרשמה, סמוך למועד הלייב.</p></div>
        </div>
        <p className="text-center text-xs leading-6 text-[#625d78]">לא רואים עדיין כרטיס? לפעמים האישור לוקח כמה רגעים. אם התשלום בוצע ממכשיר אחר, אפשר להיכנס לאזור האישי או ליצור קשר עם הצוות.</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm font-bold"><Link href="/live" className="underline underline-offset-4">חזרה לעמוד הלייב</Link><Link href="/my-profile" className="underline underline-offset-4">האזור האישי</Link></div>
      </div>
    </main>
  );
}
