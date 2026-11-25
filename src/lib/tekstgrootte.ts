// Tekstgrootte in de bereiding (WEEK-336): A− en A+ om te lezen vanop een afstand. Pure logica.

/** De standen, van normaal tot zeer groot (factor op de gewone lettergrootte). */
export const TEKST_STANDEN = [1, 1.2, 1.4, 1.65] as const;

/** Leest een bewaarde stand; alles wat niet klopt wordt normaal (0). */
export function leesStand(ruw: unknown): number {
  const n = typeof ruw === 'string' ? Number(ruw) : typeof ruw === 'number' ? ruw : NaN;
  return Number.isInteger(n) && n >= 0 && n < TEKST_STANDEN.length ? n : 0;
}

export const kleiner = (stand: number) => Math.max(0, leesStand(stand) - 1);
export const groter = (stand: number) => Math.min(TEKST_STANDEN.length - 1, leesStand(stand) + 1);
export const kanKleiner = (stand: number) => leesStand(stand) > 0;
export const kanGroter = (stand: number) => leesStand(stand) < TEKST_STANDEN.length - 1;

/** Een lettergrootte (en regelhoogte) geschaald volgens de stand, afgerond op hele pixels. */
export const geschaald = (grootte: number, stand: number) => Math.round(grootte * TEKST_STANDEN[leesStand(stand)]);
