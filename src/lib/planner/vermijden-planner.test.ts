import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AiFout, bouwAiVerzoek, leesAiAntwoord } from '@/lib/planner/ai';
import { planLokaal } from '@/lib/planner/lokaal';
import { resetDagLokaal } from '@/lib/planner/reset';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { PlanVerzoek, Weekplan } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import type { DagCode } from '@/lib/planner/types';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  opdracht: '', kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 7, ...extra,
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

describe('vermijden bij de AI (WEEK-41)', () => {
  test('het verzoek aan de AI bevat de uitsluitingen in gewone taal', () => {
    const aiVerzoek = bouwAiVerzoek(verzoek({ vermijd: ['varkensvlees', 'noten'] }), ['maandag']);
    assert.ok(aiVerzoek.uitsluiten?.some((t) => /pork/.test(t)));
    assert.ok(aiVerzoek.uitsluiten?.some((t) => /nuts/.test(t)));
  });

  test('zonder keuzes staat er geen uitsluitingsveld in het verzoek', () => {
    assert.equal('uitsluiten' in bouwAiVerzoek(verzoek(), ['maandag']), false);
  });

  test('een AI-recept met een verboden ingrediënt wordt afgekeurd', () => {
    const dagen: DagCode[] = ['zondag', 'maandag'];
    const recept = (naam: string, ingredient: string) => ({
      naam, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [{ naam: ingredient, hoeveelheid: 200, eenheid: 'g', afdeling: 'zuivel-eieren' }],
    });
    const ruw = { dagen: [{ dag: 'zondag', recept: recept('Pasta pesto', 'Pasta') }, { dag: 'maandag', recept: recept('Pasta crème', 'Room') }] };
    assert.throws(() => leesAiAntwoord(ruw, verzoek({ vermijd: ['zuivel'] }), dagen), AiFout);
    assert.equal(leesAiAntwoord(ruw, verzoek(), dagen).length, 2);
  });
});

describe('vermijden in opgeslagen plannen (WEEK-41)', () => {
  test('de keuze overleeft opslaan en inlezen', () => {
    const plan = planLokaal(verzoek({ vermijd: ['vis', 'eieren'] }));
    assert.deepEqual(normaliseerWeekplan(JSON.parse(JSON.stringify(plan)))?.vermijd, ['vis', 'eieren']);
  });
});
