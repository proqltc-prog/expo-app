// Weergave van de winkels in het voorstel (WEEK-70). Pure logica: adresregel, Google Maps-link en openingsuren.
import type { Winkel, WinkelSoort } from '@/lib/winkels';

/** Emoji per winkeltype: de app gebruikt geen icoonbibliotheek. */
export const SOORT_EMOJI: Record<WinkelSoort, string> = {
  supermarkt: '🛒',
  slager: '🥩',
  bakker: '🥖',
  groenteboer: '🥬',
};

/** Adresregel zoals een mens hem leest: "Dorpsstraat 12, 1760 Roosdaal". Lege delen worden weggelaten. */
export function adresRegel(w: Winkel): string {
  const straat = [w.straat, w.huisnummer].filter((d) => d && d.trim()).join(' ');
  const plaats = [w.postcode, w.gemeente].filter((d) => d && d.trim()).join(' ');
  return [straat, plaats].filter(Boolean).join(', ');
}

/**
 * Link naar Google Maps met de naam en het adres. Daar staan ook de openingsuren, de telefoon en de route.
 * Geen API-sleutel nodig: het is een gewone zoek-link.
 */
export function googleMapsUrl(w: Winkel): string {
  const zoekterm = [w.naam, adresRegel(w), 'België'].filter((d) => d && d.trim()).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(zoekterm)}`;
}

/** Zoekwoord per winkeltype voor Google Maps (WEEK-175). */
const ZOEKWOORD: Record<WinkelSoort, string> = {
  // WEEK-187: met 'levensmiddelen' toont Google geen garages of elektrozaken.
  supermarkt: 'supermarkt levensmiddelen',
  slager: 'slager',
  bakker: 'bakker',
  groenteboer: 'groenteboer',
};

/**
 * Google Maps zoeken naar een winkeltype bij de postcode en gemeente van de gebruiker (WEEK-175).
 * Geen eigen winkeldatabank nodig: Google Maps toont de winkels zelf.
 */
export function googleZoekUrl(soort: WinkelSoort, postcode: string, gemeente: string): string {
  const plaats = [postcode, gemeente, 'België'].map((d) => d.trim()).filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ZOEKWOORD[soort]} ${plaats}`)}`;
}

/** Openingsuren als losse regels. Leeg of onbekend geeft een lege lijst. */
export function openingsurenRegels(ruw?: string): string[] {
  if (!ruw || !ruw.trim()) return [];
  return ruw
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);
}
