/**
 * GuideAccess - כניסה למדריך לפי מייל
 * Route: /guide/access
 *
 * מאפשר לכל מי שרכש את המדריך לגשת אליו בכל עת דרך המייל שלו,
 * גם אם לא שמר את הקישור האישי.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";

export default function GuideAccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const getByEmail = trpc.access.getByEmail.useMutation({
    onSuccess: (data) => {
      if (data.found && data.token) {
        sessionStorage.setItem("guide_token", data.token);
        setLocation(`/guide/view?token=${data.token}`);
      } else {
        setNotFound(true);
      }
    },
    onError: () => {
      setError("אירעה שגיאה. נסו שוב.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("נא להזין כתובת מייל תקינה");
      return;
    }
    setError("");
    setNotFound(false);
    getByEmail.mutate({ email: trimmed, product: "guide_149" });
  };

  const handleRetry = () => {
    setNotFound(false);
    setError("");
    setRetryCount(c => c + 1);
  };

  return (
    <div
      className="min-h-screen bg-[#f0eadc] font-rubik flex flex-col items-center justify-center px-6 py-16"
      dir="rtl"
    >
      {/* Back to home bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#191265]/95 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between border-b border-white/10">
        <a href="/" className="text-white/80 hover:text-[#ffe27c] transition-colors text-sm font-medium flex items-center gap-1.5">
          ← לדף הבית
        </a>
        <span className="text-white font-bold text-sm">הילית כספי</span>
        <div className="w-20" />
      </div>
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #191265 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="text-5xl mb-4">📖</div>
          <h1 className="text-3xl font-black text-[#191265] mb-2">כניסה למדריך</h1>
          <p className="text-[#727272] text-base leading-relaxed">
            הזינו את המייל שבו רכשתם את המדריך ונפנה אתכם ישירות.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white rounded-3xl p-8 shadow-lg"
        >
          {notFound ? (
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-lg font-black text-[#191265] mb-3">לא מצאנו רכישה</h2>
              <p className="text-[#727272] text-sm leading-relaxed mb-2">
                לא מצאנו רכישה עם המייל <strong>{email}</strong>.
              </p>
              <p className="text-[#727272] text-sm leading-relaxed mb-6">
                ייתכן שהרכישה נרשמה עם מייל אחר, או שהעיבוד עדיין בתהליך (נסו שוב בעוד דקה).
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetry}
                  className="bg-[#191265] text-white font-bold py-3 rounded-xl hover:bg-[#1800ad] transition-colors"
                >
                  נסו מייל אחר
                </button>
                <a
                  href="https://wa.me/972552442334"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white font-bold py-3 rounded-xl text-center hover:bg-[#1da851] transition-colors"
                >
                  💬 עזרה בוואטסאפ
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[#191265] font-bold text-sm mb-2">
                  כתובת המייל שבו רכשתם
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="your@email.com"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#e9e8e8] bg-white text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
                />
                {error && (
                  <p className="text-red-500 text-xs mt-1 text-right">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={getByEmail.isPending}
                className="bg-[#ffe27c] text-[#191265] font-black text-base py-4 rounded-xl hover:bg-[#ffd84a] transition-all disabled:opacity-70 shadow-md"
              >
                {getByEmail.isPending ? "מחפש..." : "פתיחת המדריך ←"}
              </button>
              <p className="text-[#727272] text-xs text-center leading-relaxed">
                הגישה אישית ומאובטחת. אין צורך בסיסמה.
              </p>
            </form>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mt-6"
        >
          <a
            href="/guide"
            className="text-[#727272] hover:text-[#191265] transition-colors text-sm underline underline-offset-4"
          >
            לא רכשתם עדיין? לדף המדריך
          </a>
        </motion.div>
      </div>
    </div>
  );
}
