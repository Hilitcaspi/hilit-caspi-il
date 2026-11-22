import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import WaitingTreatmentTabs, { WAITING_TREATMENT_TABS, waitingTreatmentTitle } from '../client/src/components/WaitingTreatmentTabs';
const crm = readFileSync(new URL('../client/src/pages/CRMMatchmaking.tsx', import.meta.url), 'utf8');
const summary = { over14: 3, fromFeedback: 2, neverDelivered: 2, missingPhoto: 1, difficulty: 1, blocked: 0 };
describe('waiting treatment sub-tabs', () => {
 it('keeps over14 first and as the page default', () => {
  expect(WAITING_TREATMENT_TABS[0].id).toBe('over14');
  expect(crm).toContain('useState<WaitingTreatmentView>("over14")');
 });
 it('provides every requested group even when the count is zero', () => {
  const html=renderToStaticMarkup(React.createElement(WaitingTreatmentTabs,{value:'over14',onChange:()=>{},summary,nonresponseCount:4}));
  expect((html.match(/<button/g)||[]).length).toBe(7);
  for(const tab of WAITING_TREATMENT_TABS) expect(html).toContain(tab.label);
  expect(html).toContain('אותו פרופיל יכול להופיע בכמה קבוצות');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('dir="rtl"');
 });
 it('gives difficulty its green selected state independently of other counts', () => {
  const html=renderToStaticMarkup(React.createElement(WaitingTreatmentTabs,{value:'difficulty',onChange:()=>{},summary}));
  expect(html).toContain('bg-emerald-700 text-white');
  expect(waitingTreatmentTitle('difficulty')).toBe('קושי במציאת התאמה');
 });
 it('passes category to the server, never filters a paged response locally', () => {
  expect(crm).toContain('category: unmatchedView === "nonresponse" ? "over14" : unmatchedView');
  expect(crm).not.toMatch(/singlesWithoutMatches\.filter/);
 });
 it('resets tab switches through the same page/search/workspace reset', () => {
  const change=crm.slice(crm.indexOf('const changeUnmatchedView ='),crm.indexOf('const changeUnmatchedSortOrder ='));
  expect(change).toContain('setUnmatchedView(view)');
  expect(change).toContain('changeUnmatchedNameSearch(unmatchedNameSearch)');
  expect(crm).toContain('<ProfileMatchingDifficultyControl profile={single} compact />');
  expect(crm).toContain('<ProfileMatchingDifficultyControl profile={profile} compact />');
 });
});
