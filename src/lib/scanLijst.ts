// Scannen vanaf de boodschappenlijst (WEEK-46): welke openstaande items horen bij het gescande product?
// Pure logica. Vergelijkt op hele woorden, zodat "ui" niet in "quinoa" gevonden wordt.
import { zoeksleutel } from '@/lib/planner/kies';
import type { LijstItem } from '@/lib/lijst';

const woorden = (t: string): string[] => zoeksleutel(t).split(/[^a-z0-9]+/).filter((w) => w.length > 0);

/**
 * Openstaande items waarvan alle woorden in de productnaam voorkomen.
 * "melk" past bij "Halfvolle melk 1 l"; "ui" past niet bij "Quinoa".
 */
export function zoekOpLijst(items: readonly LijstItem[], productNaam: string): LijstItem[] {
  const productWoorden = new Set(woorden(productNaam));
  if (!productWoorden.size) return [];
  return items.filter((i) => {
    if (i.afgevinkt) return false;
    const itemWoorden = woorden(i.naam);
    return itemWoorden.length > 0 && itemWoorden.every((w) => productWoorden.has(w));
  });
}
