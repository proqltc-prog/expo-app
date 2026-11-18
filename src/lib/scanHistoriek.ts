// WEEK-302: historiek van gescande producten op dit toestel. Pure logica; opslag in src/opslag/scanHistoriek.ts.
import type { Product } from '@/lib/openfoodfacts';

export type HistoriekItem = { product: Product; gescandOp: string };

export const MAX_HISTORIEK = 50;

/** Zet een product bovenaan; hetzelfde product (barcode) staat er maar één keer in; hoogstens MAX_HISTORIEK items. */
export function voegToeAanHistoriek(lijst: readonly HistoriekItem[], product: Product, nu: Date): HistoriekItem[] {
  const rest = lijst.filter((h) => h.product.barcode !== product.barcode);
  return [{ product, gescandOp: nu.toISOString() }, ...rest].slice(0, MAX_HISTORIEK);
}

/** Leest bewaarde gegevens; kapotte items vallen weg (een fout mag de scanner nooit blokkeren). */
export function leesHistoriek(ruw: unknown): HistoriekItem[] {
  if (!Array.isArray(ruw)) return [];
  return ruw
    .filter(
      (h): h is HistoriekItem =>
        !!h &&
        typeof h === 'object' &&
        typeof (h as HistoriekItem).gescandOp === 'string' &&
        !!(h as HistoriekItem).product &&
        typeof (h as HistoriekItem).product.barcode === 'string' &&
        Array.isArray((h as HistoriekItem).product.additieven)
    )
    .slice(0, MAX_HISTORIEK);
}

/** WEEK-303: kiezen voor de vergelijking: aan/uit, hoogstens twee; een derde keuze vervangt de oudste. */
export function wisselKeuze(gekozen: readonly string[], barcode: string): string[] {
  if (gekozen.includes(barcode)) return gekozen.filter((b) => b !== barcode);
  return [...gekozen, barcode].slice(-2);
}

/**
 * WEEK-313: twee producten van dezelfde soort (bv. yoghurt en yoghurt). Ze delen een categorie van Open Food Facts
 * die niet bij de 2 algemeenste van het eerste product hoort, zodat enkel "dranken" of "zuivel" niet volstaat.
 */
export function zelfdeSoort(a: Pick<Product, 'categorieen'>, b: Pick<Product, 'categorieen'>): boolean {
  const vanA = (a.categorieen ?? []).filter((c) => c.startsWith('en:')).slice(2);
  const vanB = new Set(b.categorieen ?? []);
  return vanA.some((c) => vanB.has(c));
}

/** WEEK-313: het meest recent gescande andere product van dezelfde soort (uit de laatste 5), om mee te vergelijken. */
export function vorigeVanZelfdeSoort(lijst: readonly HistoriekItem[], product: Product): Product | undefined {
  return lijst
    .filter((h) => h.product.barcode !== product.barcode)
    .slice(0, 5)
    .find((h) => zelfdeSoort(product, h.product))?.product;
}
