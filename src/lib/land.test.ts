import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bewaarLand, isBelgie, landInTaal } from './land';
import { leesPlaats } from './postcodepunt';

test('WEEK-318: België herkennen in elke taal', () => {
  for (const l of ['België', 'Belgie', 'Belgique', 'Belgien', 'Belgium', ' belgique ', 'België / Belgique / Belgien']) {
    assert.equal(isBelgie(l), true, l);
  }
  for (const l of ['Nederland', 'France', '', 'Belg']) assert.equal(isBelgie(l), false, l);
});

test('WEEK-318: nl → fr → nl toont België, Belgique, België', () => {
  const bewaard = 'België';
  assert.equal(landInTaal(bewaard, 'nl'), 'België');
  assert.equal(landInTaal(bewaard, 'fr'), 'Belgique');
  assert.equal(landInTaal(bewaard, 'nl'), 'België');
  assert.equal(landInTaal(bewaard, 'de'), 'Belgien');
  assert.equal(landInTaal(bewaard, 'en'), 'Belgium');
});

test('WEEK-318: een bewaard "Belgique" toont in het Nederlands als België', () => {
  assert.equal(landInTaal('Belgique', 'nl'), 'België');
});

test('WEEK-318: een ander land blijft zoals ingevuld', () => {
  assert.equal(landInTaal('Nederland', 'fr'), 'Nederland');
  assert.equal(bewaarLand('Nederland'), 'Nederland');
  assert.equal(landInTaal('', 'nl'), '');
});

test('WEEK-318: België wordt bewaard als "België"', () => {
  assert.equal(bewaarLand('Belgique'), 'België');
  assert.equal(bewaarLand('België / Belgique / Belgien'), 'België');
});

test('WEEK-318: de postcodedienst geeft België altijd als "België"', () => {
  assert.deepEqual(leesPlaats([{ address: { city: 'Bruxelles', country: 'Belgique' } }]), { gemeente: 'Bruxelles', land: 'België' });
  assert.deepEqual(leesPlaats([{ address: { city: 'Gent', country: 'België / Belgique / Belgien' } }]), { gemeente: 'Gent', land: 'België' });
});
