// Aanmelden met Google of Apple door de anonieme account te koppelen (WEEK-166).
// Pure logica, zonder React Native of Supabase-imports, zodat ze testbaar is.

/** De aanbieders die nu aangeboden worden. Apple volgt helemaal aan het einde (vereist een Apple Developer-account). */
export type Aanbieder = 'google';

/** Welke aanmeldknoppen getoond worden: enkel een anonieme account kan gekoppeld worden. */
export function aanbiedingen(anoniem: boolean): Aanbieder[] {
  return anoniem ? ['google'] : [];
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
