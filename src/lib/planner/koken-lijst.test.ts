// Regressietest voor WEEK-135: na het koken van alle recepten mag de lijst geen ingrediënten meer tonen,
// en het lijst-deel dat nog open staat, rekent met de frigo van dat moment.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { trekFrigoAf, type FrigoItem } from '@/lib/frigo';
import { voegPlanToe, planSleutel } from '@/lib/lijst';
import { openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import { zetGedaan } from '@/lib/planner/gedaan';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

const ing = (naam: string, hoeveelheid: number) => ({ naam, hoeveelheid, eenheid: 'g', afdeling: 'droge-voeding' as const });
const recept = (naam: string, ingredienten: ReturnType<typeof ing>[]) => ({
  id: naam,
  naam,
  soort: 'vegetarisch' as const,
  minuten: 20,
  stijlen: ['italiaans' as const],
  ingredienten,
});
const plan = (dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 1,
  bron: 'db',
  gemaaktOp: '2026-10-20T08:00:00.000Z',
});

/** Zoals app/index.tsx: lijst opnieuw opbouwen uit de open bevestigde dagen, met de frigo van dat moment. */
function lijstVoor(p: Weekplan, frigo: FrigoItem[], lijst: ReturnType<typeof voegPlanToe>) {
  return voegPlanToe(lijst, openBevestigdeDagen(p), 'nl', (items) => trekFrigoAf(items, frigo), planSleutel(p), false);
}

describe('koken werkt de lijst bij (WEEK-135)', () => {
  const r1 = recept('Pasta', [ing('pasta', 200), ing('tomaat', 100)]);
  const r2 = recept('Soep', [ing('wortel', 150), ing('ui', 50)]);

  test('na het koken van alle recepten staan er geen ingrediënten meer op de lijst', () => {
    let p = plan([
      { dag: 'maandag', moment: 'avond', recept: r1, bevestigd: true },
      { dag: 'dinsdag', moment: 'avond', recept: r2, bevestigd: true },
    ]);
    let frigo: FrigoItem[] = [];
    let lijst = lijstVoor(p, frigo, []);
    assert.equal(lijst.length, 4);

    const stap1 = zetGedaan(p, 0, true, frigo);
    p = stap1.plan;
    frigo = stap1.frigo;
    lijst = lijstVoor(p, frigo, lijst);
    assert.deepEqual(lijst.map((i) => i.naam).sort(), ['ui', 'wortel']);

    const stap2 = zetGedaan(p, 1, true, frigo);
    p = stap2.plan;
    lijst = lijstVoor(p, stap2.frigo, lijst);
    assert.deepEqual(lijst, []);
  });

  test('de frigo wordt bij koken niet nog eens afgetrokken van de open recepten', () => {
    // Een gekocht product (van de lijst, bron planner) dat recept 1 gebruikt: na koken is het weg uit de frigo,
    // en het open recept 2 rekent enkel met wat er nog is.
    const gekocht: FrigoItem = { id: 'f1', naam: 'wortel', hoeveelheid: 150, eenheid: 'g', afdeling: 'groenten', toegevoegdOp: '2026-10-19T10:00:00.000Z', bron: 'planner', lijstId: 'x' };
    const r1Wortel = recept('Stoof', [ing('wortel', 150)]);
    let p = plan([
      { dag: 'maandag', moment: 'avond', recept: r1Wortel, bevestigd: true },
      { dag: 'dinsdag', moment: 'avond', recept: r2, bevestigd: true },
    ]);
    const gekookt = zetGedaan(p, 0, true, [gekocht]);
    p = gekookt.plan;
    const lijst = lijstVoor(p, gekookt.frigo, []);
    assert.deepEqual(lijst.map((i) => i.naam).sort(), ['ui', 'wortel']);
    const wortel = lijst.find((i) => i.naam === 'wortel');
    assert.equal(wortel?.hoeveelheid, 150);
  });
});
