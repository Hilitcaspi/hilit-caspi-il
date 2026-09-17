export type DashboardPeriod = {
  startDate: number;
  endDate: number;
};

const ISRAEL_TIMEZONE = "Asia/Jerusalem";

function zonedParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value || 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function timezoneOffsetMs(timestamp: number) {
  const parts = zonedParts(timestamp);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(timestamp / 1000) * 1000;
}

function israelLocalTimeUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const base = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let result = base;
  for (let index = 0; index < 3; index += 1) result = base - timezoneOffsetMs(result);
  return result;
}

export const VERIFIED_GROW_FULL_COVERAGE_START = israelLocalTimeUtc(2026, 8, 22);

export function hasVerifiedGrowCoverage(period: DashboardPeriod) {
  return period.startDate >= VERIFIED_GROW_FULL_COVERAGE_START;
}

export function previousEqualPeriod(startDate: number, endDate: number): DashboardPeriod {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate < startDate) {
    throw new Error("Invalid dashboard date range");
  }
  const duration = endDate - startDate + 1;
  const previousEnd = startDate - 1;
  return {
    startDate: previousEnd - duration + 1,
    endDate: previousEnd,
  };
}

export function previousComparisonPeriod(startDate: number, endDate: number): DashboardPeriod & { basis: "same_dates_previous_month" | "previous_equal_period" } {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate < startDate) {
    throw new Error("Invalid dashboard date range");
  }
  const start = zonedParts(startDate);
  if (start.day !== 1 || start.hour !== 0 || start.minute !== 0 || start.second !== 0) {
    return { ...previousEqualPeriod(startDate, endDate), basis: "previous_equal_period" };
  }

  const end = zonedParts(endDate);
  const previousMonthDate = new Date(Date.UTC(start.year, start.month - 2, 1));
  const previousYear = previousMonthDate.getUTCFullYear();
  const previousMonth = previousMonthDate.getUTCMonth() + 1;
  const daysInPreviousMonth = new Date(Date.UTC(previousYear, previousMonth, 0)).getUTCDate();
  const targetDay = Math.min(end.day, daysInPreviousMonth);
  const previousStart = israelLocalTimeUtc(previousYear, previousMonth, 1);
  const previousEnd = israelLocalTimeUtc(
    previousYear,
    previousMonth,
    targetDay,
    end.hour,
    end.minute,
    end.second,
    endDate % 1000,
  );
  return { startDate: previousStart, endDate: previousEnd, basis: "same_dates_previous_month" };
}
