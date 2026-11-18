// Afmelden (WEEK-314). Pure logica, zonder React Native of Supabase-imports.

/**
 * Wat op het toestel blijft na afmelden: instellingen van het toestel en kopieën van de databank.
 * De scanteller blijft ook, anders geeft afmelden en opnieuw aanmelden nieuwe gratis scans.
 * Al de rest (gezin, weekplan, lijst, In huis, profiel, naam, scanhistoriek ...) is persoonlijk en wordt gewist;
 * het staat nog in de gezinsruimte en komt terug na opnieuw aanmelden. Nieuwe sleutels worden standaard gewist.
 */
export const BEWAREN_BIJ_AFMELDEN = [
  'taal',
  'taalVersie',
  'lijstWeergave',
  'scans',
  'winkelCache',
  'ingredientenDb',
  'receptenDb',
  'afgemeld',
] as const;

/** De opslagsleutels die bij afmelden gewist worden. */
export function teWissenBijAfmelden(sleutels: Readonly<Record<string, string>>): string[] {
  const bewaren = new Set<string>(BEWAREN_BIJ_AFMELDEN);
  return Object.entries(sleutels)
    .filter(([naam]) => !bewaren.has(naam))
    .map(([, sleutel]) => sleutel);
}

/**
 * Extra vragen aan Google bij het aanmelden: enkel na afmelden laat Google kiezen welk account (prompt=select_account).
 * Anders niet, zodat een gewone aanmelding niet telkens om een account vraagt.
 */
export function googleVragen(naAfmelden: boolean): { queryParams?: Record<string, string> } {
  return naAfmelden ? { queryParams: { prompt: 'select_account' } } : {};
}
