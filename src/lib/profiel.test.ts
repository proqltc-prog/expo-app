import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aantalPersonen,
  leesBedrag,
  leesMaxKm,
  normaliseerProfiel,
  Profiel,
  profielContext,
  standaardProfiel,
  valideerProfiel,
} from '@/lib/profiel';

const gezin = (wijziging: Partial<Profiel> = {}): Profiel => ({ ...standaardProfiel(), ...wijziging });

describe('standaardProfiel', () => {
  test('is geldig en telt 2 personen', () => {
    const p = standaardProfiel();
    assert.deepEqual(valideerProfiel(p), []);
    assert.equal(aantalPersonen(p), 2);
  });
});

describe('aantalPersonen', () => {
  test('telt volwassenen en kinderen', () => {
    assert.equal(aantalPersonen(gezin({ volwassenen: 2, kinderen: 2 })), 4);
  });
});

describe('maximale afstand voor boodschappen', () => {
  test('is optioneel, en als ze ingevuld is een geheel getal van 1 tot 100 km', () => {
    assert.deepEqual(valideerProfiel(gezin({ maxKm: undefined })), []);
    assert.deepEqual(valideerProfiel(gezin({ maxKm: 1 })), []);
    assert.deepEqual(valideerProfiel(gezin({ maxKm: 100 })), []);
    assert.deepEqual(valideerProfiel(gezin({ maxKm: 0 })), ['maxKm']);
    assert.deepEqual(valideerProfiel(gezin({ maxKm: 12.5 })), ['maxKm']);
    assert.deepEqual(valideerProfiel(gezin({ maxKm: 101 })), ['maxKm']);
  });
  test('wordt bewaard, foute waarden worden leeg gelaten', () => {
    assert.equal(normaliseerProfiel({ maxKm: 8 }).maxKm, 8);
    assert.equal(normaliseerProfiel({ maxKm: 'veel' }).maxKm, undefined);
    assert.equal(normaliseerProfiel({ maxKm: 500 }).maxKm, undefined);
  });
  test('straat en vrije samenstelling bestaan niet meer', () => {
    const p = normaliseerProfiel({ straat: 'Dorpstraat 1', samenstelling: 'x', adres: { straat: 'Dorpstraat 1', gemeente: 'Roosdaal' } });
    assert.equal('straat' in p.adres, false);
    assert.equal('samenstelling' in p, false);
    assert.equal(p.adres.gemeente, 'Roosdaal');
  });
});

describe('leesMaxKm', () => {
  test('leeg betekent geen limiet, een geheel getal wordt gelezen', () => {
    assert.equal(leesMaxKm(''), undefined);
    assert.equal(leesMaxKm('   '), undefined);
    assert.equal(leesMaxKm('10'), 10);
    assert.equal(leesMaxKm(' 25 '), 25);
  });
  test('alles wat geen geheel getal is, wordt NaN', () => {
    assert.ok(Number.isNaN(leesMaxKm('12,5')));
    assert.ok(Number.isNaN(leesMaxKm('veel')));
    assert.ok(Number.isNaN(leesMaxKm('-3')));
    assert.ok(Number.isNaN(leesMaxKm('10 km')));
  });
});

describe('leesBedrag', () => {
  const gevallen: [string, number | undefined][] = [
    ['', undefined],
    ['   ', undefined],
    ['120', 120],
    ['120,50', 120.5],
    ['€ 85.5', 85.5],
    ['1.250,00', 1250],
    ['1,250.75', 1250.75],
    ['99,999', 100],
  ];
  for (const [invoer, verwacht] of gevallen) {
    test(`"${invoer}" → ${verwacht}`, () => assert.equal(leesBedrag(invoer), verwacht));
  }
  test('ongeldige invoer geeft NaN', () => {
    assert.ok(Number.isNaN(leesBedrag('abc')));
    assert.ok(Number.isNaN(leesBedrag('-20')));
    assert.ok(Number.isNaN(leesBedrag('12,3,4')));
  });
});

describe('valideerProfiel', () => {
  test('minstens één volwassene', () => {
    assert.deepEqual(valideerProfiel(gezin({ volwassenen: 0 })), ['volwassenen']);
  });
  test('aantal kinderen is een geheel getal van 0 tot het maximum', () => {
    assert.deepEqual(valideerProfiel(gezin({ kinderen: 0 })), []);
    assert.deepEqual(valideerProfiel(gezin({ kinderen: 1.5 })), ['kinderen']);
    assert.deepEqual(valideerProfiel(gezin({ kinderen: -1 })), ['kinderen']);
  });
  test('budget moet positief zijn als het ingevuld is', () => {
    assert.deepEqual(valideerProfiel(gezin({ weekbudget: 0 })), ['budget']);
    assert.deepEqual(valideerProfiel(gezin({ weekbudget: NaN })), ['budget']);
    assert.deepEqual(valideerProfiel(gezin({ weekbudget: 150 })), []);
  });
  test('postcode is optioneel maar moet geldig zijn als ze ingevuld is', () => {
    const adres = { ...standaardProfiel().adres, postcode: '1760' };
    assert.deepEqual(valideerProfiel(gezin({ adres })), []);
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...adres, postcode: '17!' } })), ['postcode']);
  });
  test('te veel kinderen', () => {
    assert.ok(valideerProfiel(gezin({ kinderen: 11 })).includes('kinderen'));
  });
});

describe('normaliseerProfiel', () => {
  test('lege of foute data geeft het standaardprofiel', () => {
    assert.deepEqual(normaliseerProfiel(null), standaardProfiel());
    assert.deepEqual(normaliseerProfiel('rommel'), standaardProfiel());
  });
  test('oude profielen met een leeftijd per kind tellen het aantal kinderen', () => {
    assert.equal(normaliseerProfiel({ kinderen: [7, 4] }).kinderen, 2);
    assert.equal(normaliseerProfiel({ kinderen: [7, 'x', 4, 30] }).kinderen, 4);
  });
  test('behoudt geldige velden en herstelt foute', () => {
    const p = normaliseerProfiel({
      volwassenen: 0,
      kinderen: 3,
      weekbudget: -5,
      adres: { gemeente: 'Roosdaal' },
    });
    assert.equal(p.volwassenen, 1);
    assert.equal(p.kinderen, 3);
    assert.equal(p.weekbudget, undefined);
    assert.equal(p.adres.gemeente, 'Roosdaal');
    assert.equal(p.adres.land, 'België');
    assert.deepEqual(valideerProfiel(p), []);
  });
});

describe('taalkeuze in het profiel', () => {
  test('een geldige taal blijft behouden, een ongeldige wordt toesteltaal', () => {
    assert.equal(normaliseerProfiel({ taal: 'fr' }).taal, 'fr');
    assert.equal(normaliseerProfiel({ taal: 'it' }).taal, undefined);
    assert.equal(standaardProfiel().taal, undefined);
  });
});

describe('profielContext', () => {
  const p = gezin({
    volwassenen: 2,
    kinderen: 2,
    weekbudget: 150,
    maxKm: 15,
    adres: { postcode: '1000', gemeente: 'Brussel', land: 'België' },
  });
  const context = profielContext(p);

  test('beschrijft gezin, budget en opmerkingen', () => {
    assert.match(context, /4 personen – 2 volwassenen, 2 kinderen \(0 tot 12 jaar\)/);
    assert.match(context, /€ 150,00 per week/);
    assert.match(context, /Woonplaats: Brussel, België/);
  });
  test('stuurt nooit de postcode mee', () => {
    assert.doesNotMatch(context, /1000/);
  });
  test('enkelvoud en lege velden', () => {
    const c = profielContext(gezin({ volwassenen: 1, kinderen: 1, adres: { postcode: '', gemeente: '', land: '' } }));
    assert.match(c, /2 personen – 1 volwassene, 1 kind \(0 tot 12 jaar\)/);
    assert.doesNotMatch(c, /Budget/);
    assert.doesNotMatch(c, /Woonplaats/);
  });
});
