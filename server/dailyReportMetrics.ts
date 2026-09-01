export const DAILY_REPORT_TIMEZONE = "Asia/Jerusalem";
export const DAILY_REPORT_MAX_MESSAGE_LENGTH = 950;

export type DailyReportTargets = {
  databaseMonthlyMinTarget: number;
  databaseMonthlyStretchTarget: number;
  databaseMonthlyBudgetAgorot: number;
  boostMonthlyTarget: number | null;
  bundleMonthlyTarget: number | null;
  leadMonthlyTarget: number | null;
  revenueMonthlyTargetAgorot: number | null;
};

export type DailyReportMetrics = {
  reportDate: string;
  dayOfMonth: number;
  daysInMonth: number;
  revenueTodayAgorot: number;
  revenueMonthAgorot: number;
  salesPurchasesToday: number;
  salesPurchasesMonth: number;
  databasePurchasesToday: number;
  databasePurchasesMonth: number;
  databaseRevenueTodayAgorot: number;
  databaseRevenueMonthAgorot: number;
  boostPurchasesToday: number;
  boostPurchasesMonth: number;
  boostRevenueTodayAgorot: number;
  boostRevenueMonthAgorot: number;
  bundlePurchasesToday: number;
  bundlePurchasesMonth: number;
  bundleRevenueTodayAgorot: number;
  bundleRevenueMonthAgorot: number;
  leadsToday: number;
  leadsMonth: number;
  instagramFollowersNew: number | null;
  salesCampaignSpendTodayAgorot: number | null;
  salesCampaignSpendMonthAgorot: number | null;
  boostCampaignSpendTodayAgorot: number | null;
  boostCampaignSpendMonthAgorot: number | null;
  matchesSentToday: number;
  matchesMutualYesToday: number;
  activeSinglesNoMatch14Days: number;
  activeSinglesMissingDetails: number;
  excludedEstimatedPaymentsToday: number;
};

export type DailyReportSourceStatus = Record<string, {
  available: boolean;
  label: string;
  freshAt?: number | null;
  note?: string;
}>;

export type DailyReportDerived = {
  databaseDailyTarget: number;
  databaseDailyGap: number;
  databaseMonthlyGap: number;
  databasePaceGap: number;
  salesCpaAgorot: number | null;
  salesRoas: number | null;
  boostCpaAgorot: number | null;
  boostRoas: number | null;
  alerts: string[];
};

function zonedParts(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value || 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function timezoneOffsetMs(timestamp: number, timezone: string) {
  const parts = zonedParts(timestamp, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

export function zonedMidnightUtc(date: string, timezone = DAILY_REPORT_TIMEZONE): number {
  const [year, month, day] = date.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day, 0, 0, 0);
  let result = base;
  for (let index = 0; index < 3; index++) {
    result = base - timezoneOffsetMs(result, timezone);
  }
  return result;
}

export function nextIsoDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function getReportDateForMidnightRun(now = Date.now(), timezone = DAILY_REPORT_TIMEZONE): string {
  const parts = zonedParts(now - 60_000, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getReportDateRange(reportDate: string, timezone = DAILY_REPORT_TIMEZONE) {
  const dayStart = zonedMidnightUtc(reportDate, timezone);
  const dayEnd = zonedMidnightUtc(nextIsoDate(reportDate), timezone);
  const monthStartDate = `${reportDate.slice(0, 7)}-01`;
  const monthStart = zonedMidnightUtc(monthStartDate, timezone);
  const [year, month, day] = reportDate.split("-").map(Number);
  return {
    dayStart,
    dayEnd,
    monthStart,
    monthStartDate,
    dayOfMonth: day,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

function divideAgorot(numeratorAgorot: number | null, denominator: number): number | null {
  if (numeratorAgorot === null || denominator <= 0) return null;
  return Math.round(numeratorAgorot / denominator);
}

function ratio(numeratorAgorot: number, denominatorAgorot: number | null): number | null {
  if (denominatorAgorot === null || denominatorAgorot <= 0) return null;
  return Math.round((numeratorAgorot / denominatorAgorot) * 100) / 100;
}

export function deriveDailyReportMetrics(metrics: DailyReportMetrics, targets: DailyReportTargets): DailyReportDerived {
  const databaseDailyTarget = targets.databaseMonthlyMinTarget / metrics.daysInMonth;
  const expectedDatabaseToDate = Math.ceil(databaseDailyTarget * metrics.dayOfMonth);
  const salesCpaAgorot = divideAgorot(metrics.salesCampaignSpendTodayAgorot, metrics.salesPurchasesToday);
  const boostCpaAgorot = divideAgorot(metrics.boostCampaignSpendTodayAgorot, metrics.boostPurchasesToday);
  const salesRoas = ratio(metrics.revenueTodayAgorot - metrics.boostRevenueTodayAgorot, metrics.salesCampaignSpendTodayAgorot);
  const boostRoas = ratio(metrics.boostRevenueTodayAgorot, metrics.boostCampaignSpendTodayAgorot);
  const alerts: string[] = [];

  if (metrics.databasePurchasesToday < databaseDailyTarget) {
    alerts.push(`מאגר מתחת ליעד היומי ב־${Math.ceil(databaseDailyTarget - metrics.databasePurchasesToday)} רכישות`);
  }
  if (metrics.databasePurchasesMonth < expectedDatabaseToDate) {
    alerts.push(`מאגר בפער קצב של ${expectedDatabaseToDate - metrics.databasePurchasesMonth} רכישות`);
  }
  if ((metrics.salesCampaignSpendTodayAgorot || 0) > 0 && metrics.salesPurchasesToday === 0) {
    alerts.push("הייתה הוצאת מכירה ללא רכישה מאומתת");
  }
  if ((metrics.boostCampaignSpendTodayAgorot || 0) > 0 && metrics.boostPurchasesToday === 0) {
    alerts.push("הייתה הוצאת Boost ללא רכישת Boost מאומתת");
  }
  if (metrics.excludedEstimatedPaymentsToday > 0) {
    alerts.push(`${metrics.excludedEstimatedPaymentsToday} עסקאות אומדן הוחרגו מההכנסה`);
  }

  return {
    databaseDailyTarget,
    databaseDailyGap: Math.max(0, Math.ceil(databaseDailyTarget - metrics.databasePurchasesToday)),
    databaseMonthlyGap: Math.max(0, targets.databaseMonthlyMinTarget - metrics.databasePurchasesMonth),
    databasePaceGap: Math.max(0, expectedDatabaseToDate - metrics.databasePurchasesMonth),
    salesCpaAgorot,
    salesRoas,
    boostCpaAgorot,
    boostRoas,
    alerts,
  };
}

function ils(agorot: number | null): string {
  if (agorot === null) return "לא זמין";
  return `₪${Math.round(agorot / 100).toLocaleString("he-IL")}`;
}

function metric(value: number | null, suffix = ""): string {
  return value === null ? "לא זמין" : `${value.toLocaleString("he-IL")}${suffix}`;
}

function roas(value: number | null): string {
  return value === null ? "לא זמין" : `${value.toFixed(2)}x`;
}

function optionalGoal(actual: number, target: number | null): string {
  if (target === null) return "יעד טרם הוגדר";
  return `יעד ${target}, חסר ${Math.max(0, target - actual)}`;
}

function pairApprovalText(count: number): string {
  return count === 1 ? "זוג אחד אמר כן" : `${count} זוגות אמרו כן`;
}

export function buildDailyReportMessage(
  metrics: DailyReportMetrics,
  targets: DailyReportTargets,
  sources: DailyReportSourceStatus,
): string {
  const derived = deriveDailyReportMetrics(metrics, targets);
  const [year, month, day] = metrics.reportDate.split("-").map(Number);
  const revenueGoal = targets.revenueMonthlyTargetAgorot === null
    ? "יעד הכנסה טרם הוגדר"
    : `חסר ${ils(Math.max(0, targets.revenueMonthlyTargetAgorot - metrics.revenueMonthAgorot))} ליעד החודשי`;
  const remainingSalesBudget = metrics.salesCampaignSpendMonthAgorot === null
    ? null
    : Math.max(0, targets.databaseMonthlyBudgetAgorot - metrics.salesCampaignSpendMonthAgorot);
  const lines = [
    `סיכום האתר הישראלי | ${day}.${month}.${year}`,
    `הכנסה: ${ils(metrics.revenueTodayAgorot)} היום | ${ils(metrics.revenueMonthAgorot)} החודש | ${revenueGoal}`,
    `מאגר: ${metrics.databasePurchasesToday} היום, חסר ${derived.databaseDailyGap} ליעד ${derived.databaseDailyTarget.toFixed(1)} | ${metrics.databasePurchasesMonth}/${targets.databaseMonthlyMinTarget} בחודש, חסר ${derived.databaseMonthlyGap}`,
    `Boost: ${metrics.boostPurchasesToday} היום | ${metrics.boostPurchasesMonth} בחודש | ${optionalGoal(metrics.boostPurchasesMonth, targets.boostMonthlyTarget)} | הכנסה ${ils(metrics.boostRevenueTodayAgorot)}`,
    `באנדל חג: ${metrics.bundlePurchasesToday} היום | ${metrics.bundlePurchasesMonth} בחודש | ${optionalGoal(metrics.bundlePurchasesMonth, targets.bundleMonthlyTarget)} | הכנסה ${ils(metrics.bundleRevenueTodayAgorot)}`,
    `לידים: ${metrics.leadsToday} היום | ${metrics.leadsMonth} בחודש | ${optionalGoal(metrics.leadsMonth, targets.leadMonthlyTarget)}`,
    `עוקבים חדשים באינסטגרם: ${metric(metrics.instagramFollowersNew, metrics.instagramFollowersNew !== null && metrics.instagramFollowersNew > 0 ? "+" : "")}`,
    `Meta מכירות: ${ils(metrics.salesCampaignSpendTodayAgorot)} היום | ${ils(metrics.salesCampaignSpendMonthAgorot)} החודש${remainingSalesBudget === null ? "" : `, נותר ${ils(remainingSalesBudget)}`} | CPA ${ils(derived.salesCpaAgorot)} | ROAS כללי ${roas(derived.salesRoas)}`,
    `Meta Boost: ${ils(metrics.boostCampaignSpendTodayAgorot)} היום | ${ils(metrics.boostCampaignSpendMonthAgorot)} החודש | CPA ${ils(derived.boostCpaAgorot)} | ROAS ${roas(derived.boostRoas)}`,
    `התאמות: ${metrics.matchesSentToday} נשלחו | ${pairApprovalText(metrics.matchesMutualYesToday)}`,
    `מאגר: ${metrics.activeSinglesNoMatch14Days} מעל 14 יום בלי התאמה | ${metrics.activeSinglesMissingDetails} עם פרטים חסרים`,
  ];

  const unavailable = Object.values(sources).filter(source => !source.available).map(source => source.label);
  if (unavailable.length) lines.push(`מקור לא זמין: ${unavailable.join(", ")}`);
  if (derived.alerts.length) lines.push(`אזהרות: ${derived.alerts.join("; ")}`);
  lines.push("הערה: CPA ו־ROAS מבוססים על הוצאה והכנסה מאומתות, ללא ייחוס מלא ברמת עסקה.");

  const message = lines.join("\n");
  return message.length <= DAILY_REPORT_MAX_MESSAGE_LENGTH
    ? message
    : `${message.slice(0, DAILY_REPORT_MAX_MESSAGE_LENGTH - 1).trimEnd()}…`;
}
