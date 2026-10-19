// Waar de scanner naartoe gaat bij sluiten (WEEK-110). Pure logica: het scherm kiest met deze regel.

/**
 * Het scherm waar de gebruiker de scanner vandaan opende. Undefined als het onbekend is,
 * dan valt het scherm terug op de geschiedenis.
 */
export function scanTerug(van: string | undefined): '/frigo' | '/lijst' | undefined {
  if (van === 'frigo') return '/frigo';
  if (van === 'lijst') return '/lijst';
  return undefined;
}
