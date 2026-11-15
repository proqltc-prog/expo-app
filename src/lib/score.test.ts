import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { additievenGekend, berekenScore, DREMPELS, ENERGIEARM_KCAL, labelVoor, niveauVan, ontbrekendeGegevens, PLAFOND, PUNTEN } from '@/lib/score';
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
    // suikers hoog −25, vet midden −10, verzadigd midden −10, zout midden −10, NOVA 4 −25 (WEEK-295)
    assert.equal(o.score, 20);
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

  test('cola: suikers midden (−10) en NOVA 4 (−25) geven 65, maar ultrabewerkt is hoogstens 49 (WEEK-295)', () => {
    const o = berekenScore({ ...basis, suikers: 10.6, nova: 4 }, true);
    assert.equal(o.score, PLAFOND.nova4);
    assert.equal(o.label, 'matig');
    assert.deepEqual(o.plafond, { reden: 'nova4', max: 49 });
  });
});

describe('berekenScore: additieven, streng (WEEK-295)', () => {
  const vol: Product = { ...basis, vet: 0, verzadigd: 0, suikers: 0, zout: 0.16, nova: 4, ingredientenBekend: true };

  test('acceptatie: Monster Ultra Paradise met E102 (zoals bij Yuka) geeft 0', () => {
    const o = berekenScore({ ...vol, additieven: ['E102', 'E133', 'E14XX', 'E202', 'E211', 'E330', 'E331', 'E334', 'E950', 'E955'] }, true);
    assert.equal(o.score, 0);
    assert.equal(o.label, 'slecht');
    assert.equal(o.onvoldoende, undefined);
  });

  test('acceptatie: dezelfde drank zonder E102 in de gegevens geeft ook 0', () => {
    assert.equal(berekenScore({ ...vol, additieven: ['E133', 'E14XX', 'E202', 'E211', 'E330', 'E331', 'E950', 'E955'] }, true).score, 0);
  });

  test('elk additief kost 5; een onschuldig additief enkel dat', () => {
    assert.equal(berekenScore({ ...vol, nova: 3, additieven: ['E300'] }, false).score, 95);
    assert.equal(berekenScore({ ...vol, nova: 1, additieven: [] }, false).score, 100);
  });

  test('zoetstof: −5 als additief en −15 als zoetstof, in elk product', () => {
    const o = berekenScore({ ...vol, nova: 3, additieven: ['E950'] }, false);
    assert.equal(o.score, 80);
    assert.deepEqual(o.redenen.map((r) => r.code), ['additief', 'zoetstof']);
  });

  test('EFSA matig −10 extra, EFSA hoog −15 extra en hoogstens 39', () => {
    assert.equal(berekenScore({ ...vol, nova: 3, additieven: ['E133'] }, false).score, 85); // −5 −10
    const hoog = berekenScore({ ...vol, nova: 3, additieven: ['E211'] }, false); // −5 −15 = 80, plafond 39
    assert.equal(hoog.score, 39);
    assert.equal(hoog.plafond?.reden, 'efsaHoog');
  });

  test('EU-waarschuwing: −25 extra en hoogstens 25', () => {
    const o = berekenScore({ ...vol, nova: 3, additieven: ['E102'] }, false); // −5 −25 = 70, plafond 25
    assert.equal(o.score, 25);
    assert.equal(o.plafond?.reden, 'additiefEu');
  });

  test('verboden in de EU: score 0, ongeacht de rest', () => {
    const o = berekenScore({ ...vol, nova: 1, additieven: ['en:e171'] }, false);
    assert.equal(o.score, 0);
    assert.deepEqual(o.plafond, { reden: 'verboden', max: 0 });
  });

  test('het strengste plafond telt', () => {
    assert.equal(berekenScore({ ...vol, nova: 1, additieven: ['E211', 'E102'] }, false).plafond?.reden, 'additiefEu'); // 50, plafond 25 gaat voor 39
  });

  test('een dubbel E-nummer telt één keer', () => {
    assert.equal(berekenScore({ ...vol, nova: 3, additieven: ['E300', 'en:e300-ascorbic-acid'] }, false).score, 95);
  });

  test('een plafond wordt enkel vermeld als het de score verlaagt', () => {
    const o = berekenScore({ ...vol, suikers: 30, vet: 20, nova: 4, additieven: [] }, false); // −25 −25 −25 +10 (geen additieven) = 35
    assert.equal(o.score, 35);
    assert.equal(o.plafond, undefined);
  });

  test('regressie: de punten en plafonds staan zoals afgesproken', () => {
    assert.deepEqual(PUNTEN, { midden: -10, hoog: -25, nova4: -25, vezels: 5, eiwit: 5, additief: -5, efsaMatig: -10, efsaHoog: -15, additiefEu: -25, zoetstof: -15, geenAdditieven: 10, nova1: 5, energiearm: 5 });
    assert.deepEqual(PLAFOND, { verboden: 0, additiefEu: 25, efsaHoog: 39, nova4: 49 });
  });
});

describe('niet genoeg gegevens (WEEK-295)', () => {
  const vol: Product = { ...basis, vet: 1, suikers: 1, zout: 0.1, nova: 1, ingredientenBekend: true };

  test('met NOVA, ingrediënten en vet/suikers/zout: genoeg gegevens', () => {
    assert.deepEqual(ontbrekendeGegevens(vol), []);
    assert.equal(berekenScore(vol, false).onvoldoende, undefined);
  });

  test('zonder NOVA, zonder ingrediënten of zonder voedingswaarden: geen score', () => {
    assert.deepEqual(ontbrekendeGegevens({ ...vol, nova: undefined }), ['nova']);
    assert.deepEqual(ontbrekendeGegevens({ ...vol, ingredientenBekend: false }), ['ingredienten']);
    assert.deepEqual(ontbrekendeGegevens({ ...vol, zout: undefined }), ['voeding']);
    assert.deepEqual(berekenScore({ ...vol, nova: undefined, ingredientenBekend: false }, true).onvoldoende, ['nova', 'ingredienten']);
  });

  test('WEEK-296: een oud bewaard product zonder het veld ingredientenBekend telt als niet gekend', () => {
    assert.deepEqual(ontbrekendeGegevens({ ...vol, ingredientenBekend: undefined }), ['ingredienten']);
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

describe('bonussen (WEEK-296)', () => {
  // Volle kefir als drank: vet 3,5 (midden), verzadigd 2,6 (hoog), suikers 4 (midden), zout laag, veel eiwit.
  const kefir: Product = { ...basis, nova: 1, ingredientenBekend: true, kcal: 62, vet: 3.5, verzadigd: 2.6, suikers: 4, zout: 0.1, eiwitten: 3.5, additieven: [] };

  test('acceptatie: volle kefir zonder additieven, NOVA 1 gaat van 60 naar 75', () => {
    const o = berekenScore(kefir, true); // −10 −25 −10 +5 (eiwit) +5 (NOVA 1) +10 (geen additieven)
    assert.equal(o.score, 75);
    assert.equal(o.label, 'goed');
    assert.ok(o.redenen.some((r) => r.code === 'geenAdditieven'));
    assert.ok(o.redenen.some((r) => r.code === 'nova1'));
  });

  test('geen bonus voor geen additieven als er één additief is', () => {
    assert.ok(!berekenScore({ ...kefir, additieven: ['E300'] }, true).redenen.some((r) => r.code === 'geenAdditieven'));
  });

  test('energiearm volgens de EU: hoogstens 20 kcal per 100 ml (drank) of 40 kcal per 100 g', () => {
    assert.deepEqual(ENERGIEARM_KCAL, { voeding: 40, drank: 20 });
    assert.ok(berekenScore({ ...kefir, kcal: 20 }, true).redenen.some((r) => r.code === 'energiearm'));
    assert.ok(!berekenScore({ ...kefir, kcal: 21 }, true).redenen.some((r) => r.code === 'energiearm'));
    assert.ok(berekenScore({ ...kefir, kcal: 40 }, false).redenen.some((r) => r.code === 'energiearm'));
  });

  test('de score blijft hoogstens 100', () => {
    assert.equal(berekenScore({ ...basis, nova: 1, ingredientenBekend: true, kcal: 10, vet: 0, verzadigd: 0, suikers: 0, zout: 0, additieven: [] }, true).score, 100);
  });

  test('zonder NOVA of ingrediëntenlijst: niet genoeg gegevens, ook al zijn er geen additieven', () => {
    assert.deepEqual(berekenScore({ ...kefir, nova: undefined }, true).onvoldoende, ['nova']);
    assert.deepEqual(berekenScore({ ...kefir, ingredientenBekend: false }, true).onvoldoende, ['ingredienten']);
  });
});

describe('additievenGekend (WEEK-296)', () => {
  const basis = { barcode: '1', naam: 'x', additieven: [] } as unknown as Product;
  test('met ingrediëntenlijst zijn de additieven gekend, ook als er geen zijn', () => {
    assert.equal(additievenGekend({ ...basis, ingredientenBekend: true }), true);
  });
  test('zonder ingrediëntenlijst zijn de additieven niet gekend (geen "Additieven (0)")', () => {
    assert.equal(additievenGekend({ ...basis, ingredientenBekend: false }), false);
  });
  test('een oud bewaard product zonder het veld telt als niet gekend', () => {
    assert.equal(additievenGekend({ ...basis }), false);
  });
});
