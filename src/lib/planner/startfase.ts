import type { Weekplan } from '@/lib/planner/types';

export type StartFase = 'periode' | 'plan';

/**
 * Waar de weekplanner begint (WEEK-100, WEEK-101, WEEK-133).
 * Zonder weekplan, of als alle recepten van het weekplan gekookt zijn, start de gebruiker bij Periode.
 * In alle andere gevallen opent de planner op het weekplan, ook als er nog niets bevestigd is.
 */
export function startFase(plan: Weekplan | null): StartFase {
  if (!plan || plan.dagen.length === 0) return 'periode';
  const alleGekookt = plan.dagen.every((d) => d.gedaan);
  return alleGekookt ? 'periode' : 'plan';
}

// Onthoudt dat de gebruiker van de gezinssamenstelling kwam; bij terugkomst start de planner dan opnieuw (WEEK-100).
let vanGezinsprofiel = false;

export function onthoudVertrekUitGezinsprofiel(): void {
  vanGezinsprofiel = true;
}

/** Geeft terug of de gebruiker van de gezinssamenstelling kwam, en zet de vlag weer uit. */
export function neemVertrekUitGezinsprofielVlag(): boolean {
  const vlag = vanGezinsprofiel;
  vanGezinsprofiel = false;
  return vlag;
}
