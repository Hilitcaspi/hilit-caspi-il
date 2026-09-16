export const DASHBOARD_META_TIMEZONE = "Asia/Jerusalem";

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

export function summarizeMetaSpend(
  campaigns: Array<{ spend?: number }> = [],
  boosts: Array<{ spend?: number }> = [],
) {
  const roundCurrency = (value: number) => Math.round(value * 100) / 100;
  const mainSpend = roundCurrency(campaigns.reduce((sum, row) => sum + Number(row.spend || 0), 0));
  const boostsSpend = roundCurrency(boosts.reduce((sum, row) => sum + Number(row.spend || 0), 0));
  return {
    mainSpend,
    boostsSpend,
    totalSpend: roundCurrency(mainSpend + boostsSpend),
  };
}
