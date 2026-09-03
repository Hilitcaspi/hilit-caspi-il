import { useEffect, useMemo } from "react";
import { ArrowLeft, Check, ChevronDown, Heart, LockKeyhole, ShieldCheck, Sparkles, Zap } from "lucide-react";
import AnonymousBoostSilhouette from "@/components/AnonymousBoostSilhouette";
import { gaViewItem } from "@/lib/ga";
import { trackViewContent } from "@/lib/metaPixel";
import { track } from "@/lib/track";

const HERO_IMAGE = "/manus-storage/boost-hilit-doorway-v3_28018118.jpeg";
const CLOSEUP_IMAGE = "/manus-storage/boost-hilit-closeup-v3_e29a47ce.jpeg";

const benefits = [
  [Zap, "יותר בחירה בידיים שלכם", "אפשרויות נוספות שנמצאו מתאימות לפי האלגוריתם ומחכות לבדיקה באזור האישי."],
  [LockKeyhole, "הפרטיות נשמרת", "לפני השליחה הכרטיס אנונימי. השם, התמונה ופרטי הקשר אינם מוצגים בכרטיס."],
  [Heart, "אישור של שני הצדדים", "אחרי שליחת Boost כל צד מקבל את ההצעה במייל ומחליט בעצמו אם לאשר."],
] as const;

const steps = [
  ["01", "נכנסים לאזור האישי", "הקישור האישי מוביל לטאב ההתאמות ולמקטע Boost."],
  ["02", "פותחים את הכרטיס", "רואים אחוז התאמה ופרטים מרכזיים בלי שם ובלי תמונה."],
  ["03", "בוחרים אם לשלוח", "רק אם האפשרות מסקרנת, שולחים Boost בתשלום חד פעמי של 19.90 ₪."],
  ["04", "כל צד מחליט", "ההצעה נשלחת לשני הצדדים. פרטי הקשר נחשפים רק לאחר שני אישורים."],
] as const;

function ProductCard() {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/25 bg-[linear-gradient(145deg,rgba(49,20,91,.98),rgba(115,36,123,.98))] p-5 text-right text-white shadow-[0_28px_80px_rgba(17,5,45,.42)] sm:p-6">
      <div className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#fd73bd]/25 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#ffe27c] px-3 py-1 text-[10px] font-black text-[#4b235f]">המחשה</span>
        <span className="text-xs font-black text-[#ffe27c]">אפשרות Boost</span>
      </div>
      <div className="relative mt-5 flex items-center gap-4">
        <AnonymousBoostSilhouette className="h-28 w-24 shrink-0 sm:h-32 sm:w-28" />
        <div className="min-w-0 flex-1">
          <div className="inline-grid h-20 w-20 place-items-center rounded-full border-4 border-[#ffe27c]/90 bg-white/8 text-center shadow-[0_0_28px_rgba(255,226,124,.18)]">
            <span className="text-[11px] font-black leading-4 text-white">אחוז<br />התאמה</span>
          </div>
          <h3 className="mt-4 text-lg font-black">יש כאן חיבור ששווה לבדוק</h3>
          <p className="mt-1 text-xs leading-5 text-white/70">פותחים לפרטים האנונימיים ולסיבות ההתאמה</p>
        </div>
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-[#ffe27c]"><ChevronDown className="h-5 w-5" /></span>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-2">
        {["גיל", "אזור", "תחום עיסוק"].map(label => (
          <div key={label} className="rounded-xl border border-white/15 bg-white/[0.08] p-3">
            <p className="text-[9px] font-bold text-[#ffe27c]">{label}</p>
            <div className="mt-2 h-2 rounded-full bg-white/25" />
          </div>
        ))}
      </div>
      <div className="relative mt-5 rounded-2xl bg-white p-4 text-[#281147]">
        <p className="text-xs font-black">משלמים רק כשבוחרים לשלוח</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-2xl font-black text-[#a52178]">19.90 ₪</span>
          <span className="rounded-xl bg-[linear-gradient(90deg,#d62d93,#7b268b)] px-4 py-2 text-xs font-black text-white">שליחת Boost</span>
        </div>
      </div>
    </article>
  );
}

export default function BoostSalesLanding() {
  const dashboardHref = useMemo(() => {
    const incoming = new URLSearchParams(window.location.search);
    const outgoing = new URLSearchParams({ tab: "matches" });
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "meta_campaign_id", "meta_adset_id", "meta_ad_id", "meta_placement", "site_source_name"].forEach(key => {
      const value = incoming.get(key);
      if (value) outgoing.set(key, value);
    });
    return `/my-profile?${outgoing.toString()}#boost-card`;
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = "Boost לחברי המאגר | הילית כספי";
    gaViewItem("match_boost");
    trackViewContent({ content_name: "Boost לחברי המאגר", content_category: "matchmaking" });
    track({ eventType: "page_view", page: "/boost-now", metadata: { product: "match_boost", value: 19.9 } });
    return () => { document.title = previous; };
  }, []);

  const openPersonalArea = (placement: string) => {
    track({ eventType: "product_click", page: "/boost-now", metadata: { product: "match_boost", action: "open_personal_area", placement, value: 19.9 } });
    window.location.assign(dashboardHref);
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#faf6ff] font-rubik text-[#24113f]">
      <section className="relative isolate overflow-hidden bg-[#17082f] text-white">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_14%_16%,rgba(253,115,189,.34),transparent_0_28%),radial-gradient(circle_at_78%_12%,rgba(255,226,124,.16),transparent_0_24%),linear-gradient(142deg,#120624_0%,#3c1058_46%,#8d226f_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:22px_22px]" />
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <a href="/" className="font-black text-white">הילית כספי</a>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur">לחברי המאגר שאישרו Boost</span>
        </header>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 sm:pb-24 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:px-8 lg:pt-12">
          <div className="relative z-10 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#4b235f] shadow-lg"><Sparkles className="h-4 w-4" />ביקשתם יותר אפשרויות. אני מקשיבה לכם.</div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-[-.045em] sm:text-6xl lg:text-7xl">
              שירות Boost החדש
              <span className="block bg-gradient-to-l from-[#ffe27c] via-white to-[#ff9fd1] bg-clip-text text-transparent">והבחירה גם בידיים שלכם.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-white/86 sm:text-xl">באמצעות Boost אפשר לראות באזור האישי אפשרויות נוספות שנמצאו מתאימות לפי האלגוריתם, ולבחור בעצמכם למי לשלוח בקשת התאמה.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => openPersonalArea("hero")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#ff3f9f,#d72b91)] px-7 py-4 text-base font-black text-white shadow-[0_16px_40px_rgba(255,63,159,.34)] transition duration-200 hover:-translate-y-0.5 active:scale-[.97]">לראות את האפשרויות שלי <ArrowLeft className="h-5 w-5" /></button>
              <p className="text-center text-xs font-bold leading-5 text-white/65 sm:text-right">האישור לשירות עצמו בחינם<br />התשלום מופיע רק כשבוחרים לשלוח</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-white/76">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />כרטיס אנונימי לפני השליחה</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />שני הצדדים מחליטים</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#ffe27c]" />פרטי קשר רק לאחר אישור הדדי</span>
            </div>
          </div>

          <div className="relative order-1 min-h-[410px] overflow-hidden rounded-[2.25rem] border border-white/20 shadow-[0_28px_80px_rgba(10,2,25,.38)] lg:order-2 lg:min-h-[650px]">
            <img src={HERO_IMAGE} alt="הילית כספי" className="absolute inset-0 h-full w-full object-cover object-[48%_30%]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,7,47,.04)_30%,rgba(22,7,47,.84)_100%)]" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/20 bg-[#29104f]/75 p-4 text-white shadow-2xl backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-5">
              <p className="text-xs font-black text-[#ffe27c]">הילית כספי</p>
              <p className="mt-1 text-sm font-bold leading-6 text-white/86">אתם ביקשתם יותר אפשרויות. Boost נותן לכם דרך נוספת לבחור ולהכיר.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#a52178]">כך Boost נראה בפועל</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">פותחים כרטיס, בודקים ובוחרים בעצמכם.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#675b72]">הכרטיס מציג מידע מרכזי ואחוז התאמה בלי לחשוף זהות. התשלום מתבצע רק מתוך כרטיס אישי שעומד בתנאי הזכאות.</p>
        </div>
        <div className="mx-auto mt-11 max-w-2xl"><ProductCard /></div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map(([Icon, title, text]) => (
              <article key={title} className="rounded-[1.75rem] border border-[#eadff3] bg-[linear-gradient(160deg,#fff,#fbf6ff)] p-6 text-right shadow-[0_16px_40px_rgba(74,29,99,.06)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#4b185f] text-[#ffe27c]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6f627a]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#241257] px-4 py-16 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#fd73bd]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-[#3a1761] shadow-2xl">
            <img src={CLOSEUP_IMAGE} alt="הילית כספי" className="aspect-[4/5] w-full object-cover object-[50%_24%]" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#ffe27c]">ארבעה צעדים פשוטים</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">רואים. בודקים. בוחרים בעצמכם.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {steps.map(([number, title, text]) => (
                <article key={number} className="rounded-2xl border border-white/15 bg-white/[.08] p-5 backdrop-blur">
                  <span className="text-2xl font-black text-[#ffe27c]">{number}</span>
                  <h3 className="mt-3 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/72">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2.25rem] bg-[radial-gradient(circle_at_14%_10%,#fd73bd_0,transparent_30%),linear-gradient(145deg,#180b43,#6f1d78)] p-7 text-center text-white shadow-[0_28px_80px_rgba(59,19,85,.24)] sm:p-12">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#ffe27c]" />
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">רוצים לראות אילו אפשרויות מחכות לכם?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/82">אם יש כרטיס Boost זמין באזור האישי, אפשר לפתוח אותו, לראות את הפרטים האנונימיים ולבחור אם תרצו לשלוח בקשת התאמה.</p>
          <button type="button" onClick={() => openPersonalArea("final_cta")} className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffe27c] px-8 py-4 text-base font-black text-[#3f174d] shadow-xl transition duration-200 hover:-translate-y-0.5 active:scale-[.97]">לבדוק את אפשרויות ה־Boost שלי <ArrowLeft className="h-5 w-5" /></button>
          <p className="mt-4 text-xs font-bold text-white/60">לחברי המאגר שאישרו את השירות. התשלום מופיע רק בעת בחירת כרטיס לשליחה.</p>
        </div>
      </section>

      <footer className="border-t border-[#eadff3] bg-white px-4 py-8 text-center text-xs text-[#766d80]">
        <p className="font-black text-[#251064]">Boost מבית הילית כספי</p>
        <p className="mt-2">אפשרות נוספת לחברי המאגר. הבחירה בידיים שלכם והמשך ההתאמה דורש אישור של שני הצדדים.</p>
        <a href="/terms/match-boost" className="mt-3 inline-block font-bold text-[#8b2a8c] underline underline-offset-4">תקנון Boost</a>
      </footer>

      <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-white/20 bg-[#241257]/95 p-3 shadow-2xl backdrop-blur sm:hidden">
        <button type="button" onClick={() => openPersonalArea("mobile_sticky")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#ff3f9f,#d72b91)] px-5 py-3.5 text-sm font-black text-white active:scale-[.97]">לראות את האפשרויות שלי <ArrowLeft className="h-4 w-4" /></button>
      </div>
    </main>
  );
}
