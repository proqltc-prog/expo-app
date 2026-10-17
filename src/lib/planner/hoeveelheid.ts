import type { Profiel } from '@/lib/profiel';

/** Een kind van 0 tot 12 jaar eet een halve volwassen portie (WEEK-40). */
export const KIND_PORTIE = 0.5;

/**
 * Aantal volwassen porties voor het gezin, naar boven afgerond op een heel getal.
 * Bv. 2 volwassenen + 1 kind = 2,5 → 3.
 */
export function porties(p: Profiel): number {
  return Math.ceil(p.volwassenen + p.kinderen * KIND_PORTIE);
}

/**
 * Rondt een hoeveelheid af naar iets dat je in de winkel kan kopen of afwegen.
 * g/ml: op 5 onder 50, anders op 10. Stuks: altijd naar boven op een heel stuk (een half ei wordt 1 ei).
 */
export function rondAf(hoeveelheid: number, eenheid: string): number {
  if (hoeveelheid <= 0) return 0;
  if (eenheid === 'g' || eenheid === 'ml') {
    const stap = hoeveelheid < 50 ? 5 : 10;
    return Math.max(stap, Math.round(hoeveelheid / stap) * stap);
  }
  return Math.ceil(hoeveelheid);
}
