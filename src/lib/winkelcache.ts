// Winkels van eerdere zoekopdrachten, per postcode, op dit toestel (WEEK-148). Zuiver: geen opslag hier.
import type { Positie } from '@/lib/winkelvoorstel';
import type { Winkel } from '@/lib/winkels';

export type WinkelCacheItem = { sleutel: string; positie?: Positie; winkels: Winkel[]; opgehaaldOp: string };

/** Hoeveel postcodes we bewaren; de oudste vallen eruit. */
export const WINKEL_CACHE_MAX = 10;
/** Na zoveel uur geldt een bewaard resultaat als verouderd en wordt het op de achtergrond ververst. */
export const WINKEL_CACHE_VERS_UUR = 24;

export function winkelSleutel(postcode: string, gemeente: string): string {
  return `${postcode.trim()}|${gemeente.trim()}`;
}

/** Zet het resultaat vooraan; een eerder resultaat voor dezelfde postcode wordt vervangen. */
export function bewaarInCache(cache: readonly WinkelCacheItem[], item: WinkelCacheItem, max: number = WINKEL_CACHE_MAX): WinkelCacheItem[] {
  return [item, ...cache.filter((c) => c.sleutel !== item.sleutel)].slice(0, max);
}

export function zoekInCache(cache: readonly WinkelCacheItem[], sleutel: string): WinkelCacheItem | undefined {
  return cache.find((c) => c.sleutel === sleutel);
}

/** Is het bewaarde resultaat nog vers genoeg om zonder vernieuwing te tonen? */
export function isVers(item: WinkelCacheItem, nu: Date, maxUur: number = WINKEL_CACHE_VERS_UUR): boolean {
  const opgehaald = new Date(item.opgehaaldOp).getTime();
  if (Number.isNaN(opgehaald)) return false;
  return nu.getTime() - opgehaald < maxUur * 3600_000;
}

/** Leest de opgeslagen cache veilig: wat niet klopt, wordt overgeslagen. */
export function leesWinkelCache(ruw: unknown): WinkelCacheItem[] {
  if (!Array.isArray(ruw)) return [];
  return ruw.filter(
    (c): c is WinkelCacheItem =>
      !!c && typeof c === 'object' && typeof (c as WinkelCacheItem).sleutel === 'string' && typeof (c as WinkelCacheItem).opgehaaldOp === 'string' && Array.isArray((c as WinkelCacheItem).winkels),
  );
}
