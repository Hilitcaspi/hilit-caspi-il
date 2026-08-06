import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

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

const CHANNEL_MAP: Record<string, string> = {
  meta: "Meta Ads",
  Meta: "Meta Ads",
  facebook: "Meta Ads",
  fb: "Meta Ads",
  facebook_shabek: "Meta Ads",
  ig: "Instagram",
  instagram: "Instagram",
  google: "Google / SEO",
  brevo: "Email (Newsletter)",
  email: "Email (Journeys)",
  whatsapp: "WhatsApp",
  referral: "הפניה",
  shahar: "הפניה",
  customer_service: "שירות לקוחות",
};

function mapChannel(utmSource: string | null): string {
  if (!utmSource) return "ישיר / לא ידוע";
  return CHANNEL_MAP[utmSource] || utmSource;
}

function guardAdmin(ctx: any) {
  if (!ctx.user && !ctx.teamMember) throw new TRPCError({ code: "FORBIDDEN" });
  if (ctx.user && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

export const dashboardRouter = router({
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

      // Leads by source/campaign
      const [leadRows] = await db.execute(sql`
        SELECT 
          COALESCE(utmSource, source, 'direct') as channel,
          utmCampaign as campaign,
          COUNT(*) as leads
        FROM crm_leads
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY channel, campaign
        ORDER BY leads DESC
      `) as any;

      // Purchases by source/campaign (join crm_leads to get UTM)
      const [purchaseRows] = await db.execute(sql`
        SELECT 
          COALESCE(cl.utmSource, cl.source, 'direct') as channel,
          cl.utmCampaign as campaign,
          pl.product,
          COUNT(*) as purchases
        FROM payment_leads pl
        JOIN crm_leads cl ON cl.email = pl.email
        WHERE pl.created_at >= ${startDate} AND pl.created_at <= ${endDate}
        GROUP BY channel, campaign, pl.product
        ORDER BY purchases DESC
      `) as any;

      // Aggregate by channel
      const channelData: Record<string, { leads: number; purchases: number; revenue: number; campaigns: Record<string, { leads: number; purchases: number; revenue: number }> }> = {};

      for (const row of (leadRows as any[])) {
        const ch = mapChannel(row.channel);
        if (!channelData[ch]) channelData[ch] = { leads: 0, purchases: 0, revenue: 0, campaigns: {} };
        channelData[ch].leads += Number(row.leads);
        const camp = row.campaign || "(ללא קמפיין)";
        if (!channelData[ch].campaigns[camp]) channelData[ch].campaigns[camp] = { leads: 0, purchases: 0, revenue: 0 };
        channelData[ch].campaigns[camp].leads += Number(row.leads);
      }

      for (const row of (purchaseRows as any[])) {
        const ch = mapChannel(row.channel);
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

      return Object.entries(channelData)
        .map(([channel, data]) => ({
          channel,
          ...data,
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
});
