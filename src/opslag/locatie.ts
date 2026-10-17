// Eenmalige locatie voor het winkelvoorstel (WEEK-58). Enkel gevraagd als de gebruiker het voorstel opent.
// De locatie wordt niet bewaard.
import * as Location from 'expo-location';
import type { Positie } from '@/lib/winkelvoorstel';

/** Geeft het huidige punt, of undefined zonder toestemming of bij een fout (dan valt de app terug op de postcode). */
export async function vraagPositie(): Promise<Positie | undefined> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return undefined;
    const punt = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: punt.coords.latitude, lon: punt.coords.longitude };
  } catch {
    return undefined;
  }
}
