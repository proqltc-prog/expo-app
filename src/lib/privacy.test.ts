import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRIVACY_URL, verwijderUrl } from './privacy';

describe('WEEK-324: account en gegevens laten verwijderen', () => {
  test('de link wijst naar het juiste deel van het privacybeleid', () => {
    assert.equal(verwijderUrl('nl'), `${PRIVACY_URL}#verwijderen`);
    assert.equal(verwijderUrl('fr'), `${PRIVACY_URL}#delete`);
    assert.equal(verwijderUrl('en'), `${PRIVACY_URL}#delete`);
  });
  test('regressie: het privacybeleid heeft beide ankers en is versie 6 of later', () => {
    const md = readFileSync(join(__dirname, '..', '..', 'store', 'privacybeleid.md'), 'utf8');
    assert.ok(md.includes('{#verwijderen}'));
    assert.ok(md.includes('{#delete}'));
    assert.match(md, /Versie (\d+)/);
    assert.ok(Number(/Versie (\d+)/.exec(md)![1]) >= 6);
  });
});
