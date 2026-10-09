import type { Profiel } from '@/lib/profiel';

/** Portie van een kind ten opzichte van een volwassene. */
export function kindPortie(leeftijd: number): number {
  if (leeftijd < 6) return 0.5;
  if (leeftijd < 12) return 0.75;
  return 1;
}

/** Aantal volwassen porties voor het gezin (kinderen eten minder). */
export function porties(p: Profiel): number {
  const totaal = p.volwassenen + p.kinderen.reduce((som, l) => som + kindPortie(l), 0);
  return Math.round(totaal * 100) / 100;
}

/**
 * Rondt een hoeveelheid af naar iets dat je in de winkel kan kopen of afwegen.
 * g/ml: op 5 onder 50, anders op 10. Stuks: op een halve onder 3, anders naar boven op een hele.
 */
export function rondAf(hoeveelheid: number, eenheid: string): number {
  if (hoeveelheid <= 0) return 0;
  if (eenheid === 'g' || eenheid === 'ml') {
    const stap = hoeveelheid < 50 ? 5 : 10;
    return Math.max(stap, Math.round(hoeveelheid / stap) * stap);
  }
  if (hoeveelheid < 3) return Math.ceil(hoeveelheid * 2) / 2;
  return Math.ceil(hoeveelheid);
}
