// Verbinding met Supabase (gezinsruimte, WEEK-8). Elk toestel meldt zich anoniem aan;
// de sessie wordt op het toestel bewaard en automatisch vernieuwd.
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AI, SUPABASE } from '@/config';
import type { AiInstelling } from '@/lib/planner/ai';
import { AiTegoed, leesTegoed } from '@/lib/planner/tegoed';

let client: SupabaseClient | null = null;

/** De Supabase-client, of null als de app zonder gezinsruimte gebouwd is. */
export function supabase(): SupabaseClient | null {
  if (!SUPABASE.url || !SUPABASE.sleutel) return null;
  if (!client) {
    client = createClient(SUPABASE.url, SUPABASE.sleutel, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    // Tokens enkel vernieuwen terwijl de app open is (aanbevolen door Supabase voor React Native).
    AppState.addEventListener('change', (staat) => {
      if (staat === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export function gezinsruimteBeschikbaar(): boolean {
  return !!SUPABASE.url && !!SUPABASE.sleutel;
}

/** Zorgt voor een (anonieme) aanmelding en geeft de id van de gebruiker terug. */
export async function zorgVoorSessie(): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: nieuw, error } = await sb.auth.signInAnonymously();
  if (error || !nieuw.user) throw error ?? new Error('aanmelden_mislukt');
  return nieuw.user.id;
}

/** Toegangstoken van dit toestel (meldt zich zo nodig eerst anoniem aan). */
export async function toegangstoken(): Promise<string | undefined> {
  const sb = supabase();
  if (!sb) return undefined;
  await zorgVoorSessie();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token;
}

/** De AI-planner met het toegangstoken van dit toestel (WEEK-31): enkel aangemelde toestellen mogen hem gebruiken. */
export const aiPlanner: AiInstelling = { ...AI, token: toegangstoken };

/** AI-tegoed van vandaag voor het gezin van dit toestel (WEEK-33), of null als het niet op te vragen is. */
export async function aiTegoed(): Promise<AiTegoed | null> {
  const sb = supabase();
  if (!sb || !AI.url) return null;
  try {
    await zorgVoorSessie();
    const { data, error } = await sb.rpc('ai_tegoed');
    return error ? null : leesTegoed(data);
  } catch {
    return null;
  }
}
