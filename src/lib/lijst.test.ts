import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lijstUitPlan } from '@/lib/lijst';
import { VASTE_ITEMS } from '@/data/vasteItems';
import type { PlanDag, PlanRecept } from '@/lib/planner/types';

const recept = (id: string, ingredienten: PlanRecept['ingredienten']): PlanRecept => ({
  id, naam: id, soort: 'vegetarisch', minuten: 20, stijlen: [], ingredienten,
});

const dagen: PlanDag[] = [
  { dag: 'zondag', recept: recept('a', [
    { naam: 'pasta', hoeveelheid: 300, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'ui', hoeveelheid: 1, eenheid: 'stuk', afdeling: 'groenten-fruit' },
  ]) },
  { dag: 'maandag', recept: recept('b', [
    { naam: 'Pasta', hoeveelheid: 200, eenheid: 'g', afdeling: 'droge-voeding' },
    { naam: 'brood', hoeveelheid: 240, eenheid: 'g', afdeling: 'brood' },
  ]) },
];

describe('lijstUitPlan', () => {
  test('zet alle ingrediënten op de lijst, niet afgevinkt', () => {
    const lijst = lijstUitPlan(dagen);
    for (const naam of ['pasta', 'ui', 'brood']) assert.ok(lijst.some((i) => i.naam.toLowerCase() === naam), naam);
    assert.ok(lijst.every((i) => !i.afgevinkt));
  });

  test('telt hetzelfde ingrediënt met dezelfde eenheid samen (hoofdletterongevoelig)', () => {
    const pasta = lijstUitPlan(dagen).filter((i) => i.naam.toLowerCase() === 'pasta');
    assert.equal(pasta.length, 1);
    assert.equal(pasta[0].hoeveelheid, 500);
    assert.equal(pasta[0].eenheid, 'g');
  });

  test('ids zijn uniek', () => {
    const lijst = lijstUitPlan(dagen);
    assert.equal(new Set(lijst.map((i) => i.id)).size, lijst.length);
  });

  test('voegt de vaste items toe in hun eigen categorie', () => {
    const lijst = lijstUitPlan([]);
    assert.equal(lijst.length, VASTE_ITEMS.flatMap((c) => c.items).length);
    assert.ok(lijst.some((i) => i.categorie === 'fruit' && i.naam === 'appels'));
  });

  test('vaste items in de taal van de gebruiker', () => {
    const lijst = lijstUitPlan([], 'fr');
    assert.ok(lijst.some((i) => i.categorie === 'fruit' && i.naam === 'pommes'));
  });

  test('een vast item dat ook in een recept zit, staat er maar één keer op', () => {
    assert.equal(lijstUitPlan(dagen).filter((i) => i.naam === 'brood').length, 1);
  });
});
