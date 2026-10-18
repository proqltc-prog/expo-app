import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FrigoItem } from '@/lib/frigo';
import { zetGedaan } from '@/lib/planner/gedaan';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { Weekplan } from '@/lib/planner/types';

const plan: Weekplan = {
  dagen: [
    { dag: 'zondag', recept: { id: 'p', naam: 'Pasta pesto', soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [
      { naam: 'pasta', hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' },
      { naam: 'pesto', hoeveelheid: 120, eenheid: 'g', afdeling: 'conserven-sauzen' },
    ] } },
    { dag: 'maandag', recept: { id: 'o', naam: 'Omelet', soort: 'vegetarisch', minuten: 15, stijlen: [], ingredienten: [
      { naam: 'eieren', hoeveelheid: 6, eenheid: 'stuk', afdeling: 'zuivel-eieren' },
    ] } },
  ],
  kooktijden: [], stijlen: [], taal: 'nl', porties: 3, bron: 'lokaal', gemaaktOp: '2026-10-10T10:00:00.000Z',
};
const frigo: FrigoItem[] = [
  { id: 'a', naam: 'pasta', hoeveelheid: 500, eenheid: 'g', afdeling: 'droge-voeding', toegevoegdOp: '2026-10-09T10:00:00.000Z', bron: 'planner' },
  { id: 'b', naam: 'eieren', hoeveelheid: 6, eenheid: 'stuk', afdeling: 'zuivel-eieren', toegevoegdOp: '2026-10-09T10:00:00.000Z', bron: 'planner' },
];

describe('zetGedaan (WEEK-19)', () => {
  test('gedaan: de ingrediënten gaan uit de frigo en het plan onthoudt wat verbruikt werd', () => {
    const r = zetGedaan(plan, 0, true, frigo);
    assert.equal(r.plan.dagen[0].gedaan, true);
    assert.deepEqual(r.plan.dagen[0].verbruikt?.map((v) => [v.id, v.hoeveelheid]), [['a', 300]]);
    assert.deepEqual(r.frigo.map((f) => [f.id, f.hoeveelheid]), [['a', 200], ['b', 6]]);
    assert.equal(r.plan.dagen[1].gedaan, undefined, 'andere dagen ongewijzigd');
  });

  test('terug op niet gedaan zet de frigo exact terug', () => {
    const gedaan = zetGedaan(plan, 0, true, frigo);
    const terug = zetGedaan(gedaan.plan, 0, false, gedaan.frigo);
    assert.deepEqual(terug.frigo, frigo);
    assert.deepEqual(terug.plan.dagen[0], plan.dagen[0]);
  });

  test('twee keer op gedaan zetten verbruikt niets extra', () => {
    const een = zetGedaan(plan, 1, true, frigo);
    const twee = zetGedaan(een.plan, 1, true, een.frigo);
    assert.deepEqual(twee.frigo, een.frigo);
    assert.deepEqual(twee.frigo.map((f) => f.id), ['a']);
  });

  test('een dag die niet bestaat, verandert niets', () => {
    const r = zetGedaan(plan, 9, true, frigo);
    assert.equal(r.plan, plan);
    assert.deepEqual(r.frigo, frigo);
  });

  test('gedaan en wat verbruikt werd, blijven bewaard na opslaan en inlezen', () => {
    const r = zetGedaan(plan, 0, true, frigo);
    const gelezen = normaliseerWeekplan(JSON.parse(JSON.stringify(r.plan)))!;
    assert.equal(gelezen.dagen[0].gedaan, true);
    assert.deepEqual(gelezen.dagen[0].verbruikt, r.plan.dagen[0].verbruikt);
    assert.equal(gelezen.dagen[1].gedaan, undefined);
  });
});
