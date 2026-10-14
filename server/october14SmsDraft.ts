import { OCT14_SMS_SHORT_URL, october14OfferUrl } from "../shared/october14CampaignLinks";
/** Preview only. SMS delivery requires a separate owner-reviewed recipient/consent/expiry plan. */
export function buildOctober14SmsDraft() {
 const message = `💛 כאן הילית. מאגר ב־299 ₪, כרטיס ללייב 31.10 במתנה והצעה ראשונה עד 2 ימי עסקים מתום הלייב, בהשלמת פרופיל, תמונה ושאלון עד הלייב. ${OCT14_SMS_SHORT_URL} פרסומת. הסרה: hilitcaspi.com/u`;
 const utf16Units = message.length;
 return {message, offerUrl: OCT14_SMS_SHORT_URL, destination: october14OfferUrl("database_warm", "sms", "checkout"), utf16Units, providerUnits256: Math.ceil(utf16Units/256), unicodeTransportParts: Math.ceil(utf16Units/(utf16Units<=70?70:67)), unsubscribeRequiresEmailEntry:true};
}
