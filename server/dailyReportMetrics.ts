export const DAILY_REPORT_MAX_MESSAGE_LENGTH = 950;
export const DAILY_REPORT_TIMEZONE = "Asia/Jerusalem";

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
  databasePurchasesWeek: number;
  databasePurchasesMonth: number;
  databaseRevenueTodayAgorot: number;
  databaseRevenueMonthAgorot: number;
  boostPurchasesToday: number;
  boostPurchasesWeek: number;
  boostPurchasesMonth: number;
  boostRevenueTodayAgorot: number;
  boostRevenueMonthAgorot: number;
  bundlePurchasesToday: number;
  bundlePurchasesWeek: number;
  bundlePurchasesMonth: number;
  bundleRevenueTodayAgorot: number;
  bundleRevenueMonthAgorot: number;
  leadsToday: number;
  leadsWeek: number;
  leadsMonth: number;
  instagramFollowersNew: number | null;
  salesCampaignSpendTodayAgorot: number | null;
  salesCampaignSpendMonthAgorot: number | null;
  salesCampaignImpressionsToday: number | null;
  salesCampaignClicksToday: number | null;
  salesCampaignLeadsToday: number | null;
  boostCampaignSpendTodayAgorot: number | null;
  boostCampaignSpendMonthAgorot: number | null;
  boostCampaignImpressionsToday: number | null;
  boostCampaignClicksToday: number | null;
  boostCampaignLeadsToday: number | null;
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
  databaseWeekTarget: number;
  databaseDailyGap: number;
  databaseMonthlyGap: number;
  databasePaceGap: number;
  salesCpaAgorot: number | null;
  salesRoas: number | null;
  boostCpaAgorot: number | null;
  boostRoas: number | null;
  salesCtr: number | null;
  salesCplAgorot: number | null;
  boostCtr: number | null;
  boostCplAgorot: number | null;
  salesDailyBudgetTargetAgorot: number;
  alerts: string[];
};

export type DailyReportMessagePart = {
  key: "sales_targets" | "campaigns" | "database";
  message: string;
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
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const naturalWeekStartDate = new Date(Date.UTC(year, month - 1, day - weekday)).toISOString().slice(0, 10);
  const weekStartDate = naturalWeekStartDate < monthStartDate ? monthStartDate : naturalWeekStartDate;
  return {
    dayStart,
    dayEnd,
    monthStart,
    monthStartDate,
    weekStart: zonedMidnightUtc(weekStartDate, timezone),
    weekStartDate,
    dayOfMonth: day,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

const HOLIDAY_WEIGHTS: Record<string, number> = {
  "2026-09-11": 0.55,
  "2026-09-12": 0.30,
  "2026-09-13": 0.30,
  "2026-09-20": 0.55,
  "2026-09-21": 0.20,
  "2026-09-25": 0.55,
  "2026-09-26": 0.30,
};

export function getDailyBusinessWeight(date: string): number {
  if (HOLIDAY_WEIGHTS[date] !== undefined) return HOLIDAY_WEIGHTS[date];
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 5) return 0.72;
  if (weekday === 6) return 0.62;
  if (weekday === 0) return 1.02;
  return 1.08;
}

function datesInMonth(reportDate: string): string[] {
  const [year, month] = reportDate.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

export function weightedTargetForDate(monthlyTarget: number | null, reportDate: string): number | null {
  if (monthlyTarget === null) return null;
  const dates = datesInMonth(reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date), 0);
  return monthlyTarget * getDailyBusinessWeight(reportDate) / totalWeight;
}

export function weightedTargetForWeek(monthlyTarget: number | null, reportDate: string): number | null {
  if (monthlyTarget === null) return null;
  const dates = datesInMonth(reportDate);
  const range = getReportDateRange(reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date), 0);
  const weekToDateWeight = dates
    .filter(date => date >= range.weekStartDate && date <= reportDate)
    .reduce((sum, date) => sum + getDailyBusinessWeight(date), 0);
  return monthlyTarget * weekToDateWeight / totalWeight;
}

function divideAgorot(numeratorAgorot: number | null, denominator: number): number | null {
  if (numeratorAgorot === null || denominator <= 0) return null;
  return Math.round(numeratorAgorot / denominator);
}

function ratio(numeratorAgorot: number, denominatorAgorot: number | null): number | null {
  if (denominatorAgorot === null || denominatorAgorot <= 0) return null;
  return Math.round((numeratorAgorot / denominatorAgorot) * 100) / 100;
}

function percentage(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function deriveDailyReportMetrics(metrics: DailyReportMetrics, targets: DailyReportTargets): DailyReportDerived {
  const databaseDailyTarget = weightedTargetForDate(targets.databaseMonthlyMinTarget, metrics.reportDate) || 0;
  const databaseWeekTarget = weightedTargetForWeek(targets.databaseMonthlyMinTarget, metrics.reportDate) || 0;
  const dates = datesInMonth(metrics.reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date), 0);
  const elapsedWeight = dates.slice(0, metrics.dayOfMonth).reduce((sum, date) => sum + getDailyBusinessWeight(date), 0);
  const expectedDatabaseToDate = Math.ceil(targets.databaseMonthlyMinTarget * elapsedWeight / totalWeight);
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
    databaseWeekTarget,
    databaseDailyGap: Math.max(0, Math.ceil(databaseDailyTarget - metrics.databasePurchasesToday)),
    databaseMonthlyGap: Math.max(0, targets.databaseMonthlyMinTarget - metrics.databasePurchasesMonth),
    databasePaceGap: Math.max(0, expectedDatabaseToDate - metrics.databasePurchasesMonth),
    salesCpaAgorot,
    salesRoas,
    boostCpaAgorot,
    boostRoas,
    salesCtr: percentage(metrics.salesCampaignClicksToday, metrics.salesCampaignImpressionsToday),
    salesCplAgorot: metrics.salesCampaignLeadsToday && metrics.salesCampaignLeadsToday > 0
      ? divideAgorot(metrics.salesCampaignSpendTodayAgorot, metrics.salesCampaignLeadsToday)
      : null,
    boostCtr: percentage(metrics.boostCampaignClicksToday, metrics.boostCampaignImpressionsToday),
    boostCplAgorot: metrics.boostCampaignLeadsToday && metrics.boostCampaignLeadsToday > 0
      ? divideAgorot(metrics.boostCampaignSpendTodayAgorot, metrics.boostCampaignLeadsToday)
      : null,
    salesDailyBudgetTargetAgorot: Math.round(weightedTargetForDate(targets.databaseMonthlyBudgetAgorot, metrics.reportDate) || 0),
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

function pairApprovalText(count: number): string {
  return count === 1 ? "זוג אחד אמר כן" : `${count} זוגות אמרו כן`;
}

function targetLine(actualToday: number, actualWeek: number, actualMonth: number, monthlyTarget: number | null, reportDate: string): string {
  if (monthlyTarget === null) return `${actualToday} היום | ${actualWeek} השבוע | ${actualMonth} החודש | יעד טרם הוגדר`;
  const daily = weightedTargetForDate(monthlyTarget, reportDate) || 0;
  const weekly = weightedTargetForWeek(monthlyTarget, reportDate) || 0;
  return `${actualToday}/${daily.toFixed(1)} היום | ${actualWeek}/${weekly.toFixed(1)} השבוע | ${actualMonth}/${monthlyTarget} החודש`;
}

function capMessage(message: string): string {
  return message.length <= DAILY_REPORT_MAX_MESSAGE_LENGTH
    ? message
    : `${message.slice(0, DAILY_REPORT_MAX_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

export function buildDailyReportMessages(
  metrics: DailyReportMetrics,
  targets: DailyReportTargets,
  sources: DailyReportSourceStatus,
): DailyReportMessagePart[] {
  const derived = deriveDailyReportMetrics(metrics, targets);
  const [year, month, day] = metrics.reportDate.split("-").map(Number);
  const dateLabel = `${day}.${month}.${year}`;
  const sales = [
    `דוח 1/3 | מכירות ויעדים | ${dateLabel}`,
    `הכנסה: ${ils(metrics.revenueTodayAgorot)} היום | ${ils(metrics.revenueMonthAgorot)} החודש`,
    `מאגר 299₪: ${targetLine(metrics.databasePurchasesToday, metrics.databasePurchasesWeek, metrics.databasePurchasesMonth, targets.databaseMonthlyMinTarget, metrics.reportDate)} | הכנסה ${ils(metrics.databaseRevenueTodayAgorot)}`,
    `באנדל 399₪: ${targetLine(metrics.bundlePurchasesToday, metrics.bundlePurchasesWeek, metrics.bundlePurchasesMonth, targets.bundleMonthlyTarget, metrics.reportDate)} | הכנסה ${ils(metrics.bundleRevenueTodayAgorot)}`,
    `Boost 19.90₪: ${targetLine(metrics.boostPurchasesToday, metrics.boostPurchasesWeek, metrics.boostPurchasesMonth, targets.boostMonthlyTarget, metrics.reportDate)} | הכנסה ${ils(metrics.boostRevenueTodayAgorot)}`,
    `לידים: ${targetLine(metrics.leadsToday, metrics.leadsWeek, metrics.leadsMonth, targets.leadMonthlyTarget, metrics.reportDate)}`,
    targets.revenueMonthlyTargetAgorot === null
      ? "יעד הכנסה חודשי: טרם הוגדר"
      : `יעד הכנסה חודשי: ${ils(targets.revenueMonthlyTargetAgorot)} | חסר ${ils(Math.max(0, targets.revenueMonthlyTargetAgorot - metrics.revenueMonthAgorot))}`,
  ];

  const campaigns = [
    `דוח 2/3 | קמפיינים ותקציבים | ${dateLabel}`,
    `Meta מכירות: הוצאה ${ils(metrics.salesCampaignSpendTodayAgorot)} היום מול יעד משוקלל ${ils(derived.salesDailyBudgetTargetAgorot)} | ${ils(metrics.salesCampaignSpendMonthAgorot)} החודש מתוך ${ils(targets.databaseMonthlyBudgetAgorot)}`,
    `ביצועים: לידים ${metric(metrics.salesCampaignLeadsToday)} | קליקים ${metric(metrics.salesCampaignClicksToday)} | CTR ${metric(derived.salesCtr, "%")} | CPL ${ils(derived.salesCplAgorot)} | CPA ${ils(derived.salesCpaAgorot)} | ROAS ${roas(derived.salesRoas)}`,
    `Meta Boost: הוצאה ${ils(metrics.boostCampaignSpendTodayAgorot)} היום | ${ils(metrics.boostCampaignSpendMonthAgorot)} החודש | לידים ${metric(metrics.boostCampaignLeadsToday)} | CTR ${metric(derived.boostCtr, "%")} | CPL ${ils(derived.boostCplAgorot)} | CPA ${ils(derived.boostCpaAgorot)} | ROAS ${roas(derived.boostRoas)}`,
    `אזהרות: ${derived.alerts.length ? derived.alerts.join("; ") : "אין חריגה אוטומטית"}`,
  ];

  const unavailable = Object.values(sources).filter(source => !source.available).map(source => source.label);
  const database = [
    `דוח 3/3 | המאגר | ${dateLabel}`,
    `נרשמו למאגר: ${metrics.databasePurchasesToday} היום | ${metrics.databasePurchasesMonth}/${targets.databaseMonthlyMinTarget} מהיעד החודשי`,
    `התאמות: ${metrics.matchesSentToday} נשלחו | ${pairApprovalText(metrics.matchesMutualYesToday)}`,
    `דורשים טיפול: ${metrics.activeSinglesMissingDetails} עם פרטים חסרים | ${metrics.activeSinglesNoMatch14Days} ללא התאמה מעל 14 יום`,
    `לידים חדשים: ${metrics.leadsToday} היום | ${metrics.leadsMonth} החודש`,
    `Boost: ${metrics.boostPurchasesToday} היום | ${metrics.boostPurchasesMonth}/${targets.boostMonthlyTarget ?? "יעד טרם הוגדר"} החודש`,
    `עוקבים חדשים באינסטגרם: ${metric(metrics.instagramFollowersNew, metrics.instagramFollowersNew !== null && metrics.instagramFollowersNew > 0 ? "+" : "")}`,
    unavailable.length ? `מקור לא זמין: ${unavailable.join(", ")}` : "מקורות: זמינים",
  ];

  return [
    { key: "sales_targets", message: capMessage(sales.join("\n")) },
    { key: "campaigns", message: capMessage(campaigns.join("\n")) },
    { key: "database", message: capMessage(database.join("\n")) },
  ];
}

export function buildDailyReportMessage(
  metrics: DailyReportMetrics,
  targets: DailyReportTargets,
  sources: DailyReportSourceStatus,
): string {
  return buildDailyReportMessages(metrics, targets, sources).map(part => part.message).join("\n\n");
}
