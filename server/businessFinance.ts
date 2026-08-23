export type RevenueByProduct = {
  product: string;
  purchases: number;
  revenue: number;
};

export type ExpenseForPnl = {
  category: string;
  amountAgorot: number;
};

export type RecurringItemForPnl = {
  itemType: "income" | "expense";
  category: string;
  amountAgorot: number;
};

export function prorateMonthlyAmountAgorot(
  monthlyAmountAgorot: number,
  periodStart: number,
  periodEnd: number,
  validFrom: number,
  validTo?: number | null,
) {
  const activeStart = Math.max(periodStart, validFrom);
  const activeEnd = Math.min(periodEnd, validTo ?? periodEnd);
  if (activeEnd < activeStart || monthlyAmountAgorot <= 0) return 0;

  let total = 0;
  let cursor = new Date(activeStart);
  cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));

  while (cursor.getTime() <= activeEnd) {
    const monthStart = cursor.getTime();
    const nextMonth = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
    const monthEnd = nextMonth - 1;
    const overlapStart = Math.max(activeStart, monthStart);
    const overlapEnd = Math.min(activeEnd, monthEnd);
    if (overlapEnd >= overlapStart) {
      total += monthlyAmountAgorot * ((overlapEnd - overlapStart + 1) / (monthEnd - monthStart + 1));
    }
    cursor = new Date(nextMonth);
  }

  return Math.round(total);
}

export function calculatePnlSummary(
  products: RevenueByProduct[],
  metaSpend: number,
  expenses: ExpenseForPnl[],
  categories: readonly string[],
  recurringItems: RecurringItemForPnl[] = [],
) {
  const productRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const manualRevenue = recurringItems
    .filter(item => item.itemType === "income")
    .reduce((sum, item) => sum + item.amountAgorot / 100, 0);
  const recurringExpenses = recurringItems
    .filter(item => item.itemType === "expense")
    .reduce((sum, item) => sum + item.amountAgorot / 100, 0);
  const grossRevenue = productRevenue + manualRevenue;
  const purchases = products.reduce((sum, product) => sum + product.purchases, 0);
  const categoryTotals: Record<string, number> = Object.fromEntries(categories.map(category => [category, 0]));
  for (const expense of expenses) {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amountAgorot / 100;
  }

  const refunds = categoryTotals.refund || 0;
  const manualExpenses = Object.entries(categoryTotals)
    .filter(([category]) => category !== "refund")
    .reduce((sum, [, amount]) => sum + amount, 0);
  const netRevenue = grossRevenue - refunds;
  const totalExpenses = metaSpend + manualExpenses + recurringExpenses;
  const operatingProfit = netRevenue - totalExpenses;

  return {
    grossRevenue,
    productRevenue,
    manualRevenue,
    refunds,
    netRevenue,
    purchases,
    metaSpend,
    manualExpenses,
    recurringExpenses,
    totalExpenses,
    operatingProfit,
    margin: netRevenue > 0 ? operatingProfit / netRevenue * 100 : 0,
    categoryTotals,
    unitEconomics: {
      averageRevenuePerPurchase: purchases > 0 ? productRevenue / purchases : 0,
      marketingCac: purchases > 0 ? metaSpend / purchases : 0,
      contributionPerPurchase: purchases > 0
        ? (netRevenue - metaSpend - (categoryTotals.processing || 0)) / purchases
        : 0,
      returnOnAdSpend: metaSpend > 0 ? productRevenue / metaSpend : 0,
    },
  };
}
