import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { alleBevestigdeGekookt, bevestigPlanDag, bevestigdeDagen, heeftBevestigdPlan, magDagWijzigen, openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
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

describe('een dag bevestigen', () => {
  test('bevestigt de gekozen dag en laat de andere ongemoeid', () => {
    const nieuw = bevestigPlanDag(plan([dag({ dag: 'maandag' }), dag({ dag: 'dinsdag' })]), 1);
    assert.equal(nieuw.dagen[0].bevestigd, undefined);
    assert.equal(nieuw.dagen[1].bevestigd, true);
  });
  test('een al bevestigde dag blijft zoals hij is', () => {
    const p = plan([dag({ dag: 'maandag', bevestigd: true })]);
    assert.equal(bevestigPlanDag(p, 0), p);
  });
  test('een gekookte dag bevestig je niet', () => {
    const p = plan([dag({ dag: 'maandag', gedaan: true })]);
    assert.equal(bevestigPlanDag(p, 0), p);
  });
  test('een ongeldige index verandert niets', () => {
    const p = plan([dag({ dag: 'maandag' })]);
    assert.equal(bevestigPlanDag(p, 5), p);
    assert.equal(bevestigPlanDag(p, -1), p);
  });
});

describe('wat er met een dag mag', () => {
  test('een open dag mag veranderen', () => {
    assert.equal(magDagWijzigen(dag({ dag: 'maandag' })), true);
  });
  test('een bevestigde of gekookte dag mag niet veranderen', () => {
    assert.equal(magDagWijzigen(dag({ dag: 'maandag', bevestigd: true })), false);
    assert.equal(magDagWijzigen(dag({ dag: 'maandag', gedaan: true })), false);
  });
});

describe('alleen bevestigde dagen tellen mee voor de lijst', () => {
  test('bevestigdeDagen geeft enkel de bevestigde dagen', () => {
    const p = plan([dag({ dag: 'maandag', bevestigd: true }), dag({ dag: 'dinsdag' }), dag({ dag: 'woensdag', bevestigd: true })]);
    assert.deepEqual(bevestigdeDagen(p).map((d) => d.dag), ['maandag', 'woensdag']);
  });
  test('heeftBevestigdPlan is waar zodra één dag bevestigd is', () => {
    assert.equal(heeftBevestigdPlan(plan([dag({ dag: 'maandag' })])), false);
    assert.equal(heeftBevestigdPlan(plan([dag({ dag: 'maandag' }), dag({ dag: 'dinsdag', bevestigd: true })])), true);
  });
});

describe('bevestiging blijft bewaard', () => {
  test('normaliseer houdt de bevestiging van een dag vast', () => {
    const ruw = {
      dagen: [{ dag: 'maandag', recept, bevestigd: true }, { dag: 'dinsdag', recept }],
      kooktijden: [],
      stijlen: [],
      taal: 'nl',
      porties: 1,
      bron: 'db',
      gemaaktOp: '2026-10-18T10:00:00.000Z',
    };
    const p = normaliseerWeekplan(ruw);
    assert.equal(p?.dagen[0].bevestigd, true);
    assert.equal(p?.dagen[1].bevestigd, undefined);
  });
});

describe('alleBevestigdeGekookt (WEEK-125)', () => {
  const dag = (wijziging: Partial<PlanDag> = {}): PlanDag => ({ dag: 'maandag', moment: 'avond', recept: { id: 'x', naam: 'X', soort: 'vlees', minuten: 20, stijlen: ['klassiek'], ingredienten: [] }, ...wijziging } as PlanDag);
  const plan = (dagen: PlanDag[]): Weekplan => ({ dagen, kooktijden: [], stijlen: [], taal: 'nl', bron: 'db', gemaaktOp: '' } as unknown as Weekplan);

  test('zonder bevestigde dag is het antwoord nee', () => {
    assert.equal(alleBevestigdeGekookt(plan([dag()])), false);
  });
  test('een bevestigde dag die nog niet gekookt is, is nee', () => {
    assert.equal(alleBevestigdeGekookt(plan([dag({ bevestigd: true })])), false);
  });
  test('alle bevestigde dagen gekookt is ja, ook als andere dagen niet bevestigd zijn', () => {
    assert.equal(alleBevestigdeGekookt(plan([dag({ bevestigd: true, gedaan: true }), dag()])), true);
  });
  test('regressie: één bevestigde dag nog niet gekookt, is nee', () => {
    assert.equal(alleBevestigdeGekookt(plan([dag({ bevestigd: true, gedaan: true }), dag({ bevestigd: true })])), false);
  });
});

describe('alleen niet-gekookte bevestigde dagen op de lijst (WEEK-134)', () => {
  test('een gekookte bevestigde dag hoort niet meer bij de lijst', () => {
    const p = plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true })]);
    assert.deepEqual(openBevestigdeDagen(p).map((d) => d.dag), ['dinsdag']);
  });

  test('regressie: bevestigdeDagen houdt gekookte dagen nog wel vast voor de planner', () => {
    const p = plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true })]);
    assert.equal(bevestigdeDagen(p).length, 2);
  });

  test('een niet-bevestigde dag komt nooit op de lijst', () => {
    assert.deepEqual(openBevestigdeDagen(plan([dag({ dag: 'maandag' })])), []);
  });
});
