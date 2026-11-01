import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const landing = read('client/src/pages/NovemberLoveBundle.tsx');
const wallet = read('client/src/components/GrowWallet.tsx');

describe('November checkout visibility and unchanged payment safety', () => {
  it('targets the payment form rather than centering a tall marketing section', () => {
    expect(landing).toContain('checkoutFormRef.current ?? checkoutRef.current');
    expect(landing).toContain('block: "start"');
    expect(landing).not.toContain('block: "center"');
    expect(landing).toContain('focus({ preventScroll: true })');
  });

  it('makes the form immediately visible without animation opacity gates', () => {
    expect(landing).toMatch(/<div\s+ref=\{checkoutFormRef\}/);
    expect(landing).toContain('data-testid="november-checkout-form"');
    expect(landing).toContain('scroll-mt-6');
  });

  it('keeps identity details visible only when explicitly requested', () => {
    expect(landing).toContain('keepDetailsVisible');
    expect(wallet).toContain('keepDetailsVisible = false');
    expect(wallet).toContain('(keepDetailsVisible || !hasAllDetails)');
  });

  it('preserves the bundle, confirmations, process owner and unknown-outcome guards', () => {
    expect(landing).toContain('product={NOVEMBER_BUNDLE_PRODUCT}');
    expect(landing).toContain('termsPath="/terms/november-love"');
    expect(wallet).toContain('!ageConfirmed');
    expect(wallet).toContain('!termsAccepted');
    expect(wallet).toContain('acquireCheckoutOwner(attempt.attemptId, instanceId)');
    expect(wallet).toContain('checkoutAttemptId: attempt.attemptId');
    expect(wallet).toContain('paymentStatusAmbiguous');
  });
});
