import type { Profiel } from '@/lib/profiel';

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
