import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nl } from '@/i18n/vertalingen/nl';
import { ROUTE_NA_INLOGGEN, ROUTE_NA_WELKOM, ROUTE_WELKOM, UITLEG_SCHERMEN, welkomNodig } from '@/lib/welkom';

describe('welkomNodig (WEEK-79, WEEK-91)', () => {
  test('een nieuwe gebruiker ziet het startscherm', () => {
    assert.equal(welkomNodig(false), true);
  });

  test('na de eerste keer geen startscherm meer', () => {
    assert.equal(welkomNodig(true), false);
  });
});

describe('routes na het startscherm (WEEK-185)', () => {
  test('de route van het startscherm is welkom', () => {
    assert.equal(ROUTE_WELKOM, '/welkom');
  });

  test('een nieuwe gebruiker gaat naar de instellingen, een bekende naar het weekmenu', () => {
    assert.equal(ROUTE_NA_WELKOM, '/profiel');
    assert.equal(ROUTE_NA_INLOGGEN, '/');
  });
});

describe('uitlegschermen (WEEK-185)', () => {
  test('er zijn zeven schermen: weekplanner, huishouden, frigo, lijst, scanner, seizoen en winkels', () => {
    assert.equal(UITLEG_SCHERMEN.length, 7);
  });

  test('elk scherm heeft een titel en tekst in de Nederlandse vertalingen', () => {
    const sleutels = nl as Record<string, string>;
    for (const scherm of UITLEG_SCHERMEN) {
      assert.ok(sleutels[scherm.titel], `ontbreekt: ${scherm.titel}`);
      assert.ok(sleutels[scherm.tekst], `ontbreekt: ${scherm.tekst}`);
    }
  });
});
