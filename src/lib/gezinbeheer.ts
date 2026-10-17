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
