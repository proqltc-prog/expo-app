// WEEK-218: terugkeren naar het scherm vanwaar een subscherm (bv. "Nieuw recept") geopend werd.
// "Nieuw recept" is een verborgen tab; `router.back()` bracht de gebruiker op het web naar het beginscherm.
// Het openende scherm geeft daarom zijn eigen pad mee als `terug`, en het subscherm navigeert daar expliciet naartoe.

/** Bouwt een pad met querystring; lege of ontbrekende waarden worden weggelaten. */
export function padMet(pad: string, params: Record<string, string | number | undefined>): string {
  const delen = Object.entries(params)
    .filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return delen.length ? `${pad}?${delen.join('&')}` : pad;
}

/** Het pad om naar terug te keren: het meegegeven `terug` als dat een pad in de app is, anders de standaard. */
export function terugPad(terug: string | undefined, standaard: string): string {
  return terug && terug.startsWith('/') && !terug.startsWith('//') ? terug : standaard;
}

/** WEEK-259: de verborgen schermen met een terugpijl linksboven, en waar die naartoe gaat als er geen `terug` meegegeven is. */
export const TERUG_STANDAARD = {
  kies: '/',
  'mijn-recepten': '/',
  'eigen-recept': '/mijn-recepten',
  bereiding: '/',
  profiel: '/',
} as const;
export type SchermMetTerug = keyof typeof TERUG_STANDAARD;

/** Waar de terugpijl van een verborgen scherm naartoe gaat (WEEK-259): het meegegeven `terug`, anders de vaste ouder. */
export function terugVoor(scherm: SchermMetTerug, terug: unknown): string {
  return terugPad(typeof terug === 'string' ? terug : undefined, TERUG_STANDAARD[scherm]);
}
