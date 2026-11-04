// Ingrediënten van de lokale receptenbank, met winkelafdeling en naam in elke taal.
// Volgorde van de namen: nl, fr, de, en.
import type { Taal } from '@/i18n';

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

type Namen = [nl: string, fr: string, de: string, en: string];

const TABEL = {
  // droge voeding
  pasta: ['droge-voeding', ['pasta', 'pâtes', 'Nudeln', 'pasta']],
  spaghetti: ['droge-voeding', ['spaghetti', 'spaghetti', 'Spaghetti', 'spaghetti']],
  macaroni: ['droge-voeding', ['macaroni', 'macaronis', 'Makkaroni', 'macaroni']],
  lasagnevellen: ['droge-voeding', ['lasagnevellen', 'feuilles de lasagne', 'Lasagneplatten', 'lasagne sheets']],
  noedels: ['droge-voeding', ['noedels', 'nouilles', 'Mie-Nudeln', 'noodles']],
  rijst: ['droge-voeding', ['rijst', 'riz', 'Reis', 'rice']],
  couscous: ['droge-voeding', ['couscous', 'couscous', 'Couscous', 'couscous']],
  'rode-linzen': ['droge-voeding', ['rode linzen', 'lentilles corail', 'rote Linsen', 'red lentils']],
  bouillon: ['droge-voeding', ['bouillonblokje', 'cube de bouillon', 'Brühwürfel', 'stock cube']],
  // conserven en sauzen
  pesto: ['conserven-sauzen', ['pesto', 'pesto', 'Pesto', 'pesto']],
  currypasta: ['conserven-sauzen', ['currypasta', 'pâte de curry', 'Currypaste', 'curry paste']],
  kokosmelk: ['conserven-sauzen', ['kokosmelk', 'lait de coco', 'Kokosmilch', 'coconut milk']],
  sojasaus: ['conserven-sauzen', ['sojasaus', 'sauce soja', 'Sojasauce', 'soy sauce']],
  teriyakisaus: ['conserven-sauzen', ['teriyakisaus', 'sauce teriyaki', 'Teriyakisauce', 'teriyaki sauce']],
  tomatenblokjes: ['conserven-sauzen', ['tomatenblokjes', 'tomates concassées', 'gehackte Tomaten', 'chopped tomatoes']],
  kidneybonen: ['conserven-sauzen', ['kidneybonen', 'haricots rouges', 'Kidneybohnen', 'kidney beans']],
  mais: ['conserven-sauzen', ['maïs', 'maïs', 'Mais', 'sweetcorn']],
  tonijn: ['conserven-sauzen', ['tonijn in blik', 'thon en boîte', 'Thunfisch (Dose)', 'tinned tuna']],
  // brood
  brood: ['brood', ['brood', 'pain', 'Brot', 'bread']],
  tortillas: ['brood', ['tortilla’s', 'tortillas', 'Tortillas', 'tortilla wraps']],
  // groenten en fruit
  aardappelen: ['groenten-fruit', ['aardappelen', 'pommes de terre', 'Kartoffeln', 'potatoes']],
  krieltjes: ['groenten-fruit', ['krieltjes', 'grenailles', 'Drillinge', 'baby potatoes']],
  broccoli: ['groenten-fruit', ['broccoli', 'brocoli', 'Brokkoli', 'broccoli']],
  paprika: ['groenten-fruit', ['paprika', 'poivron', 'Paprika', 'pepper']],
  champignons: ['groenten-fruit', ['champignons', 'champignons', 'Champignons', 'mushrooms']],
  spinazie: ['groenten-fruit', ['spinazie', 'épinards', 'Spinat', 'spinach']],
  soepgroenten: ['groenten-fruit', ['soepgroenten', 'légumes pour soupe', 'Suppengemüse', 'soup vegetables']],
  wokgroenten: ['groenten-fruit', ['wokgroenten', 'légumes pour wok', 'Wokgemüse', 'stir-fry vegetables']],
  ui: ['groenten-fruit', ['ui', 'oignon', 'Zwiebel', 'onion']],
  look: ['groenten-fruit', ['look', 'ail', 'Knoblauch', 'garlic']],
  courgette: ['groenten-fruit', ['courgette', 'courgette', 'Zucchini', 'courgette']],
  tomaten: ['groenten-fruit', ['tomaten', 'tomates', 'Tomaten', 'tomatoes']],
  sperziebonen: ['groenten-fruit', ['sperziebonen', 'haricots verts', 'grüne Bohnen', 'green beans']],
  wortelen: ['groenten-fruit', ['wortelen', 'carottes', 'Karotten', 'carrots']],
  prei: ['groenten-fruit', ['prei', 'poireau', 'Lauch', 'leek']],
  sla: ['groenten-fruit', ['sla', 'laitue', 'Salat', 'lettuce']],
  citroen: ['groenten-fruit', ['citroen', 'citron', 'Zitrone', 'lemon']],
  limoen: ['groenten-fruit', ['limoen', 'citron vert', 'Limette', 'lime']],
  // diepvries
  erwten: ['diepvries', ['erwten', 'petits pois', 'Erbsen', 'peas']],
  vissticks: ['diepvries', ['vissticks', 'bâtonnets de poisson', 'Fischstäbchen', 'fish fingers']],
  // zuivel en eieren
  eieren: ['zuivel-eieren', ['eieren', 'œufs', 'Eier', 'eggs']],
  parmezaan: ['zuivel-eieren', ['Parmezaanse kaas', 'parmesan', 'Parmesan', 'Parmesan']],
  kaas: ['zuivel-eieren', ['geraspte kaas', 'fromage râpé', 'geriebener Käse', 'grated cheese']],
  feta: ['zuivel-eieren', ['feta', 'feta', 'Feta', 'feta']],
  melk: ['zuivel-eieren', ['melk', 'lait', 'Milch', 'milk']],
  room: ['zuivel-eieren', ['room', 'crème', 'Sahne', 'cream']],
  boter: ['zuivel-eieren', ['boter', 'beurre', 'Butter', 'butter']],
  // vlees en vis
  zalmfilet: ['vlees-vis', ['zalmfilet', 'filet de saumon', 'Lachsfilet', 'salmon fillet']],
  kabeljauw: ['vlees-vis', ['kabeljauwfilet', 'filet de cabillaud', 'Kabeljaufilet', 'cod fillet']],
  witvis: ['vlees-vis', ['witvis', 'poisson blanc', 'Weißfisch', 'white fish']],
  scampi: ['vlees-vis', ['scampi', 'scampis', 'Garnelen', 'prawns']],
  kipfilet: ['vlees-vis', ['kipfilet', 'filet de poulet', 'Hähnchenbrust', 'chicken breast']],
  kippendijen: ['vlees-vis', ['kippendijen', 'cuisses de poulet', 'Hähnchenschenkel', 'chicken thighs']],
  gehakt: ['vlees-vis', ['gehakt', 'haché', 'Hackfleisch', 'minced meat']],
  worsten: ['vlees-vis', ['worsten', 'saucisses', 'Würstchen', 'sausages']],
  rundvlees: ['vlees-vis', ['stoofvlees', 'viande à braiser', 'Schmorfleisch', 'stewing beef']],
  // dranken
  'bruin-bier': ['dranken', ['bruin bier', 'bière brune', 'dunkles Bier', 'brown ale']],
  // ontbijt en middag (WEEK-43)
  komkommer: ['groenten-fruit', ['komkommer', 'concombre', 'Gurke', 'cucumber']],
} as const satisfies Record<string, readonly [Afdeling, Namen]>;

export type IngredientCode = keyof typeof TABEL;

const VOLGORDE: Taal[] = ['nl', 'fr', 'de', 'en'];

export function isIngredient(code: string): code is IngredientCode {
  return code in TABEL;
}

export function afdelingVan(code: IngredientCode): Afdeling {
  return TABEL[code][0];
}

export function ingredientNaam(code: IngredientCode, taal: Taal): string {
  return TABEL[code][1][VOLGORDE.indexOf(taal)];
}

export const INGREDIENT_CODES = Object.keys(TABEL) as IngredientCode[];

/**
 * De catalogus en de databank van recepten gebruiken voor sommige ingrediënten een andere code (WEEK-160).
 * Deze tabel zet de catalogus-code om naar de databankcode; alle andere codes blijven gelijk.
 */
const CATALOGUS_NAAR_DB: Readonly<Record<string, string>> = {
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
};

/** Zet een catalogus-code om naar de databankcode (idempotent voor codes die al een databankcode zijn). */
export function naarDbCode(code: string): string {
  return CATALOGUS_NAAR_DB[code] ?? code;
}

/**
 * Catalogus-ingrediënten zonder databankequivalent (WEEK-160). Die hebben geen betrouwbare databankcode:
 * ze koppelen op naam, net als vroeger. Een code uit deze lijst mag nooit tegen een databankcode vergeleken worden,
 * want dan zou "pasta" niet meer matchen met het recept-ingrediënt "pasta" met code pasta_penne.
 */
const ZONDER_DB_EQUIVALENT: ReadonlySet<string> = new Set([
  'pasta',
  'macaroni',
  'noedels',
  'rijst',
  'bouillon',
  'krieltjes',
  'soepgroenten',
  'wokgroenten',
  'vissticks',
  'kaas',
  'kabeljauw',
  'scampi',
  'fruit',
]);

/** De databankcode van een code, of undefined als er geen betrouwbare databankcode is (WEEK-160). */
export function dbCodeVan(code: string): string | undefined {
  if (ZONDER_DB_EQUIVALENT.has(code)) return undefined;
  return naarDbCode(code);
}

/**
 * De vaste eenheid per databankcode (WEEK-160), overgenomen uit de databank. Alles wat hier niet staat, is gram.
 * Tellingen: stuk (appel, eieren, tortilla…) en teentje (knoflook). Vloeistoffen: ml.
 */
const VASTE_EENHEID: Readonly<Record<string, 'stuk' | 'teentje' | 'ml'>> = {
  appel: 'stuk', avocado: 'stuk', banaan: 'stuk', bouillonblokje: 'stuk', citroengras: 'stuk', eieren: 'stuk', kiwi: 'stuk',
  kip_heel: 'stuk', laurier: 'stuk', lasagnebladen: 'stuk', limoen: 'stuk', nori: 'stuk', peer: 'stuk', rode_chili: 'stuk',
  rookworst: 'stuk', sinaasappel: 'stuk', tortilla_wrap: 'stuk',
  knoflook: 'teentje',
  // Groenten en fruit die je per stuk koopt (WEEK-161). Het gewicht per stuk staat in GEWICHT_PER_STUK.
  ui: 'stuk', rode_ui: 'stuk', tomaat: 'stuk', wortel: 'stuk', paprika: 'stuk', prei: 'stuk', sla: 'stuk', courgette: 'stuk',
  aubergine: 'stuk', komkommer: 'stuk', bloemkool: 'stuk', broccoli: 'stuk', witlof: 'stuk', spitskool: 'stuk', witte_kool: 'stuk',
  knolselderij: 'stuk', koolraap: 'stuk', pastinaak: 'stuk', selderij: 'stuk', citroen: 'stuk', sjalot: 'stuk', mango: 'stuk',
  pruimen: 'stuk', andijvie: 'stuk', paksoi: 'stuk', ananas: 'stuk',
  agavesiroop: 'ml', amandelmelk: 'ml', appelazijn: 'ml', bier: 'ml', groentebouillon: 'ml', haverdrink: 'ml', ijswater: 'ml',
  kippenbouillon: 'ml', ketjap: 'ml', kokosmelk: 'ml', kokoswater: 'ml', melk: 'ml', mirin: 'ml', oestersaus: 'ml', olijfolie: 'ml',
  rijstazijn: 'ml', rode_wijn: 'ml', room: 'ml', sake: 'ml', sesamolie: 'ml', sinaasappelsap: 'ml', sojasaus: 'ml', teriyakisaus: 'ml',
  vanille: 'ml', vissaus: 'ml', vleesfond: 'ml', water: 'ml', witte_wijn: 'ml', zonnebloemolie: 'ml',
};

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

/** Gemiddeld gewicht van één stuk in gram, van een catalogus- of databankcode. Undefined als het niet bekend is. */
export function gewichtPerStuk(code: string): number | undefined {
  const db = dbCodeVan(code);
  return db ? GEWICHT_PER_STUK[db] : undefined;
}

/** De eenheid waarin een catalogus-ingrediënt in de frigo en in recepten staat (WEEK-160). Geen databankcode: gram. */
export function eenheidVan(code: string): string {
  const db = dbCodeVan(code);
  return (db && VASTE_EENHEID[db]) ?? 'g';
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
    if (VOLGORDE.some((taal) => normaliseerNaam(ingredientNaam(code, taal)) === n)) return dbCodeVan(code);
  }
  return undefined;
}
