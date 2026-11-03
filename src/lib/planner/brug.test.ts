import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { stijlOpties } from '@/lib/planner/opties';

describe('kooktijd naar databasecodes', () => {
  test('avond Snel (0–30 min) raakt snel en gemiddeld', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['snel']), ['snel', 'gemiddeld']);
  });
  test('avond Verfijnd (31–50 min) raakt gemiddeld en uitgebreid', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['verfijnd']), ['gemiddeld', 'uitgebreid']);
  });
  test('meerdere kooktijden geven de vereniging van de codes', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['snel', 'verfijnd']), ['snel', 'gemiddeld', 'uitgebreid']);
  });
  test('een onbekende kooktijd geeft niets', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['bestaat-niet']), []);
  });
});

describe('stijl naar databasestijlen', () => {
  test('mediterraan en italiaans blijven zichzelf', () => {
    assert.deepEqual(stijlNaarDb(['mediterraan', 'italiaans']), ['mediterraan', 'italiaans']);
  });
  test('chinees en indiaas vallen samen onder aziatisch', () => {
    assert.deepEqual(stijlNaarDb(['chinees', 'indiaas']), ['aziatisch']);
  });
  test('thais, japans en koreaans hebben elk een eigen databasestijl (WEEK-86)', () => {
    assert.deepEqual(stijlNaarDb(['thais']), ['thais']);
    assert.deepEqual(stijlNaarDb(['japans']), ['japans']);
    assert.deepEqual(stijlNaarDb(['koreaans']), ['koreaans']);
  });
  test('dubbele keuzes komen maar één keer voor', () => {
    assert.deepEqual(stijlNaarDb(['chinees', 'indiaas']), ['aziatisch']);
    assert.deepEqual(stijlNaarDb(['thais', 'thais']), ['thais']);
  });
  test('elke stijl uit het scherm heeft minstens één databasestijl', () => {
    for (const m of ['avond'] as const) {
      for (const o of stijlOpties(m)) {
        assert.ok(stijlNaarDb([o.id]).length > 0, `${m}: ${o.id}`);
      }
    }
  });
  test('belgisch en hartig vallen onder klassiek; licht en comfort bestaan niet meer (WEEK-78 deel 2)', () => {
    assert.deepEqual(stijlNaarDb(['belgisch']), ['klassiek']);
    assert.deepEqual(stijlNaarDb(['hartig']), ['klassiek']);
    const alles = stijlOpties('avond').map((o) => o.id);
    for (const code of stijlNaarDb(alles)) {
      assert.ok(['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'thais', 'japans', 'koreaans'].includes(code), code);
    }
  });
});
