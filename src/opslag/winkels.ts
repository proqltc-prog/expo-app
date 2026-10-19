// Haalt winkels bij OpenStreetMap (Overpass) en het postcodepunt bij Nominatim. Enkel na een wijziging van de postcode.
import { bouwPostcodeUrl, leesPlaats, leesPunt, NOMINATIM_HEADERS } from '@/lib/postcodepunt';
import { probeerAchtereen, probeerOpnieuw } from '@/lib/netwerk';
import { bouwQuery, bouwStraalQuery, leesWinkels, Winkel } from '@/lib/winkels';
import type { Positie } from '@/lib/winkelvoorstel';

// Overpass-servers: de tweede is een spiegel die we gebruiken als de eerste faalt (WEEK-95).
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function vraag(endpoint: string, query: string, postcode: string): Promise<Winkel[]> {
  const antwoord = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!antwoord.ok) throw new Error(`Overpass ${antwoord.status}`);
  return leesWinkels(await antwoord.json(), postcode);
}

/**
 * Winkels in de buurt. Met het punt van de postcode zoeken we binnen 10 km (WEEK-115); zonder punt
 * de zoekopdracht op postcode en gemeente. Elke server krijgt één nieuwe poging. Gooit een fout bij netwerkproblemen.
 */
export async function zoekWinkels(postcode: string, gemeente: string, punt?: Positie): Promise<Winkel[]> {
  const query = punt ? bouwStraalQuery(punt) : bouwQuery(postcode, gemeente);
  if (!query) return [];
  return probeerAchtereen(ENDPOINTS.map((endpoint) => () => probeerOpnieuw(() => vraag(endpoint, query, postcode))));
}

/** Punt van de postcode (Nominatim). Undefined als de postcode niet gevonden wordt. */
export async function zoekPostcodePunt(postcode: string, gemeente: string): Promise<Positie | undefined> {
  const url = bouwPostcodeUrl(postcode, gemeente);
  if (!url) return undefined;
  const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPunt(await antwoord.json());
}

/** Gemeente en land bij een postcode (Nominatim), voor het invulvoorstel in het profiel (WEEK-69). */
export async function zoekPlaats(postcode: string): Promise<{ gemeente: string; land: string } | undefined> {
  const url = bouwPostcodeUrl(postcode, '');
  if (!url) return undefined;
  const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPlaats(await antwoord.json());
}
