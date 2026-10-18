// Per dag bevestigen in het weekplan (WEEK-71).
// Een bevestigde dag ligt vast: het recept wijzigt niet meer. Alleen bevestigde dagen komen op de boodschappenlijst.
import type { PlanDag, Weekplan } from '@/lib/planner/types';

/** Bevestigt één dag. Kan alleen als die dag een recept heeft, nog niet gekookt is en nog niet bevestigd was. */
export function bevestigPlanDag(plan: Weekplan, index: number): Weekplan {
  const dag = plan.dagen[index];
  if (!dag || dag.bevestigd || dag.gedaan) return plan;
  return { ...plan, dagen: plan.dagen.map((d, i) => (i === index ? { ...d, bevestigd: true } : d)) };
}

/** Mag het recept van deze dag nog veranderd of verwijderd worden? Bevestigde en gekookte dagen niet. */
export function magDagWijzigen(dag: PlanDag): boolean {
  return !dag.bevestigd && !dag.gedaan;
}

/** De dagen die bevestigd zijn: enkel die horen op de boodschappenlijst. */
export function bevestigdeDagen(plan: Weekplan): PlanDag[] {
  return plan.dagen.filter((d) => d.bevestigd);
}

/** Is er minstens één dag bevestigd? Dan vraagt een nieuw weekplan eerst een bevestiging van de reset. */
export function heeftBevestigdPlan(plan: Weekplan): boolean {
  return plan.dagen.some((d) => d.bevestigd);
}
