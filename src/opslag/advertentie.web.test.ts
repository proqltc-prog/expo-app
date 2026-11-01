import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bekijkBeloondFilmpje } from '@/opslag/advertentie.web';

// WEEK-167: op web is er geen advertentie-SDK; een beloond filmpje levert nooit een beloning op.
describe('advertenties op web (WEEK-167)', () => {
  test('bekijkBeloondFilmpje geeft false, zonder de advertentie-SDK te laden', async () => {
    assert.equal(await bekijkBeloondFilmpje(), false);
  });
});
