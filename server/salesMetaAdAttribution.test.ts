import { describe, expect, it } from 'vitest';
import { resolveAttribution } from './salesIntelligence';

const context = {
  status: 'available' as const,
  campaigns: new Map([
    ['campaign-men', {id:'campaign-men',name:'קמפיין גברים',spend:95,purchases:1}],
    ['campaign-cold', {id:'campaign-cold',name:'קמפיין קהל קר',spend:75,purchases:1}],
  ]),
  uniqueUtmCampaigns: new Map([['shabek_men_ad4','campaign-men']]),
  activeCampaignIds: new Set(['campaign-men','campaign-cold']),
  adReferences: new Map([
    ['ad-men', {campaignId:'campaign-men',name:'שדכנית מודעה 4'}],
    ['ad-coffee', {campaignId:'campaign-cold',name:'קפה מודעה 1'}],
  ]),
  uniqueUtmAds: new Map([['shabek_men_ad4', {campaignId:'campaign-men',name:'שדכנית מודעה 4'}]]),
};
const source = (overrides = {}) => ({
  channelSource:'fb',medium:'SHABEK_men',campaignRaw:'SHABEK_men_ad4',creative:'ad-men',
  confidence:'UTM שמור',at:null,metaCampaignId:null,mapping:'מקור שמור',...overrides,
});
describe('exact Meta ad source evidence', () => {
  it('resolves legacy men tags and displays the real ad name', () => {
    expect(resolveAttribution(source(),context)).toMatchObject({channel:'Meta Ads (ממומן)',campaign:'קמפיין גברים',creative:'שדכנית מודעה 4',mapping:'מזהה מודעת Meta תואם'});
  });
  it('disambiguates shared facebook_shabek using exact stored ad content', () => {
    expect(resolveAttribution(source({channelSource:'ig',medium:'facebook_shabek',campaignRaw:'facebook_shabek',creative:'ad-coffee'}),context)).toMatchObject({channel:'Meta Ads (ממומן)',campaign:'קמפיין קהל קר',creative:'קפה מודעה 1'});
  });
  it('does not infer a specific campaign from a shared tag without an ad match', () => {
    const result=resolveAttribution(source({channelSource:'ig',medium:'facebook_shabek',campaignRaw:'facebook_shabek',creative:'not-mapped'}),context);
    expect(result.metaCampaignId).toBeNull();
    expect(result.channel).toBe('Instagram (אורגני/לא ידוע)');
  });
  it('allows exact unique creative UTM evidence without a stored ad identifier', () => {
    expect(resolveAttribution(source({creative:''}),context).campaign).toBe('קמפיין גברים');
  });
  it('returns the matched ad name and marks UTM matching without claiming a measured click', () => {
    expect(resolveAttribution(source({channelSource:'ig',creative:''}),context)).toMatchObject({channel:'Meta Ads (ממומן)',creative:'שדכנית מודעה 4',confidence:'UTM שמור; תיוג מודעה ייחודי תואם'});
  });
  it.each(['', 'instagram.com', 'l.instagram.com', 'direct', 'dna_quiz'])('can resolve a unique documented tag from source %s', channelSource => {
    expect(resolveAttribution(source({channelSource,creative:''}),context).metaCampaignId).toBe('campaign-men');
  });
  it.each([
    {channelSource:'email',medium:'email',expected:'Email'},
    {channelSource:'',medium:'email',expected:'Email'},
    {channelSource:'whatsapp',medium:'message',expected:'WhatsApp'},
    {channelSource:'sms',medium:'sms',expected:'SMS'},
    {channelSource:'',medium:'sms',expected:'SMS'},
    {channelSource:'site_upsell',medium:'onsite',expected:'הצעה באתר'},
    {channelSource:'',medium:'onsite',expected:'הצעה באתר'},
    {channelSource:'personal_area',medium:'onsite',expected:'הצעה באתר'},
    {channelSource:'subscription',medium:'',expected:'חידוש'},
    {channelSource:'google',medium:'cpc',expected:'Google Ads'},
  ])('never reassigns explicit $expected from a reused Meta tag or campaign ID', ({expected,...overrides}) => {
    expect(resolveAttribution(source({...overrides,metaCampaignId:'campaign-men'}),context).channel).toBe(expected);
  });
  it('never overwrites an email close with a reused Meta tag or ad reference', () => {
    expect(resolveAttribution(source({channelSource:'email',medium:'email'}),context).channel).toBe('Email');
  });
  it('does not turn WhatsApp into paid traffic using a reused tag', () => {
    expect(resolveAttribution(source({channelSource:'whatsapp',medium:'message'}),context).channel).toBe('WhatsApp');
  });
  it('keeps an untagged Instagram story organic or unknown', () => {
    expect(resolveAttribution(source({channelSource:'ig',medium:'story',campaignRaw:'live-story',creative:''}),context).channel).toBe('Instagram (אורגני/לא ידוע)');
  });
  it('does not change source when Meta references are unavailable', () => {
    expect(resolveAttribution(source(),{...context,campaigns:new Map(),uniqueUtmCampaigns:new Map(),adReferences:new Map()}).metaCampaignId).toBeNull();
  });
});
