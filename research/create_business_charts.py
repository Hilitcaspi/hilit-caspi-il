import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

PROJECT = Path('/home/ubuntu/hilit-caspi-il/research')
OUT = Path('/home/ubuntu/business-report-assets')
OUT.mkdir(parents=True, exist_ok=True)

with open(PROJECT / 'business_metrics_summary.json', encoding='utf-8') as f:
    metrics = json.load(f)
with open(PROJECT / 'forecast_model.json', encoding='utf-8') as f:
    forecast = json.load(f)
with open(PROJECT / 'unit_economics_raw.json', encoding='utf-8') as f:
    unit = json.load(f)

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'axes.titlesize': 18,
    'axes.labelsize': 11,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
})

navy = '#1f1a68'
gold = '#e7b649'
green = '#20a66a'
red = '#d45c5c'
purple = '#7b61a8'

# 1. Actual revenue and Meta spend
months = ['Apr', 'May', 'Jun', 'Jul', 'Aug*']
keys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08']
revenue = [metrics['monthSummary'][k]['inferredRevenue'] for k in keys]
spend = [metrics['monthSummary'][k]['metaSpend'] for k in keys]

fig, ax = plt.subplots(figsize=(12, 6.8))
x = np.arange(len(months))
bars = ax.bar(x - 0.18, revenue, width=0.36, color=navy, label='Inferred revenue')
ax.bar(x + 0.18, spend, width=0.36, color=gold, label='Meta spend')
ax.set_xticks(x, months)
ax.set_ylabel('NIS')
ax.set_title('Revenue Traction vs. Meta Spend (Apr–Aug 2026)')
ax.legend(frameon=False, loc='upper left')
ax.spines[['top', 'right']].set_visible(False)
for b in bars:
    if b.get_height() > 0:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 2500, f"₪{b.get_height()/1000:.0f}k", ha='center', color=navy, fontweight='bold')
ax.text(0.99, -0.13, '* August includes days 1–22', transform=ax.transAxes, ha='right', color='#666')
fig.tight_layout()
fig.savefig(OUT / 'actual_revenue_vs_spend.png', dpi=180, bbox_inches='tight')
plt.close(fig)

# 2. Forecast scenarios
fig, ax = plt.subplots(figsize=(12, 6.8))
colors = {'conservative': '#708090', 'base': navy, 'scale': green}
for key in ['conservative', 'base', 'scale']:
    scenario = forecast['scenarios'][key]
    months_x = [m['month'] for m in scenario['months']]
    monthly_rev = [m['revenue'] for m in scenario['months']]
    ax.plot(months_x, monthly_rev, linewidth=3, color=colors[key], label=scenario['label'])
ax.axhline(250000, color=gold, linestyle='--', linewidth=1.7, label='₪3M annual run-rate')
ax.axhline(500000, color=purple, linestyle=':', linewidth=1.7, label='₪6M annual run-rate')
ax.set_title('36-Month Revenue Scenarios')
ax.set_xlabel('Month from Sep 2026')
ax.set_ylabel('Monthly revenue (NIS)')
ax.set_xlim(1, 36)
ax.set_ylim(0, 540000)
ax.spines[['top', 'right']].set_visible(False)
ax.legend(frameon=False, ncol=2, loc='upper left')
fig.tight_layout()
fig.savefig(OUT / 'forecast_scenarios.png', dpi=180, bbox_inches='tight')
plt.close(fig)

# 3. Product/customer mix and conversion bottleneck
labels = ['Database', 'Tu B’Av bundle', 'Sessions', 'Guide', 'Course', 'Coaching']
values = [
    unit['productCustomerCounts'].get('database', 0),
    unit['productCustomerCounts'].get('bundle_tubav', 0),
    unit['productCustomerCounts'].get('session', 0),
    unit['productCustomerCounts'].get('guide', 0),
    unit['productCustomerCounts'].get('course', 0),
    unit['productCustomerCounts'].get('coaching', 0),
]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 6.8), gridspec_kw={'width_ratios': [1.05, 1]})
ax1.barh(labels[::-1], values[::-1], color=[navy, gold, green, purple, '#d790b8', red][::-1])
ax1.set_title('Customers by Product')
ax1.set_xlabel('Unique customers')
ax1.spines[['top', 'right', 'left']].set_visible(False)
for i, v in enumerate(values[::-1]):
    ax1.text(v + 5, i, str(v), va='center', fontweight='bold')

funnel_labels = ['Match records', 'At least one email open', 'Double approval', 'Matched status']
funnel_values = [4496, 1462, 142, 53]
ax2.barh(funnel_labels[::-1], funnel_values[::-1], color=[navy, gold, green, red][::-1])
ax2.set_title('Current Match Funnel')
ax2.set_xlabel('Records')
ax2.spines[['top', 'right', 'left']].set_visible(False)
for i, v in enumerate(funnel_values[::-1]):
    ax2.text(v + 45, i, f'{v:,}', va='center', fontweight='bold')
fig.suptitle('Where Growth Is Concentrated — and Where It Leaks', fontsize=19, fontweight='bold', color=navy)
fig.tight_layout(rect=[0, 0, 1, 0.94])
fig.savefig(OUT / 'product_and_match_funnel.png', dpi=180, bbox_inches='tight')
plt.close(fig)

print(OUT)
