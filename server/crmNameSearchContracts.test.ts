import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
const crm=readFileSync('client/src/pages/CRMMatchmaking.tsx','utf8');
const server=readFileSync('server/routers.ts','utf8');
describe('CRM name search contracts',()=>{
 it('filters the complete eligible care queue before sorting and pagination',()=>{
  const q=server.slice(server.indexOf('getSinglesWithoutMatches:'));
  expect(q).toContain('search: z.string().max(100).optional()');
  expect(q.indexOf('filterProfilesByName(singlesWithout')).toBeLessThan(q.indexOf('sortedSinglesWithout.slice('));
  expect(q).toContain('sortWaitingProfilesByWaitingFrom(nameFilteredSinglesWithout');
  expect(q).toContain('total: sortedSinglesWithout.length');
  expect(q).toContain('regularMatchingAccessSql()');
 });
 it('normalizes both target selection and candidate name filtering',()=>{
  expect(crm).toContain('filterProfilesByName(typedSingles, filterCompatSearch)');
  expect(crm).toContain('filterProfilesByName(eligibleFilterResults, filterName)');
  expect(crm).toContain('getProfileNameSuggestions(eligibleFilterResults, filterName)');
  expect(crm).toContain('isAdvancedMatchCandidate(s, advancedExclusions, filterCompatTarget');
  expect(crm).toContain('if (filterCompatResult[s.id]?.alreadySent) return false');
 });
 it('makes name suggestions explicit and manual, without changing the profile or other filters',()=>{
  expect(crm).toContain('שמות דומים לבדיקה');
  expect(crm).toContain('getProfileNameSuggestions(typedSingles, filterCompatSearch)');
  const start=crm.indexOf('data-profile-name-suggestions="candidates"');
  const end=crm.indexOf('</div>}',start);
  const block=crm.slice(start,end);
  expect(block).toContain('setFilterName(');
  for(const unsafe of ['.mutate(','setFilterGender','setFilterMinAge','sendEmail','createAndSendMatch'])expect(block).not.toContain(unsafe);
 });
 it('can expand target-name results beyond the original ten without truncating the searchable pool',()=>{
  expect(crm).toContain('filterTargetChoices.slice(0, filterTargetVisibleLimit)');
  expect(crm).toContain('setFilterTargetVisibleLimit(limit => limit + 10)');
  expect(crm).not.toContain('filterCompatSearch.toLowerCase())).slice(0, 10)');
 });
});
