import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';
import { TALEN } from '@/i18n';

describe('bereidingen van de receptenbank (WEEK-81)', () => {
  test('elk recept uit de receptenbank heeft bereidingsstappen', () => {
    for (const r of RECEPTENBANK) {
      assert.ok(BEREIDINGEN[r.id], `geen bereiding voor ${r.id}`);
    }
  });

  test('elk recept heeft stappen in alle zes talen, en dat aantal is gelijk', () => {
    for (const r of RECEPTENBANK) {
      const per = BEREIDINGEN[r.id];
      const aantal = per.nl.length;
      assert.ok(aantal >= 2, `${r.id}: te weinig stappen`);
      for (const taal of TALEN) {
        assert.equal(per[taal].length, aantal, `${r.id} (${taal}): ander aantal stappen`);
        for (const stap of per[taal]) assert.ok(stap.trim().length > 0, `${r.id} (${taal}): lege stap`);
      }
    }
  });

  test('de bereidingen horen bij bestaande recepten, geen losse id’s', () => {
    const ids = new Set(RECEPTENBANK.map((r) => r.id));
    for (const id of Object.keys(BEREIDINGEN)) assert.ok(ids.has(id), `onbekend id ${id}`);
  });
});
