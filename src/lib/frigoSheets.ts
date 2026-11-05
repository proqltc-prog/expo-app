// De frigo in twee sheets (WEEK-71 deel 2).
// - Planner-frigo: ingrediënten uit de catalogus (zoekbaar). Enkel deze tellen mee bij het weekmenu.
// - Losse producten: vrije invoer en scanner. Tellen niet mee bij het weekmenu; de gebruiker beheert ze zelf.
// De app verwijdert nooit automatisch iets uit een van beide sheets.
import { afdelingVan, dbCodeVan, eenheidVan, ingredientNaam, INGREDIENT_CODES, IngredientCode } from '@/data/ingredienten';
import type { Afdeling } from '@/data/ingredienten';
import { TALEN, Taal } from '@/i18n';
import { aantalProducten, FrigoItem, frigoBron, voegZelfToe, ZelfExtra } from '@/lib/frigo';

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

/**
 * Kent de receptenbank dit ingrediënt? Alleen die mogen in de planner-frigo (WEEK-162):
 * de weekplanner kan enkel verwerken wat een databankcode heeft. Generieke items zonder equivalent (pasta, kaas, rijst...) niet.
 */
export function inReceptenbank(code: IngredientCode): boolean {
  return dbCodeVan(code) !== undefined;
}

/** Zoekt in de catalogus, enkel de ingrediënten die de receptenbank kent (WEEK-162). Voor de planner-frigo. */
export function zoekReceptenbank(zoek: string, taal: Taal): CatalogusItem[] {
  return zoekCatalogus(zoek, taal).filter((i) => inReceptenbank(i.code));
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

export type Sheet = 'planner' | 'los';

/**
 * Accentkleuren per sheet (WEEK-75): planner-frigo petrol, losse producten oranje.
 * Het goedgekeurde thema van het weekmenu; zo zijn de twee sheets in één oogopslag te onderscheiden.
 */
export const SHEET_THEMA: Record<Sheet, { accent: string; accentZacht: string }> = {
  planner: { accent: '#0F6B66', accentZacht: '#D5EDEA' },
  los: { accent: '#E8680F', accentZacht: '#FDE8D6' },
};

export function sheetThema(sheet: Sheet): { accent: string; accentZacht: string } {
  return SHEET_THEMA[sheet];
}

/** De twee sheets. Elk frigo-item zit in precies één sheet. */
export function sheets(frigo: readonly FrigoItem[]): { planner: FrigoItem[]; los: FrigoItem[] } {
  return {
    planner: frigo.filter((f) => frigoBron(f) === 'planner'),
    los: frigo.filter((f) => frigoBron(f) === 'los'),
  };
}

/** Het aantal producten van een sheet, zoals de teller op het scherm en op de tab (WEEK-96): één bron, zo kloppen ze. */
export function aantalSheet(frigo: readonly FrigoItem[], sheet: Sheet): number {
  return aantalProducten(sheets(frigo)[sheet]);
}

/** Icoon per sheet (WEEK-96): duidelijke lijnicoontjes in plaats van emoji. Ionicons-namen. */
export const SHEET_ICOON: Record<Sheet, string> = { planner: 'calendar-outline', los: 'cube-outline' };

/**
 * Zet een ingrediënt uit de catalogus in de planner-frigo (WEEK-160).
 * Het krijgt de databankcode en de vaste eenheid van het ingrediënt (stuk, teentje, ml of g), zodat het
 * met de recepten koppelt. `hoeveelheid` is optioneel; zonder hoeveelheid gaat bij het koken het hele product eruit.
 * Staat het er al in (zelfde naam), dan verandert er niets: geen dubbele regels.
 */
export function voegPlannerToe(frigo: readonly FrigoItem[], item: CatalogusItem, nu: Date, hoeveelheid?: number): FrigoItem[] {
  // WEEK-162: een ingrediënt zonder receptenbank-code kan de planner niet verwerken; het gaat dus niet in de planner-frigo.
  if (!inReceptenbank(item.code)) return [...frigo];
  const n = normaliseer(item.naam);
  if (frigo.some((f) => frigoBron(f) === 'planner' && normaliseer(f.naam) === n)) return [...frigo];
  const code = dbCodeVan(item.code);
  return voegZelfToe(frigo, item.naam, nu, {
    bron: 'planner',
    afdeling: item.afdeling,
    eenheid: eenheidVan(item.code),
    ...(code ? { code } : {}),
    ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  });
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
  // WEEK-162: planner-frigo enkel voor ingrediënten die de receptenbank kent.
  // WEEK-204: een item met een code komt altijd uit een recept of de catalogus en hoort in de planner-frigo, ook als
  // het eerder verkeerd als los werd ingedeeld. Wat via de boodschappenlijst kwam (lijstId), houdt zijn bron. Anders
  // belandden receptingrediënten die niet in de lokale ingrediëntenlijst staan (gember, shiitake…) bij de losse producten.
  return frigo.map((f) => {
    if (f.code) return f.bron === 'planner' ? f : { ...f, bron: 'planner' };
    if (f.lijstId) return f.bron ? f : { ...f, bron: frigoBron(f) };
    const code = inCatalogus(f.naam);
    return { ...f, bron: code !== undefined && inReceptenbank(code) ? 'planner' : 'los' };
  });
}
