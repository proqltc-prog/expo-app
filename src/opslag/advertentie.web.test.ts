import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bekijkBeloondFilmpje, toestemmingKnopNodig, toonFilmpjeVoorInlezen, wijzigToestemming } from '@/opslag/advertentie.web';

// WEEK-167: op web is er geen advertentie-SDK; een beloond filmpje levert nooit een beloning op.
describe('advertenties op web (WEEK-167)', () => {
  test('bekijkBeloondFilmpje geeft false, zonder de advertentie-SDK te laden', async () => {
    assert.equal(await bekijkBeloondFilmpje(), false);
  });
  test('regressie WEEK-280: geen filmpje vóór het inlezen op web', async () => {
    assert.equal(await toonFilmpjeVoorInlezen(), 'niet_beschikbaar');
  });
});

// WEEK-325: op web is er geen reclame, dus geen knop om de toestemming te wijzigen.
describe('toestemming voor reclame op web (WEEK-325)', () => {
  test('de knop is nooit nodig en wijzigen doet niets', async () => {
    assert.equal(await toestemmingKnopNodig(), false);
    assert.equal(await wijzigToestemming(), false);
  });
});
