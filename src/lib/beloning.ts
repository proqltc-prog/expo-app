// Reclamefilmpjes met beloning (WEEK-38). Pure logica; de advertentie zelf komt later in de app.
// Een filmpje wordt pas beloond nadat de gebruiker er zelf op klikt, nooit automatisch.

/** Extra AI-voorstel per bekeken filmpje. */
export const BELONING_AI_VRAAG = 1;

/** Extra scans per bekeken filmpje. */
export const BELONING_SCANS = 3;

export type BeloningSoort = 'ai' | 'scans';

/** Hoeveel een bekeken filmpje oplevert voor deze soort. */
export function beloningVoor(soort: BeloningSoort): number {
  return soort === 'ai' ? BELONING_AI_VRAAG : BELONING_SCANS;
}
