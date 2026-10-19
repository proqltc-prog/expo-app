import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_NA_WELKOM, ROUTE_WELKOM, welkomNodig } from '@/lib/welkom';

describe('welkomNodig (WEEK-79, WEEK-91)', () => {
  test('een nieuwe gebruiker ziet het welkomstscherm', () => {
    assert.equal(welkomNodig(false), true);
  });

  test('na de eerste keer geen welkomstscherm meer', () => {
    assert.equal(welkomNodig(true), false);
  });

  test('regressie WEEK-91: een taal in de oude opslag slaat het welkomstscherm niet meer over', () => {
    // welkomNodig kijkt enkel naar het gezien-vlag, niet naar een eerder bewaarde taal.
    assert.equal(welkomNodig(false), true);
  });

  test('de routes: welkom eerst, daarna de gezinsruimte', () => {
    assert.equal(ROUTE_WELKOM, '/welkom');
    assert.equal(ROUTE_NA_WELKOM, '/profiel');
  });
});
