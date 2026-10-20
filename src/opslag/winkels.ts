// Haalt winkels bij OpenStreetMap (Overpass) en het postcodepunt bij Nominatim. Enkel na een wijziging van de postcode.
import { bouwPostcodeUrl, leesPlaats, leesPunt, NOMINATIM_HEADERS } from '@/lib/postcodepunt';
import { eersteGeslaagd, metTimeout } from '@/lib/netwerk';
import { bouwQuery, bouwStraalQuery, leesWinkels, OVERPASS_TIMEOUT_MS, Winkel } from '@/lib/winkels';
import type { Positie } from '@/lib/winkelvoorstel';

// Overpass-servers: de tweede is een spiegel. Beide worden tegelijk gevraagd, het eerste bruikbare antwoord wint (WEEK-145).
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function vraag(endpoint: string, query: string, postcode: string): Promise<Winkel[]> {
  const wacht = metTimeout(OVERPASS_TIMEOUT_MS);
  try {
    const antwoord = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: wacht.signal,
    });
    if (!antwoord.ok) throw new Error(`Overpass ${antwoord.status}`);
    return leesWinkels(await antwoord.json(), postcode);
  } finally {
    wacht.klaar();
  }
}

/**
 * Winkels in de buurt. Met het punt van de postcode zoeken we binnen 10 km (WEEK-115); zonder punt
 * de zoekopdracht op postcode en gemeente. Beide servers tegelijk, met een korte wachttijd (WEEK-145):
 * het eerste antwoord telt. Gooit een fout als geen enkele server antwoordt.
 */
export async function zoekWinkels(postcode: string, gemeente: string, punt?: Positie): Promise<Winkel[]> {
  const query = punt ? bouwStraalQuery(punt) : bouwQuery(postcode, gemeente);
  if (!query) return [];
  return eersteGeslaagd(ENDPOINTS.map((endpoint) => () => vraag(endpoint, query, postcode)));
}

/** Punt van de postcode (Nominatim). Undefined als de postcode niet gevonden wordt. */
export async function zoekPostcodePunt(postcode: string, gemeente: string): Promise<Positie | undefined> {
  const url = bouwPostcodeUrl(postcode, gemeente);
  if (!url) return undefined;
  const wacht = metTimeout();
  try {
    const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS, signal: wacht.signal });
    if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
    return leesPunt(await antwoord.json());
  } finally {
    wacht.klaar();
  }
}

/** Gemeente en land bij een postcode (Nominatim), voor het invulvoorstel in het profiel (WEEK-69). */
export async function zoekPlaats(postcode: string): Promise<{ gemeente: string; land: string } | undefined> {
  const url = bouwPostcodeUrl(postcode, '');
  if (!url) return undefined;
  const wacht = metTimeout();
  const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS, signal: wacht.signal }).finally(() => wacht.klaar());
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPlaats(await antwoord.json());
}
