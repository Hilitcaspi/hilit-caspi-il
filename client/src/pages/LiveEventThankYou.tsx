/**
 * Live Event Thank-You Page
 * Shown after purchase via Grow redirect to /live/thank-you
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";

const WHATSAPP_GROUP = "https://hilitcaspi.com/api/wa/thankyou";
const WHATSAPP_DIRECT = "https://wa.me/972552442334";
const INSTAGRAM = "https://www.instagram.com/hilitcaspi_relationship";
const ZOOM_LINK = "https://us06web.zoom.us/j/86584508771?pwd=XYV0VbPuuGMmaxdMHoOpCa8mmFxx2n.1";

export default function LiveEventThankYou() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const eventDate = new Date("2026-06-16T20:30:00+03:00").getTime();
    const tick = () => {
      const now = Date.now();
      const diff = eventDate - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* Header */}
      <div className="bg-[#191265] py-4 px-6 text-center">
        <Link href="/" className="text-white font-bold text-xl">הילית כספי</Link>
      </div>

      {/* Hero */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">💛</div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            כל הכבוד! רשומים ללייב! 💛
          </h1>
          <p className="text-[#ffe27c] text-xl font-semibold mb-2">
            אני כל כך שמחה לראות אתכם שם!
          </p>
          <p className="text-white/80 text-lg">
            תזכורת עם קישור הזום תשלח אליכם במייל בסמוך לאירוע
          </p>
        </div>
      </section>

      {/* Event Details */}
      <section className="bg-white py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#f8f6ff] border-2 border-[#191265]/20 rounded-2xl p-8 text-center mb-8">
            <h2 className="text-2xl font-black text-[#191265] mb-6">פרטי האירוע</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-2">📅</div>
                <div className="font-bold text-[#191265] text-sm">תאריך</div>
                <div className="text-[#191265] font-semibold">יום שלישי</div>
                <div className="text-[#191265] font-semibold">16.6.2026</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-2">🕗</div>
                <div className="font-bold text-[#191265] text-sm">שעה</div>
                <div className="text-[#191265] font-semibold text-xl">20:30</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-3xl mb-2">💻</div>
                <div className="font-bold text-[#191265] text-sm">פלטפורמה</div>
                <div className="text-[#191265] font-semibold">זום</div>
              </div>
            </div>

            {/* Countdown */}
            <p className="text-[#727272] text-sm mb-3">האירוע מתחיל בעוד:</p>
            <div className="flex justify-center gap-3">
              {[
                { val: timeLeft.days, label: "ימים" },
                { val: timeLeft.hours, label: "שעות" },
                { val: timeLeft.minutes, label: "דקות" },
                { val: timeLeft.seconds, label: "שניות" },
              ].map(({ val, label }) => (
                <div key={label} className="bg-[#191265] text-white rounded-xl px-4 py-3 min-w-[60px]">
                  <div className="text-2xl font-black">{String(val).padStart(2, "0")}</div>
                  <div className="text-xs text-white/60">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Zoom Link */}
          <div className="bg-[#ffe27c]/20 border border-[#ffe27c] rounded-2xl p-6 text-center mb-6">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-bold text-[#191265] mb-2">קישור הזום שלך</h3>
            <p className="text-[#727272] text-sm mb-4">
              הקישור ישלח גם למייל שלך. שמרו אותו!
            </p>
            <a
              href={ZOOM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#191265] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#1800ad] transition-colors"
            >
              כניסה ללייב בזום
            </a>
            <p className="text-xs text-[#727272] mt-3">
                  Meeting ID: 865 8450 8771 | קוד: 696071
            </p>
          </div>

          {/* FREE GUIDE BONUS */}
          <div className="bg-gradient-to-br from-[#191265] to-[#1800ad] rounded-3xl p-8 text-center shadow-xl">
            <div className="inline-block bg-[#ffe27c] text-[#191265] font-black text-sm px-4 py-1.5 rounded-full mb-4">
              🎁 בונוס מיוחד ל-50 הנרשמים הראשונים
            </div>
            <h3 className="text-2xl font-black text-white mb-1">
            אתם בין 50 הנרשמים הראשונים
          </h3>
          <h3 className="text-2xl font-black text-white mb-2">
            וזכאים לקבל בחינם את <span className="text-[#ffe27c]">המדריך לבחור נכון</span>
          </h3>
            <p className="text-white/60 text-sm mb-5">מדריך דיגיטלי שווי 249 שח חינם לגמרי!</p>

            <div className="bg-white/10 rounded-2xl p-5 mb-5 text-right">
              <p className="text-[#ffe27c] font-bold text-sm mb-3">מה תמצאו במדריך:</p>
              <ul className="space-y-2.5 text-white/85 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#ffe27c] font-bold mt-0.5">✦</span>
                  <span>מה באמת מונע מכם למצוא זוגיות — ולמה זה לא מה שאתם חושבים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ffe27c] font-bold mt-0.5">✦</span>
                  <span>איך לזהות דפוסים שחוזרים על עצמם בדייטים ולשבור אותם</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ffe27c] font-bold mt-0.5">✦</span>
                  <span>תרגילים מעשיים לבניית בהירות — מי אתם ומה אתם מחפשים באמת</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ffe27c] font-bold mt-0.5">✦</span>
                  <span>איך לבחור נכון — ולא לוותר על הדברים שחשובים באמת</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#ffe27c]/15 border border-[#ffe27c]/40 rounded-xl p-4 mb-5">
              <div className="text-3xl mb-2">📬</div>
              <p className="text-white font-bold text-base mb-1">המדריך נשלח למייל שלכם!</p>
              <p className="text-white/70 text-sm leading-relaxed">
                בדקו את תיבת המייל. הקישור האישי שלכם למדריך כבר שם.
                <br />
                לא קיבלתם? בדקו בספאם או שלחו לי בווטסאפ.
              </p>
            </div>

            <a
              href="/guide/access"
              className="block w-full bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-2xl text-center hover:bg-white transition-all shadow-lg"
            >
              פתיחת המדריך עכשיו ←
            </a>
            <p className="text-white/50 text-xs mt-3">
              הזינו את המייל שבו נרשמתם ותועברו ישירות למדריך
            </p>
          </div>
        </div>
      </section>

      {/* Prepare Questions */}
      <section className="bg-[#191265] py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-2xl font-black text-white mb-4">
            הכינו שאלות מראש!
          </h2>
          <p className="text-white/80 text-lg leading-relaxed mb-6">
            לא כולם יספיקו לשאול בלייב. אני ממליצה להכין את השאלות שלכם מראש ולשלוח לי בווטסאפ.
            <br />
            <span className="text-[#ffe27c] font-semibold">אני אשתדל לענות על כמה שיותר שאלות בלייב.</span>
          </p>
          <a
            href={WHATSAPP_DIRECT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#1da851] transition-colors text-lg"
          >
            <span>📱</span>
            שלחי/שלח לי שאלה בווטסאפ
          </a>
        </div>
      </section>

      {/* Community */}
      <section className="bg-white py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black text-[#191265] mb-3">
            בואו לקהילה שלי!
          </h2>
          <p className="text-[#727272] mb-8">
            תכנים על מדע האהבה, טיפים לדייטינג, ועדכונים על אירועים הבאים. אני כבר מחכה לכם שם!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WHATSAPP_GROUP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-6 py-4 rounded-2xl hover:bg-[#1da851] transition-colors"
            >
              <span>💬</span>
              קבוצת הווטסאפ שלי
            </a>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity"
            >
              <span>📸</span>
              אינסטגרם | מדע האהבה
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-[#f0eadc] py-8 px-6 text-center">
        <p className="text-[#727272] text-sm">
          שאלות? פנו אלינו בווטסאפ{" "}
          <a href={WHATSAPP_DIRECT} className="text-[#191265] font-semibold underline">
            0552442334
          </a>
        </p>
        <p className="text-[#727272] text-xs mt-2">
          הילית כספי | מומחית לזוגיות ושדכנית
        </p>
      </section>
    </div>
  );
}
