import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BELONING_AI_VRAAG, BELONING_SCANS, beloningVoor } from '@/lib/beloning';
import { GRATIS_SCANS_PER_DAG, resterendeScans, telScan, voegBonusToe, type ScanTeller } from '@/lib/scanteller';

describe('beloning reclamefilmpje (WEEK-38, WEEK-311)', () => {
  test('een filmpje geeft 1 extra AI-vraag of 5 extra scans', () => {
    assert.equal(BELONING_AI_VRAAG, 1);
    assert.equal(BELONING_SCANS, 5);
    assert.equal(beloningVoor('ai'), 1);
    assert.equal(beloningVoor('scans'), 5);
  });

  test('WEEK-311: het filmpje geeft evenveel scans als de gratis scans per dag', () => {
    assert.equal(beloningVoor('scans'), GRATIS_SCANS_PER_DAG);
  });

  test('WEEK-311: 5 gratis, filmpje, weer 5, filmpje, weer 5', () => {
    const nu = new Date(2026, 10, 15, 12);
    let teller: ScanTeller | null = null;
    for (let i = 0; i < 5; i++) teller = telScan(teller, nu);
    assert.equal(resterendeScans(teller, nu), 0);
    teller = voegBonusToe(teller, nu, beloningVoor('scans'));
    assert.equal(resterendeScans(teller, nu), 5);
    for (let i = 0; i < 5; i++) teller = telScan(teller, nu);
    assert.equal(resterendeScans(teller, nu), 0);
    teller = voegBonusToe(teller, nu, beloningVoor('scans'));
    assert.equal(resterendeScans(teller, nu), 5);
  });
});
