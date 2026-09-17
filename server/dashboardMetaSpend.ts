export const DASHBOARD_META_TIMEZONE = "Asia/Jerusalem";

export type MetaAccountRole = "sales_acquisition" | "profile_boosts";
export type MetaCampaignClassification = "sales_acquisition" | "profile_boosted_post";

export type MetaAction = { action_type?: string; value?: string | number };

export type MetaCampaignSummary = {
  name: string;
  objective: string;
  accountRole: MetaAccountRole;
  classification: MetaCampaignClassification;
  classificationReason: "account";
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  purchases: number;
  leads: number;
  registrations: number;
  purchaseValue: number | null;
  videoViews: number;
  postEngagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  cpl: number | null;
  cpa: number | null;
  metaReportedRoas: number | null;
};

export function formatMetaCalendarDate(
  timestamp: number,
  timezone = DASHBOARD_META_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function metaActionValue(actions: MetaAction[] | undefined, preferredTypes: string[]): number {
  for (const type of preferredTypes) {
    const total = (actions || [])
      .filter(action => action.action_type === type)
      .reduce((sum, action) => sum + Number(action.value || 0), 0);
    if (total > 0) return total;
  }
  return 0;
}

export function normalizeMetaCampaign(
  row: Record<string, any>,
  accountRole: MetaAccountRole,
): MetaCampaignSummary {
  const spend = Number(row.spend || 0);
  const purchases = metaActionValue(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const leads = metaActionValue(row.actions, ["lead", "onsite_conversion.lead_grouped"]);
  const purchaseValueRaw = metaActionValue(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const purchaseValue = purchaseValueRaw > 0 ? roundCurrency(purchaseValueRaw) : null;
  return {
    name: String(row.campaign_name || ""),
    objective: String(row.objective || ""),
    accountRole,
    classification: accountRole === "profile_boosts" ? "profile_boosted_post" : "sales_acquisition",
    classificationReason: "account",
    spend: roundCurrency(spend),
    impressions: Number(row.impressions || 0),
    reach: Number(row.reach || 0),
    clicks: Number(row.clicks || 0),
    linkClicks: metaActionValue(row.actions, ["link_click"]),
    purchases,
    leads,
    registrations: metaActionValue(row.actions, ["complete_registration"]),
    purchaseValue,
    videoViews: metaActionValue(row.actions, ["video_view"]),
    postEngagement: metaActionValue(row.actions, ["post_engagement"]),
    likes: metaActionValue(row.actions, ["like"]),
    comments: metaActionValue(row.actions, ["comment"]),
    shares: metaActionValue(row.actions, ["post"]),
    saves: metaActionValue(row.actions, ["onsite_conversion.post_save"]),
    cpl: leads > 0 ? roundCurrency(spend / leads) : null,
    cpa: purchases > 0 ? roundCurrency(spend / purchases) : null,
    metaReportedRoas: purchaseValue !== null && spend > 0 ? Math.round((purchaseValue / spend) * 100) / 100 : null,
  };
}

export function summarizeMetaSpend(
  campaigns: Array<{ spend?: number }> = [],
  boosts: Array<{ spend?: number }> = [],
) {
  const mainSpend = roundCurrency(campaigns.reduce((sum, row) => sum + Number(row.spend || 0), 0));
  const boostsSpend = roundCurrency(boosts.reduce((sum, row) => sum + Number(row.spend || 0), 0));
  return {
    mainSpend,
    boostsSpend,
    totalSpend: roundCurrency(mainSpend + boostsSpend),
  };
}
