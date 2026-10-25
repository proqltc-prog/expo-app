import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientNaam } from '@/data/ingredienten';
import type { FrigoItem } from '@/lib/frigo';
import { markeerOntbrekend, werkOntbrekendBij } from '@/lib/planner/status';
import type { PlanDag, Weekplan } from '@/lib/planner/types';

// WEEK-160: ontbreekt-markers en "in frigo" volgen dezelfde koppeling als het verbruik (code, eenheid, taal).
const OUD = '2026-10-01T10:00:00.000Z';
const f = (id: string, naam: string, hoeveelheid?: number, eenheid?: string, code?: string): FrigoItem => ({
  id,
  naam,
  afdeling: 'groenten-fruit',
  toegevoegdOp: OUD,
  bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
  ...(code ? { code } : {}),
});

const dag: PlanDag = {
  dag: 'maandag',
  recept: {
    id: 'db-9',
    naam: 'Tomatensoep',
    soort: 'vegetarisch',
    minuten: 20,
    stijlen: [],
    ingredienten: [
      { naam: 'tomaat', code: 'tomaat', hoeveelheid: 200, eenheid: 'g', afdeling: 'groenten-fruit' },
      { naam: 'ui', code: 'ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' },
    ],
  },
};
const plan: Weekplan = { dagen: [dag], kooktijden: [], stijlen: [], taal: 'nl', porties: 1, bron: 'lokaal', gemaaktOp: OUD };
const frans = ingredientNaam('tomaten', 'fr');

describe('markeerOntbrekend op code en eenheid (WEEK-160)', () => {
  test('een verwijderd product in een andere taal markeert het recept-ingrediënt als ontbrekend', () => {
    const na = markeerOntbrekend(plan, [f('x', frans, 200, 'g')], []);
    assert.deepEqual(na.dagen[0].ontbreekt, ['tomaat']);
  });

  test('blijft er een product in de frigo over (andere taal, zelfde code), dan ontbreekt niets', () => {
    const verwijderd = [f('x', frans, 200, 'g')];
    const frigoNa = [f('y', 'Tomaten', 500, 'g', 'tomaat')];
    assert.equal(markeerOntbrekend(plan, verwijderd, frigoNa), plan);
  });

  test('een verwijderd product met een eenheid die niet past, markeert niets', () => {
    assert.equal(markeerOntbrekend(plan, [f('x', 'tomaat', 2, 'stuk')], []), plan);
  });
});

describe('werkOntbrekendBij op code (WEEK-160)', () => {
  test('een opnieuw gekocht product in een andere taal haalt de marker weg', () => {
    const met = { ...plan, dagen: [{ ...dag, ontbreekt: ['tomaat'] }] };
    const na = werkOntbrekendBij(met, [f('y', frans, 200, 'g')]);
    assert.equal(na.dagen[0].ontbreekt, undefined);
  });

  test('zonder product in de frigo blijft de marker staan', () => {
    const met = { ...plan, dagen: [{ ...dag, ontbreekt: ['tomaat'] }] };
    assert.equal(werkOntbrekendBij(met, []), met);
  });
});
