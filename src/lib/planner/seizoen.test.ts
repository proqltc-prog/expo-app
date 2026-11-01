import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { seizoenenVoorIngredienten, seizoenPasst, seizoenVan } from '@/lib/planner/seizoen';

describe('seizoenVan (WEEK-156)', () => {
  test('meteorologische seizoenen per maand', () => {
    assert.equal(seizoenVan('2026-03-01'), 'lente');
    assert.equal(seizoenVan('2026-05-31'), 'lente');
    assert.equal(seizoenVan('2026-06-01'), 'zomer');
    assert.equal(seizoenVan('2026-08-31'), 'zomer');
    assert.equal(seizoenVan('2026-09-01'), 'herfst');
    assert.equal(seizoenVan('2026-11-30'), 'herfst');
    assert.equal(seizoenVan('2026-12-01'), 'winter');
    assert.equal(seizoenVan('2026-02-28'), 'winter');
  });
  test('ongeldige of ontbrekende datum geeft geen seizoen', () => {
    assert.equal(seizoenVan(undefined), undefined);
    assert.equal(seizoenVan(''), undefined);
    assert.equal(seizoenVan('23-10-2026'), undefined);
  });
});

describe('seizoenenVoorIngredienten (WEEK-156)', () => {
  test('één seizoensproduct geeft zijn seizoenen', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['tomaat']), ['zomer']);
    assert.deepEqual(seizoenenVoorIngredienten(['asperges']), ['lente']);
  });
  test('meerdere seizoensproducten: enkel de gemeenschappelijke seizoenen', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['rode_chili', 'tomaat']), ['zomer']);
    assert.deepEqual(seizoenenVoorIngredienten(['pompoen', 'prei']), ['herfst', 'winter']);
  });
  test('seizoensproducten zonder gemeenschappelijk seizoen geven het hele jaar', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['tomaat', 'spruitjes']), []);
  });
  test('geen seizoensproducten (ui, kip, pasta) geven het hele jaar', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['ui', 'kipfilet', 'pasta_penne']), []);
    assert.deepEqual(seizoenenVoorIngredienten([]), []);
  });
  test('seizoensproducten en niet-seizoensproducten samen tellen enkel de seizoensproducten', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['ui', 'courgette', 'knoflook']), ['zomer']);
  });
  test('volgorde van de uitkomst is altijd lente, zomer, herfst, winter', () => {
    assert.deepEqual(seizoenenVoorIngredienten(['rode_chili', 'braam']), ['zomer', 'herfst']);
  });
});

describe('seizoenPasst (WEEK-156)', () => {
  test('een recept zonder seizoen past in elk seizoen (het hele jaar)', () => {
    assert.equal(seizoenPasst([], 'winter'), true);
    assert.equal(seizoenPasst(undefined, 'zomer'), true);
  });
  test('een recept met seizoen past enkel in dat seizoen', () => {
    assert.equal(seizoenPasst(['zomer'], 'zomer'), true);
    assert.equal(seizoenPasst(['zomer'], 'winter'), false);
    assert.equal(seizoenPasst(['zomer', 'herfst'], 'herfst'), true);
  });
});
