// Frigo-voorrang bij het plannen (WEEK-12, WEEK-188): recepten die opmaken wat al in huis is, komen eerst.
// De oudste producten wegen het zwaarst.
import { codeVan, FrigoItem, receptFrigo } from '@/lib/frigo';

const klein = (t: string) => t.trim().toLocaleLowerCase();
const DAG_MS = 24 * 60 * 60 * 1000;

/** Een ingrediënt zoals de planner het kent: de naam en, als die er is, de vaste code. */
export type ScoreIngredient = { naam: string; code?: string };

/** Zoals frigoScoreIngredienten, maar voor ingrediëntnamen zonder code (bv. van een eigen recept). */
export function frigoScoreNamen(namen: readonly string[], frigo: readonly FrigoItem[], nu: Date): number {
  return frigoScoreIngredienten(namen.map((naam) => ({ naam })), frigo, nu);
}

/**
 * Hoort dit frigo-product bij dit ingrediënt? Op de databankcode als beide er een hebben (eigen code of afgeleid
 * van de naam in een van de talen, WEEK-206) — taalonafhankelijk, zoals Gekookt en de lijst (WEEK-159/160).
 * Anders op de naam, het vangnet voor producten zonder code.
 */
function zelfdeIngredient(f: FrigoItem, ing: ScoreIngredient): boolean {
  const cf = codeVan(f);
  const ci = codeVan(ing);
  return cf && ci ? cf === ci : klein(f.naam) === klein(ing.naam);
}

/**
 * Hoeveel gebruikt een recept van wat in de frigo ligt? Elk ingrediënt dat in de frigo zit, telt mee
 * met 1 + het aantal dagen dat het oudste exemplaar er al ligt: oudere producten wegen zwaarder.
 * Enkel planner-producten tellen mee; losse producten niet (WEEK-158).
 */
export function frigoScoreIngredienten(ingredienten: readonly ScoreIngredient[], frigo: readonly FrigoItem[], nu: Date): number {
  let score = 0;
  const vanPlanner = receptFrigo(frigo);
  for (const ing of ingredienten) {
    const passend = vanPlanner.filter((f) => zelfdeIngredient(f, ing));
    if (!passend.length) continue;
    const oudste = Math.min(...passend.map((f) => Date.parse(f.toegevoegdOp)).filter((t) => !Number.isNaN(t)));
    const dagen = Number.isFinite(oudste) ? Math.max(0, (nu.getTime() - oudste) / DAG_MS) : 0;
    score += 1 + dagen;
  }
  return score;
}
