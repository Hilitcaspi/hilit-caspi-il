import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { attractionChapters, attractionIntro } from "@shared/attractionGuideContent";
import { attractionHref, ATTRACTION_CAMPAIGN, type AttractionDestination } from "@shared/attractionFunnel";
import { captureAcquisition } from "@/lib/acquisitionTracking";
import { getUtmParams } from "@/lib/utils";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";

const PORTRAIT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const GUIDE_NAME = "תני לו לרצות אותך. בלי להפסיק להיות את.";

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
    description.content = "אין גבר שרציתי ולא השגתי. מאמר אישי של הילית כספי על חיזור, קלילות וביטחון: עניין בדייט, מקום ליוזמה שלו וחיים מלאים. דוגמה מהקליניקה ודרך לבחור נכון.";
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
  const textLink = `font-medium text-[#94265b] underline decoration-[#d792b1] underline-offset-4 transition-colors hover:text-[#191265] ${focusClass}`;

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-[#faf6ef] font-rubik text-[#25222d] selection:bg-[#ffe27c] selection:text-[#191265]">
      <a href="#guide" className={`sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4 ${focusClass}`}>דילוג לתוכן</a>
      <nav aria-label="ניווט המדריך" className="border-b border-white/15 bg-[#191265] px-5 py-5 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className={`text-lg font-black ${focusClass}`}>הילית כספי</Link>
          <span className="text-xs text-white/70">מדריך חינמי · מהפודקאסט לדייט הבא</span>
        </div>
      </nav>

      <header className="overflow-hidden bg-[#191265] px-5 pb-9 pt-8 text-white sm:px-10 md:py-12">
        <div className="mx-auto grid max-w-6xl items-center gap-7 md:grid-cols-[1.5fr_0.8fr] md:gap-14">
          <div>
            <p className="mb-5 text-xs font-medium tracking-wide text-[#ffb5d0]">תני לו לרצות אותך. בלי להפסיק להיות את.</p>
            <h1 data-guide-quote className="max-w-3xl text-[clamp(2.7rem,6vw,4.8rem)] font-black leading-[1.12] tracking-tight">״אין גבר שרציתי<br /><span className="text-[#ffe27c]">ולא השגתי.״</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/95">לא כי אני הכי יפה. לא כי אני הכי צעירה. לא כי אני הכי אטרקטיבית.</p>
            <p className="mt-3 max-w-xl text-base leading-8 text-white/80">זה קשור לאנרגיה שאני מביאה. לקלילות, לביטחון וליכולת להראות עניין בלי להפוך את כל החיים שלי להמתנה לתגובה שלו. בואי נדבר על איך עושים את זה.</p>
          </div>
          <div className="flex items-center gap-4 md:block">
            <img src={PORTRAIT} alt="הילית כספי" width={320} height={400} className="h-24 w-24 shrink-0 rounded-full object-cover object-top md:h-auto md:w-full md:rounded-[8rem_8rem_1.25rem_1.25rem]" fetchPriority="high" />
            <div className="md:mt-4"><p className="text-base font-bold text-[#ffb5d0]">הילית כספי</p><p className="mt-1 text-sm leading-6 text-white/70">מאמנת לזוגיות ומשדכת.<br />על משיכה, בחירה ומה שקורה ביניהן.</p></div>
          </div>
        </div>
      </header>

      <main>
        <article id="guide" aria-label={GUIDE_NAME} data-guide-editorial className="mx-auto max-w-[47rem] scroll-mt-6 px-5 pb-9 pt-8 sm:px-8 md:pb-12 md:pt-10">
          <div className="space-y-5 text-[17px] leading-[1.95] sm:text-[18px]">
            {attractionIntro.map((text, index) => <p key={index} className={index === 0 ? "text-[20px] font-medium leading-[1.85] text-[#191265] sm:text-[22px]" : undefined}>{text}</p>)}
          </div>
          {attractionChapters.map((chapter, i) => (
            <section id={chapter.id} key={chapter.id} data-guide-section className="scroll-mt-6 pt-8 md:pt-9">
              <h2 className="mb-5 max-w-2xl text-[27px] font-black leading-[1.25] text-[#191265] sm:text-[32px]">{chapter.title}</h2>
              <div className="space-y-5 text-[17px] leading-[1.95] sm:text-[18px]">
                {chapter.blocks.map((block, index) => {
                  if (block.kind === "quote") return <blockquote key={index} className="border-r-[3px] border-[#df709e] py-1 pr-5 text-[21px] font-bold leading-[1.6] text-[#94265b] sm:text-[24px]">{block.text}</blockquote>;
                  if (block.kind === "clinic") return <div key={index} data-guide-clinic-case className="space-y-5"><p className="font-medium text-[#191265]">{block.title}</p>{block.paragraphs.map((text, j) => <p key={j}>{text}</p>)}</div>;
                  if (block.kind === "link") return <p key={index}>{block.text}{" "}<Link href={attractionHref(block.destination, block.placement)} onClick={() => clicked(block.destination, block.placement)} data-guide-inline-cta={block.destination} data-guide-placement={block.placement} className={textLink}>{block.label}</Link></p>;
                  return <p key={index}>{block.text}</p>;
                })}
              </div>
              <span data-guide-milestone={`chapter_${i + 1}`} aria-hidden="true" className="block h-px w-px" />
            </section>
          ))}
          <p className="mt-7 text-[21px] font-bold leading-8 text-[#94265b]">תני לו מקום לרצות אותך. תשאירי לעצמך מקום לבחור.</p>
        </article>

        <section id="next-step" className="scroll-mt-6 border-t border-[#191265]/15 bg-[#f0e8ed] px-5 py-9 sm:px-8 md:py-10">
          <div className="mx-auto max-w-[43rem]">
            <h2 data-guide-milestone="next_step" className="text-[29px] font-black leading-tight text-[#191265] sm:text-[35px]">ועכשיו, מה נכון לך?</h2>
            <p className="mt-4 text-[17px] leading-8">להבין את עצמך בזוגיות ולהכיר אדם חדש הם שני צעדים שונים. את לא חייבת לעשות את שניהם. התחילי במה שמתאים למקום שבו את נמצאת.</p>
            <div data-guide-path="self-understanding" className="mt-7">
              <h3 className="text-[22px] font-bold leading-snug text-[#191265]">רוצה להכיר את עצמך בזוגיות?</h3>
              <p className="mt-3 text-[17px] leading-8">בין אם את לפני קשר ובין אם את בתוך קשר, אני מזמינה אותך לשאלון DNA הזוגי החינמי. זו הזדמנות לעצור, להתבונן במה שחשוב לך ולהתחיל להבין את הדרך שבה את נכנסת לקשרים.</p>
              <Link href={attractionHref("dna", "self_understanding")} onClick={() => clicked("dna", "self_understanding")} data-guide-cta="dna" className={`mt-3 inline-flex items-center gap-2 ${textLink}`}>לשאלון DNA הזוגי החינמי <ArrowLeft size={16} aria-hidden="true" /></Link>
              <p className="mt-4 text-sm leading-7 text-[#514452]">ואם את רוצה להעמיק ולעבוד על דפוסי הבחירה שלך, <Link href={attractionHref("guide", "secondary")} onClick={() => clicked("guide", "secondary")} data-guide-cta="paid-guide" className={textLink}>״לבחור נכון״ הוא המדריך בתשלום</Link> עם שאלון ותרגילים מעשיים. לא עוד עצות מהצד, אלא עבודה על הבחירות שלך.</p>
            </div>
            <div data-guide-path="new-relationship" className="mt-7 border-t border-[#191265]/15 pt-7">
              <h3 className="text-[22px] font-bold leading-snug text-[#191265]">פנויה ורוצה להכיר מישהו שיתאים לך?</h3>
              <p className="mt-3 text-[17px] leading-8">אם את רוצה להכיר מישהו שמתאים לך וליישם את מה שאני מלמדת, אני מזמינה אותך להצטרף למאגר ההיכרויות שלי. אנחנו מתחילים מהפרופיל שלך, מההעדפות ומהשאלונים של שני הצדדים, כדי לבדוק חיבורים אפשריים.</p>
              <p className="mt-3 text-[17px] leading-8">המערכת ואני בודקות התאמות, ואני עוברת על ההצעה לפני שהיא נשלחת. כל צד מחליט בנפרד אם להתקדם, ופרטי הקשר נחשפים רק לאחר אישור הדדי.</p>
              <Link href={attractionHref("database", "main")} onClick={() => clicked("database", "main")} data-guide-cta="database" className={`mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#191265] px-6 py-4 text-center font-bold text-white transition-colors hover:bg-[#2d247e] sm:w-auto ${focusClass}`}>אני רוצה להכיר דרך המאגר <ArrowLeft size={18} className="shrink-0" aria-hidden="true" /></Link>
              <p className="mt-3 text-xs leading-6 text-[#605765]">הצטרפות בתשלום חד־פעמי למאגר. במסלול הרגיל אין התחייבות למספר התאמות, לתדירות או לתוצאה. המדריך החינמי אינו מקנה חברות במאגר.</p>
            </div>
          </div>
        </section>

        <section className="px-5 py-7 sm:px-8">
          <div className="mx-auto max-w-[43rem] space-y-5 text-sm leading-7 text-[#514452]">
            <p>ולגברים שהציצו עד כאן: אישה שמראה עניין ונשארת לגמרי היא עצמה. זה מושך גם בעיניכם? תגיבו לסרטון הפודקאסט, אני רוצה לשמוע את הצד שלכם. ואם אתם פנויים ורוצים להכיר, <Link href={attractionHref("database", "men")} onClick={() => clicked("database", "men")} data-guide-cta="database-men" className={textLink}>המאגר פתוח גם לכם</Link>.</p>
            <p className="flex flex-wrap items-center gap-x-2"><MessageCircle size={17} aria-hidden="true" />נמשיך לדבר על זה? <a href={attractionHref("community", "footer")} onClick={() => clicked("community", "footer")} target="_blank" rel="noopener noreferrer" className={textLink}>לקבוצת הווטסאפ השקטה שלי</a>. תכנים ועדכונים, וההצטרפות בחינם.</p>
          </div>
        </section>
      </main>

      {measurement === "undecided" && <aside aria-label="בחירת מדידת המדריך" className="border-t border-[#191265]/10 bg-[#ede6f1] px-5 py-4 sm:px-10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><p className="max-w-2xl text-xs leading-6 text-[#494453]">אפשר לאשר מדידת קריאה ולחיצות במדריך, כולל Meta Pixel, כדי לעזור לי להבין אילו תכנים מועילים. זו בחירה נפרדת מההרשמה לשירות, והמדריך זמין גם בלי אישור.</p><div className="flex gap-5 text-xs"><button type="button" onClick={() => setMeasurement("allowed")} className={`font-bold underline underline-offset-4 ${focusClass}`}>לאפשר מדידת המדריך</button><button type="button" onClick={() => setMeasurement("declined")} className={`underline underline-offset-4 ${focusClass}`}>לא עכשיו</button></div></div></aside>}
      <footer className="bg-[#191265] px-5 py-6 text-center text-xs leading-6 text-white/70"><p>הילית כספי · {GUIDE_NAME}</p><div className="mt-3 flex justify-center gap-6"><Link href="/terms/database" className={`underline ${focusClass}`}>תקנון המאגר</Link><Link href="/" className={`underline ${focusClass}`}>חזרה לאתר</Link></div></footer>
    </div>
  );
}
