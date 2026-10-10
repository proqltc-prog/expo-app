// Scanteller op het toestel (WEEK-34).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leesTeller, ScanTeller, telScan } from '@/lib/scanteller';
import { SLEUTEL } from './sleutels';
import { naElkaar } from './wachtrij';

export async function laadScanTeller(): Promise<ScanTeller | null> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.scans);
    return leesTeller(ruw ? JSON.parse(ruw) : null);
  } catch {
    return null;
  }
}

/** Telt één scan en geeft de nieuwe teller terug. */
export function registreerScan(): Promise<ScanTeller> {
  return naElkaar(async () => {
    const nieuw = telScan(await laadScanTeller(), new Date());
    await AsyncStorage.setItem(SLEUTEL.scans, JSON.stringify(nieuw));
    return nieuw;
  });
}
