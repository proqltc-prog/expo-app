// Netwerkhulp zonder React Native (WEEK-95): meerdere bronnen na elkaar proberen.
// Het netwerkverkeer zelf zit in de opslagmodules; hier enkel de volgorde en de fout.

/**
 * Probeert de bronnen na elkaar en geeft het eerste geslaagde antwoord.
 * Lukt geen enkele bron, dan wordt de fout van de laatste bron gegooid.
 */
export async function probeerAchtereen<T>(bronnen: ReadonlyArray<() => Promise<T>>): Promise<T> {
  if (!bronnen.length) throw new Error('Geen bron om te proberen');
  let laatste: unknown;
  for (const bron of bronnen) {
    try {
      return await bron();
    } catch (fout) {
      laatste = fout;
    }
  }
  throw laatste;
}

/**
 * Probeert een bron één keer opnieuw na een korte pauze (WEEK-115).
 * Een tijdelijke storing (bv. een overbelaste server) herstelt zich vaak binnen enkele seconden.
 * De pauze is injecteerbaar zodat de logica zonder wachttijd te testen is.
 */
export async function probeerOpnieuw<T>(
  bron: () => Promise<T>,
  wachtMs = 1500,
  pauze: (ms: number) => Promise<void> = (ms) => new Promise((klaar) => setTimeout(klaar, ms)),
): Promise<T> {
  try {
    return await bron();
  } catch {
    await pauze(wachtMs);
    return bron();
  }
}
