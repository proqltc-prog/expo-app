import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseerIngredient, normaliseerRecept, normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { planUitDatabase } from '@/lib/planner/dbplan';
import { testPool } from '@/lib/planner/testrecepten';
import { standaardProfiel } from '@/lib/profiel';

describe('normaliseer met vertalingen (WEEK-154)', () => {
  test('bewaart de vaste code, de namen per taal en de titels', () => {
    const recept = normaliseerRecept({
      id: 'db-1',
      naam: 'Risotto',
      soort: 'vegetarisch',
      minuten: 30,
      ingredienten: [{ naam: 'Champignons', hoeveelheid: 300, eenheid: 'g', afdeling: 'groenten-fruit', code: 'champignons', namen: { nl: 'Champignons', fr: 'Champignons de Paris' } }],
      titels: { nl: 'Risotto', fr: 'Risotto aux champignons' },
    });
    assert.equal(recept?.titels?.fr, 'Risotto aux champignons');
    assert.equal(recept?.ingredienten[0].code, 'champignons');
    assert.equal(recept?.ingredienten[0].namen?.fr, 'Champignons de Paris');
  });

  test('onbekende talen en lege teksten vallen weg', () => {
    const ingredient = normaliseerIngredient({ naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit', namen: { xx: 'Onzin', fr: '  ', de: 'Zwiebel' } });
    assert.deepEqual(ingredient?.namen, { de: 'Zwiebel' });
  });

  test('een oud plan zonder vertalingen krijgt geen nieuwe velden', () => {
    const ingredient = normaliseerIngredient({ naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' });
    assert.deepEqual(ingredient, { naam: 'Ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' });
  });
});

describe('afgewezen recepten bewaren (WEEK-184)', () => {
  test('de lijst van afgewezen recepten blijft na inlezen behouden, zonder ongeldige waarden', () => {
    const plan = planUitDatabase({ aantalDagen: 2, kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 3 }, testPool())!;
    const ruw = { ...JSON.parse(JSON.stringify(plan)), afgewezen: ['x', '', 5, 'y'] };
    assert.deepEqual(normaliseerWeekplan(ruw)?.afgewezen, ['x', 'y']);
  });
});
