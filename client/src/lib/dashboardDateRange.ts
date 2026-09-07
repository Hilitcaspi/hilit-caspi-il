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

function israelMidnightUtc(year: number, month: number, day: number) {
  const base = Date.UTC(year, month - 1, day, 0, 0, 0);
  let result = base;
  for (let index = 0; index < 3; index += 1) result = base - timezoneOffsetMs(result);
  return result;
}

export function getCurrentIsraelMonthStart(now = Date.now()) {
  const parts = zonedParts(now);
  return israelMidnightUtc(parts.year, parts.month, 1);
}
