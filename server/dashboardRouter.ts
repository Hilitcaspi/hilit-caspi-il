import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { businessExpenses, businessRecurringItems, completedPayments, crmLeads, dailyReportSettings } from "../drizzle/schema";
import { sendEmail } from "./brevo";
import { calculatePnlSummary, prorateMonthlyAmountAgorot } from "./businessFinance";
import { aggregateVerifiedGrowPayments, israelDateKey, summarizeVerifiedGrowPayments } from "./dashboardRevenue";
import { getPaymentAbandonmentAudit } from "./paymentAbandonmentAudit";
import { formatMetaCalendarDate, normalizeMetaCampaign, summarizeMetaSpend } from "./dashboardMetaSpend";
import { hasVerifiedGrowCoverage, previousComparisonPeriod } from "./dashboardPeriods";
import { getDailyReportMediaPlan } from "./dailyReportMetrics";

import { sendSMS } from "./vibrate";
import crypto from "crypto";
// Product prices for revenue calculation
const PRODUCT_PRICES: Record<string, number> = {
  database: 299,
  guide: 149,
  course: 249,
  session: 500,
  coaching: 2960,
  coaching_mas: 4200,
  bundle_tubav: 349,
  bundle_new_year: 399,
};

/**
 * Channel classification logic:
 * - "Meta Ads (ממומן)" = any paid campaign (meta, fb, ig with medium=paid, or campaign IDs as source)
 * - "Instagram (אורגני)" = instagram with bio/story/reel/organic medium (not paid)
 * - "dna_quiz" leads with NO utm = came from the lead campaign funnel (Meta Ads)
 * - Other channels remain as-is
 */

// Sources that are ALWAYS Meta Ads regardless of medium
const META_PAID_SOURCES = new Set(["meta", "Meta", "facebook", "fb", "facebook_shabek"]);

// Sources that could be organic or paid depending on medium
const INSTAGRAM_SOURCES = new Set(["ig", "instagram"]);

// Organic Instagram mediums (not paid)
const IG_ORGANIC_MEDIUMS = new Set(["bio", "story", "reel", "organic", "post", "link"]);

// Other channel mappings
const OTHER_CHANNEL_MAP: Record<string, string> = {
  google: "Google / SEO",
  brevo: "Email (Newsletter)",
  email: "Email (Journeys)",
  whatsapp: "WhatsApp",
  referral: "הפניה",
  shahar: "הפניה",
  customer_service: "שירות לקוחות",
  guide_form: "מדריך חינמי",
  meta_lead_guide: "Meta Ads (ממומן)",
  meta_lead_call: "Meta Ads (ממומן)",
  meta_lead_dna: "Meta Ads (ממומן)",
};

function mapChannel(utmSource: string | null, utmMedium?: string | null): string {
  if (!utmSource) return "ישיר / לא ידוע";
  
  // Meta paid sources — always Meta Ads
  if (META_PAID_SOURCES.has(utmSource)) return "Meta Ads (ממומן)";
  
  // Instagram sources — check if paid or organic
  if (INSTAGRAM_SOURCES.has(utmSource)) {
    if (utmMedium === "paid") return "Meta Ads (ממומן)";
    // If medium contains campaign-like patterns (ad set names, etc.), it's paid
    if (utmMedium && (utmMedium.includes("shabek") || utmMedium.includes("קר") || utmMedium.includes("חם"))) return "Meta Ads (ממומן)";
    return "Instagram (אורגני)";
  }
  
  // dna_quiz with no UTM — these are leads from the Meta lead campaign funnel
  if (utmSource === "dna_quiz") return "Meta Ads (ממומן)";
  
  // Numeric source IDs (like 120248699100040673) are Meta campaign/ad set IDs
  if (/^\d{10,}$/.test(utmSource)) return "Meta Ads (ממומן)";
  
  // Other known channels
  if (OTHER_CHANNEL_MAP[utmSource]) return OTHER_CHANNEL_MAP[utmSource];
  
  return utmSource;
}

// Campaign name translations for readable display
const CAMPAIGN_NAMES: Record<string, string> = {
  database: "מאגר רווקים",
  "dna-quiz": "שאלון DNA",
  dna_quiz: "שאלון DNA",
  database_purchase: "מכירת מאגר ישירה",
  shabek_women: "שבק נשים",
  shabek_men: "שבק גברים",
  shabek: "שבק",
  lead_cold_measure: "לידים קרים",
  lead_cold_120: "לידים קרים (120)",
  home: "עמוד הבית",
  shahar_referral: "הפניה — שחר",
  database_abandon: "נטישת עגלה",
  tubav_cold_asc: "טו באב קר",
  tubav_5retargeting: "טו באב ריטרגטינג",
  tubav_retargeting: "טו באב ריטרגטינג",
  tubav_july2026: "טו באב יולי 2026",
  tubav_july26: "טו באב יולי 2026",
};

function translateCampaign(campaign: string | null): string {
  if (!campaign) return "ישיר / ללא קמפיין";
  // Check direct translation
  if (CAMPAIGN_NAMES[campaign]) return CAMPAIGN_NAMES[campaign];
  // Check if it contains known patterns
  if (campaign.includes("shabek") && campaign.includes("גברים")) return "שבק — גברים + נשים + יום הולדת";
  if (campaign.includes("Purchase") && campaign.includes("DNA")) return "מכירות — שאלון DNA";
  // Return as-is if no translation
  return campaign;
}

function aggregateJourneyAttribution(rows: any[]): Array<{ campaign: string; source: string; leads: number; converted: number; conversionRate: number }> {
  // Aggregate by unified channel + translated campaign
  const agg: Record<string, { leads: number; converted: number }> = {};
  for (const r of rows) {
    const channel = mapChannel(r.source, r.medium);
    const campaign = translateCampaign(r.campaign);
    const key = `${campaign}|||${channel}`;
    if (!agg[key]) agg[key] = { leads: 0, converted: 0 };
    agg[key].leads += Number(r.totalLeads);
    agg[key].converted += Number(r.converted);
  }
  return Object.entries(agg)
    .map(([key, data]) => {
      const [campaign, source] = key.split("|||");
      return {
        campaign,
        source,
        leads: data.leads,
        converted: data.converted,
        conversionRate: data.leads > 0 ? Math.round(data.converted / data.leads * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.converted - a.converted || b.leads - a.leads)
    .slice(0, 15);
}

export function normalizeLandingCategory(urlOrTag: string | null | undefined) {
  const raw = String(urlOrTag || "").trim();
  if (!raw) return { category: "unknown", label: "לא זוהה" };
  const value = raw.toLowerCase();
  if (/^\/?utm_/i.test(value)) return { category: "unknown", label: "לא זוהה" };
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://hilitcaspi.com${raw.startsWith("/") ? raw : `/${raw}`}`);
    const path = parsed.pathname.toLowerCase();
    const params = parsed.searchParams;
    const campaign = `${params.get("utm_campaign") || ""} ${params.get("utm_content") || ""}`.toLowerCase();
    const combined = `${path} ${campaign}`;
    if (combined.includes("dna") || combined.includes("quiz")) return { category: "dna_quiz", label: "שאלון DNA" };
    if (combined.includes("database") || combined.includes("singles") || combined.includes("maagar") || combined.includes("/join")) return { category: "database", label: "עמוד המאגר" };
    if (combined.includes("boost-now") || combined.includes("match-boost")) return { category: "boost", label: "עמוד Boost" };
    if (combined.includes("new-year") || combined.includes("bundle") || combined.includes("holiday")) return { category: "bundle", label: "עמוד הטבה/באנדל" };
    if (path === "/" || path === "") return { category: "home", label: "עמוד הבית" };
    return { category: path.replace(/^\//, "") || "other", label: path || "עמוד אחר" };
  } catch {
    if (value.includes("dna") || value.includes("quiz")) return { category: "dna_quiz", label: "שאלון DNA" };
    if (value.includes("database") || value.includes("singles") || value.includes("maagar") || value.includes("/join")) return { category: "database", label: "עמוד המאגר" };
    if (value.includes("boost-now") || value.includes("match-boost")) return { category: "boost", label: "עמוד Boost" };
    if (value.includes("bundle") || value.includes("holiday")) return { category: "bundle", label: "עמוד הטבה/באנדל" };
    if (value.includes("hilitcaspi.com/") || value.endsWith("hilitcaspi.com")) return { category: "home", label: "עמוד הבית" };
    return { category: "unknown", label: "לא זוהה" };
  }
}

function collectUrlsDeep(value: unknown, urls: Set<string>) {
  if (!value) return;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || value.includes("utm_campaign") || value.startsWith("/")) urls.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectUrlsDeep(item, urls));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (["link", "website_url", "url", "url_tags"].includes(key)) collectUrlsDeep(nested, urls);
      else if (typeof nested === "object") collectUrlsDeep(nested, urls);
    }
  }
}

function extractUtmCampaign(raw: string) {
  const match = raw.match(/(?:^|[?&])utm_campaign=([^&#]+)/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1].replace(/\+/g, " ")).trim(); } catch { return match[1].trim(); }
}

let metaDestinationsCache: { fetchedAt: number; data: Record<string, { labels: string[]; categories: string[]; utmCampaigns: string[]; activeAds: number; ads: number }> } | null = null;

async function fetchMetaCampaignDestinations() {
  if (metaDestinationsCache && Date.now() - metaDestinationsCache.fetchedAt < 10 * 60 * 1000) return metaDestinationsCache.data;
  const token = process.env.META_ADS_TOKEN;
  if (!token) return metaDestinationsCache?.data || {};
  const accountId = "act_254697595735216";
  const fields = "campaign_id,campaign_name,effective_status,creative{object_story_spec,asset_feed_spec,url_tags}";
  const byCampaign: Record<string, { labels: Set<string>; categories: Set<string>; utmCampaigns: Set<string>; activeAds: number; ads: number }> = {};
  try {
    let next: string | null = `https://graph.facebook.com/v25.0/${accountId}/ads?fields=${fields}&limit=200&access_token=${token}`;
    while (next) {
      const res = await fetch(next, { signal: AbortSignal.timeout(20_000) });
      const payload: any = await res.json();
      if (!res.ok || payload.error) throw new Error(payload.error?.message || `Meta HTTP ${res.status}`);
      for (const ad of payload.data || []) {
        const id = String(ad.campaign_id || "");
        if (!id) continue;
        if (!byCampaign[id]) byCampaign[id] = { labels: new Set(), categories: new Set(), utmCampaigns: new Set(), activeAds: 0, ads: 0 };
        byCampaign[id].ads += 1;
        if (ad.effective_status === "ACTIVE") byCampaign[id].activeAds += 1;
        const urls = new Set<string>();
        collectUrlsDeep(ad.creative, urls);
        urls.forEach(url => {
          const landing = normalizeLandingCategory(url);
          if (landing.category !== "unknown") {
            byCampaign[id].labels.add(landing.label);
            byCampaign[id].categories.add(landing.category);
          }
          const utmCampaign = extractUtmCampaign(url);
          if (utmCampaign) byCampaign[id].utmCampaigns.add(utmCampaign.toLowerCase());
        });
      }
      next = payload.paging?.next || null;
    }
  } catch (error) {
    console.error("Meta destination fetch error:", error);
    return metaDestinationsCache?.data || {};
  }
  const data = Object.fromEntries(Object.entries(byCampaign).map(([id, value]) => [id, {
    labels: Array.from(value.labels).filter(Boolean).slice(0, 4),
    categories: Array.from(value.categories).filter(Boolean).slice(0, 4),
    utmCampaigns: Array.from(value.utmCampaigns).filter(Boolean).slice(0, 8),
    activeAds: value.activeAds,
    ads: value.ads,
  }]));
  metaDestinationsCache = { fetchedAt: Date.now(), data };
  return data;
}

export function inferCampaignUtmAliases(name: string, explicit: string[] = []) {
  const normalized = name.toLowerCase();
  const explicitAliases = explicit.map(value => value.toLowerCase().trim()).filter(Boolean);
  if (explicitAliases.length > 0) return Array.from(new Set(explicitAliases));
  const aliases = new Set<string>();
  const isLeadCampaign = normalized.includes("lead") || normalized.includes("ליד");
  const isSalesCampaign = normalized.includes("sales") || normalized.includes("מכירה");
  if (normalized.includes("סיפורי הצלחה")) aliases.add("dna_leads_cold_success_stories");
  if ((normalized.includes("קהל קר") || normalized.includes("cold")) && isLeadCampaign) {
    aliases.add("lead_cold_measure");
    aliases.add("lead_cold_120");
  }
  if ((normalized.includes("קהל חם") || normalized.includes("warm")) && isLeadCampaign) aliases.add("lead_warm_30d");
  if ((normalized.includes("קהל קר") || normalized.includes("cold")) && isSalesCampaign) aliases.add("database_purchase");
  if ((normalized.includes("קהל חם") || normalized.includes("warm")) && isSalesCampaign) aliases.add("sales_warm_audience");
  if (normalized.includes("יום הולדת")) aliases.add("‏shabek campign - גברים - נשים - יום הולדת | 06/08".toLowerCase());
  return Array.from(aliases);
}

function guardAdmin(ctx: any) {
  if (!ctx.user && !ctx.teamMember) throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}


// ── Meta Ads API helper ─────────────────────────────────────────────────────
// ── Instagram & Facebook Insights API helper ────────────────────────────────
export async function fetchSocialInsights(since: number, until: number) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return null;
  const PAGE_ID = "853268171195420"; // Hilit Caspi Relationship
  const IG_ID = "17841476794270830";
  
  try {
    const fetchJson = async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error?.message || `Meta HTTP ${response.status}`);
      return payload;
    };
    // Get page token for insights
    const pagesData = await fetchJson(`https://graph.facebook.com/v25.0/me/accounts?fields=id,access_token&access_token=${token}`);
    const page = pagesData.data?.find((p: any) => p.id === PAGE_ID);
    const pageToken = page?.access_token || token;
    
    const sinceUnix = Math.floor(since / 1000);
    const untilUnix = Math.floor(until / 1000);
    const previous = previousComparisonPeriod(since, until);
    const previousSinceUnix = Math.floor(previous.startDate / 1000);
    const previousUntilUnix = Math.floor(previous.endDate / 1000);
    
    const totalsUrl = (from: number, to: number) => `https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=accounts_engaged,total_interactions,likes,comments,shares,saves&metric_type=total_value&period=day&since=${from}&until=${to}&access_token=${pageToken}`;
    const [igTimeData, igTotalData, previousTotalData, igProfile, fbPage, mediaData] = await Promise.all([
      fetchJson(`https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=reach&metric_type=time_series&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${pageToken}`),
      fetchJson(totalsUrl(sinceUnix, untilUnix)),
      fetchJson(totalsUrl(previousSinceUnix, previousUntilUnix)).catch(() => ({ data: [] })),
      fetchJson(`https://graph.facebook.com/v25.0/${IG_ID}?fields=followers_count,media_count,username&access_token=${pageToken}`),
      fetchJson(`https://graph.facebook.com/v25.0/${PAGE_ID}?fields=fan_count,followers_count,name&access_token=${pageToken}`),
      fetchJson(`https://graph.facebook.com/v25.0/${IG_ID}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&since=${sinceUnix}&until=${untilUnix}&limit=12&access_token=${pageToken}`).catch(() => ({ data: [] })),
    ]);
    
    const reachData = igTimeData.data?.find((m: any) => m.name === 'reach')?.values || [];
    const parseTotals = (payload: any) => Object.fromEntries((payload.data || []).map((metric: any) => [metric.name, Number(metric.total_value?.value || 0)]));
    const totals = parseTotals(igTotalData);
    const previousTotals = parseTotals(previousTotalData);
    
    const totalReach = reachData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const avgDailyReach = reachData.length > 0 ? Math.round(totalReach / reachData.length) : 0;

    const posts = (mediaData.data || []).map((item: any) => ({
      id: item.id,
      caption: String(item.caption || "").replace(/\s+/g, " ").trim().slice(0, 120),
      mediaType: item.media_type || "UNKNOWN",
      timestamp: item.timestamp || null,
      permalink: item.permalink || null,
      likes: Number(item.like_count || 0),
      comments: Number(item.comments_count || 0),
      interactions: Number(item.like_count || 0) + Number(item.comments_count || 0),
    })).sort((a: any, b: any) => b.interactions - a.interactions);
    
    return {
      status: "available" as const,
      fetchedAt: Date.now(),
      note: "נתוני הסושיאל עשויים להתעדכן באיחור של עד 48 שעות. מספר העוקבים הוא צילום מצב נוכחי.",
      instagram: {
        username: igProfile.username || 'hilitcaspi_relationship',
        followers: igProfile.followers_count || 0,
        posts: igProfile.media_count || 0,
        followerGrowth: null,
        totalReach,
        avgDailyReach,
        accountsEngaged: totals.accounts_engaged || 0,
        totalInteractions: totals.total_interactions || 0,
        likes: totals.likes || 0,
        comments: totals.comments || 0,
        shares: totals.shares || 0,
        saves: totals.saves || 0,
        previousAccountsEngaged: previousTotals.accounts_engaged || 0,
        previousTotalInteractions: previousTotals.total_interactions || 0,
        dailyReach: reachData.map((d: any) => ({ date: d.end_time?.split('T')[0], value: d.value || 0 })),
        topPosts: posts,
      },
      facebook: {
        pageName: fbPage.name || 'Hilit Caspi Relationship',
        fans: fbPage.fan_count || 0,
        followers: fbPage.followers_count || 0,
      },
      whatsappGroupSize: null,
    };
  } catch (err) {
    console.error("[SocialInsights] Error:", err);
    return null;
  }
}

async function fetchMetaAdsInsightsUncached(since: string, until: string) {
  const token = process.env.META_ADS_TOKEN;
  const mainAccountId = "act_254697595735216";
  const boostsAccountId = "act_3841144459522772";
  const fields = "campaign_id,campaign_name,objective,spend,impressions,clicks,reach,actions,action_values";
  type AccountFetchResult = {
    rows: ReturnType<typeof normalizeMetaCampaign>[];
    status: "available" | "unavailable";
  };
  async function fetchAccount(accountId: string, accountRole: "sales_acquisition" | "profile_boosts"): Promise<AccountFetchResult> {
    if (!token) return { rows: [] as ReturnType<typeof normalizeMetaCampaign>[], status: "unavailable" as const };
    try {
      const rows: any[] = [];
      let next: string | null = `https://graph.facebook.com/v25.0/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=100&access_token=${token}`;
      while (next) {
        const res = await fetch(next, { signal: AbortSignal.timeout(8_000) });
        const data: any = await res.json();
        if (!res.ok || data.error) throw new Error(data.error?.message || `Meta HTTP ${res.status}`);
        rows.push(...(data.data || []));
        next = data.paging?.next || null;
      }
      return { rows: rows.map(row => normalizeMetaCampaign(row, accountRole)), status: "available" as const };
    } catch (e) {
      console.error("Meta fetch error:", e);
      return { rows: [], status: "unavailable" };
    }
  }
  const [main, boosts] = await Promise.all([
    fetchAccount(mainAccountId, "sales_acquisition"),
    fetchAccount(boostsAccountId, "profile_boosts"),
  ]);
  const statuses = [main.status, boosts.status];
  const status = statuses.every(value => value === "available")
    ? "available" as const
    : statuses.some(value => value === "available") ? "partial" as const : "unavailable" as const;
  return { campaigns: main.rows || [], boosts: boosts.rows || [], status, fetchedAt: Date.now() };
}

type MetaAdsInsightsResult = Awaited<ReturnType<typeof fetchMetaAdsInsightsUncached>>;
const metaAdsInsightsCache = new Map<string, { expiresAt: number; data: MetaAdsInsightsResult }>();
const metaAdsInsightsInFlight = new Map<string, Promise<MetaAdsInsightsResult>>();

export async function fetchMetaAdsInsights(since: string, until: string) {
  const cacheKey = `${since}:${until}`;
  const cached = metaAdsInsightsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const inFlight = metaAdsInsightsInFlight.get(cacheKey);
  if (inFlight) return inFlight;
  const request = fetchMetaAdsInsightsUncached(since, until)
    .then(data => {
      metaAdsInsightsCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, data });
      return data;
    })
    .finally(() => metaAdsInsightsInFlight.delete(cacheKey));
  metaAdsInsightsInFlight.set(cacheKey, request);
  return request;
}

const BUSINESS_EXPENSE_CATEGORIES = [
  "processing",
  "refund",
  "payroll",
  "contractor",
  "software",
  "office",
  "content",
  "event",
  "tax",
  "other",
] as const;

async function calculateProfitAndLossPeriod(startDate: number, endDate: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [purchaseRows] = await db.execute(sql`
    SELECT product,
           COUNT(*) AS purchases,
           SUM(amount_agorot) / 100 AS revenue,
           COUNT(*) AS actualPurchases,
           0 AS estimatedPurchases
    FROM completed_payments
    WHERE paid_at >= ${startDate} AND paid_at <= ${endDate}
      AND amount_source = 'grow'
      AND amount_agorot > 100
    GROUP BY product
    ORDER BY revenue DESC
  `) as any;

  const products = (purchaseRows as any[]).map(row => ({
    product: String(row.product || "unknown"),
    purchases: Number(row.purchases || 0),
    revenue: Number(row.revenue || 0),
    actualPurchases: Number(row.actualPurchases || 0),
    estimatedPurchases: Number(row.estimatedPurchases || 0),
  }));
  const [[estimatedRow]] = await db.execute(sql`
    SELECT COUNT(*) AS cnt
    FROM completed_payments
    WHERE paid_at >= ${startDate} AND paid_at <= ${endDate}
      AND amount_source = 'estimated'
  `) as any;
  const estimatedTransactionCount = Number(estimatedRow?.cnt || 0);
  const since = formatMetaCalendarDate(startDate);
  const until = formatMetaCalendarDate(endDate);
  const meta = await fetchMetaAdsInsights(since, until);
  if (meta.status !== "available") {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Meta Ads spend is unavailable or partial" });
  }
  const metaSpendBreakdown = summarizeMetaSpend(meta.campaigns, meta.boosts);
  const metaSpend = metaSpendBreakdown.totalSpend;

  const expenseRows = await db.select().from(businessExpenses).where(and(
    gte(businessExpenses.expenseDate, startDate),
    lte(businessExpenses.expenseDate, endDate),
  ));
  const recurringRows = await db.select().from(businessRecurringItems).where(and(
    eq(businessRecurringItems.isActive, true),
    lte(businessRecurringItems.validFrom, endDate),
    or(isNull(businessRecurringItems.validTo), gte(businessRecurringItems.validTo, startDate)),
  ));
  const recognizedRecurringItems = recurringRows.map(item => ({
    itemType: item.itemType,
    category: item.category,
    amountAgorot: prorateMonthlyAmountAgorot(
      item.amountAgorot,
      startDate,
      endDate,
      item.validFrom,
      item.validTo,
    ),
  }));
  const summary = calculatePnlSummary(
    products,
    metaSpend,
    expenseRows,
    BUSINESS_EXPENSE_CATEGORIES,
    recognizedRecurringItems,
  );

  return {
    startDate,
    endDate,
    products,
    ...summary,
    metaSpendBreakdown,
    expenses: expenseRows.sort((a, b) => b.expenseDate - a.expenseDate),
    recurringItems: recurringRows.map(item => ({
      ...item,
      recognizedAmountAgorot: prorateMonthlyAmountAgorot(
        item.amountAgorot,
        startDate,
        endDate,
        item.validFrom,
        item.validTo,
      ),
    })),
    dataQuality: {
      revenueBasis: "completed_payments: עסקאות Grow מאומתות וסכום החיוב בפועל בלבד",
      metaBasis: process.env.META_ADS_TOKEN ? "Meta Ads API" : "unavailable",
      manualExpenseCount: expenseRows.length,
      recurringItemCount: recurringRows.length,
      estimatedTransactionCount,
      isComplete: false,
      warning: estimatedTransactionCount > 0
        ? `${estimatedTransactionCount} עסקאות היסטוריות משוערות הוחרגו מההכנסה. ההכנסה המוצגת כוללת רק חיובי Grow מאומתים; הרווח חלקי עד להזנת כל ההוצאות.`
        : (expenseRows.length > 0 || recurringRows.length > 0)
          ? "ההכנסה מבוססת על חיובי Grow מאומתים. ההוצאות כוללות Meta ואת הסעיפים שהוזנו, אך אינן בהכרח הנהלת חשבונות מלאה."
          : "טרם הוזנו הוצאות שכר, ספקים, סליקה, תוכנות ומסים; הרווח המוצג חלקי ואינו רווח חשבונאי סופי.",
    },
  };
}

export const dashboardRouter = router({
  profitAndLoss: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const previousPeriod = previousComparisonPeriod(input.startDate, input.endDate);
      const [current, previous] = await Promise.all([
        calculateProfitAndLossPeriod(input.startDate, input.endDate),
        calculateProfitAndLossPeriod(previousPeriod.startDate, previousPeriod.endDate),
      ]);
      return {
        current,
        previous,
        comparisonBasis: previousPeriod.basis,
        salesComparisonAvailable: hasVerifiedGrowCoverage(previousPeriod),
      };
    }),

  addBusinessExpense: teamProcedure
    .input(z.object({
      expenseDate: z.number(),
      category: z.enum(BUSINESS_EXPENSE_CATEGORIES),
      description: z.string().trim().min(2).max(255),
      vendor: z.string().trim().max(150).nullable().optional(),
      amountShekels: z.number().positive().max(10_000_000),
      notes: z.string().trim().max(2000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(businessExpenses).values({
        expenseDate: input.expenseDate,
        category: input.category,
        description: input.description,
        vendor: input.vendor || null,
        amountAgorot: Math.round(input.amountShekels * 100),
        notes: input.notes || null,
        createdBy: ctx.user?.email || ctx.teamMember?.email || "team",
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  deleteBusinessExpense: teamProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(businessExpenses).where(eq(businessExpenses.id, input.id));
      return { success: true };
    }),

  addBusinessRecurringItem: teamProcedure
    .input(z.object({
      itemType: z.enum(["income", "expense"]),
      category: z.string().trim().min(2).max(50),
      description: z.string().trim().min(2).max(255),
      vendor: z.string().trim().max(150).nullable().optional(),
      amountShekels: z.number().positive().max(10_000_000),
      validFrom: z.number(),
      validTo: z.number().nullable().optional(),
      includesVat: z.boolean().default(true),
      notes: z.string().trim().max(2000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      await db.insert(businessRecurringItems).values({
        itemType: input.itemType,
        category: input.category,
        description: input.description,
        vendor: input.vendor || null,
        amountAgorot: Math.round(input.amountShekels * 100),
        validFrom: input.validFrom,
        validTo: input.validTo || null,
        isActive: true,
        includesVat: input.includesVat,
        notes: input.notes || null,
        createdBy: ctx.user?.email || ctx.teamMember?.email || "team",
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  deactivateBusinessRecurringItem: teamProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(businessRecurringItems)
        .set({ isActive: false, validTo: Date.now(), updatedAt: Date.now() })
        .where(eq(businessRecurringItems.id, input.id));
      return { success: true };
    }),

  // ── Monthly Targets ───────────────────────────────────────────────────────
  monthlyTargets: teamProcedure.query(async ({ ctx }) => {
    guardAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [settings] = await db.select().from(dailyReportSettings).orderBy(desc(dailyReportSettings.id)).limit(1);
    const databaseSales = settings?.databaseMonthlyMinTarget ?? 350;
    const bundleSales = settings?.bundleMonthlyTarget ?? 70;
    const boostSales = settings?.boostMonthlyTarget ?? 90;
    const reportDate = formatMetaCalendarDate(Date.now());
    const mediaPlan = getDailyReportMediaPlan(reportDate, settings?.databaseMonthlyBudgetAgorot ?? 1_000_000);
    return {
      budget: mediaPlan.totalMonthlyBudgetAgorot === null ? null : mediaPlan.totalMonthlyBudgetAgorot / 100,
      leads: settings?.leadMonthlyTarget ?? 2000,
      purchases: databaseSales + bundleSales + boostSales,
      revenue: (settings?.revenueMonthlyTargetAgorot ?? 14_000_000) / 100,
      databaseSales,
      bundleSales,
      boostSales,
      sourceLabel: mediaPlan.basisLabel,
    };
  }),

  // ── Email Engagement Analytics ────────────────────────────────────────────
  emailEngagement: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;
      
      // Overall email stats
      const [[emailTotals]] = await db.execute(sql`
        SELECT 
          COUNT(*) as totalSent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as totalOpened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as totalClicked,
          AVG(openCount) as avgOpens,
          AVG(clickCount) as avgClicks
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
      `) as any;
      
      // Per-journey performance
      const [journeyStats] = await db.execute(sql`
        SELECT 
          journeyKey as journey,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
        GROUP BY journeyKey ORDER BY sent DESC LIMIT 15
      `) as any;
      
      // Per-email-index performance (which email in journey converts best)
      const [indexStats] = await db.execute(sql`
        SELECT 
          journeyKey as journey, emailIndex,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
        GROUP BY journeyKey, emailIndex ORDER BY journeyKey, emailIndex LIMIT 50
      `) as any;
      
      const [dailyEmailRows] = await db.execute(sql`
        SELECT sentAt, openCount
        FROM email_log
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
      `) as any;
      const dailyEmailMap = new Map<string, { sent: number; opened: number }>();
      for (const row of dailyEmailRows as any[]) {
        const day = israelDateKey(Number(row.sentAt));
        const current = dailyEmailMap.get(day) || { sent: 0, opened: 0 };
        current.sent += 1;
        current.opened += Number(row.openCount || 0) > 0 ? 1 : 0;
        dailyEmailMap.set(day, current);
      }
      
      const totalSent = Number(emailTotals?.totalSent ?? 0);
      const totalOpened = Number(emailTotals?.totalOpened ?? 0);
      const totalClicked = Number(emailTotals?.totalClicked ?? 0);
      
      return {
        totals: {
          sent: totalSent,
          opened: totalOpened,
          clicked: totalClicked,
          openRate: totalSent > 0 ? Math.round(totalOpened / totalSent * 1000) / 10 : 0,
          clickRate: totalSent > 0 ? Math.round(totalClicked / totalSent * 1000) / 10 : 0,
          clickToOpenRate: totalOpened > 0 ? Math.round(totalClicked / totalOpened * 1000) / 10 : 0,
        },
        journeys: (journeyStats as any[]).map((j: any) => ({
          journey: j.journey || 'unknown',
          sent: Number(j.sent),
          opened: Number(j.opened),
          clicked: Number(j.clicked),
          openRate: Number(j.sent) > 0 ? Math.round(Number(j.opened) / Number(j.sent) * 1000) / 10 : 0,
          clickRate: Number(j.sent) > 0 ? Math.round(Number(j.clicked) / Number(j.sent) * 1000) / 10 : 0,
        })),
        emailSteps: (indexStats as any[]).map((s: any) => ({
          journey: s.journey || 'unknown',
          step: Number(s.emailIndex),
          sent: Number(s.sent),
          opened: Number(s.opened),
          clicked: Number(s.clicked),
        })),
        daily: Array.from(dailyEmailMap, ([day, values]) => ({ day, ...values })).sort((a, b) => a.day.localeCompare(b.day)),
      };
    }),

  // ── Site Traffic & SEO Analytics ──────────────────────────────────────────
  siteTraffic: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const { startDate, endDate } = input;
      
      // Page views by page
      const [pageViews] = await db.execute(sql`
        SELECT page, COUNT(*) as views 
        FROM analytics_events 
        WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY page ORDER BY views DESC LIMIT 20
      `) as any;
      
      // Total page views and unique sessions (approximate by distinct userAgent+page combos per day)
      const [[totals]] = await db.execute(sql`
        SELECT 
          COUNT(*) as totalPageViews,
          COUNT(DISTINCT CONCAT(COALESCE(email,''), COALESCE(userAgent,''))) as uniqueVisitors
        FROM analytics_events 
        WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}
      `) as any;
      
      // Daily page views
      const [dailyViews] = await db.execute(sql`
        SELECT DATE(FROM_UNIXTIME(createdAt/1000)) as day, COUNT(*) as views
        FROM analytics_events 
        WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY day ORDER BY day
      `) as any;
      
      // UTM sources (where traffic comes from)
      const [trafficSources] = await db.execute(sql`
        SELECT 
          COALESCE(utmSource, 'direct') as source,
          COALESCE(utmMedium, 'none') as medium,
          COUNT(*) as visits
        FROM analytics_events 
        WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY source, medium ORDER BY visits DESC LIMIT 15
      `) as any;
      
      // Key interactions (button clicks, form starts, CTA clicks)
      const [interactions] = await db.execute(sql`
        SELECT eventType, COUNT(*) as cnt
        FROM analytics_events 
        WHERE eventType IN ('button_click','form_start','form_submit','dna_quiz_start','dna_quiz_complete','database_cta','guide_view','course_cta','product_click','free_guide_cta','intro_meeting_click')
          AND createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY eventType ORDER BY cnt DESC
      `) as any;
      
      // Parallel activity counts; these are not an identity-linked funnel.
      const [[funnelData]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as pageViews,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_start' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dnaStarts,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dnaCompletes,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'database_cta' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as databaseClicks,
          (SELECT COUNT(*) FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate}) as paymentStarts
      `) as any;
      
      // Scroll depth distribution
      const [scrollData] = await db.execute(sql`
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.maxScroll')) as depth,
          COUNT(*) as cnt
        FROM analytics_events 
        WHERE eventType = 'page_view' AND metadata IS NOT NULL AND createdAt >= ${startDate} AND createdAt <= ${endDate}
          AND JSON_EXTRACT(metadata, '$.maxScroll') IS NOT NULL
        GROUP BY depth ORDER BY CAST(depth AS UNSIGNED) DESC LIMIT 10
      `) as any;
      
      return {
        totalPageViews: Number(totals?.totalPageViews ?? 0),
        uniqueVisitors: Number(totals?.uniqueVisitors ?? 0),
        topPages: (pageViews as any[]).map((p: any) => ({ page: p.page, views: Number(p.views) })),
        dailyViews: (dailyViews as any[]).map((d: any) => ({ day: String(d.day), views: Number(d.views) })),
        trafficSources: (trafficSources as any[]).map((s: any) => ({ source: s.source, medium: s.medium, visits: Number(s.visits) })),
        interactions: (interactions as any[]).map((i: any) => ({ event: i.eventType, count: Number(i.cnt) })),
        funnel: {
          pageViews: Number(funnelData?.pageViews ?? 0),
          dnaStarts: Number(funnelData?.dnaStarts ?? 0),
          dnaCompletes: Number(funnelData?.dnaCompletes ?? 0),
          databaseClicks: Number(funnelData?.databaseClicks ?? 0),
          paymentStarts: Number(funnelData?.paymentStarts ?? 0),
        },
        scrollDepth: (scrollData as any[]).map((s: any) => ({ depth: s.depth, count: Number(s.cnt) })),
      };
    }),

  // ── Social Insights (IG + FB + WhatsApp) ──────────────────────────────────
  socialInsights: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      return await fetchSocialInsights(input.startDate, input.endDate);
    }),

  // ── Main Overview KPIs ──────────────────────────────────────────────────
  overview: teamProcedure
    .input(z.object({
      startDate: z.number(), // unix ms
      endDate: z.number(),   // unix ms
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      // Total leads in period
      const [[leadRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
      `) as any;
      const totalLeads = Number(leadRow?.cnt ?? 0);

      const verifiedPayments = await db.select({
        product: completedPayments.product,
        amountAgorot: completedPayments.amountAgorot,
        amountSource: completedPayments.amountSource,
        paidAt: completedPayments.paidAt,
      }).from(completedPayments).where(and(
        gte(completedPayments.paidAt, startDate),
        lte(completedPayments.paidAt, endDate),
        eq(completedPayments.amountSource, "grow"),
      ));
      const paymentSummary = summarizeVerifiedGrowPayments(verifiedPayments);
      const totalPurchases = paymentSummary.purchases;
      const totalRevenue = paymentSummary.revenue;

      // Conversion rate (leads → purchase)
      const conversionRate = totalLeads > 0 ? (totalPurchases / totalLeads * 100) : 0;

      // Emails sent in period
      const [[emailRow]] = await db.execute(sql`
        SELECT 
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND status = 'sent'
      `) as any;
      const emailsSent = Number(emailRow?.sent ?? 0);
      const emailsOpened = Number(emailRow?.opened ?? 0);
      const emailsClicked = Number(emailRow?.clicked ?? 0);

      // Unsubscribes in period
      const [[unsubRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM crm_leads 
        WHERE emailUnsubscribed = 1 AND emailUnsubscribedAt >= ${startDate} AND emailUnsubscribedAt <= ${endDate}
      `) as any;
      const unsubscribes = Number(unsubRow?.cnt ?? 0);

      // DNA quiz completions in period
      const [[dnaRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM analytics_events 
        WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${startDate} AND createdAt <= ${endDate}
      `) as any;
      const dnaCompleted = Number(dnaRow?.cnt ?? 0);

      return {
       totalLeads,
       totalPurchases,
       totalRevenue,
       conversionRate: Math.round(conversionRate * 10) / 10,
       emailsSent,
       emailsOpened,
       emailsClicked,
       unsubscribes,
       dnaCompleted,
     };
   }),
  // ── Overview with Period Comparison ────────────────────────────────────────
  overviewWithComparison: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;
      const previousPeriod = previousComparisonPeriod(startDate, endDate);
      const salesComparisonAvailable = hasVerifiedGrowCoverage(previousPeriod);
      const prevStart = previousPeriod.startDate;
      const prevEnd = previousPeriod.endDate;
      
      // Current period
      const [[curr]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM crm_leads WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}) as leads,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dna
      `) as any;
      
      // Previous period
      const [[prev]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM crm_leads WHERE createdAt >= ${prevStart} AND createdAt <= ${prevEnd}) as leads,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${prevStart} AND createdAt <= ${prevEnd}) as dna
      `) as any;
      
      const [verifiedCurrentRows, verifiedPreviousRows] = await Promise.all([
        db.select({
          product: completedPayments.product,
          amountAgorot: completedPayments.amountAgorot,
          amountSource: completedPayments.amountSource,
          paidAt: completedPayments.paidAt,
        }).from(completedPayments).where(and(
          gte(completedPayments.paidAt, startDate),
          lte(completedPayments.paidAt, endDate),
          eq(completedPayments.amountSource, "grow"),
        )),
        db.select({
          product: completedPayments.product,
          amountAgorot: completedPayments.amountAgorot,
          amountSource: completedPayments.amountSource,
          paidAt: completedPayments.paidAt,
        }).from(completedPayments).where(and(
          gte(completedPayments.paidAt, prevStart),
          lte(completedPayments.paidAt, prevEnd),
          eq(completedPayments.amountSource, "grow"),
        )),
      ]);
      const currentPayments = summarizeVerifiedGrowPayments(verifiedCurrentRows);
      const previousPayments = summarizeVerifiedGrowPayments(verifiedPreviousRows);
      const revenueCurr = currentPayments.revenue;
      const revenuePrev = previousPayments.revenue;
      const productSales = currentPayments.productSales;
      const trackedTargetPurchases = (productSales.database || 0)
        + (productSales.bundle_new_year || 0)
        + (productSales.match_boost || 0);
      
      // Lead journey attribution: leads from campaigns that converted
      const [journeyAttribution] = await db.execute(sql`
        SELECT 
          cl.utmCampaign as campaign,
          cl.utmSource as source,
          cl.utmMedium as medium,
          COUNT(DISTINCT cl.id) as totalLeads,
          COUNT(DISTINCT CASE WHEN pl.id IS NOT NULL THEN cl.email END) as converted
        FROM crm_leads cl
        LEFT JOIN completed_payments pl ON LOWER(TRIM(pl.email)) = LOWER(TRIM(cl.email))
          AND pl.product = 'database'
          AND pl.amount_source = 'grow'
          AND pl.paid_at >= cl.createdAt
        WHERE cl.createdAt >= ${startDate} AND cl.createdAt <= ${endDate}
        GROUP BY cl.utmCampaign, cl.utmSource, cl.utmMedium
        HAVING totalLeads > 2
        ORDER BY converted DESC, totalLeads DESC
        LIMIT 30
      `) as any;
      
      const leads = Number(curr?.leads ?? 0);
      const purchases = currentPayments.purchases;
      const dna = Number(curr?.dna ?? 0);
      const prevLeads = Number(prev?.leads ?? 0);
      const prevPurchases = previousPayments.purchases;
      const prevDna = Number(prev?.dna ?? 0);
      
      function pctChange(curr: number, prev: number): number {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round((curr - prev) / prev * 100);
      }
      
      return {
        current: { leads, purchases, trackedTargetPurchases, revenue: revenueCurr, dna },
        previous: { leads: prevLeads, purchases: prevPurchases, revenue: revenuePrev, dna: prevDna },
        change: {
          leads: pctChange(leads, prevLeads), 
          purchases: salesComparisonAvailable ? pctChange(purchases, prevPurchases) : null,
          revenue: salesComparisonAvailable ? pctChange(revenueCurr, revenuePrev) : null,
          dna: pctChange(dna, prevDna),
        },
        productSales,
        comparisonBasis: previousPeriod.basis,
        salesComparisonAvailable,
        journeyAttribution: aggregateJourneyAttribution(journeyAttribution as any[]),
      };
    }),


  // ── Daily Trend (leads + revenue over time) ─────────────────────────────
  dailyTrend: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      const leadRows = await db.select({ createdAt: crmLeads.createdAt }).from(crmLeads).where(and(
        gte(crmLeads.createdAt, startDate),
        lte(crmLeads.createdAt, endDate),
      ));
      const leadDays = new Map<string, number>();
      for (const row of leadRows) {
        const day = israelDateKey(Number(row.createdAt));
        leadDays.set(day, (leadDays.get(day) || 0) + 1);
      }

      const verifiedPayments = await db.select({
        product: completedPayments.product,
        amountAgorot: completedPayments.amountAgorot,
        amountSource: completedPayments.amountSource,
        paidAt: completedPayments.paidAt,
      }).from(completedPayments).where(and(
        gte(completedPayments.paidAt, startDate),
        lte(completedPayments.paidAt, endDate),
        eq(completedPayments.amountSource, "grow"),
      ));
      const dailyPayments = aggregateVerifiedGrowPayments(verifiedPayments);

      return {
        leads: Array.from(leadDays, ([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
        revenue: dailyPayments.map(day => ({ day: day.date, amount: day.revenue })),
        purchases: dailyPayments.map(day => ({ day: day.date, count: day.purchases })),
      };
    }),

  // ── Channel/Campaign Breakdown ──────────────────────────────────────────
  channelBreakdown: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      // Month-to-date uses the same dates in the previous month; other ranges use the immediately preceding equal period.
      const previousPeriod = previousComparisonPeriod(startDate, endDate);
      const salesComparisonAvailable = hasVerifiedGrowCoverage(previousPeriod);
      const sameLastMonthStart = previousPeriod.startDate;
      const sameLastMonthEnd = previousPeriod.endDate;

      // Leads by source/campaign
      const [leadRows] = await db.execute(sql`
        SELECT 
          COALESCE(utmSource, source, 'direct') as channel,
          utmMedium as medium,
          utmCampaign as campaign,
          COUNT(*) as leads
        FROM crm_leads
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY channel, medium, campaign
        ORDER BY leads DESC
      `) as any;

      // Verified Grow purchases by source/campaign, using the latest lead that existed before payment.
      const [purchaseRows] = await db.execute(sql`
        SELECT 
          COALESCE(attributed.utmSource, attributed.source, 'direct') as channel,
          attributed.utmMedium as medium,
          attributed.utmCampaign as campaign,
          attributed.product,
          COUNT(*) as purchases,
          SUM(attributed.amount_agorot) / 100 as revenue
        FROM (
          SELECT cp.id, cp.product, cp.amount_agorot,
                 cl.utmSource, cl.source, cl.utmMedium, cl.utmCampaign,
                 ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY cl.createdAt DESC, cl.id DESC) AS leadRank
          FROM completed_payments cp
          LEFT JOIN crm_leads cl
            ON LOWER(TRIM(cl.email)) = LOWER(TRIM(cp.email))
            AND cl.createdAt <= cp.paid_at
          WHERE cp.paid_at >= ${startDate} AND cp.paid_at <= ${endDate}
            AND cp.amount_source = 'grow'
            AND cp.amount_agorot > 100
        ) attributed
        WHERE attributed.leadRank = 1
        GROUP BY channel, medium, campaign, attributed.product
        ORDER BY purchases DESC
      `) as any;

      // Previous equal period leads by channel.
      const [prevLeadRows] = await db.execute(sql`
        SELECT 
          COALESCE(utmSource, source, 'direct') as channel,
          utmMedium as medium,
          COUNT(*) as leads
        FROM crm_leads
        WHERE createdAt >= ${sameLastMonthStart} AND createdAt <= ${sameLastMonthEnd}
        GROUP BY channel, medium
      `) as any;

      // Previous period verified Grow purchases by channel
      const [prevPurchaseRows] = await db.execute(sql`
        SELECT 
          COALESCE(attributed.utmSource, attributed.source, 'direct') as channel,
          attributed.utmMedium as medium,
          attributed.product,
          COUNT(*) as purchases,
          SUM(attributed.amount_agorot) / 100 as revenue
        FROM (
          SELECT cp.id, cp.product, cp.amount_agorot,
                 cl.utmSource, cl.source, cl.utmMedium,
                 ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY cl.createdAt DESC, cl.id DESC) AS leadRank
          FROM completed_payments cp
          LEFT JOIN crm_leads cl
            ON LOWER(TRIM(cl.email)) = LOWER(TRIM(cp.email))
            AND cl.createdAt <= cp.paid_at
          WHERE cp.paid_at >= ${sameLastMonthStart} AND cp.paid_at <= ${sameLastMonthEnd}
            AND cp.amount_source = 'grow'
            AND cp.amount_agorot > 100
        ) attributed
        WHERE attributed.leadRank = 1
        GROUP BY channel, medium, attributed.product
      `) as any;

      // Build previous period channel totals
      const prevChannelData: Record<string, { leads: number; purchases: number; revenue: number }> = {};
      for (const row of (prevLeadRows as any[])) {
        const ch = mapChannel(row.channel, row.medium);
        if (!prevChannelData[ch]) prevChannelData[ch] = { leads: 0, purchases: 0, revenue: 0 };
        prevChannelData[ch].leads += Number(row.leads);
      }
      for (const row of (prevPurchaseRows as any[])) {
        const ch = mapChannel(row.channel, row.medium);
        if (!prevChannelData[ch]) prevChannelData[ch] = { leads: 0, purchases: 0, revenue: 0 };
        const cnt = Number(row.purchases);
        prevChannelData[ch].purchases += cnt;
        prevChannelData[ch].revenue += Number(row.revenue || 0);
      }

      // Aggregate by channel
      const channelData: Record<string, { leads: number; purchases: number; revenue: number; campaigns: Record<string, { leads: number; purchases: number; revenue: number }> }> = {};

      for (const row of (leadRows as any[])) {
        const ch = mapChannel(row.channel, row.medium);
        if (!channelData[ch]) channelData[ch] = { leads: 0, purchases: 0, revenue: 0, campaigns: {} };
        channelData[ch].leads += Number(row.leads);
        const camp = row.campaign || "(ללא קמפיין)";
        if (!channelData[ch].campaigns[camp]) channelData[ch].campaigns[camp] = { leads: 0, purchases: 0, revenue: 0 };
        channelData[ch].campaigns[camp].leads += Number(row.leads);
      }

      for (const row of (purchaseRows as any[])) {
        const ch = mapChannel(row.channel, row.medium);
        if (!channelData[ch]) channelData[ch] = { leads: 0, purchases: 0, revenue: 0, campaigns: {} };
        const cnt = Number(row.purchases);
        const rev = Number(row.revenue || 0);
        channelData[ch].purchases += cnt;
        channelData[ch].revenue += rev;
        const camp = row.campaign || "(ללא קמפיין)";
        if (!channelData[ch].campaigns[camp]) channelData[ch].campaigns[camp] = { leads: 0, purchases: 0, revenue: 0 };
        channelData[ch].campaigns[camp].purchases += cnt;
        channelData[ch].campaigns[camp].revenue += rev;
      }

      // Fetch Meta Ads spend for this period and previous period
      const sinceStr = formatMetaCalendarDate(startDate);
      const untilStr = formatMetaCalendarDate(endDate);
      const prevSinceStr = formatMetaCalendarDate(sameLastMonthStart);
      const prevUntilStr = formatMetaCalendarDate(sameLastMonthEnd);
      
      let metaSpend = 0;
      let prevMetaSpend = 0;
      let metaSpendAvailable = false;
      try {
        const metaData = await fetchMetaAdsInsights(sinceStr, untilStr);
        metaSpend = summarizeMetaSpend(metaData.campaigns, metaData.boosts).mainSpend;
        const prevMetaData = await fetchMetaAdsInsights(prevSinceStr, prevUntilStr);
        prevMetaSpend = summarizeMetaSpend(prevMetaData.campaigns, prevMetaData.boosts).mainSpend;
        metaSpendAvailable = metaData.status === "available" && prevMetaData.status === "available";
      } catch (e) { /* ignore meta errors */ }

      return Object.entries(channelData)
        .map(([channel, data]) => ({
          channel,
          ...data,
          spend: channel === "Meta Ads (ממומן)" && metaSpendAvailable ? Math.round(metaSpend) : null,
          prevSpend: channel === "Meta Ads (ממומן)" && metaSpendAvailable ? Math.round(prevMetaSpend) : null,
          metaSpendAvailable,
          salesComparisonAvailable,
          prevLeads: prevChannelData[channel]?.leads ?? 0,
          prevPurchases: prevChannelData[channel]?.purchases ?? 0,
          prevRevenue: prevChannelData[channel]?.revenue ?? 0,
          campaigns: Object.entries(data.campaigns)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.leads - a.leads),
        }))
        .sort((a, b) => b.leads - a.leads);
    }),

  // ── Revenue by Product ──────────────────────────────────────────────────
  revenueByProduct: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      const [rows] = await db.execute(sql`
        SELECT product, COUNT(*) as cnt
        FROM payment_leads
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY product
        ORDER BY cnt DESC
      `) as any;

      const PRODUCT_LABELS: Record<string, string> = {
        database: "מאגר שידוכים",
        guide: "מדריך לבחור נכון",
        course: "קורס מדע האהבה",
        session: "פגישת ליווי 1:1",
        coaching: "תוכנית ליווי",
        coaching_mas: "תוכנית ליווי",
        bundle_tubav: "חבילת טו באב",
        bundle_new_year: "חבילת שנה חדשה",
      };

      return (rows as any[]).map((r: any) => ({
        product: r.product,
        label: PRODUCT_LABELS[r.product] ?? r.product,
        count: Number(r.cnt),
        price: PRODUCT_PRICES[r.product] ?? 0,
        revenue: Number(r.cnt) * (PRODUCT_PRICES[r.product] ?? 0),
      }));
    }),

  // ── Email Journey Funnel (conversion per step) ──────────────────────────
  journeyFunnel: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      // Per journey: total leads, sent, opened, clicked per email index
      const [rows] = await db.execute(sql`
        SELECT 
          journeyKey,
          emailIndex,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND status = 'sent'
        GROUP BY journeyKey, emailIndex
        ORDER BY journeyKey, emailIndex
      `) as any;

      // Group by journey
      const journeys: Record<string, { steps: { index: number; sent: number; opened: number; clicked: number }[] }> = {};
      for (const row of (rows as any[])) {
        const key = row.journeyKey;
        if (!journeys[key]) journeys[key] = { steps: [] };
        journeys[key].steps.push({
          index: Number(row.emailIndex),
          sent: Number(row.sent),
          opened: Number(row.opened),
          clicked: Number(row.clicked),
        });
      }

      // Per journey: how many leads eventually purchased
      const [convRows] = await db.execute(sql`
        SELECT 
          el.journeyKey,
          COUNT(DISTINCT el.leadId) as totalLeads,
          COUNT(DISTINCT CASE WHEN pl.email IS NOT NULL THEN el.leadId END) as purchased
        FROM email_log el
        LEFT JOIN crm_leads cl ON cl.id = el.leadId
        LEFT JOIN payment_leads pl ON pl.email = cl.email AND pl.created_at >= ${startDate}
        WHERE el.sentAt >= ${startDate} AND el.sentAt <= ${endDate} AND el.status = 'sent'
        GROUP BY el.journeyKey
      `) as any;

      const convMap: Record<string, { totalLeads: number; purchased: number }> = {};
      for (const row of (convRows as any[])) {
        convMap[row.journeyKey] = { totalLeads: Number(row.totalLeads), purchased: Number(row.purchased) };
      }

      const JOURNEY_LABELS: Record<string, string> = {
        women_first_step_v2: "מסע DNA - נשים",
        men_first_step_v2: "מסע DNA - גברים",
        free_guide_nurture: "מדריך חינמי",
        women_matchmaking_welcome: "ברוך הבא למאגר - נשים",
        men_matchmaking_welcome: "ברוך הבא למאגר - גברים",
        abandoned_guide: "נטישת עגלה - מדריך",
        abandoned_database: "נטישת עגלה - מאגר",
        abandoned_course: "נטישת עגלה - קורס",
        abandoned_coaching: "נטישת עגלה - ליווי",
        women_first_step: "מסע DNA - נשים (ישן)",
        men_first_step: "מסע DNA - גברים (ישן)",
        women_guide: "מדריך - נשים",
        men_guide: "מדריך - גברים",
        women_course: "קורס - נשים",
        men_course: "קורס - גברים",
        women_transformation: "טרנספורמציה - נשים",
        men_transformation: "טרנספורמציה - גברים",
      };

      return Object.entries(journeys).map(([key, data]) => ({
        journeyKey: key,
        label: JOURNEY_LABELS[key] ?? key,
        totalLeads: convMap[key]?.totalLeads ?? 0,
        purchased: convMap[key]?.purchased ?? 0,
        conversionRate: convMap[key]?.totalLeads ? Math.round((convMap[key]!.purchased / convMap[key]!.totalLeads) * 100 * 10) / 10 : 0,
        steps: data.steps,
      })).sort((a, b) => b.totalLeads - a.totalLeads);
    }),

  // ── Lead Source Breakdown ───────────────────────────────────────────────
  leadSources: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      const [rows] = await db.execute(sql`
        SELECT 
          COALESCE(source, 'unknown') as source,
          COUNT(*) as cnt
        FROM crm_leads
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY source
        ORDER BY cnt DESC
      `) as any;

      const SOURCE_LABELS: Record<string, string> = {
        dna_quiz: "שאלון DNA (אתר)",
        meta_lead_guide: "Meta - מדריך חינמי",
        meta_lead_dna: "Meta - DNA",
        meta_lead_call: "Meta - שיחת היכרות",
        direct: "ישיר",
        referral: "הפניה",
        press_article: "כתבה במגזין",
        instagram: "אינסטגרם",
        podcast: "פודקאסט",
        guide_form: "טופס מדריך",
        date_guide: "מדריך דייטינג",
        unknown: "לא ידוע",
      };

      return (rows as any[]).map((r: any) => ({
        source: r.source,
        label: SOURCE_LABELS[r.source] ?? r.source,
        count: Number(r.cnt),
      }));
    }),

  // ── Top Campaigns Performance ───────────────────────────────────────────
  topCampaigns: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      const [rows] = await db.execute(sql`
        SELECT 
          cl.utmCampaign as campaign,
          COALESCE(cl.utmSource, 'unknown') as source,
          cl.utmMedium as medium,
          COUNT(DISTINCT cl.id) as leads,
          COUNT(DISTINCT CASE WHEN pl.email IS NOT NULL THEN cl.id END) as purchases,
          GROUP_CONCAT(DISTINCT pl.product) as products
        FROM crm_leads cl
        LEFT JOIN payment_leads pl ON pl.email = cl.email AND pl.created_at >= ${startDate}
        WHERE cl.createdAt >= ${startDate} AND cl.createdAt <= ${endDate}
          AND cl.utmCampaign IS NOT NULL AND cl.utmCampaign != ''
        GROUP BY cl.utmCampaign, cl.utmSource, cl.utmMedium
        ORDER BY leads DESC
        LIMIT 20
      `) as any;

      return (rows as any[]).map((r: any) => {
        const purchases = Number(r.purchases);
        const products = r.products ? String(r.products).split(",") : [];
        let revenue = 0;
        // Estimate revenue from products
        for (const p of products) {
          revenue += (PRODUCT_PRICES[p.trim()] ?? 0);
        }
        // Better: calculate actual revenue
        return {
          campaign: translateCampaign(r.campaign),
          source: mapChannel(r.source, r.medium),
          leads: Number(r.leads),
          purchases,
          conversionRate: Number(r.leads) > 0 ? Math.round(purchases / Number(r.leads) * 100 * 10) / 10 : 0,
        };
      });
    }),

  // ── Recent Leads with Full Journey ──────────────────────────────────────
  recentLeads: teamProcedure
    .input(z.object({
      startDate: z.number(),
      endDate: z.number(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate, limit } = input;

      const [rows] = await db.execute(sql`
        SELECT 
          cl.id, cl.name, cl.email, cl.phone, cl.source, cl.status, cl.product,
          cl.utmSource, cl.utmMedium, cl.utmCampaign, cl.createdAt,
          cl.dnaType, cl.gender,
          pl.product as purchasedProduct, pl.created_at as purchasedAt,
          (SELECT COUNT(*) FROM email_log el WHERE el.leadId = cl.id AND el.status = 'sent') as emailsSent,
          (SELECT COUNT(*) FROM email_log el WHERE el.leadId = cl.id AND el.openCount > 0) as emailsOpened,
          (SELECT MAX(el.journeyKey) FROM email_log el WHERE el.leadId = cl.id) as lastJourney
        FROM crm_leads cl
        LEFT JOIN payment_leads pl ON pl.email = cl.email
        WHERE cl.createdAt >= ${startDate} AND cl.createdAt <= ${endDate}
        ORDER BY cl.createdAt DESC
        LIMIT ${limit}
      `) as any;

      return (rows as any[]).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        source: r.source,
        status: r.status,
        product: r.product,
        utmSource: r.utmSource,
        utmCampaign: r.utmCampaign,
        createdAt: Number(r.createdAt),
        dnaType: r.dnaType,
        gender: r.gender,
        purchasedProduct: r.purchasedProduct,
        purchasedAt: r.purchasedAt ? Number(r.purchasedAt) : null,
        emailsSent: Number(r.emailsSent),
        emailsOpened: Number(r.emailsOpened),
        lastJourney: r.lastJourney,
        converted: !!r.purchasedProduct,
      }));
    }),

  // ── Meta Ads Campaign Performance ──────────────────────────────────────
  metaAdsPerformance: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const since = formatMetaCalendarDate(input.startDate);
      const until = formatMetaCalendarDate(input.endDate);
      const metaData = await fetchMetaAdsInsights(since, until);
      const accountTotals = summarizeMetaSpend(metaData.campaigns, metaData.boosts);
      const totalSpend = accountTotals.totalSpend;
      const totalPurchases = metaData.campaigns.reduce((s, c) => s + c.purchases, 0);
      const totalLeads = metaData.campaigns.reduce((s, c) => s + c.leads, 0);
      const purchaseValues = metaData.campaigns.map(c => c.purchaseValue).filter((value): value is number => value !== null);
      const totalPurchaseValue = purchaseValues.length > 0 ? purchaseValues.reduce((sum, value) => sum + value, 0) : null;
      const totalImpressions = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.impressions, 0);
      const totalReach = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.reach, 0);
      return {
        status: metaData.status,
        fetchedAt: metaData.fetchedAt,
        campaigns: metaData.campaigns.sort((a, b) => b.spend - a.spend),
        boosts: metaData.boosts.sort((a, b) => b.spend - a.spend),
        accountTotals,
        totals: {
          totalPaidMediaSpend: totalSpend,
          acquisitionSpend: accountTotals.mainSpend,
          profileBoostSpend: accountTotals.boostsSpend,
          metaReportedPurchases: totalPurchases,
          metaReportedLeads: totalLeads,
          metaReportedPurchaseValue: totalPurchaseValue,
          impressions: totalImpressions,
          reach: totalReach,
          metaReportedPurchaseCpa: totalPurchases > 0 ? Math.round(accountTotals.mainSpend / totalPurchases * 100) / 100 : null,
          metaReportedCpl: totalLeads > 0 ? Math.round(accountTotals.mainSpend / totalLeads * 100) / 100 : null,
          metaReportedPurchaseValueRoas: totalPurchaseValue !== null && accountTotals.mainSpend > 0
            ? Math.round(totalPurchaseValue / accountTotals.mainSpend * 100) / 100
            : null,
        },
        boostsTotals: { spend: metaData.boosts.reduce((s, c) => s + c.spend, 0), impressions: metaData.boosts.reduce((s, c) => s + c.impressions, 0), reach: metaData.boosts.reduce((s, c) => s + c.reach, 0), clicks: metaData.boosts.reduce((s, c) => s + c.clicks, 0), engagement: metaData.boosts.reduce((s, c) => s + c.postEngagement, 0), likes: metaData.boosts.reduce((s, c) => s + c.likes, 0), comments: metaData.boosts.reduce((s, c) => s + c.comments, 0), shares: metaData.boosts.reduce((s, c) => s + c.shares, 0), saves: metaData.boosts.reduce((s, c) => s + c.saves, 0), videoViews: metaData.boosts.reduce((s, c) => s + c.videoViews, 0) },
      };
    }),

  // ── Campaign journey: Meta → landing → CRM lead → email assist → Grow ───
  campaignJourney: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const since = formatMetaCalendarDate(input.startDate);
      const until = formatMetaCalendarDate(input.endDate);
      const [metaData, destinations] = await Promise.all([
        fetchMetaAdsInsights(since, until),
        fetchMetaCampaignDestinations(),
      ]);

      const [cohortRows] = await db.execute(sql`
        SELECT
          LOWER(TRIM(COALESCE(cl.utmCampaign, ''))) AS utmCampaign,
          COALESCE(cl.utmSource, cl.source, 'direct') AS source,
          COUNT(DISTINCT cl.id) AS leads,
          COUNT(DISTINCT CASE WHEN cp.id IS NOT NULL THEN LOWER(TRIM(cl.email)) END) AS buyers,
          COUNT(DISTINCT CASE WHEN cp.id IS NOT NULL AND email_any.sentAt IS NOT NULL THEN LOWER(TRIM(cl.email)) END) AS buyersWithEmailBeforePurchase,
          COUNT(DISTINCT CASE WHEN cp.id IS NOT NULL AND email_click.clickedAt IS NOT NULL THEN LOWER(TRIM(cl.email)) END) AS buyersWithEmailClickBeforePurchase,
          COUNT(DISTINCT cp.id) AS purchases,
          COALESCE(SUM(CASE WHEN cp.id IS NOT NULL THEN cp.amount_agorot ELSE 0 END), 0) / 100 AS revenue
        FROM (
          SELECT first_touch.*
          FROM (
            SELECT cl_inner.*,
                   ROW_NUMBER() OVER (
                     PARTITION BY LOWER(TRIM(cl_inner.email))
                     ORDER BY cl_inner.createdAt ASC, cl_inner.id ASC
                   ) AS firstTouchRank
            FROM crm_leads cl_inner
          ) first_touch
          WHERE first_touch.firstTouchRank = 1
        ) cl
        LEFT JOIN completed_payments cp
          ON LOWER(TRIM(cp.email)) = LOWER(TRIM(cl.email))
          AND cp.product = 'database'
          AND cp.amount_source = 'grow'
          AND cp.amount_agorot > 100
          AND cp.paid_at >= cl.createdAt
          AND cp.paid_at <= ${input.endDate}
        LEFT JOIN (
          SELECT LOWER(TRIM(recipientEmail)) AS email, MIN(sentAt) AS sentAt
          FROM email_log
          WHERE status = 'sent' AND sentAt IS NOT NULL
          GROUP BY LOWER(TRIM(recipientEmail))
        ) email_any ON email_any.email = LOWER(TRIM(cl.email)) AND email_any.sentAt <= cp.paid_at
        LEFT JOIN (
          SELECT LOWER(TRIM(recipientEmail)) AS email, MIN(clickedAt) AS clickedAt
          FROM email_log
          WHERE status = 'sent' AND clickedAt IS NOT NULL
          GROUP BY LOWER(TRIM(recipientEmail))
        ) email_click ON email_click.email = LOWER(TRIM(cl.email)) AND email_click.clickedAt <= cp.paid_at
        WHERE cl.createdAt >= ${input.startDate} AND cl.createdAt <= ${input.endDate}
        GROUP BY LOWER(TRIM(COALESCE(cl.utmCampaign, ''))), COALESCE(cl.utmSource, cl.source, 'direct')
      `) as any;

      const [directRows] = await db.execute(sql`
        SELECT
          LOWER(TRIM(COALESCE(payment_attribution.utmCampaign, ''))) AS utmCampaign,
          COUNT(DISTINCT payment_attribution.paymentId) AS purchases,
          COUNT(DISTINCT payment_attribution.email) AS buyers,
          COALESCE(SUM(payment_attribution.amount_agorot), 0) / 100 AS revenue
        FROM (
          SELECT
            cp.id AS paymentId,
            LOWER(TRIM(cp.email)) AS email,
            cp.amount_agorot,
            cl.utmCampaign,
            ROW_NUMBER() OVER (
              PARTITION BY cp.id
              ORDER BY cl.createdAt DESC, cl.id DESC
            ) AS lastTouchRank
          FROM completed_payments cp
          LEFT JOIN crm_leads cl
            ON LOWER(TRIM(cl.email)) = LOWER(TRIM(cp.email))
            AND cl.createdAt <= cp.paid_at
          WHERE cp.product = 'database'
            AND cp.amount_source = 'grow'
            AND cp.amount_agorot > 100
            AND cp.paid_at >= ${input.startDate}
            AND cp.paid_at <= ${input.endDate}
        ) payment_attribution
        WHERE payment_attribution.lastTouchRank = 1
        GROUP BY LOWER(TRIM(COALESCE(payment_attribution.utmCampaign, '')))
      `) as any;

      type CohortMetrics = {
        leads: number;
        buyers: number;
        buyersWithEmailBeforePurchase: number;
        buyersWithEmailClickBeforePurchase: number;
        purchases: number;
        revenue: number;
      };
      const zero = (): CohortMetrics => ({ leads: 0, buyers: 0, buyersWithEmailBeforePurchase: 0, buyersWithEmailClickBeforePurchase: 0, purchases: 0, revenue: 0 });
      const byUtm = new Map<string, CohortMetrics>();
      for (const raw of cohortRows as any[]) {
        const key = String(raw.utmCampaign || "").toLowerCase();
        const current = byUtm.get(key) || zero();
        current.leads += Number(raw.leads || 0);
        current.buyers += Number(raw.buyers || 0);
        current.buyersWithEmailBeforePurchase += Number(raw.buyersWithEmailBeforePurchase || 0);
        current.buyersWithEmailClickBeforePurchase += Number(raw.buyersWithEmailClickBeforePurchase || 0);
        current.purchases += Number(raw.purchases || 0);
        current.revenue += Number(raw.revenue || 0);
        byUtm.set(key, current);
      }
      const directByUtm = new Map<string, { purchases: number; buyers: number; revenue: number }>();
      for (const raw of directRows as any[]) {
        directByUtm.set(String(raw.utmCampaign || "").toLowerCase(), {
          purchases: Number(raw.purchases || 0),
          buyers: Number(raw.buyers || 0),
          revenue: Number(raw.revenue || 0),
        });
      }

      const consumedUtm = new Set<string>();
      const rows = [...metaData.campaigns].sort((a, b) => b.spend - a.spend).map(campaign => {
        const destination = destinations[campaign.id] || { labels: [], categories: [], utmCampaigns: [], activeAds: 0, ads: 0 };
        const aliases = inferCampaignUtmAliases(campaign.name, destination.utmCampaigns);
        const cohort = zero();
        const direct = { purchases: 0, buyers: 0, revenue: 0 };
        for (const alias of aliases) {
          if (consumedUtm.has(alias)) continue;
          const matched = byUtm.get(alias);
          consumedUtm.add(alias);
          if (matched) {
            cohort.leads += matched.leads;
            cohort.buyers += matched.buyers;
            cohort.buyersWithEmailBeforePurchase += matched.buyersWithEmailBeforePurchase;
            cohort.buyersWithEmailClickBeforePurchase += matched.buyersWithEmailClickBeforePurchase;
            cohort.purchases += matched.purchases;
            cohort.revenue += matched.revenue;
          }
          const directMatched = directByUtm.get(alias);
          if (directMatched) {
            direct.purchases += directMatched.purchases;
            direct.buyers += directMatched.buyers;
            direct.revenue += directMatched.revenue;
          }
        }
        const landingLabels = destination.labels.length > 0
          ? destination.labels
          : campaign.objective.includes("LEAD") ? ["טופס לידים / יעד לא זוהה"] : ["לא זוהה"];
        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          objective: campaign.objective,
          status: destination.activeAds > 0 ? "active" as const : "inactive" as const,
          activeAds: destination.activeAds,
          ads: destination.ads,
          landingLabels,
          landingCategories: destination.categories,
          spend: campaign.spend,
          metaLeads: campaign.leads,
          metaPurchases: campaign.purchases,
          crmLeads: cohort.leads,
          growBuyers: cohort.buyers,
          growPurchases: cohort.purchases,
          growRevenue: Math.round(cohort.revenue * 100) / 100,
          buyersWithEmailBeforePurchase: cohort.buyersWithEmailBeforePurchase,
          buyersWithEmailClickBeforePurchase: cohort.buyersWithEmailClickBeforePurchase,
          leadToBuyerRate: cohort.leads > 0 ? Math.round(cohort.buyers / cohort.leads * 1000) / 10 : null,
          growCac: cohort.buyers > 0 ? Math.round(campaign.spend / cohort.buyers * 100) / 100 : null,
          growRoas: campaign.spend > 0 && cohort.revenue > 0 ? Math.round(cohort.revenue / campaign.spend * 100) / 100 : null,
          directGrowBuyers: direct.buyers,
          directGrowPurchases: direct.purchases,
          directGrowRevenue: Math.round(direct.revenue * 100) / 100,
          directGrowCac: direct.buyers > 0 ? Math.round(campaign.spend / direct.buyers * 100) / 100 : null,
          directGrowRoas: campaign.spend > 0 && direct.revenue > 0 ? Math.round(direct.revenue / campaign.spend * 100) / 100 : null,
          utmAliases: aliases,
          attributionBasis: destination.utmCampaigns.length > 0
            ? "utm_creative" as const
            : aliases.length > 0 ? "utm_name_fallback" as const : "meta_only" as const,
        };
      });

      const unmappedUtmKeys = new Set([...Array.from(byUtm.keys()), ...Array.from(directByUtm.keys())]);
      const unmappedWebsiteRows = Array.from(unmappedUtmKeys)
        .filter(utm => {
          const cohort = byUtm.get(utm) || zero();
          const direct = directByUtm.get(utm);
          return !consumedUtm.has(utm) && (cohort.leads > 0 || cohort.purchases > 0 || Number(direct?.purchases || 0) > 0);
        })
        .map(utm => {
          const cohort = byUtm.get(utm) || zero();
          const direct = directByUtm.get(utm);
          return {
            campaignId: "",
            campaignName: translateCampaign(utm),
            objective: "SITE_ONLY",
            status: "unknown" as const,
            activeAds: 0,
            ads: 0,
            landingLabels: ["יעד לא מתועד"],
            landingCategories: ["unknown"],
            spend: null,
            metaLeads: null,
            metaPurchases: null,
            crmLeads: cohort.leads,
            growBuyers: cohort.buyers,
            growPurchases: cohort.purchases,
            growRevenue: Math.round(cohort.revenue * 100) / 100,
            buyersWithEmailBeforePurchase: cohort.buyersWithEmailBeforePurchase,
            buyersWithEmailClickBeforePurchase: cohort.buyersWithEmailClickBeforePurchase,
            leadToBuyerRate: cohort.leads > 0 ? Math.round(cohort.buyers / cohort.leads * 1000) / 10 : null,
            growCac: null,
            growRoas: null,
            directGrowBuyers: direct?.buyers || 0,
            directGrowPurchases: direct?.purchases || 0,
            directGrowRevenue: Math.round((direct?.revenue || 0) * 100) / 100,
            directGrowCac: null,
            directGrowRoas: null,
            utmAliases: utm ? [utm] : [],
            attributionBasis: "website_only" as const,
          };
        });

      return {
        status: metaData.status,
        fetchedAt: metaData.fetchedAt,
        cohort: {
          leadCreatedFrom: input.startDate,
          leadCreatedTo: input.endDate,
          purchasesObservedThrough: input.endDate,
          definition: "לידים שנוצרו בטווח והרכישות המאומתות שלהם ב־Grow עד סוף הטווח",
        },
        rows: [...rows, ...unmappedWebsiteRows]
          .filter(row => Number(row.spend || 0) > 0 || row.crmLeads > 0 || row.growPurchases > 0 || row.directGrowPurchases > 0)
          .sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0) || b.directGrowPurchases - a.directGrowPurchases || b.growPurchases - a.growPurchases),
      };
    }),

  // ── Coaching & Session Revenue ─────────────────────────────────────────
  coachingRevenue: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`
        SELECT email, name, product, sum, created_at, utmSource, utmMedium, utmCampaign
        FROM payment_leads
        WHERE created_at >= ${input.startDate} AND created_at <= ${input.endDate} AND (CAST(sum AS UNSIGNED) >= 400)
        ORDER BY created_at DESC
      `) as any;
      const sessions = (rows as any[]).filter((r: any) => Number(r.sum) >= 400 && Number(r.sum) < 1500);
      const coaching = (rows as any[]).filter((r: any) => Number(r.sum) >= 1500);
      return {
        sessions: sessions.map((r: any) => ({ email: r.email, name: r.name, sum: Number(r.sum), date: Number(r.created_at), source: r.utmCampaign || r.utmSource || "direct" })),
        coaching: coaching.map((r: any) => ({ email: r.email, name: r.name, sum: Number(r.sum), date: Number(r.created_at), source: r.utmCampaign || r.utmSource || "direct" })),
        totalSessionRevenue: sessions.reduce((s: number, r: any) => s + Number(r.sum), 0),
        totalCoachingRevenue: coaching.reduce((s: number, r: any) => s + Number(r.sum), 0),
        sessionCount: sessions.length,
        coachingCount: coaching.length,
      };
    }),

  // Per-product funnel data
  productFunnels: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;
      
      // Get leads per product
      const [leads] = await db.execute(sql`
        SELECT product, COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${startDate} AND createdAt <= ${endDate} GROUP BY product ORDER BY cnt DESC
      `) as any;
      
      // Get purchases per product
      const [purchases] = await db.execute(sql`
        SELECT product, COUNT(*) as cnt, SUM(sum) as revenue FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate} GROUP BY product ORDER BY cnt DESC
      `) as any;
      
      const leadsMap: Record<string, number> = {};
      (leads as any[]).forEach((r: any) => { leadsMap[r.product || 'unknown'] = Number(r.cnt); });
      
      const purchasesMap: Record<string, { count: number; revenue: number }> = {};
      (purchases as any[]).forEach((r: any) => { 
        purchasesMap[r.product || 'unknown'] = { count: Number(r.cnt), revenue: Number(r.revenue || 0) }; 
      });
      
      const productLabels: Record<string, string> = {
        database: 'מאגר',
        guide: 'מדריך',
        course: 'קורס',
        coaching: 'ליווי',
        session: 'פגישה',
        tubav: 'חבילת טו באב',
        dna: 'שאלון DNA',
      };
      
      const allProducts = new Set([...Object.keys(leadsMap), ...Object.keys(purchasesMap)]);
      const products = Array.from(allProducts)
        .filter(p => p !== 'unknown' && p !== 'null')
        .map(p => ({
          key: p,
          label: productLabels[p] || p,
          leads: leadsMap[p] || 0,
          purchases: purchasesMap[p]?.count || 0,
          revenue: purchasesMap[p]?.revenue || 0,
          conversionRate: leadsMap[p] ? Math.round((purchasesMap[p]?.count || 0) / leadsMap[p] * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
      
      return { products };
    }),

  // ── Weekly Report Data (for email) ────────────────────────────────────────
  weeklyReportData: teamProcedure.query(async ({ ctx }) => {
    guardAdmin(ctx);
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    
    // This week's KPIs
    const [[leadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${weekAgo}`) as any;
    const currentPaymentRows = await db.select({
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      paidAt: completedPayments.paidAt,
    }).from(completedPayments).where(and(
      gte(completedPayments.paidAt, weekAgo),
      lte(completedPayments.paidAt, now),
      eq(completedPayments.amountSource, "grow"),
    ));
    
    // Previous week for comparison
    const [[prevLeadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${twoWeeksAgo} AND createdAt < ${weekAgo}`) as any;
    const previousPaymentRows = await db.select({
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      paidAt: completedPayments.paidAt,
    }).from(completedPayments).where(and(
      gte(completedPayments.paidAt, twoWeeksAgo),
      lte(completedPayments.paidAt, weekAgo - 1),
      eq(completedPayments.amountSource, "grow"),
    ));

    const currentPaymentSummary = summarizeVerifiedGrowPayments(currentPaymentRows);
    const previousPaymentSummary = summarizeVerifiedGrowPayments(previousPaymentRows);
    const productBreakdown = Object.entries(currentPaymentSummary.productSales).map(([product, count]) => ({
      product,
      count,
      revenue: currentPaymentRows.filter(row => row.product === product).reduce((sum, row) => sum + row.amountAgorot / 100, 0),
    }));
    
    const leads = Number(leadRow?.cnt ?? 0);
    const purchases = currentPaymentSummary.purchases;
    const revenue = currentPaymentSummary.revenue;
    const prevLeads = Number(prevLeadRow?.cnt ?? 0);
    const prevPurchases = previousPaymentSummary.purchases;
    
    // Meta Ads data
    const since = formatMetaCalendarDate(weekAgo);
    const until = formatMetaCalendarDate(now);
    const metaData = await fetchMetaAdsInsights(since, until);
    const totalSpend = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.spend, 0);
    
    // Top campaigns
    const topCampaigns = metaData.campaigns
      .filter(c => c.spend > 0)
      .sort((a, b) => ((b.purchaseValue || 0) - b.spend) - ((a.purchaseValue || 0) - a.spend))
      .slice(0, 5);
    
    // Winning (high ROAS) and losing (high spend, no conversions) campaigns
    const winners = metaData.campaigns.filter(c => (c.metaReportedRoas || 0) >= 2 && c.purchases > 0);
    const losers = metaData.campaigns.filter(c => c.spend > 50 && c.purchases === 0 && c.leads < 3);
    
    // Social insights
    const social = await fetchSocialInsights(weekAgo, now);
    
    return {
      period: { start: weekAgo, end: now },
      kpis: { leads, purchases, revenue, spend: totalSpend, blendedRevenueToSpend: totalSpend > 0 ? Math.round(revenue / totalSpend * 10) / 10 : null, attribution: "not_attributed" as const },
      comparison: { 
        leadsChange: prevLeads > 0 ? Math.round((leads - prevLeads) / prevLeads * 100) : 0,
        purchasesChange: prevPurchases > 0 ? Math.round((purchases - prevPurchases) / prevPurchases * 100) : 0,
      },
      productBreakdown,
      topCampaigns,
      winners,
      losers,
      social,
    };
  }),

  // ── Send Weekly Report (manual trigger) ───────────────────────────────────
  sendWeeklyReport: teamProcedure.mutation(async ({ ctx }) => {
    guardAdmin(ctx);
    const { generateAndSendWeeklyReport } = await import('./weeklyReport');
    return await generateAndSendWeeklyReport();
  }),

  // Social media stats (from Meta API)
  socialStats: teamProcedure.query(async () => {
    const token = process.env.META_ADS_TOKEN;
    if (!token) return null;
    try {
      const res = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=name,id,fan_count,followers_count,instagram_business_account{id,username,followers_count,media_count}&access_token=' + token);
      const data = await res.json();
      if (!data.data) return null;
      
      const accounts = data.data.filter((page: any) => page.name !== 'Match.by.hilit').map((page: any) => ({
        pageName: page.name,
        pageFans: page.fan_count || 0,
        igUsername: page.instagram_business_account?.username || null,
        igFollowers: page.instagram_business_account?.followers_count || 0,
        igPosts: page.instagram_business_account?.media_count || 0,
      }));
      
      return { accounts, whatsappGroupSize: 1000 };
    } catch {
      return null;
    }
  }),

  // Database demographics - gender split, age distribution, geographic areas
  databaseDemographics: teamProcedure
    .input(z.object({ startDate: z.number().optional(), endDate: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const start = input.startDate || now - 30 * 24 * 60 * 60 * 1000;
      const end = input.endDate || now;
      
      // Previous period for comparison
      const periodLength = end - start;
      const prevStart = start - periodLength;
      const prevEnd = start;

      // Total database stats
      const [totalStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females,
          AVG(CASE WHEN age > 0 THEN age ELSE NULL END) as avgAge
        FROM singles WHERE isActive = 1
      `) as any;

      // Period registrations
      const [periodStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females,
          AVG(CASE WHEN age > 0 THEN age ELSE NULL END) as avgAge
        FROM singles WHERE isActive = 1 AND createdAt >= ${start} AND createdAt <= ${end}
      `) as any;

      // Previous period registrations
      const [prevPeriodStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles WHERE isActive = 1 AND createdAt >= ${prevStart} AND createdAt <= ${prevEnd}
      `) as any;

      // Age distribution (current period)
      const [ageGroups] = await db.execute(sql`
        SELECT 
          CASE 
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 30 THEN '26-30'
            WHEN age BETWEEN 31 AND 35 THEN '31-35'
            WHEN age BETWEEN 36 AND 40 THEN '36-40'
            WHEN age BETWEEN 41 AND 45 THEN '41-45'
            WHEN age > 45 THEN '46+'
            ELSE 'לא צוין'
          END as ageGroup,
          COUNT(*) as count,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles WHERE isActive = 1 AND createdAt >= ${start} AND createdAt <= ${end}
        GROUP BY ageGroup ORDER BY MIN(age)
      `) as any;

      // Geographic distribution (current period)
      const [areas] = await db.execute(sql`
        SELECT city, COUNT(*) as count,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles 
        WHERE isActive = 1 AND city IS NOT NULL AND city != '' AND createdAt >= ${start} AND createdAt <= ${end}
        GROUP BY city ORDER BY count DESC LIMIT 15
      `) as any;

      // Total age distribution (all time)
      const [totalAgeGroups] = await db.execute(sql`
        SELECT 
          CASE 
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 30 THEN '26-30'
            WHEN age BETWEEN 31 AND 35 THEN '31-35'
            WHEN age BETWEEN 36 AND 40 THEN '36-40'
            WHEN age BETWEEN 41 AND 45 THEN '41-45'
            WHEN age > 45 THEN '46+'
            ELSE 'לא צוין'
          END as ageGroup,
          COUNT(*) as count,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles WHERE isActive = 1
        GROUP BY ageGroup ORDER BY MIN(age)
      `) as any;

      const t = (totalStats as any)[0];
      const p = (periodStats as any)[0];
      const pp = (prevPeriodStats as any)[0];

      // Generate marketing insights
      const totalMales = Number(t?.males || 0);
      const totalFemales = Number(t?.females || 0);
      const ratio = totalMales > 0 ? (totalFemales / totalMales) : 0;
      const periodMales = Number(p?.males || 0);
      const periodFemales = Number(p?.females || 0);
      
      const insights: string[] = [];
      if (ratio > 1.3) insights.push(`יש עודף נשים במאגר (${totalFemales} נשים מול ${totalMales} גברים). כדאי לכוון קמפיינים לגברים.`);
      else if (ratio < 0.7) insights.push(`יש עודף גברים במאגר (${totalMales} גברים מול ${totalFemales} נשים). כדאי לכוון קמפיינים לנשים.`);
      else insights.push(`המאגר מאוזן יחסית (${totalMales} גברים, ${totalFemales} נשים).`);
      
      if (periodMales > 0 && periodFemales > 0) {
        const periodRatio = periodFemales / periodMales;
        if (periodRatio > 1.5) insights.push(`בתקופה הנוכחית נרשמו הרבה יותר נשים (${periodFemales}) מגברים (${periodMales}). שקלי להגביר קמפיינים ממוקדי גברים.`);
        else if (periodRatio < 0.6) insights.push(`בתקופה הנוכחית נרשמו הרבה יותר גברים (${periodMales}) מנשים (${periodFemales}). שקלי להגביר קמפיינים ממוקדי נשים.`);
      }

      // Find dominant age group
      const ageArr = (ageGroups as any[]).filter((a: any) => a.ageGroup !== 'לא צוין');
      if (ageArr.length > 0) {
        const top = ageArr.sort((a: any, b: any) => Number(b.count) - Number(a.count))[0];
        insights.push(`קבוצת הגיל הדומיננטית בתקופה: ${top.ageGroup} (${top.count} נרשמים). כדאי לוודא שהקריאייטיב מדבר לקהל הזה.`);
      }

      return {
        total: { count: Number(t?.total || 0), males: totalMales, females: totalFemales, avgAge: Math.round(Number(t?.avgAge || 0)) },
        period: { count: Number(p?.total || 0), males: periodMales, females: periodFemales, avgAge: Math.round(Number(p?.avgAge || 0)) },
        prevPeriod: { count: Number(pp?.total || 0), males: Number(pp?.males || 0), females: Number(pp?.females || 0) },
        ageGroups: (ageGroups as any[]).map((a: any) => ({ group: a.ageGroup, count: Number(a.count), males: Number(a.males), females: Number(a.females) })),
        totalAgeGroups: (totalAgeGroups as any[]).map((a: any) => ({ group: a.ageGroup, count: Number(a.count), males: Number(a.males), females: Number(a.females) })),
        areas: (areas as any[]).map((a: any) => ({ city: a.city, count: Number(a.count), males: Number(a.males), females: Number(a.females) })),
        insights,
      };
    }),

    paymentAbandonmentAudit: teamProcedure.input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    })).query(async ({ input }) => getPaymentAbandonmentAudit(input.startDate, input.endDate)),

    dailyLeadFunnel: teamProcedure.input(z.object({
      startDate: z.number(),
      endDate: z.number(),
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate, endDate } = input;

      const leadRows = await db.select({
        createdAt: crmLeads.createdAt,
        source: crmLeads.source,
      }).from(crmLeads).where(and(
        gte(crmLeads.createdAt, startDate),
        lte(crmLeads.createdAt, endDate),
      ));

      const verifiedPayments = await db.select({
        product: completedPayments.product,
        amountAgorot: completedPayments.amountAgorot,
        amountSource: completedPayments.amountSource,
        paidAt: completedPayments.paidAt,
      }).from(completedPayments).where(and(
        gte(completedPayments.paidAt, startDate),
        lte(completedPayments.paidAt, endDate),
        eq(completedPayments.amountSource, "grow"),
      ));
      const dailyPayments = aggregateVerifiedGrowPayments(verifiedPayments);

      // Hourly distribution for insights
      const [hourlyLeads] = await db.execute(sql`
        SELECT HOUR(FROM_UNIXTIME(createdAt/1000)) as hour_of_day, COUNT(*) as leads
        FROM crm_leads 
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
          AND source = 'dna_quiz'
        GROUP BY hour_of_day ORDER BY leads DESC
      `) as any;

      // Day of week distribution
      const [dowLeads] = await db.execute(sql`
        SELECT DAYOFWEEK(FROM_UNIXTIME(createdAt/1000)) as dow, COUNT(*) as leads
        FROM crm_leads 
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
          AND source = 'dna_quiz'
        GROUP BY dow ORDER BY leads DESC
      `) as any;

      // Hourly purchases for conversion insights
      const [hourlyPurchases] = await db.execute(sql`
        SELECT HOUR(FROM_UNIXTIME(paid_at/1000)) as hour_of_day, COUNT(*) as purchases
        FROM completed_payments
        WHERE paid_at >= ${startDate} AND paid_at <= ${endDate}
          AND amount_source = 'grow' AND product = 'database'
        GROUP BY hour_of_day ORDER BY purchases DESC
      `) as any;

      // Build purchase map
      const purchaseMap = Object.fromEntries(dailyPayments.map(day => [day.date, day.purchases]));
      const dbPurchaseMap = Object.fromEntries(dailyPayments.map(day => [day.date, day.databasePurchases]));
      const revenueMap = Object.fromEntries(dailyPayments.map(day => [day.date, day.revenue]));
      const campaignMap: Record<string, number> = {};
      const totalLeadMap: Record<string, number> = {};
      for (const lead of leadRows) {
        const day = israelDateKey(Number(lead.createdAt));
        totalLeadMap[day] = (totalLeadMap[day] || 0) + 1;
        if (lead.source === "dna_quiz") campaignMap[day] = (campaignMap[day] || 0) + 1;
      }

      // Build days array
      const dayKeys = Array.from(new Set([...Object.keys(totalLeadMap), ...dailyPayments.map(day => day.date)]))
        .sort((a, b) => b.localeCompare(a));
      const days = dayKeys.map(dayKey => {
        const totalPurch = purchaseMap[dayKey] || 0;
        const dbPurch = dbPurchaseMap[dayKey] || 0;
        const campLeads = campaignMap[dayKey] || 0;
        return {
          date: dayKey,
          totalLeads: totalLeadMap[dayKey] || 0,
          campaignLeads: campLeads,
          coldCampaign: 0,
          warmCampaign: 0,
          totalPurchases: totalPurch,
          databasePurchases: dbPurch,
          revenue: revenueMap[dayKey] || 0,
          databaseRevenue: dailyPayments.find(paymentDay => paymentDay.date === dayKey)?.databaseRevenue || 0,
        };
      });

      // Totals
      const totalLeads = days.reduce((s, d) => s + d.totalLeads, 0);
      const totalCampaign = days.reduce((s, d) => s + d.campaignLeads, 0);
      const totalPurch = days.reduce((s, d) => s + d.databasePurchases, 0);
      const totalDatabaseRevenue = days.reduce((s, d) => s + d.databaseRevenue, 0);
      const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);

      // Insights
      const insights: string[] = [];
      
      // Best hours
      const topHours = (hourlyPurchases as any[]).slice(0, 3);
      if (topHours.length > 0) {
        insights.push(`שעות שיא לרכישות: ${topHours.map((h: any) => h.hour_of_day + ':00').join(', ')}`);
      }
      
      // Best days of week
      const dayNames = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const topDays = (dowLeads as any[]).slice(0, 3);
      if (topDays.length > 0) {
        insights.push(`ימים חזקים ללידים: ${topDays.map((d: any) => dayNames[d.dow] || d.dow).join(', ')}`);
      }

      insights.push(`ממוצע יומי: ${Math.round(totalCampaign / Math.max(days.length, 1))} לידים, ${Math.round(totalPurch / Math.max(days.length, 1))} רכישות`);

      // Try to get Meta spend for the period
      let totalSpend = 0;
      let totalSalesSpend = 0;
      let totalProfileBoostSpend = 0;
      let metaSpendStatus: "available" | "unavailable" = "unavailable";
      const dailySalesSpendMap: Record<string, number> = {};
      const dailyProfileBoostSpendMap: Record<string, number> = {};
      let prevTotalLeads = 0;
      let prevTotalPurch = 0;
      let prevTotalRevenue = 0;
      try {
        const metaToken = process.env.META_ADS_TOKEN;
        if (metaToken) {
          const startDateStr = formatMetaCalendarDate(startDate);
          const endDateStr = formatMetaCalendarDate(endDate);
          const mainAccountId = "act_254697595735216";
          const boostsAccountId = "act_3841144459522772";
          const fetchAllDailySpend = async (accountId: string) => {
            const rows: any[] = [];
            let next: string | null = `https://graph.facebook.com/v25.0/${accountId}/insights?fields=spend&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&time_increment=1&limit=100&access_token=${metaToken}`;
            while (next) {
              const response = await fetch(next, { signal: AbortSignal.timeout(8_000) });
              const payload: any = await response.json();
              if (!response.ok || payload.error) throw new Error(payload.error?.message || `Meta HTTP ${response.status}`);
              rows.push(...(payload.data || []));
              next = payload.paging?.next || null;
            }
            return rows;
          };
          // Fetch daily spend from both accounts
          const [mainRows, boostRows] = await Promise.all([
            fetchAllDailySpend(mainAccountId),
            fetchAllDailySpend(boostsAccountId),
          ]);
          for (const row of mainRows) {
            const day = row.date_start;
            const spend = parseFloat(row.spend || 0);
            dailySalesSpendMap[day] = (dailySalesSpendMap[day] || 0) + spend;
            totalSalesSpend += spend;
          }
          for (const row of boostRows) {
            const day = row.date_start;
            const spend = parseFloat(row.spend || 0);
            dailyProfileBoostSpendMap[day] = (dailyProfileBoostSpendMap[day] || 0) + spend;
            totalProfileBoostSpend += spend;
          }
          totalSpend = totalSalesSpend + totalProfileBoostSpend;
          metaSpendStatus = "available";
        }
      } catch (e) { /* ignore */ }

      // Fetch previous period for comparison
      const previousPeriod = previousComparisonPeriod(startDate, endDate);
      const salesComparisonAvailable = hasVerifiedGrowCoverage(previousPeriod);
      try {
        const prevStart = previousPeriod.startDate;
        const prevEnd = previousPeriod.endDate;
        const [prevLeadRows] = await db.execute(sql`
          SELECT COUNT(*) as cnt FROM crm_leads
          WHERE createdAt >= ${prevStart} AND createdAt <= ${prevEnd} AND source = 'dna_quiz'
        `) as any;
        const previousPayments = await db.select({
          product: completedPayments.product,
          amountAgorot: completedPayments.amountAgorot,
          amountSource: completedPayments.amountSource,
          paidAt: completedPayments.paidAt,
        }).from(completedPayments).where(and(
          gte(completedPayments.paidAt, prevStart),
          lte(completedPayments.paidAt, prevEnd),
          eq(completedPayments.amountSource, "grow"),
        ));
        prevTotalLeads = Number((prevLeadRows as any[])[0]?.cnt || 0);
        const previousSummary = summarizeVerifiedGrowPayments(previousPayments);
        prevTotalPurch = previousSummary.productSales.database || 0;
        prevTotalRevenue = previousSummary.revenue;
      } catch (e) { /* ignore */ }

      const daysWithSpend = days.map(day => ({
        ...day,
        salesSpend: Math.round((dailySalesSpendMap[day.date] || 0) * 100) / 100,
        profileBoostSpend: Math.round((dailyProfileBoostSpendMap[day.date] || 0) * 100) / 100,
        totalPaidMediaSpend: Math.round(((dailySalesSpendMap[day.date] || 0) + (dailyProfileBoostSpendMap[day.date] || 0)) * 100) / 100,
      }));

      return {
        days: daysWithSpend,
        totals: {
          totalLeads,
          totalCampaign,
          totalPurchases: totalPurch,
          totalDatabaseRevenue,
          totalRevenue,
          totalSpend,
          totalSalesSpend,
          totalProfileBoostSpend,
          metaSpendStatus,
          avgDailyLeads: Math.round(totalCampaign / Math.max(days.length, 1)),
          avgDailyPurchases: Math.round(totalPurch / Math.max(days.length, 1)),
          prevTotalLeads,
          prevTotalPurch,
          prevTotalRevenue,
          leadsChange: prevTotalLeads > 0 ? Number((((totalCampaign - prevTotalLeads) / prevTotalLeads) * 100).toFixed(0)) : 0,
          purchChange: salesComparisonAvailable && prevTotalPurch > 0 ? Number((((totalPurch - prevTotalPurch) / prevTotalPurch) * 100).toFixed(0)) : null,
          revenueChange: salesComparisonAvailable && prevTotalRevenue > 0 ? Number((((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(0)) : null,
          comparisonBasis: previousPeriod.basis,
          salesComparisonAvailable,
        },
       insights,
     };
   }),

  sendCompletionSms: teamProcedure
    .mutation(async ({ ctx }) => {
      guardAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [skeletons] = await db.execute(sql.raw(`
        SELECT id, firstName, lastName, email, phone, age, city, height,
               education, occupation, photoUrl, about, aboutMe, questionnaireCompletedAt
        FROM singles
        WHERE isActive = 1 AND (age = 0 OR age IS NULL OR city = '' OR city IS NULL)
        AND phone IS NOT NULL AND phone != ''
        ORDER BY createdAt DESC
      `)) as any;
      let sent = 0;
      let failed = 0;
      const batchId = Date.now();
      const results: Array<{ name: string; phone: string; status: string }> = [];
      for (const s of skeletons) {
        const token = crypto.createHash('sha256')
          .update(s.email + 'questionnaire-salt-2024')
          .digest('hex');
        const link = `hilitcaspi.com/join/questionnaire?token=${token}`;
        const message = `היי ${s.firstName}! כאן הילית מהמאגר.\nשמנו לב שחסרים לנו כמה פרטים כדי שנוכל למצוא לך את ההתאמה המושלמת.\nזה לוקח דקה:\n${link}`;
        const ok = await sendSMS(s.phone, message);
        if (ok) {
          sent++;
          results.push({ name: `${s.firstName} ${s.lastName || ''}`, phone: s.phone, status: 'sent' });
        } else {
          failed++;
          results.push({ name: `${s.firstName} ${s.lastName || ''}`, phone: s.phone, status: 'failed' });
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return { total: skeletons.length, sent, failed, results };
    }),

});
