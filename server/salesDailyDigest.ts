import type { getSalesIntelligence } from "./salesIntelligence";

/** The shared, sanitized daily sales analysis returned by salesIntelligence. */
export type SalesDailyDigestData = Awaited<ReturnType<typeof getSalesIntelligence>>;

export type SalesDailyDigestPart = {
  key: "financial" | "origins";
  message: string;
};

const MAX_PRODUCTS_SHOWN = 3;
const MAX_CAMPAIGNS_SHOWN = 3;
const MAX_CHANNELS_SHOWN = 3;
const MAX_DISPLAY_LABEL_LENGTH = 56;
const MAX_INSIGHT_LENGTH = 120;

function ils(agorot: number): string {
  return `₪${(agorot / 100).toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function nullableIls(agorot: number | null): string {
  return agorot === null ? "לא זמין" : ils(agorot);
}

function dateLabel(reportDate: string): string {
  const [year, month, day] = reportDate.split("-").map(Number);
  return `${day}.${month}.${year}`;
}

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function compactLabel(value: string | null | undefined, fallback: string, maxLength = MAX_DISPLAY_LABEL_LENGTH): string {
  const label = nonEmpty(value, fallback);
  return label.length <= maxLength ? label : `${label.slice(0, maxLength - 1).trimEnd()}…`;
}

function compactItems<T>(
  rows: readonly T[],
  limit: number,
  render: (row: T) => string,
  aggregateRest: (rest: readonly T[]) => string,
): string {
  if (rows.length === 0) return "אין נתונים";
  if (rows.length <= limit) return rows.map(render).join("; ");
  return [...rows.slice(0, limit).map(render), aggregateRest(rows.slice(limit))].join("; ");
}

function productLine(data: SalesDailyDigestData): string {
  const products = data.products;
  return compactItems(
    products,
    MAX_PRODUCTS_SHOWN,
    product => `${compactLabel(product.label, product.product)} ${product.count} | ${ils(product.revenueAgorot)}`,
    rest => {
      const count = rest.reduce((sum, product) => sum + product.count, 0);
      const revenue = rest.reduce((sum, product) => sum + product.revenueAgorot, 0);
      return `מוצרים נוספים (${rest.length}): ${count} | ${ils(revenue)}`;
    },
  );
}

function channelLine(data: SalesDailyDigestData): string {
  return compactItems(
    data.channels,
    MAX_CHANNELS_SHOWN,
    channel => `${compactLabel(channel.channel, "לא ידוע")}: ${channel.count} | ${ils(channel.revenueAgorot)}`,
    rest => {
      const count = rest.reduce((sum, channel) => sum + channel.count, 0);
      const revenue = rest.reduce((sum, channel) => sum + channel.revenueAgorot, 0);
      return `ערוצים נוספים (${rest.length}): ${count} | ${ils(revenue)}`;
    },
  );
}

function isMetaChannel(channel: string): boolean {
  return /^meta(?:\s|$)/i.test(channel.trim());
}

function acquisitionLine(data: SalesDailyDigestData): string {
  const campaigns = data.campaigns
    .filter(campaign => campaign.count > 0)
    .sort((left, right) => Number(isMetaChannel(right.channel)) - Number(isMetaChannel(left.channel)));
  if (campaigns.length === 0) return "לא ידוע";

  return compactItems(
    campaigns,
    MAX_CAMPAIGNS_SHOWN,
    campaign => {
      const emailClosed = campaign.emailClosedCount > 0 ? `, סגירת מייל ${campaign.emailClosedCount}` : "";
      return `${compactLabel(campaign.channel, "לא ידוע", 32)} — ${compactLabel(campaign.campaign, "ללא שם קמפיין", 64)}: ${campaign.count} | ${ils(campaign.revenueAgorot)}${emailClosed}`;
    },
    rest => {
      const count = rest.reduce((sum, campaign) => sum + campaign.count, 0);
      const revenue = rest.reduce((sum, campaign) => sum + campaign.revenueAgorot, 0);
      const emailClosed = rest.reduce((sum, campaign) => sum + campaign.emailClosedCount, 0);
      return `קמפיינים נוספים (${rest.length}): ${count} | ${ils(revenue)}${emailClosed > 0 ? `, סגירת מייל ${emailClosed}` : ""}`;
    },
  );
}

function reviewLine(data: SalesDailyDigestData): string | null {
  if (data.summary.reviewCount <= 0) return null;
  return `${data.summary.reviewCount} דיווחים בסך ${ils(data.summary.reviewRevenueAgorot)} בבירור ולא נכללו`;
}

function expenseLine(data: SalesDailyDigestData): string {
  const meta = nullableIls(data.summary.metaSpendAgorot);
  const other = nullableIls(data.summary.otherExpenseAgorot);
  const documentedBalance = data.summary.balanceAgorot === null
    ? null
    : `יתרה לפי הנתונים הקיימים: ${ils(data.summary.balanceAgorot)}`;
  if (!data.summary.expenseComplete) {
    return [
      `הוצאות מתועדות: Meta ${meta} | אחרות ${other}`,
      documentedBalance,
      "תמונת ההוצאות חלקית; לא מוצג רווח",
    ].filter((line): line is string => Boolean(line)).join(" | ");
  }
  return `הוצאות שנרשמו: Meta ${meta} | אחרות ${other} | סה״כ ${nullableIls(data.summary.totalExpenseAgorot)} | ${documentedBalance || "יתרה לפי הנתונים הקיימים: לא זמין"}. לא אומת מול ספקים`;
}

/**
 * Builds two concise, PII-free messages. Revenue is always the shared service's
 * included (trusted) revenue; review rows are described separately and never
 * added to the reported financial total.
 */
export function buildSalesDailyDigest(
  data: SalesDailyDigestData,
  reportDate: string,
): SalesDailyDigestPart[] {
  const review = reviewLine(data);
  const supplierStatus = data.quality.providerReconciled
    ? "דוח ספק הוצלב"
    : "דוח ספק טרם הוצלב";
  const financial = [
    `דוח כספי יומי | ${dateLabel(reportDate)}`,
    `הכנסות מתועדות כלולות: ${data.summary.includedCount} עסקאות | ${ils(data.summary.includedRevenueAgorot)}`,
    `מוצרים: ${productLine(data)}`,
    review,
    expenseLine(data),
    supplierStatus,
  ].filter((line): line is string => Boolean(line)).join("\n");

  const unknownAcquisition = Math.max(0, data.summary.includedCount - data.summary.knownAcquisitionCount);
  const unknownClosing = Math.max(0, data.summary.includedCount - data.summary.knownClosingCount);
  const insight = data.insights.find(candidate => candidate.tone !== "warning") || data.insights[0];
  const origins = [
    `דוח מקורות יומי | ${dateLabel(reportDate)}`,
    `ערוץ שסגר: ${channelLine(data)}`,
    `מקור גיוס: ${acquisitionLine(data)}`,
    `לא ידוע: גיוס ${unknownAcquisition} | סגירה ${unknownClosing}`,
    "אותה עסקה עשויה להופיע בשני קווי המקור; אין לסכום ביניהם.",
    insight ? `תובנה: ${compactLabel(insight.title, "מעקב", 42)} — ${compactLabel(insight.detail, "אין פירוט", MAX_INSIGHT_LENGTH)}` : null,
  ].filter((line): line is string => Boolean(line)).join("\n");

  return [
    { key: "financial", message: financial },
    { key: "origins", message: origins },
  ];
}
