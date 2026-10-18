import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FrigoItem } from '@/lib/frigo';
import { vervangDag, wisselGedaan, zelfdeDag } from '@/lib/planner/bijwerken';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

const dag = (d: PlanDag['dag'], naam: string, ing = 'pasta'): PlanDag => ({
  dag: d, recept: { id: naam, naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: ing, hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' }] },
});
const plan: Weekplan = {
  dagen: [dag('zondag', 'Pasta'), dag('maandag', 'Curry', 'rijst')],
  kooktijden: [], stijlen: [], taal: 'nl', porties: 3, bron: 'lokaal', gemaaktOp: '2026-10-10T10:00:00.000Z',
};
const frigo: FrigoItem[] = [{ id: 'p', naam: 'pasta', hoeveelheid: 500, eenheid: 'g', afdeling: 'droge-voeding', toegevoegdOp: '2026-10-09T10:00:00.000Z', bron: 'planner' }];
const verwacht = (i: number) => ({ gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[i].recept.naam });

describe('zelfdeDag (WEEK-28)', () => {
  test('zelfde plan en recept = ja; nieuw plan of ander recept = nee', () => {
    assert.ok(zelfdeDag(plan, 0, verwacht(0)));
    assert.ok(!zelfdeDag({ ...plan, gemaaktOp: '2026-10-11T10:00:00.000Z' }, 0, verwacht(0)));
    assert.ok(!zelfdeDag({ ...plan, dagen: [dag('zondag', 'Soep'), plan.dagen[1]] }, 0, verwacht(0)));
    assert.ok(!zelfdeDag(plan, 5, verwacht(0)));
  });
});

describe('vervangDag: trage reset overschrijft niets anders', () => {
  test('enkel die dag wordt vervangen; wat intussen veranderde (andere dag gekookt) blijft', () => {
    const intussen: Weekplan = { ...plan, dagen: [plan.dagen[0], { ...plan.dagen[1], gedaan: true }] };
    const nieuw = vervangDag(intussen, 0, verwacht(0), dag('zondag', 'Omelet', 'eieren'));
    assert.equal(nieuw.dagen[0].recept.naam, 'Omelet');
    assert.equal(nieuw.dagen[1].gedaan, true);
  });
  test('is de dag intussen veranderd (nieuw plan, andere reset), dan gebeurt er niets', () => {
    const anderPlan = { ...plan, gemaaktOp: '2026-10-11T10:00:00.000Z' };
    assert.equal(vervangDag(anderPlan, 0, verwacht(0), dag('zondag', 'Omelet')), anderPlan);
  });
});

describe('wisselGedaan: dubbel tikken verbruikt niet twee keer', () => {
  test('twee tikken na elkaar op de nieuwste versie = gekookt en terug, frigo exact zoals in het begin', () => {
    const een = wisselGedaan(plan, frigo, 0, verwacht(0));
    assert.equal(een.plan.dagen[0].gedaan, true);
    assert.equal(een.frigo[0].hoeveelheid, 200);
    const twee = wisselGedaan(een.plan, een.frigo, 0, verwacht(0));
    assert.equal(twee.plan.dagen[0].gedaan, undefined);
    assert.deepEqual(twee.frigo, frigo);
  });
  test('ander recept op die dag intussen: niets verbruikt', () => {
    const anders: Weekplan = { ...plan, dagen: [dag('zondag', 'Soep'), plan.dagen[1]] };
    const r = wisselGedaan(anders, frigo, 0, verwacht(0));
    assert.equal(r.plan, anders);
    assert.deepEqual(r.frigo, frigo);
  });
});
