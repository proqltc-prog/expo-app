// Weekplan per dag bevestigen (WEEK-71).
// - Een gebruiker kiest per dag een recept. Zolang de dag niet bevestigd is, mag het recept veranderen.
// - Bij bevestiging ligt het recept vast; de producten gaan naar de boodschappenlijst (dat doet de app).
// - Een nieuw weekplan is mogelijk op elk moment, maar als er al bevestigde dagen zijn,
//   moet de gebruiker eerst akkoord gaan dat het vorige plan en de boodschappenlijst gereset worden.

/** Een kalender toont maximaal een volle week. */
export const MAX_DAGEN = 7;

export type DagPlan = { recept: number | null; bevestigd: boolean };
export type WeekPlan = { dagen: DagPlan[] };

export type Uitkomst = { week: WeekPlan; toegestaan: boolean };

/** Een leeg weekplan voor het aantal gekozen dagen (1 tot en met MAX_DAGEN). */
export function nieuwWeekPlan(aantalDagen: number): WeekPlan {
  const n = Math.min(MAX_DAGEN, Math.max(1, Math.floor(aantalDagen)));
  return { dagen: Array.from({ length: n }, () => ({ recept: null, bevestigd: false })) };
}

function geldigIndex(week: WeekPlan, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < week.dagen.length;
}

/** Kiest of wijzigt het recept van een dag. Een bevestigde dag kan niet meer veranderen. */
export function kiesRecept(week: WeekPlan, index: number, recept: number): Uitkomst {
  if (!geldigIndex(week, index) || week.dagen[index].bevestigd) return { week, toegestaan: false };
  const dagen = week.dagen.map((d, i) => (i === index ? { ...d, recept } : d));
  return { week: { dagen }, toegestaan: true };
}

/** Bevestigt een dag. Dat kan alleen als er al een recept gekozen is en de dag nog open staat. */
export function bevestigDag(week: WeekPlan, index: number): Uitkomst {
  if (!geldigIndex(week, index)) return { week, toegestaan: false };
  const dag = week.dagen[index];
  if (dag.bevestigd || dag.recept === null) return { week, toegestaan: false };
  const dagen = week.dagen.map((d, i) => (i === index ? { ...d, bevestigd: true } : d));
  return { week: { dagen }, toegestaan: true };
}

/** Is er minstens één dag bevestigd? Dan reset een nieuw weekplan het bestaande. */
export function heeftBevestigdeDag(week: WeekPlan): boolean {
  return week.dagen.some((d) => d.bevestigd);
}

/**
 * Mag er een nieuw weekplan gemaakt worden?
 * `resetNodig` = er zijn bevestigde dagen, dus het vorige plan en de lijst vervallen.
 * `toegestaan` = zonder bevestigde dagen altijd; mét bevestigde dagen alleen als de gebruiker dat bevestigd heeft.
 */
export function magNieuwWeekPlan(week: WeekPlan, resetBevestigd: boolean): { toegestaan: boolean; resetNodig: boolean } {
  const resetNodig = heeftBevestigdeDag(week);
  return { toegestaan: !resetNodig || resetBevestigd, resetNodig };
}
