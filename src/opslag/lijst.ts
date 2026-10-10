import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeergave, LijstItem, Weergave } from '@/lib/lijst';

const SLEUTEL = 'boodschappenlijst:v1';
const WEERGAVE = 'lijstweergave:v1';

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

export async function laadWeergave(): Promise<Weergave> {
  try {
    const w = await AsyncStorage.getItem(WEERGAVE);
    return isWeergave(w) ? w : 'recept';
  } catch {
    return 'recept';
  }
}

export async function bewaarWeergave(w: Weergave): Promise<void> {
  await AsyncStorage.setItem(WEERGAVE, w);
}
