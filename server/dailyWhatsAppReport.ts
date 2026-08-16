/**
 * Daily WhatsApp Report
 * Sends a daily summary at 21:00 Israel time to Hilit's personal WhatsApp (0544530975)
 * Includes: leads today, purchases today, conversion rate, revenue, comparison to yesterday
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendWhatsApp } from "./joni";

const REPORT_PHONE = "0544530975";

export async function sendDailyWhatsAppReport(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const israelTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayStr = israelTime.toISOString().split("T")[0];
  
  // Today's start/end in ms
  const todayStart = new Date(todayStr + "T00:00:00+03:00").getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  // Today's leads
  const [todayLeadsRows] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN source = 'dna_quiz' THEN 1 ELSE 0 END) as campaign
    FROM crm_leads WHERE createdAt >= ${todayStart} AND createdAt < ${todayEnd}
  `)) as any;
  const todayLeads = { total: Number(todayLeadsRows[0]?.total || 0), campaign: Number(todayLeadsRows[0]?.campaign || 0) };

  // Yesterday's leads
  const [yLeadsRows] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN source = 'dna_quiz' THEN 1 ELSE 0 END) as campaign
    FROM crm_leads WHERE createdAt >= ${yesterdayStart} AND createdAt < ${todayStart}
  `)) as any;
  const yLeads = { total: Number(yLeadsRows[0]?.total || 0), campaign: Number(yLeadsRows[0]?.campaign || 0) };

  // Today's purchases
  const [todayPurchRows] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN product = 'database' THEN 1 ELSE 0 END) as database_p
    FROM payment_leads WHERE created_at >= ${todayStart} AND created_at < ${todayEnd}
  `)) as any;
  const todayPurch = { total: Number(todayPurchRows[0]?.total || 0), database: Number(todayPurchRows[0]?.database_p || 0) };

  // Yesterday's purchases
  const [yPurchRows] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN product = 'database' THEN 1 ELSE 0 END) as database_p
    FROM payment_leads WHERE created_at >= ${yesterdayStart} AND created_at < ${todayStart}
  `)) as any;
  const yPurch = { total: Number(yPurchRows[0]?.total || 0), database: Number(yPurchRows[0]?.database_p || 0) };

  // Revenue
  const todayRevenue = todayPurch.database * 299 + (todayPurch.total - todayPurch.database) * 200;
  const yRevenue = yPurch.database * 299 + (yPurch.total - yPurch.database) * 200;

  // Conversion rate
  const todayConv = todayLeads.campaign > 0 ? ((todayPurch.database / todayLeads.campaign) * 100).toFixed(1) : "0";
  const yConv = yLeads.campaign > 0 ? ((yPurch.database / yLeads.campaign) * 100).toFixed(1) : "0";

  // Change indicators
  const arrow = (today: number, yesterday: number) => {
    if (today > yesterday) return `⬆️ +${today - yesterday}`;
    if (today < yesterday) return `⬇️ ${today - yesterday}`;
    return "➡️ ללא שינוי";
  };

  // Alert if conversion drops below 8% or rises above 20%
  let alert = "";
  const convNum = parseFloat(todayConv);
  if (convNum < 8 && todayLeads.campaign >= 20) {
    alert = "\n\n⚠️ *התראה:* המרה נמוכה מ-8% היום! כדאי לבדוק את הקמפיינים.";
  } else if (convNum > 20) {
    alert = "\n\n🎉 *מצוין!* המרה מעל 20% היום!";
  }

  const message = `📊 *דוח יומי — ${todayStr}*

*לידים:* ${todayLeads.campaign} מקמפיין (${todayLeads.total} כולל)
${arrow(todayLeads.campaign, yLeads.campaign)} לעומת אתמול (${yLeads.campaign})

*רכישות מאגר:* ${todayPurch.database}
${arrow(todayPurch.database, yPurch.database)} לעומת אתמול (${yPurch.database})

*המרה:* ${todayConv}% (אתמול: ${yConv}%)

*הכנסות:* ₪${todayRevenue.toLocaleString()} (אתמול: ₪${yRevenue.toLocaleString()})${alert}`;

  await sendWhatsApp(REPORT_PHONE, message);
  console.log(`[DailyWA] Report sent to ${REPORT_PHONE}`);
}
