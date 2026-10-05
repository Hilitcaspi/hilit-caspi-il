import { useState } from "react";
import { trpc } from "@/lib/trpc";

/** Shown only after the member has opened their verified personal-area link. */
export default function EssentialEmailOptIn({ email, token }: { email: string; token: string }) {
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const resume = trpc.singles.resumeEssentialEmails.useMutation();

  return (
    <section className="max-w-2xl mx-auto px-4 mt-6" dir="rtl" aria-label="העדפות מיילי שירות">
      <div className="rounded-2xl border border-[#e6dfcf] bg-white p-5 shadow-sm">
        <h2 className="text-[#191265] font-bold text-base">מיילים חשובים לא מגיעים?</h2>
        <p className="mt-2 text-sm leading-6 text-[#56536a]">
          אם הסרת בעבר את הכתובת שלך מקבלת מיילים, ייתכן שגם קישורי כניסה והודעות על התאמות נחסמים.
          אפשר לבחור לקבל מחדש רק הודעות שקשורות ישירות לחברות במאגר.
        </p>
        {!expanded && !resume.isSuccess && (
          <button type="button" onClick={() => setExpanded(true)}
            className="mt-3 rounded-xl border border-[#191265] px-4 py-2 text-sm font-bold text-[#191265] hover:bg-[#f8f5eb]">
            בדיקת האפשרות לחידוש מיילי שירות
          </button>
        )}
        {expanded && !resume.isSuccess && (
          <div className="mt-4 rounded-xl bg-[#faf8f2] p-4">
            <p className="text-sm leading-6 text-[#191265]">
              הבחירה הזו מאפשרת לשלוח אליך קישורי כניסה, הצעות התאמה ועדכונים אישיים על השירות.
              היא לא מחזירה ניוזלטרים, מבצעים או הודעות שיווקיות שהסרת.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-[#191265]">
              <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#191265]" />
              <span>כן, אני רוצה לקבל שוב מיילי שירות חיוניים לכתובת הרשומה בחשבון שלי.</span>
            </label>
            <button type="button" disabled={!checked || resume.isPending}
              onClick={() => resume.mutate({ email, token, explicitConsent: true })}
              className="mt-4 rounded-xl bg-[#191265] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {resume.isPending ? "מעדכנים..." : "חידוש מיילי שירות"}
            </button>
          </div>
        )}
        {resume.isSuccess && (
          <p role="status" className="mt-3 text-sm font-semibold text-[#186c4f]">
            הבקשה בוצעה. מעכשיו אפשר לבקש קישור חדש דרך עמוד הכניסה; אם הוא לא מגיע, אפשר לפנות אלינו בוואטסאפ.
          </p>
        )}
        {resume.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">לא הצלחנו לעדכן כרגע. אפשר לנסות שוב מאוחר יותר.</p>
        )}
      </div>
    </section>
  );
}
