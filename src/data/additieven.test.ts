import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { additiefInfo, additiefWeergave, eNummer, functieVan } from '@/data/additieven';
import { ADDITIEVEN_OFF } from '@/data/additieven.gegenereerd';

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

  test('WEEK-290: varianten met een Romeins cijfer', () => {
    assert.equal(eNummer('en:e322i'), 'E322I');
    assert.equal(eNummer('en:e420ii'), 'E420II');
    assert.equal(eNummer('en:e440aiv'), 'E440AIV');
    assert.equal(eNummer('en:e163xi'), 'E163XI');
    assert.equal(eNummer('en:e14xx'), 'E14XX');
    assert.equal(additiefWeergave('en:e14xx', 'nl').omschrijving, 'Gemodificeerde zetmelen · verdikkingsmiddel');
  });
});

describe('volledige lijst uit Open Food Facts (WEEK-290)', () => {
  test('E133 en E950 hebben nu een naam en functie', () => {
    assert.deepEqual(additiefWeergave('E133', 'nl'), {
      code: 'E133',
      omschrijving: 'Briljantblauw FCF · kleurstof',
      efsa: { risico: 'matig', jaar: '2010', url: 'https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1853' },
    });
    assert.equal(additiefWeergave('en:e950', 'nl').omschrijving, 'Acesulfaam-K · zoetstof');
    assert.equal(additiefWeergave('en:e950', 'fr').omschrijving, 'Acésulfame K · édulcorant');
  });

  test('een variant zonder eigen regel valt terug op het basisnummer', () => {
    assert.equal(additiefInfo('en:e330i', 'nl')?.naam, 'Citroenzuur'); // E330I staat niet in de lijst, E330 wel
    assert.equal(additiefInfo('en:palm-oil', 'nl'), null); // geen E-nummer
  });

  test('functieVan herkent zoetstoffen', () => {
    for (const code of ['E950', 'E951', 'E955', 'E954', 'E960']) assert.equal(functieVan(code), 'zoetstof', code);
    assert.equal(functieVan('E330'), 'zuurteregelaar');
    assert.equal(functieVan('en:palm-oil'), null);
  });

  test('de lijst is volledig genoeg en elke rij heeft vier namen', () => {
    const rijen = Object.entries(ADDITIEVEN_OFF);
    assert.ok(rijen.length > 600, `${rijen.length} additieven`);
    for (const [code, [namen]] of rijen) {
      assert.match(code, /^E\d{3,4}[A-Z]*$/);
      assert.equal(namen.length, 4, code);
      assert.ok(namen.every((n) => n && !/^E\d/.test(n)), code);
    }
  });
});

describe('additiefWeergave (WEEK-71)', () => {
  test('een bekend additief krijgt naam en functie in de gekozen taal', () => {
    assert.deepEqual(additiefWeergave('en:e322-lecithins', 'nl'), { code: 'E322', omschrijving: 'Lecithine · emulgator' });
    assert.deepEqual(additiefWeergave('en:e322-lecithins', 'fr'), { code: 'E322', omschrijving: 'Lécithines · émulsifiant' });
    assert.equal(additiefWeergave('en:e951', 'en').omschrijving, 'Aspartame · sweetener');
  });

  test('een onbekend E-nummer toont de code met "naam onbekend", zonder verzonnen uitleg (WEEK-290)', () => {
    assert.deepEqual(additiefWeergave('en:e1999-iets', 'nl'), { code: 'E1999', omschrijving: 'naam onbekend' });
    assert.equal(additiefWeergave('en:e1999', 'fr').omschrijving, 'nom inconnu');
  });

  test('een tag zonder E-nummer toont de tag in hoofdletters', () => {
    assert.deepEqual(additiefWeergave('en:palm-oil', 'nl'), { code: 'PALM-OIL', omschrijving: null });
  });

  test('regressie: elk bekend additief heeft een uitleg in alle vier talen', () => {
    for (const code of ['E100', 'E150', 'E160A', 'E200', 'E202', 'E211', 'E300', 'E322', 'E330', 'E407', 'E412', 'E471', 'E621', 'E951', 'E955']) {
      for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
        const w = additiefWeergave(code, taal);
        assert.equal(w.code, code);
        assert.ok(w.omschrijving && w.omschrijving.includes(' · '), `${code} ${taal}`);
      }
    }
  });
});
