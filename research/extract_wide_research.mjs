import fs from 'node:fs/promises';

const raw = JSON.parse(await fs.readFile('/home/ubuntu/hilit-caspi-il/research/wide_research_results.json', 'utf8'));
const sections = ['# תמצית שמונת זרמי המחקר המקבילים\n'];

for (const [index, item] of raw.results.entries()) {
  const o = item.output || {};
  sections.push(`## ${index + 1}. ${o.research_stream || item.input}\n`);
  sections.push(`### ממצאים\n${o.executive_findings || ''}\n`);
  sections.push(`### נתונים כמותיים\n${o.quantitative_data || ''}\n`);
  sections.push(`### דוגמאות ומתחרים\n${o.competitor_examples || ''}\n`);
  sections.push(`### השלכות אסטרטגיות\n${o.strategic_implications || ''}\n`);
  sections.push(`### מקורות\n${o.sources || ''}\n`);
  sections.push(`### ביטחון\n${o.confidence || ''}\n`);
}

await fs.writeFile('/home/ubuntu/hilit-caspi-il/research/wide_research_digest.md', sections.join('\n'));
