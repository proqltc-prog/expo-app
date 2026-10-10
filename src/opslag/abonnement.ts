// Betalende versie (WEEK-35): of het gezin van dit toestel een lopend abonnement heeft.
// De laatst gekende status blijft op het toestel bewaard, zodat het ook zonder internet werkt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBetalend } from '@/lib/abonnement';
import { SLEUTEL } from './sleutels';
import { supabase } from './supabase';
import { laadGezin } from './sync';

async function bewaard(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SLEUTEL.betalend)) === 'ja';
  } catch {
    return false;
  }
}

/** Is het gezin van dit toestel betalend? Zonder gezin: nee. Lukt het opvragen niet: de laatst gekende status. */
export async function laadBetalend(): Promise<boolean> {
  const gezin = await laadGezin();
  const sb = supabase();
  if (!gezin || !sb) {
    await AsyncStorage.removeItem(SLEUTEL.betalend).catch(() => undefined);
    return false;
  }
  try {
    const { data, error } = await sb.from('gezin_abonnement').select('betalend_tot').eq('gezin_id', gezin.id);
    if (error) return bewaard();
    const betalend = isBetalend(data, new Date());
    await AsyncStorage.setItem(SLEUTEL.betalend, betalend ? 'ja' : 'nee');
    return betalend;
  } catch {
    return bewaard();
  }
}
