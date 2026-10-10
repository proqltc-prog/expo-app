import AsyncStorage from '@react-native-async-storage/async-storage';
import { FrigoItem, normaliseerFrigo } from '@/lib/frigo';

const SLEUTEL = 'frigo:v1';

export async function laadFrigo(): Promise<FrigoItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL);
    return normaliseerFrigo(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

export async function bewaarFrigo(frigo: FrigoItem[]): Promise<void> {
  await AsyncStorage.setItem(SLEUTEL, JSON.stringify(frigo));
}

// Wijzigingen na elkaar uitvoeren, zodat snel na elkaar afvinken geen wijziging verliest.
let wachtrij: Promise<unknown> = Promise.resolve();

/** Laadt de frigo, past `wijziging` toe en bewaart het resultaat. Wijzigingen lopen strikt na elkaar. */
export function wijzigFrigo(wijziging: (frigo: FrigoItem[]) => FrigoItem[]): Promise<FrigoItem[]> {
  const stap = wachtrij.then(async () => {
    const nieuw = wijziging(await laadFrigo());
    await bewaarFrigo(nieuw);
    return nieuw;
  });
  wachtrij = stap.catch(() => undefined);
  return stap;
}
