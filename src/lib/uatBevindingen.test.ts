// WEEK-328: bevindingen uit de UAT van 0.163.0 (inlezen, zelf kiezen, soort, kooktijd).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { koppelIngredient, soortNaWijziging, stam, verwerkRecept, zoekTermVoor } from './receptLink';
import { kooktijdVoorTeLang } from './kooktijd';
import { zoekIngredienten } from './eigenrecepten';

const echteTreffers = (q: string) => zoekIngredienten(q, 'nl').length > 0;

describe('WEEK-328: meervoud met dubbele medeklinker', () => {
  test('sjalotten = sjalot, kippen = kip (stam)', () => {
    assert.equal(stam('sjalotten'), stam('sjalot'));
    assert.equal(stam('kippen'), stam('kip'));
  });
  test('"3 sjalotten (of rode ui)" wordt bij het inlezen sjalot', () => {
    const r = verwerkRecept({ naam: 'x', personen: 1, taal: 'nl', stappen: [], ingredienten: ['3 sjalotten (of rode ui)'] }, 'nl');
    assert.equal(r.ingredienten[0]?.code ?? r.nakijken[0]?.code, 'sjalot');
  });
  test('regressie: bestaande koppelingen blijven gelijk', () => {
    for (const [naam, code] of [['tomaten', 'tomaat'], ['uien', 'ui'], ['citroenen', 'citroen'], ['eieren', 'eieren'], ['look', 'knoflook'], ['spruitjes', 'spruitjes']] as const) {
      const k = koppelIngredient(naam, ['nl']);
      assert.equal(k?.code, code, naam);
    }
  });
});

describe('WEEK-328: zoekterm voor Zelf kiezen (met de echte ingrediëntenlijst)', () => {
  test('sjalotten → sjalot (meervoud), niet het alternatief', () => assert.equal(zoekTermVoor('sjalotten (of rode ui)', echteTreffers), 'sjalot'));
  test('runderbouillon → bouillon (samengesteld woord)', () => assert.equal(zoekTermVoor('runderbouillon', echteTreffers), 'bouillon'));
  test('laurierblaadjes → laurier', () => assert.equal(zoekTermVoor('laurierblaadjes', echteTreffers), 'laurier'));
  test('enkel het alternatief tussen haakjes heeft treffers', () =>
    assert.equal(zoekTermVoor('qwertyz (of rode ui)', (q) => q === 'rode ui'), 'rode ui'));
  test('regressie: een gewoon woord blijft zichzelf', () => assert.equal(zoekTermVoor('wortel', echteTreffers), 'wortel'));
  test('niets gevonden: de kern van de naam', () => assert.equal(zoekTermVoor('verse zzzzwortelxyz', () => false), 'zzzzwortelxyz'));
});

describe('WEEK-328: soort volgt de ingrediënten', () => {
  test('vlees erbij → vlees, zolang de gebruiker niets koos', () => assert.equal(soortNaWijziging('vegetarisch', ['wortel', 'gehakt'], false), 'vlees'));
  test('vis → vis', () => assert.equal(soortNaWijziging('vegetarisch', ['zalm'], false), 'vis'));
  test('zelf gekozen blijft staan', () => assert.equal(soortNaWijziging('vegetarisch', ['gehakt'], true), 'vegetarisch'));
  test('geen vlees of vis → vegetarisch', () => assert.equal(soortNaWijziging('vlees', ['wortel'], false), 'vegetarisch'));
});

describe('WEEK-328: kooktijd van een ingelezen recept van meer dan een uur', () => {
  test('150 min → uitgebreid', () => assert.equal(kooktijdVoorTeLang(150), 'uitgebreid'));
  test('61 min → uitgebreid; 60 min → niets (past al)', () => {
    assert.equal(kooktijdVoorTeLang(61), 'uitgebreid');
    assert.equal(kooktijdVoorTeLang(60), undefined);
  });
  test('onbekend → niets', () => assert.equal(kooktijdVoorTeLang(undefined), undefined));
});
