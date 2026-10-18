import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aantalPersonen,
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
  test('heeft geen budget en geen maximale afstand meer (WEEK-69)', () => {
    const p = standaardProfiel();
    assert.equal('weekbudget' in p, false);
    assert.equal('maxKm' in p, false);
  });
});

describe('aantalPersonen', () => {
  test('telt volwassenen en kinderen', () => {
    assert.equal(aantalPersonen(gezin({ volwassenen: 2, kinderen: 2 })), 4);
  });
});

describe('budget en maximale afstand zijn verwijderd (WEEK-69)', () => {
  test('oude opgeslagen waarden worden genegeerd en niet bewaard', () => {
    const p = normaliseerProfiel({ volwassenen: 2, weekbudget: 150, maxKm: 15 });
    assert.equal('weekbudget' in p, false);
    assert.equal('maxKm' in p, false);
    assert.equal(p.volwassenen, 2);
  });
  test('een profiel met oude velden blijft geldig', () => {
    assert.deepEqual(valideerProfiel(normaliseerProfiel({ weekbudget: -5, maxKm: 'veel' })), []);
  });
});

describe('straat bestaat niet meer', () => {
  test('straat en vrije samenstelling worden niet bewaard', () => {
    const p = normaliseerProfiel({ straat: 'Dorpstraat 1', samenstelling: 'x', adres: { straat: 'Dorpstraat 1', gemeente: 'Roosdaal' } });
    assert.equal('straat' in p.adres, false);
    assert.equal('samenstelling' in p, false);
    assert.equal(p.adres.gemeente, 'Roosdaal');
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
    const p = normaliseerProfiel({ volwassenen: 0, kinderen: 3, adres: { gemeente: 'Roosdaal' } });
    assert.equal(p.volwassenen, 1);
    assert.equal(p.kinderen, 3);
    assert.equal(p.adres.gemeente, 'Roosdaal');
    assert.equal(p.adres.land, 'België');
    assert.deepEqual(valideerProfiel(p), []);
  });
});

describe('taal hoort niet bij het gezinsprofiel (WEEK-80)', () => {
  test('een profiel heeft geen taal, ook niet als een oud profiel er één bevat', () => {
    assert.equal('taal' in normaliseerProfiel({ taal: 'fr' }), false);
    assert.equal('taal' in standaardProfiel(), false);
  });
});

describe('profielContext', () => {
  const p = gezin({
    volwassenen: 2,
    kinderen: 2,
    adres: { postcode: '1000', gemeente: 'Brussel', land: 'België' },
  });
  const context = profielContext(p);

  test('beschrijft gezin en woonplaats', () => {
    assert.match(context, /4 personen – 2 volwassenen, 2 kinderen \(0 tot 12 jaar\)/);
    assert.match(context, /Woonplaats: Brussel, België/);
  });
  test('bevat geen budget meer (WEEK-69)', () => {
    assert.doesNotMatch(context, /Budget|€/);
  });
  test('stuurt nooit de postcode mee', () => {
    assert.doesNotMatch(context, /1000/);
  });
  test('enkelvoud en lege velden', () => {
    const c = profielContext(gezin({ volwassenen: 1, kinderen: 1, adres: { postcode: '', gemeente: '', land: '' } }));
    assert.match(c, /2 personen – 1 volwassene, 1 kind \(0 tot 12 jaar\)/);
    assert.doesNotMatch(c, /Woonplaats/);
  });
});
