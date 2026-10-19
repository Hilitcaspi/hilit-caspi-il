import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync('client/src/pages/CRMMatchmaking.tsx', 'utf8');
const section = (start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('CRM score preview identity and freshness contracts', () => {
  it('invalidates both local previews and all in-flight epochs together', () => {
    const reset = section('const invalidateScoringPreviews', 'useEffect(() => {');
    for (const token of ['scoringInputsRevision.current += 1', 'batchGeneration.current += 1', 'manualPreviewGeneration.current += 1', 'setFilterCompatResult({})', 'setCompatResult(null)']) expect(reset).toContain(token);
  });
  it('increments the manual epoch on every A/B selection, including a switch back', () => {
    for (const start of ['const selectCompatPersonA', 'const selectCompatPersonB']) {
      const select = section(start, '\n  };');
      expect(select).toContain('manualPreviewGeneration.current += 1');
      expect(select).toContain('manualPairRef.current =');
      expect(select).toContain('setCompatResult(null)');
    }
  });
  it('binds displayed manual results to the selected pair and score-input revision', () => {
    const identity = section('const isCurrentManualPreview', 'const displayedCompatResult');
    for (const check of ['identity.epoch === manualPreviewGeneration.current', 'identity.revision === scoringInputsRevision.current', 'identity.signature === scoringInputsSignature', 'result.personA?.id === compatPersonA', 'result.personB?.id === compatPersonB']) expect(identity).toContain(check);
    expect(source).toContain('compatResult={displayedCompatResult}');
    expect(source).toContain('canSendDirectly={!!displayedCompatResult}');
    expect(source).toContain('if (!isCurrentManualPreview(displayedCompatResult))');
  });
  it('refreshes data without writing scores or invoking delivery', () => {
    const refresh = section('const refreshScoringData', 'useEffect(() => {');
    expect(refresh).toContain('invalidateScoringPreviews()');
    expect(refresh).toContain('refetchSingles()');
    expect(refresh).toContain('refetchMatches()');
    for (const unsafe of ['.mutate(', 'sendEmail', 'sendSms', 'runMatching', 'refreshMatchScores']) expect(refresh).not.toContain(unsafe);
    expect(source).toContain('data-crm-refresh-scoring-data');
  });
  it('preserves accepted current advanced scores when a new batch ranks the remaining candidates', () => {
    const accepted = section('const isCurrentAdvancedPreview', 'const freshFilterCompatResult');
    expect(accepted).not.toContain('identity.generation === batchGeneration.current');
    expect(accepted).toContain('identity.revision === scoringInputsRevision.current');
    expect(accepted).toContain('identity.signature === scoringInputsSignature');
    const batch = section('const checkAllVisible', 'const baseUrl =');
    expect(batch.indexOf('if (!queue.length) return')).toBeLessThan(batch.indexOf('++batchGeneration.current'));
    expect(batch).toContain('generation !== batchGeneration.current');
    expect(batch).toContain('setFilterCompatResult(prev => ({ ...prev, ...collected }))');
  });
  it('refreshes profiles after approved profile changes but not a rejection', () => {
    expect(section('const approveUpdateMutation', 'const rejectUpdateMutation')).toContain('refreshScoringData()');
    expect(section('const rejectUpdateMutation', '// Compatibility check mutation')).not.toContain('refreshScoringData()');
    expect(source).toContain('observedScoringInputsSignature.current === scoringInputsSignature');
  });
});
