// Haalt winkels in de buurt op bij OpenStreetMap (Overpass). Enkel op verzoek van de gebruiker.
import { bouwQuery, bouwQueryRond, leesWinkels, Winkel } from '@/lib/winkels';

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

/** Winkels op postcode en gemeente (terugval zonder GPS). Gooit een fout bij netwerkproblemen. */
export async function zoekWinkels(postcode: string, gemeente: string): Promise<Winkel[]> {
  const query = bouwQuery(postcode, gemeente);
  return query ? vraag(query, postcode) : [];
}

/** Winkels rond de GPS-locatie, binnen de straal in meter. */
export async function zoekWinkelsRond(lat: number, lon: number, straalM: number): Promise<Winkel[]> {
  const query = bouwQueryRond(lat, lon, straalM);
  return query ? vraag(query, '') : [];
}
