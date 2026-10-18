import AsyncStorage from '@react-native-async-storage/async-storage';
import { FrigoItem, normaliseerFrigo } from '@/lib/frigo';
import { SLEUTEL } from './sleutels';
import { registreerItems } from './sync';
import { naElkaar } from './wachtrij';

export async function laadFrigo(): Promise<FrigoItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.frigo);
    return normaliseerFrigo(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/**
 * Laadt de frigo, past `wijziging` toe, bewaart het resultaat en deelt het met het gezin.
 * Alle wijzigingen aan de opslag lopen na elkaar, zodat snel na elkaar afvinken niets verliest.
 */
export function wijzigFrigo(wijziging: (frigo: FrigoItem[]) => FrigoItem[]): Promise<FrigoItem[]> {
  return naElkaar(async () => {
    const nieuw = wijziging(await laadFrigo());
    await AsyncStorage.setItem(SLEUTEL.frigo, JSON.stringify(nieuw));
    await registreerItems('frigo', nieuw);
    return nieuw;
  });
}

const SLEUTEL_KOPPELING = 'famenu.frigoBronKoppeling';

/** Is de eenmalige koppeling van de bestaande frigo al gedaan (WEEK-71 deel 2)? */
export async function koppelingGedaan(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SLEUTEL_KOPPELING)) === '1';
  } catch {
    return false;
  }
}

export async function zetKoppelingGedaan(): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL_KOPPELING, '1');
  } catch {
    // Zonder opslag komt de koppeling bij het volgende bezoek opnieuw; dat is onschadelijk.
  }
}
