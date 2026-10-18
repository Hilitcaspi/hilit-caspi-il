import {describe,it,expect} from 'vitest';
import {filterProfilesByName,getProfileNameSuggestions,matchesProfileName,normalizeProfileName} from '../shared/profileNameSearch';
const name={firstName:'דוגמה',lastName:'בדיקה'};
describe('profile name search',()=>{
 it('normalizes extra spaces, case, direction markers and Hebrew niqqud',()=>{
  expect(matchesProfileName({firstName:'דּוּגְמָה',lastName:'בְּדִיקָה'},'  דוגמה  בדיקה ')).toBe(true);
  expect(matchesProfileName({firstName:' Demo\u200f ',lastName:'  Person '},'person DEMO')).toBe(true);
  expect(normalizeProfileName('א\u200fב  ג')).toBe('אב ג');
 });
 it('requires all tokens but supports partial or reverse-order names',()=>{
  expect(matchesProfileName(name,'בדיק דוגמ')).toBe(true);
  expect(matchesProfileName(name,'דוגמה אחרת')).toBe(false);
  expect(matchesProfileName(name,'   ')).toBe(true);
 });
 it('handles absent surnames without matching undefined text',()=>{
  expect(matchesProfileName({firstName:'דוגמה',lastName:null},'דוגמה')).toBe(true);
  expect(matchesProfileName({firstName:'דוגמה',lastName:null},'undefined')).toBe(false);
 });
 it('filters before paging and preserves the original waiting-priority order',()=>{
  const profiles=Array.from({length:95},(_,i)=>({id:i,firstName:'פרופיל',lastName:i>70?'יעד':'אחר'}));
  const result=filterProfilesByName(profiles,'יעד');
  expect(result).toHaveLength(24);expect(result.slice(0,10).map(x=>x.id)).toEqual([71,72,73,74,75,76,77,78,79,80]);
  expect(profiles).toHaveLength(95);
 });
 it('does not silently accept a spelling difference as the same profile',()=>{
  const p={firstName:'דוגמה',lastName:'בדיקה'};
  expect(matchesProfileName(p,'דוגמה נדיקה')).toBe(false);
  expect(getProfileNameSuggestions([p],'דוגמה נדיקה')).toEqual([p]);
 });
 it('only suggests one insertion/deletion/replacement with a full-enough name',()=>{
  expect(getProfileNameSuggestions([name],'דוגמה בדיק')).toEqual([]); // exact partial-name match, not a suggestion
  expect(getProfileNameSuggestions([name],'דוגמה בדריקה')).toEqual([name]);
  expect(getProfileNameSuggestions([name],'דוגמה בדקה')).toEqual([name]);
  expect(getProfileNameSuggestions([name],'דוגמה נדיקה')).toEqual([name]);
  expect(getProfileNameSuggestions([name],'דוגמה אחרת')).toEqual([]);
  expect(getProfileNameSuggestions([name],'דו')).toEqual([]);
 });
 it('preserves stored data and caps suggestions',()=>{
  const source=Array.from({length:20},()=>({...name}));const original=JSON.stringify(source);
  expect(getProfileNameSuggestions(source,'דוגמה נדיקה',5)).toHaveLength(5);
  expect(JSON.stringify(source)).toBe(original);
 });
});
