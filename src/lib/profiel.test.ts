import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aantalPersonen,
  leesBedrag,
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
    assert.equal(aantalPersonen(gezin({ volwassenen: 2, kinderen: [7, 4] })), 4);
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
  test('leeftijd van een kind tussen 0 en 17', () => {
    assert.deepEqual(valideerProfiel(gezin({ kinderen: [7, 18] })), ['leeftijd']);
    assert.deepEqual(valideerProfiel(gezin({ kinderen: [0, 17] })), []);
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
    assert.ok(valideerProfiel(gezin({ kinderen: Array(11).fill(5) })).includes('kinderen'));
  });
});

describe('normaliseerProfiel', () => {
  test('lege of foute data geeft het standaardprofiel', () => {
    assert.deepEqual(normaliseerProfiel(null), standaardProfiel());
    assert.deepEqual(normaliseerProfiel('rommel'), standaardProfiel());
  });
  test('behoudt geldige velden en herstelt foute', () => {
    const p = normaliseerProfiel({
      volwassenen: 0,
      kinderen: [7, 'x', 4, 30],
      weekbudget: -5,
      samenstelling: 'geen pikant',
      adres: { gemeente: 'Roosdaal' },
    });
    assert.equal(p.volwassenen, 1);
    assert.deepEqual(p.kinderen, [7, 4]);
    assert.equal(p.weekbudget, undefined);
    assert.equal(p.samenstelling, 'geen pikant');
    assert.equal(p.adres.gemeente, 'Roosdaal');
    assert.equal(p.adres.land, 'België');
    assert.deepEqual(valideerProfiel(p), []);
  });
});

describe('profielContext', () => {
  const p = gezin({
    volwassenen: 2,
    kinderen: [7, 4],
    weekbudget: 150,
    samenstelling: 'kinderen eten kleine porties',
    adres: { straat: 'Dorpstraat 1', postcode: '1000', gemeente: 'Brussel', land: 'België' },
  });
  const context = profielContext(p);

  test('beschrijft gezin, budget en opmerkingen', () => {
    assert.match(context, /4 personen – 2 volwassenen, 2 kinderen \(4 jaar, 7 jaar\)/);
    assert.match(context, /€ 150,00 per week/);
    assert.match(context, /kinderen eten kleine porties/);
    assert.match(context, /Woonplaats: Brussel, België/);
  });
  test('stuurt nooit straat of postcode mee', () => {
    assert.doesNotMatch(context, /Dorpstraat/);
    assert.doesNotMatch(context, /1000/);
  });
  test('enkelvoud en lege velden', () => {
    const c = profielContext(gezin({ volwassenen: 1, kinderen: [3], adres: { straat: '', postcode: '', gemeente: '', land: '' } }));
    assert.match(c, /2 personen – 1 volwassene, 1 kind \(3 jaar\)/);
    assert.doesNotMatch(c, /Budget/);
    assert.doesNotMatch(c, /Woonplaats/);
  });
});
