// Zet een Belgische postcode om naar een punt, zodat de afstand naar winkels berekend kan worden (WEEK-60).
// Pure logica: de URL bouwen en het antwoord lezen. Het netwerk zit in src/opslag/postcodepunt.ts.
import type { Positie } from '@/lib/winkelvoorstel';

const BELGISCHE_POSTCODE = /^\d{4}$/;
export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/** Zoek-URL voor één postcode (en optioneel gemeente). Geeft null bij een ongeldige postcode. */
export function bouwPostcodeUrl(postcode: string, gemeente: string): string | null {
  const pc = postcode.trim();
  if (!BELGISCHE_POSTCODE.test(pc)) return null;
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', country: 'Belgium', postalcode: pc });
  const gem = gemeente.replace(/[^\p{L}\p{N} '-]/gu, '').replace(/\s+/g, ' ').trim();
  if (gem) params.set('city', gem);
  return `${NOMINATIM_ENDPOINT}?${params.toString()}`;
}

/** Leest het eerste resultaat. Onbruikbare of lege invoer geeft undefined. */
export function leesPunt(ruw: unknown): Positie | undefined {
  if (!Array.isArray(ruw) || !ruw.length) return undefined;
  const eerste = ruw[0] as { lat?: unknown; lon?: unknown };
  const lat = Number(eerste?.lat);
  const lon = Number(eerste?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon };
}
