import type { MatchParticipantFeedback } from "./matchOutcome";

export const TESTIMONIAL_REQUEST_AUTOMATION_ENABLED = false;
export const TESTIMONIAL_REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const POSITIVE_DETAIL_STATUSES = new Set(["dating", "met", "together"]);
const POSITIVE_PARTICIPANT_STATUSES = new Set(["date_scheduled", "met", "continuing", "relationship"]);

export function shouldOfferTestimonialRequest(input: {
  detailStatus?: string | null;
  feedback?: MatchParticipantFeedback | null;
}): boolean {
  return Boolean(
    (input.detailStatus && POSITIVE_DETAIL_STATUSES.has(input.detailStatus))
    || (input.feedback?.status && POSITIVE_PARTICIPANT_STATUSES.has(input.feedback.status)),
  );
}

export function shouldSendAutomaticTestimonialRequest(input: {
  automationEnabled: boolean;
  teamVerified: boolean;
  detailStatus?: string | null;
  feedback?: MatchParticipantFeedback | null;
  lastRequestedAt?: number | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (!input.automationEnabled || !input.teamVerified) return false;
  if (!shouldOfferTestimonialRequest(input)) return false;
  return !input.lastRequestedAt || now - input.lastRequestedAt >= TESTIMONIAL_REQUEST_COOLDOWN_MS;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildOutcomeFeedbackRequestEmail(input: {
  firstName: string;
  partnerFirstName: string;
  feedbackUrl: string;
}) {
  const firstName = escapeHtml(input.firstName.trim() || "היי");
  const partnerFirstName = escapeHtml(input.partnerFirstName.trim());
  const feedbackUrl = escapeHtml(input.feedbackUrl);
  const partnerPhrase = partnerFirstName ? ` עם ${partnerFirstName}` : "";

  return {
    subject: `${input.firstName.trim() || "היי"}, נשמח לשמוע איך מתקדם החיבור`,
    htmlContent: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#f7f3ea;padding:32px;color:#191265">
        <div style="background:#fff;border-radius:24px;padding:28px;border:1px solid #ece5d8">
          <p style="font-size:16px;line-height:1.8;margin:0 0 14px">${firstName}, רצינו לשמוע איך מתקדם החיבור${partnerPhrase}.</p>
          <p style="font-size:15px;line-height:1.8;color:#555;margin:0 0 22px">העדכון קצר ונשמר במערכת הפנימית. שום דבר לא מתפרסם בלי בחירה מפורשת שלך, ואם תרצו לשתף חוויה חיובית אפשר לבחור בדיוק אם לפרסם בעילום שם, בשם פרטי, בשם מלא או בשם ותמונה.</p>
          <a href="${feedbackUrl}" style="display:inline-block;background:#191265;color:#ffe27c;text-decoration:none;font-weight:700;border-radius:14px;padding:14px 24px">לעדכון קצר ואישי</a>
          <p style="font-size:12px;line-height:1.7;color:#777;margin:22px 0 0">המשוב אינו משפיע על הזכאות לקבל התאמות עתידיות, ואפשר לבחור שלא לאשר פרסום.</p>
        </div>
      </div>`,
    textContent: `${input.firstName.trim() || "היי"}, רצינו לשמוע איך מתקדם החיבור${input.partnerFirstName.trim() ? ` עם ${input.partnerFirstName.trim()}` : ""}. העדכון קצר ושום דבר לא מתפרסם בלי בחירה מפורשת שלך: ${input.feedbackUrl}`,
  };
}
