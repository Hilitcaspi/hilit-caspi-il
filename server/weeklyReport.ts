/**
 * Weekly Marketing Report — sent every Tuesday at 20:00 Israel time
 * Aggregates dashboard data and sends a beautiful HTML email to hilitcaspi@gmail.com
 */
import { getDb } from "./db";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { sendEmail } from "./brevo";
import { completedPayments } from "../drizzle/schema";
import { formatMetaCalendarDate, metaActionValue } from "./dashboardMetaSpend";
import { summarizeVerifiedGrowPayments } from "./dashboardRevenue";

const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר", guide: "מדריך", course: "קורס", session: "פגישה", coaching: "ליווי", coaching_mas: "ליווי מאסטר", bundle_tubav: "חבילת טו באב", bundle_new_year: "חבילת שנה חדשה",
};

async function fetchMetaSpend(since: string, until: string) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return { status: "unavailable" as const, spend: 0, salesSpend: 0, profileBoostSpend: 0, campaigns: [] as any[] };
  const accountIds = ["act_254697595735216", "act_3841144459522772"];
  try {
    const fetchAccount = async (accountId: string) => {
      const rows: any[] = [];
      let next: string | null = `https://graph.facebook.com/v25.0/${accountId}/insights?fields=campaign_name,spend,actions&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=100&access_token=${token}`;
      while (next) {
        const res = await fetch(next);
        const data: any = await res.json();
        if (!res.ok || data.error) throw new Error(data.error?.message || `Meta HTTP ${res.status}`);
        rows.push(...(data.data || []));
        next = data.paging?.next || null;
      }
      return rows;
    };
    const [salesRows, profileBoostRows] = await Promise.all(accountIds.map(fetchAccount));
    const campaigns = salesRows.map((r: any) => {
      const spend = Number(r.spend || 0);
      const actions = r.actions || [];
      const leads = metaActionValue(actions, ['lead', 'onsite_conversion.lead_grouped']);
      const purchases = metaActionValue(actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
      return { name: r.campaign_name, spend, leads, purchases };
    });
    const salesSpend = salesRows.reduce((sum: number, row: any) => sum + Number(row.spend || 0), 0);
    const profileBoostSpend = profileBoostRows.reduce((sum: number, row: any) => sum + Number(row.spend || 0), 0);
    return { status: "available" as const, spend: salesSpend + profileBoostSpend, salesSpend, profileBoostSpend, campaigns: campaigns.filter((c: any) => c.spend > 0).sort((a: any, b: any) => b.spend - a.spend) };
  } catch { return { status: "unavailable" as const, spend: 0, salesSpend: 0, profileBoostSpend: 0, campaigns: [] }; }
}

export async function generateAndSendWeeklyReport(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { success: false, error: "No DB" };
    
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    
    // KPIs
    const [[leadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${weekAgo}`) as any;
    const currentPayments = await db.select({
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      paidAt: completedPayments.paidAt,
    }).from(completedPayments).where(and(
      gte(completedPayments.paidAt, weekAgo),
      lte(completedPayments.paidAt, now),
      eq(completedPayments.amountSource, "grow"),
    ));
    
    // Previous period KPIs (same period last week)
    const [[prevLeadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${twoWeeksAgo} AND createdAt < ${weekAgo}`) as any;
    const previousPayments = await db.select({
      product: completedPayments.product,
      amountAgorot: completedPayments.amountAgorot,
      amountSource: completedPayments.amountSource,
      paidAt: completedPayments.paidAt,
    }).from(completedPayments).where(and(
      gte(completedPayments.paidAt, twoWeeksAgo),
      lt(completedPayments.paidAt, weekAgo),
      eq(completedPayments.amountSource, "grow"),
    ));
    
    const leads = Number(leadRow?.cnt ?? 0);
    const currentPaymentSummary = summarizeVerifiedGrowPayments(currentPayments);
    const previousPaymentSummary = summarizeVerifiedGrowPayments(previousPayments);
    const purchases = currentPaymentSummary.purchases;
    const revenue = currentPaymentSummary.revenue;
    const productLines: string[] = [];
    for (const [product, count] of Object.entries(currentPaymentSummary.productSales)) {
      const productRevenue = currentPayments.filter(row => row.product === product && row.amountAgorot > 100).reduce((sum, row) => sum + row.amountAgorot / 100, 0);
      productLines.push(`${PRODUCT_LABELS[product] || product}: ${count} רכישות (₪${productRevenue.toLocaleString()})`);
    }
    
    const prevLeads = Number(prevLeadRow?.cnt ?? 0);
    const prevPurchases = previousPaymentSummary.purchases;
    const prevRevenue = previousPaymentSummary.revenue;
    
    const pctChange = (curr: number, prev: number): string => {
      if (prev === 0) return curr > 0 ? '+100%' : '—';
      const change = Math.round((curr - prev) / prev * 100);
      return change >= 0 ? `+${change}%` : `${change}%`;
    };
    const changeColor = (curr: number, prev: number): string => {
      if (prev === 0) return '#6b7280';
      return curr >= prev ? '#16a34a' : '#dc2626';
    };
    
    // Meta Ads
    const since = formatMetaCalendarDate(weekAgo);
    const until = formatMetaCalendarDate(now);
    const meta = await fetchMetaSpend(since, until);
    
    // Channel breakdown (leads + purchases by source)
    // Use same logic as dashboard: paid sources → Meta Ads, IG organic separate, dna_quiz → Meta Ads
    const META_PAID = new Set(["meta", "Meta", "facebook", "fb", "facebook_shabek", "meta_lead_guide", "meta_lead_call", "meta_lead_dna"]);
    const IG_SOURCES = new Set(["ig", "instagram"]);
    const OTHER_MAP: Record<string, string> = {
      google: "Google / SEO", brevo: "Email (Newsletter)", email: "Email (Journeys)",
      whatsapp: "WhatsApp", referral: "הפניה", shahar: "הפניה",
      customer_service: "שירות לקוחות", guide_form: "מדריך חינמי",
    };
    const mapCh = (s: string | null, medium?: string | null) => {
      if (!s) return "ישיר / לא ידוע";
      if (META_PAID.has(s)) return "Meta Ads (ממומן)";
      if (IG_SOURCES.has(s)) {
        if (medium === "paid" || (medium && (medium.includes("shabek") || medium.includes("קר") || medium.includes("חם")))) return "Meta Ads (ממומן)";
        return "Instagram (אורגני)";
      }
      if (s === "dna_quiz") return "Meta Ads (ממומן)";
      if (/^\d{10,}$/.test(s)) return "Meta Ads (ממומן)";
      return OTHER_MAP[s] || s;
    };
    
    const [chLeadRows] = await db.execute(sql`
      SELECT COALESCE(utmSource, source, 'direct') as channel, utmMedium as medium, COUNT(*) as cnt
      FROM crm_leads WHERE createdAt >= ${weekAgo} AND createdAt <= ${now}
      GROUP BY channel, medium ORDER BY cnt DESC
    `) as any;
    const [chPurchRows] = await db.execute(sql`
      SELECT COALESCE(attributed.utmSource, attributed.source, 'direct') as channel,
             attributed.utmMedium as medium,
             attributed.product,
             COUNT(*) as cnt,
             SUM(attributed.amount_agorot) / 100 as revenue
      FROM (
        SELECT cp.id, cp.product, cp.amount_agorot,
               cl.utmSource, cl.source, cl.utmMedium,
               ROW_NUMBER() OVER (PARTITION BY cp.id ORDER BY cl.createdAt DESC, cl.id DESC) AS leadRank
        FROM completed_payments cp
        LEFT JOIN crm_leads cl
          ON LOWER(TRIM(cl.email)) = LOWER(TRIM(cp.email))
          AND cl.createdAt <= cp.paid_at
        WHERE cp.paid_at >= ${weekAgo} AND cp.paid_at <= ${now} AND cp.amount_source = 'grow' AND cp.amount_agorot > 100
      ) attributed
      WHERE attributed.leadRank = 1
      GROUP BY channel, medium, attributed.product
    `) as any;
    
    const chData: Record<string, { leads: number; purchases: number; revenue: number }> = {};
    for (const r of (chLeadRows as any[])) {
      const ch = mapCh(r.channel, r.medium);
      if (!chData[ch]) chData[ch] = { leads: 0, purchases: 0, revenue: 0 };
      chData[ch].leads += Number(r.cnt);
    }
    for (const r of (chPurchRows as any[])) {
      const ch = mapCh(r.channel, r.medium);
      if (!chData[ch]) chData[ch] = { leads: 0, purchases: 0, revenue: 0 };
      const cnt = Number(r.cnt);
      chData[ch].purchases += cnt;
      chData[ch].revenue += Number(r.revenue || 0);
    }
    const channelRows = Object.entries(chData).sort((a, b) => b[1].leads - a[1].leads);
    
    const revenueToSpend = meta.spend > 0 ? (revenue / meta.spend).toFixed(1) : "N/A";
    const metaSpendText = meta.status === "available" ? `₪${Math.round(meta.spend).toLocaleString()}` : "לא זמין";
    
    // Top campaigns
    const topCampaigns = meta.campaigns.slice(0, 5);
    
    // Build HTML
    const dateRange = `${new Date(weekAgo).toLocaleDateString('he-IL')} — ${new Date(now).toLocaleDateString('he-IL')}`;
    
    const html = `
<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #191265, #2d1f8a); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📊 דוח שבועי — שיווק ומכירות</h1>
    <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px;">${dateRange}</p>
  </div>
  
  <!-- KPIs -->
  <div style="padding: 24px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; padding: 12px; background: #f0f9ff; border-radius: 8px; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${leads}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">לידים</div>
          <div style="font-size: 10px; color: ${changeColor(leads, prevLeads)}; margin-top: 2px;">${pctChange(leads, prevLeads)} (שבוע קודם: ${prevLeads})</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="text-align: center; padding: 12px; background: #f0fdf4; border-radius: 8px; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${purchases}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">רכישות</div>
          <div style="font-size: 10px; color: ${changeColor(purchases, prevPurchases)}; margin-top: 2px;">${pctChange(purchases, prevPurchases)} (שבוע קודם: ${prevPurchases})</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="text-align: center; padding: 12px; background: #fefce8; border-radius: 8px; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #ca8a04;">₪${revenue.toLocaleString()}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">הכנסות</div>
          <div style="font-size: 10px; color: ${changeColor(revenue, prevRevenue)}; margin-top: 2px;">${pctChange(revenue, prevRevenue)} (שבוע קודם: ₪${prevRevenue.toLocaleString()})</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="text-align: center; padding: 12px; background: #fdf2f8; border-radius: 8px; width: 25%;">
          <div style="font-size: 24px; font-weight: bold; color: #db2777;">${meta.status === 'available' ? `₪${Math.round(meta.salesSpend).toLocaleString()}` : 'לא זמין'}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">תקציב מכירה ולידים</div>
        </td>
      </tr>
    </table>
  </div>
  
  <!-- Spend & ROI -->
  <div style="padding: 0 24px 20px;">
    <div style="background: #fafafa; border-radius: 12px; padding: 16px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151;">💰 הוצאות ו-ROI</h3>
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #6b7280;">קמפייני מכירה ולידים:</td><td style="font-weight: bold; color: #dc2626; text-align: left;">${meta.status === 'available' ? `₪${Math.round(meta.salesSpend).toLocaleString()}` : 'לא זמין'}</td></tr>
        <tr><td style="color: #6b7280;">קידומי פרופיל ופוסטים:</td><td style="font-weight: bold; color: #dc2626; text-align: left;">${meta.status === 'available' ? `₪${Math.round(meta.profileBoostSpend).toLocaleString()}` : 'לא זמין'}</td></tr>
        <tr><td style="color: #6b7280;">סה״כ הוצאות Meta:</td><td style="font-weight: bold; color: #dc2626; text-align: left;">${meta.status === 'available' ? `₪${Math.round(meta.spend).toLocaleString()}` : 'לא זמין'}</td></tr>
        <tr><td style="color: #6b7280;">הכנסות Grow מאומתות:</td><td style="font-weight: bold; color: #16a34a; text-align: left;">₪${revenue.toLocaleString()}</td></tr>
        <tr><td style="color: #6b7280;">יחס הכנסות / הוצאות Meta (לא ייחוס):</td><td style="font-weight: bold; color: ${Number(revenueToSpend) >= 2 ? '#16a34a' : '#dc2626'}; text-align: left;">${revenueToSpend === 'N/A' ? 'לא זמין' : `${revenueToSpend}x`}</td></tr>
      </table>
    </div>
  </div>
  
  <!-- Products -->
  ${productLines.length > 0 ? `
  <div style="padding: 0 24px 20px;">
    <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">🛒 פירוט מוצרים</h3>
    ${productLines.map(l => `<div style="font-size: 13px; color: #4b5563; padding: 4px 0;">${l}</div>`).join('')}
  </div>` : ''}
  
  <!-- Channel Breakdown -->
  ${channelRows.length > 0 ? `
  <div style="padding: 0 24px 20px;">
    <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">📡 ביצועים לפי ערוץ</h3>
    <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
      <tr style="background: #f3f4f6;"><th style="padding: 6px; text-align: right;">ערוץ</th><th style="padding: 6px; text-align: center;">לידים</th><th style="padding: 6px; text-align: center;">רכישות</th><th style="padding: 6px; text-align: center;">הכנסות</th></tr>
      ${channelRows.map(([ch, d]) => `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 6px;">${ch}</td><td style="padding: 6px; text-align: center;">${d.leads}</td><td style="padding: 6px; text-align: center; font-weight: bold; color: ${d.purchases > 0 ? '#16a34a' : '#6b7280'};">${d.purchases || '—'}</td><td style="padding: 6px; text-align: center; color: #16a34a;">₪${d.revenue.toLocaleString()}</td></tr>`).join('')}
    </table>
  </div>` : ''}
  
  <!-- Top Campaigns -->
  ${topCampaigns.length > 0 ? `
  <div style="padding: 0 24px 20px;">
    <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">📣 קמפיינים מובילים</h3>
    <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
      <tr style="background: #f3f4f6;"><th style="padding: 6px; text-align: right;">קמפיין</th><th style="padding: 6px; text-align: center;">הוצאה</th><th style="padding: 6px; text-align: center;">לידים</th><th style="padding: 6px; text-align: center;">רכישות</th></tr>
      ${topCampaigns.map((c: any) => `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${c.name.substring(0, 35)}</td><td style="padding: 6px; text-align: center; color: #dc2626;">₪${Math.round(c.spend)}</td><td style="padding: 6px; text-align: center;">${c.leads}</td><td style="padding: 6px; text-align: center; font-weight: bold; color: ${c.purchases > 0 ? '#16a34a' : '#6b7280'};">${c.purchases || '—'}</td></tr>`).join('')}
    </table>
  </div>` : ''}
  
  <!-- Measurement note -->
  <div style="padding: 0 24px 24px;">
    <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">הבהרת מדידה</h3>
    <div style="background: #eff6ff; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #1d4ed8;">הכנסות Grow הן עסקאות מאומתות. לידים ורכישות ברמת קמפיין הם דיווחי Meta לפי חלון הייחוס שלה. היחס הכולל אינו מוכיח שכל ההכנסה נוצרה מהקמפיינים.</div>
  </div>
  
  <!-- Footer -->
  <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; font-size: 11px; color: #9ca3af;">דוח אוטומטי — הילית כספי | דשבורד שיווק</p>
    <a href="https://hilitcaspi.com/dashboard" style="font-size: 11px; color: #6366f1;">צפי בדשבורד המלא →</a>
  </div>
</div>
</body></html>`;

    const result = await sendEmail({
      to: { email: "hilitcaspi@gmail.com", name: "הילית כספי" },
      subject: `📊 דוח שבועי: ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות`,
      htmlContent: html,
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות Grow מאומתות, ₪${revenue.toLocaleString()} הכנסות. הוצאות Meta: ${metaSpendText}. יחס הכנסות להוצאות Meta, ללא ייחוס: ${revenueToSpend}.`,
    });
    
    // Also send to Shahar Netanel
    await sendEmail({
      to: { email: "shaharnat08@gmail.com", name: "שחר נתנאל" },
      subject: `📊 דוח שבועי: ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות`,
      htmlContent: html,
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות Grow מאומתות, ₪${revenue.toLocaleString()} הכנסות. הוצאות Meta: ${metaSpendText}. יחס הכנסות להוצאות Meta, ללא ייחוס: ${revenueToSpend}.`,
    });
    
    // Also send to Netaneal (campaign manager)
    await sendEmail({
      to: { email: "netaneal@menteshdigital.com", name: "נתנאל" },
      subject: `📊 דוח שבועי: ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות`,
      htmlContent: html,
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות Grow מאומתות, ₪${revenue.toLocaleString()} הכנסות. הוצאות Meta: ${metaSpendText}. יחס הכנסות להוצאות Meta, ללא ייחוס: ${revenueToSpend}.`,
    });
    
    console.log(`[WeeklyReport] Sent: leads=${leads}, purchases=${purchases}, revenue=₪${revenue}, spend=₪${Math.round(meta.spend)}`);
    return { success: result.success, error: result.error };
  } catch (err) {
    console.error("[WeeklyReport] Error:", err);
    return { success: false, error: String(err) };
  }
}
