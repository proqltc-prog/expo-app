// Aanmelden met Google, Apple, Facebook of e-mail (WEEK-166, WEEK-185). Pure logica, zonder React Native of Supabase-imports.

/** De aanbieders die de code kent. Een aanbieder werkt pas als hij ook in Supabase aanstaat. */
export type Aanbieder = 'google' | 'apple' | 'facebook';

/**
 * De aanbieders die op het aanmeldscherm staan (WEEK-225): enkel Google, want enkel die staat in Supabase aan.
 * Apple volgt met WEEK-227; Facebook bewust niet.
 */
export const AANBIEDERS: readonly Aanbieder[] = ['google'];

/** Aanmelden met e-mail staat uit tot er een eigen mailserver is (WEEK-226). */
export const AANMELDEN_MET_MAIL = false;

/**
 * Een anoniem toestel koppelt zijn gegevens aan het nieuwe account, zodat ze bewaard blijven.
 * Een toestel zonder anonieme sessie logt in op een bestaand account.
 */
export type AanmeldWijze = 'koppelen' | 'inloggen';

export function aanmeldWijze(anoniem: boolean): AanmeldWijze {
  return anoniem ? 'koppelen' : 'inloggen';
}

/** Een eenvoudige controle op een e-mailadres: één @ en een domein met een punt. */
export function isGeldigEmail(adres: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adres.trim());
}

/** Het adres waarnaar de aanbieder terugkeert: op het web de huidige pagina, in de app het app-schema. */
export function terugkeerAdres(platform: 'web' | 'native', origin?: string, pad?: string): string {
  if (platform === 'web') return `${origin ?? ''}${pad ?? ''}`;
  return 'famenu://';
}

/**
 * Haalt de tokens uit het terugkeeradres van de aanbieder. Supabase zet ze in het fragment: `#access_token=...&refresh_token=...`.
 * Geeft null als er geen geldige tokens in staan (bv. een foutmelding of een gewone link).
 */
export function leesTokensUitUrl(url: string): { accessToken: string; refreshToken: string } | null {
  const i = url.indexOf('#');
  if (i < 0) return null;
  const params = new URLSearchParams(url.slice(i + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
