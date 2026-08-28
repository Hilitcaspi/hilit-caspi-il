import { useState } from "react";
import { CheckCircle2, Clipboard, FileText, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ILLUSTRATION_TEMPLATES = [
  {
    title: "כרטיס ציטוט נקי",
    subtitle: "המחשה, לא עדות לקוח",
    placeholder: "כאן יוצג רק טקסט שהלקוח אישר לפרסום והצוות אימת.",
  },
  {
    title: "כרטיס מגזיני",
    subtitle: "המחשה, לא סיפור לקוח",
    placeholder: "שם, תמונה ותוצאה יופיעו רק בהתאם להיקף ההרשאה שנבחר.",
  },
];

export default function TestimonialCreativeLibrarySection() {
  const library = trpc.publicProof.testimonialCreativeLibrary.useQuery(undefined, { retry: false });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="space-y-4" dir="rtl">
      <div className="rounded-2xl border border-[#d9d2ff] bg-gradient-to-l from-[#191265] to-[#331a78] p-5 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-7 w-7 flex-none text-[#ffe27c]" />
          <div>
            <h2 className="text-xl font-black">ספר עדויות וקריאייטיבים מאושרים</h2>
            <p className="mt-1 text-sm leading-6 text-white/80">מופיעים כאן רק טקסטים עם הסכמה מפורשת ואימות צוות. אין יצירת שמות, תוצאות או הודעות פרטיות מומצאות.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-black text-emerald-900">מסלול ידני, פעיל</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-800">לאחר תוצאה חיובית הצוות בוחר למי לשלוח בקשת משוב. זו הדרך הזהירה ביותר להתחלה.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-black text-amber-900">מסלול אוטומטי, מוכן אך כבוי</h3>
          <p className="mt-1 text-sm leading-6 text-amber-800">אפשר להפעיל בקשה אוטומטית רק אחרי תוצאה חיובית שאומתה. לא תישלח אוטומציה לפני אישור הילית.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#191265]" />
          <h3 className="font-black text-[#191265]">תבניות המחשה בטוחות</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {ILLUSTRATION_TEMPLATES.map(template => (
            <article key={template.title} className="rounded-2xl border-2 border-dashed border-[#c9c4ef] bg-[#faf9ff] p-4">
              <span className="rounded-full bg-[#ffe27c] px-2 py-1 text-[10px] font-black text-[#191265]">המחשה</span>
              <h4 className="mt-3 font-black text-[#191265]">{template.title}</h4>
              <p className="text-xs font-bold text-[#8a6f13]">{template.subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-[#727272]">{template.placeholder}</p>
            </article>
          ))}
        </div>
      </div>

      {library.isLoading ? <div className="rounded-2xl bg-white p-8 text-center text-[#727272]">טוען עדויות מאושרות...</div> : null}
      {library.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">לא ניתן לטעון כעת את ספר העדויות.</div> : null}
      {!library.isLoading && !library.error && (library.data?.length || 0) === 0 ? (
        <div className="rounded-2xl border border-[#e8e2d6] bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#191265]" />
          <h3 className="mt-3 text-lg font-black text-[#191265]">אין כרגע עדויות שעברו את כל האישורים</h3>
          <p className="mt-2 text-sm leading-6 text-[#727272]">הספר יישאר ריק עד שיהיו תוצאה חיובית, טקסט שאושר לפרסום והשלמת אימות צוות.</p>
        </div>
      ) : null}

      {library.data?.map(testimonial => (
        <article key={testimonial.id} className="rounded-2xl border border-[#e8e2d6] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800">עדות מאושרת</span>
              <h3 className="mt-2 font-black text-[#191265]">{testimonial.displayName}</h3>
            </div>
            <button type="button" onClick={() => setOpenId(openId === testimonial.id ? null : testimonial.id)} className="rounded-lg border border-[#c9c4ef] px-3 py-2 text-xs font-bold text-[#191265]">
              {openId === testimonial.id ? "סגירת וריאציות" : "פתיחת 10 וריאציות"}
            </button>
          </div>
          <blockquote className="mt-3 border-r-4 border-[#ffe27c] pr-3 text-sm leading-7 text-[#4b4666]">{testimonial.text}</blockquote>
          {openId === testimonial.id ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {testimonial.variants.map(variant => (
                <div key={variant.id} className="rounded-xl border border-[#ece7dc] bg-[#faf9f6] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs text-[#191265]">{variant.order}. {variant.formatLabel}</strong>
                    <button type="button" aria-label={`העתקת ${variant.formatLabel}`} onClick={() => { navigator.clipboard.writeText(`${variant.headline}\n\n“${variant.body}”\n\n${variant.attribution}\nעדות מאושרת`); toast.success("הווריאציה הועתקה"); }} className="rounded-md p-1 text-[#191265] hover:bg-white"><Clipboard className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#191265]">{variant.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-[#555]">“{variant.body}”</p>
                  <p className="mt-2 text-xs font-bold text-[#727272]">{variant.attribution}</p>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
