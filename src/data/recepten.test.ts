import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DAGEN, maakWeekmenu, RECEPTEN } from '@/data/recepten';

describe('maakWeekmenu', () => {
  test('geeft één recept per dag, zondag tot vrijdag', () => {
    const menu = maakWeekmenu(1);
    assert.deepEqual(menu.map((m) => m.dag), [...DAGEN]);
  });

  test('wisselt vlees, vegetarisch en vis af', () => {
    const menu = maakWeekmenu(99);
    assert.deepEqual(
      menu.map((m) => m.recept.soort),
      ['vlees', 'vegetarisch', 'vis', 'vlees', 'vegetarisch', 'vis']
    );
  });

  test('is reproduceerbaar met dezelfde seed', () => {
    const ids = (seed: number) => maakWeekmenu(seed).map((m) => m.recept.id);
    assert.deepEqual(ids(1234), ids(1234));
  });

  test('herhaalt geen recept zolang er genoeg keuze is', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ids = maakWeekmenu(seed).map((m) => m.recept.id);
      assert.equal(new Set(ids).size, ids.length, `seed ${seed}`);
    }
  });

  test('alle recepten hebben ingrediënten en een kooktijd', () => {
    for (const r of RECEPTEN) {
      assert.ok(r.ingredienten.length > 0, r.id);
      assert.ok(r.minuten > 0, r.id);
    }
  });
});
