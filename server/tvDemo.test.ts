import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESULTS, TYPE_ORDER, scoreDna } from '../client/src/tv-demo/model';

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
});
