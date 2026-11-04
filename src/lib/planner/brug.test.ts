import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { stijlOpties } from '@/lib/planner/opties';

describe('kooktijd naar databasecodes (WEEK-199: dezelfde codes als de databank)', () => {
  test('elke kooktijd is zijn eigen databasecode', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['snel']), ['snel']);
    assert.deepEqual(kooktijdNaarDb(['avond'], ['gemiddeld']), ['gemiddeld']);
    assert.deepEqual(kooktijdNaarDb(['avond'], ['uitgebreid']), ['uitgebreid']);
  });
  test('meerdere kooktijden komen in vaste volgorde, zonder dubbele', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['uitgebreid', 'snel', 'snel']), ['snel', 'uitgebreid']);
  });
  test('een onbekende of oude kooktijd geeft niets; het omzetten van oude keuzes gebeurt bij het inlezen', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['bestaat-niet']), []);
    assert.deepEqual(kooktijdNaarDb(['avond'], ['verfijnd']), []);
  });
  test('zonder momenten blijft er niets over', () => {
    assert.deepEqual(kooktijdNaarDb([], ['snel']), []);
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
