export type CrmParticipantMatch = {
  status: string;
  approvedByA?: boolean | null;
  approvedByB?: boolean | null;
  tokenAUsedAt?: number | null;
  tokenBUsedAt?: number | null;
  emailAOpenedAt?: number | null;
  emailBOpenedAt?: number | null;
  returnedToPoolAt?: number | null;
};

export type RecordedParticipantChoice = "yes" | "no" | null;
export type CrmParticipantStatus = {
  icon: string;
  label: string;
  color: string;
};

/** A stored true is an explicit approval, including legacy approvals without a
 * timestamp. False is also the database default and proves a decline only when
 * the same participant's response token was consumed. Null is not a choice. */
export function getRecordedParticipantChoice(
  match: CrmParticipantMatch,
  isA: boolean,
): RecordedParticipantChoice {
  const approved = isA ? match.approvedByA : match.approvedByB;
  const tokenUsedAt = isA ? match.tokenAUsedAt : match.tokenBUsedAt;
  if (approved === true) return "yes";
  if (tokenUsedAt != null && approved === false) return "no";
  return null;
}

/** Personal answers take precedence over the pair's lifecycle. Never derive
 * either person's answer from mutual-match timestamps or the partner's answer. */
export function getCrmParticipantStatus(
  match: CrmParticipantMatch,
  isA: boolean,
): CrmParticipantStatus | null {
  const choice = getRecordedParticipantChoice(match, isA);
  if (choice === "yes") {
    return { icon: "✅", label: "בחר כן", color: "bg-emerald-100 text-emerald-800" };
  }
  if (choice === "no") {
    return { icon: "❌", label: "בחר לא הפעם", color: "bg-red-100 text-red-700" };
  }
  if (match.status === "pending") return null;
  const partnerDeclined = getRecordedParticipantChoice(match, !isA) === "no";
  if (match.status === "rejected" || match.returnedToPoolAt != null
    || (match.status === "expired" && partnerDeclined)) {
    return { icon: "ℹ️", label: "ההצעה נסגרה לפני שנרשמה תשובה", color: "bg-slate-100 text-slate-700" };
  }
  if (match.status === "expired") {
    return { icon: "⏰", label: "לא נרשמה תשובה עד שפג תוקף ההצעה", color: "bg-orange-100 text-orange-700" };
  }
  if (match.status === "matched") {
    return { icon: "ℹ️", label: "לא תועדה תשובה אישית", color: "bg-slate-100 text-slate-700" };
  }
  if (match.status !== "proposed") return null;
  const tokenUsedAt = isA ? match.tokenAUsedAt : match.tokenBUsedAt;
  const emailOpenedAt = isA ? match.emailAOpenedAt : match.emailBOpenedAt;
  if (tokenUsedAt != null) {
    return { icon: "ℹ️", label: "לא תועדה בחירה בתשובה", color: "bg-amber-100 text-amber-800" };
  }
  if (emailOpenedAt != null) {
    return { icon: "📧", label: "פתח מייל, טרם נרשמה תשובה", color: "bg-blue-100 text-blue-700" };
  }
  return { icon: "⏳", label: "לא פתח מייל", color: "bg-gray-100 text-gray-500" };
}
