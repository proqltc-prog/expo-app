import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FrigoItem, receptFrigo, trekFrigoAf, verbruik, verdeelFrigo } from '@/lib/frigo';
import type { LijstItem } from '@/lib/lijst';
import { frigoScoreNamen } from '@/lib/planner/frigovoorrang';
import { markeerOntbrekend, werkOntbrekendBij } from '@/lib/planner/status';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

// WEEK-158: losse frigo-producten tellen nooit mee voor recepten van de weekplanner.
const NU = new Date('2026-10-24T12:00:00.000Z');

const product = (id: string, naam: string, bron: 'planner' | 'los', hoeveelheid?: number, eenheid?: string): FrigoItem => ({
  id,
  naam,
  afdeling: 'groenten-fruit',
  toegevoegdOp: '2026-10-20T10:00:00.000Z',
  bron,
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
});

const lijstItem = (id: string, naam: string, hoeveelheid: number, eenheid: string): LijstItem => ({
  id,
  naam,
  categorie: 'avondeten',
  afgevinkt: false,
  hoeveelheid,
  eenheid,
  afdeling: 'groenten-fruit',
});

const dag = (naam: string, ingredienten: { naam: string; hoeveelheid: number; eenheid: string }[], ontbreekt?: string[]): PlanDag => ({
  dag: 'maandag',
  recept: {
    id: naam,
    naam,
    soort: 'vegetarisch',
    minuten: 20,
    stijlen: ['italiaans'],
    ingredienten: ingredienten.map((i) => ({ ...i, afdeling: 'groenten-fruit' as const })),
  },
  ...(ontbreekt ? { ontbreekt } : {}),
});

const plan = (...dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 1,
  bron: 'lokaal',
  gemaaktOp: NU.toISOString(),
} as Weekplan);

describe('receptFrigo: enkel planner-producten (WEEK-158)', () => {
  test('houdt enkel de producten van de planner over', () => {
    const frigo = [product('p', 'tomaat', 'planner', 500, 'g'), product('l', 'tomaat', 'los', 500, 'g')];
    assert.deepEqual(receptFrigo(frigo).map((f) => f.id), ['p']);
  });
});

describe('verdeelFrigo: losse producten dekken geen recept (WEEK-158)', () => {
  test('een los product met dezelfde naam dekt de behoefte niet', () => {
    const [d] = verdeelFrigo([{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }], [product('l', 'tomaat', 'los', 500, 'g')]);
    assert.equal(d.gedekt, 'niet');
  });
  test('regressie: een planner-product dekt de behoefte wel', () => {
    const [d] = verdeelFrigo([{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }], [product('p', 'tomaat', 'planner', 500, 'g')]);
    assert.equal(d.gedekt, 'geheel');
  });
});

describe('trekFrigoAf: de boodschappenlijst houdt geen rekening met losse producten (WEEK-158)', () => {
  test('een los product haalt niets van de lijst af', () => {
    const lijst = [lijstItem('l1', 'tomaat', 300, 'g')];
    assert.deepEqual(trekFrigoAf(lijst, [product('l', 'tomaat', 'los', 500, 'g')]).map((i) => i.hoeveelheid), [300]);
  });
  test('regressie: een planner-product trekt wel af (deels gedekt)', () => {
    const lijst = [lijstItem('l1', 'tomaat', 300, 'g')];
    assert.deepEqual(trekFrigoAf(lijst, [product('p', 'tomaat', 'planner', 200, 'g')]).map((i) => i.hoeveelheid), [100]);
  });
});

describe('frigoScoreNamen: losse producten geven geen voorrang (WEEK-158)', () => {
  test('een los product scoort niet', () => {
    assert.equal(frigoScoreNamen(['tomaat'], [product('l', 'tomaat', 'los')], NU), 0);
  });
  test('regressie: een planner-product scoort', () => {
    assert.ok(frigoScoreNamen(['tomaat'], [product('p', 'tomaat', 'planner')], NU) > 0);
  });
});

describe('status "ingrediënt ontbreekt": losse producten tellen niet mee (WEEK-158)', () => {
  test('een verwijderd los product maakt geen ingrediënt ontbrekend', () => {
    const p = plan(dag('Pasta', [{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }]));
    const na = markeerOntbrekend(p, [product('l', 'tomaat', 'los', 500, 'g')], []);
    assert.equal(na.dagen[0].ontbreekt, undefined);
  });
  test('regressie: een verwijderd planner-product zonder rest maakt het ingrediënt ontbrekend', () => {
    const p = plan(dag('Pasta', [{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }, { naam: 'ui', hoeveelheid: 100, eenheid: 'g' }]));
    const na = markeerOntbrekend(p, [product('p', 'tomaat', 'planner', 500, 'g')], []);
    assert.deepEqual(na.dagen[0].ontbreekt, ['tomaat']);
  });
  test('een ontbrekend ingrediënt wordt niet opgeheven door een los product', () => {
    const p = plan(dag('Pasta', [{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }], ['tomaat']));
    const na = werkOntbrekendBij(p, [product('l', 'tomaat', 'los', 500, 'g')]);
    assert.deepEqual(na.dagen[0].ontbreekt, ['tomaat']);
  });
  test('regressie: opnieuw gekocht als planner-product heft het ontbreken op', () => {
    const p = plan(dag('Pasta', [{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }], ['tomaat']));
    const na = werkOntbrekendBij(p, [product('p', 'tomaat', 'planner', 500, 'g')]);
    assert.equal(na.dagen[0].ontbreekt, undefined);
  });
});

describe('koken blijft kloppen (WEEK-158, regressie)', () => {
  test('verbruik gebruikt enkel planner-producten', () => {
    const frigo = [product('l', 'tomaat', 'los', 500, 'g'), product('p', 'tomaat', 'planner', 500, 'g')];
    const uit = verbruik(frigo, [{ naam: 'tomaat', hoeveelheid: 300, eenheid: 'g' }]);
    assert.deepEqual(uit.verbruikt.map((f) => f.id), ['p']);
    assert.ok(uit.frigo.some((f) => f.id === 'l' && f.hoeveelheid === 500));
  });
});
