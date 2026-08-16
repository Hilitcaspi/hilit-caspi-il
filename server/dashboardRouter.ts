import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./brevo";

// Product prices for revenue calculation
const PRODUCT_PRICES: Record<string, number> = {
  database: 299,
  guide: 149,
  course: 249,
  session: 500,
  coaching: 2900,
  coaching_mas: 2900,
  bundle_tubav: 349,
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

function guardAdmin(ctx: any) {
  if (!ctx.user && !ctx.teamMember) throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}


// ── Meta Ads API helper ─────────────────────────────────────────────────────
// ── Instagram & Facebook Insights API helper ────────────────────────────────
async function fetchSocialInsights(since: number, until: number) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return null;
  const PAGE_ID = "853268171195420"; // Hilit Caspi Relationship
  const IG_ID = "17841476794270830";
  
  try {
    // Get page token for insights
    const pagesRes = await fetch(`https://graph.facebook.com/v25.0/me/accounts?fields=id,access_token&access_token=${token}`);
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.find((p: any) => p.id === PAGE_ID);
    const pageToken = page?.access_token || token;
    
    const sinceUnix = Math.floor(since / 1000);
    const untilUnix = Math.floor(until / 1000);
    
    // IG time_series: reach, follower_count
    const igTimeRes = await fetch(`https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=reach,follower_count&metric_type=time_series&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${pageToken}`);
    const igTimeData = await igTimeRes.json();
    
    // IG total_value: accounts_engaged, total_interactions, likes, comments, shares, saves
    const igTotalRes = await fetch(`https://graph.facebook.com/v25.0/${IG_ID}/insights?metric=accounts_engaged,total_interactions,likes,comments,shares,saves&metric_type=total_value&period=day&since=${sinceUnix}&until=${untilUnix}&access_token=${pageToken}`);
    const igTotalData = await igTotalRes.json();
    
    // IG profile info
    const igProfileRes = await fetch(`https://graph.facebook.com/v25.0/${IG_ID}?fields=followers_count,media_count,username&access_token=${pageToken}`);
    const igProfile = await igProfileRes.json();
    
    // FB Page info
    const fbPageRes = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}?fields=fan_count,followers_count,name&access_token=${pageToken}`);
    const fbPage = await fbPageRes.json();
    
    // Parse IG time series
    const reachData = igTimeData.data?.find((m: any) => m.name === 'reach')?.values || [];
    const followerData = igTimeData.data?.find((m: any) => m.name === 'follower_count')?.values || [];
    
    // Parse IG totals
    const totals: Record<string, number> = {};
    for (const metric of (igTotalData.data || [])) {
      totals[metric.name] = metric.total_value?.value || 0;
    }
    
    // Calculate follower growth
    const followerGrowth = followerData.length >= 2 
      ? followerData[followerData.length - 1].value - followerData[0].value 
      : 0;
    
    const totalReach = reachData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
    const avgDailyReach = reachData.length > 0 ? Math.round(totalReach / reachData.length) : 0;
    
    return {
      instagram: {
        username: igProfile.username || 'hilitcaspi_relationship',
        followers: igProfile.followers_count || 0,
        posts: igProfile.media_count || 0,
        followerGrowth,
        totalReach,
        avgDailyReach,
        accountsEngaged: totals.accounts_engaged || 0,
        totalInteractions: totals.total_interactions || 0,
        likes: totals.likes || 0,
        comments: totals.comments || 0,
        shares: totals.shares || 0,
        saves: totals.saves || 0,
        engagementRate: igProfile.followers_count > 0 
          ? Math.round((totals.total_interactions || 0) / igProfile.followers_count * 1000) / 10 
          : 0,
        dailyReach: reachData.map((d: any) => ({ date: d.end_time?.split('T')[0], value: d.value || 0 })),
        dailyFollowers: followerData.map((d: any) => ({ date: d.end_time?.split('T')[0], value: d.value || 0 })),
      },
      facebook: {
        pageName: fbPage.name || 'Hilit Caspi Relationship',
        fans: fbPage.fan_count || 0,
        followers: fbPage.followers_count || 0,
      },
      whatsappGroupSize: 1000,
    };
  } catch (err) {
    console.error("[SocialInsights] Error:", err);
    return null;
  }
}

async function fetchMetaAdsInsights(since: string, until: string) {
  const token = process.env.META_ADS_TOKEN;
  const mainAccountId = "act_254697595735216";
  const boostsAccountId = "act_3841144459522772";
  const fields = "campaign_name,spend,impressions,clicks,reach,actions";
  async function fetchAccount(accountId: string) {
    try {
      const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=50&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) { console.error("Meta API error:", data.error.message); return []; }
      return data.data || [];
    } catch (e) { console.error("Meta fetch error:", e); return []; }
  }
  const [campaignData, boostData] = await Promise.all([fetchAccount(mainAccountId), fetchAccount(boostsAccountId)]);
  function parseInsights(rows: any[]) {
    return rows.map((r: any) => {
      const actions = r.actions || [];
      const gv = (t: string) => Number(actions.find((a: any) => a.action_type === t)?.value || 0);
      return { name: r.campaign_name, spend: Number(r.spend || 0), impressions: Number(r.impressions || 0), reach: Number(r.reach || 0), clicks: Number(r.clicks || 0), purchases: gv("purchase"), leads: gv("lead"), registrations: gv("complete_registration"), videoViews: gv("video_view"), postEngagement: gv("post_engagement"), likes: gv("like"), comments: gv("comment"), shares: gv("post"), saves: gv("onsite_conversion.post_save"), cpl: gv("lead") > 0 ? Math.round(Number(r.spend) / gv("lead") * 10) / 10 : 0, cpa: gv("purchase") > 0 ? Math.round(Number(r.spend) / gv("purchase") * 10) / 10 : 0, roas: gv("purchase") > 0 ? Math.round(gv("purchase") * 299 / Number(r.spend) * 10) / 10 : 0 };
    });
  }
  return { campaigns: parseInsights(campaignData), boosts: parseInsights(boostData) };
}

export const dashboardRouter = router({
  // ── Monthly Targets ───────────────────────────────────────────────────────
  monthlyTargets: teamProcedure.query(async ({ ctx }) => {
    guardAdmin(ctx);
    // Realistic high targets based on actual performance:
    // Last 30 days: 2069 leads, 373 purchases (279 database + 81 bundle + 8 session + 3 guide + 1 course + 1 coaching)
    // Revenue: ~279*299 + 81*349 + 8*500 + 3*149 + 1*499 + 1*2900 = ~118K
    // Target: 20% growth over current performance
    return {
      budget: 8000,        // Monthly ad spend target (currently ~5K, push to 8K for growth)
      leads: 2500,         // Monthly leads target (currently 2069, target +20%)
      purchases: 450,      // Monthly purchases target (currently 373, target +20%)
      revenue: 140000,     // Monthly revenue target (currently ~118K, target +20%)
      databaseSales: 350,  // Database product (currently 279, target +25%)
      guideSales: 20,      // Guide sales (currently 3, push with funnels)
      courseSales: 10,     // Course sales (currently 1, push with funnels)
      coachingSales: 5,    // Coaching clients (currently 1, high value target)
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
          journey,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
        GROUP BY journey ORDER BY sent DESC LIMIT 15
      `) as any;
      
      // Per-email-index performance (which email in journey converts best)
      const [indexStats] = await db.execute(sql`
        SELECT 
          journey, emailIndex,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened,
          SUM(CASE WHEN clickCount > 0 THEN 1 ELSE 0 END) as clicked
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
        GROUP BY journey, emailIndex ORDER BY journey, emailIndex LIMIT 50
      `) as any;
      
      // Daily email performance
      const [dailyEmails] = await db.execute(sql`
        SELECT 
          DATE(FROM_UNIXTIME(sentAt/1000)) as day,
          COUNT(*) as sent,
          SUM(CASE WHEN openCount > 0 THEN 1 ELSE 0 END) as opened
        FROM email_log 
        WHERE sentAt >= ${startDate} AND sentAt <= ${endDate} AND sentAt > 0
        GROUP BY day ORDER BY day
      `) as any;
      
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
        daily: (dailyEmails as any[]).map((d: any) => ({
          day: String(d.day),
          sent: Number(d.sent),
          opened: Number(d.opened),
        })),
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
      
      // Funnel: page_view → dna_quiz_start → dna_quiz_complete → form_submit (purchase)
      const [[funnelData]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'page_view' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as pageViews,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_start' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dnaStarts,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dnaCompletes,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'database_cta' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as databaseClicks,
          (SELECT COUNT(*) FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate}) as purchases
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
          purchases: Number(funnelData?.purchases ?? 0),
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

      // Total purchases in period
      const [[purchaseRow]] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      `) as any;
      const totalPurchases = Number(purchaseRow?.cnt ?? 0);

      // Revenue by product in period
      const [revenueRows] = await db.execute(sql`
        SELECT product, COUNT(*) as cnt FROM payment_leads 
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY product
      `) as any;
      let totalRevenue = 0;
      for (const row of (revenueRows as any[])) {
        totalRevenue += Number(row.cnt) * (PRODUCT_PRICES[row.product] ?? 0);
      }

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
      const periodLength = endDate - startDate;
      const prevStart = startDate - periodLength;
      const prevEnd = startDate - 1;
      
      // Current period
      const [[curr]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM crm_leads WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}) as leads,
          (SELECT COUNT(*) FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate}) as purchases,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as dna
      `) as any;
      
      // Previous period
      const [[prev]] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM crm_leads WHERE createdAt >= ${prevStart} AND createdAt <= ${prevEnd}) as leads,
          (SELECT COUNT(*) FROM payment_leads WHERE created_at >= ${prevStart} AND created_at <= ${prevEnd}) as purchases,
          (SELECT COUNT(*) FROM analytics_events WHERE eventType = 'dna_quiz_complete' AND createdAt >= ${prevStart} AND createdAt <= ${prevEnd}) as dna
      `) as any;
      
      // Revenue current
      const [revCurr] = await db.execute(sql`SELECT product, COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${startDate} AND created_at <= ${endDate} GROUP BY product`) as any;
      let revenueCurr = 0;
      const productSales: Record<string, number> = {};
      for (const row of (revCurr as any[])) { 
        const cnt = Number(row.cnt); 
        revenueCurr += cnt * (PRODUCT_PRICES[row.product] ?? 0); 
        productSales[row.product] = cnt;
      }
      
      // Revenue previous
      const [revPrev] = await db.execute(sql`SELECT product, COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${prevStart} AND created_at <= ${prevEnd} GROUP BY product`) as any;
      let revenuePrev = 0;
      for (const row of (revPrev as any[])) { revenuePrev += Number(row.cnt) * (PRODUCT_PRICES[row.product] ?? 0); }
      
      // Lead journey attribution: leads from campaigns that converted
      const [journeyAttribution] = await db.execute(sql`
        SELECT 
          cl.utmCampaign as campaign,
          cl.utmSource as source,
          COUNT(DISTINCT cl.id) as totalLeads,
          COUNT(DISTINCT pl.id) as converted
        FROM crm_leads cl
        LEFT JOIN payment_leads pl ON pl.email = cl.email AND pl.created_at >= ${startDate}
        WHERE cl.createdAt >= ${startDate} AND cl.createdAt <= ${endDate}
        GROUP BY cl.utmCampaign, cl.utmSource
        HAVING totalLeads > 2
        ORDER BY converted DESC, totalLeads DESC
        LIMIT 15
      `) as any;
      
      const leads = Number(curr?.leads ?? 0);
      const purchases = Number(curr?.purchases ?? 0);
      const dna = Number(curr?.dna ?? 0);
      const prevLeads = Number(prev?.leads ?? 0);
      const prevPurchases = Number(prev?.purchases ?? 0);
      const prevDna = Number(prev?.dna ?? 0);
      
      function pctChange(curr: number, prev: number): number {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round((curr - prev) / prev * 100);
      }
      
      return {
        current: { leads, purchases, revenue: revenueCurr, dna, conversionRate: leads > 0 ? Math.round(purchases / leads * 1000) / 10 : 0 },
        previous: { leads: prevLeads, purchases: prevPurchases, revenue: revenuePrev, dna: prevDna },
        change: { 
          leads: pctChange(leads, prevLeads), 
          purchases: pctChange(purchases, prevPurchases), 
          revenue: pctChange(revenueCurr, revenuePrev),
          dna: pctChange(dna, prevDna),
        },
        productSales,
        journeyAttribution: (journeyAttribution as any[]).map((r: any) => ({
          campaign: r.campaign || 'ישיר',
          source: r.source || 'direct',
          leads: Number(r.totalLeads),
          converted: Number(r.converted),
          conversionRate: Number(r.totalLeads) > 0 ? Math.round(Number(r.converted) / Number(r.totalLeads) * 1000) / 10 : 0,
        })),
        // Industry benchmarks
        benchmarks: {
          emailOpenRate: 21.5,    // Email marketing industry avg
          emailClickRate: 2.3,    // Industry avg
          metaCPL: 15,            // Meta Ads avg CPL in Israel (services)
          metaCPA: 80,            // Meta Ads avg CPA in Israel
          metaROAS: 3.0,          // Healthy ROAS benchmark
          conversionRate: 3.5,    // Lead-to-purchase avg for info products
          igEngagement: 3.5,      // IG engagement rate benchmark
        },
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

      // Daily leads
      const [leadRows] = await db.execute(sql`
        SELECT FROM_UNIXTIME(createdAt/1000, '%Y-%m-%d') as day, COUNT(*) as cnt
        FROM crm_leads
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY day ORDER BY day ASC
      `) as any;

      // Daily purchases
      const [purchaseRows] = await db.execute(sql`
        SELECT FROM_UNIXTIME(created_at/1000, '%Y-%m-%d') as day, product, COUNT(*) as cnt
        FROM payment_leads
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY day, product ORDER BY day ASC
      `) as any;

      // Aggregate daily revenue
      const dailyRevenue: Record<string, number> = {};
      const dailyPurchases: Record<string, number> = {};
      for (const row of (purchaseRows as any[])) {
        const day = row.day;
        const revenue = Number(row.cnt) * (PRODUCT_PRICES[row.product] ?? 0);
        dailyRevenue[day] = (dailyRevenue[day] ?? 0) + revenue;
        dailyPurchases[day] = (dailyPurchases[day] ?? 0) + Number(row.cnt);
      }

      return {
        leads: (leadRows as any[]).map((r: any) => ({ day: r.day, count: Number(r.cnt) })),
        revenue: Object.entries(dailyRevenue).map(([day, amount]) => ({ day, amount })).sort((a, b) => a.day.localeCompare(b.day)),
        purchases: Object.entries(dailyPurchases).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
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

      // Same period last month for comparison
      const periodLength = endDate - startDate;
      const sameLastMonthStart = startDate - 30 * 24 * 60 * 60 * 1000;
      const sameLastMonthEnd = sameLastMonthStart + periodLength;

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

      // Purchases by source/campaign (join crm_leads to get UTM)
      const [purchaseRows] = await db.execute(sql`
        SELECT 
          COALESCE(cl.utmSource, cl.source, 'direct') as channel,
          cl.utmMedium as medium,
          cl.utmCampaign as campaign,
          pl.product,
          COUNT(*) as purchases
        FROM payment_leads pl
        JOIN crm_leads cl ON cl.email = pl.email
        WHERE pl.created_at >= ${startDate} AND pl.created_at <= ${endDate}
        GROUP BY channel, medium, campaign, pl.product
        ORDER BY purchases DESC
      `) as any;

      // Previous period leads by channel (same period last month)
      const [prevLeadRows] = await db.execute(sql`
        SELECT 
          COALESCE(utmSource, source, 'direct') as channel,
          utmMedium as medium,
          COUNT(*) as leads
        FROM crm_leads
        WHERE createdAt >= ${sameLastMonthStart} AND createdAt <= ${sameLastMonthEnd}
        GROUP BY channel, medium
      `) as any;

      // Previous period purchases by channel
      const [prevPurchaseRows] = await db.execute(sql`
        SELECT 
          COALESCE(cl.utmSource, cl.source, 'direct') as channel,
          cl.utmMedium as medium,
          pl.product,
          COUNT(*) as purchases
        FROM payment_leads pl
        JOIN crm_leads cl ON cl.email = pl.email
        WHERE pl.created_at >= ${sameLastMonthStart} AND pl.created_at <= ${sameLastMonthEnd}
        GROUP BY channel, medium, pl.product
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
        prevChannelData[ch].revenue += cnt * (PRODUCT_PRICES[row.product] ?? 0);
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
        const rev = cnt * (PRODUCT_PRICES[row.product] ?? 0);
        channelData[ch].purchases += cnt;
        channelData[ch].revenue += rev;
        const camp = row.campaign || "(ללא קמפיין)";
        if (!channelData[ch].campaigns[camp]) channelData[ch].campaigns[camp] = { leads: 0, purchases: 0, revenue: 0 };
        channelData[ch].campaigns[camp].purchases += cnt;
        channelData[ch].campaigns[camp].revenue += rev;
      }

      // Fetch Meta Ads spend for this period and previous period
      const sinceStr = new Date(startDate).toISOString().split('T')[0];
      const untilStr = new Date(endDate).toISOString().split('T')[0];
      const prevSinceStr = new Date(sameLastMonthStart).toISOString().split('T')[0];
      const prevUntilStr = new Date(sameLastMonthEnd).toISOString().split('T')[0];
      
      let metaSpend = 0;
      let prevMetaSpend = 0;
      try {
        const metaData = await fetchMetaAdsInsights(sinceStr, untilStr);
        metaSpend = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.spend, 0);
        const prevMetaData = await fetchMetaAdsInsights(prevSinceStr, prevUntilStr);
        prevMetaSpend = [...prevMetaData.campaigns, ...prevMetaData.boosts].reduce((s, c) => s + c.spend, 0);
      } catch (e) { /* ignore meta errors */ }

      return Object.entries(channelData)
        .map(([channel, data]) => ({
          channel,
          ...data,
          spend: channel === "Meta Ads (ממומן)" ? Math.round(metaSpend) : 0,
          prevSpend: channel === "Meta Ads (ממומן)" ? Math.round(prevMetaSpend) : 0,
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
          COUNT(DISTINCT cl.id) as leads,
          COUNT(DISTINCT CASE WHEN pl.email IS NOT NULL THEN cl.id END) as purchases,
          GROUP_CONCAT(DISTINCT pl.product) as products
        FROM crm_leads cl
        LEFT JOIN payment_leads pl ON pl.email = cl.email AND pl.created_at >= ${startDate}
        WHERE cl.createdAt >= ${startDate} AND cl.createdAt <= ${endDate}
          AND cl.utmCampaign IS NOT NULL AND cl.utmCampaign != ''
        GROUP BY cl.utmCampaign, cl.utmSource
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
          campaign: r.campaign,
          source: mapChannel(r.source),
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
      const since = new Date(input.startDate).toISOString().split("T")[0];
      const until = new Date(input.endDate).toISOString().split("T")[0];
      const metaData = await fetchMetaAdsInsights(since, until);
      const totalSpend = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.spend, 0);
      const totalPurchases = metaData.campaigns.reduce((s, c) => s + c.purchases, 0);
      const totalLeads = metaData.campaigns.reduce((s, c) => s + c.leads, 0);
      const totalImpressions = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.impressions, 0);
      const totalReach = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.reach, 0);
      return {
        campaigns: metaData.campaigns.sort((a, b) => b.spend - a.spend),
        boosts: metaData.boosts.sort((a, b) => b.spend - a.spend),
        totals: { spend: totalSpend, purchases: totalPurchases, leads: totalLeads, impressions: totalImpressions, reach: totalReach, avgCPA: totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0, avgCPL: totalLeads > 0 ? Math.round(totalSpend / totalLeads * 10) / 10 : 0, roas: totalSpend > 0 ? Math.round(totalPurchases * 299 / totalSpend * 10) / 10 : 0, revenue: totalPurchases * 299 },
        boostsTotals: { spend: metaData.boosts.reduce((s, c) => s + c.spend, 0), impressions: metaData.boosts.reduce((s, c) => s + c.impressions, 0), reach: metaData.boosts.reduce((s, c) => s + c.reach, 0), clicks: metaData.boosts.reduce((s, c) => s + c.clicks, 0), engagement: metaData.boosts.reduce((s, c) => s + c.postEngagement, 0), likes: metaData.boosts.reduce((s, c) => s + c.likes, 0), comments: metaData.boosts.reduce((s, c) => s + c.comments, 0), shares: metaData.boosts.reduce((s, c) => s + c.shares, 0), saves: metaData.boosts.reduce((s, c) => s + c.saves, 0), videoViews: metaData.boosts.reduce((s, c) => s + c.videoViews, 0) },
      };
    }),

  // ── Coaching & Session Revenue ─────────────────────────────────────────
  coachingRevenue: teamProcedure
    .input(z.object({ startDate: z.number(), endDate: z.number() }))
    .query(async ({ ctx, input }) => {
      guardAdmin(ctx);
      const db = await getDb();
      const { startDate, endDate } = input;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`
        SELECT email, name, product, sum, created_at, utmSource, utmMedium, utmCampaign
        FROM payment_leads
        WHERE created_at >= ${startDate} AND created_at <= ${endDate} AND (CAST(sum AS UNSIGNED) >= 400)
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
      if (!db) return { products: [] };
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
    const [[purchaseRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${weekAgo}`) as any;
    const [revenueRows] = await db.execute(sql`SELECT product, COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${weekAgo} GROUP BY product`) as any;
    
    // Previous week for comparison
    const [[prevLeadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${twoWeeksAgo} AND createdAt < ${weekAgo}`) as any;
    const [[prevPurchaseRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${twoWeeksAgo} AND created_at < ${weekAgo}`) as any;
    
    let revenue = 0;
    const productBreakdown: { product: string; count: number; revenue: number }[] = [];
    for (const row of (revenueRows as any[])) {
      const cnt = Number(row.cnt);
      const rev = cnt * (PRODUCT_PRICES[row.product] ?? 0);
      revenue += rev;
      productBreakdown.push({ product: row.product, count: cnt, revenue: rev });
    }
    
    const leads = Number(leadRow?.cnt ?? 0);
    const purchases = Number(purchaseRow?.cnt ?? 0);
    const prevLeads = Number(prevLeadRow?.cnt ?? 0);
    const prevPurchases = Number(prevPurchaseRow?.cnt ?? 0);
    
    // Meta Ads data
    const since = new Date(weekAgo).toISOString().split("T")[0];
    const until = new Date(now).toISOString().split("T")[0];
    const metaData = await fetchMetaAdsInsights(since, until);
    const totalSpend = [...metaData.campaigns, ...metaData.boosts].reduce((s, c) => s + c.spend, 0);
    
    // Top campaigns
    const topCampaigns = metaData.campaigns
      .filter(c => c.spend > 0)
      .sort((a, b) => (b.purchases * 299 - b.spend) - (a.purchases * 299 - a.spend))
      .slice(0, 5);
    
    // Winning (high ROAS) and losing (high spend, no conversions) campaigns
    const winners = metaData.campaigns.filter(c => c.roas >= 2 && c.purchases > 0);
    const losers = metaData.campaigns.filter(c => c.spend > 50 && c.purchases === 0 && c.leads < 3);
    
    // Social insights
    const social = await fetchSocialInsights(weekAgo, now);
    
    return {
      period: { start: weekAgo, end: now },
      kpis: { leads, purchases, revenue, spend: totalSpend, roas: totalSpend > 0 ? Math.round(revenue / totalSpend * 10) / 10 : 0 },
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
      if (!db) return null;
      const now = Date.now();
      const start = input.startDate || now - 30 * 24 * 60 * 60 * 1000;
      const end = input.endDate || now;
      
      // Previous period for comparison
      const periodLength = end - start;
      const prevStart = start - periodLength;
      const prevEnd = start;

      // Total database stats
      const totalStats = await db.execute<any[]>(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females,
          AVG(CASE WHEN age > 0 THEN age ELSE NULL END) as avgAge
        FROM singles WHERE isActive = 1
      `);

      // Period registrations
      const periodStats = await db.execute<any[]>(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females,
          AVG(CASE WHEN age > 0 THEN age ELSE NULL END) as avgAge
        FROM singles WHERE isActive = 1 AND registeredAt >= ${start} AND registeredAt <= ${end}
      `);

      // Previous period registrations
      const prevPeriodStats = await db.execute<any[]>(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles WHERE isActive = 1 AND registeredAt >= ${prevStart} AND registeredAt <= ${prevEnd}
      `);

      // Age distribution (current period)
      const ageGroups = await db.execute<any[]>(sql`
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
        FROM singles WHERE isActive = 1 AND registeredAt >= ${start} AND registeredAt <= ${end}
        GROUP BY ageGroup ORDER BY MIN(age)
      `);

      // Geographic distribution (current period)
      const areas = await db.execute<any[]>(sql`
        SELECT city, COUNT(*) as count,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
        FROM singles 
        WHERE isActive = 1 AND city IS NOT NULL AND city != '' AND registeredAt >= ${start} AND registeredAt <= ${end}
        GROUP BY city ORDER BY count DESC LIMIT 15
      `);

      // Total age distribution (all time)
      const totalAgeGroups = await db.execute<any[]>(sql`
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
      `);

      const t = (totalStats as any[])[0];
      const p = (periodStats as any[])[0];
      const pp = (prevPeriodStats as any[])[0];

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

});
