// Eigen recepten (WEEK-45): enkel op dit toestel bewaard, niet gedeeld met het gezin of een server.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { SLEUTEL } from './sleutels';
import { naElkaar } from './wachtrij';

function normaliseer(ruw: unknown): EigenRecept[] {
  if (!Array.isArray(ruw)) return [];
  return ruw.filter(
    (r): r is EigenRecept =>
      typeof r === 'object' &&
      r !== null &&
      typeof (r as EigenRecept).id === 'string' &&
      typeof (r as EigenRecept).naam === 'string' &&
      Array.isArray((r as EigenRecept).ingredienten) &&
      Array.isArray((r as EigenRecept).stappen)
  );
}

export async function laadEigenRecepten(): Promise<EigenRecept[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.eigenRecepten);
    return normaliseer(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

export function wijzigEigenRecepten(wijziging: (lijst: EigenRecept[]) => EigenRecept[]): Promise<EigenRecept[]> {
  return naElkaar(async () => {
    const nieuw = wijziging(await laadEigenRecepten());
    await AsyncStorage.setItem(SLEUTEL.eigenRecepten, JSON.stringify(nieuw));
    return nieuw;
  });
}
