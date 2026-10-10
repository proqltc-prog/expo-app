// Frigo-voorrang bij het plannen (WEEK-12): eerst opmaken wat al in huis is, de oudste producten eerst.
import { ingredientNaam } from '@/data/ingredienten';
import type { BankRecept } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import { FrigoItem, verdeelFrigo } from '@/lib/frigo';
import type { PlanDag } from './types';

const klein = (t: string) => t.trim().toLocaleLowerCase();
const DAG_MS = 24 * 60 * 60 * 1000;

/**
 * Hoeveel gebruikt een recept van wat in de frigo ligt? Elk ingrediënt dat in de frigo zit, telt mee
 * met 1 + het aantal dagen dat het oudste exemplaar er al ligt: oudere producten wegen zwaarder.
 */
export function frigoScore(recept: BankRecept, frigo: readonly FrigoItem[], taal: Taal, nu: Date): number {
  return frigoScoreNamen(recept.ingredienten.map(([code]) => ingredientNaam(code, taal)), frigo, nu);
}

/** Zoals frigoScore, maar voor ingrediëntnamen (bv. van een favoriet). */
export function frigoScoreNamen(namen: readonly string[], frigo: readonly FrigoItem[], nu: Date): number {
  let score = 0;
  for (const ruweNaam of namen) {
    const naam = klein(ruweNaam);
    const passend = frigo.filter((f) => klein(f.naam) === naam);
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
