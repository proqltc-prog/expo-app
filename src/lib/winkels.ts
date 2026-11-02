// Winkels in de buurt (WEEK-53). Pure logica: de query bouwen en de antwoorden van OpenStreetMap lezen.
// Het netwerkverkeer zit in src/opslag/winkels.ts.

import type { Positie } from '@/lib/winkelvoorstel';

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
  /** Straat en huisnummer uit OpenStreetMap, als ze ingevuld zijn (WEEK-70). */
  straat?: string;
  huisnummer?: string;
  /** Openingsuren zoals OpenStreetMap ze bewaart, bv. "Mo-Sa 08:00-20:00; Su 09:00-12:00" (WEEK-70). */
  openingsuren?: string;
};

export const MAX_WINKELS = 20;

/** De zoekopdracht van de server mag zo lang duren (zie [timeout:…] in de query). De app wacht even lang (WEEK-127). */
export const OVERPASS_SERVER_TIMEOUT_S = 20;
export const OVERPASS_TIMEOUT_MS = (OVERPASS_SERVER_TIMEOUT_S + 5) * 1000;

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
    `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}];`,
    'area["ISO3166-1"="BE"][admin_level=2]->.b;',
    '(',
    ...delen,
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
/**
 * WEEK-152: Overpass geeft bij een time-out HTTP 200 met lege elementen en een 'remark' (runtime error).
 * Dat is geen echt lege buurt maar een mislukte zoekopdracht. Geeft de reden terug, of undefined als het antwoord klopt.
 */
export function overpassFout(ruw: unknown): string | undefined {
  if (!ruw || typeof ruw !== 'object') return 'Overpass: leeg antwoord';
  const remark = (ruw as { remark?: unknown }).remark;
  if (typeof remark === 'string' && /runtime error|timed out|timeout|out of memory/i.test(remark)) return `Overpass: ${remark}`;
  if (!Array.isArray((ruw as { elements?: unknown }).elements)) return 'Overpass: geen elementen';
  return undefined;
}

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
    const straat = typeof tags['addr:street'] === 'string' ? tags['addr:street'].trim() : '';
    const huisnummer = typeof tags['addr:housenumber'] === 'string' ? tags['addr:housenumber'].trim() : '';
    const openingsuren = typeof tags.opening_hours === 'string' ? tags.opening_hours.trim() : '';
    uit.push({
      naam,
      soort,
      postcode: postcodeTag,
      gemeente: stad,
      nabij: postcodeTag === pc ? 'postcode' : 'gemeente',
      lat,
      lon,
      straat: straat || undefined,
      huisnummer: huisnummer || undefined,
      openingsuren: openingsuren || undefined,
    });
  }
  return rangschik(uit);
}

/** Grootste zoekstraal in meter (WEEK-115): binnen 10 km rond het punt van de postcode. */
export const MAX_STRAAL_METERS = 10000;

/**
 * Overpass-query voor winkels binnen een straal rond een punt (WEEK-115).
 * Veel lichter dan de query op heel België; de straal wordt begrensd op MAX_STRAAL_METERS.
 */
export function bouwStraalQuery(punt: Positie, straalMeter: number = MAX_STRAAL_METERS): string {
  const straal = Math.min(Math.max(1, Math.round(straalMeter)), MAX_STRAAL_METERS);
  const soorten = Object.keys(WINKEL_TAGS).join('|');
  return [
    `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}];`,
    '(',
    `nwr(around:${straal},${punt.lat},${punt.lon})["shop"~"^(${soorten})$"];`,
    ');',
    `out center ${MAX_WINKELS * 25};`,
  ].join('\n');
}

export type FoutReden = 'druk' | 'verbinding' | 'onbekend';

/** Leest uit een zoekfout of de server te druk was of dat er geen verbinding was (WEEK-115). */
export function foutReden(fout: unknown): FoutReden {
  const tekst = fout instanceof Error ? fout.message : String(fout ?? '');
  if (fout instanceof Error && fout.name === 'AbortError') return 'verbinding';
  if (/Overpass (429|5\d\d)/.test(tekst)) return 'druk';
  if (fout instanceof TypeError || /network|netwerk|fetch/i.test(tekst)) return 'verbinding';
  return 'onbekend';
}

