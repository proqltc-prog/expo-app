import AsyncStorage from '@react-native-async-storage/async-storage';
import { SLEUTEL } from './sleutels';
import { leesVoorstellen, LosVoorstel, onthoudLos } from '@/lib/losVoorstellen';

// WEEK-288: eerder ingevulde andere producten, voor de voorstellen bij het zoeken. Enkel op dit toestel.

export async function laadLosVoorstellen(): Promise<LosVoorstel[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.losVoorstellen);
    return ruw ? leesVoorstellen(JSON.parse(ruw)) : [];
  } catch {
    return [];
  }
}

export async function onthoudLosVoorstel(v: Omit<LosVoorstel, 'laatst'>): Promise<LosVoorstel[]> {
  const nieuw = onthoudLos(await laadLosVoorstellen(), v, new Date());
  try {
    await AsyncStorage.setItem(SLEUTEL.losVoorstellen, JSON.stringify(nieuw));
  } catch {
    // Geen opslag: het voorstel komt er dan niet bij; het product zelf is wel bewaard.
  }
  return nieuw;
}
