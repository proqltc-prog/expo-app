// Frigo-voorrang bij het plannen (WEEK-12): eerst opmaken wat al in huis is, de oudste producten eerst.
import { ingredientNaam } from '@/data/ingredienten';
import type { BankRecept } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import { codeVan, FrigoItem, receptFrigo, verdeelFrigo } from '@/lib/frigo';
import type { PlanDag } from './types';

const klein = (t: string) => t.trim().toLocaleLowerCase();
const DAG_MS = 24 * 60 * 60 * 1000;

/** Een ingrediënt zoals de planner het kent: de naam en, als die er is, de vaste code. */
export type ScoreIngredient = { naam: string; code?: string };

/**
 * Hoeveel gebruikt een recept van wat in de frigo ligt? Elk ingrediënt dat in de frigo zit, telt mee
 * met 1 + het aantal dagen dat het oudste exemplaar er al ligt: oudere producten wegen zwaarder.
 */
export function frigoScore(recept: BankRecept, frigo: readonly FrigoItem[], taal: Taal, nu: Date): number {
  return frigoScoreIngredienten(recept.ingredienten.map(([code]) => ({ naam: ingredientNaam(code, taal), code })), frigo, nu);
}

/** Zoals frigoScore, maar voor ingrediëntnamen zonder code (bv. van een favoriet). */
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

/** Zoals frigoScore, maar voor ingrediënten met naam en (indien bekend) code, zoals de databankplanner ze heeft. */
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

/** Het recept dat het meest opmaakt van wat in huis is (hoogste frigoScore), of undefined als geen enkel recept iets gebruikt. */
export function kiesEersteDag(kandidaten: readonly BankRecept[], frigo: readonly FrigoItem[], taal: Taal, nu: Date): BankRecept | undefined {
  let beste: BankRecept | undefined;
  let besteScore = 0;
  for (const r of kandidaten) {
    const score = frigoScore(r, frigo, taal, nu);
    if (score > besteScore) {
      beste = r;
      besteScore = score;
    }
  }
  return beste;
}

/**
 * Noteert per dag welke ingrediënten (geheel of deels) uit de frigo komen, in de volgorde van de week:
 * wat dag 1 gebruikt, is er niet meer voor dag 2.
 */
export function markeerUitFrigo(dagen: readonly PlanDag[], frigo: readonly FrigoItem[]): PlanDag[] {
  const behoeften = dagen.flatMap((d, i) => d.recept.ingredienten.map((ing) => ({ ...ing, dagIndex: i })));
  const dekking = verdeelFrigo(behoeften, frigo);
  return dagen.map((d, i) => {
    const uitFrigo = behoeften.filter((b, n) => b.dagIndex === i && dekking[n].gedekt !== 'niet').map((b) => b.naam);
    const { uitFrigo: _oud, ...rest } = d;
    return uitFrigo.length ? { ...rest, uitFrigo: [...new Set(uitFrigo)] } : rest;
  });
}
