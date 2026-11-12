import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { alleBevestigdeGekookt, bevestigPlanDag, bevestigdeDagen, heeftBevestigdPlan, magDagWijzigen, openBevestigdeDagen, alleDagenAfgerond, planZonderHoeveelheden, vraagtBevestigingVoorNieuwPlan, zichtbaarWeekmenu } from '@/lib/planner/dagBevestigen';
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

describe('het weekmenu toont enkel een gegenereerd plan dat niet volledig gekookt is (WEEK-139)', () => {
  test('zonder plan is er niets te tonen', () => {
    assert.equal(zichtbaarWeekmenu(null), null);
  });
  test('een plan zonder dagen toont niets', () => {
    assert.equal(zichtbaarWeekmenu(plan([])), null);
  });
  test('een gegenereerd plan met open recepten wordt getoond, ook zonder bevestiging', () => {
    const p = plan([dag({ dag: 'maandag' }), dag({ dag: 'dinsdag', bevestigd: true, gedaan: true })]);
    assert.equal(zichtbaarWeekmenu(p), p);
  });
  test('als alle recepten gekookt zijn, staat het weekmenu leeg', () => {
    assert.equal(zichtbaarWeekmenu(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', gedaan: true })])), null);
  });
});

describe('periode pas als alle recepten bevestigd én gekookt zijn (WEEK-140)', () => {
  test('één bevestigd en gekookt recept van zeven is niet af', () => {
    const p = plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), ...['dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map((d) => dag({ dag: d as PlanDag['dag'] }))]);
    assert.equal(alleDagenAfgerond(p), false);
  });
  test('een gekookt maar niet bevestigd recept is niet af', () => {
    assert.equal(alleDagenAfgerond(plan([dag({ dag: 'maandag', gedaan: true })])), false);
  });
  test('pas als alle recepten bevestigd én gekookt zijn, is het plan af', () => {
    assert.equal(alleDagenAfgerond(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true, gedaan: true })])), true);
  });
  test('een plan zonder dagen is niet af', () => {
    assert.equal(alleDagenAfgerond(plan([])), false);
  });
});

describe('de popup bij een nieuw weekmenu verschijnt enkel bij zichtbare bevestigde recepten (WEEK-143)', () => {
  test('zonder plan geen popup', () => {
    assert.equal(vraagtBevestigingVoorNieuwPlan(null), false);
  });
  test('een plan met alleen niet-bevestigde recepten: geen popup', () => {
    assert.equal(vraagtBevestigingVoorNieuwPlan(plan([dag({ dag: 'maandag' })])), false);
  });
  test('een bevestigd, nog niet gekookt recept: popup', () => {
    assert.equal(vraagtBevestigingVoorNieuwPlan(plan([dag({ dag: 'maandag', bevestigd: true })])), true);
  });
  test('bevestigd en gekookt, het hele plan is af: geen popup, want niets is zichtbaar', () => {
    assert.equal(vraagtBevestigingVoorNieuwPlan(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true })])), false);
  });
  test('een gekookt bevestigd recept naast een open bevestigd recept: popup', () => {
    assert.equal(vraagtBevestigingVoorNieuwPlan(plan([dag({ dag: 'maandag', bevestigd: true, gedaan: true }), dag({ dag: 'dinsdag', bevestigd: true })])), true);
  });
});

describe('WEEK-249: planZonderHoeveelheden', () => {
  const nulRecept = { ...recept, ingredienten: [{ ...recept.ingredienten[0], hoeveelheid: 0 }] };
  test('een menu waarin elk ingrediënt 0 is, werd zonder gezin gemaakt', () => {
    assert.equal(planZonderHoeveelheden(plan([dag({ dag: 'maandag', recept: nulRecept }), dag({ dag: 'dinsdag', recept: nulRecept })])), true);
  });
  test('regressie: een gewoon menu, een leeg menu of geen menu niet', () => {
    assert.equal(planZonderHoeveelheden(plan([dag({ dag: 'maandag' }), dag({ dag: 'dinsdag', recept: nulRecept })])), false);
    assert.equal(planZonderHoeveelheden(plan([])), false);
    assert.equal(planZonderHoeveelheden(null), false);
  });
});
