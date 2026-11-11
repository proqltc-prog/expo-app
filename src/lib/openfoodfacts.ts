import type { Afdeling } from '@/data/ingredienten';
import { berekenScore, type Oordeel } from '@/lib/score';

export type { Oordeel, OordeelLabel, Reden, RedenCode } from '@/lib/score';

export type Product = {
  barcode: string;
  naam: string;
  merk?: string;
  nutriscore?: string; // a–e
  nova?: number; // 1–4 (4 = ultrabewerkt)
  additieven: string[];
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
  'nutriments',
  'categories_tags',
].join(',');

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
    kcal: getal(n['energy-kcal_100g']),
    suikers: getal(n.sugars_100g),
    eiwitten: getal(n.proteins_100g),
    vet: getal(n.fat_100g),
    verzadigd: getal(n['saturated-fat_100g']),
    koolhydraten: getal(n.carbohydrates_100g),
    vezels: getal(n.fiber_100g),
    zout: getal(n.salt_100g),
    categorieen: Array.isArray(p.categories_tags) ? p.categories_tags.filter((c: unknown) => typeof c === 'string') : [],
  };
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
