import AsyncStorage from '@react-native-async-storage/async-storage';
import { Taal } from '@/i18n';
import { normaliseerProfiel, Profiel } from '@/lib/profiel';
import { SLEUTEL as SLEUTELS } from './sleutels';
import { registreerDocument } from './sync';
import { naElkaar } from './wachtrij';

const SLEUTEL = SLEUTELS.profiel;

export async function laadProfiel(): Promise<Profiel> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL);
    return normaliseerProfiel(ruw ? JSON.parse(ruw) : null);
  } catch {
    return normaliseerProfiel(null);
  }
}

/** Bewaart het profiel en deelt het met het gezin (zonder de taal, die per toestel is). */
export function bewaarProfiel(p: Profiel): Promise<void> {
  return naElkaar(async () => {
    await AsyncStorage.setItem(SLEUTEL, JSON.stringify(p));
    await registreerDocument('profiel', p);
  });
}

/** Bewaart enkel de taal op dit toestel, zonder het gezin te synchroniseren (WEEK-79). */
export async function bewaarTaalOpToestel(taal: Taal): Promise<void> {
  const profiel = await laadProfiel();
  await AsyncStorage.setItem(SLEUTEL, JSON.stringify({ ...profiel, taal }));
}
