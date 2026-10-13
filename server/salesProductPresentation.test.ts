import { describe, expect, it } from "vitest";
import { DEFAULT_SALES_PRODUCT, filterSalesByProduct, summarizeProductSales, additionalSalesProducts, salesProductGroup } from "../shared/salesProductPresentation";
import { summarizeSalesSources } from "../shared/salesSourcePresentation";
const source = (channel: string, campaign = "database", confidence = "UTM בתשלום") => ({ channel, campaign, confidence });
const row = (product: string, amountAgorot: number, status: "included" | "review" = "included") => ({ product, productLabel: product, amountAgorot, status, closing: source("Email"), acquisition: source("Meta Ads (ממומן)", "קמפיין מאגר", "תיעוד מקור קודם"), emailAssist: null });
const sales = [row("database", 29900), row("match_boost", 1990), row("plus", 9900), row("guide", 14900), row("database", 29900, "review"), row("live_october", 14901)];
describe("product-scoped purchase sources", () => {
  it("defaults to database only, including database offers regardless of coupon or source", () => {
    expect(DEFAULT_SALES_PRODUCT).toBe("database");
    expect(filterSalesByProduct(sales).map(sale => sale.product)).toEqual(["database", "database"]);
    expect(filterSalesByProduct([{ ...row("database", 29900), coupon: "LIVE" }])).toHaveLength(1);
  });
  it("separates Boost, Plus, other products and optional all-products view", () => {
    expect(filterSalesByProduct(sales,"boost").map(sale=>sale.product)).toEqual(["match_boost"]);
    expect(filterSalesByProduct(sales,"plus").map(sale=>sale.product)).toEqual(["plus"]);
    expect(filterSalesByProduct(sales,"other").map(sale=>sale.product)).toEqual(["guide","live_october"]);
    expect(filterSalesByProduct(sales,"all")).toHaveLength(6);
    expect(filterSalesByProduct(sales,"product:guide")).toEqual([sales[3]]);
  });
  it("does not infer a personal-area channel from a Boost product", () => {
    expect(summarizeSalesSources(filterSalesByProduct(sales,"boost"))[0].group).toBe("meta");
  });
  it("uses the same filtered rows for channels, cents, email counts and review totals", () => {
    const filtered = filterSalesByProduct(sales);
    const sum = summarizeProductSales(filtered);
    const channels = summarizeSalesSources(filtered);
    expect(sum).toEqual({includedCount:1,includedRevenueAgorot:29900,reviewCount:1,reviewRevenueAgorot:29900});
    expect(channels.reduce((sum,r)=>sum+r.count,0)).toBe(sum.includedCount);
    expect(channels.reduce((sum,r)=>sum+r.revenueAgorot,0)).toBe(sum.includedRevenueAgorot);
    expect(channels[0]).toMatchObject({group:"meta", emailClosedCount:1});
    expect(summarizeProductSales(filterSalesByProduct(sales,"other")).includedRevenueAgorot).toBe(29801);
  });
  it("handles empty products, unknown products, aliases and case without changing data", () => {
    expect(filterSalesByProduct([])).toEqual([]);
    expect(summarizeProductSales([]).includedCount).toBe(0);
    expect(salesProductGroup(" DATABASE ")).toBe("database");
    expect(salesProductGroup("boost")).toBe("boost");
    expect(salesProductGroup("database_plus")).toBe("plus");
    expect(salesProductGroup("unrecognized")).toBe("other");
    expect(filterSalesByProduct([row("bundle_tubav",29900)])).toEqual([]);
    expect(additionalSalesProducts(sales)).toHaveLength(2);
    expect(sales[1].closing.channel).toBe("Email");
  });
});
