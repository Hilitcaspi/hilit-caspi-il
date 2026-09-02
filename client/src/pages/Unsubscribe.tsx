/**
 * Unsubscribe page - handles email opt-out via token or email
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Unsubscribe() {
  const [token, setToken] = useState<string | null>(null);
  const [legacyEmail, setLegacyEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubMutation = trpc.unsubscribe.process.useMutation({
    onSuccess: () => setDone(true),
    onError: () => setError("לא הצלחנו להשלים את הבקשה מהקישור הזה. אפשר לפנות אלינו ונעזור מיד."),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const email = params.get("email");
    if (t) {
      setToken(t);
    } else if (email) {
      setLegacyEmail(email);
    } else {
      setError("לא הצלחנו לקרוא את קישור ההסרה. אפשר לפנות אלינו ונעזור מיד.");
    }
  }, []);

  const handleUnsubscribe = () => {
    if (!token && !legacyEmail) return;
    unsubMutation.mutate({
      ...(token ? { token } : {}),
      ...(legacyEmail ? { email: legacyEmail } : {}),
    });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4 font-rubik" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        {done ? (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe27c] text-2xl font-black text-[#191265]">✓</div>
            <h1 className="text-2xl font-black text-[#191265] mb-3">ההסרה הושלמה</h1>
            <p className="text-[#727272] leading-relaxed">
              לא יישלחו עוד מסרים שיווקיים אוטומטיים לכתובת הזאת.
            </p>
            <p className="text-[#727272] text-sm mt-4">
              אם זו הייתה טעות, אפשר {" "}
              <a href="https://wa.me/972552442334" className="text-[#191265] font-semibold underline">
                לכתוב לנו בוואטסאפ
              </a>
            </p>
            <a href="/" className="inline-block mt-6 bg-[#ffe27c] text-[#191265] font-bold px-6 py-3 rounded-xl hover:bg-[#ffd84a] transition-all">
              חזרה לאתר
            </a>
          </>
        ) : error ? (
          <>
            <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-[#ffe27c]" />
            <h1 className="text-2xl font-black text-[#191265] mb-3">לא הצלחנו להשלים את ההסרה</h1>
            <p className="text-[#727272]">{error}</p>
            <a href="https://wa.me/972552442334"
              className="inline-block mt-6 bg-[#191265] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-all">
              פנייה בוואטסאפ
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-[#ffe27c]" />
            <h1 className="text-2xl font-black text-[#191265] mb-3">הסרה מרשימת התפוצה</h1>
            <p className="text-[#727272] leading-relaxed mb-6">
              לחיצה על הכפתור תסיר את הכתובת מרשימת התפוצה האוטומטית של הילית כספי.
              <br />
              <span className="text-sm">לא יישלחו אליה עוד מיילים שיווקיים.</span>
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={unsubMutation.isPending || (!token && !legacyEmail)}
              className="w-full bg-[#191265] text-white font-bold py-4 rounded-xl hover:bg-[#1800ad] transition-all disabled:opacity-60"
            >
              {unsubMutation.isPending ? "הבקשה מתבצעת..." : "להסרה מרשימת התפוצה"}
            </button>
            <a href="/" className="block mt-4 text-sm text-[#727272] hover:text-[#191265]">
              להשאיר אותי ברשימה
            </a>
          </>
        )}
      </div>
    </div>
  );
}
