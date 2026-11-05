// De ingrediëntenlijst van de app (WEEK-205): de ingrediënten uit de databank, met winkelafdeling, eenheid en naam in elke taal.
// De gegevens staan in ingredienten.gegenereerd.ts (uit de databank gegenereerd). Dit bestand bevat enkel de logica erop.
// Volgorde van de namen: nl, fr, de, en.
import type { Taal } from '@/i18n';
import { INGREDIENTEN_DB } from '@/data/ingredienten.gegenereerd';

export type Afdeling =
  | 'groenten-fruit'
  | 'vlees-vis'
  | 'zuivel-eieren'
  | 'brood'
  | 'droge-voeding'
  | 'conserven-sauzen'
  | 'diepvries'
  | 'dranken';

export const AFDELINGEN: Afdeling[] = [
  'groenten-fruit',
  'vlees-vis',
  'zuivel-eieren',
  'brood',
  'droge-voeding',
  'conserven-sauzen',
  'diepvries',
  'dranken',
];

export type IngredientCode = keyof typeof INGREDIENTEN_DB;

const VOLGORDE: Taal[] = ['nl', 'fr', 'de', 'en'];

export function isIngredient(code: string): code is IngredientCode {
  return Object.prototype.hasOwnProperty.call(INGREDIENTEN_DB, code);
}

/** De winkelafdeling bij een categorie uit de databank. */
export function afdelingVoorCategorie(categorie: string): Afdeling {
  switch (categorie) {
    case 'groente':
    case 'fruit':
      return 'groenten-fruit';
    case 'vlees':
    case 'vis':
      return 'vlees-vis';
    case 'zuivel':
    case 'ei':
    case 'eiwit':
      return 'zuivel-eieren';
    case 'condiment':
    case 'vet':
      return 'conserven-sauzen';
    default:
      return 'droge-voeding';
  }
}

/** Enkele producten horen in een andere winkelafdeling dan hun databankcategorie laat vermoeden. */
const AFDELING_PER_CODE: Readonly<Partial<Record<IngredientCode, Afdeling>>> = {
  brood: 'brood',
  naan: 'brood',
  tortilla_wrap: 'brood',
  vissticks: 'diepvries',
  perziken_diepvries: 'diepvries',
  zomerfruit_diepvries: 'diepvries',
  ovenfriet: 'diepvries',
  bier: 'dranken',
  rode_wijn: 'dranken',
  witte_wijn: 'dranken',
  sake: 'dranken',
  sinaasappelsap: 'dranken',
  kokoswater: 'dranken',
  water: 'dranken',
  tonijn_blik: 'conserven-sauzen',
  tomaat_blokjes: 'conserven-sauzen',
  kidneybonen: 'conserven-sauzen',
  witte_bonen: 'conserven-sauzen',
  kikkererwten: 'conserven-sauzen',
  zwarte_bonen: 'conserven-sauzen',
  'maïs': 'conserven-sauzen',
  olijven: 'conserven-sauzen',
};

export function afdelingVan(code: IngredientCode): Afdeling {
  return AFDELING_PER_CODE[code] ?? afdelingVoorCategorie(INGREDIENTEN_DB[code][0]);
}

export function ingredientNaam(code: IngredientCode, taal: Taal): string {
  return INGREDIENTEN_DB[code][2][VOLGORDE.indexOf(taal)];
}

export const INGREDIENT_CODES = Object.keys(INGREDIENTEN_DB) as IngredientCode[];

/**
 * Codes van de vroegere lokale catalogus (tot WEEK-205) en de databankcode die ze nu hebben.
 * Nodig om bewaarde lijsten, frigo's en eigen recepten van oudere versies te blijven begrijpen.
 */
const OUDE_CODE_NAAR_DB: Readonly<Record<string, IngredientCode>> = {
  tomaten: 'tomaat',
  tomatenblokjes: 'tomaat_blokjes',
  aardappelen: 'aardappel',
  wortelen: 'wortel',
  look: 'knoflook',
  parmezaan: 'kaas_parmezaan',
  zalmfilet: 'zalm',
  kippendijen: 'kipdijen',
  worsten: 'worst',
  tortillas: 'tortilla_wrap',
  mais: 'maïs',
  tonijn: 'tonijn_blik',
  erwten: 'doperwten',
  'bruin-bier': 'bier',
  'rode-linzen': 'linzen',
  spaghetti: 'pasta_spaghetti',
  lasagnevellen: 'lasagnebladen',
  bouillon: 'bouillonblokje',
  kaas: 'kaas_geraspt',
};

/** Zet een (oude) code om naar de databankcode; een databankcode blijft gelijk. */
export function naarDbCode(code: string): string {
  return OUDE_CODE_NAAR_DB[code] ?? code;
}

/**
 * De databankcode van een code, of undefined als de code onbekend is.
 * Sinds WEEK-205 is er maar één lijst: elke bekende code is een databankcode.
 */
export function dbCodeVan(code: string): IngredientCode | undefined {
  const db = naarDbCode(code);
  return isIngredient(db) ? db : undefined;
}

/**
 * Gemiddeld gewicht in gram van één stuk (WEEK-161). Zo kan een product in gram in de frigo
 * (bv. van vóór de omschakeling) toch met een recept op stuk koppelen. Benaderingen, geen exacte waarden.
 */
const GEWICHT_PER_STUK: Readonly<Record<string, number>> = {
  ui: 150, rode_ui: 150, tomaat: 120, wortel: 80, paprika: 150, prei: 200, sla: 300, courgette: 200, aubergine: 300,
  komkommer: 300, bloemkool: 600, broccoli: 300, witlof: 150, spitskool: 1000, witte_kool: 1200, knolselderij: 500,
  koolraap: 300, pastinaak: 150, selderij: 150, citroen: 100, sjalot: 30, mango: 350, pruimen: 60, andijvie: 400,
  paksoi: 400, ananas: 1000, eieren: 60, appel: 150, banaan: 120, kiwi: 80, avocado: 170, sinaasappel: 180, limoen: 60, peer: 170,
};

/** Gemiddeld gewicht van één stuk in gram, van een (oude) code of databankcode. Undefined als het niet bekend is. */
export function gewichtPerStuk(code: string): number | undefined {
  const db = dbCodeVan(code);
  return db ? GEWICHT_PER_STUK[db] : undefined;
}

/** De eenheid waarin een ingrediënt in de frigo en in recepten staat: die van de databank (WEEK-160). Onbekende code: gram. */
export function eenheidVan(code: string): string {
  const db = dbCodeVan(code);
  return db ? INGREDIENTEN_DB[db][1] : 'g';
}

const normaliseerNaam = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * De databankcode van een ingrediënt op basis van zijn naam in een van de talen (WEEK-160).
 * Zo koppelt een frigo-product dat in een andere taal is ingegeven toch aan het juiste recept-ingrediënt.
 * Onbekende naam: undefined.
 */
export function dbCodeVanNaam(naam: string): string | undefined {
  const n = normaliseerNaam(naam);
  if (!n) return undefined;
  for (const code of INGREDIENT_CODES) {
    if (VOLGORDE.some((taal) => normaliseerNaam(ingredientNaam(code, taal)) === n)) return code;
  }
  return undefined;
}
