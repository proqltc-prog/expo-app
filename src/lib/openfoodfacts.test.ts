import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { afdelingUitCategorieen, beoordeel, Product, productNaam, scanNaam } from '@/lib/openfoodfacts';

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

describe('gescand product naar de frigo (WEEK-35)', () => {
  test('afdeling uit de categorieën', () => {
    assert.equal(afdelingUitCategorieen(['en:dairies', 'en:yogurts']), 'zuivel-eieren');
    assert.equal(afdelingUitCategorieen(['en:plant-based-foods', 'en:fruits']), 'groenten-fruit');
    assert.equal(afdelingUitCategorieen(['en:meats', 'en:hams']), 'vlees-vis');
    assert.equal(afdelingUitCategorieen(['en:pastas']), 'droge-voeding');
    assert.equal(afdelingUitCategorieen(['en:breads']), 'brood');
    assert.equal(afdelingUitCategorieen(['en:sauces', 'en:tomato-sauces']), 'conserven-sauzen');
  });

  test('diepvries en dranken gaan voor de andere afdelingen', () => {
    assert.equal(afdelingUitCategorieen(['en:vegetables', 'en:frozen-vegetables']), 'diepvries');
    assert.equal(afdelingUitCategorieen(['en:fruits', 'en:juices']), 'dranken');
  });

  test('onbekend of leeg: overig', () => {
    assert.equal(afdelingUitCategorieen([]), 'overig');
    assert.equal(afdelingUitCategorieen(undefined), 'overig');
    assert.equal(afdelingUitCategorieen(['fr:biscuits-au-beurre']), 'overig');
  });

  test('naam: eerste merk – naam, of onbekend', () => {
    assert.equal(scanNaam({ merk: 'Danone, Activia', naam: 'Yoghurt' }, '?'), 'Danone – Yoghurt');
    assert.equal(scanNaam({ naam: 'Melk' }, '?'), 'Melk');
    assert.equal(scanNaam({ merk: 'Lidl', naam: '' }, 'Onbekend product'), 'Lidl – Onbekend product');
  });
});
