import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowLeft, Check, MessageCircle, Sparkles } from "lucide-react";
import { attractionChapters } from "@shared/attractionGuideContent";
import { attractionHref, ATTRACTION_CAMPAIGN, type AttractionDestination } from "@shared/attractionFunnel";
import { captureAcquisition } from "@/lib/acquisitionTracking";
import { getUtmParams } from "@/lib/utils";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";

const PORTRAIT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const GUIDE_NAME = "4 שיבושי החשיבה שהמוח מפעיל כשאת ממש רוצה אותו";

export default function AttractionGuide() {
  const viewed = useRef(false);
  const milestones = useRef(new Set<string>());
  const [measurement, setMeasurement] = useState<"undecided" | "allowed" | "declined">("undecided");

  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const description = existingDescription ?? document.createElement("meta");
    const previousDescription = description.content;
    description.name = "description";
    description.content = "אין גבר שרציתי ולא השגתי. מדריך חינמי של הילית כספי על קלילות, ביטחון ופלרטוט. ארבע טעויות שמפריעות לחיבור ומה לעשות במקומן.";
    if (!existingDescription) document.head.appendChild(description);
    document.title = `${GUIDE_NAME} | הילית כספי`;
    return () => {
      document.title = previousTitle;
      if (existingDescription) existingDescription.content = previousDescription;
      else description.remove();
    };
  }, []);

  useEffect(() => {
    if (measurement !== "allowed") return;
    captureAcquisition();
    if (!viewed.current) {
      viewed.current = true;
      track({ eventType: "guide_view", ...getUtmParams(), metadata: { guide: ATTRACTION_CAMPAIGN } });
      trackViewContent({ content_name: GUIDE_NAME, content_category: "free_guide" });
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const milestone = entry.target.getAttribute("data-guide-milestone");
        if (!entry.isIntersecting || !milestone || milestones.current.has(milestone)) continue;
        milestones.current.add(milestone);
        track({ eventType: "section_view", ...getUtmParams(), metadata: { guide: ATTRACTION_CAMPAIGN, milestone } });
      }
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-guide-milestone]").forEach(node => observer.observe(node));
    return () => {
      observer.disconnect();
    };
  }, [measurement]);

  const clicked = (destination: AttractionDestination, placement: string) => {
    if (measurement !== "allowed") return;
    captureAcquisition();
    track({
      eventType: destination === "database" ? "database_cta" : destination === "community" ? "whatsapp_click" : "product_click",
      ...getUtmParams(),
      metadata: { guide: ATTRACTION_CAMPAIGN, destination, placement },
    });
  };
  const focusClass = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff6c9c]";

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-[#f8f4eb] font-rubik text-[#191265] selection:bg-[#ffe27c] selection:text-[#191265]">
      <a href="#guide" className={`sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4 ${focusClass}`}>דילוג למדריך</a>
      <nav aria-label="ניווט המדריך" className="border-b border-white/15 bg-[#191265] px-5 py-5 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className={`text-lg font-black ${focusClass}`}>הילית כספי<span className="mr-3 text-xs font-normal text-white/60">מילים שעושות סדר</span></Link>
          <a href="#next-step" className={`text-sm text-[#ffe27c] underline-offset-4 hover:underline ${focusClass}`}>מה עושים עם זה?</a>
        </div>
      </nav>

      <header className="overflow-hidden bg-[#191265] px-5 pb-10 pt-10 text-white sm:px-10 md:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1.4fr_0.8fr] md:gap-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/35 px-4 py-2 text-xs font-medium text-[#ffe27c]"><Sparkles size={14} aria-hidden="true" />מהפודקאסט למדריך חינמי</div>
            <h1 data-guide-quote className="text-[clamp(2.7rem,6vw,4.6rem)] font-black leading-[1.12] tracking-tight">״אין גבר שרציתי<br /><span className="text-[#ffe27c]">ולא השגתי.״</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">לא כי אני הכי יפה. לא כי אני הכי צעירה. לא כי אני הכי אטרקטיבית.</p>
            <p className="mt-3 max-w-xl text-base leading-8 text-white/80">זה קשור לאנרגיה שאני מביאה. לקלילות. לביטחון. ליכולת להראות עניין בלי להילחץ ממנו. ואת זה אני רוצה ללמד.</p>
            <p className="mt-5 max-w-xl text-xl font-bold leading-relaxed text-[#ffb5d0]">{GUIDE_NAME}</p>
            <a href="#guide" className={`mt-6 inline-flex items-center gap-3 rounded-full bg-[#ffe27c] px-7 py-4 font-bold text-[#191265] transition-transform duration-150 motion-reduce:transition-none active:scale-[0.97] ${focusClass}`}>לקריאת המדריך החינמי <ArrowDown size={18} aria-hidden="true" /></a>
            <p className="mt-3 text-xs text-white/60">המדריך פתוח כאן. בלי הרשמה ובלי לחכות למייל.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-[130px_130px_28px_28px] border border-[#ffe27c]/30" aria-hidden="true" />
            <img src={PORTRAIT} alt="הילית כספי" className="relative aspect-[4/5] w-full rounded-[130px_130px_28px_28px] object-cover" fetchPriority="high" />
            <div className="relative -mt-8 mx-4 rounded-2xl bg-[#ffb5d0] px-5 py-4 text-[#191265] shadow-lg"><p className="text-lg font-black leading-snug">אפשר לרצות אותו.<br />ולהישאר לגמרי את.</p></div>
          </div>
        </div>
      </header>

      {measurement === "undecided" && <aside aria-label="בחירת מדידת המדריך" className="border-b border-[#191265]/10 bg-[#ede6f1] px-5 py-4 sm:px-10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><p className="max-w-2xl text-xs leading-6 text-[#494453]">אפשר לאשר מדידת קריאה ולחיצות במדריך, כולל Meta Pixel, כדי לעזור לי להבין אילו תכנים מועילים. זו בחירה נפרדת מההרשמה לשירות, והמדריך זמין גם בלי אישור.</p><div className="flex gap-5 text-xs"><button type="button" onClick={() => setMeasurement("allowed")} className={`font-bold underline underline-offset-4 ${focusClass}`}>לאפשר מדידת המדריך</button><button type="button" onClick={() => setMeasurement("declined")} className={`underline underline-offset-4 ${focusClass}`}>לא עכשיו</button></div></div></aside>}

      <main>
        <section id="guide" className="scroll-mt-5 px-5 py-8 sm:px-10 md:py-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">קלילות היא לא להעמיד פנים שלא אכפת לך.</h2>
            <div className="mt-5 space-y-3 text-base leading-8 text-[#494453]">
              <p>קלילות היא להיות איתו בלי לנסות להבטיח כבר עכשיו מה יקרה ביניכם. ליהנות מהשיחה. לצחוק. לפלרטט. להגיד מה את חושבת. בלי לחשב כל מילה כאילו היא תקבע אם הוא ירצה אותך.</p>
              <p>כשאני רוצה גבר, אני לא מנסה להפוך לאישה שנדמה לי שהוא מחפש. אני נעימה, אבל לא אומרת כן לכל דבר. אני מראה עניין, אבל לא מנהלת לבד את כל ההיכרות. ויש לי חיים שאני לא מבטלת כי הגיע מישהו שמדליק אותי.</p>
              <p className="font-bold text-[#191265]">אלה ארבע הטעויות שאני רוצה שתפסיקי לעשות.</p>
            </div>
            <nav aria-label="פרקי המדריך" className="mt-6 grid gap-2 sm:grid-cols-2">
              {attractionChapters.map((chapter, i) => <a key={chapter.id} href={`#${chapter.id}`} className={`flex items-center gap-3 rounded-xl border border-[#191265]/10 bg-white px-4 py-3 text-sm font-bold transition-colors hover:bg-[#fff1f6] ${focusClass}`}><span className="text-xl text-[#a13567]">0{i + 1}</span>{chapter.title}<ArrowDown size={16} className="mr-auto shrink-0" aria-hidden="true" /></a>)}
            </nav>
          </div>
        </section>

        {attractionChapters.map((chapter, i) => (
          <article id={chapter.id} key={chapter.id} className={`scroll-mt-5 border-t border-[#191265]/10 px-5 py-8 sm:px-10 md:py-10 ${i % 2 === 0 ? "bg-white" : "bg-[#f4e8ef]"}`}>
            <div className="mx-auto max-w-3xl">
              <p className="mb-3 text-xs font-bold text-[#a13567]">0{i + 1} · {chapter.kicker}</p>
              <h2 className="text-3xl font-black leading-tight md:text-4xl">{chapter.title}</h2>
              <div className="mt-5 space-y-3 text-base leading-8 text-[#494453]">{chapter.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
              <div className="mt-5 rounded-xl border border-[#191265]/10 bg-[#f8f4eb] p-5"><p className="mb-2 text-xs font-bold text-[#a13567]">בפועל</p><p className="text-base leading-8 text-[#494453]">{chapter.scene}</p></div>
              <div className="my-5 border-r-4 border-[#ff6c9c] pr-4"><p className="mb-2 text-xs font-bold text-[#a13567]">אפשר לומר</p><p className="text-xl font-bold leading-8">״{chapter.script}״</p></div>
              <div data-guide-milestone={`chapter_${i + 1}`} className="rounded-xl bg-[#191265] p-5 text-white"><p className="mb-2 flex items-center gap-2 text-xs font-bold text-[#ffe27c]"><Check size={16} aria-hidden="true" />נסי את זה</p><p className="text-base leading-8 text-white/85">{chapter.exercise}</p></div>
              <p className="mt-5 text-xl font-black leading-8 text-[#a13567]">{chapter.takeaway}</p>
            </div>
          </article>
        ))}

        <section className="bg-[#ffe27c] px-5 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl"><h2 className="text-3xl font-black leading-tight md:text-4xl">מותר לך לרצות אותו.<br />את לא צריכה להתכווץ בשביל זה.</h2><p className="mt-4 text-base leading-8">תהיי ברורה. תהיי סקרנית. תני מקום להומור ולמשיכה. תראי לו שאת מעוניינת, ואז תראי מה הוא עושה עם זה. לא הכול תלוי בך, ולא הכול צריך לקרות ברגע הראשון.</p><p className="mt-4 text-xl font-bold leading-8">את לא צריכה עוד משחק. את צריכה יותר ביטחון להיות את.</p></div>
        </section>

        <section id="next-step" className="scroll-mt-5 bg-[#191265] px-5 py-10 text-white sm:px-10 md:py-12">
          <div className="mx-auto max-w-5xl">
            <div data-guide-milestone="next_step"><p className="text-xs font-bold text-[#ffb5d0]">ועכשיו, עם מי עושים את זה?</p><h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">משיכה אפשר ליצור.<br /><span className="text-[#ffe27c]">התאמה צריך לבדוק.</span></h2></div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-10">
              <div className="space-y-3 text-base leading-8 text-white/80"><p>לדעת לפלרטט זה נהדר. אבל את רוצה גם מישהו שמתאים לך. שרוצה קשר דומה, ושאפשר לבנות איתו משהו מעבר לדייט מוצלח.</p><p>במאגר ההיכרויות שלי אנחנו מתחילים ממה שחשוב לך ומה שחשוב לצד השני. שאלוני עומק, העדפות ובדיקה אישית שלי לפני שליחת הצעה. לא עוד שעות של גלילה וניחושים.</p><p>את מקבלת הצעה, בודקת ומחליטה. גם הצד השני מחליט בנפרד. פרטי הקשר נחשפים רק לאחר אישור הדדי.</p></div>
              <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
                <h3 className="text-xl font-black text-[#ffe27c]">בואי נכיר מישהו שמתאים לך.</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/85">{["שאלוני עומק והעדפות של שני הצדדים", "בדיקה אישית לפני שליחת הצעה", "כל צד בוחר בנפרד אם להתקדם", "פרטי הקשר נחשפים רק לאחר אישור הדדי"].map(text => <li key={text} className="flex items-start gap-3"><Check size={17} className="mt-1 shrink-0 text-[#ffe27c]" aria-hidden="true" />{text}</li>)}</ul>
                <Link href={attractionHref("database", "main")} onClick={() => clicked("database", "main")} className={`mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#ffe27c] px-5 py-4 text-center font-bold text-[#191265] transition-transform duration-150 motion-reduce:transition-none active:scale-[0.97] ${focusClass}`} data-guide-cta="database">למאגר ההיכרויות של הילית <ArrowLeft size={18} className="shrink-0" aria-hidden="true" /></Link>
                <p className="mt-3 text-xs leading-6 text-white/65">הצטרפות בתשלום חד־פעמי למאגר. במסלול הרגיל אין התחייבות למספר התאמות, לתדירות או לתוצאה. המדריך החינמי אינו מקנה חברות במאגר.</p>
              </div>
            </div>
            <div className="mt-6 border-t border-white/15 pt-5 text-sm leading-7 text-white/80"><p>רוצה לעבוד גם על הבחירות שלך? במדריך בתשלום ״לבחור נכון״ מחכים שאלון אישי, תרגילים וכלים לבחירה. ואפשר להתחיל משאלון DNA החינמי.</p><div className="mt-3 flex flex-wrap gap-x-6 gap-y-3"><Link href={attractionHref("guide", "secondary")} onClick={() => clicked("guide", "secondary")} className={`font-bold text-[#ffb5d0] underline underline-offset-4 ${focusClass}`} data-guide-cta="paid-guide">למדריך בתשלום ״לבחור נכון״</Link><Link href={attractionHref("dna", "secondary")} onClick={() => clicked("dna", "secondary")} className={`text-[#ffe27c] underline underline-offset-4 ${focusClass}`}>לשאלון DNA החינמי</Link></div></div>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-10"><div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2"><div><p className="text-xs font-bold text-[#a13567]">ולגברים שהציצו</p><h2 className="mt-3 text-2xl font-black">נו, מה אתם אומרים?</h2><p className="mt-3 text-base leading-8 text-[#494453]">אישה שנהנית, מראה עניין ונשארת היא עצמה. זה מושך גם בעיניכם? תגיבו לסרטון הפודקאסט. אני רוצה לשמוע את הצד שלכם. ואם בא לכם להכיר, המאגר פתוח גם לכם.</p><Link href={attractionHref("database", "men")} onClick={() => clicked("database", "men")} className={`mt-3 inline-flex items-center gap-2 font-bold underline underline-offset-4 ${focusClass}`}>גם אני רוצה להכיר <ArrowLeft size={16} aria-hidden="true" /></Link></div><div className="rounded-xl border border-[#191265]/15 bg-white p-5"><h2 className="text-2xl font-black">נמשיך לדבר על זה?</h2><p className="mt-3 text-base leading-8 text-[#494453]">בקבוצת הווטסאפ השקטה שלי יש תכנים ועדכונים על היכרות וזוגיות. ההצטרפות בחינם.</p><a href={attractionHref("community", "footer")} onClick={() => clicked("community", "footer")} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-2 font-bold text-[#191265] underline underline-offset-4 ${focusClass}`}><MessageCircle size={18} aria-hidden="true" />לקבוצת הווטסאפ השקטה</a></div></div></section>
      </main>
      <footer className="bg-[#0d0b3a] px-5 py-6 text-center text-xs leading-6 text-white/60"><p>הילית כספי · {GUIDE_NAME}</p><div className="mt-3 flex justify-center gap-6"><Link href="/terms/database" className={`underline ${focusClass}`}>תקנון המאגר</Link><Link href="/" className={`underline ${focusClass}`}>חזרה לאתר</Link></div></footer>
    </div>
  );
}
