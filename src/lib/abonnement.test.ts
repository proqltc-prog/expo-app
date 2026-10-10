import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isBetalend } from '@/lib/abonnement';

const nu = new Date('2026-10-11T10:00:00Z');

describe('betalende versie (WEEK-35)', () => {
  test('lopend abonnement: betalend', () => {
    assert.equal(isBetalend([{ betalend_tot: '2026-11-11T10:00:00Z' }], nu), true);
  });

  test('verlopen, leeg of onbruikbaar: niet betalend', () => {
    assert.equal(isBetalend([{ betalend_tot: '2026-10-10T10:00:00Z' }], nu), false);
    assert.equal(isBetalend([], nu), false);
    assert.equal(isBetalend(null, nu), false);
    assert.equal(isBetalend([{ betalend_tot: 'morgen' }], nu), false);
    assert.equal(isBetalend([null, 3], nu), false);
  });
});
