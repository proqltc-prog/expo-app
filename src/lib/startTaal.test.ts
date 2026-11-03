import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTaal } from '@/lib/startTaal';

describe('startTaal (WEEK-185)', () => {
  test('Nederlands blijft Nederlands, ook met een regiocode', () => {
    assert.equal(startTaal(['nl-BE']), 'nl');
    assert.equal(startTaal(['nl']), 'nl');
  });

  test('Frans blijft Frans', () => {
    assert.equal(startTaal(['fr-FR']), 'fr');
  });

  test('Duits krijgt Engels', () => {
    assert.equal(startTaal(['de-DE']), 'en');
  });

  test('alle andere talen, en een leeg toestel, krijgen Engels', () => {
    assert.equal(startTaal(['es-ES']), 'en');
    assert.equal(startTaal(['pt-BR']), 'en');
    assert.equal(startTaal(['en-US']), 'en');
    assert.equal(startTaal([]), 'en');
  });

  test('de eerste taal van het toestel telt', () => {
    assert.equal(startTaal(['de-DE', 'nl-BE']), 'en');
    assert.equal(startTaal(['fr-BE', 'nl-BE']), 'fr');
  });
});
