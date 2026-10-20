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
 * Vraagt alle bronnen tegelijk en geeft het eerste geslaagde antwoord (WEEK-145).
 * Een trage of kapotte bron houdt zo de rest niet tegen. Lukt geen enkele, dan wordt de fout van de laatste mislukte bron gegooid.
 */
export function eersteGeslaagd<T>(bronnen: ReadonlyArray<() => Promise<T>>): Promise<T> {
  if (!bronnen.length) return Promise.reject(new Error('Geen bron om te proberen'));
  return new Promise<T>((oplossen, afwijzen) => {
    let mislukt = 0;
    let laatste: unknown;
    for (const bron of bronnen) {
      bron().then(oplossen, (fout) => {
        laatste = fout;
        mislukt += 1;
        if (mislukt === bronnen.length) afwijzen(laatste);
      });
    }
  });
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

/** Wachttijd voor een netwerkaanvraag (WEEK-120): daarna geldt de aanvraag als mislukt, zodat de zoeker nooit blijft draaien. */
export const TIMEOUT_MS = 10000;

/**
 * Een signaal dat na `ms` afbreekt, en `klaar()` om de wachttijd te annuleren als het antwoord er is.
 */
export function metTimeout(ms: number = TIMEOUT_MS): { signal: AbortSignal; klaar: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, klaar: () => clearTimeout(id) };
}
