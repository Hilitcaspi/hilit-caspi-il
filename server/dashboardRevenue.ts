export type DashboardPaymentRow = {
  product: string;
  amountAgorot: number;
  amountSource: "grow" | "estimated";
  paidAt: number;
};

export type DashboardDailyRevenue = {
  date: string;
  purchases: number;
  databasePurchases: number;
  revenue: number;
};

export function israelDateKey(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function aggregateVerifiedGrowPayments(rows: DashboardPaymentRow[]): DashboardDailyRevenue[] {
  const days = new Map<string, DashboardDailyRevenue>();

  for (const row of rows) {
    if (row.amountSource !== "grow") continue;
    const date = israelDateKey(row.paidAt);
    const current = days.get(date) ?? { date, purchases: 0, databasePurchases: 0, revenue: 0 };
    current.purchases += 1;
    current.databasePurchases += row.product === "database" ? 1 : 0;
    current.revenue += row.amountAgorot / 100;
    days.set(date, current);
  }

  return Array.from(days.values())
    .map(day => ({ ...day, revenue: Math.round(day.revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeVerifiedGrowPayments(rows: DashboardPaymentRow[]) {
  const verified = rows.filter(row => row.amountSource === "grow");
  const productSales: Record<string, number> = {};
  let revenue = 0;

  for (const row of verified) {
    productSales[row.product] = (productSales[row.product] ?? 0) + 1;
    revenue += row.amountAgorot / 100;
  }

  return {
    purchases: verified.length,
    revenue: Math.round(revenue * 100) / 100,
    productSales,
  };
}
