import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bouwPostcodeUrl, leesPlaats, leesPunt } from '@/lib/postcodepunt';

describe('postcode naar punt: url (WEEK-60)', () => {
  test('zoekt op postcode in België', () => {
    const url = bouwPostcodeUrl('1760', 'Roosdaal')!;
    assert.match(url, /postalcode=1760/);
    assert.match(url, /country=Belgium/);
    assert.match(url, /city=Roosdaal/);
  });

  test('zonder gemeente alleen op postcode', () => {
    const url = bouwPostcodeUrl(' 1760 ', '')!;
    assert.match(url, /postalcode=1760/);
    assert.doesNotMatch(url, /city=/);
  });

  test('ongeldige postcode geeft null', () => {
    assert.equal(bouwPostcodeUrl('17', 'Roosdaal'), null);
    assert.equal(bouwPostcodeUrl('abcd', ''), null);
    assert.equal(bouwPostcodeUrl('', ''), null);
  });

  test('gemeente met vreemde tekens wordt veilig gemaakt', () => {
    const url = bouwPostcodeUrl('1760', 'Roosdaal&format=xml')!;
    assert.doesNotMatch(url, /&format=xml/);
  });
});

describe('postcode naar punt: antwoord lezen (WEEK-60)', () => {
  test('leest lat en lon van het eerste resultaat, ook als tekst', () => {
    assert.deepEqual(leesPunt([{ lat: '50.9', lon: '4.1' }]), { lat: 50.9, lon: 4.1 });
  });

  test('lege of onbruikbare invoer geeft undefined', () => {
    assert.equal(leesPunt([]), undefined);
    assert.equal(leesPunt({}), undefined);
    assert.equal(leesPunt([{ lat: 'x', lon: '4' }]), undefined);
    assert.equal(leesPunt(null), undefined);
  });
});

describe('postcode naar plaats: gemeente en land (WEEK-69)', () => {
  test('vraagt ook de adresgegevens op', () => {
    assert.match(bouwPostcodeUrl('1760', '')!, /addressdetails=1/);
  });

  test('leest de gemeente uit het eerste resultaat', () => {
    assert.deepEqual(leesPlaats([{ address: { city: 'Roosdaal', country: 'België' } }]), { gemeente: 'Roosdaal', land: 'België' });
  });

  test('valt terug op town, municipality of village als city ontbreekt', () => {
    assert.deepEqual(leesPlaats([{ address: { village: 'Strijtem', country: 'België' } }]), { gemeente: 'Strijtem', land: 'België' });
    assert.deepEqual(leesPlaats([{ address: { municipality: 'Lennik' } }]), { gemeente: 'Lennik', land: 'België' });
  });

  test('zonder land wordt België gekozen', () => {
    assert.deepEqual(leesPlaats([{ address: { city: 'Roosdaal' } }]), { gemeente: 'Roosdaal', land: 'België' });
  });

  test('geen bruikbaar resultaat geeft undefined', () => {
    assert.equal(leesPlaats([]), undefined);
    assert.equal(leesPlaats([{ address: { country: 'België' } }]), undefined);
    assert.equal(leesPlaats([{ lat: '50', lon: '4' }]), undefined);
    assert.equal(leesPlaats(null), undefined);
  });
});
