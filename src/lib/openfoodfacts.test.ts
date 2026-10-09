import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { beoordeel, Product, productNaam } from '@/lib/openfoodfacts';

const basis: Product = { barcode: '1', naam: 'Test', additieven: [] };

describe('beoordeel', () => {
  test('Nutri-Score A zonder minpunten is Goed', () => {
    const o = beoordeel({ ...basis, nutriscore: 'a' });
    assert.equal(o.score, 100);
    assert.equal(o.label, 'goed');
    assert.deepEqual(o.redenen, [{ code: 'nutriscore', waarde: 'A' }]);
  });

  test('zonder Nutri-Score start de score op 60 (Matig)', () => {
    const o = beoordeel(basis);
    assert.equal(o.score, 60);
    assert.equal(o.label, 'matig');
  });

  test('ultrabewerkt, veel additieven, suiker en zout trekken af', () => {
    const o = beoordeel({ ...basis, nutriscore: 'c', nova: 4, additieven: ['E1', 'E2', 'E3'], suikers: 30, zout: 2 });
    assert.equal(o.score, 60 - 15 - 10 - 10 - 5);
    assert.equal(o.label, 'slecht');
    assert.deepEqual(o.redenen.map((r) => r.code), ['nutriscore', 'nova4', 'additieven', 'suiker', 'zout']);
    assert.deepEqual(o.redenen.find((r) => r.code === 'suiker'), { code: 'suiker', waarde: 30 });
  });

  test('eiwitrijk geeft een bonus, maar de score blijft maximaal 100', () => {
    const o = beoordeel({ ...basis, nutriscore: 'a', eiwitten: 20 });
    assert.equal(o.score, 100);
  });

  test('de score zakt nooit onder 0', () => {
    const o = beoordeel({ ...basis, nutriscore: 'e', nova: 4, additieven: ['a', 'b', 'c'], suikers: 50, zout: 5 });
    assert.equal(o.score, 0);
  });

  test('grenzen van de labels: 65 = goed, 40 = matig, 35 = slecht', () => {
    // b (80) - 15 (NOVA 4) = 65
    assert.equal(beoordeel({ ...basis, nutriscore: 'b', nova: 4 }).label, 'goed');
    // geen nutriscore (60) - 15 - 5 = 40
    assert.equal(beoordeel({ ...basis, nova: 4, zout: 2 }).label, 'matig');
    // d (35) = slecht
    assert.equal(beoordeel({ ...basis, nutriscore: 'd' }).label, 'slecht');
  });
});

describe('productNaam', () => {
  test('neemt de naam in de taal van de gebruiker', () => {
    assert.equal(productNaam({ product_name: 'Milk', product_name_fr: 'Lait' }, 'fr'), 'Lait');
  });
  test('valt terug op de algemene naam', () => {
    assert.equal(productNaam({ product_name: 'Milk', product_name_fr: '  ' }, 'fr'), 'Milk');
  });
  test('geeft een lege naam als er niets gekend is', () => {
    assert.equal(productNaam({}, 'nl'), '');
  });
});
