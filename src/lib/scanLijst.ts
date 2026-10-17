// Scannen vanaf de boodschappenlijst (WEEK-46, WEEK-48): welke items horen bij het gescande product?
// Pure logica. Vergelijkt op hele woorden, zodat "ui" niet in "quinoa" gevonden wordt.
import { zoeksleutel } from '@/lib/planner/kies';
import type { LijstItem } from '@/lib/lijst';

const woorden = (t: string): string[] => zoeksleutel(t).split(/[^a-z0-9]+/).filter((w) => w.length > 0);

/** Items waarvan alle woorden in de productnaam voorkomen; geldt voor de lijst en voor de frigo. */
export function passendeNamen<T extends { naam: string }>(items: readonly T[], productNaam: string): T[] {
  const productWoorden = new Set(woorden(productNaam));
  if (!productWoorden.size) return [];
  return items.filter((i) => {
    const itemWoorden = woorden(i.naam);
    return itemWoorden.length > 0 && itemWoorden.every((w) => productWoorden.has(w));
  });
}

/** Openstaande items van de lijst die bij het product horen. */
export function zoekOpLijst(items: readonly LijstItem[], productNaam: string): LijstItem[] {
  return passendeNamen(
    items.filter((i) => !i.afgevinkt),
    productNaam
  );
}
