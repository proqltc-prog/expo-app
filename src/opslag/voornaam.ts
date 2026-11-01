import AsyncStorage from '@react-native-async-storage/async-storage';
import { SLEUTEL } from './sleutels';

// De voornaam van dit toestel (WEEK-163). Lokaal bewaard; bij aansluiten en wijzigen gaat ze naar het gezin.

export async function laadVoornaam(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(SLEUTEL.voornaam)) ?? '';
  } catch {
    return '';
  }
}

export async function zetVoornaam(naam: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL.voornaam, naam);
  } catch {
    // Geen opslag: de naam wordt bij de volgende keer opnieuw gevraagd.
  }
}
