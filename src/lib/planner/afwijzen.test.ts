import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isAfgewezen, voegAfgewezenToe } from '@/lib/planner/afwijzen';
import { planUitDatabase } from '@/lib/planner/dbplan';
import { testPool } from '@/lib/planner/testrecepten';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import type { Weekplan } from '@/lib/planner/types';

const gezin: Profiel = { ...standaardProfiel(), kinderen: 2 };
const plan = (): Weekplan => planUitDatabase({ aantalDagen: 3, kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 5 }, testPool('nl', gezin))!;

describe('afgewezen recepten van een weekplan (WEEK-184)', () => {
  test('een vervangen recept komt op de lijst', () => {
    const p = voegAfgewezenToe(plan(), 'risotto');
    assert.deepEqual(p.afgewezen, ['risotto']);
    assert.equal(isAfgewezen(p, 'risotto'), true);
  });

  test('een id staat er maar één keer op', () => {
    const p = voegAfgewezenToe(voegAfgewezenToe(plan(), 'risotto'), 'risotto');
    assert.deepEqual(p.afgewezen, ['risotto']);
  });

  test('zonder id verandert het plan niet', () => {
    const origineel = plan();
    assert.equal(voegAfgewezenToe(origineel, undefined), origineel);
  });

  test('de lijst blijft bij het volgende vervangen recept behouden', () => {
    const p = voegAfgewezenToe(voegAfgewezenToe(plan(), 'a'), 'b');
    assert.deepEqual(p.afgewezen, ['a', 'b']);
    assert.equal(isAfgewezen(p, 'a'), true);
  });

  test('een plan zonder lijst heeft niets afgewezen', () => {
    assert.equal(isAfgewezen(plan(), 'risotto'), false);
  });
});
