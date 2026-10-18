// Startscherm bij de eerste opening (WEEK-79). Pure logica, zonder React Native.
// Een gebruiker die nog geen taal heeft gekozen en het welkomstscherm nog niet zag, eerst naar de taalkeuze.
// Daarna gaat de app naar de gezinsruimte. Bij elke volgende opening: het menu.
import type { Taal } from '@/i18n';

export const ROUTE_WELKOM = '/welkom';
export const ROUTE_NA_WELKOM = '/profiel';

/** Welkomstscherm nodig? Niet als het al gezien is, en niet als de gebruiker al een taal heeft gekozen. */
export function welkomNodig(gezien: boolean, taal: Taal | undefined): boolean {
  return !gezien && taal === undefined;
}
