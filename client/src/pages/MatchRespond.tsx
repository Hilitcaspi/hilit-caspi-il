/**
 * MatchRespond — shows the proposal before a deliberate yes/no submission.
 * URL: /match/respond?token=XXX
 * Legacy response=yes|no query parameters never submit a vote automatically.
 */
import React, { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import AnonymousBoostSilhouette from "@/components/AnonymousBoostSilhouette";

type ResponseOutcome = "matched" | "waiting" | "not_matched" | "closed";
type ParticipantResponse = {
  responseOutcome?: ResponseOutcome | null;
  status?: string;
  myDecision?: boolean | null;
  alreadyResponded?: boolean;
  bothApproved?: boolean;
  closed?: boolean;
  lateFeedback?: boolean;
  canRespond?: boolean;
};

/** Outcome is interpreted only AFTER this participant's vote was saved. */
export function getSavedResponseOutcome(
  response: ParticipantResponse,
  submittedDecision?: "yes" | "no"
): ResponseOutcome {
  if (response.responseOutcome) return response.responseOutcome;
  if (response.lateFeedback || response.status === "rejected")
    return "not_matched";
  if (response.closed || response.status === "expired") return "closed";
  if (
    response.status === "matched" &&
    (response.bothApproved || response.alreadyResponded)
  )
    return "matched";
  if (
    response.myDecision === false ||
    (!response.alreadyResponded && submittedDecision === "no")
  )
    return "not_matched";
  return "waiting";
}

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational: "השכלה מקצועית",
  technician: "הנדסאי",
  student: "בלימודים",
  bachelor: "תואר ראשון",
  master: "תואר שני",
  phd: "דוקטורט",
  other: "אחר",
};
const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני",
  traditional: "מסורתי",
  religious: "דתי",
  ultra_orthodox: "חרדי",
  orthodox: "חרדי",
  datlash: "דתי לשעבר",
};
const FEMALE_RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילונית", traditional: "מסורתית", religious: "דתייה",
  orthodox: "חרדית", ultra_orthodox: "חרדית", datlash: "דתייה לשעבר",
};

export default function MatchRespond() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const submissionInFlight = useRef(false);
  const [result, setResult] = useState<
    | { kind: "idle" | "loading" | "error" | "closed" | "expired" }
    | { kind: "saved"; outcome: ResponseOutcome }
  >({ kind: "idle" });

  // Non-destructive: loading this page (including legacy links) never consumes a token.
  const { data, isLoading, error, refetch } =
    trpc.matchmaking.getMatchDetails.useQuery(
      { token },
      { enabled: !!token, retry: false }
    );
  const respond = trpc.matchmaking.respondToMatch.useMutation({
    onSuccess: (res, variables) => {
      submissionInFlight.current = false;
      const savedResponse: ParticipantResponse = res;
      if (
        savedResponse.closed &&
        !savedResponse.lateFeedback &&
        !savedResponse.alreadyResponded
      ) {
        setResult({ kind: "closed" });
        return;
      }
      // Replay confirms the STORED vote; never infer it from this request's choice.
      setResult({
        kind: "saved",
        outcome: getSavedResponseOutcome(res, variables.response),
      });
      void refetch().then(fresh => {
        if (fresh.data?.alreadyResponded) {
          setResult({
            kind: "saved",
            outcome: getSavedResponseOutcome(fresh.data),
          });
        }
      });
    },
    onError: err => {
      submissionInFlight.current = false;
      setResult({
        kind: err.message.includes("פג תוקף") ? "expired" : "error",
      });
    },
  });

  const handleDecision = (response: "yes" | "no") => {
    // useRef closes the gap before React renders disabled buttons; the server
    // still enforces row-lock serialization and one immutable vote per token.
    if (
      submissionInFlight.current ||
      respond.isPending ||
      result.kind !== "idle"
    )
      return;
    submissionInFlight.current = true;
    setResult({ kind: "loading" });
    respond.mutate({ token, response });
  };

  if (!token) return <ErrorScreen message="קישור לא תקין" />;
  if (result.kind === "loading") {
    return (
      <Screen>
        <h1 className="text-2xl font-bold text-[#191265]" role="status">
          שומרת את הבחירה שלך...
        </h1>
      </Screen>
    );
  }
  if (result.kind === "saved")
    return <SavedResponseScreen outcome={result.outcome} />;
  if (result.kind === "expired") return <ExpiredScreen />;
  if (result.kind === "closed") return <ClosedScreen />;
  if (result.kind === "error") {
    return (
      <Screen>
        <h1 className="text-2xl font-black text-[#191265] mb-3">
          לא הצלחנו לאשר את השמירה
        </h1>
        <p className="text-[#727272] leading-relaxed">
          אפשר לנסות שוב. אם הבחירה כבר נשמרה, היא לא תשתנה ולא תישמר פעם נוספת.
        </p>
        <button
          onClick={() => setResult({ kind: "idle" })}
          className="mt-6 rounded-full bg-[#ffe27c] px-6 py-3 font-bold text-[#191265]"
        >
          חזרה להצעה
        </button>
        <Footer />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen>
        <h1 className="text-2xl font-bold text-[#191265]" role="status">
          טוענת את הפרטים...
        </h1>
      </Screen>
    );
  }
  if (error || !data)
    return <ErrorScreen message="הקישור פג תוקף או אינו תקין" />;

  const responseView: ParticipantResponse = data;
  if (data.alreadyResponded)
    return <SavedResponseScreen outcome={getSavedResponseOutcome(data)} />;
  if (data.isExpired) return <ExpiredScreen />;
  // Eligibility, not the partner's answer, controls whether this is a proposal.
  if (responseView.closed || responseView.canRespond === false)
    return <ClosedScreen />;

  const { partner, myName, proposalSource, score } = data;
  const isBoost = proposalSource === "boost";
  return (
    <div
      className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#191265] px-6 py-5 text-center">
          <h1 className="text-white font-black text-xl">
            {isBoost
              ? myName
                ? `${myName}, קיבלת התאמת Boost`
                : "קיבלת התאמת Boost"
              : myName
                ? `${myName}, יש לך הצעת התאמה!`
                : "יש לך הצעת התאמה!"}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            הילית כספי | מאמנת למציאת זוגיות
          </p>
        </div>
        <div className="p-6">
          {partner ? (
            <>
              <div className="flex items-center gap-4 mb-5">
                {partner.isAnonymous ? (
                  <AnonymousBoostSilhouette className="h-20 w-20 shrink-0" />
                ) : partner.photoUrl ? (
                  <img
                    src={partner.photoUrl}
                    alt={partner.firstName}
                    className="w-20 h-20 rounded-2xl object-cover object-[center_20%] flex-shrink-0 shadow"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl bg-[#f0eadc] flex items-center justify-center text-4xl flex-shrink-0"
                    aria-hidden="true"
                  >
                    🙂
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-[#191265]">
                    {partner.firstName}
                  </h2>
                  <p className="text-[#727272] text-sm">
                    {partner.age ? `גיל ${partner.age}` : ""}
                    {partner.city ? ` · ${partner.city}` : ""}
                  </p>
                  {isBoost && score != null && (
                    <span className="mt-2 inline-block rounded-full bg-[#f7e7f1] px-3 py-1 text-xs font-black text-[#8c1763]">
                      {score}% התאמה
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {partner.height && (
                  <Detail
                    icon="📏"
                    label="גובה"
                    value={`${partner.height} ס"מ`}
                  />
                )}
                {partner.education && (
                  <Detail
                    icon="🎓"
                    label="השכלה"
                    value={
                      EDUCATION_LABELS[partner.education] ?? partner.education
                    }
                  />
                )}
                {partner.religiosity && (
                  <Detail
                    icon="✡️"
                    label="דת"
                    value={
                      (partner.gender === "female" ? FEMALE_RELIGIOSITY_LABELS : RELIGIOSITY_LABELS)[partner.religiosity] ??
                      partner.religiosity
                    }
                  />
                )}
                {partner.occupation && (
                  <Detail icon="💼" label="עיסוק" value={partner.occupation} />
                )}
              </div>
              {partner.about && (
                <div className="bg-[#f0eadc] rounded-xl p-4 mb-5">
                  <p className="text-[#191265] text-sm leading-relaxed">
                    {partner.about}
                  </p>
                </div>
              )}
              {isBoost && (partner.reasons || []).length > 0 && (
                <div className="mb-5 rounded-xl bg-[#eef9f1] p-4 text-right">
                  <p className="text-sm font-black text-[#24613a]">
                    למה האלגוריתם מצא כאן פוטנציאל
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#477154]">
                    נקודות החיבור שבלטו בנתונים ובשאלונים:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-[#315d3f]">
                    {partner.reasons.map((reason: string) => (
                      <li key={reason}>✓ {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-[#727272] text-center py-4">
              לא נמצאו פרטים על ההתאמה
            </p>
          )}
          <p className="text-[#727272] text-sm text-center mb-5 leading-relaxed">
            {isBoost
              ? "התשלום ושליחת ה־Boost אינם אישור להתאמה. כל אחד מהצדדים נדרש לאשר בנפרד, ורק לאחר שני אישורים יישלחו פרטי יצירת הקשר."
              : "רק אם שניכם תאמרו כן, אשלח לשניכם את פרטי הקשר המלאים."}
            <br />
            הבחירה שלך עצמאית. פרטי יצירת הקשר נשארים חסויים עד לאישור הדדי.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleDecision("yes")}
              disabled={respond.isPending}
              className="flex-1 bg-[#191265] text-white font-black text-lg py-4 rounded-2xl hover:bg-[#1a1580] transition-all active:scale-95 disabled:opacity-50"
            >
              כן, מעניין אותי
            </button>
            <button
              type="button"
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

export function SavedResponseScreen({ outcome }: { outcome: ResponseOutcome }) {
  return (
    <Screen>
      <div role="status" aria-live="polite">
        <h1 className="text-2xl font-black text-[#191265] mb-3">
          הבחירה נשמרה
        </h1>
        {outcome === "not_matched" ? (
          <>
            <h2 className="text-xl font-bold text-[#191265] mb-3">
              הפעם לא הייתה התאמה
            </h2>
            <p className="text-[#727272] text-lg leading-relaxed">
              נמשיך לחפש חיבור מתאים. פרטי יצירת הקשר נשארים חסויים.
            </p>
          </>
        ) : outcome === "matched" ? (
          <>
            <h2 className="text-xl font-bold text-[#191265] mb-3">
              יש התאמה הדדית!
            </h2>
            <p className="text-[#727272] text-lg leading-relaxed">
              שניכם בחרתם כן. רק כעת ניתן להעביר לשניכם את פרטי יצירת הקשר. אפשר
              לבדוק את פרטי ההתאמה באזור האישי.
            </p>
          </>
        ) : outcome === "closed" ? (
          <p className="text-[#727272] text-lg leading-relaxed">
            הבחירה שלך שמורה. ההצעה כבר אינה פעילה, ואין צורך להשיב שוב.
          </p>
        ) : (
          <p className="text-[#727272] text-lg leading-relaxed">
            ממתינים לתשובת הצד השני. רק לאחר ששניכם תאשרו יישלחו פרטי יצירת
            הקשר.
          </p>
        )}
      </div>
      <Footer />
    </Screen>
  );
}

function ExpiredScreen() {
  return (
    <Screen>
      <h1 className="text-2xl font-black text-[#191265] mb-3">
        עבר המועד להגיב
      </h1>
      <p className="text-[#727272] text-lg leading-relaxed">
        חלף זמן המענה להצעה, ולכן אי אפשר להשיב עליה כעת. יש להגיב בתוך 48 שעות
        מקבלת ההתאמה. אם יש שאלות, אפשר לפנות להילית.
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
function ClosedScreen() {
  return (
    <Screen>
      <h1 className="text-2xl font-black text-[#191265] mb-3">
        ההצעה הזו נסגרה
      </h1>
      <p className="text-[#727272] text-lg leading-relaxed">
        ההצעה כבר אינה פעילה, ולכן אי אפשר להשיב עליה. אין בכך אישור שהבחירה שלך
        נשמרה.
      </p>
      <Footer />
    </Screen>
  );
}
function Detail({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#f0eadc] rounded-xl p-3">
      <div className="text-xs text-[#727272] mb-0.5">
        {icon} {label}
      </div>
      <div className="text-[#191265] font-semibold text-sm">{value}</div>
    </div>
  );
}
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#f0eadc] flex items-center justify-center p-6"
      dir="rtl"
    >
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
