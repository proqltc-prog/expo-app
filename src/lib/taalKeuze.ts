// Taalkeuze per toestel (WEEK-80). Pure logica, zonder opslag.
// De taal hoort bij het toestel van één gebruiker: ze gaat niet naar het gezin en niet naar andere toestellen.
import { isTaal, Taal } from '@/i18n';

/** Opgeslagen waarde die betekent: de taal van het toestel gebruiken. */
export const TOESTEL = 'toestel';

/**
 * De taal uit de opslag van dit toestel.
 * - 'toestel' = de taal van het toestel; geen overname van een oude keuze.
 * - Een geldige taal wordt gebruikt.
 * - Is er nog niets opgeslagen (vóór WEEK-80), dan telt de oude taal uit het profiel van dit toestel, eenmalig.
 */
export function taalUitOpslag(opgeslagen: string | null, oudProfiel: unknown): Taal | undefined {
  if (opgeslagen === TOESTEL) return undefined;
  if (isTaal(opgeslagen)) return opgeslagen;
  if (opgeslagen === null && oudProfiel && typeof oudProfiel === 'object') {
    const oud = (oudProfiel as Record<string, unknown>).taal;
    if (isTaal(oud)) return oud;
  }
  return undefined;
}

/** Wat er in de opslag komt voor een keuze. Undefined betekent: de taal van het toestel. */
export function taalNaarOpslag(taal: Taal | undefined): string {
  return taal ?? TOESTEL;
}
