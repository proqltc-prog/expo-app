import type { Afdeling } from '@/data/ingredienten';
import { berekenScore, type Oordeel } from '@/lib/score';
import { allergeenCodes } from '@/lib/allergenen';
import { leesIngredienten, leesNovaRedenen, type Ingredient, type NovaReden } from '@/lib/ingredienten';

export type { Oordeel, OordeelLabel, Reden, RedenCode } from '@/lib/score';

export type Product = {
  barcode: string;
  naam: string;
  merk?: string;
  nutriscore?: string; // a–e
  nova?: number; // 1–4 (4 = ultrabewerkt)
  additieven: string[];
  /** WEEK-295: heeft Open Food Facts een ingrediëntenlijst? Zonder lijst zijn de additieven niet gekend. Ontbreekt bij oude bewaarde producten. */
  ingredientenBekend?: boolean;
  kcal?: number; // per 100 g
  suikers?: number; // g per 100 g
  eiwitten?: number; // g per 100 g
  vet?: number;
  verzadigd?: number; // g verzadigd vet per 100 g
  koolhydraten?: number; // g per 100 g
  vezels?: number; // g per 100 g
  zout?: number;
  /** Categorieën van Open Food Facts (bv. "en:dairies"), om de winkelafdeling te bepalen (WEEK-35). */
  categorieen?: string[];
  /** WEEK-305: EU-allergenen die het product bevat (bv. "milk"). Ontbreekt bij oude bewaarde producten. */
  allergenen?: string[];
  /** WEEK-305: "kan sporen bevatten van". */
  sporen?: string[];
  /** WEEK-307: waarom het product zijn NOVA-groep krijgt. Ontbreekt bij oude bewaarde producten. */
  novaRedenen?: NovaReden[];
  /** WEEK-308: de ingrediënten (bovenste niveau). Ontbreekt bij oude bewaarde producten. */
  ingredienten?: Ingredient[];
};

const BASIS = 'https://world.openfoodfacts.org/api/v2/product';
const TALEN_OFF = ['nl', 'fr', 'de', 'en'];
const VELDEN = [
  'product_name',
  ...TALEN_OFF.map((t) => `product_name_${t}`),
  'brands',
  'nutriscore_grade',
  'nova_group',
  'additives_tags',
  'ingredients_text',
  'ingredients_n',
  'nutriments',
  'categories_tags',
  'allergens_tags',
  'traces_tags',
  'nova_groups_markers',
  'ingredients',
].join(',');

/** WEEK-295: een ingrediëntenlijst als tekst of als ontlede lijst. */
export function ingredientenGekend(p: Record<string, unknown>): boolean {
  const tekst = p.ingredients_text;
  const aantal = p.ingredients_n;
  return (typeof tekst === 'string' && tekst.trim().length > 0) || (typeof aantal === 'number' && aantal > 0);
}

/** Productnaam in de gevraagde taal, anders de algemene naam; leeg als er geen naam is. */
export function productNaam(p: Record<string, unknown>, taal: string): string {
  const inTaal = p[`product_name_${taal}`];
  if (typeof inTaal === 'string' && inTaal.trim()) return inTaal.trim();
  const algemeen = p.product_name;
  return typeof algemeen === 'string' ? algemeen.trim() : '';
}

/** Zoekt een product op. `naam` is leeg als Open Food Facts geen naam kent (scherm toont dan "onbekend product"). */
export async function zoekProduct(barcode: string, taal = 'nl'): Promise<Product | null> {
  const res = await fetch(`${BASIS}/${encodeURIComponent(barcode)}.json?fields=${VELDEN}`, {
    headers: { 'User-Agent': 'GezondBoodschappen/0.1 (github.com/Proqltc-prog/expo-app)' },
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const getal = (v: unknown) => (typeof v === 'number' ? v : undefined);
  return {
    barcode,
    naam: productNaam(p, taal),
    merk: p.brands,
    nutriscore: typeof p.nutriscore_grade === 'string' && /^[a-e]$/.test(p.nutriscore_grade) ? p.nutriscore_grade : undefined,
    nova: getal(p.nova_group),
    additieven: (p.additives_tags ?? []).map((t: string) => t.replace(/^en:/, '').toUpperCase()),
    ingredientenBekend: ingredientenGekend(p),
    kcal: getal(n['energy-kcal_100g']),
    suikers: getal(n.sugars_100g),
    eiwitten: getal(n.proteins_100g),
    vet: getal(n.fat_100g),
    verzadigd: getal(n['saturated-fat_100g']),
    koolhydraten: getal(n.carbohydrates_100g),
    vezels: getal(n.fiber_100g),
    zout: getal(n.salt_100g),
    categorieen: Array.isArray(p.categories_tags) ? p.categories_tags.filter((c: unknown) => typeof c === 'string') : [],
    allergenen: allergeenCodes(p.allergens_tags),
    sporen: allergeenCodes(p.traces_tags),
    novaRedenen: leesNovaRedenen(p.nova_groups_markers, getal(p.nova_group)),
    ingredienten: leesIngredienten(p.ingredients),
  };
}

/** WEEK-306: een mogelijk gezonder product uit dezelfde categorie. */
export type Alternatief = { barcode: string; naam: string; merk?: string; nutriscore: string };

const NUTRI_LETTERS = ['a', 'b', 'c', 'd', 'e'];

/** WEEK-306: enkel bij een gekende Nutri-Score C, D of E en een gekende categorie zoeken we een alternatief. */
export function zoektAlternatief(p: Pick<Product, 'nutriscore' | 'categorieen'>): boolean {
  return !!p.nutriscore && ['c', 'd', 'e'].includes(p.nutriscore) && !!specifiekeCategorie(p.categorieen);
}

/** De meest specifieke Engelse categorie (Open Food Facts zet de algemene eerst). */
export function specifiekeCategorie(categorieen: readonly string[] = []): string | undefined {
  return [...categorieen].reverse().find((c) => c.startsWith('en:'));
}

/** WEEK-306: de zoekvraag aan de zoekdienst van Open Food Facts: zelfde categorie, in België, betere Nutri-Score. */
export function alternatiefUrl(p: Pick<Product, 'nutriscore' | 'categorieen'>, aantal = 6): string | undefined {
  const categorie = specifiekeCategorie(p.categorieen);
  const index = p.nutriscore ? NUTRI_LETTERS.indexOf(p.nutriscore) : -1;
  if (!categorie || index <= 0) return undefined;
  const beter = NUTRI_LETTERS.slice(0, index);
  const q = `categories_tags:"${categorie}" AND nutrition_grades:(${beter.join(' OR ')}) AND countries_tags:"en:belgium"`;
  const velden = ['code', 'product_name', 'brands', 'nutrition_grades'].join(',');
  return `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${aantal}&fields=${velden}&sort_by=-unique_scans_n`;
}

/** WEEK-306: zet het antwoord van de zoekdienst om; zonder naam, zonder betere score of hetzelfde product valt weg. */
export function leesAlternatieven(data: unknown, p: Pick<Product, 'barcode' | 'nutriscore'>, max = 3): Alternatief[] {
  const hits = (data as { hits?: unknown })?.hits;
  if (!Array.isArray(hits)) return [];
  const grens = p.nutriscore ? NUTRI_LETTERS.indexOf(p.nutriscore) : -1;
  const uit: Alternatief[] = [];
  for (const h of hits as Record<string, unknown>[]) {
    const barcode = typeof h.code === 'string' ? h.code : '';
    const naam = typeof h.product_name === 'string' ? h.product_name.trim() : '';
    const score = typeof h.nutrition_grades === 'string' ? h.nutrition_grades : '';
    const index = NUTRI_LETTERS.indexOf(score);
    if (!barcode || !naam || barcode === p.barcode || index < 0 || index >= grens) continue;
    if (uit.some((a) => a.barcode === barcode)) continue;
    const merken = Array.isArray(h.brands) ? h.brands.filter((m): m is string => typeof m === 'string') : typeof h.brands === 'string' ? [h.brands] : [];
    uit.push({ barcode, naam, ...(merken[0] ? { merk: merken[0].trim() } : {}), nutriscore: score });
    if (uit.length >= max) break;
  }
  return uit;
}

/** WEEK-306: zoekt gezondere alternatieven. Enkel na een tik van de gebruiker (spaart de dienst van Open Food Facts). */
export async function zoekAlternatieven(p: Product): Promise<Alternatief[]> {
  const url = alternatiefUrl(p);
  if (!url) return [];
  const res = await fetch(url, { headers: { 'User-Agent': 'GezondBoodschappen/0.1 (github.com/Proqltc-prog/expo-app)' } });
  if (!res.ok) throw new Error(`zoekdienst ${res.status}`);
  return leesAlternatieven(await res.json(), p);
}

/** WEEK-304: de pagina van het product op Open Food Facts. */
export function productLink(barcode: string): string {
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`;
}

/** Of het product een drank is (dan gelden de drempels per 100 ml). */
export function isDrank(p: Pick<Product, 'categorieen'>): boolean {
  return afdelingUitCategorieen(p.categorieen) === 'dranken';
}

/** Onze eigen score (WEEK-220), los van het Nutri-Score; zie src/lib/score.ts. Geen medisch advies. */
export function beoordeel(p: Product): Oordeel {
  return berekenScore(p, isDrank(p));
}

/**
 * Winkelafdeling van een gescand product op basis van de categorieën van Open Food Facts (WEEK-35).
 * De meest specifieke regels eerst (diepvries en dranken gaan voor groenten of vlees).
 */
const AFDELING_REGELS: [RegExp, Afdeling][] = [
  [/^en:frozen/, 'diepvries'],
  [/^en:(beverages|waters|juices|sodas|coffees|teas|plant-based-milks|alcoholic-beverages)/, 'dranken'],
  [/^en:(canned|sauces|condiments|preserves|jams|spreads|pickles)/, 'conserven-sauzen'],
  [/^en:(dairies|milks|cheeses|yogurts|eggs|butters|creams|desserts-dairy)/, 'zuivel-eieren'],
  [/^en:(meats|poultries|fishes|seafood|hams|sausages|prepared-meats)/, 'vlees-vis'],
  [/^en:(breads|viennoiseries|sandwich-breads)/, 'brood'],
  [/^en:(fruits|vegetables|fresh-|salads|potatoes)/, 'groenten-fruit'],
  [/^en:(cereals|pastas|rices|legumes|flours|biscuits|snacks|chocolates|breakfast|nuts|dried|sugars|noodles)/, 'droge-voeding'],
];

export function afdelingUitCategorieen(categorieen: readonly string[] = []): Afdeling | 'overig' {
  for (const [regel, afdeling] of AFDELING_REGELS) {
    if (categorieen.some((c) => regel.test(c))) return afdeling;
  }
  return 'overig';
}

/** Naam van een gescand product voor de lijst of de frigo: "Merk – naam". */
export function scanNaam(p: Pick<Product, 'merk' | 'naam'>, onbekend: string): string {
  return [p.merk?.split(',')[0]?.trim(), p.naam || onbekend].filter(Boolean).join(' – ');
}
