import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeergave, LijstItem, normaliseerLijst, Weergave } from '@/lib/lijst';
import { SLEUTEL } from './sleutels';
import { registreerItems } from './sync';
import { naElkaar } from './wachtrij';

export async function laadLijst(): Promise<LijstItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.lijst);
    return normaliseerLijst(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/**
 * Past de lijst aan op basis van de nieuwste versie op het toestel (ook als een ander gezinslid
 * net iets wijzigde) en deelt de wijziging met het gezin. Geeft de nieuwe lijst terug.
 */
export function wijzigLijst(wijziging: (items: LijstItem[]) => LijstItem[]): Promise<LijstItem[]> {
  return naElkaar(async () => {
    const huidig = await laadLijst();
    const nieuw = wijziging(huidig);
    // Ongewijzigd: niets opslaan of delen (WEEK-154, bv. een taalwissel die geen namen verandert).
    if (nieuw === huidig) return nieuw;
    await AsyncStorage.setItem(SLEUTEL.lijst, JSON.stringify(nieuw));
    await registreerItems('lijst', nieuw);
    return nieuw;
  });
}

export function bewaarLijst(items: LijstItem[]): Promise<LijstItem[]> {
  return wijzigLijst(() => items);
}

export async function laadWeergave(): Promise<Weergave> {
  try {
    const w = await AsyncStorage.getItem(SLEUTEL.lijstWeergave);
    return isWeergave(w) ? w : 'recept';
  } catch {
    return 'recept';
  }
}

export async function bewaarWeergave(w: Weergave): Promise<void> {
  await AsyncStorage.setItem(SLEUTEL.lijstWeergave, w);
}
