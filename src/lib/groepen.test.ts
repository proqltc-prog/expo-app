import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { wisselGroep, zichtbareRegels } from '@/lib/groepen';

describe('wisselGroep (WEEK-124)', () => {
  test('een dichte groep gaat open', () => {
    assert.deepEqual([...wisselGroep(new Set(), 'fruit')], ['fruit']);
  });
  test('een open groep gaat dicht', () => {
    assert.deepEqual([...wisselGroep(new Set(['fruit']), 'fruit')], []);
  });
  test('wisselen van één groep laat de andere open staan', () => {
    const uit = wisselGroep(new Set(['fruit']), 'zuivel');
    assert.deepEqual([...uit].sort(), ['fruit', 'zuivel']);
  });
  test('het oorspronkelijke setje wordt niet gewijzigd', () => {
    const open = new Set(['fruit']);
    wisselGroep(open, 'fruit');
    assert.deepEqual([...open], ['fruit']);
  });
});

describe('zichtbareRegels (WEEK-124)', () => {
  test('standaard, bij een gesloten groep, is er niets zichtbaar', () => {
    assert.deepEqual(zichtbareRegels(['appel', 'peer'], 'fruit', new Set()), []);
  });
  test('een open groep toont al haar regels', () => {
    assert.deepEqual(zichtbareRegels(['appel', 'peer'], 'fruit', new Set(['fruit'])), ['appel', 'peer']);
  });
  test('regressie: het openen van de ene groep toont de regels van een andere niet', () => {
    assert.deepEqual(zichtbareRegels(['melk'], 'zuivel', new Set(['fruit'])), []);
  });
  test('het resultaat is een kopie van de regels', () => {
    const regels = ['appel'];
    zichtbareRegels(regels, 'fruit', new Set(['fruit'])).push('extra');
    assert.deepEqual(regels, ['appel']);
  });
});
