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

const volledigAdres = { postcode: '1760', gemeente: 'Roosdaal', land: 'België' };
const gezin = (wijziging: Partial<Profiel> = {}): Profiel => ({ ...standaardProfiel(), volwassenen: 2, adres: volledigAdres, ...wijziging });

describe('standaardProfiel', () => {
  test('start leeg: 0 volwassenen en 0 kinderen (WEEK-91), en niet geldig voor het opslaan', () => {
    const p = standaardProfiel();
    assert.equal(p.volwassenen, 0);
    assert.equal(p.kinderen, 0);
    assert.equal(aantalPersonen(p), 0);
    // WEEK-99: het adres is verplicht; een leeg gezin mist ook postcode en gemeente.
    assert.deepEqual(valideerProfiel(p), ['volwassenen', 'postcodeLeeg', 'gemeente']);
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
    assert.deepEqual(valideerProfiel(normaliseerProfiel({ weekbudget: -5, maxKm: 'veel', adres: volledigAdres })), []);
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
  test('postcode, gemeente en land zijn verplicht (WEEK-99)', () => {
    assert.deepEqual(valideerProfiel(gezin()), []);
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...volledigAdres, postcode: '' } })), ['postcodeLeeg']);
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...volledigAdres, postcode: '   ' } })), ['postcodeLeeg']);
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...volledigAdres, gemeente: '' } })), ['gemeente']);
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...volledigAdres, land: ' ' } })), ['land']);
  });
  test('een ingevulde postcode moet ook kloppen', () => {
    assert.deepEqual(valideerProfiel(gezin({ adres: { ...volledigAdres, postcode: '17!' } })), ['postcode']);
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
    const p = normaliseerProfiel({ volwassenen: 0, kinderen: 3, adres: { postcode: '1760', gemeente: 'Roosdaal' } });
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
