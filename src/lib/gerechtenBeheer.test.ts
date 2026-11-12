import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { magGerechtenBeheren } from '@/lib/gezinbeheer';
import { teVersturenSoorten } from '@/lib/sync';

describe('gerechten beheren (WEEK-276)', () => {
  test('zonder gezinsruimte beheer je zelf alles', () => {
    assert.equal(magGerechtenBeheren(false, undefined, undefined), true);
  });
  test('met een gezin enkel de beheerder', () => {
    assert.equal(magGerechtenBeheren(true, 'a', 'a'), true);
    assert.equal(magGerechtenBeheren(true, 'a', 'b'), false);
    assert.equal(magGerechtenBeheren(true, undefined, 'b'), false);
  });
});

describe('doorsturen per soort (WEEK-275)', () => {
  test('de beheerder stuurt alle soorten door, ook eigen gerechten', () => {
    assert.deepEqual(teVersturenSoorten(['lijst', 'frigo', 'eigenRecept'], true), ['lijst', 'frigo', 'eigenRecept']);
  });
  test('een ander lid stuurt geen eigen gerechten door; lijst en In huis wel', () => {
    assert.deepEqual(teVersturenSoorten(['lijst', 'frigo', 'eigenRecept'], false), ['lijst', 'frigo']);
  });
});
