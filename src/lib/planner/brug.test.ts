import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { stijlOpties } from '@/lib/planner/opties';

describe('kooktijd naar databasecodes', () => {
  test('ontbijt Snel (0–5 min) valt in de snelle databasecode', () => {
    assert.deepEqual(kooktijdNaarDb(['ontbijt'], ['snel']), ['snel']);
  });
  test('ontbijt Rustig (6–15 min) valt in de snelle databasecode', () => {
    assert.deepEqual(kooktijdNaarDb(['ontbijt'], ['rustig']), ['snel']);
  });
  test('ontbijt Uitgebreid (16–30 min) raakt snel en gemiddeld', () => {
    assert.deepEqual(kooktijdNaarDb(['ontbijt'], ['uitgebreid']), ['snel', 'gemiddeld']);
  });
  test('middag Snel (0–30 min) raakt snel en gemiddeld', () => {
    assert.deepEqual(kooktijdNaarDb(['middag'], ['snel']), ['snel', 'gemiddeld']);
  });
  test('avond Verfijnd (31–50 min) raakt gemiddeld en uitgebreid', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['verfijnd']), ['gemiddeld', 'uitgebreid']);
  });
  test('meerdere momenten geven de vereniging van de codes', () => {
    assert.deepEqual(kooktijdNaarDb(['ontbijt', 'avond'], ['snel', 'verfijnd']), ['snel', 'gemiddeld', 'uitgebreid']);
  });
  test('een onbekende kooktijd geeft niets', () => {
    assert.deepEqual(kooktijdNaarDb(['avond'], ['bestaat-niet']), []);
  });
});

describe('stijl naar databasestijlen', () => {
  test('mediterraan en italiaans blijven zichzelf', () => {
    assert.deepEqual(stijlNaarDb(['mediterraan', 'italiaans']), ['mediterraan', 'italiaans']);
  });
  test('de Aziatische keukens vallen samen onder aziatisch', () => {
    assert.deepEqual(stijlNaarDb(['chinees', 'japans', 'koreaans', 'thais', 'indiaas']), ['aziatisch']);
  });
  test('dubbele keuzes komen maar één keer voor', () => {
    assert.deepEqual(stijlNaarDb(['chinees', 'thais']), ['aziatisch']);
  });
  test('elke stijl uit het scherm heeft minstens één databasestijl', () => {
    for (const m of ['ontbijt', 'middag', 'avond'] as const) {
      for (const o of stijlOpties(m)) {
        assert.ok(stijlNaarDb([o.id]).length > 0, `${m}: ${o.id}`);
      }
    }
  });
});
