import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { scanTerug } from '@/lib/scanBestemming';

describe('scanner sluiten (WEEK-110)', () => {
  test('vanuit de frigo keert de scanner terug naar de frigo', () => {
    assert.equal(scanTerug('frigo'), '/frigo');
  });
  test('vanuit de boodschappenlijst keert de scanner terug naar de lijst', () => {
    assert.equal(scanTerug('lijst'), '/lijst');
  });
  test('zonder of met onbekende herkomst valt het terug op de geschiedenis (regressie)', () => {
    assert.equal(scanTerug(undefined), undefined);
    assert.equal(scanTerug(''), undefined);
    assert.equal(scanTerug('onbekend'), undefined);
  });
});
