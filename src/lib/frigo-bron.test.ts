import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FrigoItem, frigoBron, normaliseerFrigo, verbruik, voegZelfToe } from '@/lib/frigo';

const nu = new Date('2026-10-18T10:00:00Z');
const item = (over: Partial<FrigoItem>): FrigoItem => ({
  id: 'x',
  naam: 'Kipfilet',
  hoeveelheid: 500,
  eenheid: 'g',
  afdeling: 'overig',
  toegevoegdOp: nu.toISOString(),
  ...over,
});

describe('frigoBron (WEEK-71)', () => {
  test('een expliciete soort wint', () => {
    assert.equal(frigoBron(item({ bron: 'los', lijstId: 'l1' })), 'los');
    assert.equal(frigoBron(item({ bron: 'planner' })), 'planner');
  });
  test('oude items: uit de boodschappenlijst is planner, de rest is los', () => {
    assert.equal(frigoBron(item({ lijstId: 'l1' })), 'planner');
    assert.equal(frigoBron(item({})), 'los');
  });
});

describe('vrij toevoegen maakt losse producten', () => {
  test('zelf ingegeven product is los', () => {
    const [p] = voegZelfToe([], 'Mijn eigen jam', nu);
    assert.equal(p.bron, 'los');
  });
  test('met expliciete soort planner blijft planner', () => {
    const [p] = voegZelfToe([], 'Kipfilet', nu, { bron: 'planner' });
    assert.equal(p.bron, 'planner');
  });
});

describe('verbruik telt alleen de planner-frigo mee', () => {
  const ingredient = [{ naam: 'Kipfilet', hoeveelheid: 300, eenheid: 'g' }];
  test('een planner-item gaat weg bij koken', () => {
    const resultaat = verbruik([item({ bron: 'planner' })], ingredient);
    assert.equal(resultaat.frigo.length, 1);
    assert.equal(resultaat.frigo[0].hoeveelheid, 200);
    assert.equal(resultaat.verbruikt.length, 1);
  });
  test('een los product met dezelfde naam blijft staan', () => {
    const resultaat = verbruik([item({ bron: 'los' })], ingredient);
    assert.deepEqual(resultaat.frigo.map((f) => f.hoeveelheid), [500]);
    assert.deepEqual(resultaat.verbruikt, []);
  });
  test('bij gemengde frigo wordt enkel het planner-item aangesproken', () => {
    const frigo = [item({ id: 'los', bron: 'los', hoeveelheid: 500 }), item({ id: 'pl', bron: 'planner', hoeveelheid: 500 })];
    const resultaat = verbruik(frigo, ingredient);
    assert.equal(resultaat.frigo.find((f) => f.id === 'los')?.hoeveelheid, 500);
    assert.equal(resultaat.frigo.find((f) => f.id === 'pl')?.hoeveelheid, 200);
  });
  test('oude items met lijstId blijven meetellen (regressie)', () => {
    const resultaat = verbruik([item({ lijstId: 'l1', hoeveelheid: 300 })], ingredient);
    assert.equal(resultaat.frigo.length, 0);
    assert.equal(resultaat.verbruikt.length, 1);
  });
});

describe('normaliseerFrigo bewaart de soort', () => {
  test('een geldige soort blijft behouden', () => {
    const [p] = normaliseerFrigo([{ id: 'a', naam: 'Ui', afdeling: 'overig', toegevoegdOp: nu.toISOString(), bron: 'los' }]);
    assert.equal(p.bron, 'los');
  });
  test('een ongeldige soort wordt weggelaten en afgeleid', () => {
    const [p] = normaliseerFrigo([{ id: 'a', naam: 'Ui', afdeling: 'overig', toegevoegdOp: nu.toISOString(), bron: 'onzin' }]);
    assert.equal(p.bron, undefined);
    assert.equal(frigoBron(p), 'los');
  });
});
