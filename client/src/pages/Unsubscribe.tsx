/**
 * Unsubscribe page - handles email opt-out via token or email
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Unsubscribe() {
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubMutation = trpc.unsubscribe.process.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setError(err.message || "שגיאה בעיבוד הבקשה"),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setError("לינק לא תקין - אנא פני אלינו בוואטסאפ");
    }
  }, []);

  const handleUnsubscribe = () => {
    if (!token) return;
    unsubMutation.mutate({ token });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4 font-rubik" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        {done ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-black text-[#191265] mb-3">הוסרת מרשימת התפוצה</h1>
            <p className="text-[#727272] leading-relaxed">
              לא תקבלי/תקבל עוד מיילים אוטומטיים מהילית כספי.
            </p>
            <p className="text-[#727272] text-sm mt-4">
              אם זה היה בטעות -{" "}
              <a href="https://wa.me/972552442334" className="text-[#191265] font-semibold underline">
                כתבי לנו בוואטסאפ
              </a>
            </p>
            <a href="/" className="inline-block mt-6 bg-[#ffe27c] text-[#191265] font-bold px-6 py-3 rounded-xl hover:bg-[#ffd84a] transition-all">
              חזרה לאתר
            </a>
          </>
        ) : error ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-[#191265] mb-3">לינק לא תקין</h1>
            <p className="text-[#727272]">{error}</p>
            <a href="https://wa.me/972552442334"
              className="inline-block mt-6 bg-[#191265] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-all">
              פני אלינו בוואטסאפ
            </a>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-black text-[#191265] mb-3">הסרה מרשימת התפוצה</h1>
            <p className="text-[#727272] leading-relaxed mb-6">
              לחיצה על הכפתור תסיר אותך מרשימת התפוצה האוטומטית של הילית כספי.
              <br />
              <span className="text-sm">לא תקבלי/תקבל עוד מיילים שיווקיים.</span>
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={unsubMutation.isPending || !token}
              className="w-full bg-[#191265] text-white font-bold py-4 rounded-xl hover:bg-[#1800ad] transition-all disabled:opacity-60"
            >
              {unsubMutation.isPending ? "מעבד..." : "הסירי אותי מהרשימה"}
            </button>
            <a href="/" className="block mt-4 text-sm text-[#727272] hover:text-[#191265]">
              לא, השאירי אותי ברשימה
            </a>
          </>
        )}
      </div>
    </div>
  );
}
