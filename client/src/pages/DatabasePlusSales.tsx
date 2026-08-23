import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BadgeCheck, Check, Crown, HeartHandshake, Megaphone, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import GrowWallet from "@/components/GrowWallet";
import { trpc } from "@/lib/trpc";

const BENEFITS = [
  {
    icon: HeartHandshake,
    title: "לפחות 2 הצעות בחודש",
    text: "שתי הצעות התאמה חדשות שנבדקו ונשלחו בכל מחזור חיוב אישי.",
  },
  {
    icon: Crown,
    title: "קדימות בבדיקה האנושית",
    text: "איתור ובדיקת מועמדים לפני התור הרגיל, תוך שמירה על תנאי הסף החשובים לך.",
  },
  {
    icon: ShieldCheck,
    title: "שירות Plus אישי",
    text: "ערוץ שירות לקוחות בעדיפות לשאלות, בקשות ועדכון העדפות דרך המספר העסקי.",
  },
  {
    icon: Megaphone,
    title: "אפשרות לחשיפה בסושיאל",
    text: "רק לבחירתך ורק אחרי אישור נפרד שלך לטקסט ולתמונה. פרטי הקשר לעולם לא מפורסמים.",
  },
];

export default function DatabasePlusSales() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [renewalAccepted, setRenewalAccepted] = useState(false);
  const isPersonalLink = Boolean(email && token);
  const statusQuery = trpc.plusPilot.getMyStatus.useQuery(
    { email, token },
    { enabled: isPersonalLink, retry: false },
  );
  const plusData = statusQuery.data;
  const canPurchase = Boolean(
    isPersonalLink &&
    plusData?.paymentConfigured &&
    (plusData.status === "eligible" || plusData.status === "invited") &&
    termsAccepted &&
    renewalAccepted,
  );

  return (
    <main className="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]" dir="rtl">
      <nav className="border-b border-white/10 bg-[#191265]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/"><span className="cursor-pointer text-lg font-black text-white">הילית כספי</span></Link>
          <Link href={isPersonalLink ? `/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}` : "/database"}>
            <span className="cursor-pointer text-sm font-bold text-white/75 hover:text-[#ffe27c]">חזרה ←</span>
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[#191265] px-5 pb-20 pt-16 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #ffe27c 0%, transparent 32%), radial-gradient(circle at 85% 75%, #6253d6 0%, transparent 36%)" }} />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/40 bg-[#ffe27c]/10 px-4 py-2 text-sm font-bold text-[#ffe27c]">
            <Sparkles className="h-4 w-4" /> קבוצה מצומצמת לחברי המאגר
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">Database <span className="text-[#ffe27c]">Plus</span></h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/80 md:text-xl">
            יותר עבודה יזומה סביב הפרופיל שלך, יותר קדימות בבדיקה — ויעד ברור של לפחות שתי הצעות התאמה חדשות בכל מחזור.
          </p>
          <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-center gap-3 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur sm:flex-row">
            <div className="text-center">
              <div className="text-5xl font-black text-[#ffe27c]">99 ₪</div>
              <div className="mt-1 text-sm text-white/70">לחודש · בנוסף לדמי ההצטרפות למאגר</div>
            </div>
            <div className="hidden h-14 w-px bg-white/20 sm:block" />
            <div className="text-sm font-bold leading-7 text-white/85">אפשר לבטל בכל עת<br />החברות הרגילה במאגר נשארת</div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-3xl border border-[#e6dfcc] bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4bd] text-[#191265]"><Icon className="h-6 w-6" /></div>
            <h2 className="font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#68645d]">{text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-black text-[#8b7420]">מה בדיוק נחשב כהצעה?</p>
          <h2 className="mt-2 text-3xl font-black">הבטחה ברורה. בלי להבטיח את מה שאף אחד לא יכול להבטיח.</h2>
          <div className="mt-6 space-y-3">
            {[
              "הצעה נספרת רק כשהיא חדשה, נבדקה ונשלחה אלייך בפועל במייל וב־SMS.",
              "שליחה חוזרת של אותו אדם אינה נספרת פעמיים.",
              "הצעה יכולה להיות גם מתחת ל־80% לאחר בדיקה אנושית, כל עוד היא עומדת בתנאי הסף החשובים של שני הצדדים.",
              "לא נשלח אדם שסותר תנאי סף מהותיים רק כדי להשלים מכסה.",
              "אישור הדדי, דייט או זוגיות אינם בשליטתנו ולכן אינם מובטחים.",
            ].map(item => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm leading-6 shadow-sm">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-[#d9d2ee] bg-[#f8f6ff] p-6">
            <div className="flex items-center gap-3"><Users className="h-6 w-6" /><h3 className="text-xl font-black">למי זה מתאים?</h3></div>
            <p className="mt-3 text-sm leading-7 text-[#5f5a70]">לחברים פעילים במאגר עם פרופיל מלא, שמבקשים יותר קדימות ועבודה יזומה סביב החיפוש. Plus אינו מחליף תהליך ליווי אישי ואינו כולל מענה של הילית 24/7.</p>
          </div>
        </div>

        <aside id="checkout" className="h-fit rounded-[28px] border border-[#e3cf74] bg-white p-6 shadow-xl lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold text-[#8b7420]">מנוי חודשי</p><h2 className="text-2xl font-black">Database Plus</h2></div>
            <BadgeCheck className="h-10 w-10 text-[#c6a522]" />
          </div>
          <div className="mt-5 rounded-2xl bg-[#191265] p-5 text-center text-white">
            <span className="text-4xl font-black text-[#ffe27c]">99 ₪</span><span className="mr-2 text-sm text-white/70">לחודש</span>
            <p className="mt-2 text-xs text-white/60">חיוב מתחדש · ביטול בכל עת</p>
          </div>

          {!isPersonalLink && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              ההצטרפות מיועדת לחברים פעילים במאגר. התשלום ייפתח דרך הקישור האישי באזור האישי לאחר בדיקת זכאות.
            </div>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-3">
              <Checkbox checked={renewalAccepted} onCheckedChange={value => setRenewalAccepted(Boolean(value))} />
              <span>הבנתי שזהו חיוב חודשי מתחדש של 99 ש״ח עד לביטול, ושניתן לבטל בכל עת.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-3">
              <Checkbox checked={termsAccepted} onCheckedChange={value => setTermsAccepted(Boolean(value))} />
              <span>קראתי ואני מסכים/ה ל<Link href="/terms/plus"><span className="mx-1 cursor-pointer font-bold underline">תקנון Plus ומדיניות הביטול</span></Link>.</span>
            </label>
          </div>

          {canPurchase ? (
            <GrowWallet
              product="plus"
              buttonLabel="הצטרפות ל־Plus ב־99 ₪ לחודש"
              buttonClassName="mt-5 w-full rounded-2xl bg-[#191265] py-4 text-base font-black text-[#ffe27c]"
              prefillName={`${plusData?.profile.firstName || ""} ${plusData?.profile.lastName || ""}`.trim()}
              prefillEmail={plusData?.profile.email || email}
              prefillPhone={plusData?.profile.phone || ""}
              termsPath="/terms/plus"
              personalToken={token}
            />
          ) : (
            <button disabled className="mt-5 w-full rounded-2xl bg-[#d9d4c6] py-4 text-base font-black text-[#7a756b]">
              {!isPersonalLink
                ? "נדרש קישור אישי מהאזור האישי"
                : !plusData?.paymentConfigured
                  ? "החיוב ייפתח לאחר אישור Grow"
                  : plusData?.status === "active"
                    ? "המנוי שלך פעיל"
                    : plusData?.status !== "eligible" && plusData?.status !== "invited"
                      ? "נדרשת בדיקת זכאות"
                      : "יש לאשר את שני הסעיפים"}
            </button>
          )}
          <p className="mt-3 text-center text-xs leading-5 text-[#888]">לא יבוצע חיוב ללא קישור אישי, זכאות, אישור תנאי המנוי ועמוד הוראת קבע ייעודי של Grow.</p>
        </aside>
      </section>
    </main>
  );
}
