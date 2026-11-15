import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { scanActies } from '@/lib/scanActies';

describe('knoppen onder een scanresultaat (WEEK-298)', () => {
  test('pagina Scan: enkel Sluiten', () => {
    assert.deepEqual(scanActies(undefined, undefined), ['sluiten']);
    assert.deepEqual(scanActies('menu', undefined), ['sluiten']);
  });

  test('vanaf In huis: Sluiten en Toevoegen, ook voor details van een product dat er al staat', () => {
    assert.deepEqual(scanActies('frigo', undefined), ['sluiten', 'toevoegen']);
    assert.deepEqual(scanActies('frigo', 'item-1'), ['sluiten', 'toevoegen']);
  });

  test('regressie: vanaf de boodschappenlijst blijven de knoppen van de lijst', () => {
    assert.equal(scanActies('lijst', undefined), 'lijst');
  });
});
