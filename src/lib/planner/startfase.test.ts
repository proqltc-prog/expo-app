import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { neemVertrekUitGezinsprofielVlag, onthoudVertrekUitGezinsprofiel, startFase } from '@/lib/planner/startfase';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

const recept = {
  id: '1',
  naam: 'Pasta',
  soort: 'vegetarisch' as const,
  minuten: 20,
  stijlen: ['italiaans' as const],
  ingredienten: [{ naam: 'pasta', hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding' as const }],
};
const dag = (d: Partial<PlanDag> & { dag: PlanDag['dag'] }): PlanDag => ({ recept, ...d });
const plan = (dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 1,
  bron: 'db',
  gemaaktOp: '2026-10-18T10:00:00.000Z',
});

describe('waar de weekplanner start (WEEK-133)', () => {
  test('zonder plan start de gebruiker bij Periode', () => {
    assert.equal(startFase(null), 'periode');
  });

  test('een plan zonder dagen start bij Periode', () => {
    assert.equal(startFase(plan([])), 'periode');
  });

  test('een gegenereerd plan waar nog niets bevestigd is, opent op het plan', () => {
    assert.equal(startFase(plan([dag({ dag: 'maandag' }), dag({ dag: 'dinsdag' })])), 'plan');
  });

  test('een plan met een bevestigde dag opent op het plan', () => {
    assert.equal(startFase(plan([dag({ dag: 'maandag', bevestigd: true }), dag({ dag: 'dinsdag' })])), 'plan');
  });

  test('een plan met een gekookt en een nog niet gekookt recept opent op het plan', () => {
    assert.equal(startFase(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true })])), 'plan');
  });

  test('als alle recepten van het plan gekookt zijn, start de gebruiker opnieuw bij Periode', () => {
    assert.equal(
      startFase(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true, gedaan: true })])),
      'periode',
    );
  });

  test('regressie: alle gekookt, ook zonder bevestiging, start bij Periode', () => {
    assert.equal(startFase(plan([dag({ dag: 'maandag', gedaan: true })])), 'periode');
  });
});

describe('terugkomst vanuit de gezinssamenstelling', () => {
  test('de vlag is eenmalig: na één keer nemen is hij weer uit', () => {
    neemVertrekUitGezinsprofielVlag();
    onthoudVertrekUitGezinsprofiel();
    assert.equal(neemVertrekUitGezinsprofielVlag(), true);
    assert.equal(neemVertrekUitGezinsprofielVlag(), false);
  });
});
