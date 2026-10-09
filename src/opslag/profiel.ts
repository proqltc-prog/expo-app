import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseerProfiel, Profiel } from '@/lib/profiel';

const SLEUTEL = 'gezinsprofiel:v1';

export async function laadProfiel(): Promise<Profiel> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL);
    return normaliseerProfiel(ruw ? JSON.parse(ruw) : null);
  } catch {
    return normaliseerProfiel(null);
  }
}

export async function bewaarProfiel(p: Profiel): Promise<void> {
  await AsyncStorage.setItem(SLEUTEL, JSON.stringify(p));
}
