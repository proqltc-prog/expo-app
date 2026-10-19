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
