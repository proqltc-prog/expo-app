import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Taal } from '@/i18n';
import { taalMoetOpnieuwBepaald, taalNaarOpslag, taalUitOpslag, TAALVERSIE_NU, TOESTEL } from '@/lib/taalKeuze';
import { SLEUTEL } from './sleutels';

// De taal van de app staat enkel op dit toestel (WEEK-80). Ze gaat niet naar het gezin of naar andere toestellen.

export async function laadTaal(): Promise<Taal | undefined> {
  try {
    const versie = await AsyncStorage.getItem(SLEUTEL.taalVersie);
    if (taalMoetOpnieuwBepaald(versie)) {
      // WEEK-186: eenmalig de oude keuze loslaten, zodat de taal van het toestel geldt. Daarna kan de gebruiker opnieuw kiezen.
      await AsyncStorage.setItem(SLEUTEL.taal, TOESTEL);
      await AsyncStorage.setItem(SLEUTEL.taalVersie, TAALVERSIE_NU);
      return undefined;
    }
    return taalUitOpslag(await AsyncStorage.getItem(SLEUTEL.taal), null);
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
