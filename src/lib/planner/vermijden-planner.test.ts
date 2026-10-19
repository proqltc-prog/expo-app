import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planLokaal } from '@/lib/planner/lokaal';
import { resetDagLokaal } from '@/lib/planner/reset';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek, Weekplan } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import type { DagCode } from '@/lib/planner/types';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 7, ...extra,
});

/** Namen van alle ingrediënten in het plan, in kleine letters. */
const ingredientenVan = (plan: Weekplan) => plan.dagen.flatMap((d) => d.recept.ingredienten.map((i) => i.naam.toLowerCase()));

describe('vermijden in de lokale planner (WEEK-41)', () => {
  test('een plan zonder keuzes krijgt geen vermijd-veld', () => {
    const plan = planLokaal(verzoek());
    assert.equal('vermijd' in plan, false);
  });

  test('zuivel vermijden: geen room in het plan, en de keuze wordt bewaard', () => {
    for (const seed of [1, 7, 42, 99]) {
      const plan = planLokaal(verzoek({ vermijd: ['zuivel'], seed }));
      assert.ok(!ingredientenVan(plan).includes('room'), `seed ${seed}: room mag niet in het plan`);
      assert.deepEqual(plan.vermijd, ['zuivel']);
    }
  });

  test('het vervangen van een dag houdt de keuze aan', () => {
    const plan = planLokaal(verzoek({ vermijd: ['zuivel'], seed: 3 }));
    for (let index = 0; index < plan.dagen.length; index++) {
      const nieuw = resetDagLokaal(plan, index, index + 11);
      assert.ok(!nieuw.dagen[index].recept.ingredienten.some((i) => i.naam.toLowerCase() === 'room'));
    }
  });
});

describe('vermijden in opgeslagen plannen (WEEK-41)', () => {
  test('de keuze overleeft opslaan en inlezen', () => {
    const plan = planLokaal(verzoek({ vermijd: ['vis', 'eieren'] }));
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan)))?.vermijd, ['vis', 'eieren']);
  });
});
