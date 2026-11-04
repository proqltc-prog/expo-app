// Eigen recepten (WEEK-45, WEEK-192): de recepten die het gezin zelf maakt. Ze worden op het toestel bewaard
// en via de gezinsruimte (WEEK-8) met alle gezinsleden gedeeld: elke wijziging gaat naar de wachtrij van de sync.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EigenRecept, normaliseerEigen } from '@/lib/eigenrecepten';
import { registreerItems } from './sync';
import { SLEUTEL } from './sleutels';
import { naElkaar } from './wachtrij';

export async function laadEigenRecepten(): Promise<EigenRecept[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.eigenRecepten);
    return normaliseerEigen(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

export function wijzigEigenRecepten(wijziging: (lijst: EigenRecept[]) => EigenRecept[]): Promise<EigenRecept[]> {
  return naElkaar(async () => {
    const nieuw = wijziging(await laadEigenRecepten());
    await AsyncStorage.setItem(SLEUTEL.eigenRecepten, JSON.stringify(nieuw));
    await registreerItems('eigenRecept', nieuw);
    return nieuw;
  });
}
