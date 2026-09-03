import fs from 'node:fs/promises';

const startMonthlyRevenue = 120736.32; // August 1-22 run-rate annualized to 31 days
const scenarios = {
  conservative: {
    label: 'שמרני',
    monthlyGrowth: (m) => m <= 6 ? 0 : (m <= 24 ? 0.01 : 0.0075),
    description: 'אין צמיחה בחצי השנה הראשונה, לאחר מכן 1% חודשי שמתמתן ל־0.75%. ללא קפיצת LTV.',
  },
  base: {
    label: 'בסיס',
    monthlyGrowth: (m) => m <= 6 ? 0.03 : (m <= 12 ? 0.02 : (m <= 24 ? 0.015 : 0.01)),
    description: '3% חודשי בחצי השנה הראשונה, 2% בהמשך השנה, 1.5% בשנה השנייה ו־1% בשלישית.',
  },
  scale: {
    label: 'סקייל',
    monthlyGrowth: (m) => m <= 6 ? 0.07 : (m <= 12 ? 0.04 : (m <= 24 ? 0.025 : 0.015)),
    description: 'הרחבת צוות, מנוי/Plus, אפסייל שיטתי ושיפור קהילות: 7% חודשי בתחילה, מתמתן בהדרגה.',
  },
};

const result = { asOf: '2026-08-22', startMonthlyRevenue, scenarios: {}, breakEvenSensitivity: [] };

for (const [key, scenario] of Object.entries(scenarios)) {
  let monthlyRevenue = startMonthlyRevenue;
  const months = [];
  for (let month = 1; month <= 36; month++) {
    monthlyRevenue *= 1 + scenario.monthlyGrowth(month);
    months.push({ month, revenue: monthlyRevenue, annualizedRunRate: monthlyRevenue * 12 });
  }
  const sum = (from, to) => months.slice(from - 1, to).reduce((s, x) => s + x.revenue, 0);
  result.scenarios[key] = {
    label: scenario.label,
    description: scenario.description,
    year1Revenue: sum(1, 12),
    year2Revenue: sum(13, 24),
    year3Revenue: sum(25, 36),
    month12RunRate: months[11].annualizedRunRate,
    month24RunRate: months[23].annualizedRunRate,
    month36RunRate: months[35].annualizedRunRate,
    milestoneMonths: Object.fromEntries([
      ['3m_arr', 250000],
      ['6m_arr', 500000],
      ['10m_arr', 833333.33],
    ].map(([name, targetMonthlyRevenue]) => {
      const hit = months.find((x) => x.revenue >= targetMonthlyRevenue);
      return [name, hit?.month ?? null];
    })),
    breakEvenMonthsAt65Margin: Object.fromEntries([50000, 80000, 120000, 180000].map((monthlyFixedCosts) => {
      const threshold = monthlyFixedCosts / 0.65;
      const hit = months.find((x) => x.revenue >= threshold);
      return [monthlyFixedCosts, hit?.month ?? null];
    })),
    months,
  };
}

// Sensitivity only; actual fixed costs were not available.
for (const contributionMargin of [0.55, 0.65, 0.75]) {
  for (const monthlyFixedCosts of [50000, 80000, 120000, 180000]) {
    const breakEvenRevenue = monthlyFixedCosts / contributionMargin;
    result.breakEvenSensitivity.push({
      contributionMargin,
      monthlyFixedCosts,
      breakEvenRevenue,
      currentRunRateSurplusBeforeTax: startMonthlyRevenue * contributionMargin - monthlyFixedCosts,
    });
  }
}

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/forecast_model.json', JSON.stringify(result, null, 2));

const csv = ['scenario,year1_revenue,year2_revenue,year3_revenue,month12_arr,month24_arr,month36_arr'];
for (const [key, x] of Object.entries(result.scenarios)) {
  csv.push([key, x.year1Revenue, x.year2Revenue, x.year3Revenue, x.month12RunRate, x.month24RunRate, x.month36RunRate].join(','));
}
await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/forecast_summary.csv', csv.join('\n'));
