import { VASTE_ITEMS, WeekmenuItem } from '@/data/recepten';
import { Sleutel, Taal, vertaal } from '@/i18n';

// Pure logica voor de boodschappenlijst (zonder opslag), zodat ze los testbaar is.
// Opslag op het toestel staat in src/opslag/lijst.ts.

export type LijstItem = {
  id: string;
  naam: string;
  /** Categoriecode (bv. "fruit"); het scherm toont de vertaalde naam via categorieNaam(). */
  categorie: string;
  afgevinkt: boolean;
};

/** Bouwt een lijst uit het weekmenu + vaste items (in de taal van de gebruiker), zonder dubbels. */
export function lijstUitMenu(menu: WeekmenuItem[], taal: Taal = 'nl'): LijstItem[] {
  const gezien = new Set<string>();
  const items: LijstItem[] = [];
  const voegToe = (naam: string, categorie: string) => {
    const sleutel = naam.toLowerCase();
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    items.push({ id: `${categorie}-${sleutel}`, naam, categorie, afgevinkt: false });
  };
  menu.forEach(({ recept }) => recept.ingredienten.forEach((i) => voegToe(i, 'avondeten')));
  VASTE_ITEMS.forEach(({ categorie, items: codes }) =>
    codes.forEach((code) => voegToe(vertaal(taal, `item.${code}` as Sleutel), categorie))
  );
  return items;
}
