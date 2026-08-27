/**
 * Design: “Champagne at Midnight” — premium editorial dark-indigo surfaces,
 * muted champagne highlights and explicit, human-readable Plus commitments.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BadgeCheck, Check, Crown, Gem, HeartHandshake, Info, LockKeyhole, Megaphone, Sparkles, Stars, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import GrowWallet from "@/components/GrowWallet";
import { trpc } from "@/lib/trpc";

const BENEFITS = [
  { no: "01", icon: HeartHandshake, title: "2 התאמות עם מחשבה", text: "לפחות שתי התאמות חדשות בכל מחזור חיוב פעיל — כאלה שנבדקו ונשלחו אלייך בפועל." },
  { no: "02", icon: Zap, title: "בוסט אחד כלול", text: "הזדמנות נוספת מעבר לשתי ההתאמות, המבוססת על נתוני הפרופיל וההעדפות שלך." },
  { no: "03", icon: Crown, title: "קדימות שקטה", text: "הפרופיל שלך מקבל יותר תשומת לב בתהליך האיתור, המיון ועדכון ההעדפות." },
];

export default function DatabasePlusSales() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [renewalAccepted, setRenewalAccepted] = useState(false);
  const [boostAccepted, setBoostAccepted] = useState(false);
  const [spotlightInterest, setSpotlightInterest] = useState(false);
  const isPersonalLink = Boolean(email && token);
  const statusQuery = trpc.plusPilot.getMyStatus.useQuery({ email, token }, { enabled: isPersonalLink, retry: false });
  const plusData = statusQuery.data;
  const canPurchase = Boolean(isPersonalLink && plusData?.paymentConfigured && (plusData.status === "eligible" || plusData.status === "invited") && termsAccepted && renewalAccepted && boostAccepted);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#10182f] font-rubik text-[#f9f4eb]" dir="rtl">
      <nav className="relative z-20 border-b border-white/10 bg-[#10182f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border border-[#d8b67e]/50 bg-[#d8b67e]/10"><Gem className="h-5 w-5 text-[#e8cb91]" /></span><span><span className="block text-[10px] font-medium tracking-[.18em] text-[#e8cb91]">HILIT CASPI</span><span className="font-serif text-lg text-white">Plus</span></span></Link>
          <Link href={isPersonalLink ? `/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}` : "/database"} className="flex items-center gap-2 text-sm font-bold text-white/70 transition-colors hover:text-[#e8cb91]"><ArrowLeft className="h-4 w-4" />חזרה למאגר</Link>
        </div>
      </nav>

      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 pb-16 pt-20 md:px-10 md:pb-24 md:pt-28">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_18%,rgba(216,182,126,.22),transparent_0_19%),radial-gradient(circle_at_98%_78%,rgba(79,100,158,.28),transparent_0_28%),linear-gradient(120deg,#0a1022_0%,#10182f_56%,#16213d_100%)]" />
        <div className="absolute -right-12 top-12 -z-10 h-72 w-72 rounded-full border border-[#d8b67e]/15 [box-shadow:0_0_120px_30px_rgba(216,182,126,.08)]" />
        <div className="relative mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-[#d8b67e]/35 bg-white/5 px-3 py-2 text-xs font-semibold tracking-[.08em] text-[#e8cb91]"><Stars className="h-4 w-4" />לחברים ולחברות שכבר נמצאים במאגר</div>
            <p className="mt-8 text-xs font-bold tracking-[.18em] text-[#d8b67e]">DATABASE / MEMBERSHIP</p>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl font-bold leading-[.96] text-white md:text-7xl">להיכרות שלך מגיע <span className="text-[#e8cb91]">יותר אור.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/80">Plus הוא המסלול למי שכבר רשום או רשומה במאגר ורוצה יותר נוכחות, יותר תשומת לב אנושית, ועוד הזדמנויות שנבחרות באחריות.</p>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/85"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d8b67e]" />2 התאמות חדשות בכל מחזור</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d8b67e]" />בוסט אחד כלול</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d8b67e]" />99 ₪ לחודש</span></div>
          </div>
          <aside className="border border-[#d8b67e]/35 bg-[#10182f]/70 p-6 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur-xl md:p-8">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.12em] text-[#e8cb91]">YOUR PLUS INVITATION</p><h2 className="mt-3 font-serif text-3xl font-bold">מקום בקדמת הבמה</h2></div><BadgeCheck className="h-8 w-8 text-[#d8b67e]" /></div>
            <div className="mt-7 border-y border-white/10 py-5"><span className="font-serif text-5xl font-bold text-[#f1d59c]">99 ₪</span><span className="mr-2 text-sm text-white/60">לחודש</span><p className="mt-2 text-xs leading-5 text-white/60">חיוב חודשי המתחדש אוטומטית עד לביטול, בנוסף לחברות הרגילה במאגר.</p></div>
            <a href="#checkout" className="mt-6 flex items-center justify-center gap-2 bg-[#d8b67e] px-5 py-4 text-sm font-bold text-[#10182f] transition-all hover:bg-[#f0d49a] active:scale-[.97]">אני רוצה להצטרף <ArrowLeft className="h-4 w-4" /></a>
          </aside>
        </div>
      </section>

      <section className="bg-[#f8f1e4] px-5 py-20 text-[#17213d] md:px-10 md:py-28">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-20"><div><p className="text-xs font-bold tracking-[.16em] text-[#9b7132]">THE PLUS DIFFERENCE</p><h2 className="mt-5 max-w-md font-serif text-5xl font-bold leading-[.98] md:text-6xl">לא רק יותר הזדמנויות. יותר כוונה.</h2><p className="mt-7 max-w-md text-base leading-8 text-[#515867]">במסלול Plus אני מקדישה יותר מקום לפרופיל שלך בתוך תהליך ההתאמה — באופן אישי, מדוד ושקוף.</p></div>
          <div className="border-t border-[#17213d]/15">{BENEFITS.map(({ no, icon: Icon, title, text }) => <article key={no} className="grid grid-cols-[40px_1fr_auto] gap-4 border-b border-[#17213d]/15 py-7 md:grid-cols-[60px_1fr_auto] md:gap-6 md:py-9"><span className="pt-1 text-xs font-bold tracking-[.15em] text-[#a77b36]">{no}</span><div><h3 className="text-2xl font-bold md:text-3xl">{title}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-[#5c626d] md:text-base">{text}</p></div><span className="grid h-10 w-10 place-items-center rounded-full border border-[#b68c4a]/40 text-[#a77b36]"><Icon className="h-5 w-5" /></span></article>)}</div>
        </div>
      </section>

      <section className="bg-[#e8dec9] px-5 py-20 text-[#17213d] md:px-10 md:py-28">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24"><div><span className="inline-flex items-center gap-2 border border-[#aa8242]/45 bg-[#f7ecd5] px-3 py-2 text-xs font-bold tracking-[.08em] text-[#895f25]"><Check className="h-4 w-4" />שקיפות לפני הכול</span><h2 className="mt-6 font-serif text-5xl font-bold leading-[.98] md:text-6xl">הבטחה ברורה, בלי הבטחות ריקות.</h2><p className="mt-6 max-w-md leading-8 text-[#4d5361]">התאמה טובה היא לא רק מספר. היא גם הקשר, תנאי בסיס, תזמון ותחושת בטן מקצועית.</p></div><div className="space-y-3">{["התאמה נספרת רק כשהיא חדשה, נבדקה ונשלחה אלייך בפועל.", "אין שליחה כפולה במקום התאמה חדשה, ואין מילוי מכסה על חשבון תנאי סף מהותיים.", "גם התאמה שמתחת ל־80% יכולה להישלח כשאני מאמינה שיש בה פוטנציאל אמיתי לאחר בחינה מקצועית.", "אישור הדדי, פגישה או זוגיות אינם בשליטתי ולכן אינם חלק מהבטחת השירות."].map((item, index) => <div key={item} className="flex gap-5 bg-[#f9f5ed] p-5 shadow-[0_14px_35px_rgba(51,42,27,.06)]"><span className="font-serif text-3xl font-bold text-[#b18b4c]">0{index + 1}</span><p className="pt-1 text-sm leading-7 text-[#3f4655] md:text-base">{item}</p></div>)}</div></div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#111a31] px-5 py-20 md:px-10 md:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_92%_22%,rgba(216,182,126,.18),transparent_0_18%),radial-gradient(circle_at_75%_82%,rgba(81,103,160,.23),transparent_0_28%)]" />
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-24"><div className="max-w-2xl"><p className="text-xs font-bold tracking-[.16em] text-[#e9cf9e]">THE BOOST, EXPLAINED</p><h2 className="mt-5 font-serif text-5xl font-bold leading-[.98] text-white md:text-7xl">אז מה זה בדיוק בוסט?</h2><p className="mt-7 text-lg leading-8 text-white/78">הבוסט הוא הזדמנות נוספת, מעבר לשתי ההתאמות של Plus. הוא נוצר מתוך נתוני הפרופיל וההעדפות שלך, כדי להרחיב בעדינות את טווח האפשרויות שלך.</p><p className="mt-4 text-base leading-8 text-white/65">בוסט עשוי להגיע לפני בדיקה ידנית של הילית. לכן הוא מסומן בבירור כהצעת בוסט ואינו נספר כאחת משתי ההתאמות שלך. הוא נועד לפתוח דלת נוספת — לא להחליף שיקול דעת או את הבחירה שלך.</p></div><aside className="self-end border border-[#d8b67e]/35 bg-[#10182f]/70 p-7 backdrop-blur md:p-9"><div className="flex items-center gap-3 text-[#e9cf9e]"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold tracking-[.13em]">הבוסט במשפט אחד</span></div><p className="mt-6 font-serif text-3xl font-bold leading-tight text-white">הצעה נוספת, שקופה ומסומנת, שנועדה להעניק לפרופיל שלך הזדמנות להיראות עוד קצת.</p><p className="mt-7 border-t border-white/10 pt-5 text-sm leading-7 text-white/65">כל לקוח או לקוחה ב-Plus מאשרים מראש קבלת בוסטים ומבינים את משמעותם, כחלק מתנאי המסלול. אי-מימוש בוסט במחזור אינו מצטבר למחזור הבא.</p></aside></div>
      </section>

      <section id="checkout" className="relative overflow-hidden bg-[#0d1428] px-5 py-20 md:px-10 md:py-28">
        <div className="absolute -right-28 -top-36 h-96 w-96 rounded-full bg-[#d8b67e]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20"><div><p className="text-xs font-bold tracking-[.16em] text-[#e9cf9e]">YOUR CONFIRMATION</p><h2 className="mt-5 font-serif text-5xl font-bold leading-[.98] text-white md:text-6xl">מצטרפים בעיניים פקוחות.</h2><p className="mt-7 max-w-md leading-8 text-white/70">לפני התשלום, חשוב לי שהמסלול יהיה ברור. סמנו את ההסכמות, קראו את התנאים, ורק אז המשיכו לעמוד התשלום המאובטח.</p><div className="mt-9 space-y-3 text-sm text-white/65"><Link href="/terms/plus" className="flex items-center gap-3 transition-colors hover:text-[#e9cf9e]"><Info className="h-4 w-4 text-[#d8b67e]" />תקנון Plus, מדיניות ביטול והשתתפות בבוסט</Link><Link href="/terms/database" className="flex items-center gap-3 transition-colors hover:text-[#e9cf9e]"><Info className="h-4 w-4 text-[#d8b67e]" />תקנון המאגר ועדכוני Plus ובוסט</Link></div></div>
          <aside className="border border-[#d8b67e]/35 bg-[#f9f4eb] p-6 text-[#17213d] shadow-[0_30px_80px_rgba(0,0,0,.35)] md:p-8"><div className="flex items-start justify-between border-b border-[#17213d]/10 pb-6"><div><p className="text-xs font-bold tracking-[.13em] text-[#9a7031]">DATABASE PLUS</p><h3 className="mt-2 text-2xl font-bold">ההצטרפות שלך למסלול</h3></div><span className="font-serif text-4xl font-bold text-[#a77c37]">99₪</span></div>
            {!isPersonalLink && <div className="mt-5 border border-[#d8b67e]/40 bg-[#fff4d9] p-4 text-sm leading-6 text-[#654d20]">ההצטרפות מיועדת לחברים פעילים במאגר. התשלום ייפתח דרך הקישור האישי באזור האישי לאחר בדיקת זכאות.</div>}
            <div className="mt-6 space-y-3 text-sm"><label className="flex cursor-pointer items-start gap-3 border border-[#17213d]/15 bg-white p-4 leading-6"><Checkbox checked={renewalAccepted} onCheckedChange={value => setRenewalAccepted(Boolean(value))} /><span><strong>אני מאשר/ת חיוב חודשי מתחדש.</strong> החיוב יתחדש אוטומטית בכל חודש עד לביטול, וניתן לבטל את Plus בכל עת לפי מדיניות הביטול.</span></label><label className="flex cursor-pointer items-start gap-3 border border-[#17213d]/15 bg-white p-4 leading-6"><Checkbox checked={termsAccepted} onCheckedChange={value => setTermsAccepted(Boolean(value))} /><span><strong>קראתי את תקנון Plus ואני מסכים/ה לו.</strong> הבנתי שהמסלול כולל 2 התאמות חדשות לפחות במחזור פעיל, בכפוף לתנאי השירות.</span></label><label className="flex cursor-pointer items-start gap-3 border border-[#b78d4c]/50 bg-[#fff8e9] p-4 leading-6"><Checkbox checked={boostAccepted} onCheckedChange={value => setBoostAccepted(Boolean(value))} /><span><strong>אני מאשר/ת השתתפות אוטומטית בבוסטים.</strong> ברור לי שבוסט הוא הצעה נוספת מעבר לשתי ההתאמות, המבוססת על נתוני הפרופיל, עשויה להגיע לפני בדיקה ידנית ומסומנת בהתאם.</span></label><label className="flex cursor-pointer items-start gap-3 border border-[#17213d]/10 bg-[#f2efe8] p-4 leading-6"><Checkbox checked={spotlightInterest} onCheckedChange={value => setSpotlightInterest(Boolean(value))} /><span><strong>אשמח לשמוע על חשיפה בפינת הרווקים.</strong> זו בקשת עניין בלבד; שום תוכן לא יפורסם בלי אישור מפורש ונפרד שלי לתמונה ולטקסט.</span></label></div>
            {canPurchase ? <GrowWallet product="plus" buttonLabel="המשך לתשלום המאובטח של Grow" buttonClassName="mt-6 w-full rounded-none bg-[#d8b67e] py-4 text-[#10182f] hover:bg-[#f0d49a]" prefillName={`${plusData?.profile.firstName || ""} ${plusData?.profile.lastName || ""}`.trim()} prefillEmail={plusData?.profile.email || email} prefillPhone={plusData?.profile.phone || ""} termsPath="/terms/plus" personalToken={token} /> : <button disabled className="mt-6 flex w-full items-center justify-center gap-2 bg-[#d8b67e] px-5 py-4 text-sm font-bold text-[#10182f] disabled:cursor-not-allowed disabled:opacity-45">{!isPersonalLink ? "נדרש קישור אישי מהאזור האישי" : !plusData?.paymentConfigured ? "החיוב ייפתח לאחר חיבור Grow" : plusData?.status === "active" ? "המנוי שלך פעיל" : plusData?.status !== "eligible" && plusData?.status !== "invited" ? "נדרשת בדיקת זכאות" : "יש לאשר את שלוש ההסכמות"}<LockKeyhole className="h-4 w-4" /></button>}
            <p className="mt-4 text-center text-xs leading-5 text-[#606675]">לא יבוצע חיוב ללא קישור אישי, זכאות, אישור תנאי המנוי ועמוד הוראת קבע ייעודי של Grow.</p>
          </aside>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-[#0b1122] px-5 py-8 text-xs text-white/50 md:px-10"><div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4"><span>© הילית כספי — Plus</span><div className="flex gap-5"><Link href="/terms/plus" className="hover:text-[#d8b67e]">תקנון Plus</Link><Link href="/terms/database" className="hover:text-[#d8b67e]">תקנון המאגר</Link></div></div></footer>
    </main>
  );
}
