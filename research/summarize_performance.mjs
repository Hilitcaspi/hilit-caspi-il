import fs from 'node:fs/promises';

const business = JSON.parse(await fs.readFile('/home/ubuntu/hilit-caspi-il/research/business_performance_raw.json', 'utf8'));
const meta = JSON.parse(await fs.readFile('/home/ubuntu/hilit-caspi-il/research/meta_performance_raw.json', 'utf8'));

const prices = { database: 299, guide: 149, course: 249, session: 500, coaching: 2900, coaching_mas: 2900, bundle_tubav: 349 };
const monthSummary = {};

for (const row of business.payments_by_month_product) {
  const m = monthSummary[row.month] ||= { purchases: 0, inferredRevenue: 0, products: {} };
  const purchases = Number(row.purchases);
  const revenue = purchases * (prices[row.product] || 0);
  m.purchases += purchases;
  m.inferredRevenue += revenue;
  m.products[row.product] = { purchases, price: prices[row.product] || 0, inferredRevenue: revenue };
}

for (const [accountId, payload] of Object.entries(meta.accounts)) {
  for (const row of payload.data || []) {
    const month = row.date_start?.slice(0, 7);
    if (!month) continue;
    const m = monthSummary[month] ||= { purchases: 0, inferredRevenue: 0, products: {} };
    m.metaSpend = (m.metaSpend || 0) + Number(row.spend || 0);
    m.metaImpressions = (m.metaImpressions || 0) + Number(row.impressions || 0);
    m.metaClicks = (m.metaClicks || 0) + Number(row.clicks || 0);
    m.metaAccounts = [...new Set([...(m.metaAccounts || []), accountId])];
  }
}

for (const row of business.leads_by_month_source) {
  const m = monthSummary[row.month] ||= { purchases: 0, inferredRevenue: 0, products: {} };
  m.leads = (m.leads || 0) + Number(row.leads);
  m.leadSources ||= {};
  m.leadSources[row.source] = Number(row.leads);
}

for (const row of business.lead_to_purchase_by_month) {
  const m = monthSummary[row.leadMonth] ||= { purchases: 0, inferredRevenue: 0, products: {} };
  m.cohortLeads = Number(row.leads);
  m.cohortConvertedEmails = Number(row.convertedEmails);
  m.cohortConversionRate = m.cohortLeads ? m.cohortConvertedEmails / m.cohortLeads : 0;
}

for (const m of Object.values(monthSummary)) {
  m.blendedLeadToPurchaseRate = m.leads ? m.purchases / m.leads : 0;
  m.inferredROAS = m.metaSpend ? m.inferredRevenue / m.metaSpend : null;
  m.inferredCAC = m.metaSpend && m.purchases ? m.metaSpend / m.purchases : null;
  m.blendedCPL = m.metaSpend && m.leads ? m.metaSpend / m.leads : null;
}

const snapshot = business.singles_snapshot[0];
const totals = Object.values(monthSummary).reduce((a, m) => {
  a.purchases += m.purchases || 0;
  a.inferredRevenue += m.inferredRevenue || 0;
  a.metaSpend += m.metaSpend || 0;
  a.leads += m.leads || 0;
  return a;
}, { purchases: 0, inferredRevenue: 0, metaSpend: 0, leads: 0 });
totals.inferredROAS = totals.metaSpend ? totals.inferredRevenue / totals.metaSpend : null;
totals.inferredCAC = totals.metaSpend && totals.purchases ? totals.metaSpend / totals.purchases : null;
totals.blendedCPL = totals.metaSpend && totals.leads ? totals.metaSpend / totals.leads : null;

const output = {
  asOf: '2026-08-22',
  basis: 'Revenue inferred from payment_leads counts multiplied by current list-price mapping in dashboardRouter.ts; discounts/refunds/payment fees/payroll/overhead are not captured.',
  monthSummary,
  totals,
  weeklyPurchases: business.payments_by_week,
  weeklyLeads: business.leads_by_week,
  singlesSnapshot: {
    total: Number(snapshot.total), active: Number(snapshot.active), paid: Number(snapshot.paid),
    activeWomen: Number(snapshot.activeWomen), activeMen: Number(snapshot.activeMen),
    scientificComplete: Number(snapshot.scientificComplete), withPhoto: Number(snapshot.withPhoto),
    womenShare: Number(snapshot.activeWomen) / Number(snapshot.active),
    scientificCompletionRate: Number(snapshot.scientificComplete) / Number(snapshot.active),
    photoCompletionRate: Number(snapshot.withPhoto) / Number(snapshot.active),
  },
};

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/business_metrics_summary.json', JSON.stringify(output, null, 2));
