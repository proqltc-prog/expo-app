import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BELONING_AI_VRAAG, BELONING_SCANS, beloningVoor } from '@/lib/beloning';

describe('beloning reclamefilmpje (WEEK-38)', () => {
  test('een filmpje geeft 1 extra AI-vraag of 3 extra scans', () => {
    assert.equal(BELONING_AI_VRAAG, 1);
    assert.equal(BELONING_SCANS, 3);
    assert.equal(beloningVoor('ai'), 1);
    assert.equal(beloningVoor('scans'), 3);
  });
});
