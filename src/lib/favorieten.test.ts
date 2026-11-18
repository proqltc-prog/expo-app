import { test } from 'node:test';
import assert from 'node:assert/strict';
import { favorietIds, filterFavorieten, normaliseerFavorieten, wisselFavoriet } from './favorieten';

const NU = '2026-11-18T19:00:00.000Z';

test('WEEK-315: een hartje zet een recept bij de favorieten', () => {
  assert.deepEqual(wisselFavoriet([], 'db-12', NU), [{ id: 'db-12', op: NU }]);
});

test('WEEK-315: nog eens tikken haalt het recept weg, de andere blijven', () => {
  const lijst = [{ id: 'db-12', op: NU }, { id: 'eigen-1', op: NU }];
  assert.deepEqual(wisselFavoriet(lijst, 'db-12', NU), [{ id: 'eigen-1', op: NU }]);
});

test('WEEK-315: filter aan toont enkel de favorieten, in dezelfde volgorde', () => {
  const items = [{ id: 'db-1' }, { id: 'db-2' }, { id: 'eigen-3' }];
  const ids = favorietIds([{ id: 'eigen-3', op: NU }, { id: 'db-1', op: NU }]);
  assert.deepEqual(filterFavorieten(items, ids, true), [{ id: 'db-1' }, { id: 'eigen-3' }]);
});

test('WEEK-315 regressie: filter uit laat de lijst ongewijzigd', () => {
  const items = [{ id: 'db-1' }, { id: 'db-2' }];
  assert.deepEqual(filterFavorieten(items, new Set(['db-1']), false), items);
});

test('WEEK-315: filter aan zonder favorieten geeft een lege lijst', () => {
  assert.deepEqual(filterFavorieten([{ id: 'db-1' }], new Set(), true), []);
});

test('WEEK-315: normaliseren laat onbruikbare en dubbele rijen weg', () => {
  assert.deepEqual(
    normaliseerFavorieten([{ id: 'db-1', op: NU }, { id: 'db-1', op: NU }, { id: '' }, null, { id: 5 }, { id: 'db-2' }]),
    [{ id: 'db-1', op: NU }, { id: 'db-2', op: '' }]
  );
  assert.deepEqual(normaliseerFavorieten('kapot'), []);
});
