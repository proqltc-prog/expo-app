import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { afdelingUitCategorieen, beoordeel, isDrank, Product, productNaam, scanNaam } from '@/lib/openfoodfacts';

const basis: Product = { barcode: '1', naam: 'Test', additieven: [] };

describe('beoordeel', () => {
  test('gebruikt de drempels voor drank bij een drank (per 100 ml)', () => {
    // 5 g suikers: voor voeding laag, voor drank midden (grens 2,5 g)
    assert.equal(beoordeel({ ...basis, suikers: 5 }).score, 100);
    assert.equal(beoordeel({ ...basis, suikers: 5, categorieen: ['en:beverages'] }).score, 90);
  });

  test('het Nutri-Score telt niet mee in onze score (geen dubbele telling)', () => {
    assert.equal(beoordeel({ ...basis, nutriscore: 'e' }).score, beoordeel({ ...basis, nutriscore: 'a' }).score);
  });

  test('isDrank herkent dranken en laat voeding met rust', () => {
    assert.equal(isDrank({ categorieen: ['en:beverages', 'en:sodas'] }), true);
    assert.equal(isDrank({ categorieen: ['en:biscuits'] }), false);
    assert.equal(isDrank({}), false);
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
