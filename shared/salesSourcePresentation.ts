type Attribution = {
  channel: string; campaign: string; confidence: string;
  source?: string | null; medium?: string | null; content?: string | null; creative?: string | null;
};
type SaleSource = {
  closing: Attribution;
  acquisition: Attribution;
  creative?: string | null;
  emailAssist?: { campaign: string; clicked: boolean; sameDay: boolean } | null;
};
const genericCampaign = (value: string) => ["database", "ללא קמפיין", "ללא מקור מתועד"].includes(value.trim().toLowerCase());
const lifecycleChannel = (value: string) => ["paid_database", "paid_plus", "paid_guide", "dna_quiz", "direct", "unknown"].includes(value.trim().toLowerCase());
const unknownChannel = (value: string) => lifecycleChannel(value) || value === "ישיר / לא ידוע" || value === "שאלון DNA / מקור לא ידוע";
const lower = (value?: string | null) => (value || "").trim().toLowerCase();
const token = (value: string, word: string) => new RegExp(`(?:^|[_\\s-])(?:${word})(?:$|[_\\s-])`).test(value);

/** Describe only the saved link type. A story or bio tag does not prove first discovery. */
export function describeSourceLink(attribution: Attribution, creative?: string | null) {
  const channel = attribution.channel;
  const medium = lower(attribution.medium);
  const content = lower(attribution.content || creative);
  const fb = /^Facebook/.test(channel);
  const ig = /^Instagram/.test(channel);
  const namedCampaign = genericCampaign(attribution.campaign) ? null : attribution.campaign;
  if (channel === "Meta Ads (ממומן)") return {
    title: "קמפיין ממומן ב־Meta", type: "paid", detail: namedCampaign,
    note: "מודעה בתשלום. הקמפיין זוהה לפי תיוג ממומן או מיפוי למודעה; זו אינה ספירת ההמרות של Ads Manager.",
  };
  if (unknownChannel(channel)) return {
    title: "לא ניתן לזהות מאיפה הגיעה הרכישה", type: "unknown", detail: null,
    note: "לא נשמר תיוג או מגע מתועד שמזהים את המקור. אין בסיס לקבוע שזה ממומן, מייל או אורגני.",
  };
  if (channel === "Email") return {
    title: "מייל", type: "email", detail: namedCampaign,
    note: "תועד קישור ממייל או קליק במייל לפני התשלום.",
  };
  if (fb || ig) {
    const platform = ig ? "אינסטגרם" : "פייסבוק";
    const organic = ["organic", "organic_social", "social_organic", "bio", "social_reply", "dm"].includes(medium);
    let placement: string | null = null;
    if (token(medium, "social_reply|dm|reply") || token(content, "social_reply|dm|reply")) placement = "מענה אישי בסושיאל";
    else if (token(content, "bio|bio_link|link_in_bio") || medium === "bio") placement = "קישור בביו";
    else if (token(content, "story|stories") || token(medium, "story|stories")) placement = "סטורי";
    else if (token(content, "reel|reels") || token(medium, "reel|reels")) placement = "רילס";
    else if (token(content, "post|feed") || token(medium, "post|feed")) placement = "פוסט";
    return {
      title: placement ? `${platform}${organic ? " אורגני" : ""} · ${placement}` : organic ? `${platform} אורגני · סוג התוכן לא תועד` : `${platform} · ממומן או אורגני לא זוהה`,
      type: organic ? "organic" : placement ? "tagged_social" : "untyped_social",
      detail: null,
      note: placement ? `הקישור מתויג כ${placement}. לא ניתן להסיק ממנו איך הגיעו לפרופיל קודם.` : organic ? "הקישור מתויג כאורגני, אך לא נשמר אם הגיע מפוסט, סטורי או ביו." : "נשמר שם הרשת בלבד. לא ניתן להבחין בין מודעה בתשלום, פוסט, סטורי או ביו.",
    };
  }
  const titles: Record<string, string> = {
    "WhatsApp": "וואטסאפ · קישור בהודעה", "SMS": "SMS · קישור בהודעה",
    "אזור אישי": "רכישה מתוך האזור האישי", "הצעה באתר": "הצעה בתוך האתר",
    "חידוש": "חידוש מנוי אוטומטי", "Google Ads": "קמפיין ממומן בגוגל",
    "Google / SEO": "חיפוש בגוגל · לא ממומן", "הפניה": "הפניה",
  };
  return { title: titles[channel] || channel, type: "other", detail: namedCampaign, note: "הערוץ מבוסס על תיוג הקישור או התיעוד שנשמר לפני התשלום." };
}

/** Presentation only: never changes campaign totals, accounting or source evidence. */
export function presentSalesSource(sale: SaleSource) {
  const { closing, acquisition } = sale;
  const link = describeSourceLink(closing, sale.creative);
  let title = link.title;
  let detail: string | null = link.detail;
  let creative = sale.creative || null;
  if (link.type === "unknown") { detail = link.note; creative = null; }
  else if (closing.channel === "Email") {
    const named = !genericCampaign(closing.campaign) ? closing.campaign : sale.emailAssist?.clicked ? sale.emailAssist.campaign : null;
    title = named ? `מייל · ${named}` : "מייל · המייל המדויק לא זוהה";
    detail = sale.emailAssist?.clicked
      ? `קליק במייל לפני הרכישה: ${sale.emailAssist.campaign}`
      : "נשמר תיוג של קישור ממייל; לא נשמר איזה מייל.";
  } else if (["organic", "tagged_social", "untyped_social"].includes(link.type)) {
    detail = link.note;
    if (link.type !== "untyped_social") creative = null;
  }
  const hasOriginal = !unknownChannel(acquisition.channel)
    && !acquisition.confidence.includes("לא נמצא מקור קודם")
    && (acquisition.channel !== closing.channel || acquisition.campaign !== closing.campaign);
  const originalLink = describeSourceLink(acquisition, acquisition.creative);
  const original = !hasOriginal ? null : {
    title: originalLink.title,
    campaign: genericCampaign(acquisition.campaign) ? null : acquisition.campaign,
  };
  return { title, detail, creative, original };
}

export type SalesSourceGroup = "meta" | "instagram" | "facebook" | "google_ads" | "google" | "whatsapp" | "sms" | "email" | "onsite" | "renewal" | "referral" | "other" | "unknown";
const groupNames: Record<SalesSourceGroup, string> = {
  meta: "קמפיינים ממומנים ב־Meta", instagram: "אינסטגרם · ביו, תוכן וקישורים", facebook: "פייסבוק · תוכן וקישורים", google_ads: "קמפיינים ממומנים בגוגל", google: "חיפוש בגוגל",
  whatsapp: "וואטסאפ", sms: "SMS", email: "מייל", onsite: "אזור אישי והצעות באתר", renewal: "חידוש מנוי", referral: "הפניה", other: "מקור אחר", unknown: "מקור לא מזוהה",
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

/** Summary lens: original acquisition if documented, otherwise the closing link. */
export function salesSourceJourney(sale: SaleSource) {
  const hasRecordedAcquisition = !unknownChannel(sale.acquisition.channel)
    && !sale.acquisition.confidence.includes("לא נמצא מקור קודם");
  const attribution = hasRecordedAcquisition ? sale.acquisition : sale.closing;
  const group = sourceGroup(attribution.channel);
  const display = presentSalesSource(sale);
  const acquisition = describeSourceLink(sale.acquisition, sale.acquisition.creative);
  const primary = hasRecordedAcquisition ? describeSourceLink(attribution, sale.acquisition.creative) : describeSourceLink(attribution, sale.creative);
  const primaryLabel = group === "email" ? (!genericCampaign(attribution.campaign) && hasRecordedAcquisition ? `מייל · ${attribution.campaign}` : display.title) : primary.title;
  return {
    group, label: groupNames[group], primaryLabel,
    primaryCampaign: !genericCampaign(attribution.campaign) && primary.type !== "untyped_social" && primary.type !== "organic" && primary.type !== "tagged_social" ? attribution.campaign : null,
    primaryCreative: group === "meta" && attribution.confidence.includes("מזהה מודעה תואם") ? (hasRecordedAcquisition ? sale.acquisition.creative : sale.creative) || null : null,
    emailClosed: sale.closing.channel === "Email",
    acquisitionRecorded: hasRecordedAcquisition,
    acquisitionLabel: hasRecordedAcquisition ? acquisition.title : "מקור ההיכרות הקודם לא מתועד",
    acquisitionCampaign: hasRecordedAcquisition && !genericCampaign(sale.acquisition.campaign) ? sale.acquisition.campaign : null,
    closingLabel: display.title, closingDetail: display.detail,
    distinctAcquisition: !!display.original,
    evidence: hasRecordedAcquisition ? sale.acquisition.confidence : sale.closing.confidence,
  };
}
export function summarizeSalesSources(sales: Array<SaleSource & { status: "included" | "review"; amountAgorot: number }>) {
  const groups = new Map<SalesSourceGroup, { group: SalesSourceGroup; label: string; count: number; revenueAgorot: number; emailClosedCount: number; closingOnlyCount: number; linkTypes: Array<{ label: string; count: number }> }>();
  for (const sale of sales) {
    if (sale.status !== "included") continue;
    const journey = salesSourceJourney(sale);
    const total = groups.get(journey.group) || { group: journey.group, label: journey.label, count: 0, revenueAgorot: 0, emailClosedCount: 0, closingOnlyCount: 0, linkTypes: [] };
    total.count += 1;
    total.revenueAgorot += sale.amountAgorot;
    if (journey.emailClosed) total.emailClosedCount += 1;
    if (!journey.acquisitionRecorded) total.closingOnlyCount += 1;
    // Break down social link types without mixing unknown links into organic.
    if (["instagram", "facebook"].includes(journey.group)) {
      const type = total.linkTypes.find(row => row.label === journey.primaryLabel);
      if (type) type.count += 1; else total.linkTypes.push({ label: journey.primaryLabel, count: 1 });
    }
    groups.set(journey.group, total);
  }
  for (const group of Array.from(groups.values())) group.linkTypes.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || b.revenueAgorot - a.revenueAgorot || a.group.localeCompare(b.group));
}

export function explainSalesSourceEvidence(sale: SaleSource) {
  if (unknownChannel(sale.closing.channel)) return "לא נשמר מקור לקישור הרכישה. אין בכך הוכחה לרכישה ישירה או ממומנת.";
  if (sale.closing.confidence.includes("מזהה מודעה תואם")) return "מזהה המודעה שנשמר בעסקה תואם למודעה בחשבון הישראלי.";
  if (sale.closing.channel === "Email") return sale.emailAssist?.clicked ? "תועד קליק במייל לפני התשלום. זהו המגע שנמדד, לא הוכחה שהמייל לבדו גרם לרכישה." : "נשמר תיוג של קישור ממייל, אך המייל המסוים לא זוהה.";
  return describeSourceLink(sale.closing, sale.creative).note;
}
