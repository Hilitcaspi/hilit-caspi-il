import { useState, useEffect } from "react";
import { useSearch } from "wouter";

export default function EnUnsubscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") || "";
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Unsubscribe | Match by Hilit";
  }, []);

  const handleUnsubscribe = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* ignore */ }
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">✅</div>
          <h1 className="text-2xl font-black text-[#191265] mb-4">You have been unsubscribed</h1>
          <p className="text-[#555] mb-8">You will no longer receive marketing emails from us. If this was a mistake, you can re-subscribe at any time.</p>
          <a href="/en" className="text-[#191265] underline text-sm">Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">📧</div>
        <h1 className="text-2xl font-black text-[#191265] mb-4">Unsubscribe from emails</h1>
        {email ? (
          <>
            <p className="text-[#555] mb-8">
              You are about to unsubscribe <strong>{email}</strong> from all marketing emails.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="bg-[#191265] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#0f0b3d] transition-all disabled:opacity-50 mb-4"
            >
              {loading ? "Processing..." : "Yes, unsubscribe me"}
            </button>
            <p className="text-sm text-[#727272]">
              <a href="/en" className="underline">Cancel, take me back</a>
            </p>
          </>
        ) : (
          <p className="text-[#555]">
            No email address found in the link. Please use the unsubscribe link from the email you received.
          </p>
        )}
      </div>
    </div>
  );
}
