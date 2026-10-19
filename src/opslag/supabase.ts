// Verbinding met Supabase (gezinsruimte, WEEK-8). Elk toestel meldt zich anoniem aan;
// de sessie wordt op het toestel bewaard en automatisch vernieuwd.
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '@/config';

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
