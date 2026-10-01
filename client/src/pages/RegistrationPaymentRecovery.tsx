import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { readRecoverablePaymentDraft } from "@shared/registrationRecovery";

/** Bearer link for a verified DNA lead. No Grow checkout starts on page load. */
export default function RegistrationPaymentRecovery() {
  const sessionId = new URLSearchParams(window.location.search).get("session") || "";
  const validSession = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
  const query = trpc.singles.getRegistrationRecoveryBySession.useQuery(
    { sessionId },
    { enabled: validSession, retry: false },
  );
  const saveDraft = trpc.singles.registerBasicProfile.useMutation();
  const started = useRef(false);
  const [state, setState] = useState<"checking" | "no_local" | "saving" | "save_failed">("checking");

  useEffect(() => {
    const recovery = query.data;
    if (!recovery || started.current) return;
    started.current = true;
    if (recovery.status === "resume") {
      window.location.replace(`/join?resume=${encodeURIComponent(recovery.token)}`);
      return;
    }
    if (recovery.status !== "recover_local") return;

    let saved: string | null = null;
    try { saved = localStorage.getItem("pending_profile_payload"); } catch { /* Private browsing can disable storage. */ }
    const draft = readRecoverablePaymentDraft(saved, recovery.lead);
    if (!draft) {
      setState("no_local");
      return;
    }
    setState("saving");
    saveDraft.mutateAsync({
      ...draft,
      dnaType: recovery.lead.dnaType,
      dnaSessionId: sessionId,
      email: recovery.lead.email,
      phone: draft.phone,
      gender: draft.gender,
      origin: window.location.origin,
      deferUntilPayment: true,
    } as Parameters<typeof saveDraft.mutateAsync>[0]).then(result => {
      if (!/^[a-f0-9]{64}$/i.test(result.questionnaireToken || "")) {
        setState("save_failed");
        return;
      }
      window.location.replace(`/join?resume=${encodeURIComponent(result.questionnaireToken)}`);
    }).catch(() => setState("save_failed"));
  }, [query.data, saveDraft.mutateAsync, sessionId]);

  const recovery = query.data;
  const lead = recovery?.status === "recover_local" ? recovery.lead : null;
  const joinFallback = lead ? `/join?dna=${encodeURIComponent(lead.dnaType)}&gender=${encodeURIComponent(lead.gender)}&session=${encodeURIComponent(sessionId)}` : "/join";
  const preserveLeadBeforeNavigation = () => {
    if (!lead) return;
    try {
      sessionStorage.setItem("registration_recovery_prefill", JSON.stringify({
        sessionId, name: lead.name, email: lead.email, phone: lead.phone, savedAt: Date.now(),
      }));
    } catch { /* Filling missing details is still possible without browser storage. */ }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f0eadc] text-[#191265] flex items-center justify-center p-5" style={{ backgroundImage: "radial-gradient(circle at 85% 5%, #fff9e6 0, transparent 36%)" }}>
      <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl" aria-live="polite">
        <div className="bg-[#191265] p-8 text-center">
          <p className="text-[#ffe27c] font-black text-xl">הילית כספי</p>
          <h1 className="mt-5 text-white text-2xl font-black">ממשיכים בדיוק מהמקום שלך</h1>
          <p className="mt-2 text-white/75 text-sm">בלי לשלם פעמיים ובלי לאבד מידע שכבר נשמר</p>
        </div>
        <div className="p-6 sm:p-9 text-center space-y-4">
          {!validSession || query.isError || (query.isFetched && !recovery) ? (
            <><h2 className="text-xl font-bold">לא הצלחנו לאמת את הקישור</h2><p className="text-sm text-[#555]">בקשי מהילית קישור חדש. לא נפתח תשלום ולא שונו נתונים.</p></>
          ) : query.isLoading || state === "saving" || recovery?.status === "resume" || (recovery?.status === "recover_local" && state === "checking") ? (
            <><h2 className="text-xl font-bold">בודקים את הפרטים ששמרת...</h2><p className="text-sm text-[#555]">רק אחרי שנאמת שהפרופיל שלך שמור נפתח את שלב התשלום.</p></>
          ) : recovery?.status === "already_paid" ? (
            <><h2 className="text-xl font-bold">כבר נמצא תשלום על הרשמה למאגר</h2><p className="text-sm text-[#555]">לא נפתח תשלום נוסף. אם עדיין חסר לך קישור לשאלון המדעי, פני להילית ונבדוק את הרישום.</p></>
          ) : recovery?.status === "needs_support" ? (
            <><h2 className="text-xl font-bold">ההרשמה דורשת בדיקה קצרה</h2><p className="text-sm text-[#555]">נמצאה רשומה חלקית שלא נכון לחייב כעת. פני להילית כדי להשלים את הרישום בבטחה.</p></>
          ) : recovery?.status === "recover_local" && state === "save_failed" ? (
            <><h2 className="text-xl font-bold">לא הצלחנו לשמור את הפרופיל</h2><p className="text-sm text-[#555]">לא נפתח תשלום. הפרטים במכשיר הזה לא נמחקו. נסי לרענן את הדף; אם התקלה חוזרת, פני להילית.</p><button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[#191265] px-6 py-3 text-white font-bold">נסי שוב</button></>
          ) : recovery?.status === "recover_local" && state === "no_local" ? (
            <><h2 className="text-xl font-bold">שמרנו את תוצאת השאלון ופרטי הקשר שלך</h2>
              <p className="text-sm leading-7 text-[#555]">הפרטים האישיים שמילאת לפני התשלום לא הגיעו לשרת, ולא נמצאה טיוטה במכשיר הזה. אם מילאת ממכשיר או דפדפן אחר, פתחי בו את הקישור הזה כדי שננסה לשחזר את המילוי.</p>
              <p className="text-sm leading-7 text-[#555]">אם גם שם אין טיוטה, נצטרך להשלים רק את פרטי ההרשמה. תוצאת ה־DNA ופרטי הקשר שלך כבר ימולאו, ורק לאחר שהפרופיל יישמר ייפתח התשלום.</p>
              <a href={joinFallback} onClick={preserveLeadBeforeNavigation} className="inline-block rounded-xl bg-[#ffe27c] px-6 py-3 font-black text-[#191265] hover:bg-[#ffd84a]">להשלמת הפרטים שנשארו ←</a>
            </>
          ) : null}
          <p className="border-t border-[#e9e8e8] pt-4 text-xs text-[#727272]">התשלום עצמו ייפתח רק לאחר לחיצה מפורשת שלך במסך הבא.</p>
        </div>
      </section>
    </main>
  );
}
