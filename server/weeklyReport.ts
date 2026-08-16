/**
 * Weekly Marketing Report — sent every Tuesday at 20:00 Israel time
 * Aggregates dashboard data and sends a beautiful HTML email to hilitcaspi@gmail.com
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./brevo";

const PRODUCT_PRICES: Record<string, number> = {
  database: 299, guide: 149, course: 249, session: 500, coaching: 2900, coaching_mas: 2900, bundle_tubav: 349,
};
const PRODUCT_LABELS: Record<string, string> = {
  database: "מאגר", guide: "מדריך", course: "קורס", session: "פגישה", coaching: "ליווי", coaching_mas: "ליווי מאסטר", bundle_tubav: "חבילת טו באב",
};

async function fetchMetaSpend(since: string, until: string) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return { spend: 0, campaigns: [] as any[] };
  const accountId = "act_254697595735216";
  try {
    const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=campaign_name,spend,actions&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=50&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error || !data.data) return { spend: 0, campaigns: [] };
    let totalSpend = 0;
    const campaigns = data.data.map((r: any) => {
      const spend = Number(r.spend || 0);
      totalSpend += spend;
      const actions = r.actions || [];
      const leads = Number(actions.find((a: any) => a.action_type === 'lead')?.value || 0);
      const purchases = Number(actions.find((a: any) => a.action_type === 'purchase')?.value || 0);
      return { name: r.campaign_name, spend, leads, purchases };
    });
    return { spend: totalSpend, campaigns: campaigns.filter((c: any) => c.spend > 0).sort((a: any, b: any) => b.spend - a.spend) };
  } catch { return { spend: 0, campaigns: [] }; }
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
    const [[purchaseRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${weekAgo}`) as any;
    const [revenueRows] = await db.execute(sql`SELECT product, COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${weekAgo} GROUP BY product`) as any;
    
    // Previous period KPIs (same period last week)
    const [[prevLeadRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM crm_leads WHERE createdAt >= ${twoWeeksAgo} AND createdAt < ${weekAgo}`) as any;
    const [[prevPurchaseRow]] = await db.execute(sql`SELECT COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${twoWeeksAgo} AND created_at < ${weekAgo}`) as any;
    const [prevRevenueRows] = await db.execute(sql`SELECT product, COUNT(*) as cnt FROM payment_leads WHERE created_at >= ${twoWeeksAgo} AND created_at < ${weekAgo} GROUP BY product`) as any;
    
    const leads = Number(leadRow?.cnt ?? 0);
    const purchases = Number(purchaseRow?.cnt ?? 0);
    let revenue = 0;
    const productLines: string[] = [];
    for (const row of (revenueRows as any[])) {
      const cnt = Number(row.cnt);
      const rev = cnt * (PRODUCT_PRICES[row.product] ?? 0);
      revenue += rev;
      productLines.push(`${PRODUCT_LABELS[row.product] || row.product}: ${cnt} רכישות (₪${rev.toLocaleString()})`);
    }
    
    const prevLeads = Number(prevLeadRow?.cnt ?? 0);
    const prevPurchases = Number(prevPurchaseRow?.cnt ?? 0);
    let prevRevenue = 0;
    for (const row of (prevRevenueRows as any[])) {
      prevRevenue += Number(row.cnt) * (PRODUCT_PRICES[row.product] ?? 0);
    }
    
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
    const since = new Date(weekAgo).toISOString().split("T")[0];
    const until = new Date(now).toISOString().split("T")[0];
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
      SELECT COALESCE(cl.utmSource, cl.source, 'direct') as channel, cl.utmMedium as medium, pl.product, COUNT(*) as cnt
      FROM payment_leads pl JOIN crm_leads cl ON cl.email = pl.email
      WHERE pl.created_at >= ${weekAgo} AND pl.created_at <= ${now}
      GROUP BY channel, medium, pl.product
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
      chData[ch].revenue += cnt * (PRODUCT_PRICES[r.product] ?? 0);
    }
    const channelRows = Object.entries(chData).sort((a, b) => b[1].leads - a[1].leads);
    
    const roas = meta.spend > 0 ? (revenue / meta.spend).toFixed(1) : "N/A";
    const convRate = leads > 0 ? ((purchases / leads) * 100).toFixed(1) : "0";
    
    // Top campaigns
    const topCampaigns = meta.campaigns.slice(0, 5);
    const winners = meta.campaigns.filter((c: any) => c.purchases > 0);
    const losers = meta.campaigns.filter((c: any) => c.spend > 50 && c.purchases === 0 && c.leads < 2);
    
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
          <div style="font-size: 24px; font-weight: bold; color: #db2777;">${convRate}%</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">המרה</div>
        </td>
      </tr>
    </table>
  </div>
  
  <!-- Spend & ROI -->
  <div style="padding: 0 24px 20px;">
    <div style="background: #fafafa; border-radius: 12px; padding: 16px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151;">💰 הוצאות ו-ROI</h3>
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="color: #6b7280;">הוצאה על קמפיינים:</td><td style="font-weight: bold; color: #dc2626; text-align: left;">₪${Math.round(meta.spend).toLocaleString()}</td></tr>
        <tr><td style="color: #6b7280;">הכנסות מרכישות:</td><td style="font-weight: bold; color: #16a34a; text-align: left;">₪${revenue.toLocaleString()}</td></tr>
        <tr><td style="color: #6b7280;">ROAS:</td><td style="font-weight: bold; color: ${Number(roas) >= 2 ? '#16a34a' : '#dc2626'}; text-align: left;">${roas}x</td></tr>
        <tr><td style="color: #6b7280;">רווח נקי (הכנסות - הוצאות):</td><td style="font-weight: bold; color: ${revenue - meta.spend > 0 ? '#16a34a' : '#dc2626'}; text-align: left;">₪${Math.round(revenue - meta.spend).toLocaleString()}</td></tr>
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
  
  <!-- Recommendations -->
  <div style="padding: 0 24px 24px;">
    <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">💡 המלצות</h3>
    ${winners.length > 0 ? `<div style="background: #f0fdf4; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px;"><strong style="color: #166534;">✅ להגדיל:</strong> <span style="color: #15803d;">${winners.map((c: any) => c.name.substring(0, 25)).join(', ')} — מביאים רכישות בעלות טובה</span></div>` : ''}
    ${losers.length > 0 ? `<div style="background: #fef2f2; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px;"><strong style="color: #991b1b;">⚠️ לשקול לכבות:</strong> <span style="color: #b91c1c;">${losers.map((c: any) => c.name.substring(0, 25)).join(', ')} — הוצאה ללא המרות</span></div>` : ''}
    <div style="background: #eff6ff; border-radius: 8px; padding: 10px 12px; font-size: 12px;"><strong style="color: #1e40af;">📊 סיכום:</strong> <span style="color: #1d4ed8;">${revenue > meta.spend ? `רווחי השבוע! הכנסת ₪${Math.round(revenue - meta.spend).toLocaleString()} מעבר להוצאות.` : meta.spend > 0 ? `ההוצאות גבוהות מההכנסות ב-₪${Math.round(meta.spend - revenue).toLocaleString()}. כדאי לבדוק קמפיינים לא ממירים.` : 'אין נתוני הוצאות השבוע.'}</span></div>
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
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות. הוצאה: ₪${Math.round(meta.spend).toLocaleString()}. ROAS: ${roas}x.`,
    });
    
    // Also send to Shahar Netanel
    await sendEmail({
      to: { email: "shaharnat08@gmail.com", name: "שחר נתנאל" },
      subject: `📊 דוח שבועי: ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות`,
      htmlContent: html,
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות. הוצאה: ₪${Math.round(meta.spend).toLocaleString()}. ROAS: ${roas}x.`,
    });
    
    // Also send to Netaneal (campaign manager)
    await sendEmail({
      to: { email: "netaneal@menteshdigital.com", name: "נתנאל" },
      subject: `📊 דוח שבועי: ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות`,
      htmlContent: html,
      textContent: `דוח שבועי (${dateRange}): ${leads} לידים, ${purchases} רכישות, ₪${revenue.toLocaleString()} הכנסות. הוצאה: ₪${Math.round(meta.spend).toLocaleString()}. ROAS: ${roas}x.`,
    });
    
    console.log(`[WeeklyReport] Sent: leads=${leads}, purchases=${purchases}, revenue=₪${revenue}, spend=₪${Math.round(meta.spend)}`);
    return { success: result.success, error: result.error };
  } catch (err) {
    console.error("[WeeklyReport] Error:", err);
    return { success: false, error: String(err) };
  }
}
