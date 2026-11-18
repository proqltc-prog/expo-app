// Historiek van gescande producten op dit toestel (WEEK-302). Enkel lokaal.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/lib/openfoodfacts';
import { HistoriekItem, leesHistoriek, voegToeAanHistoriek } from '@/lib/scanHistoriek';
import { SLEUTEL } from './sleutels';
import { naElkaar } from './wachtrij';

export async function laadHistoriek(): Promise<HistoriekItem[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.scanHistoriek);
    return leesHistoriek(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

/** Zet een product bovenaan de historiek en geeft de nieuwe historiek terug. */
export function bewaarInHistoriek(product: Product): Promise<HistoriekItem[]> {
  return naElkaar(async () => {
    const nieuw = voegToeAanHistoriek(await laadHistoriek(), product, new Date());
    await AsyncStorage.setItem(SLEUTEL.scanHistoriek, JSON.stringify(nieuw));
    return nieuw;
  });
}

export function wisHistoriek(): Promise<void> {
  return naElkaar(() => AsyncStorage.removeItem(SLEUTEL.scanHistoriek));
}
