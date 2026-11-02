// Gemeente en land bij een postcode (Nominatim), voor het invulvoorstel in het profiel (WEEK-69).
// De winkelzoeker gebruikt geen netwerk meer: zie src/ui/winkelvoorstel.tsx (WEEK-175).
import { bouwPostcodeUrl, leesPlaats, NOMINATIM_HEADERS } from '@/lib/postcodepunt';
import { metTimeout } from '@/lib/netwerk';

/** Gemeente en land bij een postcode (Nominatim). */
export async function zoekPlaats(postcode: string): Promise<{ gemeente: string; land: string } | undefined> {
  const url = bouwPostcodeUrl(postcode, '');
  if (!url) return undefined;
  const wacht = metTimeout();
  const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS, signal: wacht.signal }).finally(() => wacht.klaar());
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPlaats(await antwoord.json());
}
