import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECHTE_BELONING_EENHEDEN, kiesEenheid } from './advertentie';
import { beloningVoor } from './beloning';
import { voegBonusToe, magScannen, resterendeScans, GRATIS_SCANS_PER_DAG, ScanTeller } from './scanteller';

const TEST = 'ca-app-pub-3940256099942544/5224354917';

test('kiesEenheid: zonder echte eenheid de testeenheid', () => {
  assert.equal(kiesEenheid(null, TEST), TEST);
  assert.equal(kiesEenheid('', TEST), TEST);
  assert.equal(kiesEenheid('   ', TEST), TEST);
});

test('kiesEenheid: een ingevulde echte eenheid wint', () => {
  assert.equal(kiesEenheid(' ca-app-pub-1/2 ', TEST), 'ca-app-pub-1/2');
});

test('beloning voor scans is 10 extra scans', () => {
  assert.equal(beloningVoor('scans'), 10);
});

// Regressie: een bekeken filmpje mag het aantal scans van vandaag niet laten vallen.
test('regressie: bonus na een filmpje behoudt de gebruikte scans van vandaag', () => {
  const nu = new Date(2026, 9, 17, 12, 0, 0);
  const teller: ScanTeller = { dag: '2026-10-17', aantal: GRATIS_SCANS_PER_DAG };
  assert.equal(magScannen(teller, nu), false);
  const na = voegBonusToe(teller, nu, beloningVoor('scans'));
  assert.equal(na.aantal, GRATIS_SCANS_PER_DAG);
  assert.equal(resterendeScans(na, nu), beloningVoor('scans'));
  assert.equal(magScannen(na, nu), true);
});

// Regressie: de bonus geldt enkel voor die dag.
test('regressie: een bonus van gisteren telt niet meer vandaag', () => {
  const nu = new Date(2026, 9, 17, 12, 0, 0);
  const gisteren: ScanTeller = { dag: '2026-10-16', aantal: 4, bonus: 10 };
  assert.equal(resterendeScans(gisteren, nu), GRATIS_SCANS_PER_DAG);
});

// Regressie: de echte Android-beloningseenheid van Famenu blijft ingevuld.
test('de Android-beloningseenheid is de echte AdMob-eenheid', () => {
  assert.equal(ECHTE_BELONING_EENHEDEN.android, 'ca-app-pub-8394022188610476/3811398201');
});
