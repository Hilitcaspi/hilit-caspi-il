/**
 * CoachingSales - דף מכירה לשתי חבילות ליווי אישי
 * תהליך "הבנה": 8 פגישות - ₪2,960 (₪370 לפגישה)
 * תהליך "המסע": 12 פגישות - ₪4,200 (₪350 לפגישה)
 * שתיהן כוללות: כניסה למאגר הרווקים + פגישת היכרות ₪500 מתקזזת
 */

import { useState, useEffect, useRef } from "react";
import React from "react";
import { track } from "@/lib/track";
import { trackViewContent } from "@/lib/metaPixel";
import { gaViewItem, gaBeginCheckout } from "@/lib/ga";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import GrowWallet from "@/components/GrowWallet";

const COUPLE1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple1-dTY36Cjdzm8mF33xfMS9aM.webp";
const COUPLE2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple2-newTkojCq886Az6dFS7mCS.webp";
const COUPLE3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/couple3-hk4WGsw2RaLsvtzFcRTaeh.webp";
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const ABOUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-about_1da3754a.jpg";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית! יש לי שאלה לגבי חבילת הליווי האישי באתר 🙏");
const DNA_QUIZ_URL = "/dna-quiz";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.13 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

const PAIN_POINTS = [
  "יצאתם לדייטים רבים ושום דבר לא התקדם",
  "אתם יודעים שאתם רוצים זוגיות, אבל לא מצליחים להגיע לשם",
  "חזרתם לאותם דפוסים שוב ושוב",
  "ניסיתם אפליקציות, שדכנים, חברים, ועדיין לבד",
];

const COUPLE_TESTIMONIALS = [
  {
    photo: COUPLE1,
    names: "מיכל ואורי",
    when: "הכירו דרך המאגר, מרץ 2024",
    text: "אחרי שנים של 'לא מוצאת', 4 חודשים עם הילית שינו לי את הגישה לחיים. היום אני בזוגיות מאושרת.",
    who: "מיכל, 36",
  },
  {
    photo: COUPLE2,
    names: "שירה ודניאל",
    when: "הכירו בתהליך ליווי, ינואר 2024",
    text: "הגעתי ספקן. יצאתי עם כלים שאני משתמש בהם כל יום. הילית רואה דברים שאתה לא רואה בעצמך.",
    who: "דניאל, 41",
  },
  {
    photo: COUPLE3,
    names: "נועה ואיתי",
    when: "הכירו דרך המאגר, נובמבר 2023",
    text: "הכי טוב שעשיתי לעצמי. לא רק מצאתי זוגיות, הבנתי מה אני באמת רוצה.",
    who: "נועה, 33",
  },
];

export default function CoachingSales() {
  React.useEffect(() => {
    track({ eventType: "coaching_view" });
    trackViewContent({ content_name: "ליווי אישי", content_category: "coaching" });
    gaViewItem("coaching");
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* Navbar */}
      <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#191265]/95 backdrop-blur-md shadow-lg" : "bg-[#191265]"}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/"><span className="text-white font-bold text-lg cursor-pointer hover:text-[#ffe27c] transition-colors">הילית כספי</span></Link>
          <a href="#packages" className="bg-[#ffe27c] text-[#191265] font-black px-5 py-2.5 rounded-full text-sm hover:bg-white transition-all duration-300 hover:scale-105">
            לבחירת תהליך
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-right order-2 md:order-1">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-5">
              ליווי אישי 1:1 עם הילית כספי ✦
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              תוכנית מותאמת אישית<br />
              <span className="text-[#ffe27c]">לאהבה שמחפשים</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-6">
              לא עוד לנחש למה זה לא עובד. בתהליך הזה נמפה יחד את הקוד האישי שלכם, נבין מה עוצר אתכם, ונבנה את הדרך המדויקת לזוגיות.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["📍 קליניקה ברמת השרון", "📍 קליניקה בתל אביב", "💻 זום לבחירתכם"].map((loc) => (
                <span key={loc} className="bg-white/10 text-white/80 text-sm px-3 py-1.5 rounded-full border border-white/20">{loc}</span>
              ))}
            </div>
            <a href="#packages"
              className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-8 py-4 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl text-center">
              לבחירת התהליך המתאים לי
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex justify-center order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img src={HERO_IMG} alt="הילית כספי" className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 text-center">
                <div className="text-[#191265] font-black text-lg">500+</div>
                <div className="text-[#727272] text-xs">אנשים שליוויתי</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="bg-white py-16 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-right">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3 text-center">אם זה מוכר לכם</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-8">
              הגעתם למקום הנכון
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-4">
              {PAIN_POINTS.map((point) => (
                <motion.div key={point} variants={fadeUp} className="flex items-start gap-3 bg-[#f0eadc] rounded-2xl p-5">
                  <span className="text-[#191265] font-black text-xl mt-0.5">✓</span>
                  <p className="text-[#191265] font-medium leading-relaxed">{point}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── SESSION INTRO NOTE ── */}
      <section className="bg-[#f0eadc] py-10 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="bg-[#191265]/8 border border-[#191265]/20 rounded-2xl p-6 text-right">
              <p className="text-[#191265] font-bold text-base mb-2">📌 איך מתחילים?</p>
              <p className="text-[#191265]/80 text-sm leading-relaxed">
                כל תהליך מתחיל בפגישת היכרות בעלות של <strong>₪500</strong>. אם ממשיכים לתהליך, הסכום מתקזז מהמחיר המלא. בנוסף, שני התהליכים כוללים כניסה מלאה למאגר הרווקים הבלעדי ללא תשלום נוסף.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── PACKAGES ── */}
      <section id="packages" className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest text-center mb-3">בחרו את התהליך שלכם</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-[#191265] text-center mb-3">
              שני מסלולים. תוצאה אחת.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] text-center mb-12 text-base">
              ההבדל הוא ברמת העומק, הפרקטיות, ומשך הליווי
            </motion.p>

            <div className="grid md:grid-cols-2 gap-8">

              {/* Package 1: הבנה */}
              <motion.div variants={fadeUp} className="bg-[#f0eadc] rounded-3xl p-8 text-right flex flex-col border-2 border-transparent hover:border-[#191265]/20 transition-all">
                <div className="mb-6">
                  <div className="inline-block bg-[#191265]/10 text-[#191265] text-xs font-bold px-3 py-1 rounded-full mb-3">8 פגישות · חודשיים</div>
                  <h3 className="text-2xl font-black text-[#191265] mb-3">תהליך "הבנה"</h3>
                  <p className="text-[#727272] text-sm leading-relaxed">
                    תוכנית מותאמת אישית שמתחילה בשאלה הכי חשובה: מה עוצר אותך. לא מה אתה חושב שעוצר אותך, אלא מה באמת קורה שם. נבין יחד את הדפוסים שחוזרים, נגדיר מי באמת מתאים לך, ונבנה גישה חדשה לחלוטין לאיך נכנסים לקשר.
                  </p>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  {[
                    "מיפוי הדפוסים שחוזרים ועוצרים אתכם",
                    "הגדרת מי באמת מתאים לכם",
                    "גישה חדשה לדייטים ולאפליקציות",
                    "כניסה מלאה למאגר הרווקים הבלעדי",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="text-[#191265] font-black mt-0.5 flex-shrink-0">✓</span>
                      <p className="text-[#191265]/80 text-sm">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#191265]/10 pt-5 mb-5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[#191265] font-black text-4xl">₪2,960</span>
                  </div>
                  <p className="text-[#727272] text-xs">₪370 לפגישה · אפשרות לתשלומים</p>
                </div>

                <GrowWallet
                  product="coaching"
                  buttonLabel='הצטרפות לתהליך "הבנה"'
                  termsPath="/terms/coaching"
                  onSuccess={() => { window.location.href = "/thank-you/coaching"; }}
                />
              </motion.div>

              {/* Package 2: המסע */}
              <motion.div variants={fadeUp} className="bg-[#191265] rounded-3xl p-8 text-right flex flex-col relative overflow-hidden">
                <div className="absolute top-4 left-4 bg-[#ffe27c] text-[#191265] text-xs font-black px-3 py-1 rounded-full">
                  הפופולרי ביותר
                </div>
                <div className="mb-6">
                  <div className="inline-block bg-[#ffe27c]/20 text-[#ffe27c] text-xs font-bold px-3 py-1 rounded-full mb-3">12 פגישות · 5 חודשים</div>
                  <h3 className="text-2xl font-black text-white mb-3">תהליך "המסע"</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    תוכנית מותאמת אישית שמלווה אתכם מהבנה עצמית עמוקה ועד לשינוי אמיתי באיך מתנהלים בזוגיות. נבנה יחד שכבה שכבה ברמה הפרקטית, לא רק להבין אלא לשנות. התאמת פרופילים ואפליקציות, הכנה לדייטים, וליווי בוואטסאפ בין הפגישות.
                  </p>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  {[
                    "כל מה שב\"הבנה\" ועוד הרבה יותר",
                    "שינוי פרקטי ברמת ההתנהלות בזוגיות",
                    "התאמת פרופילים ואפליקציות אישית",
                    "הכנה לדייטים עם כלים ספציפיים",
                    "ליווי בוואטסאפ בין הפגישות",
                    "כניסה מלאה למאגר הרווקים הבלעדי",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="text-[#ffe27c] font-black mt-0.5 flex-shrink-0">✓</span>
                      <p className="text-white/80 text-sm">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-5 mb-5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[#ffe27c] font-black text-4xl">₪4,200</span>
                  </div>
                  <p className="text-white/50 text-xs">₪350 לפגישה (זול יותר לפגישה!) · אפשרות לתשלומים</p>
                </div>

                <GrowWallet
                  product="coaching_mas"
                  buttonLabel='הצטרפות לתהליך "המסע"'
                  termsPath="/terms/coaching"
                  onSuccess={() => { window.location.href = "/thank-you/coaching"; }}
                />
              </motion.div>

            </div>

            {/* Comparison note */}
            <motion.div variants={fadeUp} className="mt-8 bg-[#f0eadc] rounded-2xl p-5 text-center">
              <p className="text-[#191265]/70 text-sm">
                לא בטוחים איזה תהליך מתאים לכם?{" "}
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#191265] font-bold underline hover:text-[#1800ad]">
                  שלחו וואטסאפ
                </a>{" "}
                ונעזור לכם לבחור.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── DATABASE BONUS ── */}
      <section className="py-16 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#191265] to-[#1800ad] rounded-3xl p-8 text-right">
              <div className="flex items-start gap-5">
                <div className="text-5xl">🏆</div>
                <div className="flex-1">
                  <div className="inline-block bg-[#ffe27c] text-[#191265] text-xs font-black px-3 py-1 rounded-full mb-3">כלול בשני התהליכים</div>
                  <h3 className="text-2xl font-black text-white mb-3">גישה למאגר הרווקים הבלעדי</h3>
                  <p className="text-white/75 text-sm leading-relaxed mb-4">
                    מעל 2,400 רווקים ורווקות שעברו סינון אישי. לא אפליקציה. לא שדכן אקראי. מאגר שנבנה על בסיס DNA זוגי ואישור אישי של הילית לכל פרופיל.
                    <br /><br />
                    לאחר התשלום תקבלו הסבר מלא על הכניסה למאגר ואיך להפעיל את הגישה.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-lg line-through">₪499</span>
                    <span className="text-[#ffe27c] font-black text-xl">חינם עבורכם</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-[#191265]">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <motion.p variants={fadeUp} className="text-[#ffe27c]/70 font-semibold text-sm uppercase tracking-widest text-center mb-3">סיפורי הצלחה אמיתיים</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white text-center mb-10">הם הכירו. הם בחרו. הם בנו.</motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {COUPLE_TESTIMONIALS.map((t) => (
                <motion.div key={t.names} variants={fadeUp} className="bg-white rounded-2xl overflow-hidden shadow-xl">
                  <div className="relative h-56 overflow-hidden">
                    <img src={t.photo} alt={t.names} className="w-full h-full object-cover object-[center_20%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191265]/80 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="text-white font-black text-base">{t.names}</div>
                      <div className="text-[#ffe27c] text-xs">{t.when}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-[#ffe27c] text-sm mb-2">★★★★★</div>
                    <p className="text-[#727272] text-sm leading-relaxed mb-3">"{t.text}"</p>
                    <p className="text-[#191265] text-xs font-semibold">{t.who}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── ABOUT ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <motion.img variants={fadeUp} src={ABOUT_IMG} alt="הילית כספי" className="w-full rounded-3xl shadow-lg" />
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מי אני</p>
              <h2 className="text-2xl font-black text-[#191265] mb-4">הילית כספי</h2>
              <p className="text-[#727272] leading-relaxed text-sm mb-4">
                מאמנת ומנטורית לזוגיות. ליוויתי מאות אנשים בתהליך מציאת הזוגיות ופיתחתי שיטה ייחודית המבוססת על DNA זוגי ופסיכולוגיה חיובית.
              </p>
              <p className="text-[#727272] leading-relaxed text-sm mb-4">
                הפגישות מתקיימות בקליניקה ברמת השרון, בתל אביב, או בזום, לפי מה שנוח לכם.
              </p>
              <Link href={DNA_QUIZ_URL}>
                <span className="inline-block bg-[#f0eadc] text-[#191265] font-bold px-5 py-3 rounded-xl hover:bg-[#ffe27c] transition-colors cursor-pointer text-sm">
                  🧬 גלו את ה-DNA הזוגי שלכם
                </span>
              </Link>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-[#191265] mb-4">
              מוכנים להתחיל?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#727272] text-lg mb-8">
              בחרו את התהליך המתאים לכם ונתחיל יחד.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col gap-4 max-w-md mx-auto mb-6">
              <GrowWallet
                product="coaching"
                buttonLabel='תהליך "הבנה" - ₪2,960'
                termsPath="/terms/coaching"
                onSuccess={() => { window.location.href = "/thank-you/coaching"; }}
              />
              <GrowWallet
                product="coaching_mas"
                buttonLabel='תהליך "המסע" - ₪4,200'
                termsPath="/terms/coaching"
                onSuccess={() => { window.location.href = "/thank-you/coaching"; }}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#191265]/60 font-semibold text-sm hover:text-[#191265] transition-colors">
                💬 שאלות? שלחו וואטסאפ
              </a>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── WHATSAPP GROUP ── */}
      <section className="bg-[#f0eadc] py-14 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[#191265]/50 text-sm font-semibold uppercase tracking-widest mb-3">עדיין לא בטוחים?</p>
          <h3 className="text-2xl md:text-3xl font-black text-[#191265] mb-3">
            הצטרפו לקבוצת הווטסאפ השקטה שלי
          </h3>
          <p className="text-[#727272] text-base mb-6 leading-relaxed">
            תוכן שבועי חינמי מהקליניקה. תובנות, כלים, ושאלות שיגרמו לכם לחשוב אחרת על אהבה.
            <br />ללא רעש. ללא לחץ. רק ערך.
          </p>
          <a
            href="https://hilitcaspi.com/api/wa/site?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#1da851] transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            הצטרפות לקבוצה, חינם לחלוטין
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#191265] border-t border-white/10 py-6 px-6 text-center">
        <div className="flex flex-wrap justify-center gap-4 text-white/40 text-sm">
          <Link href="/terms/coaching"><span className="hover:text-white/70 transition-colors cursor-pointer">תקנון ומדיניות ביטול</span></Link>
          <span>·</span>
          <Link href="/"><span className="hover:text-white/70 transition-colors cursor-pointer">חזרה לדף הבית</span></Link>
        </div>
      </footer>
    </div>
  );
}
