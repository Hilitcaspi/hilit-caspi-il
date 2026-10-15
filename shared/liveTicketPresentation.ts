export type LiveTicketStatusInput = {
  source: string;
  attendanceConfirmedAt?: number | null;
  zoomDeliveryState?: string | null;
  zoomLastError?: string | null;
};

export type LiveStatusPresentation = {
  label: string;
  detail: string;
  tone: "success" | "neutral" | "attention";
};

/** RSVP is separate from the ticket entitlement and from registering with Zoom. */
export function liveAttendancePresentation(ticket: LiveTicketStatusInput): LiveStatusPresentation {
  if (ticket.attendanceConfirmedAt) return {
    label: "אישר הגעה",
    detail: "אישור השתתפות מפורש נשמר במערכת.",
    tone: "success",
  };
  if (ticket.source === "plus") return {
    label: "טרם אישר הגעה",
    detail: "יש כרטיס מתנה. עדיין לא התקבל אישור השתתפות; זו אינה דחייה.",
    tone: "neutral",
  };
  return {
    label: "לא נדרש אישור נוסף",
    detail: "הרשמה ללייב נכללה ברכישה. לא נרשם אישור הגעה נפרד.",
    tone: "neutral",
  };
}

/** An enabled worker is not evidence of registration or email delivery. */
export function liveZoomPresentation(ticket: LiveTicketStatusInput, deliveryEnabled = false): LiveStatusPresentation {
  if (ticket.zoomDeliveryState === "sent") return {
    label: "קישור הכניסה נשלח במייל",
    detail: "נרשמה שליחת הקישור האישי; אין בכך הוכחת קריאה או הגעה לתיבה.",
    tone: "success",
  };
  if (ticket.zoomLastError) return {
    label: "דורש בדיקת צוות",
    detail: "ניסיון הרישום או השליחה דורש בירור. אין לבצע שליחה חוזרת בלי בדיקה.",
    tone: "attention",
  };
  if (ticket.zoomDeliveryState === "registered") return {
    label: "רשום ב־Zoom · הקישור טרם נשלח",
    detail: deliveryEnabled ? "הרישום קיים; השליחה עדיין לא תועדה." : "הרישום קיים, והפצת קישורי הכניסה כבויה כרגע.",
    tone: "neutral",
  };
  return {
    label: "טרם נרשם ב־Zoom",
    detail: deliveryEnabled ? "השובר קיים. הרישום והשליחה עדיין לא תועדו; אין פעולה נדרשת מהמשתתף." : "השובר קיים. הפצת קישורי הכניסה כבויה כרגע; אין פעולה נדרשת מהמשתתף.",
    tone: "neutral",
  };
}
