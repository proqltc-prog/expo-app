// Reclamefilmpjes met beloning (WEEK-38). Pure logica; de advertentie zelf komt later in de app.
// Een filmpje wordt pas beloond nadat de gebruiker er zelf op klikt, nooit automatisch.
import { GRATIS_SCANS_PER_DAG } from '@/lib/scanteller';

/** Extra AI-voorstel per bekeken filmpje. */
export const BELONING_AI_VRAAG = 1;

/** WEEK-311: een filmpje geeft opnieuw evenveel scans als de gratis scans per dag (5), niet meer. */
export const BELONING_SCANS = GRATIS_SCANS_PER_DAG;

export type BeloningSoort = 'ai' | 'scans';

/** Hoeveel een bekeken filmpje oplevert voor deze soort. */
export function beloningVoor(soort: BeloningSoort): number {
  return soort === 'ai' ? BELONING_AI_VRAAG : BELONING_SCANS;
}
