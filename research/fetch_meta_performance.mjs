import fs from 'node:fs/promises';

const token = process.env.META_ADS_TOKEN;
if (!token) throw new Error('META_ADS_TOKEN is missing');

const accounts = ['act_254697595735216', 'act_3841144459522772'];
const since = '2026-04-01';
const until = '2026-08-22';
const fields = 'account_id,account_name,campaign_id,campaign_name,spend,impressions,reach,clicks,actions,action_values';
const result = { asOf: '2026-08-22', since, until, accounts: {} };

for (const accountId of accounts) {
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since, until }),
    time_increment: 'monthly',
    level: 'campaign',
    limit: '500',
    access_token: token,
  });
  const url = `https://graph.facebook.com/v25.0/${accountId}/insights?${params.toString()}`;
  const res = await fetch(url);
  result.accounts[accountId] = await res.json();
}

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/meta_performance_raw.json', JSON.stringify(result, null, 2));
