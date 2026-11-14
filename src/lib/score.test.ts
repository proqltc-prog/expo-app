import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { berekenScore, DREMPELS, labelVoor, niveauVan, PLAFOND, PUNTEN } from '@/lib/score';
import type { Product } from '@/lib/openfoodfacts';

const basis: Product = { barcode: '1', naam: 'Test', additieven: [] };

describe('niveauVan (officiële drempels)', () => {
  test('voeding: grenzen horen bij het lagere niveau', () => {
    assert.equal(niveauVan('suikers', 5, false), 'laag');
    assert.equal(niveauVan('suikers', 5.1, false), 'midden');
    assert.equal(niveauVan('suikers', 22.5, false), 'midden');
    assert.equal(niveauVan('suikers', 22.6, false), 'hoog');
    assert.equal(niveauVan('zout', 1.5, false), 'midden');
    assert.equal(niveauVan('zout', 1.6, false), 'hoog');
    assert.equal(niveauVan('verzadigd', 5, false), 'midden');
    assert.equal(niveauVan('vet', 17.6, false), 'hoog');
  });

  test('drank heeft strengere grenzen per 100 ml', () => {
    assert.equal(niveauVan('suikers', 2.5, true), 'laag');
    assert.equal(niveauVan('suikers', 11.25, true), 'midden');
    assert.equal(niveauVan('suikers', 11.3, true), 'hoog');
    assert.equal(niveauVan('zout', 0.75, true), 'midden');
    assert.equal(niveauVan('vet', 8.8, true), 'hoog');
  });

  test('de drempels staan zoals in de bron (regressie)', () => {
    assert.deepEqual(DREMPELS.voeding, { vet: [3, 17.5], verzadigd: [1.5, 5], suikers: [5, 22.5], zout: [0.3, 1.5] });
    assert.deepEqual(DREMPELS.drank, { vet: [1.5, 8.75], verzadigd: [0.75, 2.5], suikers: [2.5, 11.25], zout: [0.3, 0.75] });
  });
});

describe('berekenScore', () => {
  test('zonder gegevens geen aftrek: 100', () => {
    const o = berekenScore(basis, false);
    assert.equal(o.score, 100);
    assert.deepEqual(o.redenen, []);
  });

  test('alles laag geeft 100 en geen redenen', () => {
    const o = berekenScore({ ...basis, vet: 1, verzadigd: 0.5, suikers: 2, zout: 0.1 }, false);
    assert.equal(o.score, 100);
    assert.equal(o.label, 'goed');
  });

  test('voorbeeld: koekje met veel suikers en NOVA 4', () => {
    const o = berekenScore({ ...basis, vet: 12, verzadigd: 3, suikers: 25, zout: 0.5, nova: 4, vezels: 2, eiwitten: 6, kcal: 450 }, false);
    // suikers hoog −25, vet midden −10, verzadigd midden −10, zout midden −10, NOVA 4 −20 (WEEK-290)
    assert.equal(o.score, 25);
    assert.equal(o.label, 'slecht');
    assert.deepEqual(o.redenen.map((r) => r.code), ['vetMidden', 'verzadigdMidden', 'suikersHoog', 'zoutMidden', 'nova4']);
    assert.deepEqual(o.redenen.find((r) => r.code === 'suikersHoog'), { code: 'suikersHoog', punten: -25, waarde: 25 });
  });

  test('onbekende waarden worden niet geschat', () => {
    const o = berekenScore({ ...basis, suikers: undefined, zout: 2 }, false);
    assert.deepEqual(o.redenen.map((r) => r.code), ['zoutHoog']);
    assert.equal(o.score, 100 + PUNTEN.hoog);
  });

  test('veel vezels (vanaf 6 g) en veel eiwit (vanaf 20 % van de energie) geven +5, maximaal 100', () => {
    const o = berekenScore({ ...basis, vet: 5, vezels: 6, eiwitten: 25, kcal: 400 }, false); // vet midden −10, +5, +5
    assert.equal(o.score, 100);
    assert.ok(o.redenen.some((r) => r.code === 'vezels'));
    assert.ok(o.redenen.some((r) => r.code === 'eiwit'));
    assert.equal(berekenScore({ ...basis, vezels: 5.9 }, false).redenen.length, 0);
  });

  test('eiwit: precies 20 % van de energie telt; 19 % en onbekende calorieën niet', () => {
    assert.ok(berekenScore({ ...basis, eiwitten: 20, kcal: 400 }, false).redenen.some((r) => r.code === 'eiwit')); // 80/400 = 20 %
    assert.equal(berekenScore({ ...basis, eiwitten: 19, kcal: 400 }, false).redenen.length, 0);
    assert.equal(berekenScore({ ...basis, eiwitten: 30 }, false).redenen.length, 0);
  });

  test('de score zakt nooit onder 0', () => {
    const o = berekenScore({ ...basis, vet: 30, verzadigd: 15, suikers: 50, zout: 5, nova: 4 }, false);
    assert.equal(o.score, 0);
  });

  test('cola: suikers midden (−10) en NOVA 4 (−20) geven 70, maar ultrabewerkt is nooit "goed" (WEEK-290)', () => {
    const o = berekenScore({ ...basis, suikers: 10.6, nova: 4 }, true);
    assert.equal(o.score, PLAFOND.nova4);
    assert.equal(o.label, 'matig');
    assert.deepEqual(o.plafond, { reden: 'nova4', max: 64 });
  });
});

describe('berekenScore: additieven (WEEK-290)', () => {
  // Monster Ultra Paradise zoals Open Food Facts het gaf: alles laag, NOVA 4, E102, E133, E950, E955.
  const monster: Product = { ...basis, vet: 0, verzadigd: 0, suikers: 0, zout: 0.2, nova: 4, additieven: ['E102', 'E133', 'E950', 'E955'] };

  test('acceptatie: Monster Ultra Paradise geeft 39, slecht (was 85, goed)', () => {
    const o = berekenScore(monster, true);
    // NOVA 4 −20, E102 EU-waarschuwing −15, E133 EFSA matig −5, zoetstof in drank −10 = 50, plafond 39
    assert.deepEqual(o.redenen.map((r) => [r.code, r.additief ?? '']), [['nova4', ''], ['additiefEu', 'E102'], ['efsaRisico', 'E133'], ['zoetstofDrank', '']]);
    assert.equal(o.score, 39);
    assert.equal(o.label, 'slecht');
    assert.deepEqual(o.plafond, { reden: 'additiefEu', max: 39 });
  });

  test('zoetstoffen tellen enkel bij een drank, en maar één keer', () => {
    assert.equal(berekenScore({ ...basis, additieven: ['E950', 'E955'] }, true).score, 90);
    assert.equal(berekenScore({ ...basis, additieven: ['E950', 'E955'] }, false).score, 100);
  });

  test('een additief dat niet meer toegelaten is telt zoals een EU-waarschuwing', () => {
    const o = berekenScore({ ...basis, additieven: ['en:e171'] }, false);
    assert.equal(o.score, 39);
    assert.equal(o.plafond?.reden, 'additiefEu');
  });

  test('een dubbel E-nummer telt één keer; een gewoon additief kost niets', () => {
    assert.equal(berekenScore({ ...basis, additieven: ['E102', 'en:e102-tartrazine'] }, false).redenen.length, 1);
    assert.equal(berekenScore({ ...basis, additieven: ['E330', 'E322'] }, false).score, 100);
  });

  test('een plafond wordt enkel vermeld als het de score verlaagt', () => {
    const o = berekenScore({ ...basis, suikers: 30, vet: 20, nova: 4 }, false); // −25 −25 −20 = 30
    assert.equal(o.score, 30);
    assert.equal(o.plafond, undefined);
  });

  test('regressie: de punten staan zoals afgesproken', () => {
    assert.deepEqual(PUNTEN, { midden: -10, hoog: -25, nova4: -20, vezels: 5, eiwit: 5, additiefEu: -15, efsaRisico: -5, zoetstofDrank: -10 });
    assert.deepEqual(PLAFOND, { nova4: 64, additiefEu: 39 });
  });
});

describe('labelVoor (regressie: grenzen ongewijzigd)', () => {
  test('65 = goed, 64 = matig, 40 = matig, 39 = slecht', () => {
    assert.equal(labelVoor(65), 'goed');
    assert.equal(labelVoor(64), 'matig');
    assert.equal(labelVoor(40), 'matig');
    assert.equal(labelVoor(39), 'slecht');
  });
});
