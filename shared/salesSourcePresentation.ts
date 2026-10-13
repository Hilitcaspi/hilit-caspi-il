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
    title = "מייל · " + (genericCampaign(closing.campaign) ? "קישור רכישה" : closing.campaign);
    detail = sale.emailAssist?.clicked
      ? `קליק במייל לפני הרכישה: ${sale.emailAssist.campaign}`
      : "בתשלום נשמר תיוג של קישור ממייל; המייל המדויק לא זוהה.";
  } else if (/^Instagram|^Facebook/.test(closing.channel)) {
    title = closing.channel.startsWith("Instagram") ? "אינסטגרם · ללא זיהוי מודעה" : "פייסבוק · ללא זיהוי מודעה";
    detail = "בקישור התשלום נשמר תיוג של הרשת, אך אין מידע שמזהה מודעה מסוימת או קובע אם הקישור ממומן.";
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

export type SalesSourceGroup = "meta" | "instagram" | "facebook" | "google_ads" | "google" | "whatsapp" | "sms" | "email" | "onsite" | "renewal" | "referral" | "other" | "unknown";
const groupNames: Record<SalesSourceGroup, string> = {
  meta: "Meta ממומן", instagram: "אינסטגרם", facebook: "פייסבוק", google_ads: "Google Ads", google: "Google / חיפוש",
  whatsapp: "וואטסאפ", sms: "SMS", email: "מייל · מקור קודם לא זוהה", onsite: "אזור אישי / הצעה באתר", renewal: "חידוש מנוי", referral: "הפניה", other: "מקור אחר", unknown: "ערוץ ההגעה לא תועד",
};
function sourceGroup(channel: string): SalesSourceGroup {
  if (unknownChannel(channel)) return "unknown";
  if (channel === "Meta Ads (ממומן)") return "meta";
  if (channel.startsWith("Instagram")) return "instagram";
  if (channel.startsWith("Facebook")) return "facebook";
  if (channel === "Google Ads") return "google_ads";
  if (channel.startsWith("Google")) return "google";
  if (channel === "WhatsApp") return "whatsapp";
  if (channel === "SMS") return "sms";
  if (channel === "Email") return "email";
  if (["אזור אישי", "הצעה באתר"].includes(channel)) return "onsite";
  if (channel === "חידוש") return "renewal";
  if (channel === "הפניה") return "referral";
  return "other";
}

/** Source grouping is a separate display lens. Each included sale belongs to one group. */
export function salesSourceJourney(sale: SaleSource) {
  const hasRecordedAcquisition = !unknownChannel(sale.acquisition.channel)
    && !sale.acquisition.confidence.includes("לא נמצא מקור קודם");
  const attribution = hasRecordedAcquisition ? sale.acquisition : sale.closing;
  const group = sourceGroup(attribution.channel);
  const display = presentSalesSource(sale);
  return {
    group,
    label: group === "email" && hasRecordedAcquisition ? "מייל" : groupNames[group],
    emailClosed: sale.closing.channel === "Email",
    acquisitionRecorded: hasRecordedAcquisition,
    acquisitionLabel: hasRecordedAcquisition
      ? (group === "email" ? "מייל (מקור מוקדם מתועד)" : groupNames[group])
      : "לא תועד איך נחשפו אלינו לפני הקישור הזה",
    acquisitionCampaign: hasRecordedAcquisition && !genericCampaign(sale.acquisition.campaign) ? sale.acquisition.campaign : null,
    closingLabel: display.title,
    closingDetail: display.detail,
    evidence: hasRecordedAcquisition ? sale.acquisition.confidence : sale.closing.confidence,
  };
}
export function summarizeSalesSources(sales: Array<SaleSource & { status: "included" | "review"; amountAgorot: number }>) {
  const groups = new Map<SalesSourceGroup, { group: SalesSourceGroup; label: string; count: number; revenueAgorot: number; emailClosedCount: number; closingOnlyCount: number }>();
  for (const sale of sales) {
    if (sale.status !== "included") continue;
    const journey = salesSourceJourney(sale);
    const total = groups.get(journey.group) || { group: journey.group, label: journey.group === "email" ? "מייל" : journey.label, count: 0, revenueAgorot: 0, emailClosedCount: 0, closingOnlyCount: 0 };
    total.count += 1;
    total.revenueAgorot += sale.amountAgorot;
    if (journey.emailClosed) total.emailClosedCount += 1;
    if (!journey.acquisitionRecorded) total.closingOnlyCount += 1;
    groups.set(journey.group, total);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || b.revenueAgorot - a.revenueAgorot || a.group.localeCompare(b.group));
}

/** Explains evidence, not cause. Raw tracking labels stay in the optional technical detail. */
export function explainSalesSourceEvidence(sale: SaleSource) {
  const display = presentSalesSource(sale);
  const evidence = sale.closing.confidence;
  if (unknownChannel(sale.closing.channel)) return "התשלום נרשם, אבל לא נשמר מידע שמזהה את ערוץ ההגעה. אין בכך הוכחה לרכישה ישירה או ממומנת.";
  if (evidence.includes("מזהה מודעה תואם")) return "מזהה המודעה שנשמר בעסקה תואם למודעה בחשבון הישראלי.";
  if (sale.closing.channel === "Meta Ads (ממומן)") return "תיוג הרכישה מופה לקמפיין ממומן בחשבון הישראלי. זהו שיוך באתר, לא אימות של מספר ההמרות ב־Meta.";
  if (sale.closing.channel === "Email") return sale.emailAssist?.clicked ? "תועד קליק במייל לפני התשלום." : "נשמר תיוג של קישור ממייל, אך המייל המסוים לא זוהה.";
  if (sale.creative === "bio_link") return "הקישור מתויג כקישור הביו באינסטגרם. לא תועד איך הגיעו לפרופיל לפניו.";
  if (/^Facebook|^Instagram/.test(sale.closing.channel)) return display.detail || "נשמר תיוג של הרשת בלבד, ללא זיהוי מודעה.";
  if (sale.closing.channel === "אזור אישי") return "תועדה כניסה לרכישה מהאזור האישי.";
  if (sale.closing.channel === "חידוש") return "החיוב סווג כחידוש מנוי; לא כרכישה חדשה מקמפיין.";
  return "הערוץ מבוסס על התיעוד שנשמר לפני התשלום. פרטי המדידה זמינים בהרחבה.";
}
