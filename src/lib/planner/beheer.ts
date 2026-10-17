/**
 * Wie mag het weekplan wijzigen (WEEK-30, optie A: één beheerder van het plan).
 *
 * Het plan heeft één beheerder: de gebruiker die het plan heeft aangemaakt. Alleen die persoon
 * kiest maaltijden, zet statussen en vervangt het plan. Andere gezinsleden zien het plan wel.
 * Een plan zonder beheerder (zonder gezin) of een gebruiker die niet aangemeld is, mag alles.
 */
export function magPlanWijzigen(plan: { beheerder?: string }, mijnId: string | undefined): boolean {
  if (!plan.beheerder || !mijnId) return true;
  return plan.beheerder === mijnId;
}

/** De naam van de beheerder, of undefined als die niet bij de gezinsleden staat. */
export function beheerderNaam(leden: { id: string; naam: string }[], beheerder: string | undefined): string | undefined {
  if (!beheerder) return undefined;
  return leden.find((l) => l.id === beheerder)?.naam;
}
