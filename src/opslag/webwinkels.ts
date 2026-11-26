// WEEK-337: voorbereiding om later zelf je (web)winkel te kiezen. NOG NIET IN GEBRUIK: geen enkel scherm roept dit aan.
// De keuze blijft enkel op dit toestel (niet in de gezinssynchronisatie). De winkels komen uit public.webwinkels;
// de databank geeft enkel actieve winkels terug en die zijn er voorlopig niet.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leesKeuze, normaliseerWebwinkels, WEBWINKELS_ZICHTBAAR, type WebWinkel, type WinkelKeuze } from '@/lib/webwinkels';
import { SLEUTEL } from './sleutels';
import { supabase } from './supabase';

export async function laadWinkelKeuze(): Promise<WinkelKeuze> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.webwinkel);
    return leesKeuze(ruw ? JSON.parse(ruw) : null);
  } catch {
    return {};
  }
}

export async function bewaarWinkelKeuze(keuze: WinkelKeuze): Promise<void> {
  try {
    await AsyncStorage.setItem(SLEUTEL.webwinkel, JSON.stringify(leesKeuze(keuze)));
  } catch {
    // Geen opslag: de keuze geldt dan enkel tot de app sluit.
  }
}

/** De actieve webwinkels. Zolang de schakelaar uit staat, wordt er niets opgehaald (geen netwerkverkeer). */
export async function haalWebwinkels(): Promise<WebWinkel[]> {
  if (!WEBWINKELS_ZICHTBAAR) return [];
  const sb = supabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('webwinkels').select('code, naam, land, webshop_url, zoek_url, mogelijkheden, actief, volgorde').eq('actief', true);
    return error ? [] : normaliseerWebwinkels(data);
  } catch {
    return [];
  }
}
