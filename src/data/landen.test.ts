import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { landenkleuren } from '@/data/landen';
import { stijlOpties } from '@/lib/planner/opties';

const ALLE = ['mediterraan', 'chinees', 'indiaas', 'frans', 'mexicaans', 'italiaans', 'koreaans', 'thais', 'japans', 'belgisch', 'hartig', 'zoet'];

describe('landenkleuren', () => {
  test('elke stijl uit het weekmenu heeft drie kleuren', () => {
    for (const id of ALLE) {
      const kleuren = landenkleuren(id);
      assert.equal(kleuren.length, 3, id);
      for (const k of kleuren) assert.match(k, /^#[0-9A-Fa-f]{6}$/, `${id}: ${k}`);
    }
  });
  test('de stijlen in het scherm zijn allemaal gedekt', () => {
    for (const m of ['ontbijt', 'middag', 'avond'] as const) {
      for (const o of stijlOpties(m)) assert.ok(ALLE.includes(o.id), `${m}: ${o.id}`);
    }
  });
  test('Thais, Koreaans, Japans en Italiaans zijn onderling verschillend', () => {
    const eerste = ['thais', 'koreaans', 'japans', 'italiaans'].map((id) => landenkleuren(id).join(','));
    assert.equal(new Set(eerste).size, 4);
  });
  test('een onbekende stijl krijgt de neutrale kleuren, geen fout', () => {
    assert.equal(landenkleuren('bestaat-niet').length, 3);
  });
});
