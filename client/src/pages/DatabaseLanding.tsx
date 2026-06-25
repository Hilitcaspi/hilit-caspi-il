/**
 * DatabaseLanding — עמוד נחיתה ייעודי לקמפיין מאגר רווקים
 * מיועד לקהל: רווק/ה 28-38, מרכז הארץ, חילוני-מסורתי, ללא ילדים
 * מסר מרכזי: שדכנית אמיתית, לא אלגוריתם. תשלום חד-פעמי ₪249.
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { track } from "@/lib/track";
import { trackViewContent, trackInitiateCheckout } from "@/lib/metaPixel";

// ─── Assets ──────────────────────────────────────────────────────────────────
const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const COUPLE1     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp";
const COUPLE2     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp";
const COUPLE3     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp";

const JOIN_URL = "/join?source=campaign_direct";

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Sticky CTA bar ───────────────────────────────────────────────────────────
function StickyCTA() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#191265]/97 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center justify-between gap-4">
      <div className="text-white text-sm hidden sm:block">
        <span className="font-bold">מאגר רווקים | הילית כספי</span>
        <span className="text-white/60 mr-2">תשלום חד-פעמי ₪249</span>
      </div>
      <Link href={JOIN_URL}>
        <span
          onClick={() => trackInitiateCheckout({ value: 249, currency: "ILS", content_name: "מאגר רווקים" })}
          className="bg-[#ffe27c] text-[#191265] font-black px-6 py-3 rounded-xl text-base hover:bg-white transition-all duration-200 cursor-pointer block whitespace-nowrap"
        >
          הצטרפות למאגר ←
        </span>
      </Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DatabaseLanding() {
  useEffect(() => {
    track({ eventType: "database_view" });
    trackViewContent({ content_name: "מאגר רווקים קמפיין", content_category: "matchmaking" });
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      <StickyCTA />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#191265] min-h-screen flex items-center relative overflow-hidden px-6 pt-10 pb-16">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 80% 40%, rgba(255,226,124,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 20% 70%, rgba(24,0,173,0.4) 0%, transparent 70%)" }} />

        <div className="max-w-5xl mx-auto w-full grid md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Text */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }} className="text-right order-2 md:order-1">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-[#ffe27c]/15 border border-[#ffe27c]/30 text-[#ffe27c] text-sm font-semibold px-4 py-2 rounded-full mb-6">
              ✦ 3,000+ רווקים ורווקות במאגר
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-[1.15] mb-5">
              נמאס לך<br />
              מאפליקציות?<br />
              <span className="text-[#ffe27c]">זה בשבילך.</span>
            </h1>

            <p className="text-white/75 text-lg leading-relaxed mb-4 max-w-lg">
              אני הילית כספי, שדכנית ומומחית זוגיות. בניתי מאגר שבו כל אחד עבר שאלון DNA זוגי מעמיק.
              <br /><br />
              אני לא אלגוריתם. אני קוראת כל פרופיל בעצמי ושולחת התאמות רק כשאני עומדת מאחוריהן.
            </p>

            {/* Price box */}
            <div className="bg-white/8 border border-white/15 rounded-2xl px-5 py-4 mb-7 inline-block text-right">
              <div className="text-white/50 text-sm line-through mb-0.5">₪499 מחיר מקורי</div>
              <div className="text-[#ffe27c] text-4xl font-black leading-none">₪249</div>
              <div className="text-white/60 text-sm mt-1">תשלום חד-פעמי · ללא דמי מנוי</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={JOIN_URL}>
                <span
                  onClick={() => trackInitiateCheckout({ value: 249, currency: "ILS", content_name: "מאגר רווקים" })}
                  className="bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.03] shadow-2xl text-center cursor-pointer block"
                >
                  ♡ הצטרפות למאגר עכשיו
                </span>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex gap-5 mt-7 text-white/50 text-sm flex-wrap">
              <span>✓ ללא דמי מנוי</span>
              <span>✓ פרופיל מאושר ידנית</span>
              <span>✓ אישור הדדי לפני חשיפת פרטים</span>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}
            className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#ffe27c]/20 to-[#1800ad]/20 rounded-3xl blur-3xl" />
              <img src={HERO_IMG} alt="הילית כספי" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              {/* Floating badge */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-2xl">💛</div>
                <div className="text-[#191265] font-black text-xs">500+ זוגות</div>
                <div className="text-[#727272] text-xs">שנוצרו</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHY NOT APPS ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-bold text-sm uppercase tracking-widest mb-3">את/ה מכיר/ה את התחושה הזו?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-10">
              שעות על האפליקציה.<br />
              <span className="text-[#727272] font-normal text-2xl">ושוב אותם אנשים, אותן שיחות, אותה תחושת ריק.</span>
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-6 text-right">
              {[
                { icon: "😮‍💨", title: "אפליקציות מבוססות תמונות", desc: "Tinder, Bumble, Hinge — כולן עובדות על משיכה ראשונית. אין שם שום דבר על מה שבאמת גורם לזוגיות לעבוד." },
                { icon: "🤷", title: "שדכנים מסורתיים", desc: "שואלים גובה, משכורת, דת. לא שואלים מה קורה לך כשמישהו מתקרב אליך רגשית. זו הבעיה האמיתית." },
                { icon: "🔁", title: "אותם דפוסים שוב ושוב", desc: "לא כי משהו שבור בך. כי אף אחד לא עזר לך להבין מה הפרופיל הזוגי שלך ומה באמת מתאים לו." },
              ].map(item => (
                <motion.div key={item.title} variants={fadeUp} className="bg-[#f9f6f0] rounded-2xl p-6">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-black text-[#191265] text-lg mb-2">{item.title}</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-[#191265] py-16 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-[#ffe27c] font-bold text-sm uppercase tracking-widest mb-3">איך זה עובד</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white mb-10">
              4 צעדים. שדכנית אמיתית. ללא אלגוריתם עיוור.
            </motion.h2>
            <div className="grid md:grid-cols-4 gap-5 text-right">
              {[
                { n: "1", title: "שאלון DNA", desc: "ממלאים שאלון מעמיק שחושף את הדפוסים הזוגיים האמיתיים שלך." },
                { n: "2", title: "פרופיל אישי", desc: "מוסיפים תמונה ומשפטים. אני קוראת כל פרופיל ומאשרת אישית." },
                { n: "3", title: "תשלום חד-פעמי", desc: "₪249 פעם אחת. ללא דמי מנוי. ללא הפתעות." },
                { n: "4", title: "התאמות מדויקות", desc: "כשיש התאמה מעל 80%, שניכם מקבלים הצעה. רק אם שניכם אמרתם כן — הפרטים נחשפים." },
              ].map(step => (
                <motion.div key={step.n} variants={fadeUp} className="relative">
                  <div className="w-12 h-12 bg-[#ffe27c] rounded-full flex items-center justify-center text-[#191265] font-black text-xl mb-4 mr-auto ml-0">
                    {step.n}
                  </div>
                  <h3 className="font-black text-white text-base mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── ABOUT HILIT ──────────────────────────────────────────────────── */}
      <section className="bg-[#f0eadc] py-16 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} className="flex justify-center">
              <img src={PROFILE_IMG} alt="הילית כספי" className="w-64 h-64 rounded-3xl object-cover shadow-xl" />
            </motion.div>
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-bold text-sm uppercase tracking-widest mb-3">מי אני</p>
              <h2 className="text-3xl font-black text-[#191265] mb-4">הילית כספי</h2>
              <p className="text-[#444] leading-relaxed mb-4">
                עזבתי קריירה בהייטק כי הבנתי שמשימת חיי היא אחרת. ראיתי יותר מדי אנשים מוכשרים ומצליחים שנשארים לבד — לא כי משהו שבור בהם, אלא כי אף אחד לא ראה את הפרופיל האמיתי שלהם.
              </p>
              <p className="text-[#444] leading-relaxed mb-6">
                בניתי שיטה שמשלבת מחקר פסיכולוגי, DNA זוגי, ואינטואיציה שצברתי מ-500+ שיחות עם לקוחות. הפודקאסט שלי נשמע 200,000+ פעמים. המאגר שלי מכיל 3,000+ רווקים שעברו אבחון מעמיק.
              </p>
              <div className="flex gap-6 flex-wrap">
                {[["500+", "לקוחות"], ["200K+", "האזנות"], ["3,000+", "במאגר"]].map(([n, l]) => (
                  <div key={l} className="text-center">
                    <div className="text-2xl font-black text-[#191265]">{n}</div>
                    <div className="text-[#727272] text-xs">{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto">
            <motion.p variants={fadeUp} className="text-center text-[#1800ad] font-bold text-sm uppercase tracking-widest mb-3">סיפורי הצלחה</motion.p>
            <motion.h2 variants={fadeUp} className="text-center text-3xl font-black text-[#191265] mb-10">הם מצאו. עכשיו תורך.</motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { img: COUPLE1, names: "ליאת ורון", text: "אחרי חצי שנה במאגר פגשתי את הבן זוג שלי. הילית ידעה בדיוק מה אני צריכה.", who: "ליאת, 32" },
                { img: COUPLE2, names: "מורן ודן", text: "ניסיתי אפליקציות שנים. המאגר של הילית שונה לגמרי. ההתאמות היו מדויקות.", who: "דן, 37" },
                { img: COUPLE3, names: "נועה ואיתי", text: "הפרופיל שלי עבר סינון אמיתי. ידעתי שכל מי שאני פוגשת רציני ומחפש את אותו הדבר.", who: "נועה, 34" },
              ].map(t => (
                <motion.div key={t.names} variants={fadeUp} className="bg-[#f9f6f0] rounded-2xl overflow-hidden">
                  <img src={t.img} alt={t.names} className="w-full h-44 object-cover" />
                  <div className="p-5 text-right">
                    <p className="text-[#191265] text-sm leading-relaxed mb-3">"{t.text}"</p>
                    <p className="text-[#727272] text-xs font-semibold">{t.who}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── OBJECTIONS ───────────────────────────────────────────────────── */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <Reveal>
          <div className="max-w-3xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-center text-2xl font-black text-[#191265] mb-8">שאלות נפוצות</motion.h2>
            <div className="space-y-4">
              {[
                { q: "מה ההבדל מאפליקציות?", a: "באפליקציות אתה/את מחפשים לבד. כאן אני מחפשת בשבילך. כל התאמה שאני שולחת, אני יכולה לעמוד מאחוריה ולהסביר למה." },
                { q: "כמה זמן עד שמקבלים התאמה?", a: "זה תלוי בפרופיל ובמה שמחפשים. חלק מקבלים הצעה תוך שבועות, לחלק לוקח יותר. אני לא שולחת התאמות סתם — רק כשאני בטוחה." },
                { q: "מה קורה אם לא מצאתי?", a: "הפרופיל שלך נשאר פעיל במאגר. כשנכנסים חברים חדשים שמתאימים לפרופיל שלך, אני שולחת הצעה. אין תאריך תפוגה." },
                { q: "האם הפרטים שלי חשופים?", a: "לא. הפרטים שלך נחשפים רק אחרי שגם אתה/את וגם הצד השני אמרתם כן להצעה. עד אז, כלום לא עובר." },
              ].map(item => (
                <motion.details key={item.q} variants={fadeUp} className="bg-white rounded-2xl px-6 py-4 cursor-pointer group">
                  <summary className="font-bold text-[#191265] text-base list-none flex justify-between items-center">
                    {item.q}
                    <span className="text-[#1800ad] text-xl group-open:rotate-45 transition-transform duration-200">+</span>
                  </summary>
                  <p className="text-[#727272] text-sm leading-relaxed mt-3">{item.a}</p>
                </motion.details>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#191265] py-20 px-6 text-center">
        <Reveal>
          <motion.p variants={fadeUp} className="text-[#ffe27c] font-bold text-sm uppercase tracking-widest mb-4">מוכן/ה לצעד הבא?</motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-black text-white mb-4">
            תפסיק/י לחפש לבד.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/65 text-lg mb-8 max-w-lg mx-auto">
            3,000+ רווקים ורווקות מחכים. שדכנית אמיתית שתחפש בשבילך. תשלום חד-פעמי.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
            <div className="bg-white/8 border border-white/15 rounded-2xl px-8 py-4 mb-2 inline-block">
              <div className="text-white/50 text-sm line-through">₪499</div>
              <div className="text-[#ffe27c] text-5xl font-black leading-none">₪249</div>
              <div className="text-white/50 text-sm mt-1">תשלום חד-פעמי · ללא דמי מנוי</div>
            </div>
            <Link href={JOIN_URL}>
              <span
                onClick={() => trackInitiateCheckout({ value: 249, currency: "ILS", content_name: "מאגר רווקים" })}
                className="bg-[#ffe27c] text-[#191265] font-black text-xl px-12 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-[1.03] shadow-2xl cursor-pointer block"
              >
                ♡ הצטרפות למאגר עכשיו
              </span>
            </Link>
            <p className="text-white/40 text-sm mt-2">✓ ללא דמי מנוי · ✓ פרופיל מאושר ידנית · ✓ אישור הדדי</p>
          </motion.div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0b3a] py-6 px-6 text-center text-white/30 text-xs">
        © 2025 הילית כספי | <Link href="/terms/database"><span className="hover:text-white/60 cursor-pointer">תקנון</span></Link>
      </footer>
    </div>
  );
}
