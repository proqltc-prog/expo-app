// Favoriete recepten (WEEK-315): op het toestel bewaard en via de gezinsruimte met alle leden gedeeld.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favoriet, normaliseerFavorieten, wisselFavoriet } from '@/lib/favorieten';
import { registreerItems } from './sync';
import { SLEUTEL } from './sleutels';
import { naElkaar } from './wachtrij';

export async function laadFavorieten(): Promise<Favoriet[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.favorieten);
    return normaliseerFavorieten(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/** Zet een recept aan of uit als favoriet; de wijziging gaat naar de gezinsruimte. */
export function wisselFavorietOpslag(id: string): Promise<Favoriet[]> {
  return naElkaar(async () => {
    const nieuw = wisselFavoriet(await laadFavorieten(), id, new Date().toISOString());
    await AsyncStorage.setItem(SLEUTEL.favorieten, JSON.stringify(nieuw));
    await registreerItems('favoriet', nieuw);
    return nieuw;
  });
}
