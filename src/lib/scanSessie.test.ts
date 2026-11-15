import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { maakScanSessie } from './scanSessie';

describe('scanSessie (WEEK-297)', () => {
  test('een scan in de huidige sessie is actueel', () => {
    const sessie = maakScanSessie();
    const scan = sessie.huidig();
    assert.equal(sessie.actueel(scan), true);
  });

  test('bug: een scan die nog bezig is wanneer de scanner opnieuw opent, telt niet meer', () => {
    const sessie = maakScanSessie();
    const scanOpPaginaScan = sessie.huidig();
    sessie.nieuw(); // de gebruiker opent de scanner vanaf In huis
    assert.equal(sessie.actueel(scanOpPaginaScan), false);
    assert.equal(sessie.actueel(sessie.huidig()), true);
  });

  test('elke nieuwe sessie krijgt een ander nummer', () => {
    const sessie = maakScanSessie();
    const a = sessie.nieuw();
    const b = sessie.nieuw();
    assert.notEqual(a, b);
    assert.equal(sessie.actueel(a), false);
    assert.equal(sessie.actueel(b), true);
  });

  test('aparte scanners delen hun sessie niet', () => {
    const een = maakScanSessie();
    const twee = maakScanSessie();
    een.nieuw();
    assert.equal(twee.actueel(twee.huidig()), true);
  });
});
