/**
 * LeadCall - דף לידים לקמפיין שיחת היכרות
 * URL: /lead
 * מטרה: נשים משאירות פרטים, הילית מתקשרת לסגור
 * קמפיין Meta Ads → /lead → CRM (source: meta_lead_call) → WhatsApp + מיילי warm-up
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { trackLead } from "@/lib/metaPixel";
import { gaGenerateLead } from "@/lib/ga";

const PROFILE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";
const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";

const SOCIAL_PROOF = [
  { name: "מיכל, 34", text: "אחרי שנתיים של דייטים שלא הובילו לשום מקום, 4 חודשים אחרי השיחה עם הילית אני בזוגיות." },
  { name: "שירה, 38", text: "הילית ראתה בדיוק מה עצר אותי. שיחה אחת שינתה את הכיוון לחלוטין." },
  { name: "נועה, 31", text: "חשבתי שאני יודעת מה אני מחפשת. הילית עזרה לי להבין מה אני באמת צריכה." },
];

export default function LeadCall() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createLead = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      // Fire Meta Pixel Lead event
      trackLead({ content_name: "שיחת_היכרות" });
      gaGenerateLead("lead_call");
    },
    onError: (err) => {
      toast.error(err.message || "אירעה שגיאה, נסי שוב");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("נא למלא את כל השדות");
      return;
    }
    if (!consent) {
      toast.error("נא לאשר קבלת עדכונים");
      return;
    }
    createLead.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      gender: "female",
      source: "meta_lead_call",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4" dir="rtl">
        {/* Back to home bar */}
        <div className="bg-[#191265]/95 backdrop-blur-sm sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between border-b border-white/10">
          <a href="/" className="text-white/80 hover:text-[#ffe27c] transition-colors text-sm font-medium flex items-center gap-1.5">
            ← לדף הבית
          </a>
          <span className="text-white font-bold text-sm">הילית כספי</span>
          <div className="w-20" />
        </div>
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-6xl mb-6">💛</div>
          <h2 className="text-3xl font-black text-[#191265] mb-4">קיבלתי!</h2>
          <p className="text-[#444] text-lg leading-relaxed mb-6">
            אחזור אלייך תוך 24 שעות לתיאום שיחת ההיכרות.
            <br />
            בינתיים, שמרי את המספר שלי:
          </p>
          <a
            href="https://wa.me/972552442334"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg"
          >
            שמרי אותי בוואטסאפ
          </a>
          <p className="text-[#727272] text-sm mt-6">
            הילית כספי | Relationship Expert &amp; Matchmaker
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#191265] font-rubik" dir="rtl">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1800ad 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div className="text-right">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-semibold px-4 py-2 rounded-full mb-6">
אשמח לקבוע פגישת היכרות
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
              מוכנה לאהבה{" "}
              <span className="text-[#ffe27c]">האמיתית</span>
              <br />
              שמחכה לך?
            </h1>

            <p className="text-white/75 text-lg leading-relaxed mb-8">
              השאירי פרטים ואחזור אלייך תוך 24 שעות לתיאום פגישת היכרות אישית.
              <br />
              <span className="text-white font-semibold">60 דקות שישנו לך את הכיוון.</span>
            </p>

            {/* Trust signals */}
            <div className="flex gap-6 flex-wrap">
              {[
                { n: "500+", label: "נשים שליוויתי" },
                { n: "200K+", label: "האזנות לפודקאסט" },
                { n: "60 דק'", label: "פגישה אישית" },
              ].map(({ n, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-[#ffe27c]">{n}</div>
                  <div className="text-white/60 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#ffe27c]/30 to-[#1800ad]/30 rounded-3xl blur-2xl" />
              <img
                src={HERO_IMG}
                alt="הילית כספי"
                className="relative w-64 md:w-80 h-auto rounded-3xl object-cover shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM SECTION ── */}
      <section className="bg-[#f0eadc] py-16 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#191265] mb-3">
              השאירי פרטים ואחזור אלייך
            </h2>
            <p className="text-[#727272] text-lg">
              אחזור אלייך תוך 24 שעות לתיאום השיחה
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-5">
            <div>
              <label className="block text-[#191265] font-semibold mb-2 text-right">
                השם שלך
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="שם פרטי ומשפחה"
                className="w-full px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#aaa] focus:outline-none focus:border-[#191265] text-right text-lg transition-all"
              />
            </div>

            <div>
              <label className="block text-[#191265] font-semibold mb-2 text-right">
                מספר טלפון
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="05X-XXXXXXX"
                className="w-full px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#aaa] focus:outline-none focus:border-[#191265] text-right text-lg transition-all"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[#191265] font-semibold mb-2 text-right">
                כתובת מייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-5 py-4 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#aaa] focus:outline-none focus:border-[#191265] text-right text-lg transition-all"
                dir="ltr"
              />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[#191265] flex-shrink-0"
              />
              <span className="text-[#444] text-sm leading-relaxed text-right">
                אני מאשרת קבלת עדכונים ומידע מהילית כספי. ניתן להסיר בכל עת.
              </span>
            </label>

            <button
              type="submit"
              disabled={createLead.isPending}
              className="bg-[#191265] text-white font-black text-xl py-5 rounded-2xl hover:bg-[#1800ad] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createLead.isPending ? "שולחת..." : "אשמח לקבוע פגישת היכרות"}
            </button>

            <p className="text-center text-sm text-[#727272]">
              אחזור אלייך תוך 24 שעות לתיאום הפגישה.
            </p>
          </form>
        </div>
      </section>

      {/* ── ABOUT HILIT ── */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center">
            <img
              src={PROFILE_IMG}
              alt="הילית כספי"
              className="w-64 h-64 rounded-full object-cover shadow-2xl border-4 border-[#ffe27c]"
            />
          </div>
          <div className="text-right">
            <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">
              מי אני?
            </p>
            <h2 className="text-3xl font-black text-[#191265] mb-5">
              הילית כספי
              <br />
              <span className="text-xl font-bold text-[#727272]">Relationship Expert &amp; Matchmaker</span>
            </h2>
            <p className="text-[#444] text-lg leading-relaxed mb-5">
              עבדתי עם מאות נשים שהגיעו אלי אחרי שנים של דייטים מתסכלים, תחושה שמשהו לא עובד, ולא הצלחה למצוא את מה שהן מחפשות.
            </p>
            <p className="text-[#444] text-lg leading-relaxed">
              בשיחה שלנו נדבר על מה שבאמת קורה, ונבין יחד מה הצעד הנכון עבורך.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT HAPPENS IN THE CALL ── */}
      <section className="bg-[#191265] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">
            מה קורה בשיחה?
          </h2>
          <p className="text-white/60 mb-12 text-lg">60 דקות שמשנות כיוון</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "מבינים את המצב",
                desc: "נדבר על איפה את עומדת היום ומה לא עובד עד עכשיו",
              },
              {
                num: "02",
                title: "מזהים את הדפוס",
                desc: "נגלה יחד מה חוזר על עצמו ומה מעכב אותך",
              },
              {
                num: "03",
                title: "מגדירים את הצעד",
                desc: "נצא עם תמונה ברורה של מה נכון עבורך עכשיו",
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="text-[#ffe27c] text-4xl font-black mb-3">{num}</div>
                <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
                <p className="text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-[#f0eadc] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-[#191265] text-center mb-12">
            מה אומרות נשים שדיברו איתי
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {SOCIAL_PROOF.map(({ name, text }) => (
              <div key={name} className="bg-white rounded-2xl p-6 shadow-md text-right">
                <p className="text-[#444] leading-relaxed mb-4 text-base italic">"{text}"</p>
                <p className="text-[#191265] font-bold text-sm">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">
            מוכנה לשיחה?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            השאירי פרטים למעלה ואחזור אלייך תוך 24 שעות
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-[#ffe27c] text-[#191265] font-black text-xl px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            השאירי פרטים עכשיו
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d0b3d] py-8 px-6 text-center">
        <p className="text-white/40 text-sm">
          הילית כספי | Relationship Expert &amp; Matchmaker |{" "}
          <a href="https://hilitcaspi.com" className="text-[#ffe27c]/60 hover:text-[#ffe27c]">
            hilitcaspi.com
          </a>
        </p>
        <p className="text-white/25 text-xs mt-2">
          שיחת ההיכרות היא חינמית לחלוטין ואינה מחייבת רכישה כלשהי
        </p>
      </footer>
    </div>
  );
}
