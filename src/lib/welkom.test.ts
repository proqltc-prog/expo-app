import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nl } from '@/i18n/vertalingen/nl';
import { bestemmingNaAanmelden, ROUTE_AANGEMELD, ROUTE_NA_INLOGGEN, ROUTE_NA_WELKOM, ROUTE_WELKOM, UITLEG_SCHERMEN, welkomNodig } from '@/lib/welkom';
import { isProfielIngesteld, standaardProfiel } from '@/lib/profiel';

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

describe('bestemming na aanmelden met Google (WEEK-231)', () => {
  test('eerste keer, gezin nog niet ingesteld: de instellingen met de gezinsruimte', () => {
    assert.equal(bestemmingNaAanmelden(true, false), '/profiel');
  });

  test('gezin al ingesteld en gekend: de weekplanner', () => {
    assert.equal(bestemmingNaAanmelden(true, true), '/');
  });

  test('aanmelden mislukt of geannuleerd: terug naar het startscherm, ook als het gezin al ingesteld is', () => {
    assert.equal(bestemmingNaAanmelden(false, false), '/welkom');
    assert.equal(bestemmingNaAanmelden(false, true), '/welkom');
  });

  test('de tussenpagina heet aangemeld (staat in Supabase onder famenu://** en expo-app/**)', () => {
    assert.equal(ROUTE_AANGEMELD, '/aangemeld');
  });
});

describe('isProfielIngesteld (WEEK-231)', () => {
  const adres = { postcode: '1000', gemeente: 'Brussel', land: 'België' };
  test('een nieuw, leeg profiel is niet ingesteld', () => {
    assert.equal(isProfielIngesteld(standaardProfiel()), false);
  });

  test('met minstens één volwassene en een volledig adres is het ingesteld', () => {
    assert.equal(isProfielIngesteld({ volwassenen: 2, kinderen: 1, adres }), true);
  });

  test('zonder adres of zonder volwassenen niet', () => {
    assert.equal(isProfielIngesteld({ volwassenen: 2, kinderen: 0, adres: { postcode: '', gemeente: '', land: 'België' } }), false);
    assert.equal(isProfielIngesteld({ volwassenen: 0, kinderen: 2, adres }), false);
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
