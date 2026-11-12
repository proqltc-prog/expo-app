import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { magInlezenNaFilmpje } from '@/lib/inlezenFilmpje';

describe('filmpje vóór het inlezen van een recept (WEEK-280)', () => {
  test('volledig bekeken: inlezen gaat door', () => {
    assert.equal(magInlezenNaFilmpje('bekeken'), true);
  });
  test('geen filmpje beschikbaar (website, geen internet, geen toestemming): inlezen gaat toch door', () => {
    assert.equal(magInlezenNaFilmpje('niet_beschikbaar'), true);
  });
  test('vroegtijdig gesloten: niet inlezen', () => {
    assert.equal(magInlezenNaFilmpje('afgebroken'), false);
  });
});
