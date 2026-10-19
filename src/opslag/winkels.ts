// Haalt winkels bij OpenStreetMap (Overpass) en het postcodepunt bij Nominatim. Enkel na een wijziging van de postcode.
import { bouwPostcodeUrl, leesPlaats, leesPunt } from '@/lib/postcodepunt';
import { probeerAchtereen } from '@/lib/netwerk';
import { bouwQuery, leesWinkels, Winkel } from '@/lib/winkels';
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

/** Winkels op postcode en gemeente. Gooit een fout bij netwerkproblemen. */
export async function zoekWinkels(postcode: string, gemeente: string): Promise<Winkel[]> {
  const query = bouwQuery(postcode, gemeente);
  if (!query) return [];
  return probeerAchtereen(ENDPOINTS.map((endpoint) => () => vraag(endpoint, query, postcode)));
}

/** Punt van de postcode (Nominatim). Undefined als de postcode niet gevonden wordt. */
export async function zoekPostcodePunt(postcode: string, gemeente: string): Promise<Positie | undefined> {
  const url = bouwPostcodeUrl(postcode, gemeente);
  if (!url) return undefined;
  const antwoord = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPunt(await antwoord.json());
}

/** Gemeente en land bij een postcode (Nominatim), voor het invulvoorstel in het profiel (WEEK-69). */
export async function zoekPlaats(postcode: string): Promise<{ gemeente: string; land: string } | undefined> {
  const url = bouwPostcodeUrl(postcode, '');
  if (!url) return undefined;
  const antwoord = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPlaats(await antwoord.json());
}
