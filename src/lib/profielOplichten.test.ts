import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { gezinIcoonOplichten, standaardProfiel } from '@/lib/profiel';

describe('gezinsicoon laten oplichten (WEEK-268)', () => {
  const adres = { postcode: '9000', gemeente: 'Gent', land: 'België' };
  test('nog niet geladen: niet oplichten', () => {
    assert.equal(gezinIcoonOplichten(null), false);
  });
  test('nieuw gezin (0 volwassenen, geen adres): oplichten', () => {
    assert.equal(gezinIcoonOplichten(standaardProfiel()), true);
  });
  test('volwassenen maar geen postcode: nog steeds oplichten', () => {
    assert.equal(gezinIcoonOplichten({ volwassenen: 2, kinderen: 0, adres: { postcode: '', gemeente: '', land: 'België' } }), true);
  });
  test('adres maar 0 volwassenen: oplichten', () => {
    assert.equal(gezinIcoonOplichten({ volwassenen: 0, kinderen: 1, adres }), true);
  });
  test('gezin ingesteld en bewaard: de highlight gaat weg', () => {
    assert.equal(gezinIcoonOplichten({ volwassenen: 2, kinderen: 1, adres }), false);
  });
});
