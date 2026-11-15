// WEEK-307: waarom een product zijn NOVA-groep krijgt (nova_groups_markers van Open Food Facts).
// WEEK-308: de ingrediëntenlijst met per ingrediënt een eigen inschatting: positief, negatief of neutraal.
// Pure logica. Eigen inschatting op basis van de ingrediëntcodes van Open Food Facts; geen medisch advies.

/** Eén ingrediënt zoals Open Food Facts het uit de lijst haalt (enkel het bovenste niveau). */
export type Ingredient = {
  /** Code in de taxonomie van Open Food Facts, bv. "en:sugar". */
  id: string;
  /** De tekst zoals op het etiket. */
  tekst: string;
  /** Percentage zoals vermeld op het etiket (niet de schatting). */
  procent?: number;
};

export type NovaReden = { soort: 'additief' | 'ingredient' | 'categorie'; id: string };

/** Leest de ingrediënten; kapotte of lege regels vallen weg. */
export function leesIngredienten(ruw: unknown): Ingredient[] {
  if (!Array.isArray(ruw)) return [];
  const uit: Ingredient[] = [];
  for (const i of ruw as Record<string, unknown>[]) {
    if (!i || typeof i !== 'object') continue;
    const id = typeof i.id === 'string' ? i.id : '';
    const tekst = typeof i.text === 'string' ? i.text.trim() : '';
    if (!id && !tekst) continue;
    const procent = typeof i.percent === 'number' ? i.percent : undefined;
    uit.push({ id, tekst: tekst || leesbaar(id), ...(procent !== undefined ? { procent } : {}) });
  }
  return uit;
}

const SOORT: Record<string, NovaReden['soort']> = { additives: 'additief', ingredients: 'ingredient', categories: 'categorie' };

/** De redenen voor de NOVA-groep van het product (enkel die van de eigen groep), zonder dubbels. */
export function leesNovaRedenen(markers: unknown, groep: number | undefined): NovaReden[] {
  if (!groep || !markers || typeof markers !== 'object') return [];
  const lijst = (markers as Record<string, unknown>)[String(groep)];
  if (!Array.isArray(lijst)) return [];
  const uit: NovaReden[] = [];
  for (const m of lijst) {
    if (!Array.isArray(m) || typeof m[0] !== 'string' || typeof m[1] !== 'string') continue;
    const soort = SOORT[m[0]];
    if (!soort || uit.some((r) => r.id === m[1])) continue;
    uit.push({ soort, id: m[1] });
  }
  return uit;
}

/** "en:milk-powder" → "milk powder": als er geen tekst van het etiket is. */
export function leesbaar(id: string): string {
  return id.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
}

/** De tekst van een NOVA-reden: bij een ingrediënt de tekst van het etiket als we die kennen. */
export function novaRedenTekst(r: NovaReden, ingredienten: readonly Ingredient[] = []): string {
  if (r.soort === 'ingredient') return ingredienten.find((i) => i.id === r.id)?.tekst || leesbaar(r.id);
  return leesbaar(r.id);
}

export type IngredientReden =
  | 'ultrabewerkt' | 'additief' | 'suiker' | 'zout' | 'palmolie' | 'gehard'
  | 'groenteFruit' | 'peulvrucht' | 'noot' | 'volkoren' | 'olie';

export type IngredientOordeel = { soort: 'positief' | 'negatief' | 'neutraal'; reden?: IngredientReden };

// Volgorde telt: negatief gaat voor positief (bv. "palm" in een notenpasta, "concentraat" van fruit).
const NEGATIEF: [RegExp, IngredientReden][] = [
  [/^en:e\d{3}/, 'additief'],
  [/hydrogenated/, 'gehard'],
  [/palm/, 'palmolie'],
  [/sugar|syrup|dextrose|^en:glucose|^en:fructose|^en:sucrose|honey|maltodextrin|juice-concentrate|molasses|caramel/, 'suiker'],
  [/^en:(salt|sea-salt|iodised-salt|sodium-chloride)$/, 'zout'],
];
const POSITIEF: [RegExp, IngredientReden][] = [
  [/whole-?(wheat|grain|meal)|wholemeal|wholegrain|^en:oat|rolled-oats|^en:spelt|brown-rice|^en:quinoa|^en:buckwheat/, 'volkoren'],
  [/lentil|chickpea|^en:beans?$|kidney-bean|white-bean|black-bean|^en:peas?$|split-pea|^en:soya-bean|^en:broad-bean/, 'peulvrucht'],
  [/(^en:|-)nuts?$|hazelnut|almond|walnut|cashew|pistachio|pecan|peanut|macadamia|seeds?$|^en:linseed|^en:chia|^en:sesame$|^en:sunflower-seed|^en:pumpkin-seed/, 'noot'],
  [/^en:(extra-virgin-)?olive-oil$|^en:rapeseed-oil$|^en:colza-oil$|^en:linseed-oil$|^en:walnut-oil$/, 'olie'],
  [/vegetable|tomato|carrot|onion|spinach|courgette|zucchini|pepper$|bell-pepper|broccoli|cauliflower|cabbage|leek|celery$|pumpkin$|squash|mushroom|garlic$|lettuce|cucumber|beetroot|aubergine|eggplant|fruit$|^en:fruits?|apple$|pear$|banana|orange$|lemon$|berry|berries|cherry|cherries|apricot|peach|plum|grape$|mango|pineapple|kiwi|raisin|date$|fig$/, 'groenteFruit'],
];

/**
 * Eigen inschatting van één ingrediënt (WEEK-308).
 * Negatief: additief, geharde vetten, palmolie, toegevoegde suiker, zout, of ultrabewerkt volgens NOVA 4 van Open Food Facts.
 * Positief: groente of fruit, peulvruchten, noten of zaden, volkoren, olijf- of koolzaadolie. De rest is neutraal.
 */
export function beoordeelIngredient(id: string, ultrabewerkt: ReadonlySet<string> = new Set()): IngredientOordeel {
  if (ultrabewerkt.has(id)) return { soort: 'negatief', reden: 'ultrabewerkt' };
  for (const [regel, reden] of NEGATIEF) if (regel.test(id)) return { soort: 'negatief', reden };
  for (const [regel, reden] of POSITIEF) if (regel.test(id)) return { soort: 'positief', reden };
  return { soort: 'neutraal' };
}

export type BeoordeeldIngredient = Ingredient & { oordeel: IngredientOordeel };

/** Alle ingrediënten met hun oordeel, plus de teller. NOVA 4-ingrediënten tellen als ultrabewerkt. */
export function beoordeelIngredienten(
  ingredienten: readonly Ingredient[],
  novaGroep: number | undefined,
  novaRedenen: readonly NovaReden[] = []
): { lijst: BeoordeeldIngredient[]; positief: number; negatief: number } {
  const ultra = new Set(novaGroep === 4 ? novaRedenen.filter((r) => r.soort === 'ingredient').map((r) => r.id) : []);
  const lijst = ingredienten.map((i) => ({ ...i, oordeel: beoordeelIngredient(i.id, ultra) }));
  return {
    lijst,
    positief: lijst.filter((i) => i.oordeel.soort === 'positief').length,
    negatief: lijst.filter((i) => i.oordeel.soort === 'negatief').length,
  };
}
