export type RevenueByProduct = {
  product: string;
  purchases: number;
  revenue: number;
};

export type ExpenseForPnl = {
  category: string;
  amountAgorot: number;
};

export function calculatePnlSummary(
  products: RevenueByProduct[],
  metaSpend: number,
  expenses: ExpenseForPnl[],
  categories: readonly string[],
) {
  const grossRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
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
  const totalExpenses = metaSpend + manualExpenses;
  const operatingProfit = netRevenue - totalExpenses;

  return {
    grossRevenue,
    refunds,
    netRevenue,
    purchases,
    metaSpend,
    manualExpenses,
    totalExpenses,
    operatingProfit,
    margin: netRevenue > 0 ? operatingProfit / netRevenue * 100 : 0,
    categoryTotals,
    unitEconomics: {
      averageRevenuePerPurchase: purchases > 0 ? grossRevenue / purchases : 0,
      marketingCac: purchases > 0 ? metaSpend / purchases : 0,
      contributionPerPurchase: purchases > 0
        ? (netRevenue - metaSpend - (categoryTotals.processing || 0)) / purchases
        : 0,
      returnOnAdSpend: metaSpend > 0 ? grossRevenue / metaSpend : 0,
    },
  };
}
