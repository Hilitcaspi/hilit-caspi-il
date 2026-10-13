type DatedSale = { paidAt: number; day?: string };
export function israelSalesDay(at: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
  const value = (key: string) => parts.find(p => p.type === key)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
/** Current day when selected; otherwise the last selected historical day. */
export function splitSalesVisibleDay<T extends DatedSale>(sales: readonly T[], endDate: number, now = Date.now()) {
  const day = israelSalesDay(Math.min(endDate - 1, now));
  return { day, visible: sales.filter(s => (s.day || israelSalesDay(s.paidAt)) === day), older: sales.filter(s => (s.day || israelSalesDay(s.paidAt)) !== day) };
}
