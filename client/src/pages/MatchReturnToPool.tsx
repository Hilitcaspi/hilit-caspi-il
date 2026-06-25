import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function MatchReturnToPool() {
  const matchId = new URLSearchParams(window.location.search).get("matchId");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const returnMutation = trpc.matchmaking.returnToPool.useMutation({
    onSuccess: () => setDone(true),
    onError: (e: { message: string }) => setError(e.message),
  });

  useEffect(() => {
    if (matchId) {
      returnMutation.mutate({ matchId: Number(matchId) });
    } else {
      setError("לינק לא תקין");
    }
  }, [matchId]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        {returnMutation.isPending && (
          <div>
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-[#191265] text-lg">מעדכנת...</p>
          </div>
        )}
        {done && (
          <div>
            <div className="text-5xl mb-4">💛</div>
            <h2 className="text-2xl font-bold text-[#191265] mb-3">חזרת למאגר!</h2>
            <p className="text-[#727272]">
              הפרופיל שלך פעיל שוב ונשלח לך עדכון ברגע שתהיה התאמה חדשה.
            </p>
          </div>
        )}
        {error && (
          <div>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
