import AsyncStorage from '@react-native-async-storage/async-storage';
import { VASTE_ITEMS, WeekmenuItem } from '@/data/recepten';

export type LijstItem = {
  id: string;
  naam: string;
  categorie: string;
  afgevinkt: boolean;
};

const SLEUTEL = 'boodschappenlijst:v1';

export async function laadLijst(): Promise<LijstItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL);
    return ruw ? (JSON.parse(ruw) as LijstItem[]) : [];
  } catch {
    return [];
  }
}

export async function bewaarLijst(items: LijstItem[]): Promise<void> {
  await AsyncStorage.setItem(SLEUTEL, JSON.stringify(items));
}

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
