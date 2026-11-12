// Ingrediënten die de gebruiker wil vermijden (WEEK-41). Pure logica, gebruikt door de planner en de receptenlijst.
import { VERMIJDBAAR, VERMIJD_WOORDEN, Vermijd } from '@/data/vermijden';

/** Keuzes die overbodig zijn als het gezin enkel vegetarisch eet (WEEK-221). */
export const NIET_VEGETARISCH: readonly Vermijd[] = ['varkensvlees', 'schaaldieren', 'vis'];

/** De ingrediënten die je nog kunt vermijden: met "alleen vegetarisch" vallen vlees en vis weg (WEEK-221). */
export function vermijdOpties(opties: readonly Vermijd[], enkelVegetarisch: boolean | undefined): Vermijd[] {
  return enkelVegetarisch ? opties.filter((v) => !NIET_VEGETARISCH.includes(v)) : [...opties];
}

/**
 * Zet "alleen vegetarische gerechten" aan of uit (WEEK-221). Aan: aangevinkte vlees- en viskeuzes vallen weg,
 * zodat er niets verborgen aangevinkt blijft. Uit: de rest van de keuzes blijft zoals ze was.
 */
export function zetEnkelVegetarisch<K extends { vermijd: string[]; enkelVegetarisch?: boolean }>(keuzes: K, aan: boolean): K {
  return {
    ...keuzes,
    enkelVegetarisch: aan,
    vermijd: aan ? keuzes.vermijd.filter((v) => !(NIET_VEGETARISCH as readonly string[]).includes(v)) : keuzes.vermijd,
  };
}

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


/**
 * Moet dit recept vermeden worden (WEEK-256)? De naamcontrole hierboven, en bij "vis" ook elk recept van de soort vis:
 * namen als "witvis" of "zeevis" hebben "vis" niet vooraan, maar elk visgerecht in de databank heeft de soort vis.
 */
export function vermijdtRecept(recept: { ingredienten: readonly { naam: string }[]; soort?: string }, vermijd: readonly Vermijd[]): boolean {
  if (!vermijd.length) return false;
  if (vermijd.includes('vis') && recept.soort === 'vis') return true;
  return heeftVermijdNaam(recept.ingredienten, vermijd);
}
