import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { additiefWeergave, eNummer } from '@/data/additieven';

describe('eNummer (WEEK-71)', () => {
  test('haalt het E-nummer uit een Open Food Facts-tag', () => {
    assert.equal(eNummer('en:e322-lecithins'), 'E322');
    assert.equal(eNummer('en:e160a-beta-carotene'), 'E160A');
    assert.equal(eNummer('E471'), 'E471');
    assert.equal(eNummer('e1520'), 'E1520');
  });

  test('geen E-nummer geeft null', () => {
    assert.equal(eNummer('en:palm-oil'), null);
    assert.equal(eNummer(''), null);
    assert.equal(eNummer('en:e160abc'), null);
  });
});

describe('additiefWeergave (WEEK-71)', () => {
  test('een bekend additief krijgt naam en functie in de gekozen taal', () => {
    assert.deepEqual(additiefWeergave('en:e322-lecithins', 'nl'), { code: 'E322', omschrijving: 'Lecithine · emulgator' });
    assert.deepEqual(additiefWeergave('en:e322-lecithins', 'fr'), { code: 'E322', omschrijving: 'Lécithines · émulsifiant' });
    assert.equal(additiefWeergave('en:e951', 'en').omschrijving, 'Aspartame · sweetener');
  });

  test('een onbekend E-nummer toont de code zonder verzonnen uitleg', () => {
    assert.deepEqual(additiefWeergave('en:e999-iets', 'nl'), { code: 'E999', omschrijving: null });
  });

  test('een tag zonder E-nummer toont de tag in hoofdletters', () => {
    assert.deepEqual(additiefWeergave('en:palm-oil', 'nl'), { code: 'PALM-OIL', omschrijving: null });
  });

  test('regressie: elk bekend additief heeft een uitleg in alle zes talen', () => {
    for (const code of ['E100', 'E150', 'E160A', 'E200', 'E202', 'E211', 'E300', 'E322', 'E330', 'E407', 'E412', 'E471', 'E621', 'E951', 'E955']) {
      for (const taal of ['nl', 'fr', 'de', 'en', 'es', 'pt'] as const) {
        const w = additiefWeergave(code, taal);
        assert.equal(w.code, code);
        assert.ok(w.omschrijving && w.omschrijving.includes(' · '), `${code} ${taal}`);
      }
    }
  });
});
