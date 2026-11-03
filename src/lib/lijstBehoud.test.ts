import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { frigoItemUitLijst, type FrigoItem } from '@/lib/frigo';
import { perRecept, vinkAf, voegPlanToe } from '@/lib/lijst';
import type { PlanDag, PlanIngredient, PlanRecept } from '@/lib/planner/types';

// WEEK-160: het overzetten van een plan behoudt vinkjes en frigo-koppelingen; recepten met dezelfde naam blijven apart.
const NU = new Date('2026-10-24T12:00:00.000Z');
const ing = (code: string, naam: string, hoeveelheid: number, eenheid: string): PlanIngredient => ({ code, naam, hoeveelheid, eenheid, afdeling: 'groenten-fruit' });
const recept = (id: string, naam: string, ingredienten: PlanIngredient[]): PlanRecept => ({ id, naam, soort: 'vegetarisch', minuten: 20, stijlen: ['italiaans'], ingredienten });

const dagen: PlanDag[] = [
  { dag: 'maandag', moment: 'avond', bevestigd: true, recept: recept('db-2', 'Pasta', [ing('tomaat', 'tomaat', 200, 'g'), ing('ui', 'ui', 1, 'stuk')]) },
  { dag: 'maandag', moment: 'avond', bevestigd: true, recept: recept('db-3', 'Tomatensoep', [ing('tomaat', 'tomaat', 150, 'g')]) },
];

describe('het overzetten van een plan behoudt de vinkjes (WEEK-160)', () => {
  test('het eerste recept houdt het oude id; het tweede krijgt het recept erachter', () => {
    const ids = voegPlanToe([], dagen, 'nl', undefined, 'p').filter((i) => i.code === 'tomaat').map((i) => i.id);
    assert.deepEqual(ids.sort(), ['recept-p-maandag-tomaat-g', 'recept-p-maandag-tomaat-g-db-3']);
  });

  test('vinkjes van beide tomaat-regels blijven staan na het herbouwen, met wie afvinkte', () => {
    const lijst = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const ids = lijst.filter((i) => i.code === 'tomaat').map((i) => i.id);
    const gekocht = vinkAf(lijst, ids, true, 'Maarten De Ridder');
    const herbouwd = voegPlanToe(gekocht, dagen, 'nl', undefined, 'p');
    const tomaten = herbouwd.filter((i) => i.code === 'tomaat');
    assert.ok(tomaten.every((i) => i.afgevinkt), 'beide tomaat-regels blijven afgevinkt');
    assert.equal(tomaten.find((i) => i.recept?.naam === 'Pasta')?.afgevinktDoor, 'Maarten De Ridder');
  });

  test('een tweede recept erft het vinkje van een oud samengevoegd item (legacy-lijst)', () => {
    // Vóór WEEK-159/160 was het gedeelde ingrediënt één item, gekoppeld aan het eerste recept, en afgevinkt.
    const oud = [{ id: 'recept-p-maandag-tomaat-g', naam: 'tomaat', categorie: 'avondeten', afgevinkt: true, hoeveelheid: 350, eenheid: 'g', code: 'tomaat', recept: { dag: 'maandag' as const, naam: 'Pasta' } }];
    const herbouwd = voegPlanToe(oud, dagen, 'nl', undefined, 'p');
    assert.ok(herbouwd.filter((i) => i.code === 'tomaat').every((i) => i.afgevinkt));
  });

  test('de frigo-koppeling van een gekocht product blijft geldig na het herbouwen', () => {
    const lijst = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const gekocht = vinkAf(lijst, ['recept-p-maandag-tomaat-g'], true);
    const frigo: FrigoItem[] = gekocht.filter((i) => i.id === 'recept-p-maandag-tomaat-g').map((i) => frigoItemUitLijst(i, NU));
    const herbouwd = voegPlanToe(gekocht, dagen, 'nl', undefined, 'p');
    assert.ok(frigo.every((f) => herbouwd.some((i) => i.id === f.lijstId)), 'de lijstId van het frigo-product verwijst nog naar een bestaand item');
  });

  test('een nieuw plan (andere sleutel) krijgt geen vinkjes van het vorige plan', () => {
    const gekocht = vinkAf(voegPlanToe([], dagen, 'nl', undefined, 'p'), ['recept-p-maandag-tomaat-g'], true);
    const nieuw = voegPlanToe(gekocht, dagen, 'nl', undefined, 'q');
    assert.ok(nieuw.filter((i) => i.code === 'tomaat').every((i) => !i.afgevinkt));
  });
});

describe('recepten met dezelfde naam op één dag blijven apart (WEEK-160)', () => {
  test('twee recepten met dezelfde naam worden twee secties, op recept-id', () => {
    const twee: PlanDag[] = [
      { dag: 'maandag', recept: recept('a', 'Soep', [ing('ui', 'ui', 1, 'stuk')]) },
      { dag: 'maandag', recept: recept('b', 'Soep', [ing('wortel', 'wortel', 2, 'stuk')]) },
    ];
    const secties = perRecept(voegPlanToe([], twee, 'nl', undefined, 'p')).filter((s) => s.soort === 'recept');
    assert.equal(secties.length, 2);
    assert.deepEqual(secties.map((s) => s.regels.map((r) => r.naam)), [['ui'], ['wortel']]);
  });
});
