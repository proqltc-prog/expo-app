// Koppelen van de anonieme account aan Google (WEEK-166). Enkel de verbinding met Supabase en de terugkeer van de aanbieder.
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { leesTokensUitUrl, Aanbieder, terugkeerAdres, terugkeerMetFout } from '@/lib/aanmelden';
import { supabase } from './supabase';

/** Is het toestel nog anoniem aangemeld (dus nog niet gekoppeld aan een account)? */
export async function isAnoniem(): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return data.session?.user?.is_anonymous === true;
}

function terugkeer(): { web: boolean; redirectTo: string } {
  const web = Platform.OS === 'web';
  const pagina = (globalThis as { location?: { origin: string } }).location;
  // Basispad van de webversie (app.json → experiments.baseUrl, bv. /expo-app): terug naar de start, niet naar /welkom (WEEK-230).
  const basis = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl;
  return { web, redirectTo: terugkeerAdres(web ? 'web' : 'native', pagina?.origin, basis) };
}

async function openAanbieder(data: { url?: string } | null | undefined, web: boolean): Promise<void> {
  // In de app opent de aanbieder in de browser; op het web gaat de pagina zelf naar de aanbieder.
  if (!web && data?.url) await Linking.openURL(data.url);
}

/** Koppelt de huidige anonieme account aan de aanbieder. Dezelfde gebruiker blijft behouden, dus de gezinsdata ook. */
export async function koppel(aanbieder: Aanbieder): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const { web, redirectTo } = terugkeer();
  const { data, error } = await sb.auth.linkIdentity({
    provider: aanbieder,
    options: { redirectTo, skipBrowserRedirect: !web },
  });
  if (error) throw error;
  await openAanbieder(data, web);
}

/** Meldt aan bij een bestaand account via de aanbieder (WEEK-185). */
export async function inlogMet(aanbieder: Aanbieder): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const { web, redirectTo } = terugkeer();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: aanbieder,
    options: { redirectTo, skipBrowserRedirect: !web },
  });
  if (error) throw error;
  await openAanbieder(data, web);
}

/**
 * Aanmelden met e-mail (WEEK-185): een anoniem toestel koppelt het adres aan zijn account,
 * anders krijgt de gebruiker een link om in te loggen. Geen wachtwoord nodig.
 */
export async function stuurAanmeldMail(email: string, anoniem: boolean): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error('geen_backend');
  const { redirectTo } = terugkeer();
  if (anoniem) {
    const { error } = await sb.auth.updateUser({ email });
    if (error) throw error;
    return;
  }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
}

/**
 * Wacht tot het toestel aangemeld is met een account (niet meer anoniem), hoogstens `maxMs` (WEEK-231).
 * Op het web verwerkt Supabase de terugkeer zelf bij het laden; in de app zet luisterNaarTerugkeer de sessie.
 * Geeft false bij een fout in het terugkeeradres of als de tijd om is (bv. geannuleerd in de browser).
 */
export async function wachtOpAanmelding(maxMs: number, stop: () => boolean = () => false): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const adres = (globalThis as { location?: { href: string } }).location?.href ?? '';
  if (Platform.OS === 'web' && terugkeerMetFout(adres)) return false;
  const einde = Date.now() + maxMs;
  while (Date.now() < einde && !stop()) {
    const { data } = await sb.auth.getSession();
    const gebruiker = data.session?.user;
    if (gebruiker && gebruiker.is_anonymous !== true) return true;
    await new Promise((klaar) => setTimeout(klaar, 500));
  }
  return false;
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
