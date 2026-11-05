import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { testPool } from '@/lib/planner/testrecepten';
import type { PlanVerzoek, Weekplan } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 7, ...extra,
});
const pool = testPool('nl', gezin);
const planVan = (extra: Partial<PlanVerzoek> = {}): Weekplan => {
  const plan = planUitDatabase(verzoek(extra), pool);
  if (!plan) throw new Error('er is een plan');
  return plan;
};

/** Namen van alle ingrediënten in het plan, in kleine letters. */
const ingredientenVan = (plan: Weekplan) => plan.dagen.flatMap((d) => d.recept.ingredienten.map((i) => i.naam.toLowerCase()));

describe('vermijden in de databankplanner (WEEK-41)', () => {
  test('een plan zonder keuzes heeft geen vermeden ingrediënten', () => {
    const plan = planVan();
    assert.equal(plan.vermijd, undefined);
    assert.ok(pool.some((k) => k.recept.ingredienten.some((i) => i.naam.toLowerCase() === 'room')), 'de testrecepten bevatten room');
  });

  test('zuivel vermijden: geen room in het plan, en de keuze wordt bewaard', () => {
    for (const seed of [1, 7, 42, 99]) {
      const plan = planVan({ vermijd: ['zuivel'], seed, aantalDagen: 7 });
      assert.ok(!ingredientenVan(plan).includes('room'), `seed ${seed}: room mag niet in het plan`);
      assert.deepEqual(plan.vermijd, ['zuivel']);
    }
  });

  test('het vervangen van een dag houdt de keuze aan', () => {
    const plan = planVan({ vermijd: ['zuivel'], seed: 3 });
    for (let index = 0; index < plan.dagen.length; index++) {
      const nieuw = vervangDbDag(plan, index, pool, index + 11);
      assert.ok(!nieuw.dagen[index].recept.ingredienten.some((i) => i.naam.toLowerCase() === 'room'));
    }
  });
});

describe('vermijden in opgeslagen plannen (WEEK-41)', () => {
  test('de keuze overleeft opslaan en inlezen', () => {
    const plan = planVan({ vermijd: ['vis', 'eieren'] });
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan)))?.vermijd, ['vis', 'eieren']);
  });
});
