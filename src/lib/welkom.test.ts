import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_NA_WELKOM, ROUTE_WELKOM, welkomNodig } from '@/lib/welkom';

describe('welkomNodig (WEEK-79)', () => {
  test('een nieuwe gebruiker zonder taal ziet het welkomstscherm', () => {
    assert.equal(welkomNodig(false, undefined), true);
  });

  test('na de eerste keer, of als er al een taal is, geen welkomstscherm meer', () => {
    assert.equal(welkomNodig(true, undefined), false);
    assert.equal(welkomNodig(false, 'fr'), false);
    assert.equal(welkomNodig(true, 'nl'), false);
  });

  test('regressie: bestaande gebruikers met een gekozen taal komen direct op het menu', () => {
    for (const taal of ['nl', 'fr', 'de', 'en', 'es', 'pt'] as const) {
      assert.equal(welkomNodig(false, taal), false, taal);
    }
  });

  test('de routes: welkom eerst, daarna de gezinsruimte', () => {
    assert.equal(ROUTE_WELKOM, '/welkom');
    assert.equal(ROUTE_NA_WELKOM, '/profiel');
  });
});
