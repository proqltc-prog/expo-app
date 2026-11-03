// Taal bij de eerste opening, uit de taal van het toestel (WEEK-185). Pure logica, zonder React Native.
import type { Taal } from '@/i18n';

/**
 * Nederlands en Frans blijven zoals het toestel. Duits, en alles wat we niet ondersteunen, krijgt Engels.
 * Enkel de eerste taal van het toestel telt: dat is de voorkeur van de gebruiker.
 */
export function startTaal(toesteltalen: readonly string[]): Taal {
  const eerste = toesteltalen[0]?.toLowerCase().split(/[-_]/)[0];
  if (eerste === 'nl' || eerste === 'fr') return eerste;
  return 'en';
}
