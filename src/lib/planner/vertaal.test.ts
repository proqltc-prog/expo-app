import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientNaam } from '@/data/ingredienten';
import { dagenInTaal, ingredientenInTaal, inTaal } from '@/lib/planner/vertaal';
import type { PlanRecept } from '@/lib/planner/types';

/** Een recept uit de database: titel en ingrediënten in meerdere talen (WEEK-154). */
const dbRecept: PlanRecept = {
  id: 'db-42',
  naam: 'Risotto met champignons en witte wijn',
  soort: 'vegetarisch',
  minuten: 30,
  stijlen: ['italiaans'],
  ingredienten: [
    { naam: 'champignons', hoeveelheid: 300, eenheid: 'g', afdeling: 'groenten-fruit', code: 'champignons', namen: { nl: 'champignons', fr: 'champignons de Paris' } },
    { naam: 'rijst', hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding' },
  ],
  titels: { nl: 'Risotto met champignons en witte wijn', fr: 'Risotto aux champignons et au vin blanc' },
};

describe('inTaal', () => {
  test('een recept uit de vroegere lokale receptenbank (oud plan, zonder titels) houdt zijn opgeslagen naam (WEEK-208)', () => {
    const oud: PlanRecept = { id: 'pasta-pesto', naam: 'Pasta pesto met broccoli', soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten: [] };
    assert.equal(inTaal(oud, 'fr').naam, 'Pasta pesto met broccoli');
  });

  test('de vastgelegde titels gaan voor; ontbreekt de taal, dan blijft de opgeslagen naam', () => {
    assert.equal(inTaal(dbRecept, 'nl').naam, 'Risotto met champignons en witte wijn');
    assert.equal(inTaal(dbRecept, 'de').naam, dbRecept.naam);
  });

  test('een databankrecept krijgt de titel uit de vastgelegde vertalingen', () => {
    assert.equal(inTaal(dbRecept, 'fr').naam, 'Risotto aux champignons et au vin blanc');
  });

  test('zonder vertaling blijft de opgeslagen naam staan (oude plannen)', () => {
    const oud: PlanRecept = { ...dbRecept, titels: undefined };
    assert.equal(inTaal(oud, 'fr').naam, dbRecept.naam);
  });

  test('een AI-recept of onbekend recept blijft gelijk', () => {
    const ai: PlanRecept = { ...dbRecept, id: 'ai-1', titels: undefined };
    assert.equal(inTaal(ai, 'fr').naam, dbRecept.naam);
  });

  test('ingrediënten krijgen hun naam in de taal, hoeveelheden en afdeling blijven gelijk', () => {
    const [champignons, rijst] = inTaal(dbRecept, 'fr').ingredienten;
    assert.equal(champignons.naam, 'champignons de Paris');
    assert.equal(champignons.hoeveelheid, 300);
    assert.equal(champignons.afdeling, 'groenten-fruit');
    assert.equal(rijst.naam, 'rijst', 'zonder code of namen blijft de naam staan');
  });
});

describe('ingredientenInTaal', () => {
  test('een ingrediënt met een vaste code krijgt de naam uit de ingrediëntenlijst', () => {
    const recept: PlanRecept = {
      ...dbRecept,
      ingredienten: [{ naam: 'Champignons', hoeveelheid: 100, eenheid: 'g', afdeling: 'groenten-fruit', code: 'champignons' }],
    };
    assert.equal(ingredientenInTaal(recept, 'de')[0].naam, ingredientNaam('champignons', 'de'));
  });
});

describe('dagenInTaal', () => {
  test('houdt dag, datum en recept-naam gelijk; enkel de ingrediënten krijgen een nieuwe naam', () => {
    const dagen = [{ dag: 'maandag' as const, datum: '2026-10-26', recept: dbRecept }];
    const [dag] = dagenInTaal(dagen, 'fr');
    assert.equal(dag.dag, 'maandag');
    assert.equal(dag.datum, '2026-10-26');
    assert.equal(dag.recept.naam, dbRecept.naam);
    assert.equal(dag.recept.ingredienten[0].naam, 'champignons de Paris');
  });
});
