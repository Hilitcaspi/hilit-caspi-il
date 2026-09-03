import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Heart, Loader2 } from "lucide-react";

const questions = [
  "מה הרגיש טבעי ונעים בשיחה או בהיכרות?",
  "באיזה רגע התעוררה בי סקרנות אמיתית להכיר עוד?",
  "מה הפתיע אותי לטובה כשהנחתי לרגע בצד את רשימת הציפיות?",
  "איזו איכות גיליתי באדם שמולי מעבר לרושם הראשוני?",
  "האם הרגשתי בנוח להיות מי שאני, ואם כן, מה אפשר לזה לקרות?",
  "מה ארצה לבדוק או להעמיק בפגישה הבאה?",
  "מה הצעד הקטן והפתוח שאבחר לעשות עכשיו?",
];

export default function TestimonialReward() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token")?.trim() || "", []);
  const isPreview = import.meta.env.DEV && window.location.pathname === "/__preview/testimonial-reward";
  const reward = trpc.testimonial.public.reward.useMutation();

  useEffect(() => {
    if (!isPreview && /^[a-f0-9]{64}$/.test(token) && reward.isIdle) reward.mutate({ token });
  }, [isPreview, token, reward.isIdle]);

  if (!isPreview && (!token || reward.error)) {
    return <main dir="rtl" className="min-h-screen bg-[#fff6f8] px-5 py-20 text-[#4c2634]"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-xl"><AlertCircle className="mx-auto h-10 w-10 text-[#a75f78]" /><h1 className="mt-4 text-2xl font-semibold">המתנה אינה זמינה בקישור הזה</h1><p className="mt-3 text-[#795e69]">אפשר לפנות לצוות ונשמח לעזור.</p></div></main>;
  }

  if (!isPreview && reward.isPending) return <main className="flex min-h-screen items-center justify-center bg-[#fff6f8]"><Loader2 className="h-8 w-8 animate-spin text-[#a75f78]" /></main>;

  return (
    <main dir="rtl" className="min-h-screen bg-[#fff6f8] px-4 py-10 text-[#4c2634] print:bg-white print:py-0">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_28px_90px_rgba(61,35,24,.16)] print:shadow-none">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#6f3f52] via-[#a75f78] to-[#d89bb0] px-7 py-12 text-white md:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,231,239,.32),transparent_35%),radial-gradient(circle_at_88%_90%,rgba(255,255,255,.14),transparent_40%)]" />
          <div className="relative">
            <p className="text-sm tracking-[.18em] text-[#ffe3ec]">מתנה אישית מהילית כספי</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">מפת הדייט הבא</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff3f7]">שבע שאלות קצרות שיעזרו לעצור, להרגיש ולבדוק חיבור אמיתי מעבר לרושם הראשוני.</p>
          </div>
        </header>
        <div className="space-y-5 p-6 md:p-12">
          <div className="rounded-2xl border border-[#efcad7] bg-[#fff1f5] p-5 leading-7 text-[#704c5b]"><Heart className="mb-3 h-6 w-6 text-[#a75f78]" />אין כאן תשובה נכונה. אפשר לקחת את השאלות לדייט הבא, לענות לעצמכם בשקט ולבחון את החיבור מתוך סקרנות ולא מתוך רשימת מכולת.</div>
          {questions.map((question, index) => <section key={question} className="rounded-2xl border border-[#f0d6df] p-5"><div className="flex items-start gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a75f78] font-semibold text-white">{index + 1}</span><h2 className="pt-1 text-lg font-semibold leading-7">{question}</h2></div><div className="mt-5 h-16 border-b border-dashed border-[#ddb8c7]" /></section>)}
          <div className="rounded-2xl bg-[#6f3f52] p-6 text-center text-white"><p className="text-lg font-semibold">המטרה היא לא לדעת מיד אם זו ההתאמה המושלמת.</p><p className="mt-2 leading-7 text-[#fff0f5]">המטרה היא לזהות אם יש כאן משהו טוב ששווה לתת לו עוד פגישה.</p></div>
          <Button onClick={() => window.print()} className="h-13 w-full rounded-full bg-[#e8bfd0] text-[#542d3d] hover:bg-[#dcaec1] print:hidden"><Download className="ml-2 h-5 w-5" />שמירה או הדפסה של המפה</Button>
        </div>
      </article>
    </main>
  );
}
