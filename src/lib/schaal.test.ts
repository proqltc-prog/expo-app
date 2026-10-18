import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { geschaaldeHoeveelheid, KIND_FACTOR, schaalFactor, VOLWASSENE_FACTOR } from './schaal';

describe('schaalFactor (WEEK-70)', () => {
  test('een volwassene is factor 1, een kind van 0 tot 12 is 0,5', () => {
    assert.equal(VOLWASSENE_FACTOR, 1);
    assert.equal(KIND_FACTOR, 0.5);
    assert.equal(schaalFactor({ volwassenen: 1, kinderen: 0 }), 1);
    assert.equal(schaalFactor({ volwassenen: 0, kinderen: 1 }), 0.5);
  });

  test('gezin van 2 volwassenen en 2 kinderen is 3', () => {
    assert.equal(schaalFactor({ volwassenen: 2, kinderen: 2 }), 3);
  });

  test('gezin van 2 volwassenen en 1 kind is 2,5 (niet naar boven afgerond)', () => {
    assert.equal(schaalFactor({ volwassenen: 2, kinderen: 1 }), 2.5);
  });

  test('ongeldige aantallen tellen als 0', () => {
    assert.equal(schaalFactor({ volwassenen: -1, kinderen: 0 }), 0);
    assert.equal(schaalFactor({ volwassenen: 1, kinderen: -3 }), 1);
    assert.equal(schaalFactor({ volwassenen: 0, kinderen: 0 }), 0);
  });

  test('een niet-geheel aantal personen wordt naar beneden afgerond', () => {
    assert.equal(schaalFactor({ volwassenen: 1.9, kinderen: 0 }), 1);
  });
});

describe('geschaaldeHoeveelheid (WEEK-70)', () => {
  test('100 g voor 2 volwassenen en 1 kind wordt 250 g', () => {
    assert.equal(geschaaldeHoeveelheid(100, { volwassenen: 2, kinderen: 1 }, 'g'), 250);
  });

  test('stuks worden naar boven afgerond: 2 eieren voor 1 kind wordt 1 ei', () => {
    assert.equal(geschaaldeHoeveelheid(2, { volwassenen: 0, kinderen: 1 }, 'stuk'), 1);
  });

  test('basishoeveelheid voor 1 volwassene blijft gelijk', () => {
    assert.equal(geschaaldeHoeveelheid(200, { volwassenen: 1, kinderen: 0 }, 'g'), 200);
  });
});
