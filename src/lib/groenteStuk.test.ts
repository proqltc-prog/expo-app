import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eenheidVan, gewichtPerStuk } from '@/data/ingredienten';
import { FrigoItem, verbruik } from '@/lib/frigo';

// WEEK-161: groenten en fruit die je per stuk koopt, staan op stuk. Oude producten in gram koppelen via het stukgewicht.
const OUD = '2026-10-01T10:00:00.000Z';
const f = (id: string, naam: string, hoeveelheid?: number, eenheid?: string, code?: string): FrigoItem => ({
  id,
  naam,
  afdeling: 'groenten-fruit',
  toegevoegdOp: OUD,
  bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
  ...(code ? { code } : {}),
});

describe('groenten en fruit op stuk (WEEK-161)', () => {
  test('telbare groenten en fruit staan op stuk; pompoen en rijst blijven op gram', () => {
    assert.equal(eenheidVan('ui'), 'stuk');
    assert.equal(eenheidVan('citroen'), 'stuk');
    assert.equal(eenheidVan('rijst'), 'g');
    assert.equal(eenheidVan('aardappelen'), 'g');
  });

  test('het stukgewicht is bekend voor de telbare items, niet voor de rest', () => {
    assert.equal(gewichtPerStuk('ui'), 150);
    assert.equal(gewichtPerStuk('tomaten'), 120, 'via de catalogus-code');
    assert.equal(gewichtPerStuk('rijst'), undefined);
  });
});

describe('oude frigo-items in gram koppelen aan recepten op stuk (WEEK-161)', () => {
  test('500 g tomaat in de frigo, recept met 2 stuk tomaat: 240 g gaat eraf, 260 g blijft', () => {
    const { frigo, verbruikt } = verbruik([f('t', 'tomaat', 500, 'g', 'tomaat')], [{ naam: 'tomaat', code: 'tomaat', hoeveelheid: 2, eenheid: 'stuk' }]);
    assert.equal(verbruikt[0].hoeveelheid, 240);
    assert.equal(frigo[0].hoeveelheid, 260);
  });

  test('3 stuk ui in de frigo, recept met 200 g ui: 1,33 stuk gaat eraf', () => {
    const { frigo } = verbruik([f('u', 'ui', 3, 'stuk', 'ui')], [{ naam: 'ui', code: 'ui', hoeveelheid: 200, eenheid: 'g' }]);
    assert.equal(frigo[0].hoeveelheid, 1.67);
  });
});
