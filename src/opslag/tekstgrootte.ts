import AsyncStorage from '@react-native-async-storage/async-storage';
import { leesStand } from '@/lib/tekstgrootte';
import { SLEUTEL } from './sleutels';

// Tekstgrootte in de bereiding (WEEK-336): enkel op dit toestel, niet in de gezinssynchronisatie.

export async function laadTekstStand(): Promise<number> {
  try {
    return leesStand(await AsyncStorage.getItem(SLEUTEL.bereidingTekst));
  } catch {
    return 0;
  }
}

export async function bewaarTekstStand(stand: number): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL.bereidingTekst, String(leesStand(stand)));
  } catch {
    // Geen opslag: de keuze geldt dan enkel tot de app sluit.
  }
}
