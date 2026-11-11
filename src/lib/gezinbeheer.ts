/**
 * Beheer van de gezinsruimte (WEEK-65): de beheerder benoemt, verlaat of heft op.
 * Pure logica; de server controleert hetzelfde in de database.
 */
export type GezinLid = { id: string; naam: string };

/** Is het toestel dat kijkt de beheerder van het gezin? */
export function ikBeheerder(beheerderId: string | undefined, mijnId: string | undefined): boolean {
  return !!beheerderId && beheerderId === mijnId;
}

/** De andere leden, zonder mezelf. */
export function anderenLeden<T extends GezinLid>(leden: T[], mijnId: string | undefined): T[] {
  return leden.filter((l) => l.id !== mijnId);
}

/** Moet de beheerder eerst een opvolger kiezen voordat hij vertrekt? Ja als er nog andere leden zijn. */
export function vraagtOpvolgerBijVertrek(isBeheerder: boolean, leden: GezinLid[], mijnId: string | undefined): boolean {
  return isBeheerder && anderenLeden(leden, mijnId).length > 0;
}

/**
 * Mag dit toestel het gezinsprofiel (samenstelling, adres, ...) wijzigen? (WEEK-168)
 * Zonder gezinsruimte is iedereen "beheerder" van zijn eigen profiel. Met een gezin enkel de beheerder.
 */
export function magGezinsprofielWijzigen(gezinAanwezig: boolean, beheerderId: string | undefined, mijnId: string | undefined): boolean {
  return !gezinAanwezig || ikBeheerder(beheerderId, mijnId);
}

/**
 * Waar iemand de app vindt om lid te worden met de gezinscode (WEEK-173).
 * Tot de Google Play-app bestaat (WEEK-37) is dat de webversie; daarna wordt dit de Play-link.
 */
export const APP_LINK = 'https://proqltc-prog.github.io/expo-app/';

/** WEEK-104: de naam die een nieuwe gezinsruimte krijgt. Hij wordt bewaard, dus hij is niet vertaald. */
export const GEZINSNAAM_STANDAARD = 'Gezin';

/**
 * WEEK-243: de naam van het gezin zoals de gebruiker hem ziet. Zonder eigen naam (leeg of de standaardnaam)
 * toont de app de vertaalde tekst (bv. "Notre famille"); een zelf gekozen naam blijft zoals hij is.
 */
export function toonGezinsnaam(naam: string | null | undefined, zonderNaam: string): string {
  const n = naam?.trim();
  return !n || n === GEZINSNAAM_STANDAARD ? zonderNaam : n;
}
