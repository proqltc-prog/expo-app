import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { beoordeel, Product } from '@/lib/openfoodfacts';

const basis: Product = { barcode: '1', naam: 'Test', additieven: [] };

describe('beoordeel', () => {
  test('Nutri-Score A zonder minpunten is Goed', () => {
    const o = beoordeel({ ...basis, nutriscore: 'a' });
    assert.equal(o.score, 100);
    assert.equal(o.label, 'Goed');
    assert.deepEqual(o.redenen, ['Nutri-Score A']);
  });

  test('zonder Nutri-Score start de score op 60 (Matig)', () => {
    const o = beoordeel(basis);
    assert.equal(o.score, 60);
    assert.equal(o.label, 'Matig');
  });

  test('ultrabewerkt, veel additieven, suiker en zout trekken af', () => {
    const o = beoordeel({ ...basis, nutriscore: 'c', nova: 4, additieven: ['E1', 'E2', 'E3'], suikers: 30, zout: 2 });
    assert.equal(o.score, 60 - 15 - 10 - 10 - 5);
    assert.equal(o.label, 'Liever niet');
    assert.equal(o.redenen.length, 5);
  });

  test('eiwitrijk geeft een bonus, maar de score blijft maximaal 100', () => {
    const o = beoordeel({ ...basis, nutriscore: 'a', eiwitten: 20 });
    assert.equal(o.score, 100);
  });

  test('de score zakt nooit onder 0', () => {
    const o = beoordeel({ ...basis, nutriscore: 'e', nova: 4, additieven: ['a', 'b', 'c'], suikers: 50, zout: 5 });
    assert.equal(o.score, 0);
  });

  test('grenzen van de labels: 65 = Goed, 40 = Matig, 39 = Liever niet', () => {
    // b (80) - 15 (NOVA 4) = 65
    assert.equal(beoordeel({ ...basis, nutriscore: 'b', nova: 4 }).label, 'Goed');
    // geen nutriscore (60) - 15 - 5 = 40
    assert.equal(beoordeel({ ...basis, nova: 4, zout: 2 }).label, 'Matig');
    // d (35) + 5 eiwit = 40 -> Matig; d (35) alleen = 35 -> Liever niet
    assert.equal(beoordeel({ ...basis, nutriscore: 'd' }).label, 'Liever niet');
  });
});
