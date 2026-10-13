export type SalesProductFilter = "database" | "boost" | "plus" | "other" | "all" | `product:${string}`;
export const DEFAULT_SALES_PRODUCT: SalesProductFilter = "database";
export const SALES_PRODUCT_CHOICES = [
  { value: "database", label: "מאגר רווקים" },
  { value: "boost", label: "Boost" },
  { value: "plus", label: "דאטה פלוס" },
  { value: "other", label: "מוצרים נוספים" },
  { value: "all", label: "כל המוצרים יחד" },
] as const;
type ProductSale = { product: string; productLabel: string; status: "included" | "review"; amountAgorot: number };
const key = (value: string) => value.trim().toLowerCase();
export function salesProductGroup(product: string): "database" | "boost" | "plus" | "other" {
  const value = key(product);
  if (value === "database") return "database";
  if (value === "match_boost" || value === "boost") return "boost";
  if (value === "plus" || value === "database_plus") return "plus";
  return "other";
}
export function filterSalesByProduct<T extends ProductSale>(sales: T[], filter: SalesProductFilter = DEFAULT_SALES_PRODUCT): T[] {
  return sales.filter(sale => filter === "all" || (filter.startsWith("product:")
    ? key(sale.product) === filter.slice("product:".length)
    : salesProductGroup(sale.product) === filter));
}
export function summarizeProductSales(sales: ProductSale[]) {
  return sales.reduce((sum, sale) => {
    if (sale.status === "included") { sum.includedCount++; sum.includedRevenueAgorot += sale.amountAgorot; }
    else { sum.reviewCount++; sum.reviewRevenueAgorot += sale.amountAgorot; }
    return sum;
  }, { includedCount: 0, includedRevenueAgorot: 0, reviewCount: 0, reviewRevenueAgorot: 0 });
}
export function additionalSalesProducts(sales: ProductSale[]) {
  const products = new Map<string, string>();
  for (const sale of sales) if (salesProductGroup(sale.product) === "other") products.set(key(sale.product), sale.productLabel);
  return Array.from(products.entries()).map(([value, label]) => ({ value: `product:${value}` as SalesProductFilter, label })).sort((a,b) => a.label.localeCompare(b.label,"he"));
}
