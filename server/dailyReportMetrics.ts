export const DAILY_REPORT_MAX_MESSAGE_LENGTH = 950;
export const DAILY_REPORT_TIMEZONE = "Asia/Jerusalem";

export type WeekdayWeights = [number, number, number, number, number, number, number];

export type DailyReportWeightProfiles = Partial<Record<"database" | "bundle" | "boost" | "leads", WeekdayWeights>>;

export type DailyReportTargets = {
  databaseMonthlyMinTarget: number;
  databaseMonthlyStretchTarget: number;
  databaseMonthlyBudgetAgorot: number;
  boostMonthlyTarget: number | null;
  bundleMonthlyTarget: number | null;
  leadMonthlyTarget: number | null;
  revenueMonthlyTargetAgorot: number | null;
  weekdayWeights?: DailyReportWeightProfiles;
  pacingBasisLabel?: string;
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
  databaseCampaignSpendTodayAgorot?: number | null;
  databaseCampaignSpendMonthAgorot?: number | null;
  databaseCampaignPurchasesToday?: number | null;
  databaseCampaignClicksToday?: number | null;
  databaseCampaignImpressionsToday?: number | null;
  databaseCampaignLeadsToday?: number | null;
  bundleCampaignSpendTodayAgorot?: number | null;
  bundleCampaignSpendMonthAgorot?: number | null;
  bundleCampaignPurchasesToday?: number | null;
  boostProductCampaignSpendTodayAgorot?: number | null;
  boostProductCampaignSpendMonthAgorot?: number | null;
  boostProductCampaignPurchasesToday?: number | null;
  otherCampaignSpendTodayAgorot?: number | null;
  otherCampaignSpendMonthAgorot?: number | null;
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
  expectedDatabaseToDate: number;
  expectedBundleToDate: number | null;
  expectedBoostToDate: number | null;
  expectedLeadsToDate: number | null;
  databaseDailyBudgetTargetAgorot: number | null;
  databaseBudgetToDateAgorot: number | null;
  bundleDailyBudgetTargetAgorot: number | null;
  bundleBudgetToDateAgorot: number | null;
  boostDailyBudgetTargetAgorot: number | null;
  boostBudgetToDateAgorot: number | null;
  otherDailyBudgetTargetAgorot: number | null;
  otherBudgetToDateAgorot: number | null;
  mediaPlan: DailyReportMediaPlan;
  alerts: string[];
};

export type DailyReportMediaPlan = {
  databaseMonthlyBudgetAgorot: number | null;
  databasePaidMonthlyTarget: number | null;
  bundleMonthlyBudgetAgorot: number | null;
  bundlePaidMonthlyTarget: number | null;
  boostMonthlyBudgetAgorot: number | null;
  boostPaidMonthlyTarget: number | null;
  dnaMonthlyBudgetAgorot: number | null;
  coachingMonthlyBudgetAgorot: number | null;
  reserveMonthlyBudgetAgorot: number | null;
  totalMonthlyBudgetAgorot: number | null;
  basisLabel: string;
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

export function previousIsoDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function getReportDateForMidnightRun(now = Date.now(), timezone = DAILY_REPORT_TIMEZONE): string {
  const parts = zonedParts(now, timezone);
  const localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return previousIsoDate(localDate);
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

const DEFAULT_WEEKDAY_WEIGHTS: WeekdayWeights = [1.02, 1.08, 1.08, 1.08, 1.08, 0.72, 0.62];

export function getDailyBusinessWeight(date: string, weekdayWeights?: WeekdayWeights): number {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const baseWeight = (weekdayWeights || DEFAULT_WEEKDAY_WEIGHTS)[weekday];
  if (HOLIDAY_WEIGHTS[date] !== undefined) return HOLIDAY_WEIGHTS[date];
  return baseWeight;
}

export function buildHistoricalWeekdayWeights(
  timestamps: number[],
  historyStart: number,
  historyEnd: number,
  timezone = DAILY_REPORT_TIMEZONE,
): WeekdayWeights | null {
  const valid = timestamps.filter(timestamp => timestamp >= historyStart && timestamp < historyEnd);
  if (valid.length < 14 || historyEnd <= historyStart) return null;
  const eventCounts = Array(7).fill(0) as number[];
  for (const timestamp of valid) {
    const parts = zonedParts(timestamp, timezone);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    eventCounts[weekday] += 1;
  }
  const dayCounts = Array(7).fill(0) as number[];
  for (let cursor = historyStart; cursor < historyEnd; cursor += 24 * 60 * 60 * 1000) {
    const parts = zonedParts(cursor + 12 * 60 * 60 * 1000, timezone);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    dayCounts[weekday] += 1;
  }
  const totalDays = dayCounts.reduce((sum, count) => sum + count, 0);
  const overallRate = valid.length / Math.max(1, totalDays);
  return eventCounts.map((count, weekday) => {
    const rate = count / Math.max(1, dayCounts[weekday]);
    return Math.max(0.45, Math.min(1.75, rate / overallRate));
  }) as WeekdayWeights;
}

function datesInMonth(reportDate: string): string[] {
  const [year, month] = reportDate.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

export function weightedTargetForDate(monthlyTarget: number | null, reportDate: string, weekdayWeights?: WeekdayWeights): number | null {
  if (monthlyTarget === null) return null;
  const dates = datesInMonth(reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date, weekdayWeights), 0);
  return monthlyTarget * getDailyBusinessWeight(reportDate, weekdayWeights) / totalWeight;
}

export function weightedTargetForWeek(monthlyTarget: number | null, reportDate: string, weekdayWeights?: WeekdayWeights): number | null {
  if (monthlyTarget === null) return null;
  const dates = datesInMonth(reportDate);
  const range = getReportDateRange(reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date, weekdayWeights), 0);
  const weekToDateWeight = dates
    .filter(date => date >= range.weekStartDate && date <= reportDate)
    .reduce((sum, date) => sum + getDailyBusinessWeight(date, weekdayWeights), 0);
  return monthlyTarget * weekToDateWeight / totalWeight;
}

export function weightedTargetToDate(monthlyTarget: number | null, reportDate: string, weekdayWeights?: WeekdayWeights): number | null {
  if (monthlyTarget === null) return null;
  const dates = datesInMonth(reportDate);
  const totalWeight = dates.reduce((sum, date) => sum + getDailyBusinessWeight(date, weekdayWeights), 0);
  const elapsedWeight = dates
    .filter(date => date <= reportDate)
    .reduce((sum, date) => sum + getDailyBusinessWeight(date, weekdayWeights), 0);
  return monthlyTarget * elapsedWeight / totalWeight;
}

export function getDailyReportMediaPlan(reportDate: string, databaseMonthlyBudgetAgorot: number): DailyReportMediaPlan {
  if (reportDate.startsWith("2026-09-")) {
    return {
      databaseMonthlyBudgetAgorot,
      databasePaidMonthlyTarget: 150,
      bundleMonthlyBudgetAgorot: 700_000,
      bundlePaidMonthlyTarget: 70,
      boostMonthlyBudgetAgorot: 35_000,
      boostPaidMonthlyTarget: 45,
      dnaMonthlyBudgetAgorot: 50_000,
      coachingMonthlyBudgetAgorot: 100_000,
      reserveMonthlyBudgetAgorot: 115_000,
      totalMonthlyBudgetAgorot: 2_000_000,
      basisLabel: "תוכנית ספטמבר שאושרה",
    };
  }
  return {
    databaseMonthlyBudgetAgorot,
    databasePaidMonthlyTarget: null,
    bundleMonthlyBudgetAgorot: null,
    bundlePaidMonthlyTarget: null,
    boostMonthlyBudgetAgorot: null,
    boostPaidMonthlyTarget: null,
    dnaMonthlyBudgetAgorot: null,
    coachingMonthlyBudgetAgorot: null,
    reserveMonthlyBudgetAgorot: null,
    totalMonthlyBudgetAgorot: databaseMonthlyBudgetAgorot,
    basisLabel: "תקציב המאגר שהוגדר בדוח",
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

function percentage(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function deriveDailyReportMetrics(metrics: DailyReportMetrics, targets: DailyReportTargets): DailyReportDerived {
  const databaseWeights = targets.weekdayWeights?.database;
  const bundleWeights = targets.weekdayWeights?.bundle;
  const boostWeights = targets.weekdayWeights?.boost;
  const leadWeights = targets.weekdayWeights?.leads;
  const mediaPlan = getDailyReportMediaPlan(metrics.reportDate, targets.databaseMonthlyBudgetAgorot);
  const databaseDailyTarget = weightedTargetForDate(targets.databaseMonthlyMinTarget, metrics.reportDate, databaseWeights) || 0;
  const databaseWeekTarget = weightedTargetForWeek(targets.databaseMonthlyMinTarget, metrics.reportDate, databaseWeights) || 0;
  const expectedDatabaseToDate = Math.ceil(weightedTargetToDate(targets.databaseMonthlyMinTarget, metrics.reportDate, databaseWeights) || 0);
  const expectedBundleToDate = targets.bundleMonthlyTarget === null
    ? null
    : Math.ceil(weightedTargetToDate(targets.bundleMonthlyTarget, metrics.reportDate, bundleWeights) || 0);
  const expectedBoostToDate = targets.boostMonthlyTarget === null
    ? null
    : Math.ceil(weightedTargetToDate(targets.boostMonthlyTarget, metrics.reportDate, boostWeights) || 0);
  const expectedLeadsToDate = targets.leadMonthlyTarget === null
    ? null
    : Math.ceil(weightedTargetToDate(targets.leadMonthlyTarget, metrics.reportDate, leadWeights) || 0);
  const databaseDailyBudgetTargetAgorot = mediaPlan.databaseMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetForDate(mediaPlan.databaseMonthlyBudgetAgorot, metrics.reportDate, databaseWeights) || 0);
  const databaseBudgetToDateAgorot = mediaPlan.databaseMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetToDate(mediaPlan.databaseMonthlyBudgetAgorot, metrics.reportDate, databaseWeights) || 0);
  const bundleDailyBudgetTargetAgorot = mediaPlan.bundleMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetForDate(mediaPlan.bundleMonthlyBudgetAgorot, metrics.reportDate, bundleWeights) || 0);
  const bundleBudgetToDateAgorot = mediaPlan.bundleMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetToDate(mediaPlan.bundleMonthlyBudgetAgorot, metrics.reportDate, bundleWeights) || 0);
  const boostDailyBudgetTargetAgorot = mediaPlan.boostMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetForDate(mediaPlan.boostMonthlyBudgetAgorot, metrics.reportDate, boostWeights) || 0);
  const boostBudgetToDateAgorot = mediaPlan.boostMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetToDate(mediaPlan.boostMonthlyBudgetAgorot, metrics.reportDate, boostWeights) || 0);
  const otherMonthlyBudgetAgorot = mediaPlan.dnaMonthlyBudgetAgorot === null
    || mediaPlan.coachingMonthlyBudgetAgorot === null
    || mediaPlan.reserveMonthlyBudgetAgorot === null
    ? null
    : mediaPlan.dnaMonthlyBudgetAgorot + mediaPlan.coachingMonthlyBudgetAgorot + mediaPlan.reserveMonthlyBudgetAgorot;
  const otherDailyBudgetTargetAgorot = otherMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetForDate(otherMonthlyBudgetAgorot, metrics.reportDate, leadWeights) || 0);
  const otherBudgetToDateAgorot = otherMonthlyBudgetAgorot === null
    ? null
    : Math.round(weightedTargetToDate(otherMonthlyBudgetAgorot, metrics.reportDate, leadWeights) || 0);
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
    expectedDatabaseToDate,
    expectedBundleToDate,
    expectedBoostToDate,
    expectedLeadsToDate,
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
    salesDailyBudgetTargetAgorot: databaseDailyBudgetTargetAgorot || 0,
    databaseDailyBudgetTargetAgorot,
    databaseBudgetToDateAgorot,
    bundleDailyBudgetTargetAgorot,
    bundleBudgetToDateAgorot,
    boostDailyBudgetTargetAgorot,
    boostBudgetToDateAgorot,
    otherDailyBudgetTargetAgorot,
    otherBudgetToDateAgorot,
    mediaPlan,
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

function paceGap(actual: number, planned: number): string {
  const difference = actual - planned;
  if (Math.abs(difference) < 0.5) return "בקצב";
  return `${difference > 0 ? "+" : ""}${Math.round(difference)} מהקצב`;
}

function targetLine(
  actualToday: number,
  actualWeek: number,
  actualMonth: number,
  monthlyTarget: number | null,
  reportDate: string,
  weekdayWeights?: WeekdayWeights,
): string {
  if (monthlyTarget === null) return `${actualToday} היום | ${actualWeek} השבוע | ${actualMonth} החודש | יעד טרם הוגדר`;
  const daily = weightedTargetForDate(monthlyTarget, reportDate, weekdayWeights) || 0;
  const weekly = weightedTargetForWeek(monthlyTarget, reportDate, weekdayWeights) || 0;
  const toDate = weightedTargetToDate(monthlyTarget, reportDate, weekdayWeights) || 0;
  return `יום ${actualToday}/${daily.toFixed(1)} | שבוע ${actualWeek}/${weekly.toFixed(1)} | מצטבר ${actualMonth}/${Math.ceil(toDate)} (${paceGap(actualMonth, toDate)}) | חודש ${monthlyTarget}`;
}

function budgetLine(
  label: string,
  actualTodayAgorot: number | null | undefined,
  actualMonthAgorot: number | null | undefined,
  dailyPlanAgorot: number | null,
  toDatePlanAgorot: number | null,
  monthlyPlanAgorot: number | null,
): string {
  if (actualTodayAgorot === null || actualTodayAgorot === undefined || actualMonthAgorot === null || actualMonthAgorot === undefined) {
    return `${label}: נתוני Meta לא זמינים`;
  }
  if (dailyPlanAgorot === null || toDatePlanAgorot === null || monthlyPlanAgorot === null) {
    return `${label}: יום ${ils(actualTodayAgorot)} | חודש ${ils(actualMonthAgorot)} | תקציב טרם הוגדר`;
  }
  const variance = actualMonthAgorot - toDatePlanAgorot;
  const variancePercent = toDatePlanAgorot > 0 ? Math.round((variance / toDatePlanAgorot) * 100) : 0;
  const varianceText = variance === 0
    ? "בקצב"
    : `${ils(Math.abs(variance))} ${variance > 0 ? "מעל" : "מתחת"} (${variancePercent > 0 ? "+" : ""}${variancePercent}%)`;
  return `${label}: יום ${ils(actualTodayAgorot)}/${ils(dailyPlanAgorot)} | מצטבר ${ils(actualMonthAgorot)}/${ils(toDatePlanAgorot)} (${varianceText}) | חודש ${ils(monthlyPlanAgorot)}`;
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
    `דוח 1/3 | מכירות | נתוני ${dateLabel}`,
    `הכנסה: יום ${ils(metrics.revenueTodayAgorot)} | חודש ${ils(metrics.revenueMonthAgorot)}`,
    `מאגר 299₪: ${targetLine(metrics.databasePurchasesToday, metrics.databasePurchasesWeek, metrics.databasePurchasesMonth, targets.databaseMonthlyMinTarget, metrics.reportDate, targets.weekdayWeights?.database)} | הכנסה יום ${ils(metrics.databaseRevenueTodayAgorot)}`,
    `באנדל 399₪: ${targetLine(metrics.bundlePurchasesToday, metrics.bundlePurchasesWeek, metrics.bundlePurchasesMonth, targets.bundleMonthlyTarget, metrics.reportDate, targets.weekdayWeights?.bundle)} | הכנסה יום ${ils(metrics.bundleRevenueTodayAgorot)}`,
    `Boost 19.90₪: ${targetLine(metrics.boostPurchasesToday, metrics.boostPurchasesWeek, metrics.boostPurchasesMonth, targets.boostMonthlyTarget, metrics.reportDate, targets.weekdayWeights?.boost)} | הכנסה יום ${ils(metrics.boostRevenueTodayAgorot)}`,
    `לידים: ${targetLine(metrics.leadsToday, metrics.leadsWeek, metrics.leadsMonth, targets.leadMonthlyTarget, metrics.reportDate, targets.weekdayWeights?.leads)}`,
    targets.revenueMonthlyTargetAgorot === null
      ? "יעד הכנסה חודשי: טרם הוגדר"
      : `יעד הכנסה חודשי: ${ils(targets.revenueMonthlyTargetAgorot)} | חסר ${ils(Math.max(0, targets.revenueMonthlyTargetAgorot - metrics.revenueMonthAgorot))}`,
    `בסיס קצב: ${targets.pacingBasisLabel || "יעדי העסק + משקלי סופ״ש וחגים"}`,
  ];

  const otherMonthlyPlanAgorot = derived.mediaPlan.dnaMonthlyBudgetAgorot === null
    || derived.mediaPlan.coachingMonthlyBudgetAgorot === null
    || derived.mediaPlan.reserveMonthlyBudgetAgorot === null
    ? null
    : derived.mediaPlan.dnaMonthlyBudgetAgorot + derived.mediaPlan.coachingMonthlyBudgetAgorot + derived.mediaPlan.reserveMonthlyBudgetAgorot;
  const campaigns = [
    `דוח 2/3 | תקציב ויעילות | נתוני ${dateLabel}`,
    budgetLine("Meta מאגר", metrics.databaseCampaignSpendTodayAgorot, metrics.databaseCampaignSpendMonthAgorot, derived.databaseDailyBudgetTargetAgorot, derived.databaseBudgetToDateAgorot, derived.mediaPlan.databaseMonthlyBudgetAgorot),
    budgetLine("Meta באנדל", metrics.bundleCampaignSpendTodayAgorot, metrics.bundleCampaignSpendMonthAgorot, derived.bundleDailyBudgetTargetAgorot, derived.bundleBudgetToDateAgorot, derived.mediaPlan.bundleMonthlyBudgetAgorot),
    budgetLine("Meta Boost", metrics.boostProductCampaignSpendTodayAgorot, metrics.boostProductCampaignSpendMonthAgorot, derived.boostDailyBudgetTargetAgorot, derived.boostBudgetToDateAgorot, derived.mediaPlan.boostMonthlyBudgetAgorot),
    budgetLine("DNA/פגישות/רזרבה", metrics.otherCampaignSpendTodayAgorot, metrics.otherCampaignSpendMonthAgorot, derived.otherDailyBudgetTargetAgorot, derived.otherBudgetToDateAgorot, otherMonthlyPlanAgorot),
    `יעילות מכירות: קליקים ${metric(metrics.salesCampaignClicksToday)} | CTR ${metric(derived.salesCtr, "%")} | CPL ${ils(derived.salesCplAgorot)} | CPA Grow ${ils(derived.salesCpaAgorot)} | ROAS Grow ${roas(derived.salesRoas)}`,
    `יעילות Boost: CTR ${metric(derived.boostCtr, "%")} | CPL ${ils(derived.boostCplAgorot)} | CPA Grow ${ils(derived.boostCpaAgorot)} | ROAS Grow ${roas(derived.boostRoas)}`,
    `תוכנית: ${derived.mediaPlan.basisLabel} | סה״כ חודש ${ils(derived.mediaPlan.totalMonthlyBudgetAgorot)}`,
    `אזהרות: ${derived.alerts.length ? derived.alerts.join("; ") : "אין חריגה אוטומטית"}`,
  ];

  const unavailable = Object.values(sources).filter(source => !source.available).map(source => source.label);
  const database = [
    `דוח 3/3 | המאגר | נתוני ${dateLabel}`,
    `נרשמו למאגר: יום ${metrics.databasePurchasesToday}/${derived.databaseDailyTarget.toFixed(1)} | מצטבר ${metrics.databasePurchasesMonth}/${derived.expectedDatabaseToDate} | חודש ${targets.databaseMonthlyMinTarget} | פער קצב ${derived.databasePaceGap}`,
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
