// Periode van het weekplan (WEEK-42): hoeveel dagen het plan telt.
// Vervangt de vrije tekst "5 dagen" die WEEK-41 verwijderde.

/** Keuzes die de gebruiker ziet: 2 tot en met 7 dagen (7 = een volle week). */
export const PERIODE_OPTIES = [2, 3, 4, 5, 6, 7] as const;

/** Standaard als er nog niets gekozen is (zelfde als vroeger zonder vraag om dagen). */
export const PERIODE_STANDAARD = 6;

/** Zet een opgeslagen of ingevoerde waarde om naar een geldige periode; onbekend wordt undefined. */
export function normaliseerPeriode(ruw: unknown): number | undefined {
  return typeof ruw === 'number' && (PERIODE_OPTIES as readonly number[]).includes(ruw) ? ruw : undefined;
}
