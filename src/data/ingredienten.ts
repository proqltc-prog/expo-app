// Ingrediënten van de lokale receptenbank, met winkelafdeling en naam in elke taal.
// Volgorde van de namen: nl, fr, de, en, es, pt.
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

type Namen = [nl: string, fr: string, de: string, en: string, es: string, pt: string];

const TABEL = {
  // droge voeding
  pasta: ['droge-voeding', ['pasta', 'pâtes', 'Nudeln', 'pasta', 'pasta', 'massa']],
  spaghetti: ['droge-voeding', ['spaghetti', 'spaghetti', 'Spaghetti', 'spaghetti', 'espaguetis', 'esparguete']],
  macaroni: ['droge-voeding', ['macaroni', 'macaronis', 'Makkaroni', 'macaroni', 'macarrones', 'macarrão']],
  lasagnevellen: ['droge-voeding', ['lasagnevellen', 'feuilles de lasagne', 'Lasagneplatten', 'lasagne sheets', 'placas de lasaña', 'folhas de lasanha']],
  noedels: ['droge-voeding', ['noedels', 'nouilles', 'Mie-Nudeln', 'noodles', 'fideos', 'noodles']],
  rijst: ['droge-voeding', ['rijst', 'riz', 'Reis', 'rice', 'arroz', 'arroz']],
  couscous: ['droge-voeding', ['couscous', 'couscous', 'Couscous', 'couscous', 'cuscús', 'cuscuz']],
  'rode-linzen': ['droge-voeding', ['rode linzen', 'lentilles corail', 'rote Linsen', 'red lentils', 'lentejas rojas', 'lentilhas vermelhas']],
  bouillon: ['droge-voeding', ['bouillonblokje', 'cube de bouillon', 'Brühwürfel', 'stock cube', 'pastilla de caldo', 'cubo de caldo']],
  // conserven en sauzen
  pesto: ['conserven-sauzen', ['pesto', 'pesto', 'Pesto', 'pesto', 'pesto', 'pesto']],
  currypasta: ['conserven-sauzen', ['currypasta', 'pâte de curry', 'Currypaste', 'curry paste', 'pasta de curry', 'pasta de caril']],
  kokosmelk: ['conserven-sauzen', ['kokosmelk', 'lait de coco', 'Kokosmilch', 'coconut milk', 'leche de coco', 'leite de coco']],
  sojasaus: ['conserven-sauzen', ['sojasaus', 'sauce soja', 'Sojasauce', 'soy sauce', 'salsa de soja', 'molho de soja']],
  teriyakisaus: ['conserven-sauzen', ['teriyakisaus', 'sauce teriyaki', 'Teriyakisauce', 'teriyaki sauce', 'salsa teriyaki', 'molho teriyaki']],
  tomatenblokjes: ['conserven-sauzen', ['tomatenblokjes', 'tomates concassées', 'gehackte Tomaten', 'chopped tomatoes', 'tomate troceado', 'tomate em pedaços']],
  kidneybonen: ['conserven-sauzen', ['kidneybonen', 'haricots rouges', 'Kidneybohnen', 'kidney beans', 'alubias rojas', 'feijão vermelho']],
  mais: ['conserven-sauzen', ['maïs', 'maïs', 'Mais', 'sweetcorn', 'maíz', 'milho']],
  tonijn: ['conserven-sauzen', ['tonijn in blik', 'thon en boîte', 'Thunfisch (Dose)', 'tinned tuna', 'atún en lata', 'atum em lata']],
  // brood
  brood: ['brood', ['brood', 'pain', 'Brot', 'bread', 'pan', 'pão']],
  tortillas: ['brood', ['tortilla’s', 'tortillas', 'Tortillas', 'tortilla wraps', 'tortillas de trigo', 'tortilhas']],
  // groenten en fruit
  aardappelen: ['groenten-fruit', ['aardappelen', 'pommes de terre', 'Kartoffeln', 'potatoes', 'patatas', 'batatas']],
  krieltjes: ['groenten-fruit', ['krieltjes', 'grenailles', 'Drillinge', 'baby potatoes', 'patatas baby', 'batatas pequenas']],
  broccoli: ['groenten-fruit', ['broccoli', 'brocoli', 'Brokkoli', 'broccoli', 'brócoli', 'brócolos']],
  paprika: ['groenten-fruit', ['paprika', 'poivron', 'Paprika', 'pepper', 'pimiento', 'pimento']],
  champignons: ['groenten-fruit', ['champignons', 'champignons', 'Champignons', 'mushrooms', 'champiñones', 'cogumelos']],
  spinazie: ['groenten-fruit', ['spinazie', 'épinards', 'Spinat', 'spinach', 'espinacas', 'espinafres']],
  soepgroenten: ['groenten-fruit', ['soepgroenten', 'légumes pour soupe', 'Suppengemüse', 'soup vegetables', 'verduras para sopa', 'legumes para sopa']],
  wokgroenten: ['groenten-fruit', ['wokgroenten', 'légumes pour wok', 'Wokgemüse', 'stir-fry vegetables', 'verduras para wok', 'legumes para wok']],
  ui: ['groenten-fruit', ['ui', 'oignon', 'Zwiebel', 'onion', 'cebolla', 'cebola']],
  look: ['groenten-fruit', ['look', 'ail', 'Knoblauch', 'garlic', 'ajo', 'alho']],
  courgette: ['groenten-fruit', ['courgette', 'courgette', 'Zucchini', 'courgette', 'calabacín', 'curgete']],
  tomaten: ['groenten-fruit', ['tomaten', 'tomates', 'Tomaten', 'tomatoes', 'tomates', 'tomates']],
  sperziebonen: ['groenten-fruit', ['sperziebonen', 'haricots verts', 'grüne Bohnen', 'green beans', 'judías verdes', 'feijão-verde']],
  wortelen: ['groenten-fruit', ['wortelen', 'carottes', 'Karotten', 'carrots', 'zanahorias', 'cenouras']],
  prei: ['groenten-fruit', ['prei', 'poireau', 'Lauch', 'leek', 'puerro', 'alho-francês']],
  sla: ['groenten-fruit', ['sla', 'laitue', 'Salat', 'lettuce', 'lechuga', 'alface']],
  citroen: ['groenten-fruit', ['citroen', 'citron', 'Zitrone', 'lemon', 'limón', 'limão']],
  limoen: ['groenten-fruit', ['limoen', 'citron vert', 'Limette', 'lime', 'lima', 'lima']],
  // diepvries
  erwten: ['diepvries', ['erwten', 'petits pois', 'Erbsen', 'peas', 'guisantes', 'ervilhas']],
  vissticks: ['diepvries', ['vissticks', 'bâtonnets de poisson', 'Fischstäbchen', 'fish fingers', 'palitos de pescado', 'douradinhos']],
  // zuivel en eieren
  eieren: ['zuivel-eieren', ['eieren', 'œufs', 'Eier', 'eggs', 'huevos', 'ovos']],
  parmezaan: ['zuivel-eieren', ['Parmezaanse kaas', 'parmesan', 'Parmesan', 'Parmesan', 'parmesano', 'parmesão']],
  kaas: ['zuivel-eieren', ['geraspte kaas', 'fromage râpé', 'geriebener Käse', 'grated cheese', 'queso rallado', 'queijo ralado']],
  feta: ['zuivel-eieren', ['feta', 'feta', 'Feta', 'feta', 'queso feta', 'queijo feta']],
  melk: ['zuivel-eieren', ['melk', 'lait', 'Milch', 'milk', 'leche', 'leite']],
  room: ['zuivel-eieren', ['room', 'crème', 'Sahne', 'cream', 'nata', 'natas']],
  boter: ['zuivel-eieren', ['boter', 'beurre', 'Butter', 'butter', 'mantequilla', 'manteiga']],
  // vlees en vis
  zalmfilet: ['vlees-vis', ['zalmfilet', 'filet de saumon', 'Lachsfilet', 'salmon fillet', 'filete de salmón', 'filete de salmão']],
  kabeljauw: ['vlees-vis', ['kabeljauwfilet', 'filet de cabillaud', 'Kabeljaufilet', 'cod fillet', 'filete de bacalao', 'filete de bacalhau']],
  witvis: ['vlees-vis', ['witvis', 'poisson blanc', 'Weißfisch', 'white fish', 'pescado blanco', 'peixe branco']],
  scampi: ['vlees-vis', ['scampi', 'scampis', 'Garnelen', 'prawns', 'langostinos', 'camarões']],
  kipfilet: ['vlees-vis', ['kipfilet', 'filet de poulet', 'Hähnchenbrust', 'chicken breast', 'pechuga de pollo', 'peito de frango']],
  kippendijen: ['vlees-vis', ['kippendijen', 'cuisses de poulet', 'Hähnchenschenkel', 'chicken thighs', 'muslos de pollo', 'coxas de frango']],
  gehakt: ['vlees-vis', ['gehakt', 'haché', 'Hackfleisch', 'minced meat', 'carne picada', 'carne picada']],
  worsten: ['vlees-vis', ['worsten', 'saucisses', 'Würstchen', 'sausages', 'salchichas', 'salsichas']],
  rundvlees: ['vlees-vis', ['stoofvlees', 'viande à braiser', 'Schmorfleisch', 'stewing beef', 'carne para guisar', 'carne para estufar']],
  // dranken
  'bruin-bier': ['dranken', ['bruin bier', 'bière brune', 'dunkles Bier', 'brown ale', 'cerveza tostada', 'cerveja preta']],
  // ontbijt en middag (WEEK-43)
  yoghurt: ['zuivel-eieren', ['yoghurt', 'yaourt nature', 'Joghurt', 'yogurt', 'yogur natural', 'iogurte natural']],
  muesli: ['droge-voeding', ['muesli', 'muesli', 'Müsli', 'muesli', 'muesli', 'muesli']],
  havermout: ['droge-voeding', ['havermout', 'flocons d’avoine', 'Haferflocken', 'oats', 'avena', 'aveia']],
  fruit: ['groenten-fruit', ['fruit', 'fruits', 'Obst', 'fruit', 'fruta', 'fruta']],
  komkommer: ['groenten-fruit', ['komkommer', 'concombre', 'Gurke', 'cucumber', 'pepino', 'pepino']],
  avocado: ['groenten-fruit', ['avocado', 'avocat', 'Avocado', 'avocado', 'aguacate', 'abacate']],
  honing: ['conserven-sauzen', ['honing', 'miel', 'Honig', 'honey', 'miel', 'mel']],
} as const satisfies Record<string, readonly [Afdeling, Namen]>;

export type IngredientCode = keyof typeof TABEL;

const VOLGORDE: Taal[] = ['nl', 'fr', 'de', 'en', 'es', 'pt'];

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
