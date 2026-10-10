// Sleutels van de opslag op het toestel (AsyncStorage), op één plaats zodat de
// synchronisatie (src/opslag/sync.ts) dezelfde gegevens leest en schrijft als de schermen.
export const SLEUTEL = {
  lijst: 'boodschappenlijst:v1',
  lijstWeergave: 'lijstweergave:v1',
  frigo: 'frigo:v1',
  favorieten: 'favorieten:v1',
  plan: 'weekplan:v1',
  opdrachten: 'opdrachten:v1',
  keuzes: 'planningkeuzes:v1',
  profiel: 'gezinsprofiel:v1',
  gezin: 'gezin:v1',
  /** Laatst gekende status van de betalende versie (WEEK-35), voor gebruik zonder internet. */
  betalend: 'betalend:v1',
  /** Synchronisatietoestand per soort/document (zie src/opslag/sync.ts). */
  sync: 'sync:v1',
} as const;
