/**
 * ThankYouBundle - עמוד תודה לאחר רכישת חבילת טו באב (מאגר + מדריך)
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import { gaPurchase } from "@/lib/ga";
import { trpc } from "@/lib/trpc";

const WHATSAPP_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, רכשתי את חבילת טו באב ואשמח לעזרה");

export default function ThankYouBundle() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    trackPurchase({ value: 349, currency: "ILS", content_name: "חבילת טו באב - מאגר + מדריך" });
    track({ eventType: "purchase", page: "/thank-you/bundle", metadata: { product: "bundle_tubav", value: 349 } });
    gaPurchase("bundle_tubav");
  }, []);

  const getLinkMutation = trpc.singles.getQuestionnaireLink.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setIsRetrying(false);
        setRetryCount(0);
        window.location.href = data.url;
      } else if ((data as any).alreadyCompleted) {
        setIsRetrying(false);
        setErrorMsg("השאלון כבר הושלם! ניתן להיכנס לאזור האישי.");
      } else if ((data as any).notFound) {
        // Webhook may not have arrived yet — auto-retry up to 4 times with increasing delay
        if (retryCount < 4) {
          setIsRetrying(true);
          setErrorMsg("");
          const delay = (retryCount + 1) * 3000; // 3s, 6s, 9s, 12s
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            getLinkMutation.mutate({ email: email.trim().toLowerCase(), origin: window.location.origin });
          }, delay);
        } else {
          setIsRetrying(false);
          setErrorMsg("המייל לא נמצא במערכת. ייתכן שהתשלום עדיין מעובד. נסו שוב בעוד דקה, או כתבו לנו בוואטסאפ.");
        }
      } else {
        setIsRetrying(false);
        setErrorMsg("אירעה שגיאה. אפשר לכתוב לנו בוואטסאפ.");
      }
    },
    onError: () => {
      setIsRetrying(false);
      setErrorMsg("אירעה שגיאה. אפשר לכתוב לנו בוואטסאפ.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setRetryCount(0);
    setIsRetrying(false);
    if (!email.trim()) return;
    getLinkMutation.mutate({ email: email.trim().toLowerCase(), origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-['Rubik',sans-serif]" dir="rtl">
      {/* Hero */}
      <section className="bg-[#191265] pt-20 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #ff6b9d 0%, transparent 40%), radial-gradient(circle at 70% 30%, #ffe27c 0%, transparent 40%)" }} />

        <div className="relative z-10 max-w-xl mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="text-5xl mb-4">💜</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl md:text-4xl font-black text-white mb-3">
            התשלום עבר בהצלחה!
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
            className="text-white/80 text-lg">
            חבילת טו באב: מאגר + מדריך "לבחור נכון"
          </motion.p>
        </div>
      </section>

      {/* What happens now */}
      <section className="py-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Two things you got */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-[#e9e8e8] mb-6">
            <h2 className="text-xl font-black text-[#191265] mb-4">מה קיבלתם:</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-[#191265] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-[#191265] font-bold">מאגר הרווקים</p>
                  <p className="text-[#555] text-sm">מייל עם קישור לשאלון המדעי נשלח אליכם. מלאו אותו ואני אתחיל לחפש לכם התאמות.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-[#ff6b9d] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-[#191265] font-bold">המדריך "לבחור נכון"</p>
                  <p className="text-[#555] text-sm">מייל נפרד עם קישור אישי למדריך נשלח אליכם. אפשר לפתוח אותו מיד מכל מכשיר.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Direct questionnaire access */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
            className="bg-[#191265] rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold text-lg mb-2">מעדיפים להתחיל עכשיו?</h3>
            <p className="text-white/70 text-sm mb-4">הזינו את המייל שאיתו שילמתם ותועברו ישירות לשאלון:</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="המייל שאיתו שילמתם"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-center focus:outline-none focus:border-[#ffe27c]"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={getLinkMutation.isPending || isRetrying}
                className="bg-[#ffe27c] text-[#191265] font-bold py-3 px-6 rounded-xl hover:bg-[#ffd94a] transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {(getLinkMutation.isPending || isRetrying) ? "מעבד תשלום, אנא המתינו..." : "מעבר לשאלון המדעי ←"}
              </button>
              {isRetrying && (
                <p className="text-[#ffe27c]/80 text-sm text-center animate-pulse">מחפש את התשלום שלך... (נסיון {retryCount + 1}/4)</p>
              )}
              {errorMsg && (
                <p className="text-red-300 text-sm text-center">{errorMsg}</p>
              )}
            </form>
          </motion.div>

          {/* Tips */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="bg-white rounded-2xl p-6 border border-[#e9e8e8] mb-6">
            <h3 className="text-[#191265] font-bold text-base mb-3">💡 טיפ שלי:</h3>
            <p className="text-[#555] text-sm leading-relaxed">
              ממליצה לפתוח את המדריך "לבחור נכון" <strong>לפני</strong> שממלאים את השאלון. הוא יעזור לכם להבין מה באמת חשוב לכם, ולמלא את השאלון בצורה מדויקת יותר. ככל שהשאלון מדויק יותר, ההתאמות שלי טובות יותר.
            </p>
          </motion.div>

          {/* Support */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}
            className="text-center">
            <p className="text-[#888] text-sm mb-3">לא קיבלתם מייל? בדקו בספאם, או כתבו לי:</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1da851] transition-all text-sm">
              📱 וואטסאפ עם הילית
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
