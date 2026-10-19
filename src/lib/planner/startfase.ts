import { heeftBevestigdPlan } from '@/lib/planner/dagBevestigen';
import type { Weekplan } from '@/lib/planner/types';

export type StartFase = 'periode' | 'plan';

/**
 * Waar de weekplanner begint (WEEK-100, WEEK-101).
 * Enkel een plan met minstens één bevestigde dag, waarvan nog niet alles gekookt is, opent op het plan.
 * In alle andere gevallen (geen plan, geen bevestigde dag, of alles gekookt) start de gebruiker bij Periode.
 */
export function startFase(plan: Weekplan | null): StartFase {
  if (!plan || !heeftBevestigdPlan(plan)) return 'periode';
  const alleGekookt = plan.dagen.length > 0 && plan.dagen.every((d) => d.gedaan);
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
