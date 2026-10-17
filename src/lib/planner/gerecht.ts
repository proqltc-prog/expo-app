// Gerechtdetails (WEEK-50): als alle producten van een recept gescand en afgevinkt zijn,
// het totaal aan voeding en de additieven van het hele gerecht. Pure logica.
import type { DagCode } from '@/lib/planner/types';
import type { FrigoItem } from '@/lib/frigo';
import type { LijstItem } from '@/lib/lijst';
import type { Product } from '@/lib/openfoodfacts';

export type Voedingsstof = 'kcal' | 'suikers' | 'eiwitten' | 'vet' | 'zout';
export const VOEDINGSSTOFFEN: readonly Voedingsstof[] = ['kcal', 'suikers', 'eiwitten', 'vet', 'zout'];

export type GerechtDetails = {
  /** Totaal voor het hele gezin; undefined als een ingrediënt de waarde niet heeft. */
  totaal: Partial<Record<Voedingsstof, number>>;
  /** Alle additieven van de producten, zonder dubbels. */
  additieven: string[];
  /** Ingrediënten die niet in gram of ml uitgedrukt zijn; die tellen niet mee in het totaal. */
  nietBerekend: string[];
};

const GEWICHT_EENHEDEN = ['g', 'ml'];
const rond = (n: number) => Math.round(n * 10) / 10;

/**
 * Details van één gerecht op de lijst. Geeft niets terug zolang niet alle ingrediënten
 * van dit recept afgevinkt zijn én gescand (de gescande productdetails staan dan in de frigo
 * bij het lijstitem, id `lijst:<id>`). Handmatig afgevinkte ingrediënten tellen dus niet mee.
 */
export function gerechtDetails(
  lijst: readonly LijstItem[],
  frigo: readonly FrigoItem[],
  dag: DagCode,
  recept: string
): GerechtDetails | undefined {
  const ingredienten = lijst.filter((i) => i.recept?.dag === dag && i.recept?.naam === recept);
  if (!ingredienten.length) return undefined;

  const gescand: { naam: string; hoeveelheid?: number; eenheid?: string; product: Product }[] = [];
  for (const i of ingredienten) {
    const product = frigo.find((f) => f.id === `lijst:${i.id}`)?.product;
    if (!i.afgevinkt || !product) return undefined;
    gescand.push({ naam: i.naam, hoeveelheid: i.hoeveelheid, eenheid: i.eenheid, product });
  }

  const meerekenen = gescand.filter((g) => g.hoeveelheid !== undefined && g.eenheid !== undefined && GEWICHT_EENHEDEN.includes(g.eenheid));
  const nietBerekend = gescand.filter((g) => !meerekenen.includes(g)).map((g) => g.naam);

  const totaal: GerechtDetails['totaal'] = {};
  for (const n of VOEDINGSSTOFFEN) {
    // Per 100 g (of ml, bij benadering even zwaar) × hoeveelheid; ontbreekt de waarde bij één ingrediënt, dan is het totaal onbekend.
    const waarden = meerekenen.map((g) => g.product[n]);
    if (!meerekenen.length || waarden.some((w) => w === undefined)) continue;
    totaal[n] = rond(meerekenen.reduce((som, g, k) => som + (waarden[k] as number) * ((g.hoeveelheid as number) / 100), 0));
  }

  const additieven = [...new Set(gescand.flatMap((g) => g.product.additieven))];
  return { totaal, additieven, nietBerekend };
}
