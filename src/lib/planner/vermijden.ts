// Ingrediënten die de gebruiker wil vermijden (WEEK-41). Pure logica, gebruikt door de planner en de receptenlijst.
import { VERMIJDBAAR, VERMIJD_WOORDEN, Vermijd } from '@/data/vermijden';

/** Leest de keuzes uit opgeslagen of binnenkomende data; onbekende waarden vallen weg. */
export function normaliseerVermijd(ruw: unknown): Vermijd[] {
  return Array.isArray(ruw) ? VERMIJDBAAR.filter((v) => ruw.includes(v)) : [];
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/œ/g, 'oe').toLowerCase();
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** De eerste keuze die in een ingrediëntnaam voorkomt, of undefined. */
export function vermijdVoorNaam(naam: string, vermijd: readonly Vermijd[]): Vermijd | undefined {
  const tekst = norm(naam);
  return vermijd.find((v) => {
    const { begin, los } = VERMIJD_WOORDEN[v];
    const beginGevonden = begin.some((w) => new RegExp(`(^|[^\\p{L}])${esc(norm(w))}`, 'u').test(tekst));
    const losGevonden = los.some((w) => new RegExp(`(^|[^\\p{L}])${esc(norm(w))}($|[^\\p{L}])`, 'u').test(tekst));
    return beginGevonden || losGevonden;
  });
}

/** Heeft een recept (met namen, zoals in een weekplan of favoriet) een ingrediënt dat vermeden wordt? */
export function heeftVermijdNaam(ingredienten: readonly { naam: string }[], vermijd: readonly Vermijd[]): boolean {
  if (!vermijd.length) return false;
  return ingredienten.some((i) => vermijdVoorNaam(i.naam, vermijd) !== undefined);
}

