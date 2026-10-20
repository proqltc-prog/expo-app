import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bewaarInCache, isBewaardWaard, isVers, leesWinkelCache, winkelSleutel, WINKEL_CACHE_MAX, zoekInCache, type WinkelCacheItem } from '@/lib/winkelcache';
import type { Winkel } from '@/lib/winkels';

const winkel = { naam: 'Lidl' } as unknown as Winkel;
const item = (sleutel: string, opgehaaldOp = '2026-10-20T10:00:00Z'): WinkelCacheItem => ({ sleutel, winkels: [winkel], opgehaaldOp });

describe('winkelcache (WEEK-148)', () => {
  test('de sleutel is per postcode en gemeente, zonder spaties rond de waarden', () => {
    assert.equal(winkelSleutel(' 1760 ', ' Roosdaal '), '1760|Roosdaal');
  });

  test('bewaren zet het nieuwste vooraan en vervangt dezelfde postcode', () => {
    const cache = bewaarInCache([item('1000|Brussel'), item('1760|Roosdaal')], item('1760|Roosdaal', '2026-10-21T10:00:00Z'));
    assert.deepEqual(cache.map((c) => c.sleutel), ['1760|Roosdaal', '1000|Brussel']);
    assert.equal(cache[0].opgehaaldOp, '2026-10-21T10:00:00Z');
  });

  test('de cache houdt het maximum aan en laat de oudste vallen', () => {
    let cache: WinkelCacheItem[] = [];
    for (let i = 0; i < WINKEL_CACHE_MAX + 3; i++) cache = bewaarInCache(cache, item(`${i}|x`));
    assert.equal(cache.length, WINKEL_CACHE_MAX);
    assert.equal(cache[0].sleutel, `${WINKEL_CACHE_MAX + 2}|x`);
    assert.equal(zoekInCache(cache, '0|x'), undefined);
  });

  test('zoeken geeft het bewaarde resultaat of niets', () => {
    assert.equal(zoekInCache([item('1760|Roosdaal')], '1760|Roosdaal')?.sleutel, '1760|Roosdaal');
    assert.equal(zoekInCache([item('1760|Roosdaal')], '9999|Onbekend'), undefined);
  });

  test('een resultaat is vers binnen 24 uur en daarna verouderd', () => {
    const opgehaald = item('1760|Roosdaal', '2026-10-20T10:00:00Z');
    assert.equal(isVers(opgehaald, new Date('2026-10-21T09:00:00Z')), true);
    assert.equal(isVers(opgehaald, new Date('2026-10-21T11:00:00Z')), false);
  });

  test('een ongeldige datum is niet vers', () => {
    assert.equal(isVers(item('1760|Roosdaal', 'geen-datum'), new Date()), false);
  });

  test('lezen slaat ongeldige items over en behoudt de goede', () => {
    const uit = leesWinkelCache([item('1760|Roosdaal'), { sleutel: 'x' }, 'kapot', null]);
    assert.deepEqual(uit.map((c) => c.sleutel), ['1760|Roosdaal']);
  });

  test('lezen van niets of een niet-lijst geeft een lege cache (regressie)', () => {
    assert.deepEqual(leesWinkelCache(null), []);
    assert.deepEqual(leesWinkelCache({ geen: 'lijst' }), []);
  });

  test('een lege lijst wordt niet als bruikbaar resultaat beschouwd (WEEK-152)', () => {
    assert.equal(isBewaardWaard({ sleutel: 'x', winkels: [], opgehaaldOp: '2026-10-20T10:00:00Z' }), false);
    assert.equal(isBewaardWaard(item('x')), true);
  });

  test('oude lege items op het toestel worden bij het lezen genegeerd (WEEK-152)', () => {
    const uit = leesWinkelCache([{ sleutel: 'leeg', winkels: [], opgehaaldOp: '2026-10-20T10:00:00Z' }, item('gevuld')]);
    assert.deepEqual(uit.map((c) => c.sleutel), ['gevuld']);
  });
});
