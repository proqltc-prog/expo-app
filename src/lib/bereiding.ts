// Bereidingsstappen per maaltijd (WEEK-81). Pure logica, zonder opslag of React.
import type { Taal } from '@/i18n';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { bereidingVoorDbRecept, type DbRecept } from '@/lib/planner/db';
import { verdeelFrigo, type Dekking, type FrigoItem } from '@/lib/frigo';
import type { Weekplan } from '@/lib/planner/types';
import { ingredientenInTaal } from '@/lib/planner/vertaal';

/**
 * De bereidingsstappen van een maaltijd, of null als er geen bekend zijn.
 * Volgorde: een eigen recept op id, dan op naam; daarna een databankrecept (id "db-<nummer>", WEEK-121) op id.
 * Databankrecepten vallen terug op Nederlands als een taal ontbreekt (WEEK-208: geen ingebouwde recepten meer).
 */
export function bereidingVoor(
  recept: { id: string; naam: string },
  eigen: readonly EigenRecept[],
  taal: Taal,
  db: readonly DbRecept[] = [],
): string[] | null {
  const eigenRecept = eigen.find((e) => e.id === recept.id) ?? eigen.find((e) => e.naam === recept.naam);
  if (eigenRecept) return eigenRecept.stappen.length ? [...eigenRecept.stappen] : null;

  if (!recept.id.startsWith('db-')) return null;
  const dbRecept = db.find((r) => `db-${r.id}` === recept.id);
  return dbRecept ? bereidingVoorDbRecept(dbRecept, taal) : null;
}

/**
 * Het icoon om de ingrediënten en bereidingsstappen te openen (WEEK-113). Sinds WEEK-236 ook vóór het bevestigen,
 * zodat je eerst kunt bekijken wat het gerecht is. Heeft het gerecht geen stappen, dan toont de pagina Bereiding zelf een melding.
 */
export function toonBereidingsIcoon(_bevestigd?: boolean): boolean {
  return true;
}

/** Eén ingrediënt voor de bereidingspagina: de hoeveelheid is al voor het gezin omgerekend (WEEK-146). */
export type BereidingIngredient = { naam: string; hoeveelheid: number; eenheid: string };

/**
 * De ingrediënten van een gerecht uit het weekplan, in de volgorde van het recept (WEEK-146).
 * Het plan bevat de hoeveelheden al voor het gezin, dus die tonen we zoals ze zijn. Staat het gerecht niet in het plan, dan is de lijst leeg.
 */
export function ingredientenVoor(plan: Weekplan | null, receptId: string, taal: Taal = 'nl'): BereidingIngredient[] {
  const dag = plan?.dagen.find((d) => d.recept.id === receptId);
  if (!dag) return [];
  // WEEK-154: de namen in de gekozen taal; hoeveelheden blijven zoals ze zijn.
  return ingredientenInTaal(dag.recept, taal).map(({ naam, hoeveelheid, eenheid }) => ({ naam, hoeveelheid, eenheid }));
}

/** Een ingrediënt met de dekking uit de frigo: geheel, deels of niet (WEEK-147). */
export type BereidingIngredientMetFrigo = BereidingIngredient & { dekking: Dekking['gedekt'] };

/** Koppelt aan elk ingrediënt wat er al in de frigo ligt (WEEK-147). Zelfde volgorde als de ingrediënten. */
export function ingredientenMetFrigo(ingredienten: readonly BereidingIngredient[], frigo: readonly FrigoItem[]): BereidingIngredientMetFrigo[] {
  const dekking = verdeelFrigo(ingredienten, frigo);
  // WEEK-249: zonder hoeveelheid (0, bv. een menu voor 0 personen) is niets "helemaal in huis": geen vinkje.
  return ingredienten.map((ing, i) => ({ ...ing, dekking: ing.hoeveelheid > 0 ? (dekking[i]?.gedekt ?? 'niet') : 'niet' }));
}
