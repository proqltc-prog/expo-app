import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { POPUP_MIN, POPUP_RAND, popupHoogte } from '@/lib/popupHoogte';

describe('WEEK-285: hoogte van de popup', () => {
  test('past binnen de zichtbare hoogte van een iPhone in Safari', () => {
    assert.equal(popupHoogte(660), 660 - POPUP_RAND);
    assert.ok(popupHoogte(560) <= 560);
    assert.ok(popupHoogte(660) <= 660);
  });
  test('nooit kleiner dan het minimum, ook met het toetsenbord open', () => {
    assert.equal(popupHoogte(200), POPUP_MIN);
    assert.equal(popupHoogte(0), POPUP_MIN);
    assert.equal(popupHoogte(Number.NaN), POPUP_MIN);
  });
  test('regressie: op een groot scherm groeit het venster mee (de breedte blijft beperkt in de stijl)', () => {
    assert.equal(popupHoogte(1000), 1000 - POPUP_RAND);
  });
});
