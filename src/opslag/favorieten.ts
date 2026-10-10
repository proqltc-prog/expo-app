import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favoriet, normaliseerFavorieten } from '@/lib/favorieten';
import { SLEUTEL } from './sleutels';
import { registreerItems } from './sync';
import { naElkaar } from './wachtrij';

export async function laadFavorieten(): Promise<Favoriet[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.favorieten);
    return normaliseerFavorieten(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/** Past het kookboek aan en deelt het met het gezin (WEEK-21). */
export function wijzigFavorieten(wijziging: (favorieten: Favoriet[]) => Favoriet[]): Promise<Favoriet[]> {
  return naElkaar(async () => {
    const nieuw = wijziging(await laadFavorieten());
    await AsyncStorage.setItem(SLEUTEL.favorieten, JSON.stringify(nieuw));
    await registreerItems('favoriet', nieuw);
    return nieuw;
  });
}
