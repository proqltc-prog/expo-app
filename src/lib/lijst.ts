import { VASTE_ITEMS, WeekmenuItem } from '@/data/recepten';

// Pure logica voor de boodschappenlijst (zonder opslag), zodat ze los testbaar is.
// Opslag op het toestel staat in src/opslag/lijst.ts.

export type LijstItem = {
  id: string;
  naam: string;
  categorie: string;
  afgevinkt: boolean;
};

/** Bouwt een lijst uit het weekmenu + vaste items, zonder dubbels. */
export function lijstUitMenu(menu: WeekmenuItem[]): LijstItem[] {
  const gezien = new Set<string>();
  const items: LijstItem[] = [];
  const voegToe = (naam: string, categorie: string) => {
    const sleutel = naam.toLowerCase();
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    items.push({ id: `${categorie}-${sleutel}`, naam, categorie, afgevinkt: false });
  };
  menu.forEach(({ recept }) => recept.ingredienten.forEach((i) => voegToe(i, 'Avondeten')));
  VASTE_ITEMS.forEach(({ categorie, items: namen }) => namen.forEach((n) => voegToe(n, categorie)));
  return items;
}
