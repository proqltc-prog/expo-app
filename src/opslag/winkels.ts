// Haalt winkels op via de Supabase-functie (OpenStreetMap op de server) en het postcodepunt bij Nominatim. Enkel na een wijziging van de postcode.
// Bewaart de resultaten per postcode op dit toestel (WEEK-148).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bewaarInCache, isBewaardWaard, leesWinkelCache, WinkelCacheItem } from '@/lib/winkelcache';
import { SLEUTEL } from '@/opslag/sleutels';
import { bouwPostcodeUrl, leesPlaats, leesPunt, NOMINATIM_HEADERS } from '@/lib/postcodepunt';
import { eersteGeslaagd, metTimeout } from '@/lib/netwerk';
import { leesServerWinkels, Winkel } from '@/lib/winkels';
import { SUPABASE } from '@/config';

/** De functie zoekt op de server (tot ~25 s); de app wacht iets langer. */
const WINKEL_FUNCTIE_TIMEOUT_MS = 30000;
import type { Positie } from '@/lib/winkelvoorstel';

/**
 * Winkels in de buurt via de Supabase-functie `winkels` (WEEK-171). De functie vraagt OpenStreetMap op de server,
 * met een cache en hoogstens 10 winkels. Met het punt van de postcode zoeken we binnen 10 km; zonder punt op postcode en gemeente.
 * Gooit een fout als de functie niet antwoordt; de winkelzoeker toont dan een melding.
 */
export async function zoekWinkels(postcode: string, gemeente: string, punt?: Positie): Promise<Winkel[]> {
  const sleutel = SUPABASE.sleutel;
  if (!SUPABASE.url || !sleutel) throw new Error('geen_backend');
  const wacht = metTimeout(WINKEL_FUNCTIE_TIMEOUT_MS);
  try {
    const antwoord = await fetch(`${SUPABASE.url}/functions/v1/winkels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: sleutel, Authorization: `Bearer ${sleutel}` },
      body: JSON.stringify(punt ? { lat: punt.lat, lon: punt.lon } : { postcode, gemeente }),
      signal: wacht.signal,
    });
    // Dezelfde vorm als eerder, zodat de foutmelding van de winkelzoeker gelijk blijft.
    if (!antwoord.ok) throw new Error(`Overpass ${antwoord.status}`);
    return leesServerWinkels(await antwoord.json());
  } finally {
    wacht.klaar();
  }
}

/** Punt van de postcode (Nominatim). Undefined als de postcode niet gevonden wordt. */
export async function zoekPostcodePunt(postcode: string, gemeente: string): Promise<Positie | undefined> {
  const url = bouwPostcodeUrl(postcode, gemeente);
  if (!url) return undefined;
  const wacht = metTimeout();
  try {
    const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS, signal: wacht.signal });
    if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
    return leesPunt(await antwoord.json());
  } finally {
    wacht.klaar();
  }
}

/** Gemeente en land bij een postcode (Nominatim), voor het invulvoorstel in het profiel (WEEK-69). */
export async function zoekPlaats(postcode: string): Promise<{ gemeente: string; land: string } | undefined> {
  const url = bouwPostcodeUrl(postcode, '');
  if (!url) return undefined;
  const wacht = metTimeout();
  const antwoord = await fetch(url, { headers: NOMINATIM_HEADERS, signal: wacht.signal }).finally(() => wacht.klaar());
  if (!antwoord.ok) throw new Error(`Nominatim ${antwoord.status}`);
  return leesPlaats(await antwoord.json());
}

/** Het bewaarde resultaat van eerdere zoekopdrachten. Bij een leesfout: leeg, de zoeker vraagt dan gewoon opnieuw. */
export async function laadWinkelCache(): Promise<WinkelCacheItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.winkelCache);
    return leesWinkelCache(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/** Bewaart het resultaat voor deze postcode. Mislukt het bewaren, dan merkt de gebruiker niets: de volgende zoekopdracht vult het opnieuw. */
export async function bewaarWinkelCache(item: WinkelCacheItem): Promise<void> {
  if (!isBewaardWaard(item)) return;
  try {
    const huidig = await laadWinkelCache();
    await AsyncStorage.setItem(SLEUTEL.winkelCache, JSON.stringify(bewaarInCache(huidig, item)));
  } catch {
    // Bewaren mag het zoeken niet breken.
  }
}
