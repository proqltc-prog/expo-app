// Startscherm bij de eerste opening (WEEK-79). Pure logica, zonder React Native.
// Een gebruiker die nog geen taal heeft gekozen en het welkomstscherm nog niet zag, eerst naar de taalkeuze.
// Daarna gaat de app naar de gezinsruimte. Bij elke volgende opening: het menu.

export const ROUTE_WELKOM = '/welkom';
export const ROUTE_NA_WELKOM = '/profiel';

/**
 * Welkomstscherm nodig? Enkel of het al gezien is. Een taal die uit oude opslag komt telt niet mee (WEEK-91):
 * het scherm met de taalkeuze moet bij de eerste opening altijd getoond worden.
 */
export function welkomNodig(gezien: boolean): boolean {
  return !gezien;
}
