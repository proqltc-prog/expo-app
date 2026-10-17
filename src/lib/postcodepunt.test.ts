import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bouwPostcodeUrl, leesPunt } from '@/lib/postcodepunt';

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
