import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eenheidVan } from '@/data/ingredienten';
import { catalogus, voegPlannerToe } from '@/lib/frigoSheets';
import { verbruik } from '@/lib/frigo';

// WEEK-160: producten uit de zoekfunctie van de planner-frigo krijgen de databankcode en de vaste eenheid.
const nu = new Date('2026-10-25T12:00:00.000Z');
const vanCatalogus = (code: string) => {
  const item = catalogus('nl').find((i) => i.code === code);
  assert.ok(item, `catalogus-item ${code} bestaat`);
  return item;
};

describe('vaste eenheid per ingrediënt (WEEK-160)', () => {
  test('tellingen in stuk of teentje, vloeistoffen in ml, de rest in gram', () => {
    assert.equal(eenheidVan('eieren'), 'stuk');
    assert.equal(eenheidVan('look'), 'teentje');
    assert.equal(eenheidVan('olijfolie'), 'ml');
    assert.equal(eenheidVan('rijst'), 'g', 'rijst heeft geen databankcode: gram');
    assert.equal(eenheidVan('pasta'), 'g');
    assert.equal(eenheidVan('tomaten'), 'g', 'tomaat staat in de databank op gram; de recepten gebruiken gram');
  });
});

describe('voegPlannerToe met code, eenheid en hoeveelheid (WEEK-160)', () => {
  test('eieren met 6 stuk: databankcode eieren, eenheid stuk, hoeveelheid 6', () => {
    const [f] = voegPlannerToe([], vanCatalogus('eieren'), nu, 6);
    assert.equal(f.code, 'eieren');
    assert.equal(f.eenheid, 'stuk');
    assert.equal(f.hoeveelheid, 6);
  });

  test('look zonder hoeveelheid: databankcode knoflook en eenheid teentje, zonder hoeveelheid', () => {
    const [f] = voegPlannerToe([], vanCatalogus('look'), nu);
    assert.equal(f.code, 'knoflook');
    assert.equal(f.eenheid, 'teentje');
    assert.equal(f.hoeveelheid, undefined);
  });

  test('pasta heeft geen databankcode en is in gram', () => {
    const [f] = voegPlannerToe([], vanCatalogus('pasta'), nu, 500);
    assert.equal(f.code, undefined);
    assert.equal(f.eenheid, 'g');
    assert.equal(f.hoeveelheid, 500);
  });

  test('een tweede keer toevoegen van hetzelfde product verandert niets', () => {
    const een = voegPlannerToe([], vanCatalogus('eieren'), nu, 6);
    assert.equal(voegPlannerToe(een, vanCatalogus('eieren'), nu, 12).length, 1);
  });
});

describe('verbruik van een stuk-product met de databankcode (WEEK-160)', () => {
  test('6 eieren in de frigo, een recept met 2 stuk eieren: 4 blijven over', () => {
    const frigo = voegPlannerToe([], vanCatalogus('eieren'), nu, 6);
    const { frigo: na } = verbruik(frigo, [{ naam: 'eieren', code: 'eieren', hoeveelheid: 2, eenheid: 'stuk' }]);
    assert.equal(na[0].hoeveelheid, 4);
  });

  test('look in de frigo koppelt aan een recept met knoflook in teentjes, op code', () => {
    const frigo = voegPlannerToe([], vanCatalogus('look'), nu, 10);
    const { frigo: na, verbruikt } = verbruik(frigo, [{ naam: 'knoflook', code: 'knoflook', hoeveelheid: 2, eenheid: 'teentje' }]);
    assert.equal(verbruikt.length, 1);
    assert.equal(na[0].hoeveelheid, 8);
  });
});
