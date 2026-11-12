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

/**
 * WEEK-272: zelf een ander gerecht kiezen of het gerecht weghalen ("Geen gerecht deze dag") mag zolang het niet gekookt is,
 * ook na bevestigen. Gekookt blijft vast.
 */
export function magZelfKiezen(dag: PlanDag | undefined): boolean {
  return !!dag && !dag.gedaan;
}

/** De dagen die bevestigd zijn: enkel die horen op de boodschappenlijst. */
export function bevestigdeDagen(plan: Weekplan): PlanDag[] {
  return plan.dagen.filter((d) => d.bevestigd);
}

/**
 * De bevestigde dagen die nog niet gekookt zijn: enkel die horen op de boodschappenlijst (WEEK-134).
 * Gekookte recepten zijn al uit de frigo gehaald en verdwijnen van de lijst.
 */
export function openBevestigdeDagen(plan: Weekplan): PlanDag[] {
  return plan.dagen.filter((d) => d.bevestigd && !d.gedaan);
}

/**
 * WEEK-140: is het weekmenu helemaal af? Alle recepten van het plan zijn bevestigd én gekookt.
 * Pas dan toont de planner weer de periode. Eén gekookt bevestigd recept volstaat niet.
 */
export function alleDagenAfgerond(plan: Weekplan): boolean {
  return plan.dagen.length > 0 && plan.dagen.every((d) => d.bevestigd && d.gedaan);
}

/**
 * WEEK-139: welk weekmenu getoond wordt. Zonder gegenereerd plan, of als alle recepten gekookt zijn, is er niets te tonen.
 */
export function zichtbaarWeekmenu(plan: Weekplan | null): Weekplan | null {
  if (!plan || plan.dagen.length === 0) return null;
  return plan.dagen.every((d) => d.gedaan) ? null : plan;
}

/**
 * WEEK-143: vraagt een nieuw weekmenu eerst om bevestiging? Enkel als er op het zichtbare weekmenu
 * een bevestigd recept staat. Gekookte of verborgen recepten tellen niet mee.
 */
export function vraagtBevestigingVoorNieuwPlan(plan: Weekplan | null): boolean {
  const zichtbaar = zichtbaarWeekmenu(plan);
  return !!zichtbaar && heeftBevestigdPlan(zichtbaar);
}

/** Is er minstens één dag bevestigd? Dan vraagt een nieuw weekplan eerst een bevestiging van de reset. */
export function heeftBevestigdPlan(plan: Weekplan): boolean {
  return plan.dagen.some((d) => d.bevestigd);
}

/**
 * Zijn alle bevestigde dagen gekookt? Dan is de voorgestelde week af en toont de planner weer de periode (WEEK-125).
 * Zonder bevestigde dag is het antwoord nee.
 */
export function alleBevestigdeGekookt(plan: Weekplan): boolean {
  const bevestigd = bevestigdeDagen(plan);
  return bevestigd.length > 0 && bevestigd.every((d) => d.gedaan);
}

/**
 * Een weekmenu dat gemaakt werd zonder gezin ("voor 0 personen", WEEK-249): elk ingrediënt heeft hoeveelheid 0.
 * Zo'n menu toont geen hoeveelheden en zet geen juiste boodschappen; de gebruiker maakt beter een nieuw menu.
 */
export function planZonderHoeveelheden(plan: Pick<Weekplan, 'dagen'> | null | undefined): boolean {
  const ingredienten = plan?.dagen.flatMap((d) => d.recept.ingredienten) ?? [];
  return ingredienten.length > 0 && ingredienten.every((i) => !(i.hoeveelheid > 0));
}

/** Waarom "Plan mijn week" (nog) geen nieuw weekmenu maakt (WEEK-261/262). */
export type NieuwPlanBlokkade = 'gezin' | 'nietGekookt';

/**
 * Mag "Plan mijn week" een nieuw weekmenu maken?
 * - 'gezin' (WEEK-261): het gezin is nog niet ingesteld en bewaard (volwassenen, postcode, gemeente); zonder gezin geen recepten.
 * - 'nietGekookt' (WEEK-262): op het weekmenu staat nog een bevestigd recept dat niet gekookt is; eerst koken.
 * - undefined: een nieuw weekmenu maken mag.
 */
export function blokkadeNieuwPlan(plan: Weekplan | null, gezinIngesteld: boolean): NieuwPlanBlokkade | undefined {
  if (!gezinIngesteld) return 'gezin';
  const zichtbaar = zichtbaarWeekmenu(plan);
  if (zichtbaar && openBevestigdeDagen(zichtbaar).length > 0) return 'nietGekookt';
  return undefined;
}
