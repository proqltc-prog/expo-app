// Bereidingsstappen per maaltijd (WEEK-81). Pure logica, zonder opslag of React.
import { BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { bereidingVoorDbRecept, type DbRecept } from '@/lib/planner/db';
import type { Weekplan } from '@/lib/planner/types';

/**
 * De bereidingsstappen van een maaltijd, of null als er geen bekend zijn.
 * Volgorde: een eigen recept op id, dan op naam; een databankrecept (id "db-<nummer>", WEEK-121) op id;
 * daarna de ingebouwde receptenbank op id, dan op naam in elke taal.
 * Ingebouwde recepten en databankrecepten vallen terug op Nederlands als een taal ontbreekt.
 */
export function bereidingVoor(
  recept: { id: string; naam: string },
  eigen: readonly EigenRecept[],
  taal: Taal,
  db: readonly DbRecept[] = [],
): string[] | null {
  const eigenRecept = eigen.find((e) => e.id === recept.id) ?? eigen.find((e) => e.naam === recept.naam);
  if (eigenRecept) return eigenRecept.stappen.length ? [...eigenRecept.stappen] : null;

  if (recept.id.startsWith('db-')) {
    const dbRecept = db.find((r) => `db-${r.id}` === recept.id);
    return dbRecept ? bereidingVoorDbRecept(dbRecept, taal) : null;
  }

  const bank = RECEPTENBANK.find((r) => r.id === recept.id) ?? RECEPTENBANK.find((r) => r.namen.includes(recept.naam));
  if (!bank) return null;
  const stappen = BEREIDINGEN[bank.id]?.[taal] ?? BEREIDINGEN[bank.id]?.nl;
  return stappen && stappen.length ? [...stappen] : null;
}

/**
 * Het icoon om de bereidingsstappen te openen (WEEK-113): altijd zichtbaar bij een bevestigd gerecht.
 * Heeft het gerecht geen stappen, dan toont de pagina Bereiding zelf een melding.
 */
export function toonBereidingsIcoon(bevestigd?: boolean): boolean {
  return bevestigd === true;
}

/** Eén ingrediënt voor de bereidingspagina: de hoeveelheid is al voor het gezin omgerekend (WEEK-146). */
export type BereidingIngredient = { naam: string; hoeveelheid: number; eenheid: string };

/**
 * De ingrediënten van een gerecht uit het weekplan, in de volgorde van het recept (WEEK-146).
 * Het plan bevat de hoeveelheden al voor het gezin, dus die tonen we zoals ze zijn. Staat het gerecht niet in het plan, dan is de lijst leeg.
 */
export function ingredientenVoor(plan: Weekplan | null, receptId: string): BereidingIngredient[] {
  const dag = plan?.dagen.find((d) => d.recept.id === receptId);
  if (!dag) return [];
  return dag.recept.ingredienten.map(({ naam, hoeveelheid, eenheid }) => ({ naam, hoeveelheid, eenheid }));
}
