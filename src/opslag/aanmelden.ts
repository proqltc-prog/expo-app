// Koppelen van de anonieme account aan Google (WEEK-166). Enkel de verbinding met Supabase en de terugkeer van de aanbieder.
import { Linking, Platform } from 'react-native';
import { leesTokensUitUrl, Aanbieder, terugkeerAdres } from '@/lib/aanmelden';
import { supabase } from './supabase';

/** Is het toestel nog anoniem aangemeld (dus nog niet gekoppeld aan een account)? */
export async function isAnoniem(): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return data.session?.user?.is_anonymous === true;
}

/** Koppelt de huidige anonieme account aan de aanbieder. Dezelfde gebruiker blijft behouden, dus de gezinsdata ook. */
export async function koppel(aanbieder: Aanbieder): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const web = Platform.OS === 'web';
  const pagina = (globalThis as { location?: { origin: string; pathname: string } }).location;
  const { data, error } = await sb.auth.linkIdentity({
    provider: aanbieder,
    options: {
      redirectTo: terugkeerAdres(web ? 'web' : 'native', pagina?.origin, pagina?.pathname),
      skipBrowserRedirect: !web,
    },
  });
  if (error) throw error;
  // In de app opent de aanbieder in de browser; op het web gaat de pagina zelf naar de aanbieder.
  if (!web && data?.url) await Linking.openURL(data.url);
}

/** Verwerkt een terugkeeradres van de aanbieder: zet de sessie met de nieuwe tokens. Geeft true bij succes. */
export async function verwerkTerugkeer(url: string): Promise<boolean> {
  const tokens = leesTokensUitUrl(url);
  const sb = supabase();
  if (!tokens || !sb) return false;
  const { error } = await sb.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
  return !error;
}

/**
 * Luistert in de app naar het terugkeeradres (famenu://). Op het web verwerkt Supabase de terugkeer zelf.
 * Geeft een functie terug die het luisteren stopt.
 */
export function luisterNaarTerugkeer(): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Linking.addEventListener('url', ({ url }) => {
    void verwerkTerugkeer(url);
  });
  void Linking.getInitialURL().then((url) => {
    if (url) void verwerkTerugkeer(url);
  });
  return () => sub.remove();
}
