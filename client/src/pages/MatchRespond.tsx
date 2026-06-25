/**
 * MatchRespond — shows match details first, then lets the user choose yes/no
 * URL: /match/respond?token=XXX
 * (legacy: /match/respond?token=XXX&response=yes|no still works)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  bachelor: "תואר ראשון",
  master: "תואר שני",
  phd: "דוקטורט",
  other: "אחר",
};

const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני/ת",
  traditional: "מסורתי/ת",
  religious: "דתי/ת",
  ultra_orthodox: "חרדי/ת",
};

export default function MatchRespond() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [decision, setDecision] = useState<"yes" | "no" | null>(null);
  const [resultStatus, setResultStatus] = useState<
    "idle" | "loading" | "matched" | "waiting" | "rejected" | "already" | "error"
  >("idle");

  // Fetch match details (non-destructive — does not consume token)
  const { data, isLoading, error } = trpc.matchmaking.getMatchDetails.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const respond = trpc.matchmaking.respondToMatch.useMutation({
    onSuccess: (res) => {
      if (res.alreadyResponded) {
        setResultStatus("already");
      } else if (res.status === "matched") {
        setResultStatus("matched");
      } else if (decision === "yes") {
        setResultStatus("waiting");
      } else {
        setResultStatus("rejected");
      }
    },
    onError: () => setResultStatus("error"),
  });

  const handleDecision = (response: "yes" | "no") => {
    setDecision(response);
    setResultStatus("loading");
    respond.mutate({ token, response });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!token) {
    return <ErrorScreen message="קישור לא תקין" />;
  }

  if (isLoading) {
    return (
      <Screen>
        <div className="text-5xl mb-4 animate-pulse">💛</div>
        <h1 className="text-2xl font-bold text-[#191265]">טוענת את הפרטים...</h1>
      </Screen>
    );
  }

  if (error || !data) {
    return <ErrorScreen message="הקישור פג תוקף או אינו תקין" />;
  }

  // ── Expired match ─────────────────────────────────────────────────────────
  if ((data as any).isExpired) {
    return (
      <Screen>
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">עבר המועד להגיב</h1>
        <p className="text-[#727272] text-lg leading-relaxed text-center">
          עברו יותר מ-48 שעות מאז שנשלחה ההתאמה, ולכן היא בוטלה.
          <br /><br />
          להבא יש להגיב בתוך 48 שעות מקבלת ההתאמה, כדי שנוכל לשמור את ההתאמה פעילה.
          <br /><br />
          אם יש שאלות, צרי קשר דרך וואטסאפ:
        </p>
        <a
          href="https://wa.me/972552442334"
          className="mt-6 inline-block bg-[#ffe27c] text-[#191265] font-bold px-6 py-3 rounded-full"
        >
          צור קשר עם הילית בוואטסאפ
        </a>
        <Footer />
      </Screen>
    );
  }

  const { partner, myName, alreadyResponded, myDecision, status } = data;

  // ── Already responded (token used) ───────────────────────────────────────
  if (alreadyResponded && resultStatus === "idle") {
    const answeredYes = !!(myDecision);
    return (
      <Screen>
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">כבר ענית</h1>
        <p className="text-[#727272] text-lg">
          {answeredYes
            ? "אמרת כן! כשגם הצד השני יאשר, תקבל/י מייל עם הפרטים."
            : "תגובתך נרשמה. כשתהיה התאמה מתאימה יותר, אעדכן אותך."}
        </p>
        <Footer />
      </Screen>
    );
  }

  // ── Result after submitting ───────────────────────────────────────────────
  if (resultStatus === "loading") {
    return (
      <Screen>
        <div className="text-5xl mb-4 animate-pulse">💛</div>
        <h1 className="text-2xl font-bold text-[#191265]">שומרת את תגובתך...</h1>
      </Screen>
    );
  }

  if (resultStatus === "matched") {
    return (
      <Screen>
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">יש התאמה!</h1>
        <p className="text-[#727272] text-lg leading-relaxed">
          שניכם אמרתם כן!<br />
          שלחתי לשניכם מייל עם הפרטים המלאים.<br />
          בהצלחה! 🤍
        </p>
        <Footer />
      </Screen>
    );
  }

  if (resultStatus === "waiting") {
    return (
      <Screen>
        <div className="text-5xl mb-4">💛</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">תגובתך נרשמה!</h1>
        <p className="text-[#727272] text-lg leading-relaxed">
          אמרת כן! כשגם הצד השני יאשר,<br />
          תקבל/י מייל עם הפרטים המלאים.<br />
          מחכה לך בהצלחה 🤍
        </p>
        <Footer />
      </Screen>
    );
  }

  if (resultStatus === "rejected") {
    return (
      <Screen>
        <div className="text-5xl mb-4">🤍</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">קיבלתי!</h1>
        <p className="text-[#727272] text-lg leading-relaxed">
          תגובתך נרשמה.<br />
          כשתהיה התאמה מתאימה יותר, אעדכן אותך.
        </p>
        <Footer />
      </Screen>
    );
  }

  if (resultStatus === "already") {
    return (
      <Screen>
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-[#191265] mb-3">כבר ענית</h1>
        <p className="text-[#727272] text-lg">תגובתך כבר נרשמה בעבר.</p>
        <Footer />
      </Screen>
    );
  }

  if (resultStatus === "error") {
    return <ErrorScreen message="משהו השתבש, צרי קשר עם הילית" />;
  }

  // ── Main card — show partner details + yes/no buttons ────────────────────
  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#191265] px-6 py-5 text-center">
          <div className="text-3xl mb-1">💛</div>
          <h1 className="text-white font-black text-xl">
            {myName ? `${myName}, יש לך הצעת התאמה!` : "יש לך הצעת התאמה!"}
          </h1>
          <p className="text-white/70 text-sm mt-1">הילית כספי | מאמנת למציאת זוגיות</p>
        </div>

        {/* Partner card */}
        <div className="p-6">
          {partner ? (
            <>
              <div className="flex items-center gap-4 mb-5">
                {partner.photoUrl ? (
                  <img
                    src={partner.photoUrl}
                    alt={partner.firstName}
                    className="w-20 h-20 rounded-2xl object-cover object-[center_20%] flex-shrink-0 shadow"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#f0eadc] flex items-center justify-center text-4xl flex-shrink-0">
                    🙂
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-[#191265]">{partner.firstName}</h2>
                  <p className="text-[#727272] text-sm">
                    {partner.age ? `בן/בת ${partner.age}` : ""}
                    {partner.city ? ` · ${partner.city}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {partner.height && (
                  <Detail icon="📏" label="גובה" value={`${partner.height} ס"מ`} />
                )}
                {partner.education && (
                  <Detail icon="🎓" label="השכלה" value={EDUCATION_LABELS[partner.education] ?? partner.education} />
                )}
                {partner.religiosity && (
                  <Detail icon="✡️" label="דת" value={RELIGIOSITY_LABELS[partner.religiosity] ?? partner.religiosity} />
                )}
                {partner.occupation && (
                  <Detail icon="💼" label="עיסוק" value={partner.occupation} />
                )}
              </div>

              {partner.about && (
                <div className="bg-[#f0eadc] rounded-xl p-4 mb-5">
                  <p className="text-[#191265] text-sm leading-relaxed">{partner.about}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[#727272] text-center py-4">לא נמצאו פרטים על ההתאמה</p>
          )}

          <p className="text-[#727272] text-sm text-center mb-5 leading-relaxed">
            אם שניכם תאמרו כן, אשלח לשניכם את פרטי הקשר המלאים.
            <br />
            ההחלטה שלך נשמרת בסודיות מוחלטת.
          </p>

          {/* Yes / No buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision("yes")}
              disabled={respond.isPending}
              className="flex-1 bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1a1580] transition-all active:scale-95 disabled:opacity-50"
            >
              כן, מעניין אותי 💛
            </button>
            <button
              onClick={() => handleDecision("no")}
              disabled={respond.isPending}
              className="flex-1 bg-white border-2 border-gray-200 text-[#727272] font-bold text-lg py-4 rounded-2xl hover:border-gray-400 transition-all active:scale-95 disabled:opacity-50"
            >
              לא הפעם
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-[#f0eadc] rounded-xl p-3">
      <div className="text-xs text-[#727272] mb-0.5">{icon} {label}</div>
      <div className="text-[#191265] font-semibold text-sm">{value}</div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        {children}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-8 pt-6 border-t border-[#e9e8e8] text-center">
      <a href="/" className="text-[#191265] text-sm hover:underline">
        לאתר של הילית כספי →
      </a>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <Screen>
      <div className="text-5xl mb-4">❌</div>
      <h1 className="text-2xl font-black text-[#191265] mb-3">קישור לא תקין</h1>
      <p className="text-[#727272] text-lg">{message}</p>
      <a
        href="https://wa.me/972552442334"
        className="mt-6 inline-block bg-[#ffe27c] text-[#191265] font-bold px-6 py-3 rounded-full"
      >
        WhatsApp הילית
      </a>
      <Footer />
    </Screen>
  );
}
