import { alleBevestigdeGekookt, heeftBevestigdPlan } from '@/lib/planner/dagBevestigen';
import type { Weekplan } from '@/lib/planner/types';

export type StartFase = 'periode' | 'plan';

/**
 * Waar de weekplanner begint (WEEK-100, WEEK-101, WEEK-125).
 * Enkel een plan met minstens één bevestigde dag, waarvan nog niet alle bevestigde dagen gekookt zijn, opent op het plan.
 * In alle andere gevallen (geen plan, geen bevestigde dag, of alle bevestigde dagen gekookt) start de gebruiker bij Periode.
 */
export function startFase(plan: Weekplan | null): StartFase {
  if (!plan || !heeftBevestigdPlan(plan)) return 'periode';
  return alleBevestigdeGekookt(plan) ? 'periode' : 'plan';
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
