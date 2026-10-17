// Reclamefilmpjes met beloning (WEEK-38). Pure logica: welke advertentie-eenheid gebruikt wordt.
// De echte advertentie-aanroepen staan in src/opslag/advertentie.ts.

export type Platform = 'android' | 'ios';

/**
 * Echte beloning-eenheden uit AdMob. Zolang een waarde `null` is, worden Google-testadvertenties gebruikt.
 * Vul dit in vóór een store-release (AdMob → Apps → Famenu → Advertentie-eenheden → Beloond).
 */
export const ECHTE_BELONING_EENHEDEN: Record<Platform, string | null> = {
  android: 'ca-app-pub-8394022188610476/3811398201',
  ios: null,
};

/** Kiest de echte eenheid als die ingevuld is, anders de testeenheid. */
export function kiesEenheid(echt: string | null, test: string): string {
  return echt && echt.trim() ? echt.trim() : test;
}
