import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { frigoPerGerecht, GEEN_GERECHT } from '@/lib/frigoPerGerecht';
import { frigoSecties, FrigoItem } from '@/lib/frigo';
import type { PlanDag } from '@/lib/planner/types';

const item = (id: string, naam: string, eenheid = 'g', hoeveelheid = 100): FrigoItem => ({
  id, naam, eenheid, hoeveelheid, afdeling: 'overig', toegevoegdOp: '2026-11-14T10:00:00.000Z', bron: 'planner',
});
const dag = (d: PlanDag['dag'], naam: string, ingredienten: string[]): PlanDag => ({
  dag: d,
  bevestigd: true,
  recept: { id: naam, naam, soort: 'vlees', minuten: 20, stijlen: [], ingredienten: ingredienten.map((n) => ({ naam: n, hoeveelheid: 100, eenheid: 'g' })) },
});

describe('WEEK-287: In huis per gerecht', () => {
  test('producten staan bij het gerecht dat ze nodig heeft, in de volgorde van het weekmenu', () => {
    const frigo = [item('1', 'Prei'), item('2', 'Zalm'), item('3', 'Witvis')];
    const g = frigoPerGerecht(frigo, [dag('zondag', 'Zalm met prei', ['Zalm', 'Prei']), dag('maandag', 'Witvis', ['Witvis', 'Prei'])]);
    assert.deepEqual(g.map((x) => x.recept?.naam), ['Zalm met prei', 'Witvis']);
    assert.deepEqual(g[0].regels.map((r) => r.naam).sort(), ['Prei', 'Zalm']);
    assert.deepEqual(g[1].regels.map((r) => r.naam).sort(), ['Prei', 'Witvis']);
  });
  test('wat bij geen gerecht past, staat achteraan', () => {
    const g = frigoPerGerecht([item('1', 'Prei'), item('2', 'Rijst')], [dag('zondag', 'Prei', ['Prei'])]);
    assert.equal(g.at(-1)?.sleutel, GEEN_GERECHT);
    assert.deepEqual(g.at(-1)?.regels.map((r) => r.naam), ['Rijst']);
  });
  test('zonder gerechten: alles in één groep; leeg huis: geen groepen', () => {
    assert.deepEqual(frigoPerGerecht([item('1', 'Prei')], []).map((x) => x.sleutel), [GEEN_GERECHT]);
    assert.deepEqual(frigoPerGerecht([], [dag('zondag', 'Prei', ['Prei'])]), []);
  });
  test('een gerecht zonder producten in huis valt weg; sleutels zijn uniek', () => {
    const g = frigoPerGerecht([item('1', 'Prei')], [dag('zondag', 'A', ['Zalm']), dag('maandag', 'B', ['Prei']), dag('dinsdag', 'B', ['Prei'])]);
    assert.deepEqual(g.map((x) => x.dag), ['maandag', 'dinsdag']);
    assert.equal(new Set(g.map((x) => x.sleutel)).size, g.length);
  });
  test('regressie: hoeveelheden worden samengeteld zoals per categorie', () => {
    const frigo = [item('1', 'Prei', 'g', 100), item('2', 'Prei', 'g', 50)];
    const g = frigoPerGerecht(frigo, [dag('zondag', 'Prei', ['Prei'])]);
    assert.equal(g[0].regels[0].hoeveelheid, 150);
    assert.equal(frigoSecties(frigo)[0].regels[0].hoeveelheid, 150);
  });
});
