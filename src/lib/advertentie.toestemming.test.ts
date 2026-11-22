import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ECHTE_BELONING_EENHEDEN, kiesEenheid, toonToestemmingKnop } from '@/lib/advertentie';

describe('WEEK-325: knop "Toestemming voor reclame wijzigen"', () => {
  test('enkel zichtbaar als Google privacyopties vereist', () => {
    assert.equal(toonToestemmingKnop('REQUIRED'), true);
  });
  test('niet zichtbaar als ze niet vereist of nog onbekend zijn', () => {
    for (const s of ['NOT_REQUIRED', 'UNKNOWN', '', null, undefined]) assert.equal(toonToestemmingKnop(s), false, String(s));
  });
  test('regressie: de echte beloning-eenheid voor Android blijft gebruikt', () => {
    assert.equal(kiesEenheid(ECHTE_BELONING_EENHEDEN.android, 'test'), 'ca-app-pub-8394022188610476/3811398201');
  });
});
