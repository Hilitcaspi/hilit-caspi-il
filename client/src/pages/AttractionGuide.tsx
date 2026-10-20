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
const GUIDE_NAME = "4 שיבושי החשיבה שהמוח מפעיל כשממש רוצים מישהו";

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
    description.content = "מדריך חינמי של הילית כספי על יוזמה, משיכה וכבוד עצמי. ארבעה שיבושי חשיבה, דוגמאות ומשפטים שעוזרים להכיר בלי לרדוף ובלי לוותר על עצמך.";
    if (!existingDescription) document.head.appendChild(description);
    document.title = "להשיג. בלי לאבד את עצמך | מדריך חינמי | הילית כספי";
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

      <header className="overflow-hidden bg-[#191265] px-5 pb-14 pt-12 text-white sm:px-10 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.4fr_0.8fr] md:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/35 px-4 py-2 text-xs font-medium text-[#ffe27c]"><Sparkles size={14} aria-hidden="true" />מהפודקאסט למדריך חינמי</div>
            <p className="mb-3 text-sm font-medium text-white/65">„כל אישה יכולה להשיג כל גבר?”</p>
            <h1 className="text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[1.08] tracking-tight">להשיג.<br /><span className="text-[#ffe27c]">בלי לאבד</span><br />את עצמך.</h1>
            <p className="mb-5 mt-7 max-w-xl text-xl font-bold leading-relaxed text-[#ffb5d0]">{GUIDE_NAME}</p>
            <p className="max-w-xl text-base leading-8 text-white/75">לא עוד טריק שיגרום למישהו לרדוף. דרך להראות עניין, ליצור קרבה ולבדוק אם יש מישהו בצד השני. בלי אודישן. בלי משחקי זמינות. בלי לוותר על מה שחשוב לך.</p>
            <a href="#guide" className={`mt-8 inline-flex items-center gap-3 rounded-full bg-[#ffe27c] px-7 py-4 font-bold text-[#191265] transition-transform duration-150 motion-reduce:transition-none active:scale-[0.97] ${focusClass}`}>לקריאת המדריך החינמי <ArrowDown size={18} aria-hidden="true" /></a>
            <p className="mt-4 text-xs text-white/60">המדריך פתוח כאן. בלי הרשמה ובלי לחכות למייל.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[330px] md:max-w-none">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-[130px_130px_28px_28px] border border-[#ffe27c]/30" aria-hidden="true" />
            <img src={PORTRAIT} alt="הילית כספי" className="relative aspect-[4/5] w-full rounded-[130px_130px_28px_28px] object-cover" fetchPriority="high" />
            <div className="relative -mt-10 mx-4 rounded-2xl bg-[#ffb5d0] px-5 py-5 text-[#191265] shadow-lg">
              <p className="text-lg font-black leading-snug">„אין גבר שאי פעם רציתי<br />ולא השגתי.”</p>
              <p className="mt-3 text-xs leading-5">זו החוויה האישית שלי. לא הבטחה לגבי כל אדם, ולא הזמנה להתעלם מסירוב.</p>
            </div>
          </div>
        </div>
      </header>

      {measurement === "undecided" && <aside aria-label="בחירת מדידת המדריך" className="border-b border-[#191265]/10 bg-[#ede6f1] px-5 py-4 sm:px-10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><p className="max-w-2xl text-xs leading-6 text-[#494453]">אפשר לאשר מדידת קריאה ולחיצות במדריך, כולל Meta Pixel, כדי לעזור לי להבין אילו תכנים מועילים. זו בחירה נפרדת מההרשמה לשירות, והמדריך זמין גם בלי אישור.</p><div className="flex gap-5 text-xs"><button type="button" onClick={() => setMeasurement("allowed")} className={`font-bold underline underline-offset-4 ${focusClass}`}>לאפשר מדידת המדריך</button><button type="button" onClick={() => setMeasurement("declined")} className={`underline underline-offset-4 ${focusClass}`}>לא עכשיו</button></div></div></aside>}

      <main>
        <section id="guide" className="scroll-mt-5 px-5 py-14 sm:px-10 md:py-20">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.5fr_1fr] md:gap-16">
            <div><p className="text-xs font-bold tracking-wide text-[#a13567]">לפני שמתחילים</p><h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">ביטחון הוא לא<br />היכולת לקבל כל „כן”.</h2></div>
            <div className="space-y-5 text-base leading-8 text-[#494453]">
              <p>אני חושבת שאפשר ללמוד ליצור משיכה. אפשר ליזום בלי להתנצל, לפלרטט בלי לשחק דמות ולתת לקשר זמן בלי להיעלם בתוכו. זה לא קסם. אלה מיומנויות.</p>
              <p>אבל גם המיומנות הכי טובה בעולם לא מחליטה במקום אדם אחר. „לא” אינו הזמנה למצוא שיטה משוכללת יותר. וסירוב לא מוכיח שמשהו חסר לך.</p>
              <p className="font-bold text-[#191265]">מה שמעניין אותי הוא לא כמה מהר מישהו ירצה אותך. אלא מה נשאר ממך בזמן שכל כך חשוב לך שזה יקרה.</p>
            </div>
          </div>
          <nav aria-label="פרקי המדריך" className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2">
            {attractionChapters.map((chapter, i) => <a key={chapter.id} href={`#${chapter.id}`} className={`flex items-center gap-4 rounded-2xl border border-[#191265]/10 bg-white px-5 py-4 text-sm font-bold transition-colors hover:bg-[#fff1f6] ${focusClass}`}><span className="text-xl text-[#a13567]">0{i + 1}</span>{chapter.title}<ArrowDown size={16} className="mr-auto shrink-0" aria-hidden="true" /></a>)}
          </nav>
        </section>

        {attractionChapters.map((chapter, i) => (
          <article id={chapter.id} key={chapter.id} className={`scroll-mt-5 border-t border-[#191265]/10 px-5 py-14 sm:px-10 md:py-20 ${i % 2 === 0 ? "bg-white" : "bg-[#f4e8ef]"}`}>
            <div className="mx-auto max-w-5xl md:grid md:grid-cols-[0.3fr_1fr] md:gap-12">
              <div className="mb-6 md:mb-0"><span className="text-6xl font-black leading-none text-[#191265]/15 md:text-8xl">0{i + 1}</span><p className="mt-4 text-xs font-bold text-[#a13567]">{chapter.kicker}</p></div>
              <div>
                <h2 className="max-w-2xl text-3xl font-black leading-tight md:text-4xl">{chapter.title}</h2>
                <div className="mt-7 space-y-5 text-base leading-8 text-[#494453]">{chapter.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                <div className="mt-7 rounded-2xl border border-[#191265]/10 bg-[#f8f4eb] p-5 sm:p-7"><p className="mb-3 text-xs font-bold text-[#a13567]">איך זה נראה בחיים</p><p className="text-base leading-8 text-[#494453]">{chapter.scene}</p></div>
                <div className="my-7 border-r-4 border-[#ff6c9c] pr-5"><p className="mb-2 text-xs font-bold text-[#a13567]">משפט שאפשר להגיד באמת</p><p className="text-xl font-bold leading-8">„{chapter.script}”</p></div>
                <div data-guide-milestone={`chapter_${i + 1}`} className="rounded-2xl bg-[#191265] p-6 text-white"><p className="mb-3 flex items-center gap-2 text-xs font-bold text-[#ffe27c]"><Check size={16} aria-hidden="true" />הבדיקה שלך</p><p className="text-base leading-8 text-white/85">{chapter.exercise}</p></div>
                <p className="mt-7 text-xl font-black leading-8 text-[#a13567]">{chapter.takeaway}</p>
              </div>
            </div>
          </article>
        ))}

        <section className="bg-[#ffe27c] px-5 py-14 sm:px-10">
          <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold text-[#191265]/65">זה ההבדל שאני רוצה שיישאר</p><h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">אפשר להיות ברורים.<br />אפשר גם להפסיק לשכנע.</h2><p className="mt-6 text-base leading-8">יוזמה היא הצעה. רדיפה היא ניסיון להחזיק לבד משהו שאמור להיות הדדי. לא צריך להסתיר עניין. צריך להבחין אם פוגשים אותו בחזרה.</p><p className="mt-6 text-xl font-bold leading-8">השאלה היא לא „איך להשיג כל אחד?”<br />אלא „עם מי יש סיבה טובה להמשיך?”</p></div>
        </section>

        <section id="next-step" className="scroll-mt-5 bg-[#191265] px-5 py-16 text-white sm:px-10 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div data-guide-milestone="next_step"><p className="text-xs font-bold text-[#ffb5d0]">מההבנה להיכרות</p><h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight md:text-5xl">משיכה אפשר ליצור.<br /><span className="text-[#ffe27c]">התאמה צריך לבדוק.</span></h2></div>
            <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
              <div className="space-y-5 text-base leading-8 text-white/75"><p>אפשר לדעת בדיוק איך להתחיל שיחה, ועדיין לפגוש שוב ושוב אנשים שלא רוצים את אותו הדבר. מיומנויות זו חצי מהתמונה. החצי השני הוא מי שמולך.</p><p>בשביל זה בניתי את מאגר ההיכרויות שלי. לא כדי להבטיח שכל אדם שמעניין אותך יבחר בך, אלא כדי לבדוק התאמה משני הצדדים לפני שמתחילה עוד השקעה רגשית.</p><p>אני עוברת אישית על הפרופילים. השאלונים, ההעדפות וחישוב ההתאמה עוזרים לבדוק מה חשוב לשני הצדדים, וכל הצעה עוברת גם בדיקה אנושית.</p></div>
              <div className="rounded-3xl border border-white/20 bg-white/5 p-6 sm:p-8">
                <h3 className="text-xl font-black text-[#ffe27c]">לא עוד אודישן. בדיקה הדדית.</h3>
                <ul className="mt-5 space-y-4 text-sm leading-6 text-white/85">{["שאלוני עומק והעדפות של שני הצדדים", "בדיקה אנושית לפני שליחת הצעה", "כל צד בוחר בנפרד אם להתקדם", "פרטי הקשר נחשפים רק לאחר אישור הדדי"].map(text => <li key={text} className="flex items-start gap-3"><Check size={17} className="mt-1 shrink-0 text-[#ffe27c]" aria-hidden="true" />{text}</li>)}</ul>
                <Link href={attractionHref("database", "main")} onClick={() => clicked("database", "main")} className={`mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#ffe27c] px-5 py-4 text-center font-bold text-[#191265] transition-transform duration-150 motion-reduce:transition-none active:scale-[0.97] ${focusClass}`} data-guide-cta="database">למאגר ההיכרויות של הילית <ArrowLeft size={18} className="shrink-0" aria-hidden="true" /></Link>
                <p className="mt-4 text-xs leading-6 text-white/65">הצטרפות בתשלום חד־פעמי למאגר. במסלול הרגיל אין התחייבות למספר התאמות, לתדירות או לתוצאה. המדריך החינמי אינו מקנה חברות במאגר.</p>
              </div>
            </div>
            <div className="mt-10 border-t border-white/15 pt-7 text-sm leading-7 text-white/70"><p>עוד לא הזמן להיכרות חדשה? אפשר להתחיל מבפנים.</p><div className="mt-3 flex flex-wrap gap-x-6 gap-y-3"><Link href={attractionHref("guide", "secondary")} onClick={() => clicked("guide", "secondary")} className={`font-bold text-[#ffb5d0] underline underline-offset-4 ${focusClass}`} data-guide-cta="paid-guide">המדריך בתשלום „לבחור נכון”</Link><Link href={attractionHref("dna", "secondary")} onClick={() => clicked("dna", "secondary")} className={`text-[#ffe27c] underline underline-offset-4 ${focusClass}`}>שאלון DNA חינמי</Link></div></div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-10"><div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2"><div><p className="text-xs font-bold text-[#a13567]">ולגברים שהציצו</p><h2 className="mt-3 text-2xl font-black">לא, אני לא מלמדת „לשחק בכם”.</h2><p className="mt-4 text-base leading-8 text-[#494453]">אני מלמדת להראות עניין בלי לבטל את עצמנו. נשמע מוכר גם מהצד שלכם? מחכה לשמוע בתגובות לסרטון הפודקאסט. ואפשר כמובן להכיר במאגר, בלי להיות צריכים לנחש מי אמור לעשות את הצעד הראשון.</p></div><div className="rounded-2xl border border-[#191265]/15 bg-white p-6"><h2 className="text-2xl font-black">עוד מילים שעושות סדר</h2><p className="mt-4 text-base leading-8 text-[#494453]">לקבוצת הווטסאפ השקטה שלי, עם תכנים ועדכונים על היכרות וזוגיות. ההצטרפות בחינם, ואפשר לצאת בכל רגע.</p><a href={attractionHref("community", "footer")} onClick={() => clicked("community", "footer")} target="_blank" rel="noopener noreferrer" className={`mt-5 inline-flex items-center gap-2 font-bold text-[#191265] underline underline-offset-4 ${focusClass}`}><MessageCircle size={18} aria-hidden="true" />לקבוצת הווטסאפ השקטה</a></div></div></section>
      </main>
      <footer className="bg-[#0d0b3a] px-5 py-7 text-center text-xs leading-6 text-white/60"><p>הילית כספי · מדריך מקורי על היכרות, בחירה וכבוד עצמי</p><p className="mt-2">דוגמאות להמחשה בלבד. לא אבחון, לא הבטחה לתוצאה ולא שיטה לעקוף סירוב.</p><div className="mt-3 flex justify-center gap-6"><Link href="/terms/database" className={`underline ${focusClass}`}>תקנון המאגר</Link><Link href="/" className={`underline ${focusClass}`}>חזרה לאתר</Link></div></footer>
    </div>
  );
}
