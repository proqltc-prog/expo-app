// Ingeklapte groepen op de lijst en in de frigo (WEEK-124). Pure logica, zonder React.
// Standaard is elke groep ingeklapt; de gebruiker klapt een groep open of weer dicht.

/** De sleutels van de groepen die open staan. */
export type Open = ReadonlySet<string>;

/** Wisselt één groep: open wordt dicht en dicht wordt open. Het oude setje blijft ongewijzigd. */
export function wisselGroep(open: Open, sleutel: string): Set<string> {
  const uit = new Set(open);
  if (uit.has(sleutel)) uit.delete(sleutel);
  else uit.add(sleutel);
  return uit;
}

/** De regels die van een groep getoond worden: alle als de groep open staat, anders geen. */
export function zichtbareRegels<T>(regels: readonly T[], sleutel: string, open: Open): T[] {
  return open.has(sleutel) ? [...regels] : [];
}
