// Haalt winkels in de buurt op bij OpenStreetMap (Overpass). Enkel op verzoek van de gebruiker.
import { bouwQuery, leesWinkels, Winkel } from '@/lib/winkels';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

/** Zoekt winkels in de buurt. Gooit een fout bij netwerk- of serverproblemen. */
export async function zoekWinkels(postcode: string, gemeente: string): Promise<Winkel[]> {
  const query = bouwQuery(postcode, gemeente);
  if (!query) return [];
  const antwoord = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!antwoord.ok) throw new Error(`Overpass ${antwoord.status}`);
  return leesWinkels(await antwoord.json(), postcode);
}
