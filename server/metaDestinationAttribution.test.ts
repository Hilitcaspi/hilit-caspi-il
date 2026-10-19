import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildMetaDestinationUtmIndex } from './metaDestinationAttribution';
const tags = Array.from({ length: 12 }, (_, index) => `creative-${index + 1}`);
const ref = (id: string, tag: string) => ({ id, name: `מודעת דמה ${id}`, utmCampaigns: [tag] });
describe('complete Meta UTM attribution index', () => {
  it('indexes a ninth tag even when the display list stops at eight', () => {
    const index = buildMetaDestinationUtmIndex({ c1: { utmCampaigns: tags.slice(0, 8), attributionUtmCampaigns: tags, adReferences: [ref('a9', tags[8]!)] } });
    expect(index.uniqueUtmCampaigns.get('creative-9')).toBe('c1');
    expect(index.uniqueUtmAds.get('creative-9')).toEqual({ campaignId: 'c1', name: 'מודעת דמה a9' });
  });
  it('keeps historical evidence even if the display contains only active links', () => {
    const index = buildMetaDestinationUtmIndex({ c1: { utmCampaigns: ['active'], attributionUtmCampaigns: ['active', 'historical'], adReferences: [ref('old', 'historical')] } });
    expect(index.uniqueUtmCampaigns.get('historical')).toBe('c1');
  });
  it('does not infer a campaign or creative for a tag reused across campaigns', () => {
    const index = buildMetaDestinationUtmIndex({ c1: { utmCampaigns: ['shared'], adReferences: [ref('a', 'shared')] }, c2: { utmCampaigns: ['other'], attributionUtmCampaigns: ['other', 'shared'], adReferences: [ref('b', 'shared')] } });
    expect(index.uniqueUtmCampaigns.has('shared')).toBe(false);
    expect(index.uniqueUtmAds.has('shared')).toBe(false);
  });
  it('can resolve a campaign without pretending to know which reused ad was involved', () => {
    const index = buildMetaDestinationUtmIndex({ c1: { utmCampaigns: ['shared'], adReferences: [ref('a', 'shared'), ref('b', 'shared')] } });
    expect(index.uniqueUtmCampaigns.get('shared')).toBe('c1');
    expect(index.uniqueUtmAds.has('shared')).toBe(false);
  });
  it('normalizes case and ignores empty tags', () => {
    const index = buildMetaDestinationUtmIndex({ c1: { utmCampaigns: ['  Legacy_TAG ', ' '], adReferences: [] } });
    expect(Array.from(index.uniqueUtmCampaigns.keys())).toEqual(['legacy_tag']);
  });
  it('preserves the capped display list and does not add a new external request', () => {
    const source = readFileSync(new URL('./dashboardRouter.ts', import.meta.url), 'utf8');
    expect(source).toContain('utmCampaigns: Array.from(value.activeAds > 0 ? value.activeUtmCampaigns : value.utmCampaigns).filter(Boolean).slice(0, 8)');
    expect(source).toContain('attributionUtmCampaigns: Array.from(value.utmCampaigns).filter(Boolean)');
    expect(source).toContain('utmCampaigns: adUtmCampaigns');
  });
});
