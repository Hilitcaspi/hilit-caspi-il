import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Single } from '../drizzle/schema';
import { computeFullScore, computeFullScoreAdmin } from './compatibility';
import { evaluateMatchPreview, previewScoreDimensions } from './matchScorePreview';
import { presentMatchScore, loadMatchScoreInputs } from './pendingMatchScore';
import { scoreAdvancedPair } from './advancedMatchRanking';

const person = (id: number, extra: Partial<Single> = {}): Single => ({
  id, gender: id === 1 ? 'female' : 'male', seekingGender: id === 1 ? 'male' : 'female',
  age: 30, city: 'חיפה', education: 'bachelor', religiosity: 'secular', dnaType: 'anchor',
  wantsKids: 'yes', hasKids: false, locationPreference: 'close', height: id === 1 ? 165 : 180,
  ...extra,
} as Single);
const candidate = (extra: any = {}) => ({ status: 'pending', score: 83, scoreBreakdown: JSON.stringify({ total: 83, algorithm: 'v8.0' }), ...extra });
const numeric = (b: ReturnType<typeof computeFullScoreAdmin>) => ({
  total: b.total, questionnaire: b.questionnaire, lifeStage: b.lifeStage, dna: b.dna,
  practical: b.practical, religiosity: b.religiosity, education: b.education,
  interactionBonus: b.interactionBonus, cityIntelligence: b.cityIntelligence,
});

describe('staff score consistency', () => {
  it('uses one preview contract for pending, fast ranking and pair check, in either direction', () => {
    const a = person(1), b = person(2);
    const answersA = [{ qId: 'q_conflict_style', myAnswer: 0, importance: 2 as const }];
    const answersB = [{ qId: 'q_conflict_style', myAnswer: 1, importance: 0 as const }];
    const preview = evaluateMatchPreview(a, b, answersA, answersB);
    const pending = presentMatchScore(candidate(), a, b, answersA, answersB);
    const fast = scoreAdvancedPair(b, a, answersB, answersA);
    expect(pending.score).toBe(preview.score); expect(fast.score).toBe(preview.score);
    const bd = JSON.parse(pending.scoreBreakdown!);
    expect(bd.total).toBe(pending.score); expect(bd).toEqual(preview.breakdown);
    expect(fast.breakdown).toEqual(previewScoreDimensions(preview));
    expect(pending.scoreWarnings).toEqual(preview.warnings);
  });
  it('eliminates the A/B timing-bonus bug for ages either side of 42', () => {
    const a = person(1, { age: 41 }), b = person(2, { age: 44 });
    const ab = computeFullScoreAdmin(a, b, [], []), ba = computeFullScoreAdmin(b, a, [], []);
    expect(ab.interactionBonus).toBe(ba.interactionBonus); expect(ab.total).toBe(ba.total);
    expect(ab.details).toContain('שניהם רוצים ילדים ובגיל הנכון, תזמון מושלם');
  });
  it('scores all numeric dimensions symmetrically across 2,304 gender and age pairs', () => {
    for (const ga of ['female', 'male', 'other'] as const) for (const gb of ['female', 'male', 'other'] as const) {
      for (let ageA = 38; ageA <= 53; ageA++) for (let ageB = 38; ageB <= 53; ageB++) {
        const a = person(1, { gender: ga, age: ageA }), b = person(2, { gender: gb, age: ageB });
        expect(numeric(computeFullScoreAdmin(a, b, [], []))).toEqual(numeric(computeFullScoreAdmin(b, a, [], [])));
      }
    }
  });
  it('never changes the weights or lets an admin preview clear a strict blocker', () => {
    const a = person(1, { minAgePreference: 35 }), b = person(2, { age: 30 });
    const out = presentMatchScore(candidate(), a, b);
    expect(out.hasHardBlock).toBe(true); expect(out.canOverrideCriteria).toBe(true);
    expect(out.scoreWarnings.length).toBeGreaterThan(0); expect(out.score).toBeGreaterThan(0);
    expect(computeFullScore(a, b, [], []).total).toBe(0);
    const sameGender = presentMatchScore(candidate(), a, person(2, { gender: 'female' }));
    expect(sameGender.hasHardBlock).toBe(true); expect(sameGender.canOverrideCriteria).toBe(false);
  });
  it('preserves saved score and breakdown without mutating an unsent candidate', () => {
    const row = candidate({ proposedAt: Date.now() }); const before = JSON.stringify(row);
    const out = presentMatchScore(row, person(1), person(2));
    expect(out.scoreSource).toBe('current_preview'); expect(out.savedScore).toBe(83);
    expect(out).not.toHaveProperty('savedScoreBreakdown'); expect(JSON.stringify(row)).toBe(before);
  });
  it.each([
    { status: 'proposed', ownerApprovedAt: 1 }, { status: 'matched' },
    { status: 'rejected', approvalTokenA: 'synthetic-token' }, { status: 'pending', approvalTokenB: 'synthetic-token' },
    { status: 'pending', notes: 'נשלחה בעבר' }, { status: 'expired' },
  ])('does not replace a sent or closed snapshot: %j', state => {
    const row = candidate(state), out = presentMatchScore(row, person(1), person(2));
    expect(out.scoreSource).toBe('saved_snapshot'); expect(out.score).toBe(83);
    expect(out.scoreBreakdown).toBe(row.scoreBreakdown);
  });
  it('does not present a misleading old score as current when a profile is missing', () => {
    const out = presentMatchScore(candidate(), undefined, person(2));
    expect(out.scoreSource).toBe('unavailable'); expect(out.score).toBeNull();
    expect(out.savedScore).toBe(83); expect(out.canOverrideCriteria).toBe(false);
  });
  it('loads complete profiles and questionnaire rows in only two bulk reads', async () => {
    const a = person(1, { minHeightPreference: 170, religiosityPreference: 'traditional' });
    const rows: unknown[][] = [[a, person(2)], [{ singleId: 1, answersJson: '[]' }]];
    const select = vi.fn(() => ({ from: () => ({ where: async () => rows.shift() }) }));
    const out = await loadMatchScoreInputs({ select } as any, [1, 2]);
    expect(select).toHaveBeenCalledTimes(2); expect(out.people.get(1)?.minHeightPreference).toBe(170);
    expect(out.people.get(1)?.religiosityPreference).toBe('traditional'); expect(out.answers.get(1)).toEqual([]);
  });
  it('does not silently substitute no answers for malformed stored data', async () => {
    const rows: unknown[][] = [[person(1)], [{ singleId: 1, answersJson: '{}' }]];
    const select = vi.fn(() => ({ from: () => ({ where: async () => rows.shift() }) }));
    await expect(loadMatchScoreInputs({ select } as any, [1])).rejects.toThrow('Invalid questionnaire answer data');
  });
  it('wires both pending read APIs and pair check to the same helper, without write or send paths', () => {
    const router = readFileSync(new URL('./routers.ts', import.meta.url), 'utf8');
    for (const name of ['getPendingMatches: teamProcedure', 'listPendingMatches: teamProcedure']) {
      const block = router.split(name)[1].split('\n    }),')[0];
      expect(block).toContain('loadMatchScoreInputs'); expect(block).toContain('presentMatchScore');
      expect(block).not.toMatch(/\.insert\(|\.update\(|sendEmail|sendSms|buildMatchExplanation/);
    }
    const check = router.split('checkCompatibility: teamProcedure')[1].split('\n    }),')[0];
    expect(check).toContain('evaluateMatchPreview'); expect(check).toContain('previewScoreDimensions');
    const ui = readFileSync(new URL('../client/src/pages/CRMMatchmaking.tsx', import.meta.url), 'utf8');
    expect(ui).toContain('ציון עדכני'); expect(ui).toContain('הציון שנשמר ביצירת המועמד');
    expect(ui).toContain('נדרשת בדיקת העדפות — הציון אינו אישור לשליחה');
    const module = readFileSync(new URL('./pendingMatchScore.ts', import.meta.url), 'utf8');
    expect(module).not.toMatch(/\.insert\(|\.update\(|sendEmail|sendSms|fetch\(/);
  });
});
