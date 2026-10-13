type Attribution = { channel: string; campaign: string; confidence: string };
type SaleSource = {
  closing: Attribution;
  acquisition: Attribution;
  creative?: string | null;
  emailAssist?: { campaign: string; clicked: boolean; sameDay: boolean } | null;
};
const genericCampaign = (value: string) => ["database", "ללא קמפיין", "ללא מקור מתועד"].includes(value.trim().toLowerCase());
const lifecycleChannel = (value: string) => ["paid_database", "paid_plus", "paid_guide", "dna_quiz", "direct", "unknown"].includes(value.trim().toLowerCase());
const unknownChannel = (value: string) => lifecycleChannel(value) || value === "ישיר / לא ידוע" || value === "שאלון DNA / מקור לא ידוע";

/** Presentation only: never changes campaign totals, accounting or source evidence. */
export function presentSalesSource(sale: SaleSource) {
  const { closing, acquisition } = sale;
  let title = closing.channel;
  let detail: string | null = genericCampaign(closing.campaign) ? null : closing.campaign;
  let creative = sale.creative || null;
  if (unknownChannel(closing.channel)) {
    title = "מקור הרכישה לא נשמר";
    detail = "אין מספיק מידע לקבוע אם הגיעו ממודעה, ממייל או מקישור אחר.";
    creative = null;
  } else if (/^Instagram/.test(closing.channel) && sale.creative === "bio_link") {
    title = "אינסטגרם · קישור בביו";
    detail = "הקישור מתויג כביו באינסטגרם; זו אינה ראיה לקליק ממודעה ממומנת.";
    creative = null;
  } else if (closing.channel === "Email") {
    title = "מייל · " + (genericCampaign(closing.campaign) ? "הזמנה להצטרף למאגר" : closing.campaign);
    detail = sale.emailAssist?.clicked
      ? `קליק במייל לפני הרכישה: ${sale.emailAssist.campaign}`
      : "בתשלום נשמר תיוג של קישור ממייל; המייל המדויק לא זוהה.";
  } else if (/^Instagram|^Facebook/.test(closing.channel)) {
    title = closing.channel.startsWith("Instagram") ? "אינסטגרם · סוג הקישור לא זוהה" : "פייסבוק · סוג הקישור לא זוהה";
  } else if (closing.channel === "Meta Ads (ממומן)") {
    title = "מודעה ממומנת ב־Meta";
  }
  const hasOriginal = !unknownChannel(acquisition.channel)
    && !acquisition.confidence.includes("לא נמצא מקור קודם")
    && (acquisition.channel !== closing.channel || acquisition.campaign !== closing.campaign);
  const original = !hasOriginal ? null : {
    title: /^Instagram/.test(acquisition.channel) ? "אינסטגרם (מקור מוקדם מתועד)"
      : /^Facebook/.test(acquisition.channel) ? "פייסבוק (מקור מוקדם מתועד)"
      : acquisition.channel === "Email" ? "מייל"
      : acquisition.channel === "Meta Ads (ממומן)" ? "מודעה ממומנת ב־Meta" : acquisition.channel,
    campaign: genericCampaign(acquisition.campaign) ? null : acquisition.campaign,
  };
  return { title, detail, creative, original };
}
