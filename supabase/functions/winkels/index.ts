// Supabase-functie `winkels` (WEEK-171): zoekt winkels in de buurt op de server, zodat de app niet
// rechtstreeks de openbare Overpass-servers aanroept (die falen vanuit de browser).
// Antwoord: de dichtstbijzijnde winkels, hoogstens 10. Resultaten worden enkele uren bewaard in het geheugen van de functie.
// Aanroep: POST { lat, lon } of POST { postcode, gemeente } (België).
import {
  bouwQuery,
  cacheSleutel,
  dichtstbij,
  leesAanvraag,
  leesWinkels,
  SERVER_TIMEOUT_S,
  Winkel,
} from './logica.ts';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CACHE_DUUR_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const cache = new Map<string, { tot: number; winkels: Winkel[] }>();

function antwoord(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}

/** Vraagt beide Overpass-servers tegelijk; het eerste bruikbare antwoord wint. */
async function haalOp(query: string, postcode: string): Promise<Winkel[]> {
  const pogingen = ENDPOINTS.map(async (endpoint) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout((SERVER_TIMEOUT_S + 5) * 1000),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json: unknown = await res.json();
    const remark = (json as { remark?: unknown })?.remark;
    if (typeof remark === 'string' && /runtime error|timed out|timeout|out of memory/i.test(remark)) throw new Error(remark);
    return leesWinkels(json, postcode);
  });
  return Promise.any(pogingen);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
  if (req.method !== 'POST') return antwoord({ fout: 'methode' }, 405);

  let ruw: unknown;
  try {
    ruw = await req.json();
  } catch {
    return antwoord({ fout: 'ongeldige_invoer' }, 400);
  }
  const aanvraag = leesAanvraag(ruw);
  if (!aanvraag) return antwoord({ fout: 'ongeldige_invoer' }, 400);

  const sleutel = cacheSleutel(aanvraag);
  const bewaard = cache.get(sleutel);
  const nu = Date.now();
  if (bewaard && bewaard.tot > nu) {
    return antwoord({ winkels: dichtstbij(bewaard.winkels, 'punt' in aanvraag ? aanvraag.punt : undefined) }, 200, {
      'Cache-Control': 'private, max-age=3600',
    });
  }

  try {
    const postcode = 'postcode' in aanvraag ? aanvraag.postcode : '';
    const gevonden = await haalOp(bouwQuery(aanvraag), postcode);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(sleutel, { tot: nu + CACHE_DUUR_MS, winkels: gevonden });
    return antwoord({ winkels: dichtstbij(gevonden, 'punt' in aanvraag ? aanvraag.punt : undefined) });
  } catch {
    return antwoord({ fout: 'zoeken_mislukt' }, 502);
  }
});
