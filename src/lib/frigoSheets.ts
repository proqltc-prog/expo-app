// De frigo in twee sheets (WEEK-71 deel 2).
// - Planner-frigo: ingrediënten uit de catalogus (zoekbaar). Enkel deze tellen mee bij het weekmenu.
// - Losse producten: vrije invoer en scanner. Tellen niet mee bij het weekmenu; de gebruiker beheert ze zelf.
// De app verwijdert nooit automatisch iets uit een van beide sheets.
import { afdelingVan, ingredientNaam, INGREDIENT_CODES, IngredientCode } from '@/data/ingredienten';
import type { Afdeling } from '@/data/ingredienten';
import { TALEN, Taal } from '@/i18n';
import { FrigoItem, frigoBron, voegZelfToe, ZelfExtra } from '@/lib/frigo';

export type CatalogusItem = { code: IngredientCode; naam: string; afdeling: Afdeling };

/** Haalt accenten en hoofdletters weg, zodat "pâte" ook "pates" en "Pasta" vindt. */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** De catalogus in de gekozen taal, alfabetisch op naam. */
export function catalogus(taal: Taal): CatalogusItem[] {
  return INGREDIENT_CODES.map((code) => ({ code, naam: ingredientNaam(code, taal), afdeling: afdelingVan(code) })).sort((a, b) =>
    a.naam.localeCompare(b.naam, taal)
  );
}

/** Zoekt in de catalogus op een deel van de naam. Leeg zoekveld geeft de hele catalogus. */
export function zoekCatalogus(zoek: string, taal: Taal): CatalogusItem[] {
  const q = normaliseer(zoek);
  const alles = catalogus(taal);
  if (!q) return alles;
  return alles.filter((i) => normaliseer(i.naam).includes(q));
}

/** Alle namen van een catalogus-ingrediënt, in elke taal; zo koppelen oude items ook als ze in een andere taal staan. */
function alleNamen(code: IngredientCode): string[] {
  return TALEN.map((t) => normaliseer(ingredientNaam(code, t)));
}

/** Komt de naam van dit frigo-item overeen met een catalogus-ingrediënt? */
export function inCatalogus(naam: string): IngredientCode | undefined {
  const n = normaliseer(naam);
  if (!n) return undefined;
  return INGREDIENT_CODES.find((code) => alleNamen(code).includes(n));
}

/** De twee sheets. Elk frigo-item zit in precies één sheet. */
export function sheets(frigo: readonly FrigoItem[]): { planner: FrigoItem[]; los: FrigoItem[] } {
  return {
    planner: frigo.filter((f) => frigoBron(f) === 'planner'),
    los: frigo.filter((f) => frigoBron(f) === 'los'),
  };
}

/**
 * Zet een ingrediënt uit de catalogus in de planner-frigo.
 * Staat het er al in (zelfde naam), dan verandert er niets: geen dubbele regels.
 */
export function voegPlannerToe(frigo: readonly FrigoItem[], item: CatalogusItem, nu: Date): FrigoItem[] {
  const n = normaliseer(item.naam);
  if (frigo.some((f) => frigoBron(f) === 'planner' && normaliseer(f.naam) === n)) return [...frigo];
  return voegZelfToe(frigo, item.naam, nu, { bron: 'planner', afdeling: item.afdeling });
}

/** Voegt een losse product toe. Het telt niet mee bij het weekmenu. */
export function voegLosToe(frigo: readonly FrigoItem[], naam: string, nu: Date, extra: ZelfExtra = {}): FrigoItem[] {
  return voegZelfToe(frigo, naam, nu, { ...extra, bron: 'los' });
}

/**
 * Eenmalige koppeling van de bestaande frigo (WEEK-71 deel 2):
 * wat overeenkomt met een catalogus-ingrediënt wordt planner-frigo, de rest wordt een los product.
 * Items die al een bron hebben en niet overeenkomen, worden los.
 */
export function koppelBronnen(frigo: readonly FrigoItem[]): FrigoItem[] {
  return frigo.map((f) => ({ ...f, bron: inCatalogus(f.naam) ? 'planner' : 'los' }));
}
