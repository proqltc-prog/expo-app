import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { LijstItem, perRecept, secties } from '@/lib/lijst';
import type { DagCode } from '@/lib/planner/types';

/** Eén item van een recept op een dag (WEEK-144). */
function item(dag: DagCode, naam: string, id: string): LijstItem {
  return { id, naam, categorie: 'avondeten', afgevinkt: false, eenheid: 'g', hoeveelheid: 100, recept: { dag, naam: `Recept ${dag}` } };
}

const items: LijstItem[] = [
  item('zondag', 'Zout', 'a'),
  item('maandag', 'Peper', 'b'),
  item('zaterdag', 'Tomaat', 'c'),
];

function receptVolgorde(secs: ReturnType<typeof perRecept>): string[] {
  return secs.filter((s) => s.soort === 'recept').map((s) => (s.soort === 'recept' ? s.dag : ''));
}

describe('volgorde van recepten op de lijst (WEEK-144)', () => {
  test('zonder plan-volgorde blijft de weekvolgorde zondag → zaterdag', () => {
    assert.deepEqual(receptVolgorde(perRecept(items)), ['zondag', 'maandag', 'zaterdag']);
  });

  test('met plan-volgorde volgen de recepten de kalender van het plan', () => {
    const kalender = ['zaterdag', 'zondag', 'maandag'] as DagCode[];
    assert.deepEqual(receptVolgorde(perRecept(items, kalender)), ['zaterdag', 'zondag', 'maandag']);
  });

  test('plan-volgorde die met maandag begint (kalender met datums) wordt gevolgd', () => {
    const kalender = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'] as DagCode[];
    assert.deepEqual(receptVolgorde(perRecept(items, kalender)), ['maandag', 'zaterdag', 'zondag']);
  });

  test('secties geeft de plan-volgorde door', () => {
    const kalender = ['zaterdag', 'zondag', 'maandag'] as DagCode[];
    assert.deepEqual(receptVolgorde(secties(items, 'recept', kalender)), ['zaterdag', 'zondag', 'maandag']);
  });

  test('secties zonder plan-volgorde blijft de weekvolgorde (regressie)', () => {
    assert.deepEqual(receptVolgorde(secties(items, 'recept')), ['zondag', 'maandag', 'zaterdag']);
  });

  test('overige items (vaste items, eigen items) blijven na de recepten staan', () => {
    const eigen: LijstItem = { id: 'eigen-1', naam: 'Brood', categorie: 'extra', afgevinkt: false };
    const secs = perRecept([eigen, ...items], ['zaterdag', 'zondag', 'maandag'] as DagCode[]);
    assert.equal(secs[secs.length - 1].soort, 'categorie');
    assert.deepEqual(receptVolgorde(secs), ['zaterdag', 'zondag', 'maandag']);
  });
});
