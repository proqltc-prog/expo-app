// Haalt winkels bij OpenStreetMap (Overpass) en het postcodepunt bij Nominatim. Enkel na een wijziging van de postcode.
import { bouwPostcodeUrl, leesPunt } from '@/lib/postcodepunt';
import { bouwQuery, leesWinkels, Winkel } from '@/lib/winkels';
import type { Positie } from '@/lib/winkelvoorstel';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

async function vraag(query: string, postcode: string): Promise<Winkel[]> {
  const antwoord = await fetch(ENDPOINT, {
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
  return query ? vraag(query, postcode) : [];
}

/** Punt van de postcode (Nominatim). Undefined als de postcode niet gevonden wordt. */
export async function zoekPostcodePunt(postcode: string, gemeente: string): Promise<Positie | undefined> {
  const url = bouwPostcodeUrl(postcode, gemeente);
  if (!url) return undefined;
  const antwoord = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPunt(await antwoord.json());
}
