// De stijlfoto's uit Supabase (WEEK-244): per keuken één foto, plus de gezinsfoto.
// Eén kleine vraag per app-sessie; het resultaat blijft op het toestel, zodat de app ook zonder verbinding
// meteen de bekende stijlfoto's kent. De foto's zelf bewaart expo-image op het toestel (zie src/ui/gerechtFoto.tsx).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leesStijlFotos, StijlFotos } from '@/lib/gerechtFoto';
import { supabase } from '@/opslag/supabase';

const BEWAARSLEUTEL = 'gerechtfotos:v1';
let geheugen: StijlFotos | undefined;
let bezig: Promise<StijlFotos> | undefined;

async function laad(): Promise<StijlFotos> {
  try {
    const bewaard = await AsyncStorage.getItem(BEWAARSLEUTEL);
    if (bewaard) geheugen = JSON.parse(bewaard) as StijlFotos;
  } catch {
    // Geen bewaarde lijst: dan enkel de vraag aan Supabase.
  }
  const sb = supabase();
  if (!sb) return geheugen ?? {};
  try {
    const { data, error } = await sb.from('gerecht_fotos').select('sleutel, pad, volgnr').like('sleutel', 'stijl-%');
    if (!error && data) {
      geheugen = leesStijlFotos(data);
      await AsyncStorage.setItem(BEWAARSLEUTEL, JSON.stringify(geheugen)).catch(() => undefined);
    }
  } catch {
    // Geen verbinding: de bewaarde lijst volstaat.
  }
  return geheugen ?? {};
}

/** De stijlfoto's; hoogstens één vraag aan Supabase per app-sessie. */
export function laadStijlFotos(): Promise<StijlFotos> {
  if (!bezig) bezig = laad();
  return bezig;
}
