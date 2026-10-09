import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LijstItem } from '@/lib/lijst';

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
