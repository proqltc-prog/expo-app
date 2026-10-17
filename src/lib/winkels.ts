// Winkels in de buurt (WEEK-53). Pure logica: de query bouwen en de antwoorden van OpenStreetMap lezen.
// Het netwerkverkeer zit in src/opslag/winkels.ts.

export type WinkelSoort = 'supermarkt' | 'slager' | 'bakker' | 'groenteboer';

/** OpenStreetMap-tag (shop=…) naar onze soort. */
export const WINKEL_TAGS: Record<string, WinkelSoort> = {
  supermarket: 'supermarkt',
  butcher: 'slager',
  bakery: 'bakker',
  greengrocer: 'groenteboer',
};

/** Lokaal eerst: 'postcode' = zelfde postcode, 'gemeente' = zelfde gemeente. */
export type Nabij = 'postcode' | 'gemeente';

export type Winkel = {
  naam: string;
  soort: WinkelSoort;
  postcode: string;
  gemeente: string;
  nabij: Nabij;
  lat?: number;
  lon?: number;
};

export const MAX_WINKELS = 20;

const BELGISCHE_POSTCODE = /^\d{4}$/;

/** Haalt alles weg wat niet in een gemeentenaam hoort (zo blijft de Overpass-query veilig). */
export function schoonGemeente(gemeente: string): string {
  return gemeente.replace(/[^\p{L}\p{N} '-]/gu, '').replace(/\s+/g, ' ').trim();
}

/**
 * Overpass-query voor winkels in België, met dezelfde postcode of in dezelfde gemeente.
 * Geeft null als de postcode geen geldige Belgische postcode is.
 */
export function bouwQuery(postcode: string, gemeente: string): string | null {
  const pc = postcode.trim();
  if (!BELGISCHE_POSTCODE.test(pc)) return null;
  const gem = schoonGemeente(gemeente);
  const soorten = Object.keys(WINKEL_TAGS).join('|');
  const filter = `nwr(area.b)["shop"~"^(${soorten})$"]`;
  const delen = [`${filter}["addr:postcode"="${pc}"];`];
  if (gem) delen.push(`${filter}["addr:city"="${gem}"];`);
  return [
    '[out:json][timeout:25];',
    'area["ISO3166-1"="BE"][admin_level=2]->.b;',
    '(',
    ...delen,
    ');',
    `out center ${MAX_WINKELS * 3};`,
  ].join('\n');
}

/**
 * Overpass-query voor winkels rond een punt (GPS). Coördinaten worden afgerond op 3 decimalen
 * (± 100 meter), zodat we geen exacte locatie doorsturen. Geeft null bij ongeldige invoer.
 */
export function bouwQueryRond(lat: number, lon: number, straalM: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !(straalM > 0)) return null;
  const soorten = Object.keys(WINKEL_TAGS).join('|');
  const straal = Math.min(Math.round(straalM), 50000);
  return [
    '[out:json][timeout:25];',
    '(',
    `nwr(around:${straal},${lat.toFixed(3)},${lon.toFixed(3)})["shop"~"^(${soorten})$"];`,
    ');',
    `out center ${MAX_WINKELS * 3};`,
  ].join('\n');
}

/** Sorteert lokaal eerst, dan op soort en naam, en beperkt tot MAX_WINKELS. */
export function rangschik(winkels: Winkel[]): Winkel[] {
  const volgorde: Record<Nabij, number> = { postcode: 0, gemeente: 1 };
  return [...winkels]
    .sort((a, b) => volgorde[a.nabij] - volgorde[b.nabij] || a.soort.localeCompare(b.soort) || a.naam.localeCompare(b.naam))
    .slice(0, MAX_WINKELS);
}

/** Leest het antwoord van Overpass. Onbruikbare of onbekende elementen worden overgeslagen. */
export function leesWinkels(ruw: unknown, postcode: string): Winkel[] {
  if (!ruw || typeof ruw !== 'object') return [];
  const elementen = (ruw as { elements?: unknown }).elements;
  if (!Array.isArray(elementen)) return [];
  const pc = postcode.trim();
  const gezien = new Set<string>();
  const uit: Winkel[] = [];
  for (const el of elementen) {
    if (!el || typeof el !== 'object') continue;
    const e = el as Record<string, unknown>;
    const tags = (e.tags && typeof e.tags === 'object' ? e.tags : {}) as Record<string, unknown>;
    const naam = typeof tags.name === 'string' ? tags.name.trim() : '';
    const soort = typeof tags.shop === 'string' ? WINKEL_TAGS[tags.shop] : undefined;
    if (!naam || !soort) continue;
    const postcodeTag = typeof tags['addr:postcode'] === 'string' ? tags['addr:postcode'].trim() : '';
    const stad = typeof tags['addr:city'] === 'string' ? tags['addr:city'].trim() : '';
    const sleutel = `${naam.toLowerCase()}|${postcodeTag}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    const punt = (e.center && typeof e.center === 'object' ? e.center : e) as Record<string, unknown>;
    const lat = typeof punt.lat === 'number' ? punt.lat : undefined;
    const lon = typeof punt.lon === 'number' ? punt.lon : undefined;
    uit.push({ naam, soort, postcode: postcodeTag, gemeente: stad, nabij: postcodeTag === pc ? 'postcode' : 'gemeente', lat, lon });
  }
  return rangschik(uit);
}
