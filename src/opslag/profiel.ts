import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseerProfiel, Profiel } from '@/lib/profiel';
import { SLEUTEL as SLEUTELS } from './sleutels';
import { registreerDocument } from './sync';
import { naElkaar } from './wachtrij';

const SLEUTEL = SLEUTELS.profiel;

// WEEK-268: schermen (bv. het gezinsicoon in de kop) horen het meteen als het profiel op dit toestel bewaard is.
const luisteraars = new Set<() => void>();
export function bijProfielBewaard(f: () => void): () => void {
  luisteraars.add(f);
  return () => {
    luisteraars.delete(f);
  };
}

export async function laadProfiel(): Promise<Profiel> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL);
    return normaliseerProfiel(ruw ? JSON.parse(ruw) : null);
  } catch {
    return normaliseerProfiel(null);
  }
}

/** Bewaart het profiel en deelt het met het gezin. */
export function bewaarProfiel(p: Profiel): Promise<void> {
  return naElkaar(async () => {
    await AsyncStorage.setItem(SLEUTEL, JSON.stringify(p));
    await registreerDocument('profiel', p);
    luisteraars.forEach((f) => {
      try {
        f();
      } catch {
        // een fout in één scherm mag het bewaren niet stoppen
      }
    });
  });
}

