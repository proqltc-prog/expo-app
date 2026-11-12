// WEEK-248: welke onbekende ingrediënten de app meldt, en onder welke naam. Pure logica, zonder opslag.
// Enkel een ingrediënt dat de app helemaal niet kent én dat de gebruiker overslaat, wordt gemeld; een voorstel
// (een bijna-dubbel van een bestaand ingrediënt) nooit, zodat de lijst met meldingen geen dubbels krijgt.
import type { Taal } from '@/i18n';
import { kernNaam, type NakijkRegel } from '@/lib/receptLink';

export const MAX_NAAM_LENGTE = 60;
/** Een naam met meer woorden is eerder een zin of een omschrijving dan een ingrediënt. */
export const MAX_WOORDEN = 5;

export type Melding = { naam: string; taal: Taal };

/**
 * De naam zoals hij gemeld wordt: de kern (zie kernNaam), enkel letters, spaties, koppeltekens en apostrofs,
 * 2 tot 60 tekens en hoogstens 5 woorden. Anders undefined (niet melden). Dezelfde regel staat in de databankfunctie.
 */
export function meldbareNaam(naam: string): string | undefined {
  const kern = kernNaam(naam)
    .replace(/[’`]/g, "'")
    .replace(/^[\s'-]+|[\s'-]+$/g, '')
    .replace(/\s+/g, ' ');
  if (kern.length < 2 || kern.length > MAX_NAAM_LENGTE) return undefined;
  if (!/^\p{L}[\p{L} '-]*$/u.test(kern)) return undefined;
  if (kern.split(' ').length > MAX_WOORDEN) return undefined;
  return kern;
}

/** De melding voor een overgeslagen regel, of undefined als die niet gemeld wordt (gekend ingrediënt of ongeldige naam). */
export function teMelden(regel: Pick<NakijkRegel, 'reden' | 'naam' | 'taal' | 'code'>): Melding | undefined {
  if (regel.reden !== 'onbekend' || regel.code) return undefined;
  const naam = meldbareNaam(regel.naam);
  return naam ? { naam, taal: regel.taal } : undefined;
}

/** Sleutel om binnen één sessie niet twee keer hetzelfde te melden. */
export function meldingSleutel(m: Melding): string {
  return `${m.taal}:${m.naam}`;
}
