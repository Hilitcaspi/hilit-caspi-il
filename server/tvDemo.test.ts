import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESULTS, TYPE_ORDER, scoreDna, selectDemoQuestions } from '../client/src/tv-demo/model';
import followup from '../client/src/tv-demo/followup.json';
import { RESULT_DETAILS, scorePercent, fixtureAnswers } from '../client/src/tv-demo/resultDetails';

describe('isolated television demo', () => {
  for (const [i,type] of (['leader','romantic','free_spirit','anchor'] as const).entries()) {
    it(`scores ${type} from answers, not an arbitrary predetermined result`, () => {
      const answers=Array.from({length:20},(_,n)=>Math.floor(n/5)===i?5:1);
      expect(scoreDna(answers).type).toBe(type);
      expect(scoreDna(answers).scores[type]).toBe(25);
    });
  }
  it('requires complete, valid answers', () => {
    expect(()=>scoreDna([5])).toThrow();
    expect(()=>scoreDna(Array(20).fill(6))).toThrow();
    expect(()=>scoreDna(Array(20).fill(2.4))).toThrow();
  });
  it('uses a reflection choice among tied types', () => {
    expect(scoreDna(Array(20).fill(3)).top).toHaveLength(4);
    expect(scoreDna(Array(20).fill(3),'free_spirit').type).toBe('free_spirit');
    expect(scoreDna([...Array(5).fill(5),...Array(15).fill(1)],'anchor').type).toBe('leader');
  });
  it('keeps all fixture results available',()=>{
    for(const t of TYPE_ORDER){expect(RESULTS[t].label).toBeTruthy();expect(RESULTS[t].count).toBeGreaterThan(1000);expect(RESULTS[t].candidateDna).toHaveLength(3);}
  });
  it('has a separate noindex entry without production app or analytics',()=>{
    const html=readFileSync('client/tv-demo.html','utf8');
    expect(html).toContain('noindex,nofollow,noarchive');
    expect(html).toContain('/src/tv-demo/main.tsx');
    expect(html).not.toMatch(/umami|gtag|fbq|src\/main\.tsx/);
  });
  it('contains no production API or storage of user answers',()=>{
    const code=readFileSync('client/src/tv-demo/main.tsx','utf8');
    expect(code).not.toMatch(/trpc|fetch\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest|createLead|trackLead|\.mutate/);
    expect(code).toContain('מספר בדיוני להמחשה בלבד');
    expect(code).toContain('אין כאן נשים אמיתיות שממתינות לך');
    expect(code).toContain('דמות AI בדיונית');
  });
  it('offers a clearly separate short sequence with pets',()=>{
    const items=selectDemoQuestions(followup,{age:'40',marital:'single',kids:'no'},true);
    expect(items).toHaveLength(6);
    expect(items.map(x=>x.id)).toContain('q_pets');
    expect(items.map(x=>x.id)).toContain('q_commitment');
  });
  it('filters child and marriage plans for divorced parents but keeps chapter-two questions',()=>{
    const ids=selectDemoQuestions(followup,{age:'45',marital:'divorced',kids:'yes'},false).map(x=>x.id);
    for(const id of ['q_kids_future','q_kids_flexibility','q_marriage'])expect(ids).not.toContain(id);
    for(const id of ['q_step_parent','q_kids_involvement','q_relationship_pace','q_pets'])expect(ids).toContain(id);
  });
  it('respects conditional age and parent-only topics',()=>{
    const ids=selectDemoQuestions(followup,{age:'30',marital:'single',kids:'no'},false).map(x=>x.id);
    expect(ids).not.toContain('q_kids_flexibility');
    expect(ids).not.toContain('q_kids_involvement');
  });
  it('retains original colors and same-sex preference choices in the isolated demo',()=>{
    const css=readFileSync('client/src/tv-demo/style.css','utf8');
    expect(css).toContain('background:#191265');
    expect(css).toContain('background:#ffde59');
    const code=readFileSync('client/src/tv-demo/main.tsx','utf8');
    expect(code).toContain('מעוניין להכיר נשים');
    expect(code).toContain('מעוניין להכיר גברים');
    expect(code).toContain('בתרחיש ההדגמה בלבד');
    expect(code).toContain('גרסה מקוצרת לצורכי המחשה');
  });
  it('keeps an explicitly timed single-choice flash rather than styling old answers',()=>{
    const code=readFileSync('client/src/tv-demo/main.tsx','utf8');
    expect(code).toContain('if(selectionLocked.current)return');
    expect(code).toContain('},280)');
    expect(code).toContain("className={selectedValue===n?'selected':''}");
    expect(code).not.toContain("className={answers[idx]===n?'selected':''}");
    expect(code).toContain('clearTimeout(transitionTimer.current)');
  });
  it('retains fictional-count disclosure after removing example from the count headline',()=>{
    const code=readFileSync('client/src/tv-demo/main.tsx','utf8');
    expect(code).toContain('נשים המתאימות לפרופיל שלך');
    expect(code).not.toContain('נשים המתאימות לפרופיל הדוגמה');
    expect(code).toContain('מספר בדיוני להמחשה בלבד');
  });
  it('renders every original result topic using the same four type ids and labels',()=>{
    const original=readFileSync('client/src/pages/DnaQuiz.tsx','utf8');
    for(const t of TYPE_ORDER){
      expect(original).toContain(RESULTS[t].label);
      expect(original).toContain(RESULT_DETAILS[t].subtitle);
      for(const key of ['superpower','challenge','relationshipNeed','practice','reflection'] as const)expect(RESULT_DETAILS[t][key].length).toBeGreaterThan(20);
      expect(RESULT_DETAILS[t].partnerQualities).toHaveLength(4);
    }
  });
  it('uses scores out of 25 per type, not a compatibility percentage',()=>{
    expect(scorePercent(10)).toBe(40);
    expect(scorePercent(25)).toBe(100);
    expect(scorePercent(-1)).toBe(0);
    expect(scorePercent(30)).toBe(100);
    for(const t of TYPE_ORDER){const result=scoreDna(fixtureAnswers(t));expect(result.type).toBe(t);expect(result.scores[t]).toBe(25);}
    expect(readFileSync('client/src/tv-demo/main.tsx','utf8')).toContain('זה לא אחוז התאמה לאדם אחר');
  });
});
