// Afgewezen recepten van een weekplan (WEEK-184). Pure logica, zonder opslag.
// Een recept dat bij een reset vervangen wordt, komt de rest van de week niet meer terug.
import type { Weekplan } from './types';

/** Zet het recept met dit id op de afgewezen lijst van het plan. Geen dubbele ids; zonder id geen wijziging. */
export function voegAfgewezenToe(plan: Weekplan, receptId: string | undefined): Weekplan {
  if (!receptId) return plan;
  const huidig = plan.afgewezen ?? [];
  if (huidig.includes(receptId)) return plan;
  return { ...plan, afgewezen: [...huidig, receptId] };
}

/** Is dit recept in deze week al eens vervangen? */
export function isAfgewezen(plan: Weekplan, receptId: string): boolean {
  return (plan.afgewezen ?? []).includes(receptId);
}
