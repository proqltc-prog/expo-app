import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Taal } from '@/i18n';
import { taalNaarOpslag, taalUitOpslag } from '@/lib/taalKeuze';
import { SLEUTEL } from './sleutels';

// De taal van de app staat enkel op dit toestel (WEEK-80). Ze gaat niet naar het gezin of naar andere toestellen.

export async function laadTaal(): Promise<Taal | undefined> {
  try {
    const opgeslagen = await AsyncStorage.getItem(SLEUTEL.taal);
    const oudProfiel = opgeslagen === null ? await AsyncStorage.getItem(SLEUTEL.profiel) : null;
    const taal = taalUitOpslag(opgeslagen, oudProfiel ? JSON.parse(oudProfiel) : null);
    // Eenmalige overname van de oude keuze: daarna staat ze in de eigen sleutel.
    if (opgeslagen === null && taal) await AsyncStorage.setItem(SLEUTEL.taal, taal);
    return taal;
  } catch {
    return undefined;
  }
}

export async function zetTaal(taal: Taal | undefined): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL.taal, taalNaarOpslag(taal));
  } catch {
    // Geen opslag beschikbaar: de keuze geldt dan enkel tot de app gesloten wordt.
  }
}
