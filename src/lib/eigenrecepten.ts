// Eigen recepten (WEEK-45): recepten die het gezin zelf toevoegt. Pure logica, zonder opslag.
// Hoeveelheden zijn per volwassen portie, zoals de receptenbank.
import { BankRecept, Eenheid, Soort, StijlCode } from '@/data/receptenbank';
import { INGREDIENT_CODES, IngredientCode, ingredientNaam } from '@/data/ingredienten';
import { TALEN, type Taal } from '@/i18n';
import { isFavoriet, type Favoriet } from '@/lib/favorieten';
import { zoeksleutel } from '@/lib/planner/kies';
import { kooktijdVan, type KooktijdCode } from '@/lib/planner/types';

export const EENHEDEN: readonly Eenheid[] = ['g', 'ml', 'stuk', 'teentje'];
export const SOORTEN: readonly Soort[] = ['vegetarisch', 'vis', 'vlees'];
const MAX_MINUTEN = 600;

export type EigenIngredient = { code?: IngredientCode; naam: string; hoeveelheid: number; eenheid: Eenheid };

export type EigenRecept = {
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  stijlen: StijlCode[];
  ingredienten: EigenIngredient[];
  stappen: string[];
  bijgewerkt: string;
};

export type Invoer = {
  naam: string;
  soort: Soort;
  minuten: string;
  stijlen: StijlCode[];
  ingredienten: EigenIngredient[];
  stappen: string[];
};

export type Fout = 'naam' | 'minuten' | 'ingredienten' | 'stappen';
export type Gewaardeerd = Omit<EigenRecept, 'id' | 'bijgewerkt'>;

/** Controleert het formulier; geeft de opgeschoonde waarden of de fouten. */
export function valideer(invoer: Invoer): { ok: true; waarden: Gewaardeerd } | { ok: false; fouten: Fout[] } {
  const fouten: Fout[] = [];
  const naam = invoer.naam.trim();
  if (!naam) fouten.push('naam');
  const minuten = Number(invoer.minuten.trim().replace(',', '.'));
  if (!Number.isInteger(minuten) || minuten < 1 || minuten > MAX_MINUTEN) fouten.push('minuten');
  const ingredienten = invoer.ingredienten
    .map((i) => ({ ...i, naam: i.naam.trim() }))
    .filter((i) => i.naam.length > 0);
  if (!ingredienten.length || ingredienten.some((i) => !(i.hoeveelheid > 0))) fouten.push('ingredienten');
  const stappen = invoer.stappen.map((s) => s.trim()).filter((s) => s.length > 0);
  if (!stappen.length) fouten.push('stappen');
  if (fouten.length) return { ok: false, fouten };
  return { ok: true, waarden: { naam, soort: invoer.soort, minuten, stijlen: [...invoer.stijlen], ingredienten, stappen } };
}

/** Een nieuwe id; uniek genoeg voor één gezin op één toestel. */
export function nieuweId(nu: Date, willekeurig: () => number = Math.random): string {
  return `eigen:${nu.getTime().toString(36)}${Math.floor(willekeurig() * 36 ** 3).toString(36)}`;
}

/** Voegt toe of vervangt (zelfde id); de lijst blijft in volgorde van toevoegen. */
export function bewaarEigen(lijst: readonly EigenRecept[], recept: EigenRecept): EigenRecept[] {
  return lijst.some((r) => r.id === recept.id)
    ? lijst.map((r) => (r.id === recept.id ? recept : r))
    : [...lijst, recept];
}

export function verwijderEigen(lijst: readonly EigenRecept[], id: string): EigenRecept[] {
  return lijst.filter((r) => r.id !== id);
}

export type IngredientKeuze = { code?: IngredientCode; naam: string };

/**
 * Zoekt ingrediënten: eerst de ingrediëntenlijst van de app, daarna de handmatig ingevoerde
 * ingrediënten uit eigen recepten (zodat die later opnieuw gevonden worden). Zonder accenten en hoofdletters.
 */
export function zoekIngredienten(zoek: string, taal: Taal, eigen: readonly EigenRecept[], max = 8): IngredientKeuze[] {
  const q = zoeksleutel(zoek);
  if (!q) return [];
  const uit: IngredientKeuze[] = [];
  for (const code of INGREDIENT_CODES) {
    const naam = ingredientNaam(code, taal);
    if (zoeksleutel(naam).includes(q)) uit.push({ code, naam });
  }
  const bekend = new Set(uit.map((k) => zoeksleutel(k.naam)));
  for (const recept of eigen) {
    for (const i of recept.ingredienten) {
      if (i.code) continue;
      const k = zoeksleutel(i.naam);
      if (k.includes(q) && !bekend.has(k)) {
        bekend.add(k);
        uit.push({ naam: i.naam });
      }
    }
  }
  return uit.slice(0, max);
}

/** Staat de zoekterm al exact in de lijst? Dan hoeft er geen handmatig ingrediënt bij. */
export function isExactBekend(zoek: string, keuzes: readonly IngredientKeuze[]): boolean {
  const q = zoeksleutel(zoek);
  return keuzes.some((k) => zoeksleutel(k.naam) === q);
}

export type Bron = 'alle' | 'mijn' | 'favoriet';

export type LijstRegel = {
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  stijlen: StijlCode[];
  eigen: boolean;
};

export type LijstFilter = {
  bron: Bron;
  soorten: readonly Soort[];
  kooktijden: readonly KooktijdCode[];
  stijlen: readonly StijlCode[];
  zoek: string;
  taal: Taal;
  favorieten: readonly Favoriet[];
};

/** Alle recepten (receptenbank en eigen) gefilterd op bron, soort, kooktijd, stijl en zoekterm. */
export function lijstRegels(eigen: readonly EigenRecept[], bank: readonly BankRecept[], f: LijstFilter): LijstRegel[] {
  const idx = Math.max(0, TALEN.indexOf(f.taal));
  const zoek = zoeksleutel(f.zoek);
  const alles: LijstRegel[] = [
    ...eigen.map((r) => ({ id: r.id, naam: r.naam, soort: r.soort, minuten: r.minuten, stijlen: r.stijlen, eigen: true })),
    ...bank.map((r) => ({
      id: r.id,
      naam: r.namen[idx] ?? r.namen[0],
      soort: r.soort,
      minuten: r.minuten,
      stijlen: [...r.stijlen],
      eigen: false,
    })),
  ];
  return alles
    .filter((r) => f.bron === 'alle' || (f.bron === 'mijn' ? r.eigen : isFavoriet(f.favorieten, r.naam)))
    .filter((r) => !f.soorten.length || f.soorten.includes(r.soort))
    .filter((r) => !f.kooktijden.length || f.kooktijden.includes(kooktijdVan(r.minuten)))
    .filter((r) => !f.stijlen.length || r.stijlen.some((s) => f.stijlen.includes(s)))
    .filter((r) => !zoek || zoeksleutel(r.naam).includes(zoek))
    .sort((a, b) => a.naam.localeCompare(b.naam, f.taal));
}
