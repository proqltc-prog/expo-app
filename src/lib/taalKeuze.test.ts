import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { taalMoetOpnieuwBepaald, taalNaarOpslag, taalUitOpslag, TAALVERSIE_NU, TOESTEL } from '@/lib/taalKeuze';

describe('taalUitOpslag (WEEK-80)', () => {
  test('een opgeslagen taal van dit toestel wordt gebruikt', () => {
    assert.equal(taalUitOpslag('fr', undefined), 'fr');
    assert.equal(taalUitOpslag('de', null), 'de');
  });

  test('de keuze "toestel" blijft de taal van het toestel, ook als een oud profiel een taal had', () => {
    assert.equal(taalUitOpslag(TOESTEL, { taal: 'fr' }), undefined);
  });

  test('een ongeldige opgeslagen waarde geeft de taal van het toestel', () => {
    assert.equal(taalUitOpslag('it', null), undefined);
  });

  test('regressie: een oude taal in het profiel van dit toestel wordt eenmalig overgenomen', () => {
    assert.equal(taalUitOpslag(null, { taal: 'nl' }), 'nl');
    assert.equal(taalUitOpslag(null, { volwassenen: 2 }), undefined);
    assert.equal(taalUitOpslag(null, null), undefined);
  });
});

describe('taalNaarOpslag (WEEK-80)', () => {
  test('een taal wordt bewaard als code, de toesteltaal als "toestel"', () => {
    assert.equal(taalNaarOpslag('en'), 'en');
    assert.equal(taalNaarOpslag(undefined), TOESTEL);
  });
});

describe('taalMoetOpnieuwBepaald (WEEK-186)', () => {
  test('een toestel zonder taalversie of met een oudere versie bepaalt de taal opnieuw', () => {
    assert.equal(taalMoetOpnieuwBepaald(null), true);
    assert.equal(taalMoetOpnieuwBepaald('1'), true);
  });

  test('met de huidige versie blijft de opgeslagen keuze gelden', () => {
    assert.equal(taalMoetOpnieuwBepaald(TAALVERSIE_NU), false);
  });
});
