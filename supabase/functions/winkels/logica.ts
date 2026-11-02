// Winkels in de buurt (WEEK-171): pure logica voor de Supabase-functie `winkels`.
// Geen Deno- of React-imports, zodat dezelfde code getest wordt met `npm test`.
// De functie vraagt de OpenStreetMap-gegevens (Overpass) op de server op, zodat de browser niet meer rechtstreeks moet bellen.

export type WinkelSoort = 'supermarkt' | 'slager' | 'bakker' | 'groenteboer';
export type Nabij = 'postcode' | 'gemeente';

export type Punt = { lat: number; lon: number };

export type Winkel = {
  naam: string;
  soort: WinkelSoort;
  postcode: string;
  gemeente: string;
  nabij: Nabij;
  lat?: number;
  lon?: number;
  /** Afstand in meter tot het punt van de gebruiker, als dat bekend is. */
  afstandMeter?: number;
  straat?: string;
  huisnummer?: string;
  openingsuren?: string;
};

/** Het aantal winkels dat de app toont (WEEK-171). */
export const MAX_WINKELS = 10;
/** Straal rond het punt van de postcode (WEEK-115). */
export const STRAAL_METERS = 10000;
/** Zoektijd op de server; de app wacht iets langer. */
export const SERVER_TIMEOUT_S = 20;

/** OpenStreetMap-tag (shop=…) naar onze soort. */
export const WINKEL_TAGS: Record<string, WinkelSoort> = {
  supermarket: 'supermarkt',
  butcher: 'slager',
  bakery: 'bakker',
  greengrocer: 'groenteboer',
};

const BELGISCHE_POSTCODE = /^\d{4}$/;
// Ruime bounding box van België: een punt erbuiten is geen geldig adres voor deze app.
const BE_LAT = [49.4, 51.6] as const;
const BE_LON = [2.4, 6.5] as const;

/** Haalt alles weg wat niet in een gemeentenaam hoort (zo blijft de query veilig). */
export function schoonGemeente(gemeente: string): string {
  return gemeente.replace(/[^\p{L}\p{N} '-]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Een aanvraag: een punt (lat/lon) of een Belgische postcode, met optioneel de gemeente. */
export type Aanvraag = { punt: Punt } | { postcode: string; gemeente: string };

/** Controleert de invoer. Geeft undefined als de aanvraag niet bruikbaar is. */
export function leesAanvraag(ruw: unknown): Aanvraag | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined;
  const r = ruw as Record<string, unknown>;
  if (typeof r.lat === 'number' && typeof r.lon === 'number') {
    const { lat, lon } = r;
    if (lat >= BE_LAT[0] && lat <= BE_LAT[1] && lon >= BE_LON[0] && lon <= BE_LON[1]) return { punt: { lat, lon } };
    return undefined;
  }
  if (typeof r.postcode === 'string' && BELGISCHE_POSTCODE.test(r.postcode.trim())) {
    return { postcode: r.postcode.trim(), gemeente: typeof r.gemeente === 'string' ? r.gemeente : '' };
  }
  return undefined;
}

/** Overpass-query: winkels binnen een straal rond een punt. */
export function bouwStraalQuery(punt: Punt): string {
  const soorten = Object.keys(WINKEL_TAGS).join('|');
  return [
    `[out:json][timeout:${SERVER_TIMEOUT_S}];`,
    '(',
    `nwr(around:${STRAAL_METERS},${punt.lat},${punt.lon})["shop"~"^(${soorten})$"];`,
    ');',
    `out center ${MAX_WINKELS * 25};`,
  ].join('\n');
}

/** Overpass-query: winkels met dezelfde postcode of in dezelfde gemeente, binnen België. */
export function bouwPostcodeQuery(postcode: string, gemeente: string): string {
  const soorten = Object.keys(WINKEL_TAGS).join('|');
  const filter = `nwr(area.b)["shop"~"^(${soorten})$"]`;
  const gem = schoonGemeente(gemeente);
  const delen = [`${filter}["addr:postcode"="${postcode}"];`];
  if (gem) delen.push(`${filter}["addr:city"="${gem}"];`);
  return [
    `[out:json][timeout:${SERVER_TIMEOUT_S}];`,
    'area["ISO3166-1"="BE"][admin_level=2]->.b;',
    '(',
    ...delen,
    ');',
    `out center ${MAX_WINKELS * 3};`,
  ].join('\n');
}

/** Bouwt de query voor een aanvraag. */
export function bouwQuery(aanvraag: Aanvraag): string {
  return 'punt' in aanvraag ? bouwStraalQuery(aanvraag.punt) : bouwPostcodeQuery(aanvraag.postcode, aanvraag.gemeente);
}

/** Afstand in meter tussen twee punten (haversine). */
export function afstandMeter(a: Punt, b: Punt): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * De dichtstbijzijnde winkels, hoogstens MAX_WINKELS. Met een punt: gesorteerd op afstand, winkels zonder
 * coördinaten vallen weg. Zonder punt: lokaal eerst (zelfde postcode), dan op naam.
 */
export function dichtstbij(winkels: Winkel[], punt?: Punt, aantal: number = MAX_WINKELS): Winkel[] {
  if (punt) {
    return winkels
      .flatMap((w) => (w.lat !== undefined && w.lon !== undefined ? [{ ...w, afstandMeter: Math.round(afstandMeter(punt, { lat: w.lat, lon: w.lon })) }] : []))
      .sort((a, b) => (a.afstandMeter ?? 0) - (b.afstandMeter ?? 0))
      .slice(0, aantal);
  }
  return [...winkels]
    .sort((a, b) => (a.nabij === b.nabij ? a.naam.localeCompare(b.naam) : a.nabij === 'postcode' ? -1 : 1))
    .slice(0, aantal);
}

/** Leest het antwoord van Overpass. Onbruikbare elementen worden overgeslagen; dubbelen (zelfde naam en postcode) ook. */
export function leesWinkels(ruw: unknown, postcode: string): Winkel[] {
  if (!ruw || typeof ruw !== 'object') return [];
  const elementen = (ruw as { elements?: unknown }).elements;
  if (!Array.isArray(elementen)) return [];
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
    const sleutel = `${naam.toLowerCase()}|${postcodeTag}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    const punt = (e.center && typeof e.center === 'object' ? e.center : e) as Record<string, unknown>;
    const straat = typeof tags['addr:street'] === 'string' ? tags['addr:street'].trim() : '';
    const huisnummer = typeof tags['addr:housenumber'] === 'string' ? tags['addr:housenumber'].trim() : '';
    const openingsuren = typeof tags.opening_hours === 'string' ? tags.opening_hours.trim() : '';
    uit.push({
      naam,
      soort,
      postcode: postcodeTag,
      gemeente: typeof tags['addr:city'] === 'string' ? tags['addr:city'].trim() : '',
      nabij: postcodeTag === postcode.trim() ? 'postcode' : 'gemeente',
      lat: typeof punt.lat === 'number' ? punt.lat : undefined,
      lon: typeof punt.lon === 'number' ? punt.lon : undefined,
      straat: straat || undefined,
      huisnummer: huisnummer || undefined,
      openingsuren: openingsuren || undefined,
    });
  }
  return uit;
}

/** Sleutel voor de cache: het punt op ±100 meter, of de postcode met gemeente. */
export function cacheSleutel(aanvraag: Aanvraag): string {
  if ('punt' in aanvraag) return `punt:${aanvraag.punt.lat.toFixed(3)},${aanvraag.punt.lon.toFixed(3)}`;
  return `postcode:${aanvraag.postcode}:${schoonGemeente(aanvraag.gemeente).toLowerCase()}`;
}
