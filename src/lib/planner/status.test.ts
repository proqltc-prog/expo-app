import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FrigoItem } from '@/lib/frigo';
import { verwijderUitFrigo } from '@/lib/frigo';
import { itemsUitPlan, LijstItem } from '@/lib/lijst';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { markeerOntbrekend, receptStatus, werkOntbrekendBij } from '@/lib/planner/status';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

const ing = (naam: string, hoeveelheid: number, eenheid: string) => ({ naam, hoeveelheid, eenheid, afdeling: 'droge-voeding' as const });
const dag = (d: PlanDag['dag'], naam: string, ingredienten: ReturnType<typeof ing>[]): PlanDag => ({
  dag: d, recept: { id: naam, naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten },
});
const plan: Weekplan = {
  dagen: [
    dag('zondag', 'Pasta pesto', [ing('pasta', 300, 'g'), ing('pesto', 120, 'g')]),
    dag('maandag', 'Pasta tonijn', [ing('Pasta', 200, 'g'), ing('tonijn', 1, 'stuk')]),
    dag('dinsdag', 'Omelet', [ing('eieren', 6, 'stuk')]),
  ],
  kooktijden: [], stijlen: [], taal: 'nl', porties: 3, bron: 'lokaal', gemaaktOp: '2026-10-10T10:00:00.000Z',
};
const f = (id: string, naam: string): FrigoItem => ({ id, naam, afdeling: 'droge-voeding', toegevoegdOp: '2026-10-09T10:00:00.000Z', bron: 'planner' });

describe('receptStatus (WEEK-13)', () => {
  test('gepland, ingrediënt ontbreekt, gedaan', () => {
    assert.equal(receptStatus(plan.dagen[0]), 'gepland');
    assert.equal(receptStatus({ ...plan.dagen[0], ontbreekt: ['pasta'] }), 'ontbreekt');
    assert.equal(receptStatus({ ...plan.dagen[0], gedaan: true, ontbreekt: ['pasta'] }), 'gedaan');
  });
});

describe('markeerOntbrekend', () => {
  test('handmatig verwijderd en niets meer over: elk gepland recept dat het nodig heeft, mist het', () => {
    const frigo = [f('a', 'pasta'), f('b', 'eieren')];
    const na = verwijderUitFrigo(frigo, ['a']);
    const nieuw = markeerOntbrekend(plan, [frigo[0]], na);
    assert.deepEqual(nieuw.dagen.map((d) => d.ontbreekt), [['pasta'], ['Pasta'], undefined]);
    assert.deepEqual(nieuw.dagen.map(receptStatus), ['ontbreekt', 'ontbreekt', 'gepland']);
  });

  test('is er nog een ander exemplaar in de frigo, dan ontbreekt er niets', () => {
    const frigo = [f('a', 'pasta'), f('a2', 'Pasta')];
    assert.equal(markeerOntbrekend(plan, [frigo[0]], [frigo[1]]), plan);
  });

  test('een product dat geen recept nodig heeft, verandert niets', () => {
    assert.equal(markeerOntbrekend(plan, [f('x', 'chips')], []), plan);
  });

  test('gedane recepten blijven gedaan', () => {
    const metGedaan = { ...plan, dagen: plan.dagen.map((d, i) => (i === 0 ? { ...d, gedaan: true } : d)) };
    const nieuw = markeerOntbrekend(metGedaan, [f('a', 'pasta')], []);
    assert.equal(nieuw.dagen[0].ontbreekt, undefined);
    assert.deepEqual(nieuw.dagen[1].ontbreekt, ['Pasta']);
  });

  test('alle ingrediënten weg: het recept springt naar gedaan', () => {
    const een = markeerOntbrekend(plan, [f('a', 'pasta')], []);
    assert.equal(receptStatus(een.dagen[0]), 'ontbreekt');
    const twee = markeerOntbrekend(een, [f('b', 'pesto')], []);
    assert.equal(receptStatus(twee.dagen[0]), 'gedaan');
    assert.equal(twee.dagen[0].ontbreekt, undefined);
    const omelet = markeerOntbrekend(plan, [f('e', 'eieren')], []);
    assert.equal(receptStatus(omelet.dagen[2]), 'gedaan');
  });

  test('hetzelfde ingrediënt twee keer verwijderen zet het maar één keer op ontbrekend', () => {
    const een = markeerOntbrekend(plan, [f('a', 'pasta')], []);
    const twee = markeerOntbrekend(een, [f('a2', 'PASTA')], []);
    assert.equal(twee, een);
  });
});

describe('werkOntbrekendBij', () => {
  test('opnieuw gekocht = niet meer ontbrekend; status terug naar gepland', () => {
    const ontbrekend = markeerOntbrekend(plan, [f('a', 'pasta')], []);
    const bijgewerkt = werkOntbrekendBij(ontbrekend, [f('nieuw', 'pasta')]);
    assert.deepEqual(bijgewerkt.dagen.map(receptStatus), ['gepland', 'gepland', 'gepland']);
    assert.ok(bijgewerkt.dagen.every((d) => !('ontbreekt' in d)));
  });
  test('niets veranderd = hetzelfde plan-object (dan hoeft er niets bewaard te worden)', () => {
    assert.equal(werkOntbrekendBij(plan, [f('a', 'pasta')]), plan);
    const ontbrekend = markeerOntbrekend(plan, [f('a', 'pasta')], []);
    assert.equal(werkOntbrekendBij(ontbrekend, [f('x', 'chips')]), ontbrekend);
  });
});

describe('opslaan en inlezen', () => {
  test('ontbreekt blijft bewaard; rommel wordt weggelaten', () => {
    const ontbrekend = markeerOntbrekend(plan, [f('a', 'pasta')], []);
    const gelezen = normaliseerWeekplan(JSON.parse(JSON.stringify(ontbrekend)))!;
    assert.deepEqual(gelezen.dagen[0].ontbreekt, ['pasta']);
    const raar = normaliseerWeekplan({ ...plan, dagen: [{ ...plan.dagen[0], ontbreekt: ['', 5, 'pesto'] }] })!;
    assert.deepEqual(raar.dagen[0].ontbreekt, ['pesto']);
  });
});
