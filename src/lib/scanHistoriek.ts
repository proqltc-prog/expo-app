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
